// Clearly labeled demonstration seed data for BorrowBond (NEAR Hackathon 2026)
// Every listing, profile, and initial agreement is explicitly flagged as Demo Seed Data.

import type { MarketplaceListing, ProviderProfile, SpendingPolicy } from '../security/policyEngine';
import {
  createEscrowLedger,
  createBookingOnContract,
  acceptBookingOnContract,
  confirmHandoverOnContract,
  type EscrowLedgerState,
} from '../near/escrowStateMachine';
import {
  createDigitalGatewayStore,
  issueTemporaryCredential,
  type DigitalGatewayStore,
} from '../digital/accessGateway';

export const INITIAL_PROFILES: Record<string, ProviderProfile> = {
  'optics-lab.testnet': {
    walletAccountId: 'optics-lab.testnet',
    displayName: 'Zurich Optics & Cinema Gear (Demo Provider)',
    bio: 'Independent studio hardware collective sharing calibrated full-frame cameras, lenses, and projection systems on NEAR testnet.',
    profileStatus: 'COMMUNITY_MEMBER',
    completedBorrows: 4,
    completedLends: 19,
    disputesCount: 0,
    cancellationsCount: 1,
    accountCreatedIso: '2025-11-12T09:00:00.000Z',
  },
  'atmo-telemetry.testnet': {
    walletAccountId: 'atmo-telemetry.testnet',
    displayName: 'AtmoNode Telemetry API (Demo Provider)',
    bio: 'Controlled weather and atmospheric sensor API gateway issuing temporary quota-enforced credentials via NEAR escrow.',
    profileStatus: 'COMMUNITY_MEMBER',
    completedBorrows: 2,
    completedLends: 31,
    disputesCount: 0,
    cancellationsCount: 0,
    accountCreatedIso: '2025-09-04T14:20:00.000Z',
  },
  'tensor-rack.testnet': {
    walletAccountId: 'tensor-rack.testnet',
    displayName: 'Alpine Compute Nodes (Demo Provider)',
    bio: 'On-demand GPU inference and batch compute capacity with automated token revocation on rental expiry.',
    profileStatus: 'COMMUNITY_MEMBER',
    completedBorrows: 6,
    completedLends: 14,
    disputesCount: 0,
    cancellationsCount: 0,
    accountCreatedIso: '2026-01-18T11:30:00.000Z',
  },
  'aero-survey.testnet': {
    walletAccountId: 'aero-survey.testnet',
    displayName: 'Helvetia Drone & Robotics (Demo Provider)',
    bio: 'Industrial quadcopters and surveying equipment with documented pre/post flight logs.',
    profileStatus: 'WALLET_CONNECTED',
    completedBorrows: 1,
    completedLends: 7,
    disputesCount: 0,
    cancellationsCount: 0,
    accountCreatedIso: '2026-03-01T08:15:00.000Z',
  },
  'alex-builder.testnet': {
    walletAccountId: 'alex-builder.testnet',
    displayName: 'Alex Rivera (Demo Borrower & Lender)',
    bio: 'Full-stack builder & documentary filmmaker testing physical and digital resource agreements on NEAR testnet.',
    profileStatus: 'WALLET_CONNECTED',
    completedBorrows: 8,
    completedLends: 3,
    disputesCount: 0,
    cancellationsCount: 0,
    accountCreatedIso: '2026-01-10T10:00:00.000Z',
  },
  'borrowbondtest.testnet': {
    walletAccountId: 'borrowbondtest.testnet',
    displayName: 'BorrowBond Testnet Account (borrowbondtest.testnet)',
    bio: 'Primary NEAR Testnet account connected for BorrowBond escrow agreements, borrowing, and dispute resolution.',
    profileStatus: 'COMMUNITY_MEMBER',
    completedBorrows: 5,
    completedLends: 5,
    disputesCount: 0,
    cancellationsCount: 0,
    accountCreatedIso: '2026-11-07T00:00:00.000Z',
  },
};

