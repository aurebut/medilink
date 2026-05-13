import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { ApplicationsService } from './applications.service';
import { ApplyDto } from './dto/apply.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

@Controller()
@UseGuards(AuthGuard)
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Post('missions/:id/apply')
  apply(@CurrentUser() user: RequestUser, @Param('id') missionId: string, @Body() dto: ApplyDto) {
    return this.applications.apply(user, missionId, dto);
  }

  @Get('me/applications')
  listMine(@CurrentUser() user: RequestUser) {
    return this.applications.listMine(user);
  }

  @Get('establishment/applications')
  listForEstablishment(
    @CurrentUser() user: RequestUser,
    @Query('establishmentId') establishmentId: string,
  ) {
    return this.applications.listForEstablishment(user, establishmentId);
  }



  @Get('establishment/applications/:id/candidate-profile')
  getCandidateProfile(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.applications.getCandidateProfileForApplication(user, id);
  }

  @Patch('applications/:id/status')
  updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applications.updateStatus(user, id, dto);
  }

  @Post('applications/:id/withdraw')
  withdraw(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.applications.withdraw(user, id);
  }
}
