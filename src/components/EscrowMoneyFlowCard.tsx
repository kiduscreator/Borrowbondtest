import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Lock,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Scale,
  UserCheck,
  ExternalLink,
  Sparkles,
  Info,
  Timer,
  AlertCircle,
} from 'lucide-react';
import {
  formatYoctoNear,
  calculateLateDueDateInterest,
  LATE_DUE_DATE_APY_PERCENT,
  type BookingStatus,
  type LateDueDateInterestCalculation,
} from '../lib/near/escrowStateMachine';
import { NearTokenIcon, UsdtTokenIcon } from './TokenIcons';

export interface MoneyFlowExplanation {
  status: BookingStatus;
  badgeLabel: string;
  oneSentencePlainExplanation: string;
  whoActsNext: string;
  feeDestinationLabel: string;
  collateralDestinationLabel: string;
  colorClass: string;
}

export function getEscrowStatePlainExplanation(
  status: BookingStatus,
  params: {
    borrower: string;
    lender: string;
    resolver?: string;
    rentalFeeNear: number;
    collateralNear: number;
    damageDeductionNear?: number;
  }
): MoneyFlowExplanation {
  const totalNear = Number((params.rentalFeeNear + params.collateralNear).toFixed(4));
  const resolverId = params.resolver || 'borrowbondtest.testnet';

  switch (status) {
    case 'REQUESTED':
      return {
        status,
        badgeLabel: 'Escrow Funded · Awaiting Lender',
        oneSentencePlainExplanation: `${params.borrower} locked ${totalNear} NEAR (${params.rentalFeeNear} NEAR rental fee + ${params.collateralNear} NEAR refundable collateral) in the escrow contract; if the lender does not accept in time, 100% is refunded automatically.`,
        whoActsNext: `Lender (${params.lender}) must accept or Borrower may cancel for a 100% refund`,
        feeDestinationLabel: `Held in Escrow (${params.rentalFeeNear} NEAR)`,
        collateralDestinationLabel: `Held in Escrow (${params.collateralNear} NEAR)`,
        colorClass: 'text-[#FBBF24] border-[#FBBF24]/40 bg-[#FBBF24]/10',
      };
    case 'ACCEPTED':
    case 'HANDOVER_PENDING':
      return {
        status,
        badgeLabel: 'Accepted · Awaiting Handover',
        oneSentencePlainExplanation: `${params.lender} accepted the booking; funds stay locked in escrow while both parties verify the one-time handover QR code to start the rental.`,
        whoActsNext: `Both Lender (${params.lender}) & Borrower (${params.borrower}) confirm handover QR`,
        feeDestinationLabel: `Reserved for Lender (${params.rentalFeeNear} NEAR)`,
        collateralDestinationLabel: `Protected for Borrower (${params.collateralNear} NEAR)`,
        colorClass: 'text-[#17F1D1] border-[#17F1D1]/40 bg-[#17F1D1]/10',
      };
    case 'ACTIVE':
      return {
        status,
        badgeLabel: 'Active Rental · Protected in Escrow',
        oneSentencePlainExplanation: `The resource is currently in use by ${params.borrower}, while ${totalNear} NEAR remains untouchable inside the NEAR escrow smart contract until return is verified.`,
        whoActsNext: `Borrower (${params.borrower}) initiates return before the rental deadline`,
        feeDestinationLabel: `Accruing for Lender (${params.rentalFeeNear} NEAR)`,
        collateralDestinationLabel: `100% Refundable on Safe Return (${params.collateralNear} NEAR)`,
        colorClass: 'text-[#00EC97] border-[#00EC97]/40 bg-[#00EC97]/10',
      };
    case 'RETURN_REQUESTED':
      return {
        status,
        badgeLabel: 'Return Initiated · TIN/Serial Inspection',
        oneSentencePlainExplanation: `${params.borrower} returned the item; as soon as ${params.lender} confirms the matching Anti-Scam TIN/Serial, the contract pays the fee to the lender and refunds 100% of collateral to the borrower.`,
        whoActsNext: `Lender (${params.lender}) scans Product QR / TIN to release escrow`,
        feeDestinationLabel: `Ready to Release to ${params.lender} (${params.rentalFeeNear} NEAR)`,
        collateralDestinationLabel: `Ready to Refund to ${params.borrower} (${params.collateralNear} NEAR)`,
        colorClass: 'text-[#17F1D1] border-[#17F1D1]/40 bg-[#17F1D1]/10',
      };
    case 'COMPLETED':
      return {
        status,
        badgeLabel: 'Settled & Completed On-Chain',
        oneSentencePlainExplanation: `Return was verified: ${params.rentalFeeNear} NEAR rental fee was paid to ${params.lender}, and 100% of the ${params.collateralNear} NEAR collateral was refunded to ${params.borrower}.`,
        whoActsNext: 'Agreement complete — Claimable balances ready for withdrawal',
        feeDestinationLabel: `Paid to Lender ${params.lender} (${params.rentalFeeNear} NEAR)`,
        collateralDestinationLabel: `Refunded 100% to Borrower ${params.borrower} (${params.collateralNear} NEAR)`,
        colorClass: 'text-[#00EC97] border-[#00EC97]/40 bg-[#00EC97]/15',
      };
    case 'DISPUTED':
      return {
        status,
        badgeLabel: 'Disputed · Escrow Frozen for Review',
        oneSentencePlainExplanation: `A dispute was opened, freezing all ${totalNear} NEAR in the contract so neither party can move funds while the BorrowBond Team (${resolverId}) inspects before/after evidence.`,
        whoActsNext: `Authorized Resolver (${resolverId}) reviews evidence & allocates funds`,
        feeDestinationLabel: `Frozen Pending Arbitration (${params.rentalFeeNear} NEAR)`,
        collateralDestinationLabel: `Frozen Pending Arbitration (${params.collateralNear} NEAR)`,
        colorClass: 'text-[#F87171] border-[#F87171]/40 bg-[#F87171]/10',
      };
    case 'RESOLVED': {
      const dmg = params.damageDeductionNear ?? 0;
      const lenderTotal = Number((params.rentalFeeNear + dmg).toFixed(4));
      const borrowerRefund = Number(Math.max(0, params.collateralNear - dmg).toFixed(4));
      return {
        status,
        badgeLabel: 'Dispute Resolved · Split Settled',
        oneSentencePlainExplanation: `Arbitration completed by ${resolverId}: ${lenderTotal} NEAR (fee + verified damage cost) was credited to ${params.lender}, and the remaining ${borrowerRefund} NEAR collateral was refunded to ${params.borrower}.`,
        whoActsNext: 'Arbitration complete — Settled balances ready for withdrawal',
        feeDestinationLabel: `Credited to Lender (${lenderTotal} NEAR)`,
        collateralDestinationLabel: `Remaining Refunded to Borrower (${borrowerRefund} NEAR)`,
        colorClass: 'text-[#00EC97] border-[#00EC97]/40 bg-[#00EC97]/15',
      };
    }
    case 'CANCELLED':
    case 'REFUNDED':
    case 'EXPIRED':
      return {
        status,
        badgeLabel: status === 'CANCELLED' ? 'Cancelled · 100% Refunded' : status === 'REFUNDED' ? 'Refunded · 100% Returned' : 'Expired · 100% Refunded',
        oneSentencePlainExplanation: `The booking ended before handover, so 100% of the ${totalNear} NEAR deposit (both rental fee and collateral) was refunded to ${params.borrower}.`,
        whoActsNext: 'No action needed — 100% refunded to borrower',
        feeDestinationLabel: `Refunded to Borrower (${params.rentalFeeNear} NEAR)`,
        collateralDestinationLabel: `Refunded to Borrower (${params.collateralNear} NEAR)`,
        colorClass: 'text-[#9BA8C0] border-slate-700 bg-slate-800/40',
      };
  }
}

