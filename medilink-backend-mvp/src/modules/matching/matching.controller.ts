import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { DispatchMissionMatchesDto } from './dto/dispatch-mission-matches.dto';
import { PreviewMissionMatchesDto } from './dto/preview-mission-matches.dto';
import { MatchingService } from './matching.service';
import { UpdateMatchingConfigDto } from './dto/update-matching-config.dto';

@Controller('admin/matching')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.MEDILINK_ADMIN)
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Get('config')
  getMatchingConfig() {
    return this.matching.getMatchingConfig();
  }

  @Post('config')
  updateMatchingConfig(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateMatchingConfigDto,
  ) {
    return this.matching.updateMatchingConfig(user, dto);
  }

  @Get('missions/:id/preview')
  previewMissionMatches(
    @Param('id') missionId: string,
    @Query() dto: PreviewMissionMatchesDto,
  ) {
    return this.matching.previewMissionMatches(missionId, dto.limit);
  }

  @Post('missions/:id/dispatch')
  dispatchMissionMatches(
    @CurrentUser() user: RequestUser,
    @Param('id') missionId: string,
    @Body() dto: DispatchMissionMatchesDto,
  ) {
    return this.matching.dispatchMissionMatches(user, missionId, dto);
  }

  @Get('dispatch-jobs/:jobId')
  getDispatchJob(@Param('jobId') jobId: string) {
    return this.matching.getDispatchJob(jobId);
  }

  @Get('missions/:id/dispatch-jobs')
  listDispatchJobs(@Param('id') missionId: string) {
    return this.matching.listDispatchJobsForMission(missionId);
  }
}
