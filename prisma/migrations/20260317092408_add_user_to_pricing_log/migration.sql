-- AlterTable
ALTER TABLE "pricing_logs" ADD COLUMN     "user_id" TEXT;

-- AddForeignKey
ALTER TABLE "pricing_logs" ADD CONSTRAINT "pricing_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
