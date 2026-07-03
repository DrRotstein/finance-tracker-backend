import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { AccountType } from '../../entities/account.entity';

export class QueryAccountDto {
  @IsEnum(AccountType)
  @IsOptional()
  type?: AccountType;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  is_external?: boolean;
}
