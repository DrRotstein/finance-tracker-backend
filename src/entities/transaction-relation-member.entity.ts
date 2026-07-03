import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { TransactionRelation } from './transaction-relation.entity';
import { Transaction } from './transaction.entity';

export enum MemberRole {
  OUTGOING = 'outgoing',
  INCOMING = 'incoming',
  MEMBER = 'member',
}

@Entity('transaction_relation_members')
@Unique('uq_relation_transaction', ['relationId', 'transactionId'])
@Index('idx_trm_relation', ['relationId'])
@Index('idx_trm_transaction', ['transactionId'])
export class TransactionRelationMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'relation_id', type: 'uuid' })
  relationId: string;

  @ManyToOne(() => TransactionRelation, (relation) => relation.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'relation_id' })
  relation: TransactionRelation;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId: string;

  @ManyToOne(() => Transaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ type: 'enum', enum: MemberRole })
  role: MemberRole;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
