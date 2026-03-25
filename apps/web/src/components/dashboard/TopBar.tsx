"use client";
import { Shield, LogOut } from "lucide-react";


interface TopBarProps {
  userName?: string;
  userEmail?: string;
}

export function TopBar({ userName, userEmail }: TopBarProps) {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Shield className="h-4 w-4 text-primary" />
        <span>Dashboard</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium">{userName ?? "Admin"}</p>
          <p className="text-xs text-muted-foreground">
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
