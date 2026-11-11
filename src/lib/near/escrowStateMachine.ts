/**
 * BorrowBond NEAR Testnet Escrow State Machine (V2 Security Hardened)
 *
 * Mirrors `contracts/borrowbond/src/lib.rs` with:
 * - Exact yoctoNEAR BigInt accounting & string representation (`rentalFeeYocto`, `collateralYocto`, `totalEscrowedYocto`, `platformFeeYocto`).
 * - Configurable platform fee (`feeBps`, hard-capped at `MAX_PLATFORM_FEE_BPS = 100` = 1.00%), snapshotted per booking (`feeBpsSnapshot`).
 * - Platform fee formula deducted strictly from collateral on active completions/resolutions (0 fee on pre-activation cancellations/expirations):
 *     platform_fee = collateral * fee_bps / 10_000
 *     Borrower refund = C - F - D
 *     Lender payout   = R + D
 *     Treasury payout = F
 *   Guaranteeing exact conservation of funds:
 *     (C - F - D) + (R + D) + F == R + C, where 0 <= D <= C - F.
 * - Handover deadline timeout (`expireHandoverOnContract`).
 * - 48-hour lender response window after `requestReturnOnContract` (`lenderResponseDeadlineIso`) +
 *   permissionless `finalizeUncontestedReturnOnContract` if lender does not respond or dispute within 48h.
 * - Mutual damage negotiation (`proposeDamageSettlementOnContract`, `acceptDamageProposalOnContract`, `rejectDamageProposalOnContract`)
 *   requiring counterparty approval, plus designated arbiter resolution (`resolveDisputeOnContract`, `resolveDisputeWithDamageDeductionOnContract`).
 * - Callback-safe `withdrawClaimableFromContract` / `withdrawClaimableOnContract` + `simulateWithdrawalCallbackOnContract` that restores
 *   `claimableBalancesNear` if the transfer promise fails on-chain.
 */

import type { TransactionReview } from '../security/policyEngine';
import type {
  StructuredPhysicalAddress as StructuredAddress,
  PickupAddressVisibility as PickupVisibilityMode,
} from '../location/countryLocationEngine';

export const MAX_PLATFORM_FEE_BPS = 100; // 1.00% hard cap
export const DEFAULT_PLATFORM_FEE_BPS = 100; // 1.00% default fee on active completion
export const BPS_DENOMINATOR = 10_000n;
export const YOCTO_PER_NEAR = 1_000_000_000_000_000_000_000_000n; // 10^24
export const LENDER_RETURN_RESPONSE_WINDOW_MS = 48 * 3600 * 1000; // 48 hours
export const DEFAULT_HANDOVER_GRACE_WINDOW_MS = 24 * 3600 * 1000; // 24 hours
export const LATE_DUE_DATE_APY_PERCENT = 3.0;

export type EscrowBookingStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'HANDOVER_PENDING'
  | 'ACTIVE'
  | 'RETURN_REQUESTED'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'RESOLVED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'EXPIRED';

export type BookingStatus = EscrowBookingStatus;

export interface EvidenceRecord {
  id: string;
  bookingId: string;
  uploaderWallet: string;
  stage: 'HANDOVER_BEFORE' | 'RETURN_AFTER' | 'DISPUTE_EVIDENCE';
  fileReference: string;
  photoDataUrl?: string;
  contentSha256Hash: string;
  conditionNotes: string;
  timestampIso: string;
}

export interface BookingTimelineEvent {
  id: string;
  timestampIso: string;
  actor: string;
  status: EscrowBookingStatus;
  title: string;
  detail: string;
}

export interface SettlementRecord {
  settledAtIso: string;
  lenderPayoutNear: number;
  borrowerRefundNear: number;
  treasuryPayoutNear?: number;
  platformFeeNear?: number;
  damageDeductionNear?: number;
  resolutionNote: string;
}

export interface DisputeRecord {
  bookingId: string;
  openedByWallet: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED';
  createdAtIso: string;
  resolvedByWallet?: string;
  damageDeductionNear?: number;
  lenderPayoutNear?: number;
  borrowerRefundNear?: number;
  treasuryPayoutNear?: number;
  outcomeNotes?: string;
  resolvedAtIso?: string;
}

export interface DamageSettlementProposalRecord {
  proposedByWallet: string;
  proposedDamageNear: number;
  proposedDamageYocto: string;
  reason: string;
  evidenceSha256Hash: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  proposedAtIso: string;
  respondedByWallet?: string;
  respondedAtIso?: string;
  rejectionReason?: string;
}

export interface ProductIdentityVerification {
  brandAndModel: string;
  tinOrSerialNumber: string;
  digitalAssetSubtype?: string;
  photosCount: number;
  photosSha256Hash: string;
  officialRetailPriceUsd?: number;
  returnVerifiedTinOrSerial?: string;
  returnVerifiedSameItem: boolean;
}

export interface LateDueDateInterestSummary {
  apyPercent: number;
  agreedEndIso: string | null;
  referenceTimeIso: string;
  isOverdue: boolean;
  overdueMs: number;
  overdueHours: number;
  overdueDays: number;
  remainingMs: number;
  remainingHours: number;
  remainingFormatted: string;
  overdueFormatted: string;
  interestPerSecondNear: number;
  maxLateFeeNear: number;
  accruedLateFeeNear: number;
  accruedLateFeeUsdt?: number;
  dailyLateRateNear: number;
  effectiveBorrowerCollateralRefundNear: number;
  effectiveLenderTotalPayoutNear: number;
  urgencyLevel: 'ON_TRACK' | 'DUE_SOON' | 'OVERDUE' | 'OVERDUE_APPLIED';
  noticeMessage: string;
}

export interface OnChainBooking {
  bookingId: string;
  listingId: string;
  listingTitle: string;
  resourceType: 'PHYSICAL' | 'DIGITAL';
  lender: string;
  borrower: string;
  rentalFeeNear: number;
  collateralNear: number;
  totalEscrowedNear: number;
  originalTotalEscrowedNear: number;
  feeBpsSnapshot: number;
  platformFeeNear: number;
  treasuryPayoutNear: number;
  damageDeductionNear: number;
  borrowerRefundNear: number;
  lenderPayoutNear: number;
  rentalFeeYocto: string;
  collateralYocto: string;
  totalEscrowedYocto: string;
  platformFeeYocto: string;
  durationCount: number;
  durationUnit: 'HOURS' | 'DAYS';
  status: EscrowBookingStatus;
  disputeStatus?: 'NONE' | 'OPEN' | 'RESOLVED';
  lenderHandoverConfirmed: boolean;
  borrowerHandoverConfirmed: boolean;
  lenderReturnConfirmed: boolean;
  borrowerReturnConfirmed: boolean;
  oneTimeHandoverCode: string;
  createdAtIso: string;
  acceptanceDeadlineIso: string;
  handoverDeadlineIso: string;
  rentalStartIso: string | null;
  rentalEndIso: string | null;
  returnRequestedAtIso?: string | null;
  lenderResponseDeadlineIso?: string | null;
  settled: boolean;
  nearNetwork: 'testnet';
  contractAddress: string;
  txHash: string | null;
  isSimulatedTx?: boolean;
  verifiedOnChain?: boolean;
  termsSha256Hash?: string;
  productIdentity?: ProductIdentityVerification;
  evidence: EvidenceRecord[];
  timeline: BookingTimelineEvent[];
  settlement: SettlementRecord | null;
  dispute: DisputeRecord | null;
  damageProposal?: DamageSettlementProposalRecord | null;
  review?: TransactionReview | null;
  digitalCredentialId: string | null;
  borrowerCountryCode?: string;
  lenderCountryCode?: string;
  listingCountryCode?: string;
  contactSharingConsent?: boolean;
  countryCode?: string;
  regionName?: string;
  cityName?: string;
  pickupArea?: string;
  pickupAddress?: string;
  structuredAddress?: StructuredAddress;
  pickupVisibility?: PickupVisibilityMode;
  pickupInstructions?: string;
  lenderContactSnapshot?: {
    displayName: string;
    phone?: string;
    telegram?: string;
    whatsapp?: string;
    preferredMethod?: 'IN_APP' | 'PHONE' | 'TELEGRAM' | 'WHATSAPP';
    contactVisibility?: 'HIDDEN_UNTIL_ACCEPTED' | 'VISIBLE_WHEN_ACCEPTED' | 'ALWAYS_PUBLIC';
  };
  borrowerContactSnapshot?: {
    displayName: string;
    phone?: string;
    telegram?: string;
    whatsapp?: string;
    preferredMethod?: 'IN_APP' | 'PHONE' | 'TELEGRAM' | 'WHATSAPP';
    contactVisibility?: 'HIDDEN_UNTIL_ACCEPTED' | 'VISIBLE_WHEN_ACCEPTED' | 'ALWAYS_PUBLIC';
  };
}

