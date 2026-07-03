import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  Length,
} from 'class-validator';
import { AccountType } from '../../entities/account.entity';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEnum(AccountType)
  @IsOptional()
  type?: AccountType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  startingBalance?: number;

  @IsString()
  @Length(3, 3)
  @IsOptional()
  currency?: string;

  @IsBoolean()
  @IsOptional()
  isExternal?: boolean;
}
