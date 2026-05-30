import { cookies } from "next/headers";
import { Toaster } from "@pandaclock/ui";
import { permissionsForRole, type Permission } from "@pandaclock/types";
import { CommandPalette } from "./_components/command-palette";
import { PageTransition } from "./_components/page-transition";
import { Sidebar } from "./_components/sidebar";
import { TopBar } from "./_components/top-bar";
import { serverFetch } from "@/lib/server-api";
import { SessionProvider, type SessionUser } from "@/lib/session-context";
import { AnalyticsProvider, IdentifyUser, PageViewTracker } from "@/lib/analytics";

interface MeResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  permissions?: Permission[];
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Если запрос упал — middleware уже редиректит, но на всякий случай поймаем.
  const me = await serverFetch<MeResponse>("/auth/me").catch(() => null);
  const cookieStore = await cookies();
  const tenantSlug = cookieStore.get("pcl_tenant")?.value ?? null;

  const session: SessionUser | null = me
    ? {
        ...me,
        // Если API старее (без permissions в /me) — посчитаем по роли как fallback.
        permissions: me.permissions ?? permissionsForRole(me.role),
      }
    : null;

  return (
    <SessionProvider value={session}>
      <AnalyticsProvider>
        <IdentifyUser />
        <PageViewTracker />
        <div className="bg-background flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar user={me} tenantSlug={tenantSlug} />
            <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
              <div className="mx-auto w-full max-w-screen-2xl">
                <PageTransition>{children}</PageTransition>
              </div>
            </main>
          </div>
          <Toaster />
          <CommandPalette />
        </div>
      </AnalyticsProvider>
    </SessionProvider>
  );
}
