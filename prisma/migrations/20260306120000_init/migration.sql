-- CreateEnum
CREATE TYPE "Role" AS ENUM ('super_admin', 'lab_manager', 'lab_employee');

-- CreateEnum
CREATE TYPE "PricingSource" AS ENUM ('calculator', 'api');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contact_email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "discount_factor" DECIMAL(5,3) NOT NULL DEFAULT 0.5,
    "floor_multiplier" DECIMAL(5,2) NOT NULL DEFAULT 3.0,
    "marginal_overhead" DECIMAL(10,2) NOT NULL DEFAULT 5.0,
    "donation_per_panel" DECIMAL(10,2) NOT NULL DEFAULT 2.0,
    "revenue_share_per_panel" DECIMAL(10,2) NOT NULL DEFAULT 3.0,
    "overhead_cost" DECIMAL(10,2),
    "panels_per_day" INTEGER,
    "future_overhead_cost" DECIMAL(10,2),
    "future_panels_per_day" INTEGER,
    "api_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "org_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_tests" (
    "id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reagent_cost" DECIMAL(10,2) NOT NULL,
    "list_price" DECIMAL(10,2) NOT NULL,
    "category" TEXT,
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "panels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "panels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "panel_tests" (
    "id" TEXT NOT NULL,
    "panel_id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,

    CONSTRAINT "panel_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "panel_test_ids" TEXT[],
    "panel_test_names" TEXT[],
    "final_price" DECIMAL(10,2) NOT NULL,
    "source" "PricingSource" NOT NULL,
    "org_id" TEXT NOT NULL,

    CONSTRAINT "pricing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");
CREATE UNIQUE INDEX "organizations_api_key_key" ON "organizations"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "lab_tests_test_id_org_id_key" ON "lab_tests"("test_id", "org_id");

-- CreateIndex
CREATE UNIQUE INDEX "panel_tests_panel_id_test_id_key" ON "panel_tests"("panel_id", "test_id");

-- CreateIndex
CREATE INDEX "pricing_logs_org_id_idx" ON "pricing_logs"("org_id");
CREATE INDEX "pricing_logs_timestamp_idx" ON "pricing_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lab_tests" ADD CONSTRAINT "lab_tests_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "panels" ADD CONSTRAINT "panels_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "panel_tests" ADD CONSTRAINT "panel_tests_panel_id_fkey" FOREIGN KEY ("panel_id") REFERENCES "panels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "panel_tests" ADD CONSTRAINT "panel_tests_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "lab_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pricing_logs" ADD CONSTRAINT "pricing_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
