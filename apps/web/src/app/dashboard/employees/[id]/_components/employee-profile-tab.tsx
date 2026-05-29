"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, EditableField, toast } from "@pandaclock/ui";

interface EmployeeDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  role: string;
  status: string;
  position: string | null;
  phone: string | null;
  departmentName: string | null;
  hireDate: string | null;
  birthDate: string | null;
  citizenship: string | null;
  employmentType: string | null;
  emailVerified: boolean;
}

type EditableKey = "firstName" | "lastName" | "middleName" | "position" | "phone" | "citizenship";

interface Props {
  employee: EmployeeDetail;
  /** Можно ли редактировать (для view-only режима у не-HR). */
  canEdit?: boolean;
}

export function EmployeeProfileTab({ employee: initial, canEdit = true }: Props) {
  const router = useRouter();
  const [employee, setEmployee] = React.useState(initial);

  React.useEffect(() => {
    setEmployee(initial);
  }, [initial]);

  async function save(field: EditableKey, value: string) {
    const body: Record<string, string | null> = { [field]: value || null };
    const response = await fetch(`/api/employees/${employee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      toast.error("Не удалось сохранить");
      throw new Error("save_failed");
    }
    const updated = (await response.json()) as EmployeeDetail;
    setEmployee(updated);
    toast.success("Сохранено");
    // refresh чтобы хедер тоже обновился
    router.refresh();
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">
            Основная информация
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Имя">
              {canEdit ? (
                <EditableField
                  value={employee.firstName}
                  onSave={(v) => save("firstName", v)}
                  required
                  ariaLabel="имя"
                  displayClassName="font-semibold text-foreground"
                />
              ) : (
                <span className="text-foreground font-semibold">{employee.firstName}</span>
              )}
            </Row>
            <Row label="Фамилия">
              {canEdit ? (
                <EditableField
                  value={employee.lastName}
                  onSave={(v) => save("lastName", v)}
                  required
                  ariaLabel="фамилия"
                  displayClassName="font-semibold text-foreground"
                />
              ) : (
                <span className="text-foreground font-semibold">{employee.lastName}</span>
              )}
            </Row>
            <Row label="Отчество">
              {canEdit ? (
                <EditableField
                  value={employee.middleName ?? ""}
                  onSave={(v) => save("middleName", v)}
                  placeholder="нет"
                  ariaLabel="отчество"
                  displayClassName="font-semibold text-foreground"
                />
              ) : (
                <span className="text-foreground font-semibold">{employee.middleName ?? "—"}</span>
              )}
            </Row>
            <Row label="Email">
              <span className="text-foreground font-semibold">{employee.email}</span>
            </Row>
            <Row label="Телефон">
              {canEdit ? (
                <EditableField
                  value={employee.phone ?? ""}
                  onSave={(v) => save("phone", v)}
                  placeholder="нет"
                  ariaLabel="телефон"
                  validate={(v) =>
                    v && !/^[+0-9\s\-()]{4,20}$/.test(v) ? "Похоже на не-телефон" : null
                  }
                  displayClassName="font-semibold text-foreground"
                />
              ) : (
                <span className="text-foreground font-semibold">{employee.phone ?? "—"}</span>
              )}
            </Row>
            <Row label="Дата рождения">
              <span className="text-foreground font-semibold">{employee.birthDate ?? "—"}</span>
            </Row>
            <Row label="Гражданство">
              {canEdit ? (
                <EditableField
                  value={employee.citizenship ?? ""}
                  onSave={(v) => save("citizenship", v)}
                  placeholder="нет"
                  ariaLabel="гражданство"
                  displayClassName="font-semibold text-foreground"
                />
              ) : (
                <span className="text-foreground font-semibold">{employee.citizenship ?? "—"}</span>
              )}
            </Row>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">
            Работа
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Должность">
              {canEdit ? (
                <EditableField
                  value={employee.position ?? ""}
                  onSave={(v) => save("position", v)}
                  placeholder="не указана"
                  ariaLabel="должность"
                  displayClassName="font-semibold text-foreground"
                />
              ) : (
                <span className="text-foreground font-semibold">{employee.position ?? "—"}</span>
              )}
            </Row>
            <Row label="Отдел">
              <span className="text-foreground font-semibold">
                {employee.departmentName ?? "—"}
              </span>
            </Row>
            <Row label="Тип занятости">
              <span className="text-foreground font-semibold">
                {employee.employmentType ?? "—"}
              </span>
            </Row>
            <Row label="Дата найма">
              <span className="text-foreground font-semibold">{employee.hireDate ?? "—"}</span>
            </Row>
            <Row label="Роль">
              <span className="text-foreground font-semibold">{employee.role}</span>
            </Row>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-border/60 flex items-center justify-between gap-4 border-b pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground min-w-0 flex-1 text-right">{children}</dd>
    </div>
  );
}
