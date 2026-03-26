"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";

interface ScanItem {
  id: string;
  provider: string;
  status: string;
  findingsCount: number;
  startedAt: string;
  completedAt: string | null;
}

interface RecentScansProps {
  scans: ScanItem[];
  loading?: boolean;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function statusIcon(status: string) {
  switch (status) {
    case "completed":
      return <span className="text-[var(--risk-low)]">&#10003;</span>;
    case "failed":
      return <span className="text-[var(--risk-critical)]">&#10007;</span>;
    case "running":
      return <span className="text-[var(--risk-info)] animate-pulse">&#9679;</span>;
    default:
      return null;
  }
}

/**
 * WHY: Recent scans list gives the admin confidence that scans are running on schedule.
 * Ref: 06-design-demo.md — Recent Scans section in Overview layout
 */
export function RecentScans({ scans, loading }: RecentScansProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Recent Scans
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : scans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No scans yet. Connect an integration and run your first scan.
          </p>
        ) : (
          <ul className="space-y-2">
            {scans.map((scan) => (
              <li
                key={scan.id}
                className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2">
                  {statusIcon(scan.status)}
                  <span className="text-foreground">
                    {formatTime(scan.startedAt)}
                  </span>
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {scan.provider}
                  </Badge>
                </div>
                <span className="text-muted-foreground text-xs">
                  {scan.findingsCount} finding{scan.findingsCount !== 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
