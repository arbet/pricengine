import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { findAllTests } from "@/lib/db/queries/tests";
import TestManagementClient from "./test-management-client";

export default async function TestManagementPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const session = await auth();
  const user = session?.user as { role: string; orgId: string | null };
  if (!user?.orgId || user.role !== "lab_manager") redirect("/dashboard");

  const { page: pageStr, search } = await searchParams;
  const page = Math.max(1, parseInt(pageStr || "1", 10) || 1);
  const { tests, total, pageSize } = await findAllTests(user.orgId, { page, search: search || undefined });

  return (
    <TestManagementClient
      initialTests={JSON.parse(JSON.stringify(tests))}
      total={total}
      page={page}
      pageSize={pageSize}
      initialSearch={search || ""}
    />
  );
}
