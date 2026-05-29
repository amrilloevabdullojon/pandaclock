"use client";

import * as React from "react";
import { Check, Pencil, X } from "lucide-react";
import { cn } from "../lib/utils";

interface EditableFieldProps {
  value: string;
  onSave: (next: string) => Promise<void> | void;
  /** "single" — Input, "multi" — textarea (Esc cancels, Cmd/Ctrl+Enter saves). */
  variant?: "single" | "multi";
  placeholder?: string;
  /** Если задано, при пустом значении блокируется submit. */
  required?: boolean;
  /** Дополнительная валидация. Вернуть строку с ошибкой или null если OK. */
  validate?: (value: string) => string | null;
  className?: string;
  /** Класс для display-режима (текст-кнопка). */
  displayClassName?: string;
  /** Подпись для accessibility. */
  ariaLabel?: string;
}

/**
 * Click-to-edit поле:
 * - Display: текст с иконкой Pencil при hover.
 * - Edit: <input> или <textarea> + Check (Save) / X (Cancel).
 * - Enter / Tab / blur → save (для single).
 * - Cmd/Ctrl+Enter → save (для multi).
 * - Esc → cancel.
 */
export function EditableField({
  value,
  onSave,
  variant = "single",
  placeholder,
  required,
  validate,
  className,
  displayClassName,
  ariaLabel,
}: EditableFieldProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // sync если parent изменил value снаружи
  React.useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  React.useEffect(() => {
    if (editing) {
      const el = inputRef.current;
      el?.focus();
      el?.select();
    }
  }, [editing]);

  function startEdit() {
    setDraft(value);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setDraft(value);
    setError(null);
    setEditing(false);
  }

  async function save() {
    const trimmed = draft.trim();
    if (required && trimmed.length === 0) {
      setError("Не может быть пустым");
      return;
    }
    if (validate) {
      const result = validate(trimmed);
      if (result) {
        setError(result);
        return;
      }
    }
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
      return;
    }
    if (variant === "single" && e.key === "Enter") {
      e.preventDefault();
      void save();
      return;
    }
    if (variant === "multi" && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void save();
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEdit}
        aria-label={ariaLabel ? `Изменить ${ariaLabel}` : "Изменить"}
        className={cn(
          "focus-ring group inline-flex max-w-full items-center gap-1.5 rounded-sm text-left",
          "transition-colors",
          className,
        )}
      >
        <span className={cn("truncate", displayClassName)}>
          {value || <span className="text-muted-foreground italic">{placeholder ?? "—"}</span>}
        </span>
        <Pencil className="text-muted-foreground h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    );
  }

  const InputComp = variant === "multi" ? "textarea" : "input";

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-start gap-1.5">
        <InputComp
          ref={inputRef as never}
          value={draft}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setDraft(e.target.value)
          }
          onKeyDown={onKeyDown}
          onBlur={variant === "single" ? () => void save() : undefined}
          placeholder={placeholder}
          rows={variant === "multi" ? 3 : undefined}
          disabled={saving}
          aria-label={ariaLabel}
          aria-invalid={error ? true : undefined}
          className={cn(
            "flex-1 rounded-sm border px-2 py-1 text-sm",
            "bg-card focus-ring",
            error ? "border-destructive" : "border-input focus-visible:border-primary-500",
            saving && "opacity-60",
          )}
        />
        <button
          type="button"
          onClick={() => void save()}
          aria-label="Сохранить"
          disabled={saving}
          className="bg-success hover:bg-success/90 focus-ring rounded-sm p-1 text-white disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={cancel}
          aria-label="Отмена"
          disabled={saving}
          className="border-border bg-card hover:bg-muted focus-ring rounded-sm border p-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && (
        <span className="text-destructive text-xs font-medium" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
