import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { AddMemberDto } from './dto/add-member.dto';
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

  @Post(':id/members')
  addMember(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.establishments.addMember(user, id, dto);
  }
}