export interface PendingWithdrawalRecord {
  withdrawalId: string;
  recipientWallet: string;
  amountNear: number;
  amountYocto: string;
  status: 'PENDING_CALLBACK' | 'COMPLETED' | 'RESTORED_ON_FAILURE';
  createdAtIso: string;
}

export interface EscrowContractLedger {
  contractAddress: string;
  nearNetwork: 'testnet';
  owner: string;
  designatedResolver: string;
  feeTreasury: string;
  feeBps: number;
  paused: boolean;
  bookings: Record<string, OnChainBooking>;
  claimableBalancesNear: Record<string, number>;
  pendingWithdrawals?: Record<string, PendingWithdrawalRecord>;
  processedTxHashes?: Record<string, boolean>;
}

export type EscrowLedgerState = EscrowContractLedger;

export function createEscrowLedger(
  contractAddress = 'borrowbondtest.testnet',
  designatedResolver = 'resolver.borrowbond.testnet',
  options?: { feeBps?: number; feeTreasury?: string; owner?: string }
): EscrowContractLedger {
  const feeBps = options?.feeBps ?? 0;
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > MAX_PLATFORM_FEE_BPS) {
    throw new Error('Platform fee basis points must be an integer between 0 and 100 (max 1.00%)');
  }
  return {
    contractAddress,
    nearNetwork: 'testnet',
    owner: options?.owner || contractAddress,
    designatedResolver,
    feeTreasury: options?.feeTreasury || 'treasury.borrowbond.testnet',
    feeBps,
    paused: false,
    bookings: {},
    claimableBalancesNear: {},
    pendingWithdrawals: {},
    processedTxHashes: {},
  };
}

export function nearToYoctoBigInt(amountNear: number): bigint {
  if (!Number.isFinite(amountNear) || amountNear < 0) {
    throw new Error('NEAR amount must be a non-negative finite number');
  }
  const microNear = BigInt(Math.round(amountNear * 1_000_000));
  return microNear * 1_000_000_000_000_000_000n;
}

export function yoctoBigIntToNear(yocto: bigint): number {
  const microNear = yocto / 1_000_000_000_000_000_000n;
  return Number(microNear) / 1_000_000;
}

export function formatYoctoNear(amountNear: number): string {
  return nearToYoctoBigInt(amountNear).toString();
}

export function computePlatformFeeNear(collateralNear: number, feeBps = 100): {
  platformFeeNear: number;
  platformFeeYocto: string;
  maxDamageDeductibleNear: number;
} {
  const clampedBps = Math.min(MAX_PLATFORM_FEE_BPS, Math.max(0, Math.trunc(feeBps)));
  const colYocto = nearToYoctoBigInt(collateralNear);
  const feeYocto = (colYocto * BigInt(clampedBps)) / BPS_DENOMINATOR;
  const maxDamageYocto = colYocto - feeYocto;
  return {
    platformFeeNear: Number(yoctoBigIntToNear(feeYocto).toFixed(6)),
    platformFeeYocto: feeYocto.toString(),
    maxDamageDeductibleNear: Number(yoctoBigIntToNear(maxDamageYocto).toFixed(6)),
  };
}

/**
 * Verifies the exact settlement conservation invariant for any settled active booking:
 *   Borrower refund (C - F - D) + Lender payout (R + D) + Treasury payout (F) == R + C
 */
export function verifyEscrowAccountingInvariant(booking: OnChainBooking): {
  valid: boolean;
  expectedTotalNear: number;
  actualDistributedNear: number;
  error?: string;
} {
  const expectedTotalNear = Number((booking.rentalFeeNear + booking.collateralNear).toFixed(6));
  if (!booking.settled) {
    return {
      valid: Math.abs(expectedTotalNear - booking.totalEscrowedNear) <= 0.0001,
      expectedTotalNear,
      actualDistributedNear: 0,
    };
  }
  const actualDistributedNear = Number(
    (
      (booking.borrowerRefundNear || 0) +
      (booking.lenderPayoutNear || 0) +
      (booking.treasuryPayoutNear || 0)
    ).toFixed(6)
  );
  const diff = Math.abs(expectedTotalNear - actualDistributedNear);
  if (diff > 0.0001) {
    return {
      valid: false,
      expectedTotalNear,
      actualDistributedNear,
      error: `Accounting invariant violation: distributed ${actualDistributedNear} NEAR != escrowed ${expectedTotalNear} NEAR`,
    };
  }
  return {
    valid: true,
    expectedTotalNear,
    actualDistributedNear,
  };
}

export type LateDueDateInterestCalculation = LateDueDateInterestSummary;

export function calculateLateDueDateInterest(
  booking: {
    status?: EscrowBookingStatus;
    rentalEndIso: string | null;
    rentalFeeNear?: number;
    collateralNear: number;
    totalEscrowedNear?: number;
    lender?: string;
    borrower?: string;
  },
  referenceTimeIso: string = new Date().toISOString(),
  nearUsdRate = 3.7
): LateDueDateInterestSummary {
  const apyPercent = LATE_DUE_DATE_APY_PERCENT;
  const agreedEndIso = booking.rentalEndIso;
  const rentalFeeNear = booking.rentalFeeNear ?? 0;
  const collateralNear = booking.collateralNear;
  const dailyLateRateNear = Number(((collateralNear * (apyPercent / 100)) / 365).toFixed(6));
  const interestPerSecondNear = Number((dailyLateRateNear / 86400).toFixed(10));
  const maxLateFeeNear = collateralNear;

  const formatDurationMs = (ms: number): string => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  if (!agreedEndIso) {
    return {
      apyPercent,
      agreedEndIso: null,
      referenceTimeIso,
      isOverdue: false,
      overdueMs: 0,
      overdueHours: 0,
      overdueDays: 0,
      remainingMs: 0,
      remainingHours: 0,
      remainingFormatted: 'Pending Handover',
      overdueFormatted: '0m 0s',
      interestPerSecondNear,
      maxLateFeeNear,
      accruedLateFeeNear: 0,
      accruedLateFeeUsdt: 0,
      dailyLateRateNear,
      effectiveBorrowerCollateralRefundNear: collateralNear,
      effectiveLenderTotalPayoutNear: rentalFeeNear,
      urgencyLevel: 'ON_TRACK',
      noticeMessage: `3.00% APY late-return interest activates only after handover starts the rental clock.`,
    };
  }

  const endMs = new Date(agreedEndIso).getTime();
  const nowMs = new Date(referenceTimeIso).getTime();
  const deltaMs = nowMs - endMs;

  const isFinishedState =
    booking.status === 'COMPLETED' ||
    booking.status === 'RESOLVED' ||
    booking.status === 'CANCELLED' ||
    booking.status === 'REFUNDED' ||
    booking.status === 'EXPIRED';

  if (deltaMs <= 0 || isFinishedState) {
    const remainingMs = Math.max(0, endMs - nowMs);
    const remainingHours = Number((remainingMs / (1000 * 3600)).toFixed(2));
    const urgencyLevel =
      !isFinishedState && remainingHours <= 24 && remainingHours > 0 ? 'DUE_SOON' : 'ON_TRACK';

    return {
      apyPercent,
      agreedEndIso,
      referenceTimeIso,
      isOverdue: false,
      overdueMs: 0,
      overdueHours: 0,
      overdueDays: 0,
      remainingMs,
      remainingHours,
      remainingFormatted: formatDurationMs(remainingMs),
      overdueFormatted: '0m 0s',
      interestPerSecondNear,
      maxLateFeeNear,
      accruedLateFeeNear: 0,
      accruedLateFeeUsdt: 0,
      dailyLateRateNear,
      effectiveBorrowerCollateralRefundNear: collateralNear,
      effectiveLenderTotalPayoutNear: rentalFeeNear,
      urgencyLevel,
      noticeMessage: isFinishedState
        ? 'Agreement settled — 0 NEAR late interest charged.'
        : urgencyLevel === 'DUE_SOON'
        ? `Return due in ${remainingHours}h. Return on time to avoid the ${apyPercent.toFixed(2)}% APY late interest.`
        : `On schedule (${remainingHours}h remaining). ${apyPercent.toFixed(2)}% APY late interest applies only if overdue.`,
    };
  }

  const overdueMs = deltaMs;
  const overdueHours = Number((overdueMs / (1000 * 3600)).toFixed(2));
  const overdueDays = overdueMs / (1000 * 3600 * 24);
  const rawLateFee = (collateralNear * (apyPercent / 100) * overdueDays) / 365;
  const accruedLateFeeNear = Number(Math.min(collateralNear, rawLateFee).toFixed(6));
  const accruedLateFeeUsdt = Number((accruedLateFeeNear * nearUsdRate).toFixed(4));

  const effectiveBorrowerCollateralRefundNear = Number(
    Math.max(0, collateralNear - accruedLateFeeNear).toFixed(6)
  );
  const effectiveLenderTotalPayoutNear = Number(
    (rentalFeeNear + accruedLateFeeNear).toFixed(6)
  );

  return {
    apyPercent,
    agreedEndIso,
    referenceTimeIso,
    isOverdue: true,
    overdueMs,
    overdueHours,
    overdueDays: Number(overdueDays.toFixed(2)),
    remainingMs: 0,
    remainingHours: 0,
    remainingFormatted: '0m 0s',
    overdueFormatted: formatDurationMs(overdueMs),
    interestPerSecondNear,
    maxLateFeeNear,
    accruedLateFeeNear,
    accruedLateFeeUsdt,
    dailyLateRateNear,
    effectiveBorrowerCollateralRefundNear,
    effectiveLenderTotalPayoutNear,
    urgencyLevel: 'OVERDUE',
    noticeMessage: `Past due by ${overdueHours}h (${overdueDays.toFixed(2)}d). ${apyPercent.toFixed(2)}% APY late interest continues accruing (${accruedLateFeeNear} NEAR deducted from collateral for lender).`,
  };
}

