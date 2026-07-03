import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { TransactionType } from '../../entities/transaction.entity';

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsUUID()
  @IsOptional()
  fromAccountId?: string;

  @IsUUID()
  @IsOptional()
  toAccountId?: string;

  @IsDateString()
  date: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
