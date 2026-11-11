import React, { useState, useMemo } from 'react';
import {
  KeyRound,
  Play,
  Ban,
  Clock,
  ShieldCheck,
  ArrowUpRight,
  Wallet,
  Award,
  Bell,
  AlertTriangle,
  RotateCcw,
  Search,
  Calendar,
  Filter,
  X,
} from 'lucide-react';
import {
  calculateLateDueDateInterest,
  filterBookingsHistory,
  type OnChainBooking,
} from '../lib/near/escrowStateMachine';
import type { MarketplaceListing, ProviderProfile } from '../lib/security/policyEngine';
import type { DigitalCredentialRecord, DigitalUsageEvent } from '../lib/digital/accessGateway';
import {
  LocationCard,
  CountryBadge,
} from '../components/CountryLocationComponents';

export interface EnrichedCredential extends DigitalCredentialRecord {
  authorizedRawToken?: string;
}

interface DashboardViewProps {
  connectedWallet: string;
  profile?: ProviderProfile;
  bookings: OnChainBooking[];
  listings: MarketplaceListing[];
  claimableBalancesNear: Record<string, number>;
  myCredentials: EnrichedCredential[];
  myUsageEvents: DigitalUsageEvent[];
  notifications: {
    id: string;
    title: string;
    message: string;
    timestampIso: string;
    bookingId?: string;
  }[];
  onOpenBookingDetails: (bookingId: string) => void;
  onOpenListing: (listingId: string) => void;
  onWithdrawClaimable: () => Promise<void>;
  onRefreshState: () => Promise<void>;
  onResetDemoState?: () => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  connectedWallet,
  profile,
  bookings,
  listings,
  claimableBalancesNear,
  myCredentials,
  myUsageEvents,
  notifications,
  onOpenBookingDetails,
  onOpenListing,
  onWithdrawClaimable,
  onRefreshState,
  onResetDemoState,
}) => {
  const [activeTab, setActiveTab] = useState<
    'BORROWINGS' | 'LENDINGS' | 'DIGITAL_ACCESS' | 'LISTINGS' | 'PASSPORT'
  >('BORROWINGS');

  // Booking History Search & Filter state (item name, status, or date)
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');
  const [historyDateFilter, setHistoryDateFilter] = useState('');

  // Interactive Controlled Demo Weather API Tester state
  const [selectedCity, setSelectedCity] = useState('Zurich');
  const [customTokenInput, setCustomTokenInput] = useState(
    myCredentials[0]?.authorizedRawToken || ''
  );
  const [apiResponseJson, setApiResponseJson] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);

  const myBorrowings = useMemo(
    () => bookings.filter((b) => b.borrower === connectedWallet),
    [bookings, connectedWallet]
  );
  const myLendings = useMemo(
    () => bookings.filter((b) => b.lender === connectedWallet),
    [bookings, connectedWallet]
  );
  const myListings = useMemo(
    () => listings.filter((l) => l.ownerWallet === connectedWallet),
    [listings, connectedWallet]
  );

  const activeRoleBookings = activeTab === 'LENDINGS' ? myLendings : myBorrowings;

  const filteredRoleBookings = useMemo(
    () =>
      filterBookingsHistory(activeRoleBookings, {
        searchQuery: historySearchQuery,
        statusFilter: historyStatusFilter,
        dateFilter: historyDateFilter,
      }),
    [activeRoleBookings, historySearchQuery, historyStatusFilter, historyDateFilter]
  );

  const hasActiveHistoryFilters =
    historySearchQuery.trim() !== '' ||
    historyStatusFilter !== 'ALL' ||
    historyDateFilter.trim() !== '';

  const clearHistoryFilters = () => {
    setHistorySearchQuery('');
    setHistoryStatusFilter('ALL');
    setHistoryDateFilter('');
  };

  const lockedCollateralNear = myBorrowings
    .filter((b) => ['REQUESTED', 'ACCEPTED', 'ACTIVE', 'RETURN_REQUESTED', 'DISPUTED'].includes(b.status))
    .reduce((sum, b) => sum + b.collateralNear, 0);

  const myClaimableNear = claimableBalancesNear[connectedWallet] ?? 0;

  const handleCallDemoWeatherApi = async (simulateExpired = false) => {
    const tokenToUse = customTokenInput.trim() || myCredentials[0]?.authorizedRawToken || '';
    setApiLoading(true);
    try {
      const res = await fetch('/api/demo-resource/weather', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenToUse}`,
        },
        body: JSON.stringify({
          city: selectedCity,
          simulateExpired,
        }),
      });
      const data = await res.json();
      setApiResponseJson(JSON.stringify(data, null, 2));
      await onRefreshState();
    } catch {
      setApiResponseJson(JSON.stringify({ error: 'Network error calling Demo API Gateway' }, null, 2));
    } finally {
      setApiLoading(false);
    }
  };

  const handleRevokeCredential = async (credentialId: string) => {
    await fetch('/api/digital/revoke-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credentialId,
        callerWallet: connectedWallet,
        reason: 'Manually revoked by borrower from Digital Access Dashboard',
      }),
    });
    await onRefreshState();
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      await onWithdrawClaimable();
    } finally {
      setWithdrawing(false);
    }
  };

  const handleResetDemoClick = async () => {
    if (!onResetDemoState) return;
    setResettingDemo(true);
    try {
      await onResetDemoState();
    } finally {
      setResettingDemo(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header & KPI Metrics Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#27312A] pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#F2F5F1]">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#A0AAA2]">
            Manage your active borrowings, lending agreements, digital credentials, and location settings for{' '}
            <code className="font-mono text-[#F2F5F1]">{connectedWallet}</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onResetDemoState && (
            <button
              type="button"
              disabled={resettingDemo}
              onClick={handleResetDemoClick}
              className="btn-near-secondary px-3.5 py-2 text-xs"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-[#8BD6A7] ${resettingDemo ? 'animate-spin' : ''}`} />
              <span>{resettingDemo ? 'Resetting...' : 'Reset Demo Data'}</span>
            </button>
          )}

          {myClaimableNear > 0 && (
            <button
              type="button"
              disabled={withdrawing}
              onClick={handleWithdraw}
              className="btn-near-primary px-4 py-2 text-xs"
            >
              <Wallet className="w-4 h-4" />
              <span>
                {withdrawing
                  ? 'Withdrawing...'
                  : `Withdraw Claimable Escrow (${myClaimableNear.toFixed(4)} NEAR)`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 4-Column Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-5 space-y-1">
          <span className="text-xs text-[#A4B0C4]">Active Borrowings</span>
          <div className="text-2xl font-bold font-mono text-[#F3F6FC] tabular-nums">
            {myBorrowings.filter((b) => ['REQUESTED', 'ACCEPTED', 'ACTIVE', 'RETURN_REQUESTED'].includes(b.status)).length}
          </div>
          <span className="text-[11px] text-[#A4B0C4]">Total agreements: {myBorrowings.length}</span>
        </div>

        <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-5 space-y-1">
          <span className="text-xs text-[#A4B0C4]">Locked Refundable Collateral</span>
          <div className="text-2xl font-bold font-mono text-[#5EEAD4] tabular-nums">
            {lockedCollateralNear.toFixed(2)} NEAR
          </div>
          <span className="text-[11px] text-[#A4B0C4]">Held in `borrowbondtest.testnet`</span>
        </div>

        <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-5 space-y-1">
          <span className="text-xs text-[#A4B0C4]">Claimable Settlement Balance</span>
          <div className="text-2xl font-bold font-mono text-[#34D399] tabular-nums">
            {myClaimableNear.toFixed(4)} NEAR
          </div>
          <span className="text-[11px] text-[#A4B0C4]">Safe pull-withdrawal pattern</span>
        </div>

        <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-5 space-y-1">
          <span className="text-xs text-[#A4B0C4]">Active Digital Credentials</span>
          <div className="text-2xl font-bold font-mono text-[#8297FF] tabular-nums">
            {myCredentials.filter((c) => !c.revoked).length}
          </div>
          <span className="text-[11px] text-[#A4B0C4]">Quota & expiration enforced on server</span>
        </div>
      </div>

      {/* Screen A & Screen G: User Profile Location, International Phone & Contact Privacy Card */}
      <LocationCard
        profile={profile}
        walletAccountId={connectedWallet}
        isOwnProfile={true}
        onProfileUpdated={() => {
          onRefreshState();
        }}
      />

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'BORROWINGS', label: `My Borrowings (${myBorrowings.length})` },
          { id: 'LENDINGS', label: `Incoming Lending Requests (${myLendings.length})` },
          { id: 'DIGITAL_ACCESS', label: `Digital Access & API Gateway (${myCredentials.length})` },
          { id: 'LISTINGS', label: `My Listed Resources (${myListings.length})` },
          { id: 'PASSPORT', label: 'Borrowing Passport & Notifications' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer glass-nav-pill ${
              activeTab === tab.id
                ? 'glass-nav-pill-active text-[#8BD6A7]'
                : 'text-[#A0AAA2] hover:text-[#F2F5F1]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1 & 2: Borrowings or Lendings Table with Search & Filter Bar */}
      {(activeTab === 'BORROWINGS' || activeTab === 'LENDINGS') && (
        <div className="bg-[#121B2C] border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold font-display text-[#F3F6FC]">
                {activeTab === 'BORROWINGS'
                  ? 'Borrowing Agreements & Escrow Status'
                  : 'Lending Agreements (Provider Queue)'}
              </h2>
              <p className="text-xs text-[#A4B0C4] mt-0.5">
                Click any booking to inspect timeline, upload handover/return evidence, or resolve disputes
              </p>
            </div>
            <span className="text-xs font-mono text-[#5EEAD4]">
              Showing {filteredRoleBookings.length} of {activeRoleBookings.length} agreements
            </span>
          </div>

          {/* Search & Filter Bar by Item Name, Status, or Date */}
          <div className="px-6 py-4 bg-[#0B1020]/70 border-b border-slate-800/80 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search by Item Name, Status, or Date */}
              <div className="md:col-span-6 relative">
                <label htmlFor="dashboard-booking-search" className="sr-only">
                  Search booking history by item name, status, or date
                </label>
                <Search className="w-4 h-4 text-[#5EEAD4] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="dashboard-booking-search"
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Search by item name, status (e.g. ACTIVE, COMPLETED), date, or serial..."
                  className="w-full pl-10 pr-8 py-2 text-xs bg-[#121B2C] border border-slate-700/80 rounded-lg text-[#F3F6FC] placeholder:text-[#A4B0C4]/70 focus:outline-none focus:border-[#00EC97]"
                />
                {historySearchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search query"
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A4B0C4] hover:text-[#F3F6FC] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter by Status Dropdown */}
              <div className="md:col-span-3 relative">
                <label htmlFor="dashboard-status-filter" className="sr-only">
                  Filter by booking status
                </label>
                <Filter className="w-3.5 h-3.5 text-[#A4B0C4] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="dashboard-status-filter"
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-[#121B2C] border border-slate-700/80 rounded-lg text-[#F3F6FC] focus:outline-none focus:border-[#00EC97]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="REQUESTED">REQUESTED</option>
                  <option value="ACCEPTED">ACCEPTED</option>
                  <option value="RETURN_REQUESTED">RETURN_REQUESTED</option>
                  <option value="DISPUTED">DISPUTED</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="OVERDUE">OVERDUE (3% APY)</option>
                </select>
              </div>

              {/* Filter by Date (YYYY-MM-DD or Month/Day) */}
              <div className="md:col-span-3 relative">
                <label htmlFor="dashboard-date-filter" className="sr-only">
                  Filter by booking date
                </label>
                <Calendar className="w-3.5 h-3.5 text-[#A4B0C4] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="dashboard-date-filter"
                  type="text"
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  placeholder="Date (e.g. 2026-11 or Nov)"
                  className="w-full pl-8 pr-3 py-2 text-xs bg-[#121B2C] border border-slate-700/80 rounded-lg text-[#F3F6FC] placeholder:text-[#A4B0C4]/70 focus:outline-none focus:border-[#00EC97]"
                />
              </div>
            </div>

            {/* Quick Status Filter Pills & Clear Action */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['ALL', 'ACTIVE', 'COMPLETED', 'REQUESTED', 'DISPUTED', 'OVERDUE'] as const).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setHistoryStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer border ${
                        historyStatusFilter === st
                          ? 'bg-[#00EC97]/20 border-[#00EC97] text-[#00EC97] font-bold'
                          : 'bg-[#121B2C] border-slate-800 text-[#A4B0C4] hover:text-[#F3F6FC]'
                      }`}
                    >
                      {st === 'ALL' ? 'All' : st}
                    </button>
                  )
                )}
              </div>

              {hasActiveHistoryFilters && (
                <button
                  type="button"
                  onClick={clearHistoryFilters}
                  className="text-xs text-[#00EC97] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear History Filters</span>
                </button>
              )}
            </div>
          </div>

          {activeRoleBookings.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#A4B0C4]">
              No agreements found for <code className="font-mono text-[#F3F6FC]">{connectedWallet}</code> in this role. Tip: Use the top-right wallet switcher to switch between <code className="font-mono">alex-builder.testnet</code> (Borrower) and <code className="font-mono">optics-lab.testnet</code> (Lender).
            </div>
          ) : filteredRoleBookings.length === 0 ? (
            <div className="p-10 text-center space-y-3 text-xs text-[#A4B0C4]">
              <p>
                No bookings matched your filter{' '}
                {historySearchQuery && (
                  <strong className="text-[#F3F6FC]">&ldquo;{historySearchQuery}&rdquo;</strong>
                )}{' '}
                {historyStatusFilter !== 'ALL' && (
                  <span className="font-mono text-[#5EEAD4]">[{historyStatusFilter}]</span>
                )}{' '}
                {historyDateFilter && (
                  <span className="font-mono text-[#00EC97]">({historyDateFilter})</span>
                )}
                .
              </p>
              <button
                type="button"
                onClick={clearHistoryFilters}
                className="px-3.5 py-1.5 rounded-lg bg-[#172338] text-[#00EC97] border border-[#00EC97]/40 hover:bg-[#00EC97]/10 font-semibold cursor-pointer"
              >
                Reset Search &amp; Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[#A4B0C4] bg-[#0B1020]/60">
                    <th className="py-3.5 px-4 font-medium">Booking ID</th>
                    <th className="py-3.5 px-4 font-medium">Resource</th>
                    <th className="py-3.5 px-4 font-medium">Date &amp; Deadline</th>
                    <th className="py-3.5 px-4 font-medium">Counterparty</th>
                    <th className="py-3.5 px-4 font-medium text-right">Rental Fee</th>
                    <th className="py-3.5 px-4 font-medium text-right">Collateral</th>
                    <th className="py-3.5 px-4 font-medium">Contract Status</th>
                    <th className="py-3.5 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredRoleBookings.map((bk) => (
                    <tr key={bk.bookingId} className="hover:bg-[#172338]/60">
                      <td className="py-3.5 px-4 font-mono text-[#F3F6FC]">
                        <div>{bk.bookingId}</div>
                        <span className="text-[10px] text-[#A4B0C4]">
                          {bk.isSimulatedTx === false ? 'Verified Tx' : 'Simulated'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#F3F6FC]">{bk.listingTitle}</div>
                        <div className="text-[11px] text-[#A4B0C4]">
                          {bk.resourceType} · {bk.durationCount} {bk.durationUnit.toLowerCase()}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#A4B0C4]">
                        <div className="text-[#F3F6FC]">
                          {bk.createdAtIso ? bk.createdAtIso.slice(0, 10) : '—'}
                        </div>
                        {bk.rentalEndIso && (
                          <div className="text-[10px] text-[#A4B0C4]">
                            Due: {bk.rentalEndIso.slice(0, 10)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#A4B0C4]">
                        {activeTab === 'BORROWINGS' ? bk.lender : bk.borrower}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-right text-[#F3F6FC]">
                        {bk.rentalFeeNear} NEAR
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-right text-[#5EEAD4]">
                        {bk.collateralNear} NEAR
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold">
                        {(() => {
                          if (bk.status === 'ACTIVE' || bk.status === 'RETURN_REQUESTED') {
                            const late = calculateLateDueDateInterest(bk);
                            if (late.isOverdue) {
                              return (
                                <div className="space-y-0.5">
                                  <span className="px-2 py-0.5 rounded bg-[#F87171]/20 border border-[#F87171]/60 text-[#F87171] text-[10px] font-bold inline-flex items-center gap-1 whitespace-nowrap animate-pulse">
                                    <span>OVERDUE · 3% APY</span>
                                  </span>
                                  <div className="text-[10px] text-[#F87171] font-mono whitespace-nowrap">
                                    +{late.accruedLateFeeNear} NEAR
                                  </div>
                                </div>
                              );
                            }
                            if (late.urgencyLevel === 'DUE_SOON') {
                              return (
                                <span className="px-2 py-0.5 rounded bg-[#FBBF24]/20 border border-[#FBBF24]/60 text-[#FBBF24] text-[10px] font-bold inline-flex items-center gap-1 whitespace-nowrap">
                                  <span>DUE SOON</span>
                                </span>
                              );
                            }
                            return (
                              <span className="px-2 py-0.5 rounded bg-[#00EC97]/15 border border-[#00EC97]/40 text-[#00EC97] text-[10px] font-bold inline-block whitespace-nowrap">
                                ACTIVE (ON SCHEDULE)
                              </span>
                            );
                          }
                          return (
                            <span
                              className={`whitespace-nowrap ${
                                bk.status === 'COMPLETED' || bk.status === 'RESOLVED'
                                  ? 'text-[#34D399]'
                                  : bk.status === 'DISPUTED'
                                  ? 'text-[#F87171]'
                                  : 'text-[#FBBF24]'
                              }`}
                            >
                              {bk.status}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenBookingDetails(bk.bookingId)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#172338] text-[#5EEAD4] border border-slate-700 hover:border-[#5EEAD4] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Manage Agreement</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Digital Access Dashboard & Interactive Controlled Demo API Gateway */}
      {activeTab === 'DIGITAL_ACCESS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 6 Columns: Issued Temporary Credentials */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#8297FF]" />
                  <h2 className="text-sm font-bold font-display text-[#F3F6FC]">
                    My Temporary Digital Credentials
                  </h2>
                </div>
                <span className="text-xs text-[#A4B0C4]">SHA-256 Hashed on Server</span>
              </div>

              {myCredentials.length === 0 ? (
                <p className="text-xs text-[#A4B0C4]">
                  No digital credentials found for <code className="font-mono">{connectedWallet}</code>. Borrow a digital API resource or switch to <code className="font-mono text-[#F3F6FC]">alex-builder.testnet</code> to test the active Demo Weather API credential.
                </p>
              ) : (
                <div className="space-y-4">
                  {myCredentials.map((cred) => {
                    const remaining = Math.max(0, cred.quotaLimit - cred.usageCount);
                    return (
                      <div
                        key={cred.id}
                        className="p-4 rounded-xl bg-[#0B1020] border border-slate-800 space-y-3 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-[#F3F6FC]">
                            Booking: {cred.bookingId}
                          </span>
                          <span
                            className={`font-mono font-semibold ${
                              cred.revoked || remaining === 0 ? 'text-[#F87171]' : 'text-[#34D399]'
                            }`}
                          >
                            {cred.revoked
                              ? `REVOKED (${cred.revokedReason || 'Expired'})`
                              : remaining === 0
                              ? 'QUOTA_EXHAUSTED'
                              : 'ACTIVE'}
                          </span>
                        </div>

                        {cred.authorizedRawToken && (
                          <div className="p-2.5 rounded bg-[#121B2C] border border-slate-800 space-y-1">
                            <span className="text-[11px] text-[#A4B0C4] block">
                              Authorized Borrower Bearer Token (Shown only to {cred.borrowerWallet}):
                            </span>
                            <div className="flex items-center justify-between gap-2">
                              <code className="font-mono text-[#5EEAD4] select-all break-all">
                                {cred.authorizedRawToken}
                              </code>
                              <button
                                type="button"
                                onClick={() => setCustomTokenInput(cred.authorizedRawToken!)}
                                className="px-2 py-1 text-[11px] rounded bg-[#172338] text-[#F3F6FC] shrink-0 cursor-pointer"
                              >
                                Use in Gateway
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-[#A4B0C4]">
                          <div>
                            Endpoint: <code className="font-mono text-[#F3F6FC]">{cred.endpointPath}</code>
                          </div>
                          <div className="text-right font-mono tabular-nums">
                            Usage: <strong className="text-[#F3F6FC]">{cred.usageCount} / {cred.quotaLimit}</strong> ({remaining} left)
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-[#A4B0C4]">
                          <span>Expires: {new Date(cred.expiresAtIso).toLocaleString()}</span>
                          {!cred.revoked && (
                            <button
                              type="button"
                              onClick={() => handleRevokeCredential(cred.id)}
                              className="text-[#F87171] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Ban className="w-3 h-3" />
                              <span>Revoke Token Now</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Gateway Usage Audit Log */}
            <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-3">
              <h3 className="text-xs font-bold font-display text-[#F3F6FC] uppercase tracking-wider">
                Server-Side API Gateway Usage Log ({myUsageEvents.length})
              </h3>
              {myUsageEvents.length === 0 ? (
                <p className="text-xs text-[#A4B0C4]">No API requests recorded yet. Send a test request on the right.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {myUsageEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-2.5 rounded bg-[#0B1020] border border-slate-800/80 text-xs flex items-center justify-between"
                    >
                      <div>
                        <code className="font-mono text-[#F3F6FC]">{evt.requestPath}</code>
                        <span className="text-[#A4B0C4] ml-2">({evt.querySummary})</span>
                      </div>
                      <span
                        className={`font-mono font-semibold ${
                          evt.statusCode === 200 ? 'text-[#34D399]' : 'text-[#F87171]'
                        }`}
                      >
                        HTTP {evt.statusCode} · {evt.outcome}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right 6 Columns: Controlled Demo Weather API Gateway Interactive Console */}
          <div className="lg:col-span-6 bg-[#172338] border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-xs text-[#5EEAD4]">Live Server-Side Enforcement</span>
              <h2 className="text-lg font-bold font-display text-[#F3F6FC]">
                Controlled Demo Weather API Gateway
              </h2>
              <p className="text-xs text-[#A4B0C4] mt-0.5">
                Send real HTTP POST requests to <code className="font-mono text-[#F3F6FC]">/api/demo-resource/weather</code>. The backend verifies on-chain booking state, token hash, remaining quota, and timestamp expiration.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="gw-token" className="block text-[#A4B0C4] mb-1">
                  Bearer Credential Token
                </label>
                <input
                  id="gw-token"
                  type="text"
                  value={customTokenInput}
                  onChange={(e) => setCustomTokenInput(e.target.value)}
                  placeholder="Paste temporary bb_temp_... token"
                  className="w-full px-3 py-2 font-mono bg-[#0B1020] border border-slate-800 rounded-lg text-[#5EEAD4]"
                />
              </div>

              <div>
                <label htmlFor="gw-city" className="block text-[#A4B0C4] mb-1">
                  Telemetry Station City
                </label>
                <select
                  id="gw-city"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
                >
                  <option value="Zurich">Zurich (Station MET-ZRH-04)</option>
                  <option value="San Francisco">San Francisco (Station MET-SFO-09)</option>
                  <option value="Tokyo">Tokyo (Station MET-HND-02)</option>
                  <option value="London">London (Station MET-LHR-11)</option>
                  <option value="Singapore">Singapore (Station MET-SIN-01)</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={apiLoading}
                  onClick={() => handleCallDemoWeatherApi(false)}
                  className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{apiLoading ? 'Calling Gateway...' : 'Send Live API Request (Uses 1 Quota)'}</span>
                </button>

                <button
                  type="button"
                  disabled={apiLoading}
                  onClick={() => handleCallDemoWeatherApi(true)}
                  className="px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-[#121B2C] text-[#FBBF24] border border-slate-700 hover:border-[#FBBF24] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Test Expired Timestamp Rejection</span>
                </button>
              </div>
            </div>

            {apiResponseJson && (
              <div className="space-y-1.5">
                <span className="text-xs text-[#A4B0C4] block">Gateway JSON Response:</span>
                <pre className="p-4 rounded-lg bg-[#0B1020] border border-slate-800 text-xs font-mono text-[#F3F6FC] overflow-x-auto max-h-64">
                  {apiResponseJson}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: My Listed Resources */}
      {activeTab === 'LISTINGS' && (
        <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold font-display text-[#F3F6FC]">
            Resources Listed by {connectedWallet}
          </h2>
          {myListings.length === 0 ? (
            <p className="text-xs text-[#A4B0C4]">
              You have no listed resources under <code className="font-mono">{connectedWallet}</code>. Switch to <code className="font-mono text-[#F3F6FC]">optics-lab.testnet</code> or <code className="font-mono text-[#F3F6FC]">atmo-telemetry.testnet</code>, or create a new listing.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myListings.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-[#0B1020] border border-slate-800 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[#5EEAD4] font-semibold">{item.resourceType}</span>
                      <CountryBadge
                        countryCode={item.resourceType === 'PHYSICAL' ? item.countryCode : undefined}
                        countryName={item.countryName}
                        regionName={item.regionName}
                        cityName={item.cityName}
                        compact={true}
                      />
                      {item.locationReviewRequired && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 font-semibold text-[11px]">
                          Paused: Country Changed — Location Review Required
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-[#F3F6FC]">{item.title}</h3>
                    <p className="text-[#A4B0C4] font-mono tabular-nums">
                      Fee: {item.rentalFeeNear} NEAR · Collateral: {item.collateralNear} NEAR
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenListing(item.id)}
                    className="px-3 py-1.5 rounded bg-[#172338] text-[#F3F6FC] border border-slate-700 hover:border-[#5EEAD4] shrink-0 cursor-pointer"
                  >
                    View Listing
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Borrowing Passport & Notifications */}
      {activeTab === 'PASSPORT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Award className="w-4 h-4 text-[#5EEAD4]" />
              <h2 className="text-sm font-bold font-display text-[#F3F6FC]">
                Verifiable On-Chain Borrowing Passport
              </h2>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#A4B0C4]">NEAR Account ID</span>
                <code className="font-mono text-[#F3F6FC]">{connectedWallet}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A4B0C4]">Authentication Status</span>
                <span className="text-[#5EEAD4] font-medium">
                  Wallet Connected (Not KYC Identity Verified)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A4B0C4]">Completed Borrows</span>
                <span className="font-mono font-bold text-[#F3F6FC] tabular-nums">
                  {profile?.completedBorrows ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A4B0C4]">Completed Lends</span>
                <span className="font-mono font-bold text-[#F3F6FC] tabular-nums">
                  {profile?.completedLends ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A4B0C4]">Recorded Disputes</span>
                <span className="font-mono font-bold text-[#34D399] tabular-nums">
                  {profile?.disputesCount ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Bell className="w-4 h-4 text-[#8297FF]" />
              <h2 className="text-sm font-bold font-display text-[#F3F6FC]">
                Agreement & Settlement Notifications
              </h2>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-lg bg-[#0B1020] border border-slate-800/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-[#F3F6FC]">{n.title}</strong>
                    <span className="text-[11px] text-[#A4B0C4]">
                      {new Date(n.timestampIso).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[#A4B0C4]">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
