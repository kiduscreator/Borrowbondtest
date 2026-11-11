import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles,
  Plus,
  Images,
  ArrowLeftRight,
  QrCode,
  Camera,
  Eye,
  TrendingUp,
  Star,
  MapPin,
  Globe,
  X,
} from 'lucide-react';
import {
  matchesListingTitleOrDescription,
  type MarketplaceListing,
  type ProviderProfile,
} from '../lib/security/policyEngine';
import { ResilientImage } from '../components/ResilientImage';
import { NearTokenIcon, UsdtTokenIcon } from '../components/TokenIcons';
import {
  ProductQrScannerModal,
  type ScannedProductQrPayload,
} from '../components/ProductQrScannerModal';
import {
  CountryBadge,
  CountryFlag,
  SameCountryIndicator,
} from '../components/CountryLocationComponents';
import {
  COUNTRY_CATALOG,
  evaluatePhysicalEligibility,
  getCountryFlagEmoji,
  getCountryName,
} from '../lib/location/countryLocationEngine';

interface MarketplaceViewProps {
  listings: MarketplaceListing[];
  profiles: Record<string, ProviderProfile>;
  connectedWallet?: string;
  initialCategory: 'ALL' | 'PHYSICAL' | 'DIGITAL';
  nearUsdRate?: number;
  displayCurrency?: 'NEAR' | 'USDT';
  onToggleCurrency?: (currency: 'NEAR' | 'USDT') => void;
  onOpenListing: (listingId: string) => void;
  onNavigateCreate: () => void;
  onOpenAiAgent: () => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  listings,
  profiles,
  connectedWallet = 'alex-builder.testnet',
  initialCategory,
  nearUsdRate = 3.7,
  displayCurrency = 'NEAR',
  onToggleCurrency,
  onOpenListing,
  onNavigateCreate,
  onOpenAiAgent,
}) => {
  const callerProfile = profiles[connectedWallet];
  const userCountryCode = (callerProfile?.countryCode || 'ET').toUpperCase();

  const [resourceFilter, setResourceFilter] = useState<'ALL' | 'PHYSICAL' | 'DIGITAL'>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  // Default physical listings to the authenticated user's country ("MY_COUNTRY"), with option to inspect ALL or specific countries
  const [countryFilter, setCountryFilter] = useState<string>('MY_COUNTRY');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');
  const [maxFeeNear, setMaxFeeNear] = useState<number>(500);
  const [maxCollateralNear, setMaxCollateralNear] = useState<number>(1000);
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(true);
  const [minCompletedDeals, setMinCompletedDeals] = useState<number>(0);
  const [sortBy, setSortBy] = useState<
    'RELEVANCE' | 'PRICE_ASC' | 'COLLATERAL_ASC' | 'NEWEST' | 'POPULARITY'
  >('RELEVANCE');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrModalMode, setQrModalMode] = useState<'SCAN' | 'SHOW_TAG' | 'SPECS_CAPTURE' | 'TRUST_VERIFY'>('SCAN');
  const [activeQrListing, setActiveQrListing] = useState<MarketplaceListing | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((l) => set.add(l.category));
    return ['ALL', ...Array.from(set)];
  }, [listings]);

  const activePhysicalCountryCode =
    countryFilter === 'MY_COUNTRY'
      ? userCountryCode
      : countryFilter === 'ALL_COUNTRIES'
      ? null
      : countryFilter;

  const availableRegions = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((l) => {
      if (l.resourceType === 'PHYSICAL' && l.regionName) {
        if (!activePhysicalCountryCode || l.countryCode?.toUpperCase() === activePhysicalCountryCode) {
          set.add(l.regionName);
        }
      }
    });
    return ['ALL', ...Array.from(set)];
  }, [listings, activePhysicalCountryCode]);

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((l) => {
      if (l.resourceType === 'PHYSICAL' && l.cityName) {
        if (!activePhysicalCountryCode || l.countryCode?.toUpperCase() === activePhysicalCountryCode) {
          if (regionFilter === 'ALL' || l.regionName === regionFilter) {
            set.add(l.cityName);
          }
        }
      }
    });
    return ['ALL', ...Array.from(set)];
  }, [listings, activePhysicalCountryCode, regionFilter]);

  const filteredListings = useMemo(() => {
    return listings
      .filter((item) => {
        if (resourceFilter !== 'ALL' && item.resourceType !== resourceFilter) return false;
        if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
        if (onlyAvailable && item.availabilityStatus !== 'AVAILABLE') return false;
        if (item.rentalFeeNear > maxFeeNear) return false;
        if (item.collateralNear > maxCollateralNear) return false;

        // Country, Region, and City filtering for PHYSICAL listings (DIGITAL remains globally available)
        if (item.resourceType === 'PHYSICAL') {
          const itemCountry = (
            item.countryCode ||
            profiles[item.ownerWallet]?.countryCode ||
            ''
          ).toUpperCase();
          if (activePhysicalCountryCode && itemCountry !== activePhysicalCountryCode) {
            return false;
          }
          if (regionFilter !== 'ALL' && item.regionName !== regionFilter) {
            return false;
          }
          if (cityFilter !== 'ALL' && item.cityName !== cityFilter) {
            return false;
          }
        }

        const prov = profiles[item.ownerWallet];
        const deals = (prov?.completedLends ?? 0) + (prov?.completedBorrows ?? 0);
        if (deals < minCompletedDeals) return false;

        if (!matchesListingTitleOrDescription(item, searchQuery)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'POPULARITY') {
          return (b.viewsCount ?? 0) - (a.viewsCount ?? 0);
        }
        if (sortBy === 'PRICE_ASC') return a.rentalFeeNear - b.rentalFeeNear;
        if (sortBy === 'COLLATERAL_ASC') return a.collateralNear - b.collateralNear;
        if (sortBy === 'NEWEST') {
          return new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime();
        }
        return 0;
      });
  }, [
    listings,
    profiles,
    resourceFilter,
    selectedCategory,
    activePhysicalCountryCode,
    regionFilter,
    cityFilter,
    onlyAvailable,
    maxFeeNear,
    maxCollateralNear,
    minCompletedDeals,
    searchQuery,
    sortBy,
  ]);

  const handleResetFilters = () => {
    setResourceFilter('ALL');
    setSearchQuery('');
    setSelectedCategory('ALL');
    setCountryFilter('MY_COUNTRY');
    setRegionFilter('ALL');
    setCityFilter('ALL');
    setMaxFeeNear(500);
    setMaxCollateralNear(1000);
    setOnlyAvailable(true);
    setMinCompletedDeals(0);
    setSortBy('RELEVANCE');
  };

  const formatAmount = (nearAmount: number) => {
    const usdt = Number((nearAmount * nearUsdRate).toFixed(2));
    if (displayCurrency === 'USDT') {
      return {
        primary: `${usdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`,
        secondary: `${nearAmount} NEAR`,
        isUsdtPrimary: true,
      };
    }
    return {
      primary: `${nearAmount} NEAR`,
      secondary: `≈ ${usdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`,
      isUsdtPrimary: false,
    };
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header & Resource Type Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#27312A] pb-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#F2F5F1]">
            Marketplace
          </h1>
          <p className="text-sm text-[#A0AAA2]">
            Browse physical equipment in your country and globally available digital resources.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented Resource Filter */}
          <div
            role="group"
            aria-label="Resource Type Filter"
            className="flex items-center gap-1 p-1 bg-[#101612]/80 backdrop-blur-md border border-[#27312A] rounded-full"
          >
            {(['ALL', 'PHYSICAL', 'DIGITAL'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setResourceFilter(tab)}
                className={`px-4 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer glass-nav-pill ${
                  resourceFilter === tab
                    ? 'glass-nav-pill-active text-[#8BD6A7]'
                    : 'text-[#A0AAA2] hover:text-[#F2F5F1]'
                }`}
              >
                {tab === 'ALL' ? 'All Resources' : tab === 'PHYSICAL' ? 'Physical' : 'Digital'}
              </button>
            ))}
          </div>

          {onToggleCurrency && (
            <button
              type="button"
              onClick={() => onToggleCurrency(displayCurrency === 'NEAR' ? 'USDT' : 'NEAR')}
              className="btn-near-secondary px-3 py-2 text-xs whitespace-nowrap shrink-0"
            >
              {displayCurrency === 'NEAR' ? <NearTokenIcon size={14} /> : <UsdtTokenIcon size={14} />}
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#8BD6A7]" />
              <span>{displayCurrency}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveQrListing(listings[0] || null);
              setQrModalMode('TRUST_VERIFY');
              setQrModalOpen(true);
            }}
            className="btn-near-secondary px-3.5 py-2 text-xs whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-[#8BD6A7]" />
            <span>Verify QR</span>
          </button>

          <button
            type="button"
            onClick={onOpenAiAgent}
            className="btn-near-secondary px-3.5 py-2 text-xs whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#8BD6A7]" />
            <span>AI Assistant</span>
          </button>

          <button
            type="button"
            onClick={onNavigateCreate}
            className="btn-near-primary px-4 py-2 text-xs whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>List Item</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="near-glass-card rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="mkt-search" className="block text-xs text-[#9BA8C0] mb-1.5">
              Search Listings by Title or Description
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#9BA8C0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="mkt-search"
                data-testid="marketplace-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search listings by title or description"
                placeholder="Filter by title or description (e.g., Sony Alpha, Pelican case)..."
                className="w-full pl-9 pr-9 py-2 text-xs bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF] placeholder:text-slate-500 focus:outline-none focus:border-[#00EC97]"
              />
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  data-testid="marketplace-search-clear"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#9BA8C0] hover:text-[#F5F8FF] hover:bg-slate-800/80 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="mkt-category" className="block text-xs text-[#9BA8C0] mb-1.5">
              Category
            </label>
            <select
              id="mkt-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="mkt-sort" className="block text-xs text-[#9BA8C0] mb-1.5">
              Sort By
            </label>
            <div className="relative">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#9BA8C0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="mkt-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
              >
                <option value="RELEVANCE">Relevance</option>
                <option value="POPULARITY">Popularity: Most Viewed</option>
                <option value="PRICE_ASC">Rental Fee: Low to High</option>
                <option value="COLLATERAL_ASC">Collateral: Low to High</option>
                <option value="NEWEST">Newest Listed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-800/80 items-end">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="mkt-max-fee" className="text-[#9BA8C0]">Max Rental Fee</label>
              <span className="font-mono text-[#F5F8FF] tabular-nums">
                {maxFeeNear} NEAR (${(maxFeeNear * nearUsdRate).toFixed(0)})
              </span>
            </div>
            <input
              id="mkt-max-fee"
              type="range"
              min="0.05"
              max="500"
              step="0.05"
              value={maxFeeNear}
              onChange={(e) => setMaxFeeNear(parseFloat(e.target.value))}
              className="w-full accent-[#00EC97] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="mkt-max-col" className="text-[#9BA8C0]">Max Collateral</label>
              <span className="font-mono text-[#00EC97] tabular-nums">
                {maxCollateralNear} NEAR (${(maxCollateralNear * nearUsdRate).toFixed(0)})
              </span>
            </div>
            <input
              id="mkt-max-col"
              type="range"
              min="0.1"
              max="1000"
              step="0.5"
              value={maxCollateralNear}
              onChange={(e) => setMaxCollateralNear(parseFloat(e.target.value))}
              className="w-full accent-[#00EC97] cursor-pointer"
            />
          </div>

          <div>
            <label htmlFor="mkt-min-rep" className="block text-xs text-[#9BA8C0] mb-1">
              Provider Completed Deals
            </label>
            <select
              id="mkt-min-rep"
              value={minCompletedDeals}
              onChange={(e) => setMinCompletedDeals(Number(e.target.value))}
              className="w-full px-3 py-1.5 text-xs bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF]"
            >
              <option value={0}>Any History (Include New Providers)</option>
              <option value={5}>5+ Completed Deals</option>
              <option value={15}>15+ Completed Deals</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-[#F5F8FF] cursor-pointer">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="rounded accent-[#00EC97]"
              />
              <span>Available Only</span>
            </label>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-[#00EC97] hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Country, Region & City Physical Location Filters */}
        <div className="pt-3 border-t border-slate-800/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <MapPin className="w-3.5 h-3.5 text-[#00EC97]" />
              <span className="font-bold text-[#F5F8FF]" data-testid="physical-country-filter-banner">
                {countryFilter === 'MY_COUNTRY'
                  ? `Physical items available in your country (${getCountryFlagEmoji(userCountryCode)} ${getCountryName(userCountryCode)})`
                  : countryFilter === 'ALL_COUNTRIES'
                  ? 'Viewing physical items across all countries (cross-country items show restriction alert)'
                  : `Filtering physical items in ${getCountryFlagEmoji(countryFilter)} ${getCountryName(countryFilter)}`}
              </span>
              <span className="text-[11px] text-[#9BA8C0] hidden sm:inline">
                • Digital resources remain globally available
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="toggle-all-countries-btn"
                onClick={() => {
                  setCountryFilter((prev) =>
                    prev === 'MY_COUNTRY' ? 'ALL_COUNTRIES' : 'MY_COUNTRY'
                  );
                  setRegionFilter('ALL');
                  setCityFilter('ALL');
                }}
                className="px-2.5 py-1 rounded-lg bg-[#0D1322] border border-slate-700 hover:border-[#00EC97]/50 text-[11px] font-semibold text-[#00EC97] cursor-pointer"
              >
                {countryFilter === 'MY_COUNTRY'
                  ? 'Browse All Countries (Inspect Cross-Country)'
                  : `Filter to My Country (${getCountryFlagEmoji(userCountryCode)} ${getCountryName(userCountryCode)})`}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="mkt-country" className="block text-xs text-[#9BA8C0] mb-1">
                Physical Item Country
              </label>
              <select
                id="mkt-country"
                value={countryFilter}
                onChange={(e) => {
                  setCountryFilter(e.target.value);
                  setRegionFilter('ALL');
                  setCityFilter('ALL');
                }}
                className="w-full px-3 py-1.5 text-xs bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF]"
              >
                <option value="MY_COUNTRY">
                  {getCountryFlagEmoji(userCountryCode)} Physical items available in your country ({getCountryName(userCountryCode)})
                </option>
                <option value="ALL_COUNTRIES">🌐 All Countries (Include Cross-Country Items)</option>
                {COUNTRY_CATALOG.map((c) => (
                  <option key={c.code} value={c.code}>
                    {getCountryFlagEmoji(c.code)} {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="mkt-region" className="block text-xs text-[#9BA8C0] mb-1">
                Region / State / Province
              </label>
              <select
                id="mkt-region"
                value={regionFilter}
                onChange={(e) => {
                  setRegionFilter(e.target.value);
                  setCityFilter('ALL');
                }}
                className="w-full px-3 py-1.5 text-xs bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF]"
              >
                {availableRegions.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg === 'ALL' ? 'All Regions' : reg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="mkt-city" className="block text-xs text-[#9BA8C0] mb-1">
                City / Pickup Area
              </label>
              <select
                id="mkt-city"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-[#06080F] border border-slate-800 rounded-xl text-[#F5F8FF]"
              >
                {availableCities.map((cty) => (
                  <option key={cty} value={cty}>
                    {cty === 'ALL' ? 'All Cities' : cty}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9BA8C0]">
        <div className="flex flex-wrap items-center gap-2">
          <span data-testid="marketplace-results-count">
            Showing <strong className="text-[#F5F8FF] font-mono tabular-nums">{filteredListings.length}</strong> of {listings.length} resources
          </span>
          {searchQuery.trim() && (
            <span className="inline-flex items-center gap-1.5 text-[#00EC97]">
              <span>· Filtered by &ldquo;{searchQuery.trim()}&rdquo;</span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="underline hover:text-[#F5F8FF] cursor-pointer"
              >
                Clear
              </button>
            </span>
          )}
        </div>
        <span className="font-mono inline-flex items-center gap-1.5">
          <NearTokenIcon size={14} />
          <span>Live Market Rate:</span>
          <strong className="text-[#00EC97]">1 NEAR = {nearUsdRate.toFixed(2)} USDT</strong>
          <UsdtTokenIcon size={14} />
        </span>
      </div>

      {/* Listing Grid or Empty State */}
      {filteredListings.length === 0 ? (
        <div className="near-glass-card rounded-2xl p-12 text-center space-y-4">
          <SlidersHorizontal className="w-8 h-8 text-[#00EC97] mx-auto" />
          <div className="space-y-1">
            <h2 className="text-lg font-bold font-display text-[#F5F8FF]">
              No matching resources found
            </h2>
            <p className="text-xs text-[#9BA8C0] max-w-md mx-auto">
              {searchQuery.trim()
                ? `No listings match "${searchQuery.trim()}" in their title or description. Try a different keyword or reset your filters.`
                : 'Adjust your country/region filters or rental fee sliders, or reset filters to view all physical and digital offerings.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="btn-near-secondary px-4 py-2.5 text-xs cursor-pointer"
              >
                Clear Search
              </button>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-near-primary px-5 py-2.5 text-xs cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((item) => {
            const prov = profiles[item.ownerWallet];
            const completedCount = (prov?.completedLends ?? 0) + (prov?.completedBorrows ?? 0);
            const totalRequiredNear = Number((item.rentalFeeNear + item.collateralNear).toFixed(4));
            const photoCount = item.images?.length || 1;
            const feeDisplay = formatAmount(item.rentalFeeNear);
            const colDisplay = formatAmount(item.collateralNear);
            const totalDisplay = formatAmount(totalRequiredNear);
            const eligibility = evaluatePhysicalEligibility({
              listing: item,
              borrowerProfile: callerProfile,
              lenderProfile: prov,
            });

            return (
              <article
                key={item.id}
                data-testid={`marketplace-card-${item.id}`}
                className="near-glass-card rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:border-[#00EC97]/40"
              >
                <div>
                  {/* Frosted Glass Image Frame */}
                  <div className="p-3 pb-0">
                    <div className="glass-image-frame relative aspect-4/3 w-full">
                      <ResilientImage
                        src={item.images?.[0] || item.imageUrl}
                        alt={item.title}
                        resourceType={item.resourceType}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 z-10 max-w-[68%]">
                        <CountryBadge
                          countryCode={item.resourceType === 'PHYSICAL' ? item.countryCode || prov?.countryCode : undefined}
                          countryName={item.countryName || prov?.countryName}
                          regionName={item.regionName || prov?.regionName}
                          cityName={item.cityName || prov?.cityName}
                          pickupArea={item.pickupArea}
                          compact={true}
                        />
                      </div>
                      <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-[#06080F]/85 backdrop-blur-md border border-slate-700/80 text-[11px] font-mono text-[#F5F8FF] flex items-center gap-1">
                        <Images className="w-3 h-3 text-[#00EC97]" />
                        <span>{photoCount} {photoCount === 1 ? 'Photo' : 'Photos'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-[#9BA8C0]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-[#00EC97]">
                          {item.resourceType === 'PHYSICAL' ? 'Physical' : 'Digital'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{item.category}</span>
                      </div>
                      <SameCountryIndicator listing={item} eligibility={eligibility} />
                    </div>

                    <h2 className="text-base font-bold font-display text-[#F5F8FF] line-clamp-1">
                      {item.title}
                    </h2>

                    {item.resourceType === 'PHYSICAL' && (
                      <div className="flex items-center gap-1.5 text-xs text-[#E6EDF7] bg-[#0B101C] px-2.5 py-1.5 rounded-xl border border-white/8">
                        <CountryFlag countryCode={item.countryCode || prov?.countryCode} />
                        <span className="truncate font-medium">
                          {item.countryName || getCountryName(item.countryCode || prov?.countryCode)} ·{' '}
                          {item.regionName || prov?.regionName || 'Region'} ·{' '}
                          {item.pickupArea || item.cityName || prov?.cityName || 'City'}
                        </span>
                      </div>
                    )}

                    <p className="text-xs text-[#9BA8C0] line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="text-xs text-[#9BA8C0] pt-1 flex items-center justify-between">
                      <span className="truncate max-w-[180px]">
                        Provider: <code className="font-mono text-[#F5F8FF]">{item.ownerWallet}</code>
                      </span>
                      <span className="font-mono tabular-nums">{completedCount} deals</span>
                    </div>

                    {/* Views & Booking Conversion & Reputation Rating Strip */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-[#A4B0C4]">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Eye className="w-3.5 h-3.5 text-[#5EEAD4]" />
                          <span>{(item.viewsCount ?? 120).toLocaleString()} views</span>
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-[#00EC97]">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>{item.bookingConversionRate ?? 95}% conv</span>
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-[#FBBF24]">
                        <Star className="w-3 h-3 fill-[#FBBF24] text-[#FBBF24]" />
                        <span>{item.averageRating?.toFixed(1) ?? '5.0'}</span>
                        <span className="text-[#A4B0C4] font-normal text-[10px]">({item.ratingsCount ?? 12})</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Distinct Rental Fee vs Refundable Collateral Breakdown in NEAR & USDT with 2D Icons */}
                <div className="p-5 pt-4 border-t border-slate-800/80 bg-[#06080F]/60 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[#9BA8C0] block">
                        Rental Fee ({item.exampleDuration} {item.durationUnit.toLowerCase()})
                      </span>
                      <span className="font-mono font-bold text-[#F5F8FF] text-sm tabular-nums inline-flex items-center gap-1.5 mt-0.5">
                        {feeDisplay.isUsdtPrimary ? <UsdtTokenIcon size={15} /> : <NearTokenIcon size={15} />}
                        <span>{feeDisplay.primary}</span>
                      </span>
                      <span className="font-mono text-[11px] text-[#9BA8C0] tabular-nums block">
                        {feeDisplay.secondary}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#9BA8C0] block">Refundable Collateral</span>
                      <span className="font-mono font-bold text-[#00EC97] text-sm tabular-nums inline-flex items-center gap-1.5 mt-0.5">
                        {colDisplay.isUsdtPrimary ? <UsdtTokenIcon size={15} /> : <NearTokenIcon size={15} />}
                        <span>{colDisplay.primary}</span>
                      </span>
                      <span className="font-mono text-[11px] text-[#17F1D1] tabular-nums block">
                        {colDisplay.secondary}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#9BA8C0] pt-2 border-t border-slate-800/60">
                    <span className="inline-flex items-center gap-1.5">
                      <span>Total Lock:</span>
                      <strong className="text-[#F5F8FF] font-mono tabular-nums">{totalDisplay.primary}</strong>
                    </span>
                    <span>{item.minDuration}–{item.maxDuration} {item.durationUnit.toLowerCase()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenListing(item.id)}
                      className="btn-near-primary flex-1 py-2.5 px-4 text-xs"
                    >
                      View {photoCount}-Photo Gallery & Borrow
                    </button>
                    <button
                      type="button"
                      title="Authenticate Physical Product Specs via Camera QR"
                      aria-label={`Verify Product QR for ${item.title}`}
                      onClick={() => {
                        setActiveQrListing(item);
                        setQrModalMode('TRUST_VERIFY');
                        setQrModalOpen(true);
                      }}
                      className="btn-near-secondary py-2.5 px-3 text-xs shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#00EC97]" />
                      <span className="hidden sm:inline text-[11px]">Verify QR</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ProductQrScannerModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        mode={qrModalMode}
        title="Scan or Inspect BorrowBond Product QR Tag"
        subtitle="Scan any BorrowBond product QR code or serial barcode to open its listing or verify its Anti-Scam TIN."
        activeProductTag={
          activeQrListing
            ? {
                listingId: activeQrListing.id,
                title: activeQrListing.title,
                brandAndModel: activeQrListing.brandAndModel || activeQrListing.title,
                tinOrSerialNumber:
                  activeQrListing.tinOrSerialNumber || 'TIN-SONY-A7IV-884120',
                category: activeQrListing.category,
                resourceType: activeQrListing.resourceType,
                officialRetailPriceUsd: activeQrListing.officialRetailPriceUsd,
              }
            : undefined
        }
        onScanSuccess={(scanned: ScannedProductQrPayload) => {
          if (scanned.listingId) {
            const matched = listings.find((l) => l.id === scanned.listingId);
            if (matched) {
              onOpenListing(matched.id);
              return;
            }
          }
          const matchedByTin = listings.find(
            (l) =>
              l.tinOrSerialNumber?.toLowerCase() === scanned.tinOrSerialNumber.toLowerCase() ||
              l.title.toLowerCase().includes(scanned.title.toLowerCase().slice(0, 10))
          );
          if (matchedByTin) {
            onOpenListing(matchedByTin.id);
          } else {
            setResourceFilter('ALL');
            setSearchQuery(scanned.title.split('—')[0].trim());
          }
        }}
      />
    </div>
  );
};
