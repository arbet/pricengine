import { prisma } from "@/lib/db/client";

export async function findAllPanels(orgId: string) {
  return prisma.panel.findMany({
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
  return prisma.panel.findUnique({
    where: { id },
    include: {
      panelTests: {
        include: { test: true },
      },
    },
  });
}
