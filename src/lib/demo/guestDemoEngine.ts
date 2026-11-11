/**
 * BorrowBond Isolated Guest Demo Mode Engine (Sections 17.1, 17.3, 17.4, 17.12)
 *
 * Strictly separates Guest Demo Mode (`guest_demo`) from the Authenticated Application (`authenticated`):
 * - Uses realistic fictional demo listings (Laptop, Camera, Projector, Digital API, Cloud GPU Pass).
 * - Never includes the removed iPhone 18 preset.
 * - Labels all demo items with `DEMO`, `SAMPLE DATA`, and `SIMULATED TRANSACTION`.
 * - Uses clearly fictional demo wallet identifiers (`*.demo.near`).
 * - Provides interactive simulated booking & escrow lifecycle walkthroughs that never touch
 *   NEAR RPC, never transfer real NEAR, and never write to production Supabase tables.
 */

import type { MarketplaceListing, ProviderProfile, SpendingPolicy } from '../security/policyEngine';
import type { OnChainBooking, EscrowBookingStatus } from '../near/escrowStateMachine';
import {
  calculatePlatformFeeNear,
  DEFAULT_PLATFORM_FEE_BPS,
  formatYoctoNear,
} from '../near/escrowStateMachine';

export type BorrowBondAccessMode = 'welcome' | 'authenticated' | 'guest_demo';

export const DEMO_FINANCIAL_NOTICE =
  'Demo only — no real funds are transferred and no blockchain transaction is submitted.';

export const DEMO_RESTRICTED_MODAL_COPY = {
  title: 'Create an account to continue.',
  supportingText:
    'Sign in with Google and connect your NEAR wallet to access the complete BorrowBond experience.',
  primaryButton: 'Continue with Google',
  secondaryButton: 'Continue Exploring Demo',
} as const;

export const GUEST_DEMO_VIEWER_WALLET = 'guest-visitor.demo.near';
export const GUEST_DEMO_ARBITER_WALLET = 'demo-arbiter.demo.near';

export interface GuestDemoEnvironmentState {
  mode: 'guest_demo';
  demoLabel: 'DEMO' | 'SAMPLE DATA' | 'SIMULATED TRANSACTION';
  financialDisclaimer: string;
  viewerWallet: string;
  profiles: Record<string, ProviderProfile>;
  listings: MarketplaceListing[];
  bookings: Record<string, OnChainBooking>;
  policy: SpendingPolicy;
  claimableBalancesNear: Record<string, number>;
  notifications: {
    id: string;
    title: string;
    message: string;
    timestampIso: string;
    bookingId?: string;
    isDemoSample: true;
  }[];
}

