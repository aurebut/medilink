import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { ListWorkspaceNotesDto } from './dto/list-workspace-notes.dto';
import { SaveWorkspaceNoteDto } from './dto/save-workspace-note.dto';
import { WorkspaceNotesService } from './workspace-notes.service';

@Controller('workspace-notes')
export class WorkspaceNotesController {
  constructor(private readonly notes: WorkspaceNotesService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query() dto: ListWorkspaceNotesDto,
  ) {
    return this.notes.list(user, dto);
  }

  @Patch(':key')
  save(
    @CurrentUser() user: RequestUser,
    @Param('key') key: string,
    @Body() dto: SaveWorkspaceNoteDto,
  ) {
    return this.notes.save(user, key, dto);
  }
}
