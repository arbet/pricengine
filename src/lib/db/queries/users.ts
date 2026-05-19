import { tdb } from "@/lib/db/client";

export async function findUserByEmail(email: string) {
  return tdb().user.findUnique({ where: { email } });
}

export async function findUserById(id: string) {
  return tdb().user.findUnique({ where: { id } });
}

export async function findUsersByOrgId(orgId: string) {
  return tdb().user.findMany({ where: { orgId, archivedAt: null } });
}
