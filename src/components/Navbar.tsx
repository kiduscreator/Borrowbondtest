import React from 'react';
import {
  Sparkles,
  Wallet,
  PlusCircle,
  LayoutGrid,
  Shield,
  Menu,
  Home,
} from 'lucide-react';
import { BorrowBondBrandLogo, BorrowBondWordmark } from './TokenIcons';

export type AppView =
  | 'LANDING'
  | 'MARKETPLACE'
  | 'LISTING_DETAILS'
  | 'CREATE_LISTING'
  | 'AI_AGENT'
  | 'CHECKOUT'
  | 'DASHBOARD'
  | 'TRANSACTION_DETAILS'
  | 'WHITEPAPER';

export type ThemeMode = 'night' | 'day' | 'system';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  connectedWallet: string | null;
  nearNetwork?: 'mainnet' | 'testnet';
  userDisplayName?: string;
  userAvatarUrl?: string;
  onOpenWalletModal: () => void;
  onOpenSideMenu?: () => void;
  onOpenBeginnerGuide?: () => void;
  nearUsdRate?: number;
  displayCurrency?: 'NEAR' | 'USDT';
  onToggleCurrency?: (currency: 'NEAR' | 'USDT') => void;
  themeMode?: ThemeMode;
  onChangeThemeMode?: (mode: ThemeMode) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  connectedWallet,
  userDisplayName,
  userAvatarUrl,
  onOpenWalletModal,
  onOpenSideMenu,
}) => {
  const navItems: {
    label: string;
    mobileLabel: string;
    ariaLabel: string;
    view: AppView;
    icon: React.ReactNode;
  }[] = [
    {
      label: 'Explore',
      mobileLabel: 'Explore',
      ariaLabel: 'Explore Marketplace',
      view: 'MARKETPLACE',
      icon: <LayoutGrid className="w-4 h-4" />,
    },
    {
      label: 'AI Agent',
      mobileLabel: 'AI Agent',
      ariaLabel: 'AI Agent',
      view: 'AI_AGENT',
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      label: 'List Item',
      mobileLabel: 'List Item',
      ariaLabel: 'List Resource',
      view: 'CREATE_LISTING',
      icon: <PlusCircle className="w-4 h-4" />,
    },
    {
      label: 'Dashboard',
      mobileLabel: 'Dashboard',
      ariaLabel: 'Dashboard',
      view: 'DASHBOARD',
      icon: <Shield className="w-4 h-4" />,
    },
  ];

  const isViewActive = (target: AppView) => {
    if (currentView === target) return true;
    if (target === 'MARKETPLACE' && (currentView === 'LISTING_DETAILS' || currentView === 'CHECKOUT')) {
      return true;
    }
    if (target === 'DASHBOARD' && currentView === 'TRANSACTION_DETAILS') {
      return true;
    }
    return false;
  };

  return (
    <>
      {/* Clean Fintech Top Header */}
      <header className="sticky top-0 z-40 px-4 sm:px-6 h-16 bg-[#0C100D]/95 backdrop-blur-md border-b border-[#27312A] flex items-center">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between gap-4">
          {/* Left: BorrowBond Logo + Desktop Primary Navigation */}
          <div className="flex items-center gap-8">
            <button
              type="button"
              aria-label="BorrowBond Home"
              onClick={() => {
                onNavigate('LANDING');
                if (typeof window !== 'undefined') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-[#8BD6A7] cursor-pointer shrink-0 group"
            >
              <BorrowBondBrandLogo size={34} />
              <BorrowBondWordmark className="text-lg" />
            </button>

            <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1.5">
              {navItems.map((item) => {
                const active = isViewActive(item.view);
                return (
                  <button
                    key={item.view}
                    type="button"
                    aria-label={item.ariaLabel}
                    onClick={() => onNavigate(item.view)}
                    className={`px-4 py-2 text-sm font-medium cursor-pointer glass-nav-pill ${
                      active
                        ? 'glass-nav-pill-active text-[#F2F5F1]'
                        : 'text-[#A0AAA2] hover:text-[#F2F5F1]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Connect Wallet + More Menu */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenWalletModal}
              className="btn-near-primary px-4 py-2 text-xs sm:text-sm whitespace-nowrap max-w-[170px] sm:max-w-none truncate"
            >
              <Wallet className="w-4 h-4 shrink-0 text-[#8BD6A7]" />
              <span className="truncate">
                {connectedWallet ? connectedWallet : 'Connect Wallet'}
              </span>
            </button>

            <button
              type="button"
              aria-label="Open More Menu"
              onClick={onOpenSideMenu}
              className="btn-near-secondary px-3.5 py-2 text-xs sm:text-sm flex items-center gap-2 shrink-0"
              title="More: Whitepaper, Roadmap, Terms, Privacy & Settings"
            >
              {userAvatarUrl && (
                <img
                  src={userAvatarUrl}
                  alt={userDisplayName || 'Account'}
                  className="w-4 h-4 rounded-full object-cover"
                />
              )}
              <Menu className="w-4 h-4 text-[#A0AAA2]" />
              <span className="hidden sm:inline text-xs font-medium text-[#F2F5F1]">More</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Bottom Glass Pill Dock (Matches Attached Telegram-Style Glass Capsule) */}
      <nav
        aria-label="Floating Bottom Glass Navigation"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(94vw,460px)] rounded-full p-1.5 liquid-glass-dock"
      >
        <div className="grid grid-cols-5 items-center gap-1">
          <button
            type="button"
            aria-label="Home"
            onClick={() => {
              onNavigate('LANDING');
              if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className={`py-2 px-2 flex flex-col items-center justify-center gap-1 text-[11px] font-medium cursor-pointer glass-nav-pill ${
              currentView === 'LANDING'
                ? 'glass-nav-pill-active text-[#8BD6A7]'
                : 'text-[#A0AAA2] hover:text-[#F2F5F1]'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>

          {navItems.map((item) => {
            const active = isViewActive(item.view);
            return (
              <button
                key={item.view}
                type="button"
                aria-label={item.ariaLabel}
                onClick={() => onNavigate(item.view)}
                className={`py-2 px-2 flex flex-col items-center justify-center gap-1 text-[11px] font-medium cursor-pointer glass-nav-pill ${
                  active
                    ? 'glass-nav-pill-active text-[#8BD6A7]'
                    : 'text-[#A0AAA2] hover:text-[#F2F5F1]'
                }`}
              >
                {item.icon}
                <span className="truncate max-w-full">{item.mobileLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
