-- Фаза 12: онбординг/офбординг + кадровый ЭДО. Идемпотентно.
CREATE TABLE IF NOT EXISTS onboarding_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(16) NOT NULL DEFAULT 'ONBOARDING',
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_onboarding_items_user ON onboarding_items(user_id, kind);

CREATE TABLE IF NOT EXISTS hr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  file_url TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_document_acks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES hr_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_hr_doc_acks_user ON hr_document_acks(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_doc_acks_doc ON hr_document_acks(document_id);
