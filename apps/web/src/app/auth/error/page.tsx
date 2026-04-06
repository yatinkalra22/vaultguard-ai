"use client";

// WHY: Public error page outside the (dashboard) layout so it doesn't
// trigger auth redirects. Prevents redirect loops when Auth0 callback fails.
export default function AuthErrorPage() {
  const params = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;

  const errorMessage = params?.get("message") || "An error occurred during authentication.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Authentication Error
          </h1>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </div>

        <a
          href="/auth/login"
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </a>
      </div>
    </div>
  );
}
