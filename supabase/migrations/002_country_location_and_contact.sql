-- BorrowBond Migration 002: Country-Aware Physical Marketplace, Location Display & User Contact System
-- Extends profiles, listings, and bookings with canonical ISO 3166-1 alpha-2 country codes,
-- structured pickup addresses, privacy controls, booking country snapshots, and Supabase RLS policies.

-- 1. Extend Profiles with Country, Region, City, International Phone (E.164), and Contact Privacy Controls
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS country_code CHAR(2),
  ADD COLUMN IF NOT EXISTS country_name TEXT,
  ADD COLUMN IF NOT EXISTS region_name TEXT,
  ADD COLUMN IF NOT EXISTS city_name TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS phone_country_code CHAR(2),
  ADD COLUMN IF NOT EXISTS preferred_contact_methods JSONB NOT NULL DEFAULT '["WHATSAPP", "IN_APP"]'::jsonb,
  ADD COLUMN IF NOT EXISTS contact_sharing_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS location_visibility JSONB NOT NULL DEFAULT '{"countryPublic": true, "regionPublic": true, "cityPublic": true, "exactAddressPrivate": true}'::jsonb;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS chk_profiles_country_code_iso2;
ALTER TABLE profiles
  ADD CONSTRAINT chk_profiles_country_code_iso2
  CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS chk_profiles_phone_country_code_iso2;
ALTER TABLE profiles
  ADD CONSTRAINT chk_profiles_phone_country_code_iso2
  CHECK (phone_country_code IS NULL OR phone_country_code ~ '^[A-Z]{2}$');

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS chk_profiles_phone_e164;
ALTER TABLE profiles
  ADD CONSTRAINT chk_profiles_phone_e164
  CHECK (phone_number IS NULL OR phone_number ~ '^\+[1-9][0-9]{6,14}$');

CREATE INDEX IF NOT EXISTS idx_profiles_country_code ON profiles(country_code);

-- 2. Extend Listings with Country, Region, City, Pickup Address, and Visibility Controls
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS asset_type TEXT GENERATED ALWAYS AS (LOWER(resource_type)) STORED,
  ADD COLUMN IF NOT EXISTS country_code CHAR(2),
  ADD COLUMN IF NOT EXISTS country_name TEXT,
  ADD COLUMN IF NOT EXISTS region_name TEXT,
  ADD COLUMN IF NOT EXISTS city_name TEXT,
  ADD COLUMN IF NOT EXISTS pickup_area TEXT,
  ADD COLUMN IF NOT EXISTS pickup_address TEXT,
  ADD COLUMN IF NOT EXISTS structured_address JSONB,
  ADD COLUMN IF NOT EXISTS pickup_visibility TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (pickup_visibility IN ('PRIVATE', 'PUBLIC')),
  ADD COLUMN IF NOT EXISTS public_address_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pickup_instructions TEXT,
  ADD COLUMN IF NOT EXISTS location_review_required BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS chk_listings_country_code_iso2;
ALTER TABLE listings
  ADD CONSTRAINT chk_listings_country_code_iso2
  CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');

ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS chk_listings_public_address_confirmation;
ALTER TABLE listings
  ADD CONSTRAINT chk_listings_public_address_confirmation
  CHECK (pickup_visibility = 'PRIVATE' OR public_address_confirmed = TRUE);

CREATE INDEX IF NOT EXISTS idx_listings_country_region_city ON listings(resource_type, country_code, region_name, city_name);

-- 3. Extend Bookings with Immutable Country Snapshots & Contact Authorization Metadata
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS borrower_country_code CHAR(2),
  ADD COLUMN IF NOT EXISTS lender_country_code CHAR(2),
  ADD COLUMN IF NOT EXISTS listing_country_code CHAR(2),
  ADD COLUMN IF NOT EXISTS contact_sharing_consent BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS location_disclosed_at TIMESTAMPTZ;

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS chk_bookings_same_country_physical;
ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_same_country_physical
  CHECK (
    resource_type = 'DIGITAL' OR (
      borrower_country_code IS NOT NULL AND
      lender_country_code IS NOT NULL AND
      listing_country_code IS NOT NULL AND
      borrower_country_code = lender_country_code AND
      listing_country_code = lender_country_code
    )
  );

