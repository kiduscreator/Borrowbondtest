-- BorrowBond Migration 003: Complete Security Hardening, Row-Level Security (RLS),
-- Wallet Ownership Linking, Replay-Protected Transactions, Mutual Damage Proposals & Audit Trail
-- Compatible with Supabase PostgreSQL 15+

-- 1. Allow profiles to exist before a NEAR wallet is linked (Google/Email Auth separation)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'WALLET'
    CHECK (auth_provider IN ('GOOGLE', 'EMAIL', 'WALLET')),
  ADD COLUMN IF NOT EXISTS wallet_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS wallet_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_auth_user_id
  ON profiles(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON profiles(email) WHERE email IS NOT NULL;

-- 2. Verified Wallet Ownership Links Table (Prevents unauthorized wallet reassignment)
CREATE TABLE IF NOT EXISTS wallet_links (
  wallet_account_id TEXT PRIMARY KEY,
  auth_user_id UUID,
  near_network TEXT NOT NULL DEFAULT 'testnet' CHECK (near_network IN ('testnet', 'mainnet')),
  public_key TEXT NOT NULL,
  signature_proof TEXT NOT NULL,
  challenge_nonce TEXT NOT NULL UNIQUE,
  verified_on_chain BOOLEAN NOT NULL DEFAULT TRUE,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wallet_links_auth_user
  ON wallet_links(auth_user_id);

-- 3. Bookings Escrow V2 Columns (1% max platform fee, handover deadline, 48h return response window)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS fee_bps_snapshot INTEGER NOT NULL DEFAULT 100
    CHECK (fee_bps_snapshot >= 0 AND fee_bps_snapshot <= 100),
  ADD COLUMN IF NOT EXISTS platform_fee_near NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (platform_fee_near >= 0),
  ADD COLUMN IF NOT EXISTS treasury_payout_near NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (treasury_payout_near >= 0),
  ADD COLUMN IF NOT EXISTS damage_deduction_near NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (damage_deduction_near >= 0),
  ADD COLUMN IF NOT EXISTS rental_fee_yocto TEXT,
  ADD COLUMN IF NOT EXISTS collateral_yocto TEXT,
  ADD COLUMN IF NOT EXISTS total_escrowed_yocto TEXT,
  ADD COLUMN IF NOT EXISTS platform_fee_yocto TEXT,
  ADD COLUMN IF NOT EXISTS handover_deadline_iso TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_requested_at_iso TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lender_response_deadline_iso TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_sha256_hash TEXT,
  ADD COLUMN IF NOT EXISTS verified_on_chain BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Mutual Damage Settlement Proposals Table
CREATE TABLE IF NOT EXISTS damage_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
  proposed_by_wallet TEXT NOT NULL REFERENCES profiles(wallet_account_id),
  proposed_damage_near NUMERIC(18, 4) NOT NULL CHECK (proposed_damage_near >= 0),
  proposed_damage_yocto TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence_sha256_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  responded_by_wallet TEXT REFERENCES profiles(wallet_account_id),
  response_notes TEXT,
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_damage_proposals_booking
  ON damage_proposals(booking_id);

-- 5. Replay-Protected Verified On-Chain Transactions Table (Idempotency & Duplicate Tx Protection)
CREATE TABLE IF NOT EXISTS verified_transactions (
  tx_hash TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES bookings(booking_id) ON DELETE SET NULL,
  signer_wallet TEXT NOT NULL,
  receiver_contract TEXT NOT NULL,
  method_name TEXT NOT NULL,
  deposit_yocto TEXT NOT NULL DEFAULT '0',
  near_network TEXT NOT NULL DEFAULT 'testnet' CHECK (near_network IN ('testnet', 'mainnet')),
  rpc_outcome_status TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verified_tx_booking
  ON verified_transactions(booking_id);

-- 6. Immutable Security Audit Logs Table (Section 16.17)
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'INFO'
    CHECK (severity IN ('INFO', 'WARN', 'HIGH', 'CRITICAL')),
  actor_wallet TEXT,
  actor_user_id UUID,
  target_resource_type TEXT,
  target_resource_id TEXT,
  tx_hash TEXT,
  ip_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_actor
  ON security_audit_logs(actor_wallet, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_type
  ON security_audit_logs(event_type, created_at DESC);

-- ============================================================================
-- 7. COMPREHENSIVE ROW-LEVEL SECURITY (RLS) POLICIES FOR ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE spending_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_access_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE damage_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE verified_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: returns the authenticated caller's linked wallet_account_id from JWT claims or profiles
CREATE OR REPLACE FUNCTION public.current_caller_wallet()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'wallet_account_id', ''),
    (SELECT p.wallet_account_id FROM public.profiles p WHERE p.auth_user_id = auth.uid() LIMIT 1)
  );
$$;

-- Helper function: checks whether caller is the designated dispute resolver
CREATE OR REPLACE FUNCTION public.is_designated_resolver()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.current_caller_wallet() IN ('resolver.borrowbond.testnet', 'borrowbondtest.testnet'),
    FALSE
  );
$$;

-- 7.1 PROFILES POLICIES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (
    auth.uid() = auth_user_id
    OR wallet_account_id = public.current_caller_wallet()
  );

DROP POLICY IF EXISTS "Users can update only their own profile" ON profiles;
CREATE POLICY "Users can update only their own profile"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = auth_user_id
    OR wallet_account_id = public.current_caller_wallet()
  )
  WITH CHECK (
    auth.uid() = auth_user_id
    OR wallet_account_id = public.current_caller_wallet()
  );

