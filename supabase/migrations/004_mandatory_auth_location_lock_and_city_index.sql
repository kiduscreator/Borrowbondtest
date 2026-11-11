-- ============================================================================
-- BORROWBOND MIGRATION 004: MANDATORY AUTHENTICATION, PERMANENT COUNTRY LOCK,
-- CITY VISIBILITY & GEOGRAPHIC MARKETPLACE INDEXING (Section 17)
-- ============================================================================

BEGIN;

-- 1. Extend public.profiles with Section 17.11 location onboarding & country lock columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city_id TEXT,
  ADD COLUMN IF NOT EXISTS country_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS city_visibility TEXT NOT NULL DEFAULT 'PUBLIC'
    CHECK (city_visibility IN ('PUBLIC', 'PRIVATE'));

-- 2. Extend public.listings with optional verified city coordinates for nearby-city ranking
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS city_id TEXT,
  ADD COLUMN IF NOT EXISTS city_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS city_lng DOUBLE PRECISION;

-- 3. Immutable Audit Table for Administrative Country Corrections (Section 17.6)
CREATE TABLE IF NOT EXISTS public.country_correction_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_account_id TEXT NOT NULL,
  previous_country_code CHAR(2) NOT NULL,
  requested_country_code CHAR(2) NOT NULL,
  requested_city_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by_wallet TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.country_correction_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "country_corrections_select_own_or_admin" ON public.country_correction_requests;
CREATE POLICY "country_corrections_select_own_or_admin"
  ON public.country_correction_requests
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.current_verified_wallet() IN ('borrowbondtest.testnet', 'resolver.borrowbond.testnet')
  );

DROP POLICY IF EXISTS "country_corrections_insert_own" ON public.country_correction_requests;
CREATE POLICY "country_corrections_insert_own"
  ON public.country_correction_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND wallet_account_id = public.current_verified_wallet()
  );

-- 4. Database Trigger Enforcing Permanent Country Lock (Section 17.6)
-- Prevents any ordinary user or direct API update from changing country_code once country_locked_at is set.
CREATE OR REPLACE FUNCTION public.enforce_profile_country_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.country_locked_at IS NOT NULL
     AND OLD.country_code IS NOT NULL
     AND NEW.country_code IS DISTINCT FROM OLD.country_code
     AND COALESCE(current_setting('app.admin_country_override', true), 'false') <> 'true'
  THEN
    RAISE EXCEPTION 'Permanent country lock enforced: Your country (%) cannot be changed directly after confirmation. Submit an administrative support correction request.', OLD.country_code;
  END IF;

  -- Prevent ordinary users from clearing country_locked_at
  IF OLD.country_locked_at IS NOT NULL
     AND NEW.country_locked_at IS NULL
     AND COALESCE(current_setting('app.admin_country_override', true), 'false') <> 'true'
  THEN
    NEW.country_locked_at := OLD.country_locked_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_country_lock ON public.profiles;
CREATE TRIGGER trg_enforce_profile_country_lock
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_country_lock();

-- 5. Geographic & Marketplace Indexes (Section 17.11)
CREATE INDEX IF NOT EXISTS idx_profiles_country_city
  ON public.profiles (country_code, city_name);

CREATE INDEX IF NOT EXISTS idx_profiles_city_id
  ON public.profiles (city_id);

CREATE INDEX IF NOT EXISTS idx_listings_geo_match
  ON public.listings (resource_type, availability_status, country_code, city_name);

CREATE INDEX IF NOT EXISTS idx_listings_city_id
  ON public.listings (city_id);

COMMIT;
