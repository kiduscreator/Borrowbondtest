import React, { useState } from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Official BorrowBond Brand Logo (User's Real Logo: Cyan-Mint "B" with Handshake & Orbital Swoosh)
 * Uses the uploaded brand asset `/assets/aistudio/file_000000003f0482118df61df19952812c_2_9a828c76.jpg`
 */
export const BorrowBondBrandLogo: React.FC<IconProps> = ({ className = '', size = 34 }) => {
  const [imgError, setImgError] = useState(false);
  const badgeWidth = Math.round(size * 1.26);

  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-[#020403] border border-[#27312A]/90 shrink-0 select-none ${className}`}
      style={{ width: badgeWidth, height: size }}
      title="BorrowBond Official Brand Logo"
    >
      {!imgError ? (
        <img
          src="/assets/aistudio/file_000000003f0482118df61df19952812c_2_9a828c76.jpg"
          alt="BorrowBond Official Brand Logo"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover object-[50%_47%] scale-[1.08]"
        />
      ) : (
        <svg
          width={size * 0.85}
          height={size * 0.85}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="BorrowBond Official Brand Logo"
        >
          <defs>
            <linearGradient id="bbBrandGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00F5D4" />
              <stop offset="0.5" stopColor="#00EC97" />
              <stop offset="1" stopColor="#0EA5E9" />
            </linearGradient>
          </defs>
          <path
            d="M16 12H36C43.7 12 49 16.5 49 23C49 27.5 46.2 30.8 42 32C47.2 33.4 50.5 37.2 50.5 42.5C50.5 49.8 44.5 54 35.5 54H16V12Z"
            stroke="url(#bbBrandGrad)"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            d="M10 32H28L34 27L41 33L33 40L25 34"
            stroke="url(#bbBrandGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <ellipse
            cx="32"
            cy="33"
            rx="27"
            ry="11"
            transform="rotate(-22 32 33)"
            stroke="#E2F8F5"
            strokeWidth="2"
            strokeDasharray="45 30"
          />
        </svg>
      )}
    </span>
  );
};

export const BorrowBondWordmark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`font-bold tracking-tight font-display select-none ${className}`}>
    <span className="text-[#F2F5F1]">Borrow</span>
    <span className="text-[#8FA898]">Bond</span>
  </span>
);

/**
 * Official 2D NEAR Protocol Geometric Logo + FontAwesome semantic marker
 * Used strictly for NEAR token & currency pricing displays
 */
export const NearTokenIcon: React.FC<IconProps> = ({ className = '', size = 18 }) => (
  <span
    className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
    title="NEAR Protocol"
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 90 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="NEAR Protocol 2D Icon"
    >
      <circle cx="45" cy="45" r="45" fill="#00EC97" />
      <path
        d="M61.9 22.8L49.3 41.5C48.5 42.7 50.1 44.1 51.2 43.1L63.5 32.4C64.1 31.9 65 32.3 65 33.1V56.4C65 57.3 63.8 57.6 63.3 56.9L32.8 20.6C31.7 19.3 30 18.5 28.2 18.5H26.9C23.6 18.5 21 21.1 21 24.4V65.6C21 68.9 23.6 71.5 26.9 71.5C28.9 71.5 30.8 70.5 31.9 68.8L44.5 50.1C45.3 48.9 43.7 47.5 42.6 48.5L30.3 59.2C29.7 59.7 28.8 59.3 28.8 58.5V35.2C28.8 34.3 30 34 30.5 34.7L61 71C62.1 72.3 63.8 73.1 65.6 73.1H66.9C70.2 73.1 72.8 70.5 72.8 67.2V24.4C72.8 21.1 70.2 18.5 66.9 18.5C64.9 18.5 63 19.5 61.9 21.2V22.8Z"
        fill="#04080E"
      />
    </svg>
  </span>
);

/**
 * Official 2D Tether (USDT) Cryptocurrency Logo
 */
