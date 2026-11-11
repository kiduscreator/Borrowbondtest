import React, { useState, useEffect, useMemo } from 'react';
import {
  Camera,
  Cpu,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Upload,
  Trash2,
  Star,
  RefreshCw,
  ArrowLeftRight,
  Globe,
  Image as ImageIcon,
  Smartphone,
  QrCode,
} from 'lucide-react';
import {
  type MarketplaceListing,
  type OfficialProductPriceSearchResult,
  type ProviderProfile,
  estimateOfficialProductPriceAndHalfCollateral,
  convertNearAndUsdt,
  validateListingPhotosCount,
} from '../lib/security/policyEngine';
import { NearTokenIcon, UsdtTokenIcon } from '../components/TokenIcons';
import {
  ProductQrScannerModal,
  type ScannedProductQrPayload,
} from '../components/ProductQrScannerModal';
import {
  AddressForm,
  type PhysicalListingLocationFormState,
} from '../components/CountryLocationComponents';
import { validatePhysicalListingCreation } from '../lib/location/countryLocationEngine';

interface CreateListingWizardProps {
  connectedWallet: string;
  lenderProfile?: ProviderProfile;
  nearUsdRate?: number;
  onChangeNearUsdRate?: (rate: number) => void;
  displayCurrency?: 'NEAR' | 'USDT';
  onCreated: (newListing: MarketplaceListing) => void;
  onCancel: () => void;
}

const SAMPLE_STUDIO_PHOTOS_PHYSICAL = [
  '/src/assets/images/listing_sony_camera_1794103774108.jpg',
  '/src/assets/images/listing_cinema_projector_1794103775797.jpg',
  '/src/assets/images/listing_lidar_drone_1794103777366.jpg',
];

const SAMPLE_STUDIO_PHOTOS_DIGITAL = [
  '/src/assets/images/listing_weather_api_1794103778935.jpg',
  '/src/assets/images/listing_gpu_compute_1794103779733.jpg',
];

