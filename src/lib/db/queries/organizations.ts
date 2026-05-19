import { tdb } from "@/lib/db/client";

export async function findOrgById(id: string) {
  return tdb().organization.findUnique({ where: { id } });
}

export async function findOrgByCode(code: string) {
  return tdb().organization.findUnique({ where: { code } });
}

export async function findOrgByName(name: string) {
  return tdb().organization.findUnique({ where: { name } });
}

export async function findAllOrgs({ includeArchived = false } = {}) {
  const orgs = await tdb().organization.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { users: { where: { archivedAt: null } }, labTests: true } },
    },
  });

  // Never expose the stored API key hash to the client.
  return orgs.map(({ apiKey, ...org }) => ({
    ...org,
    hasApiKey: apiKey !== null,
  }));
}