export const INITIAL_LISTINGS: MarketplaceListing[] = [
  {
    id: 'lst-phys-camera-01',
    ownerWallet: 'optics-lab.testnet',
    ownerDisplayName: 'Zurich Optics & Cinema Gear (Demo Provider)',
    resourceType: 'PHYSICAL',
    title: 'Demo Mirrorless Camera — Sony Alpha Full-Frame Kit',
    description:
      'Full-frame 50MP mirrorless camera body paired with 24-70mm f/2.8 GM II lens, two NP-FZ100 batteries, dual charger, and padded weather-sealed hard case. Ideal for 3-day documentary shoots or product photography.',
    category: 'Cameras & Optics',
    imageUrl: '/src/assets/images/listing_sony_camera_1794103774108.jpg',
    rentalFeeNear: 0.05,
    collateralNear: 0.2,
    durationUnit: 'DAYS',
    exampleDuration: 3,
    minDuration: 1,
    maxDuration: 7,
    availabilityStatus: 'AVAILABLE',
    conditions:
      'Must be stored in the provided Pelican hard case during transit. No lens swaps in exposed rain or sand environments. Return with battery charge above 20%.',
    cancellationPolicy:
      '100% automatic refund of rental fee and collateral if cancelled while in REQUESTED state prior to lender acceptance.',
    borrowerRequirements:
      'Connected NEAR testnet wallet, pre-handover inspection photo confirmation, and both-party return condition sign-off.',
    isDemoSeed: true,
    createdAtIso: '2026-10-15T10:00:00.000Z',
    ownerEstimatedValueNear: 0.32,
    itemCondition: 'Excellent — Sensor clean, shutter count 4,120, zero optical scratches.',
    includedAccessories: [
      '24-70mm f/2.8 GM II Lens + Hood',
      '2x NP-FZ100 Rechargeable Batteries',
      'Dual USB-C PD Charger',
      '128GB CFexpress Type A Card',
      'Hard Weatherproof Carrying Case',
    ],
    pickupReturnInstructions:
      'In-person studio handover at Kreis 5 Demo Hub (or simulated hackathon demo handover) using the one-time booking verification code.',
    handoverProcedure:
      'Both parties inspect lens glass and sensor, upload timestamped before/after condition notes, and confirm handover on-chain.',
  },
  {
    id: 'lst-dig-weather-01',
    ownerWallet: 'atmo-telemetry.testnet',
    ownerDisplayName: 'AtmoNode Telemetry API (Demo Provider)',
    resourceType: 'DIGITAL',
    title: 'Demo Weather API — High-Precision Atmospheric Telemetry',
    description:
      'Controlled REST API gateway delivering live station meteorology, barometric pressure, wind vectors, and 24-hour atmospheric telemetry across global nodes. Automatically provisions a temporary bearer credential upon NEAR escrow activation.',
    category: 'Weather & Telemetry API',
    imageUrl: '/src/assets/images/listing_weather_api_1794103778935.jpg',
    rentalFeeNear: 0.03,
    collateralNear: 0.05,
    durationUnit: 'HOURS',
    exampleDuration: 48,
    minDuration: 24,
    maxDuration: 168,
    availabilityStatus: 'AVAILABLE',
    conditions:
      'Read-only telemetry queries via BorrowBond Controlled Demo Gateway (/api/demo-resource/weather). Credential automatically revokes when quota (20 requests) or rental window (48 hours) is reached.',
    cancellationPolicy:
      '100% refund if cancelled prior to provider acceptance. Collateral automatically refunded upon completion when no rate-limit abuse dispute is open.',
    borrowerRequirements:
      'Active NEAR testnet escrow booking. Token is displayed only to the authorized borrower wallet.',
    isDemoSeed: true,
    createdAtIso: '2026-10-18T12:00:00.000Z',
    digitalServiceType: 'REST JSON Telemetry Gateway',
    accessScope: 'read:weather_telemetry, read:station_forecast (Read-Only)',
    usageQuotaRequests: 20,
    expirationBehavior:
      'Hard server-side cutoff at 20 requests or 48 hours elapsed; HTTP 429/403 returned immediately thereafter.',
    technicalRequirements:
      'HTTPS GET/POST client passing Authorization: Bearer <bb_temp_token> to /api/demo-resource/weather.',
    demoEndpointRef: '/api/demo-resource/weather',
    licensingRestrictions:
      'Demonstration data for non-commercial prototyping and hackathon verification only. No redistribution of raw station feeds.',
  },
  {
    id: 'lst-phys-projector-02',
    ownerWallet: 'optics-lab.testnet',
    ownerDisplayName: 'Zurich Optics & Cinema Gear (Demo Provider)',
    resourceType: 'PHYSICAL',
    title: '4K Laser Cinema Projector — 3200 ANSI Lumens Portable',
    description:
      'Anodized aluminum 4K UHD laser projector with dual HDMI 2.1 ports, low-latency mode, and built-in keystone calibration for hackathon demos, screenings, and conference presentations.',
    category: 'Audio & Projection',
    imageUrl: '/src/assets/images/listing_cinema_projector_1794103775797.jpg',
    rentalFeeNear: 0.04,
    collateralNear: 0.16,
    durationUnit: 'DAYS',
    exampleDuration: 3,
    minDuration: 1,
    maxDuration: 5,
    availabilityStatus: 'AVAILABLE',
    conditions:
      'Keep intake vents unobstructed with at least 20cm clearance. Allow 2-minute fan cooldown before unplugging power.',
    cancellationPolicy:
      'Full refund prior to acceptance.',
    borrowerRequirements:
      'Both-party optical lens check at pickup and return.',
    isDemoSeed: true,
    createdAtIso: '2026-10-20T15:30:00.000Z',
    ownerEstimatedValueNear: 0.25,
    itemCondition: 'Mint — Laser phosphor hours: 140h, pristine optics.',
    includedAccessories: [
      'Braided HDMI 2.1 Ultra High Speed Cable (3m)',
      'AC Power Brick & EU/US Leads',
      'Backlit Bluetooth Remote',
      'Padded Flight Case',
    ],
    pickupReturnInstructions: 'Pickup at Zurich Optics Demo Desk with booking confirmation code.',
    handoverProcedure: 'Power-on test pattern verification at handover and return.',
  },
  {
    id: 'lst-dig-gpu-02',
    ownerWallet: 'tensor-rack.testnet',
    ownerDisplayName: 'Alpine Compute Nodes (Demo Provider)',
    resourceType: 'DIGITAL',
    title: 'Liquid-Cooled GPU Inference Sandbox — Batch API Slot',
    description:
      'Temporary high-throughput compute endpoint for batch embedding generation and model evaluation with guaranteed memory isolation and metered request quotas.',
    category: 'GPU & AI Compute',
    imageUrl: '/src/assets/images/listing_gpu_compute_1794103779733.jpg',
    rentalFeeNear: 0.06,
    collateralNear: 0.08,
    durationUnit: 'HOURS',
    exampleDuration: 48,
    minDuration: 12,
    maxDuration: 96,
    availabilityStatus: 'AVAILABLE',
    conditions:
      'Max 50 batch inference calls per rental period. No cryptocurrency mining or network scanning workloads permitted.',
    cancellationPolicy: 'Full refund if cancelled before provider activation.',
    borrowerRequirements: 'Within spending policy limits; manual wallet confirmation required.',
    isDemoSeed: true,
    createdAtIso: '2026-10-22T09:45:00.000Z',
    digitalServiceType: 'Compute Inference Endpoint',
    accessScope: 'compute:batch_inference (Scoped Sandbox)',
    usageQuotaRequests: 50,
    expirationBehavior: 'Token invalidated immediately upon quota exhaustion or timestamp expiry.',
    technicalRequirements: 'JSON POST requests authenticated via temporary BorrowBond token.',
    demoEndpointRef: '/api/demo-resource/weather',
    licensingRestrictions: 'Sandbox compute slot for authorized borrower account only.',
  },
  {
    id: 'lst-phys-drone-03',
    ownerWallet: 'aero-survey.testnet',
    ownerDisplayName: 'Helvetia Drone & Robotics (Demo Provider)',
    resourceType: 'PHYSICAL',
    title: 'Industrial Inspection Quadcopter — Gimbal Optical Kit',
    description:
      'Foldable carbon-fiber inspection drone with 3-axis stabilized optical camera, obstacle avoidance sensors, and 3智能 flight batteries for architectural and roof inspections.',
    category: 'Drones & Robotics',
    imageUrl: '/src/assets/images/listing_lidar_drone_1794103777366.jpg',
    rentalFeeNear: 0.08,
    collateralNear: 0.35,
    durationUnit: 'DAYS',
    exampleDuration: 2,
    minDuration: 1,
    maxDuration: 5,
    availabilityStatus: 'AVAILABLE',
    conditions:
      'Operate strictly within visual line-of-sight and below 120m AGL. Do not fly in wind speeds exceeding 32 km/h.',
    cancellationPolicy: 'Full refund before lender acceptance.',
    borrowerRequirements: 'Pre-flight propeller and gimbal inspection photos required.',
    isDemoSeed: true,
    createdAtIso: '2026-10-25T11:10:00.000Z',
    ownerEstimatedValueNear: 0.55,
    itemCondition: 'Very Good — Calibrated IMU and gimbal, 22 flight cycles.',
    includedAccessories: [
      'RC Pro Controller with High-Bright Display',
      '3x Intelligent Flight Batteries',
      'Charging Hub + Spare Carbon Propellers',
      'Hard Shell Case',
    ],
    pickupReturnInstructions: 'In-person handover with flight telemetry log check.',
    handoverProcedure: 'Both parties verify gimbal stabilization and rotor condition before and after.',
  },
];