function generateDeterministicHandoverCode(bookingId: string): string {
  const suffix = bookingId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-4);
  return `BB-HANDOVER-${suffix.padStart(4, '9')}`;
}

function generateSyntheticTxHash(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const clean = Math.abs(h).toString(36).toUpperCase().padStart(8, 'X');
  return `SIM_TX_${clean}_${seed.replace(/[^a-zA-Z0-9]/g, '').slice(0, 14)}`;
}

function ensureLedgerDefaults(ledger: EscrowContractLedger): void {
  if (typeof ledger.feeBps !== 'number') ledger.feeBps = 0;
  if (!ledger.feeTreasury) ledger.feeTreasury = ledger.owner || 'treasury.borrowbond.testnet';
  if (!ledger.pendingWithdrawals) ledger.pendingWithdrawals = {};
  if (!ledger.processedTxHashes) ledger.processedTxHashes = {};
}

function creditClaimable(ledger: EscrowContractLedger, wallet: string, amountNear: number): void {
  if (amountNear <= 0) return;
  const current = ledger.claimableBalancesNear[wallet] || 0;
  ledger.claimableBalancesNear[wallet] = Number((current + amountNear).toFixed(6));
}

function executeActiveSettlementOnBooking(
  ledger: EscrowContractLedger,
  booking: OnChainBooking,
  damageDeductionNear: number,
  targetStatus: 'COMPLETED' | 'RESOLVED',
  resolutionNote: string,
  settledAtIso: string = new Date().toISOString()
): void {
  ensureLedgerDefaults(ledger);
  if (booking.settled) {
    throw new Error('Duplicate completion rejected: Booking escrow has already been settled');
  }

  const feeBps = Math.min(MAX_PLATFORM_FEE_BPS, Math.max(0, booking.feeBpsSnapshot ?? ledger.feeBps));
  const { platformFeeNear, platformFeeYocto, maxDamageDeductibleNear } = computePlatformFeeNear(
    booking.collateralNear,
    feeBps
  );

  const roundedDamage = Number(damageDeductionNear.toFixed(6));
  if (!Number.isFinite(roundedDamage) || roundedDamage < 0) {
    throw new Error('Damage deduction cannot be negative');
  }
  if (roundedDamage > maxDamageDeductibleNear + 0.00001) {
    throw new Error(
      `Damage deduction (${roundedDamage} NEAR) cannot exceed remaining collateral after ${
        feeBps / 100
      }% platform fee (${maxDamageDeductibleNear} NEAR)`
    );
  }

  const clampedDamage = Math.min(maxDamageDeductibleNear, roundedDamage);
  const borrowerRefundNear = Number((maxDamageDeductibleNear - clampedDamage).toFixed(6));
  const lenderPayoutNear = Number((booking.rentalFeeNear + clampedDamage).toFixed(6));
  const treasuryPayoutNear = platformFeeNear;

  const totalDistributed = Number(
    (borrowerRefundNear + lenderPayoutNear + treasuryPayoutNear).toFixed(6)
  );
  const totalEscrowed = Number((booking.rentalFeeNear + booking.collateralNear).toFixed(6));
  if (Math.abs(totalDistributed - totalEscrowed) > 0.0001) {
    throw new Error(
      `Settlement invariant failed: distributed ${totalDistributed} NEAR != escrowed ${totalEscrowed} NEAR`
    );
  }

  booking.settled = true;
  booking.status = targetStatus;
  booking.totalEscrowedNear = 0;
  booking.platformFeeNear = platformFeeNear;
  booking.platformFeeYocto = platformFeeYocto;
  booking.treasuryPayoutNear = treasuryPayoutNear;
  booking.damageDeductionNear = clampedDamage;
  booking.borrowerRefundNear = borrowerRefundNear;
  booking.lenderPayoutNear = lenderPayoutNear;
  booking.settlement = {
    settledAtIso,
    lenderPayoutNear,
    borrowerRefundNear,
    treasuryPayoutNear,
    platformFeeNear,
    damageDeductionNear: clampedDamage,
    resolutionNote,
  };

  creditClaimable(ledger, booking.lender, lenderPayoutNear);
  creditClaimable(ledger, booking.borrower, borrowerRefundNear);
  creditClaimable(ledger, ledger.feeTreasury, treasuryPayoutNear);
}

// ============================================================================
// ADMINISTRATIVE & FEE GOVERNANCE CONTROLS
// ============================================================================

export function setContractPausedState(
  ledger: EscrowContractLedger,
  callerWallet: string,
  paused: boolean
): EscrowContractLedger {
  if (callerWallet !== ledger.owner) {
    throw new Error('Only the contract owner can pause or unpause the contract');
  }
  ledger.paused = paused;
  return ledger;
}

export function setPlatformFeeConfigOnContract(
  ledger: EscrowContractLedger,
  callerWallet: string,
  feeBps: number,
  feeTreasury: string
): EscrowContractLedger {
  ensureLedgerDefaults(ledger);
  if (callerWallet !== ledger.owner) {
    throw new Error('Only the contract owner can update platform fee configuration');
  }
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > MAX_PLATFORM_FEE_BPS) {
    throw new Error('Platform fee basis points must be an integer between 0 and 100 (max 1.00%)');
  }
  if (!feeTreasury.trim()) {
    throw new Error('Fee treasury account ID cannot be empty');
  }
  ledger.feeBps = feeBps;
  ledger.feeTreasury = feeTreasury.trim();
  return ledger;
}

export const createInitialEscrowLedger = createEscrowLedger;

// ============================================================================
// 1. CREATE BOOKING & LOCK ESCROW
// ============================================================================

