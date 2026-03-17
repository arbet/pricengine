import "next-auth";
import "@auth/core/jwt";

declare module "next-auth" {
  interface User {
    role?: string;
    orgId?: string | null;
    orgName?: string | null;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      orgId: string | null;
      orgName: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: string;
    orgId?: string | null;
    orgName?: string | null;
    userId?: string;
    lastCheckedAt?: number;
  }
}
