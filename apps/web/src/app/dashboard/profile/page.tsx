import { Badge, Card, CardContent } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";

interface MeResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
}

export default async function ProfilePage() {
  const me = await serverFetch<MeResponse>("/auth/me");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-neutral-900">Профиль</h1>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-2xl font-extrabold text-primary-700">
              {me.firstName.charAt(0)}
              {me.lastName.charAt(0)}
            </div>
            <div>
              <p className="text-xl font-extrabold text-neutral-900">
                {me.firstName} {me.lastName}
              </p>
              <p className="text-sm text-neutral-500">{me.email}</p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 border-t border-neutral-200 pt-4 text-sm">
            <div>
              <dt className="text-neutral-500">Роль</dt>
              <dd className="font-semibold text-neutral-900">{me.role}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Email подтверждён</dt>
              <dd>
                {me.emailVerified ? (
                  <Badge variant="success">Да</Badge>
                ) : (
                  <Badge variant="warning">Нет — проверьте почту</Badge>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