export function createBookingOnContract(
  ledger: EscrowContractLedger,
  params: {
    bookingId: string;
    listingId: string;
    listingTitle: string;
    resourceType: 'PHYSICAL' | 'DIGITAL';
    lender: string;
    borrower: string;
    rentalFeeNear: number;
    collateralNear: number;
    attachedPaymentNear?: number;
    attachedDepositNear?: number;
    durationCount?: number;
    durationHours?: number;
    durationUnit?: 'HOURS' | 'DAYS';
    explicitUserApproval?: boolean;
    nowIso?: string;
    acceptanceWindowHours?: number;
    acceptanceDeadlineIso?: string;
    rentalStartIso?: string | null;
    rentalEndIso?: string | null;
    productIdentity?: ProductIdentityVerification;
    brandAndModel?: string;
    tinOrSerialNumber?: string;
    photosCount?: number;
    photosSha256Hash?: string;
    officialRetailPriceUsd?: number;
    txHash?: string | null;
    isSimulatedTx?: boolean;
    verifiedOnChain?: boolean;
    termsSha256Hash?: string;
    borrowerCountryCode?: string;
    lenderCountryCode?: string;
    listingCountryCode?: string;
    contactSharingConsent?: boolean;
    countryCode?: string;
    regionName?: string;
    cityName?: string;
    pickupArea?: string;
    pickupAddress?: string;
    structuredAddress?: StructuredAddress;
    pickupVisibility?: PickupVisibilityMode;
    pickupInstructions?: string;
    lenderContactSnapshot?: OnChainBooking['lenderContactSnapshot'];
    borrowerContactSnapshot?: OnChainBooking['borrowerContactSnapshot'];
  }
): OnChainBooking {
  ensureLedgerDefaults(ledger);
  if (ledger.paused) {
    throw new Error('Contract is currently paused by owner for new bookings');
  }
  if (!params.lender || !params.borrower) {
    throw new Error('Both lender and borrower wallet addresses are required');
  }
  if (params.lender.trim().toLowerCase() === params.borrower.trim().toLowerCase()) {
    throw new Error('Lender and borrower cannot be the same account');
  }
  if (ledger.bookings[params.bookingId]) {
    throw new Error(`Booking ID ${params.bookingId} already exists`);
  }
  if (params.txHash && ledger.processedTxHashes?.[params.txHash]) {
    throw new Error(`Duplicate transaction hash rejected: ${params.txHash} was already processed`);
  }
  if (params.rentalFeeNear <= 0) {
    throw new Error('Rental fee must be greater than 0 NEAR');
  }
  if (params.collateralNear < 0) {
    throw new Error('Collateral cannot be negative');
  }
  if (params.resourceType === 'PHYSICAL' && params.collateralNear <= 0) {
    throw new Error('Physical item bookings require positive refundable collateral');
  }
  if (params.resourceType === 'PHYSICAL') {
    const bCountry = params.borrowerCountryCode?.trim().toUpperCase();
    const lCountry = params.lenderCountryCode?.trim().toUpperCase();
    const listCountry = (params.listingCountryCode || params.countryCode)?.trim().toUpperCase();
    if (
      (bCountry && lCountry && bCountry !== lCountry) ||
      (bCountry && listCountry && bCountry !== listCountry) ||
      (lCountry && listCountry && lCountry !== listCountry)
    ) {
      throw new Error(
        `Not available in your country: Physical borrowing requires matching borrower (${bCountry}), lender (${lCountry}), and listing (${listCountry}) country.`
      );
    }
  }

  const requiredDeposit = Number((params.rentalFeeNear + params.collateralNear).toFixed(6));
  const rawAttached = params.attachedPaymentNear ?? params.attachedDepositNear ?? requiredDeposit;
  const attachedDeposit = Number(rawAttached.toFixed(6));
  if (Math.abs(attachedDeposit - requiredDeposit) > 0.0001) {
    throw new Error(
      `Attached payment (${attachedDeposit} NEAR) must equal exact rental fee + collateral (${requiredDeposit} NEAR)`
    );
  }

  const now = params.nowIso ? new Date(params.nowIso) : new Date();
  const acceptanceHours = params.acceptanceWindowHours ?? 24;
  const acceptanceDeadlineIso =
    params.acceptanceDeadlineIso ||
    new Date(now.getTime() + acceptanceHours * 3600 * 1000).toISOString();
  const handoverDeadlineIso = new Date(
    new Date(acceptanceDeadlineIso).getTime() + DEFAULT_HANDOVER_GRACE_WINDOW_MS
  ).toISOString();

  const feeBpsSnapshot = Math.min(MAX_PLATFORM_FEE_BPS, Math.max(0, ledger.feeBps));
  const { platformFeeNear, platformFeeYocto } = computePlatformFeeNear(
    params.collateralNear,
    feeBpsSnapshot
  );

  const txHash =
    params.txHash !== undefined
      ? params.txHash
      : generateSyntheticTxHash(`${params.bookingId}_${now.toISOString()}`);
  if (txHash && ledger.processedTxHashes) {
    ledger.processedTxHashes[txHash] = true;
  }

  const productIdentity: ProductIdentityVerification = params.productIdentity || {
    brandAndModel: params.brandAndModel || params.listingTitle,
    tinOrSerialNumber: params.tinOrSerialNumber || `TIN-${params.listingId.toUpperCase()}`,
    photosCount: params.photosCount ?? 3,
    photosSha256Hash:
      params.photosSha256Hash ||
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    officialRetailPriceUsd: params.officialRetailPriceUsd,
    returnVerifiedSameItem: false,
  };

  const booking: OnChainBooking = {
    bookingId: params.bookingId,
    listingId: params.listingId,
    listingTitle: params.listingTitle,
    resourceType: params.resourceType,
    lender: params.lender,
    borrower: params.borrower,
    rentalFeeNear: Number(params.rentalFeeNear.toFixed(6)),
    collateralNear: Number(params.collateralNear.toFixed(6)),
    totalEscrowedNear: requiredDeposit,
    originalTotalEscrowedNear: requiredDeposit,
    feeBpsSnapshot,
    platformFeeNear,
    treasuryPayoutNear: 0,
    damageDeductionNear: 0,
    borrowerRefundNear: 0,
    lenderPayoutNear: 0,
    rentalFeeYocto: formatYoctoNear(params.rentalFeeNear),
    collateralYocto: formatYoctoNear(params.collateralNear),
    totalEscrowedYocto: formatYoctoNear(requiredDeposit),
    platformFeeYocto,
    durationCount: params.durationCount ?? 1,
    durationUnit: params.durationUnit ?? 'DAYS',
    status: 'REQUESTED',
    disputeStatus: 'NONE',
    lenderHandoverConfirmed: false,
    borrowerHandoverConfirmed: false,
    lenderReturnConfirmed: false,
    borrowerReturnConfirmed: false,
    oneTimeHandoverCode: generateDeterministicHandoverCode(params.bookingId),
    createdAtIso: now.toISOString(),
    acceptanceDeadlineIso,
    handoverDeadlineIso,
    rentalStartIso: params.rentalStartIso ?? null,
    rentalEndIso: params.rentalEndIso ?? null,
    returnRequestedAtIso: null,
    lenderResponseDeadlineIso: null,
    settled: false,
    nearNetwork: 'testnet',
    contractAddress: ledger.contractAddress,
    txHash,
    isSimulatedTx: params.isSimulatedTx ?? !params.txHash,
    verifiedOnChain: Boolean(params.verifiedOnChain),
    termsSha256Hash: params.termsSha256Hash,
    productIdentity,
    evidence: [],
    timeline: [
      {
        id: `evt-create-${params.bookingId}`,
        timestampIso: now.toISOString(),
        actor: params.borrower,
        status: 'REQUESTED',
        title: 'Booking Requested & Escrow Locked',
        detail: `Locked ${params.rentalFeeNear} NEAR rental fee + ${params.collateralNear} NEAR refundable collateral (${requiredDeposit} NEAR total) in ${ledger.contractAddress}.`,
      },
    ],
    settlement: null,
    dispute: null,
    damageProposal: null,
    review: null,
    digitalCredentialId: null,
    borrowerCountryCode: params.borrowerCountryCode,
    lenderCountryCode: params.lenderCountryCode,
    listingCountryCode: params.listingCountryCode,
    contactSharingConsent: params.contactSharingConsent,
    countryCode: params.countryCode || params.listingCountryCode,
    regionName: params.regionName,
    cityName: params.cityName,
    pickupArea: params.pickupArea,
    pickupAddress: params.pickupAddress,
    structuredAddress: params.structuredAddress,
    pickupVisibility: params.pickupVisibility,
    pickupInstructions: params.pickupInstructions,
    lenderContactSnapshot: params.lenderContactSnapshot,
    borrowerContactSnapshot: params.borrowerContactSnapshot,
  };

  ledger.bookings[params.bookingId] = booking;
  return booking;
}

// ============================================================================
// 2. ACCEPTANCE, CANCELLATION & EXPIRATION (0 PLATFORM FEE BEFORE ACTIVE)
// ============================================================================

