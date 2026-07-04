import { IsOptional, IsEnum } from 'class-validator';
import { RelationType } from '../../entities/transaction-relation.entity';

export class QueryRelationDto {
  @IsEnum(RelationType)
  @IsOptional()
  type?: RelationType;
}
