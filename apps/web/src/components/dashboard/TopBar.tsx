"use client";

import { Shield, LogOut } from "lucide-react";
import { MobileSidebar } from "./MobileSidebar";

interface TopBarProps {
  userName?: string;
  userEmail?: string;
}

export function TopBar({ userName, userEmail }: TopBarProps) {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {/* WHY: Mobile sidebar hamburger rendered inline in the top bar.
            Visible only on screens < md breakpoint. */}
        <MobileSidebar />
        <Shield className="h-4 w-4 text-primary hidden md:block" />
        <span className="hidden md:inline">Dashboard</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium">{userName ?? "Admin"}</p>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {userEmail ?? "admin@company.com"}
          </p>
        </div>
        <a
          href="/api/auth/logout"
          title="Sign out"
          className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </a>
      </div>
    </header>
  );
}
