import { auth0 } from "@/lib/auth0";

// WHY: Next.js 16 uses proxy.ts (not middleware.ts) for network interception.
// Auth0 SDK v4 requires this broad matcher to handle /auth/login, /auth/callback,
// /auth/logout, and rolling session refresh on every request.
// Uses standard Request type (not NextRequest) per Next.js 16 proxy convention.
// See: https://github.com/auth0/nextjs-auth0#on-nextjs-16
export async function proxy(request: Request) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
