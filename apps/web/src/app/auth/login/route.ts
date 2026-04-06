import { NextRequest } from 'next/server';
import { auth0 } from '@/lib/auth0';

/**
 * WHY: Explicit login route that handles two flows:
 *
 * 1. Normal login: Attaches Auth0 organization so the JWT includes org_id.
 *    Without this, Auth0 issues a valid session but omits org_id, and backend
 *    write paths fail closed.
 *
 * 2. Integration connect: When `connection` is present, triggers an OAuth flow
 *    with the social provider to store tokens in Token Vault. Organization is
 *    deliberately omitted because Auth0 validates the connection is enabled for
 *    the org, but social connections set to "Authentication and Connected
 *    Accounts for Token Vault" can't always be added to Organizations. The
 *    backend uses AUTH0_ORGANIZATION_ID env var as fallback for the missing
 *    org_id in the resulting session.
 */
export async function GET(req: NextRequest) {
  const returnTo = req.nextUrl.searchParams.get('returnTo') || '/';
  const organization = process.env.AUTH0_ORGANIZATION_ID;

  // Integration connect flow params (set by backend's buildAuth0AuthorizeUrl)
  const connection = req.nextUrl.searchParams.get('connection') || undefined;
  const connectionScope =
    req.nextUrl.searchParams.get('connection_scope') || undefined;
  const prompt = req.nextUrl.searchParams.get('prompt') || undefined;

  const isIntegrationConnect = !!connection;

  return auth0.startInteractiveLogin({
    returnTo,
    authorizationParameters: {
      // WHY: Explicitly set organization to undefined for integration connects
      // to override the client-level config. Auth0 rejects /authorize when
      // organization is set with a social connection that isn't added to the
      // org's connections list.
      organization: isIntegrationConnect ? undefined : (organization || undefined),
      ...(connection ? { connection } : {}),
      ...(connectionScope ? { connection_scope: connectionScope } : {}),
      ...(prompt ? { prompt } : {}),
    },
  });
}
