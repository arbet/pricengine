"use server";

import { prisma } from "@/lib/db/client";
import { auth } from "@/lib/auth/config";
import { createOrgSchema, updateOrgSchema, createUserSchema, updateUserSchema } from "@/lib/validations/schemas";
import { hashSync } from "bcryptjs";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { formatError } from "./utils";

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

    const org = await prisma.organization.create({
      data: {
        name: parsed.name,
        code: parsed.code.toUpperCase(),
        contactEmail: parsed.contactEmail || null,
        phone: parsed.phone || null,
        address: parsed.address || null,
        apiKey: `${parsed.code.toLowerCase()}-${crypto.randomBytes(16).toString("hex")}`,
      },
    });

    revalidatePath("/dashboard/admin");
    return { success: true as const, org };
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

    const org = await prisma.organization.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        code: parsed.code.toUpperCase(),
        contactEmail: parsed.contactEmail || null,
        phone: parsed.phone || null,
        address: parsed.address || null,
      },
    });

    revalidatePath("/dashboard/admin");
    return { success: true as const, org };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function archiveOrganization(id: string) {
  try {
    await getAdminSession();

    await prisma.$transaction([
      prisma.organization.update({ where: { id }, data: { archivedAt: new Date() } }),
      prisma.user.updateMany({ where: { orgId: id, archivedAt: null }, data: { archivedAt: new Date() } }),
    ]);

    revalidatePath("/dashboard/admin");
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function restoreOrganization(id: string) {
  try {
    await getAdminSession();

    await prisma.$transaction([
      prisma.organization.update({ where: { id }, data: { archivedAt: null } }),
      prisma.user.updateMany({ where: { orgId: id }, data: { archivedAt: null } }),
    ]);

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

    const user = await prisma.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        passwordHash: hashSync(parsed.password, 10),
        role: parsed.role,
        orgId: parsed.orgId,
      },
    });

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

    const user = await prisma.user.update({
      where: { id: parsed.id },
      data: updateData,
    });

    revalidatePath("/dashboard/admin");
    return { success: true as const, user: { id: user.id, name: user.name, email: user.email, role: user.role, orgId: user.orgId } };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function regenerateApiKey(orgId: string) {
  try {
    await getAdminSession();

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { code: true } });
    const newKey = `${org.code.toLowerCase()}-${crypto.randomBytes(16).toString("hex")}`;

    await prisma.organization.update({ where: { id: orgId }, data: { apiKey: newKey } });

    revalidatePath("/dashboard/admin");
    return { success: true as const, apiKey: newKey };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function archiveUser(id: string) {
  try {
    await getAdminSession();

    await prisma.user.update({ where: { id }, data: { archivedAt: new Date() } });

    revalidatePath("/dashboard/admin");
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function restoreUser(id: string) {
  try {
    await getAdminSession();

    await prisma.user.update({ where: { id }, data: { archivedAt: null } });

    revalidatePath("/dashboard/admin");
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}
