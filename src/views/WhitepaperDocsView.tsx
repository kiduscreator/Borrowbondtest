import React, { useState } from 'react';
import {
  BookOpen,
  Milestone,
  Scale,
  Rocket,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Lock,
  Terminal,
  Database,
  Coins,
  ArrowLeft,
} from 'lucide-react';
import { BorrowBondBrandLogo, BorrowBondWordmark, NearTokenIcon, UsdtTokenIcon, SocialBrandIcon } from '../components/TokenIcons';
import type { AppView } from '../components/Navbar';

export type DocsSectionTab = 'WHITEPAPER' | 'ROADMAP' | 'TERMS' | 'DEPLOYMENT';

interface WhitepaperDocsViewProps {
  initialSection?: DocsSectionTab;
  nearUsdRate: number;
  contractAddress: string;
  connectedWallet: string;
  onNavigate: (view: AppView) => void;
}

const WHITEPAPER_PAGES = [
  {
    pageNumber: 1,
    badge: 'PAGE 01 / 04 • EXECUTIVE SUMMARY & ABOUT BORROWBOND',
    title: 'BorrowBond: The Peer-to-Peer Resource Layer on NEAR Protocol',
    subtitle: 'Borrow anything. Secure every agreement — without cash loans or custodial middlemen.',
    summary:
      'BorrowBond transforms idle high-value physical equipment (flagship devices, cinema cameras, laser projectors, industrial drones) and programmable digital capacity (metered API gateways, GPU compute sandboxes) into liquid, trust-minimized borrowing agreements on NEAR Protocol.',
    highlights: [
      {
        title: 'Strictly Resource Borrowing (Zero Cash Lending)',
        desc: 'BorrowBond is purpose-built for temporary access to physical hardware and metered digital APIs. Every transaction locks a transparent Rental Fee alongside a Refundable Security Collateral in NEAR programmable escrow.',
      },
      {
        title: 'Unified Account & NEAR Chain Ecosystem',
        desc: 'Users onboard seamlessly via Google, Email, or direct NEAR Wallet connectors (WalletConnect, Meteor, HERE, MyNearWallet, Nightly) across both NEAR Testnet (.testnet) and NEAR Mainnet (.near).',
      },
      {
        title: 'Multi-Photo Inspection & Cryptographic Evidence',
        desc: 'Every listing requires 2 to 10 high-resolution product photos in frosted glass inspection frames, paired with SHA-256 condition hashes before handover and upon return.',
      },
    ],
    metricLabel: 'Target Ecosystem Contract',
    metricValue: 'borrowbondtest.testnet',
  },
  {
    pageNumber: 2,
    badge: 'PAGE 02 / 04 • AI OFFICIAL RETAIL BENCHMARK & 50% COLLATERAL ENGINE',
    title: 'Automated 50% Retail Collateral & Live NEAR/USDT Pricing',
    subtitle: 'Eliminating arbitrary security deposits through real-time specification analysis.',
    summary:
      'Over-collateralization prices out honest borrowers, while under-collateralization exposes lenders. BorrowBond’s AI Price Benchmarker inspects product titles and hardware specs (storage, RAM, finish, model tier), queries official retail prices, and automatically recommends 50% of retail value as refundable collateral.',
    highlights: [
      {
        title: '50% Official Retail Collateral Rule',
        desc: 'Example: When a provider lists an iPhone 18 Pro Max (256/32GB Silver) with an official retail value of $1,000.00 USD, the AI engine automatically divides the retail price in half to suggest $500.00 USDT in refundable collateral.',
      },
      {
        title: 'Live CoinGecko & Binance NEAR/USDT Oracle Sync',
        desc: 'All rental fees and collateral amounts convert bidirectionally between NEAR and Tether USDT using live market rates—never static placeholders.',
      },
      {
        title: 'Full Provider & Borrower Transparency',
        desc: 'Providers can fine-tune their rental fee in either NEAR or USDT while borrowers see the exact separation between non-refundable rental fee and 100% refundable collateral.',
      },
    ],
    metricLabel: 'Collateral Formula',
    metricValue: 'Collateral = 50% × Official Retail Price (Live NEAR / USDT)',
  },
  {
    pageNumber: 3,
    badge: 'PAGE 03 / 04 • NEAR PROGRAMMABLE ESCROW & DIGITAL ACCESS GATEWAY',
    title: 'Deterministic Escrow Lifecycle & Quota-Enforced API Tokens',
    subtitle: 'On-chain state transitions paired with SHA-256 temporary digital bearer credentials.',
    summary:
      'Every BorrowBond agreement is governed by a strict state machine that prevents unilateral fund confiscation and automates settlement for both physical handovers and digital API gateways.',
    highlights: [
      {
        title: 'Six-Stage Programmable Escrow State Machine',
        desc: 'Enforces REQUESTED → ACCEPTED → ACTIVE → RETURN_REQUESTED → COMPLETED (or DISPUTED). Cancellation prior to acceptance automatically refunds 100% of locked funds to the borrower.',
      },
      {
        title: 'Pull-Based Claimable Withdrawals',
        desc: 'Upon completion, the rental fee is credited to the lender and 100% of the collateral is credited back to the borrower via reentrancy-safe claimable balances.',
      },
      {
        title: 'Metered Digital Credential Gateway',
        desc: 'For digital listings, activation issues a one-time bearer token (stored only as a SHA-256 hash). Every API call decrements the borrower’s quota and automatically revokes access upon expiration.',
      },
    ],
    metricLabel: 'Escrow State Integrity',
    metricValue: '100% Atomic Fee + Collateral Accounting',
  },
  {
    pageNumber: 4,
    badge: 'PAGE 04 / 04 • AI SECURITY LAYER & HUMAN DISPUTE GOVERNANCE',
    title: 'Deterministic Spending Policies & Accountable Resolution',
    subtitle: 'Protecting borrowers from autonomous agent overspending and prompt injection.',
    summary:
      'The BorrowBond AI Agent assists users in searching, comparing, and drafting agreements, but can never sign or broadcast a blockchain transaction without explicit human wallet approval.',
    highlights: [
      {
        title: 'Deterministic Backend Policy Guardrails',
        desc: 'Every booking draft is verified against the borrower’s maximum rental fee cap, maximum collateral cap, total NEAR lock limit, and approved category whitelist.',
      },
      {
        title: 'Prompt-Injection Sanitization',
        desc: 'Untrusted listing descriptions are scrubbed for adversarial instructions before reaching the AI Agent, preventing malicious listings from bypassing security checks.',
      },
      {
        title: 'Fair Human Dispute Resolver (No Auto-Confiscation)',
        desc: 'Collateral is never automatically forfeited simply because a timer expired. Disputed agreements freeze escrow until reviewed by the designated resolver (resolver.borrowbond.testnet).',
      },
    ],
    metricLabel: 'Transaction Signing Rule',
    metricValue: '100% Human-in-the-Loop Wallet Approval',
  },
];

