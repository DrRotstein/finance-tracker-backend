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
import { Transaction } from '../entities/transaction.entity';
import { CreateGroupDto, AddMemberDto } from './dto';

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

  async createGroup(dto: CreateGroupDto): Promise<TransactionRelation> {
    const transactionIds = dto.transactionIds || [];

    // Validate all transactions exist
    for (const txId of transactionIds) {
      const tx = await this.transactionRepo.findOne({ where: { id: txId } });
      if (!tx) {
        throw new NotFoundException(`Transaction "${txId}" not found`);
      }
    }

    // Create relation
    const relation = this.relationRepo.create({
      type: RelationType.GROUP,
      label: dto.label || null,
    });
    const savedRelation = await this.relationRepo.save(relation);

    // Create members, all with role 'member'
    for (const txId of transactionIds) {
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

    // Group members must have role "member"
    if (dto.role !== MemberRole.MEMBER) {
      throw new BadRequestException(
        'Group members must have role "member"',
      );
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
}
