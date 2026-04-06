import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';

/**
 * WHY: Custom connect-provider route that diagnoses each step of the
 * Connected Accounts flow independently. The SDK's connectAccount() swallows
 * errors in createConnectAccountTicket, so we replicate the flow manually
 * to surface the exact HTTP error from Auth0's My Account API.
 */
export async function GET(req: NextRequest) {
  const connection = req.nextUrl.searchParams.get('connection');
  const returnTo = req.nextUrl.searchParams.get('returnTo') || '/integrations';
  const scopes = req.nextUrl.searchParams.getAll('scopes');

  if (!connection) {
    return NextResponse.json(
      { error: 'connection parameter is required' },
      { status: 400 },
    );
  }

  const domain = process.env.AUTH0_DOMAIN;
  const steps: Record<string, unknown> = {};

  // ── Step 1: Check session exists ──
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({
        error: 'no_session',
        message: 'No active session. Please log in first.',
        steps,
      }, { status: 401 });
    }
    steps.session = {
      ok: true,
      user: session.user.email ?? session.user.sub,
      hasRefreshToken: !!session.tokenSet.refreshToken,
    };
  } catch (e: unknown) {
    steps.session = { ok: false, error: (e as Error).message };
    return NextResponse.json({ error: 'session_check_failed', steps }, { status: 500 });
  }

  // ── Step 2: Get access token for My Account API ──
  let myAccountToken: string | null = null;
  try {
    const tokenResult = await auth0.getAccessToken({
      audience: `https://${domain}/me/`,
      scope: 'create:me:connected_accounts',
    });
    myAccountToken = tokenResult.token;
    steps.myAccountToken = {
      ok: true,
      audience: `https://${domain}/me/`,
      expiresAt: tokenResult.expiresAt,
      scope: tokenResult.scope,
    };
  } catch (e: unknown) {
    const err = e as Error & { code?: string; cause?: unknown };
    steps.myAccountToken = {
      ok: false,
      error: err.message,
      code: err.code,
      cause: err.cause,
      hint: 'This usually means MRRT (Multi-Resource Refresh Token) is not enabled on the My Account API, or the user session lacks a refresh token (offline_access scope).',
    };
    return NextResponse.json({ error: 'my_account_token_failed', steps }, { status: 500 });
  }

  // ── Step 3: Call My Account API directly ──
  try {
    const connectUrl = `https://${domain}/me/v1/connected-accounts/connect`;
    const body = {
      connection,
      redirect_uri: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/auth/callback`,
      scopes: scopes.length > 0 ? scopes : undefined,
    };

    const res = await fetch(connectUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${myAccountToken}`,
      },
      body: JSON.stringify(body),
    });

    const responseBody = await res.text();
    steps.myAccountApiCall = {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      url: connectUrl,
      requestBody: body,
      responseBody,
    };

    if (!res.ok) {
      return NextResponse.json({
        error: 'my_account_api_failed',
        message: `My Account API returned ${res.status}: ${responseBody}`,
        steps,
        hint: res.status === 403
          ? 'The My Account API denied the request. Check that create:me:connected_accounts scope is granted to VaultGuard Web in APIs → Auth0 My Account API → Application Access.'
          : res.status === 404
            ? 'The My Account API endpoint was not found. Make sure the My Account API is activated in APIs.'
            : `HTTP ${res.status} from My Account API.`,
      }, { status: res.status });
    }
  } catch (e: unknown) {
    steps.myAccountApiCall = { ok: false, error: (e as Error).message };
    return NextResponse.json({ error: 'my_account_api_call_error', steps }, { status: 500 });
  }

  // ── Step 4: If all checks pass, use the SDK's connectAccount ──
  try {
    const response = await auth0.connectAccount({
      connection,
      scopes: scopes.length > 0 ? scopes : undefined,
      returnTo,
    });
    return response;
  } catch (error: unknown) {
    const err = error as Error & { code?: string; cause?: unknown };
    steps.connectAccount = {
      ok: false,
      error: err.message,
      code: err.code,
      cause: err.cause,
    };
    return NextResponse.json({
      error: 'connect_account_failed',
      message: err.message,
      steps,
    }, { status: 500 });
  }
}