export function acceptBookingOnContract(
  ledger: EscrowContractLedger,
  bookingId: string,
  callerWallet: string,
  nowIso?: string
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (callerWallet !== booking.lender) {
    throw new Error('Unauthorized: Only the lender can accept a booking');
  }
  if (booking.status !== 'REQUESTED') {
    throw new Error(`Invalid transition: Cannot accept booking in state ${booking.status}`);
  }

  const now = nowIso ? new Date(nowIso) : new Date();
  if (now.getTime() > new Date(booking.acceptanceDeadlineIso).getTime()) {
    throw new Error('Acceptance deadline has already expired');
  }

  if (booking.resourceType === 'DIGITAL') {
    booking.status = 'ACTIVE';
    booking.lenderHandoverConfirmed = true;
    booking.borrowerHandoverConfirmed = true;
    booking.rentalStartIso = booking.rentalStartIso || now.toISOString();
    const durationMs =
      booking.durationUnit === 'HOURS'
        ? booking.durationCount * 3600 * 1000
        : booking.durationCount * 24 * 3600 * 1000;
    booking.rentalEndIso =
      booking.rentalEndIso || new Date(now.getTime() + durationMs).toISOString();
    booking.timeline.push({
      id: `evt-accept-${Date.now()}`,
      timestampIso: now.toISOString(),
      actor: callerWallet,
      status: 'ACTIVE',
      title: 'Digital Agreement Accepted & Activated',
      detail: `Provider ${callerWallet} accepted booking; temporary digital access activated.`,
    });
  } else {
    booking.status = 'ACCEPTED';
    booking.handoverDeadlineIso = new Date(
      now.getTime() + DEFAULT_HANDOVER_GRACE_WINDOW_MS
    ).toISOString();
    booking.timeline.push({
      id: `evt-accept-${Date.now()}`,
      timestampIso: now.toISOString(),
      actor: callerWallet,
      status: 'ACCEPTED',
      title: 'Physical Booking Accepted by Lender',
      detail: `Lender ${callerWallet} accepted booking. Awaiting dual physical handover confirmation.`,
    });
  }

  return booking;
}

export function cancelBookingOnContract(
  ledger: EscrowContractLedger,
  bookingId: string,
  callerWallet: string,
  nowIso?: string
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (callerWallet !== booking.borrower && callerWallet !== booking.lender) {
    throw new Error('Unauthorized: Only the borrower or lender can cancel a booking');
  }
  const canCancelBeforeHandover =
    booking.status === 'REQUESTED' ||
    (booking.status === 'ACCEPTED' &&
      (!booking.lenderHandoverConfirmed || !booking.borrowerHandoverConfirmed));
  if (!canCancelBeforeHandover) {
    throw new Error('Cannot cancel a booking after physical handover or activation');
  }
  if (booking.settled) {
    throw new Error('Booking escrow has already been settled');
  }

  const refund = booking.originalTotalEscrowedNear || booking.totalEscrowedNear;
  const ts = nowIso || new Date().toISOString();
  booking.settled = true;
  booking.status = 'CANCELLED';
  booking.totalEscrowedNear = 0;
  booking.platformFeeNear = 0;
  booking.treasuryPayoutNear = 0;
  booking.lenderPayoutNear = 0;
  booking.borrowerRefundNear = refund;
  booking.settlement = {
    settledAtIso: ts,
    lenderPayoutNear: 0,
    borrowerRefundNear: refund,
    treasuryPayoutNear: 0,
    platformFeeNear: 0,
    damageDeductionNear: 0,
    resolutionNote: `Cancelled before activation by ${callerWallet}; 100% refunded to borrower with 0 platform fee.`,
  };
  booking.timeline.push({
    id: `evt-cancel-${Date.now()}`,
    timestampIso: ts,
    actor: callerWallet,
    status: 'CANCELLED',
    title: 'Booking Cancelled — 100% Deposit Refunded',
    detail: `Refunded ${refund} NEAR to ${booking.borrower} claimable balance.`,
  });
  creditClaimable(ledger, booking.borrower, refund);
  return booking;
}

export function expireBookingOnContract(
  ledger: EscrowContractLedger,
  bookingId: string,
  nowIso: string
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (booking.status !== 'REQUESTED') {
    throw new Error('Only REQUESTED bookings can expire due to unacceptance');
  }
  if (booking.settled) {
    throw new Error('Booking already settled');
  }

  const now = new Date(nowIso);
  if (now.getTime() <= new Date(booking.acceptanceDeadlineIso).getTime()) {
    throw new Error('Acceptance deadline has not yet passed');
  }

  const refund = booking.originalTotalEscrowedNear || booking.totalEscrowedNear;
  booking.settled = true;
  booking.status = 'EXPIRED';
  booking.totalEscrowedNear = 0;
  booking.platformFeeNear = 0;
  booking.treasuryPayoutNear = 0;
  booking.lenderPayoutNear = 0;
  booking.borrowerRefundNear = refund;
  booking.settlement = {
    settledAtIso: nowIso,
    lenderPayoutNear: 0,
    borrowerRefundNear: refund,
    treasuryPayoutNear: 0,
    platformFeeNear: 0,
    damageDeductionNear: 0,
    resolutionNote: 'Acceptance deadline expired without lender acceptance; 100% refunded to borrower.',
  };
  creditClaimable(ledger, booking.borrower, refund);
  return booking;
}

export function expireHandoverOnContract(
  ledger: EscrowContractLedger,
  bookingId: string,
  nowIso: string
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (booking.status !== 'ACCEPTED' && booking.status !== 'HANDOVER_PENDING') {
    throw new Error('Only ACCEPTED or HANDOVER_PENDING bookings can expire for uncompleted handover');
  }
  if (booking.settled) {
    throw new Error('Booking already settled');
  }

  const now = new Date(nowIso);
  const deadline = new Date(booking.handoverDeadlineIso || booking.acceptanceDeadlineIso);
  if (now.getTime() <= deadline.getTime()) {
    throw new Error('Handover grace deadline has not yet passed');
  }

  const refund = booking.originalTotalEscrowedNear || booking.totalEscrowedNear;
  booking.settled = true;
  booking.status = 'EXPIRED';
  booking.totalEscrowedNear = 0;
  booking.platformFeeNear = 0;
  booking.treasuryPayoutNear = 0;
  booking.lenderPayoutNear = 0;
  booking.borrowerRefundNear = refund;
  booking.settlement = {
    settledAtIso: nowIso,
    lenderPayoutNear: 0,
    borrowerRefundNear: refund,
    treasuryPayoutNear: 0,
    platformFeeNear: 0,
    damageDeductionNear: 0,
    resolutionNote: 'Handover deadline expired before dual confirmation; 100% refunded to borrower.',
  };
  creditClaimable(ledger, booking.borrower, refund);
  return booking;
}

// ============================================================================
// 3. DUAL HANDOVER & RETURN WORKFLOW + 48H LENDER RESPONSE PROTECTION
// ============================================================================

export function confirmHandoverOnContract(
  ledger: EscrowContractLedger,
  bookingId: string,
  callerWallet: string,
  nowIsoOrHandoverCode?: string
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (booking.status !== 'ACCEPTED' && booking.status !== 'HANDOVER_PENDING') {
    throw new Error(`Invalid transition: Cannot confirm handover from state ${booking.status}`);
  }
  if (callerWallet !== booking.lender && callerWallet !== booking.borrower) {
    throw new Error('Unauthorized: Only lender or borrower can confirm handover');
  }

  const isIsoDate =
    typeof nowIsoOrHandoverCode === 'string' &&
    !nowIsoOrHandoverCode.startsWith('BB-HANDOVER-') &&
    !Number.isNaN(Date.parse(nowIsoOrHandoverCode));
  const now = isIsoDate && nowIsoOrHandoverCode ? new Date(nowIsoOrHandoverCode) : new Date();

  if (callerWallet === booking.lender) {
    booking.lenderHandoverConfirmed = true;
  }
  if (callerWallet === booking.borrower) {
    booking.borrowerHandoverConfirmed = true;
  }

  if (booking.lenderHandoverConfirmed && booking.borrowerHandoverConfirmed) {
    booking.status = 'ACTIVE';
    booking.rentalStartIso = booking.rentalStartIso || now.toISOString();
    const durationMs =
      booking.durationUnit === 'HOURS'
        ? booking.durationCount * 3600 * 1000
        : booking.durationCount * 24 * 3600 * 1000;
    booking.rentalEndIso =
      booking.rentalEndIso || new Date(now.getTime() + durationMs).toISOString();
    booking.timeline.push({
      id: `evt-handover-active-${Date.now()}`,
      timestampIso: now.toISOString(),
      actor: callerWallet,
      status: 'ACTIVE',
      title: 'Dual Handover Confirmed — Rental Active',
      detail: `Both ${booking.lender} and ${booking.borrower} confirmed handover. Rental clock active.`,
    });
  } else {
    booking.timeline.push({
      id: `evt-handover-part-${Date.now()}`,
      timestampIso: now.toISOString(),
      actor: callerWallet,
      status: 'ACCEPTED',
      title: `Handover Confirmed by ${callerWallet}`,
      detail: 'Awaiting counterparty handover confirmation to activate rental.',
    });
  }

  return booking;
}

