import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

// WHY: Proxy layer between frontend and NestJS backend. This pattern:
// 1. Keeps the Auth0 access token server-side (never exposed to the browser)
// 2. Avoids CORS issues in development (same-origin requests)
// 3. Centralizes auth token injection in one place
// See: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function proxy(
  req: NextRequest,
  pathSegments: string[],
  method: string
) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error(`Proxy error [${method} ${url}]:`, error);
    return NextResponse.json(
      { error: "Backend unavailable" },
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
