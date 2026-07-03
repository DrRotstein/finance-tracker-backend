import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransactionRelationsTables1719855602000 implements MigrationInterface {
  name = 'CreateTransactionRelationsTables1719855602000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create relation_type enum
    await queryRunner.query(`
      CREATE TYPE "relation_type" AS ENUM ('transfer_pair', 'group')
    `);

    // Create member_role enum
    await queryRunner.query(`
      CREATE TYPE "member_role" AS ENUM ('outgoing', 'incoming', 'member')
    `);

    // Create transaction_relations table
    await queryRunner.query(`
      CREATE TABLE "transaction_relations" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "type" "relation_type" NOT NULL,
        "label" VARCHAR(100),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_transaction_relations" PRIMARY KEY ("id")
      )
    `);

    // Create transaction_relation_members table
    await queryRunner.query(`
      CREATE TABLE "transaction_relation_members" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "relation_id" UUID NOT NULL,
        "transaction_id" UUID NOT NULL,
        "role" "member_role" NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_transaction_relation_members" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trm_relation" FOREIGN KEY ("relation_id") REFERENCES "transaction_relations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_trm_transaction" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE
      )
    `);

    // Unique constraint: each transaction appears at most once per relation
    await queryRunner.query(`
      ALTER TABLE "transaction_relation_members"
        ADD CONSTRAINT "uq_relation_transaction" UNIQUE ("relation_id", "transaction_id")
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_trm_relation" ON "transaction_relation_members" ("relation_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_trm_transaction" ON "transaction_relation_members" ("transaction_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_trm_transaction"`);
    await queryRunner.query(`DROP INDEX "idx_trm_relation"`);
    await queryRunner.query(`ALTER TABLE "transaction_relation_members" DROP CONSTRAINT "uq_relation_transaction"`);
    await queryRunner.query(`DROP TABLE "transaction_relation_members"`);
    await queryRunner.query(`DROP TABLE "transaction_relations"`);
    await queryRunner.query(`DROP TYPE "member_role"`);
    await queryRunner.query(`DROP TYPE "relation_type"`);
  }
}