export const ROADMAP_PHASES = [
  {
    phase: 'Phase 01',
    quarter: 'Q1–Q2 2026',
    status: 'COMPLETED • LIVE',
    title: 'Core Protocol & NEAR Testnet Escrow',
    items: [
      'Deterministic 6-stage NEAR escrow state machine (`borrowbondtest.testnet`)',
      'Separated Rental Fee vs. Refundable Collateral accounting',
      'Controlled Digital API Gateway with SHA-256 bearer tokens & request quotas',
    ],
  },
  {
    phase: 'Phase 02',
    quarter: 'Q3–Q4 2026',
    status: 'COMPLETED • LIVE',
    title: 'AI 50% Retail Collateral & Liquid-Glass UX',
    items: [
      'AI Official Retail Price Search & automatic 50% collateral calculation',
      'Live CoinGecko/Binance NEAR ↔ USDT bidirectional conversion',
      '2–10 Multi-photo glass frame gallery & Unified Profile + Wallet onboarding',
    ],
  },
  {
    phase: 'Phase 03',
    quarter: 'Q1 2027',
    status: 'IN PROGRESS',
    title: 'NEAR Mainnet Launch & Native NEP-141 USDT Escrow',
    items: [
      'Mainnet smart contract deployment (`borrowbond.near`) with security audit',
      'Direct native NEP-141 USDT and wNEAR dual-token escrow locking',
      'Mobile push notifications via Telegram Mini-App (`t.me/Borrowbond`)',
    ],
  },
  {
    phase: 'Phase 04',
    quarter: 'Q2–Q4 2027',
    status: 'UPCOMING',
    title: 'Decentralized Resolver DAO & Hardware Hubs',
    items: [
      'Multi-sig community arbitration DAO for high-value hardware disputes',
      'Smart-locker QR handover integration in major tech hubs',
      'Cross-chain intents via NEAR Chain Signatures for multi-chain borrowers',
    ],
  },
];