export function requestReturnOnContract(
  ledger: EscrowContractLedger,
  bookingId: string,
  callerWallet: string,
  nowIso?: string
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (callerWallet !== booking.borrower) {
    throw new Error('Unauthorized: Only borrower can initiate return');
  }
  if (booking.status !== 'ACTIVE') {
    throw new Error('Invalid transition: Return can only be requested when booking is ACTIVE');
  }

  const now = nowIso ? new Date(nowIso) : new Date();
  booking.borrowerReturnConfirmed = true;
  booking.status = 'RETURN_REQUESTED';
  booking.returnRequestedAtIso = now.toISOString();
  booking.lenderResponseDeadlineIso = new Date(
    now.getTime() + LENDER_RETURN_RESPONSE_WINDOW_MS
  ).toISOString();
  booking.timeline.push({
    id: `evt-retreq-${Date.now()}`,
    timestampIso: now.toISOString(),
    actor: callerWallet,
    status: 'RETURN_REQUESTED',
    title: 'Borrower Initiated Return',
    detail: `Return requested by ${callerWallet}. Lender has 48 hours (${booking.lenderResponseDeadlineIso}) to inspect and confirm return or report damage.`,
  });
  return booking;
}

export function confirmSatisfactoryReturnOnContract(
  ledger: EscrowContractLedger,
  bookingId: string,
  callerWallet: string,
  nowIso?: string,
  verifiedTinOrSerial?: string
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (callerWallet !== booking.lender && callerWallet !== booking.borrower) {
    throw new Error('Unauthorized: Only lender or borrower can confirm return');
  }
  if (booking.status === 'DISPUTED') {
    throw new Error('Cannot auto-settle a disputed booking; requires resolution');
  }
  if (booking.settled || booking.status === 'COMPLETED') {
    throw new Error('Duplicate completion rejected: Booking escrow has already been settled');
  }
  if (booking.status !== 'ACTIVE' && booking.status !== 'RETURN_REQUESTED') {
    throw new Error(`Invalid transition: Cannot confirm return from state ${booking.status}`);
  }

  const ts = nowIso || new Date().toISOString();

  if (callerWallet === booking.borrower) {
    booking.borrowerReturnConfirmed = true;
  }
  if (callerWallet === booking.lender) {
    if (
      booking.productIdentity &&
      verifiedTinOrSerial &&
      verifiedTinOrSerial.trim() !== '' &&
      verifiedTinOrSerial.trim().toUpperCase() !==
        booking.productIdentity.tinOrSerialNumber.trim().toUpperCase()
    ) {
      throw new Error(
        `Anti-Scam Alert: Returned TIN/Serial (${verifiedTinOrSerial}) does NOT match registered product TIN/Serial (${booking.productIdentity.tinOrSerialNumber}). Open a dispute for BorrowBond Team review.`
      );
    }
    if (booking.productIdentity) {
      booking.productIdentity.returnVerifiedTinOrSerial =
        verifiedTinOrSerial || booking.productIdentity.tinOrSerialNumber;
      booking.productIdentity.returnVerifiedSameItem = true;
    }
    booking.lenderReturnConfirmed = true;
    booking.borrowerReturnConfirmed = true;
  }

  if (booking.lenderReturnConfirmed && booking.borrowerReturnConfirmed) {
    const lateInfo = calculateLateDueDateInterest(booking, ts);
    const lateFeeNear = lateInfo.isOverdue ? lateInfo.accruedLateFeeNear : 0;
    const note = lateInfo.isOverdue
      ? `Completed with ${lateFeeNear} NEAR overdue fee under 3.00% APY due date interest policy.`
      : 'Satisfactory return verified by both parties; rental fee paid to lender and collateral refunded to borrower.';

    executeActiveSettlementOnBooking(ledger, booking, lateFeeNear, 'COMPLETED', note, ts);
    booking.timeline.push({
      id: `evt-complete-${Date.now()}`,
      timestampIso: ts,
      actor: callerWallet,
      status: 'COMPLETED',
      title: 'Safe Return Verified & Escrow Settled',
      detail: note,
    });
  } else {
    booking.status = 'RETURN_REQUESTED';
    if (!booking.returnRequestedAtIso) {
      const now = new Date(ts);
      booking.returnRequestedAtIso = now.toISOString();
      booking.lenderResponseDeadlineIso = new Date(
        now.getTime() + LENDER_RETURN_RESPONSE_WINDOW_MS
      ).toISOString();
    }
  }

  return booking;
}

export function confirmReturnAndCompleteOnContract(
  ledger: EscrowContractLedger,
  bookingId: string,
  callerWallet: string,
  verifiedTinOrSerial?: string,
  nowIso?: string
): OnChainBooking {
  return confirmSatisfactoryReturnOnContract(
    ledger,
    bookingId,
    callerWallet,
    nowIso,
    verifiedTinOrSerial
  );
}

/**
 * Permissionless auto-completion if the borrower requested return (`RETURN_REQUESTED`) and
 * the lender did not confirm, propose damage, or open a dispute within 48 hours.
 */
export function finalizeUncontestedReturnOnContract(
  ledger: EscrowContractLedger,
  bookingId: string,
  nowIso: string = new Date().toISOString()
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (booking.status !== 'RETURN_REQUESTED') {
    throw new Error('Booking must be in RETURN_REQUESTED state to auto-finalize');
  }
  if (booking.settled) {
    throw new Error('Booking already settled');
  }
  if (booking.damageProposal && booking.damageProposal.status === 'PENDING') {
    throw new Error('Cannot auto-finalize while a damage settlement proposal is pending response');
  }

  const deadlineIso = booking.lenderResponseDeadlineIso;
  if (!deadlineIso || new Date(nowIso).getTime() <= new Date(deadlineIso).getTime()) {
    throw new Error('48-hour lender response window has not expired yet');
  }

  booking.lenderReturnConfirmed = true;
  const note =
    'Auto-finalized after 48-hour lender response window expired without dispute; collateral refunded to borrower.';
  executeActiveSettlementOnBooking(ledger, booking, 0, 'COMPLETED', note, nowIso);
  booking.timeline.push({
    id: `evt-autofin-${Date.now()}`,
    timestampIso: nowIso,
    actor: 'system.borrowbond.testnet',
    status: 'COMPLETED',
    title: 'Auto-Finalized After 48h Lender Response Window',
    detail: note,
  });
  return booking;
}

// ============================================================================
// 4. MUTUAL DAMAGE SETTLEMENT NEGOTIATION & ARBITER RESOLUTION
// ============================================================================

