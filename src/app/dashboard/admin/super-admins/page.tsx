import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import SuperAdminClient from "./super-admin-client";

export default async function SuperAdminsPage() {
  const session = await auth();
  const user = session?.user as { id: string; role: string } | undefined;
  if (user?.role !== "super_admin") redirect("/dashboard");

  const admins = await prisma.user.findMany({
    where: { role: "super_admin" },
    select: { id: true, name: true, email: true, apiKey: true, archivedAt: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  return (
    <SuperAdminClient
      initialAdmins={JSON.parse(JSON.stringify(admins))}
      currentUserId={user.id}
    />
  );
}
