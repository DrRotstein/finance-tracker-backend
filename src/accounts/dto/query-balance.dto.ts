import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryBalanceDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === '1')
  include_external?: boolean;
}
