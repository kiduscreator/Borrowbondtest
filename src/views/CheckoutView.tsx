import React, { useState, useMemo } from 'react';
import { Lock, ShieldCheck, AlertCircle, ArrowLeft, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import type { MarketplaceListing } from '../lib/security/policyEngine';
import { formatYoctoNear, DEFAULT_PLATFORM_FEE_BPS } from '../lib/near/escrowStateMachine';
import { buildPreSignatureTransactionSummary } from '../lib/near/walletSelector';
import { EscrowMoneyFlowCard } from '../components/EscrowMoneyFlowCard';

interface CheckoutViewProps {
  listing: MarketplaceListing;
  durationCount: number;
  connectedWallet: string;
  contractAddress: string;
  nearUsdRate?: number;
  onBack: () => void;
  onConfirmAndSignEscrow: (params: {
    listingId: string;
    durationCount: number;
    explicitUserApproval: boolean;
  }) => Promise<void>;
}

type WalletSignStage =
  | 'IDLE'
  | 'AWAITING_WALLET_SIGNATURE'
  | 'BROADCASTING_RPC'
  | 'REJECTED_BY_USER'
  | 'FAILED_RPC';

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  listing,
  durationCount,
  connectedWallet,
  contractAddress,
  nearUsdRate = 3.7,
  onBack,
  onConfirmAndSignEscrow,
}) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signStage, setSignStage] = useState<WalletSignStage>('IDLE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const ratio = Math.max(1, durationCount) / Math.max(1, listing.exampleDuration);
  const rentalFeeNear = Number((listing.rentalFeeNear * ratio).toFixed(4));
  const collateralNear = listing.collateralNear;
  const totalRequiredNear = Number((rentalFeeNear + collateralNear).toFixed(4));

  const startTimestampMs = useMemo(() => Date.now(), []);
  const durationMs =
    listing.durationUnit === 'HOURS'
      ? durationCount * 3600 * 1000
      : durationCount * 24 * 3600 * 1000;
  const expectedReturnIso = new Date(startTimestampMs + durationMs).toISOString();

  const preSignSummary = useMemo(
    () =>
      buildPreSignatureTransactionSummary({
        contractAccount: contractAddress,
        methodName: 'create_booking',
        signerWallet: connectedWallet,
        lenderWallet: listing.ownerWallet,
        listingId: listing.id,
        rentalFeeNear,
        collateralNear,
        platformFeeBps: DEFAULT_PLATFORM_FEE_BPS,
        startTimeIso: new Date(startTimestampMs).toISOString(),
        endTimeIso: expectedReturnIso,
        conditionsText: listing.conditions || listing.cancellationPolicy,
      }),
    [
      contractAddress,
      connectedWallet,
      listing.ownerWallet,
      listing.id,
      listing.conditions,
      listing.cancellationPolicy,
      rentalFeeNear,
      collateralNear,
      startTimestampMs,
      expectedReturnIso,
    ]
  );

  const handleSignTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setErrorMsg('You must explicitly accept the borrowing agreement and escrow settlement rules before signing.');
      return;
    }
    setErrorMsg(null);
    setSigning(true);
    setSignStage('AWAITING_WALLET_SIGNATURE');
    try {
      await new Promise((r) => setTimeout(r, 320));
      setSignStage('BROADCASTING_RPC');
      await onConfirmAndSignEscrow({
        listingId: listing.id,
        durationCount,
        explicitUserApproval: true,
      });
    } catch (err) {
      setSignStage('FAILED_RPC');
      setErrorMsg(err instanceof Error ? err.message : 'Transaction signing failed');
    } finally {
      setSigning(false);
    }
  };

  const handleSimulateRejectedSignature = () => {
    setSigning(false);
    setSignStage('REJECTED_BY_USER');
    setErrorMsg(
      'User rejected wallet signature request in NEAR wallet popup (Error code: USER_REJECTED_SIGNATURE). No NEAR was deducted or locked.'
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-medium text-[#A4B0C4] hover:text-[#F3F6FC] flex items-center gap-1.5 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Listing</span>
      </button>

      {/* Interactive Signature UX: Money Flow Preview */}
      <EscrowMoneyFlowCard
        state="REQUESTED"
        rentalFeeNear={rentalFeeNear}
        collateralNear={collateralNear}
        nearUsdRate={nearUsdRate}
        borrowerWallet={connectedWallet}
        lenderWallet={listing.ownerWallet}
        contractAddress={contractAddress}
        expectedExpiryIso={expectedReturnIso}
        isVerifiedOnChain={false}
        interactivePreview={true}
      />

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

        {/* Live Wallet Signature Stage Banner */}
        {signStage !== 'IDLE' && (
          <div
            role="status"
            aria-live="polite"
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
              signStage === 'REJECTED_BY_USER' || signStage === 'FAILED_RPC'
                ? 'bg-[#F87171]/10 border-[#F87171]/40 text-[#F87171]'
                : 'bg-[#00EC97]/10 border-[#00EC97]/40 text-[#00EC97]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {(signStage === 'AWAITING_WALLET_SIGNATURE' || signStage === 'BROADCASTING_RPC') && (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              )}
              {(signStage === 'REJECTED_BY_USER' || signStage === 'FAILED_RPC') && (
                <XCircle className="w-4 h-4 shrink-0" />
              )}
              <div>
                <strong className="block font-semibold">
                  {signStage === 'AWAITING_WALLET_SIGNATURE' &&
                    `Step 1/2: Waiting for human signature from ${connectedWallet}...`}
                  {signStage === 'BROADCASTING_RPC' &&
                    `Step 2/2: Submitting create_booking(${totalRequiredNear} NEAR) to ${contractAddress} on NEAR Testnet...`}
                  {signStage === 'REJECTED_BY_USER' && 'Wallet Signature Cancelled by User'}
                  {signStage === 'FAILED_RPC' && 'Transaction Broadcast Error'}
                </strong>
                <span className="text-[11px] opacity-90">
                  {signStage === 'AWAITING_WALLET_SIGNATURE' &&
                    'BorrowBond AI never signs transactions automatically. Confirm in your wallet session.'}
                  {signStage === 'BROADCASTING_RPC' &&
                    'Locking rental fee + refundable collateral in escrow vault.'}
                  {(signStage === 'REJECTED_BY_USER' || signStage === 'FAILED_RPC') &&
                    'You can retry signing at any time or adjust your rental duration.'}
                </span>
              </div>
            </div>
            {(signStage === 'REJECTED_BY_USER' || signStage === 'FAILED_RPC') && (
              <button
                type="button"
                onClick={() => {
                  setSignStage('IDLE');
                  setErrorMsg(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#0B1020] border border-slate-700 text-[#F3F6FC] text-[11px] font-semibold cursor-pointer shrink-0"
              >
                Clear State
              </button>
            )}
          </div>
        )}

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
            <span className="text-[#A4B0C4] block">Counterparties &amp; Network</span>
            <div>Provider: <code className="font-mono text-[#F3F6FC]">{listing.ownerWallet}</code></div>
            <div>Borrower: <code className="font-mono text-[#5EEAD4]">{connectedWallet}</code></div>
            <div>Contract: <code className="font-mono text-[#A4B0C4]">{contractAddress}</code> (testnet)</div>
          </div>
        </div>

        {/* Pre-Signature Security & Deposit Verification Breakdown */}
        <div className="bg-[#0B1020] border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#F3F6FC] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#00EC97]" />
              <span>Pre-Signature Transaction Verification (`{preSignSummary.methodName}`)</span>
            </h2>
            <span className="font-mono text-[11px] text-[#00EC97] bg-[#00EC97]/10 px-2 py-0.5 rounded">
              Network: {preSignSummary.nearNetwork}
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-[#A4B0C4]">
              Rental Duration &amp; Return Window (UTC)
            </span>
            <span className="font-mono text-[#F3F6FC] tabular-nums">
              {durationCount} {listing.durationUnit.toLowerCase()} (Ends {new Date(expectedReturnIso).toUTCString()})
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-[#A4B0C4]">Rental Fee (Settled to provider upon completion)</span>
            <span className="font-mono font-semibold text-[#F3F6FC] tabular-nums">
              {rentalFeeNear} NEAR (${(rentalFeeNear * nearUsdRate).toFixed(2)})
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-[#A4B0C4]">Refundable Collateral (Locked in contract)</span>
            <span className="font-mono font-semibold text-[#5EEAD4] tabular-nums">
              {collateralNear} NEAR (${(collateralNear * nearUsdRate).toFixed(2)})
            </span>
          </div>

          <div className="flex justify-between items-center py-1 text-[11px]">
            <span className="text-[#A4B0C4]">
              Platform Escrow Fee ({preSignSummary.platformFeeBps / 100}% of collateral on active completion; 0 NEAR if cancelled/expired)
            </span>
            <span className="font-mono text-[#F3F6FC] tabular-nums">
              {preSignSummary.platformFeeNear} NEAR (Net collateral refund: {preSignSummary.expectedBorrowerRefundCleanNear} NEAR)
            </span>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm">
            <span className="font-bold text-[#F3F6FC]">Total Attached Deposit (`create_booking`)</span>
            <div className="text-right">
              <span className="font-mono font-bold text-[#5EEAD4] tabular-nums block">
                {totalRequiredNear} testnet NEAR (${(totalRequiredNear * nearUsdRate).toFixed(2)})
              </span>
            </div>
          </div>

          <details className="pt-2 border-t border-slate-800/60 text-[11px] text-[#9BA8C0]" open>
            <summary className="cursor-pointer hover:text-[#F3F6FC] font-medium select-none">
              Technical On-Chain Precision (yoctoNEAR, Contract Receiver &amp; Terms Hash)
            </summary>
            <div className="mt-2 p-2.5 rounded-lg bg-[#121B2C] font-mono space-y-1">
              <div>Receiver Contract: <span className="text-[#F3F6FC]">{preSignSummary.contractAccount}</span> · Method: <span className="text-[#00EC97]">{preSignSummary.methodName}</span></div>
              <div>Attached Deposit (yoctoNEAR): <span className="text-[#5EEAD4]">{formatYoctoNear(totalRequiredNear)}</span></div>
              <div>Agreement SHA-256 Hash: <span className="text-[#A4B0C4] break-all">{preSignSummary.termsSha256Hash}</span></div>
            </div>
          </details>
        </div>

        {/* Settlement, Cancellation & Dispute Rules */}
        <div className="space-y-2.5 text-xs text-[#A4B0C4] bg-[#121B2C] border border-slate-800 rounded-lg p-4">
          <div>
            <strong className="text-[#F3F6FC]">Cancellation Rules: </strong>
            {listing.cancellationPolicy}
          </div>
          <div>
            <strong className="text-[#F3F6FC]">Dispute, 48h Return Window &amp; Collateral Protection: </strong>
            Once return is requested, the lender has 48 hours to inspect and confirm return or open a dispute. Any damage deduction requires either mutual two-party acceptance or authorized arbitration (<code className="font-mono text-[#F3F6FC]">resolver.borrowbond.testnet</code>) and is capped at collateral minus the 1% platform fee.
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

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleSimulateRejectedSignature}
              className="px-3 py-2 rounded-lg bg-[#0B1020] border border-slate-800 hover:border-[#F87171]/50 text-[11px] font-mono text-[#9BA8C0] hover:text-[#F87171] transition-colors cursor-pointer"
              title="Test how BorrowBond handles a rejected or cancelled wallet popup"
            >
              Simulate Wallet Rejection
            </button>

            <div className="flex items-center gap-3">
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
          </div>
        </form>
      </div>
    </div>
  );
};

