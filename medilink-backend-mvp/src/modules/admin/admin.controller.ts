import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DocumentVerificationStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { AdminService } from './admin.service';
import { RejectDocumentDto } from './dto/reject-document.dto';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.MEDILINK_ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  users() {
    return this.admin.listUsers();
  }

  @Patch('users/:id/suspend')
  suspendUser(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.admin.suspendUser(user, id);
  }

  @Get('documents')
  documents(@Query('status') status?: DocumentVerificationStatus) {
    return this.admin.listDocuments(status);
  }

  @Post('documents/:id/approve')
  approveDocument(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.admin.approveDocument(user, id);
  }

  @Post('documents/:id/reject')
  rejectDocument(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: RejectDocumentDto,
  ) {
    return this.admin.rejectDocument(user, id, dto.reason);
  }

  @Get('establishments')
  establishments() {
    return this.admin.listEstablishments();
  }

  @Post('establishments/:id/verify')
  verifyEstablishment(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.admin.verifyEstablishment(user, id);
  }

  @Get('missions')
  missions() {
    return this.admin.listMissions();
  }

  @Post('missions/:id/unpublish')
  unpublishMission(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.admin.unpublishMission(user, id);
  }
}
