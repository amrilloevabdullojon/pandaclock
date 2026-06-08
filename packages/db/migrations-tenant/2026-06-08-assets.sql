-- Фаза 16: учёт активов. Идемпотентно.
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category VARCHAR(24) NOT NULL DEFAULT 'OTHER',
  serial_number TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'AVAILABLE',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  purchase_date DATE,
  cost NUMERIC(14, 2),
  currency VARCHAR(3) NOT NULL DEFAULT 'UZS',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status, category);
CREATE INDEX IF NOT EXISTS idx_assets_assigned ON assets(assigned_to);

CREATE TABLE IF NOT EXISTS asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  returned_at TIMESTAMPTZ,
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset ON asset_assignments(asset_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_user ON asset_assignments(user_id);
