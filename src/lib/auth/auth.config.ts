import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth config (no Node.js dependencies).
 * Used by middleware for JWT verification.
 * The full config in config.ts extends this with providers that need DB access.
 */
export const authConfig = {
  providers: [], // Added in config.ts with Credentials + Prisma
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.orgId = (user as { orgId: string | null }).orgId;
        token.orgName = (user as { orgName: string | null }).orgName;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.userId) {
        return { ...session, user: undefined } as unknown as typeof session;
      }
      if (session.user) {
        session.user.id = token.userId as string;
        (session.user as { role: string }).role = token.role as string;
        (session.user as { orgId: string | null }).orgId =
          token.orgId as (string | null);
        (session.user as { orgName: string | null }).orgName =
          token.orgName as (string | null);
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
