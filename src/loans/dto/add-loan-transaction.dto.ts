import {
  IsNumber,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TransactionType } from '../../entities/transaction.entity';

export class AddLoanTransactionDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsIn([TransactionType.INCOME, TransactionType.EXPENSE])
  type: TransactionType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
