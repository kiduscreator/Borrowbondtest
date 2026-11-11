import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  WifiOff,
  HelpCircle,
  ShieldCheck,
  Wallet,
  Lock,
  Sparkles,
  CheckCircle2,
  X,
  RotateCcw,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        type="button"
        onClick={async () => {
          if (isInstallable) {
            await install();
          } else {
            setShowGuideModal(true);
          }
        }}
        title="Install BorrowBond Progressive Web App (PWA)"
        className={`btn-near-secondary ${
          compact ? 'px-2.5 py-2 text-xs' : 'px-3.5 py-2 text-xs'
        } inline-flex items-center gap-1.5 shrink-0`}
      >
        <Download className="w-3.5 h-3.5 text-[#00EC97]" />
        <span className={compact ? 'hidden xl:inline' : ''}>Install App</span>
      </motion.button>

      <AnimatePresence>
        {showGuideModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04070E]/85 backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Install BorrowBond Mobile & Desktop App"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="near-glow-card w-full max-w-md rounded-2xl p-6 space-y-4 border border-[#00EC97]/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-mono text-[#00EC97] uppercase font-bold">
                    Installable Progressive Web App (PWA)
                  </span>
                  <h3 className="text-lg font-extrabold font-display text-[#F5F8FF] mt-0.5">
                    Add BorrowBond to Your Home Screen
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  aria-label="Close PWA Install Guide"
                  className="p-1.5 rounded-lg bg-[#06080F] border border-slate-800 text-[#9BA8C0] hover:text-[#F5F8FF] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isIOS ? (
                <ol className="space-y-2 text-xs text-[#9BA8C0] list-decimal list-inside bg-[#06080F] p-4 rounded-xl border border-slate-800">
                  <li>
                    Tap the <strong className="text-[#F5F8FF]">Share</strong> button in your Safari toolbar.
                  </li>
                  <li>
                    Scroll down and select <strong className="text-[#00EC97]">Add to Home Screen</strong>.
                  </li>
                  <li>
                    Launch <strong className="text-[#F5F8FF]">BorrowBond</strong> in full-screen standalone mode with offline support.
                  </li>
                </ol>
              ) : (
                <ol className="space-y-2 text-xs text-[#9BA8C0] list-decimal list-inside bg-[#06080F] p-4 rounded-xl border border-slate-800">
                  <li>
                    Open your browser menu (<strong className="text-[#F5F8FF]">⋮</strong> in Chrome on Android/Samsung or Desktop).
                  </li>
                  <li>
                    Tap <strong className="text-[#00EC97]">Install app</strong> or{' '}
                    <strong className="text-[#00EC97]">Add to Home screen</strong>.
                  </li>
                  <li>
                    BorrowBond installs with offline caching and standalone full-screen navigation.
                  </li>
                </ol>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="btn-near-primary px-4 py-2 text-xs"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#FBBF24] px-3.5 py-2 text-xs font-bold text-[#04080E] shadow-lg"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Offline Mode — Viewing cached BorrowBond marketplace data.</span>
    </div>
  );
};

interface WalletBeginnerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractAddress?: string;
  onOpenConnectWallet: () => void;
  onResetDemoState?: () => Promise<void>;
  onResetDemo?: () => Promise<void>;
}

export const WalletBeginnerGuideModal: React.FC<WalletBeginnerGuideModalProps> = ({
  isOpen,
  onClose,
  contractAddress = 'borrowbondtest.testnet',
  onOpenConnectWallet,
  onResetDemoState,
  onResetDemo,
}) => {
  const resolvedReset = onResetDemoState || onResetDemo;
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04070E]/85 backdrop-blur-xl overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="How BorrowBond Works — Beginner Guide"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="near-glow-card w-full max-w-xl rounded-3xl p-6 space-y-5 border border-[#00EC97]/40 my-auto max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#00EC97] uppercase">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Zero-Jargon Onboarding Guide</span>
              </div>
              <h2 className="text-xl font-extrabold font-display text-[#F5F8FF]">
                New to Wallets? How BorrowBond Works in 60 Seconds
              </h2>
              <p className="text-xs text-[#9BA8C0]">
                BorrowBond is a peer-to-peer equipment &amp; digital access rental marketplace — never money lending.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Beginner Guide"
              className="p-2 rounded-xl bg-[#06080F] border border-slate-800 text-[#9BA8C0] hover:text-[#F5F8FF] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-[#06080F] border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#00EC97]">
                <Lock className="w-4 h-4" />
                <span>1. Rental Fee vs. Collateral</span>
              </div>
              <p className="text-[#9BA8C0] leading-relaxed">
                Every booking separates the small <strong className="text-[#F5F8FF]">Rental Fee</strong> (what you pay to use the item) from the <strong className="text-[#00EC97]">Refundable Deposit (Collateral)</strong>, which is returned 100% to you when the item comes back safe.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#06080F] border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#17F1D1]">
                <ShieldCheck className="w-4 h-4" />
                <span>2. Neutral Smart Contract Box</span>
              </div>
              <p className="text-[#9BA8C0] leading-relaxed">
                Your deposit is held in a neutral NEAR Testnet smart contract (<code className="font-mono text-[#F5F8FF]">{contractAddress}</code>). Neither the lender nor BorrowBond can run away with your deposit during the rental.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#06080F] border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#00EC97]">
                <Sparkles className="w-4 h-4" />
                <span>3. AI Prepares, Humans Sign</span>
              </div>
              <p className="text-[#9BA8C0] leading-relaxed">
                Our AI Agent searches listings, checks your spending limits, and prepares a draft agreement — but <strong className="text-[#F5F8FF]">the AI can never sign or move your money</strong>. You always approve in your own wallet.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#06080F] border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#FBBF24]">
                <Wallet className="w-4 h-4" />
                <span>4. Test With Zero Risk</span>
              </div>
              <p className="text-[#9BA8C0] leading-relaxed">
                Everything here runs on <strong className="text-[#F5F8FF]">NEAR Testnet</strong> using free test tokens. You can switch between Borrower, Lender, and Arbitrator accounts in 1 tap to experience both sides.
              </p>
            </div>
          </div>

          <details className="text-xs text-[#9BA8C0] bg-[#06080F] rounded-xl p-3.5 border border-slate-800">
            <summary className="cursor-pointer font-semibold text-[#F5F8FF] select-none">
              What does &ldquo;yoctoNEAR&rdquo; mean in technical receipts? (Optional Detail)
            </summary>
            <p className="mt-2 leading-relaxed">
              Just like $1.00 USD is made of 100 cents, <strong>1 NEAR</strong> is divided into 10²⁴ smallest units called <code className="font-mono text-[#00EC97]">yoctoNEAR</code> so smart contracts can calculate exact amounts without rounding errors.
            </p>
          </details>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            {resolvedReset && (
              <button
                type="button"
                disabled={resetting}
                onClick={async () => {
                  setResetting(true);
                  await resolvedReset();
                  setResetting(false);
                  setResetDone(true);
                  setTimeout(() => setResetDone(false), 2500);
                }}
                className="btn-near-secondary px-3.5 py-2 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#00EC97]" />
                <span>
                  {resetDone
                    ? 'Demo State Reset to Fresh!'
                    : resetting
                    ? 'Resetting Demo...'
                    : '1-Click Reset Demo Data'}
                </span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenConnectWallet();
                }}
                className="btn-near-secondary px-4 py-2 text-xs"
              >
                <Wallet className="w-3.5 h-3.5 text-[#17F1D1]" />
                <span>Connect / Switch Wallet</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-near-primary px-5 py-2 text-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Start Exploring</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