-- 7.2 WALLET LINKS POLICIES
DROP POLICY IF EXISTS "Wallet links readable by owner" ON wallet_links;
CREATE POLICY "Wallet links readable by owner"
  ON wallet_links FOR SELECT
  USING (
    auth.uid() = auth_user_id
    OR wallet_account_id = public.current_caller_wallet()
  );

DROP POLICY IF EXISTS "Users can link unowned wallets" ON wallet_links;
CREATE POLICY "Users can link unowned wallets"
  ON wallet_links FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- 7.3 LISTINGS POLICIES
DROP POLICY IF EXISTS "Active listings are viewable by everyone" ON listings;
CREATE POLICY "Active listings are viewable by everyone"
  ON listings FOR SELECT
  USING (available = true OR owner_wallet = public.current_caller_wallet());

DROP POLICY IF EXISTS "Authenticated owners can create listings" ON listings;
CREATE POLICY "Authenticated owners can create listings"
  ON listings FOR INSERT
  WITH CHECK (owner_wallet = public.current_caller_wallet());

DROP POLICY IF EXISTS "Owners can update their own listings" ON listings;
CREATE POLICY "Owners can update their own listings"
  ON listings FOR UPDATE
  USING (owner_wallet = public.current_caller_wallet())
  WITH CHECK (owner_wallet = public.current_caller_wallet());

DROP POLICY IF EXISTS "Owners can delete their own listings" ON listings;
CREATE POLICY "Owners can delete their own listings"
  ON listings FOR DELETE
  USING (owner_wallet = public.current_caller_wallet());

-- 7.4 BOOKINGS POLICIES (Strictly Borrower, Lender, or Designated Resolver)
DROP POLICY IF EXISTS "Booking participants and resolver can read bookings" ON bookings;
CREATE POLICY "Booking participants and resolver can read bookings"
  ON bookings FOR SELECT
  USING (
    borrower_wallet = public.current_caller_wallet()
    OR lender_wallet = public.current_caller_wallet()
    OR public.is_designated_resolver()
  );

DROP POLICY IF EXISTS "Borrowers can create bookings for themselves" ON bookings;
CREATE POLICY "Borrowers can create bookings for themselves"
  ON bookings FOR INSERT
  WITH CHECK (
    borrower_wallet = public.current_caller_wallet()
    AND borrower_wallet <> lender_wallet
  );

DROP POLICY IF EXISTS "Booking participants and resolver can update bookings" ON bookings;
CREATE POLICY "Booking participants and resolver can update bookings"
  ON bookings FOR UPDATE
  USING (
    borrower_wallet = public.current_caller_wallet()
    OR lender_wallet = public.current_caller_wallet()
    OR public.is_designated_resolver()
  );

-- 7.5 BOOKING EVIDENCE POLICIES (Private to Borrower, Lender, and Resolver)
DROP POLICY IF EXISTS "Evidence readable only by booking parties and resolver" ON booking_evidence;
CREATE POLICY "Evidence readable only by booking parties and resolver"
  ON booking_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.booking_id = booking_evidence.booking_id
        AND (
          b.borrower_wallet = public.current_caller_wallet()
          OR b.lender_wallet = public.current_caller_wallet()
          OR public.is_designated_resolver()
        )
    )
  );

DROP POLICY IF EXISTS "Booking parties can submit evidence" ON booking_evidence;
CREATE POLICY "Booking parties can submit evidence"
  ON booking_evidence FOR INSERT
  WITH CHECK (
    uploader_wallet = public.current_caller_wallet()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.booking_id = booking_evidence.booking_id
        AND (
          b.borrower_wallet = public.current_caller_wallet()
          OR b.lender_wallet = public.current_caller_wallet()
        )
    )
  );

-- 7.6 DISPUTES & DAMAGE PROPOSALS POLICIES
DROP POLICY IF EXISTS "Disputes readable by booking parties and resolver" ON disputes;
CREATE POLICY "Disputes readable by booking parties and resolver"
  ON disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.booking_id = disputes.booking_id
        AND (
          b.borrower_wallet = public.current_caller_wallet()
          OR b.lender_wallet = public.current_caller_wallet()
          OR public.is_designated_resolver()
        )
    )
  );

DROP POLICY IF EXISTS "Booking parties can open disputes" ON disputes;
CREATE POLICY "Booking parties can open disputes"
  ON disputes FOR INSERT
  WITH CHECK (
    opened_by_wallet = public.current_caller_wallet()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.booking_id = disputes.booking_id
        AND (
          b.borrower_wallet = public.current_caller_wallet()
          OR b.lender_wallet = public.current_caller_wallet()
        )
    )
  );

