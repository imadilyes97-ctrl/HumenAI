import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Multi-tenant middleware: extract tenant from subdomain or path
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // Extract tenant slug from subdomain (e.g., maboutique.humenai.app)
  const subdomain = hostname.split(".")[0];
  const isSubdomainTenant = subdomain && !["www", "app", "localhost"].includes(subdomain);

  // Public routes
  const publicRoutes = ["/", "/login", "/register", "/api/auth", "/api/webhooks"];
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

  // For web widget embeds
  if (pathname.startsWith("/widget")) {
    return NextResponse.next();
  }

  // For tenant subdomains
  if (isSubdomainTenant) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-tenant-slug", subdomain);
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // For dashboard routes, check authentication
  if (pathname.startsWith("/dashboard") && !isPublic) {
    // TODO: Add session verification
    // const session = await getToken({ req: request });
    // if (!session) return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
