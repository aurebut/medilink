import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { DocumentsService } from './documents.service';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';

@Controller()
@UseGuards(AuthGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('me/documents')
  listMine(@CurrentUser() user: RequestUser) {
    return this.documents.listMine(user.id);
  }

  @Post('documents/upload-url')
  createUploadUrl(@CurrentUser() user: RequestUser, @Body() dto: CreateUploadUrlDto) {
    return this.documents.createUploadUrl(user, dto);
  }

  @Post('documents/:id/confirm-upload')
  confirmUpload(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.documents.confirmUpload(user, id);
  }

  @Get('documents/:id/download-url')
  getDownloadUrl(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.documents.getDownloadUrl(user, id);
  }

  @Delete('documents/:id')
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.documents.softDelete(user, id);
  }
}
