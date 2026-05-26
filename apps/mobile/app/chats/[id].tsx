import { useCallback, useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api-client";
import { getChatSocket, disconnectChatSocket } from "@/lib/socket";
import { useAuthStore } from "@/lib/auth-store";

interface Message {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const channelId = id ?? "";
  const accessToken = useAuthStore((state) => state.accessToken);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView | null>(null);

  const load = useCallback(async () => {
    if (!channelId) return;
    try {
      const data = await api<Message[]>(`/chats/channels/${channelId}/messages`);
      setMessages(data);
    } catch {
      setMessages([]);
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
      if (message.channelId === channelId) {
        setMessages((prev) => [...prev, message]);
        scrollRef.current?.scrollToEnd({ animated: true });
      }
    };
    socket.on("message:new", handler);

    return () => {
      socket.off("message:new", handler);
      socket.emit("channel:leave", { channelId });
    };
  }, [accessToken, channelId]);

  useEffect(() => {
    return () => {
      // При закрытии всего стека чатов отключаемся.
      // (Не делаем при каждом смене канала — переиспользуем сокет.)
      void disconnectChatSocket;
    };
  }, []);

  async function send() {
    if (!draft.trim()) return;
    const socket = getChatSocket();
    socket.emit("message:send", { channelId, body: draft });
    setDraft("");
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <Stack.Screen options={{ headerShown: true, title: "Чат" }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#5B4FE2" />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            className="flex-1 px-4 py-3"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.map((message) => (
              <View key={message.id} className="mb-3">
                <Text className="text-xs font-semibold text-neutral-900">
                  {message.authorName}{" "}
                  <Text className="text-neutral-400">
                    · {new Date(message.createdAt).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </Text>
                <Text className="mt-1 text-sm text-neutral-700">{message.body}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View className="flex-row items-center gap-2 border-t border-neutral-200 bg-white px-3 py-2">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Сообщение..."
            className="flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-base text-neutral-900"
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim()}
            className="rounded-md bg-primary-500 px-4 py-2 active:bg-primary-600 disabled:opacity-40"
          >
            <Text className="text-sm font-bold text-white">Отправить</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
