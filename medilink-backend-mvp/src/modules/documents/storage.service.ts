import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly client?: S3Client;
  private readonly bucket: string;
  private readonly provider: string;

  constructor(private readonly config: ConfigService) {
    this.provider = this.config.get<string>('STORAGE_PROVIDER') || 'mock';
    this.bucket = this.config.get<string>('S3_BUCKET') || 'medilink-private';

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

  async createUploadUrl(key: string, mimeType: string) {
    if (!this.client) {
      return {
        provider: 'mock',
        uploadUrl: `mock://upload/${key}`,
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        expiresInSeconds: 300,
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

  async createDownloadUrl(key: string) {
    if (!this.client) {
      return {
        provider: 'mock',
        downloadUrl: `mock://download/${key}`,
        expiresInSeconds: 300,
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
}