export function createIsolatedGuestDemoState(): GuestDemoEnvironmentState {
  const now = Date.now();
  const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();

  const profiles: Record<string, ProviderProfile> = {
    [GUEST_DEMO_VIEWER_WALLET]: {
      walletAccountId: GUEST_DEMO_VIEWER_WALLET,
      displayName: 'Guest Demo Explorer (SAMPLE DATA)',
      bio: 'Illustrative guest visitor profile for exploring BorrowBond workflows without registration.',
      profileStatus: 'COMMUNITY_MEMBER',
      completedBorrows: 4,
      completedLends: 2,
      disputesCount: 0,
      cancellationsCount: 0,
      accountCreatedIso: iso(-86400_000 * 30),
      countryCode: 'ET',
      countryName: 'Ethiopia',
      regionName: 'Oromia',
      cityName: 'Jimma',
      locationVisibility: 'COUNTRY_REGION_CITY',
    },
    'demo-jimma-tech.demo.near': {
      walletAccountId: 'demo-jimma-tech.demo.near',
      displayName: 'Jimma Dev Hub (DEMO)',
      bio: 'Sample hardware lender in Jimma providing workstation laptops and projectors.',
      profileStatus: 'WALLET_CONNECTED',
      completedBorrows: 3,
      completedLends: 19,
      disputesCount: 0,
      cancellationsCount: 0,
      accountCreatedIso: iso(-86400_000 * 120),
      countryCode: 'ET',
      countryName: 'Ethiopia',
      regionName: 'Oromia',
      cityName: 'Jimma',
      locationVisibility: 'COUNTRY_REGION_CITY',
    },
    'demo-addis-optics.demo.near': {
      walletAccountId: 'demo-addis-optics.demo.near',
      displayName: 'Addis Cinema Lab (DEMO)',
      bio: 'Sample camera & production equipment provider in Addis Ababa.',
      profileStatus: 'WALLET_CONNECTED',
      completedBorrows: 5,
      completedLends: 28,
      disputesCount: 0,
      cancellationsCount: 0,
      accountCreatedIso: iso(-86400_000 * 180),
      countryCode: 'ET',
      countryName: 'Ethiopia',
      regionName: 'Addis Ababa',
      cityName: 'Addis Ababa',
      locationVisibility: 'COUNTRY_REGION_CITY',
    },
    'demo-hawassa-av.demo.near': {
      walletAccountId: 'demo-hawassa-av.demo.near',
      displayName: 'Hawassa Event AV (DEMO)',
      bio: 'Sample conference and laser projection provider in Hawassa.',
      profileStatus: 'WALLET_CONNECTED',
      completedBorrows: 2,
      completedLends: 14,
      disputesCount: 0,
      cancellationsCount: 0,
      accountCreatedIso: iso(-86400_000 * 90),
      countryCode: 'ET',
      countryName: 'Ethiopia',
      regionName: 'Sidama',
      cityName: 'Hawassa',
      locationVisibility: 'COUNTRY_REGION_CITY',
    },
    'demo-cloud-api.demo.near': {
      walletAccountId: 'demo-cloud-api.demo.near',
      displayName: 'CloudGrid Digital Node (DEMO)',
      bio: 'Sample global digital API and developer subscription provider.',
      profileStatus: 'WALLET_CONNECTED',
      completedBorrows: 1,
      completedLends: 42,
      disputesCount: 0,
      cancellationsCount: 0,
      accountCreatedIso: iso(-86400_000 * 210),
    },
  };

  const listings: MarketplaceListing[] = [
    {
      id: 'demo-lst-laptop-01',
      ownerWallet: 'demo-jimma-tech.demo.near',
      ownerDisplayName: 'Jimma Dev Hub (DEMO)',
      resourceType: 'PHYSICAL',
      title: '[DEMO] ThinkPad P16 Gen 2 Workstation Laptop (64GB RAM)',
      description:
        'SAMPLE DATA — High-performance developer workstation laptop configured for programming, Docker containers, and local AI compilation. Includes charger and protective sleeve.',
      category: 'Laptops & Workstations',
      brandAndModel: 'Lenovo ThinkPad P16 Gen 2',
      tinOrSerialNumber: 'DEMO-SN-TP16-0091',
      imageUrl: '/src/assets/images/listing_gpu_compute_1794103779733.jpg',
      images: [
        '/src/assets/images/listing_gpu_compute_1794103779733.jpg',
        '/src/assets/images/listing_cinema_projector_1794103775797.jpg',
      ],
      rentalFeeNear: 0.04,
      collateralNear: 0.18,
      officialRetailPriceUsd: 1650,
      durationUnit: 'DAYS',
      exampleDuration: 3,
      minDuration: 1,
      maxDuration: 14,
      availabilityStatus: 'AVAILABLE',
      conditions: 'Sample demonstration terms: return in clean working condition with charger.',
      cancellationPolicy: '100% refund before handover confirmation.',
      borrowerRequirements: 'Demo preview — no real account required.',
      isDemoSeed: true,
      createdAtIso: iso(-86400_000 * 10),
      countryCode: 'ET',
      countryName: 'Ethiopia',
      regionName: 'Oromia',
      cityName: 'Jimma',
      pickupArea: 'Jimma University Technology Campus Hub (DEMO)',
      pickupVisibility: 'PRIVATE',
      viewsCount: 340,
      bookingConversionRate: 96,
      ratingsCount: 18,
      averageRating: 4.9,
    },
    {
      id: 'demo-lst-camera-02',
      ownerWallet: 'demo-addis-optics.demo.near',
      ownerDisplayName: 'Addis Cinema Lab (DEMO)',
      resourceType: 'PHYSICAL',
      title: '[DEMO] Sony Alpha A1 Full-Frame Cinema Camera Kit',
      description:
        'SAMPLE DATA — Full-frame mirrorless camera kit with 24-70mm GM II lens, two batteries, and dual CFexpress Type A cards for documentary and studio shoots.',
      category: 'Cameras & Optics',
      brandAndModel: 'Sony Alpha A1 + 24-70mm GM II',
      tinOrSerialNumber: 'DEMO-SN-SONY-4410',
      imageUrl: '/src/assets/images/listing_sony_camera_1794103774108.jpg',
      images: [
        '/src/assets/images/listing_sony_camera_1794103774108.jpg',
        '/src/assets/images/listing_cinema_projector_1794103775797.jpg',
      ],
      rentalFeeNear: 0.05,
      collateralNear: 0.2,
      officialRetailPriceUsd: 3200,
      durationUnit: 'DAYS',
      exampleDuration: 2,
      minDuration: 1,
      maxDuration: 10,
      availabilityStatus: 'AVAILABLE',
      conditions: 'Inspect lens glass and sensor serial number at handover and return.',
      cancellationPolicy: '100% refund before handover confirmation.',
      borrowerRequirements: 'Demo preview — no real account required.',
      isDemoSeed: true,
      createdAtIso: iso(-86400_000 * 14),
      countryCode: 'ET',
      countryName: 'Ethiopia',
      regionName: 'Addis Ababa',
      cityName: 'Addis Ababa',
      pickupArea: 'Bole Medhanialem Creative Hub (DEMO)',
      pickupVisibility: 'PRIVATE',
      viewsCount: 415,
      bookingConversionRate: 97,
      ratingsCount: 24,
      averageRating: 5.0,
    },
    {
      id: 'demo-lst-projector-03',
      ownerWallet: 'demo-hawassa-av.demo.near',
      ownerDisplayName: 'Hawassa Event AV (DEMO)',
      resourceType: 'PHYSICAL',
      title: '[DEMO] 4K Laser Conference & Cinema Projector (3200 Lumens)',
      description:
        'SAMPLE DATA — Ultra-bright 4K UHD laser projector with HDMI 2.1, low-latency mode, and padded flight case for presentations and outdoor screenings.',
      category: 'AV & Projection',
      brandAndModel: 'Epson Pro Cinema LS12000',
      tinOrSerialNumber: 'DEMO-SN-PROJ-7721',
      imageUrl: '/src/assets/images/listing_cinema_projector_1794103775797.jpg',
      images: [
        '/src/assets/images/listing_cinema_projector_1794103775797.jpg',
        '/src/assets/images/listing_sony_camera_1794103774108.jpg',
      ],
      rentalFeeNear: 0.03,
      collateralNear: 0.14,
      officialRetailPriceUsd: 1400,
      durationUnit: 'DAYS',
      exampleDuration: 2,
      minDuration: 1,
      maxDuration: 7,
      availabilityStatus: 'AVAILABLE',
      conditions: 'Return in flight case with remote and HDMI cable.',
      cancellationPolicy: '100% refund before handover confirmation.',
      borrowerRequirements: 'Demo preview — no real account required.',
      isDemoSeed: true,
      createdAtIso: iso(-86400_000 * 8),
      countryCode: 'ET',
      countryName: 'Ethiopia',
      regionName: 'Sidama',
      cityName: 'Hawassa',
      pickupArea: 'Hawassa Lakeview Tech Center (DEMO)',
      pickupVisibility: 'PRIVATE',
      viewsCount: 210,
      bookingConversionRate: 94,
      ratingsCount: 11,
      averageRating: 4.8,
    },
    {
      id: 'demo-lst-api-04',
      ownerWallet: 'demo-cloud-api.demo.near',
      ownerDisplayName: 'CloudGrid Digital Node (DEMO)',
      resourceType: 'DIGITAL',
      title: '[DEMO] AtmoNode Weather & Satellite Telemetry API Access',
      description:
        'SAMPLE DATA — Time-bounded bearer credential granting 5,000 high-frequency REST queries for agricultural weather and satellite telemetry.',
      category: 'Data & APIs',
      brandAndModel: 'AtmoNode REST Gateway v3',
      tinOrSerialNumber: 'DEMO-API-ATMO-301',
      digitalAssetSubtype: 'API_COMPUTE',
      imageUrl: '/src/assets/images/listing_weather_api_1794103778935.jpg',
      images: [
        '/src/assets/images/listing_weather_api_1794103778935.jpg',
        '/src/assets/images/listing_gpu_compute_1794103779733.jpg',
      ],
      rentalFeeNear: 0.02,
      collateralNear: 0.05,
      durationUnit: 'DAYS',
      exampleDuration: 3,
      minDuration: 1,
      maxDuration: 30,
      availabilityStatus: 'AVAILABLE',
      conditions: 'Rate-limited to 5,000 requests; credential auto-revokes on expiration.',
      cancellationPolicy: 'Instant cancellation before credential activation.',
      borrowerRequirements: 'Global digital access (DEMO).',
      isDemoSeed: true,
      createdAtIso: iso(-86400_000 * 15),
      usageQuotaRequests: 5000,
      viewsCount: 520,
      bookingConversionRate: 98,
      ratingsCount: 31,
      averageRating: 5.0,
    },
    {
      id: 'demo-lst-software-05',
      ownerWallet: 'demo-cloud-api.demo.near',
      ownerDisplayName: 'CloudGrid Digital Node (DEMO)',
      resourceType: 'DIGITAL',
      title: '[DEMO] Cloud GPU & Software Dev Container Subscription Pass',
      description:
        'SAMPLE DATA — Temporary developer subscription pass for cloud GPU compilation, container builds, and automated test runners.',
      category: 'Software & Cloud Subscriptions',
      brandAndModel: 'CloudGrid DevPass Pro',
      tinOrSerialNumber: 'DEMO-SUB-GPU-902',
      digitalAssetSubtype: 'DIGITAL_ACCOUNT',
      imageUrl: '/src/assets/images/listing_gpu_compute_1794103779733.jpg',
      images: [
        '/src/assets/images/listing_gpu_compute_1794103779733.jpg',
        '/src/assets/images/listing_weather_api_1794103778935.jpg',
      ],
      rentalFeeNear: 0.05,
      collateralNear: 0.08,
      durationUnit: 'DAYS',
      exampleDuration: 5,
      minDuration: 1,
      maxDuration: 30,
      availabilityStatus: 'AVAILABLE',
      conditions: 'Scoped sandbox credentials; zero access to underlying host secrets.',
      cancellationPolicy: '100% refund before activation.',
      borrowerRequirements: 'Global digital access (DEMO).',
      isDemoSeed: true,
      createdAtIso: iso(-86400_000 * 6),
      usageQuotaRequests: 10000,
      viewsCount: 290,
      bookingConversionRate: 96,
      ratingsCount: 15,
      averageRating: 4.9,
    },
  ];

  const sampleFee = calculatePlatformFeeNear(0.18, DEFAULT_PLATFORM_FEE_BPS);
  const sampleBooking: OnChainBooking = {
    bookingId: 'demo-bk-sample-101',
    listingId: 'demo-lst-laptop-01',
    listingTitle: '[DEMO] ThinkPad P16 Gen 2 Workstation Laptop (64GB RAM)',
    resourceType: 'PHYSICAL',
    lender: 'demo-jimma-tech.demo.near',
    borrower: GUEST_DEMO_VIEWER_WALLET,
    rentalFeeNear: 0.04,
    collateralNear: 0.18,
    totalEscrowedNear: 0.22,
    originalTotalEscrowedNear: 0.22,
    feeBpsSnapshot: DEFAULT_PLATFORM_FEE_BPS,
    platformFeeNear: sampleFee.platformFeeNear,
    treasuryPayoutNear: 0,
    damageDeductionNear: 0,
    borrowerRefundNear: 0,
    lenderPayoutNear: 0,
    rentalFeeYocto: formatYoctoNear(0.04),
    collateralYocto: formatYoctoNear(0.18),
    totalEscrowedYocto: formatYoctoNear(0.22),
    platformFeeYocto: sampleFee.platformFeeYocto,
    durationCount: 3,
    durationUnit: 'DAYS',
    status: 'ACTIVE',
    disputeStatus: 'NONE',
    lenderHandoverConfirmed: true,
    borrowerHandoverConfirmed: true,
    lenderReturnConfirmed: false,
    borrowerReturnConfirmed: false,
    oneTimeHandoverCode: 'DEMO-HANDOVER-101',
    createdAtIso: iso(-3600_000 * 12),
    acceptanceDeadlineIso: iso(3600_000 * 12),
    handoverDeadlineIso: iso(3600_000 * 24),
    rentalStartIso: iso(-3600_000 * 10),
    rentalEndIso: iso(3600_000 * 62),
    returnRequestedAtIso: null,
    lenderResponseDeadlineIso: null,
    settled: false,
    nearNetwork: 'testnet',
    contractAddress: 'demo-simulation.near (SIMULATED)',
    txHash: 'SIMULATED-DEMO-TX-NO-BLOCKCHAIN-SUBMISSION-101',
    isSimulatedTx: true,
    verifiedOnChain: false,
    termsSha256Hash: 'demo_sha256_terms_preview_only_00000000000000000000000000000000',
    borrowerCountryCode: 'ET',
    lenderCountryCode: 'ET',
    listingCountryCode: 'ET',
    productIdentity: {
      brandAndModel: 'Lenovo ThinkPad P16 Gen 2',
      tinOrSerialNumber: 'DEMO-SN-TP16-0091',
      photosCount: 2,
      photosSha256Hash: 'demo_photos_hash_101',
      returnVerifiedSameItem: false,
    },
    evidence: [],
    timeline: [
      {
        id: 'demo-evt-1',
        timestampIso: iso(-3600_000 * 12),
        actor: GUEST_DEMO_VIEWER_WALLET,
        status: 'REQUESTED',
        title: '[SIMULATED] Demo Escrow Deposit Previewed (0.22 NEAR)',
        detail: DEMO_FINANCIAL_NOTICE,
      },
      {
        id: 'demo-evt-2',
        timestampIso: iso(-3600_000 * 11),
        actor: 'demo-jimma-tech.demo.near',
        status: 'ACCEPTED',
        title: '[SIMULATED] Demo Lender Accepted Agreement',
        detail: 'Simulated lender acceptance in Guest Demo Mode.',
      },
      {
        id: 'demo-evt-3',
        timestampIso: iso(-3600_000 * 10),
        actor: GUEST_DEMO_VIEWER_WALLET,
        status: 'ACTIVE',
        title: '[SIMULATED] Dual QR Handover Verified — Rental Active',
        detail: 'Try clicking "Simulate Return", "Simulate Dispute", or "Simulate Full Refund" to watch the escrow state machine.',
      },
    ],
  };

  return {
    mode: 'guest_demo',
    demoLabel: 'DEMO',
    financialDisclaimer: DEMO_FINANCIAL_NOTICE,
    viewerWallet: GUEST_DEMO_VIEWER_WALLET,
    profiles,
    listings,
    bookings: {
      [sampleBooking.bookingId]: sampleBooking,
    },
    policy: {
      walletAccountId: GUEST_DEMO_VIEWER_WALLET,
      maxRentalFeeNear: 5,
      maxCollateralNear: 15,
      maxTotalPaymentNear: 20,
      allowedCategories: [
        'Laptops & Workstations',
        'Cameras & Optics',
        'AV & Projection',
        'Data & APIs',
        'Software & Cloud Subscriptions',
      ],
      maxDurationDays: 30,
      approvedProviders: [],
      excludedProviders: [],
      requireManualWalletConfirmation: true,
    },
    claimableBalancesNear: {
      [GUEST_DEMO_VIEWER_WALLET]: 0,
      'demo-jimma-tech.demo.near': 0,
    },
    notifications: [
      {
        id: 'demo-notif-1',
        title: '[DEMO] Interactive Escrow Simulation Ready',
        message:
          'Explore sample listings, simulate a booking, and watch how collateral, 1% platform fees, and refunds settle in Guest Demo Mode.',
        timestampIso: iso(-1800_000),
        bookingId: sampleBooking.bookingId,
        isDemoSample: true,
      },
    ],
  };
}

