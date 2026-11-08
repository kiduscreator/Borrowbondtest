// Pure NEAR Programmable Escrow State Machine & Safe Accounting Engine
// Mirrors contracts/borrowbond/src/lib.rs with checked integer yoctoNEAR arithmetic
// and strict state transition validation.

export type ResourceType = 'PHYSICAL' | 'DIGITAL';

export type BookingStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'ACTIVE'
  | 'RETURN_REQUESTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DISPUTED'
  | 'RESOLVED';

export type DisputeStatus = 'NONE' | 'OPEN' | 'RESOLVED';

export interface SettlementRecord {
  lenderPayoutNear: number;
  borrowerRefundNear: number;
  settledAtIso: string;
  resolutionNote: string;
  resolverAccount?: string;
}

export interface TimelineEvent {
  id: string;
  timestampIso: string;
  actor: string;
  status: BookingStatus;
  title: string;
  detail: string;
  txHash?: string;
}

export interface EvidenceRecord {
  id: string;
  bookingId: string;
  uploaderWallet: string;
  stage: 'HANDOVER_BEFORE' | 'RETURN_AFTER' | 'DISPUTE_EVIDENCE';
  photoDataUrl?: string;
  fileReference: string;
  contentSha256Hash: string;
  conditionNotes: string;
  timestampIso: string;
}

export interface DisputeRecord {
  id: string;
  bookingId: string;
  openedByWallet: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED';
  resolverWallet: string;
  lenderPayoutNear?: number;
  borrowerRefundNear?: number;
  outcomeNotes?: string;
  createdAtIso: string;
  resolvedAtIso?: string;
}

export interface OnChainBooking {
  bookingId: string;
  listingId: string;
  listingTitle: string;
  lender: string;
  borrower: string;
  resourceType: ResourceType;
  durationCount: number;
  durationUnit: 'HOURS' | 'DAYS';
  rentalFeeNear: number;
  collateralNear: number;
  totalEscrowedNear: number;
  createdAtIso: string;
  acceptanceDeadlineIso: string;
  rentalStartIso: string;
  rentalEndIso: string;
  status: BookingStatus;
  disputeStatus: DisputeStatus;
  nearNetwork: 'testnet';
  contractAddress: string;
  txHash: string | null; // Null when demo-seeded without live testnet tx; real hash when signed on testnet
  isSimulatedTx: boolean;
  oneTimeHandoverCode: string;
  lenderHandoverConfirmed: boolean;
  borrowerHandoverConfirmed: boolean;
  lenderReturnConfirmed: boolean;
  borrowerReturnConfirmed: boolean;
  settlement: SettlementRecord | null;
  evidence: EvidenceRecord[];
  dispute: DisputeRecord | null;
  timeline: TimelineEvent[];
}

export interface EscrowLedgerState {
  contractAddress: string;
  designatedResolver: string;
  bookings: Record<string, OnChainBooking>;
  claimableBalancesNear: Record<string, number>;
}

const YOCTO_MULTIPLIER = 1_000_000; // 6 decimal places micro-NEAR precision for safe integer math

export function toMicroNear(amountNear: number): number {
  if (!Number.isFinite(amountNear) || amountNear < 0) {
    throw new Error('Invalid NEAR token amount');
  }
  return Math.round(amountNear * YOCTO_MULTIPLIER);
}

export function fromMicroNear(micro: number): number {
  return Number((micro / YOCTO_MULTIPLIER).toFixed(6));
}

export function formatYoctoNear(amountNear: number): string {
  const micro = BigInt(toMicroNear(amountNear));
  const yocto = micro * 1_000_000_000_000_000_000n;
  return yocto.toString();
}

export function createEscrowLedger(
  contractAddress = 'borrowbond-escrow.testnet',
  designatedResolver = 'resolver.borrowbond.testnet'
): EscrowLedgerState {
  return {
    contractAddress,
    designatedResolver,
    bookings: {},
    claimableBalancesNear: {},
  };
}

function creditClaimable(ledger: EscrowLedgerState, accountId: string, amountNear: number): void {
  const currentMicro = toMicroNear(ledger.claimableBalancesNear[accountId] ?? 0);
  const addMicro = toMicroNear(amountNear);
  ledger.claimableBalancesNear[accountId] = fromMicroNear(currentMicro + addMicro);
}

