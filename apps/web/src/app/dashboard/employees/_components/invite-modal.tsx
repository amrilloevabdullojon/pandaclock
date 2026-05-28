"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Plus, Trash2, UserPlus } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  toast,
} from "@pandaclock/ui";

const inviteSchema = z.object({
  invitees: z
    .array(
      z.object({
        email: z.string().min(1, "Email обязателен").email("Похоже на не-email"),
      }),
    )
    .min(1, "Введите минимум один email")
    .max(20, "За раз можно пригласить до 20 человек"),
});

type InviteValues = z.infer<typeof inviteSchema>;

export function InviteEmployees() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [summary, setSummary] = React.useState<{ invited: number; skipped: number } | null>(null);

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { invitees: [{ email: "" }] },
    mode: "onBlur",
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "invitees" });

  React.useEffect(() => {
    if (!open) {
      form.reset({ invitees: [{ email: "" }] });
      setSummary(null);
    }
  }, [open, form]);

  async function onSubmit(values: InviteValues) {
    const clean = values.invitees
      .map((inv) => ({ email: inv.email.trim() }))
      .filter((inv) => inv.email);
    if (clean.length === 0) {
      form.setError("invitees.0.email", { message: "Введите минимум один email" });
      return;
    }
    try {
      const response = await fetch("/api/employees/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitees: clean }),
      });
      if (!response.ok) {
        toast.error("Не удалось отправить приглашения");
        return;
      }
      const body = (await response.json()) as { invited: string[]; skipped: unknown[] };
      setSummary({ invited: body.invited.length, skipped: body.skipped.length });
      toast.success(
        body.invited.length === 1
          ? "Приглашение отправлено"
          : `Отправлено ${body.invited.length} приглашений`,
      );
      router.refresh();
    } catch {
      toast.error("Сетевая ошибка");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button leftIcon={<UserPlus className="h-4 w-4" />}>Пригласить</Button>
      </DialogTrigger>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Пригласить сотрудников</DialogTitle>
          <DialogDescription>
            Каждый получит email со ссылкой для регистрации. Можно пригласить до 20 человек разом.
          </DialogDescription>
        </DialogHeader>

        {summary ? (
          <Alert variant="success">
            <AlertDescription>
              Отправлено: <strong>{summary.invited}</strong>
              {summary.skipped > 0 ? ` · уже в команде: ${summary.skipped}` : ""}
            </AlertDescription>
          </Alert>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`invitees.${idx}.email` as const}
                    render={({ field: f }) => (
                      <FormItem className="flex-1">
                        {idx === 0 && <FormLabel required>Email</FormLabel>}
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="colleague@company.uz"
                            prefix={<Mail className="h-4 w-4" />}
                            autoComplete="off"
                            {...f}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(idx)}
                      aria-label="Удалить"
                      className={idx === 0 ? "mt-7" : "mt-1"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={fields.length >= 20}
              onClick={() => append({ email: "" })}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Ещё email
            </Button>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting} loadingText="Отправляем…">
                Отправить приглашения
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
