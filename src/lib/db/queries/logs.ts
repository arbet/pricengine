import { prisma } from "@/lib/db/client";
import { Prisma } from "@prisma/client";

export async function findAllLogs(
  orgId: string,
  options?: {
    dateFrom?: string;
    dateTo?: string;
    source?: "calculator" | "api";
    page?: number;
    pageSize?: number;
  }
) {
  const { dateFrom, dateTo, source, page = 1, pageSize = 50 } = options || {};

  const where: Prisma.PricingLogWhereInput = {
    orgId,
    ...(source ? { source } : {}),
    ...(dateFrom || dateTo
      ? {
          timestamp: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59Z") } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.pricingLog.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.pricingLog.count({ where }),
  ]);

  return { logs, total, page, pageSize };
}

/**
 * Search logs by test IDs with relevance sorting:
 * 1. Exact match (same tests, same count)
 * 2. Superset match (contains all searched tests plus more)
 * 3. Within each tier: ordered by timestamp DESC
 */
export async function searchLogsByTestIds(orgId: string, searchTestIds: string[]) {
  if (searchTestIds.length === 0) return [];

  // Use raw SQL for array containment and relevance sorting
  const logs = await prisma.$queryRaw<
    Array<{
      id: string;
      timestamp: Date;
      panel_test_ids: string[];
      panel_test_names: string[];
      final_price: number;
      source: string;
      org_id: string;
      user_name: string | null;
      relevance: number;
    }>
  >`
    SELECT pl.*, u.name as user_name,
      CASE
        WHEN pl.panel_test_ids @> ${searchTestIds}::text[]
             AND array_length(pl.panel_test_ids, 1) = ${searchTestIds.length}
        THEN 2
        WHEN pl.panel_test_ids @> ${searchTestIds}::text[]
        THEN 1
        ELSE 0
      END as relevance
    FROM pricing_logs pl
    LEFT JOIN users u ON u.id = pl.user_id
    WHERE pl.org_id = ${orgId}
      AND pl.panel_test_ids @> ${searchTestIds}::text[]
    ORDER BY relevance DESC, pl.timestamp DESC
    LIMIT 50
  `;

  return logs.map((l) => ({
    id: l.id,
    timestamp: l.timestamp,
    panelTestIds: l.panel_test_ids,
    panelTestNames: l.panel_test_names,
    finalPrice: Number(l.final_price),
    source: l.source,
    orgId: l.org_id,
    userName: l.user_name,
    relevance: Number(l.relevance),
  }));
}