export interface CreateBookingInput {
  bookingId: string;
  listingId: string;
  listingTitle: string;
  lender: string;
  borrower: string;
  resourceType: ResourceType;
  durationCount: number;
  durationUnit: 'HOURS' | 'DAYS';
  rentalFeeNear: number;
  collateralNear: number;
  attachedPaymentNear: number;
  nowIso?: string;
  acceptanceDeadlineIso: string;
  rentalStartIso: string;
  rentalEndIso: string;
  txHash?: string | null;
  isSimulatedTx?: boolean;
}

export function createBookingOnContract(
  ledger: EscrowLedgerState,
  input: CreateBookingInput
): OnChainBooking {
  if (ledger.bookings[input.bookingId]) {
    throw new Error(`Booking ID ${input.bookingId} already exists`);
  }
  if (!input.borrower || !input.lender) {
    throw new Error('Borrower and lender account IDs are required');
  }
  if (input.borrower === input.lender) {
    throw new Error('Borrower and lender must be distinct NEAR accounts');
  }
  if (input.rentalFeeNear <= 0) {
    throw new Error('Rental fee must be greater than 0 NEAR');
  }
  if (input.collateralNear < 0) {
    throw new Error('Collateral cannot be negative');
  }

  const feeMicro = toMicroNear(input.rentalFeeNear);
  const colMicro = toMicroNear(input.collateralNear);
  const requiredMicro = feeMicro + colMicro;
  const attachedMicro = toMicroNear(input.attachedPaymentNear);

  if (attachedMicro !== requiredMicro) {
    throw new Error(
      `Attached payment (${input.attachedPaymentNear} NEAR) must equal exact rental fee + collateral (${fromMicroNear(requiredMicro)} NEAR)`
    );
  }

  const nowIso = input.nowIso ?? new Date().toISOString();
  if (new Date(input.acceptanceDeadlineIso).getTime() <= new Date(nowIso).getTime()) {
    throw new Error('Acceptance deadline must be in the future');
  }
  if (new Date(input.rentalEndIso).getTime() <= new Date(input.rentalStartIso).getTime()) {
    throw new Error('Rental end time must be after rental start time');
  }

  const handoverCode = `BB-${input.bookingId.slice(-4).toUpperCase()}-${Math.abs(feeMicro + colMicro).toString(36).toUpperCase().slice(0, 4)}`;

  const booking: OnChainBooking = {
    bookingId: input.bookingId,
    listingId: input.listingId,
    listingTitle: input.listingTitle,
    lender: input.lender,
    borrower: input.borrower,
    resourceType: input.resourceType,
    durationCount: input.durationCount,
    durationUnit: input.durationUnit,
    rentalFeeNear: fromMicroNear(feeMicro),
    collateralNear: fromMicroNear(colMicro),
    totalEscrowedNear: fromMicroNear(requiredMicro),
    createdAtIso: nowIso,
    acceptanceDeadlineIso: input.acceptanceDeadlineIso,
    rentalStartIso: input.rentalStartIso,
    rentalEndIso: input.rentalEndIso,
    status: 'REQUESTED',
    disputeStatus: 'NONE',
    nearNetwork: 'testnet',
    contractAddress: ledger.contractAddress,
    txHash: input.txHash ?? null,
    isSimulatedTx: input.isSimulatedTx ?? !input.txHash,
    oneTimeHandoverCode: handoverCode,
    lenderHandoverConfirmed: false,
    borrowerHandoverConfirmed: false,
    lenderReturnConfirmed: false,
    borrowerReturnConfirmed: false,
    settlement: null,
    evidence: [],
    dispute: null,
    timeline: [
      {
        id: `evt-${Date.now()}-1`,
        timestampIso: nowIso,
        actor: input.borrower,
        status: 'REQUESTED',
        title: 'Escrow Deposit Locked & Booking Requested',
        detail: `Locked ${fromMicroNear(feeMicro)} NEAR rental fee + ${fromMicroNear(colMicro)} NEAR refundable collateral (${fromMicroNear(requiredMicro)} NEAR total) in ${ledger.contractAddress}.`,
        txHash: input.txHash ?? undefined,
      },
    ],
  };

  ledger.bookings[input.bookingId] = booking;
  return booking;
}

