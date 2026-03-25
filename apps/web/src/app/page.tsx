export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-xl bg-primary/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-10 w-10 text-primary"
          >
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold">VaultGuard AI</h1>
        <p className="text-muted-foreground max-w-md">
          AI-powered SaaS access governance. Scan, detect, and remediate access
          anomalies with human-in-the-loop approval.
        </p>
        <p className="text-sm text-muted-foreground/60">
          Dashboard coming soon — Phase 4
        </p>
      </div>
    </div>
  );
}
