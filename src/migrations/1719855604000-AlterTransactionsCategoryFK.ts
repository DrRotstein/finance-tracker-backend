import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTransactionsCategoryFK1719855604000
  implements MigrationInterface
{
  name = 'AlterTransactionsCategoryFK1719855604000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old index on the varchar category column
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transactions_category"`);

    // Drop the old varchar category column
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN IF EXISTS "category"`,
    );

    // Add new category_id column as UUID, nullable FK to categories
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD COLUMN "category_id" UUID`,
    );

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD CONSTRAINT "FK_transactions_category"
        FOREIGN KEY ("category_id") REFERENCES "categories"("id")
        ON DELETE SET NULL
    `);

    // Add index on category_id for query performance
    await queryRunner.query(`
      CREATE INDEX "idx_transactions_category_id"
        ON "transactions" ("category_id")
        WHERE "category_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_transactions_category_id"`,
    );

    // Drop FK constraint
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "FK_transactions_category"`,
    );

    // Drop category_id column
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN IF EXISTS "category_id"`,
    );

    // Restore the old varchar category column
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD COLUMN "category" VARCHAR(50)`,
    );

    // Restore old index
    await queryRunner.query(`
      CREATE INDEX "idx_transactions_category"
        ON "transactions" ("category")
        WHERE "category" IS NOT NULL
    `);
  }
}
