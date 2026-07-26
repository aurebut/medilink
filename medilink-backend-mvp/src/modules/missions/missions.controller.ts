import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MissionStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { CreateMissionDto } from './dto/create-mission.dto';
import { SearchMissionsDto } from './dto/search-missions.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { MissionsService } from './missions.service';

@Controller('missions')
export class MissionsController {
  constructor(private readonly missions: MissionsService) {}

  @Get()
  @Public()
  search(@Query() dto: SearchMissionsDto) {
    return this.missions.search(dto);
  }

  @Get('mine')
  mine(@CurrentUser() user: RequestUser, @Query('establishmentId') establishmentId?: string) {
    return this.missions.findMine(user, establishmentId);
  }

  @Get('mine/:id')
  getMine(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.missions.getMine(user, id);
  }

  @Get(':id')
  @Public()
  get(@Param('id') id: string) {
    return this.missions.getPublic(id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateMissionDto) {
    return this.missions.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateMissionDto,
  ) {
    return this.missions.update(user, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.missions.delete(user, id);
  }

  @Post(':id/publish')
  publish(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.missions.setStatus(user, id, MissionStatus.PUBLISHED);
  }

  @Post(':id/pause')
  pause(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.missions.setStatus(user, id, MissionStatus.PAUSED);
  }

  @Post(':id/archive')
  archive(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.missions.setStatus(user, id, MissionStatus.ARCHIVED);
  }
}