export const WhitepaperDocsView: React.FC<WhitepaperDocsViewProps> = ({
  initialSection = 'WHITEPAPER',
  nearUsdRate,
  contractAddress,
  connectedWallet,
  onNavigate,
}) => {
  const [activeSection, setActiveSection] = useState<DocsSectionTab>(initialSection);
  const [wpPage, setWpPage] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const currentWp = WHITEPAPER_PAGES[wpPage] || WHITEPAPER_PAGES[0];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Compact Header */}
      <div className="near-glass-card rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            aria-label="Go to BorrowBond Home"
            onClick={() => onNavigate('LANDING')}
            className="cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-[#8BD6A7] rounded-lg"
          >
            <BorrowBondBrandLogo size={42} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-[#00EC97] uppercase tracking-wider">
                Official Protocol Documentation
              </span>
              <span className="text-xs text-[#9BA8C0]">•</span>
              <span className="text-[11px] font-mono text-[#9BA8C0]">v2.4 Testnet/Mainnet</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold font-display text-[#F5F8FF]">
              <button
                type="button"
                onClick={() => onNavigate('LANDING')}
                className="cursor-pointer hover:opacity-90 text-left mr-1.5"
              >
                <BorrowBondWordmark />
              </button>
              <span>Whitepaper, Roadmap &amp; Legal Hub</span>
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('LANDING')}
            className="btn-near-secondary px-3 py-2 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#00EC97]" />
            <span>Back Home</span>
          </button>
          <a
            href="https://x.com/Borrowbond"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-near-secondary px-2.5 py-2 text-xs"
            title="BorrowBond on X"
          >
            <SocialBrandIcon network="x" size={14} />
          </a>
          <a
            href="https://t.me/Borrowbond"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-near-secondary px-2.5 py-2 text-xs text-[#17F1D1]"
            title="BorrowBond on Telegram"
          >
            <SocialBrandIcon network="telegram" size={14} />
          </a>
          <a
            href="https://linkedin.com/company/Borrowbond"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-near-secondary px-2.5 py-2 text-xs text-[#00EC97]"
            title="BorrowBond on LinkedIn"
          >
            <SocialBrandIcon network="linkedin" size={14} />
          </a>
        </div>
      </div>

      {/* Compact Section Switcher (4 Tabs) */}
      <div
        role="tablist"
        aria-label="Documentation Sections"
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-[#0D1322]/90 border border-slate-800"
      >
        {(
          [
            { id: 'WHITEPAPER', label: 'Whitepaper (4 Pages)', icon: <BookOpen className="w-3.5 h-3.5" /> },
            { id: 'ROADMAP', label: 'Project Roadmap', icon: <Milestone className="w-3.5 h-3.5" /> },
            { id: 'TERMS', label: 'Terms & Agreements', icon: <Scale className="w-3.5 h-3.5" /> },
            { id: 'DEPLOYMENT', label: 'Deploy & Testnet Guide', icon: <Rocket className="w-3.5 h-3.5" /> },
          ] as const
        ).map((tab) => {
          const active = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveSection(tab.id)}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                active
                  ? 'bg-gradient-to-r from-[#00EC97] to-[#17F1D1] text-[#04080E] shadow-[0_0_20px_rgba(0,236,151,0.3)]'
                  : 'text-[#9BA8C0] hover:text-[#F5F8FF]'
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB 1: COMPACT 4-PAGE INTERACTIVE WHITEPAPER & ABOUT PROJECT READER
          ===================================================================== */}
      {activeSection === 'WHITEPAPER' && (
        <div className="near-glow-card rounded-3xl p-6 sm:p-8 space-y-6">
          {/* Compact Page Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <span className="text-xs font-mono font-bold text-[#00EC97]">
              {currentWp.badge}
            </span>
            <div className="flex items-center gap-1.5">
              {WHITEPAPER_PAGES.map((p, idx) => (
                <button
                  key={p.pageNumber}
                  type="button"
                  onClick={() => setWpPage(idx)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    wpPage === idx
                      ? 'bg-[#00EC97] text-[#04080E]'
                      : 'bg-[#06080F] text-[#9BA8C0] border border-slate-800 hover:text-[#F5F8FF]'
                  }`}
                >
                  Page {p.pageNumber}
                </button>
              ))}
            </div>
          </div>

          {/* Page Content */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-[#F5F8FF]">
                {currentWp.title}
              </h2>
              <p className="text-sm font-medium text-[#17F1D1]">{currentWp.subtitle}</p>
            </div>

            <p className="text-sm text-[#9BA8C0] leading-relaxed bg-[#06080F]/80 p-4 rounded-2xl border border-slate-800/80">
              {currentWp.summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {currentWp.highlights.map((item) => (
                <div
                  key={item.title}
                  className="p-4 rounded-2xl bg-[#06080F]/90 border border-slate-800/90 space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#00EC97]">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-xs text-[#9BA8C0] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Page Footer & Compact Prev/Next Navigation */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#9BA8C0]">{currentWp.metricLabel}:</span>
              <code className="px-2.5 py-1 rounded-lg bg-[#06080F] border border-[#00EC97]/30 font-mono text-[#00EC97] font-bold">
                {currentWp.metricValue}
              </code>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={wpPage === 0}
                onClick={() => setWpPage((prev) => Math.max(0, prev - 1))}
                className="btn-near-secondary px-3.5 py-2 text-xs disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev Page</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (wpPage < WHITEPAPER_PAGES.length - 1) {
                    setWpPage((prev) => prev + 1);
                  } else {
                    setActiveSection('ROADMAP');
                  }
                }}
                className="btn-near-primary px-4 py-2 text-xs"
              >
                <span>{wpPage < WHITEPAPER_PAGES.length - 1 ? `Next Page (${wpPage + 2}/4)` : 'View Roadmap →'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: ATTRACTIVE INTERACTIVE ROADMAP
          ===================================================================== */}
      {activeSection === 'ROADMAP' && (
        <div className="near-glass-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-mono text-[#00EC97] uppercase">
                BorrowBond Protocol Evolution
              </span>
              <h2 className="text-2xl font-extrabold font-display text-[#F5F8FF]">
                Interactive Product & Ecosystem Roadmap
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveSection('WHITEPAPER');
                setWpPage(0);
              }}
              className="btn-near-secondary px-3.5 py-2 text-xs self-start"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#00EC97]" />
              <span>Read 4-Page Whitepaper</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {ROADMAP_PHASES.map((p, idx) => {
              const isCompleted = p.status.includes('COMPLETED');
              return (
                <div
                  key={p.phase}
                  className={`rounded-2xl p-5 border transition-all space-y-3 ${
                    isCompleted
                      ? 'near-glow-card'
                      : 'bg-[#06080F]/90 border-slate-800 hover:border-[#00EC97]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#00EC97]/15 text-[#00EC97] font-mono text-xs font-bold">
                      {p.phase} • {p.quarter}
                    </span>
                    <span
                      className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-[#00EC97] text-[#04080E]'
                          : 'bg-slate-800 text-[#9BA8C0]'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold font-display text-[#F5F8FF]">
                    {p.title}
                  </h3>

                  <ul className="space-y-2 text-xs text-[#9BA8C0]">
                    {p.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                            isCompleted ? 'text-[#00EC97]' : 'text-[#17F1D1]'
                          }`}
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-[11px]">
                    <span className="text-[#9BA8C0]">Spec Reference: Whitepaper Page {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setWpPage(idx);
                        setActiveSection('WHITEPAPER');
                      }}
                      className="text-[#00EC97] font-semibold hover:underline cursor-pointer"
                    >
                      Open Spec →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: TERMS, AGREEMENTS & PRIVACY POLICY
          ===================================================================== */}
      {activeSection === 'TERMS' && (
        <div className="near-glass-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <span className="text-xs font-mono text-[#00EC97] uppercase">
              Legal, Escrow &amp; Anti-Scam Policy
            </span>
            <h2 className="text-2xl font-extrabold font-display text-[#F5F8FF]">
              BorrowBond Terms of Service &amp; Escrow Agreements
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#06080F]/90 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#F5F8FF]">
                <Lock className="w-4 h-4 text-[#00EC97]" />
                <h3>1. Locked Escrow &amp; Dual Confirmation</h3>
              </div>
              <p className="text-[#9BA8C0] leading-relaxed">
                When a booking is created, the agreed Rental Fee + 50% Collateral are locked on NEAR Testnet (<code className="font-mono text-[#F5F8FF]">{contractAddress}</code>). Neither lender nor borrower can unilaterally touch the locked funds. Funds are released only after the borrower confirms receipt and the lender confirms safe return.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#06080F]/90 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#F5F8FF]">
                <ShieldCheck className="w-4 h-4 text-[#17F1D1]" />
                <h3>2. Anti-Scam TIN / Serial &amp; Photo Registry</h3>
              </div>
              <p className="text-[#9BA8C0] leading-relaxed">
                To prevent scammers from swapping a borrowed product with a fake or different item, every listing stores the exact Brand &amp; Model, TIN / Serial / IMEI / NFT Token ID, and SHA-256 hash of 2–10 photos on BorrowBond. Upon return, the lender verifies the returned serial matches the registered TIN before escrow settles.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#06080F]/90 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#F5F8FF]">
                <Scale className="w-4 h-4 text-[#FBBF24]" />
                <h3>3. BorrowBond Team Damage-Deduction Arbitration</h3>
              </div>
              <p className="text-[#9BA8C0] leading-relaxed">
                If a product is damaged or disputed after the deadline, the BorrowBond Team (<code className="font-mono text-[#F5F8FF]">borrowbondtest.testnet</code> / <code className="font-mono text-[#F5F8FF]">resolver.borrowbond.testnet</code>) reviews evidence with both parties and sets the damage cost. The smart contract deducts <strong className="text-[#F5F8FF]">Rental Fee + Damage Cost</strong> for the lender and automatically redirects the <strong className="text-[#00EC97]">remaining collateral</strong> back to the borrower.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#06080F]/90 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#F5F8FF]">
                <Coins className="w-4 h-4 text-[#00EC97]" />
                <h3>4. Physical Gear, Digital Accounts, NFTs &amp; APIs</h3>
              </div>
              <p className="text-[#9BA8C0] leading-relaxed">
                Users may lend physical hardware as well as Digital Accounts, Utility NFTs (NEP-171), Software Licenses, and Metered APIs under the same escrow locking, anti-scam verification, and BorrowBond Team arbitration policies.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#06080F]/90 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#F5F8FF]">
                <Database className="w-4 h-4 text-[#00EC97]" />
                <h3>5. Country-Aware Physical Borrowing &amp; Contact Privacy Policy</h3>
              </div>
              <p className="text-[#9BA8C0] leading-relaxed">
                Physical items require borrower, lender, and listing to be located in the same country (ISO 3166-1 alpha-2). Digital resources remain globally accessible. Phone numbers and private pickup addresses remain masked before booking acceptance and are disclosed only to the authenticated borrower and lender once a booking is accepted.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: SAMSUNG A15 + TERMUX & 24/7 DEPLOYMENT GUIDE
          ===================================================================== */}
      {activeSection === 'DEPLOYMENT' && (
        <div className="near-glow-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <span className="text-xs font-mono text-[#00EC97] uppercase">
              Samsung Galaxy A15 (128GB / 8GB) + Termux 24/7 Runbook
            </span>
            <h2 className="text-2xl font-extrabold font-display text-[#F5F8FF]">
              How to Deploy &amp; Run 24/7 Using Only Your Samsung A15 &amp; Termux
            </h2>
            <p className="text-xs text-[#9BA8C0] mt-1">
              Once deployed to <code className="font-mono text-[#00EC97]">{contractAddress}</code>, your NEAR smart contract runs 24/7 on NEAR Blockchain validators forever—even when Termux is closed or your phone is powered off.
            </p>
          </div>

          <div className="space-y-4">
            {/* Step 1: Chrome Browser Faucet on Samsung A15 */}
            <div className="p-5 rounded-2xl bg-[#06080F]/95 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#00EC97]">
                  <NearTokenIcon size={18} />
                  <h3>Step 1: Get Free Testnet NEAR on Your Samsung A15 (Chrome Browser)</h3>
                </div>
                <a
                  href="https://near-faucet.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[#00EC97] hover:underline inline-flex items-center gap-1"
                >
                  <span>Open NEAR Faucet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-[#9BA8C0] leading-relaxed">
                Open Chrome on your Samsung A15, visit <a href="https://near-faucet.io" target="_blank" rel="noopener noreferrer" className="text-[#00EC97] underline">near-faucet.io</a>, paste <code className="font-mono text-[#00EC97]">borrowbondtest.testnet</code>, and tap <strong>Request</strong>.
              </p>
            </div>

            {/* Step 2: Prepare Termux on Samsung A15 (8GB RAM) */}
            <div className="p-5 rounded-2xl bg-[#06080F]/95 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#17F1D1]">
                <Terminal className="w-4 h-4" />
                <h3>Step 2: Install Node.js, Rust &amp; Wake-Lock in Termux (Samsung A15)</h3>
              </div>
              <p className="text-xs text-[#9BA8C0] leading-relaxed">
                Open <strong>Termux</strong> on your Samsung A15 and paste this command to install the tools and enable <code className="font-mono text-[#F5F8FF]">termux-wake-lock</code> so Samsung One UI never kills your session:
              </p>
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#0D1322] border border-slate-800 font-mono text-xs text-[#F5F8FF]">
                <code className="overflow-x-auto">
                  pkg update -y &amp;&amp; pkg install nodejs-lts rust clang git tmux -y &amp;&amp; termux-wake-lock
                </code>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      'cmd-termux-prep',
                      'pkg update -y && pkg install nodejs-lts rust clang git tmux -y && termux-wake-lock'
                    )
                  }
                  className="btn-near-secondary px-2.5 py-1 text-[11px] shrink-0"
                >
                  {copiedId === 'cmd-termux-prep' ? <Check className="w-3.5 h-3.5 text-[#00EC97]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Step 3: Deploy the NEAR Smart Contract (Runs 24/7 on Blockchain Forever) */}
            <div className="p-5 rounded-2xl bg-[#06080F]/95 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#00EC97]">
                <Lock className="w-4 h-4" />
                <h3>Step 3: Deploy Contract to `borrowbondtest.testnet` (Runs 24/7 Even When Termux Is Closed)</h3>
              </div>
              <p className="text-xs text-[#9BA8C0] leading-relaxed">
                Once this command finishes, your contract lives permanently on NEAR Testnet validators—it continues holding and releasing escrow 24/7 even if you close Termux or turn off your Samsung A15:
              </p>
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#0D1322] border border-slate-800 font-mono text-xs text-[#F5F8FF]">
                <code className="overflow-x-auto">
                  rustup target add wasm32-unknown-unknown &amp;&amp; cd contracts/borrowbond &amp;&amp; cargo build --target wasm32-unknown-unknown --release &amp;&amp; npx near-cli-rs@latest contract deploy borrowbondtest.testnet use-file target/wasm32-unknown-unknown/release/borrowbond_escrow.wasm without-init-call network-config testnet
                </code>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      'cmd-contract',
                      'rustup target add wasm32-unknown-unknown && cd contracts/borrowbond && cargo build --target wasm32-unknown-unknown --release && npx near-cli-rs@latest contract deploy borrowbondtest.testnet use-file target/wasm32-unknown-unknown/release/borrowbond_escrow.wasm without-init-call network-config testnet'
                    )
                  }
                  className="btn-near-secondary px-2.5 py-1 text-[11px] shrink-0"
                >
                  {copiedId === 'cmd-contract' ? <Check className="w-3.5 h-3.5 text-[#00EC97]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Step 4: Keep Backend Running 24/7 via PM2 Daemon or Cloud */}
            <div className="p-5 rounded-2xl bg-[#06080F]/95 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#17F1D1]">
                <Rocket className="w-4 h-4" />
                <h3>Step 4: Keep the App Running in Background with PM2 + WakeLock</h3>
              </div>
              <p className="text-xs text-[#9BA8C0] leading-relaxed">
                Your live cloud URL is already running 24/7. If you also run a copy inside Termux on your Samsung A15, use <code className="font-mono text-[#F5F8FF]">pm2</code> so it stays alive in the background:
              </p>
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#0D1322] border border-slate-800 font-mono text-xs text-[#F5F8FF]">
                <code className="overflow-x-auto">
                  npm install -g pm2 &amp;&amp; npm install &amp;&amp; npm run build &amp;&amp; pm2 start npm --name borrowbond -- start &amp;&amp; pm2 save
                </code>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      'cmd-build',
                      'npm install -g pm2 && npm install && npm run build && pm2 start npm --name borrowbond -- start && pm2 save'
                    )
                  }
                  className="btn-near-secondary px-2.5 py-1 text-[11px] shrink-0"
                >
                  {copiedId === 'cmd-build' ? <Check className="w-3.5 h-3.5 text-[#00EC97]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
