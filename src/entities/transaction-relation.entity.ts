import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { TransactionRelationMember } from './transaction-relation-member.entity';

export enum RelationType {
  TRANSFER_PAIR = 'transfer_pair',
  GROUP = 'group',
}

@Entity('transaction_relations')
export class TransactionRelation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: RelationType })
  type: RelationType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  label: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => TransactionRelationMember, (member) => member.relation)
  members: TransactionRelationMember[];
}
