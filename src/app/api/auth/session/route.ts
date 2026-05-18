import { NextRequest, NextResponse } from "next/server";
import { FirebaseAuthError } from "firebase-admin/auth";
import { adminAuth, type AtomQuestRole } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;
const ROLE_VALUES = new Set<AtomQuestRole>(["employee", "manager", "admin"]);
const TOKEN_ERROR_CODES = new Set([
  "auth/argument-error",
  "auth/id-token-expired",
  "auth/id-token-revoked",
  "auth/invalid-argument",
  "auth/invalid-id-token",
]);
const ADMIN_CONFIG_ERROR_CODES = new Set([
  "auth/invalid-credential",
  "auth/invalid-project-id",
  "auth/project-not-found",
]);

type SessionRequestBody = {
  idToken?: unknown;
  name?: unknown;
};

function readFirebaseRole(value: unknown): AtomQuestRole | null {
  return typeof value === "string" && ROLE_VALUES.has(value as AtomQuestRole)
    ? value as AtomQuestRole
    : null;
}

function cleanDisplayName(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 255) : "";
}

function nameFromEmail(email: string) {
  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .slice(0, 255);
}

function errorCode(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : undefined;
}

function isAdminConfigError(error: unknown) {
  if (error instanceof Error) {
    if (error.message.startsWith("Missing Firebase Admin credentials")) {
      return true;
    }

    const code = errorCode(error);
    return code ? ADMIN_CONFIG_ERROR_CODES.has(code) : false;
  }

  return false;
}

function isTokenError(error: unknown) {
  if (!(error instanceof FirebaseAuthError)) return false;
  const code = errorCode(error);
  return code ? TOKEN_ERROR_CODES.has(code) : false;
}

function logSessionError(stage: string, error: unknown) {
  const fallback = { name: typeof error, message: "Non-error thrown" };
  const details =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          code: errorCode(error),
        }
      : fallback;

  console.error("[auth/session] Unable to create session", {
    stage,
    ...details,
  });
}

function sessionError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request: NextRequest) {
  let body: SessionRequestBody;

  try {
    body = (await request.json()) as SessionRequestBody;
  } catch (error) {
    logSessionError("parse-request", error);
    return sessionError("Malformed session request", 400);
  }

  const idToken = typeof body.idToken === "string" ? body.idToken : "";
  if (!idToken) {
    return sessionError("Missing idToken", 400);
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken, true);
  } catch (error) {
    logSessionError("verify-id-token", error);

    if (isAdminConfigError(error)) {
      return sessionError("Server authentication is not configured", 500);
    }

    if (isTokenError(error)) {
      return sessionError(
        "Invalid or expired sign-in token. Please sign in again.",
        401
      );
    }

    return sessionError("Unable to verify sign-in token", 500);
  }

  const role = readFirebaseRole(decoded.role);
  const email = decoded.email?.toLowerCase();

  if (!email) {
    return sessionError("Firebase account is missing an email", 400);
  }

  let profile;
  try {
    profile = await prisma.user.findFirst({
      where: {
        OR: [{ firebaseUid: decoded.uid }, { email }],
      },
      select: { id: true, firebaseUid: true, role: true, isActive: true },
    });

    if (profile && !profile.isActive) {
      return sessionError("This account is inactive", 403);
    }

    if (!profile) {
      const displayName =
        cleanDisplayName(body.name) ||
        cleanDisplayName(decoded.name) ||
        nameFromEmail(email);

      profile = await prisma.user.create({
        data: {
          email,
          name: displayName,
          firebaseUid: decoded.uid,
          role: role ?? "employee",
          avatarUrl: cleanDisplayName(decoded.picture) || undefined,
        },
        select: { id: true, firebaseUid: true, role: true, isActive: true },
      });
    }

    const profileUpdate: { firebaseUid?: string; role?: AtomQuestRole } = {};
    if (!profile.firebaseUid) profileUpdate.firebaseUid = decoded.uid;
    if (role && profile.role !== role) profileUpdate.role = role;

    if (Object.keys(profileUpdate).length > 0) {
      await prisma.user.update({
        where: { id: profile.id },
        data: profileUpdate,
      });
    }
  } catch (error) {
    logSessionError("sync-user-profile", error);
    return sessionError("Unable to create user profile", 500);
  }

  let sessionCookie;
  try {
    sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });
  } catch (error) {
    logSessionError("create-session-cookie", error);

    if (isAdminConfigError(error)) {
      return sessionError("Server authentication is not configured", 500);
    }

    if (isTokenError(error)) {
      return sessionError(
        "Invalid or expired sign-in token. Please sign in again.",
        401
      );
    }

    return sessionError("Unable to create session", 500);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("__session", sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("__session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