export const UsdtTokenIcon: React.FC<IconProps> = ({ className = '', size = 18 }) => (
  <span
    className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
    title="Tether USDT"
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 90 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Tether USDT Cryptocurrency Logo"
    >
      <circle cx="45" cy="45" r="45" fill="#26A17B" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M50.45 48.65V48.6C49.95 48.65 47.95 48.8 45.1 48.8C42.35 48.8 40.4 48.65 39.8 48.6V48.65C29.15 48.2 21.2 46.35 21.2 44.15C21.2 41.95 29.15 40.1 39.8 39.65V46.8C40.45 46.85 42.45 47 45.15 47C48.1 47 49.9 46.85 50.45 46.8V39.65C61.1 40.1 69 41.95 69 44.15C69 46.35 61.1 48.2 50.45 48.65ZM50.45 38.1V31.7H65.2V21.8H25.05V31.7H39.8V38.1C27.45 38.65 18.2 41.15 18.2 44.15C18.2 47.15 27.45 49.65 39.8 50.2V71.8H50.45V50.2C62.8 49.65 72.05 47.15 72.05 44.15C72.05 41.15 62.8 38.65 50.45 38.1Z"
        fill="#FFFFFF"
      />
    </svg>
  </span>
);

/**
 * 2D Social Icons for BorrowBond (/Borrowbond on X, Telegram, LinkedIn)
 */
export const SocialBrandIcon: React.FC<{
  network: 'x' | 'telegram' | 'linkedin';
  size?: number;
}> = ({ network, size = 16 }) => {
  if (network === 'x') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  if (network === 'telegram') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
};

/**
 * 2D Wallet Connector Icons for NEAR Ecosystem Wallets
 */
export const NearWalletConnectorIcon: React.FC<{
  connectorId: 'walletconnect' | 'meteor' | 'here' | 'mynearwallet' | 'nightly';
  size?: number;
}> = ({ connectorId, size = 28 }) => {
  if (connectorId === 'walletconnect') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#3B99FC" />
        <path
          d="M15.6 19.6C20.2 15.1 27.8 15.1 32.4 19.6L33 20.2C33.3 20.5 33.3 20.9 33 21.2L31.1 23.1C30.9 23.3 30.7 23.3 30.5 23.1L29.7 22.3C26.5 19.2 21.5 19.2 18.3 22.3L17.4 23.2C17.2 23.4 17 23.4 16.8 23.2L14.9 21.3C14.6 21 14.6 20.6 14.9 20.3L15.6 19.6ZM36.3 23.5L38 25.2C38.3 25.5 38.3 25.9 38 26.2L30.4 33.7C30.1 34 29.7 34 29.4 33.7L24.1 28.4C24 28.3 23.9 28.3 23.8 28.4L18.5 33.7C18.2 34 17.8 34 17.5 33.7L10 26.2C9.7 25.9 9.7 25.5 10 25.2L11.7 23.5C12 23.2 12.4 23.2 12.7 23.5L18 28.8C18.1 28.9 18.2 28.9 18.3 28.8L23.6 23.5C23.9 23.2 24.3 23.2 24.6 23.5L29.9 28.8C30 28.9 30.1 28.9 30.2 28.8L35.5 23.5C35.8 23.2 36.1 23.2 36.3 23.5Z"
          fill="white"
        />
      </svg>
    );
  }
  if (connectorId === 'meteor') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#131829" stroke="#00EC97" strokeWidth="1.5" />
        <circle cx="24" cy="24" r="11" fill="url(#meteorGrad)" />
        <path d="M16 32L32 16M25 14L34 23" stroke="#00EC97" strokeWidth="2.5" strokeLinecap="round" />
        <defs>
          <linearGradient id="meteorGrad" x1="13" y1="13" x2="35" y2="35">
            <stop stopColor="#00EC97" />
            <stop offset="1" stopColor="#6366F1" />
          </linearGradient>
        </defs>
      </svg>
    );
  }
  if (connectorId === 'here') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#FDBA74" />
        <path
          d="M16 14V34M32 14V34M16 24H32"
          stroke="#0F172A"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (connectorId === 'mynearwallet') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#04080E" stroke="#17F1D1" strokeWidth="1.5" />
        <path
          d="M16 32V16L32 32V16"
          stroke="#00EC97"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#1E1B4B" stroke="#818CF8" strokeWidth="1.5" />
      <path d="M24 13L33 24L24 35L15 24L24 13Z" fill="#00EC97" />
    </svg>
  );
};
