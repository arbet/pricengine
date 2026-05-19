import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { withTenant } from "@/lib/db/client";
import { findAllPanels } from "@/lib/db/queries/panels";
import { findAllTests } from "@/lib/db/queries/tests";
import PanelManagementClient from "./panel-management-client";

export default async function PanelManagementPage() {
  const session = await auth();
  const user = session?.user as { role: string; orgId: string };
  if (!user?.orgId || user.role !== "lab_manager") redirect("/dashboard");

  const { panels, tests } = await withTenant(
    { orgId: user.orgId, role: user.role },
    async () => ({
      panels: await findAllPanels(user.orgId),
      tests: (await findAllTests(user.orgId, { pageSize: 0 })).tests,
    })
  );

  return (
    <PanelManagementClient
      initialPanels={JSON.parse(JSON.stringify(panels))}
      initialTests={JSON.parse(JSON.stringify(tests))}
    />
  );
}
