"use server";

import { withTenant, tdb } from "@/lib/db/client";
import { auth } from "@/lib/auth/config";
import { createOrgSchema, updateOrgSchema, createUserSchema, updateUserSchema } from "@/lib/validations/schemas";
import { hashSync } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { generateApiKey, hashApiKey } from "@/lib/auth/api-key";
import { formatError } from "./utils";

// Admin actions operate across all organizations; the RLS policies grant this
// when app.current_role is 'super_admin'.
const ADMIN_CTX = { orgId: null, role: "super_admin" } as const;

function stripApiKey<T extends { apiKey: string | null }>(org: T) {
  const { apiKey, ...rest } = org;
  return { ...rest, hasApiKey: apiKey !== null };
}

async function getAdminSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as { id: string; role: string; orgId: string | null };
  if (user.role !== "super_admin") throw new Error("Forbidden");
  return user;
}

export async function createOrganization(data: {
  name: string;
  code: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
}) {
  try {
    await getAdminSession();
    const parsed = createOrgSchema.parse(data);

    const plainApiKey = generateApiKey(parsed.code);
    const org = await withTenant(ADMIN_CTX, () =>
      tdb().organization.create({
        data: {
          name: parsed.name,
          code: parsed.code.toUpperCase(),
          contactEmail: parsed.contactEmail || null,
          phone: parsed.phone || null,
          address: parsed.address || null,
          apiKey: hashApiKey(plainApiKey),
        },
      })
    );

    revalidatePath("/dashboard/admin");
    return { success: true as const, org: stripApiKey(org), apiKey: plainApiKey };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function updateOrganization(data: {
  id: string;
  name: string;
  code: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
}) {
  try {
    await getAdminSession();
    const parsed = updateOrgSchema.parse(data);

    const org = await withTenant(ADMIN_CTX, () =>
      tdb().organization.update({
        where: { id: parsed.id },
        data: {
          name: parsed.name,
          code: parsed.code.toUpperCase(),
          contactEmail: parsed.contactEmail || null,
          phone: parsed.phone || null,
          address: parsed.address || null,
        },
      })
    );

    revalidatePath("/dashboard/admin");
    return { success: true as const, org: stripApiKey(org) };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function archiveOrganization(id: string) {
  try {
    await getAdminSession();

    await withTenant(ADMIN_CTX, async () => {
      await tdb().organization.update({ where: { id }, data: { archivedAt: new Date() } });
      await tdb().user.updateMany({ where: { orgId: id, archivedAt: null }, data: { archivedAt: new Date() } });
    });

    revalidatePath("/dashboard/admin");
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function restoreOrganization(id: string) {
  try {
    await getAdminSession();

    await withTenant(ADMIN_CTX, async () => {
      await tdb().organization.update({ where: { id }, data: { archivedAt: null } });
      await tdb().user.updateMany({ where: { orgId: id }, data: { archivedAt: null } });
    });

    revalidatePath("/dashboard/admin");
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: "lab_manager" | "lab_employee";
  orgId: string;
}) {
  try {
    await getAdminSession();
    const parsed = createUserSchema.parse(data);

    const user = await withTenant(ADMIN_CTX, () =>
      tdb().user.create({
        data: {
          name: parsed.name,
          email: parsed.email,
          passwordHash: hashSync(parsed.password, 10),
          role: parsed.role,
          orgId: parsed.orgId,
        },
      })
    );

    revalidatePath("/dashboard/admin");
    return { success: true as const, user: { id: user.id, name: user.name, email: user.email, role: user.role, orgId: user.orgId } };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function updateUser(data: {
  id: string;
  name?: string;
  email?: string;
  password?: string;
  role?: "lab_manager" | "lab_employee";
}) {
  try {
    await getAdminSession();
    const parsed = updateUserSchema.parse(data);

    const updateData: Record<string, unknown> = {};
    if (parsed.name) updateData.name = parsed.name;
    if (parsed.email) updateData.email = parsed.email;
    if (parsed.role) updateData.role = parsed.role;
    if (parsed.password) updateData.passwordHash = hashSync(parsed.password, 10);

    const user = await withTenant(ADMIN_CTX, () =>
      tdb().user.update({
        where: { id: parsed.id },
        data: updateData,
      })
    );

    revalidatePath("/dashboard/admin");
    return { success: true as const, user: { id: user.id, name: user.name, email: user.email, role: user.role, orgId: user.orgId } };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function regenerateApiKey(orgId: string) {
  try {
    await getAdminSession();

    const newKey = await withTenant(ADMIN_CTX, async () => {
      const org = await tdb().organization.findUniqueOrThrow({ where: { id: orgId }, select: { code: true } });
      const key = generateApiKey(org.code);
      await tdb().organization.update({ where: { id: orgId }, data: { apiKey: hashApiKey(key) } });
      return key;
    });

    revalidatePath("/dashboard/admin");
    return { success: true as const, apiKey: newKey };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function archiveUser(id: string) {
  try {
    await getAdminSession();

    await withTenant(ADMIN_CTX, () =>
      tdb().user.update({ where: { id }, data: { archivedAt: new Date() } })
    );

    revalidatePath("/dashboard/admin");
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function restoreUser(id: string) {
  try {
    await getAdminSession();

    await withTenant(ADMIN_CTX, () =>
      tdb().user.update({ where: { id }, data: { archivedAt: null } })
    );

    revalidatePath("/dashboard/admin");
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}
