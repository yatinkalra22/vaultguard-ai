import { Auth0Client } from "@auth0/nextjs-auth0/server";

function isProductionBuildPhase() {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function resolveAuth0Domain() {
  if (process.env.AUTH0_DOMAIN) {
    return process.env.AUTH0_DOMAIN;
  }

  if (!process.env.AUTH0_ISSUER_BASE_URL) {
    return undefined;
  }

  return process.env.AUTH0_ISSUER_BASE_URL
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

function resolveAuth0Secret() {
  if (process.env.AUTH0_SECRET) {
    return process.env.AUTH0_SECRET;
  }

  // WHY: Next.js production builds evaluate modules even when runtime auth
  // env vars are unavailable in CI. Provide a deterministic build-only fallback
  // to avoid repeated SDK warnings during static analysis.
  if (isProductionBuildPhase()) {
    return "build-only-auth0-secret-32-bytes!!";
  }

  return undefined;
}

function resolveAuth0ClientId() {
  if (process.env.AUTH0_CLIENT_ID) {
    return process.env.AUTH0_CLIENT_ID;
  }

  if (isProductionBuildPhase()) {
    return "build-client-id";
  }

  return undefined;
}

function resolveAuth0ClientSecret() {
  if (process.env.AUTH0_CLIENT_SECRET) {
    return process.env.AUTH0_CLIENT_SECRET;
  }

  if (isProductionBuildPhase()) {
    return "build-client-secret";
  }

  return undefined;
}

// WHY: Auth0 Next.js SDK v4 uses Auth0Client instead of the older initAuth0().
// This client handles login, logout, callback, and session management.
// See: https://github.com/auth0/nextjs-auth0#readme
export const auth0 = new Auth0Client({
  domain: resolveAuth0Domain() ?? (isProductionBuildPhase() ? "build.auth0.local" : undefined),
  clientId: resolveAuth0ClientId(),
  clientSecret: resolveAuth0ClientSecret(),
  secret: resolveAuth0Secret(),
  authorizationParameters: {
    audience: process.env.AUTH0_AUDIENCE,
    scope: "openid profile email offline_access",
  },
});
