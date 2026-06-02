import * as React from "react";
import { ActivityIndicator, Alert, Linking, Pressable, Text, View } from "react-native";
import {
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Trash2,
  Upload,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import { api, apiBase } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Card } from "@/components/ui";

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
 * Список + загрузка вложений к задаче (mobile).
 *
 * Использует expo-document-picker для выбора файла → multipart POST.
 * Tap по карточке открывает URL в системном вьювере (Linking).
 */
export function TaskAttachments({ taskId, meId }: { taskId: string; meId: string | null }) {
  const [items, setItems] = React.useState<Attachment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await api<Attachment[]>(`/tasks/${taskId}/attachments`);
      setItems(data);
    } catch {
      setItems([]);
    }
  }, [taskId]);

  React.useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  async function handlePick(): Promise<void> {
    const picked = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (picked.canceled || picked.assets.length === 0) return;
    const asset = picked.assets[0];
    if (!asset) return;
    if (asset.size && asset.size > MAX_BYTES) {
      Alert.alert("Файл слишком большой", "Максимум 10 МБ");
      return;
    }
    setUploading(true);
    try {
      const { accessToken, tenantSlug } = useAuthStore.getState();
      const form = new FormData();
      // RN FormData принимает { uri, name, type } — это спец-формат, не Blob.
      form.append("file", {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? "application/octet-stream",
      } as unknown as Blob);
      const headers: Record<string, string> = {};
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      if (tenantSlug) headers["X-Tenant-Slug"] = tenantSlug;
      // Content-Type НЕ ставим — fetch выставит boundary автоматически.
      const response = await fetch(`${apiBase}/tasks/${taskId}/attachments`, {
        method: "POST",
        headers,
        body: form,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          code?: string;
          message?: string;
        };
        throw new Error(body.message ?? body.code ?? "UPLOAD_FAILED");
      }
      const created = (await response.json()) as Attachment;
      setItems((prev) => [created, ...prev]);
    } catch (error) {
      Alert.alert("Ошибка", error instanceof Error ? error.message : "Не удалось загрузить файл");
    } finally {
      setUploading(false);
    }
  }

  function confirmDelete(att: Attachment): void {
    Alert.alert(`Удалить «${att.filename}»?`, "Файл будет удалён из хранилища.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/tasks/${taskId}/attachments/${att.id}`, { method: "DELETE" });
            setItems((prev) => prev.filter((a) => a.id !== att.id));
          } catch (error) {
            Alert.alert(
              "Не удалось удалить",
              error instanceof Error ? error.message : "Попробуйте ещё раз",
            );
          }
        },
      },
    ]);
  }

  return (
    <View className="gap-3">
      <Text className="text-foreground text-base font-bold">Вложения · {items.length}</Text>

      <Pressable
        onPress={handlePick}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel="Загрузить файл"
        className={`border-border bg-muted flex-row items-center justify-center gap-2 rounded-md border-2 border-dashed py-4 ${
          uploading ? "opacity-60" : "active:bg-primary-50"
        }`}
      >
        {uploading ? (
          <ActivityIndicator color="#5B4FE2" />
        ) : (
          <>
            <Upload size={16} color="#5B4FE2" />
            <Text className="text-primary-500 text-sm font-bold">Выбрать файл (до 10 МБ)</Text>
          </>
        )}
      </Pressable>

      {loading ? (
        <ActivityIndicator color="#5B4FE2" />
      ) : items.length === 0 ? (
        <Text className="text-muted-foreground text-sm">Пока нет вложений.</Text>
      ) : (
        <View className="gap-2">
          {items.map((att) => (
            <AttachmentRow
              key={att.id}
              attachment={att}
              canDelete={meId === att.uploadedById}
              onDelete={() => confirmDelete(att)}
            />
          ))}
        </View>
      )}
    </View>
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
    <Card padding="sm" className="flex-row items-center gap-2">
      <View className="bg-primary-50 h-9 w-9 items-center justify-center rounded-md">
        <Icon size={16} color="#5B4FE2" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-foreground text-sm font-bold" numberOfLines={1}>
          {attachment.filename}
        </Text>
        <Text className="text-muted-foreground text-[10px]">
          {formatBytes(attachment.size)} · {attachment.uploadedByName}
        </Text>
      </View>
      <Pressable
        onPress={() => Linking.openURL(attachment.url).catch(() => undefined)}
        accessibilityRole="button"
        accessibilityLabel="Открыть"
        hitSlop={8}
        className="p-2"
      >
        <Download size={16} color="#5B4FE2" />
      </Pressable>
      {canDelete ? (
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel="Удалить"
          hitSlop={8}
          className="p-2"
        >
          <Trash2 size={16} color="#ED7280" />
        </Pressable>
      ) : null}
    </Card>
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
