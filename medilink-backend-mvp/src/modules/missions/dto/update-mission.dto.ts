import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateMissionDto } from './create-mission.dto';

class EditableMissionDto extends OmitType(CreateMissionDto, [
  'establishmentId',
  'publishNow',
  'compensationAmount',
] as const) {}

export class UpdateMissionDto extends PartialType(EditableMissionDto) {}
