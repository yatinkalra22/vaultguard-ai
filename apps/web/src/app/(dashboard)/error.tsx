"use client";

// WHY: Dashboard-scoped error boundary. Catches errors within the dashboard
// layout (API failures, component crashes) without losing the sidebar/topbar.
// See: https://nextjs.org/docs/app/building-your-application/routing/error-handling
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            Something Went Wrong
          </h1>
          <p className="text-sm text-muted-foreground">
            An error occurred while loading this page.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <button
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
