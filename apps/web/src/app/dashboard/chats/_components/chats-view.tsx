"use client";

import * as React from "react";
import {
  Download,
  File as FileIcon,
  FileImage,
  FileSpreadsheet,
  FileText,
  Hash,
  Lock,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  X,
} from "lucide-react";
import { io, type Socket } from "socket.io-client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  EmptyState,
  Input,
  ScrollArea,
  cn,
} from "@pandaclock/ui";
import { NewChannelDialog } from "./new-channel-dialog";
import { MembersSheet } from "./members-sheet";

interface ChannelRow {
  id: string;
  type: "CHANNEL" | "DM";
  name: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
}

interface ChatAttachment {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

interface Message {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  attachments: ChatAttachment[];
  createdAt: string;
}

interface DayGroup {
  label: string;
  iso: string;
  messages: Message[];
}

export function ChatsView({
  initialChannels,
  meId,
}: {
  initialChannels: ChannelRow[];
  meId: string;
}) {
  const [channels, setChannels] = React.useState(initialChannels);
  const [activeId, setActiveId] = React.useState<string | null>(initialChannels[0]?.id ?? null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [draft, setDraft] = React.useState("");
  const [pendingAttachments, setPendingAttachments] = React.useState<ChatAttachment[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const socketRef = React.useRef<Socket | null>(null);
  const sessionRef = React.useRef<{ token: string; tenantSlug: string; apiUrl: string } | null>(
    null,
  );
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const composerRef = React.useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Загружаем session info один раз.
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await fetch("/api/chats/access-token");
      if (!response.ok) return;
      const data = (await response.json()) as {
        token: string;
        tenantSlug: string;
        apiUrl: string;
      };
      if (!cancelled) sessionRef.current = data;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Подключаем сокет при смене активного канала.
  React.useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setLoading(true);
    setMessages([]);

    async function connect() {
      const session = sessionRef.current;
      if (!session) {
        const response = await fetch("/api/chats/access-token");
        if (!response.ok) return;
        sessionRef.current = (await response.json()) as {
          token: string;
          tenantSlug: string;
          apiUrl: string;
        };
      }
      if (cancelled) return;

      const session2 = sessionRef.current;
      if (!session2) return;

      const origin = new URL(session2.apiUrl).origin;
      const socket = io(origin, {
        path: "/socket.io",
        auth: { token: session2.token },
        query: { tenant: session2.tenantSlug },
        // Только polling: fly.io WebSocket-upgrade за прокси отдаёт 400 (Bad
        // request), из-за чего ws-транспорт не поднимается. Long-polling
        // доставляет события в реальном времени не хуже для чата такого
        // масштаба и стабильно работает за любым прокси/CDN. upgrade:false
        // запрещает socket.io даже пытаться апгрейдиться на ws (иначе он
        // спамит ошибками в консоль).
        transports: ["polling"],
        upgrade: false,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        withCredentials: true,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("channel:join", { channelId: activeId });
      });
      socket.on("connect_error", (err) => {
        // eslint-disable-next-line no-console
        console.warn("[chat] socket connect_error:", err.message);
      });
      socket.on("message:new", (message: Message) => {
        if (message.channelId === activeId) {
          setMessages((prev) => [...prev, message]);
        }
      });
    }

    void connect();

    // Загружаем историю
    void (async () => {
      const history = await fetch(`/api/chats/channels/${activeId}/messages`);
      if (history.ok) setMessages((await history.json()) as Message[]);
      setLoading(false);
    })();

    // Сброс unread у локального стейта
    setChannels((cs) => cs.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c)));

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [activeId]);

