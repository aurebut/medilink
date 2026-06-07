import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { DashboardService } from './dashboard.service';

@Controller()
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('me/dashboard')
  getCandidateDashboard(@CurrentUser() user: RequestUser) {
    return this.dashboard.getCandidateDashboard(user);
  }

  @Get('establishment/dashboard')
  getEstablishmentDashboard(
    @CurrentUser() user: RequestUser,
    @Query('establishmentId') establishmentId?: string,
  ) {
    return this.dashboard.getEstablishmentDashboard(user, establishmentId);
  }
}
