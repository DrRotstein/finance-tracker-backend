import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { Account, AccountType } from '../entities/account.entity';
import { Transaction } from '../entities/transaction.entity';

describe('AccountsService', () => {
  let service: AccountsService;
  let accountRepo: any;
  let transactionRepo: any;

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

  beforeEach(async () => {
    const mockQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockAccount]),
      where: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    accountRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    transactionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: getRepositoryToken(Account), useValue: accountRepo },
        { provide: getRepositoryToken(Transaction), useValue: transactionRepo },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  describe('findAll', () => {
    it('should return all accounts with current balances', async () => {
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Bank');
      expect(result[0]).toHaveProperty('currentBalance');
    });

    it('should apply type filter', async () => {
      await service.findAll({ type: AccountType.BANK });
      const qb = accountRepo.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an account by id', async () => {
      accountRepo.findOne.mockResolvedValue(mockAccount);
      const result = await service.findOne(mockAccount.id);
      expect(result.id).toBe(mockAccount.id);
      expect(result).toHaveProperty('currentBalance');
    });

    it('should throw NotFoundException for non-existent id', async () => {
      accountRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create and return an account', async () => {
      const dto = { name: 'New Account' };
      accountRepo.create.mockReturnValue(mockAccount);
      accountRepo.save.mockResolvedValue(mockAccount);

      const result = await service.create(dto);
      expect(result.name).toBe('Test Bank');
      expect(accountRepo.create).toHaveBeenCalled();
      expect(accountRepo.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return the account', async () => {
      accountRepo.findOne.mockResolvedValue({ ...mockAccount });
      accountRepo.save.mockResolvedValue({ ...mockAccount, name: 'Updated' });

      const result = await service.update(mockAccount.id, { name: 'Updated' });
      expect(accountRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent id', async () => {
      accountRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update('non-existent-id', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete the account if no transactions reference it', async () => {
      accountRepo.findOne.mockResolvedValue(mockAccount);
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      transactionRepo.createQueryBuilder.mockReturnValue(mockQb);
      accountRepo.remove.mockResolvedValue(mockAccount);

      await service.remove(mockAccount.id);
      expect(accountRepo.remove).toHaveBeenCalledWith(mockAccount);
    });

    it('should throw ConflictException if transactions reference it', async () => {
      accountRepo.findOne.mockResolvedValue(mockAccount);
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      };
      transactionRepo.createQueryBuilder.mockReturnValue(mockQb);

      await expect(service.remove(mockAccount.id)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException for non-existent id', async () => {
      accountRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