export function acceptBookingOnContract(
  ledger: EscrowLedgerState,
  bookingId: string,
  callerAccount: string,
  nowIso = new Date().toISOString()
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (callerAccount !== booking.lender) {
    throw new Error('Unauthorized: Only the lender can accept this booking');
  }
  if (booking.status !== 'REQUESTED') {
    throw new Error(`Invalid transition: Cannot accept booking in ${booking.status} state`);
  }
  if (new Date(nowIso).getTime() > new Date(booking.acceptanceDeadlineIso).getTime()) {
    throw new Error('Acceptance deadline has passed');
  }

  if (booking.resourceType === 'DIGITAL') {
    booking.status = 'ACTIVE';
    booking.lenderHandoverConfirmed = true;
    booking.borrowerHandoverConfirmed = true;
    booking.timeline.push({
      id: `evt-${Date.now()}-accept`,
      timestampIso: nowIso,
      actor: callerAccount,
      status: 'ACTIVE',
      title: 'Provider Accepted & Digital Access Activated',
      detail: 'On-chain booking transitioned to ACTIVE. Authorized borrower can now provision temporary API credentials.',
    });
  } else {
    booking.status = 'ACCEPTED';
    booking.timeline.push({
      id: `evt-${Date.now()}-accept`,
      timestampIso: nowIso,
      actor: callerAccount,
      status: 'ACCEPTED',
      title: 'Lender Accepted Booking Request',
      detail: `Awaiting both-party physical handover confirmation (Handover Code: ${booking.oneTimeHandoverCode}).`,
    });
  }

  return booking;
}

export function cancelBookingOnContract(
  ledger: EscrowLedgerState,
  bookingId: string,
  callerAccount: string,
  nowIso = new Date().toISOString()
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (callerAccount !== booking.borrower && callerAccount !== booking.lender) {
    throw new Error('Unauthorized: Only borrower or lender can cancel');
  }
  if (booking.status !== 'REQUESTED') {
    throw new Error(`Invalid transition: Cannot cancel booking in ${booking.status} state`);
  }

  const refund = booking.totalEscrowedNear;
  booking.totalEscrowedNear = 0;
  booking.status = 'CANCELLED';
  booking.settlement = {
    lenderPayoutNear: 0,
    borrowerRefundNear: refund,
    settledAtIso: nowIso,
    resolutionNote: `Cancelled prior to acceptance by ${callerAccount}. Full deposit (${refund} NEAR) credited back to borrower.`,
  };

  creditClaimable(ledger, booking.borrower, refund);

  booking.timeline.push({
    id: `evt-${Date.now()}-cancel`,
    timestampIso: nowIso,
    actor: callerAccount,
    status: 'CANCELLED',
    title: 'Booking Cancelled & Deposit Refunded',
    detail: `${refund} NEAR credited to ${booking.borrower} claimable balance.`,
  });

  return booking;
}

export function expireBookingOnContract(
  ledger: EscrowLedgerState,
  bookingId: string,
  nowIso = new Date().toISOString()
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (booking.status !== 'REQUESTED') {
    throw new Error(`Invalid transition: Only REQUESTED bookings can expire`);
  }
  if (new Date(nowIso).getTime() <= new Date(booking.acceptanceDeadlineIso).getTime()) {
    throw new Error('Acceptance deadline has not yet passed');
  }

  const refund = booking.totalEscrowedNear;
  booking.totalEscrowedNear = 0;
  booking.status = 'EXPIRED';
  booking.settlement = {
    lenderPayoutNear: 0,
    borrowerRefundNear: refund,
    settledAtIso: nowIso,
    resolutionNote: `Acceptance deadline passed without lender acceptance. Full ${refund} NEAR refunded to borrower.`,
  };

  creditClaimable(ledger, booking.borrower, refund);

  booking.timeline.push({
    id: `evt-${Date.now()}-expire`,
    timestampIso: nowIso,
    actor: 'system',
    status: 'EXPIRED',
    title: 'Booking Expired — Full Deposit Refunded',
    detail: `Acceptance deadline elapsed. ${refund} NEAR credited back to ${booking.borrower}.`,
  });

  return booking;
}

export function confirmHandoverOnContract(
  ledger: EscrowLedgerState,
  bookingId: string,
  callerAccount: string,
  nowIso = new Date().toISOString()
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (booking.status !== 'ACCEPTED') {
    throw new Error(`Invalid transition: Handover requires ACCEPTED status (currently ${booking.status})`);
  }

  if (callerAccount === booking.lender) {
    booking.lenderHandoverConfirmed = true;
  } else if (callerAccount === booking.borrower) {
    booking.borrowerHandoverConfirmed = true;
  } else {
    throw new Error('Unauthorized caller for handover confirmation');
  }

  const bothConfirmed = booking.lenderHandoverConfirmed && booking.borrowerHandoverConfirmed;
  if (bothConfirmed) {
    booking.status = 'ACTIVE';
  }

  booking.timeline.push({
    id: `evt-${Date.now()}-handover-${callerAccount}`,
    timestampIso: nowIso,
    actor: callerAccount,
    status: booking.status,
    title: bothConfirmed
      ? 'Physical Handover Completed — Agreement Active'
      : `Handover Confirmed by ${callerAccount === booking.lender ? 'Lender' : 'Borrower'}`,
    detail: bothConfirmed
      ? 'Both parties confirmed handover condition. Borrowing period is now ACTIVE.'
      : 'Waiting for counterparty handover confirmation.',
  });

  return booking;
}

