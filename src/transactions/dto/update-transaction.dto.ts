import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsDateString,
  MaxLength,
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

  @IsString()
  @MaxLength(50)
  @IsOptional()
  category?: string | null;

  @IsString()
  @IsOptional()
  description?: string | null;
}
