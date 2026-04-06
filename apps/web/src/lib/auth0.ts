import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";

// WHY: Next.js production builds evaluate modules even when runtime auth
// env vars are unavailable in CI. Build-phase fallbacks avoid SDK warnings
// during static analysis — they're never used at runtime.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

function envOrBuildFallback(envKey: string, fallback: string): string | undefined {
  return process.env[envKey] ?? (isBuildPhase ? fallback : undefined);
}

function resolveAuth0Domain(): string | undefined {
  if (process.env.AUTH0_DOMAIN) return process.env.AUTH0_DOMAIN;
  if (!process.env.AUTH0_ISSUER_BASE_URL) return isBuildPhase ? "build.auth0.local" : undefined;
  return process.env.AUTH0_ISSUER_BASE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

// WHY: Auth0 Next.js SDK v4 uses Auth0Client instead of the older initAuth0().
// This client handles login, logout, callback, and session management.
// See: https://github.com/auth0/nextjs-auth0#readme
export const auth0 = new Auth0Client({
  domain: resolveAuth0Domain(),
  clientId: envOrBuildFallback("AUTH0_CLIENT_ID", "build-client-id"),
  clientSecret: envOrBuildFallback("AUTH0_CLIENT_SECRET", "build-client-secret"),
  secret: envOrBuildFallback("AUTH0_SECRET", "build-only-auth0-secret-32-bytes!!"),

  // WHY: SDK v4 reads APP_BASE_URL (not AUTH0_BASE_URL) to construct redirect_uri.
  // Setting it explicitly avoids relying on request-host inference which can fail
  // behind proxies or in non-standard environments.
  appBaseUrl,

  authorizationParameters: {
    audience: process.env.AUTH0_AUDIENCE,
    scope: "openid profile email offline_access",
  },

  // WHY: onCallback intercepts the post-authentication redirect. If Auth0 returns
  // an error (invalid_request, access_denied, etc.), we log it server-side for
  // debugging and redirect to /auth/error (a public page outside the dashboard
  // layout) to prevent redirect loops.
  async onCallback(error, _context, _session) {
    if (error) {
      console.error("[Auth0 callback error]", {
        message: error.message,
        cause: error.cause,
      });
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent(error.message)}`, appBaseUrl),
      );
    }

    // WHY: Redirect to dashboard after successful authentication.
    return NextResponse.redirect(new URL("/", appBaseUrl));
  },
});
