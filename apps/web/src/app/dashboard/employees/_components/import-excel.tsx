"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileSpreadsheet, Upload, XCircle } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  cn,
  toast,
} from "@pandaclock/ui";

interface InviteOutcome {
  invited: string[];
  skipped: { email: string; reason: string }[];
}

const ACCEPT =
  ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";
const MAX_SIZE_MB = 5;

/**
 * Drag&drop загрузка Excel/CSV → POST /api/employees/import → отчёт о
 * количестве приглашённых/пропущенных. Подсвечивает дубликаты.
 */
export function ImportEmployees() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [outcome, setOutcome] = React.useState<InviteOutcome | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  function reset(): void {
    setFile(null);
    setOutcome(null);
    setError(null);
  }

  function selectFile(f: File): void {
    setError(null);
    setOutcome(null);
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Файл больше ${MAX_SIZE_MB} MB`);
      return;
    }
    setFile(f);
  }

  async function handleUpload(): Promise<void> {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/employees/import", {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? "Не удалось импортировать файл");
        return;
      }
      const result = (await response.json()) as InviteOutcome;
      setOutcome(result);
      if (result.invited.length > 0) {
        toast.success(`Приглашено ${result.invited.length} ${pluralize(result.invited.length)}`);
        router.refresh();
      }
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet />
          Импорт из Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Импорт сотрудников</DialogTitle>
          <DialogDescription>
            Загрузите Excel или CSV с колонками: <code>email</code> (обязательно),{" "}
            <code>firstName</code>, <code>lastName</code>, <code>position</code>. Поддерживаются
            русские названия (Email, Имя, Фамилия, Должность).
          </DialogDescription>
        </DialogHeader>

        {outcome ? (
          <div className="space-y-4">
            <div className="border-success/40 bg-success-light/50 flex items-start gap-3 rounded-md border p-3">
              <CheckCircle2 className="text-success mt-0.5 h-5 w-5 shrink-0" />
              <div className="flex-1 text-sm">
                <p className="text-foreground font-bold">Приглашено: {outcome.invited.length}</p>
                {outcome.invited.length > 0 ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Письма с приглашением уходят прямо сейчас.
                  </p>
                ) : null}
              </div>
            </div>
            {outcome.skipped.length > 0 ? (
              <div className="border-warning/40 bg-warning-light/40 rounded-md border p-3">
                <p className="text-foreground mb-2 flex items-center gap-2 text-sm font-bold">
                  <XCircle className="text-warning h-4 w-4" />
                  Пропущено: {outcome.skipped.length}
                </p>
                <ul className="space-y-1 text-xs">
                  {outcome.skipped.map((s) => (
                    <li key={s.email} className="text-muted-foreground">
                      <span className="text-foreground font-semibold">{s.email}</span> —{" "}
                      {reasonLabel(s.reason)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                Загрузить ещё
              </Button>
              <Button onClick={() => setOpen(false)}>Готово</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) selectFile(f);
              }}
              className={cn(
                "border-border flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed p-8 text-center transition-colors",
                dragOver && "border-primary-500 bg-primary-50/30",
                file && "border-success/40 bg-success-light/30",
              )}
            >
              {file ? (
                <>
                  <FileSpreadsheet className="text-success h-8 w-8" />
                  <div>
                    <p className="text-foreground text-sm font-bold">{file.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {(file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-primary-500 text-xs font-semibold hover:underline"
                  >
                    Выбрать другой
                  </button>
                </>
              ) : (
                <>
                  <Upload className="text-muted-foreground h-8 w-8" />
                  <p className="text-foreground text-sm">
                    Перетащите файл сюда или{" "}
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="text-primary-500 font-semibold hover:underline"
                    >
                      выберите с диска
                    </button>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    .xlsx, .xls, .csv — до {MAX_SIZE_MB} MB
                  </p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) selectFile(f);
                }}
              />
            </div>
            {error ? (
              <p
                role="alert"
                className="border-danger/40 bg-danger-light text-danger rounded-md border px-3 py-2 text-sm"
              >
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Отмена
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file}
                loading={submitting}
                loadingText="Импортируем…"
              >
                Импортировать
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function reasonLabel(reason: string): string {
  if (reason === "ALREADY_ACTIVE") return "уже работает в компании";
  if (reason === "ALREADY_INVITED") return "приглашение уже выслано";
  if (reason === "INSERT_FAILED") return "ошибка БД";
  return reason;
}

function pluralize(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "сотрудник";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return "сотрудника";
  return "сотрудников";
}
