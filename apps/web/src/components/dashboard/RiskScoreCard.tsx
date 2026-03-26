"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from "recharts";

interface RiskScoreCardProps {
  score: number;
  loading?: boolean;
}

/**
 * WHY: RadialBarChart shows risk at a glance — judges see the score immediately.
 * Color thresholds match the severity palette from globals.css.
 * Ref: 06-design-demo.md — "Risk score gauge animates from gray to orange 67"
 */
function getScoreColor(score: number): string {
  if (score >= 75) return "var(--risk-critical)";
  if (score >= 50) return "var(--risk-high)";
  if (score >= 25) return "var(--risk-medium)";
  return "var(--risk-low)";
}

function getScoreLabel(score: number): string {
  if (score >= 75) return "Critical";
  if (score >= 50) return "High Risk";
  if (score >= 25) return "Medium";
  return "Low Risk";
}

export function RiskScoreCard({ score, loading }: RiskScoreCardProps) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const data = [{ value: score, fill: color }];

  return (
    <Card className="row-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Risk Score
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center">
        {loading ? (
          <div className="w-32 h-32 rounded-full bg-muted animate-pulse" />
        ) : (
          <div className="relative w-40 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="70%"
                outerRadius="100%"
                startAngle={225}
                endAngle={-45}
                data={data}
                barSize={12}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 100]}
                  angleAxisId={0}
                  tick={false}
                />
                <RadialBar
                  dataKey="value"
                  cornerRadius={6}
                  background={{ fill: "var(--muted)" }}
                  angleAxisId={0}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            {/* WHY: Overlay text centered on the chart for a clean gauge look. */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold" style={{ color }}>
                {score}
              </span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
