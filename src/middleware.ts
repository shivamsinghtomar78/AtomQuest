import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/about",
  "/blog",
  "/careers",
  "/privacy",
  "/terms",
  "/cookies",
]);

const PUBLIC_PREFIXES = [
  "/api/auth",
  "/api/health",
  "/_next",
  "/favicon",
];

function normalizeFirebaseRole(value: unknown) {
  return value === "admin" || value === "manager" || value === "employee"
    ? value
    : "employee";
}

function legacyRedirect(pathname: string, search: string, requestUrl: string) {
  if (pathname === "/app") {
    return NextResponse.redirect(new URL(`/dashboard${search}`, requestUrl));
  }

  if (pathname.startsWith("/app/")) {
    return NextResponse.redirect(
      new URL(`${pathname.replace(/^\/app/, "")}${search}`, requestUrl)
    );
  }

  return null;
}

function unauthenticated(pathname: string, requestUrl: string) {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const loginUrl = new URL("/login", requestUrl);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

function forbidden(pathname: string, requestUrl: string, redirectPath: string) {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.redirect(new URL(redirectPath, requestUrl));
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const oldRoute = legacyRedirect(pathname, search, req.url);
  if (oldRoute) return oldRoute;

  if (PUBLIC_ROUTES.has(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get("__session")?.value;
  if (!sessionCookie) return unauthenticated(pathname, req.url);

  let decoded;
  try {
    const { adminAuth } = await import("@/lib/firebase/admin");
    decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    const response = unauthenticated(pathname, req.url);
    response.cookies.delete("__session");
    return response;
  }

  const role = normalizeFirebaseRole(decoded.role);

  if ((pathname.startsWith("/admin") || pathname.startsWith("/audit")) && role !== "admin") {
    return forbidden(pathname, req.url, "/dashboard");
  }

  if (pathname.startsWith("/team-goals") && role === "employee") {
    return forbidden(pathname, req.url, "/dashboard");
  }

  if (pathname.startsWith("/manager-checkins") && role === "employee") {
    return forbidden(pathname, req.url, "/checkins");
  }

  if (pathname.startsWith("/reports") && role === "employee") {
    return forbidden(pathname, req.url, "/dashboard");
  }

  const headers = new Headers(req.headers);
  headers.set("x-user-uid", decoded.uid);
  headers.set("x-user-role", role);
  headers.set("x-user-email", decoded.email ?? "");

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
