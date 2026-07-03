import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccountsTable1719855600000 implements MigrationInterface {
  name = 'CreateAccountsTable1719855600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create account_type enum
    await queryRunner.query(`
      CREATE TYPE "account_type" AS ENUM ('bank', 'cash', 'paypal', 'person', 'other')
    `);

    // Create accounts table
    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL,
        "type" "account_type" NOT NULL DEFAULT 'bank',
        "starting_balance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
        "is_external" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_accounts" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_accounts_type" ON "accounts" ("type")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_accounts_is_external" ON "accounts" ("is_external")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_accounts_is_external"`);
    await queryRunner.query(`DROP INDEX "idx_accounts_type"`);
    await queryRunner.query(`DROP TABLE "accounts"`);
    await queryRunner.query(`DROP TYPE "account_type"`);
  }
}
