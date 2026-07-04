import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType } from '../entities/transaction.entity';
import { Account } from '../entities/account.entity';
import { TransactionRelationMember } from '../entities/transaction-relation-member.entity';
import {
  TransactionRelation,
  RelationType,
} from '../entities/transaction-relation.entity';
import { MemberRole } from '../entities/transaction-relation-member.entity';
import { CreateTransactionDto, UpdateTransactionDto } from './dto';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(TransactionRelationMember)
    private readonly relationMemberRepo: Repository<TransactionRelationMember>,
    @InjectRepository(TransactionRelation)
    private readonly relationRepo: Repository<TransactionRelation>,
  ) {}

  async findAll(filters: {
    type?: TransactionType;
    accountId?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }): Promise<PaginatedResult<Transaction>> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    const qb = this.transactionRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.fromAccount', 'fromAccount')
      .leftJoinAndSelect('t.toAccount', 'toAccount');

    if (filters.type) {
      qb.andWhere('t.type = :type', { type: filters.type });
    }

    if (filters.accountId) {
      qb.andWhere(
        '(t.from_account_id = :accountId OR t.to_account_id = :accountId)',
        { accountId: filters.accountId },
      );
    }

    if (filters.category) {
      qb.andWhere('t.category = :category', { category: filters.category });
    }

    if (filters.dateFrom) {
      qb.andWhere('t.date >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere('t.date <= :dateTo', { dateTo: filters.dateTo });
    }

    // Sorting
    const sortField = filters.sort || 'date';
    const allowedSortFields = ['date', 'amount', 'created_at'];
    const actualSort = allowedSortFields.includes(sortField)
      ? sortField
      : 'date';
    const direction =
      filters.sort?.startsWith('-') ? 'ASC' : 'DESC';
    qb.orderBy(`t.${actualSort}`, direction);

    const [data, total] = await qb.skip(offset).take(limit).getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepo.findOne({
      where: { id },
      relations: ['fromAccount', 'toAccount'],
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction with id "${id}" not found`);
    }
    return transaction;
  }

  async create(dto: CreateTransactionDto): Promise<Transaction> {
    // Validate account rules per type
    this.validateAccountRules(dto.type, dto.fromAccountId, dto.toAccountId);

    // Validate referenced accounts exist
    if (dto.fromAccountId) {
      await this.validateAccountExists(dto.fromAccountId, 'fromAccountId');
    }
    if (dto.toAccountId) {
      await this.validateAccountExists(dto.toAccountId, 'toAccountId');
    }

    const transaction = this.transactionRepo.create({
      type: dto.type,
      amount: dto.amount,
      fromAccountId: dto.fromAccountId || null,
      toAccountId: dto.toAccountId || null,
      date: dto.date,
      category: dto.category || null,
      description: dto.description || null,
    });

    const saved = await this.transactionRepo.save(transaction);

    // BUG-003: Auto-pairing for transfers involving external accounts
    if (dto.type === TransactionType.TRANSFER) {
      await this.handleAutoPairing(saved);
    }

    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    const transaction = await this.transactionRepo.findOne({ where: { id } });
    if (!transaction) {
      throw new NotFoundException(`Transaction with id "${id}" not found`);
    }

    // Apply updates
    if (dto.amount !== undefined) transaction.amount = dto.amount;
    if (dto.fromAccountId !== undefined)
      transaction.fromAccountId = dto.fromAccountId;
    if (dto.toAccountId !== undefined)
      transaction.toAccountId = dto.toAccountId;
    if (dto.date !== undefined) transaction.date = dto.date;
    if (dto.category !== undefined) transaction.category = dto.category;
    if (dto.description !== undefined)
      transaction.description = dto.description;

    // Validate the resulting state
    this.validateAccountRules(
      transaction.type,
      transaction.fromAccountId ?? undefined,
      transaction.toAccountId ?? undefined,
    );

    // Validate referenced accounts exist
    if (transaction.fromAccountId) {
      await this.validateAccountExists(
        transaction.fromAccountId,
        'fromAccountId',
      );
    }
    if (transaction.toAccountId) {
      await this.validateAccountExists(
        transaction.toAccountId,
        'toAccountId',
      );
    }

    await this.transactionRepo.save(transaction);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const transaction = await this.transactionRepo.findOne({ where: { id } });
    if (!transaction) {
      throw new NotFoundException(`Transaction with id "${id}" not found`);
    }

    // Delete relation members that reference this transaction (cascade handles this at DB level,
    // but we're explicit here for clarity)
    await this.relationMemberRepo.delete({ transactionId: id });
    await this.transactionRepo.remove(transaction);
  }

  private validateAccountRules(
    type: TransactionType,
    fromAccountId?: string,
    toAccountId?: string,
  ): void {
    switch (type) {
      case TransactionType.EXPENSE:
        if (!fromAccountId) {
          throw new BadRequestException(
            'Expense transactions require fromAccountId',
          );
        }
        if (toAccountId) {
          throw new BadRequestException(
            'Expense transactions must not have toAccountId',
          );
        }
        break;
      case TransactionType.INCOME:
        if (!toAccountId) {
          throw new BadRequestException(
            'Income transactions require toAccountId',
          );
        }
        if (fromAccountId) {
          throw new BadRequestException(
            'Income transactions must not have fromAccountId',
          );
        }
        break;
      case TransactionType.TRANSFER:
        if (!fromAccountId || !toAccountId) {
          throw new BadRequestException(
            'Transfer transactions require both fromAccountId and toAccountId',
          );
        }
        break;
    }
  }

  private async validateAccountExists(
    accountId: string,
    fieldName: string,
  ): Promise<void> {
    const exists = await this.accountRepo.findOne({
      where: { id: accountId },
    });
    if (!exists) {
      throw new UnprocessableEntityException(
        `Account referenced by ${fieldName} ("${accountId}") does not exist`,
      );
    }
  }

  async getMonthlySummary(filters: {
    from?: string;
    to?: string;
    accountId?: string;
  }): Promise<{
    months: {
      month: string;
      totalIncome: number;
      totalExpenses: number;
      totalTransfers: number;
      net: number;
    }[];
    summary: {
      totalIncome: number;
      totalExpenses: number;
      totalTransfers: number;
    };
  }> {
    // Default: last 12 months
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const fromDate =
      filters.from || defaultFrom.toISOString().split('T')[0];
    const toDate =
      filters.to || now.toISOString().split('T')[0];

    const qb = this.transactionRepo
      .createQueryBuilder('t')
      .select("TO_CHAR(DATE_TRUNC('month', t.date), 'YYYY-MM')", 'month')
      .addSelect(
        "COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0)",
        'total_income',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0)",
        'total_expenses',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN t.type = 'transfer' THEN t.amount ELSE 0 END), 0)",
        'total_transfers',
      )
      .where('t.date >= :fromDate', { fromDate })
      .andWhere('t.date <= :toDate', { toDate });

    if (filters.accountId) {
      qb.andWhere(
        '(t.from_account_id = :accountId OR t.to_account_id = :accountId)',
        { accountId: filters.accountId },
      );
    }

    qb.groupBy("DATE_TRUNC('month', t.date)")
      .orderBy("DATE_TRUNC('month', t.date)", 'DESC');

    const rawResults = await qb.getRawMany();

    // Build map of existing months
    const monthMap = new Map<
      string,
      { totalIncome: number; totalExpenses: number; totalTransfers: number }
    >();
    for (const row of rawResults) {
      monthMap.set(row.month, {
        totalIncome: parseFloat(row.total_income) || 0,
        totalExpenses: parseFloat(row.total_expenses) || 0,
        totalTransfers: parseFloat(row.total_transfers) || 0,
      });
    }

    // Generate all months in range (fill zeros)
    const months: {
      month: string;
      totalIncome: number;
      totalExpenses: number;
      totalTransfers: number;
      net: number;
    }[] = [];

    const startDate = new Date(fromDate + 'T00:00:00Z');
    const endDate = new Date(toDate + 'T00:00:00Z');
    const cursor = new Date(
      Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1),
    );
    const endMonth = new Date(
      Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1),
    );

    while (cursor <= endMonth) {
      const monthStr = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
      const data = monthMap.get(monthStr) || {
        totalIncome: 0,
        totalExpenses: 0,
        totalTransfers: 0,
      };
      months.push({
        month: monthStr,
        totalIncome: data.totalIncome,
        totalExpenses: data.totalExpenses,
        totalTransfers: data.totalTransfers,
        net: data.totalIncome - data.totalExpenses,
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    // Sort DESC
    months.sort((a, b) => b.month.localeCompare(a.month));

    const summary = {
      totalIncome: months.reduce((s, m) => s + m.totalIncome, 0),
      totalExpenses: months.reduce((s, m) => s + m.totalExpenses, 0),
      totalTransfers: months.reduce((s, m) => s + m.totalTransfers, 0),
    };

    return { months, summary };
  }

  /**
   * BUG-003: Auto-pairing for transfers involving external accounts.
   * When a transfer is created where either account is external:
   * 1. Check if there's an existing outstanding transfer_pair between the same two accounts
   *    with the same amount in the opposite direction — if so, add this as the matching member.
   * 2. Otherwise, create a new transfer_pair with this transaction as the sole member.
   */
  private async handleAutoPairing(transaction: Transaction): Promise<void> {
    // Load accounts to check isExternal
    const fromAccount = transaction.fromAccountId
      ? await this.accountRepo.findOne({ where: { id: transaction.fromAccountId } })
      : null;
    const toAccount = transaction.toAccountId
      ? await this.accountRepo.findOne({ where: { id: transaction.toAccountId } })
      : null;

    // Only auto-pair if at least one account is external
    const hasExternal =
      (fromAccount && fromAccount.isExternal) ||
      (toAccount && toAccount.isExternal);
    if (!hasExternal) return;

    // Determine the role for this transaction:
    // If from_account is the user's (not external) and to_account is external => outgoing (user lends)
    // If to_account is the user's (not external) and from_account is external => incoming (user receives back)
    let role: MemberRole;
    if (fromAccount && !fromAccount.isExternal && toAccount && toAccount.isExternal) {
      role = MemberRole.OUTGOING;
    } else if (toAccount && !toAccount.isExternal && fromAccount && fromAccount.isExternal) {
      role = MemberRole.INCOMING;
    } else {
      // Both external or both internal — don't auto-pair
      return;
    }

    // Try to find an existing outstanding transfer_pair (with 1 member) between same accounts, same amount, opposite direction
    const oppositeRole = role === MemberRole.OUTGOING ? MemberRole.INCOMING : MemberRole.OUTGOING;

    // For matching: if this is outgoing (A->B), look for an existing pair with an incoming member (B->A) or
    // if this is incoming (B->A), look for an existing pair with an outgoing member (A->B)
    const existingPairs = await this.relationRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.members', 'members')
      .leftJoinAndSelect('members.transaction', 'tx')
      .where('r.type = :type', { type: RelationType.TRANSFER_PAIR })
      .getMany();

    // Filter to outstanding pairs (exactly 1 member) with opposite role, same accounts (reversed), same amount
    const matchingPair = existingPairs.find((r) => {
      if (r.members.length !== 1) return false;
      const existingMember = r.members[0];
      if (existingMember.role !== oppositeRole) return false;

      const existingTx = existingMember.transaction;
      if (!existingTx) return false;

      // Check same amount
      if (Number(existingTx.amount) !== Number(transaction.amount)) return false;

      // Check accounts are reversed
      if (role === MemberRole.INCOMING) {
        // This tx: external -> user (incoming). Existing should be: user -> external (outgoing)
        // existingTx.fromAccountId should be our toAccountId, existingTx.toAccountId should be our fromAccountId
        return (
          existingTx.fromAccountId === transaction.toAccountId &&
          existingTx.toAccountId === transaction.fromAccountId
        );
      } else {
        // This tx: user -> external (outgoing). Existing should be: external -> user (incoming)
        // existingTx.fromAccountId should be our toAccountId, existingTx.toAccountId should be our fromAccountId
        return (
          existingTx.fromAccountId === transaction.toAccountId &&
          existingTx.toAccountId === transaction.fromAccountId
        );
      }
    });

    if (matchingPair) {
      // Add this transaction as the matching member to complete the pair
      const member = this.relationMemberRepo.create({
        relationId: matchingPair.id,
        transactionId: transaction.id,
        role,
      });
      await this.relationMemberRepo.save(member);
    } else {
      // Create a new transfer_pair with this transaction as the sole member
      const relation = this.relationRepo.create({
        type: RelationType.TRANSFER_PAIR,
        label: null,
      });
      const savedRelation = await this.relationRepo.save(relation);

      const member = this.relationMemberRepo.create({
        relationId: savedRelation.id,
        transactionId: transaction.id,
        role,
      });
      await this.relationMemberRepo.save(member);
    }
  }
}
