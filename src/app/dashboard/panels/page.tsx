import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { findAllPanels } from "@/lib/db/queries/panels";
import { findAllTests } from "@/lib/db/queries/tests";
import PanelManagementClient from "./panel-management-client";

export default async function PanelManagementPage() {
  const session = await auth();
  const user = session?.user as { role: string; orgId: string };
  if (!user?.orgId || user.role !== "lab_manager") redirect("/dashboard");

  const [panels, { tests }] = await Promise.all([
    findAllPanels(user.orgId),
    findAllTests(user.orgId, { pageSize: 0 }),
  ]);

  return (
    <PanelManagementClient
      initialPanels={JSON.parse(JSON.stringify(panels))}
      initialTests={JSON.parse(JSON.stringify(tests))}
    />
  );
}
