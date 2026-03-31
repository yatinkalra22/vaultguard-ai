import { Auth0Client } from "@auth0/nextjs-auth0/server";

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

// WHY: Auth0 Next.js SDK v4 uses Auth0Client instead of the older initAuth0().
// This client handles login, logout, callback, and session management.
// See: https://github.com/auth0/nextjs-auth0#readme
export const auth0 = new Auth0Client({
  domain: resolveAuth0Domain(),
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  secret: process.env.AUTH0_SECRET,
  authorizationParameters: {
    audience: process.env.AUTH0_AUDIENCE,
    scope: "openid profile email offline_access",
  },
});
