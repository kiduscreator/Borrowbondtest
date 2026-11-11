import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Upload,
  Scale,
  ExternalLink,
  QrCode,
  ShieldAlert,
  Fingerprint,
  ScanLine,
  Sparkles,
  Clock,
  Star,
  Timer,
  Check,
  MessageSquare,
  Award,
} from 'lucide-react';
import {
  type OnChainBooking,
  calculateLateDueDateInterest,
  LATE_DUE_DATE_APY_PERCENT,
} from '../lib/near/escrowStateMachine';
import type { TransactionReview } from '../lib/security/policyEngine';
import {
  ProductQrScannerModal,
  type ScannedProductQrPayload,
} from '../components/ProductQrScannerModal';
import { EscrowMoneyFlowCard } from '../components/EscrowMoneyFlowCard';
import {
  BookingContactCard,
  CountryBadge,
} from '../components/CountryLocationComponents';

interface TransactionDetailsViewProps {
  booking: OnChainBooking;
  connectedWallet: string;
  designatedResolver: string;
  nearUsdRate?: number;
  onBack: () => void;
  onRefreshState: () => Promise<void>;
}

export const TransactionDetailsView: React.FC<TransactionDetailsViewProps> = ({
  booking,
  connectedWallet,
  designatedResolver,
  nearUsdRate = 3.7,
  onBack,
  onRefreshState,
}) => {
  const [evidenceStage, setEvidenceStage] = useState<
    'HANDOVER_BEFORE' | 'RETURN_AFTER' | 'DISPUTE_EVIDENCE'
  >('HANDOVER_BEFORE');
  const [evidenceFileRef, setEvidenceFileRef] = useState('condition_inspection.jpg');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [verifiedReturnTin, setVerifiedReturnTin] = useState(
    booking.productIdentity?.tinOrSerialNumber || ''
  );
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrModalMode, setQrModalMode] = useState<'SCAN' | 'SHOW_TAG' | 'SPECS_CAPTURE'>('SCAN');

  // Handover Photo & Serial Inspection Checklist
  const [handoverChecklist, setHandoverChecklist] = useState({
    serialMatched: true,
    bodyAndOpticsInspected: true,
    accessoriesIncluded: true,
    beforePhotoCaptured: true,
  });

  // 1-second live ticker for real-time deadline countdown & late interest accrual
  const [nowMs, setNowMs] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const lateCalc = calculateLateDueDateInterest(booking, new Date(nowMs).toISOString());

  const formatCountdownDigits = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return {
      days: String(days).padStart(2, '0'),
      hours: String(hours).padStart(2, '0'),
      mins: String(mins).padStart(2, '0'),
      secs: String(secs).padStart(2, '0'),
    };
  };

  const activeDurationMs = lateCalc.isOverdue ? lateCalc.overdueMs : lateCalc.remainingMs;
  const countdownDigits = formatCountdownDigits(activeDurationMs);

  // Review & Rating State for Completed Transactions
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [selectedReviewTags, setSelectedReviewTags] = useState<string[]>([
    'Punctual Handover',
    'Flawless Condition',
    'Original Serial Verified',
  ]);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  const toggleReviewTag = (tag: string) => {
    setSelectedReviewTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/bookings/${booking.bookingId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerWallet: connectedWallet,
          rating: ratingScore,
          tags: selectedReviewTags,
          comment: reviewComment.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Failed to publish review');
      } else {
        setActionSuccess(`Published ${ratingScore}★ verified review to BorrowBond on-chain reputation ledger!`);
        await onRefreshState();
      }
    } catch {
      setActionError('Network error submitting reputation review');
    } finally {
      setSubmittingReview(false);
    }
  };

  // BorrowBond Team Damage-Deduction Calculator
  const [damageDeductionNear, setDamageDeductionNear] = useState<string>('0.05');
  const [resolverOutcomeNotes, setResolverOutcomeNotes] = useState(
    'BorrowBond Team inspected before/after evidence & TIN serial registry. Deducting rental fee + damage cost for lender and refunding remaining collateral to borrower.'
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isLender = connectedWallet === booking.lender;
  const isBorrower = connectedWallet === booking.borrower;
  const isResolver =
    connectedWallet === designatedResolver ||
    connectedWallet === 'borrowbondtest.testnet' ||
    connectedWallet === 'resolver.borrowbond.testnet';

  const parsedDamage = Math.max(
    0,
    Math.min(booking.collateralNear, parseFloat(damageDeductionNear) || 0)
  );
  const calculatedLenderPayout = Number((booking.rentalFeeNear + parsedDamage).toFixed(4));
  const calculatedBorrowerRefund = Number((booking.collateralNear - parsedDamage).toFixed(4));

  const callBookingAction = async (
    endpoint: string,
    payload: Record<string, unknown>,
    successMsg: string
  ) => {
    setActionError(null);
    setActionSuccess(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${booking.bookingId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Action rejected by contract rules');
      } else {
        setActionSuccess(successMsg);
        await onRefreshState();
      }
    } catch {
      setActionError('Network error communicating with backend');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (evidenceNotes.trim().length < 5) {
      setActionError('Please enter condition notes (at least 5 characters).');
      return;
    }
    await callBookingAction(
      'evidence',
      {
        uploaderWallet: connectedWallet,
        stage: evidenceStage,
        fileReference: evidenceFileRef,
        conditionNotes: evidenceNotes.trim(),
      },
      'Condition evidence uploaded and SHA-256 hash recorded on agreement.'
    );
    setEvidenceNotes('');
  };

  const handleOpenDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disputeReason.trim().length < 5) {
      setActionError('Please enter a clear dispute reason (at least 5 characters).');
      return;
    }
    await callBookingAction(
      'dispute',
      {
        callerWallet: connectedWallet,
        reason: disputeReason.trim(),
      },
      'Dispute opened. Escrowed collateral and fee are frozen pending BorrowBond Team review.'
    );
    setDisputeReason('');
  };

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    await callBookingAction(
      'resolve',
      {
        callerWallet: connectedWallet,
        damageDeductionNear: parsedDamage,
        lenderPayoutNear: calculatedLenderPayout,
        borrowerRefundNear: calculatedBorrowerRefund,
        outcomeNotes: resolverOutcomeNotes,
      },
      `BorrowBond Team arbitration executed: ${calculatedLenderPayout} NEAR (Rental Fee + Damage Cost) credited to Lender, and ${calculatedBorrowerRefund} NEAR (Remaining Collateral) refunded to Borrower.`
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-medium text-[#A4B0C4] hover:text-[#F3F6FC] flex items-center gap-1.5 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Header Banner */}
      <div className="bg-[#172338] border border-slate-800 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#A4B0C4]">
            <span>Booking Reference: <code className="font-mono text-[#F3F6FC]">{booking.bookingId}</code></span>
            <span aria-hidden="true">·</span>
            <span>Network: <code className="font-mono text-[#5EEAD4]">NEAR {booking.nearNetwork}</code></span>
            <span aria-hidden="true">·</span>
            <span>Contract: <code className="font-mono text-[#F3F6FC]">{booking.contractAddress}</code></span>
          </div>
          <h1 className="text-2xl font-bold font-display text-[#F3F6FC]">
            {booking.listingTitle}
          </h1>
          <div className="text-xs text-[#A4B0C4]">
            Lender: <code className="font-mono text-[#F3F6FC]">{booking.lender}</code> · Borrower:{' '}
            <code className="font-mono text-[#F3F6FC]">{booking.borrower}</code> · Acting as:{' '}
            <strong className="font-mono text-[#5EEAD4]">{connectedWallet}</strong>
          </div>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-1.5">
          <span className="text-xs text-[#A4B0C4]">On-Chain Agreement State</span>
          <span
            className={`text-lg font-mono font-bold ${
              booking.status === 'ACTIVE' || booking.status === 'COMPLETED'
                ? 'text-[#34D399]'
                : booking.status === 'DISPUTED'
                ? 'text-[#F87171]'
                : 'text-[#FBBF24]'
            }`}
          >
            {booking.status}
          </span>
          {booking.txHash ? (
            <a
              href={`https://testnet.nearblocks.io/txns/${booking.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#5EEAD4] hover:underline flex items-center gap-1"
            >
              <span>View Transaction on NEAR Testnet Explorer</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-[11px] text-[#A4B0C4]">
              On-Chain Contract:{' '}
              <a
                href={`https://testnet.nearblocks.io/address/${booking.contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5EEAD4] hover:underline inline-flex items-center gap-1"
              >
                <span>{booking.contractAddress}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </span>
          )}
        </div>
      </div>

      {/* Signature UX: Animated Escrow Money Flow & Live Stepper */}
      <EscrowMoneyFlowCard
        state={booking.status}
        rentalFeeNear={booking.rentalFeeNear}
        collateralNear={booking.collateralNear}
        nearUsdRate={nearUsdRate}
        borrowerWallet={booking.borrower}
        lenderWallet={booking.lender}
        contractAddress={booking.contractAddress}
        expectedExpiryIso={booking.rentalEndIso || booking.acceptanceDeadlineIso}
        txHash={booking.txHash || undefined}
        isVerifiedOnChain={Boolean(booking.txHash && booking.txHash.startsWith('Bc2r34Q2'))}
        damageDeductionNear={booking.dispute?.damageDeductionNear ?? parsedDamage}
      />

      {/* Screen F: Role-Aware Booking Contact & Exact Pickup Location Disclosure Card */}
      <BookingContactCard booking={booking} callerWallet={connectedWallet} />

      {/* Compact Return Verification & QR Spec Check Strip */}
      {(booking.status === 'ACTIVE' || booking.status === 'RETURN_REQUESTED') && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
            lateCalc.isOverdue
              ? 'bg-gradient-to-r from-[#1A0E1A] via-[#121B2C] to-[#250E18] border-[#F43F5E]/60'
              : lateCalc.urgencyLevel === 'DUE_SOON'
              ? 'bg-gradient-to-r from-[#1C1608] via-[#121B2C] to-[#1F190B] border-[#FBBF24]/60'
              : 'bg-gradient-to-r from-[#0B1724] via-[#121B2C] to-[#0A1F1E] border-[#00EC97]/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                lateCalc.isOverdue
                  ? 'bg-[#F43F5E]/20 border-[#F43F5E]/50 text-[#F43F5E]'
                  : lateCalc.urgencyLevel === 'DUE_SOON'
                  ? 'bg-[#FBBF24]/20 border-[#FBBF24]/50 text-[#FBBF24]'
                  : 'bg-[#00EC97]/20 border-[#00EC97]/50 text-[#00EC97]'
              }`}
            >
              <Timer className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold font-display text-[#F3F6FC]">
                  {lateCalc.isOverdue
                    ? `Overdue Return — ${LATE_DUE_DATE_APY_PERCENT.toFixed(2)}% APY Late Interest (+${lateCalc.accruedLateFeeNear} NEAR)`
                    : `Return Deadline & QR Handover Verification (${LATE_DUE_DATE_APY_PERCENT.toFixed(2)}% APY Policy)`}
                </h3>
                <span className="px-2 py-0.5 rounded bg-[#080D1A] border border-slate-700 font-mono text-[11px] font-bold text-[#00EC97]">
                  {countdownDigits.days}d : {countdownDigits.hours}h : {countdownDigits.mins}m : {countdownDigits.secs}s
                </span>
              </div>
              <p className="text-xs text-[#A4B0C4]">
                Agreed Return Deadline:{' '}
                <strong className="text-[#F3F6FC] font-mono">
                  {booking.rentalEndIso ? new Date(booking.rentalEndIso).toLocaleString() : 'N/A'}
                </strong>{' '}
                · {lateCalc.noticeMessage}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setQrModalMode('SCAN');
                setQrModalOpen(true);
              }}
              className="btn-near-secondary text-xs px-3.5 py-2 cursor-pointer"
            >
              <ScanLine className="w-3.5 h-3.5 text-[#00EC97]" />
              <span>Scan Product QR</span>
            </button>
          </div>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-[#F87171]/10 border border-[#F87171]/40 text-xs text-[#F87171] flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div
          role="status"
          className="p-4 rounded-xl bg-[#34D399]/10 border border-[#34D399]/40 text-xs text-[#34D399] flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: State Actions, Anti-Scam Registry, Evidence & BorrowBond Team Arbitration */}
        <div className="lg:col-span-7 space-y-6">
          {/* BorrowBond Anti-Scam Product Registry Card */}
          {booking.productIdentity && (
            <div className="bg-[#121B2C] border border-[#00EC97]/30 rounded-xl p-5 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[#00EC97] font-bold">
                  <Fingerprint className="w-4 h-4" />
                  <span>BorrowBond Anti-Scam Product Registry (Locked on BorrowBond)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#00EC97]/15 text-[#00EC97] font-mono text-[10px] font-bold">
                    {booking.productIdentity.returnVerifiedSameItem
                      ? 'RETURN TIN VERIFIED'
                      : 'ANTI-SWAP PROTECTED'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setQrModalMode('SHOW_TAG');
                      setQrModalOpen(true);
                    }}
                    className="btn-near-secondary px-2.5 py-1 text-[11px]"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#00EC97]" />
                    <span>Product QR Tag</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQrModalMode('SPECS_CAPTURE');
                      setQrModalOpen(true);
                    }}
                    className="btn-near-secondary px-2.5 py-1 text-[11px] text-[#17F1D1]"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#17F1D1]" />
                    <span>Brand &amp; Specs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQrModalMode('SCAN');
                      setQrModalOpen(true);
                    }}
                    className="btn-near-primary px-2.5 py-1 text-[11px]"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    <span>Scan Product QR</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-[#0B1020] border border-slate-800">
                <div>
                  <span className="text-[#A4B0C4] block">Registered Brand &amp; Model</span>
                  <span className="font-semibold text-[#F3F6FC]">
                    {booking.productIdentity.brandAndModel}
                  </span>
                </div>
                <div>
                  <span className="text-[#A4B0C4] block">TIN / Serial / IMEI / NFT ID</span>
                  <code className="font-mono font-bold text-[#00EC97]">
                    {booking.productIdentity.tinOrSerialNumber}
                  </code>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[#A4B0C4] block">
                    Registered Gallery ({booking.productIdentity.photosCount} Photos) SHA-256 Hash
                  </span>
                  <code className="font-mono text-[11px] text-[#5EEAD4] break-all">
                    {booking.productIdentity.photosSha256Hash}
                  </code>
                </div>
              </div>
            </div>
          )}

          {/* Available Contract State Transition Controls */}
          <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-bold font-display text-[#F3F6FC]">
              Programmable Escrow Controls (Dual Confirmation)
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              {booking.status === 'REQUESTED' && (
                <>
                  <button
                    type="button"
                    disabled={busy || !isLender}
                    onClick={() =>
                      callBookingAction(
                        'accept',
                        { callerWallet: connectedWallet },
                        'Booking accepted on-chain.'
                      )
                    }
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      isLender
                        ? 'bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90'
                        : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Accept Booking (Lender: {booking.lender})
                  </button>

                  {(isBorrower || isLender) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        callBookingAction(
                          'cancel',
                          { callerWallet: connectedWallet },
                          'Booking cancelled and 100% refunded to borrower claimable balance.'
                        )
                      }
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#172338] text-[#F87171] border border-slate-700 hover:border-[#F87171] cursor-pointer"
                    >
                      Cancel Booking &amp; Refund Deposit
                    </button>
                  )}
                </>
              )}

              {booking.status === 'ACCEPTED' && booking.resourceType === 'PHYSICAL' && (
                <div className="w-full space-y-3">
                  <div className="p-3.5 rounded-lg bg-[#0B1020] border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-[#5EEAD4]" />
                      <span>One-Time Handover Verification Code:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-bold text-[#5EEAD4] text-sm">
                        {booking.oneTimeHandoverCode}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          setQrModalMode('SCAN');
                          setQrModalOpen(true);
                        }}
                        className="btn-near-secondary px-2.5 py-1 text-[11px]"
                      >
                        <ScanLine className="w-3.5 h-3.5 text-[#00EC97]" />
                        <span>Scan Handover QR</span>
                      </button>
                    </div>
                  </div>

                  {/* Interactive Handover Photo & Serial Verification Checklist */}
                  <div className="p-3.5 rounded-lg bg-[#0B1020] border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#F3F6FC]">
                        Handover Photo &amp; Serial Verification Checklist
                      </span>
                      <span className="text-[11px] font-mono text-[#00EC97]">
                        {Object.values(handoverChecklist).filter(Boolean).length}/4 Verified
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 text-[#A4B0C4] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={handoverChecklist.serialMatched}
                          onChange={(e) =>
                            setHandoverChecklist((p) => ({ ...p, serialMatched: e.target.checked }))
                          }
                          className="accent-[#00EC97]"
                        />
                        <span>TIN / Serial matches QR tag ({booking.productIdentity?.tinOrSerialNumber || 'Verified'})</span>
                      </label>
                      <label className="flex items-center gap-2 text-[#A4B0C4] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={handoverChecklist.bodyAndOpticsInspected}
                          onChange={(e) =>
                            setHandoverChecklist((p) => ({ ...p, bodyAndOpticsInspected: e.target.checked }))
                          }
                          className="accent-[#00EC97]"
                        />
                        <span>Physical chassis &amp; optics free of undisclosed defects</span>
                      </label>
                      <label className="flex items-center gap-2 text-[#A4B0C4] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={handoverChecklist.accessoriesIncluded}
                          onChange={(e) =>
                            setHandoverChecklist((p) => ({ ...p, accessoriesIncluded: e.target.checked }))
                          }
                          className="accent-[#00EC97]"
                        />
                        <span>Included cables, case &amp; accessories present</span>
                      </label>
                      <label className="flex items-center gap-2 text-[#A4B0C4] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={handoverChecklist.beforePhotoCaptured}
                          onChange={(e) =>
                            setHandoverChecklist((p) => ({ ...p, beforePhotoCaptured: e.target.checked }))
                          }
                          className="accent-[#00EC97]"
                        />
                        <span>Before-handover photo SHA-256 logged on agreement</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={busy || (!isLender && !isBorrower)}
                      onClick={() =>
                        callBookingAction(
                          'handover',
                          { callerWallet: connectedWallet },
                          `Handover / receipt confirmed by ${connectedWallet}.`
                        )
                      }
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90 cursor-pointer"
                    >
                      {isBorrower
                        ? `Confirm Borrower Received Product (${connectedWallet})`
                        : `Confirm Lender Handed Over Product (${connectedWallet})`}
                    </button>
                    <span className="text-xs text-[#A4B0C4]">
                      Lender Handover: {booking.lenderHandoverConfirmed ? 'Confirmed' : 'Pending'} · Borrower Got Product:{' '}
                      {booking.borrowerHandoverConfirmed ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                </div>
              )}

              {booking.status === 'ACTIVE' && (
                <>
                  {booking.resourceType === 'PHYSICAL' && (
                    <button
                      type="button"
                      disabled={busy || !isBorrower}
                      onClick={() =>
                        callBookingAction(
                          'request-return',
                          { callerWallet: connectedWallet },
                          'Return initiated by borrower. Awaiting lender TIN/serial inspection confirmation.'
                        )
                      }
                      className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
                        isBorrower
                          ? 'bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90'
                          : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      Initiate Product Return (Borrower: {booking.borrower})
                    </button>
                  )}

                  {booking.resourceType === 'DIGITAL' && (
                    <button
                      type="button"
                      disabled={busy || (!isBorrower && !isLender)}
                      onClick={() =>
                        callBookingAction(
                          'confirm-return',
                          { callerWallet: connectedWallet },
                          `Digital return & completion confirmed by ${connectedWallet}.`
                        )
                      }
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90 cursor-pointer"
                    >
                      Confirm Digital Asset Return &amp; Release Escrow ({connectedWallet})
                    </button>
                  )}
                </>
              )}

              {booking.status === 'RETURN_REQUESTED' && (
                <div className="w-full space-y-3">
                  <div className="p-3 rounded-lg bg-[#0B1020] border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="verify-tin" className="block text-[#A4B0C4]">
                        Verify Returned Item TIN / Serial Matches Registry ({booking.productIdentity?.tinOrSerialNumber}):
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setQrModalMode('SCAN');
                          setQrModalOpen(true);
                        }}
                        className="btn-near-secondary px-2.5 py-1 text-[11px]"
                      >
                        <ScanLine className="w-3.5 h-3.5 text-[#00EC97]" />
                        <span>Scan Product QR to Verify TIN</span>
                      </button>
                    </div>
                    <input
                      id="verify-tin"
                      type="text"
                      value={verifiedReturnTin}
                      onChange={(e) => setVerifiedReturnTin(e.target.value)}
                      className="w-full px-3 py-1.5 font-mono bg-[#121B2C] border border-slate-700 rounded text-[#00EC97]"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busy || !isLender}
                    onClick={() =>
                      callBookingAction(
                        'confirm-return',
                        {
                          callerWallet: connectedWallet,
                          verifiedTinOrSerial: verifiedReturnTin.trim(),
                        },
                        'Safe return & matching TIN confirmed! Rental fee released to lender and 100% of collateral refunded to borrower.'
                      )
                    }
                    className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
                      isLender
                        ? 'bg-[#34D399] text-[#0B1020] hover:bg-[#34D399]/90'
                        : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Confirm Safe Return &amp; Release Escrow (Lender: {booking.lender})
                  </button>
                </div>
              )}
            </div>

            <p className="text-[11px] text-[#A4B0C4]">
              Locked collateral (<strong className="text-[#F3F6FC]">{booking.collateralNear} NEAR</strong>) cannot be touched by either party until return is confirmed or the BorrowBond Team resolves a dispute.
            </p>
          </div>

          {/* Physical Condition Record & Supporting Evidence Upload */}
          <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#5EEAD4]" />
                <h2 className="text-sm font-bold font-display text-[#F3F6FC]">
                  Condition Evidence &amp; SHA-256 Hashes ({booking.evidence.length})
                </h2>
              </div>
              <span className="text-[11px] text-[#A4B0C4]">On-chain hash audit trail</span>
            </div>

            <div className="space-y-2.5">
              {booking.evidence.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-lg bg-[#0B1020] border border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#5EEAD4]">{ev.stage}</span>
                    <span className="font-mono text-[11px] text-[#A4B0C4]">
                      By {ev.uploaderWallet} · {new Date(ev.timestampIso).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[#F3F6FC]">{ev.conditionNotes}</p>
                  <div className="text-[11px] font-mono text-[#A4B0C4] truncate">
                    File: {ev.fileReference} · SHA-256: {ev.contentSha256Hash}
                  </div>
                </div>
              ))}
            </div>

            {(isBorrower || isLender) && (
              <form onSubmit={handleUploadEvidence} className="pt-3 border-t border-slate-800 space-y-3 text-xs">
                <h3 className="font-semibold text-[#F3F6FC]">Log Condition Evidence</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ev-stage" className="block text-[#A4B0C4] mb-1">Stage</label>
                    <select
                      id="ev-stage"
                      value={evidenceStage}
                      onChange={(e) => setEvidenceStage(e.target.value as typeof evidenceStage)}
                      className="w-full px-3 py-2 bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
                    >
                      <option value="HANDOVER_BEFORE">Before Handover Inspection</option>
                      <option value="RETURN_AFTER">Return Condition Inspection</option>
                      <option value="DISPUTE_EVIDENCE">Dispute Supporting Evidence</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ev-file" className="block text-[#A4B0C4] mb-1">Photograph / File Reference</label>
                    <input
                      id="ev-file"
                      type="text"
                      value={evidenceFileRef}
                      onChange={(e) => setEvidenceFileRef(e.target.value)}
                      className="w-full px-3 py-2 font-mono bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="ev-notes" className="block text-[#A4B0C4] mb-1">Condition Notes *</label>
                  <input
                    id="ev-notes"
                    type="text"
                    value={evidenceNotes}
                    onChange={(e) => setEvidenceNotes(e.target.value)}
                    placeholder="Verified TIN serial and inspected body..."
                    className="w-full px-3 py-2 bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#172338] text-[#F3F6FC] border border-slate-700 hover:border-[#5EEAD4] flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Record Condition Evidence</span>
                </button>
              </form>
            )}
          </div>

          {/* Mutual Damage Settlement & BorrowBond Team Arbitration Panel */}
          {(booking.status === 'ACTIVE' ||
            booking.status === 'RETURN_REQUESTED' ||
            booking.status === 'DISPUTED' ||
            booking.status === 'RESOLVED') && (
            <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#FBBF24]" />
                  <h2 className="text-sm font-bold font-display text-[#F3F6FC]">
                    Damage Settlement Negotiation &amp; Arbitration
                  </h2>
                </div>
                <span className="text-xs font-mono text-[#A4B0C4]">
                  Arbiter: {designatedResolver}
                </span>
              </div>

              {/* 48-Hour Post-Return Lender Response Window */}
              {booking.status === 'RETURN_REQUESTED' && booking.lenderResponseDeadlineIso && (
                <div className="p-3.5 rounded-lg bg-[#0B1020] border border-[#5EEAD4]/40 text-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <strong className="text-[#5EEAD4] block">
                      48-Hour Post-Return Lender Inspection Window Active
                    </strong>
                    <span className="text-[#A4B0C4]">
                      Lender deadline: {new Date(booking.lenderResponseDeadlineIso).toUTCString()}. If uncontested after 48h, anyone can finalize return on-chain (`finalize_uncontested_return`).
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      callBookingAction(
                        'finalize-uncontested-return',
                        { callerWallet: connectedWallet },
                        '48-hour uncontested return finalized on-chain! Rental fee credited to lender and net collateral refunded to borrower.'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#172338] border border-[#5EEAD4]/50 text-[#5EEAD4] hover:bg-[#5EEAD4]/15 font-semibold cursor-pointer"
                  >
                    Finalize Uncontested Return (48h)
                  </button>
                </div>
              )}

              {/* Two-Party Mutual Damage Proposal & Counterparty Acceptance */}
              {(booking.status === 'ACTIVE' ||
                booking.status === 'RETURN_REQUESTED' ||
                booking.status === 'DISPUTED') && (
                <div className="p-4 rounded-lg bg-[#0B1020] border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-[#F3F6FC]">
                      Two-Party Mutual Damage Settlement (`propose_damage_settlement` / `accept_damage_proposal`)
                    </strong>
                    <span className="font-mono text-[11px] text-[#5EEAD4]">
                      Counterparty Signature Required
                    </span>
                  </div>
                  <p className="text-[#A4B0C4]">
                    Neither party can unilaterally deduct collateral. Either borrower or lender may propose a damage deduction capped at <code className="font-mono text-[#F3F6FC]">collateral - 1% platform fee</code>, which only executes if the counterparty explicitly signs and accepts.
                  </p>

                  {booking.damageProposal && booking.damageProposal.status === 'PENDING' ? (
                    <div className="p-3 rounded-lg bg-[#121B2C] border border-[#FBBF24]/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#FBBF24]">
                          Pending Damage Proposal: {booking.damageProposal.proposedDamageNear} NEAR
                        </span>
                        <span className="font-mono text-[11px] text-[#A4B0C4]">
                          Proposed by {booking.damageProposal.proposedByWallet}
                        </span>
                      </div>
                      <p className="text-[#F3F6FC]">&ldquo;{booking.damageProposal.reason}&rdquo;</p>
                      {(isBorrower || isLender) && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {connectedWallet !== booking.damageProposal.proposedByWallet && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                callBookingAction(
                                  'accept-damage',
                                  { callerWallet: connectedWallet },
                                  `Mutual damage proposal (${booking.damageProposal?.proposedDamageNear} NEAR) accepted by ${connectedWallet} and settled on-chain!`
                                )
                              }
                              className="px-3.5 py-1.5 rounded-lg bg-[#00EC97] text-[#04080E] font-semibold cursor-pointer"
                            >
                              Sign &amp; Accept Proposal ({booking.damageProposal.proposedDamageNear} NEAR)
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              callBookingAction(
                                'reject-damage',
                                {
                                  callerWallet: connectedWallet,
                                  rejectionReason: 'Counterparty declined proposed damage amount.',
                                },
                                'Damage proposal rejected.'
                              )
                            }
                            className="px-3.5 py-1.5 rounded-lg bg-[#F87171]/15 border border-[#F87171]/40 text-[#F87171] font-semibold cursor-pointer"
                          >
                            Reject Proposal
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    (isBorrower || isLender) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={booking.collateralNear}
                          value={damageDeductionNear}
                          onChange={(e) => setDamageDeductionNear(e.target.value)}
                          className="w-28 px-2.5 py-1.5 font-mono bg-[#121B2C] border border-slate-700 rounded text-[#F3F6FC]"
                          aria-label="Proposed damage amount in NEAR"
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            callBookingAction(
                              'propose-damage',
                              {
                                callerWallet: connectedWallet,
                                proposedDamageNear: parsedDamage,
                                reason:
                                  disputeReason.trim() ||
                                  `Proposed mutual damage settlement of ${parsedDamage} NEAR based on return condition inspection.`,
                              },
                              `Proposed ${parsedDamage} NEAR mutual damage settlement. Waiting for counterparty wallet signature.`
                            )
                          }
                          className="px-3.5 py-1.5 rounded-lg bg-[#172338] border border-[#5EEAD4]/50 text-[#5EEAD4] hover:bg-[#5EEAD4]/15 font-semibold cursor-pointer"
                        >
                          Propose {parsedDamage} NEAR Mutual Damage Settlement
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}

              {(booking.status === 'ACTIVE' || booking.status === 'RETURN_REQUESTED') && (
                <form onSubmit={handleOpenDispute} className="space-y-3 text-xs">
                  <p className="text-[#A4B0C4]">
                    If the item is damaged, swapped, or unreturned after the deadline, open a dispute so the BorrowBond Team can review with both parties and deduct repair costs from the locked <strong className="text-[#F3F6FC]">{booking.collateralNear} NEAR</strong> collateral.
                  </p>
                  <input
                    type="text"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="Describe damage or serial mismatch for BorrowBond Team review..."
                    className="w-full px-3 py-2 bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#F87171]/15 text-[#F87171] border border-[#F87171]/40 hover:bg-[#F87171]/25 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Open Dispute &amp; Freeze Escrow</span>
                  </button>
                </form>
              )}

              {booking.status === 'DISPUTED' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-[#F87171]/10 border border-[#F87171]/30 text-[#F3F6FC] space-y-1">
                    <div className="font-semibold text-[#F87171]">
                      Dispute OPEN — {booking.totalEscrowedNear} NEAR Locked in Escrow
                    </div>
                    <p className="text-[#A4B0C4]">
                      Opened by <code className="font-mono">{booking.dispute?.openedByWallet}</code>: &ldquo;{booking.dispute?.reason}&rdquo;
                    </p>
                  </div>

                  {/* Side-by-Side Before Handover vs. After Return Evidence Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-[#0B1020] border border-slate-800 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#00EC97] block">
                        Before Handover Evidence
                      </span>
                      {booking.evidence.find((e) => e.stage === 'HANDOVER_BEFORE') ? (
                        <>
                          <p className="text-[#F3F6FC] font-medium">
                            {booking.evidence.find((e) => e.stage === 'HANDOVER_BEFORE')?.conditionNotes}
                          </p>
                          <div className="text-[10px] font-mono text-[#A4B0C4] truncate">
                            File: {booking.evidence.find((e) => e.stage === 'HANDOVER_BEFORE')?.fileReference}
                          </div>
                        </>
                      ) : (
                        <p className="text-[#A4B0C4]">
                          Baseline TIN Registry: {booking.productIdentity?.tinOrSerialNumber || 'Verified clean at pickup'}
                        </p>
                      )}
                    </div>
                    <div className="p-3 rounded-lg bg-[#0B1020] border border-[#FBBF24]/40 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#FBBF24] block">
                        Return / Dispute Evidence
                      </span>
                      {booking.evidence.find((e) => e.stage !== 'HANDOVER_BEFORE') ? (
                        <>
                          <p className="text-[#F3F6FC] font-medium">
                            {booking.evidence.find((e) => e.stage !== 'HANDOVER_BEFORE')?.conditionNotes}
                          </p>
                          <div className="text-[10px] font-mono text-[#A4B0C4] truncate">
                            File: {booking.evidence.find((e) => e.stage !== 'HANDOVER_BEFORE')?.fileReference}
                          </div>
                        </>
                      ) : (
                        <p className="text-[#F3F6FC]">
                          Claim: &ldquo;{booking.dispute?.reason || 'Pending post-return inspection notes'}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* BorrowBond Team Damage Deduction Calculator */}
                  <form onSubmit={handleResolveDispute} className="p-4 rounded-lg bg-[#0B1020] border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#F3F6FC]">
                        BorrowBond Team Damage Deduction (`resolve_dispute_with_damage_deduction`)
                      </span>
                      <span className="font-mono text-[11px] text-[#00EC97]">
                        Total Locked: {booking.totalEscrowedNear} NEAR
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="res-damage" className="block text-[#FBBF24] font-semibold mb-1">
                          Assessed Damage Cost (NEAR)
                        </label>
                        <input
                          id="res-damage"
                          type="number"
                          step="0.01"
                          min="0"
                          max={booking.collateralNear}
                          value={damageDeductionNear}
                          onChange={(e) => setDamageDeductionNear(e.target.value)}
                          className="w-full px-3 py-1.5 font-mono bg-[#121B2C] border border-[#FBBF24]/50 rounded text-[#F3F6FC]"
                        />
                      </div>
                      <div>
                        <span className="block text-[#A4B0C4] mb-1">
                          Lender Payout (Fee + Damage)
                        </span>
                        <div className="px-3 py-1.5 font-mono font-bold bg-[#121B2C] border border-slate-800 rounded text-[#00EC97]">
                          {calculatedLenderPayout} NEAR
                        </div>
                      </div>
                      <div>
                        <span className="block text-[#A4B0C4] mb-1">
                          Borrower Refund (Left Collateral)
                        </span>
                        <div className="px-3 py-1.5 font-mono font-bold bg-[#121B2C] border border-slate-800 rounded text-[#5EEAD4]">
                          {calculatedBorrowerRefund} NEAR
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="res-notes" className="block text-[#A4B0C4] mb-1">
                        BorrowBond Team Decision Notes
                      </label>
                      <input
                        id="res-notes"
                        type="text"
                        value={resolverOutcomeNotes}
                        onChange={(e) => setResolverOutcomeNotes(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#121B2C] border border-slate-700 rounded text-[#F3F6FC]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={busy || !isResolver}
                      className={`w-full py-2.5 px-4 font-semibold rounded-lg cursor-pointer ${
                        isResolver
                          ? 'bg-[#00EC97] text-[#04080E] hover:bg-[#00EC97]/90'
                          : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isResolver
                        ? `Confirm Deal: Send ${calculatedLenderPayout} NEAR to Lender & Refund ${calculatedBorrowerRefund} NEAR to Borrower`
                        : `Switch Wallet to ${designatedResolver} to Resolve`}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 5 Columns: Payment Breakdown & Chronological Event Timeline */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-3 text-xs">
            <h2 className="text-sm font-bold font-display text-[#F3F6FC]">
              Escrow Accounting Summary
            </h2>
            <div className="flex justify-between py-1">
              <span className="text-[#A4B0C4]">Agreed Rental Fee</span>
              <span className="font-mono font-semibold text-[#F3F6FC] tabular-nums">
                {booking.rentalFeeNear} NEAR
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#A4B0C4]">Refundable Collateral</span>
              <span className="font-mono font-semibold text-[#5EEAD4] tabular-nums">
                {booking.collateralNear} NEAR
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#A4B0C4]">
                Platform Fee Snapshot ({typeof booking.feeBpsSnapshot === 'number' ? booking.feeBpsSnapshot / 100 : 1}% of Collateral on Active Completion)
              </span>
              <span className="font-mono text-[#A4B0C4] tabular-nums">
                {booking.platformFeeNear ?? Number((booking.collateralNear * 0.01).toFixed(4))} NEAR
              </span>
            </div>
            <div className="flex justify-between py-1 border-t border-slate-800 pt-2">
              <span className="text-[#F3F6FC] font-semibold">Currently Locked in Contract</span>
              <span className="font-mono font-bold text-[#F3F6FC] tabular-nums">
                {booking.totalEscrowedNear} NEAR
              </span>
            </div>

            {booking.settlement && (
              <div className="mt-3 p-3.5 rounded-lg bg-[#0B1020] border border-[#34D399]/40 space-y-1">
                <span className="text-[#34D399] font-semibold block">
                  Final Settlement Recorded on NEAR Testnet
                </span>
                <div className="flex justify-between font-mono">
                  <span>Lender Credited:</span>
                  <span>{booking.settlement.lenderPayoutNear} NEAR</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>Borrower Refunded:</span>
                  <span>{booking.settlement.borrowerRefundNear} NEAR</span>
                </div>
                {typeof booking.settlement.platformFeeNear === 'number' &&
                  booking.settlement.platformFeeNear > 0 && (
                    <div className="flex justify-between font-mono text-[#5EEAD4]">
                      <span>Treasury Fee (treasury.borrowbond.testnet):</span>
                      <span>{booking.settlement.platformFeeNear} NEAR</span>
                    </div>
                  )}
                {typeof booking.settlement.damageDeductionNear === 'number' &&
                  booking.settlement.damageDeductionNear > 0 && (
                    <div className="flex justify-between font-mono text-[#FBBF24]">
                      <span>Deducted Damage Cost:</span>
                      <span>{booking.settlement.damageDeductionNear} NEAR</span>
                    </div>
                  )}
                <p className="text-[11px] text-[#A4B0C4] pt-1">
                  {booking.settlement.resolutionNote}
                </p>
              </div>
            )}
          </div>

          {/* Reputation Review & Rating Component for Completed Transactions */}
          {(booking.status === 'COMPLETED' || booking.status === 'RESOLVED') && (
            <div className="bg-[#121B2C] border border-[#00EC97]/30 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#FBBF24]" />
                  <h2 className="text-sm font-bold font-display text-[#F3F6FC]">
                    Agreement Review &amp; Reputation
                  </h2>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#00EC97]/15 text-[#00EC97] font-bold">
                  Verified Completion
                </span>
              </div>

              {booking.review ? (
                <div className="p-4 rounded-xl bg-[#0B1020] border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= booking.review!.rating
                              ? 'text-[#FBBF24] fill-[#FBBF24]'
                              : 'text-slate-600'
                          }`}
                        />
                      ))}
                      <span className="font-mono font-bold text-[#F3F6FC] ml-1">
                        {booking.review.rating}.0 / 5.0
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-[#A4B0C4]">
                      {new Date(booking.review.createdAtIso).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-[#F3F6FC] italic leading-relaxed">
                    &ldquo;{booking.review.comment || 'Verified agreement completed satisfactorily.'}&rdquo;
                  </p>

                  {booking.review.tags && booking.review.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {booking.review.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full text-[10px] bg-[#172338] text-[#5EEAD4] border border-slate-700 font-mono"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-[#A4B0C4] font-mono">
                    <span>By: {booking.review.reviewerWallet} ({booking.review.reviewerRole})</span>
                    <span>For: {booking.review.revieweeWallet}</span>
                  </div>
                </div>
              ) : isBorrower || isLender ? (
                <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
                  <p className="text-[#A4B0C4]">
                    Rate your experience with{' '}
                    <strong className="text-[#F3F6FC]">
                      {isBorrower ? `Lender (${booking.lender})` : `Borrower (${booking.borrower})`}
                    </strong>{' '}
                    to build on-chain trust and marketplace reputation.
                  </p>

                  <div>
                    <label className="block text-[#A4B0C4] mb-1.5 font-medium">
                      Select Rating (1 to 5 Stars):
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingScore(star)}
                          className="p-1 rounded hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              star <= ratingScore
                                ? 'text-[#FBBF24] fill-[#FBBF24]'
                                : 'text-slate-600 hover:text-amber-300'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="font-mono font-bold text-[#FBBF24] text-sm ml-2">
                        {ratingScore} / 5 Stars
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#A4B0C4] mb-1.5 font-medium">
                      Reputation Highlights:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Punctual Handover',
                        'Flawless Condition',
                        'Original Serial Verified',
                        'Smooth Communication',
                        'Safe Return',
                        'Great Provider',
                      ].map((tag) => {
                        const isSelected = selectedReviewTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleReviewTag(tag)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-[#00EC97]/20 border-[#00EC97] text-[#00EC97]'
                                : 'bg-[#0B1020] border-slate-800 text-[#A4B0C4] hover:border-slate-700'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="rev-comment" className="block text-[#A4B0C4] mb-1 font-medium">
                      Review Comment:
                    </label>
                    <textarea
                      id="rev-comment"
                      rows={2}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share condition, promptness, and handover experience..."
                      className="w-full px-3 py-2 bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC] placeholder:text-slate-600 focus:border-[#00EC97] outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full py-2.5 px-4 font-semibold rounded-lg bg-[#00EC97] text-[#04080E] hover:bg-[#00EC97]/90 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00EC97]/10"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>
                      {submittingReview ? 'Publishing Review...' : 'Publish Verified Review to Escrow'}
                    </span>
                  </button>
                </form>
              ) : (
                <div className="p-3.5 rounded-lg bg-[#0B1020] border border-slate-800 text-xs text-[#A4B0C4]">
                  Awaiting review publication by {booking.borrower} or {booking.lender}.
                </div>
              )}
            </div>
          )}

          {/* Transaction Timeline */}
          <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-bold font-display text-[#F3F6FC]">
              Verifiable Agreement Timeline
            </h2>
            <div className="space-y-4">
              {booking.timeline.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-lg bg-[#0B1020] border border-slate-800/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#F3F6FC]">{evt.title}</span>
                    <span className="font-mono text-[11px] text-[#5EEAD4]">{evt.status}</span>
                  </div>
                  <p className="text-[#A4B0C4] leading-relaxed">{evt.detail}</p>
                  <div className="text-[11px] font-mono text-[#A4B0C4] pt-1 flex justify-between">
                    <span>Actor: {evt.actor}</span>
                    <span>{new Date(evt.timestampIso).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ProductQrScannerModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        mode={qrModalMode}
        title="Scan Product QR to Verify Anti-Scam TIN & Handover"
        subtitle="Scan the BorrowBond QR tag or serial sticker on the returned/handed-over item to verify it matches the on-chain agreement."
        activeProductTag={{
          listingId: booking.listingId,
          title: booking.listingTitle,
          brandAndModel: booking.productIdentity?.brandAndModel || booking.listingTitle,
          tinOrSerialNumber:
            booking.productIdentity?.tinOrSerialNumber || 'TIN-SONY-A7IV-884120',
          resourceType: booking.resourceType,
          oneTimeHandoverCode: booking.oneTimeHandoverCode,
          contractAddress: booking.contractAddress,
        }}
        onScanSuccess={(scanned: ScannedProductQrPayload) => {
          setVerifiedReturnTin(scanned.tinOrSerialNumber);
          setEvidenceNotes(
            `Scanned & verified Product QR Tag: ${scanned.brandAndModel} (${scanned.tinOrSerialNumber})`
          );
          setActionSuccess(
            `Product QR Code Scanned & Verified: ${scanned.brandAndModel} — TIN/Serial [${scanned.tinOrSerialNumber}] matches BorrowBond Anti-Scam Registry!`
          );
          setActionError(null);
        }}
      />
    </div>
  );
};
