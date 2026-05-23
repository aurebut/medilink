import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateEstablishmentPhotoUploadDto } from './dto/create-establishment-photo-upload.dto';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { EstablishmentsService } from './establishments.service';

@Controller('establishments')
@UseGuards(AuthGuard)
export class EstablishmentsController {
  constructor(private readonly establishments: EstablishmentsService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateEstablishmentDto) {
    return this.establishments.create(user, dto);
  }

  @Get('me')
  listMine(@CurrentUser() user: RequestUser) {
    return this.establishments.listMine(user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateEstablishmentDto>,
  ) {
    return this.establishments.update(user, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.establishments.delete(user, id);
  }

  @Post(':id/members')
  addMember(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.establishments.addMember(user, id, dto);
  }

  @Get(':id/photos')
  listPhotos(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.establishments.listPhotos(user, id);
  }

  @Post(':id/photos/upload-url')
  createPhotoUploadUrl(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CreateEstablishmentPhotoUploadDto,
  ) {
    return this.establishments.createPhotoUploadUrl(user, id, dto);
  }

  @Post(':id/photos/:photoId/confirm-upload')
  confirmPhotoUpload(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    return this.establishments.confirmPhotoUpload(user, id, photoId);
  }

  @Patch(':id/photos/:photoId/primary')
  setPrimaryPhoto(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    return this.establishments.setPrimaryPhoto(user, id, photoId);
  }

  @Delete(':id/photos/:photoId')
  deletePhoto(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    return this.establishments.deletePhoto(user, id, photoId);
  }
}
