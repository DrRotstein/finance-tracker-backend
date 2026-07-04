import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../entities/transaction.entity';
import { Account } from '../entities/account.entity';
import { TransactionRelationMember } from '../entities/transaction-relation-member.entity';
import { TransactionRelation } from '../entities/transaction-relation.entity';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { RelationsModule } from '../relations/relations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Account, TransactionRelationMember, TransactionRelation]),
    RelationsModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
