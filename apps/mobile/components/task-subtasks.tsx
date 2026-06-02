import * as React from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import { Check, Plus, Square, Trash2 } from "lucide-react-native";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui";

interface Subtask {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  position: number;
}

/**
 * Чек-лист subtasks под задачей (mobile).
 *
 * Toggle done — оптимистично + PATCH; failure → откат.
 * Add — bottom-row с input + кнопка.
 * Delete — long-press с подтверждением.
 */
export function TaskSubtasks({ taskId }: { taskId: string }) {
  const [items, setItems] = React.useState<Subtask[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [draft, setDraft] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await api<Subtask[]>(`/tasks/${taskId}/subtasks`);
      setItems(data);
    } catch {
      setItems([]);
    }
  }, [taskId]);

  React.useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  async function addSubtask(): Promise<void> {
    const trimmed = draft.trim();
    if (trimmed.length < 1 || adding) return;
    setAdding(true);
    setDraft("");
    try {
      const created = await api<Subtask>(`/tasks/${taskId}/subtasks`, {
        method: "POST",
        body: { title: trimmed },
      });
      setItems((prev) => [...prev, created]);
    } catch {
      setDraft(trimmed);
      Alert.alert("Не удалось добавить");
    } finally {
      setAdding(false);
    }
  }

  async function toggle(s: Subtask): Promise<void> {
    const next = !s.done;
    setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, done: next } : x)));
    try {
      await api(`/tasks/${taskId}/subtasks/${s.id}`, {
        method: "PATCH",
        body: { done: next },
      });
    } catch {
      setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, done: s.done } : x)));
    }
  }

  function confirmDelete(s: Subtask): void {
    Alert.alert(`Удалить «${s.title}»?`, undefined, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          const previous = items;
          setItems((prev) => prev.filter((x) => x.id !== s.id));
          try {
            await api(`/tasks/${taskId}/subtasks/${s.id}`, { method: "DELETE" });
          } catch {
            setItems(previous);
            Alert.alert("Не удалось удалить");
          }
        },
      },
    ]);
  }

  const total = items.length;
  const doneCount = items.filter((i) => i.done).length;

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-foreground text-base font-bold">Подзадачи · {total}</Text>
        {total > 0 ? (
          <Text className="text-muted-foreground text-xs font-semibold">
            {doneCount} / {total}
          </Text>
        ) : null}
      </View>

      {total > 0 ? (
        <View className="bg-muted h-1.5 overflow-hidden rounded-full">
          <View
            className="bg-primary-500 h-full"
            style={{ width: `${total > 0 ? (doneCount / total) * 100 : 0}%` }}
          />
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color="#5B4FE2" />
      ) : items.length === 0 ? (
        <Text className="text-muted-foreground text-sm">Пока нет подзадач.</Text>
      ) : (
        <View className="gap-1">
          {items.map((s) => (
            <SubtaskRow
              key={s.id}
              subtask={s}
              onToggle={() => toggle(s)}
              onLongPress={() => confirmDelete(s)}
            />
          ))}
        </View>
      )}

      {/* Composer */}
      <Card padding="sm" className="border-border flex-row items-center gap-2 border">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Новая подзадача…"
          placeholderTextColor="#9CA1A8"
          returnKeyType="done"
          onSubmitEditing={addSubtask}
          className="text-foreground flex-1 px-2 py-1 text-sm"
        />
        <Pressable
          onPress={addSubtask}
          disabled={!draft.trim() || adding}
          accessibilityRole="button"
          accessibilityLabel="Добавить подзадачу"
          className="bg-primary-500 h-7 w-7 items-center justify-center rounded-full active:opacity-80 disabled:opacity-40"
        >
          {adding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Plus size={14} color="#fff" />
          )}
        </Pressable>
      </Card>
    </View>
  );
}

function SubtaskRow({
  subtask,
  onToggle,
  onLongPress,
}: {
  subtask: Subtask;
  onToggle: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      onLongPress={onLongPress}
      delayLongPress={400}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: subtask.done }}
      className="bg-muted active:bg-primary-50 flex-row items-center gap-2 rounded-md px-3 py-2.5"
    >
      {subtask.done ? (
        <View className="bg-success h-5 w-5 items-center justify-center rounded">
          <Check size={14} color="#FFFFFF" />
        </View>
      ) : (
        <View className="border-border h-5 w-5 items-center justify-center rounded border-2">
          <Square size={0} color="transparent" />
        </View>
      )}
      <Text
        className={`flex-1 text-sm ${
          subtask.done ? "text-muted-foreground line-through" : "text-foreground"
        }`}
      >
        {subtask.title}
      </Text>
      <Pressable
        onPress={onLongPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Удалить подзадачу"
        className="p-1"
      >
        <Trash2 size={14} color="#9CA0B0" />
      </Pressable>
    </Pressable>
  );
}
