"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

interface ChannelRow {
  id: string;
  type: "CHANNEL" | "DM";
  name: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
}

interface Message {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export function ChatsView({ initialChannels }: { initialChannels: ChannelRow[] }) {
  const [channels] = useState(initialChannels);
  const [activeId, setActiveId] = useState<string | null>(initialChannels[0]?.id ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const sessionRef = useRef<{ token: string; tenantSlug: string; apiUrl: string } | null>(null);

  // Загружаем session info один раз.
  useEffect(() => {
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
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;

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
        transports: ["websocket"],
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("channel:join", { channelId: activeId });
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
    })();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [activeId]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!activeId || !draft.trim()) return;
    socketRef.current?.emit("message:send", { channelId: activeId, body: draft });
    setDraft("");
  }

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeId) ?? null,
    [channels, activeId],
  );

  return (
    <div className="grid grid-cols-[280px_1fr] overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <aside className="border-r border-neutral-200">
        <ul className="divide-y divide-neutral-100">
          {channels.map((channel) => (
            <li key={channel.id}>
              <button
                type="button"
                onClick={() => setActiveId(channel.id)}
                className={[
                  "flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors",
                  channel.id === activeId
                    ? "bg-primary-50 text-primary-700"
                    : "hover:bg-neutral-50",
                ].join(" ")}
              >
                <span className="font-semibold">
                  {channel.type === "CHANNEL" ? `# ${channel.name ?? "channel"}` : channel.name ?? "DM"}
                </span>
                {channel.unreadCount > 0 ? (
                  <span className="rounded-pill bg-primary-500 px-2 py-0.5 text-xs font-bold text-white">
                    {channel.unreadCount}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex h-[600px] flex-col">
        <header className="border-b border-neutral-200 px-6 py-3">
          <h2 className="text-sm font-bold text-neutral-900">
            {activeChannel?.type === "CHANNEL"
              ? `# ${activeChannel.name ?? "channel"}`
              : activeChannel?.name ?? "Выберите чат"}
          </h2>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-400">
              Сообщений пока нет. Начните общение!
            </p>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span className="font-semibold text-neutral-900">{message.authorName}</span>
                  <span>{new Date(message.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-neutral-700">{message.body}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={send} className="border-t border-neutral-200 px-4 py-3">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Напишите сообщение..."
            className="block w-full rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm focus-ring focus-visible:border-primary-500"
          />
        </form>
      </section>
    </div>
  );
}
