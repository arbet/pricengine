import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { withTenant } from "@/lib/db/client";
import { findAllPanels } from "@/lib/db/queries/panels";
import { findOrgById } from "@/lib/db/queries/organizations";
import AnalyticsClient from "./analytics-client";

export default async function AnalyticsPage() {
  const session = await auth();
  const user = session?.user as { role: string; orgId: string | null };
  if (!user?.orgId || user.role !== "lab_manager") redirect("/dashboard");
  const orgId = user.orgId;

  const { panels, org } = await withTenant(
    { orgId, role: user.role },
    async () => ({
      panels: await findAllPanels(orgId),
      org: await findOrgById(orgId),
    })
  );

  return (
    <AnalyticsClient
      initialPanels={JSON.parse(JSON.stringify(panels))}
      orgSettings={org ? JSON.parse(JSON.stringify({
        overheadCost: org.overheadCost ? Number(org.overheadCost) : 2500,
        panelsPerDay: org.panelsPerDay ?? 50,
        futureOverheadCost: org.futureOverheadCost ? Number(org.futureOverheadCost) : 3500,
        futurePanelsPerDay: org.futurePanelsPerDay ?? 80,
      })) : null}
    />
  );
}