/**
 * Simulates creating a booking inside the isolated Guest Demo state.
 * Never calls NEAR RPC, never signs a wallet transaction, and never touches production state.
 */
export function simulateGuestDemoBooking(
  demoState: GuestDemoEnvironmentState,
  params: {
    listingId: string;
    durationCount: number;
  }
): { updatedState: GuestDemoEnvironmentState; simulatedBooking: OnChainBooking } {
  const nextState: GuestDemoEnvironmentState = structuredClone(demoState);
  const listing =
    nextState.listings.find((l) => l.id === params.listingId) || nextState.listings[0];
  const duration = Math.max(1, Math.min(30, Math.round(params.durationCount || 1)));
  const rentalFeeNear = Number((listing.rentalFeeNear * duration).toFixed(6));
  const collateralNear = Number(listing.collateralNear.toFixed(6));
  const totalEscrowedNear = Number((rentalFeeNear + collateralNear).toFixed(6));
  const feeCalc = calculatePlatformFeeNear(collateralNear, DEFAULT_PLATFORM_FEE_BPS);
  const nowIso = new Date().toISOString();
  const bookingId = `demo-bk-sim-${Date.now().toString().slice(-5)}`;

  const simulatedBooking: OnChainBooking = {
    bookingId,
    listingId: listing.id,
    listingTitle: listing.title.startsWith('[DEMO]') ? listing.title : `[DEMO] ${listing.title}`,
    resourceType: listing.resourceType,
    lender: listing.ownerWallet,
    borrower: GUEST_DEMO_VIEWER_WALLET,
    rentalFeeNear,
    collateralNear,
    totalEscrowedNear,
    originalTotalEscrowedNear: totalEscrowedNear,
    feeBpsSnapshot: DEFAULT_PLATFORM_FEE_BPS,
    platformFeeNear: feeCalc.platformFeeNear,
    treasuryPayoutNear: 0,
    damageDeductionNear: 0,
    borrowerRefundNear: 0,
    lenderPayoutNear: 0,
    rentalFeeYocto: formatYoctoNear(rentalFeeNear),
    collateralYocto: formatYoctoNear(collateralNear),
    totalEscrowedYocto: formatYoctoNear(totalEscrowedNear),
    platformFeeYocto: feeCalc.platformFeeYocto,
    durationCount: duration,
    durationUnit: listing.durationUnit,
    status: 'REQUESTED',
    disputeStatus: 'NONE',
    lenderHandoverConfirmed: false,
    borrowerHandoverConfirmed: false,
    lenderReturnConfirmed: false,
    borrowerReturnConfirmed: false,
    oneTimeHandoverCode: `DEMO-QR-${bookingId.slice(-4).toUpperCase()}`,
    createdAtIso: nowIso,
    acceptanceDeadlineIso: new Date(Date.now() + 12 * 3600_000).toISOString(),
    handoverDeadlineIso: new Date(Date.now() + 24 * 3600_000).toISOString(),
    rentalStartIso: null,
    rentalEndIso: null,
    returnRequestedAtIso: null,
    lenderResponseDeadlineIso: null,
    settled: false,
    nearNetwork: 'testnet',
    contractAddress: 'demo-simulation.near (SIMULATED)',
    txHash: `SIMULATED-DEMO-TX-${bookingId.toUpperCase()}`,
    isSimulatedTx: true,
    verifiedOnChain: false,
    termsSha256Hash: `demo_terms_sha256_${bookingId}`,
    borrowerCountryCode: 'ET',
    lenderCountryCode: 'ET',
    listingCountryCode: listing.countryCode || 'ET',
    productIdentity: {
      brandAndModel: listing.brandAndModel || listing.title,
      tinOrSerialNumber: listing.tinOrSerialNumber || 'DEMO-SERIAL-001',
      photosCount: listing.images?.length || 2,
      photosSha256Hash: 'demo_photos_sha256',
      returnVerifiedSameItem: false,
    },
    evidence: [],
    timeline: [
      {
        id: `demo-evt-create-${Date.now()}`,
        timestampIso: nowIso,
        actor: GUEST_DEMO_VIEWER_WALLET,
        status: 'REQUESTED',
        title: `[SIMULATED TRANSACTION] Previewed ${totalEscrowedNear} NEAR Lock`,
        detail: `${DEMO_FINANCIAL_NOTICE} Rental: ${rentalFeeNear} NEAR + Collateral: ${collateralNear} NEAR (1% fee = ${feeCalc.platformFeeNear} NEAR on completion).`,
      },
    ],
  };

  nextState.bookings[bookingId] = simulatedBooking;
  nextState.notifications.unshift({
    id: `demo-notif-${Date.now()}`,
    title: `[SIMULATED] Demo Booking Created (${bookingId})`,
    message: `${DEMO_FINANCIAL_NOTICE} Step through Acceptance, Handover, Return, or Dispute in the interactive simulator.`,
    timestampIso: nowIso,
    bookingId,
    isDemoSample: true,
  });

  return { updatedState: nextState, simulatedBooking };
}

