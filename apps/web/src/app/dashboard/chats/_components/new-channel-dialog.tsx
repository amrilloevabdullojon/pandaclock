"use client";

import * as React from "react";
import { Hash, MessageCircle, Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  toast,
} from "@pandaclock/ui";
import { UserPicker } from "./user-picker";

type Tab = "CHANNEL" | "DM";

interface Props {
  meId: string;
  /** Колбек после успешного создания — родитель должен пере-загрузить каналы. */
  onCreated: (channelId: string) => void;
}

/**
 * Диалог создания нового канала или DM.
 * - CHANNEL: имя + один или несколько участников
 * - DM: ровно один собеседник
 *
 * Текущий юзер добавляется автоматически на сервере как ADMIN (см.
 * chats.service.createChannel). Поэтому в UserPicker исключаем meId.
 */
export function NewChannelDialog({ meId, onCreated }: Props) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>("CHANNEL");
  const [name, setName] = React.useState("");
  const [memberIds, setMemberIds] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  function reset(): void {
    setTab("CHANNEL");
    setName("");
    setMemberIds([]);
  }

  async function handleSubmit(): Promise<void> {
    if (tab === "CHANNEL" && name.trim().length < 2) {
      toast.error("Имя канала минимум 2 символа");
      return;
    }
    if (memberIds.length === 0) {
      toast.error(tab === "DM" ? "Выберите собеседника" : "Выберите хотя бы одного участника");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/chats/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tab,
          name: tab === "CHANNEL" ? name.trim() : undefined,
          memberIds,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { code?: string };
        toast.error(
          body.code === "DM_REQUIRES_ONE_PEER"
            ? "DM должен быть с одним собеседником"
            : "Не удалось создать чат",
        );
        return;
      }
      const created = (await response.json()) as { id: string };
      toast.success(tab === "CHANNEL" ? `Канал «${name}» создан` : "Диалог создан");
      onCreated(created.id);
      setOpen(false);
      reset();
    } catch {
      toast.error("Нет связи с сервером");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label="Создать чат" className="h-7 w-7 p-0">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новый чат</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="bg-muted grid grid-cols-2 gap-1 rounded-md p-1">
          <button
            type="button"
            onClick={() => setTab("CHANNEL")}
            className={`flex items-center justify-center gap-1.5 rounded-sm py-1.5 text-sm font-semibold transition-colors ${
              tab === "CHANNEL" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Hash className="h-3.5 w-3.5" /> Канал
          </button>
          <button
            type="button"
            onClick={() => setTab("DM")}
            className={`flex items-center justify-center gap-1.5 rounded-sm py-1.5 text-sm font-semibold transition-colors ${
              tab === "DM" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <MessageCircle className="h-3.5 w-3.5" /> Личное
          </button>
        </div>

        <div className="space-y-3">
          {tab === "CHANNEL" ? (
            <div className="space-y-1.5">
              <Label htmlFor="channel-name">Название канала</Label>
              <Input
                id="channel-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="например: marketing"
                autoFocus
                maxLength={255}
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label>{tab === "DM" ? "Собеседник" : `Участники · ${memberIds.length}`}</Label>
            <UserPicker
              selectedIds={memberIds}
              onChange={setMemberIds}
              single={tab === "DM"}
              excludeIds={[meId]}
              maxHeight={280}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} loading={submitting} loadingText="Создаём…">
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
