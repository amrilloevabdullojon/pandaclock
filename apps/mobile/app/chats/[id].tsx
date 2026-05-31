import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ArrowLeft, MessageCircle, Send } from "lucide-react-native";
import { api } from "@/lib/api-client";
import { getChatSocket } from "@/lib/socket";
import { useAuthStore } from "@/lib/auth-store";
import { Screen } from "@/components/ui";

interface Message {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

interface Me {
  id: string;
}

interface ChannelMeta {
  id: string;
  name: string | null;
  type: "CHANNEL" | "DM";
}

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const channelId = id ?? "";
  const accessToken = useAuthStore((state) => state.accessToken);

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [channel, setChannel] = useState<ChannelMeta | null>(null);
  const listRef = useRef<FlatList<Message> | null>(null);

  const load = useCallback(async () => {
    if (!channelId) return;
    try {
      const [msgs, me] = await Promise.all([
        api<Message[]>(`/chats/channels/${channelId}/messages`),
        api<Me>("/auth/me"),
      ]);
      setMessages(msgs);
      setMeId(me.id);
    } catch {
      setMessages([]);
    }

    // Метаданные канала — берём из списка (отдельного endpoint нет).
    // Если не нашли — заголовок останется generic.
    try {
      const all = await api<ChannelMeta[]>("/chats/channels");
      const found = all.find((c) => c.id === channelId);
      if (found) setChannel(found);
    } catch {
      // silent
    }
  }, [channelId]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!accessToken || !channelId) return;
    const socket = getChatSocket();
    if (!socket.connected) socket.connect();
    socket.emit("channel:join", { channelId });

    const handler = (message: Message): void => {
      if (message.channelId !== channelId) return;
      setMessages((prev) => {
        // дедуп по id (после optimistic-апдейта socket может вернуть тот же id)
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    };
    socket.on("message:new", handler);

    return () => {
      socket.off("message:new", handler);
      socket.emit("channel:leave", { channelId });
    };
  }, [accessToken, channelId]);

  // Auto-scroll вниз при новом сообщении
  useEffect(() => {
    if (messages.length > 0) {
      // setTimeout чтобы дождаться layout
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    try {
      const socket = getChatSocket();
      socket.emit("message:send", { channelId, body: text });
      // Сервер вернёт сообщение через "message:new" handler — не делаем
      // optimistic update, чтобы избежать дубликатов
    } finally {
      setSending(false);
    }
  }

  const headerTitle = channel?.name ?? "Чат";

  return (
    <Screen background="default" edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="border-border flex-row items-center gap-3 border-b px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Назад">
          <ArrowLeft size={22} color="#1F2233" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-foreground text-base font-extrabold" numberOfLines={1}>
            {headerTitle}
          </Text>
          {channel?.type === "CHANNEL" ? (
            <Text className="text-muted-foreground text-xs">Канал команды</Text>
          ) : channel?.type === "DM" ? (
            <Text className="text-muted-foreground text-xs">Личные сообщения</Text>
          ) : null}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        className="flex-1"
      >
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#5B4FE2" />
          </View>
        ) : messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <MessageCircle size={36} color="#9CA1A8" />
            <Text className="text-foreground mt-3 text-base font-bold">Сообщений пока нет</Text>
            <Text className="text-muted-foreground mt-1 text-center text-sm">
              Будьте первым — поздоровайтесь с командой 👋
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerClassName="px-4 py-3 gap-2"
            renderItem={({ item, index }) => {
              const isOwn = item.authorId === meId;
              const prev = messages[index - 1];
              const showAuthor = !prev || prev.authorId !== item.authorId;
              return <MessageBubble message={item} isOwn={isOwn} showAuthor={showAuthor} />;
            }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Composer */}
        <View className="border-border bg-card flex-row items-end gap-2 border-t px-3 py-2.5">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Сообщение…"
            placeholderTextColor="#9CA1A8"
            multiline
            className="border-border bg-muted text-foreground max-h-32 flex-1 rounded-md border px-3 py-2 text-base"
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Отправить"
            className="bg-primary-500 h-10 w-10 items-center justify-center rounded-full active:opacity-80 disabled:opacity-40"
          >
            <Send size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function MessageBubble({
  message,
  isOwn,
  showAuthor,
}: {
  message: Message;
  isOwn: boolean;
  showAuthor: boolean;
}) {
  const time = new Date(message.createdAt).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View className={isOwn ? "items-end" : "items-start"}>
      {showAuthor && !isOwn ? (
        <Text className="text-muted-foreground mb-1 ml-3 text-xs font-semibold">
          {message.authorName}
        </Text>
      ) : null}
      <View
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${isOwn ? "bg-primary-500" : "bg-muted"}`}
      >
        <Text className={`text-sm ${isOwn ? "text-white" : "text-foreground"}`}>
          {message.body}
        </Text>
        <Text
          className={`mt-0.5 text-right text-[10px] ${
            isOwn ? "text-white/70" : "text-muted-foreground"
          }`}
        >
          {time}
        </Text>
      </View>
    </View>
  );
}
