import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MissionStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { CreateMissionDto } from './dto/create-mission.dto';
import { SearchMissionsDto } from './dto/search-missions.dto';
import { MissionsService } from './missions.service';

@Controller('missions')
export class MissionsController {
  constructor(private readonly missions: MissionsService) {}

  @Get()
  search(@Query() dto: SearchMissionsDto) {
    return this.missions.search(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.missions.getPublic(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateMissionDto) {
    return this.missions.create(user, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateMissionDto>,
  ) {
    return this.missions.update(user, id, dto);
  }

  @Post(':id/publish')
  @UseGuards(AuthGuard)
  publish(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.missions.setStatus(user, id, MissionStatus.PUBLISHED);
  }

  @Post(':id/pause')
  @UseGuards(AuthGuard)
  pause(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.missions.setStatus(user, id, MissionStatus.PAUSED);
  }

  @Post(':id/archive')
  @UseGuards(AuthGuard)
  archive(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.missions.setStatus(user, id, MissionStatus.ARCHIVED);
  }
}
