import React, { useState } from 'react';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  Lock,
  Sparkles,
  FileCheck2,
  CheckCircle2,
  Handshake,
  Compass,
  BookOpen,
} from 'lucide-react';
import type { MarketplaceListing } from '../lib/security/policyEngine';
import type { AppView } from '../components/Navbar';
import type { DocsSectionTab } from './WhitepaperDocsView';
import { ResilientImage } from '../components/ResilientImage';
import { getCountryFlagEmoji } from '../lib/location/countryLocationEngine';

interface LandingPageProps {
  listings: MarketplaceListing[];
  nearBlockHeight: number | null;
  nearUsdRate?: number;
  contractAddress: string;
  accessMode?: 'welcome' | 'authenticated' | 'guest_demo';
  onContinueWithGoogle?: () => void;
  onExploreDemo?: () => void;
  onNavigate: (view: AppView) => void;
  onSelectCategory: (cat: 'ALL' | 'PHYSICAL' | 'DIGITAL') => void;
  onOpenListing: (listingId: string) => void;
  onAskAgent: (prompt: string) => void;
  onOpenAuthModal?: () => void;
  onOpenWalletModal?: () => void;
  onOpenDocsSection?: (section: DocsSectionTab) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  listings,
  accessMode = 'guest_demo',
  onContinueWithGoogle,
  onExploreDemo,
  onNavigate,
  onSelectCategory,
  onOpenListing,
  onAskAgent,
  onOpenDocsSection,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      onNavigate('AI_AGENT');
      return;
    }
    onAskAgent(trimmed);
  };

  const featuredListings = listings.slice(0, 4);
  const heroPreviewListing = listings[0];

  const howItWorksSteps = [
    {
      step: '1',
      title: 'Find something to borrow.',
      description: 'Browse verified physical equipment in your country or global digital resources.',
      icon: <Compass className="w-5 h-5 text-[#8BD6A7]" />,
    },
    {
      step: '2',
      title: 'Agree on the terms.',
      description: 'Review clear rental fees, refundable collateral, and return dates before committing.',
      icon: <Handshake className="w-5 h-5 text-[#8BD6A7]" />,
    },
    {
      step: '3',
      title: 'Borrow with escrow protection.',
      description: 'Funds stay locked in NEAR escrow and settle automatically once return is confirmed.',
      icon: <Lock className="w-5 h-5 text-[#8BD6A7]" />,
    },
  ];

  const trustBenefits = [
    {
      title: 'Secure NEAR escrow.',
      description: 'Rental fees and collateral are held in isolated escrow until both parties complete the agreement.',
      icon: <Lock className="w-5 h-5 text-[#8BD6A7]" />,
    },
    {
      title: 'Transparent collateral.',
      description: 'Every listing clearly separates the rental fee from the refundable security deposit.',
      icon: <ShieldCheck className="w-5 h-5 text-[#8BD6A7]" />,
    },
    {
      title: 'Verified agreement states, where genuinely supported.',
      description: 'Track each step from request and handover to return confirmation and final settlement.',
      icon: <FileCheck2 className="w-5 h-5 text-[#8BD6A7]" />,
    },
  ];

  return (
    <div className="space-y-20 pb-20">
      {/* 1. Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Headline, Supporting Copy, Primary Actions & Simple AI Search */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              <h1
                className="font-display font-bold tracking-tight text-[#F2F5F1] leading-[1.1]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
              >
                Borrow what you need. Lend what you own.
              </h1>
              <p className="text-base sm:text-lg text-[#A0AAA2] leading-relaxed max-w-xl">
                Discover physical and digital resources. Borrow, lend, and manage agreements securely with NEAR escrow.
              </p>
            </div>

            {/* Two Primary Actions Only */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onSelectCategory('ALL');
                  onNavigate('MARKETPLACE');
                }}
                className="btn-near-primary px-5 py-3 text-sm"
              >
                <span>Explore Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('CREATE_LISTING')}
                className="btn-near-secondary px-5 py-3 text-sm"
              >
                <span>List an Item</span>
              </button>
            </div>

            {/* Section 17.1 Two Access Mode Cards (Sign In with Google vs Explore Guest Demo) */}
            {(onContinueWithGoogle || onExploreDemo) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                <div className="p-3.5 rounded-xl bg-[#101612] border border-[#27312A] flex flex-col justify-between gap-2.5">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#8BD6A7] block">
                      Create Account / Sign In
                    </span>
                    <p className="text-xs text-[#A0AAA2] leading-snug">
                      Access the complete BorrowBond marketplace, manage listings, connect your wallet, and borrow or lend resources.
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="landing-continue-google-btn"
                    onClick={onContinueWithGoogle}
                    className="btn-near-primary py-2 px-3 text-xs justify-center cursor-pointer"
                  >
                    <span>Continue with Google</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-[#151C17] border border-[#27312A] flex flex-col justify-between gap-2.5">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#F2F5F1] block">
                      {accessMode === 'guest_demo' ? 'Guest Demo Active' : 'Explore Demo'}
                    </span>
                    <p className="text-xs text-[#A0AAA2] leading-snug">
                      Explore BorrowBond and see how borrowing, lending, and escrow work without creating an account.
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="landing-explore-demo-btn"
                    onClick={() => {
                      if (onExploreDemo) onExploreDemo();
                      onNavigate('MARKETPLACE');
                    }}
                    className="btn-near-secondary py-2 px-3 text-xs justify-center cursor-pointer"
                  >
                    <span>Explore Demo</span>
                  </button>
                </div>
              </div>
            )}

            {/* Simple AI Search Field */}
            <form onSubmit={handleHeroSearchSubmit} className="max-w-xl">
              <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#101612] border border-[#27312A] focus-within:border-[#8BD6A7] transition-colors">
                <span className="inline-flex items-center gap-1 px-2 py-1 ml-1 rounded-md bg-[#151C17] border border-[#27312A] text-[11px] font-medium text-[#8BD6A7] shrink-0">
                  <Sparkles className="w-3 h-3" />
                  <span>AI</span>
                </span>
                <Search className="w-4 h-4 text-[#747F76] shrink-0 ml-1" />
                <input
                  id="hero-ai-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="What are you looking for?"
                  aria-label="What are you looking for?"
                  className="w-full py-2 pr-2 text-sm bg-transparent text-[#F2F5F1] placeholder:text-[#747F76] focus:outline-none"
                />
                <button
                  type="submit"
                  className="btn-near-primary px-4 py-2 text-xs sm:text-sm shrink-0"
                >
                  <span>Search</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Clean Product-Interface Preview */}
          {heroPreviewListing && (
            <div className="lg:col-span-5">
              <div
                onClick={() => onOpenListing(heroPreviewListing.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onOpenListing(heroPreviewListing.id);
                  }
                }}
                className="near-glass-card rounded-2xl overflow-hidden transition-colors hover:border-[#8BD6A7]/50 cursor-pointer"
              >
                <div className="aspect-4/3 w-full bg-[#101612] overflow-hidden">
                  <ResilientImage
                    src={heroPreviewListing.images?.[0] || heroPreviewListing.imageUrl}
                    alt={heroPreviewListing.title}
                    resourceType={heroPreviewListing.resourceType}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2 text-xs text-[#A0AAA2]">
                    <span>
                      {heroPreviewListing.resourceType === 'PHYSICAL' && heroPreviewListing.countryCode
                        ? `${getCountryFlagEmoji(heroPreviewListing.countryCode)} ${heroPreviewListing.countryName || heroPreviewListing.countryCode} · ${heroPreviewListing.cityName || heroPreviewListing.regionName || ''}`
                        : 'Global Digital Resource'}
                    </span>
                    <span className="text-[#8BD6A7] font-medium">Available</span>
                  </div>
                  <h2 className="text-base font-semibold text-[#F2F5F1] font-display">
                    {heroPreviewListing.title}
                  </h2>
                  <div className="pt-3 border-t border-[#27312A] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[#747F76] block">Rental</span>
                      <span className="font-mono font-semibold text-[#F2F5F1] text-sm">
                        {heroPreviewListing.rentalFeeNear} NEAR
                      </span>
                    </div>
                    <div>
                      <span className="text-[#747F76] block">Collateral</span>
                      <span className="font-mono font-semibold text-[#8BD6A7] text-sm">
                        {heroPreviewListing.collateralNear} NEAR
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#F2F5F1]">
                      <span>View details</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#8BD6A7]" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. Category Selection */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[#F2F5F1]">
            Browse by category
          </h2>
          <p className="text-sm text-[#A0AAA2]">
            Choose between local physical equipment or globally accessible digital resources.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PHYSICAL Category Card */}
          <div
            onClick={() => {
              onSelectCategory('PHYSICAL');
              onNavigate('MARKETPLACE');
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectCategory('PHYSICAL');
                onNavigate('MARKETPLACE');
              }
            }}
            className="group near-glass-card rounded-2xl overflow-hidden flex flex-col sm:flex-row items-stretch transition-colors hover:border-[#8BD6A7]/50 cursor-pointer"
          >
            <div className="sm:w-48 aspect-16/10 sm:aspect-auto bg-[#101612] shrink-0 overflow-hidden">
              <ResilientImage
                src="/src/assets/images/listing_sony_camera_1794103774108.jpg"
                alt="Physical equipment and electronics"
                resourceType="PHYSICAL"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="p-6 flex flex-col justify-between flex-1 space-y-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold tracking-wider text-[#8BD6A7]">
                  PHYSICAL
                </span>
                <h3 className="text-lg font-bold font-display text-[#F2F5F1]">
                  Equipment, electronics and more.
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#F2F5F1] group-hover:text-[#8BD6A7] transition-colors">
                <span>Explore Physical</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* DIGITAL Category Card */}
          <div
            onClick={() => {
              onSelectCategory('DIGITAL');
              onNavigate('MARKETPLACE');
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectCategory('DIGITAL');
                onNavigate('MARKETPLACE');
              }
            }}
            className="group near-glass-card rounded-2xl overflow-hidden flex flex-col sm:flex-row items-stretch transition-colors hover:border-[#8BD6A7]/50 cursor-pointer"
          >
            <div className="sm:w-48 aspect-16/10 sm:aspect-auto bg-[#101612] shrink-0 overflow-hidden">
              <ResilientImage
                src="/src/assets/images/listing_gpu_compute_1794103779733.jpg"
                alt="Digital APIs, software and resources"
                resourceType="DIGITAL"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="p-6 flex flex-col justify-between flex-1 space-y-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold tracking-wider text-[#8BD6A7]">
                  DIGITAL
                </span>
                <h3 className="text-lg font-bold font-display text-[#F2F5F1]">
                  APIs, software and digital resources.
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#F2F5F1] group-hover:text-[#8BD6A7] transition-colors">
                <span>Explore Digital</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Featured Listings */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-[#F2F5F1]">
              Featured listings
            </h2>
            <p className="text-sm text-[#A0AAA2]">
              Available items ready to borrow with NEAR escrow protection.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectCategory('ALL');
              onNavigate('MARKETPLACE');
            }}
            className="btn-near-secondary px-4 py-2 text-xs sm:text-sm shrink-0"
          >
            <span>View all</span>
            <ArrowRight className="w-4 h-4 text-[#8BD6A7]" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featuredListings.map((item) => {
            const locationOrType =
              item.resourceType === 'PHYSICAL' && item.countryCode
                ? `${getCountryFlagEmoji(item.countryCode)} ${item.countryName || item.countryCode}${item.cityName ? ` · ${item.cityName}` : ''}`
                : 'Global Digital Resource';

            return (
              <article
                key={item.id}
                className="near-glass-card rounded-xl overflow-hidden flex flex-col justify-between transition-colors hover:border-[#8BD6A7]/45"
              >
                <div>
                  <div className="aspect-4/3 w-full bg-[#101612] overflow-hidden">
                    <ResilientImage
                      src={item.images?.[0] || item.imageUrl}
                      alt={item.title}
                      resourceType={item.resourceType}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 space-y-1.5">
                    <p className="text-xs text-[#A0AAA2] truncate">{locationOrType}</p>
                    <h3 className="text-sm font-semibold font-display text-[#F2F5F1] line-clamp-1">
                      {item.title}
                    </h3>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-3 border-t border-[#27312A] space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#747F76] block">Rental price</span>
                      <span className="font-mono font-semibold text-[#F2F5F1] tabular-nums">
                        {item.rentalFeeNear} NEAR
                      </span>
                    </div>
                    <div>
                      <span className="text-[#747F76] block">Collateral</span>
                      <span className="font-mono font-semibold text-[#8BD6A7] tabular-nums">
                        {item.collateralNear} NEAR
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenListing(item.id)}
                    className="btn-near-secondary w-full py-2 px-3 text-xs"
                  >
                    <span>View details</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 4. How It Works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[#F2F5F1]">
            How it works
          </h2>
          <p className="text-sm text-[#A0AAA2]">
            Simple, predictable borrowing in three steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {howItWorksSteps.map((item) => (
            <div
              key={item.step}
              className="near-glass-card rounded-xl p-6 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-[#101612] border border-[#27312A] flex items-center justify-center">
                  {item.icon}
                </div>
                <span className="text-xs font-mono text-[#747F76]">0{item.step}</span>
              </div>
              <h3 className="text-base font-semibold font-display text-[#F2F5F1]">
                {item.title}
              </h3>
              <p className="text-sm text-[#A0AAA2] leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Trust Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-[#F2F5F1]">
              Built for trust
            </h2>
            <p className="text-sm text-[#A0AAA2]">
              Every agreement is backed by transparent rules on NEAR.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onOpenDocsSection) onOpenDocsSection('WHITEPAPER');
              else onNavigate('WHITEPAPER');
            }}
            className="btn-near-secondary px-4 py-2 text-xs sm:text-sm shrink-0"
          >
            <BookOpen className="w-4 h-4 text-[#8BD6A7]" />
            <span>Read documentation &amp; technical specs</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {trustBenefits.map((benefit) => (
            <div
              key={benefit.title}
              className="near-glass-card rounded-xl p-6 space-y-3"
            >
              <div className="w-9 h-9 rounded-lg bg-[#101612] border border-[#27312A] flex items-center justify-center">
                {benefit.icon}
              </div>
              <h3 className="text-base font-semibold font-display text-[#F2F5F1]">
                {benefit.title}
              </h3>
              <p className="text-sm text-[#A0AAA2] leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