export function requestReturnOnContract(
  ledger: EscrowLedgerState,
  bookingId: string,
  callerAccount: string,
  nowIso = new Date().toISOString()
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (callerAccount !== booking.borrower) {
    throw new Error('Unauthorized: Only the borrower can initiate return');
  }
  if (booking.status !== 'ACTIVE') {
    throw new Error(`Invalid transition: Booking must be ACTIVE to request return (currently ${booking.status})`);
  }

  booking.borrowerReturnConfirmed = true;
  booking.status = 'RETURN_REQUESTED';

  booking.timeline.push({
    id: `evt-${Date.now()}-req-return`,
    timestampIso: nowIso,
    actor: callerAccount,
    status: 'RETURN_REQUESTED',
    title: 'Borrower Initiated Return & Confirmed Condition',
    detail: 'Awaiting lender inspection and return confirmation to settle rental fee and release collateral.',
  });

  return booking;
}

export function confirmSatisfactoryReturnOnContract(
  ledger: EscrowLedgerState,
  bookingId: string,
  callerAccount: string,
  nowIso = new Date().toISOString()
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (booking.settlement !== null || booking.status === 'COMPLETED') {
    throw new Error('Duplicate completion rejected: Booking is already settled');
  }
  if (booking.disputeStatus !== 'NONE' || booking.status === 'DISPUTED') {
    throw new Error('Cannot auto-settle a disputed booking');
  }

  const allowedStatus =
    booking.status === 'RETURN_REQUESTED' ||
    (booking.resourceType === 'DIGITAL' && booking.status === 'ACTIVE');

  if (!allowedStatus) {
    throw new Error(`Invalid transition: Cannot confirm return from ${booking.status} state`);
  }

  if (callerAccount === booking.lender) {
    booking.lenderReturnConfirmed = true;
  } else if (callerAccount === booking.borrower) {
    booking.borrowerReturnConfirmed = true;
  } else {
    throw new Error('Unauthorized caller for return confirmation');
  }

  if (booking.lenderReturnConfirmed && booking.borrowerReturnConfirmed) {
    const fee = booking.rentalFeeNear;
    const collateral = booking.collateralNear;
    booking.totalEscrowedNear = 0;
    booking.status = 'COMPLETED';
    booking.settlement = {
      lenderPayoutNear: fee,
      borrowerRefundNear: collateral,
      settledAtIso: nowIso,
      resolutionNote: `Satisfactory return confirmed by both parties. ${fee} NEAR rental fee credited to lender (${booking.lender}); ${collateral} NEAR collateral refunded to borrower (${booking.borrower}).`,
    };

    creditClaimable(ledger, booking.lender, fee);
    creditClaimable(ledger, booking.borrower, collateral);

    booking.timeline.push({
      id: `evt-${Date.now()}-complete`,
      timestampIso: nowIso,
      actor: callerAccount,
      status: 'COMPLETED',
      title: 'Escrow Settled — Fee Paid & Collateral Refunded',
      detail: `${fee} NEAR rental fee credited to ${booking.lender} and ${collateral} NEAR collateral returned to ${booking.borrower}.`,
    });
  } else {
    booking.timeline.push({
      id: `evt-${Date.now()}-ret-part`,
      timestampIso: nowIso,
      actor: callerAccount,
      status: booking.status,
      title: `Return Confirmed by ${callerAccount === booking.lender ? 'Lender' : 'Borrower'}`,
      detail: 'Awaiting counterparty confirmation to complete settlement.',
    });
  }

  return booking;
}

