"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Tag as TagIcon } from "lucide-react";
import {
  Button,
  Combobox,
  type ComboboxOption,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@pandaclock/ui";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

const PRIORITIES = [
  { value: "LOW", label: "Низкий" },
  { value: "MEDIUM", label: "Средний" },
  { value: "HIGH", label: "Высокий" },
  { value: "URGENT", label: "Срочный" },
] as const;

const createTaskSchema = z.object({
  title: z.string().trim().min(2, "Минимум 2 символа").max(140, "Максимум 140 символов"),
  description: z.string().max(5000, "Слишком длинное описание").optional().or(z.literal("")),
  assigneeId: z.string().optional(),
  deadline: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  labels: z.string().max(200, "Слишком длинная строка").optional().or(z.literal("")),
});

type CreateTaskValues = z.infer<typeof createTaskSchema>;

export function CreateTaskButton({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const form = useForm<CreateTaskValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      assigneeId: "",
      deadline: "",
      priority: "MEDIUM",
      labels: "",
    },
    mode: "onBlur",
  });

  React.useEffect(() => {
    if (!open) form.reset();
  }, [open, form]);

  const assigneeOptions: ComboboxOption[] = React.useMemo(
    () =>
      employees.map((e) => ({
        value: e.id,
        label: `${e.firstName} ${e.lastName}`,
      })),
    [employees],
  );

  async function onSubmit(values: CreateTaskValues) {
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          description: values.description || undefined,
          assigneeId: values.assigneeId || undefined,
          deadline: values.deadline || undefined,
          priority: values.priority,
          labels: values.labels
            ? values.labels
                .split(",")
                .map((l) => l.trim())
                .filter(Boolean)
            : [],
        }),
      });
      if (response.ok) {
        toast.success("Задача создана");
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Не удалось создать задачу");
      }
    } catch {
      toast.error("Сетевая ошибка");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button leftIcon={<Plus className="h-4 w-4" />}>Создать задачу</Button>
      </DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Новая задача</DialogTitle>
          <DialogDescription>Опишите задачу, назначьте исполнителя и приоритет</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Название</FormLabel>
                  <FormControl>
                    <Input placeholder="Подготовить квартальный отчёт" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <textarea
                      rows={4}
                      placeholder="Markdown поддерживается"
                      className="border-input bg-card placeholder:text-muted-foreground focus-ring focus-visible:border-primary-500 flex w-full rounded-md border px-3 py-2 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Исполнитель</FormLabel>
                    <FormControl>
                      <Combobox
                        options={assigneeOptions}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="— не назначен —"
                        searchPlaceholder="Найти сотрудника…"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дедлайн</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Приоритет</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="labels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Метки</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Маркетинг, Q2"
                        prefix={<TagIcon className="h-4 w-4" />}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Через запятую</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting} loadingText="Создаём…">
                Создать задачу
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
