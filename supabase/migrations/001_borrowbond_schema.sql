-- BorrowBond PostgreSQL / Supabase Migration Schema
-- Enforces strict separation between rental fees and refundable collateral,
-- hashed temporary digital credentials, and row-level security (RLS).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_account_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  profile_status TEXT NOT NULL DEFAULT 'WALLET_CONNECTED' CHECK (profile_status IN ('WALLET_CONNECTED', 'COMMUNITY_MEMBER')),
  completed_borrows INTEGER NOT NULL DEFAULT 0,
  completed_lends INTEGER NOT NULL DEFAULT 0,
  disputes_count INTEGER NOT NULL DEFAULT 0,
  cancellations_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Listings
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  owner_wallet TEXT NOT NULL REFERENCES profiles(wallet_account_id),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('PHYSICAL', 'DIGITAL')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  rental_fee_near NUMERIC(20, 6) NOT NULL CHECK (rental_fee_near > 0),
  collateral_near NUMERIC(20, 6) NOT NULL CHECK (collateral_near >= 0),
  duration_unit TEXT NOT NULL CHECK (duration_unit IN ('HOURS', 'DAYS')),
  min_duration INTEGER NOT NULL CHECK (min_duration > 0),
  max_duration INTEGER NOT NULL CHECK (max_duration >= min_duration),
  availability_status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (availability_status IN ('AVAILABLE', 'RENTED', 'PAUSED')),
  conditions TEXT NOT NULL,
  cancellation_policy TEXT NOT NULL,
  borrower_requirements TEXT NOT NULL,
  -- Physical-specific fields
  owner_estimated_value_near NUMERIC(20, 6),
  item_condition TEXT,
  included_accessories JSONB DEFAULT '[]'::jsonb,
  pickup_return_instructions TEXT,
  handover_procedure TEXT,
  -- Digital-specific fields (No private API keys stored here)
  digital_service_type TEXT,
  access_scope TEXT,
  usage_quotaRequests INTEGER,
  expiration_behavior TEXT,
  technical_requirements TEXT,
  demo_endpoint_ref TEXT,
  licensing_restrictions TEXT,
  is_demo_seed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_type_category ON listings(resource_type, category);
CREATE INDEX IF NOT EXISTS idx_listings_owner ON listings(owner_wallet);

-- 3. Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  contract_booking_id TEXT UNIQUE NOT NULL,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  lender_wallet TEXT NOT NULL REFERENCES profiles(wallet_account_id),
  borrower_wallet TEXT NOT NULL REFERENCES profiles(wallet_account_id),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('PHYSICAL', 'DIGITAL')),
  duration_count INTEGER NOT NULL CHECK (duration_count > 0),
  duration_unit TEXT NOT NULL CHECK (duration_unit IN ('HOURS', 'DAYS')),
  rental_fee_near NUMERIC(20, 6) NOT NULL,
  collateral_near NUMERIC(20, 6) NOT NULL,
  total_escrowed_near NUMERIC(20, 6) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('REQUESTED', 'ACCEPTED', 'ACTIVE', 'RETURN_REQUESTED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'DISPUTED', 'RESOLVED')),
  dispute_status TEXT NOT NULL DEFAULT 'NONE' CHECK (dispute_status IN ('NONE', 'OPEN', 'RESOLVED')),
  near_network TEXT NOT NULL DEFAULT 'testnet',
  contract_address TEXT NOT NULL DEFAULT 'borrowbond-escrow.testnet',
  tx_hash TEXT,
  lender_handover_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  borrower_handover_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  lender_return_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  borrower_return_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  one_time_handover_code TEXT,
  settlement_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_borrower ON bookings(borrower_wallet);
CREATE INDEX IF NOT EXISTS idx_bookings_lender ON bookings(lender_wallet);

-- 4. Booking Evidence (Supporting evidence off-chain references + content hashes)
CREATE TABLE IF NOT EXISTS booking_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  uploader_wallet TEXT NOT NULL REFERENCES profiles(wallet_account_id),
  stage TEXT NOT NULL CHECK (stage IN ('HANDOVER_BEFORE', 'RETURN_AFTER', 'DISPUTE_EVIDENCE')),
  file_reference TEXT NOT NULL,
  content_sha256_hash TEXT NOT NULL,
  condition_notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  opened_by_wallet TEXT NOT NULL REFERENCES profiles(wallet_account_id),
  reason TEXT NOT NULL,
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
  resolver_wallet TEXT,
  lender_payout_near NUMERIC(20, 6),
  borrower_refund_near NUMERIC(20, 6),
  outcome_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 6. Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_wallet TEXT NOT NULL REFERENCES profiles(wallet_account_id),
  target_wallet TEXT NOT NULL REFERENCES profiles(wallet_account_id),
  role_reviewed TEXT NOT NULL CHECK (role_reviewed IN ('LENDER', 'BORROWER')),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Spending Policies (AI Security Agent deterministic policy controls)
CREATE TABLE IF NOT EXISTS spending_policies (
  wallet_account_id TEXT PRIMARY KEY REFERENCES profiles(wallet_account_id) ON DELETE CASCADE,
  max_rental_fee_near NUMERIC(20, 6) NOT NULL DEFAULT 0.50,
  max_collateral_near NUMERIC(20, 6) NOT NULL DEFAULT 1.00,
  max_total_payment_near NUMERIC(20, 6) NOT NULL DEFAULT 1.25,
  allowed_categories JSONB NOT NULL DEFAULT '["Cameras & Optics", "Audio & Projection", "Drones & Robotics", "Weather & Telemetry API", "GPU & AI Compute", "Licensed Datasets"]'::jsonb,
  max_duration_days INTEGER NOT NULL DEFAULT 7,
  approved_providers JSONB NOT NULL DEFAULT '[]'::jsonb,
  excluded_providers JSONB NOT NULL DEFAULT '[]'::jsonb,
  require_manual_wallet_confirmation BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Digital Access Credentials (Stores SHA-256 token hash only, never raw token)
CREATE TABLE IF NOT EXISTS digital_access_credentials (
  id TEXT PRIMARY KEY,
  booking_id TEXT UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  borrower_wallet TEXT NOT NULL REFERENCES profiles(wallet_account_id),
  token_sha256_hash TEXT UNIQUE NOT NULL,
  token_prefix TEXT NOT NULL,
  endpoint_path TEXT NOT NULL,
  quota_limit INTEGER NOT NULL CHECK (quota_limit > 0),
  usage_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Digital Usage Events
CREATE TABLE IF NOT EXISTS digital_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id TEXT NOT NULL REFERENCES digital_access_credentials(id) ON DELETE CASCADE,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  request_path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_Status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Agent Sessions & Actions Audit Log
CREATE TABLE IF NOT EXISTS agent_sessions (
  id TEXT PRIMARY KEY,
  wallet_account_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  input_payload JSONB NOT NULL,
  output_summary JSONB NOT NULL,
  policy_passed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_wallet TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  booking_id TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security (RLS) Enablement
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE spending_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_access_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
