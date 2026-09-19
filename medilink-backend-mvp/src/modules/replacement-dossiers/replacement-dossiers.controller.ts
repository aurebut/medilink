import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { GenerateDossierDto, SendDossierDto, UpdateDossierDto, UploadDossierDto } from './dossier.dto';
import { ReplacementDossiersService } from './replacement-dossiers.service';

@Controller('applications/:applicationId/dossier')
export class ReplacementDossiersController {
  constructor(private readonly dossiers: ReplacementDossiersService) {}

  @Get()
  get(@CurrentUser() user: RequestUser, @Param('applicationId') id: string) {
    return this.dossiers.get(user, id);
  }

  @Put()
  update(@CurrentUser() user: RequestUser, @Param('applicationId') id: string, @Body() dto: UpdateDossierDto) {
    return this.dossiers.update(user, id, dto);
  }

  @Post('generate')
  generate(@CurrentUser() user: RequestUser, @Param('applicationId') id: string, @Body() dto: GenerateDossierDto) {
    return this.dossiers.generate(user, id, dto);
  }

  @Post('upload-url')
  upload(@CurrentUser() user: RequestUser, @Param('applicationId') id: string, @Body() dto: UploadDossierDto) {
    return this.dossiers.createUploadUrl(user, id, dto);
  }

  @Post('documents/:documentId/confirm')
  confirm(@CurrentUser() user: RequestUser, @Param('applicationId') id: string, @Param('documentId') documentId: string) {
    return this.dossiers.confirmUpload(user, id, documentId);
  }

  @Get('documents/:documentId/download-url')
  download(@CurrentUser() user: RequestUser, @Param('applicationId') id: string, @Param('documentId') documentId: string) {
    return this.dossiers.download(user, id, documentId);
  }

  @Delete('documents/:documentId')
  archive(@CurrentUser() user: RequestUser, @Param('applicationId') id: string, @Param('documentId') documentId: string) {
    return this.dossiers.archive(user, id, documentId);
  }

  @Post('send')
  send(@CurrentUser() user: RequestUser, @Param('applicationId') id: string, @Body() dto: SendDossierDto) {
    return this.dossiers.send(user, id, dto);
  }
}
