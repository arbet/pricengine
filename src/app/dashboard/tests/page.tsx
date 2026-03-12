import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { findAllTests } from "@/lib/db/queries/tests";
import TestManagementClient from "./test-management-client";

export default async function TestManagementPage() {
  const session = await auth();
  const user = session?.user as { role: string; orgId: string | null };
  if (!user?.orgId || user.role !== "lab_manager") redirect("/dashboard");

  const { tests } = await findAllTests(user.orgId);

  return <TestManagementClient initialTests={JSON.parse(JSON.stringify(tests))} />;
}
