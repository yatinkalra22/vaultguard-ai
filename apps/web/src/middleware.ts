import type { NextRequest } from "next/server";
import { auth0 } from "./lib/auth0";

// WHY: Auth0 middleware intercepts all requests to handle auth routes
// (/auth/login, /auth/callback, /auth/logout) and protect dashboard routes.
// The matcher excludes static assets and API auth routes to avoid overhead.
// See: https://github.com/auth0/nextjs-auth0#middleware
export async function middleware(request: NextRequest) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    // Match all paths except static files, images, and favicon
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
