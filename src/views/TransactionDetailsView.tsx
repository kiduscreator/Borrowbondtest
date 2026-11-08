import React, { useState } from 'react';
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
} from 'lucide-react';
import type { OnChainBooking } from '../lib/near/escrowStateMachine';

interface TransactionDetailsViewProps {
  booking: OnChainBooking;
  connectedWallet: string;
  designatedResolver: string;
  onBack: () => void;
  onRefreshState: () => Promise<void>;
}

export const TransactionDetailsView: React.FC<TransactionDetailsViewProps> = ({
  booking,
  connectedWallet,
  designatedResolver,
  onBack,
  onRefreshState,
}) => {
  const [evidenceStage, setEvidenceStage] = useState<
    'HANDOVER_BEFORE' | 'RETURN_AFTER' | 'DISPUTE_EVIDENCE'
  >('HANDOVER_BEFORE');
  const [evidenceFileRef, setEvidenceFileRef] = useState('camera_condition_inspection.jpg');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [resolverLenderPayout, setResolverLenderPayout] = useState(String(booking.rentalFeeNear));
  const [resolverBorrowerRefund, setResolverBorrowerRefund] = useState(
    String(booking.collateralNear)
  );
  const [resolverOutcomeNotes, setResolverOutcomeNotes] = useState(
    'Inspected uploaded before/after condition evidence hashes. Settling rental fee to lender and refunding collateral to borrower.'
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isLender = connectedWallet === booking.lender;
  const isBorrower = connectedWallet === booking.borrower;
  const isResolver = connectedWallet === designatedResolver;

  const callBookingAction = async (endpoint: string, payload: Record<string, unknown>, successMsg: string) => {
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
      'Supporting condition evidence uploaded and SHA-256 hash recorded on agreement.'
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
      'Dispute opened. Escrowed collateral and fee are now frozen pending review by the designated human resolver.'
    );
    setDisputeReason('');
  };

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    await callBookingAction(
      'resolve',
      {
        callerWallet: connectedWallet,
        lenderPayoutNear: parseFloat(resolverLenderPayout) || 0,
        borrowerRefundNear: parseFloat(resolverBorrowerRefund) || 0,
        outcomeNotes: resolverOutcomeNotes,
      },
      'Dispute resolved by designated resolver and funds credited to claimable balances.'
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
              Demo State Record · Contract Account:{' '}
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
        {/* Left 7 Columns: State Actions, Physical Evidence & Dispute Resolution */}
        <div className="lg:col-span-7 space-y-6">
          {/* Available Contract State Transition Controls */}
          <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-bold font-display text-[#F3F6FC]">
              Programmable Escrow State Machine Controls
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
                      Cancel Booking & Refund Deposit
                    </button>
                  )}
                </>
              )}

              {booking.status === 'ACCEPTED' && booking.resourceType === 'PHYSICAL' && (
                <div className="w-full space-y-3">
                  <div className="p-3.5 rounded-lg bg-[#0B1020] border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-[#5EEAD4]" />
                      <span>One-Time Handover Verification Code:</span>
                    </div>
                    <code className="font-mono font-bold text-[#5EEAD4] text-sm">
                      {booking.oneTimeHandoverCode}
                    </code>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={busy || (!isLender && !isBorrower)}
                      onClick={() =>
                        callBookingAction(
                          'handover',
                          { callerWallet: connectedWallet },
                          `Handover confirmed by ${connectedWallet}.`
                        )
                      }
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90 cursor-pointer"
                    >
                      Confirm Physical Handover ({connectedWallet})
                    </button>
                    <span className="text-xs text-[#A4B0C4]">
                      Lender Confirmed: {booking.lenderHandoverConfirmed ? 'Yes' : 'Pending'} · Borrower Confirmed:{' '}
                      {booking.borrowerHandoverConfirmed ? 'Yes' : 'Pending'}
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
                          'Return requested by borrower. Awaiting lender inspection confirmation.'
                        )
                      }
                      className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
                        isBorrower
                          ? 'bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90'
                          : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      Request Item Return (Borrower: {booking.borrower})
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
                          `Completion confirmed by ${connectedWallet}.`
                        )
                      }
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90 cursor-pointer"
                    >
                      Confirm Digital Agreement Completion ({connectedWallet})
                    </button>
                  )}
                </>
              )}

              {booking.status === 'RETURN_REQUESTED' && (
                <button
                  type="button"
                  disabled={busy || !isLender}
                  onClick={() =>
                    callBookingAction(
                      'confirm-return',
                      { callerWallet: connectedWallet },
                      'Satisfactory return confirmed! Rental fee settled to lender and collateral refunded to borrower.'
                    )
                  }
                  className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
                    isLender
                      ? 'bg-[#34D399] text-[#0B1020] hover:bg-[#34D399]/90'
                      : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Confirm Satisfactory Return & Settle Escrow (Lender: {booking.lender})
                </button>
              )}
            </div>

            <p className="text-[11px] text-[#A4B0C4]">
              Tip: To test both sides of a physical handover or return in this preview, use the wallet button in the top navigation bar to switch between Borrower (<code className="font-mono text-[#F3F6FC]">{booking.borrower}</code>), Lender (<code className="font-mono text-[#F3F6FC]">{booking.lender}</code>), and Resolver (<code className="font-mono text-[#F3F6FC]">{designatedResolver}</code>).
            </p>
          </div>

          {/* Physical Condition Record & Supporting Evidence Upload */}
          <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#5EEAD4]" />
                <h2 className="text-sm font-bold font-display text-[#F3F6FC]">
                  Condition Evidence & Content Hashes ({booking.evidence.length})
                </h2>
              </div>
              <span className="text-[11px] text-[#A4B0C4]">Supporting off-chain evidence + SHA-256 hash</span>
            </div>

            <p className="text-xs text-[#A4B0C4]">
              Note: Photographs, condition notes, and one-time confirmation codes serve as supporting evidence for both parties and the human dispute resolver; they do not by themselves prove physical non-damage.
            </p>

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
                <h3 className="font-semibold text-[#F3F6FC]">Log New Condition Evidence</h3>
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
                  <label htmlFor="ev-notes" className="block text-[#A4B0C4] mb-1">Condition Inspection Notes *</label>
                  <input
                    id="ev-notes"
                    type="text"
                    value={evidenceNotes}
                    onChange={(e) => setEvidenceNotes(e.target.value)}
                    placeholder="e.g., Returned camera body and 24-70mm lens inspected, zero scratches..."
                    className="w-full px-3 py-2 bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#172338] text-[#F3F6FC] border border-slate-700 hover:border-[#5EEAD4] flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Record Condition Evidence & Hash</span>
                </button>
              </form>
            )}
          </div>

          {/* Dispute & Designated Human Resolver Panel */}
          {(booking.status === 'ACTIVE' ||
            booking.status === 'RETURN_REQUESTED' ||
            booking.status === 'DISPUTED' ||
            booking.status === 'RESOLVED') && (
            <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#FBBF24]" />
                  <h2 className="text-sm font-bold font-display text-[#F3F6FC]">
                    Dispute Protection & Human Resolver Arbitration
                  </h2>
                </div>
                <span className="text-xs font-mono text-[#A4B0C4]">
                  Resolver: {designatedResolver}
                </span>
              </div>

              {(booking.status === 'ACTIVE' || booking.status === 'RETURN_REQUESTED') && (
                <form onSubmit={handleOpenDispute} className="space-y-3 text-xs">
                  <p className="text-[#A4B0C4]">
                    If the resource is damaged, missing, or violates agreement terms, either party can open a dispute to freeze the <strong className="text-[#F3F6FC]">{booking.totalEscrowedNear} NEAR</strong> escrow deposit.
                  </p>
                  <input
                    type="text"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="Describe the issue requiring resolver review..."
                    className="w-full px-3 py-2 bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#F87171]/15 text-[#F87171] border border-[#F87171]/40 hover:bg-[#F87171]/25 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Open Dispute & Freeze Escrow</span>
                  </button>
                </form>
              )}

              {booking.status === 'DISPUTED' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-[#F87171]/10 border border-[#F87171]/30 text-[#F3F6FC] space-y-1">
                    <div className="font-semibold text-[#F87171]">
                      Dispute OPEN — {booking.totalEscrowedNear} NEAR Frozen in Escrow
                    </div>
                    <p className="text-[#A4B0C4]">
                      Opened by <code className="font-mono">{booking.dispute?.openedByWallet}</code>: &ldquo;{booking.dispute?.reason}&rdquo;
                    </p>
                  </div>

                  {/* Designated Human Resolver Controls */}
                  <form onSubmit={handleResolveDispute} className="p-4 rounded-lg bg-[#0B1020] border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#F3F6FC]">
                        Designated Human Resolver Allocation (`resolve_dispute`)
                      </span>
                      <span className="font-mono text-[11px] text-[#5EEAD4]">
                        Must total {booking.totalEscrowedNear} NEAR
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="res-lender" className="block text-[#A4B0C4] mb-1">
                          Lender Payout (NEAR)
                        </label>
                        <input
                          id="res-lender"
                          type="number"
                          step="0.01"
                          value={resolverLenderPayout}
                          onChange={(e) => setResolverLenderPayout(e.target.value)}
                          className="w-full px-3 py-1.5 font-mono bg-[#121B2C] border border-slate-700 rounded text-[#F3F6FC]"
                        />
                      </div>
                      <div>
                        <label htmlFor="res-borrower" className="block text-[#A4B0C4] mb-1">
                          Borrower Refund (NEAR)
                        </label>
                        <input
                          id="res-borrower"
                          type="number"
                          step="0.01"
                          value={resolverBorrowerRefund}
                          onChange={(e) => setResolverBorrowerRefund(e.target.value)}
                          className="w-full px-3 py-1.5 font-mono bg-[#121B2C] border border-slate-700 rounded text-[#5EEAD4]"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="res-notes" className="block text-[#A4B0C4] mb-1">
                        Published Resolver Decision Notes
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
                      className={`w-full py-2 px-4 font-semibold rounded-lg cursor-pointer ${
                        isResolver
                          ? 'bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90'
                          : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isResolver
                        ? 'Execute Authorized Dispute Resolution'
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
            <div className="flex justify-between py-1 border-t border-slate-800 pt-2">
              <span className="text-[#F3F6FC] font-semibold">Currently Locked in Contract</span>
              <span className="font-mono font-bold text-[#F3F6FC] tabular-nums">
                {booking.totalEscrowedNear} NEAR
              </span>
            </div>

            {booking.settlement && (
              <div className="mt-3 p-3.5 rounded-lg bg-[#0B1020] border border-[#34D399]/40 space-y-1">
                <span className="text-[#34D399] font-semibold block">
                  Final Settlement Recorded
                </span>
                <div className="flex justify-between font-mono">
                  <span>Lender Credited:</span>
                  <span>{booking.settlement.lenderPayoutNear} NEAR</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>Borrower Refunded:</span>
                  <span>{booking.settlement.borrowerRefundNear} NEAR</span>
                </div>
                <p className="text-[11px] text-[#A4B0C4] pt-1">
                  {booking.settlement.resolutionNote}
                </p>
              </div>
            )}
          </div>

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
    </div>
  );
};
