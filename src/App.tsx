import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { Navbar, type AppView, type ThemeMode } from './components/Navbar';
import { LandingPage } from './views/LandingPage';
import { MarketplaceView } from './views/MarketplaceView';
import { ListingDetailsView } from './views/ListingDetailsView';
import { CreateListingWizard } from './views/CreateListingWizard';
import { AiAgentView } from './views/AiAgentView';
import { CheckoutView } from './views/CheckoutView';
import { DashboardView, type EnrichedCredential } from './views/DashboardView';
import { TransactionDetailsView } from './views/TransactionDetailsView';
import { WhitepaperDocsView, type DocsSectionTab } from './views/WhitepaperDocsView';
import {
  AuthAndOnboardingModal,
  ConnectNearWalletModal,
  ThreeLineSideDrawer,
  type UnifiedUserSession,
} from './components/UnifiedAccountModals';
import {
  OfflineIndicator,
  WalletBeginnerGuideModal,
} from './components/PwaAndOnboardingControls';
import {
  WelcomeAccessScreen,
  MandatoryRealUserOnboardingGate,
  GuestDemoBannerAndSimulator,
  GuestDemoRestrictedModal,
  type RealUserOnboardingStatus,
} from './components/WelcomeAndOnboardingGate';
import {
  createIsolatedGuestDemoState,
  simulateGuestDemoBooking,
  advanceGuestDemoBookingSimulation,
  type GuestDemoBookingSimulation,
} from './lib/demo/guestDemoEngine';
import { BorrowBondBrandLogo, BorrowBondWordmark, SocialBrandIcon } from './components/TokenIcons';
import { ExternalLink, ShieldCheck, PlayCircle, Sparkles } from 'lucide-react';

import type {
  MarketplaceListing,
  ProviderProfile,
  SpendingPolicy,
} from './lib/security/policyEngine';
import type { OnChainBooking } from './lib/near/escrowStateMachine';
import type { DigitalUsageEvent } from './lib/digital/accessGateway';
import type { AgentOrchestrationResponse, BookingDraft } from './lib/ai/agentTools';
import { runDeterministicBorrowingAgent } from './lib/ai/agentTools';
import { bootstrapDemoEnvironment } from './lib/database/seedData';

const INITIAL_DEMO_ENV = bootstrapDemoEnvironment();
const INITIAL_ISOLATED_GUEST_DEMO = createIsolatedGuestDemoState();

const SESSION_STORAGE_KEY = 'borrowbond_unified_session_v1';
const THEME_STORAGE_KEY = 'borrowbond_theme_mode_v1';
const ACCESS_MODE_STORAGE_KEY = 'borrowbond_access_mode_v1';
const ONBOARDING_STORAGE_KEY = 'borrowbond_real_onboarding_v1';

const PRESET_NEAR_ACCOUNTS = [
  {
    id: 'borrowbondtest.testnet',
    role: 'Primary NEAR Account & Escrow Resolver (🇪🇹 ET)',
    desc: 'Connected NEAR account for borrowing, lending, and escrow arbitration.',
  },
  {
    id: 'alex-builder.testnet',
    role: 'Verified Borrower (🇪🇹 Ethiopia · Adama)',
    desc: 'Active borrower in Ethiopia (Oromia · Adama) with camera and weather API agreements.',
  },
  {
    id: 'optics-lab.testnet',
    role: 'Hardware Lender (🇪🇹 Ethiopia · Adama & Jimma)',
    desc: 'Provider of Sony Alpha 7 IV Camera, 4K Laser Projector & MacBook Pro M3 Max in Ethiopia.',
  },
  {
    id: 'aero-survey.testnet',
    role: 'Hardware Lender (🇰🇪 Kenya · Nairobi)',
    desc: 'Provider of Surveying LiDAR Drone in Nairobi, Kenya (for cross-country testing).',
  },
  {
    id: 'kenya-borrower.testnet',
    role: 'Verified Borrower (🇰🇪 Kenya · Nairobi)',
    desc: 'Verified borrower in Nairobi, Kenya eligible for Kenyan physical listings.',
  },
  {
    id: 'atmo-telemetry.testnet',
    role: 'Digital Provider (🌐 Global)',
    desc: 'Provider of globally available NFT Pass & Weather Telemetry API.',
  },
  {
    id: 'resolver.borrowbond.testnet',
    role: 'BorrowBond Team Arbitrator',
    desc: 'Authorized BorrowBond Team account for damage-deduction dispute resolution.',
  },
];

const DEFAULT_USER_SESSION: UnifiedUserSession = {
  authenticated: true,
  onboardingCompleted: true,
  fullName: 'Alex Builder',
  age: 26,
  bio: 'NEAR Protocol builder & verified hardware/API borrower on BorrowBond.',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
  email: 'alex@borrowbond.io',
  authMethod: 'WALLET',
  walletAccountId: 'alex-builder.testnet',
  nearNetwork: 'testnet',
  connectorName: 'Meteor Wallet',
};

