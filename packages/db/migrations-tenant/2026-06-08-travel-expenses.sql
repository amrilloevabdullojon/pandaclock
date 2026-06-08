-- Фаза 14: командировки + расходы. Идемпотентно.
CREATE TABLE IF NOT EXISTS business_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  purpose TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
  approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approver_comment TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_business_trips_user ON business_trips(user_id, status);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES business_trips(id) ON DELETE SET NULL,
  category VARCHAR(16) NOT NULL DEFAULT 'OTHER',
  amount NUMERIC(14, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'UZS',
  description TEXT,
  spent_at DATE NOT NULL,
  receipt_url TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approver_comment TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_trip ON expenses(trip_id);
