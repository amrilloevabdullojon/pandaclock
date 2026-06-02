import * as React from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Send } from "lucide-react-native";
import { api } from "@/lib/api-client";
import { Avatar, Card } from "@/components/ui";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
}

/**
 * Список комментариев к задаче с composer-полем внизу.
 * При отправке делает POST /tasks/:id/comments + reload.
 */
export function TaskComments({ taskId, meId }: { taskId: string; meId: string | null }) {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await api<Comment[]>(`/tasks/${taskId}/comments`);
      setComments(data);
    } catch {
      setComments([]);
    }
  }, [taskId]);

  React.useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  async function send(): Promise<void> {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    try {
      await api(`/tasks/${taskId}/comments`, { method: "POST", body: { body: text } });
      await load();
    } catch {
      setDraft(text); // вернуть текст обратно
    } finally {
      setSending(false);
    }
  }

  return (
    <View className="gap-3">
      <Text className="text-foreground text-base font-bold">Комментарии · {comments.length}</Text>

      {loading ? (
        <ActivityIndicator color="#5B4FE2" />
      ) : comments.length === 0 ? (
        <Text className="text-muted-foreground text-sm">Пока никто ничего не написал.</Text>
      ) : (
        <View className="gap-3">
          {comments.map((c) => (
            <CommentBubble key={c.id} comment={c} isOwn={meId === c.authorId} />
          ))}
        </View>
      )}

      {/* Composer */}
      <Card padding="sm" className="border-border flex-row items-end gap-2 border">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Написать комментарий…"
          placeholderTextColor="#9CA1A8"
          multiline
          className="text-foreground max-h-24 flex-1 px-2 py-1 text-sm"
        />
        <Pressable
          onPress={send}
          disabled={!draft.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Отправить"
          className="bg-primary-500 h-8 w-8 items-center justify-center rounded-full active:opacity-80 disabled:opacity-40"
        >
          <Send size={14} color="#FFFFFF" />
        </Pressable>
      </Card>
    </View>
  );
}

function CommentBubble({ comment, isOwn }: { comment: Comment; isOwn: boolean }) {
  const time = new Date(comment.createdAt).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <View className="flex-row items-start gap-2">
      <Avatar
        size="sm"
        src={comment.authorAvatarUrl ?? undefined}
        fallback={initials(comment.authorName)}
      />
      <View className="bg-muted flex-1 rounded-md p-2.5">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-foreground text-xs font-bold">{comment.authorName}</Text>
          {isOwn ? <Text className="text-primary-500 text-[10px] font-bold">вы</Text> : null}
          <Text className="text-muted-foreground ml-auto text-[10px]">{time}</Text>
        </View>
        <Text className="text-foreground mt-1 text-sm">{comment.body}</Text>
      </View>
    </View>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
