"use server";

import { prisma } from "@/lib/db/client";
import { auth } from "@/lib/auth/config";
import { createPanelSchema, updatePanelSchema } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import { formatError } from "./utils";

async function getSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as { id: string; role: string; orgId: string };
  if (!user.orgId) throw new Error("No organization assigned");
  return user;
}

export async function createPanel(data: { name: string; testIds: string[] }) {
  try {
    const user = await getSession();
    const parsed = createPanelSchema.parse(data);

    const panel = await prisma.panel.create({
      data: {
        name: parsed.name,
        orgId: user.orgId,
        panelTests: {
          create: parsed.testIds.map((testId) => ({
            testId,
          })),
        },
      },
      include: { panelTests: { include: { test: true } } },
    });

    revalidatePath("/dashboard/panels");
    return { success: true as const, panel: JSON.parse(JSON.stringify(panel)) };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function updatePanel(data: {
  id: string;
  name: string;
  testIds: string[];
}) {
  try {
    const user = await getSession();
    const parsed = updatePanelSchema.parse(data);

    const existing = await prisma.panel.findUnique({ where: { id: parsed.id } });
    if (!existing || existing.orgId !== user.orgId) {
      throw new Error("Panel not found");
    }

    await prisma.panelTest.deleteMany({ where: { panelId: parsed.id } });

    const panel = await prisma.panel.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        panelTests: {
          create: parsed.testIds.map((testId) => ({
            testId,
          })),
        },
      },
      include: { panelTests: { include: { test: true } } },
    });

    revalidatePath("/dashboard/panels");
    return { success: true as const, panel: JSON.parse(JSON.stringify(panel)) };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function deletePanel(id: string) {
  try {
    const user = await getSession();

    const existing = await prisma.panel.findUnique({ where: { id } });
    if (!existing || existing.orgId !== user.orgId) {
      throw new Error("Panel not found");
    }

    await prisma.panel.delete({ where: { id } });

    revalidatePath("/dashboard/panels");
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}
