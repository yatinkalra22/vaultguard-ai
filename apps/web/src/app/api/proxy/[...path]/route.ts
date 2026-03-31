import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { ERROR_CODES } from "@/lib/api";

// WHY: Proxy layer between frontend and NestJS backend. This pattern:
// 1. Keeps the Auth0 access token server-side (never exposed to the browser)
// 2. Avoids CORS issues in development (same-origin requests)
// 3. Centralizes auth token injection in one place
// See: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function normalizeProxyError(status: number, payload: unknown) {
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  const message =
    typeof data.message === "string"
      ? data.message
      : status >= 500
        ? "Something went wrong on our side. Please try again shortly."
        : "Request failed";

  return {
    statusCode: status,
    message,
    code:
      typeof data.code === "string"
        ? data.code
        : typeof data.error === "string"
          ? data.error
          : undefined,
    requestId: typeof data.requestId === "string" ? data.requestId : undefined,
  };
}

async function proxy(
  req: NextRequest,
  pathSegments: string[],
  method: string
) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json(
      {
        statusCode: 401,
        code: ERROR_CODES.UNAUTHORIZED,
        message: "Please sign in to continue.",
      },
      { status: 401 }
    );
  }

  const path = pathSegments.join("/");
  const url = `${API_URL}/api/${path}${req.nextUrl.search}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.tokenSet.accessToken}`,
  };

  // WHY: Only set Content-Type for methods that may have a body.
  // GET/HEAD requests with Content-Type headers can cause issues with some servers.
  let body: string | undefined;
  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
    body = await req.text();
  }

  try {
    const res = await fetch(url, { method, headers, body });

    // WHY: Handle non-JSON responses (e.g. SSE streams, empty 204s) gracefully
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      // Forward SSE stream directly
      return new Response(res.body, {
        status: res.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return new NextResponse(null, { status: res.status });
    }

    if (contentType.includes("application/json")) {
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json(normalizeProxyError(res.status, data), {
          status: res.status,
        });
      }

      return NextResponse.json(data, { status: res.status });
    }

    if (!res.ok) {
      return NextResponse.json(
        normalizeProxyError(res.status, {
          message:
            res.status >= 500
              ? "Something went wrong on our side. Please try again shortly."
              : "Request failed",
        }),
        { status: res.status }
      );
    }

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": contentType || "text/plain",
      },
    });
  } catch (error) {
    console.error(`Proxy error [${method} ${url}]:`, error);
    return NextResponse.json(
      {
        statusCode: 502,
        code: ERROR_CODES.BACKEND_UNAVAILABLE,
        message: "Service is temporarily unavailable. Please try again.",
      },
      { status: 502 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(req, path, "GET");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(req, path, "POST");
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(req, path, "PATCH");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(req, path, "DELETE");
}
