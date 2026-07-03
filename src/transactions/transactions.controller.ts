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
import { RelationsService } from '../relations/relations.service';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  QueryTransactionDto,
  QueryMonthlySummaryDto,
} from './dto';
import { QueryOutstandingDto } from '../relations/dto';

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly relationsService: RelationsService,
  ) {}

  @Get()
  async findAll(@Query() query: QueryTransactionDto) {
    return this.transactionsService.findAll({
      type: query.type,
      accountId: query.account_id,
      category: query.category,
      dateFrom: query.date_from,
      dateTo: query.date_to,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
    });
  }

  @Get('monthly-summary')
  async getMonthlySummary(@Query() query: QueryMonthlySummaryDto) {
    return this.transactionsService.getMonthlySummary({
      from: query.from,
      to: query.to,
      accountId: query.account_id,
    });
  }

  @Get('outstanding')
  async getOutstanding(@Query() query: QueryOutstandingDto) {
    return this.relationsService.findOutstanding(query.account_id);
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