const LIFECYCLE_STEPS: { status: BookingStatus; shortTitle: string; actor: string }[] = [
  { status: 'REQUESTED', shortTitle: '1. Lock Escrow', actor: 'Borrower' },
  { status: 'ACCEPTED', shortTitle: '2. Accept Terms', actor: 'Lender' },
  { status: 'ACTIVE', shortTitle: '3. QR Handover', actor: 'Both Parties' },
  { status: 'RETURN_REQUESTED', shortTitle: '4. Initiate Return', actor: 'Borrower' },
  { status: 'COMPLETED', shortTitle: '5. Verify TIN & Settle', actor: 'Lender / Contract' },
];

interface EscrowMoneyFlowCardProps {
  status?: BookingStatus;
  state?: BookingStatus;
  rentalFeeNear: number;
  collateralNear: number;
  nearUsdRate?: number;
  borrowerWallet: string;
  lenderWallet: string;
  contractAddress: string;
  resolverWallet?: string;
  damageDeductionNear?: number;
  txHash?: string;
  deadlineIso?: string;
  expectedExpiryIso?: string;
  isVerifiedOnChain?: boolean;
  interactivePreview?: boolean;
}

export const EscrowMoneyFlowCard: React.FC<EscrowMoneyFlowCardProps> = ({
  status,
  state,
  rentalFeeNear,
  collateralNear,
  nearUsdRate = 3.7,
  borrowerWallet,
  lenderWallet,
  contractAddress,
  resolverWallet = 'borrowbondtest.testnet',
  damageDeductionNear = 0,
  txHash,
  deadlineIso,
  expectedExpiryIso,
  interactivePreview = false,
}) => {
  const initialStatus: BookingStatus = status || state || 'REQUESTED';
  const resolvedDeadlineIso = deadlineIso || expectedExpiryIso;
  const [previewStatus, setPreviewStatus] = useState<BookingStatus>(initialStatus);
  const effectiveStatus = interactivePreview ? previewStatus : initialStatus;

  const totalNear = Number((rentalFeeNear + collateralNear).toFixed(4));
  const totalUsdt = Number((totalNear * nearUsdRate).toFixed(2));
  const feeUsdt = Number((rentalFeeNear * nearUsdRate).toFixed(2));
  const colUsdt = Number((collateralNear * nearUsdRate).toFixed(2));

  const flowInfo = getEscrowStatePlainExplanation(effectiveStatus, {
    borrower: borrowerWallet,
    lender: lenderWallet,
    resolver: resolverWallet,
    rentalFeeNear,
    collateralNear,
    damageDeductionNear,
  });

  // Smart Real-Time Countdown Tick Hook (updates every 1 second)
  const [nowMs, setNowMs] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const lateCalc: LateDueDateInterestCalculation | null = useMemo(() => {
    if (!resolvedDeadlineIso) return null;
    return calculateLateDueDateInterest(
      {
        rentalEndIso: resolvedDeadlineIso,
        collateralNear,
        lender: lenderWallet,
        borrower: borrowerWallet,
      },
      new Date(nowMs).toISOString(),
      nearUsdRate
    );
  }, [resolvedDeadlineIso, collateralNear, lenderWallet, borrowerWallet, nowMs, nearUsdRate]);

  // Remaining time / overdue label
  const deadlineLabel = (() => {
    if (!lateCalc) return '24h Handover / 72h Rental Window';
    if (!lateCalc.isOverdue) {
      return `${lateCalc.remainingFormatted} remaining`;
    }
    return `Overdue by ${lateCalc.overdueFormatted} (3% APY accruing)`;
  })();

  const activeStepIndex = (() => {
    if (effectiveStatus === 'COMPLETED' || effectiveStatus === 'RESOLVED') return 4;
    if (effectiveStatus === 'RETURN_REQUESTED') return 3;
    if (effectiveStatus === 'ACTIVE' || effectiveStatus === 'DISPUTED') return 2;
    if (effectiveStatus === 'ACCEPTED') return 1;
    return 0;
  })();

  return (
    <div className="near-glow-card rounded-2xl p-5 sm:p-6 space-y-5 border border-[#00EC97]/35">
      {/* Header Row + Real On-Chain vs Simulated Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <div className="space-y-0.5">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#00EC97] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Programmable NEAR Escrow Money Flow</span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold font-display text-[#F5F8FF]">
            Rental Fee vs. Refundable Collateral Flow
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {txHash ? (
            <a
              href={`https://testnet.nearblocks.io/txns/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-[#00EC97]/15 border border-[#00EC97]/45 text-[11px] font-mono font-bold text-[#00EC97] inline-flex items-center gap-1 hover:underline"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>On-Chain Tx: {txHash.slice(0, 10)}...</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span
              title="Contract borrowbondtest.testnet is deployed live on NEAR Testnet; this booking state is currently in the interactive demo ledger until signed with a funded NEAR wallet."
              className="px-2.5 py-1 rounded-lg bg-[#0D1322] border border-slate-700 text-[11px] font-mono text-[#17F1D1] inline-flex items-center gap-1"
            >
              <Info className="w-3 h-3 text-[#00EC97]" />
              <span>Contract: {contractAddress} (Simulated Demo State)</span>
            </span>
          )}

          <span className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${flowInfo.colorClass}`}>
            {flowInfo.badgeLabel}
          </span>
        </div>
      </div>

      {/* Interactive State Simulator Bar (when in Preview/Checkout Mode) */}
      {interactivePreview && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#06080F] border border-slate-800 text-xs">
          <span className="text-[#9BA8C0] font-medium pl-1">
            Interactive State Preview (click to inspect how funds move at each stage):
          </span>
          <div className="flex flex-wrap items-center gap-1">
            {(['REQUESTED', 'ACCEPTED', 'ACTIVE', 'RETURN_REQUESTED', 'COMPLETED', 'DISPUTED', 'RESOLVED'] as BookingStatus[]).map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setPreviewStatus(st)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all cursor-pointer ${
                    effectiveStatus === st
                      ? 'bg-[#00EC97] text-[#04080E]'
                      : 'bg-[#0D1322] text-[#9BA8C0] hover:text-[#F5F8FF]'
                  }`}
                >
                  {st}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* One-Sentence Plain-Language Explanation Banner */}
      <div
        role="status"
        aria-live="polite"
        className="p-4 rounded-xl bg-[#06080F]/90 border border-[#00EC97]/30 flex items-start gap-3"
      >
        <ShieldCheck className="w-5 h-5 text-[#00EC97] shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <div className="font-bold text-[#F5F8FF]">
            Plain-Language Escrow Status ({effectiveStatus}):
          </div>
          <p className="text-[#9BA8C0] leading-relaxed text-xs sm:text-sm">
            {flowInfo.oneSentencePlainExplanation}
          </p>
        </div>
      </div>

      {/* Smart Countdown for Borrowers & 3% APY Due-Date Continuing Interest System */}
      {lateCalc && (
        <div
          role="region"
          aria-label="Smart Rental Countdown and Due Date Interest"
          className={`p-4 rounded-xl border transition-all ${
            lateCalc.isOverdue
              ? 'bg-[#F87171]/12 border-[#F87171]/50 shadow-[0_0_20px_rgba(248,113,113,0.22)]'
              : lateCalc.urgencyLevel === 'DUE_SOON'
              ? 'bg-[#FBBF24]/10 border-[#FBBF24]/40 shadow-[0_0_16px_rgba(251,191,36,0.18)]'
              : 'bg-[#00EC97]/8 border-[#00EC97]/30'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Timer
                className={`w-4 h-4 ${
                  lateCalc.isOverdue
                    ? 'text-[#F87171] animate-pulse'
                    : lateCalc.urgencyLevel === 'DUE_SOON'
                    ? 'text-[#FBBF24] animate-pulse'
                    : 'text-[#00EC97]'
                }`}
              />
              <span className="font-bold text-xs text-[#F5F8FF]">
                Smart Borrower Rental Countdown
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-wider inline-flex items-center gap-1 ${
                  lateCalc.isOverdue
                    ? 'bg-[#F87171]/20 text-[#F87171] border border-[#F87171]/60'
                    : lateCalc.urgencyLevel === 'DUE_SOON'
                    ? 'bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/60'
                    : 'bg-[#00EC97]/20 text-[#00EC97] border border-[#00EC97]/60'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    lateCalc.isOverdue
                      ? 'bg-[#F87171] animate-ping'
                      : lateCalc.urgencyLevel === 'DUE_SOON'
                      ? 'bg-[#FBBF24] animate-ping'
                      : 'bg-[#00EC97]'
                  }`}
                />
                {lateCalc.isOverdue
                  ? 'OVERDUE · 3% APY LATE INTEREST ACCRUING'
                  : lateCalc.urgencyLevel === 'DUE_SOON'
                  ? 'DUE SOON (< 24 HOURS)'
                  : 'ON SCHEDULE'}
              </span>

              {resolvedDeadlineIso && (
                <span className="text-[11px] font-mono text-[#9BA8C0]">
                  Due: {new Date(resolvedDeadlineIso).toLocaleDateString()} {new Date(resolvedDeadlineIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          <div className="pt-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Countdown Tick-by-Tick Boxes */}
            <div className="md:col-span-5 flex items-center justify-center sm:justify-start gap-1.5 font-mono text-center">
              {(() => {
                const totalSec = Math.floor((lateCalc.isOverdue ? lateCalc.overdueMs : lateCalc.remainingMs) / 1000);
                const s = totalSec % 60;
                const m = Math.floor(totalSec / 60) % 60;
                const h = Math.floor(totalSec / 3600) % 24;
                const d = Math.floor(totalSec / 86400);

                const units = [
                  { val: d, label: 'DAYS' },
                  { val: h, label: 'HOURS' },
                  { val: m, label: 'MINS' },
                  { val: s, label: 'SECS' },
                ];

                return (
                  <div className="flex items-center gap-1.5 w-full">
                    {units.map((u, i) => (
                      <React.Fragment key={u.label}>
                        <div
                          className={`flex-1 p-2 rounded-xl border text-center ${
                            lateCalc.isOverdue
                              ? 'bg-[#150B10] border-[#F87171]/45 text-[#F87171]'
                              : lateCalc.urgencyLevel === 'DUE_SOON'
                              ? 'bg-[#16130A] border-[#FBBF24]/40 text-[#FBBF24]'
                              : 'bg-[#06080F] border-slate-800 text-[#F5F8FF]'
                          }`}
                        >
                          <div className="text-base sm:text-lg font-extrabold tabular-nums">
                            {String(u.val).padStart(2, '0')}
                          </div>
                          <div className="text-[9px] text-[#9BA8C0] font-bold tracking-wider">
                            {u.label}
                          </div>
                        </div>
                        {i < units.length - 1 && (
                          <span
                            className={`font-bold text-xs ${
                              lateCalc.isOverdue
                                ? 'text-[#F87171]'
                                : lateCalc.urgencyLevel === 'DUE_SOON'
                                ? 'text-[#FBBF24]'
                                : 'text-[#00EC97]'
                            }`}
                          >
                            :
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Accrued Late Fee / Due Date Policy Explanation */}
            <div className="md:col-span-7 space-y-1 text-xs">
              {lateCalc.isOverdue ? (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-extrabold text-[#F87171] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>3.00% APY Continuing Late Interest:</span>
                    </span>
                    <span className="font-mono font-extrabold text-[#F87171] tabular-nums text-sm">
                      +{lateCalc.accruedLateFeeNear} NEAR{' '}
                      <span className="text-xs text-[#FCA5A5]">(${lateCalc.accruedLateFeeUsdt} USDT)</span>
                    </span>
                  </div>
                  <p className="text-[#E2E8F0] leading-relaxed text-[11px]">
                    {lateCalc.noticeMessage}
                  </p>
                  <div className="text-[10px] font-mono text-[#9BA8C0] flex items-center justify-between">
                    <span>Accrual: +{lateCalc.interestPerSecondNear} NEAR/sec</span>
                    <span>Collateral Cap: 50% max ({lateCalc.maxLateFeeNear} NEAR)</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#F5F8FF]">
                      Due-Date Protection (3.00% APY Policy)
                    </span>
                    <span className="text-[11px] font-mono text-[#00EC97]">0.0000 NEAR late fees</span>
                  </div>
                  <p className="text-[#9BA8C0] leading-relaxed text-[11px]">
                    Return before the deadline to receive 100% of your {collateralNear} NEAR refundable collateral. If returned past the due date, a continuous 3.00% APY interest fee accrues per second and is deducted upon handover.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3-Column Animated Money Flow Diagram: Borrower -> Escrow Contract -> Settlement */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        {/* Column 1: Borrower Deposit */}
        <div className="p-4 rounded-xl bg-[#06080F] border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-[#9BA8C0] uppercase">01 · Borrower Deposit</span>
            <div className="font-mono font-bold text-xs text-[#F5F8FF] truncate">{borrowerWallet}</div>
          </div>

          <div className="space-y-1.5 py-2 border-y border-slate-800/80 text-xs">
            <div className="flex justify-between">
              <span className="text-[#9BA8C0]">Rental Fee:</span>
              <span className="font-mono font-semibold text-[#F5F8FF] tabular-nums">
                {rentalFeeNear} NEAR (${feeUsdt})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9BA8C0]">50% Collateral:</span>
              <span className="font-mono font-semibold text-[#00EC97] tabular-nums">
                {collateralNear} NEAR (${colUsdt})
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#9BA8C0]">Total Lock:</span>
            <span className="font-mono font-extrabold text-[#17F1D1] tabular-nums inline-flex items-center gap-1">
              <NearTokenIcon size={13} />
              <span>{totalNear} NEAR</span>
              <span className="text-[10px] text-[#9BA8C0]">(${totalUsdt})</span>
            </span>
          </div>
        </div>

        {/* Column 2: NEAR Smart Contract Vault (Animated Pulse) */}
        <div className="p-4 rounded-xl bg-[#0B1324] border border-[#00EC97]/45 flex flex-col justify-between space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#00EC97] font-bold uppercase">
              02 · NEAR Escrow Vault
            </span>
            <Lock className="w-4 h-4 text-[#00EC97]" />
          </div>

          <div className="space-y-2 my-auto">
            <div className="text-xs font-mono text-[#F5F8FF] truncate">{contractAddress}</div>
            {/* Animated Flow Track */}
            <div className="relative h-2 rounded-full bg-[#06080F] overflow-hidden border border-slate-800">
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                className="w-1/2 h-full rounded-full bg-gradient-to-r from-transparent via-[#00EC97] to-[#17F1D1]"
              />
            </div>
            <p className="text-[11px] text-[#9BA8C0]">
              Holds <strong className="text-[#F5F8FF] font-mono">{totalNear} NEAR</strong> in isolated contract storage. No AI or single party can withdraw unilaterally.
            </p>
          </div>

          <div className="text-[11px] font-mono text-[#17F1D1] flex items-center justify-between">
            <span>Pull-Payment Security</span>
            <span>NEP-141 / NEAR</span>
          </div>
        </div>

        {/* Column 3: Dual Settlement Destination (Fee -> Lender, Collateral -> Borrower) */}
        <div className="p-4 rounded-xl bg-[#06080F] border border-slate-800 flex flex-col justify-between space-y-2.5">
          <span className="text-[11px] font-mono text-[#9BA8C0] uppercase">
            03 · Automatic Split Settlement
          </span>

          {/* Stream A: Rental Fee -> Lender */}
          <div className="p-2.5 rounded-lg bg-[#0D1322] border border-slate-800 space-y-1 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#9BA8C0] flex items-center gap-1">
                <ArrowRight className="w-3 h-3 text-[#00EC97]" />
                <span>Rental Fee → Lender</span>
              </span>
              <UsdtTokenIcon size={12} />
            </div>
            <div className="font-mono font-bold text-[#F5F8FF] text-xs truncate">
              {flowInfo.feeDestinationLabel}
            </div>
          </div>

          {/* Stream B: Refundable Collateral -> Borrower */}
          <div className="p-2.5 rounded-lg bg-[#00EC97]/10 border border-[#00EC97]/35 space-y-1 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#00EC97] font-semibold flex items-center gap-1">
                <ArrowRight className="w-3 h-3" />
                <span>Collateral → Borrower</span>
              </span>
              <NearTokenIcon size={12} />
            </div>
            <div className="font-mono font-bold text-[#00EC97] text-xs truncate">
              {flowInfo.collateralDestinationLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Live 5-Stage Lifecycle Stepper + Who Must Act Next & Countdown */}
      <div className="pt-2 border-t border-slate-800/80 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isDone = idx < activeStepIndex || effectiveStatus === 'COMPLETED' || effectiveStatus === 'RESOLVED';
            const isCurrent = idx === activeStepIndex && effectiveStatus !== 'COMPLETED' && effectiveStatus !== 'RESOLVED';
            return (
              <div
                key={step.status}
                className={`p-2.5 rounded-xl border text-xs transition-all ${
                  isCurrent
                    ? 'bg-[#00EC97]/15 border-[#00EC97] text-[#F5F8FF]'
                    : isDone
                    ? 'bg-[#0D1322]/90 border-[#00EC97]/35 text-[#00EC97]'
                    : 'bg-[#06080F]/70 border-slate-800/80 text-[#9BA8C0]'
                }`}
              >
                <div className="font-bold text-[11px] truncate">{step.shortTitle}</div>
                <div className="text-[10px] font-mono opacity-80 truncate">Actor: {step.actor}</div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-[#06080F] px-3.5 py-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#00EC97] shrink-0" />
            <span className="text-[#9BA8C0]">Next Required Action:</span>
            <strong className="text-[#F5F8FF]">{flowInfo.whoActsNext}</strong>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="inline-flex items-center gap-1 text-[#17F1D1]">
              <Clock className="w-3.5 h-3.5" />
              <span>{deadlineLabel}</span>
            </span>

            {effectiveStatus === 'DISPUTED' && (
              <span className="inline-flex items-center gap-1 text-[#F87171]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Arbitration Active</span>
              </span>
            )}
            {effectiveStatus === 'RESOLVED' && (
              <span className="inline-flex items-center gap-1 text-[#00EC97]">
                <Scale className="w-3.5 h-3.5" />
                <span>Resolved</span>
              </span>
            )}
          </div>
        </div>

        {/* Expandable Technical Detail for yoctoNEAR (No Jargon by Default) */}
        <details className="text-[11px] text-[#9BA8C0] bg-[#06080F]/60 rounded-xl px-3.5 py-2 border border-slate-800/60">
          <summary className="cursor-pointer font-mono text-[#9BA8C0] hover:text-[#F5F8FF] select-none">
            Technical On-Chain Units &amp; Contract Method Details (Expandable)
          </summary>
          <div className="pt-2 mt-2 border-t border-slate-800/70 space-y-1 font-mono text-[11px]">
            <div>
              Contract Account: <span className="text-[#00EC97]">{contractAddress}</span> · Network:{' '}
              <span className="text-[#17F1D1]">NEAR Testnet</span>
            </div>
            <div>
              Attached Deposit (yoctoNEAR):{' '}
              <span className="text-[#F5F8FF]">{formatYoctoNear(totalNear)} yoctoNEAR</span> (1 NEAR = 10²⁴ yoctoNEAR)
            </div>
            <div>
              Contract Methods: <code>create_booking</code> → <code>accept_booking</code> →{' '}
              <code>confirm_handover</code> → <code>request_return</code> → <code>confirm_return</code> /{' '}
              <code>resolve_dispute_with_damage_deduction</code>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};
