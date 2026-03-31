"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

type TimelineEvent = {
  id: string;
  type: "scan" | "alert" | "audit";
  title: string;
  description: string;
  timestamp: string;
};

const typeColor: Record<string, string> = {
  scan: "bg-blue-100 text-blue-700 border-0",
  alert: "bg-red-100 text-red-700 border-0",
  audit: "bg-slate-100 text-slate-700 border-0",
};

export function IncidentTimelinePanel() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<TimelineEvent[]>("dashboard/timeline");
        setEvents(data);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Incident Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading timeline...</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timeline events yet.</p>
        ) : (
          <div className="space-y-3">
            {events.slice(0, 10).map((event) => (
              <div key={event.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className={typeColor[event.type] ?? ""}>{event.type}</Badge>
                    <p className="text-sm font-medium">{event.title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
