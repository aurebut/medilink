import {
  BadRequestException,
  Controller,
  Get,
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
      throw new BadRequestException('URL upload invalide ou expirée.');
    }
  }

  @Get('download/:token')
  download(@Param('token') token: string, @Res() res: Response) {
    try {
      const payload = this.storage.verifyToken(token, 'download');
      const fileName = (payload.fileName || 'document').replace(/[^\w.-]/g, '_');
      res.setHeader('Content-Type', payload.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      this.storage.openLocalObject(payload).pipe(res);
    } catch {
      throw new BadRequestException('URL download invalide ou expirée.');
    }
  }
}
