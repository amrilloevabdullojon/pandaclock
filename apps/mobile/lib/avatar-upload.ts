import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import { useAuthStore } from "./auth-store";

const apiBase: string =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://localhost:4000/api/v1";

export interface PickedAvatar {
  uri: string;
  fileName: string;
  mimeType: string;
}

export interface UploadResult {
  avatarUrl: string;
}

/**
 * Открывает системный picker, возвращает выбранную картинку или null если
 * юзер отменил/отказал в правах.
 */
export async function pickAvatarFromGallery(): Promise<PickedAvatar | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
    base64: false,
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const fileName = asset.fileName ?? `avatar-${Date.now()}.jpg`;
  return {
    uri: asset.uri,
    fileName,
    mimeType: asset.mimeType ?? "image/jpeg",
  };
}

/**
 * Заливает картинку на бекенд через multipart POST /uploads/avatar/me.
 * API ужмёт через sharp до 256×256 WebP и вернёт публичный URL.
 */
export async function uploadAvatar(picked: PickedAvatar): Promise<UploadResult> {
  const { accessToken, tenantSlug } = useAuthStore.getState();
  if (!accessToken) throw new Error("NOT_AUTHENTICATED");

  const form = new FormData();
  // React Native FormData принимает { uri, name, type } — это спец-формат, не Blob
  form.append("file", {
    uri: picked.uri,
    name: picked.fileName,
    type: picked.mimeType,
  } as unknown as Blob);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (tenantSlug) headers["X-Tenant-Slug"] = tenantSlug;

  const response = await fetch(`${apiBase}/uploads/avatar/me`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`UPLOAD_FAILED: ${response.status} ${text}`);
  }
  return (await response.json()) as UploadResult;
}