CREATE INDEX IF NOT EXISTS idx_bookings_country_codes ON bookings(borrower_country_code, lender_country_code, listing_country_code);

-- 4. Row-Level Security (RLS) Policies & Safe Public Views
-- Public view of profiles (never exposes raw phone_number to unrelated users)
CREATE OR REPLACE VIEW public_profiles_view AS
SELECT
  wallet_account_id,
  display_name,
  avatar_url,
  bio,
  profile_status,
  completed_borrows,
  completed_lends,
  disputes_count,
  cancellations_count,
  CASE WHEN COALESCE((location_visibility->>'countryPublic')::boolean, true) THEN country_code ELSE NULL END AS country_code,
  CASE WHEN COALESCE((location_visibility->>'countryPublic')::boolean, true) THEN country_name ELSE NULL END AS country_name,
  CASE WHEN COALESCE((location_visibility->>'regionPublic')::boolean, true) THEN region_name ELSE NULL END AS region_name,
  CASE WHEN COALESCE((location_visibility->>'cityPublic')::boolean, true) THEN city_name ELSE NULL END AS city_name,
  preferred_contact_methods,
  contact_sharing_enabled,
  created_at
FROM profiles;

-- Public view of listings (protects exact pickup_address when pickup_visibility = 'PRIVATE')
CREATE OR REPLACE VIEW public_listings_view AS
SELECT
  id,
  owner_wallet,
  resource_type,
  title,
  description,
  category,
  images,
  rental_fee_near,
  collateral_near,
  duration_unit,
  min_duration,
  max_duration,
  availability_status,
  conditions,
  cancellation_policy,
  borrower_requirements,
  country_code,
  country_name,
  region_name,
  city_name,
  pickup_area,
  pickup_visibility,
  public_address_confirmed,
  CASE
    WHEN pickup_visibility = 'PUBLIC' AND public_address_confirmed = TRUE THEN pickup_address
    ELSE NULL
  END AS pickup_address,
  location_review_required,
  created_at
FROM listings;

-- RLS Policies on base tables
DROP POLICY IF EXISTS "Profile owners manage own private profile" ON profiles;
CREATE POLICY "Profile owners manage own private profile"
  ON profiles
  FOR ALL
  USING (wallet_account_id = current_setting('request.jwt.claims', true)::json->>'wallet_account_id');

DROP POLICY IF EXISTS "Authorized booking participants read counterparty contact" ON profiles;
CREATE POLICY "Authorized booking participants read counterparty contact"
  ON profiles
  FOR SELECT
  USING (
    wallet_account_id = current_setting('request.jwt.claims', true)::json->>'wallet_account_id'
    OR (
      contact_sharing_enabled = TRUE AND EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.status IN ('ACCEPTED', 'ACTIVE', 'RETURN_REQUESTED', 'COMPLETED', 'DISPUTED', 'RESOLVED')
          AND (
            (b.borrower_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_account_id' AND b.lender_wallet = profiles.wallet_account_id)
            OR
            (b.lender_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_account_id' AND b.borrower_wallet = profiles.wallet_account_id)
          )
      )
    )
  );

DROP POLICY IF EXISTS "Listing owners and authorized accepted bookings read pickup address" ON listings;
CREATE POLICY "Listing owners and authorized accepted bookings read pickup address"
  ON listings
  FOR SELECT
  USING (
    pickup_visibility = 'PUBLIC'
    OR owner_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_account_id'
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.listing_id = listings.id
        AND b.status IN ('ACCEPTED', 'ACTIVE', 'RETURN_REQUESTED', 'COMPLETED', 'DISPUTED', 'RESOLVED')
        AND (
          b.borrower_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_account_id'
          OR b.lender_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_account_id'
        )
    )
  );
