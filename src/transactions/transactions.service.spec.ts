import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionType } from '../entities/transaction.entity';
import { Account, AccountType } from '../entities/account.entity';
import { TransactionRelationMember } from '../entities/transaction-relation-member.entity';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionRepo: any;
  let accountRepo: any;
  let relationMemberRepo: any;

  const mockAccount: Account = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Bank',
    type: AccountType.BANK,
    startingBalance: 1000,
    currency: 'EUR',
    isExternal: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransaction: Transaction = {
    id: '660e8400-e29b-41d4-a716-446655440000',
    type: TransactionType.EXPENSE,
    amount: 50,
    fromAccountId: mockAccount.id,
    fromAccount: mockAccount,
    toAccountId: null,
    toAccount: null,
    date: '2026-07-01',
    category: 'food',
    description: 'Groceries',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockTransaction], 1]),
    };

    transactionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    accountRepo = {
      findOne: jest.fn(),
    };

    relationMemberRepo = {
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: transactionRepo,
        },
        { provide: getRepositoryToken(Account), useValue: accountRepo },
        {
          provide: getRepositoryToken(TransactionRelationMember),
          useValue: relationMemberRepo,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  describe('findAll', () => {
    it('should return paginated transactions', async () => {
      const result = await service.findAll({});
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should respect page and limit params', async () => {
      await service.findAll({ page: 2, limit: 10 });
      const qb = transactionRepo.createQueryBuilder();
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('should cap limit at 100', async () => {
      await service.findAll({ limit: 200 });
      const qb = transactionRepo.createQueryBuilder();
      expect(qb.take).toHaveBeenCalledWith(100);
    });
  });

  describe('findOne', () => {
    it('should return a transaction with relations', async () => {
      transactionRepo.findOne.mockResolvedValue(mockTransaction);
      const result = await service.findOne(mockTransaction.id);
      expect(result.id).toBe(mockTransaction.id);
    });

    it('should throw NotFoundException for non-existent id', async () => {
      transactionRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create an expense transaction', async () => {
      accountRepo.findOne.mockResolvedValue(mockAccount);
      transactionRepo.create.mockReturnValue(mockTransaction);
      transactionRepo.save.mockResolvedValue(mockTransaction);
      transactionRepo.findOne.mockResolvedValue(mockTransaction);

      const result = await service.create({
        type: TransactionType.EXPENSE,
        amount: 50,
        fromAccountId: mockAccount.id,
        date: '2026-07-01',
        category: 'food',
      });
      expect(result.type).toBe(TransactionType.EXPENSE);
    });

    it('should throw BadRequestException if expense has no fromAccountId', async () => {
      await expect(
        service.create({
          type: TransactionType.EXPENSE,
          amount: 50,
          date: '2026-07-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if income has no toAccountId', async () => {
      await expect(
        service.create({
          type: TransactionType.INCOME,
          amount: 50,
          date: '2026-07-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if transfer missing accounts', async () => {
      await expect(
        service.create({
          type: TransactionType.TRANSFER,
          amount: 50,
          fromAccountId: mockAccount.id,
          date: '2026-07-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnprocessableEntityException if account does not exist', async () => {
      accountRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          type: TransactionType.EXPENSE,
          amount: 50,
          fromAccountId: 'non-existent-uuid',
          date: '2026-07-01',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('update', () => {
    it('should update a transaction', async () => {
      transactionRepo.findOne.mockResolvedValue({ ...mockTransaction });
      transactionRepo.save.mockResolvedValue(mockTransaction);
      accountRepo.findOne.mockResolvedValue(mockAccount);

      // For the findOne call after save
      transactionRepo.findOne
        .mockResolvedValueOnce({ ...mockTransaction })
        .mockResolvedValueOnce(mockTransaction);

      const result = await service.update(mockTransaction.id, { amount: 75 });
      expect(transactionRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent id', async () => {
      transactionRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update('non-existent', { amount: 75 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete the transaction and its relation members', async () => {
      transactionRepo.findOne.mockResolvedValue(mockTransaction);
      transactionRepo.remove.mockResolvedValue(mockTransaction);

      await service.remove(mockTransaction.id);
      expect(relationMemberRepo.delete).toHaveBeenCalledWith({
        transactionId: mockTransaction.id,
      });
      expect(transactionRepo.remove).toHaveBeenCalledWith(mockTransaction);
    });

    it('should throw NotFoundException for non-existent id', async () => {
      transactionRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
