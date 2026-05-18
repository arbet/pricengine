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

/**
 * Validates a super-admin API key. Super admins are not tied to an
 * organization, so their keys grant cross-organization access (used by
 * the pricing comparison endpoint).
 */
export async function validateSuperAdminKey(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.slice(7);
  if (!apiKey) return null;

  const user = await prisma.user.findUnique({
    where: { apiKey },
  });

  if (!user || user.archivedAt || user.role !== "super_admin") return null;

  return user;
}
