import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { RelationType } from '../../entities/transaction-relation.entity';

export class QueryRelationDto {
  @IsEnum(RelationType)
  @IsOptional()
  type?: RelationType;
}

export class QueryOutstandingDto {
  @IsUUID()
  @IsOptional()
  account_id?: string;
}
