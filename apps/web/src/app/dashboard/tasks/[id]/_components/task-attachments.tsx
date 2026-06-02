"use client";

import * as React from "react";
import { Download, File, FileImage, FileSpreadsheet, FileText, Trash2, Upload } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from "@pandaclock/ui";

interface Attachment {
  id: string;
  taskId: string;
  url: string;
  filename: string;
  size: number;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: string;
}

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Список + загрузка вложений к задаче.
 *
 * Изначальный список приходит с сервера через page.tsx; после успешного upload /
 * delete локальный state обновляется без полной перезагрузки страницы.
 *
 * Drag-drop принимает файлы из ОС, обычный <input type="file" multiple> — fallback.
 */
export function TaskAttachments({
  taskId,
  meId,
  initial,
}: {
  taskId: string;
  meId: string | null;
  initial: Attachment[];
}) {
  const [items, setItems] = React.useState<Attachment[]>(initial);
  const [uploading, setUploading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Attachment | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function uploadOne(file: File): Promise<void> {
    if (file.size > MAX_BYTES) {
      toast.error(`«${file.name}» больше 10 МБ — пропущен`);
      return;
    }
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
          code?: string;
        };
        toast.error(
          body.code === "INVALID_MIME"
            ? `Тип «${file.name}» не поддерживается`
            : (body.message ?? `Не удалось загрузить «${file.name}»`),
        );
        return;
      }
      const created = (await response.json()) as Attachment;
      setItems((prev) => [created, ...prev]);
    } catch {
      toast.error(`Сбой сети при загрузке «${file.name}»`);
    }
  }

  async function handleFiles(files: FileList | File[]): Promise<void> {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setUploading(true);
    try {
      // Параллелим — но в реальности сервер ставит ограничения по соединениям сам.
      await Promise.all(arr.map(uploadOne));
      toast.success(`Загружено: ${arr.length}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(att: Attachment): Promise<void> {
    try {
      const response = await fetch(`/api/tasks/${taskId}/attachments/${att.id}`, {
        method: "DELETE",
      });
      if (response.status === 204) {
        setItems((prev) => prev.filter((a) => a.id !== att.id));
        toast.success(`«${att.filename}» удалён`);
        setDeleteTarget(null);
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { code?: string };
      if (body.code === "NOT_ALLOWED") {
        toast.error("Удалить может только автор или менеджер");
      } else {
        toast.error("Не удалось удалить");
      }
    } catch {
      toast.error("Нет связи с сервером");
    }
  }

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) void handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 transition-colors ${
          dragOver
            ? "border-primary-500 bg-primary-50"
            : "border-border bg-muted hover:border-primary-300"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <Upload className="text-muted-foreground h-5 w-5" />
        <span className="text-foreground text-sm font-semibold">
          {uploading ? "Загружаем…" : "Перетащите файл или нажмите для выбора"}
        </span>
        <span className="text-muted-foreground text-xs">
          До 10 МБ · PDF, DOC, XLS, PNG, JPG, ZIP…
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) void handleFiles(e.target.files);
          }}
        />
      </label>

      {/* List */}
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Пока нет вложений.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((att) => (
            <AttachmentRow
              key={att.id}
              attachment={att}
              canDelete={meId === att.uploadedById}
              onDelete={() => setDeleteTarget(att)}
            />
          ))}
        </ul>
      )}

      {/* Confirm delete */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить «{deleteTarget?.filename}»?</DialogTitle>
            <DialogDescription>
              Файл будет удалён из хранилища. Действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Отмена
            </Button>
            <Button variant="danger" onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AttachmentRow({
  attachment,
  canDelete,
  onDelete,
}: {
  attachment: Attachment;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const Icon = iconForFilename(attachment.filename);
  return (
    <li className="border-border bg-card flex items-center gap-3 rounded-md border p-3">
      <div className="bg-primary-50 text-primary-700 flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-semibold">{attachment.filename}</p>
        <p className="text-muted-foreground text-xs">
          {formatBytes(attachment.size)} · {attachment.uploadedByName} ·{" "}
          {new Date(attachment.uploadedAt).toLocaleDateString("ru-RU")}
        </p>
      </div>
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        download={attachment.filename}
        className="text-muted-foreground hover:text-primary-500 p-2"
        aria-label={`Скачать ${attachment.filename}`}
      >
        <Download className="h-4 w-4" />
      </a>
      {canDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="text-muted-foreground hover:text-danger p-2"
          aria-label={`Удалить ${attachment.filename}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </li>
  );
}

function iconForFilename(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext) return File;
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return FileImage;
  if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  if (["pdf", "doc", "docx", "txt"].includes(ext)) return FileText;
  return File;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}
