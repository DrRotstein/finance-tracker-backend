import { IsOptional, IsUUID, IsString, Matches } from 'class-validator';

export class QueryMonthlySummaryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from must be in YYYY-MM-DD format',
  })
  @IsOptional()
  from?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to must be in YYYY-MM-DD format',
  })
  @IsOptional()
  to?: string;

  @IsUUID()
  @IsOptional()
  account_id?: string;
}
