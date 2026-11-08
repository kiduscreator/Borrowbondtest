import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, type AppView } from './components/Navbar';
import { LandingPage } from './views/LandingPage';
import { MarketplaceView } from './views/MarketplaceView';
import { ListingDetailsView } from './views/ListingDetailsView';
import { CreateListingWizard } from './views/CreateListingWizard';
import { AiAgentView } from './views/AiAgentView';
import { CheckoutView } from './views/CheckoutView';
import { DashboardView, type EnrichedCredential } from './views/DashboardView';
import { TransactionDetailsView } from './views/TransactionDetailsView';
import { X, Wallet, ExternalLink } from 'lucide-react';

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

const TESTNET_ACCOUNTS = [
  {
    id: 'borrowbondtest.testnet',
    role: 'Your NEAR Testnet Account (Primary)',
    desc: 'Your connected NEAR Testnet account for borrowing, lending, and escrow contracts.',
  },
  {
    id: 'alex-builder.testnet',
    role: 'Borrower & Builder (Demo Seeded)',
    desc: 'Active borrower with seeded camera & weather API bookings.',
  },
  {
    id: 'optics-lab.testnet',
    role: 'Physical Lender (Zurich Optics)',
    desc: 'Provider of Demo Mirrorless Camera & 4K Laser Projector.',
  },
  {
    id: 'atmo-telemetry.testnet',
    role: 'Digital Provider (AtmoNode API)',
    desc: 'Provider of Demo Weather API gateway.',
  },
  {
    id: 'resolver.borrowbond.testnet',
    role: 'Designated Human Dispute Resolver',
    desc: 'Authorized account for resolving disputed escrow funds.',
  },
];

