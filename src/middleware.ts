import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
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

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const oldRoute = legacyRedirect(pathname, search, req.url);
  if (oldRoute) return oldRoute;

  if (PUBLIC_ROUTES.has(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get("__session")?.value;
  if (!sessionCookie) return unauthenticated(pathname, req.url);

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
