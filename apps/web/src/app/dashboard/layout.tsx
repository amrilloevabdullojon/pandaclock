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
  const [me, profile] = await Promise.all([
    serverFetch<MeResponse>("/auth/me").catch(() => null),
    serverFetch<{ primaryColor: string | null }>("/tenant/profile").catch(() => null),
  ]);
  const cookieStore = await cookies();
  const tenantSlug = cookieStore.get("pcl_tenant")?.value ?? null;
  const brandColor = profile?.primaryColor ?? null;

  const session: SessionUser | null = me
    ? {
        ...me,
        // Если API старее (без permissions в /me) — посчитаем по роли как fallback.
        permissions: me.permissions ?? permissionsForRole(me.role),
      }
    : null;

  return (
    <SessionProvider value={session}>
      {brandColor ? (
        // Override бренд-палитры. Хак, но проще чем рефакторить весь Tailwind preset
        // на CSS-variable-based palette. Применяется только для самых видимых классов
        // (бэкграунд primary-кнопок, текст ссылок, выделение). Полностраничный
        // theme-switcher — будущая задача (cssVariables: true в shadcn).
        <style
          dangerouslySetInnerHTML={{
            __html: buildBrandStyles(brandColor),
          }}
        />
      ) : null}
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

/** Генерирует CSS-правила для override primary-палитры под бренд-цвет. */
function buildBrandStyles(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "";
  const { r, g, b } = rgb;
  const rgba = (a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;
  return `
    .bg-primary-500 { background-color: ${hex} !important; }
    .bg-primary-600 { background-color: ${darken(hex, 0.1)} !important; }
    .bg-primary-50 { background-color: ${rgba(0.08)} !important; }
    .text-primary-500 { color: ${hex} !important; }
    .text-primary-600 { color: ${darken(hex, 0.1)} !important; }
    .text-primary-700 { color: ${darken(hex, 0.15)} !important; }
    .border-primary-500 { border-color: ${hex} !important; }
    .border-primary-300 { border-color: ${rgba(0.5)} !important; }
    .ring-primary-500 { --tw-ring-color: ${hex} !important; }
  `;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const h = m[1] ?? "";
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 - amount))));
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(f(rgb.r))}${toHex(f(rgb.g))}${toHex(f(rgb.b))}`;
}
