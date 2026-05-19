import { tdb } from "@/lib/db/client";

export async function findAllPanels(orgId: string) {
  return tdb().panel.findMany({
    where: { orgId },
    include: {
      panelTests: {
        include: { test: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function findPanelById(id: string) {
  return tdb().panel.findUnique({
    where: { id },
    include: {
      panelTests: {
        include: { test: true },
      },
    },
  });
}
