-- Lottery ticketing system — initial schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('admin', 'agent');
CREATE TYPE round_status AS ENUM ('draft', 'open', 'closed', 'drawn');
CREATE TYPE ticket_status AS ENUM ('active', 'voided');
CREATE TYPE payment_type AS ENUM ('cash', 'credit');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  phone TEXT,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  credit_warning_threshold NUMERIC(12,2) DEFAULT 10000.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ticket_price NUMERIC(12,2) NOT NULL,
  prize_amount NUMERIC(14,2) NOT NULL,
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  status round_status NOT NULL DEFAULT 'draft',
  winning_number CHAR(4),
  winner_ticket_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rounds_dates_check CHECK (closes_at > opens_at)
);

CREATE TABLE agent_round_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  max_tickets INTEGER NOT NULL CHECK (max_tickets > 0),
  tickets_sold INTEGER NOT NULL DEFAULT 0 CHECK (tickets_sold >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_id, round_id)
);

CREATE TABLE inventory_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES profiles(id),
  round_id UUID NOT NULL REFERENCES rounds(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL,
  payment_type payment_type NOT NULL,
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ticket_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES profiles(id),
  round_id UUID NOT NULL REFERENCES rounds(id),
  buyer_name TEXT NOT NULL,
  buyer_contact TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id TEXT NOT NULL UNIQUE,
  round_id UUID NOT NULL REFERENCES rounds(id),
  agent_id UUID NOT NULL REFERENCES profiles(id),
  batch_id UUID REFERENCES ticket_batches(id),
  number CHAR(4) NOT NULL CHECK (number ~ '^\d{4}$'),
  buyer_name TEXT NOT NULL,
  buyer_contact TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'active',
  verify_token TEXT NOT NULL DEFAULT '',
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES profiles(id),
  void_reason TEXT
);

ALTER TABLE rounds
  ADD CONSTRAINT rounds_winner_ticket_fk
  FOREIGN KEY (winner_ticket_id) REFERENCES tickets(id);

CREATE UNIQUE INDEX tickets_round_number_active_idx
  ON tickets (round_id, number)
  WHERE status = 'active';

CREATE INDEX tickets_agent_id_idx ON tickets (agent_id);
CREATE INDEX tickets_round_id_idx ON tickets (round_id);
CREATE INDEX inventory_ledger_agent_id_idx ON inventory_ledger (agent_id);

CREATE TABLE agent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES profiles(id),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper: role from JWT app_metadata
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT auth_user_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION is_agent()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT auth_user_role() = 'agent';
$$;

-- Auto-create profile on signup (admin sets role via service)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER rounds_updated_at BEFORE UPDATE ON rounds
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
