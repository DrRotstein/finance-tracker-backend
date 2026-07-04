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
} from '@nestjs/common';
import { RelationsService } from './relations.service';
import { CreateGroupDto, AddMemberDto, QueryRelationDto } from './dto';

@Controller('relations')
export class RelationsController {
  constructor(private readonly relationsService: RelationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateGroupDto) {
    return this.relationsService.createGroup(dto);
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
