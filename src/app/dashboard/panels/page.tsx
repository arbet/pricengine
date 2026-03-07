import { auth } from "@/lib/auth/config";
import { findAllPanels } from "@/lib/db/queries/panels";
import { findAllTests } from "@/lib/db/queries/tests";
import PanelManagementClient from "./panel-management-client";

export default async function PanelManagementPage() {
  const session = await auth();
  const user = session?.user as { orgId: string };
  if (!user?.orgId) return null;

  const [panels, { tests }] = await Promise.all([
    findAllPanels(user.orgId),
    findAllTests(user.orgId),
  ]);

  return (
    <PanelManagementClient
      initialPanels={JSON.parse(JSON.stringify(panels))}
      initialTests={JSON.parse(JSON.stringify(tests))}
    />
  );
}
