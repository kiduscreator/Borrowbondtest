import React from 'react';

export type AppView =
  | 'LANDING'
  | 'MARKETPLACE'
  | 'LISTING_DETAILS'
  | 'CREATE_LISTING'
  | 'AI_AGENT'
  | 'CHECKOUT'
  | 'DASHBOARD'
  | 'TRANSACTION_DETAILS';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  connectedWallet: string | null;
  onOpenWalletModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  connectedWallet,
  onOpenWalletModal,
}) => {
  const navItems: { label: string; view: AppView }[] = [
    { label: 'Marketplace', view: 'MARKETPLACE' },
    { label: 'AI Agent', view: 'AI_AGENT' },
    { label: 'List Resource', view: 'CREATE_LISTING' },
    { label: 'Dashboard', view: 'DASHBOARD' },
  ];

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-8 px-6 py-4 bg-[#0B1020]/95 backdrop-blur-md border-b border-slate-800/80">
      {/* Zone 1: Single text element wordmark */}
      <button
        type="button"
        onClick={() => onNavigate('LANDING')}
        className="text-lg font-bold tracking-tight text-[#F3F6FC] font-display whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#5EEAD4] cursor-pointer"
      >
        BorrowBond
      </button>

      {/* Zone 2: 4 concise single-line text navigation links */}
      <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-7 text-sm font-medium text-[#A4B0C4]">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => onNavigate(item.view)}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 cursor-pointer ${
                isActive
                  ? 'text-[#F3F6FC] border-[#5EEAD4]'
                  : 'border-transparent hover:text-[#F3F6FC] hover:border-slate-700'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onOpenWalletModal}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {connectedWallet ? connectedWallet : 'Connect NEAR Testnet'}
        </button>
      </div>
    </header>
  );
};
