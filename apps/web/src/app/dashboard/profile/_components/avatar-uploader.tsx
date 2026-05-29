"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Upload } from "lucide-react";
import { cn, toast } from "@pandaclock/ui";

interface AvatarUploaderProps {
  initialAvatarUrl: string | null;
  fallback: string;
}

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Drag-drop / click-to-upload аватар. Размер 96x96, при hover показывает
 * Camera overlay. После успешной загрузки делает router.refresh
 * чтобы все компоненты (TopBar UserMenu) подхватили новый avatarUrl.
 */
export function AvatarUploader({ initialAvatarUrl, fallback }: AvatarUploaderProps) {
  const router = useRouter();
  const fileInput = React.useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = React.useState(initialAvatarUrl);
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  async function upload(file: File) {
    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error("Поддерживаются JPEG, PNG и WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Файл больше 2 MB");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const response = await fetch("/api/uploads/avatar", {
        method: "POST",
        body: fd,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        toast.error(body.message ?? "Не удалось загрузить аватар");
        return;
      }
      const data = (await response.json()) as { avatarUrl: string };
      setAvatarUrl(data.avatarUrl);
      toast.success("Аватар обновлён");
      // обновляем layout чтобы UserMenu в TopBar тоже подхватил
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void upload(file);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        aria-label="Загрузить аватар"
        className={cn(
          "group relative h-24 w-24 overflow-hidden rounded-full border-2 transition-all",
          "focus-ring",
          dragging ? "border-primary-500 scale-105" : "border-transparent",
          uploading && "opacity-70",
        )}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="bg-primary-100 text-primary-700 flex h-full w-full items-center justify-center text-2xl font-extrabold">
            {fallback.toUpperCase()}
          </div>
        )}

        {/* hover overlay */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 text-white",
            "transition-opacity",
            uploading || dragging
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : dragging ? (
            <Upload className="h-5 w-5" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {uploading ? "Загрузка" : dragging ? "Отпустите" : "Сменить"}
          </span>
        </div>
      </button>

      <input
        ref={fileInput}
        type="file"
        accept={ALLOWED_MIME.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />

      <div className="space-y-1">
        <p className="text-muted-foreground text-xs font-semibold">Перетащите файл или нажмите</p>
        <p className="text-muted-foreground text-[10px]">
          JPEG/PNG/WebP, до 2 MB. Авто-resize до 512×512.
        </p>
      </div>
    </div>
  );
}
