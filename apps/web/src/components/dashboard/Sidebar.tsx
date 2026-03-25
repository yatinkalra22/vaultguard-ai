"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Shield,
  AlertTriangle,
  GitBranch,
  FileText,
  Settings,
  Zap,
  LayoutDashboard,
} from "lucide-react";

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/findings", label: "Findings", icon: AlertTriangle },
  { href: "/integrations", label: "Integrations", icon: GitBranch },
  { href: "/audit-log", label: "Audit Log", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-border">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-bold text-sm">VaultGuard AI</p>
          <p className="text-xs text-muted-foreground">Access Governance</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              pathname === href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Status indicator */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="h-3 w-3 text-[var(--risk-low)]" />
          <span>Auto-scan: Daily</span>
        </div>
      </div>
    </aside>
  );
}
