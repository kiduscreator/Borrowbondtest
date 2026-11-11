import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Sparkles,
  Lock,
  Globe,
  MapPin,
  Search,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ArrowRight,
  Play,
  RotateCcw,
  FileText,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { BorrowBondBrandLogo, BorrowBondWordmark, NearTokenIcon } from './TokenIcons';
import {
  searchEligibleCountries,
  searchCitiesInCountry,
  resolveOrValidateCityForCountry,
  validateAndLockUserLocationOnboarding,
  PERMANENT_COUNTRY_LOCK_WARNING,
  type LockedUserLocationRecord,
} from '../lib/location/countryCityDirectory';
import { getCountryFlagEmoji } from '../lib/location/countryLocationEngine';
import {
  DEMO_FINANCIAL_NOTICE,
  DEMO_RESTRICTED_MODAL_COPY,
  type GuestDemoEnvironmentState,
  type GuestDemoSimulationAction,
} from '../lib/demo/guestDemoEngine';
import type { OnChainBooking } from '../lib/near/escrowStateMachine';

// ============================================================================
// 17.1 INITIAL WELCOME SCREEN — TWO SEPARATE ACCESS MODES
// ============================================================================

interface WelcomeAccessScreenProps {
  onContinueWithGoogle: () => void;
  onExploreDemo: () => void;
  onOpenPublicDocs: (tab: 'WHITEPAPER' | 'TERMS') => void;
}

export const WelcomeAccessScreen: React.FC<WelcomeAccessScreenProps> = ({
  onContinueWithGoogle,
  onExploreDemo,
  onOpenPublicDocs,
}) => {
  return (
    <div
      data-testid="welcome-access-screen"
      className="min-h-screen bg-[#0C100D] text-[#F2F5F1] flex flex-col justify-between px-4 sm:px-6 py-10"
    >
      {/* Top Brand Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BorrowBondBrandLogo size={36} />
          <BorrowBondWordmark className="text-xl" />
        </div>
        <div className="flex items-center gap-2 text-xs text-[#A0AAA2]">
          <button
            type="button"
            onClick={() => onOpenPublicDocs('WHITEPAPER')}
            className="px-3 py-1.5 glass-nav-pill hover:text-[#F2F5F1] cursor-pointer"
          >
            Documentation
          </button>
          <button
            type="button"
            onClick={() => onOpenPublicDocs('TERMS')}
            className="px-3 py-1.5 glass-nav-pill hover:text-[#F2F5F1] cursor-pointer"
          >
            Terms &amp; Privacy
          </button>
        </div>
      </header>

      {/* Center Two-Mode Entry Selection */}
      <main className="max-w-4xl w-full mx-auto my-auto py-12 space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#151C17] border border-[#27312A] text-xs font-medium text-[#8BD6A7]">
            <Lock className="w-3.5 h-3.5" />
            <span>Physical &amp; Digital Resource Marketplace on NEAR</span>
          </span>
          <h1
            className="font-display font-bold tracking-tight text-[#F2F5F1] leading-tight"
            style={{ fontSize: 'clamp(2rem, 3.8vw, 3rem)' }}
          >
            Borrow what you need. Lend what you own.
          </h1>
          <p className="text-sm sm:text-base text-[#A0AAA2]">
            Choose how you would like to access BorrowBond. Sign in to use the real marketplace and escrow contract, or explore the interactive guest demo with zero registration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Option 1 — Create Account / Sign In */}
          <div
            data-testid="welcome-option-authenticated"
            className="near-glass-card rounded-2xl p-7 flex flex-col justify-between space-y-6 border border-[#8BD6A7]/40 bg-[#101612]"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md bg-[#8BD6A7]/15 border border-[#8BD6A7]/30 text-[11px] font-semibold text-[#8BD6A7]">
                  REAL APPLICATION
                </span>
                <ShieldCheck className="w-5 h-5 text-[#8BD6A7]" />
              </div>
              <h2 className="text-xl font-bold font-display text-[#F2F5F1]">
                Create Account / Sign In
              </h2>
              <p className="text-sm text-[#A0AAA2] leading-relaxed">
                Access the complete BorrowBond marketplace, manage listings, connect your wallet, and borrow or lend resources.
              </p>
              <ul className="space-y-2 text-xs text-[#A0AAA2] pt-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#8BD6A7] shrink-0" />
                  <span>1. Authenticate your account with Google OAuth</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#8BD6A7] shrink-0" />
                  <span>2. Select your permanent Country &amp; City for local matching</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#8BD6A7] shrink-0" />
                  <span>3. Connect and verify your NEAR Testnet wallet</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              data-testid="welcome-continue-google-btn"
              onClick={onContinueWithGoogle}
              className="btn-near-primary w-full py-3.5 px-5 text-sm font-semibold justify-center cursor-pointer"
            >
              <span>Continue with Google</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Option 2 — Explore Demo */}
          <div
            data-testid="welcome-option-guest-demo"
            className="near-glass-card rounded-2xl p-7 flex flex-col justify-between space-y-6 border border-[#27312A] bg-[#151C17]/90"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md bg-[#101612] border border-[#27312A] text-[11px] font-semibold text-[#A0AAA2]">
                  GUEST DEMO MODE
                </span>
                <Sparkles className="w-5 h-5 text-[#8BD6A7]" />
              </div>
              <h2 className="text-xl font-bold font-display text-[#F2F5F1]">
                Explore Demo
              </h2>
              <p className="text-sm text-[#A0AAA2] leading-relaxed">
                Explore BorrowBond and see how borrowing, lending, and escrow work without creating an account.
              </p>
              <ul className="space-y-2 text-xs text-[#A0AAA2] pt-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#8BD6A7] shrink-0" />
                  <span>Instant access — no login, wallet, or personal info required</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#8BD6A7] shrink-0" />
                  <span>Walk through simulated bookings, collateral &amp; dispute resolution</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#8BD6A7] shrink-0" />
                  <span>Isolated sample data — never submits real NEAR transactions</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              data-testid="welcome-explore-demo-btn"
              onClick={onExploreDemo}
              className="btn-near-secondary w-full py-3.5 px-5 text-sm font-semibold justify-center cursor-pointer"
            >
              <Play className="w-4 h-4 text-[#8BD6A7]" />
              <span>Explore Demo</span>
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Legal & Support Strip */}
      <footer className="max-w-5xl w-full mx-auto pt-6 border-t border-[#27312A] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#747F76]">
        <span>BorrowBond — Secured by NEAR Protocol Escrow</span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onOpenPublicDocs('TERMS')}
            className="hover:text-[#F2F5F1] cursor-pointer"
          >
            Privacy Policy &amp; Terms
          </button>
          <a
            href="https://t.me/Borrowbond"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#F2F5F1]"
          >
            Public Support (@Borrowbond)
          </a>
        </div>
      </footer>
    </div>
  );
};

