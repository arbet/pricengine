import { prisma } from "@/lib/db/client";

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUsersByOrgId(orgId: string) {
  return prisma.user.findMany({ where: { orgId } });
}
