import type { NextAuthConfig } from "next-auth";

type Role = "employee" | "manager" | "admin";

const ADMIN_GROUPS = new Set(
  (process.env.AZURE_AD_ADMIN_GROUP_IDS ?? "")
    .split(",")
    .map((group) => group.trim())
    .filter(Boolean)
);

const MANAGER_GROUPS = new Set(
  (process.env.AZURE_AD_MANAGER_GROUP_IDS ?? "")
    .split(",")
    .map((group) => group.trim())
    .filter(Boolean)
);

function normalizeRole(value: unknown): Role {
  return value === "admin" || value === "manager" || value === "employee"
    ? value
    : "employee";
}

function mapEntraGroupsToRole(groups: unknown): Role {
  const groupList = Array.isArray(groups) ? groups.map(String) : [];

  if (groupList.some((group) => ADMIN_GROUPS.has(group))) return "admin";
  if (groupList.some((group) => MANAGER_GROUPS.has(group))) return "manager";

  return "employee";
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  trustHost: true,
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
        token.role = normalizeRole(user.role);
        token.name = user.name;
        token.email = user.email;
        token.department = user.department ?? null;
        token.managerId = user.managerId ?? null;
      }

      if (account?.provider === "microsoft-entra-id") {
        token.role = mapEntraGroupsToRole(
          (profile as { groups?: unknown })?.groups
        );
        token.department =
          (profile as { department?: string })?.department ??
          token.department ??
          null;
        token.managerId = token.managerId ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.role = normalizeRole(token.role);
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
        session.user.department =
          typeof token.department === "string" ? token.department : null;
        session.user.managerId =
          typeof token.managerId === "string" ? token.managerId : null;
      }

      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
