import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Account } from './account.entity';
import { Loan } from './loan.entity';

export enum TransactionType {
  EXPENSE = 'expense',
  INCOME = 'income',
  TRANSFER = 'transfer',
}

@Entity('transactions')
@Index('idx_transactions_date', ['date'])
@Index('idx_transactions_type', ['type'])
@Index('idx_transactions_from_account', ['fromAccountId'], {
  where: '"from_account_id" IS NOT NULL',
})
@Index('idx_transactions_to_account', ['toAccountId'], {
  where: '"to_account_id" IS NOT NULL',
})
@Index('idx_transactions_category', ['category'], {
  where: '"category" IS NOT NULL',
})
@Index('idx_transactions_loan', ['loanId'], {
  where: '"loan_id" IS NOT NULL',
})
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'from_account_id', type: 'uuid', nullable: true })
  fromAccountId: string | null;

  @ManyToOne(() => Account, { nullable: true })
  @JoinColumn({ name: 'from_account_id' })
  fromAccount: Account | null;

  @Column({ name: 'to_account_id', type: 'uuid', nullable: true })
  toAccountId: string | null;

  @ManyToOne(() => Account, { nullable: true })
  @JoinColumn({ name: 'to_account_id' })
  toAccount: Account | null;

  @Column({ name: 'loan_id', type: 'uuid', nullable: true })
  loanId: string | null;

  @ManyToOne(() => Loan, (loan) => loan.transactions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'loan_id' })
  loan: Loan | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
