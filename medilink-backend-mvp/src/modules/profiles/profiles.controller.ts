import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

@Controller('me/profile')
@UseGuards(AuthGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get()
  getMyProfile(@CurrentUser() user: RequestUser) {
    return this.profiles.getMyProfile(user.id);
  }

  @Patch()
  updateMyProfile(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return this.profiles.updateMyProfile(user.id, dto);
  }
}
