import { IsString, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { LoanDirection } from '../../entities/loan.entity';

export class CreateLoanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  counterparty: string;

  @IsEnum(LoanDirection)
  direction: LoanDirection;
}
