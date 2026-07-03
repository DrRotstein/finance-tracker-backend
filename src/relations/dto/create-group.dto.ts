import {
  IsUUID,
  IsString,
  MaxLength,
  IsArray,
  ArrayMinSize,
  IsNotEmpty,
} from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  transactionIds: string[];
}
