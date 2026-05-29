import { User } from "lucide-react";
import { Badge, Card, CardContent, PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { AvatarUploader } from "./_components/avatar-uploader";

interface MeResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
  avatarUrl: string | null;
}

export default async function ProfilePage() {
  const me = await serverFetch<MeResponse>("/auth/me");

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<User className="h-6 w-6" />}
        title="Профиль"
        description="Ваши личные данные и настройки аккаунта"
      />

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            <AvatarUploader
              initialAvatarUrl={me.avatarUrl}
              fallback={`${me.firstName.charAt(0)}${me.lastName.charAt(0)}`}
            />
            <div>
              <p className="text-foreground text-xl font-extrabold">
                {me.firstName} {me.lastName}
              </p>
              <p className="text-muted-foreground text-sm">{me.email}</p>
            </div>
          </div>

          <dl className="border-border grid grid-cols-2 gap-4 border-t pt-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Роль</dt>
              <dd className="text-foreground font-semibold">{me.role}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email подтверждён</dt>
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
    </>
  );
}
