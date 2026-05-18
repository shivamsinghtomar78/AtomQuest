import { NextRequest, NextResponse } from "next/server";
import { adminAuth, normalizeFirebaseRole } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as { idToken?: string };
    if (!idToken) {
      return NextResponse.json(
        { success: false, error: "Missing idToken" },
        { status: 400 }
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const role = normalizeFirebaseRole(decoded.role);
    const email = decoded.email?.toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Firebase account is missing an email" },
        { status: 400 }
      );
    }

    const profile = await prisma.user.findFirst({
      where: {
        OR: [{ firebaseUid: decoded.uid }, { email }],
        isActive: true,
      },
      select: { id: true, firebaseUid: true, role: true },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "No AtomQuest profile exists for this user" },
        { status: 403 }
      );
    }

    if (!profile.firebaseUid || profile.role !== role) {
      await prisma.user.update({
        where: { id: profile.id },
        data: {
          firebaseUid: profile.firebaseUid ?? decoded.uid,
          role,
        },
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
