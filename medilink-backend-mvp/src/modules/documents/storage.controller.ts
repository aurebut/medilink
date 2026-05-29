import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Put('upload/:token')
  async upload(@Param('token') token: string, @Req() req: Request) {
    try {
      const payload = this.storage.verifyToken(token, 'upload');
      await this.storage.saveLocalObject(payload, req);
      return { ok: true };
    } catch {
      throw new BadRequestException('URL upload invalide ou expiree.');
    }
  }

  @Get('download/:token')
  async download(@Param('token') token: string, @Res() res: Response) {
    let payload: ReturnType<StorageService['verifyToken']>;

    try {
      payload = this.storage.verifyToken(token, 'download');
    } catch {
      throw new BadRequestException('URL download invalide ou expiree.');
    }

    const fileName = (payload.fileName || 'document').replace(/[^\w.-]/g, '_');
    let stream: Awaited<ReturnType<StorageService['openLocalObject']>>;

    try {
      stream = await this.storage.openLocalObject(payload);
    } catch {
      throw new NotFoundException('Fichier introuvable.');
    }

    res.setHeader('Content-Type', payload.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(404).send('Fichier introuvable.');
        return;
      }
      res.destroy();
    });

    stream.pipe(res);
  }
}
