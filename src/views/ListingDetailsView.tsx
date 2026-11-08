import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Camera,
  Cpu,
  UserCheck,
} from 'lucide-react';
import {
  type MarketplaceListing,
  type ProviderProfile,
  type SpendingPolicy,
  evaluateSpendingAndSecurityPolicy,
  calculateCollateralRecommendation,
} from '../lib/security/policyEngine';
import { ResilientImage } from '../components/ResilientImage';

interface ListingDetailsViewProps {
  listing: MarketplaceListing;
  provider?: ProviderProfile;
  borrowerProfile?: ProviderProfile;
  policy: SpendingPolicy;
  onBack: () => void;
  onProceedToCheckout: (listingId: string, durationCount: number) => void;
}

export const ListingDetailsView: React.FC<ListingDetailsViewProps> = ({
  listing,
  provider,
  borrowerProfile,
  policy,
  onBack,
  onProceedToCheckout,
}) => {
  const [selectedDuration, setSelectedDuration] = useState<number>(listing.exampleDuration);

  const ratio = Math.max(1, selectedDuration) / Math.max(1, listing.exampleDuration);
  const calculatedFeeNear = Number((listing.rentalFeeNear * ratio).toFixed(4));
  const collateralNear = listing.collateralNear;
  const totalEscrowNear = Number((calculatedFeeNear + collateralNear).toFixed(4));

  const securityCheck = useMemo(() => {
    return evaluateSpendingAndSecurityPolicy(listing, selectedDuration, policy, provider);
  }, [listing, selectedDuration, policy, provider]);

  const collateralRecommendation = useMemo(() => {
    const durationDays =
      listing.durationUnit === 'HOURS'
        ? Math.max(1, Math.round(selectedDuration / 24))
        : selectedDuration;
    return calculateCollateralRecommendation({
      resourceType: listing.resourceType,
      category: listing.category,
      ownerEstimatedValueNear: listing.ownerEstimatedValueNear,
      providerMinimumCollateralNear: listing.collateralNear,
      rentalDurationDays: durationDays,
      borrowerCompletedCount: borrowerProfile?.completedBorrows ?? 0,
      borrowerDisputesCount: borrowerProfile?.disputesCount ?? 0,
      digitalAccessScope: listing.accessScope,
    });
  }, [listing, selectedDuration, borrowerProfile]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-medium text-[#A4B0C4] hover:text-[#F3F6FC] flex items-center gap-1.5 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Marketplace</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image, Description, Specific Physical/Digital Attributes & Collateral Explanation */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#172338] border border-slate-800 rounded-xl overflow-hidden">
            <div className="aspect-4/3 w-full bg-[#121B2C]">
              <ResilientImage
                src={listing.imageUrl}
                alt={listing.title}
                resourceType={listing.resourceType}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#A4B0C4]">
                <span className="font-semibold text-[#5EEAD4]">
                  {listing.resourceType === 'PHYSICAL' ? 'Physical Resource' : 'Digital Resource'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{listing.category}</span>
                <span aria-hidden="true">·</span>
                <span>Status: {listing.availabilityStatus}</span>
                {listing.isDemoSeed && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Demonstration Listing</span>
                  </>
                )}
              </div>

              <h1 className="text-2xl font-bold font-display text-[#F3F6FC]">
                {listing.title}
              </h1>

              <p className="text-sm text-[#A4B0C4] leading-relaxed">
                {listing.description}
              </p>
            </div>
          </div>

          {/* Resource-Specific Details */}
          {listing.resourceType === 'PHYSICAL' ? (
            <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold font-display text-[#F3F6FC]">
                <Camera className="w-4 h-4 text-[#5EEAD4]" />
                <h2>Physical Hardware Inspection & Handover Details</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-[#0B1020] rounded-lg border border-slate-800/80 space-y-1">
                  <span className="text-[#A4B0C4] block">Estimated Item Value</span>
                  <span className="font-mono font-semibold text-[#F3F6FC] tabular-nums">
                    {listing.ownerEstimatedValueNear ?? 0.30} testnet NEAR
                  </span>
                  <span className="text-[11px] text-[#A4B0C4] block">
                    (Owner-provided estimate — not independently verified)
                  </span>
                </div>
                <div className="p-3.5 bg-[#0B1020] rounded-lg border border-slate-800/80 space-y-1">
                  <span className="text-[#A4B0C4] block">Documented Condition</span>
                  <span className="text-[#F3F6FC] font-medium block">
                    {listing.itemCondition || 'Good working condition'}
                  </span>
                </div>
              </div>

              {listing.includedAccessories && listing.includedAccessories.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-[#F3F6FC]">Included Accessories</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[#A4B0C4]">
                    {listing.includedAccessories.map((acc) => (
                      <li key={acc} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#5EEAD4] shrink-0" />
                        <span>{acc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <span className="font-semibold text-[#F3F6FC]">Pickup & Return Arrangements: </span>
                  <span className="text-[#A4B0C4]">{listing.pickupReturnInstructions}</span>
                </div>
                <div>
                  <span className="font-semibold text-[#F3F6FC]">Handover Confirmation Procedure: </span>
                  <span className="text-[#A4B0C4]">{listing.handoverProcedure}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold font-display text-[#F3F6FC]">
                <Cpu className="w-4 h-4 text-[#8297FF]" />
                <h2>Programmable Digital Access & Quota Specification</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-[#0B1020] rounded-lg border border-slate-800/80 space-y-1">
                  <span className="text-[#A4B0C4] block">Service Type & Gateway</span>
                  <span className="text-[#F3F6FC] font-medium block">
                    {listing.digitalServiceType}
                  </span>
                  <code className="text-[11px] font-mono text-[#8297FF] block">
                    Endpoint: {listing.demoEndpointRef}
                  </code>
                </div>
                <div className="p-3.5 bg-[#0B1020] rounded-lg border border-slate-800/80 space-y-1">
                  <span className="text-[#A4B0C4] block">Enforced Usage Quota</span>
                  <span className="font-mono font-semibold text-[#F3F6FC] tabular-nums">
                    {listing.usageQuotaRequests} API requests per booking
                  </span>
                  <span className="text-[11px] text-[#A4B0C4] block">
                    Scope: {listing.accessScope}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <span className="font-semibold text-[#F3F6FC]">Expiration & Revocation Rules: </span>
                  <span className="text-[#A4B0C4]">{listing.expirationBehavior}</span>
                </div>
                <div>
                  <span className="font-semibold text-[#F3F6FC]">Technical Integration: </span>
                  <span className="text-[#A4B0C4]">{listing.technicalRequirements}</span>
                </div>
                <div>
                  <span className="font-semibold text-[#F3F6FC]">Data & Licensing Restrictions: </span>
                  <span className="text-[#A4B0C4]">{listing.licensingRestrictions}</span>
                </div>
              </div>
            </div>
          )}

          {/* Transparent Collateral Recommendation Engine */}
          <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold font-display text-[#F3F6FC]">
                Collateral Recommendation & Risk Breakdown
              </h2>
              <span className="text-xs font-mono text-[#5EEAD4] tabular-nums">
                Suggested Range: {collateralRecommendation.recommendedMinNear}–{collateralRecommendation.recommendedMaxNear} NEAR
              </span>
            </div>
            <p className="text-xs text-[#A4B0C4] leading-relaxed">
              {collateralRecommendation.explanation}
            </p>
            <ul className="space-y-1 text-xs text-[#A4B0C4]">
              {collateralRecommendation.factors.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-[#8297FF] shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-[#A4B0C4] pt-2 border-t border-slate-800/80">
              {collateralRecommendation.disclaimer}
            </p>
          </div>
        </div>

        {/* Right Sticky Contiguous Booking Module */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          <div className="bg-[#172338] border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="space-y-1 border-b border-slate-800 pb-4">
              <span className="text-xs text-[#A4B0C4]">NEAR Programmable Escrow Agreement</span>
              <h2 className="text-lg font-bold font-display text-[#F3F6FC]">
                Configure Borrowing Terms
              </h2>
            </div>

            {/* Duration Stepper / Selector */}
            <div>
              <label htmlFor="detail-duration" className="block text-xs font-medium text-[#A4B0C4] mb-1.5">
                Borrowing Duration ({listing.minDuration}–{listing.maxDuration} {listing.durationUnit.toLowerCase()})
              </label>
              <input
                id="detail-duration"
                type="number"
                min={listing.minDuration}
                max={listing.maxDuration}
                value={selectedDuration}
                onChange={(e) =>
                  setSelectedDuration(
                    Math.max(
                      listing.minDuration,
                      Math.min(listing.maxDuration, Number(e.target.value) || listing.minDuration)
                    )
                  )
                }
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC] focus:outline-none focus:border-[#5EEAD4]"
              />
            </div>

            {/* Explicit Separation of Rental Fee vs Refundable Collateral */}
            <div className="bg-[#0B1020] border border-slate-800 rounded-lg p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#A4B0C4]">
                  Rental Fee ({selectedDuration} {listing.durationUnit.toLowerCase()})
                </span>
                <span className="font-mono font-semibold text-[#F3F6FC] tabular-nums">
                  {calculatedFeeNear} NEAR
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A4B0C4]">Refundable Collateral (Escrowed)</span>
                <span className="font-mono font-semibold text-[#5EEAD4] tabular-nums">
                  {collateralNear} NEAR
                </span>
              </div>
              <div className="pt-2.5 border-t border-slate-800 flex justify-between items-center text-sm">
                <span className="font-semibold text-[#F3F6FC]">Total Required Escrow Lock</span>
                <span className="font-mono font-bold text-[#F3F6FC] tabular-nums">
                  {totalEscrowNear} NEAR
                </span>
              </div>
            </div>

            {/* AI Security Agent Live Policy Verification */}
            <div className="p-4 rounded-lg bg-[#121B2C] border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#F3F6FC] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#5EEAD4]" />
                  <span>AI Security & Spending Policy Check</span>
                </span>
                <span
                  className={`font-mono font-semibold ${
                    securityCheck.passed ? 'text-[#34D399]' : 'text-[#F87171]'
                  }`}
                >
                  {securityCheck.passed ? 'PASSED' : 'BLOCKED'}
                </span>
              </div>

              {securityCheck.violations.length > 0 && (
                <ul className="space-y-1 text-[#F87171]">
                  {securityCheck.violations.map((v) => (
                    <li key={v} className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              )}

              {securityCheck.warnings.length > 0 && (
                <ul className="space-y-1 text-[#FBBF24]">
                  {securityCheck.warnings.map((w) => (
                    <li key={w} className="flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Terms, Cancellation & Borrower Requirements */}
            <div className="space-y-2 text-xs text-[#A4B0C4]">
              <div>
                <strong className="text-[#F3F6FC]">Terms & Restrictions: </strong>
                {listing.conditions}
              </div>
              <div>
                <strong className="text-[#F3F6FC]">Cancellation Policy: </strong>
                {listing.cancellationPolicy}
              </div>
              <div>
                <strong className="text-[#F3F6FC]">Borrower Requirements: </strong>
                {listing.borrowerRequirements}
              </div>
            </div>

            <button
              type="button"
              disabled={!securityCheck.passed}
              onClick={() => onProceedToCheckout(listing.id, selectedDuration)}
              className={`w-full py-3 px-4 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                securityCheck.passed
                  ? 'bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {securityCheck.passed
                ? 'Proceed to Borrowing Checkout'
                : 'Exceeds Active Spending Policy'}
            </button>
          </div>

          {/* Provider Profile & Verifiable Transaction Reputation */}
          <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#8297FF]" />
                <span className="font-semibold text-[#F3F6FC]">
                  {provider?.displayName || listing.ownerDisplayName}
                </span>
              </div>
              <code className="font-mono text-[#A4B0C4]">{listing.ownerWallet}</code>
            </div>
            <p className="text-[#A4B0C4] leading-relaxed">
              {provider?.bio || 'Active NEAR testnet resource provider.'}
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
              <div className="p-2 bg-[#0B1020] rounded">
                <span className="block text-[#A4B0C4]">Completed Lends</span>
                <span className="font-mono font-bold text-[#F3F6FC] text-sm tabular-nums">
                  {provider?.completedLends ?? 0}
                </span>
              </div>
              <div className="p-2 bg-[#0B1020] rounded">
                <span className="block text-[#A4B0C4]">Completed Borrows</span>
                <span className="font-mono font-bold text-[#F3F6FC] text-sm tabular-nums">
                  {provider?.completedBorrows ?? 0}
                </span>
              </div>
              <div className="p-2 bg-[#0B1020] rounded">
                <span className="block text-[#A4B0C4]">Disputes</span>
                <span className="font-mono font-bold text-[#34D399] text-sm tabular-nums">
                  {provider?.disputesCount ?? 0}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-[#A4B0C4]">
              Reputation metrics are derived from completed on-chain agreements. Wallet connection authenticates the NEAR account and does not represent real-world KYC verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
