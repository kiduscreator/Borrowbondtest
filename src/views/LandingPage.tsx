import React, { useState } from 'react';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  Lock,
  Cpu,
  Camera,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  Scale,
  KeyRound,
  FileCheck2,
} from 'lucide-react';
import type { MarketplaceListing } from '../lib/security/policyEngine';
import type { AppView } from '../components/Navbar';
import { ResilientImage } from '../components/ResilientImage';

interface LandingPageProps {
  listings: MarketplaceListing[];
  nearBlockHeight: number | null;
  contractAddress: string;
  onNavigate: (view: AppView) => void;
  onSelectCategory: (cat: 'ALL' | 'PHYSICAL' | 'DIGITAL') => void;
  onOpenListing: (listingId: string) => void;
  onAskAgent: (prompt: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  listings,
  nearBlockHeight,
  contractAddress,
  onNavigate,
  onSelectCategory,
  onOpenListing,
  onAskAgent,
}) => {
  const [heroPrompt, setHeroPrompt] = useState(
    'I need a camera for three days. My total budget is 0.5 NEAR. Find a reliable offer with reasonable collateral.'
  );
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroPrompt.trim()) return;
    onAskAgent(heroPrompt.trim());
  };

  const featuredListings = listings.slice(0, 3);

  const faqs = [
    {
      q: 'Is BorrowBond a personal money-lending platform?',
      a: 'No. BorrowBond is strictly a peer-to-peer resource borrowing marketplace for physical hardware (cameras, projectors, drones) and programmable digital resources (metered API access, GPU compute slots). Users never take out cash loans.',
    },
    {
      q: 'How are rental fees and refundable collateral separated?',
      a: 'Every listing and checkout screen separates the non-refundable Rental Fee from the Refundable Collateral. Both amounts are locked together in the NEAR testnet escrow contract (`borrowbond-escrow.testnet`). When both parties confirm satisfactory return (or digital completion), the rental fee settles to the lender and 100% of the collateral returns to the borrower.',
    },
    {
      q: 'Can the AI Borrowing Agent sign or submit blockchain transactions without me?',
      a: 'Never. The AI Borrowing Agent searches real marketplace listings, compares costs, runs deterministic spending-policy checks, and prepares an unsigned agreement draft. Only the human borrower can approve and sign the NEAR transaction via their wallet.',
    },
    {
      q: 'What happens if a physical item is damaged or disputed?',
      a: 'Either party can open an on-chain dispute before completion, which freezes the escrowed collateral and fee. Both sides upload timestamped supporting evidence and SHA-256 hashes. Collateral is never automatically confiscated just because a deadline passed; only the designated human resolver (`resolver.borrowbond.testnet`) can allocate disputed funds according to transparent rules.',
    },
    {
      q: 'How does temporary digital API access work?',
      a: 'Once a digital resource booking is verified as ACTIVE on-chain, BorrowBond’s backend issues a temporary bearer credential (storing only its SHA-256 hash). Each request to the Controlled Demo API Gateway decrements your quota and checks expiration. When quota reaches zero or the rental window expires, access is immediately denied.',
    },
  ];

  return (
    <div className="space-y-12 pb-20">
      {/* Testnet & Demo Mode Notice Bar */}
      <div className="bg-[#121B2C] border-b border-slate-800/80 px-6 py-2.5 text-xs text-[#A4B0C4]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#5EEAD4]">NEAR Testnet Prototype</span>
            <span aria-hidden="true">·</span>
            <span>Contract: <code className="font-mono text-[#F3F6FC]">{contractAddress}</code></span>
            {nearBlockHeight && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">Block #{nearBlockHeight.toLocaleString()}</span>
              </>
            )}
          </div>
          <div>
            <span>Testnet NEAR tokens have no real-world monetary value · Demo seed listings clearly labeled</span>
          </div>
        </div>
      </div>

      {/* Section 1: Hero with Natural-Language AI Search & Dual Category Showcase */}
      <section className="max-w-7xl mx-auto px-6 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
            <div className="space-y-5">
              <p className="text-xs font-medium tracking-wide text-[#5EEAD4]">
                Physical & Digital Resource Escrow on NEAR Testnet
              </p>
              <h1
                className="font-display font-bold tracking-tight text-[#F3F6FC] leading-[1.12]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.6rem)', textWrap: 'balance' }}
              >
                Borrow anything. Secure every agreement.
              </h1>
              <p className="text-base text-[#A4B0C4] leading-relaxed max-w-2xl">
                Discover, rent, and temporarily access high-value physical equipment and metered digital APIs through transparent borrowing agreements, refundable collateral, and NEAR programmable escrow.
              </p>
            </div>

            {/* Natural-Language AI Borrowing Agent Search Bar */}
            <form
              onSubmit={handleHeroSearchSubmit}
              className="bg-[#121B2C] border border-slate-800 rounded-xl p-4 space-y-3"
            >
              <label
                htmlFor="hero-ai-input"
                className="block text-xs font-medium text-[#A4B0C4]"
              >
                Describe what you need to the BorrowBond AI Agent (extracts duration, budget & collateral limits):
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#A4B0C4] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="hero-ai-input"
                    type="text"
                    value={heroPrompt}
                    onChange={(e) => setHeroPrompt(e.target.value)}
                    placeholder="e.g., I need a camera for 3 days under 0.5 NEAR total..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC] placeholder:text-slate-500 focus:outline-none focus:border-[#5EEAD4]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Find & Compare Offers</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[#A4B0C4]">
                <span>Try preset:</span>
                <button
                  type="button"
                  onClick={() =>
                    setHeroPrompt(
                      'I need a camera for three days. My total budget is 0.5 NEAR. Find a reliable offer with reasonable collateral.'
                    )
                  }
                  className="underline hover:text-[#F3F6FC] cursor-pointer"
                >
                  3-Day Camera (0.5 NEAR budget)
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() =>
                    setHeroPrompt(
                      'I need a digital API for my project for two days. My total budget is 0.15 NEAR. Find the best option.'
                    )
                  }
                  className="underline hover:text-[#F3F6FC] cursor-pointer"
                >
                  48h Weather API (0.15 NEAR budget)
                </button>
              </div>
            </form>

            {/* Primary CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('MARKETPLACE')}
                className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#172338] text-[#F3F6FC] border border-slate-700 hover:border-[#5EEAD4] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Explore Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('CREATE_LISTING')}
                className="px-5 py-2.5 text-sm font-medium rounded-lg text-[#A4B0C4] hover:text-[#F3F6FC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                List a Physical or Digital Resource
              </button>
            </div>
          </div>

          {/* Right Column: Two Prominent Connected Marketplace Category Cards */}
          <div className="lg:col-span-5 grid grid-cols-1 gap-5">
            {/* Physical Marketplace Card */}
            <div className="bg-[#172338] border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#A4B0C4]">
                  <span>Marketplace 01 · Physical Belongings</span>
                  <Camera className="w-4 h-4 text-[#5EEAD4]" />
                </div>
                <h2 className="text-xl font-bold font-display text-[#F3F6FC]">
                  Physical Resources
                </h2>
                <p className="text-sm text-[#A4B0C4] leading-relaxed">
                  Cameras, 4K laser projectors, surveying drones, and studio gear. Protected by refundable NEAR collateral, one-time handover codes, and before/after condition hashes.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-[#A4B0C4] font-mono tabular-nums">
                  Example: 0.05 NEAR fee · 0.20 NEAR collateral
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onSelectCategory('PHYSICAL');
                    onNavigate('MARKETPLACE');
                  }}
                  className="text-xs font-semibold text-[#5EEAD4] hover:underline flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Browse Physical</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Digital Marketplace Card */}
            <div className="bg-[#172338] border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#A4B0C4]">
                  <span>Marketplace 02 · Programmable Access</span>
                  <Cpu className="w-4 h-4 text-[#8297FF]" />
                </div>
                <h2 className="text-xl font-bold font-display text-[#F3F6FC]">
                  Digital Resources
                </h2>
                <p className="text-sm text-[#A4B0C4] leading-relaxed">
                  Metered API gateways, GPU inference sandboxes, and telemetry feeds. Automatically issues temporary bearer tokens with server-enforced request quotas and expiry revocation.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-[#A4B0C4] font-mono tabular-nums">
                  Example: 0.03 NEAR fee · 0.05 NEAR collateral
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onSelectCategory('DIGITAL');
                    onNavigate('MARKETPLACE');
                  }}
                  className="text-xs font-semibold text-[#8297FF] hover:underline flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Browse Digital</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Featured Marketplace Resources */}
      <section className="max-w-7xl mx-auto px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <p className="text-xs text-[#A4B0C4]">Curated Demo Catalog</p>
            <h2 className="text-2xl font-bold font-display text-[#F3F6FC] mt-1">
              Featured Physical & Digital Listings
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectCategory('ALL');
              onNavigate('MARKETPLACE');
            }}
            className="text-sm font-medium text-[#5EEAD4] hover:underline flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>View All {listings.length} Resources</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredListings.map((item) => (
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
                  {/* Unboxed clean metadata with typographic separators */}
                  <div className="flex items-center gap-2 text-xs text-[#A4B0C4]">
                    <span className="font-medium text-[#F3F6FC]">
                      {item.resourceType === 'PHYSICAL' ? 'Physical Resource' : 'Digital API / Compute'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.category}</span>
                    {item.isDemoSeed && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Demo Seed</span>
                      </>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-[#F3F6FC] line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#A4B0C4] line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-3 border-t border-slate-800/80 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#A4B0C4] block">Rental Fee ({item.exampleDuration} {item.durationUnit.toLowerCase()})</span>
                    <span className="font-mono font-semibold text-[#F3F6FC] tabular-nums text-sm">
                      {item.rentalFeeNear} NEAR
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A4B0C4] block">Refundable Collateral</span>
                    <span className="font-mono font-semibold text-[#5EEAD4] tabular-nums text-sm">
                      {item.collateralNear} NEAR
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenListing(item.id)}
                  className="w-full py-2 px-4 text-xs font-semibold rounded-lg bg-[#121B2C] text-[#F3F6FC] border border-slate-700 hover:border-[#5EEAD4] transition-colors cursor-pointer"
                >
                  Inspect Terms & Borrow
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Section 3: How BorrowBond Works, AI Security Layer & NEAR Programmable Escrow */}
      <section className="max-w-7xl mx-auto px-6 space-y-10">
        <div className="border-b border-slate-800 pb-4">
          <p className="text-xs text-[#A4B0C4]">Architecture & Settlement Rules</p>
          <h2 className="text-2xl font-bold font-display text-[#F3F6FC] mt-1">
            Five Connected Capabilities Behind Every Agreement
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-3">
            <Sparkles className="w-5 h-5 text-[#5EEAD4]" />
            <h3 className="text-base font-semibold text-[#F3F6FC]">
              01. AI Borrowing Agent
            </h3>
            <p className="text-xs text-[#A4B0C4] leading-relaxed">
              Executes 13 validated application tools (`search_listings`, `compare_offers`, `estimate_collateral`, `prepare_booking`) against real marketplace inventory and prepares unsigned drafts.
            </p>
          </div>

          <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-3">
            <ShieldCheck className="w-5 h-5 text-[#8297FF]" />
            <h3 className="text-base font-semibold text-[#F3F6FC]">
              02. AI Security & Policy Layer
            </h3>
            <p className="text-xs text-[#A4B0C4] leading-relaxed">
              Deterministic backend policy checks enforce maximum rental fee, collateral caps, permitted categories, and sanitize untrusted listing text against prompt injection.
            </p>
          </div>

          <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-3">
            <Lock className="w-5 h-5 text-[#34D399]" />
            <h3 className="text-base font-semibold text-[#F3F6FC]">
              03. NEAR Programmable Escrow
            </h3>
            <p className="text-xs text-[#A4B0C4] leading-relaxed">
              Locks exact rental fee + collateral in yoctoNEAR. Enforces `REQUESTED → ACCEPTED → ACTIVE → RETURN_REQUESTED → COMPLETED` and safe claimable withdrawals.
            </p>
          </div>

          <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-3">
            <KeyRound className="w-5 h-5 text-[#FBBF24]" />
            <h3 className="text-base font-semibold text-[#F3F6FC]">
              04. Temporary Digital Credentials
            </h3>
            <p className="text-xs text-[#A4B0C4] leading-relaxed">
              Issues SHA-256 hashed temporary bearer tokens only after on-chain booking activation. Enforces live request quotas and automatic expiry revocation on the server.
            </p>
          </div>
        </div>

        {/* Lender Onboarding & Trust Disclosure Strip */}
        <div className="bg-[#172338] border border-slate-800 rounded-xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-2">
            <div className="flex items-center gap-2 text-xs text-[#5EEAD4]">
              <Scale className="w-4 h-4" />
              <span>Transparent Settlement & Dispute Governance</span>
            </div>
            <h3 className="text-lg font-bold font-display text-[#F3F6FC]">
              List Idle Hardware or Metered APIs with Accountable Escrow
            </h3>
            <p className="text-xs text-[#A4B0C4] leading-relaxed">
              Providers define exact rental fees, minimum refundable collateral, and handover rules. Collateral is never unilaterally confiscated on deadline expiry; disputed agreements freeze funds for review by the designated human resolver (<code className="font-mono text-[#F3F6FC]">resolver.borrowbond.testnet</code>).
            </p>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end">
            <button
              type="button"
              onClick={() => onNavigate('CREATE_LISTING')}
              className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Launch Create-Listing Wizard
            </button>
          </div>
        </div>
      </section>

      {/* Section 4: Frequently Asked Questions */}
      <section className="max-w-4xl mx-auto px-6 space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <p className="text-xs text-[#A4B0C4]">Trust, Security & Honest Limitations</p>
          <h2 className="text-2xl font-bold font-display text-[#F3F6FC] mt-1">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={faq.q}
                className="bg-[#121B2C] border border-slate-800 rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 text-sm font-semibold text-[#F3F6FC] hover:bg-[#172338]/60 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#A4B0C4] shrink-0 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs text-[#A4B0C4] leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
