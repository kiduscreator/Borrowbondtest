import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, Sparkles, Plus } from 'lucide-react';
import type { MarketplaceListing, ProviderProfile } from '../lib/security/policyEngine';
import { ResilientImage } from '../components/ResilientImage';

interface MarketplaceViewProps {
  listings: MarketplaceListing[];
  profiles: Record<string, ProviderProfile>;
  initialCategory: 'ALL' | 'PHYSICAL' | 'DIGITAL';
  onOpenListing: (listingId: string) => void;
  onNavigateCreate: () => void;
  onOpenAiAgent: () => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  listings,
  profiles,
  initialCategory,
  onOpenListing,
  onNavigateCreate,
  onOpenAiAgent,
}) => {
  const [resourceFilter, setResourceFilter] = useState<'ALL' | 'PHYSICAL' | 'DIGITAL'>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [maxFeeNear, setMaxFeeNear] = useState<number>(0.5);
  const [maxCollateralNear, setMaxCollateralNear] = useState<number>(1.0);
  const [requestedDuration, setRequestedDuration] = useState<number | ''>('');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(true);
  const [minCompletedDeals, setMinCompletedDeals] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'RELEVANCE' | 'PRICE_ASC' | 'COLLATERAL_ASC' | 'NEWEST'>('RELEVANCE');

  const categories = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((l) => set.add(l.category));
    return ['ALL', ...Array.from(set)];
  }, [listings]);

  const filteredListings = useMemo(() => {
    return listings
      .filter((item) => {
        if (resourceFilter !== 'ALL' && item.resourceType !== resourceFilter) return false;
        if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
        if (onlyAvailable && item.availabilityStatus !== 'AVAILABLE') return false;
        if (item.rentalFeeNear > maxFeeNear) return false;
        if (item.collateralNear > maxCollateralNear) return false;
        if (requestedDuration !== '' && Number(requestedDuration) > 0) {
          const dur = Number(requestedDuration);
          if (dur < item.minDuration || dur > item.maxDuration) return false;
        }
        const prov = profiles[item.ownerWallet];
        const deals = (prov?.completedLends ?? 0) + (prov?.completedBorrows ?? 0);
        if (deals < minCompletedDeals) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const hay = `${item.title} ${item.description} ${item.category} ${item.ownerWallet}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
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
    onlyAvailable,
    maxFeeNear,
    maxCollateralNear,
    requestedDuration,
    minCompletedDeals,
    searchQuery,
    sortBy,
  ]);

  const handleResetFilters = () => {
    setResourceFilter('ALL');
    setSearchQuery('');
    setSelectedCategory('ALL');
    setMaxFeeNear(0.5);
    setMaxCollateralNear(1.0);
    setRequestedDuration('');
    setOnlyAvailable(true);
    setMinCompletedDeals(0);
    setSortBy('RELEVANCE');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header & Interactive Resource Type Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <p className="text-xs text-[#5EEAD4]">Unified Borrowing Marketplace</p>
          <h1 className="text-3xl font-bold font-display text-[#F3F6FC]">
            Discover Physical & Digital Resources
          </h1>
          <p className="text-sm text-[#A4B0C4]">
            Every agreement separates the rental fee from refundable NEAR escrow collateral.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Interactive Filter Control */}
          <div
            role="group"
            aria-label="Resource Type Filter"
            className="flex items-center gap-1 p-1 bg-[#121B2C] border border-slate-800 rounded-lg"
          >
            {(['ALL', 'PHYSICAL', 'DIGITAL'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setResourceFilter(tab)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  resourceFilter === tab
                    ? 'bg-[#5EEAD4] text-[#0B1020]'
                    : 'text-[#A4B0C4] hover:text-[#F3F6FC]'
                }`}
              >
                {tab === 'ALL' ? 'All Resources' : tab === 'PHYSICAL' ? 'Physical' : 'Digital'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenAiAgent}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#172338] text-[#5EEAD4] border border-slate-700 hover:border-[#5EEAD4] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Quick Match</span>
          </button>

          <button
            type="button"
            onClick={onNavigateCreate}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#172338] text-[#F3F6FC] border border-slate-700 hover:border-slate-500 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Listing</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="md:col-span-2">
            <label htmlFor="mkt-search" className="block text-xs text-[#A4B0C4] mb-1.5">
              Search Keyword or Provider
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#A4B0C4] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="mkt-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search camera, projector, weather API, GPU..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC] placeholder:text-slate-500 focus:outline-none focus:border-[#5EEAD4]"
              />
            </div>
          </div>

          {/* Subcategory Select */}
          <div>
            <label htmlFor="mkt-category" className="block text-xs text-[#A4B0C4] mb-1.5">
              Category
            </label>
            <select
              id="mkt-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC] focus:outline-none focus:border-[#5EEAD4]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label htmlFor="mkt-sort" className="block text-xs text-[#A4B0C4] mb-1.5">
              Sort By
            </label>
            <div className="relative">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#A4B0C4] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="mkt-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC] focus:outline-none focus:border-[#5EEAD4]"
              >
                <option value="RELEVANCE">Relevance</option>
                <option value="PRICE_ASC">Rental Fee: Low to High</option>
                <option value="COLLATERAL_ASC">Collateral: Low to High</option>
                <option value="NEWEST">Newest Listed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Range & Reputation Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-800/80 items-end">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="mkt-max-fee" className="text-[#A4B0C4]">Max Rental Fee</label>
              <span className="font-mono text-[#F3F6FC] tabular-nums">{maxFeeNear.toFixed(2)} NEAR</span>
            </div>
            <input
              id="mkt-max-fee"
              type="range"
              min="0.01"
              max="0.50"
              step="0.01"
              value={maxFeeNear}
              onChange={(e) => setMaxFeeNear( parseFloat(e.target.value))}
              className="w-full accent-[#5EEAD4] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="mkt-max-col" className="text-[#A4B0C4]">Max Collateral</label>
              <span className="font-mono text-[#5EEAD4] tabular-nums">{maxCollateralNear.toFixed(2)} NEAR</span>
            </div>
            <input
              id="mkt-max-col"
              type="range"
              min="0.02"
              max="1.00"
              step="0.02"
              value={maxCollateralNear}
              onChange={(e) => setMaxCollateralNear(parseFloat(e.target.value))}
              className="w-full accent-[#5EEAD4] cursor-pointer"
            />
          </div>

          <div>
            <label htmlFor="mkt-min-rep" className="block text-xs text-[#A4B0C4] mb-1">
              Provider Completed Deals
            </label>
            <select
              id="mkt-min-rep"
              value={minCompletedDeals}
              onChange={(e) => setMinCompletedDeals(Number(e.target.value))}
              className="w-full px-3 py-1.5 text-xs bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
            >
              <option value={0}>Any History (Include New Providers)</option>
              <option value={5}>5+ Completed Deals</option>
              <option value={15}>15+ Completed Deals</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-[#F3F6FC] cursor-pointer">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="rounded accent-[#5EEAD4]"
              />
              <span>Available Only</span>
            </label>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-[#A4B0C4] hover:text-[#F3F6FC] underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-[#A4B0C4]">
        <span>
          Showing <strong className="text-[#F3F6FC] font-mono tabular-nums">{filteredListings.length}</strong> of {listings.length} resources
        </span>
        <span>All amounts denominated in NEAR Testnet tokens</span>
      </div>

      {/* Listing Grid or Empty State */}
      {filteredListings.length === 0 ? (
        <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-12 text-center space-y-4">
          <SlidersHorizontal className="w-8 h-8 text-[#A4B0C4] mx-auto" />
          <div className="space-y-1">
            <h2 className="text-lg font-bold font-display text-[#F3F6FC]">
              No matching resources found
            </h2>
            <p className="text-xs text-[#A4B0C4] max-w-md mx-auto">
              Adjust your rental fee or collateral sliders, or reset filters to view all physical and digital offerings.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90 transition-colors cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((item) => {
            const prov = profiles[item.ownerWallet];
            const completedCount = (prov?.completedLends ?? 0) + (prov?.completedBorrows ?? 0);
            const totalRequired = Number((item.rentalFeeNear + item.collateralNear).toFixed(4));

            return (
              <article
                key={item.id}
                className="bg-[#172338] border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div>
                  <div className="aspect-4/3 w-full bg-[#121B2C] overflow-hidden">
                    <ResilientImage
                      src={item.imageUrl}
                      alt={item.title}
                      resourceType={item.resourceType}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 space-y-3">
                    {/* Clean unboxed metadata */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#A4B0C4]">
                      <span className="font-semibold text-[#F3F6FC]">
                        {item.resourceType === 'PHYSICAL' ? 'Physical' : 'Digital'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.availabilityStatus === 'AVAILABLE' ? 'Available' : item.availabilityStatus}</span>
                      {item.isDemoSeed && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Demo Data</span>
                        </>
                      )}
                    </div>

                    <h2 className="text-base font-bold font-display text-[#F3F6FC] line-clamp-1">
                      {item.title}
                    </h2>

                    <p className="text-xs text-[#A4B0C4] line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="text-xs text-[#A4B0C4] pt-1 flex items-center justify-between">
                      <span className="truncate max-w-[180px]">Provider: <code className="font-mono text-[#F3F6FC]">{item.ownerWallet}</code></span>
                      <span className="font-mono tabular-nums">{completedCount} completed deals</span>
                    </div>
                  </div>
                </div>

                {/* Distinct Rental Fee vs Refundable Collateral Breakdown */}
                <div className="p-5 pt-4 border-t border-slate-800/80 bg-[#121B2C]/50 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[#A4B0C4] block">
                        Rental Fee ({item.exampleDuration} {item.durationUnit.toLowerCase()})
                      </span>
                      <span className="font-mono font-bold text-[#F3F6FC] text-sm tabular-nums">
                        {item.rentalFeeNear} NEAR
                      </span>
                    </div>
                    <div>
                      <span className="text-[#A4B0C4] block">Refundable Collateral</span>
                      <span className="font-mono font-bold text-[#5EEAD4] text-sm tabular-nums">
                        {item.collateralNear} NEAR
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#A4B0C4] pt-1 border-t border-slate-800/60">
                    <span>Total Escrow Lock: <strong className="text-[#F3F6FC] font-mono tabular-nums">{totalRequired} NEAR</strong></span>
                    <span>Duration: {item.minDuration}–{item.maxDuration} {item.durationUnit.toLowerCase()}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenListing(item.id)}
                    className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90 transition-colors cursor-pointer"
                  >
                    View Details & Borrow
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
