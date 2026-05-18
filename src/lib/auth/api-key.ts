import { prisma } from "@/lib/db/client";

export async function validateApiKey(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.slice(7);
  if (!apiKey) return null;

  const org = await prisma.organization.findUnique({
    where: { apiKey },
  });

  if (!org || org.archivedAt) return null;

  return org;
}