  // Autoscroll при новых сообщениях.
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  function send(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!activeId) return;
    // Разрешаем отправку без текста, если есть вложения.
    if (!body && pendingAttachments.length === 0) return;
    socketRef.current?.emit("message:send", {
      channelId: activeId,
      body,
      attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
    });
    setDraft("");
    setPendingAttachments([]);
    composerRef.current?.focus();
  }

  async function uploadFiles(files: FileList | File[]): Promise<void> {
    if (!activeId) return;
    setUploading(true);
    try {
      const arr = Array.from(files);
      // Параллельно загружаем все, добавляем по мере успеха.
      const results = await Promise.allSettled(
        arr.map(async (file) => {
          const form = new FormData();
          form.append("file", file);
          const response = await fetch(`/api/chats/channels/${activeId}/attachments`, {
            method: "POST",
            body: form,
          });
          if (!response.ok) throw new Error(`upload failed for ${file.name}`);
          return (await response.json()) as ChatAttachment;
        }),
      );
      const ok = results
        .filter((r): r is PromiseFulfilledResult<ChatAttachment> => r.status === "fulfilled")
        .map((r) => r.value);
      setPendingAttachments((prev) => [...prev, ...ok]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePending(url: string): void {
    setPendingAttachments((prev) => prev.filter((a) => a.url !== url));
  }

  function onComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(e);
    }
  }

  const activeChannel = React.useMemo(
    () => channels.find((c) => c.id === activeId) ?? null,
    [channels, activeId],
  );

  const filteredChannels = React.useMemo(() => {
    if (!search.trim()) return channels;
    const q = search.toLowerCase();
    return channels.filter((c) => (c.name ?? "").toLowerCase().includes(q));
  }, [channels, search]);

  const dayGroups = React.useMemo(() => groupByDay(messages), [messages]);

  return (
    <div className="border-border bg-card grid h-[calc(100vh-220px)] min-h-[480px] grid-cols-1 overflow-hidden rounded-md border md:grid-cols-[280px_1fr]">
      {/* === Левая колонка: каналы === */}
      <aside className="border-border bg-muted/30 flex flex-col border-b md:border-b-0 md:border-r">
        <div className="border-border flex items-center gap-2 border-b p-3">
          <Input
            prefix={<Search className="h-4 w-4" />}
            size="sm"
            placeholder="Найти канал…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <NewChannelDialog
            meId={meId}
            onCreated={async (channelId) => {
              // Перезагружаем список каналов и сразу открываем созданный.
              const response = await fetch("/api/chats/channels");
              if (response.ok) {
                const fresh = (await response.json()) as ChannelRow[];
                setChannels(fresh);
              }
              setActiveId(channelId);
            }}
          />
        </div>
        <ScrollArea className="flex-1">
          <ChannelSection
            title="Каналы"
            channels={filteredChannels.filter((c) => c.type === "CHANNEL")}
            activeId={activeId}
            onSelect={setActiveId}
          />
          <ChannelSection
            title="Личные сообщения"
            channels={filteredChannels.filter((c) => c.type === "DM")}
            activeId={activeId}
            onSelect={setActiveId}
          />
        </ScrollArea>
      </aside>

      {/* === Правая колонка: окно чата === */}
      <section className="bg-background/50 flex min-h-0 flex-col">
        {activeChannel ? (
          <>
            <header className="border-border bg-card/80 flex h-14 items-center justify-between border-b px-5 backdrop-blur">
              <div className="flex min-w-0 items-center gap-2">
                <ChannelIcon type={activeChannel.type} className="text-muted-foreground h-4 w-4" />
                <h2 className="text-foreground truncate text-base font-bold">
                  {activeChannel.name ?? "channel"}
                </h2>
              </div>
              <MembersSheet
                channelId={activeChannel.id}
                channelName={activeChannel.name}
                meId={meId}
              />
            </header>

            <ScrollArea className="flex-1 px-5">
              <div className="space-y-4 py-4">
                {loading ? (
                  <p className="text-muted-foreground text-center text-sm">Загрузка…</p>
                ) : dayGroups.length === 0 ? (
                  <div className="pt-12">
                    <EmptyState
                      compact
                      icon={<MessageCircle />}
                      title="Сообщений пока нет"
                      description="Будьте первым — поздоровайтесь с командой!"
                    />
                  </div>
                ) : (
                  dayGroups.map((g) => (
                    <div key={g.iso} className="space-y-2">
                      <div className="z-1 sticky top-0 flex items-center justify-center">
                        <span className="border-border bg-card text-muted-foreground shadow-xs rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          {g.label}
                        </span>
                      </div>
                      <ul className="space-y-3">
                        {clusterMessages(g.messages).map((cluster) => (
                          <MessageCluster key={cluster.id} cluster={cluster} />
                        ))}
                      </ul>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <form onSubmit={send} className="border-border bg-card border-t p-3">
              {/* Pending attachments chips */}
              {pendingAttachments.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {pendingAttachments.map((att) => {
                    const Icon = iconForMime(att.mimeType, att.filename);
                    return (
                      <span
                        key={att.url}
                        className="border-border bg-muted text-foreground inline-flex max-w-[240px] items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                      >
                        <Icon className="text-primary-500 h-3.5 w-3.5 shrink-0" />
                        <span className="truncate font-semibold">{att.filename}</span>
                        <span className="text-muted-foreground shrink-0 text-[10px]">
                          {formatBytes(att.size)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePending(att.url)}
                          aria-label="Убрать"
                          className="text-muted-foreground hover:text-danger shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              ) : null}

              <div className="border-border bg-background focus-within:border-primary-500 focus-within:ring-ring/30 flex items-end gap-2 rounded-md border px-3 py-2 focus-within:ring-2">
                {/* Paperclip */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  aria-label="Прикрепить файл"
                  className="text-muted-foreground hover:text-primary-500 shrink-0 self-end py-1.5 disabled:opacity-40"
                >
                  <Paperclip className={`h-4 w-4 ${uploading ? "animate-pulse" : ""}`} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      void uploadFiles(e.target.files);
                    }
                  }}
                />
                <textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onComposerKeyDown}
                  placeholder={`Сообщение в #${activeChannel.name ?? "channel"}`}
                  rows={1}
                  className="placeholder:text-muted-foreground flex-1 resize-none bg-transparent py-1.5 text-sm leading-snug focus:outline-none"
                  style={{ maxHeight: 120 }}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="icon-sm"
                  disabled={(!draft.trim() && pendingAttachments.length === 0) || uploading}
                  aria-label="Отправить"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-muted-foreground mt-1 px-1 text-[10px]">
                Enter — отправить · Shift+Enter — перенос строки · 📎 — файл до 25 МБ
              </p>
            </form>
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              icon={<MessageCircle />}
              title="Выберите чат слева"
              description="Каналы команды и личные сообщения"
            />
          </div>
        )}
      </section>
    </div>
  );
}

function ChannelSection({
  title,
  channels,
  activeId,
  onSelect,
}: {
  title: string;
  channels: ChannelRow[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (channels.length === 0) return null;
  return (
    <div className="px-1 py-2">
      <p className="text-muted-foreground px-3 pb-1 text-[10px] font-bold uppercase tracking-wider">
        {title}
      </p>
      <ul className="space-y-0.5">
        {channels.map((channel) => {
          const isActive = channel.id === activeId;
          const hasUnread = channel.unreadCount > 0 && !isActive;
          return (
            <li key={channel.id}>
              <button
                type="button"
                onClick={() => onSelect(channel.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "focus-ring group flex h-8 w-full items-center gap-2 rounded-sm px-3 text-sm transition-colors",
                  isActive
                    ? "bg-primary-500/15 text-primary-700 font-bold"
                    : hasUnread
                      ? "text-foreground hover:bg-muted font-bold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <ChannelIcon
                  type={channel.type}
                  className={cn("h-3.5 w-3.5", isActive ? "text-primary-700" : "")}
                />
                <span className="flex-1 truncate text-left">{channel.name ?? "—"}</span>
                {hasUnread && (
                  <span className="bg-primary-500 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none text-white">
                    {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ChannelIcon({ type, className }: { type: ChannelRow["type"]; className?: string }) {
  if (type === "CHANNEL") return <Hash className={className} aria-hidden="true" />;
  return <Lock className={className} aria-hidden="true" />;
}

interface MessageClusterT {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  startedAt: string;
  messages: Message[];
}

function MessageAttachments({ items }: { items: ChatAttachment[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {items.map((att) => {
        const isImage = att.mimeType.startsWith("image/");
        if (isImage) {
          return (
            <a
              key={att.url}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className="border-border block max-w-[280px] overflow-hidden rounded-md border"
            >
              <img
                src={att.url}
                alt={att.filename}
                className="block max-h-[260px] w-full object-cover"
              />
            </a>
          );
        }
        const Icon = iconForMime(att.mimeType, att.filename);
        return (
          <a
            key={att.url}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            download={att.filename}
            className="border-border bg-card hover:bg-muted/60 flex max-w-[280px] items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors"
          >
            <div className="bg-primary-50 text-primary-700 flex h-8 w-8 shrink-0 items-center justify-center rounded">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate font-semibold">{att.filename}</p>
              <p className="text-muted-foreground text-[10px]">{formatBytes(att.size)}</p>
            </div>
            <Download className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          </a>
        );
      })}
    </div>
  );
}

function iconForMime(mime: string, filename: string) {
  if (mime.startsWith("image/")) return FileImage;
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && ["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  if (mime === "application/pdf" || (ext && ["pdf", "doc", "docx", "txt"].includes(ext))) {
    return FileText;
  }
  return FileIcon;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function MessageCluster({ cluster }: { cluster: MessageClusterT }) {
  const time = new Date(cluster.startedAt).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <li className="hover:bg-muted/40 -mx-2 flex items-start gap-3 rounded-sm px-2 py-1 transition-colors">
      <Avatar className="mt-0.5 h-9 w-9 shrink-0">
        {cluster.authorAvatarUrl ? <AvatarImage src={cluster.authorAvatarUrl} alt="" /> : null}
        <AvatarFallback className="bg-gradient-primary text-xs font-bold text-white">
          {initials(cluster.authorName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className="text-foreground text-sm font-bold">{cluster.authorName}</span>
          <span className="text-muted-foreground text-[10px] tabular-nums">{time}</span>
        </p>
        <div className="space-y-1">
          {cluster.messages.map((m) => (
            <div key={m.id}>
              {m.body ? (
                <p className="text-foreground whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {m.body}
                </p>
              ) : null}
              <MessageAttachments items={m.attachments} />
            </div>
          ))}
        </div>
      </div>
    </li>
  );
}

function groupByDay(messages: Message[]): DayGroup[] {
  const groups = new Map<string, Message[]>();
  for (const m of messages) {
    const iso = m.createdAt.slice(0, 10);
    if (!groups.has(iso)) groups.set(iso, []);
    groups.get(iso)!.push(m);
  }
  const sorted = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  return sorted.map(([iso, msgs]) => ({
    iso,
    label: formatDayLabel(iso),
    messages: msgs,
  }));
}

/** Группирует подряд идущие сообщения одного автора (с разрывом ≤5 минут) в кластер. */
function clusterMessages(messages: Message[]): MessageClusterT[] {
  const clusters: MessageClusterT[] = [];
  for (const m of messages) {
    const last = clusters[clusters.length - 1];
    if (
      last &&
      last.authorId === m.authorId &&
      new Date(m.createdAt).getTime() - new Date(last.startedAt).getTime() < 5 * 60_000
    ) {
      last.messages.push(m);
    } else {
      clusters.push({
        id: m.id,
        authorId: m.authorId,
        authorName: m.authorName,
        authorAvatarUrl: m.authorAvatarUrl,
        startedAt: m.createdAt,
        messages: [m],
      });
    }
  }
  return clusters;
}

function formatDayLabel(iso: string): string {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const yesterdayIso = new Date(today.getTime() - 86_400_000).toISOString().slice(0, 10);
  if (iso === todayIso) return "Сегодня";
  if (iso === yesterdayIso) return "Вчера";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long",
    timeZone: "UTC",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.charAt(0) ?? "") + (parts[parts.length - 1]?.charAt(0) ?? "")).toUpperCase();
}
