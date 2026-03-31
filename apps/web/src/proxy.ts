import type { NextRequest } from "next/server";
import { auth0 } from "./lib/auth0";

// WHY: Next.js 16 deprecates middleware.ts in favor of proxy.ts.
// This preserves existing auth behavior while following current framework standard.
export async function proxy(request: NextRequest) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
