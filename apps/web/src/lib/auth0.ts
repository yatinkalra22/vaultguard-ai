import { Auth0Client } from "@auth0/nextjs-auth0/server";

// WHY: Auth0 Next.js SDK v4 uses Auth0Client instead of the older initAuth0().
// This client handles login, logout, callback, and session management.
// See: https://github.com/auth0/nextjs-auth0#readme
export const auth0 = new Auth0Client({
  authorizationParameters: {
    audience: process.env.AUTH0_AUDIENCE,
    scope: "openid profile email offline_access",
  },
});
