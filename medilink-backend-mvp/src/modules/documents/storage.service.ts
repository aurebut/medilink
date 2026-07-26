import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHmac, timingSafeEqual } from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { access, mkdir, open, rename, stat, unlink } from 'fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';

type SignedStoragePayload = {
  key: string;
  mimeType?: string;
  fileName?: string;
  sizeBytes?: number;
  exp: number;
  purpose: 'upload' | 'download';
};

type StoredObjectMetadata = {
  sizeBytes: number;
  mimeType?: string;
};

@Injectable()
export class StorageService {
  private readonly client?: S3Client;
  private readonly bucket: string;
  private readonly provider: string;
  private readonly localRoot: string;
  private readonly signedUrlTtlSeconds: number;

  constructor(private readonly config: ConfigService) {
    this.provider = (this.config.get<string>('STORAGE_PROVIDER') || 'local').toLowerCase();
    const configuredBucket = this.config.get<string>('S3_BUCKET');
    this.bucket = configuredBucket || 'medilink-private';
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    this.signedUrlTtlSeconds = Number(
      this.config.get<string>('SIGNED_URL_TTL_SECONDS') || 300,
    );

    if (!['local', 'mock', 's3'].includes(this.provider)) {
      throw new Error(`Unsupported STORAGE_PROVIDER: ${this.provider}`);
    }

    if (isProduction && this.provider !== 's3') {
      throw new Error('STORAGE_PROVIDER=s3 is required in production.');
    }
    if (
      !Number.isInteger(this.signedUrlTtlSeconds) ||
      this.signedUrlTtlSeconds < 60 ||
      this.signedUrlTtlSeconds > 900
    ) {
      throw new Error('SIGNED_URL_TTL_SECONDS must be between 60 and 900 seconds.');
    }
    if (isProduction && this.provider === 's3' && !configuredBucket) {
      throw new Error('S3_BUCKET is required in production.');
    }

    const configuredLocalRoot =
      this.config.get<string>('LOCAL_STORAGE_DIR') || 'storage/uploads';
    this.localRoot = isAbsolute(configuredLocalRoot)
      ? configuredLocalRoot
      : resolve(process.cwd(), configuredLocalRoot);

    if (this.provider === 's3') {
      const accessKeyId = this.config.get<string>('S3_ACCESS_KEY_ID');
      const secretAccessKey = this.config.get<string>('S3_SECRET_ACCESS_KEY');
      const endpoint = this.config.get<string>('S3_ENDPOINT');
      if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
        throw new Error('S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be configured together.');
      }
      if (isProduction && endpoint && (!accessKeyId || !secretAccessKey)) {
        throw new Error(
          'S3 credentials are required with a custom S3 endpoint in production.',
        );
      }

      this.client = new S3Client({
        region: this.config.get<string>('S3_REGION') || 'auto',
        endpoint: endpoint || undefined,
        forcePathStyle: this.config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
        credentials: accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
      });
    }
  }

  async createUploadUrl(key: string, mimeType: string, sizeBytes?: number) {
    if (!this.client) {
      const expiresIn = this.signedUrlTtlSeconds;
      const token = this.sign({
        key,
        mimeType,
        sizeBytes,
        purpose: 'upload',
        exp: Math.floor(Date.now() / 1000) + expiresIn,
      });

      return {
        provider: 'local',
        uploadUrl: `${this.apiBaseUrl()}/api/storage/upload/${token}`,
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        expiresInSeconds: expiresIn,
      };
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
      ContentLength: sizeBytes,
    });

    const expiresIn = this.signedUrlTtlSeconds;
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });

    return {
      provider: 's3',
      uploadUrl,
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      expiresInSeconds: expiresIn,
    };
  }

  async createDownloadUrl(key: string, fileName?: string, mimeType?: string) {
    if (!this.client) {
      const expiresIn = this.signedUrlTtlSeconds;
      const token = this.sign({
        key,
        fileName,
        mimeType,
        purpose: 'download',
        exp: Math.floor(Date.now() / 1000) + expiresIn,
      });

      return {
        provider: 'local',
        downloadUrl: `${this.apiBaseUrl()}/api/storage/download/${token}`,
        expiresInSeconds: expiresIn,
      };
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentType: mimeType || 'application/octet-stream',
      ResponseContentDisposition: this.contentDisposition(fileName, mimeType),
      ResponseCacheControl: 'private, no-store',
    });

    const expiresIn = this.signedUrlTtlSeconds;
    const downloadUrl = await getSignedUrl(this.client, command, { expiresIn });

    return {
      provider: 's3',
      downloadUrl,
      expiresInSeconds: expiresIn,
    };
  }

  verifyToken(token: string, purpose: SignedStoragePayload['purpose']) {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) {
      throw new Error('Invalid storage token.');
    }

    const expected = this.signature(encodedPayload);
    const provided = Buffer.from(signature, 'base64url');
    if (
      expected.length !== provided.length ||
      !timingSafeEqual(expected, provided)
    ) {
      throw new Error('Invalid storage token.');
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as SignedStoragePayload;

    if (payload.purpose !== purpose || payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Expired storage token.');
    }

    return payload;
  }

  async saveLocalObject(payload: SignedStoragePayload, stream: NodeJS.ReadableStream) {
    const target = this.localPath(payload.key);
    await mkdir(resolve(target, '..'), { recursive: true });

    let received = 0;
    const maxSize = payload.sizeBytes || 25 * 1024 * 1024;
    const meter = new Transform({
      transform(chunk, _encoding, callback) {
        received += chunk.length;
        if (received > maxSize) {
          callback(new Error('File too large.'));
          return;
        }
        callback(null, chunk);
      },
    });

    await pipeline(stream, meter, createWriteStream(target));
  }

  async openLocalObject(payload: SignedStoragePayload) {
    const target = this.localPath(payload.key);
    await access(target);
    return createReadStream(target);
  }

  async assertUploadedObject(
    key: string,
    expectedMimeType: string,
    expectedSizeBytes: number,
  ) {
    const metadata = await this.objectMetadata(key);
    if (metadata.sizeBytes !== expectedSizeBytes) {
      throw new Error('Uploaded object size does not match the declared size.');
    }

    const actualMimeType = (metadata.mimeType || '').split(';')[0].trim().toLowerCase();
    if (actualMimeType && actualMimeType !== expectedMimeType.toLowerCase()) {
      throw new Error('Uploaded object content type does not match.');
    }

    const prefix = await this.readObjectPrefix(key, 16);
    if (!this.matchesMagicBytes(prefix, expectedMimeType)) {
      throw new Error('Uploaded object signature does not match its content type.');
    }

    return metadata;
  }

  async promoteUploadedObject(sourceKey: string, destinationKey: string) {
    if (sourceKey === destinationKey) return destinationKey;

    if (this.client) {
      await this.client.send(new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
        MetadataDirective: 'COPY',
      }));
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: sourceKey,
      }));
      return destinationKey;
    }

    const source = this.localPath(sourceKey);
    const destination = this.localPath(destinationKey);
    await mkdir(dirname(destination), { recursive: true });
    try {
      await rename(source, destination);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
      await access(destination);
    }
    return destinationKey;
  }

  async deleteObject(key: string) {
    if (this.client) {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      return;
    }

    try {
      await unlink(this.localPath(key));
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  contentDisposition(fileName?: string, mimeType?: string) {
    const disposition = mimeType?.startsWith('image/') ? 'inline' : 'attachment';
    return `${disposition}; filename="${this.safeDownloadFileName(fileName)}"`;
  }

  private sign(payload: SignedStoragePayload) {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${encodedPayload}.${this.signature(encodedPayload).toString('base64url')}`;
  }

  private signature(encodedPayload: string) {
    const secret =
      this.config.get<string>('STORAGE_SIGNING_SECRET') ||
      this.config.get<string>('SESSION_SECRET') ||
      'change-me-in-production';

    return createHmac('sha256', secret).update(encodedPayload).digest();
  }

  private localPath(key: string) {
    if (key.includes('..')) {
      throw new Error('Invalid storage key.');
    }

    const target = resolve(this.localRoot, key);
    const relativeTarget = relative(this.localRoot, target);
    if (relativeTarget.startsWith('..') || isAbsolute(relativeTarget)) {
      throw new Error('Invalid storage key.');
    }

    return target;
  }

  private apiBaseUrl() {
    return (
      this.config.get<string>('API_PUBLIC_URL') ||
      `http://localhost:${this.config.get<number>('PORT') || 4000}`
    ).replace(/\/$/, '');
  }

  private async objectMetadata(key: string): Promise<StoredObjectMetadata> {
    if (this.client) {
      const result = await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      if (result.ContentLength === undefined) {
        throw new Error('Uploaded object has no content length.');
      }
      return {
        sizeBytes: result.ContentLength,
        mimeType: result.ContentType,
      };
    }

    const result = await stat(this.localPath(key));
    return { sizeBytes: result.size };
  }

  private async readObjectPrefix(key: string, length: number) {
    if (this.client) {
      const result = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Range: `bytes=0-${length - 1}`,
      }));
      const body = result.Body as any;
      if (!body) throw new Error('Uploaded object is empty.');
      if (typeof body.transformToByteArray === 'function') {
        return Buffer.from(await body.transformToByteArray());
      }

      const chunks: Buffer[] = [];
      for await (const chunk of body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks).subarray(0, length);
    }

    const handle = await open(this.localPath(key), 'r');
    try {
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await handle.read(buffer, 0, length, 0);
      return buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  }

  private matchesMagicBytes(prefix: Buffer, mimeType: string) {
    if (mimeType === 'application/pdf') {
      return prefix.subarray(0, 5).toString('ascii') === '%PDF-';
    }
    if (mimeType === 'image/jpeg') {
      return prefix.length >= 3 &&
        prefix[0] === 0xff &&
        prefix[1] === 0xd8 &&
        prefix[2] === 0xff;
    }
    if (mimeType === 'image/png') {
      return prefix.length >= 8 &&
        prefix.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (mimeType === 'image/webp') {
      return prefix.length >= 12 &&
        prefix.subarray(0, 4).toString('ascii') === 'RIFF' &&
        prefix.subarray(8, 12).toString('ascii') === 'WEBP';
    }
    return false;
  }

  private safeDownloadFileName(fileName?: string) {
    return (fileName || 'document').replace(/[^\w.-]/g, '_');
  }
}
