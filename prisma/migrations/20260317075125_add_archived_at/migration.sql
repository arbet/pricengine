-- DropIndex
DROP INDEX "pricing_logs_panel_test_ids_gin";

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "archived_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "archived_at" TIMESTAMP(3);
