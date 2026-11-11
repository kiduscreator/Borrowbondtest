import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Camera,
  Cpu,
  UserCheck,
  Images,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  QrCode,
  Eye,
  TrendingUp,
  Star,
  Award,
} from 'lucide-react';
import {
  type MarketplaceListing,
  type ProviderProfile,
  type SpendingPolicy,
  evaluateSpendingAndSecurityPolicy,
  calculateCollateralRecommendation,
} from '../lib/security/policyEngine';
import { ResilientImage } from '../components/ResilientImage';
import { NearTokenIcon, UsdtTokenIcon } from '../components/TokenIcons';
import { ProductQrScannerModal } from '../components/ProductQrScannerModal';
import {
  PhysicalListingLocation,
  CountryMismatchAlert,
  CountryBadge,
  CountryFlag,
} from '../components/CountryLocationComponents';
import {
  evaluatePhysicalEligibility,
  getCountryName,
} from '../lib/location/countryLocationEngine';

interface ListingDetailsViewProps {
  listing: MarketplaceListing;
  provider?: ProviderProfile;
  borrowerProfile?: ProviderProfile;
  policy: SpendingPolicy;
  nearUsdRate?: number;
  displayCurrency?: 'NEAR' | 'USDT';
  onToggleCurrency?: (currency: 'NEAR' | 'USDT') => void;
  onUpdatePolicy?: (newPolicy: SpendingPolicy) => void;
  onBack: () => void;
  onProceedToCheckout: (listingId: string, durationCount: number) => void;
  onNavigateProfileLocation?: () => void;
}