export const DEFAULT_SPENDING_POLICY: SpendingPolicy = {
  walletAccountId: 'alex-builder.testnet',
  maxRentalFeeNear: 0.25,
  maxCollateralNear: 0.5,
  maxTotalPaymentNear: 0.6,
  allowedCategories: [
    'Cameras & Optics',
    'Audio & Projection',
    'Drones & Robotics',
    'Weather & Telemetry API',
    'GPU & AI Compute',
    'Licensed Datasets',
  ],
  maxDurationDays: 7,
  approvedProviders: ['optics-lab.testnet', 'atmo-telemetry.testnet', 'tensor-rack.testnet'],
  excludedProviders: [],
  requireManualWalletConfirmation: true,
};

export function bootstrapDemoEnvironment(): {
  profiles: Record<string, ProviderProfile>;
  listings: MarketplaceListing[];
  policy: SpendingPolicy;
  escrowLedger: EscrowLedgerState;
  digitalGateway: DigitalGatewayStore;
  demoRawTokenForWeatherBooking: string;
} {
  const profiles = structuredClone(INITIAL_PROFILES);
  const listings = structuredClone(INITIAL_LISTINGS);
  const policy = structuredClone(DEFAULT_SPENDING_POLICY);
  const escrowLedger = createEscrowLedger('borrowbond-escrow.testnet', 'resolver.borrowbond.testnet');
  const digitalGateway = createDigitalGatewayStore();

  const now = Date.now();
  const isoMinus2h = new Date(now - 2 * 3600 * 1000).toISOString();
  const isoMinus1h = new Date(now - 1 * 3600 * 1000).toISOString();
  const isoPlus46h = new Date(now + 46 * 3600 * 1000).toISOString();
  const isoPlus72h = new Date(now + 72 * 3600 * 1000).toISOString();

  // 1. Seed an ACTIVE Digital Booking for Demo Weather API so judge can immediately test the live API gateway
  createBookingOnContract(escrowLedger, {
    bookingId: 'bk-demo-weather-101',
    listingId: 'lst-dig-weather-01',
    listingTitle: 'Demo Weather API — High-Precision Atmospheric Telemetry',
    lender: 'atmo-telemetry.testnet',
    borrower: 'alex-builder.testnet',
    resourceType: 'DIGITAL',
    durationCount: 48,
    durationUnit: 'HOURS',
    rentalFeeNear: 0.03,
    collateralNear: 0.05,
    attachedPaymentNear: 0.08,
    nowIso: isoMinus2h,
    acceptanceDeadlineIso: isoPlus46h,
    rentalStartIso: isoMinus1h,
    rentalEndIso: isoPlus46h,
    txHash: null, // Demo seed record — clearly marked as simulated demo state, not a fabricated tx hash
    isSimulatedTx: true,
  });

  const activeDigitalBooking = acceptBookingOnContract(
    escrowLedger,
    'bk-demo-weather-101',
    'atmo-telemetry.testnet',
    isoMinus1h
  );

  const issued = issueTemporaryCredential(digitalGateway, {
    booking: activeDigitalBooking,
    callerWallet: 'alex-builder.testnet',
    quotaLimit: 20,
    durationHours: 48,
    endpointPath: '/api/demo-resource/weather',
    nowIso: isoMinus1h,
    DeterministicTokenOverride: 'bb_temp_demo101_a8f9c2e4b1d70395e6a1',
  });

  // 2. Seed an ACCEPTED / ACTIVE Physical Camera Booking ready for handover/return/dispute testing
  createBookingOnContract(escrowLedger, {
    bookingId: 'bk-demo-camera-102',
    listingId: 'lst-phys-camera-01',
    listingTitle: 'Demo Mirrorless Camera — Sony Alpha Full-Frame Kit',
    lender: 'optics-lab.testnet',
    borrower: 'alex-builder.testnet',
    resourceType: 'PHYSICAL',
    durationCount: 3,
    durationUnit: 'DAYS',
    rentalFeeNear: 0.05,
    collateralNear: 0.2,
    attachedPaymentNear: 0.25,
    nowIso: isoMinus2h,
    acceptanceDeadlineIso: isoPlus46h,
    rentalStartIso: isoMinus1h,
    rentalEndIso: isoPlus72h,
    txHash: null,
    isSimulatedTx: true,
  });

  acceptBookingOnContract(escrowLedger, 'bk-demo-camera-102', 'optics-lab.testnet', isoMinus1h);
  confirmHandoverOnContract(escrowLedger, 'bk-demo-camera-102', 'optics-lab.testnet', isoMinus1h);
  confirmHandoverOnContract(escrowLedger, 'bk-demo-camera-102', 'alex-builder.testnet', isoMinus1h);

  const camBooking = escrowLedger.bookings['bk-demo-camera-102'];
  camBooking.evidence.push({
    id: 'ev-seed-1',
    bookingId: 'bk-demo-camera-102',
    uploaderWallet: 'optics-lab.testnet',
    stage: 'HANDOVER_BEFORE',
    fileReference: 'handover_sony_alpha_sensor_clean.jpg',
    contentSha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    conditionNotes: 'Pre-handover inspection: Sensor clean, 24-70mm front element spotless, 2 batteries at 100%.',
    timestampIso: isoMinus1h,
  });

  return {
    profiles,
    listings,
    policy,
    escrowLedger,
    digitalGateway,
    demoRawTokenForWeatherBooking: issued.rawTokenOnce,
  };
}
