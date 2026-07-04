import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsDateString,
  Min,
} from 'class-validator';

export class UpdateTransactionDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @IsUUID()
  @IsOptional()
  fromAccountId?: string | null;

  @IsUUID()
  @IsOptional()
  toAccountId?: string | null;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string | null;

  @IsString()
  @IsOptional()
  description?: string | null;
}
