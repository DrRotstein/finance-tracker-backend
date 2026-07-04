import {
  IsUUID,
  IsString,
  MaxLength,
  IsArray,
  IsOptional,
} from 'class-validator';

export class CreateGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  transactionIds?: string[];
}
