import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LoansService } from './loans.service';
import { CreateLoanDto, AddLoanTransactionDto } from './dto';

@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get()
  async findAll(@Query('status') status?: 'active' | 'completed') {
    return this.loansService.findAll(status);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateLoanDto) {
    return this.loansService.create(dto);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.loansService.findOne(id);
  }

  @Post(':id/transactions')
  @HttpCode(HttpStatus.CREATED)
  async addTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddLoanTransactionDto,
  ) {
    return this.loansService.addTransaction(id, dto);
  }

  @Patch(':id/complete')
  async complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.loansService.complete(id);
  }

  @Patch(':id/uncomplete')
  async uncomplete(@Param('id', ParseUUIDPipe) id: string) {
    return this.loansService.uncomplete(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.loansService.remove(id);
  }
}