DROP POLICY IF EXISTS "Only designated resolver can update dispute resolution" ON disputes;
CREATE POLICY "Only designated resolver can update dispute resolution"
  ON disputes FOR UPDATE
  USING (public.is_designated_resolver())
  WITH CHECK (public.is_designated_resolver());

DROP POLICY IF EXISTS "Damage proposals readable by booking parties and resolver" ON damage_proposals;
CREATE POLICY "Damage proposals readable by booking parties and resolver"
  ON damage_proposals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.booking_id = damage_proposals.booking_id
        AND (
          b.borrower_wallet = public.current_caller_wallet()
          OR b.lender_wallet = public.current_caller_wallet()
          OR public.is_designated_resolver()
        )
    )
  );

DROP POLICY IF EXISTS "Booking parties can propose damage settlement" ON damage_proposals;
CREATE POLICY "Booking parties can propose damage settlement"
  ON damage_proposals FOR INSERT
  WITH CHECK (
    proposed_by_wallet = public.current_caller_wallet()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.booking_id = damage_proposals.booking_id
        AND (
          b.borrower_wallet = public.current_caller_wallet()
          OR b.lender_wallet = public.current_caller_wallet()
        )
    )
  );

-- 7.7 REVIEWS POLICIES (Publicly readable; insertable only by completed booking participants)
DROP POLICY IF EXISTS "Reviews are publicly readable" ON reviews;
CREATE POLICY "Reviews are publicly readable"
  ON reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Participants of completed bookings can write one review" ON reviews;
CREATE POLICY "Participants of completed bookings can write one review"
  ON reviews FOR INSERT
  WITH CHECK (
    reviewer_wallet = public.current_caller_wallet()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.booking_id = reviews.booking_id
        AND b.status IN ('COMPLETED', 'RESOLVED')
        AND (
          b.borrower_wallet = public.current_caller_wallet()
          OR b.lender_wallet = public.current_caller_wallet()
        )
    )
  );

-- 7.8 SPENDING POLICIES, DIGITAL CREDENTIALS, AGENT SESSIONS & NOTIFICATIONS
DROP POLICY IF EXISTS "Users manage only their own spending policy" ON spending_policies;
CREATE POLICY "Users manage only their own spending policy"
  ON spending_policies FOR ALL
  USING (wallet_account_id = public.current_caller_wallet())
  WITH CHECK (wallet_account_id = public.current_caller_wallet());

DROP POLICY IF EXISTS "Digital credentials visible only to borrower and lender" ON digital_access_credentials;
CREATE POLICY "Digital credentials visible only to borrower and lender"
  ON digital_access_credentials FOR SELECT
  USING (
    borrower_wallet = public.current_caller_wallet()
    OR lender_wallet = public.current_caller_wallet()
  );

DROP POLICY IF EXISTS "Digital usage events visible to credential parties" ON digital_usage_events;
CREATE POLICY "Digital usage events visible to credential parties"
  ON digital_usage_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.digital_access_credentials c
      WHERE c.credential_id = digital_usage_events.credential_id
        AND (
          c.borrower_wallet = public.current_caller_wallet()
          OR c.lender_wallet = public.current_caller_wallet()
        )
    )
  );

DROP POLICY IF EXISTS "Users view only their own agent sessions" ON agent_sessions;
CREATE POLICY "Users view only their own agent sessions"
  ON agent_sessions FOR ALL
  USING (wallet_account_id = public.current_caller_wallet())
  WITH CHECK (wallet_account_id = public.current_caller_wallet());

DROP POLICY IF EXISTS "Users view only their own agent actions" ON agent_actions;
CREATE POLICY "Users view only their own agent actions"
  ON agent_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_sessions s
      WHERE s.id = agent_actions.session_id
        AND s.wallet_account_id = public.current_caller_wallet()
    )
  );

DROP POLICY IF EXISTS "Users read and update only their own notifications" ON notifications;
CREATE POLICY "Users read and update only their own notifications"
  ON notifications FOR ALL
  USING (recipient_wallet = public.current_caller_wallet())
  WITH CHECK (recipient_wallet = public.current_caller_wallet());

DROP POLICY IF EXISTS "Verified transactions readable by signer or booking parties" ON verified_transactions;
CREATE POLICY "Verified transactions readable by signer or booking parties"
  ON verified_transactions FOR SELECT
  USING (
    signer_wallet = public.current_caller_wallet()
    OR public.is_designated_resolver()
  );

DROP POLICY IF EXISTS "Audit logs readable by actor or resolver" ON security_audit_logs;
CREATE POLICY "Audit logs readable by actor or resolver"
  ON security_audit_logs FOR SELECT
  USING (
    actor_wallet = public.current_caller_wallet()
    OR auth.uid() = actor_user_id
    OR public.is_designated_resolver()
  );
