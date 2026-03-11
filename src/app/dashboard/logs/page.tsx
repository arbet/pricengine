import { auth } from "@/lib/auth/config";
import { findAllLogs } from "@/lib/db/queries/logs";
import LogsClient from "./logs-client";

export default async function LogsPage() {
  const session = await auth();
  const user = session?.user as { orgId: string | null };
  if (!user?.orgId) return null;

  const { logs } = await findAllLogs(user.orgId);

  return <LogsClient initialLogs={JSON.parse(JSON.stringify(logs))} />;
}
