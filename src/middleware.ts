import { NextRequest, NextResponse } from "next/server";

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

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const oldRoute = legacyRedirect(pathname, search, req.url);
  if (oldRoute) return oldRoute;

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
