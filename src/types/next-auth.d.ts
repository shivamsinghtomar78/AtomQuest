import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: UserRole;
    department?: string | null;
    managerId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      department?: string | null;
      managerId?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    department?: string | null;
    managerId?: string | null;
  }
}
