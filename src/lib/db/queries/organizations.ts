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

export async function findAllOrgs() {
  return prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { users: true, labTests: true } },
    },
  });
}
