"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@pandaclock/ui";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
}

export function CommentList({ taskId, initial }: { taskId: string; initial: Comment[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setPending(true);
    try {
      await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      setBody("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {initial.length === 0 ? (
        <p className="text-muted-foreground text-sm">Пока нет комментариев.</p>
      ) : (
        <ul className="space-y-3">
          {initial.map((comment) => (
            <li key={comment.id} className="bg-muted rounded-md p-3">
              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span className="text-foreground font-semibold">{comment.authorName}</span>
                <span>{new Date(comment.createdAt).toLocaleString("ru-RU")}</span>
              </div>
              <p className="text-foreground mt-2 whitespace-pre-wrap text-sm">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Напишите комментарий..."
          className="border-border bg-card focus-ring focus-visible:border-primary-500 block w-full rounded-md border px-4 py-2 text-sm"
        />
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending ? "..." : "Добавить"}
        </Button>
      </form>
    </div>
  );
}