export function openDisputeOnContract(
  ledger: EscrowLedgerState,
  bookingId: string,
  callerAccount: string,
  reason: string,
  nowIso = new Date().toISOString()
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (callerAccount !== booking.borrower && callerAccount !== booking.lender) {
    throw new Error('Unauthorized: Only borrower or lender can open a dispute');
  }
  if (booking.status !== 'ACTIVE' && booking.status !== 'RETURN_REQUESTED') {
    throw new Error(`Invalid transition: Cannot open dispute when status is ${booking.status}`);
  }
  if (!reason || reason.trim().length < 5) {
    throw new Error('A clear dispute reason (at least 5 characters) is required');
  }

  booking.status = 'DISPUTED';
  booking.disputeStatus = 'OPEN';
  booking.dispute = {
    id: `disp-${bookingId}`,
    bookingId,
    openedByWallet: callerAccount,
    reason: reason.trim(),
    status: 'OPEN',
    resolverWallet: ledger.designatedResolver,
    createdAtIso: nowIso,
  };

  booking.timeline.push({
    id: `evt-${Date.now()}-dispute`,
    timestampIso: nowIso,
    actor: callerAccount,
    status: 'DISPUTED',
    title: 'Dispute Opened — Escrowed Collateral & Fee Frozen',
    detail: `Reason: "${reason.trim()}". ${booking.totalEscrowedNear} NEAR remains locked in escrow pending review by designated resolver (${ledger.designatedResolver}).`,
  });

  return booking;
}

export function resolveDisputeOnContract(
  ledger: EscrowLedgerState,
  bookingId: string,
  callerAccount: string,
  lenderPayoutNear: number,
  borrowerRefundNear: number,
  outcomeNotes: string,
  nowIso = new Date().toISOString()
): OnChainBooking {
  const booking = ledger.bookings[bookingId];
  if (!booking) throw new Error('Booking not found');
  if (callerAccount !== ledger.designatedResolver) {
    throw new Error(
      `Unauthorized: Only designated resolver (${ledger.designatedResolver}) can resolve disputes`
    );
  }
  if (booking.status !== 'DISPUTED' || booking.disputeStatus !== 'OPEN') {
    throw new Error('Booking must be in DISPUTED state with an OPEN dispute');
  }
  if (booking.settlement !== null) {
    throw new Error('Booking is already settled');
  }

  const lenderMicro = toMicroNear(lenderPayoutNear);
  const borrowerMicro = toMicroNear(borrowerRefundNear);
  const totalEscrowedMicro = toMicroNear(booking.totalEscrowedNear);

  if (lenderMicro + borrowerMicro !== totalEscrowedMicro) {
    throw new Error(
      `Dispute allocation (${fromMicroNear(lenderMicro + borrowerMicro)} NEAR) must exactly equal escrowed total (${booking.totalEscrowedNear} NEAR)`
    );
  }

  booking.totalEscrowedNear = 0;
  booking.status = 'RESOLVED';
  booking.disputeStatus = 'RESOLVED';
  booking.settlement = {
    lenderPayoutNear: fromMicroNear(lenderMicro),
    borrowerRefundNear: fromMicroNear(borrowerMicro),
    settledAtIso: nowIso,
    resolutionNote: outcomeNotes.trim(),
    resolverAccount: callerAccount,
  };

  if (booking.dispute) {
    booking.dispute.status = 'RESOLVED';
    booking.dispute.lenderPayoutNear = fromMicroNear(lenderMicro);
    booking.dispute.borrowerRefundNear = fromMicroNear(borrowerMicro);
    booking.dispute.outcomeNotes = outcomeNotes.trim();
    booking.dispute.resolvedAtIso = nowIso;
  }

  creditClaimable(ledger, booking.lender, fromMicroNear(lenderMicro));
  creditClaimable(ledger, booking.borrower, fromMicroNear(borrowerMicro));

  booking.timeline.push({
    id: `evt-${Date.now()}-resolve`,
    timestampIso: nowIso,
    actor: callerAccount,
    status: 'RESOLVED',
    title: 'Dispute Resolved by Designated Resolver',
    detail: `Allocated ${fromMicroNear(lenderMicro)} NEAR to lender (${booking.lender}) and ${fromMicroNear(borrowerMicro)} NEAR to borrower (${booking.borrower}). Notes: ${outcomeNotes.trim()}`,
  });

  return booking;
}

export function withdrawClaimableFromContract(
  ledger: EscrowLedgerState,
  callerAccount: string
): { withdrawnNear: number; remainingNear: number } {
  const available = ledger.claimableBalancesNear[callerAccount] ?? 0;
  if (available <= 0) {
    throw new Error('No claimable balance available to withdraw');
  }
  ledger.claimableBalancesNear[callerAccount] = 0;
  return {
    withdrawnNear: available,
    remainingNear: 0,
  };
}
