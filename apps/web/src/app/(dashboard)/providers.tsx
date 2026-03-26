"use client";

import { type ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";

/**
 * WHY: Client-side providers wrapper — keeps the dashboard layout as a
 * server component (for auth check) while wrapping children in client
 * providers (toast, error boundary).
 */
export function DashboardProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ErrorBoundary>{children}</ErrorBoundary>
    </ToastProvider>
  );
}
