"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radio } from "lucide-react";

interface ScanEvent {
  type: "scan.started" | "scan.completed" | "scan.failed";
  scanId: string;
  findingsCount?: number;
  riskScore?: number;
  summary?: string;
  error?: string;
  timestamp: string;
}

/**
 * WHY: SSE-powered live feed shows scan progress in real-time.
 * This is the "wow" moment in the demo — judges see events appear live.
 * Uses native EventSource which auto-reconnects on disconnect.
 * Ref: 06-design-demo.md — Demo Moment 2 "Live feed card updates"
 */
export function LiveScanFeed() {
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // WHY: Connect to the proxy route, not the backend directly.
    // The proxy injects the Auth0 JWT so the SSE endpoint is authenticated.
    const source = new EventSource("/api/proxy/dashboard/events");

    source.onopen = () => setConnected(true);

    // WHY: Listen for each event type separately — EventSource dispatches
    // by the `type` field in the SSE message, not the generic `message` event.
    const handleEvent = (e: MessageEvent) => {
      try {
        const data: ScanEvent = JSON.parse(e.data);
        setEvents((prev) => [data, ...prev].slice(0, 20));
      } catch {
        // Silently ignore malformed events
      }
    };

    source.addEventListener("scan.started", handleEvent);
    source.addEventListener("scan.completed", handleEvent);
    source.addEventListener("scan.failed", handleEvent);

    source.onerror = () => setConnected(false);

    return () => source.close();
  }, []);

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function eventBadge(type: string) {
    switch (type) {
      case "scan.started":
        return (
          <Badge variant="secondary" className="text-[10px]">
            STARTED
          </Badge>
        );
      case "scan.completed":
        return (
          <Badge className="bg-[var(--risk-low)]/20 text-[var(--risk-low)] border-0 text-[10px]">
            COMPLETED
          </Badge>
        );
      case "scan.failed":
        return (
          <Badge variant="destructive" className="text-[10px]">
            FAILED
          </Badge>
        );
      default:
        return null;
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Radio className="h-4 w-4" />
          Live Activity
          {connected && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-[var(--risk-low)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--risk-low)] animate-pulse" />
              Live
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Waiting for scan events...
          </p>
        ) : (
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {events.map((event, i) => (
              <li
                key={`${event.scanId}-${event.type}-${i}`}
                className="flex items-start gap-2 text-sm py-1.5 border-b border-border last:border-0"
              >
                <span className="text-muted-foreground text-xs font-mono shrink-0 mt-0.5">
                  {formatTime(event.timestamp)}
                </span>
                <div className="flex flex-col gap-1">
                  {eventBadge(event.type)}
                  {event.type === "scan.completed" && (
                    <span className="text-xs text-muted-foreground">
                      {event.findingsCount} finding
                      {event.findingsCount !== 1 ? "s" : ""} detected
                    </span>
                  )}
                  {event.type === "scan.failed" && (
                    <span className="text-xs text-[var(--risk-critical)]">
                      {event.error}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
