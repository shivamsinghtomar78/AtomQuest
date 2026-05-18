import { NextRequest, NextResponse } from "next/server";
import { adminAuth, type AtomQuestRole } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;
const ROLE_VALUES = new Set<AtomQuestRole>(["employee", "manager", "admin"]);

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

export async function POST(request: NextRequest) {
  try {
    const { idToken, name } = (await request.json()) as {
      idToken?: string;
      name?: string;
    };

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: "Missing idToken" },
        { status: 400 }
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const role = readFirebaseRole(decoded.role);
    const email = decoded.email?.toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Firebase account is missing an email" },
        { status: 400 }
      );
    }

    let profile = await prisma.user.findFirst({
      where: {
        OR: [{ firebaseUid: decoded.uid }, { email }],
        isActive: true,
      },
      select: { id: true, firebaseUid: true, role: true },
    });

    if (!profile) {
      const displayName =
        cleanDisplayName(name) ||
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
        select: { id: true, firebaseUid: true, role: true },
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

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to create session" },
      { status: 401 }
    );
  }
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