export type GuestDemoSimulationAction =
  | 'LENDER_ACCEPT'
  | 'CONFIRM_HANDOVER'
  | 'REQUEST_RETURN'
  | 'CONFIRM_SAFE_RETURN_SETTLE'
  | 'OPEN_SAMPLE_DISPUTE'
  | 'RESOLVE_DISPUTE_WITH_DAMAGE'
  | 'CANCEL_FULL_REFUND';

/**
 * Steps a simulated booking through the escrow lifecycle locally in Guest Demo Mode.
 */
export function advanceGuestDemoBookingSimulation(
  demoState: GuestDemoEnvironmentState,
  bookingId: string,
  action: GuestDemoSimulationAction,
  sampleDamageNear = 0.03
): { updatedState: GuestDemoEnvironmentState; booking: OnChainBooking } {
  const nextState: GuestDemoEnvironmentState = structuredClone(demoState);
  const booking = nextState.bookings[bookingId];
  if (!booking) {
    throw new Error('Demo booking not found');
  }
  const nowIso = new Date().toISOString();

  const recordStep = (status: EscrowBookingStatus, title: string, detail: string) => {
    booking.status = status;
    booking.timeline.push({
      id: `demo-step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestampIso: nowIso,
      actor: GUEST_DEMO_VIEWER_WALLET,
      status,
      title: `[SIMULATED] ${title}`,
      detail: `${detail} (${DEMO_FINANCIAL_NOTICE})`,
    });
  };

  switch (action) {
    case 'LENDER_ACCEPT': {
      booking.handoverDeadlineIso = new Date(Date.now() + 24 * 3600_000).toISOString();
      recordStep(
        'ACCEPTED',
        'Lender Accepted Demo Agreement',
        'Both parties can now verify the one-time handover QR code.'
      );
      break;
    }
    case 'CONFIRM_HANDOVER': {
      booking.lenderHandoverConfirmed = true;
      booking.borrowerHandoverConfirmed = true;
      booking.rentalStartIso = nowIso;
      booking.rentalEndIso = new Date(
        Date.now() + booking.durationCount * 24 * 3600_000
      ).toISOString();
      recordStep(
        'ACTIVE',
        'Dual Handover Confirmed — Rental Active',
        `Rental clock started until ${booking.rentalEndIso.slice(0, 10)}.`
      );
      break;
    }
    case 'REQUEST_RETURN': {
      booking.borrowerReturnConfirmed = true;
      booking.returnRequestedAtIso = nowIso;
      booking.lenderResponseDeadlineIso = new Date(Date.now() + 48 * 3600_000).toISOString();
      recordStep(
        'RETURN_REQUESTED',
        'Borrower Initiated Return (48h Lender Inspection Window Started)',
        'If the lender does not respond within 48 hours, uncontested return finalization unlocks automatically.'
      );
      break;
    }
    case 'CONFIRM_SAFE_RETURN_SETTLE': {
      const fee = booking.platformFeeNear;
      const borrowerRefund = Number((booking.collateralNear - fee).toFixed(6));
      const lenderPayout = booking.rentalFeeNear;
      booking.lenderReturnConfirmed = true;
      booking.borrowerReturnConfirmed = true;
      booking.settled = true;
      booking.treasuryPayoutNear = fee;
      booking.damageDeductionNear = 0;
      booking.borrowerRefundNear = borrowerRefund;
      booking.lenderPayoutNear = lenderPayout;
      booking.settlement = {
        settledAtIso: nowIso,
        lenderPayoutNear: lenderPayout,
        borrowerRefundNear: borrowerRefund,
        treasuryPayoutNear: fee,
        platformFeeNear: fee,
        damageDeductionNear: 0,
        resolutionNote: `[SIMULATED SETTLEMENT] Safe return verified. Lender receives ${lenderPayout} NEAR, Borrower receives ${borrowerRefund} NEAR collateral refund, Treasury receives ${fee} NEAR (1% fee).`,
      };
      nextState.claimableBalancesNear[booking.borrower] = Number(
        ((nextState.claimableBalancesNear[booking.borrower] || 0) + borrowerRefund).toFixed(6)
      );
      nextState.claimableBalancesNear[booking.lender] = Number(
        ((nextState.claimableBalancesNear[booking.lender] || 0) + lenderPayout).toFixed(6)
      );
      recordStep(
        'COMPLETED',
        'Safe Return Verified & Simulated Escrow Settled',
        `Borrower refund: ${borrowerRefund} NEAR | Lender payout: ${lenderPayout} NEAR | 1% Platform fee: ${fee} NEAR.`
      );
      break;
    }
    case 'OPEN_SAMPLE_DISPUTE': {
      booking.disputeStatus = 'OPEN';
      booking.disputeReason =
        'Sample Demo Dispute: Minor scratch reported on protective casing during return inspection.';
      recordStep(
        'DISPUTED',
        'Dispute Opened — Simulated Escrow Frozen',
        'All simulated funds are frozen while mutual damage settlement or arbitration is demonstrated.'
      );
      break;
    }
    case 'RESOLVE_DISPUTE_WITH_DAMAGE': {
      const fee = booking.platformFeeNear;
      const maxDeductible = Number(Math.max(0, booking.collateralNear - fee).toFixed(6));
      const clampedDamage = Number(Math.min(Math.max(0, sampleDamageNear), maxDeductible).toFixed(6));
      const borrowerRefund = Number((booking.collateralNear - fee - clampedDamage).toFixed(6));
      const lenderPayout = Number((booking.rentalFeeNear + clampedDamage).toFixed(6));
      booking.disputeStatus = 'RESOLVED';
      booking.settled = true;
      booking.treasuryPayoutNear = fee;
      booking.damageDeductionNear = clampedDamage;
      booking.borrowerRefundNear = borrowerRefund;
      booking.lenderPayoutNear = lenderPayout;
      booking.settlement = {
        settledAtIso: nowIso,
        lenderPayoutNear: lenderPayout,
        borrowerRefundNear: borrowerRefund,
        treasuryPayoutNear: fee,
        platformFeeNear: fee,
        damageDeductionNear: clampedDamage,
        resolutionNote: `[SIMULATED ARBITRATION] Verified damage deduction of ${clampedDamage} NEAR applied. Conservation check: ${borrowerRefund} + ${lenderPayout} + ${fee} == ${booking.totalEscrowedNear} NEAR.`,
      };
      recordStep(
        'RESOLVED',
        `Dispute Resolved with ${clampedDamage} NEAR Damage Deduction`,
        `Borrower refund: ${borrowerRefund} NEAR | Lender payout: ${lenderPayout} NEAR | 1% Platform fee: ${fee} NEAR.`
      );
      break;
    }
    case 'CANCEL_FULL_REFUND': {
      const fullRefund = booking.totalEscrowedNear;
      booking.settled = true;
      booking.platformFeeNear = 0;
      booking.treasuryPayoutNear = 0;
      booking.damageDeductionNear = 0;
      booking.borrowerRefundNear = fullRefund;
      booking.lenderPayoutNear = 0;
      booking.settlement = {
        settledAtIso: nowIso,
        lenderPayoutNear: 0,
        borrowerRefundNear: fullRefund,
        treasuryPayoutNear: 0,
        platformFeeNear: 0,
        damageDeductionNear: 0,
        resolutionNote: `[SIMULATED PRE-HANDOVER REFUND] 100% of ${fullRefund} NEAR refunded to borrower with 0 NEAR platform fee.`,
      };
      recordStep(
        'CANCELLED',
        `Cancelled Before Handover — 100% Refunded (${fullRefund} NEAR)`,
        'Zero platform fee is deducted when a booking is cancelled before handover activation.'
      );
      break;
    }
  }

  return { updatedState: nextState, booking };
}

/**
 * Evaluates whether an action is permitted in `guest_demo` mode vs requiring a real authenticated account (Section 17.3 & 17.12).
 */
export function evaluateGuestDemoActionGuard(
  mode: BorrowBondAccessMode,
  actionType:
    | 'VIEW_DEMO_PAGE'
    | 'SIMULATE_DEMO_BOOKING'
    | 'CREATE_REAL_LISTING'
    | 'SIGN_REAL_NEAR_TX'
    | 'CONNECT_REAL_WALLET'
    | 'WITHDRAW_REAL_ESCROW'
    | 'EDIT_REAL_PROFILE'
    | 'ACCESS_PRIVATE_CONTACTS'
    | 'SUBMIT_REAL_DISPUTE'
    | 'ADMIN_OPERATION'
): {
  allowed: boolean;
  requiresAccountPrompt: boolean;
  modalCopy?: typeof DEMO_RESTRICTED_MODAL_COPY;
} {
  if (mode === 'authenticated') {
    return { allowed: true, requiresAccountPrompt: false };
  }
  if (
    mode === 'guest_demo' &&
    (actionType === 'VIEW_DEMO_PAGE' || actionType === 'SIMULATE_DEMO_BOOKING')
  ) {
    return { allowed: true, requiresAccountPrompt: false };
  }
  return {
    allowed: false,
    requiresAccountPrompt: true,
    modalCopy: DEMO_RESTRICTED_MODAL_COPY,
  };
}
