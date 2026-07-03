import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionRelation } from '../entities/transaction-relation.entity';
import { TransactionRelationMember } from '../entities/transaction-relation-member.entity';
import { Transaction } from '../entities/transaction.entity';
import { RelationsController } from './relations.controller';
import { RelationsService } from './relations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionRelation,
      TransactionRelationMember,
      Transaction,
    ]),
  ],
  controllers: [RelationsController],
  providers: [RelationsService],
  exports: [RelationsService],
})
export class RelationsModule {}
