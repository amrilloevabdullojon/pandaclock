-- chat-polish: soft-delete сообщений (edit/delete в чате).
-- Идемпотентно: повторный прогон безопасен.
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
