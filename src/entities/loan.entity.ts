import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Transaction } from './transaction.entity';

export enum LoanDirection {
  LENT = 'lent',
  BORROWED = 'borrowed',
}

export enum LoanStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  counterparty: string;

  @Column({ type: 'enum', enum: LoanDirection })
  direction: LoanDirection;

  @Column({ type: 'enum', enum: LoanStatus, default: LoanStatus.ACTIVE })
  status: LoanStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Transaction, (transaction) => transaction.loan)
  transactions: Transaction[];
}
