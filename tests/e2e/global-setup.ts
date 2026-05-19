import { execSync } from "node:child_process";

/**
 * Resets and seeds the test database before the E2E run.
 * DATABASE_URL and the SEED_* credentials are injected by `npm run test:e2e`
 * (dotenv -e .env.test), so this inherits the test-database connection.
 */
export default function globalSetup() {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
}
