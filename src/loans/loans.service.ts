import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan, LoanStatus, LoanDirection } from '../entities/loan.entity';
import { Transaction, TransactionType } from '../entities/transaction.entity';
import { CreateLoanDto, AddLoanTransactionDto } from './dto';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loanRepo: Repository<Loan>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async findAll(status?: 'active' | 'completed'): Promise<any[]> {
    const qb = this.loanRepo
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.transactions', 'tx');

    if (status) {
      qb.where('loan.status = :status', { status });
    }

    qb.orderBy('loan.createdAt', 'DESC');

    const loans = await qb.getMany();

    return loans.map((loan) => ({
      ...loan,
      balance: this.computeBalance(loan),
    }));
  }

  async findOne(id: string): Promise<any> {
    const loan = await this.loanRepo.findOne({
      where: { id },
      relations: ['transactions'],
    });
    if (!loan) {
      throw new NotFoundException(`Loan with id "${id}" not found`);
    }
    return {
      ...loan,
      balance: this.computeBalance(loan),
    };
  }

  async create(dto: CreateLoanDto): Promise<Loan> {
    const loan = this.loanRepo.create({
      counterparty: dto.counterparty,
      direction: dto.direction,
      status: LoanStatus.ACTIVE,
    });
    return this.loanRepo.save(loan);
  }

  async addTransaction(
    loanId: string,
    dto: AddLoanTransactionDto,
  ): Promise<Transaction> {
    const loan = await this.loanRepo.findOne({
      where: { id: loanId },
      relations: ['transactions'],
    });
    if (!loan) {
      throw new NotFoundException(`Loan with id "${loanId}" not found`);
    }

    const transaction = this.transactionRepo.create({
      type: dto.type,
      amount: dto.amount,
      description: dto.description || null,
      date: new Date().toISOString().split('T')[0],
      loanId: loan.id,
    });

    const saved = await this.transactionRepo.save(transaction);

    // Auto-complete check: if net balance is 0, mark as completed
    const updatedLoan = await this.loanRepo.findOne({
      where: { id: loanId },
      relations: ['transactions'],
    });
    if (updatedLoan) {
      const balance = this.computeBalance(updatedLoan);
      if (balance === 0 && updatedLoan.transactions.length > 0) {
        updatedLoan.status = LoanStatus.COMPLETED;
        await this.loanRepo.save(updatedLoan);
      }
    }

    return saved;
  }

  async complete(id: string): Promise<Loan> {
    const loan = await this.loanRepo.findOne({ where: { id } });
    if (!loan) {
      throw new NotFoundException(`Loan with id "${id}" not found`);
    }
    loan.status = LoanStatus.COMPLETED;
    return this.loanRepo.save(loan);
  }

  async uncomplete(id: string): Promise<Loan> {
    const loan = await this.loanRepo.findOne({ where: { id } });
    if (!loan) {
      throw new NotFoundException(`Loan with id "${id}" not found`);
    }
    loan.status = LoanStatus.ACTIVE;
    return this.loanRepo.save(loan);
  }

  async remove(id: string): Promise<void> {
    const loan = await this.loanRepo.findOne({
      where: { id },
      relations: ['transactions'],
    });
    if (!loan) {
      throw new NotFoundException(`Loan with id "${id}" not found`);
    }
    if (loan.transactions && loan.transactions.length > 0) {
      throw new BadRequestException(
        'Cannot delete a loan that has transactions. Remove transactions first.',
      );
    }
    await this.loanRepo.remove(loan);
  }

  async getActiveLoansDifference(): Promise<number> {
    const activeLoans = await this.loanRepo.find({
      where: { status: LoanStatus.ACTIVE },
      relations: ['transactions'],
    });

    let totalDifference = 0;
    for (const loan of activeLoans) {
      totalDifference += this.computeBalance(loan);
    }
    return totalDifference;
  }

  private computeBalance(loan: Loan): number {
    if (!loan.transactions || loan.transactions.length === 0) return 0;

    let sum = 0;
    for (const tx of loan.transactions) {
      if (tx.type === TransactionType.INCOME) {
        sum += Number(tx.amount);
      } else if (tx.type === TransactionType.EXPENSE) {
        sum -= Number(tx.amount);
      }
    }
    return sum;
  }
}
