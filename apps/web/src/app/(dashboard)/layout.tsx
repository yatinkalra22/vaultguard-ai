import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { DashboardProviders } from "./providers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth0.getSession();

  // WHY: Redirect to Auth0 Universal Login if no session exists.
  // This protects all dashboard routes server-side before any content renders.
  if (!session) {
    redirect("/auth/login");
  }

  return (
    <div className="flex h-screen bg-background">
      {/* WHY: Desktop sidebar hidden on mobile (md:flex), mobile sidebar visible only on small screens. */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar
          userName={session.user.name ?? session.user.email}
          userEmail={session.user.email}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <DashboardProviders>{children}</DashboardProviders>
        </main>
      </div>
    </div>
  );
}
