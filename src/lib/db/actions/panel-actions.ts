"use server";

import { withTenant, tdb } from "@/lib/db/client";
import { auth } from "@/lib/auth/config";
import { createPanelSchema, updatePanelSchema } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import { formatError } from "./utils";

async function getSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as { id: string; role: string; orgId: string | null };
  if (!user.orgId) throw new Error("No organization assigned");
  return { id: user.id, role: user.role, orgId: user.orgId };
}

async function assertTestsOwnedByOrg(testIds: string[], orgId: string) {
  const owned = await tdb().labTest.findMany({
    where: { id: { in: testIds }, orgId },
    select: { id: true },
  });
  if (owned.length !== new Set(testIds).size) {
    throw new Error("Invalid test selection");
  }
}

export async function createPanel(data: { name: string; testIds: string[] }) {
  try {
    const user = await getSession();
    const parsed = createPanelSchema.parse(data);

    const panel = await withTenant({ orgId: user.orgId, role: user.role }, async () => {
      await assertTestsOwnedByOrg(parsed.testIds, user.orgId);

      return tdb().panel.create({
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

    const panel = await withTenant({ orgId: user.orgId, role: user.role }, async () => {
      const existing = await tdb().panel.findUnique({ where: { id: parsed.id } });
      if (!existing || existing.orgId !== user.orgId) {
        throw new Error("Panel not found");
      }

      await assertTestsOwnedByOrg(parsed.testIds, user.orgId);

      await tdb().panelTest.deleteMany({ where: { panelId: parsed.id } });

      return tdb().panel.update({
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

    await withTenant({ orgId: user.orgId, role: user.role }, async () => {
      const existing = await tdb().panel.findUnique({ where: { id } });
      if (!existing || existing.orgId !== user.orgId) {
        throw new Error("Panel not found");
      }
      await tdb().panel.delete({ where: { id } });
    });

    revalidatePath("/dashboard/panels");
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}
