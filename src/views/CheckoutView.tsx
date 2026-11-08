import React, { useState } from 'react';
import { Lock, ShieldCheck, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import type { MarketplaceListing } from '../lib/security/policyEngine';
import { formatYoctoNear } from '../lib/near/escrowStateMachine';

interface CheckoutViewProps {
  listing: MarketplaceListing;
  durationCount: number;
  connectedWallet: string;
  contractAddress: string;
  onBack: () => void;
  onConfirmAndSignEscrow: (params: {
    listingId: string;
    durationCount: number;
    explicitUserApproval: boolean;
  }) => Promise<void>;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  listing,
  durationCount,
  connectedWallet,
  contractAddress,
  onBack,
  onConfirmAndSignEscrow,
}) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signing, setSigning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const ratio = Math.max(1, durationCount) / Math.max(1, listing.exampleDuration);
  const rentalFeeNear = Number((listing.rentalFeeNear * ratio).toFixed(4));
  const collateralNear = listing.collateralNear;
  const totalRequiredNear = Number((rentalFeeNear + collateralNear).toFixed(4));

  const durationMs =
    listing.durationUnit === 'HOURS'
      ? durationCount * 3600 * 1000
      : durationCount * 24 * 3600 * 1000;
  const expectedReturnIso = new Date(Date.now() + durationMs).toISOString();

  const handleSignTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setErrorMsg('You must explicitly accept the borrowing agreement and escrow settlement rules before signing.');
      return;
    }
    setErrorMsg(null);
    setSigning(true);
    try {
      await onConfirmAndSignEscrow({
        listingId: listing.id,
        durationCount,
        explicitUserApproval: true,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Transaction signing failed');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-medium text-[#A4B0C4] hover:text-[#F3F6FC] flex items-center gap-1.5 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Listing</span>
      </button>

      <div className="bg-[#172338] border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#5EEAD4]">Explicit Human Wallet Authorization</span>
            <h1 className="text-2xl font-bold font-display text-[#F3F6FC] mt-0.5">
              Borrowing Agreement Checkout
            </h1>
          </div>
          <Lock className="w-6 h-6 text-[#5EEAD4]" />
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 rounded-lg bg-[#F87171]/10 border border-[#F87171]/40 text-xs text-[#F87171] flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Resource & Parties Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-[#121B2C] border border-slate-800 rounded-lg p-4">
          <div className="space-y-1">
            <span className="text-[#A4B0C4] block">Selected Resource</span>
            <strong className="text-[#F3F6FC] text-sm block">{listing.title}</strong>
            <span className="text-[#A4B0C4]">{listing.resourceType} · {listing.category}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[#A4B0C4] block">Counterparties & Network</span>
            <div>Provider: <code className="font-mono text-[#F3F6FC]">{listing.ownerWallet}</code></div>
            <div>Borrower: <code className="font-mono text-[#5EEAD4]">{connectedWallet}</code></div>
            <div>Contract: <code className="font-mono text-[#A4B0C4]">{contractAddress}</code> (testnet)</div>
          </div>
        </div>

        {/* Payment & Escrow Breakdown */}
        <div className="bg-[#0B1020] border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
          <h2 className="text-xs font-semibold text-[#F3F6FC] uppercase tracking-wider">
            Escrow Deposit Breakdown
          </h2>

          <div className="flex justify-between items-center py-1">
            <span className="text-[#A4B0C4]">
              Rental Duration
            </span>
            <span className="font-mono text-[#F3F6FC] tabular-nums">
              {durationCount} {listing.durationUnit.toLowerCase()} (Expected Return/Expiry: {new Date(expectedReturnIso).toLocaleDateString()})
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-[#A4B0C4]">Rental Fee (Settled to provider upon completion)</span>
            <span className="font-mono font-semibold text-[#F3F6FC] tabular-nums">
              {rentalFeeNear} NEAR
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-[#A4B0C4]">Refundable Collateral (Returned to you upon satisfactory return)</span>
            <span className="font-mono font-semibold text-[#5EEAD4] tabular-nums">
              {collateralNear} NEAR
            </span>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm">
            <span className="font-bold text-[#F3F6FC]">Total Attached Deposit (`create_booking`)</span>
            <div className="text-right">
              <span className="font-mono font-bold text-[#5EEAD4] tabular-nums block">
                {totalRequiredNear} testnet NEAR
              </span>
              <span className="text-[11px] font-mono text-[#A4B0C4] tabular-nums">
                ({formatYoctoNear(totalRequiredNear)} yoctoNEAR)
              </span>
            </div>
          </div>
        </div>

        {/* Settlement, Cancellation & Dispute Rules */}
        <div className="space-y-2.5 text-xs text-[#A4B0C4] bg-[#121B2C] border border-slate-800 rounded-lg p-4">
          <div>
            <strong className="text-[#F3F6FC]">Cancellation Rules: </strong>
            {listing.cancellationPolicy}
          </div>
          <div>
            <strong className="text-[#F3F6FC]">Dispute & Collateral Protection: </strong>
            Either party may open a dispute while the booking is ACTIVE or RETURN_REQUESTED, freezing the {totalRequiredNear} NEAR deposit for review by the designated human resolver (<code className="font-mono text-[#F3F6FC]">resolver.borrowbond.testnet</code>). Collateral is never automatically confiscated solely because a deadline passed.
          </div>
        </div>

        {/* Explicit User Acceptance Checkbox */}
        <form onSubmit={handleSignTransaction} className="space-y-4 pt-2">
          <label className="flex items-start gap-3 text-xs text-[#F3F6FC] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 rounded accent-[#5EEAD4]"
            />
            <span className="leading-relaxed">
              I explicitly approve locking <strong className="font-mono">{rentalFeeNear} NEAR</strong> rental fee plus <strong className="font-mono text-[#5EEAD4]">{collateralNear} NEAR</strong> refundable collateral (<strong className="font-mono">{totalRequiredNear} testnet NEAR</strong> total) in the BorrowBond NEAR testnet escrow smart contract (<code className="font-mono">{contractAddress}</code>).
            </span>
          </label>

          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 text-xs font-medium text-[#A4B0C4] hover:text-[#F3F6FC] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={signing}
              className="px-6 py-3 text-xs font-semibold rounded-lg bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {signing
                  ? 'Signing NEAR Testnet Escrow Transaction...'
                  : `Approve & Sign (${totalRequiredNear} NEAR)`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
