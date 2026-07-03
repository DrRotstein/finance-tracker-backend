import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransactionsTable1719855601000 implements MigrationInterface {
  name = 'CreateTransactionsTable1719855601000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create transaction_type enum
    await queryRunner.query(`
      CREATE TYPE "transaction_type" AS ENUM ('expense', 'income', 'transfer')
    `);

    // Create transactions table
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "type" "transaction_type" NOT NULL,
        "amount" DECIMAL(12,2) NOT NULL,
        "from_account_id" UUID,
        "to_account_id" UUID,
        "date" DATE NOT NULL,
        "category" VARCHAR(50),
        "description" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transactions_from_account" FOREIGN KEY ("from_account_id") REFERENCES "accounts"("id"),
        CONSTRAINT "FK_transactions_to_account" FOREIGN KEY ("to_account_id") REFERENCES "accounts"("id")
      )
    `);

    // CHECK constraint: amount must be positive
    await queryRunner.query(`
      ALTER TABLE "transactions" ADD CONSTRAINT "chk_amount_positive" CHECK (amount > 0)
    `);

    // CHECK constraint: enforce account rules per transaction type
    await queryRunner.query(`
      ALTER TABLE "transactions" ADD CONSTRAINT "chk_transaction_accounts" CHECK (
        CASE "type"
          WHEN 'expense'  THEN from_account_id IS NOT NULL AND to_account_id IS NULL
          WHEN 'income'   THEN to_account_id IS NOT NULL AND from_account_id IS NULL
          WHEN 'transfer' THEN from_account_id IS NOT NULL AND to_account_id IS NOT NULL
        END
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_transactions_date" ON "transactions" ("date")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_transactions_type" ON "transactions" ("type")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_transactions_from_account" ON "transactions" ("from_account_id") WHERE from_account_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_transactions_to_account" ON "transactions" ("to_account_id") WHERE to_account_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_transactions_category" ON "transactions" ("category") WHERE category IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_transactions_category"`);
    await queryRunner.query(`DROP INDEX "idx_transactions_to_account"`);
    await queryRunner.query(`DROP INDEX "idx_transactions_from_account"`);
    await queryRunner.query(`DROP INDEX "idx_transactions_type"`);
    await queryRunner.query(`DROP INDEX "idx_transactions_date"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "chk_transaction_accounts"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "chk_amount_positive"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TYPE "transaction_type"`);
  }
}
