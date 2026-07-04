import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLoansAndRemoveTransferPairs1719855605000 implements MigrationInterface {
  name = 'CreateLoansAndRemoveTransferPairs1719855605000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create loan enums
    await queryRunner.query(`
      CREATE TYPE "loan_direction" AS ENUM ('lent', 'borrowed')
    `);

    await queryRunner.query(`
      CREATE TYPE "loan_status" AS ENUM ('active', 'completed')
    `);

    // Create loans table
    await queryRunner.query(`
      CREATE TABLE "loans" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "counterparty" VARCHAR(255) NOT NULL,
        "direction" "loan_direction" NOT NULL,
        "status" "loan_status" NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_loans" PRIMARY KEY ("id")
      )
    `);

    // Add loan_id FK to transactions
    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD COLUMN "loan_id" UUID NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD CONSTRAINT "FK_transactions_loan" FOREIGN KEY ("loan_id")
          REFERENCES "loans"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_transactions_loan" ON "transactions" ("loan_id")
        WHERE "loan_id" IS NOT NULL
    `);

    // Remove transfer_pair related data (keep group relations intact)
    // Delete relation members belonging to transfer_pair relations
    await queryRunner.query(`
      DELETE FROM "transaction_relation_members"
      WHERE "relation_id" IN (
        SELECT "id" FROM "transaction_relations" WHERE "type" = 'transfer_pair'
      )
    `);

    // Delete transfer_pair relations
    await queryRunner.query(`
      DELETE FROM "transaction_relations" WHERE "type" = 'transfer_pair'
    `);

    // Remove transfer_pair from the relation_type enum
    // Alter column to varchar temporarily
    await queryRunner.query(`
      ALTER TABLE "transaction_relations"
        ALTER COLUMN "type" TYPE VARCHAR(20) USING "type"::text
    `);

    // Drop old enum
    await queryRunner.query(`DROP TYPE "relation_type"`);

    // Recreate enum without transfer_pair
    await queryRunner.query(`CREATE TYPE "relation_type" AS ENUM ('group')`);

    // Alter column back to enum
    await queryRunner.query(`
      ALTER TABLE "transaction_relations"
        ALTER COLUMN "type" TYPE "relation_type" USING "type"::"relation_type"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore transfer_pair to relation_type enum
    await queryRunner.query(`
      ALTER TABLE "transaction_relations"
        ALTER COLUMN "type" TYPE VARCHAR(20) USING "type"::text
    `);
    await queryRunner.query(`DROP TYPE "relation_type"`);
    await queryRunner.query(`CREATE TYPE "relation_type" AS ENUM ('transfer_pair', 'group')`);
    await queryRunner.query(`
      ALTER TABLE "transaction_relations"
        ALTER COLUMN "type" TYPE "relation_type" USING "type"::"relation_type"
    `);

    // Remove loan_id from transactions
    await queryRunner.query(`DROP INDEX "idx_transactions_loan"`);
    await queryRunner.query(`
      ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_loan"
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions" DROP COLUMN "loan_id"
    `);

    // Drop loans table
    await queryRunner.query(`DROP TABLE "loans"`);
    await queryRunner.query(`DROP TYPE "loan_status"`);
    await queryRunner.query(`DROP TYPE "loan_direction"`);
  }
}
