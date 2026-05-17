import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

function forbidden(request: Request) {
  const { pathname } = new URL(request.url);

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.redirect(new URL("/app/dashboard", request.url));
}

export default auth((request) => {
  const { pathname, search } = request.nextUrl;
  const session = request.auth;

  if (!session?.user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user.role;

  const adminOnlyPaths = ["/app/admin", "/app/audit", "/app/employees"];
  const managerPaths = ["/app/manager", "/app/team-goals", "/app/manager-checkins", "/app/reports"];

  if (adminOnlyPaths.some((path) => pathname.startsWith(path)) && role !== "admin") {
    return forbidden(request);
  }

  if (
    managerPaths.some((path) => pathname.startsWith(path)) &&
    role !== "manager" &&
    role !== "admin"
  ) {
    return forbidden(request);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|login|$).*)"],
};