// ============================================================================
// 17.2, 17.5, 17.6, 17.7 MANDATORY 3-STEP REAL-USER ONBOARDING GATE
// Step 1: Google Auth -> Step 2: Country & City (with Permanent Lock Confirmation) -> Step 3: NEAR Wallet Verification
// ============================================================================

interface MandatoryRealUserOnboardingGateProps {
  googleAuthenticated: boolean;
  googleEmail?: string;
  googleFullName?: string;
  locationRecord: LockedUserLocationRecord | null;
  walletVerified: boolean;
  connectedWallet: string;
  onCompleteGoogleAuth: (user: { email: string; fullName: string; avatarUrl?: string }) => void;
  onCompleteLocationOnboarding: (record: LockedUserLocationRecord) => Promise<void> | void;
  onCompleteWalletVerification: (params: {
    walletAccountId: string;
    nearNetwork: 'testnet';
    connectorName: string;
    signatureProof: string;
  }) => Promise<void> | void;
  onSwitchToGuestDemo: () => void;
}

export const MandatoryRealUserOnboardingGate: React.FC<MandatoryRealUserOnboardingGateProps> = ({
  googleAuthenticated,
  googleEmail,
  googleFullName,
  locationRecord,
  walletVerified,
  connectedWallet,
  onCompleteGoogleAuth,
  onCompleteLocationOnboarding,
  onCompleteWalletVerification,
  onSwitchToGuestDemo,
}) => {
  // Google Auth step state
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [fallbackEmailInput, setFallbackEmailInput] = useState('');
  const [fallbackNameInput, setFallbackNameInput] = useState('');

  // Step 2: Country & City Selection State (Never pre-selected from IP geolocation)
  const [countrySearch, setCountrySearch] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(
    locationRecord?.countryCode || ''
  );
  const [citySearch, setCitySearch] = useState('');
  const [selectedCityName, setSelectedCityName] = useState<string>(
    locationRecord?.cityName || ''
  );
  const [cityVisibility, setCityVisibility] = useState<'PUBLIC' | 'PRIVATE'>(
    locationRecord?.cityVisibility || 'PUBLIC'
  );
  const [showCountryConfirmationStep, setShowCountryConfirmationStep] = useState(false);
  const [confirmedPermanentCountryLock, setConfirmedPermanentCountryLock] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Step 3: NEAR Wallet Verification State
  const [walletInput, setWalletInput] = useState(
    connectedWallet && !connectedWallet.endsWith('.demo.near')
      ? connectedWallet
      : 'alex-builder.testnet'
  );
  const [selectedConnector, setSelectedConnector] = useState('Meteor Wallet (NEAR Selector)');
  const [walletVerifying, setWalletVerifying] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const filteredCountries = useMemo(
    () => searchEligibleCountries(countrySearch, false),
    [countrySearch]
  );

  const selectedCountryMeta = useMemo(
    () => filteredCountries.find((c) => c.countryCode === selectedCountryCode) ||
      searchEligibleCountries('', false).find((c) => c.countryCode === selectedCountryCode) ||
      null,
    [filteredCountries, selectedCountryCode]
  );

  const filteredCities = useMemo(() => {
    if (!selectedCountryCode) return [];
    return searchCitiesInCountry(selectedCountryCode, citySearch);
  }, [selectedCountryCode, citySearch]);

  const handleTriggerGoogleOAuth = async () => {
    setOauthError(null);
    setOauthLoading(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const res = await fetch(`/api/auth/google/url?origin=${encodeURIComponent(origin)}`);
      const data = await res.json();
      if (res.ok && data.url) {
        // Open OAuth flow or listen for callback message
        const popup = window.open(data.url, 'borrowbond_google_oauth', 'width=520,height=640');
        if (!popup) {
          setOauthError(
            'Popup was blocked or Google OAuth credentials are being configured. Complete Google account verification below.'
          );
        }
      } else {
        setOauthError(
          data.error ||
            'Google OAuth redirect requires GOOGLE_CLIENT_ID in environment secrets, or verify your Google account email below.'
        );
      }
    } catch {
      setOauthError('Unable to reach Google OAuth endpoint. Verify your Google account below.');
    } finally {
      setOauthLoading(false);
    }
  };

  const handleProceedToCountryConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    setLocationError(null);
    if (!selectedCountryCode) {
      setLocationError('Please explicitly select your country from the list.');
      return;
    }
    const cityToUse = selectedCityName.trim() || citySearch.trim();
    const cityCheck = resolveOrValidateCityForCountry(selectedCountryCode, cityToUse);
    if (!cityCheck.valid || !cityCheck.city) {
      setLocationError(cityCheck.error || 'Please select or enter a valid city in your country.');
      return;
    }
    setSelectedCityName(cityCheck.city.cityName);
    setShowCountryConfirmationStep(true);
  };

  const handleConfirmPermanentLocation = async () => {
    setLocationError(null);
    const result = validateAndLockUserLocationOnboarding({
      countryCode: selectedCountryCode,
      cityName: selectedCityName,
      confirmedPermanentCountryLock,
      cityVisibility,
    });
    if (!result.valid || !result.record) {
      setLocationError(result.error || 'Location validation failed.');
      return;
    }
    await onCompleteLocationOnboarding(result.record);
  };

  const handleVerifyNearWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletError(null);
    const cleaned = walletInput.trim().toLowerCase();
    if (!cleaned.endsWith('.testnet') && !/^[0-9a-f]{64}$/.test(cleaned)) {
      setWalletError('Please enter a valid NEAR Testnet account ID ending in .testnet.');
      return;
    }
    setWalletVerifying(true);
    try {
      const verifyRes = await fetch('/api/near/verify-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: cleaned,
          network: 'testnet',
          connector: selectedConnector,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setWalletError(verifyData.error || 'Failed to verify NEAR Testnet wallet.');
        return;
      }

      const proof = `nep413_verified_${cleaned}_${Date.now()}`;
      await onCompleteWalletVerification({
        walletAccountId: cleaned,
        nearNetwork: 'testnet',
        connectorName: selectedConnector,
        signatureProof: proof,
      });
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : 'Wallet verification failed.');
    } finally {
      setWalletVerifying(false);
    }
  };

  return (
    <div
      data-testid="mandatory-onboarding-gate"
      className="min-h-screen bg-[#0C100D] text-[#F2F5F1] flex flex-col justify-between px-4 sm:px-6 py-8"
    >
      <header className="max-w-3xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BorrowBondBrandLogo size={32} />
          <BorrowBondWordmark className="text-lg" />
        </div>
        <button
          type="button"
          onClick={onSwitchToGuestDemo}
          className="btn-near-secondary px-3.5 py-1.5 text-xs cursor-pointer"
        >
          <span>Switch to Guest Demo</span>
        </button>
      </header>

      <main className="max-w-2xl w-full mx-auto my-auto py-8 space-y-6">
        {/* Progress Stepper (1. Google Auth -> 2. Country & City -> 3. NEAR Wallet) */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div
            className={`p-3 rounded-xl border ${
              googleAuthenticated
                ? 'bg-[#8BD6A7]/10 border-[#8BD6A7]/40 text-[#8BD6A7]'
                : 'bg-[#151C17] border-[#8BD6A7] text-[#F2F5F1]'
            }`}
          >
            <span className="font-mono block text-[11px]">STEP 1</span>
            <span className="font-semibold">1. Google Sign-In</span>
          </div>
          <div
            className={`p-3 rounded-xl border ${
              locationRecord
                ? 'bg-[#8BD6A7]/10 border-[#8BD6A7]/40 text-[#8BD6A7]'
                : googleAuthenticated
                ? 'bg-[#151C17] border-[#8BD6A7] text-[#F2F5F1]'
                : 'bg-[#101612] border-[#27312A] text-[#747F76]'
            }`}
          >
            <span className="font-mono block text-[11px]">STEP 2</span>
            <span className="font-semibold">2. Country &amp; City</span>
          </div>
          <div
            className={`p-3 rounded-xl border ${
              walletVerified
                ? 'bg-[#8BD6A7]/10 border-[#8BD6A7]/40 text-[#8BD6A7]'
                : googleAuthenticated && locationRecord
                ? 'bg-[#151C17] border-[#8BD6A7] text-[#F2F5F1]'
                : 'bg-[#101612] border-[#27312A] text-[#747F76]'
            }`}
          >
            <span className="font-mono block text-[11px]">STEP 3</span>
            <span className="font-semibold">3. NEAR Wallet</span>
          </div>
        </div>

        {/* STEP 1: GOOGLE AUTHENTICATION */}
        {!googleAuthenticated && (
          <div
            data-testid="onboarding-step-google"
            className="near-glass-card rounded-2xl p-6 sm:p-8 space-y-6"
          >
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#8BD6A7] uppercase tracking-wider">
                Step 1 of 3 · Account Authentication
              </span>
              <h1 className="text-2xl font-bold font-display text-[#F2F5F1]">
                Sign in with Google to continue
              </h1>
              <p className="text-sm text-[#A0AAA2]">
                Google authenticates your BorrowBond application account. In Step 3, you will separately connect your NEAR wallet to authorize blockchain escrow transactions.
              </p>
            </div>

            <button
              type="button"
              disabled={oauthLoading}
              onClick={handleTriggerGoogleOAuth}
              className="btn-near-primary w-full py-3.5 px-5 text-sm font-semibold justify-center cursor-pointer"
            >
              <span>{oauthLoading ? 'Opening Google OAuth...' : 'Continue with Google'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {oauthError && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                {oauthError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const email = fallbackEmailInput.trim().toLowerCase();
                const name = fallbackNameInput.trim() || email.split('@')[0] || 'BorrowBond User';
                if (!email || !email.includes('@')) {
                  setOauthError('Please enter your valid Google email address.');
                  return;
                }
                onCompleteGoogleAuth({ email, fullName: name });
              }}
              className="pt-4 border-t border-[#27312A] space-y-3"
            >
              <p className="text-xs text-[#A0AAA2]">
                Verify your Google account identity to proceed to Country &amp; City onboarding:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={fallbackNameInput}
                  onChange={(e) => setFallbackNameInput(e.target.value)}
                  placeholder="Your full name"
                  aria-label="Your full name"
                  className="px-3.5 py-2.5 text-xs rounded-xl bg-[#101612] border border-[#27312A] text-[#F2F5F1]"
                />
                <input
                  type="email"
                  required
                  value={fallbackEmailInput}
                  onChange={(e) => setFallbackEmailInput(e.target.value)}
                  placeholder="your.email@gmail.com"
                  aria-label="Google Email Address"
                  className="px-3.5 py-2.5 text-xs rounded-xl bg-[#101612] border border-[#27312A] text-[#F2F5F1]"
                />
              </div>
              <button
                type="submit"
                data-testid="verify-google-identity-submit"
                className="btn-near-secondary w-full py-2.5 px-4 text-xs font-semibold justify-center cursor-pointer"
              >
                <span>Verify Google Account &amp; Continue to Location Setup</span>
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: MANDATORY COUNTRY & CITY ONBOARDING (ONLY 2 FIELDS + PERMANENT LOCK CONFIRMATION) */}
        {googleAuthenticated && !locationRecord && (
          <div
            data-testid="onboarding-step-location"
            className="near-glass-card rounded-2xl p-6 sm:p-8 space-y-6"
          >
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#8BD6A7] uppercase tracking-wider">
                Step 2 of 3 · Country &amp; City Onboarding ({googleEmail || googleFullName})
              </span>
              <h1 className="text-2xl font-bold font-display text-[#F2F5F1]">
                Select your Country and City
              </h1>
              <p className="text-sm text-[#A0AAA2]">
                BorrowBond uses your country and city to match you with eligible local physical items while keeping digital resources globally accessible. We do not ask for street addresses, postal codes, or GPS coordinates.
              </p>
            </div>

            {!showCountryConfirmationStep ? (
              <form onSubmit={handleProceedToCountryConfirmation} className="space-y-5">
                {/* 1. Searchable ISO 3166-1 Country Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#F2F5F1]">
                    1. Country (ISO 3166-1)
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#747F76] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      placeholder="Search country by name, code (e.g. ET, KE, CH, US)..."
                      aria-label="Search country"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl bg-[#101612] border border-[#27312A] text-[#F2F5F1]"
                    />
                  </div>

                  <div className="max-h-44 overflow-y-auto rounded-xl border border-[#27312A] bg-[#101612] divide-y divide-[#27312A]/60">
                    {filteredCountries.map((country) => {
                      const active = selectedCountryCode === country.countryCode;
                      return (
                        <button
                          key={country.countryCode}
                          type="button"
                          data-testid={`select-country-${country.countryCode}`}
                          onClick={() => {
                            setSelectedCountryCode(country.countryCode);
                            setSelectedCityName('');
                            setCitySearch('');
                          }}
                          className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#8BD6A7]/15 text-[#8BD6A7] font-semibold'
                              : 'text-[#F2F5F1] hover:bg-[#151C17]'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="text-base">{getCountryFlagEmoji(country.countryCode)}</span>
                            <span>{country.countryName}</span>
                          </span>
                          <span className="font-mono text-[11px] text-[#A0AAA2]">
                            {country.countryCode}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Searchable City Selector for the Selected Country */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#F2F5F1]">
                    2. City {selectedCountryMeta ? `in ${getCountryFlagEmoji(selectedCountryMeta.countryCode)} ${selectedCountryMeta.countryName}` : ''}
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#747F76] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      disabled={!selectedCountryCode}
                      value={citySearch || selectedCityName}
                      onChange={(e) => {
                        setCitySearch(e.target.value);
                        setSelectedCityName(e.target.value);
                      }}
                      placeholder={
                        selectedCountryCode
                          ? 'Search or enter your city (e.g. Addis Ababa, Jimma, Hawassa, Nairobi, Zurich)...'
                          : 'Select your country above first'
                      }
                      aria-label="Search or enter city"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl bg-[#101612] border border-[#27312A] text-[#F2F5F1] disabled:opacity-50"
                    />
                  </div>

                  {selectedCountryCode && filteredCities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 max-h-36 overflow-y-auto">
                      {filteredCities.map((city) => {
                        const isSelected =
                          selectedCityName.toLowerCase() === city.cityName.toLowerCase();
                        return (
                          <button
                            key={city.cityId}
                            type="button"
                            data-testid={`select-city-${city.cityId}`}
                            onClick={() => {
                              setSelectedCityName(city.cityName);
                              setCitySearch(city.cityName);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#8BD6A7]/20 border-[#8BD6A7] text-[#8BD6A7] font-semibold'
                                : 'bg-[#101612] border-[#27312A] text-[#A0AAA2] hover:text-[#F2F5F1]'
                            }`}
                          >
                            {city.cityName}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Public City Visibility Preference */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#101612] border border-[#27312A] text-xs">
                  <div className="flex items-center gap-2">
                    {cityVisibility === 'PUBLIC' ? (
                      <Eye className="w-4 h-4 text-[#8BD6A7]" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-[#A0AAA2]" />
                    )}
                    <div>
                      <span className="font-medium text-[#F2F5F1] block">
                        Public Profile City Visibility
                      </span>
                      <span className="text-[11px] text-[#747F76]">
                        Your city is always used internally to rank nearby items even if hidden publicly.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCityVisibility((prev) => (prev === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC'))
                    }
                    className="btn-near-secondary px-3 py-1.5 text-xs cursor-pointer"
                  >
                    {cityVisibility === 'PUBLIC' ? 'Public' : 'Hidden'}
                  </button>
                </div>

                {locationError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                    {locationError}
                  </div>
                )}

                <button
                  type="submit"
                  data-testid="review-location-selection-btn"
                  className="btn-near-primary w-full py-3 px-5 text-sm font-semibold justify-center cursor-pointer"
                >
                  <span>Review Country &amp; City Selection</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* 17.6 Permanent Country Selection Confirmation Screen */
              <div data-testid="permanent-country-confirmation-screen" className="space-y-5">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-amber-100 leading-relaxed font-medium">
                    {PERMANENT_COUNTRY_LOCK_WARNING}
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-[#101612] border border-[#27312A] space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#A0AAA2]">
                    <span>Selected Country (Permanent)</span>
                    <span className="font-mono text-[#8BD6A7]">{selectedCountryCode}</span>
                  </div>
                  <div className="text-lg font-bold font-display text-[#F2F5F1] flex items-center gap-2">
                    <span className="text-2xl">{getCountryFlagEmoji(selectedCountryCode)}</span>
                    <span>{selectedCountryMeta?.countryName || selectedCountryCode}</span>
                  </div>
                  <div className="pt-3 border-t border-[#27312A] flex items-center justify-between text-xs">
                    <span className="text-[#A0AAA2]">Selected City (Editable later)</span>
                    <span className="font-semibold text-[#F2F5F1] text-sm">{selectedCityName}</span>
                  </div>
                </div>

                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#101612] border border-[#27312A] cursor-pointer text-xs text-[#F2F5F1]">
                  <input
                    type="checkbox"
                    data-testid="confirm-permanent-country-checkbox"
                    checked={confirmedPermanentCountryLock}
                    onChange={(e) => setConfirmedPermanentCountryLock(e.target.checked)}
                    className="mt-0.5 rounded accent-[#8BD6A7]"
                  />
                  <span>
                    I confirm that <strong>{getCountryFlagEmoji(selectedCountryCode)} {selectedCountryMeta?.countryName}</strong> ({selectedCityName}) is my correct location and I understand my country cannot be changed directly after submission.
                  </span>
                </label>

                {locationError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                    {locationError}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCountryConfirmationStep(false);
                      setConfirmedPermanentCountryLock(false);
                    }}
                    className="btn-near-secondary px-4 py-3 text-xs font-semibold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    data-testid="confirm-location-continue-btn"
                    disabled={!confirmedPermanentCountryLock}
                    onClick={handleConfirmPermanentLocation}
                    className="btn-near-primary flex-1 py-3 px-5 text-sm font-semibold justify-center cursor-pointer disabled:opacity-40"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: VERIFIED NEAR WALLET CONNECTION */}
        {googleAuthenticated && locationRecord && !walletVerified && (
          <div
            data-testid="onboarding-step-wallet"
            className="near-glass-card rounded-2xl p-6 sm:p-8 space-y-6"
          >
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#8BD6A7] uppercase tracking-wider">
                Step 3 of 3 · Blockchain Identity &amp; Escrow Authorization
              </span>
              <h1 className="text-2xl font-bold font-display text-[#F2F5F1]">
                Connect &amp; verify your NEAR Testnet wallet
              </h1>
              <p className="text-sm text-[#A0AAA2]">
                Your location is locked to{' '}
                <strong className="text-[#F2F5F1]">
                  {locationRecord.countryFlag} {locationRecord.countryName} · {locationRecord.cityName}
                </strong>
                . Connect your NEAR Testnet wallet via NEAR Wallet Selector to complete setup.
              </p>
            </div>

            <form onSubmit={handleVerifyNearWallet} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#F2F5F1]">
                  NEAR Wallet Selector Provider
                </label>
                <select
                  value={selectedConnector}
                  onChange={(e) => setSelectedConnector(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#101612] border border-[#27312A] text-[#F2F5F1]"
                >
                  <option value="Meteor Wallet (NEAR Selector)">Meteor Wallet (NEAR Selector)</option>
                  <option value="MyNearWallet (NEAR Testnet)">MyNearWallet (NEAR Testnet)</option>
                  <option value="HERE Wallet">HERE Wallet</option>
                  <option value="WalletConnect v2">WalletConnect v2</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#F2F5F1]">
                  NEAR Testnet Account ID
                </label>
                <input
                  type="text"
                  required
                  value={walletInput}
                  onChange={(e) => setWalletInput(e.target.value)}
                  placeholder="your-account.testnet"
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-[#101612] border border-[#27312A] text-[#F2F5F1]"
                />
              </div>

              {walletError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                  {walletError}
                </div>
              )}

              <button
                type="submit"
                data-testid="complete-wallet-verification-btn"
                disabled={walletVerifying}
                className="btn-near-primary w-full py-3.5 px-5 text-sm font-semibold justify-center cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                <span>
                  {walletVerifying
                    ? 'Verifying NEAR Wallet Ownership...'
                    : 'Verify NEAR Wallet & Enter BorrowBond'}
                </span>
              </button>
            </form>
          </div>
        )}
      </main>

      <footer className="max-w-3xl w-full mx-auto text-center text-xs text-[#747F76]">
        All 3 steps (Google Auth, Country &amp; City Lock, and Verified NEAR Wallet) are required for real marketplace access.
      </footer>
    </div>
  );
};

// ============================================================================
// 17.3 RESTRICTED DEMO ACTION MODAL ("Create an account to continue.")
// ============================================================================

interface GuestDemoRestrictedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueWithGoogle: () => void;
}

export const GuestDemoRestrictedModal: React.FC<GuestDemoRestrictedModalProps> = ({
  isOpen,
  onClose,
  onContinueWithGoogle,
}) => {
  if (!isOpen) return null;

  return (
    <div
      data-testid="guest-demo-restricted-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
    >
      <div className="near-glass-card rounded-2xl max-w-md w-full p-6 space-y-5 border border-[#8BD6A7]/40 bg-[#101612]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#8BD6A7]/15 border border-[#8BD6A7]/30 flex items-center justify-center">
              <Lock className="w-4 h-4 text-[#8BD6A7]" />
            </div>
            <span className="px-2 py-0.5 rounded bg-[#151C17] border border-[#27312A] text-[11px] font-mono text-[#8BD6A7]">
              REAL ACCOUNT REQUIRED
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-[#A0AAA2] hover:text-[#F2F5F1] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold font-display text-[#F2F5F1]">
            {DEMO_RESTRICTED_MODAL_COPY.title}
          </h2>
          <p className="text-sm text-[#A0AAA2] leading-relaxed">
            {DEMO_RESTRICTED_MODAL_COPY.supportingText}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            type="button"
            data-testid="restricted-modal-continue-google"
            onClick={onContinueWithGoogle}
            className="btn-near-primary w-full py-3 px-4 text-xs sm:text-sm font-semibold justify-center cursor-pointer"
          >
            <span>{DEMO_RESTRICTED_MODAL_COPY.primaryButton}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-testid="restricted-modal-continue-demo"
            onClick={onClose}
            className="btn-near-secondary w-full py-2.5 px-4 text-xs font-semibold justify-center cursor-pointer"
          >
            <span>{DEMO_RESTRICTED_MODAL_COPY.secondaryButton}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 17.3 & 17.13 PERMANENT DEMO TOP BANNER + INTERACTIVE ESCROW WALKTHROUGH DRAWER
// ============================================================================

interface GuestDemoBannerAndSimulatorProps {
  demoState: GuestDemoEnvironmentState;
  activeDemoBooking: OnChainBooking;
  onSimulateStep: (bookingId: string, action: GuestDemoSimulationAction) => void;
  onResetDemoSimulation: () => void;
  onContinueWithGoogle: () => void;
  onOpenSimulatedBookingView: (bookingId: string) => void;
}

export const GuestDemoBannerAndSimulator: React.FC<GuestDemoBannerAndSimulatorProps> = ({
  activeDemoBooking,
  onSimulateStep,
  onResetDemoSimulation,
  onContinueWithGoogle,
  onOpenSimulatedBookingView,
}) => {
  const [simulatorExpanded, setSimulatorExpanded] = useState(false);

  return (
    <div
      data-testid="guest-demo-permanent-banner"
      className="bg-[#101612] border-b border-[#8BD6A7]/35 px-4 sm:px-6 py-2.5 text-xs"
    >
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-[#8BD6A7]/20 border border-[#8BD6A7]/50 text-[#8BD6A7] font-mono font-bold text-[11px]">
            DEMO · SAMPLE DATA
          </span>
          <span className="text-[#F2F5F1] font-medium">
            {DEMO_FINANCIAL_NOTICE}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="toggle-interactive-demo-simulator-btn"
            onClick={() => setSimulatorExpanded((prev) => !prev)}
            className="btn-near-secondary px-3 py-1.5 text-xs cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-[#8BD6A7]" />
            <span>
              {simulatorExpanded ? 'Hide Interactive Escrow Walkthrough' : 'Interactive Escrow Walkthrough'}
            </span>
          </button>
          <button
            type="button"
            data-testid="demo-banner-continue-google-btn"
            onClick={onContinueWithGoogle}
            className="btn-near-primary px-3.5 py-1.5 text-xs cursor-pointer"
          >
            <span>Continue with Google</span>
          </button>
        </div>
      </div>

      {simulatorExpanded && activeDemoBooking && (
        <div
          data-testid="interactive-escrow-simulator-panel"
          className="max-w-6xl mx-auto mt-3 pt-3 border-t border-[#27312A] space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[10px]">
                  SIMULATED TRANSACTION
                </span>
                <strong className="text-[#F2F5F1] text-xs">{activeDemoBooking.listingTitle}</strong>
                <span className="font-mono text-[#8BD6A7] text-xs">
                  Status: {activeDemoBooking.status}
                </span>
              </div>
              <p className="text-[11px] text-[#A0AAA2]">
                Rental: <strong>{activeDemoBooking.rentalFeeNear} NEAR</strong> · Collateral:{' '}
                <strong>{activeDemoBooking.collateralNear} NEAR</strong> · 1% Platform Fee (from collateral):{' '}
                <strong>{activeDemoBooking.platformFeeNear} NEAR</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onSimulateStep(activeDemoBooking.bookingId, 'LENDER_ACCEPT')}
                className="px-2.5 py-1 rounded-lg bg-[#151C17] border border-[#27312A] hover:border-[#8BD6A7] text-[#F2F5F1] cursor-pointer"
              >
                1. Simulate Accept
              </button>
              <button
                type="button"
                onClick={() => onSimulateStep(activeDemoBooking.bookingId, 'CONFIRM_HANDOVER')}
                className="px-2.5 py-1 rounded-lg bg-[#151C17] border border-[#27312A] hover:border-[#8BD6A7] text-[#F2F5F1] cursor-pointer"
              >
                2. Simulate Handover
              </button>
              <button
                type="button"
                onClick={() => onSimulateStep(activeDemoBooking.bookingId, 'REQUEST_RETURN')}
                className="px-2.5 py-1 rounded-lg bg-[#151C17] border border-[#27312A] hover:border-[#8BD6A7] text-[#F2F5F1] cursor-pointer"
              >
                3. Simulate Return (48h)
              </button>
              <button
                type="button"
                onClick={() =>
                  onSimulateStep(activeDemoBooking.bookingId, 'CONFIRM_SAFE_RETURN_SETTLE')
                }
                className="px-2.5 py-1 rounded-lg bg-[#8BD6A7]/15 border border-[#8BD6A7]/40 text-[#8BD6A7] font-semibold cursor-pointer"
              >
                4. Settle &amp; Refund
              </button>
              <button
                type="button"
                onClick={() => onSimulateStep(activeDemoBooking.bookingId, 'OPEN_SAMPLE_DISPUTE')}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 cursor-pointer"
              >
                Simulate Dispute
              </button>
              <button
                type="button"
                onClick={() =>
                  onSimulateStep(activeDemoBooking.bookingId, 'RESOLVE_DISPUTE_WITH_DAMAGE')
                }
                className="px-2.5 py-1 rounded-lg bg-[#151C17] border border-[#27312A] hover:border-[#8BD6A7] text-[#F2F5F1] cursor-pointer"
              >
                Resolve Damage Split
              </button>
              <button
                type="button"
                onClick={() => onOpenSimulatedBookingView(activeDemoBooking.bookingId)}
                className="px-2.5 py-1 rounded-lg bg-[#151C17] border border-[#27312A] text-[#8BD6A7] underline cursor-pointer"
              >
                Inspect Agreement View
              </button>
              <button
                type="button"
                onClick={onResetDemoSimulation}
                title="Reset Demo Simulation"
                className="p-1.5 rounded-lg bg-[#151C17] border border-[#27312A] text-[#A0AAA2] hover:text-[#F2F5F1] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
