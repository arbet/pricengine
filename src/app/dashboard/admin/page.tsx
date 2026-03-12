import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { findAllOrgs } from "@/lib/db/queries/organizations";
import { prisma } from "@/lib/db/client";
import AdminClient from "./admin-client";

export default async function AdminPage() {
  const session = await auth();
  const user = session?.user as { role: string };
  if (user?.role !== "super_admin") redirect("/dashboard");

  const orgs = await findAllOrgs();
  const users = await prisma.user.findMany({
    where: { role: { not: "super_admin" } },
    select: { id: true, name: true, email: true, role: true, orgId: true },
    orderBy: { name: "asc" },
  });

  return (
    <AdminClient
      initialOrgs={JSON.parse(JSON.stringify(orgs))}
      initialUsers={JSON.parse(JSON.stringify(users))}
    />
  );
}
