import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { LoansService } from '../loans/loans.service';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  QueryTransactionDto,
  QueryMonthlySummaryDto,
} from './dto';

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly loansService: LoansService,
  ) {}

  @Get()
  async findAll(@Query() query: QueryTransactionDto) {
    return this.transactionsService.findAll({
      type: query.type,
      accountId: query.account_id,
      categoryId: query.category_id,
      dateFrom: query.date_from,
      dateTo: query.date_to,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
    });
  }

  @Get('monthly-summary')
  async getMonthlySummary(@Query() query: QueryMonthlySummaryDto) {
    const result = await this.transactionsService.getMonthlySummary({
      from: query.from,
      to: query.to,
      accountId: query.account_id,
    });

    const loanDifference = await this.loansService.getActiveLoansDifference();

    return {
      ...result,
      loanDifference,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.transactionsService.remove(id);
  }
}
