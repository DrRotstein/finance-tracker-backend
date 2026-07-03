import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AccountType {
  BANK = 'bank',
  CASH = 'cash',
  PAYPAL = 'paypal',
  PERSON = 'person',
  OTHER = 'other',
}

@Entity('accounts')
@Index('idx_accounts_type', ['type'])
@Index('idx_accounts_is_external', ['isExternal'])
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: AccountType,
    default: AccountType.BANK,
  })
  type: AccountType;

  @Column({
    name: 'starting_balance',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  startingBalance: number;

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency: string;

  @Column({ name: 'is_external', type: 'boolean', default: false })
  isExternal: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
