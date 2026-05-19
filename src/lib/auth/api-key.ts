import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db/client";

/** Hash an API key for storage/lookup. Keys are high-entropy, so a fast hash is sufficient. */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Generate a new plaintext API key. The plaintext is shown to the admin once; only the hash is stored. */
export function generateApiKey(code: string): string {
  return `${code.toLowerCase()}-${randomBytes(24).toString("hex")}`;
}

export async function validateApiKey(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.slice(7);
  if (!apiKey) return null;

  const org = await prisma.organization.findUnique({
    where: { apiKey: hashApiKey(apiKey) },
  });

  if (!org || org.archivedAt) return null;

  return org;
}
