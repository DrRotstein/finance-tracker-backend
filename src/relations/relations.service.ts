import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TransactionRelation,
  RelationType,
} from '../entities/transaction-relation.entity';
import {
  TransactionRelationMember,
  MemberRole,
} from '../entities/transaction-relation-member.entity';
import { Transaction, TransactionType } from '../entities/transaction.entity';
import {
  CreateTransferPairDto,
  CreateGroupDto,
  AddMemberDto,
} from './dto';

@Injectable()
export class RelationsService {
  constructor(
    @InjectRepository(TransactionRelation)
    private readonly relationRepo: Repository<TransactionRelation>,
    @InjectRepository(TransactionRelationMember)
    private readonly memberRepo: Repository<TransactionRelationMember>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async createTransferPair(dto: CreateTransferPairDto): Promise<TransactionRelation> {
    // Validate members: max 2, roles must be outgoing + incoming (or 1 if single)
    if (dto.members.length === 2) {
      const roles = dto.members.map((m) => m.role).sort();
      if (
        roles[0] !== MemberRole.INCOMING ||
        roles[1] !== MemberRole.OUTGOING
      ) {
        throw new BadRequestException(
          'Transfer pair with 2 members must have one outgoing and one incoming role',
        );
      }
    } else {
      // Single member: must be outgoing or incoming
      if (
        dto.members[0].role !== MemberRole.OUTGOING &&
        dto.members[0].role !== MemberRole.INCOMING
      ) {
        throw new BadRequestException(
          'Transfer pair member must have role outgoing or incoming',
        );
      }
    }

    // Validate all transactions exist and are of type transfer
    for (const member of dto.members) {
      const tx = await this.transactionRepo.findOne({
        where: { id: member.transactionId },
      });
      if (!tx) {
        throw new NotFoundException(
          `Transaction "${member.transactionId}" not found`,
        );
      }
      if (tx.type !== TransactionType.TRANSFER) {
        throw new BadRequestException(
          `Transaction "${member.transactionId}" must be of type transfer`,
        );
      }
    }

    // Create relation
    const relation = this.relationRepo.create({
      type: RelationType.TRANSFER_PAIR,
      label: dto.label || null,
    });
    const savedRelation = await this.relationRepo.save(relation);

    // Create members
    for (const member of dto.members) {
      const memberEntity = this.memberRepo.create({
        relationId: savedRelation.id,
        transactionId: member.transactionId,
        role: member.role,
      });
      await this.memberRepo.save(memberEntity);
    }

    return this.findOne(savedRelation.id);
  }

  async createGroup(dto: CreateGroupDto): Promise<TransactionRelation> {
    // Validate all transactions exist
    for (const txId of dto.transactionIds) {
      const tx = await this.transactionRepo.findOne({ where: { id: txId } });
      if (!tx) {
        throw new NotFoundException(`Transaction "${txId}" not found`);
      }
    }

    // Create relation
    const relation = this.relationRepo.create({
      type: RelationType.GROUP,
      label: dto.label,
    });
    const savedRelation = await this.relationRepo.save(relation);

    // Create members, all with role 'member'
    for (const txId of dto.transactionIds) {
      const memberEntity = this.memberRepo.create({
        relationId: savedRelation.id,
        transactionId: txId,
        role: MemberRole.MEMBER,
      });
      await this.memberRepo.save(memberEntity);
    }

    return this.findOne(savedRelation.id);
  }

  async findAll(type?: RelationType): Promise<TransactionRelation[]> {
    const qb = this.relationRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.members', 'members')
      .leftJoinAndSelect('members.transaction', 'transaction')
      .leftJoinAndSelect('transaction.fromAccount', 'fromAccount')
      .leftJoinAndSelect('transaction.toAccount', 'toAccount');

    if (type) {
      qb.where('r.type = :type', { type });
    }

    qb.orderBy('r.createdAt', 'DESC');

    return qb.getMany();
  }

  async findOne(id: string): Promise<TransactionRelation> {
    const relation = await this.relationRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.members', 'members')
      .leftJoinAndSelect('members.transaction', 'transaction')
      .leftJoinAndSelect('transaction.fromAccount', 'fromAccount')
      .leftJoinAndSelect('transaction.toAccount', 'toAccount')
      .where('r.id = :id', { id })
      .getOne();

    if (!relation) {
      throw new NotFoundException(`Relation with id "${id}" not found`);
    }

    return relation;
  }

  async addMember(
    relationId: string,
    dto: AddMemberDto,
  ): Promise<TransactionRelation> {
    const relation = await this.relationRepo.findOne({
      where: { id: relationId },
      relations: ['members'],
    });

    if (!relation) {
      throw new NotFoundException(`Relation with id "${relationId}" not found`);
    }

    // Validate transaction exists
    const tx = await this.transactionRepo.findOne({
      where: { id: dto.transactionId },
    });
    if (!tx) {
      throw new NotFoundException(
        `Transaction "${dto.transactionId}" not found`,
      );
    }

    // Check for duplicate member
    const existingMember = await this.memberRepo.findOne({
      where: { relationId, transactionId: dto.transactionId },
    });
    if (existingMember) {
      throw new ConflictException(
        `Transaction "${dto.transactionId}" is already a member of this relation`,
      );
    }

    // Validate rules based on relation type
    if (relation.type === RelationType.TRANSFER_PAIR) {
      if (relation.members.length >= 2) {
        throw new BadRequestException(
          'Transfer pair cannot have more than 2 members',
        );
      }
      if (dto.role === MemberRole.MEMBER) {
        throw new BadRequestException(
          'Transfer pair members must have role outgoing or incoming',
        );
      }
      if (tx.type !== TransactionType.TRANSFER) {
        throw new BadRequestException(
          `Transaction "${dto.transactionId}" must be of type transfer`,
        );
      }
      // Ensure we don't duplicate roles in a pair
      const existingRoles = relation.members.map((m) => m.role);
      if (existingRoles.includes(dto.role)) {
        throw new BadRequestException(
          `Transfer pair already has a member with role "${dto.role}"`,
        );
      }
    } else if (relation.type === RelationType.GROUP) {
      if (dto.role !== MemberRole.MEMBER) {
        throw new BadRequestException(
          'Group members must have role "member"',
        );
      }
    }

    const member = this.memberRepo.create({
      relationId,
      transactionId: dto.transactionId,
      role: dto.role,
    });
    await this.memberRepo.save(member);

    return this.findOne(relationId);
  }

  async removeMember(
    relationId: string,
    transactionId: string,
  ): Promise<void> {
    const relation = await this.relationRepo.findOne({
      where: { id: relationId },
    });
    if (!relation) {
      throw new NotFoundException(`Relation with id "${relationId}" not found`);
    }

    const member = await this.memberRepo.findOne({
      where: { relationId, transactionId },
    });
    if (!member) {
      throw new NotFoundException(
        `Transaction "${transactionId}" is not a member of relation "${relationId}"`,
      );
    }

    await this.memberRepo.remove(member);
  }

  async removeRelation(id: string): Promise<void> {
    const relation = await this.relationRepo.findOne({ where: { id } });
    if (!relation) {
      throw new NotFoundException(`Relation with id "${id}" not found`);
    }
    await this.relationRepo.remove(relation);
  }

  // TASK-011: Outstanding transfers
  async findOutstanding(accountId?: string): Promise<{
    data: any[];
    summary: { totalOwed: number; totalOwing: number };
  }> {
    // Find transfer_pair relations with exactly 1 member
    const qb = this.relationRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.members', 'members')
      .leftJoinAndSelect('members.transaction', 'transaction')
      .leftJoinAndSelect('transaction.fromAccount', 'fromAccount')
      .leftJoinAndSelect('transaction.toAccount', 'toAccount')
      .where('r.type = :type', { type: RelationType.TRANSFER_PAIR });

    const relations = await qb.getMany();

    // Filter to only those with exactly 1 member
    let outstanding = relations.filter((r) => r.members.length === 1);

    // Filter by account if specified
    if (accountId) {
      outstanding = outstanding.filter((r) => {
        const tx = r.members[0].transaction;
        return tx.fromAccountId === accountId || tx.toAccountId === accountId;
      });
    }

    // Sort by transaction date DESC
    outstanding.sort((a, b) => {
      const dateA = new Date(a.members[0].transaction.date).getTime();
      const dateB = new Date(b.members[0].transaction.date).getTime();
      return dateB - dateA;
    });

    let totalOwed = 0; // others owe user (incoming exists, outgoing missing)
    let totalOwing = 0; // user owes others (outgoing exists, incoming missing)

    const data = outstanding.map((r) => {
      const member = r.members[0];
      const tx = member.transaction;
      const direction =
        member.role === MemberRole.OUTGOING ? 'you_owe' : 'owes_you';

      if (direction === 'you_owe') {
        totalOwing += Number(tx.amount);
      } else {
        totalOwed += Number(tx.amount);
      }

      return {
        relationId: r.id,
        label: r.label,
        direction,
        transaction: {
          id: tx.id,
          amount: tx.amount,
          date: tx.date,
          description: tx.description,
          fromAccount: tx.fromAccount
            ? { id: tx.fromAccount.id, name: tx.fromAccount.name }
            : null,
          toAccount: tx.toAccount
            ? { id: tx.toAccount.id, name: tx.toAccount.name }
            : null,
        },
      };
    });

    return {
      data,
      summary: { totalOwed, totalOwing },
    };
  }
}
