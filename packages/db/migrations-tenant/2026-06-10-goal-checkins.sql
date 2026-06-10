-- Фаза 25: OKR-чекины (история апдейтов по целям). Идемпотентно.
CREATE TABLE IF NOT EXISTS goal_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  progress INT NOT NULL DEFAULT 0,
  comment TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_goal_checkins_goal ON goal_checkins(goal_id, created_at DESC);
