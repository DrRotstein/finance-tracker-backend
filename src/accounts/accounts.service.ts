import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, AccountType } from '../entities/account.entity';
import { Transaction } from '../entities/transaction.entity';
import { CreateAccountDto, UpdateAccountDto } from './dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async findAll(filters?: {
    type?: AccountType;
    isExternal?: boolean;
  }): Promise<(Account & { currentBalance: number })[]> {
    const qb = this.accountRepo.createQueryBuilder('a');

    if (filters?.type) {
      qb.andWhere('a.type = :type', { type: filters.type });
    }
    if (filters?.isExternal !== undefined) {
      qb.andWhere('a.is_external = :isExternal', {
        isExternal: filters.isExternal,
      });
    }

    const accounts = await qb.getMany();
    return this.attachCurrentBalances(accounts);
  }

  async findOne(id: string): Promise<Account & { currentBalance: number }> {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Account with id "${id}" not found`);
    }
    const [withBalance] = await this.attachCurrentBalances([account]);
    return withBalance;
  }

  async create(
    dto: CreateAccountDto,
  ): Promise<Account & { currentBalance: number }> {
    const account = this.accountRepo.create({
      name: dto.name,
      type: dto.type,
      startingBalance: dto.startingBalance ?? 0,
      currency: dto.currency ?? 'EUR',
      isExternal: dto.isExternal ?? false,
    });
    const saved = await this.accountRepo.save(account);
    return { ...saved, currentBalance: Number(saved.startingBalance) };
  }

  async update(
    id: string,
    dto: UpdateAccountDto,
  ): Promise<Account & { currentBalance: number }> {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Account with id "${id}" not found`);
    }

    if (dto.name !== undefined) account.name = dto.name;
    if (dto.type !== undefined) account.type = dto.type;
    if (dto.startingBalance !== undefined)
      account.startingBalance = dto.startingBalance;
    if (dto.currency !== undefined) account.currency = dto.currency;
    if (dto.isExternal !== undefined) account.isExternal = dto.isExternal;

    const saved = await this.accountRepo.save(account);
    const [withBalance] = await this.attachCurrentBalances([saved]);
    return withBalance;
  }

  async remove(id: string): Promise<void> {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Account with id "${id}" not found`);
    }

    // Check for linked transactions
    const txCount = await this.transactionRepo
      .createQueryBuilder('t')
      .where('t.from_account_id = :id OR t.to_account_id = :id', { id })
      .getCount();

    if (txCount > 0) {
      throw new ConflictException(
        `Cannot delete account "${account.name}": ${txCount} transaction(s) reference it`,
      );
    }

    await this.accountRepo.remove(account);
  }

  async getBalances(includeExternal?: boolean): Promise<{
    accounts: {
      id: string;
      name: string;
      type: AccountType;
      currency: string;
      startingBalance: number;
      currentBalance: number;
    }[];
    totalBalance: number;
  }> {
    const qb = this.accountRepo.createQueryBuilder('a');

    if (!includeExternal) {
      qb.where('a.is_external = :isExternal', { isExternal: false });
    }

    const accounts = await qb.getMany();
    const withBalances = await this.attachCurrentBalances(accounts);

    const accountsResult = withBalances.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      currency: a.currency,
      startingBalance: Number(a.startingBalance),
      currentBalance: a.currentBalance,
    }));

    const totalBalance = accountsResult
      .filter((a) => {
        // Only sum non-external accounts for total
        const original = accounts.find((acc) => acc.id === a.id);
        return original && !original.isExternal;
      })
      .reduce((sum, a) => sum + a.currentBalance, 0);

    return { accounts: accountsResult, totalBalance };
  }

  private async attachCurrentBalances(
    accounts: Account[],
  ): Promise<(Account & { currentBalance: number })[]> {
    if (accounts.length === 0) return [];

    const ids = accounts.map((a) => a.id);

    // Query to compute current balance per account
    const balances = await this.transactionRepo
      .createQueryBuilder('t')
      .select('COALESCE(t.from_account_id, t.to_account_id)', 'account_id')
      .addSelect(
        `SUM(CASE WHEN t.to_account_id IN (:...ids) THEN t.amount ELSE 0 END)`,
        'total_in',
      )
      .addSelect(
        `SUM(CASE WHEN t.from_account_id IN (:...ids) THEN t.amount ELSE 0 END)`,
        'total_out',
      )
      .where('t.from_account_id IN (:...ids) OR t.to_account_id IN (:...ids)', {
        ids,
      })
      .groupBy('account_id')
      .getRawMany();

    // Build a per-account in/out map
    const inMap = new Map<string, number>();
    const outMap = new Map<string, number>();

    // More precise: query per account individually using a different approach
    const rawResults = await this.transactionRepo
      .createQueryBuilder('t')
      .select('a.id', 'account_id')
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.to_account_id = a.id THEN t.amount ELSE 0 END), 0)`,
        'total_in',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.from_account_id = a.id THEN t.amount ELSE 0 END), 0)`,
        'total_out',
      )
      .innerJoin(
        Account,
        'a',
        'a.id = t.from_account_id OR a.id = t.to_account_id',
      )
      .where('a.id IN (:...ids)', { ids })
      .groupBy('a.id')
      .getRawMany();

    const balanceMap = new Map<string, { totalIn: number; totalOut: number }>();
    for (const row of rawResults) {
      balanceMap.set(row.account_id, {
        totalIn: parseFloat(row.total_in) || 0,
        totalOut: parseFloat(row.total_out) || 0,
      });
    }

    return accounts.map((account) => {
      const bal = balanceMap.get(account.id);
      const currentBalance =
        Number(account.startingBalance) +
        (bal ? bal.totalIn - bal.totalOut : 0);
      return { ...account, currentBalance };
    });
  }
}
