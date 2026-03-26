"use client";

import { useState } from "react";
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
  Menu,
  X,
} from "lucide-react";

/**
 * WHY: Mobile sidebar slides in as an overlay — standard responsive pattern.
 * On desktop (md+), the regular Sidebar renders. On mobile, this component
 * provides a hamburger menu that opens a full-height panel.
 * Ref: 06-design-demo.md — "Responsive — works on desktop and tablet"
 */

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/findings", label: "Findings", icon: AlertTriangle },
  { href: "/integrations", label: "Integrations", icon: GitBranch },
  { href: "/audit-log", label: "Audit Log", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Hamburger button — visible on mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay + slide-in panel */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Panel */}
          <aside className="absolute inset-y-0 left-0 w-64 bg-card border-r border-border flex flex-col animate-in slide-in-from-left">
            {/* Logo + close */}
            <div className="p-6 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm">VaultGuard AI</p>
                  <p className="text-xs text-muted-foreground">
                    Access Governance
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              {nav.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
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

            {/* Status */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-3 w-3 text-[var(--risk-low)]" />
                <span>Auto-scan: Daily</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
