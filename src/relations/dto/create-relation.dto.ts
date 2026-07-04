import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  IsUUID,
  ArrayMaxSize,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RelationType } from '../../entities/transaction-relation.entity';
import { TransferPairMemberDto } from './create-transfer-pair.dto';

export class CreateRelationDto {
  @IsEnum(RelationType)
  type: RelationType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  transactionIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => TransferPairMemberDto)
  members?: TransferPairMemberDto[];
}
