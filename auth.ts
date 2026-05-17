import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { compare } from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";
import {
  getAuthClientInfo,
  isRateLimited,
  registerFailedAttempt,
  registerSuccessfulAttempt,
} from "@/lib/auth/rate-limit";

const credentialsSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8),
});

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

const entraProviderEnabled = Boolean(
  process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID
);

const providers = [
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials, request) {
      const { ipAddress, userAgent } = getAuthClientInfo(request);

      if (isRateLimited(ipAddress)) {
        throw new InvalidCredentialsError();
      }

      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) {
        registerFailedAttempt(ipAddress);
        throw new InvalidCredentialsError();
      }

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          role: true,
          department: true,
          managerId: true,
          isActive: true,
        },
      });

      if (!user?.passwordHash || !user.isActive) {
        registerFailedAttempt(ipAddress);
        throw new InvalidCredentialsError();
      }

      const passwordValid = await compare(
        parsed.data.password,
        user.passwordHash
      );

      if (!passwordValid) {
        registerFailedAttempt(ipAddress);
        throw new InvalidCredentialsError();
      }

      registerSuccessfulAttempt(ipAddress);

      await prisma.auditLog.create({
        data: {
          entityType: "user",
          entityId: user.id,
          action: "login_success",
          changedBy: user.id,
          changedByRole: user.role,
          newValue: {
            email: user.email,
            loggedInAt: new Date().toISOString(),
          },
          reason: "Credentials login succeeded.",
          ipAddress,
          userAgent,
        },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        managerId: user.managerId,
      };
    },
  }),
  ...(entraProviderEnabled
    ? [
        MicrosoftEntraID({
          clientId: process.env.AZURE_AD_CLIENT_ID,
          clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
          issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0/`,
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
});