export function proposeDamageSettlementOnContract(
  ledger: EscrowContractLedger,
  bookingId: string,
  callerWallet: string,
  proposedDamageNear: number,
  reason: string,
  evidenceSha256Hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  nowIso?: string
): OnChainBooking {
  ensureLedgerDefaults(ledger);
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (callerWallet !== booking.lender && callerWallet !== booking.borrower) {
    throw new Error('Unauthorized: Only lender or borrower can propose a damage settlement');
  }
  if (
    booking.status !== 'ACTIVE' &&
    booking.status !== 'RETURN_REQUESTED' &&
    booking.status !== 'DISPUTED'
  ) {
    throw new Error(
      'Damage settlement can only be proposed on ACTIVE, RETURN_REQUESTED, or DISPUTED bookings'
    );
  }
  if (booking.settled) {
    throw new Error('Booking already settled');
  }
  if (!reason || reason.trim().length < 5) {
    throw new Error('Damage proposal reason must be at least 5 characters');
  }

  const feeBps = Math.min(MAX_PLATFORM_FEE_BPS, Math.max(0, booking.feeBpsSnapshot ?? ledger.feeBps));
  const { maxDamageDeductibleNear } = computePlatformFeeNear(booking.collateralNear, feeBps);
  const roundedDamage = Number(proposedDamageNear.toFixed(6));
  if (!Number.isFinite(roundedDamage) || roundedDamage < 0 || roundedDamage > maxDamageDeductibleNear) {
    throw new Error(
      `Proposed damage (${roundedDamage} NEAR) must be between 0 and ${maxDamageDeductibleNear} NEAR (collateral minus platform fee)`
    );
  }

  const ts = nowIso || new Date().toISOString();
  booking.damageProposal = {
    proposedByWallet: callerWallet,
    proposedDamageNear: roundedDamage,
    proposedDamageYocto: formatYoctoNear(roundedDamage),
    reason: reason.trim(),
    evidenceSha256Hash: evidenceSha256Hash.trim(),
    status: 'PENDING',
    proposedAtIso: ts,
  };
  booking.timeline.push({
    id: `evt-dmgprop-${Date.now()}`,
    timestampIso: ts,
    actor: callerWallet,
    status: booking.status,
    title: `Damage Settlement Proposed (${roundedDamage} NEAR)`,
    detail: `${callerWallet} proposed a ${roundedDamage} NEAR deduction: "${reason.trim()}". Requires counterparty signature to settle.`,
  });

  return booking;
}

export function acceptDamageProposalOnContract(
  ledger: EscrowContractLedger,
  bookingId: string,
  callerWallet: string,
  nowIso?: string
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (callerWallet !== booking.lender && callerWallet !== booking.borrower) {
    throw new Error('Unauthorized: Only lender or borrower can accept a damage proposal');
  }
  if (booking.settled) {
    throw new Error('Booking already settled');
  }
  const proposal = booking.damageProposal;
  if (!proposal || proposal.status !== 'PENDING') {
    throw new Error('No pending damage settlement proposal exists on this booking');
  }
  if (callerWallet === proposal.proposedByWallet) {
    throw new Error('Proposer cannot self-accept their own damage settlement proposal');
  }

  const ts = nowIso || new Date().toISOString();
  proposal.status = 'ACCEPTED';
  proposal.respondedByWallet = callerWallet;
  proposal.respondedAtIso = ts;

  const note = `Mutually agreed damage deduction of ${proposal.proposedDamageNear} NEAR signed by ${booking.lender} and ${booking.borrower}.`;
  executeActiveSettlementOnBooking(
    ledger,
    booking,
    proposal.proposedDamageNear,
    'RESOLVED',
    note,
    ts
  );
  booking.disputeStatus = 'RESOLVED';

  booking.dispute = {
    bookingId,
    openedByWallet: proposal.proposedByWallet,
    reason: proposal.reason,
    status: 'RESOLVED',
    createdAtIso: proposal.proposedAtIso,
    resolvedByWallet: `${booking.lender} + ${booking.borrower} (Mutual Agreement)`,
    damageDeductionNear: booking.damageDeductionNear,
    lenderPayoutNear: booking.lenderPayoutNear,
    borrowerRefundNear: booking.borrowerRefundNear,
    treasuryPayoutNear: booking.treasuryPayoutNear,
    outcomeNotes: note,
    resolvedAtIso: ts,
  };
  booking.timeline.push({
    id: `evt-dmgacc-${Date.now()}`,
    timestampIso: ts,
    actor: callerWallet,
    status: 'RESOLVED',
    title: 'Mutual Damage Settlement Accepted & Executed',
    detail: note,
  });

  return booking;
}

export function rejectDamageProposalOnContract(
  ledger: EscrowContractLedger,
  bookingId: string,
  callerWallet: string,
  rejectionReason: string,
  nowIso?: string
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (callerWallet !== booking.lender && callerWallet !== booking.borrower) {
    throw new Error('Unauthorized: Only lender or borrower can reject a damage proposal');
  }
  if (booking.settled) {
    throw new Error('Booking already settled');
  }
  const proposal = booking.damageProposal;
  if (!proposal || proposal.status !== 'PENDING') {
    throw new Error('No pending damage settlement proposal exists on this booking');
  }
  if (callerWallet === proposal.proposedByWallet) {
    throw new Error('Only the counterparty can reject a damage proposal');
  }

  const now = nowIso || new Date().toISOString();
  proposal.status = 'REJECTED';
  proposal.respondedByWallet = callerWallet;
  proposal.respondedAtIso = now;
  proposal.rejectionReason =
    rejectionReason.trim() || 'Rejected by counterparty; escalated to arbitration.';

  booking.status = 'DISPUTED';
  booking.disputeStatus = 'OPEN';
  booking.dispute = {
    bookingId,
    openedByWallet: callerWallet,
    reason: proposal.rejectionReason,
    status: 'OPEN',
    createdAtIso: now,
  };
  booking.timeline.push({
    id: `evt-dmgrej-${Date.now()}`,
    timestampIso: now,
    actor: callerWallet,
    status: 'DISPUTED',
    title: 'Damage Proposal Rejected — Escalated to Dispute',
    detail: proposal.rejectionReason,
  });

  return booking;
}

export function submitEvidenceOnContract(
  ledger: EscrowContractLedger,
  bookingId: string,
  params: {
    id: string;
    uploaderWallet: string;
    stage: 'HANDOVER_BEFORE' | 'RETURN_AFTER' | 'DISPUTE_EVIDENCE';
    fileReference: string;
    contentSha256Hash: string;
    conditionNotes: string;
    timestampIso?: string;
  }
): EvidenceRecord {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (
    params.uploaderWallet !== booking.lender &&
    params.uploaderWallet !== booking.borrower &&
    params.uploaderWallet !== ledger.designatedResolver
  ) {
    throw new Error('Unauthorized evidence uploader');
  }

  const record: EvidenceRecord = {
    id: params.id,
    bookingId,
    uploaderWallet: params.uploaderWallet,
    stage: params.stage,
    fileReference: params.fileReference,
    contentSha256Hash: params.contentSha256Hash,
    conditionNotes: params.conditionNotes,
    timestampIso: params.timestampIso || new Date().toISOString(),
  };

  booking.evidence.push(record);
  return record;
}

export function openDisputeOnContract(
  ledger: EscrowContractLedger,
  bookingId: string,
  callerWallet: string,
  reason: string,
  nowIso?: string
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (callerWallet !== booking.lender && callerWallet !== booking.borrower) {
    throw new Error('Unauthorized: Only borrower or lender can open a dispute');
  }
  if (booking.status !== 'ACTIVE' && booking.status !== 'RETURN_REQUESTED') {
    throw new Error('Disputes can only be opened on ACTIVE or RETURN_REQUESTED bookings');
  }
  if (!reason || reason.trim().length < 5) {
    throw new Error('Dispute reason must be at least 5 characters');
  }

  const ts = nowIso || new Date().toISOString();
  booking.status = 'DISPUTED';
  booking.disputeStatus = 'OPEN';
  booking.dispute = {
    bookingId,
    openedByWallet: callerWallet,
    reason: reason.trim(),
    status: 'OPEN',
    createdAtIso: ts,
  };
  booking.timeline.push({
    id: `evt-dispute-${Date.now()}`,
    timestampIso: ts,
    actor: callerWallet,
    status: 'DISPUTED',
    title: 'Dispute Opened — Escrow Frozen',
    detail: `${callerWallet} opened dispute: "${reason.trim()}". Escrowed funds frozen for BorrowBond Team review.`,
  });
  return booking;
}

