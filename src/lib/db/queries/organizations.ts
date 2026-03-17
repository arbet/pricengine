import { prisma } from "@/lib/db/client";

export async function findOrgById(id: string) {
  return prisma.organization.findUnique({ where: { id } });
}

export async function findOrgByCode(code: string) {
  return prisma.organization.findUnique({ where: { code } });
}

export async function findOrgByName(name: string) {
  return prisma.organization.findUnique({ where: { name } });
}

export async function findAllOrgs({ includeArchived = false } = {}) {
  return prisma.organization.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { users: { where: { archivedAt: null } }, labTests: true } },
    },
  });
}