export function App() {
  const [currentView, setCurrentView] = useState<AppView>('LANDING');
  const [connectedWallet, setConnectedWallet] = useState<string>('alex-builder.testnet');
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [customWalletInput, setCustomWalletInput] = useState('');

  // Server state pre-seeded for zero-latency first paint and synchronized with backend /api/state
  const [nearBlockHeight, setNearBlockHeight] = useState<number | null>(184920415);
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

  // Navigation context state
  const [marketplaceCategory, setMarketplaceCategory] = useState<'ALL' | 'PHYSICAL' | 'DIGITAL'>('ALL');
  const [selectedListingId, setSelectedListingId] = useState<string>('lst-phys-camera-01');
  const [checkoutDurationCount, setCheckoutDurationCount] = useState<number>(3);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('bk-demo-camera-102');
  const [agentPromptSeed, setAgentPromptSeed] = useState<string>('');
  const [lastAgentResult, setLastAgentResult] = useState<AgentOrchestrationResponse | null>(null);

  const fetchState = useCallback(async (wallet = connectedWallet) => {
    try {
      const res = await fetch(`/api/state?wallet=${encodeURIComponent(wallet)}`);
      if (!res.ok) return;
      const data = await res.json();
      setNearBlockHeight(data.nearStatus?.latestBlockHeight ?? null);
      setContractAddress(data.contractAddress || 'borrowbond-escrow.testnet');
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
  }, [connectedWallet]);

  useEffect(() => {
    fetchState(connectedWallet);
  }, [connectedWallet, fetchState]);

  const handleOpenListing = (listingId: string) => {
    setSelectedListingId(listingId);
    setCurrentView('LISTING_DETAILS');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRunAgentPrompt = async (prompt: string) => {
    // Immediate deterministic tool execution on current inventory & policy
    const immediateResult = runDeterministicBorrowingAgent(
      {
        callerWallet: connectedWallet,
        listings,
        profiles,
        policy,
        escrowLedger: INITIAL_DEMO_ENV.escrowLedger,
        digitalGateway: INITIAL_DEMO_ENV.digitalGateway,
        actionLogs: [],
        activeDrafts: {},
      },
      prompt
    );
    setLastAgentResult(immediateResult);

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
    setSelectedListingId(draft.listingId);
    setCheckoutDurationCount(draft.durationCount);
    setCurrentView('CHECKOUT');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToCheckout = (listingId: string, durationCount: number) => {
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
    await fetch('/api/escrow/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callerWallet: connectedWallet }),
    });
    await fetchState(connectedWallet);
  };

  const selectedListing =
    listings.find((l) => l.id === selectedListingId) || listings[0];
  const selectedBooking =
    bookings.find((b) => b.bookingId === selectedBookingId) || bookings[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1020] text-[#F3F6FC]">
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        connectedWallet={connectedWallet}
        onOpenWalletModal={() => setWalletModalOpen(true)}
      />

      {/* Mobile Navigation Strip */}
      <div className="md:hidden flex items-center justify-around border-b border-slate-800 bg-[#121B2C] px-2 py-2 text-xs">
        {(['MARKETPLACE', 'AI_AGENT', 'CREATE_LISTING', 'DASHBOARD'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setCurrentView(v)}
            className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
              currentView === v ? 'bg-[#5EEAD4] text-[#0B1020]' : 'text-[#A4B0C4]'
            }`}
          >
            {v === 'MARKETPLACE'
              ? 'Market'
              : v === 'AI_AGENT'
              ? 'AI Agent'
              : v === 'CREATE_LISTING'
              ? 'List'
              : 'Dashboard'}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {currentView === 'LANDING' && (
          <LandingPage
            listings={listings}
            nearBlockHeight={nearBlockHeight}
            contractAddress={contractAddress}
            onNavigate={(view) => {
              setCurrentView(view);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectCategory={(cat) => setMarketplaceCategory(cat)}
            onOpenListing={handleOpenListing}
            onAskAgent={handleAskAgentFromHero}
          />
        )}

        {currentView === 'MARKETPLACE' && (
          <MarketplaceView
            listings={listings}
            profiles={profiles}
            initialCategory={marketplaceCategory}
            onOpenListing={handleOpenListing}
            onNavigateCreate={() => setCurrentView('CREATE_LISTING')}
            onOpenAiAgent={() => setCurrentView('AI_AGENT')}
          />
        )}

        {currentView === 'LISTING_DETAILS' && selectedListing && (
          <ListingDetailsView
            listing={selectedListing}
            provider={profiles[selectedListing.ownerWallet]}
            borrowerProfile={profiles[connectedWallet]}
            policy={policy}
            onBack={() => setCurrentView('MARKETPLACE')}
            onProceedToCheckout={handleProceedToCheckout}
          />
        )}

        {currentView === 'CREATE_LISTING' && (
          <CreateListingWizard
            connectedWallet={connectedWallet}
            onCreated={async (newListing) => {
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
            onBack={() => setCurrentView('LISTING_DETAILS')}
            onConfirmAndSignEscrow={handleConfirmAndSignEscrow}
          />
        )}

        {currentView === 'DASHBOARD' && (
          <DashboardView
            connectedWallet={connectedWallet}
            profile={profiles[connectedWallet]}
            bookings={bookings}
            listings={listings}
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
          />
        )}

        {currentView === 'TRANSACTION_DETAILS' && selectedBooking && (
          <TransactionDetailsView
            booking={selectedBooking}
            connectedWallet={connectedWallet}
            designatedResolver={designatedResolver}
            onBack={() => setCurrentView('DASHBOARD')}
            onRefreshState={() => fetchState(connectedWallet)}
          />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0B1020] px-6 py-10 text-xs text-[#A4B0C4]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="font-bold font-display text-[#F3F6FC] text-sm">
              BorrowBond — Borrow anything. Secure every agreement.
            </div>
            <p>
              Built for NEAR Hackathon 2026 (Agent Economy & AI Security Tracks) · Testnet Prototype Only
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => setCurrentView('MARKETPLACE')}
              className="hover:text-[#F3F6FC] cursor-pointer"
            >
              Marketplace
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('AI_AGENT')}
              className="hover:text-[#F3F6FC] cursor-pointer"
            >
              AI Borrowing Agent
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('DASHBOARD')}
              className="hover:text-[#F3F6FC] cursor-pointer"
            >
              Digital API Gateway
            </button>
            <a
              href="https://testnet.nearblocks.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#5EEAD4] inline-flex items-center gap-1"
            >
              <span>NEAR Testnet Explorer</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>

      {/* NEAR Testnet Wallet Connection & Role Switcher Modal */}
      {walletModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wallet-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="bg-[#121B2C] border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#5EEAD4]" />
                <h2 id="wallet-modal-title" className="text-base font-bold font-display text-[#F3F6FC]">
                  NEAR Testnet Wallet Authentication
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close Wallet Modal"
                onClick={() => setWalletModalOpen(false)}
                className="text-[#A4B0C4] hover:text-[#F3F6FC] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#A4B0C4] leading-relaxed">
              Select a NEAR testnet account below to test Borrower, Lender, or Designated Dispute Resolver capabilities, or connect a custom <code className="font-mono text-[#F3F6FC]">.testnet</code> account ID. Note: Wallet authentication verifies account control and is not KYC identity verification.
            </p>

            <div className="space-y-2">
              {TESTNET_ACCOUNTS.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    setConnectedWallet(acc.id);
                    setWalletModalOpen(false);
                  }}
                  className={`w-full p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    connectedWallet === acc.id
                      ? 'bg-[#172338] border-[#5EEAD4]'
                      : 'bg-[#0B1020] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <code className="font-mono font-bold text-[#F3F6FC]">{acc.id}</code>
                    <span className="text-[#5EEAD4] font-medium">{acc.role}</span>
                  </div>
                  <p className="text-[11px] text-[#A4B0C4] mt-1">{acc.desc}</p>
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const cleaned = customWalletInput.trim().toLowerCase();
                if (!cleaned) return;
                const formatted = cleaned.endsWith('.testnet') ? cleaned : `${cleaned}.testnet`;
                setConnectedWallet(formatted);
                setCustomWalletInput('');
                setWalletModalOpen(false);
              }}
              className="pt-3 border-t border-slate-800 flex gap-2"
            >
              <input
                type="text"
                value={customWalletInput}
                onChange={(e) => setCustomWalletInput(e.target.value)}
                placeholder="Or enter custom account (e.g. alice.testnet)"
                className="flex-1 px-3 py-2 text-xs font-mono bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90 cursor-pointer"
              >
                Connect
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
