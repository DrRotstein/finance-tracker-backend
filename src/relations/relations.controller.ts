import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { RelationsService } from './relations.service';
import {
  CreateTransferPairDto,
  CreateGroupDto,
  CreateRelationDto,
  AddMemberDto,
  QueryRelationDto,
  QueryOutstandingDto,
} from './dto';
import { RelationType } from '../entities/transaction-relation.entity';

@Controller('relations')
export class RelationsController {
  constructor(private readonly relationsService: RelationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRelationDto) {
    if (dto.type === RelationType.TRANSFER_PAIR) {
      if (!dto.members || dto.members.length === 0) {
        throw new BadRequestException(
          'Transfer pair requires a members array with 1-2 entries',
        );
      }
      return this.relationsService.createTransferPair({
        members: dto.members,
        label: dto.label,
      });
    } else if (dto.type === RelationType.GROUP) {
      return this.relationsService.createGroup({
        label: dto.label,
        transactionIds: dto.transactionIds,
      });
    }
    throw new BadRequestException(`Unsupported relation type: ${dto.type}`);
  }

  @Post('transfer-pair')
  @HttpCode(HttpStatus.CREATED)
  async createTransferPair(@Body() dto: CreateTransferPairDto) {
    return this.relationsService.createTransferPair(dto);
  }

  @Post('group')
  @HttpCode(HttpStatus.CREATED)
  async createGroup(@Body() dto: CreateGroupDto) {
    return this.relationsService.createGroup(dto);
  }

  @Get()
  async findAll(@Query() query: QueryRelationDto) {
    return this.relationsService.findAll(query.type);
  }

  @Get('outstanding')
  async findOutstanding(@Query() query: QueryOutstandingDto) {
    return this.relationsService.findOutstanding(query.account_id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.relationsService.findOne(id);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.relationsService.addMember(id, dto);
  }

  @Delete(':id/members/:transactionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ) {
    await this.relationsService.removeMember(id, transactionId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRelation(@Param('id', ParseUUIDPipe) id: string) {
    await this.relationsService.removeRelation(id);
  }
}
