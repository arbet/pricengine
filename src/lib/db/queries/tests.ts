import { prisma, withOrgScope } from "@/lib/db/client";
import { Prisma } from "@prisma/client";

export async function findAllTests(
  orgId: string,
  options?: {
    search?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const { search, category, page = 1, pageSize = 100 } = options || {};

  const where: Prisma.LabTestWhereInput = {
    orgId,
    ...(search
      ? {
          OR: [
            { testId: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(category ? { category } : {}),
  };

  const [tests, total] = await Promise.all([
    prisma.labTest.findMany({
      where,
      orderBy: { testId: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.labTest.count({ where }),
  ]);

  return { tests, total, page, pageSize };
}

export async function findTestById(id: string) {
  return prisma.labTest.findUnique({ where: { id } });
}

export async function findTestByTestId(testId: string, orgId: string) {
  return prisma.labTest.findUnique({
    where: { testId_orgId: { testId, orgId } },
  });
}

export async function findTestsByIds(ids: string[]) {
  return prisma.labTest.findMany({
    where: { id: { in: ids } },
  });
}
