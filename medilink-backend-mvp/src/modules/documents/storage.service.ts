import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHmac, timingSafeEqual } from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { access, mkdir } from 'fs/promises';
import { isAbsolute, relative, resolve } from 'path';
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

@Injectable()
export class StorageService {
  private readonly client?: S3Client;
  private readonly bucket: string;
  private readonly provider: string;
  private readonly localRoot: string;

  constructor(private readonly config: ConfigService) {
    this.provider = this.config.get<string>('STORAGE_PROVIDER') || 'local';
    this.bucket = this.config.get<string>('S3_BUCKET') || 'medilink-private';
    const configuredLocalRoot =
      this.config.get<string>('LOCAL_STORAGE_DIR') || 'storage/uploads';
    this.localRoot = isAbsolute(configuredLocalRoot)
      ? configuredLocalRoot
      : resolve(process.cwd(), configuredLocalRoot);

    if (this.provider === 's3') {
      this.client = new S3Client({
        region: this.config.get<string>('S3_REGION') || 'auto',
        endpoint: this.config.get<string>('S3_ENDPOINT') || undefined,
        forcePathStyle: this.config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
        credentials: {
          accessKeyId: this.config.get<string>('S3_ACCESS_KEY_ID') || '',
          secretAccessKey: this.config.get<string>('S3_SECRET_ACCESS_KEY') || '',
        },
      });
    }
  }

  async createUploadUrl(key: string, mimeType: string, sizeBytes?: number) {
    if (!this.client) {
      const expiresIn = Number(this.config.get<string>('SIGNED_URL_TTL_SECONDS') || 300);
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
    });

    const expiresIn = Number(this.config.get<string>('SIGNED_URL_TTL_SECONDS') || 300);
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
      const expiresIn = Number(this.config.get<string>('SIGNED_URL_TTL_SECONDS') || 300);
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
    });

    const expiresIn = Number(this.config.get<string>('SIGNED_URL_TTL_SECONDS') || 300);
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
}
