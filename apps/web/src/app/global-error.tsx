"use client";

// WHY: Global error boundary. Catches unhandled errors in the root layout.
// Must be a Client Component and must render its own <html>/<body> tags
// because it replaces the root layout when triggered.
// See: https://nextjs.org/docs/app/building-your-application/routing/error-handling
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="space-y-2">
              <p className="text-6xl font-bold text-destructive">500</p>
              <h1 className="text-xl font-semibold text-foreground">
                Something Went Wrong
              </h1>
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. Please try again.
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground font-mono">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={reset}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Try Again
              </button>
              <a
                href="/"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
