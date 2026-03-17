import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { authConfig } from "./auth.config";

class UserArchivedError extends CredentialsSignin {
  code = "user_archived";
}

class OrganizationArchivedError extends CredentialsSignin {
  code = "organization_archived";
}

const ARCHIVE_CHECK_INTERVAL_MS = 60_000;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // Initial login: populate custom fields
      if (user) {
        token.role = (user as { role: string }).role;
        token.orgId = (user as { orgId: string | null }).orgId;
        token.orgName = (user as { orgName: string | null }).orgName;
        token.userId = user.id;
        token.lastCheckedAt = Date.now();
        return token;
      }

      // Subsequent requests: periodic archive check
      if (
        token.userId &&
        (!token.lastCheckedAt ||
          Date.now() - token.lastCheckedAt > ARCHIVE_CHECK_INTERVAL_MS)
      ) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId },
          select: { archivedAt: true },
        });

        if (!dbUser || dbUser.archivedAt) {
          return {} as typeof token;
        }

        token.lastCheckedAt = Date.now();
      }

      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { organization: { select: { name: true, archivedAt: true } } },
        });

        if (!user) return null;

        if (user.organization?.archivedAt) {
          throw new OrganizationArchivedError();
        }

        if (user.archivedAt) {
          throw new UserArchivedError();
        }

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          orgId: user.orgId,
          orgName: user.organization?.name ?? null,
        };
      },
    }),
  ],
});
