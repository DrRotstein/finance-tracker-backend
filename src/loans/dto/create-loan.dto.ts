import { IsString, IsEnum, MaxLength } from 'class-validator';
import { LoanDirection } from '../../entities/loan.entity';

export class CreateLoanDto {
  @IsString()
  @MaxLength(255)
  counterparty: string;

  @IsEnum(LoanDirection)
  direction: LoanDirection;
}
