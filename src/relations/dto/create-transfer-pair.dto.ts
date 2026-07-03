import {
  IsUUID,
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MemberRole } from '../../entities/transaction-relation-member.entity';

export class TransferPairMemberDto {
  @IsUUID()
  transactionId: string;

  @IsEnum(MemberRole)
  role: MemberRole;
}

export class CreateTransferPairDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => TransferPairMemberDto)
  members: TransferPairMemberDto[];

  @IsString()
  @MaxLength(100)
  @IsOptional()
  label?: string;
}