const DEFAULT_ONBOARDING_STATUS: RealUserOnboardingStatus = {
  googleAuthenticated: true,
  email: 'alex@borrowbond.io',
  displayName: 'Alex Builder',
  countryCode: 'ET',
  countryName: 'Ethiopia',
  cityName: 'Jimma',
  cityId: 'et-jimma',
  countryLockedAt: '2026-11-01T10:00:00.000Z',
  locationCompletedAt: '2026-11-01T10:00:00.000Z',
  cityVisibility: 'PUBLIC',
  walletVerified: true,
  walletAccountId: 'alex-builder.testnet',
  nearNetwork: 'testnet',
};

export type AppAccessMode = 'welcome' | 'authenticated' | 'guest_demo' | 'onboarding_gate';

export function App() {
  const [currentView, setCurrentView] = useState<AppView>('LANDING');
  const [docsSection, setDocsSection] = useState<DocsSectionTab>('WHITEPAPER');

  // Application Access Mode ('authenticated' | 'guest_demo' | 'welcome' | 'onboarding_gate')
  const [accessMode, setAccessMode] = useState<AppAccessMode>(() => {
    try {
      const saved = localStorage.getItem(ACCESS_MODE_STORAGE_KEY) as AppAccessMode | null;
      if (
        saved === 'welcome' ||
        saved === 'authenticated' ||
        saved === 'guest_demo' ||
        saved === 'onboarding_gate'
      ) {
        return saved;
      }
    } catch {
      // Ignore storage error
    }
    return 'authenticated';
  });

  const handleSetAccessMode = useCallback((nextMode: AppAccessMode) => {
    setAccessMode(nextMode);
    try {
      localStorage.setItem(ACCESS_MODE_STORAGE_KEY, nextMode);
    } catch {
      // Ignore
    }
  }, []);

  // Mandatory 3-Step Real-User Onboarding Status
  const [onboardingStatus, setOnboardingStatus] = useState<RealUserOnboardingStatus>(() => {
    try {
      const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // Ignore
    }
    return DEFAULT_ONBOARDING_STATUS;
  });

  const updateOnboardingStatus = useCallback((next: RealUserOnboardingStatus) => {
    setOnboardingStatus(next);
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
  }, []);

  // Isolated Guest Demo Mode state & interactive simulation
  const [guestDemoState] = useState(() => INITIAL_ISOLATED_GUEST_DEMO);
  const [activeDemoSimulation, setActiveDemoSimulation] =
    useState<GuestDemoBookingSimulation | null>(() => INITIAL_ISOLATED_GUEST_DEMO.sampleSimulations[0] || null);
  const [restrictedModalOpen, setRestrictedModalOpen] = useState(false);
  const [restrictedActionLabel, setRestrictedActionLabel] = useState<string | undefined>(undefined);

  // Unified User Account & NEAR Wallet Session State (persisted to localStorage + synced to /api/user/profile)
  const [userSession, setUserSession] = useState<UnifiedUserSession>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.walletAccountId) return parsed;
      }
    } catch {
      // Ignore storage error
    }
    return DEFAULT_USER_SESSION;
  });

  const connectedWallet =
    accessMode === 'guest_demo' ? guestDemoState.demoViewerWallet : userSession.walletAccountId;

  // Modals & Drawers
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [sideDrawerOpen, setSideDrawerOpen] = useState(false);
  const [beginnerGuideOpen, setBeginnerGuideOpen] = useState(false);

  // Night / Day / System Theme State
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (saved === 'night' || saved === 'day' || saved === 'system') return saved;
    } catch {
      // Ignore
    }
    return 'night';
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // Ignore
    }

    const applyResolvedTheme = () => {
      let resolved: 'night' | 'day' = 'night';
      if (themeMode === 'day') {
        resolved = 'day';
      } else if (themeMode === 'system') {
        const prefersLight =
          typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: light)').matches;
        resolved = prefersLight ? 'day' : 'night';
      }
      document.documentElement.setAttribute('data-theme', resolved);
    };

    applyResolvedTheme();

    if (themeMode === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mql = window.matchMedia('(prefers-color-scheme: light)');
      const listener = () => applyResolvedTheme();
      mql.addEventListener('change', listener);
      return () => mql.removeEventListener('change', listener);
    }
  }, [themeMode]);

  // Server state pre-seeded for zero-latency first paint and synchronized with backend /api/state
  const [nearBlockHeight, setNearBlockHeight] = useState<number | null>(null);
  const [nearUsdRate, setNearUsdRate] = useState<number>(3.7);
  const [displayCurrency, setDisplayCurrency] = useState<'NEAR' | 'USDT'>('USDT');
  const [contractAddress, setContractAddress] = useState('borrowbondtest.testnet');
  const [designatedResolver, setDesignatedResolver] = useState('borrowbondtest.testnet');
  const [profiles, setProfiles] = useState<Record<string, ProviderProfile>>(INITIAL_DEMO_ENV.profiles);
  const [listings, setListings] = useState<MarketplaceListing[]>(INITIAL_DEMO_ENV.listings);
  const [policy, setPolicy] = useState<SpendingPolicy>(INITIAL_DEMO_ENV.policy);
  const [bookings, setBookings] = useState<OnChainBooking[]>(
    Object.values(INITIAL_DEMO_ENV.escrowLedger.bookings)
  );
  const [claimableBalancesNear, setClaimableBalancesNear] = useState<Record<string, number>>(
    INITIAL_DEMO_ENV.escrowLedger.claimableBalancesNear
  );
  const [myCredentials, setMyCredentials] = useState<EnrichedCredential[]>(
    Object.values(INITIAL_DEMO_ENV.digitalGateway.credentialsById).map((c) => ({
      ...c,
      authorizedRawToken: INITIAL_DEMO_ENV.demoRawTokenForWeatherBooking,
    }))
  );
  const [myUsageEvents, setMyUsageEvents] = useState<DigitalUsageEvent[]>([]);
  const [notifications, setNotifications] = useState<
    { id: string; title: string; message: string; timestampIso: string; bookingId?: string }[]
  >([]);

  // Effective listings and profiles based on mode (Guest Demo uses isolated demo dataset)
  const activeListings = accessMode === 'guest_demo' ? guestDemoState.listings : listings;
  const activeProfiles = accessMode === 'guest_demo' ? guestDemoState.profiles : profiles;

  // Navigation context state
  const [marketplaceCategory, setMarketplaceCategory] = useState<'ALL' | 'PHYSICAL' | 'DIGITAL'>('ALL');
  const [selectedListingId, setSelectedListingId] = useState<string>('lst-phys-camera-01');
  const [checkoutDurationCount, setCheckoutDurationCount] = useState<number>(3);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('bk-demo-camera-102');
  const [agentPromptSeed, setAgentPromptSeed] = useState<string>('');
  const [lastAgentResult, setLastAgentResult] = useState<AgentOrchestrationResponse | null>(null);

  const fetchState = useCallback(async (wallet = userSession.walletAccountId) => {
    try {
      const res = await fetch(`/api/state?wallet=${encodeURIComponent(wallet)}`);
      if (!res.ok) return;
      const data = await res.json();
      setNearBlockHeight(data.nearStatus?.latestBlockHeight ?? null);
      if (data.nearMarketPrice?.nearUsd) {
        setNearUsdRate(Number(data.nearMarketPrice.nearUsd));
      }
      setContractAddress(data.contractAddress || 'borrowbondtest.testnet');
      setDesignatedResolver(data.designatedResolver || 'resolver.borrowbond.testnet');
      setProfiles(data.profiles || {});
      setListings(data.listings || []);
      if (data.policy) setPolicy(data.policy);
      setBookings(data.bookings || []);
      setClaimableBalancesNear(data.claimableBalancesNear || {});
      setMyCredentials(data.myDigitalCredentials || []);
      setMyUsageEvents(data.myDigitalUsageEvents || []);
      setNotifications(data.notifications || []);
    } catch {
      // Keep existing state on transient offline
    }
  }, [userSession.walletAccountId]);

  useEffect(() => {
    fetchState(userSession.walletAccountId);
  }, [userSession.walletAccountId, fetchState]);

  const triggerGuestRestriction = (actionName: string) => {
    setRestrictedActionLabel(actionName);
    setRestrictedModalOpen(true);
  };

  const handleStartRealOnboardingGate = (startFresh = false) => {
    if (startFresh) {
      updateOnboardingStatus({
        googleAuthenticated: false,
        email: '',
        displayName: '',
        countryCode: '',
        countryName: '',
        cityName: '',
        cityId: '',
        countryLockedAt: null,
        locationCompletedAt: null,
        cityVisibility: 'PUBLIC',
        walletVerified: false,
        walletAccountId: '',
        nearNetwork: 'testnet',
      });
    }
    handleSetAccessMode('onboarding_gate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEnterGuestDemoMode = () => {
    handleSetAccessMode('guest_demo');
    setSelectedListingId(guestDemoState.listings[0]?.id || 'demo-lst-laptop-jimma-01');
    setCurrentView('MARKETPLACE');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveUnifiedSession = useCallback(
    async (updatedSession: UnifiedUserSession) => {
      setUserSession(updatedSession);
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
      } catch {
        // Ignore storage error
      }

      // Sync with unified backend system (/api/user/profile)
      try {
        const res = await fetch('/api/user/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAccountId: updatedSession.walletAccountId,
            displayName: updatedSession.fullName,
            age: updatedSession.age,
            bio: updatedSession.bio,
            avatarUrl: updatedSession.avatarUrl,
            email: updatedSession.email,
            authMethod: updatedSession.authMethod,
            nearNetwork: updatedSession.nearNetwork,
          }),
        });
        if (res.ok) {
          await fetchState(updatedSession.walletAccountId);
        }
      } catch {
        // Keep local unified session on transient offline
      }
    },
    [fetchState]
  );

  const handleOpenDocsSection = (section: DocsSectionTab) => {
    setDocsSection(section);
    setCurrentView('WHITEPAPER');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenListing = (listingId: string) => {
    setSelectedListingId(listingId);
    setCurrentView('LISTING_DETAILS');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRunAgentPrompt = async (prompt: string) => {
    const immediateResult = runDeterministicBorrowingAgent(
      {
        callerWallet: connectedWallet,
        listings: activeListings,
        profiles: activeProfiles,
        policy,
        escrowLedger: INITIAL_DEMO_ENV.escrowLedger,
        digitalGateway: INITIAL_DEMO_ENV.digitalGateway,
        actionLogs: [],
        activeDrafts: {},
      },
      prompt
    );
    setLastAgentResult(immediateResult);

    if (accessMode === 'guest_demo') {
      return;
    }

    try {
      const res = await fetch('/api/agent/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerWallet: connectedWallet,
          prompt,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as AgentOrchestrationResponse;
        setLastAgentResult(data);
        await fetchState(connectedWallet);
      }
    } catch {
      // Keep immediate deterministic tool result if backend is still warming up
    }
  };

  const handleAskAgentFromHero = async (prompt: string) => {
    setAgentPromptSeed(prompt);
    setCurrentView('AI_AGENT');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await handleRunAgentPrompt(prompt);
  };

  const handleUpdatePolicy = async (updated: Partial<SpendingPolicy>) => {
    if (accessMode === 'guest_demo') {
      setPolicy((prev) => ({ ...prev, ...updated }));
      return;
    }
    const res = await fetch('/api/security/policy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (res.ok) {
      const data = await res.json();
      setPolicy(data.policy);
    }
  };

  const handleApproveDraftToCheckout = (draft: BookingDraft) => {
    if (accessMode === 'guest_demo') {
      const sim = simulateGuestDemoBooking({
        listingId: draft.listingId,
        durationCount: draft.durationCount,
      });
      setActiveDemoSimulation(sim);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSelectedListingId(draft.listingId);
    setCheckoutDurationCount(draft.durationCount);
    setCurrentView('CHECKOUT');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToCheckout = (listingId: string, durationCount: number) => {
    if (accessMode === 'guest_demo') {
      const sim = simulateGuestDemoBooking({
        listingId,
        durationCount,
      });
      setActiveDemoSimulation(sim);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSelectedListingId(listingId);
    setCheckoutDurationCount(durationCount);
    setCurrentView('CHECKOUT');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmAndSignEscrow = async (params: {
    listingId: string;
    durationCount: number;
    explicitUserApproval: boolean;
  }) => {
    if (accessMode === 'guest_demo') {
      triggerGuestRestriction('Sign Real NEAR Escrow Transaction');
      return;
    }
    const res = await fetch('/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: params.listingId,
        borrowerWallet: connectedWallet,
        durationCount: params.durationCount,
        explicitUserApproval: params.explicitUserApproval,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create on-chain booking');
    }
    await fetchState(connectedWallet);
    setSelectedBookingId(data.booking.bookingId);
    setCurrentView('TRANSACTION_DETAILS');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWithdrawClaimable = async () => {
    if (accessMode === 'guest_demo') {
      triggerGuestRestriction('Withdraw Real Claimable NEAR Balance');
      return;
    }
    await fetch('/api/escrow/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callerWallet: connectedWallet }),
    });
    await fetchState(connectedWallet);
  };

  const handleResetDemoState = async () => {
    await fetch('/api/demo/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    setLastAgentResult(null);
    await fetchState(connectedWallet);
  };

  const selectedListing =
    activeListings.find((l) => l.id === selectedListingId) || activeListings[0];
  const selectedBooking =
    bookings.find((b) => b.bookingId === selectedBookingId) || bookings[0];

  // If user is on the Two-Mode Welcome Screen
  if (accessMode === 'welcome') {
    return (
      <WelcomeAccessScreen
        onSelectGoogleAuth={() => handleStartRealOnboardingGate(true)}
        onSelectExploreDemo={handleEnterGuestDemoMode}
      />
    );
  }

  // If user is inside the Mandatory 3-Step Real-User Onboarding Gate
  if (accessMode === 'onboarding_gate') {
    return (
      <MandatoryRealUserOnboardingGate
        status={onboardingStatus}
        onCompleteGoogleAuth={({ email, displayName }) => {
          updateOnboardingStatus({
            ...onboardingStatus,
            googleAuthenticated: true,
            email,
            displayName,
          });
        }}
        onCompleteLocationLock={async ({ countryCode, cityName, confirmedPermanentLock }) => {
          try {
            const walletId = onboardingStatus.walletAccountId || userSession.walletAccountId || 'alex-builder.testnet';
            const res = await fetch('/api/user/onboarding/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                walletAccountId: walletId,
                displayName: onboardingStatus.displayName || userSession.fullName,
                countryCode,
                cityName,
                confirmedPermanentLock,
              }),
            });
            const data = await res.json();
            if (!res.ok) {
              return { ok: false, error: data.error || 'Failed to lock country and city.' };
            }
            const prof = data.profile as ProviderProfile;
            updateOnboardingStatus({
              ...onboardingStatus,
              countryCode: prof.countryCode || countryCode,
              countryName: prof.countryName || countryCode,
              cityName: prof.cityName || cityName,
              cityId: prof.cityId || `custom-${countryCode.toLowerCase()}`,
              countryLockedAt: prof.countryLockedAt || new Date().toISOString(),
              locationCompletedAt: prof.locationCompletedAt || new Date().toISOString(),
              cityVisibility: prof.cityVisibility || 'PUBLIC',
            });
            await fetchState(walletId);
            return { ok: true };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : 'Failed to lock location',
            };
          }
        }}
        onCompleteWalletVerify={async (walletAccountId) => {
          const updatedSess: UnifiedUserSession = {
            ...userSession,
            authenticated: true,
            onboardingCompleted: true,
            fullName: onboardingStatus.displayName || userSession.fullName,
            email: onboardingStatus.email || userSession.email,
            authMethod: 'GOOGLE',
            walletAccountId,
            nearNetwork: 'testnet',
            connectorName: 'NEAR Wallet Selector (Testnet)',
          };
          await handleSaveUnifiedSession(updatedSess);
          updateOnboardingStatus({
            ...onboardingStatus,
            walletVerified: true,
            walletAccountId,
            nearNetwork: 'testnet',
          });
        }}
        onEnterAuthenticatedWorkspace={() => {
          handleSetAccessMode('authenticated');
          setCurrentView('MARKETPLACE');
        }}
        onSwitchToGuestDemo={handleEnterGuestDemoMode}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0C100D] text-[#F2F5F1] pb-16 md:pb-0">
      <OfflineIndicator />

      {/* Access Mode Switcher Bar (Authenticated vs Guest Demo vs Onboarding Gate) */}
      <div className="bg-[#101612] border-b border-[#27312A] px-4 sm:px-6 py-1.5 text-[11px]">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {accessMode === 'guest_demo' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#E6B85C]/15 border border-[#E6B85C]/40 text-[#E6B85C] font-semibold">
                <PlayCircle className="w-3.5 h-3.5" />
                <span>MODE: GUEST DEMO (SAMPLE DATA · NO REAL FUNDS)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#8BD6A7]/15 border border-[#8BD6A7]/40 text-[#8BD6A7] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  AUTHENTICATED · {onboardingStatus.countryName || 'Ethiopia'} ({onboardingStatus.cityName || 'Adama'}) · Country Locked
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSetAccessMode('welcome')}
              className="px-2.5 py-1 rounded-md bg-[#151C17] border border-[#27312A] hover:border-[#8BD6A7]/50 text-[#A0AAA2] hover:text-[#F2F5F1] transition-colors cursor-pointer"
            >
              Welcome Screen
            </button>
            <button
              type="button"
              onClick={handleEnterGuestDemoMode}
              className={`px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                accessMode === 'guest_demo'
                  ? 'bg-[#E6B85C]/15 border-[#E6B85C]/50 text-[#E6B85C] font-semibold'
                  : 'bg-[#151C17] border-[#27312A] text-[#A0AAA2] hover:text-[#F2F5F1]'
              }`}
            >
              Explore Demo Mode
            </button>
            <button
              type="button"
              onClick={() => handleStartRealOnboardingGate(false)}
              className="px-2.5 py-1 rounded-md bg-[#151C17] border border-[#27312A] hover:border-[#8BD6A7]/50 text-[#8BD6A7] inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>3-Step Onboarding Gate</span>
            </button>
          </div>
        </div>
      </div>

      {/* Permanent Guest Demo Mode Banner & Interactive Escrow Simulator */}
      {accessMode === 'guest_demo' && (
        <GuestDemoBannerAndSimulator
          activeSimulation={activeDemoSimulation}
          onStartSampleSimulation={(listingId) => {
            const sim = simulateGuestDemoBooking({ listingId, durationCount: 3 });
            setActiveDemoSimulation(sim);
          }}
          onAdvanceSimulation={(targetState) => {
            if (!activeDemoSimulation) return;
            setActiveDemoSimulation(
              advanceGuestDemoBookingSimulation(activeDemoSimulation, targetState)
            );
          }}
          onCreateRealAccount={() => handleStartRealOnboardingGate(true)}
        />
      )}

      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          if (accessMode === 'guest_demo' && view === 'CREATE_LISTING') {
            triggerGuestRestriction('Create Real Marketplace Listing');
            return;
          }
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        connectedWallet={connectedWallet}
        nearNetwork={userSession.nearNetwork}
        userDisplayName={
          accessMode === 'guest_demo' ? 'Guest Demo Visitor (Ethiopia · Jimma)' : userSession.fullName
        }
        userAvatarUrl={userSession.avatarUrl}
        onOpenWalletModal={() => {
          if (accessMode === 'guest_demo') {
            triggerGuestRestriction('Connect Real NEAR Wallet');
            return;
          }
          setWalletModalOpen(true);
        }}
        onOpenSideMenu={() => setSideDrawerOpen(true)}
        onOpenBeginnerGuide={() => setBeginnerGuideOpen(true)}
        nearUsdRate={nearUsdRate}
        displayCurrency={displayCurrency}
        onToggleCurrency={setDisplayCurrency}
        themeMode={themeMode}
        onChangeThemeMode={setThemeMode}
      />

      {/* Main Content with Subtle Professional Transitions */}
      <main className="flex-1 overflow-x-hidden">
        <LayoutGroup id="borrowbond-main-views">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentView === 'WHITEPAPER' ? `${currentView}-${docsSection}` : currentView}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-full"
            >
              {currentView === 'LANDING' && (
                <LandingPage
                  listings={activeListings}
                  nearBlockHeight={nearBlockHeight}
                  nearUsdRate={nearUsdRate}
                  contractAddress={contractAddress}
                  onNavigate={(view) => {
                    if (accessMode === 'guest_demo' && view === 'CREATE_LISTING') {
                      triggerGuestRestriction('Create Real Marketplace Listing');
                      return;
                    }
                    setCurrentView(view);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onSelectCategory={(cat) => setMarketplaceCategory(cat)}
                  onOpenListing={handleOpenListing}
                  onAskAgent={handleAskAgentFromHero}
                  onOpenAuthModal={() => handleStartRealOnboardingGate(false)}
                  onOpenWalletModal={() => {
                    if (accessMode === 'guest_demo') {
                      triggerGuestRestriction('Connect Real NEAR Wallet');
                      return;
                    }
                    setWalletModalOpen(true);
                  }}
                  onOpenDocsSection={handleOpenDocsSection}
                  onExploreDemoMode={handleEnterGuestDemoMode}
                />
              )}

              {currentView === 'WHITEPAPER' && (
                <WhitepaperDocsView
                  key={docsSection}
                  initialSection={docsSection}
                  nearUsdRate={nearUsdRate}
                  contractAddress={contractAddress}
                  connectedWallet={connectedWallet}
                  onNavigate={(view) => {
                    setCurrentView(view);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}

              {currentView === 'MARKETPLACE' && (
                <MarketplaceView
                  listings={activeListings}
                  profiles={activeProfiles}
                  connectedWallet={connectedWallet}
                  initialCategory={marketplaceCategory}
                  nearUsdRate={nearUsdRate}
                  displayCurrency={displayCurrency}
                  onToggleCurrency={setDisplayCurrency}
                  onOpenListing={handleOpenListing}
                  onNavigateCreate={() => {
                    if (accessMode === 'guest_demo') {
                      triggerGuestRestriction('Publish Real Marketplace Listing');
                      return;
                    }
                    setCurrentView('CREATE_LISTING');
                  }}
                  onOpenAiAgent={() => setCurrentView('AI_AGENT')}
                  isGuestDemoMode={accessMode === 'guest_demo'}
                />
              )}

              {currentView === 'LISTING_DETAILS' && selectedListing && (
                <ListingDetailsView
                  listing={selectedListing}
                  provider={activeProfiles[selectedListing.ownerWallet]}
                  borrowerProfile={activeProfiles[connectedWallet]}
                  policy={policy}
                  nearUsdRate={nearUsdRate}
                  displayCurrency={displayCurrency}
                  onToggleCurrency={setDisplayCurrency}
                  onUpdatePolicy={handleUpdatePolicy}
                  onBack={() => setCurrentView('MARKETPLACE')}
                  onProceedToCheckout={handleProceedToCheckout}
                  onNavigateProfileLocation={() => setCurrentView('DASHBOARD')}
                />
              )}

              {currentView === 'CREATE_LISTING' && (
                <CreateListingWizard
                  connectedWallet={connectedWallet}
                  lenderProfile={activeProfiles[connectedWallet]}
                  nearUsdRate={nearUsdRate}
                  onChangeNearUsdRate={setNearUsdRate}
                  displayCurrency={displayCurrency}
                  onCreated={async (newListing) => {
                    if (accessMode === 'guest_demo') {
                      triggerGuestRestriction('Publish Real Marketplace Listing');
                      return;
                    }
                    setListings((prev) => [newListing, ...prev.filter((l) => l.id !== newListing.id)]);
                    await fetchState(connectedWallet);
                    setSelectedListingId(newListing.id);
                    setCurrentView('LISTING_DETAILS');
                  }}
                  onCancel={() => setCurrentView('MARKETPLACE')}
                />
              )}

              {currentView === 'AI_AGENT' && (
                <AiAgentView
                  connectedWallet={connectedWallet}
                  policy={policy}
                  listings={activeListings}
                  initialPrompt={agentPromptSeed}
                  lastAgentResult={lastAgentResult}
                  onRunAgentPrompt={handleRunAgentPrompt}
                  onUpdatePolicy={handleUpdatePolicy}
                  onApproveDraftToCheckout={handleApproveDraftToCheckout}
                />
              )}

              {currentView === 'CHECKOUT' && selectedListing && (
                <CheckoutView
                  listing={selectedListing}
                  durationCount={checkoutDurationCount}
                  connectedWallet={connectedWallet}
                  contractAddress={contractAddress}
                  nearUsdRate={nearUsdRate}
                  onBack={() => setCurrentView('LISTING_DETAILS')}
                  onConfirmAndSignEscrow={handleConfirmAndSignEscrow}
                />
              )}

              {currentView === 'DASHBOARD' && (
                <DashboardView
                  connectedWallet={connectedWallet}
                  profile={activeProfiles[connectedWallet]}
                  bookings={bookings}
                  listings={activeListings}
                  claimableBalancesNear={claimableBalancesNear}
                  myCredentials={myCredentials}
                  myUsageEvents={myUsageEvents}
                  notifications={notifications}
                  onOpenBookingDetails={(bookingId) => {
                    setSelectedBookingId(bookingId);
                    setCurrentView('TRANSACTION_DETAILS');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onOpenListing={handleOpenListing}
                  onWithdrawClaimable={handleWithdrawClaimable}
                  onRefreshState={() => fetchState(connectedWallet)}
                  onResetDemoState={handleResetDemoState}
                />
              )}

              {currentView === 'TRANSACTION_DETAILS' && selectedBooking && (
                <TransactionDetailsView
                  booking={selectedBooking}
                  connectedWallet={connectedWallet}
                  designatedResolver={designatedResolver}
                  nearUsdRate={nearUsdRate}
                  onBack={() => setCurrentView('DASHBOARD')}
                  onRefreshState={() => fetchState(connectedWallet)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </LayoutGroup>
      </main>

      {/* Clean Fintech Footer */}
      <footer className="border-t border-[#27312A] bg-[#101612] px-4 sm:px-6 pt-10 pb-28 text-xs text-[#A0AAA2]">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <button
            type="button"
            aria-label="BorrowBond Home"
            onClick={() => {
              setCurrentView('LANDING');
              if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-3 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[#8BD6A7] rounded-lg"
          >
            <BorrowBondBrandLogo size={32} />
            <div className="space-y-0.5">
              <div className="text-sm">
                <BorrowBondWordmark />
              </div>
              <p className="text-[#747F76]">
                Borrow what you need. Lend what you own. Secured by NEAR escrow.
              </p>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenDocsSection('WHITEPAPER')}
              className="px-3 py-1.5 glass-nav-pill text-[#A0AAA2] hover:text-[#F2F5F1] font-medium cursor-pointer"
            >
              Whitepaper
            </button>
            <button
              type="button"
              onClick={() => handleOpenDocsSection('ROADMAP')}
              className="px-3 py-1.5 glass-nav-pill text-[#A0AAA2] hover:text-[#F2F5F1] font-medium cursor-pointer"
            >
              Roadmap
            </button>
            <button
              type="button"
              onClick={() => handleOpenDocsSection('TERMS')}
              className="px-3 py-1.5 glass-nav-pill text-[#A0AAA2] hover:text-[#F2F5F1] font-medium cursor-pointer"
            >
              Terms &amp; Privacy
            </button>
            <button
              type="button"
              onClick={() => handleOpenDocsSection('DEPLOYMENT')}
              className="px-3 py-1.5 glass-nav-pill text-[#A0AAA2] hover:text-[#F2F5F1] font-medium cursor-pointer"
            >
              Deployment Guide
            </button>
            <button
              type="button"
              onClick={() => setBeginnerGuideOpen(true)}
              className="px-3 py-1.5 glass-nav-pill text-[#A0AAA2] hover:text-[#F2F5F1] font-medium cursor-pointer"
            >
              How Escrow Works
            </button>

            <div className="flex items-center gap-2 pl-3 border-l border-[#27312A]">
              <a
                href="https://x.com/Borrowbond"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="BorrowBond on X (Twitter)"
                className="p-2 rounded-lg bg-[#151C17] border border-[#27312A] hover:border-[#8BD6A7] text-[#F2F5F1] transition-colors"
                title="https://x.com/Borrowbond"
              >
                <SocialBrandIcon network="x" size={14} />
              </a>
              <a
                href="https://t.me/Borrowbond"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="BorrowBond on Telegram"
                className="p-2 rounded-lg bg-[#151C17] border border-[#27312A] hover:border-[#8BD6A7] text-[#8BD6A7] transition-colors"
                title="https://t.me/Borrowbond"
              >
                <SocialBrandIcon network="telegram" size={14} />
              </a>
              <a
                href="https://linkedin.com/company/Borrowbond"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="BorrowBond on LinkedIn"
                className="p-2 rounded-lg bg-[#151C17] border border-[#27312A] hover:border-[#8BD6A7] text-[#8BD6A7] transition-colors"
                title="https://linkedin.com/company/Borrowbond"
              >
                <SocialBrandIcon network="linkedin" size={14} />
              </a>
              <a
                href={
                  userSession.nearNetwork === 'mainnet'
                    ? 'https://nearblocks.io'
                    : 'https://testnet.nearblocks.io'
                }
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#F2F5F1] inline-flex items-center gap-1 ml-1 transition-colors"
              >
                <span>NEAR Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Guest Demo Restricted Action Modal */}
      <GuestDemoRestrictedModal
        isOpen={restrictedModalOpen}
        actionAttempted={restrictedActionLabel}
        onContinueWithGoogle={() => {
          setRestrictedModalOpen(false);
          handleStartRealOnboardingGate(true);
        }}
        onContinueExploringDemo={() => setRestrictedModalOpen(false)}
      />

      {/* 1. Sign Up / Sign In + Full Name, Profile, Age, Biography Onboarding Modal */}
      <AuthAndOnboardingModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        session={userSession}
        onSaveSession={async (updated: UnifiedUserSession) => {
          await handleSaveUnifiedSession(updated);
          setAuthModalOpen(false);
        }}
        onOpenTerms={() => handleOpenDocsSection('TERMS')}
      />

      {/* 2. Connect Wallet System (NEAR Chain Only — Mainnet & Testnet with WalletConnect, Meteor, HERE, MyNearWallet, Nightly) */}
      <ConnectNearWalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        connectedWallet={connectedWallet}
        nearNetwork={userSession.nearNetwork}
        presetAccounts={PRESET_NEAR_ACCOUNTS}
        onConnectWallet={(walletId: string, network: 'mainnet' | 'testnet', connectorName: string) => {
          void handleSaveUnifiedSession({
            ...userSession,
            walletAccountId: walletId,
            nearNetwork: network,
            connectorName,
          });
          setWalletModalOpen(false);
        }}
        onOpenTerms={() => handleOpenDocsSection('TERMS')}
      />

      {/* 3. Compact Floating Three-Line (☰) Dropdown Menu:
          Platform, Resources/Whitepaper, Legal, Socials (/Borrowbond), Editable Profile & Wallet Info */}
      <ThreeLineSideDrawer
        isOpen={sideDrawerOpen}
        onClose={() => setSideDrawerOpen(false)}
        session={userSession}
        profile={activeProfiles[connectedWallet]}
        contractAddress={contractAddress}
        designatedResolver={designatedResolver}
        nearUsdRate={nearUsdRate}
        themeMode={themeMode}
        onChangeThemeMode={setThemeMode}
        onSaveSession={handleSaveUnifiedSession}
        onOpenConnectWallet={() => {
          setSideDrawerOpen(false);
          if (accessMode === 'guest_demo') {
            triggerGuestRestriction('Connect Real NEAR Wallet');
            return;
          }
          setWalletModalOpen(true);
        }}
        onOpenAuthModal={() => {
          setSideDrawerOpen(false);
          setAuthModalOpen(true);
        }}
        onNavigateView={(view) => {
          if (accessMode === 'guest_demo' && view === 'CREATE_LISTING') {
            setSideDrawerOpen(false);
            triggerGuestRestriction('Publish Real Marketplace Listing');
            return;
          }
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenDocsSection={handleOpenDocsSection}
      />

      {/* 4. Beginner Wallet & Escrow Explainer Modal + 1-Click Demo Reset */}
      <WalletBeginnerGuideModal
        isOpen={beginnerGuideOpen}
        onClose={() => setBeginnerGuideOpen(false)}
        onOpenConnectWallet={() => setWalletModalOpen(true)}
        onResetDemo={handleResetDemoState}
      />
    </div>
  );
}

export default App;