export const ListingDetailsView: React.FC<ListingDetailsViewProps> = ({
  listing,
  provider,
  borrowerProfile,
  policy,
  nearUsdRate = 3.7,
  displayCurrency = 'NEAR',
  onToggleCurrency,
  onUpdatePolicy,
  onBack,
  onProceedToCheckout,
  onNavigateProfileLocation,
}) => {
  const [selectedDuration, setSelectedDuration] = useState<number>(listing.exampleDuration);
  const [startDateIso, setStartDateIso] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [qrModalMode, setQrModalMode] = useState<'SCAN' | 'SHOW_TAG' | 'SPECS_CAPTURE' | 'TRUST_VERIFY'>('TRUST_VERIFY');
  const [productTrustVerified, setProductTrustVerified] = useState<boolean>(false);

  const computedEndDateLabel = useMemo(() => {
    const base = new Date(`${startDateIso}T10:00:00`);
    if (Number.isNaN(base.getTime())) return 'Flexible';
    const msToAdd =
      listing.durationUnit === 'HOURS'
        ? selectedDuration * 3600 * 1000
        : selectedDuration * 24 * 3600 * 1000;
    const end = new Date(base.getTime() + msToAdd);
    return end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [startDateIso, selectedDuration, listing.durationUnit]);

  const galleryPhotos = useMemo(() => {
    if (Array.isArray(listing.images) && listing.images.length > 0) {
      return listing.images;
    }
    return [listing.imageUrl];
  }, [listing]);

  const safePhotoIndex = Math.min(activePhotoIndex, galleryPhotos.length - 1);

  const ratio = Math.max(1, selectedDuration) / Math.max(1, listing.exampleDuration);
  const calculatedFeeNear = Number((listing.rentalFeeNear * ratio).toFixed(4));
  const collateralNear = listing.collateralNear;
  const totalEscrowNear = Number((calculatedFeeNear + collateralNear).toFixed(4));

  const effectiveRate = nearUsdRate;
  const calculatedFeeUsdt = Number((calculatedFeeNear * effectiveRate).toFixed(2));
  const collateralUsdt = Number((collateralNear * effectiveRate).toFixed(2));
  const totalEscrowUsdt = Number((calculatedFeeUsdt + collateralUsdt).toFixed(2));

  const physicalEligibility = useMemo(() => {
    return evaluatePhysicalEligibility({
      listing,
      borrowerProfile,
      lenderProfile: provider,
    });
  }, [listing, borrowerProfile, provider]);

  const securityCheck = useMemo(() => {
    return evaluateSpendingAndSecurityPolicy(
      listing,
      selectedDuration,
      policy,
      provider,
      undefined,
      borrowerProfile
    );
  }, [listing, selectedDuration, policy, provider, borrowerProfile]);

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

  const handleAutoAdjustPolicyForItem = () => {
    if (!onUpdatePolicy) return;
    const updatedCategories = policy.allowedCategories.includes(listing.category)
      ? policy.allowedCategories
      : [...policy.allowedCategories, listing.category];
    onUpdatePolicy({
      ...policy,
      maxRentalFeeNear: Math.max(policy.maxRentalFeeNear, Number((calculatedFeeNear * 1.2).toFixed(2))),
      maxCollateralNear: Math.max(policy.maxCollateralNear, Number((collateralNear * 1.2).toFixed(2))),
      maxTotalPaymentNear: Math.max(policy.maxTotalPaymentNear, Number((totalEscrowNear * 1.2).toFixed(2))),
      allowedCategories: updatedCategories,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-[#9BA8C0] hover:text-[#00EC97] flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => {
              setQrModalMode('TRUST_VERIFY');
              setQrModalOpen(true);
            }}
            className="btn-near-primary px-3 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer shadow-[0_0_16px_rgba(0,236,151,0.25)]"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Verify Hardware QR with Camera</span>
          </motion.button>

          <button
            type="button"
            onClick={() => {
              setQrModalMode('SHOW_TAG');
              setQrModalOpen(true);
            }}
            className="btn-near-secondary px-3 py-1.5 text-xs cursor-pointer flex items-center gap-1.5"
          >
            <QrCode className="w-3.5 h-3.5 text-[#00EC97]" />
            <span>Product QR Tag</span>
          </button>

          {onToggleCurrency && (
            <button
              type="button"
              onClick={() => onToggleCurrency(displayCurrency === 'NEAR' ? 'USDT' : 'NEAR')}
              className="btn-near-secondary px-3 py-1.5 text-xs"
            >
              <NearTokenIcon size={15} />
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#00EC97]" />
              <UsdtTokenIcon size={15} />
              <span>
                Viewing in {displayCurrency} (Live 1 NEAR = {nearUsdRate.toFixed(2)} USDT)
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Multi-Photo Gallery (2-10 Photos in Glass Frames), Description, & Collateral Explanation */}
        <div className="lg:col-span-7 space-y-6">
          <div className="near-glass-card rounded-2xl overflow-hidden p-4 space-y-4">
            {/* Hero Image Viewport inside Frosted Glass Frame */}
            <div className="glass-image-frame relative aspect-4/3 w-full">
              <ResilientImage
                src={galleryPhotos[safePhotoIndex]}
                alt={`${listing.title} — Photo ${safePhotoIndex + 1}`}
                resourceType={listing.resourceType}
                className="w-full h-full object-cover"
              />

              {/* Photo Counter Badge */}
              <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-lg bg-[#06080F]/85 backdrop-blur-md border border-slate-700/80 text-xs font-mono text-[#F5F8FF] flex items-center gap-1.5">
                <Images className="w-3.5 h-3.5 text-[#00EC97]" />
                <span>
                  Photo {safePhotoIndex + 1} of {galleryPhotos.length}
                </span>
              </div>

              {/* Prev / Next Gallery Controls */}
              {galleryPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous product photo"
                    onClick={() =>
                      setActivePhotoIndex((prev) => (prev - 1 + galleryPhotos.length) % galleryPhotos.length)
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-[#06080F]/80 text-[#F5F8FF] hover:bg-[#00EC97] hover:text-[#04080E] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next product photo"
                    onClick={() =>
                      setActivePhotoIndex((prev) => (prev + 1) % galleryPhotos.length)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-[#06080F]/80 text-[#F5F8FF] hover:bg-[#00EC97] hover:text-[#04080E] transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip (for 2–10 photos) with Glass Frames */}
            {galleryPhotos.length > 1 && (
              <div className="px-2 py-2 flex items-center gap-2.5 overflow-x-auto">
                {galleryPhotos.map((imgUrl, idx) => (
                  <button
                    key={`${idx}-${imgUrl.slice(0, 20)}`}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`glass-image-frame relative w-20 h-14 shrink-0 transition-all cursor-pointer ${
                      idx === safePhotoIndex
                        ? 'ring-2 ring-[#00EC97] scale-105'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="p-2 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#9BA8C0]">
                <span className="font-bold text-[#00EC97]">
                  {listing.resourceType === 'PHYSICAL' ? 'Physical Resource' : 'Digital Resource'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{listing.category}</span>
                <span aria-hidden="true">·</span>
                <span>Status: {listing.availabilityStatus}</span>
                {listing.officialRetailPriceUsd && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[#17F1D1]">
                      Official Retail: ${listing.officialRetailPriceUsd.toLocaleString()} USD
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-2xl font-extrabold font-display text-[#F5F8FF]">
                {listing.title}
              </h1>

              {/* Popularity & Trust Verification Metrics */}
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-[#06080F] border border-slate-800/80 text-xs text-[#9BA8C0]">
                <div className="flex items-center gap-1.5 font-mono">
                  <Eye className="w-4 h-4 text-[#5EEAD4]" />
                  <span className="text-[#F5F8FF] font-bold">{(listing.viewsCount ?? 120).toLocaleString()}</span>
                  <span>Views</span>
                </div>
                <span aria-hidden="true" className="text-slate-700">|</span>
                <div className="flex items-center gap-1.5 font-mono text-[#00EC97]">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-bold">{listing.bookingConversionRate ?? 95}%</span>
                  <span>Booking Conversion</span>
                </div>
                <span aria-hidden="true" className="text-slate-700">|</span>
                <div className="flex items-center gap-1.5 font-mono text-[#FBBF24]">
                  <Star className="w-4 h-4 fill-[#FBBF24] text-[#FBBF24]" />
                  <span className="font-bold text-[#F5F8FF]">{listing.averageRating?.toFixed(1) ?? '5.0'}</span>
                  <span className="text-[#9BA8C0]">({listing.ratingsCount ?? 12} Verified Reviews)</span>
                </div>
              </div>

              <p className="text-sm text-[#9BA8C0] leading-relaxed">
                {listing.description}
              </p>
            </div>
          </div>

          {/* Screen E: Country Mismatch Alert if Physical Listing is in a Different Country */}
          {!physicalEligibility.eligible && (
            <CountryMismatchAlert
              eligibility={physicalEligibility}
              listing={listing}
              onExploreEligiblePhysical={onBack}
              onExploreDigital={onBack}
              onUpdateProfileLocation={onNavigateProfileLocation || onBack}
            />
          )}

          {/* Screen D: Physical Listing Location & Pickup Card */}
          <PhysicalListingLocation
            listing={listing}
            lenderProfile={provider}
            eligibility={physicalEligibility}
          />

          {/* Resource-Specific Details */}
          {listing.resourceType === 'PHYSICAL' ? (
            <div className="near-glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold font-display text-[#F5F8FF]">
                <Camera className="w-4 h-4 text-[#00EC97]" />
                <h2>Physical Hardware Inspection & Handover Details</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-[#06080F] rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[#9BA8C0] block">Official / Estimated Item Value</span>
                  <span className="font-mono font-bold text-[#F5F8FF] tabular-nums block">
                    {listing.officialRetailPriceUsd
                      ? `$${listing.officialRetailPriceUsd.toLocaleString()} USDT (${listing.ownerEstimatedValueNear ?? Number((listing.officialRetailPriceUsd / nearUsdRate).toFixed(2))} NEAR)`
                      : `${listing.ownerEstimatedValueNear ?? 0.30} NEAR`}
                  </span>
                  <span className="text-[11px] text-[#00EC97] block">
                    50% Refundable Collateral Rule Applied
                  </span>
                </div>
                <div className="p-3.5 bg-[#06080F] rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[#9BA8C0] block">Documented Condition</span>
                  <span className="text-[#F5F8FF] font-medium block">
                    {listing.itemCondition || 'Good working condition'}
                  </span>
                </div>
              </div>

              {listing.includedAccessories && listing.includedAccessories.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-[#F5F8FF]">Included Accessories</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[#9BA8C0]">
                    {listing.includedAccessories.map((acc) => (
                      <li key={acc} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00EC97] shrink-0" />
                        <span>{acc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {/* On-Chain Physical Trust & Camera QR Verification Widget */}
              <div className="p-4 rounded-xl bg-[#091122] border border-[#00EC97]/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#00EC97]" />
                    <span className="text-xs font-bold text-[#F5F8FF]">
                      On-Chain Physical Trust &amp; Hardware Authentication
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold flex items-center gap-1.5 ${
                      productTrustVerified
                        ? 'bg-[#00EC97]/20 text-[#00EC97] border border-[#00EC97]/40'
                        : 'bg-slate-800 text-[#9BA8C0]'
                    }`}
                  >
                    {productTrustVerified ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-[#00EC97]" />
                        <span>100% Genuine Authenticated</span>
                      </>
                    ) : (
                      <span>Unverified Physical Item</span>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-[#06080F] border border-slate-800/80">
                    <span className="text-[#9BA8C0] block text-[10px]">Registered On-Chain Serial / TIN:</span>
                    <strong className="text-[#00EC97] block truncate">
                      {listing.tinOrSerialNumber || 'TIN-SONY-A7IV-884120'}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#06080F] border border-slate-800/80">
                    <span className="text-[#9BA8C0] block text-[10px]">Registered Brand &amp; Model:</span>
                    <strong className="text-[#F5F8FF] block truncate">
                      {listing.brandAndModel || listing.title}
                    </strong>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <p className="text-[11px] text-[#9BA8C0] max-w-md">
                    Scan with your device camera or upload a QR photo to validate physical serial and anti-tamper marks against the NEAR escrow contract before handover.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={() => {
                      setQrModalMode('TRUST_VERIFY');
                      setQrModalOpen(true);
                    }}
                    className="btn-near-primary px-3.5 py-1.5 text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan Product QR to Authenticate</span>
                  </motion.button>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <span className="font-semibold text-[#F5F8FF]">Pickup & Return Arrangements: </span>
                  <span className="text-[#9BA8C0]">{listing.pickupReturnInstructions}</span>
                </div>
                <div>
                  <span className="font-semibold text-[#F5F8FF]">Handover Confirmation Procedure: </span>
                  <span className="text-[#9BA8C0]">{listing.handoverProcedure}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="near-glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold font-display text-[#F5F8FF]">
                <Cpu className="w-4 h-4 text-[#17F1D1]" />
                <h2>Programmable Digital Access & Quota Specification</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-[#06080F] rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[#9BA8C0] block">Service Type & Gateway</span>
                  <span className="text-[#F5F8FF] font-medium block">
                    {listing.digitalServiceType}
                  </span>
                  <code className="text-[11px] font-mono text-[#17F1D1] block">
                    Endpoint: {listing.demoEndpointRef}
                  </code>
                </div>
                <div className="p-3.5 bg-[#06080F] rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[#9BA8C0] block">Enforced Usage Quota</span>
                  <span className="font-mono font-semibold text-[#F5F8FF] tabular-nums">
                    {listing.usageQuotaRequests} API requests per booking
                  </span>
                  <span className="text-[11px] text-[#9BA8C0] block">
                    Scope: {listing.accessScope}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Transparent Collateral Recommendation Engine */}
          <div className="near-glass-card rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold font-display text-[#F5F8FF]">
                Collateral Recommendation & Risk Breakdown
              </h2>
              <span className="text-xs font-mono text-[#00EC97] tabular-nums">
                Suggested Range: {collateralRecommendation.recommendedMinNear}–{collateralRecommendation.recommendedMaxNear} NEAR
              </span>
            </div>
            <p className="text-xs text-[#9BA8C0] leading-relaxed">
              {collateralRecommendation.explanation}
            </p>
            <ul className="space-y-1 text-xs text-[#9BA8C0]">
              {collateralRecommendation.factors.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-[#17F1D1] shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-[#9BA8C0] pt-2 border-t border-slate-800/80">
              {collateralRecommendation.disclaimer}
            </p>
          </div>
        </div>

        {/* Right Sticky Contiguous Booking Module */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          <div className="near-glow-card rounded-2xl p-6 space-y-5">
            <div className="space-y-1 border-b border-slate-800 pb-4">
              <span className="text-xs font-mono text-[#00EC97] inline-flex items-center gap-1.5">
                <NearTokenIcon size={14} />
                <span>NEAR Programmable Escrow Agreement</span>
              </span>
              <h2 className="text-lg font-extrabold font-display text-[#F5F8FF]">
                Configure Borrowing Terms
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="detail-duration" className="block text-xs font-medium text-[#9BA8C0] mb-1.5">
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
                  className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
                />
              </div>

              {/* Date & Availability Window Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-[#06080F] border border-slate-800/90 text-xs">
                <div>
                  <label htmlFor="rental-start-date" className="block text-[11px] text-[#9BA8C0] mb-1">
                    Pickup / Start Date
                  </label>
                  <input
                    id="rental-start-date"
                    type="date"
                    value={startDateIso}
                    onChange={(e) => setStartDateIso(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono text-xs bg-[#0D1322] border border-slate-700 rounded-lg text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
                  />
                </div>
                <div className="flex flex-col justify-between">
                  <span className="text-[11px] text-[#9BA8C0] block">Expected Return &amp; Status</span>
                  <div className="font-mono font-semibold text-[#00EC97] py-1.5">
                    Due {computedEndDateLabel} · {listing.availabilityStatus}
                  </div>
                </div>
              </div>
            </div>

            {/* Explicit Separation of Rental Fee vs Refundable Collateral in NEAR & USDT */}
            <div className="bg-[#06080F] border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#9BA8C0]">
                  Rental Fee ({selectedDuration} {listing.durationUnit.toLowerCase()})
                </span>
                <div className="text-right font-mono tabular-nums">
                  <span className="font-bold text-[#F5F8FF] inline-flex items-center gap-1.5 justify-end">
                    <NearTokenIcon size={14} />
                    <span>{calculatedFeeNear} NEAR</span>
                  </span>
                  <span className="text-[11px] text-[#9BA8C0] inline-flex items-center gap-1 justify-end block mt-0.5">
                    <UsdtTokenIcon size={12} />
                    <span>≈ {calculatedFeeUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT</span>
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9BA8C0]">Refundable Collateral (Escrowed)</span>
                <div className="text-right font-mono tabular-nums">
                  <span className="font-bold text-[#00EC97] inline-flex items-center gap-1.5 justify-end">
                    <NearTokenIcon size={14} />
                    <span>{collateralNear} NEAR</span>
                  </span>
                  <span className="text-[11px] text-[#17F1D1] inline-flex items-center gap-1 justify-end block mt-0.5">
                    <UsdtTokenIcon size={12} />
                    <span>≈ {collateralUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT</span>
                  </span>
                </div>
              </div>
              <div className="pt-2.5 border-t border-slate-800 flex justify-between items-center text-sm">
                <span className="font-bold text-[#F5F8FF]">Total Required Escrow Lock</span>
                <div className="text-right font-mono tabular-nums">
                  <span className="font-extrabold text-[#F5F8FF] inline-flex items-center gap-1.5 justify-end">
                    <NearTokenIcon size={15} />
                    <span>{totalEscrowNear} NEAR</span>
                  </span>
                  <span className="text-xs text-[#00EC97] inline-flex items-center gap-1 justify-end block mt-0.5">
                    <UsdtTokenIcon size={13} />
                    <span>≈ {totalEscrowUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT</span>
                  </span>
                </div>
              </div>
            </div>

            {/* AI Security Agent Live Policy Verification */}
            <div className="p-4 rounded-xl bg-[#0D1322] border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#F5F8FF] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#00EC97]" />
                  <span>AI Security & Spending Policy Check</span>
                </span>
                <span
                  className={`font-mono font-bold ${
                    securityCheck.passed ? 'text-[#00EC97]' : 'text-[#F87171]'
                  }`}
                >
                  {securityCheck.passed ? 'PASSED' : 'POLICY CAP'}
                </span>
              </div>

              {securityCheck.violations.length > 0 && (
                <div className="space-y-2">
                  <ul className="space-y-1 text-[#F87171]">
                    {securityCheck.violations.map((v) => (
                      <li key={v} className="flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                  {onUpdatePolicy && (
                    <button
                      type="button"
                      onClick={handleAutoAdjustPolicyForItem}
                      className="btn-near-secondary w-full py-1.5 px-3 text-[11px] text-[#00EC97]"
                    >
                      Approve & Raise My Spending Policy Limit for This Item ({totalEscrowNear} NEAR)
                    </button>
                  )}
                </div>
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

            <div className="space-y-2 text-xs text-[#9BA8C0]">
              <div>
                <strong className="text-[#F5F8FF]">Terms & Restrictions: </strong>
                {listing.conditions}
              </div>
              <div>
                <strong className="text-[#F5F8FF]">Cancellation Policy: </strong>
                {listing.cancellationPolicy}
              </div>
            </div>

            {!physicalEligibility.eligible && (
              <CountryMismatchAlert
                eligibility={physicalEligibility}
                listing={listing}
                onExploreEligiblePhysical={onBack}
                onExploreDigital={onBack}
                onUpdateProfileLocation={onNavigateProfileLocation || onBack}
              />
            )}

            <button
              type="button"
              data-testid="proceed-to-checkout-btn"
              disabled={!securityCheck.passed || !physicalEligibility.eligible}
              onClick={() => onProceedToCheckout(listing.id, selectedDuration)}
              className={`w-full py-3 px-4 text-sm font-bold rounded-xl transition-all ${
                securityCheck.passed && physicalEligibility.eligible
                  ? 'btn-near-primary'
                  : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
              }`}
            >
              {!physicalEligibility.eligible
                ? 'Not Available in Your Country (Same-Country Physical Policy)'
                : securityCheck.passed
                ? `Proceed to Borrowing Checkout (${totalEscrowNear} NEAR / $${totalEscrowUsdt} USDT)`
                : 'Exceeds Active Spending Policy (Tap Above to Raise Limit)'}
            </button>
          </div>

          {/* Provider Profile */}
          <div className="near-glass-card rounded-2xl p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#00EC97]" />
                <span className="font-semibold text-[#F5F8FF]">
                  {provider?.displayName || listing.ownerDisplayName}
                </span>
              </div>
              <code className="font-mono text-[#9BA8C0]">{listing.ownerWallet}</code>
            </div>
            {(provider?.countryCode || listing.countryCode) && (
              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-[#06080F] border border-slate-800/80">
                <span className="text-[#9BA8C0]">Provider Location:</span>
                <span className="font-semibold text-[#F5F8FF] flex items-center gap-1.5">
                  <CountryFlag countryCode={provider?.countryCode || listing.countryCode} />
                  <span>
                    {provider?.countryName || getCountryName(provider?.countryCode || listing.countryCode)}
                    {provider?.regionName ? ` · ${provider.regionName}` : ''}
                    {provider?.cityName ? ` · ${provider.cityName}` : ''}
                  </span>
                </span>
              </div>
            )}
            <p className="text-[#9BA8C0] leading-relaxed">
              {provider?.bio || 'Active NEAR resource provider.'}
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
              <div className="p-2 bg-[#06080F] rounded-lg">
                <span className="block text-[#9BA8C0]">Completed Lends</span>
                <span className="font-mono font-bold text-[#F5F8FF] text-sm tabular-nums">
                  {provider?.completedLends ?? 0}
                </span>
              </div>
              <div className="p-2 bg-[#06080F] rounded-lg">
                <span className="block text-[#9BA8C0]">Completed Borrows</span>
                <span className="font-mono font-bold text-[#F5F8FF] text-sm tabular-nums">
                  {provider?.completedBorrows ?? 0}
                </span>
              </div>
              <div className="p-2 bg-[#06080F] rounded-lg">
                <span className="block text-[#9BA8C0]">Disputes</span>
                <span className="font-mono font-bold text-[#00EC97] text-sm tabular-nums">
                  {provider?.disputesCount ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProductQrScannerModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        mode={qrModalMode}
        title={`Verify ${listing.brandAndModel || listing.title} on NEAR`}
        subtitle="Scan the physical item's QR tag or barcode using camera API to validate serial, specs, and anti-tamper marks against on-chain metadata."
        activeProductTag={{
          listingId: listing.id,
          title: listing.title,
          brandAndModel: listing.brandAndModel || listing.title,
          tinOrSerialNumber: listing.tinOrSerialNumber || 'TIN-SONY-A7IV-884120',
          category: listing.category,
          resourceType: listing.resourceType,
          officialRetailPriceUsd: listing.officialRetailPriceUsd,
        }}
        onScanSuccess={() => {
          setProductTrustVerified(true);
        }}
      />
    </div>
  );
};