export function resolveDisputeOnContract(
  ledger: EscrowContractLedger,
  bookingId: string,
  callerWallet: string,
  lenderPayoutNear: number,
  borrowerRefundNear: number,
  outcomeNotes: string,
  nowIso?: string
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (callerWallet !== ledger.designatedResolver) {
    throw new Error('Unauthorized: Only BorrowBond Team designated resolver can resolve a dispute');
  }
  if (booking.status !== 'DISPUTED' || !booking.dispute) {
    throw new Error('Booking is not in DISPUTED state');
  }
  if (booking.settled) {
    throw new Error('Dispute has already been settled');
  }
  if (lenderPayoutNear < 0 || borrowerRefundNear < 0) {
    throw new Error('Payout and refund amounts cannot be negative');
  }

  const damageDeductionNear = Number(
    Math.max(0, lenderPayoutNear - booking.rentalFeeNear).toFixed(6)
  );
  const ts = nowIso || new Date().toISOString();
  executeActiveSettlementOnBooking(
    ledger,
    booking,
    damageDeductionNear,
    'RESOLVED',
    outcomeNotes,
    ts
  );
  booking.disputeStatus = 'RESOLVED';

  booking.dispute.status = 'RESOLVED';
  booking.dispute.resolvedByWallet = callerWallet;
  booking.dispute.damageDeductionNear = booking.damageDeductionNear;
  booking.dispute.lenderPayoutNear = booking.lenderPayoutNear;
  booking.dispute.borrowerRefundNear = booking.borrowerRefundNear;
  booking.dispute.treasuryPayoutNear = booking.treasuryPayoutNear;
  booking.dispute.outcomeNotes = outcomeNotes;
  booking.dispute.resolvedAtIso = ts;
  booking.timeline.push({
    id: `evt-resolve-${Date.now()}`,
    timestampIso: ts,
    actor: callerWallet,
    status: 'RESOLVED',
    title: 'Dispute Resolved by BorrowBond Team',
    detail: outcomeNotes,
  });

  return booking;
}

export function resolveDisputeWithDamageDeductionOnContract(
  ledger: EscrowContractLedger,
  bookingId: string,
  callerWallet: string,
  damageDeductionNear: number,
  outcomeNotes: string,
  nowIso?: string
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (callerWallet !== ledger.designatedResolver) {
    throw new Error(
      'Unauthorized: Only BorrowBond Team designated resolver can resolve a dispute'
    );
  }
  if (booking.status !== 'DISPUTED' || !booking.dispute) {
    throw new Error('Booking is not in DISPUTED state');
  }

  const ts = nowIso || new Date().toISOString();
  executeActiveSettlementOnBooking(
    ledger,
    booking,
    damageDeductionNear,
    'RESOLVED',
    outcomeNotes,
    ts
  );
  booking.disputeStatus = 'RESOLVED';

  booking.dispute.status = 'RESOLVED';
  booking.dispute.resolvedByWallet = callerWallet;
  booking.dispute.damageDeductionNear = booking.damageDeductionNear;
  booking.dispute.lenderPayoutNear = booking.lenderPayoutNear;
  booking.dispute.borrowerRefundNear = booking.borrowerRefundNear;
  booking.dispute.treasuryPayoutNear = booking.treasuryPayoutNear;
  booking.dispute.outcomeNotes = outcomeNotes;
  booking.dispute.resolvedAtIso = ts;
  booking.timeline.push({
    id: `evt-resolve-dmg-${Date.now()}`,
    timestampIso: ts,
    actor: callerWallet,
    status: 'RESOLVED',
    title: 'Dispute Resolved with Damage Deduction',
    detail: outcomeNotes,
  });

  return booking;
}

export function submitBookingReviewOnContract(
  ledger: EscrowContractLedger,
  bookingId: string,
  callerWallet: string,
  rating: number,
  tags: string[],
  comment: string,
  nowIso: string = new Date().toISOString()
): { booking: OnChainBooking; review: TransactionReview } {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (booking.status !== 'COMPLETED' && booking.status !== 'RESOLVED') {
    throw new Error(
      'Cannot submit a review for an agreement that is not COMPLETED or RESOLVED'
    );
  }
  if (callerWallet !== booking.borrower && callerWallet !== booking.lender) {
    throw new Error('Unauthorized: Only agreement participants can submit a review');
  }
  if (booking.review && booking.review.reviewerWallet === callerWallet) {
    throw new Error('Duplicate review rejected: Participant has already reviewed this agreement');
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5 stars');
  }

  const reviewerRole = callerWallet === booking.borrower ? 'BORROWER' : 'LENDER';
  const revieweeWallet = callerWallet === booking.borrower ? booking.lender : booking.borrower;

  const reviewId = `rev-${bookingId}-${Date.now()}`;
  const review: TransactionReview = {
    id: reviewId,
    reviewId,
    bookingId,
    listingId: booking.listingId,
    reviewerWallet: callerWallet,
    revieweeWallet,
    reviewerRole,
    rating: Math.round(rating),
    tags: tags.slice(0, 8),
    comment: comment.trim(),
    createdAtIso: nowIso,
    verifiedOnChainCompletion: true,
  };

  booking.review = review;
  booking.timeline.push({
    id: `evt-review-${Date.now()}`,
    timestampIso: nowIso,
    actor: callerWallet,
    status: booking.status,
    title: `Verified ${review.rating}★ Reputation Rating & Review Published`,
    detail: `${callerWallet} rated ${revieweeWallet} ${review.rating}/5 stars.`,
  });

  return { booking, review };
}

export function filterBookingsHistory(
  bookings: OnChainBooking[],
  filters: {
    searchQuery?: string;
    statusFilter?: string;
    dateFilter?: string;
  }
): OnChainBooking[] {
  const q = (filters.searchQuery || '').trim().toLowerCase();
  const statusF = (filters.statusFilter || '').trim().toUpperCase();
  const dateF = (filters.dateFilter || '').trim();

  return bookings.filter((b) => {
    if (statusF && statusF !== 'ALL' && b.status !== statusF) {
      return false;
    }
    if (dateF && !b.createdAtIso.startsWith(dateF)) {
      return false;
    }
    if (q) {
      const hay = [
        b.bookingId,
        b.listingTitle,
        b.status,
        b.lender,
        b.borrower,
        b.productIdentity?.brandAndModel || '',
        b.productIdentity?.tinOrSerialNumber || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export const confirmReturnOnContract = confirmSatisfactoryReturnOnContract;
export const cancelOrExpireBookingOnContract = cancelBookingOnContract;

// ============================================================================
// 5. CALLBACK-SAFE PULL WITHDRAWAL (`withdraw_claimable` + `on_withdraw_complete`)
// ============================================================================

export function withdrawClaimableOnContract(
  ledger: EscrowContractLedger,
  callerWallet: string,
  options?: { simulatePromiseFailure?: boolean }
): number {
  ensureLedgerDefaults(ledger);
  const amount = ledger.claimableBalancesNear[callerWallet] || 0;
  if (amount <= 0) {
    throw new Error('No claimable balance available to withdraw');
  }

  const withdrawalId = `wd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Step 1: Optimistically zero out claimable balance before promise transfer (Checks-Effects-Interactions)
  ledger.claimableBalancesNear[callerWallet] = 0;
  ledger.pendingWithdrawals![withdrawalId] = {
    withdrawalId,
    recipientWallet: callerWallet,
    amountNear: amount,
    amountYocto: formatYoctoNear(amount),
    status: 'PENDING_CALLBACK',
    createdAtIso: new Date().toISOString(),
  };

  // Step 2: Execute private callback `on_withdraw_complete`
  const callbackSuccess = !options?.simulatePromiseFailure;
  simulateWithdrawalCallbackOnContract(ledger, withdrawalId, callbackSuccess);

  if (!callbackSuccess) {
    throw new Error(
      `Transfer promise failed on NEAR RPC; ${amount} NEAR was safely restored to ${callerWallet}'s claimable balance by on_withdraw_complete callback.`
    );
  }

  return amount;
}

export function withdrawClaimableFromContract(
  ledger: EscrowContractLedger,
  callerWallet: string,
  options?: { simulatePromiseFailure?: boolean }
): {
  withdrawnNear: number;
  recipient: string;
  txHash: string;
  isSimulatedTx: boolean;
} {
  const withdrawnNear = withdrawClaimableOnContract(ledger, callerWallet, options);
  return {
    withdrawnNear,
    recipient: callerWallet,
    txHash: generateSyntheticTxHash(`withdraw_${callerWallet}_${Date.now()}`),
    isSimulatedTx: true,
  };
}

export function simulateWithdrawalCallbackOnContract(
  ledger: EscrowContractLedger,
  withdrawalId: string,
  promiseSucceeded: boolean
): PendingWithdrawalRecord {
  ensureLedgerDefaults(ledger);
  const record = ledger.pendingWithdrawals?.[withdrawalId];
  if (!record) {
    throw new Error(`Withdrawal record ${withdrawalId} not found`);
  }
  if (record.status !== 'PENDING_CALLBACK') {
    throw new Error(`Withdrawal ${withdrawalId} callback already processed`);
  }

  if (promiseSucceeded) {
    record.status = 'COMPLETED';
  } else {
    record.status = 'RESTORED_ON_FAILURE';
    creditClaimable(ledger, record.recipientWallet, record.amountNear);
  }
  return record;
}
