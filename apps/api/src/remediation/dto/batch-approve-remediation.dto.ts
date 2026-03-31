import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsUUID,
} from 'class-validator';

export class BatchApproveRemediationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(25)
  @IsUUID('4', { each: true })
  findingIds!: string[];
}
