"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage, Button, toast } from "@pandaclock/ui";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
}

interface Props {
  taskId: string;
  initial: Comment[];
  /** Если задан — комменты от этого автора рендерятся справа в primary-цвете. */
  currentUserId?: string;
}

export function CommentList({ taskId, initial, currentUserId }: Props) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  async function submit(): Promise<void> {
    const text = body.trim();
    if (!text || pending) return;
    setPending(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!response.ok) {
        toast.error("Не удалось отправить");
        return;
      }
      setBody("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    // Cmd/Ctrl+Enter — отправить
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <div className="space-y-4">
      {initial.length === 0 ? (
        <p className="text-muted-foreground text-sm">Пока нет комментариев.</p>
      ) : (
        <ul className="space-y-3">
          {initial.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              isOwn={currentUserId === comment.authorId}
            />
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-2"
      >
        <textarea
          ref={textareaRef}
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Напишите комментарий…  (⌘+Enter — отправить)"
          className="border-border bg-card focus-ring focus-visible:border-primary-500 block w-full resize-none rounded-md border px-4 py-2 text-sm"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs">⌘+Enter для отправки</p>
          <Button
            type="submit"
            size="sm"
            loading={pending}
            loadingText="Отправляем…"
            disabled={!body.trim()}
            leftIcon={<Send className="h-3.5 w-3.5" />}
          >
            Отправить
          </Button>
        </div>
      </form>
    </div>
  );
}

function CommentRow({ comment, isOwn }: { comment: Comment; isOwn: boolean }) {
  const time = new Date(comment.createdAt).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <li className="flex items-start gap-3">
      <Avatar className="h-8 w-8 shrink-0">
        {comment.authorAvatarUrl ? (
          <AvatarImage src={comment.authorAvatarUrl} alt={comment.authorName} />
        ) : null}
        <AvatarFallback className="bg-gradient-primary text-[10px] font-bold text-white">
          {initials(comment.authorName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span className="text-foreground font-bold">{comment.authorName}</span>
          {isOwn ? <span className="text-primary-500 text-[10px] font-bold">вы</span> : null}
          <span>·</span>
          <span>{time}</span>
        </div>
        <p className="text-foreground mt-1 whitespace-pre-wrap text-sm leading-relaxed">
          {comment.body}
        </p>
      </div>
    </li>
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
