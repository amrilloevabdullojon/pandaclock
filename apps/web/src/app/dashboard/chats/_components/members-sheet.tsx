"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Crown, Trash2, UserPlus, Users } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  toast,
} from "@pandaclock/ui";
import { UserPicker } from "./user-picker";

interface MemberRow {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: "ADMIN" | "MEMBER";
}

interface Props {
  channelId: string;
  channelName: string | null;
  meId: string;
}

/**
 * Drawer справа со списком участников канала. Открывается из header кнопкой
 * «Участники». Внутри:
 *  - список с avatar/name/role
 *  - admin может × удалить любого участника
 *  - admin может «+ Добавить» — открывается вложенный Dialog с UserPicker
 *  - любой member может выйти из канала (удаление самого себя)
 */
export function MembersSheet({ channelId, channelName, meId }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [members, setMembers] = React.useState<MemberRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [adding, setAdding] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/chats/channels/${channelId}/members`);
      if (response.ok) {
        const data = (await response.json()) as MemberRow[];
        setMembers(data);
      }
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const meRole = members.find((m) => m.userId === meId)?.role ?? "MEMBER";
  const isAdmin = meRole === "ADMIN";

  async function handleRemove(userId: string): Promise<void> {
    const member = members.find((m) => m.userId === userId);
    if (!member) return;
    const isSelf = userId === meId;
    const ok = window.confirm(
      isSelf
        ? `Выйти из канала «${channelName ?? ""}»?`
        : `Удалить ${member.firstName} ${member.lastName} из канала?`,
    );
    if (!ok) return;
    try {
      const response = await fetch(`/api/chats/channels/${channelId}/members/${userId}`, {
        method: "DELETE",
      });
      if (response.status !== 204) {
        toast.error("Не удалось удалить");
        return;
      }
      if (isSelf) {
        toast.success("Вы покинули канал");
        setOpen(false);
        router.refresh();
        return;
      }
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      toast.success(`${member.firstName} удалён`);
    } catch {
      toast.error("Нет связи с сервером");
    }
  }

  async function handleAdd(): Promise<void> {
    if (adding.length === 0) return;
    setSubmitting(true);
    try {
      // По одному, чтобы кейс «уже в канале» не блокировал остальные.
      const results = await Promise.all(
        adding.map((userId) =>
          fetch(`/api/chats/channels/${channelId}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          }).then((r) => r.status === 204),
        ),
      );
      const okCount = results.filter(Boolean).length;
      if (okCount > 0) toast.success(`Добавлено: ${okCount}`);
      setAddOpen(false);
      setAdding([]);
      await load();
    } catch {
      toast.error("Нет связи с сервером");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="sm" leftIcon={<Users className="h-4 w-4" />}>
          Участники
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Участники · {members.length}</SheetTitle>
        </SheetHeader>

        {isAdmin ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="my-3 w-full"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => setAddOpen(true)}
          >
            Добавить участника
          </Button>
        ) : null}

        <ScrollArea className="-mr-6 mt-2 pr-6" style={{ height: "calc(100vh - 200px)" }}>
          {loading ? (
            <p className="text-muted-foreground text-center text-sm">Загрузка…</p>
          ) : (
            <ul className="divide-border divide-y">
              {members.map((m) => {
                const isSelf = m.userId === meId;
                const canRemove = isAdmin || isSelf;
                return (
                  <li key={m.userId} className="flex items-center gap-3 py-2">
                    <Avatar className="h-9 w-9 shrink-0">
                      {m.avatarUrl ? <AvatarImage src={m.avatarUrl} alt="" /> : null}
                      <AvatarFallback className="bg-gradient-primary text-xs font-bold text-white">
                        {`${m.firstName.charAt(0) ?? ""}${m.lastName.charAt(0) ?? ""}`.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground flex items-center gap-1.5 truncate text-sm font-semibold">
                        {m.firstName} {m.lastName}
                        {isSelf ? (
                          <span className="text-primary-500 text-[10px] font-bold">вы</span>
                        ) : null}
                      </p>
                      {m.role === "ADMIN" ? (
                        <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                          <Crown className="h-3 w-3" /> Администратор
                        </p>
                      ) : null}
                    </div>
                    {canRemove ? (
                      <button
                        type="button"
                        onClick={() => handleRemove(m.userId)}
                        aria-label={isSelf ? "Выйти из канала" : "Удалить из канала"}
                        className="text-muted-foreground hover:text-danger p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {/* Вложенный Dialog добавления */}
        <Dialog
          open={addOpen}
          onOpenChange={(o) => {
            setAddOpen(o);
            if (!o) setAdding([]);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить участников</DialogTitle>
            </DialogHeader>
            <UserPicker
              selectedIds={adding}
              onChange={setAdding}
              excludeIds={members.map((m) => m.userId)}
              maxHeight={300}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Отмена
              </Button>
              <Button
                onClick={handleAdd}
                disabled={adding.length === 0}
                loading={submitting}
                loadingText="Добавляем…"
              >
                Добавить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