export const CreateListingWizard: React.FC<CreateListingWizardProps> = ({
  connectedWallet,
  lenderProfile,
  nearUsdRate: initialNearUsdRate = 3.7,
  onChangeNearUsdRate,
  displayCurrency = 'USDT',
  onCreated,
  onCancel,
}) => {
  const [resourceType, setResourceType] = useState<'PHYSICAL' | 'DIGITAL'>('PHYSICAL');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Cameras & Optics');
  const [brandAndModel, setBrandAndModel] = useState('');
  const [tinOrSerialNumber, setTinOrSerialNumber] = useState('');
  const [digitalAssetSubtype, setDigitalAssetSubtype] = useState<
    'DIGITAL_ACCOUNT' | 'NFT_ASSET' | 'DIGITAL_PRODUCT' | 'API_COMPUTE'
  >('DIGITAL_ACCOUNT');

  // Multi-photo gallery state: Min 2 photos, Max 10 photos
  const [images, setImages] = useState<string[]>([
    SAMPLE_STUDIO_PHOTOS_PHYSICAL[0],
    SAMPLE_STUDIO_PHOTOS_PHYSICAL[1],
  ]);
  const [customImageUrlInput, setCustomImageUrlInput] = useState('');

  // Live NEAR / USDT Exchange Rate & Active Input Currency ('USDT' or 'NEAR')
  const [liveNearUsdRate, setLiveNearUsdRate] = useState<number>(initialNearUsdRate || 3.7);
  const [nearPriceSource, setNearPriceSource] = useState<string>(
    'CoinGecko Live Market Index (NEAR/USDT)'
  );
  const [refreshingRate, setRefreshingRate] = useState(false);
  const [inputCurrency, setInputCurrency] = useState<'NEAR' | 'USDT'>(displayCurrency);

  // User-entered Rental Fee & Collateral in the selected `inputCurrency` (no hardcoded preset)
  const [rentalFeeInput, setRentalFeeInput] = useState<string>('');
  const [collateralInput, setCollateralInput] = useState<string>('');

  // AI Official Price Search State (explicit user action)
  const [aiPriceResult, setAiPriceResult] = useState<OfficialProductPriceSearchResult | null>(null);
  const [searchingOfficialPrice, setSearchingOfficialPrice] = useState(false);

  const [durationUnit, setDurationUnit] = useState<'DAYS' | 'HOURS'>('DAYS');
  const [minDuration, setMinDuration] = useState('1');
  const [maxDuration, setMaxDuration] = useState('5');
  const [conditions, setConditions] = useState(
    'Must be handled carefully and returned in identical condition. Both parties confirm handover and return on-chain.'
  );
  const [cancellationPolicy, setCancellationPolicy] = useState(
    '100% automatic refund if cancelled prior to lender acceptance.'
  );

  // Physical fields
  const [ownerEstimatedValueNear, setOwnerEstimatedValueNear] = useState('');
  const [itemCondition, setItemCondition] = useState('Excellent — Tested & Verified');
  const [includedAccessories, setIncludedAccessories] = useState('');
  const [pickupReturnInstructions, setPickupReturnInstructions] = useState(
    'In-person handover using BorrowBond one-time handover code.'
  );

  // Country-Aware Physical Location & Pickup Address State
  const [physicalLocation, setPhysicalLocation] = useState<PhysicalListingLocationFormState>({
    countryCode: lenderProfile?.countryCode || 'ET',
    regionName: lenderProfile?.regionName || 'Oromia',
    cityName: lenderProfile?.cityName || 'Adama',
    pickupArea: `${lenderProfile?.cityName || 'Adama'} Central`,
    street: 'Kebele 04, Ras Mekonnen Avenue',
    buildingName: 'Rift Valley Innovation Hub, Suite 204',
    postalCode: '1888',
    pickupVisibility: 'PRIVATE',
    publicAddressConfirmed: false,
    pickupInstructions:
      'Bring government ID and verify serial/QR tag during handover. Exact building entrance shared after acceptance.',
  });

  useEffect(() => {
    if (lenderProfile?.countryCode) {
      setPhysicalLocation((prev) => ({
        ...prev,
        countryCode: lenderProfile.countryCode || prev.countryCode,
        regionName: lenderProfile.regionName || prev.regionName,
        cityName: lenderProfile.cityName || prev.cityName,
        pickupArea: prev.pickupArea || `${lenderProfile.cityName || 'Adama'} Central`,
      }));
    }
  }, [lenderProfile?.countryCode, lenderProfile?.regionName, lenderProfile?.cityName]);

  // Digital fields
  const [digitalServiceType, setDigitalServiceType] = useState('Controlled REST Telemetry API');
  const [accessScope, setAccessScope] = useState('read:telemetry (Read-Only)');
  const [usageQuotaRequests, setUsageQuotaRequests] = useState('25');
  const [expirationBehavior, setExpirationBehavior] = useState(
    'Automatic server-side token revocation upon quota exhaustion or rental expiry.'
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [qrModalMode, setQrModalMode] = useState<'SCAN' | 'SHOW_TAG'>('SCAN');
  const [qrScanBanner, setQrScanBanner] = useState<string | null>(null);

  const handleProductQrScanned = (scanned: ScannedProductQrPayload) => {
    if (scanned.resourceType) {
      setResourceType(scanned.resourceType);
    }
    setTitle(scanned.title);
    setBrandAndModel(scanned.brandAndModel);
    setTinOrSerialNumber(scanned.tinOrSerialNumber);
    if (scanned.category) {
      setCategory(scanned.category);
    }
    if (scanned.description) {
      setDescription(scanned.description);
    }
    if (scanned.officialRetailPriceUsd) {
      const colUsd = Number((scanned.officialRetailPriceUsd / 2).toFixed(2));
      if (inputCurrency === 'USDT') {
        setCollateralInput(String(colUsd));
      } else {
        setCollateralInput(String(Number((colUsd / liveNearUsdRate).toFixed(4))));
      }
      setOwnerEstimatedValueNear(
        String(Number((scanned.officialRetailPriceUsd / liveNearUsdRate).toFixed(4)))
      );
    }
    if (scanned.specs?.accessoriesIncluded && scanned.specs.accessoriesIncluded.length > 0) {
      setIncludedAccessories(scanned.specs.accessoriesIncluded.join(', '));
    }
    if (scanned.specs?.conditionGrade) {
      setItemCondition(scanned.specs.conditionGrade);
    }
    setQrScanBanner(
      `Scanned Product QR Tag: ${scanned.brandAndModel} (${scanned.tinOrSerialNumber}) — Populated verified hardware specs.`
    );
    setErrorMsg(null);
  };

  // Sync with parent live rate and fetch fresh rate on mount
  useEffect(() => {
    if (initialNearUsdRate && Number.isFinite(initialNearUsdRate) && initialNearUsdRate > 0) {
      setLiveNearUsdRate(initialNearUsdRate);
    }
  }, [initialNearUsdRate]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/market/near-price')
      .then((r) => r.json())
      .then((data) => {
        if (mounted && data?.nearUsd && Number.isFinite(data.nearUsd)) {
          setLiveNearUsdRate(Number(data.nearUsd));
          onChangeNearUsdRate?.(Number(data.nearUsd));
          if (data.source) setNearPriceSource(data.source);
        }
      })
      .catch(() => {
        // Keep current live rate
      });
    return () => {
      mounted = false;
    };
  }, [onChangeNearUsdRate]);

  // Real-time deterministic AI official price & 50% collateral preview as user types title/description
  const liveAiPreview = useMemo(() => {
    const parsedFee = parseFloat(rentalFeeInput);
    return estimateOfficialProductPriceAndHalfCollateral({
      title: title || 'Professional Equipment',
      description: description || 'Verified item specifications',
      category,
      resourceType,
      nearUsdRate: liveNearUsdRate,
      desiredRentalFee: Number.isFinite(parsedFee) && parsedFee > 0 ? parsedFee : 10,
      desiredCurrency: inputCurrency,
    });
  }, [title, description, category, resourceType, liveNearUsdRate, rentalFeeInput, inputCurrency]);

  const activeAiResult = aiPriceResult || liveAiPreview;

  // Live currency conversions for Rental Fee and Collateral
  const feeConversion = useMemo(() => {
    const val = parseFloat(rentalFeeInput);
    return convertNearAndUsdt(Number.isFinite(val) ? val : 0, inputCurrency, liveNearUsdRate);
  }, [rentalFeeInput, inputCurrency, liveNearUsdRate]);

  const collateralConversion = useMemo(() => {
    const val = parseFloat(collateralInput);
    return convertNearAndUsdt(Number.isFinite(val) ? val : 0, inputCurrency, liveNearUsdRate);
  }, [collateralInput, inputCurrency, liveNearUsdRate]);

  const photoValidation = useMemo(() => validateListingPhotosCount(images), [images]);

  // Switch between NEAR and USDT while preserving the exact monetary value
  const handleCurrencyToggle = (targetCurrency: 'NEAR' | 'USDT') => {
    if (targetCurrency === inputCurrency) return;
    if (rentalFeeInput.trim()) {
      setRentalFeeInput(
        String(targetCurrency === 'NEAR' ? feeConversion.nearAmount : feeConversion.usdtAmount)
      );
    }
    if (collateralInput.trim()) {
      setCollateralInput(
        String(
          targetCurrency === 'NEAR'
            ? collateralConversion.nearAmount
            : collateralConversion.usdtAmount
        )
      );
    }
    setInputCurrency(targetCurrency);
  };

  const handleRefreshNearPrice = async () => {
    setRefreshingRate(true);
    try {
      const res = await fetch('/api/market/near-price?refresh=true');
      const data = await res.json();
      if (data?.nearUsd) {
        setLiveNearUsdRate(Number(data.nearUsd));
        if (data.source) setNearPriceSource(data.source);
      }
    } catch {
      // Retain current rate
    } finally {
      setRefreshingRate(false);
    }
  };

  // Run server-side AI Official Site Search & Apply Suggested 50% Collateral
  const handleRunAiOfficialPriceSearch = async () => {
    setSearchingOfficialPrice(true);
    setErrorMsg(null);
    try {
      const parsedFee = parseFloat(rentalFeeInput);
      const res = await fetch('/api/collateral/ai-price-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Equipment Listing',
          description: description.trim() || 'Standard verified condition',
          category,
          resourceType,
          nearUsdRate: liveNearUsdRate,
          desiredRentalFee: Number.isFinite(parsedFee) && parsedFee > 0 ? parsedFee : 10,
          desiredCurrency: inputCurrency,
        }),
      });
      const data = await res.json();
      if (res.ok && data.priceSearch) {
        const ps: OfficialProductPriceSearchResult = data.priceSearch;
        setAiPriceResult(ps);
        if (inputCurrency === 'USDT') {
          setCollateralInput(String(ps.recommendedCollateralUsd));
        } else {
          setCollateralInput(String(ps.recommendedCollateralNear));
        }
        setOwnerEstimatedValueNear(String(ps.officialRetailPriceNear));
      }
    } catch {
      if (inputCurrency === 'USDT') {
        setCollateralInput(String(liveAiPreview.recommendedCollateralUsd));
      } else {
        setCollateralInput(String(liveAiPreview.recommendedCollateralNear));
      }
      setOwnerEstimatedValueNear(String(liveAiPreview.officialRetailPriceNear));
    } finally {
      setSearchingOfficialPrice(false);
    }
  };

  // Multi-photo file uploader (supports selecting multiple files up to 10 total)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 10 - images.length;
    if (remainingSlots <= 0) {
      setErrorMsg('Maximum 10 photos allowed per listing. Remove a photo before adding another.');
      return;
    }

    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImages((prev) => (prev.length < 10 ? [...prev, reader.result as string] : prev));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleAddImageUrl = () => {
    const trimmed = customImageUrlInput.trim();
    if (!trimmed) return;
    if (images.length >= 10) {
      setErrorMsg('Maximum 10 product photos reached.');
      return;
    }
    setImages((prev) => [...prev, trimmed]);
    setCustomImageUrlInput('');
  };

  const handleRemovePhoto = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMakeCoverPhoto = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [chosen] = copy.splice(index, 1);
      copy.unshift(chosen);
      return copy;
    });
  };

  const handleResourceTypeSwitch = (type: 'PHYSICAL' | 'DIGITAL') => {
    setResourceType(type);
    if (type === 'DIGITAL') {
      setCategory('NFTs & Digital Accounts');
      setDurationUnit('HOURS');
      setMinDuration('24');
      setMaxDuration('72');
      setImages((prev) =>
        prev.length > 0 && prev[0] === SAMPLE_STUDIO_PHOTOS_PHYSICAL[0]
          ? SAMPLE_STUDIO_PHOTOS_DIGITAL
          : prev
      );
    } else {
      setCategory('Cameras & Optics');
      setDurationUnit('DAYS');
      setMinDuration('1');
      setMaxDuration('5');
      setImages((prev) =>
        prev.length > 0 && prev[0] === SAMPLE_STUDIO_PHOTOS_DIGITAL[0]
          ? [SAMPLE_STUDIO_PHOTOS_PHYSICAL[0], SAMPLE_STUDIO_PHOTOS_PHYSICAL[1]]
          : prev
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!photoValidation.valid) {
      setErrorMsg(photoValidation.error || 'Please attach between 2 and 10 product photos.');
      return;
    }

    const feeNear = feeConversion.nearAmount;
    const colNear = collateralConversion.nearAmount;
    const minD = parseInt(minDuration, 10);
    const maxD = parseInt(maxDuration, 10);

    if (title.trim().length < 4) {
      setErrorMsg('Resource title must be at least 4 characters.');
      return;
    }
    if (description.trim().length < 15) {
      setErrorMsg('Description must be at least 15 characters (include product specs for AI pricing).');
      return;
    }
    if (!Number.isFinite(feeNear) || feeNear <= 0) {
      setErrorMsg('Rental fee must be greater than 0.');
      return;
    }
    if (!Number.isFinite(colNear) || colNear < 0) {
      setErrorMsg('Required collateral cannot be negative.');
      return;
    }
    if (!Number.isFinite(minD) || minD <= 0 || !Number.isFinite(maxD) || maxD < minD) {
      setErrorMsg('Maximum duration must be greater than or equal to minimum duration.');
      return;
    }
    if (conditions.trim().length < 10) {
      setErrorMsg('Please specify clear borrowing conditions (at least 10 characters).');
      return;
    }

    if (resourceType === 'PHYSICAL') {
      const locCheck = validatePhysicalListingCreation({
        resourceType: 'PHYSICAL',
        lenderCountryCode: lenderProfile?.countryCode || physicalLocation.countryCode,
        listingCountryCode: physicalLocation.countryCode,
        regionName: physicalLocation.regionName,
        cityName: physicalLocation.cityName,
        pickupArea: physicalLocation.pickupArea,
        pickupAddress: physicalLocation.street,
        structuredAddress: {
          street: physicalLocation.street,
          buildingName: physicalLocation.buildingName,
          neighborhood: physicalLocation.pickupArea,
          city: physicalLocation.cityName,
          region: physicalLocation.regionName,
          postalCode: physicalLocation.postalCode,
          countryCode: physicalLocation.countryCode,
        },
        pickupVisibility: physicalLocation.pickupVisibility,
        publicAddressConfirmed: physicalLocation.publicAddressConfirmed,
      });

      if (!locCheck.valid) {
        setErrorMsg(locCheck.errors[0]);
        return;
      }
    }

    setSubmitting(true);
    try {
      const fullPickupAddress = [
        physicalLocation.street,
        physicalLocation.buildingName,
        physicalLocation.pickupArea,
        physicalLocation.cityName,
        physicalLocation.regionName,
        physicalLocation.postalCode,
      ]
        .filter(Boolean)
        .join(', ');

      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerWallet: connectedWallet,
          resourceType,
          title: title.trim(),
          description: description.trim(),
          category,
          brandAndModel: brandAndModel.trim() || title.trim(),
          tinOrSerialNumber:
            tinOrSerialNumber.trim() ||
            `TIN-BB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          digitalAssetSubtype: resourceType === 'DIGITAL' ? digitalAssetSubtype : undefined,
          images,
          imageUrl: images[0],
          rentalFeeNear: feeNear,
          collateralNear: colNear,
          officialRetailPriceUsd: activeAiResult.officialRetailPriceUsd,
          preferredCurrency: inputCurrency,
          nearUsdRateAtListing: liveNearUsdRate,
          durationUnit,
          minDuration: minD,
          maxDuration: maxD,
          conditions: conditions.trim(),
          cancellationPolicy: cancellationPolicy.trim(),
          ownerEstimatedValueNear:
            parseFloat(ownerEstimatedValueNear) || activeAiResult.officialRetailPriceNear,
          itemCondition,
          includedAccessories,
          pickupReturnInstructions:
            resourceType === 'PHYSICAL'
              ? physicalLocation.pickupInstructions || pickupReturnInstructions
              : pickupReturnInstructions,
          countryCode: resourceType === 'PHYSICAL' ? physicalLocation.countryCode : undefined,
          regionName: resourceType === 'PHYSICAL' ? physicalLocation.regionName : undefined,
          cityName: resourceType === 'PHYSICAL' ? physicalLocation.cityName : undefined,
          pickupArea: resourceType === 'PHYSICAL' ? physicalLocation.pickupArea : undefined,
          pickupAddress: resourceType === 'PHYSICAL' ? fullPickupAddress : undefined,
          structuredAddress:
            resourceType === 'PHYSICAL'
              ? {
                  street: physicalLocation.street,
                  buildingName: physicalLocation.buildingName,
                  neighborhood: physicalLocation.pickupArea,
                  city: physicalLocation.cityName,
                  region: physicalLocation.regionName,
                  postalCode: physicalLocation.postalCode,
                  countryCode: physicalLocation.countryCode,
                }
              : undefined,
          pickupVisibility:
            resourceType === 'PHYSICAL' ? physicalLocation.pickupVisibility : undefined,
          publicAddressConfirmed:
            resourceType === 'PHYSICAL' ? physicalLocation.publicAddressConfirmed : undefined,
          pickupInstructions:
            resourceType === 'PHYSICAL' ? physicalLocation.pickupInstructions : undefined,
          digitalServiceType,
          accessScope,
          usageQuotaRequests: parseInt(usageQuotaRequests, 10) || 20,
          expirationBehavior,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to publish listing');
      } else {
        onCreated(data.listing);
      }
    } catch {
      setErrorMsg('Network error publishing listing.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[#00EC97]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NEAR ESCROW &amp; ANTI-SCAM REGISTRY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-[#F5F8FF]">
            List a Physical or Digital Asset
          </h1>
          <p className="text-xs sm:text-sm text-[#9BA8C0]">
            Attach 2–10 photos, register your item&apos;s TIN/Serial or NFT ID, and set your rental price and refundable collateral in NEAR or USDT.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setQrModalMode('SCAN');
              setQrScannerOpen(true);
            }}
            className="btn-near-primary px-3.5 py-2 text-xs shrink-0"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan Product QR / Barcode</span>
          </button>
        </div>
      </div>

      {qrScanBanner && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-[#00EC97]/12 border border-[#00EC97]/40 text-xs text-[#00EC97] flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{qrScanBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setQrModalMode('SHOW_TAG');
              setQrScannerOpen(true);
            }}
            className="px-3 py-1 rounded-lg bg-[#06080F] border border-[#00EC97]/50 text-[#F5F8FF] font-semibold cursor-pointer shrink-0"
          >
            View Product QR Tag
          </button>
        </div>
      )}

      {/* Step 1: Select Physical vs Digital */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="radiogroup" aria-label="Resource Type">
        <button
          type="button"
          onClick={() => handleResourceTypeSwitch('PHYSICAL')}
          className={`p-5 rounded-2xl text-left transition-all cursor-pointer ${
            resourceType === 'PHYSICAL'
              ? 'near-glow-card'
              : 'near-glass-card hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-bold font-display text-[#F5F8FF]">
              Physical Item (Same-Country Borrowing)
            </span>
            <Camera className="w-4 h-4 text-[#00EC97]" />
          </div>
          <p className="text-xs text-[#9BA8C0]">
            Requires country, region, city &amp; pickup address. Borrowers and lenders must be in the
            same country for physical handover.
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleResourceTypeSwitch('DIGITAL')}
          className={`p-5 rounded-2xl text-left transition-all cursor-pointer ${
            resourceType === 'DIGITAL'
              ? 'near-glow-card'
              : 'near-glass-card hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-bold font-display text-[#F5F8FF]">
              Digital Resource (Global Availability)
            </span>
            <Cpu className="w-4 h-4 text-[#17F1D1]" />
          </div>
          <p className="text-xs text-[#9BA8C0]">
            Globally available across all countries. Instant temporary credentials &amp; API access
            after escrow lock.
          </p>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="near-glass-card rounded-2xl p-6 sm:p-8 space-y-7">
        {errorMsg && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-[#F87171]/10 border border-[#F87171]/40 text-xs text-[#F87171] flex items-center gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Section A: Product Title, Anti-Scam TIN/Serial Registry & Specifications */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="wiz-title" className="block text-xs font-semibold text-[#F5F8FF] mb-1.5">
              Product / Digital Asset Title *
            </label>
            <input
              id="wiz-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                resourceType === 'PHYSICAL'
                  ? 'iPhone 18 Pro Max — 256/32GB Silver'
                  : 'NEAR Zero-G Utility NFT Pass & Pro Account'
              }
              className="w-full px-4 py-2.5 text-sm bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
            />
          </div>

          <div>
            <label htmlFor="wiz-brand" className="block text-xs font-semibold text-[#F5F8FF] mb-1.5">
              Exact Brand &amp; Model (Anti-Scam Registry) *
            </label>
            <input
              id="wiz-brand"
              type="text"
              value={brandAndModel}
              onChange={(e) => setBrandAndModel(e.target.value)}
              placeholder={
                resourceType === 'PHYSICAL'
                  ? 'Apple iPhone 18 Pro Max 256/32 Silver'
                  : 'NEAR Zero-G NFT Pass #402'
              }
              className="w-full px-3.5 py-2.5 text-sm bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="wiz-tin" className="block text-xs font-semibold text-[#00EC97]">
                TIN / Serial / IMEI / NFT Token ID *
              </label>
              <button
                type="button"
                onClick={() => {
                  setQrModalMode('SCAN');
                  setQrScannerOpen(true);
                }}
                className="text-[11px] font-mono font-bold text-[#17F1D1] hover:text-[#00EC97] inline-flex items-center gap-1 cursor-pointer"
              >
                <QrCode className="w-3 h-3" />
                <span>Scan QR / Barcode</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="wiz-tin"
                type="text"
                value={tinOrSerialNumber}
                onChange={(e) => setTinOrSerialNumber(e.target.value)}
                placeholder={
                  resourceType === 'PHYSICAL'
                    ? 'TIN-AAPL-IP18PM-994821'
                    : 'NEP171-ZEROG-PASS-0402'
                }
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#06080F] border border-[#00EC97]/40 rounded-xl text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
              />
              <button
                type="button"
                title="Generate or Scan Product QR Tag"
                onClick={() => {
                  setQrModalMode('SHOW_TAG');
                  setQrScannerOpen(true);
                }}
                className="btn-near-secondary px-3 py-2.5 text-xs shrink-0"
              >
                <QrCode className="w-4 h-4 text-[#00EC97]" />
              </button>
            </div>
          </div>

          {resourceType === 'DIGITAL' && (
            <div className="sm:col-span-2">
              <label htmlFor="wiz-dsubtype" className="block text-xs font-semibold text-[#17F1D1] mb-1.5">
                Digital Product Type
              </label>
              <select
                id="wiz-dsubtype"
                value={digitalAssetSubtype}
                onChange={(e) =>
                  setDigitalAssetSubtype(
                    e.target.value as
                      | 'DIGITAL_ACCOUNT'
                      | 'NFT_ASSET'
                      | 'DIGITAL_PRODUCT'
                      | 'API_COMPUTE'
                  )
                }
                className="w-full px-3.5 py-2.5 text-sm bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF]"
              >
                <option value="DIGITAL_ACCOUNT">Digital Account / Pro Subscription Seat</option>
                <option value="NFT_ASSET">NFT Asset / Utility Pass (NEP-171)</option>
                <option value="DIGITAL_PRODUCT">Digital Product / Software License</option>
                <option value="API_COMPUTE">Metered API / GPU Compute Slot</option>
              </select>
            </div>
          )}

          <div className="sm:col-span-2">
            <label htmlFor="wiz-desc" className="block text-xs font-semibold text-[#F5F8FF] mb-1.5">
              Specifications &amp; Description *{' '}
              <span className="text-[#00EC97] font-normal">
                (AI reads specs to find the official retail price and set 50% collateral)
              </span>
            </label>
            <textarea
              id="wiz-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="iPhone 18 Pro Max 256GB / 32GB Silver in mint condition ($1,000 official retail). Includes original box and USB-C fast charger."
              className="w-full px-4 py-2.5 text-sm bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
            />
          </div>

          <div>
            <label htmlFor="wiz-cat" className="block text-xs font-semibold text-[#9BA8C0] mb-1.5">
              Category
            </label>
            <select
              id="wiz-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF]"
            >
              {resourceType === 'PHYSICAL' ? (
                <>
                  <option value="Mobile & Flagship Devices">Mobile & Flagship Devices</option>
                  <option value="Cameras & Optics">Cameras & Optics</option>
                  <option value="Audio & Projection">Audio & Projection</option>
                  <option value="Drones & Robotics">Drones & Robotics</option>
                </>
              ) : (
                <>
                  <option value="NFTs & Digital Accounts">NFTs & Digital Accounts</option>
                  <option value="Weather & Telemetry API">Weather & Telemetry API</option>
                  <option value="GPU & AI Compute">GPU & AI Compute</option>
                  <option value="Licensed Datasets">Licensed Datasets</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label htmlFor="wiz-unit" className="block text-xs font-semibold text-[#9BA8C0] mb-1.5">
              Duration Unit
            </label>
            <select
              id="wiz-unit"
              value={durationUnit}
              onChange={(e) => setDurationUnit(e.target.value as 'DAYS' | 'HOURS')}
              className="w-full px-3.5 py-2.5 text-sm bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF]"
            >
              <option value="DAYS">Days</option>
              <option value="HOURS">Hours</option>
            </select>
          </div>
        </div>

        {/* Section B: Multi-Photo Uploader & Gallery (Min 2 Photos, Max 10 Photos) */}
        <div className="p-5 rounded-2xl bg-[#06080F]/90 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold font-display text-[#F5F8FF] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#00EC97]" />
                <span>Product Photo Gallery (Minimum 2 Photos • Maximum 10 Photos) *</span>
              </h2>
              <p className="text-xs text-[#9BA8C0]">
                Attach 2 to 10 clear photos showing front, back, serial/specs, and accessories. Photo #1 is the cover image.
              </p>
            </div>

            <span
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold ${
                photoValidation.valid
                  ? 'bg-[#00EC97]/15 text-[#00EC97] border border-[#00EC97]/30'
                  : 'bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30'
              }`}
            >
              {images.length} / 10 Photos ({photoValidation.valid ? 'Valid' : 'Min 2 Required'})
            </span>
          </div>

          {/* Upload & Quick-Add Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn-near-primary px-4 py-2 text-xs cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Product Photos (2–10)</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => setImages(SAMPLE_STUDIO_PHOTOS_PHYSICAL)}
              className="btn-near-secondary px-3 py-2 text-xs"
            >
              <span>Use Sample Camera/Hardware Photos</span>
            </button>

            <div className="flex items-center gap-1.5 flex-1 min-w-[220px]">
              <input
                type="url"
                value={customImageUrlInput}
                onChange={(e) => setCustomImageUrlInput(e.target.value)}
                placeholder="Or paste image URL..."
                className="flex-1 px-3 py-1.5 text-xs bg-[#0B1020] border border-slate-800 rounded-lg text-[#F5F8FF]"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                disabled={images.length >= 10}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-[#F5F8FF] hover:bg-slate-700 cursor-pointer"
              >
                Add URL
              </button>
            </div>
          </div>

          {/* Photo Thumbnails Grid (2 to 10 slots) in Frosted Glass Frames */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
            {images.map((imgSrc, idx) => (
              <div
                key={`${idx}-${imgSrc.slice(0, 24)}`}
                className={`glass-image-frame relative group overflow-hidden aspect-4/3 ${
                  idx === 0 ? 'ring-2 ring-[#00EC97]' : ''
                }`}
              >
                <img
                  src={imgSrc}
                  alt={`Product angle ${idx + 1}`}
                  className="w-full h-full object-cover rounded-xl"
                />
                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-[#06080F]/85 text-[10px] font-mono font-bold text-[#00EC97]">
                  {idx === 0 ? 'COVER #1' : `#${idx + 1}`}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-[#06080F]/95 via-[#06080F]/70 to-transparent flex items-center justify-between opacity-95">
                  {idx !== 0 ? (
                    <button
                      type="button"
                      onClick={() => handleMakeCoverPhoto(idx)}
                      className="text-[10px] font-semibold text-[#17F1D1] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Star className="w-2.5 h-2.5" />
                      <span>Set Cover</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-[#9BA8C0]">Primary</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    aria-label={`Remove photo ${idx + 1}`}
                    className="p-1 rounded bg-[#F87171]/20 text-[#F87171] hover:bg-[#F87171]/40 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section C: AI Official Site Price Search & 50% Auto-Collateral Engine */}
        <div className="near-glow-card rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#00EC97]">
                <Globe className="w-3.5 h-3.5" />
                <span>AI OFFICIAL RETAIL PRICE SEARCH & 50% COLLATERAL ENGINE</span>
              </div>
              <p className="text-xs text-[#9BA8C0]">
                Searches official retail benchmarks for your product specs and automatically divides the retail price in half (50%) as recommended refundable collateral.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunAiOfficialPriceSearch}
              disabled={searchingOfficialPrice}
              className="btn-near-primary px-4 py-2.5 text-xs shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {searchingOfficialPrice
                  ? 'Searching Official Retail Specs...'
                  : 'AI Auto-Search Price & Set 50% Collateral'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-[#06080F]/85 border border-slate-800/90 space-y-1">
              <span className="text-[11px] text-[#9BA8C0] block">Official Retail Market Price</span>
              <span className="text-base font-mono font-extrabold text-[#F5F8FF] block tabular-nums">
                ${activeAiResult.officialRetailPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
              </span>
              <span className="text-[11px] font-mono text-[#00EC97] block tabular-nums">
                ≈ {activeAiResult.officialRetailPriceNear} NEAR (at ${liveNearUsdRate.toFixed(2)})
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#06080F]/85 border border-[#00EC97]/40 space-y-1">
              <span className="text-[11px] text-[#00EC97] font-semibold block">
                50% Auto-Suggested Collateral (Retail ÷ 2)
              </span>
              <span className="text-base font-mono font-extrabold text-[#00EC97] block tabular-nums">
                ${activeAiResult.recommendedCollateralUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
              </span>
              <span className="text-[11px] font-mono text-[#F5F8FF] block tabular-nums">
                = {activeAiResult.recommendedCollateralNear} NEAR
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#06080F]/85 border border-slate-800/90 space-y-1">
              <span className="text-[11px] text-[#9BA8C0] block">Matched Product & Specs</span>
              <span className="text-xs font-bold text-[#F5F8FF] block truncate">
                {activeAiResult.matchedProductName}
              </span>
              <span className="text-[11px] text-[#17F1D1] block truncate">
                {activeAiResult.detectedSpecs.join(' • ')}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#9BA8C0] pt-1 border-t border-slate-800/70">
            <span>Source: {activeAiResult.officialSourceSummary}</span>
            <button
              type="button"
              onClick={() => {
                if (inputCurrency === 'USDT') {
                  setCollateralInput(String(activeAiResult.recommendedCollateralUsd));
                } else {
                  setCollateralInput(String(activeAiResult.recommendedCollateralNear));
                }
                setOwnerEstimatedValueNear(String(activeAiResult.officialRetailPriceNear));
              }}
              className="font-mono font-bold text-[#00EC97] hover:underline cursor-pointer"
            >
              Apply 50% Collateral (${activeAiResult.recommendedCollateralUsd} USDT / {activeAiResult.recommendedCollateralNear} NEAR) →
            </button>
          </div>
        </div>

        {/* Section D: Live NEAR Price Bar & Dual-Currency (NEAR / USDT) Pricing Inputs */}
        <div className="p-5 rounded-2xl bg-[#06080F]/90 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div className="space-y-0.5">
              <span className="text-xs font-bold font-display text-[#F5F8FF] flex items-center gap-2">
                <ArrowLeftRight className="w-3.5 h-3.5 text-[#00EC97]" />
                <span>Live NEAR / USDT Price Calculator & Currency Switcher</span>
              </span>
              <span className="text-[11px] text-[#9BA8C0] block">
                {nearPriceSource} • Enter your price in either USDT or NEAR and see automatic real-time conversion.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Live 1 NEAR = $X.XX Rate Pill + Refresh */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0D1322] border border-slate-800 text-xs">
                <NearTokenIcon size={15} />
                <span className="text-[#9BA8C0] font-mono">1 NEAR =</span>
                <UsdtTokenIcon size={15} />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  aria-label="Live NEAR price in USD"
                  value={liveNearUsdRate}
                  onChange={(e) => {
                    const r = parseFloat(e.target.value);
                    if (Number.isFinite(r) && r > 0) {
                      setLiveNearUsdRate(r);
                      onChangeNearUsdRate?.(r);
                    }
                  }}
                  className="w-16 font-mono font-bold text-[#00EC97] bg-transparent focus:outline-none tabular-nums"
                />
                <span className="text-[#9BA8C0] font-mono">USDT</span>
                <button
                  type="button"
                  onClick={handleRefreshNearPrice}
                  title="Check live NEAR price on internet"
                  className="p-1 text-[#9BA8C0] hover:text-[#00EC97] cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingRate ? 'animate-spin text-[#00EC97]' : ''}`} />
                </button>
              </div>

              {/* Currency Switcher: USDT vs NEAR with Official 2D Icons */}
              <div
                role="group"
                aria-label="Pricing Input Currency"
                className="flex items-center bg-[#0D1322] p-1 rounded-xl border border-slate-800"
              >
                <button
                  type="button"
                  onClick={() => handleCurrencyToggle('USDT')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    inputCurrency === 'USDT'
                      ? 'bg-[#26A17B] text-white'
                      : 'text-[#9BA8C0] hover:text-[#F5F8FF]'
                  }`}
                >
                  <UsdtTokenIcon size={14} />
                  <span>USDT</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCurrencyToggle('NEAR')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    inputCurrency === 'NEAR'
                      ? 'bg-[#00EC97] text-[#04080E]'
                      : 'text-[#9BA8C0] hover:text-[#F5F8FF]'
                  }`}
                >
                  <NearTokenIcon size={14} />
                  <span>NEAR</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rental Fee Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="wiz-fee" className="font-semibold text-[#F5F8FF]">
                  Rental Fee ({inputCurrency}) *
                </label>
                <span className="font-mono text-[#00EC97] tabular-nums">
                  {inputCurrency === 'USDT'
                    ? `= ${feeConversion.nearAmount} NEAR`
                    : `= $${feeConversion.usdtAmount.toFixed(2)} USDT`}
                </span>
              </div>
              <input
                id="wiz-fee"
                type="number"
                step="any"
                value={rentalFeeInput}
                onChange={(e) => setRentalFeeInput(e.target.value)}
                placeholder={
                  inputCurrency === 'USDT'
                    ? `e.g. 15 USDT (= ${Number((15 / liveNearUsdRate).toFixed(4))} NEAR)`
                    : `e.g. ${Number((15 / liveNearUsdRate).toFixed(4))} NEAR (= $15.00 USDT)`
                }
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-[#0B1020] border border-slate-800 rounded-xl text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
              />
              <p className="text-[11px] font-mono text-[#9BA8C0]">
                Live auto-calc: <strong className="text-[#F5F8FF]">{feeConversion.nearAmount} NEAR</strong> /{' '}
                <strong className="text-[#00EC97]">${feeConversion.usdtAmount.toFixed(2)} USDT</strong> (at 1 NEAR = ${liveNearUsdRate.toFixed(2)})
              </p>
            </div>

            {/* Refundable Collateral Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="wiz-col" className="font-semibold text-[#F5F8FF]">
                  Refundable Collateral ({inputCurrency}) *
                </label>
                <span className="font-mono text-[#17F1D1] tabular-nums">
                  {inputCurrency === 'USDT'
                    ? `= ${collateralConversion.nearAmount} NEAR`
                    : `= $${collateralConversion.usdtAmount.toFixed(2)} USDT`}
                </span>
              </div>
              <input
                id="wiz-col"
                type="number"
                step="any"
                value={collateralInput}
                onChange={(e) => setCollateralInput(e.target.value)}
                placeholder={
                  inputCurrency === 'USDT'
                    ? `50% Official Retail: $${activeAiResult.recommendedCollateralUsd} USDT (= ${activeAiResult.recommendedCollateralNear} NEAR)`
                    : `50% Official Retail: ${activeAiResult.recommendedCollateralNear} NEAR (= $${activeAiResult.recommendedCollateralUsd} USDT)`
                }
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-[#0B1020] border border-[#00EC97]/40 rounded-xl text-[#00EC97] focus:outline-none focus:border-[#00EC97]"
              />
              <p className="text-[11px] font-mono text-[#9BA8C0]">
                Escrow lock: <strong className="text-[#00EC97]">{collateralConversion.nearAmount} NEAR</strong> /{' '}
                <strong className="text-[#F5F8FF]">${collateralConversion.usdtAmount.toFixed(2)} USDT</strong> (100% refundable on return)
              </p>
            </div>

            <div>
              <label htmlFor="wiz-min" className="block text-xs font-medium text-[#9BA8C0] mb-1">
                Minimum Duration ({durationUnit.toLowerCase()})
              </label>
              <input
                id="wiz-min"
                type="number"
                value={minDuration}
                onChange={(e) => setMinDuration(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-[#0B1020] border border-slate-800 rounded-xl text-[#F5F8FF]"
              />
            </div>

            <div>
              <label htmlFor="wiz-max" className="block text-xs font-medium text-[#9BA8C0] mb-1">
                Maximum Duration ({durationUnit.toLowerCase()})
              </label>
              <input
                id="wiz-max"
                type="number"
                value={maxDuration}
                onChange={(e) => setMaxDuration(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-[#0B1020] border border-slate-800 rounded-xl text-[#F5F8FF]"
              />
            </div>
          </div>
        </div>

        {/* Resource-Type Specific Section */}
        {resourceType === 'PHYSICAL' ? (
          <div className="pt-4 border-t border-slate-800 space-y-5">
            <AddressForm
              value={physicalLocation}
              lenderProfile={lenderProfile}
              onChange={setPhysicalLocation}
            />

            <h2 className="text-xs font-semibold text-[#00EC97]">
              Physical Hardware Verification Fields
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="wiz-val" className="block text-xs text-[#9BA8C0] mb-1">
                  Official / Estimated Retail Value (NEAR)
                </label>
                <input
                  id="wiz-val"
                  type="number"
                  step="any"
                  value={ownerEstimatedValueNear}
                  onChange={(e) => setOwnerEstimatedValueNear(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF]"
                />
              </div>
              <div>
                <label htmlFor="wiz-cond" className="block text-xs text-[#9BA8C0] mb-1">
                  Current Item Condition
                </label>
                <input
                  id="wiz-cond"
                  type="text"
                  value={itemCondition}
                  onChange={(e) => setItemCondition(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF]"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="wiz-acc" className="block text-xs text-[#9BA8C0] mb-1">
                  Included Accessories (comma-separated)
                </label>
                <input
                  id="wiz-acc"
                  type="text"
                  value={includedAccessories}
                  onChange={(e) => setIncludedAccessories(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF]"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <h2 className="text-xs font-semibold text-[#17F1D1]">
              Digital Access & Quota Provisioning Fields (No Plaintext Secrets Stored)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="wiz-dtype" className="block text-xs text-[#9BA8C0] mb-1">
                  Service Type
                </label>
                <input
                  id="wiz-dtype"
                  type="text"
                  value={digitalServiceType}
                  onChange={(e) => setDigitalServiceType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF]"
                />
              </div>
              <div>
                <label htmlFor="wiz-quota" className="block text-xs text-[#9BA8C0] mb-1">
                  Permitted Usage Quota (API Requests)
                </label>
                <input
                  id="wiz-quota"
                  type="number"
                  value={usageQuotaRequests}
                  onChange={(e) => setUsageQuotaRequests(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF]"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="wiz-scope" className="block text-xs text-[#9BA8C0] mb-1">
                  Allowed Permissions / Access Scope
                </label>
                <input
                  id="wiz-scope"
                  type="text"
                  value={accessScope}
                  onChange={(e) => setAccessScope(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF]"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="wiz-exp" className="block text-xs text-[#9BA8C0] mb-1">
                  Expiration & Revocation Behavior
                </label>
                <input
                  id="wiz-exp"
                  type="text"
                  value={expirationBehavior}
                  onChange={(e) => setExpirationBehavior(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF]"
                />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div>
            <label htmlFor="wiz-terms" className="block text-xs text-[#9BA8C0] mb-1">
              Borrowing Conditions & Restrictions *
            </label>
            <textarea
              id="wiz-terms"
              rows={2}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF]"
            />
          </div>
          <div>
            <label htmlFor="wiz-cancel" className="block text-xs text-[#9BA8C0] mb-1">
              Cancellation Policy
            </label>
            <input
              id="wiz-cancel"
              type="text"
              value={cancellationPolicy}
              onChange={(e) => setCancellationPolicy(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn-near-secondary px-4 py-2.5 text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-near-primary px-6 py-2.5 text-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {submitting
                ? 'Publishing Listing...'
                : `Publish Resource Listing (${images.length} Photos)`}
            </span>
          </button>
        </div>
      </form>

      <ProductQrScannerModal
        isOpen={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        mode={qrModalMode}
        title="Scan Product QR or Serial Barcode to Auto-Fill Listing"
        subtitle="Scan a BorrowBond Anti-Scam Product QR tag or device IMEI/Serial sticker to auto-populate specs & 50% collateral."
        activeProductTag={{
          title: title.trim() || 'iPhone 18 Pro Max — 256/32GB Titanium Silver',
          brandAndModel: brandAndModel.trim() || 'Apple iPhone 18 Pro Max (256GB / 32GB Silver)',
          tinOrSerialNumber: tinOrSerialNumber.trim() || 'TIN-AAPL-IP18PM-994821',
          category,
          resourceType,
          officialRetailPriceUsd: activeAiResult.officialRetailPriceUsd,
        }}
        onScanSuccess={handleProductQrScanned}
      />
    </div>
  );
};
