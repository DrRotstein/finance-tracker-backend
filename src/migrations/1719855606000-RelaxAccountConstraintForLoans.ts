import { MigrationInterface, QueryRunner } from 'typeorm';

export class RelaxAccountConstraintForLoans1719855606000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old constraint that requires accounts for all expense/income
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "chk_transaction_accounts"`,
    );

    // Add updated constraint: loan transactions (loan_id IS NOT NULL) are exempt
    await queryRunner.query(`
      ALTER TABLE "transactions" ADD CONSTRAINT "chk_transaction_accounts" CHECK (
        "loan_id" IS NOT NULL OR (
          CASE "type"
            WHEN 'expense'  THEN from_account_id IS NOT NULL AND to_account_id IS NULL
            WHEN 'income'   THEN to_account_id IS NOT NULL AND from_account_id IS NULL
            WHEN 'transfer' THEN from_account_id IS NOT NULL AND to_account_id IS NOT NULL
          END
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "chk_transaction_accounts"`,
    );

    await queryRunner.query(`
      ALTER TABLE "transactions" ADD CONSTRAINT "chk_transaction_accounts" CHECK (
        CASE "type"
          WHEN 'expense'  THEN from_account_id IS NOT NULL AND to_account_id IS NULL
          WHEN 'income'   THEN to_account_id IS NOT NULL AND from_account_id IS NULL
          WHEN 'transfer' THEN from_account_id IS NOT NULL AND to_account_id IS NOT NULL
        END
      )
    `);
  }
}
