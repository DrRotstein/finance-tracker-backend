import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { RelationsService } from './relations.service';
import {
  TransactionRelation,
  RelationType,
} from '../entities/transaction-relation.entity';
import {
  TransactionRelationMember,
  MemberRole,
} from '../entities/transaction-relation-member.entity';
import { Transaction, TransactionType } from '../entities/transaction.entity';

describe('RelationsService', () => {
  let service: RelationsService;
  let relationRepo: any;
  let memberRepo: any;
  let transactionRepo: any;

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    relationRepo = {
      create: jest.fn((data) => ({ id: 'rel-1', ...data })),
      save: jest.fn((entity) => Promise.resolve({ id: 'rel-1', ...entity })),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    memberRepo = {
      create: jest.fn((data) => ({ id: 'mem-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    transactionRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelationsService,
        {
          provide: getRepositoryToken(TransactionRelation),
          useValue: relationRepo,
        },
        {
          provide: getRepositoryToken(TransactionRelationMember),
          useValue: memberRepo,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: transactionRepo,
        },
      ],
    }).compile();

    service = module.get<RelationsService>(RelationsService);
  });

  describe('createTransferPair', () => {
    it('should create a transfer pair with 1 member', async () => {
      transactionRepo.findOne.mockResolvedValue({
        id: 'tx-1',
        type: TransactionType.TRANSFER,
      });

      const mockRelation = {
        id: 'rel-1',
        type: RelationType.TRANSFER_PAIR,
        label: null,
        members: [
          {
            id: 'mem-1',
            transactionId: 'tx-1',
            role: MemberRole.OUTGOING,
            transaction: { id: 'tx-1', type: TransactionType.TRANSFER },
          },
        ],
      };

      const qb = relationRepo.createQueryBuilder();
      qb.getOne.mockResolvedValue(mockRelation);

      const result = await service.createTransferPair({
        members: [{ transactionId: 'tx-1', role: MemberRole.OUTGOING }],
      });

      expect(result).toBeDefined();
      expect(relationRepo.save).toHaveBeenCalled();
      expect(memberRepo.save).toHaveBeenCalled();
    });

    it('should reject pair with invalid roles for 2 members', async () => {
      await expect(
        service.createTransferPair({
          members: [
            { transactionId: 'tx-1', role: MemberRole.OUTGOING },
            { transactionId: 'tx-2', role: MemberRole.OUTGOING },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject non-transfer transactions', async () => {
      transactionRepo.findOne.mockResolvedValue({
        id: 'tx-1',
        type: TransactionType.EXPENSE,
      });

      await expect(
        service.createTransferPair({
          members: [{ transactionId: 'tx-1', role: MemberRole.OUTGOING }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createGroup', () => {
    it('should create a group with transactions', async () => {
      transactionRepo.findOne.mockResolvedValue({
        id: 'tx-1',
        type: TransactionType.EXPENSE,
      });

      const mockRelation = {
        id: 'rel-1',
        type: RelationType.GROUP,
        label: 'Test Group',
        members: [],
      };

      const qb = relationRepo.createQueryBuilder();
      qb.getOne.mockResolvedValue(mockRelation);

      const result = await service.createGroup({
        label: 'Test Group',
        transactionIds: ['tx-1'],
      });

      expect(result).toBeDefined();
      expect(relationRepo.save).toHaveBeenCalled();
    });

    it('should reject group if transaction not found', async () => {
      transactionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createGroup({
          label: 'Group',
          transactionIds: ['nonexistent'],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addMember', () => {
    it('should reject duplicate member', async () => {
      relationRepo.findOne.mockResolvedValue({
        id: 'rel-1',
        type: RelationType.TRANSFER_PAIR,
        members: [{ transactionId: 'tx-1', role: MemberRole.OUTGOING }],
      });
      transactionRepo.findOne.mockResolvedValue({
        id: 'tx-1',
        type: TransactionType.TRANSFER,
      });
      memberRepo.findOne.mockResolvedValue({ id: 'mem-1' });

      await expect(
        service.addMember('rel-1', {
          transactionId: 'tx-1',
          role: MemberRole.INCOMING,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject adding more than 2 members to transfer pair', async () => {
      relationRepo.findOne.mockResolvedValue({
        id: 'rel-1',
        type: RelationType.TRANSFER_PAIR,
        members: [
          { transactionId: 'tx-1', role: MemberRole.OUTGOING },
          { transactionId: 'tx-2', role: MemberRole.INCOMING },
        ],
      });
      transactionRepo.findOne.mockResolvedValue({
        id: 'tx-3',
        type: TransactionType.TRANSFER,
      });
      memberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addMember('rel-1', {
          transactionId: 'tx-3',
          role: MemberRole.OUTGOING,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeRelation', () => {
    it('should remove a relation', async () => {
      relationRepo.findOne.mockResolvedValue({
        id: 'rel-1',
        type: RelationType.GROUP,
      });

      await service.removeRelation('rel-1');
      expect(relationRepo.remove).toHaveBeenCalled();
    });

    it('should throw NotFoundException for missing relation', async () => {
      relationRepo.findOne.mockResolvedValue(null);

      await expect(service.removeRelation('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOutstanding', () => {
    it('should return outstanding transfer pairs (1 member only)', async () => {
      const qb = relationRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([
        {
          id: 'rel-1',
          type: RelationType.TRANSFER_PAIR,
          label: null,
          members: [
            {
              role: MemberRole.OUTGOING,
              transaction: {
                id: 'tx-1',
                amount: 50,
                date: '2026-06-15',
                description: 'Lent to Bob',
                fromAccountId: 'acc-1',
                toAccountId: 'acc-2',
                fromAccount: { id: 'acc-1', name: 'Cash' },
                toAccount: { id: 'acc-2', name: 'Bob' },
              },
            },
          ],
        },
        {
          id: 'rel-2',
          type: RelationType.TRANSFER_PAIR,
          members: [
            { role: MemberRole.OUTGOING, transaction: { id: 'tx-2' } },
            { role: MemberRole.INCOMING, transaction: { id: 'tx-3' } },
          ],
        },
      ]);

      const result = await service.findOutstanding();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].direction).toBe('you_owe');
      expect(result.summary.totalOwing).toBe(50);
    });
  });
});
