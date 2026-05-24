import { Sidebar } from "./_components/sidebar";
import { TopBar } from "./_components/top-bar";
import { serverFetch } from "@/lib/server-api";

interface MeResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Если запрос упал — middleware уже редиректит, но на всякий случай поймаем.
  const me = await serverFetch<MeResponse>("/auth/me").catch(() => null);

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <TopBar user={me} />
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
