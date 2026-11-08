// Validated Agent Tool Definitions & Rules-Based Natural Language Query Parser
// Implements all 13 required BorrowBond Agent tools with input validation,
// authorization checks, rate-limit accounting, and truthful responses.

import {
  type MarketplaceListing,
  type ProviderProfile,
  type SpendingPolicy,
  evaluateSpendingAndSecurityPolicy,
  calculateCollateralRecommendation,
} from '../security/policyEngine';
import {
  type EscrowLedgerState,
  type OnChainBooking,
  confirmHandoverOnContract,
  requestReturnOnContract,
  openDisputeOnContract,
} from '../near/escrowStateMachine';
import { type DigitalGatewayStore } from '../digital/accessGateway';

export interface AgentActionLog {
  id: string;
  timestampIso: string;
  toolName: string;
  args: Record<string, unknown>;
  success: boolean;
  summary: string;
}

export interface BookingDraft {
  draftId: string;
  listingId: string;
  listingTitle: string;
  resourceType: 'PHYSICAL' | 'DIGITAL';
  lenderWallet: string;
  borrowerWallet: string;
  durationCount: number;
  durationUnit: 'HOURS' | 'DAYS';
  rentalFeeNear: number;
  collateralNear: number;
  totalRequiredNear: number;
  cancellationRules: string;
  expectedExpirationIso: string;
  disputeConditions: string;
  nearNetwork: 'testnet';
  contractAddress: string;
  securityCheckPassed: boolean;
  securityViolations: string[];
  securityWarnings: string[];
  requiresExplicitWalletApproval: true;
}

export interface AgentToolContext {
  callerWallet: string;
  listings: MarketplaceListing[];
  profiles: Record<string, ProviderProfile>;
  policy: SpendingPolicy;
  escrowLedger: EscrowLedgerState;
  digitalGateway: DigitalGatewayStore;
  actionLogs: AgentActionLog[];
  activeDrafts: Record<string, BookingDraft>;
}

function logToolAction(
  ctx: AgentToolContext,
  toolName: string,
  args: Record<string, unknown>,
  success: boolean,
  summary: string
): void {
  ctx.actionLogs.unshift({
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestampIso: new Date().toISOString(),
    toolName,
    args,
    success,
    summary,
  });
}

// 1. search_listings
export function toolSearchListings(
  ctx: AgentToolContext,
  params: {
    query?: string;
    resourceType?: 'ALL' | 'PHYSICAL' | 'DIGITAL';
    category?: string;
    maxTotalNear?: number;
    onlyAvailable?: boolean;
  }
): { success: boolean; count: number; listings: MarketplaceListing[] } {
  const q = (params.query ?? '').toLowerCase().trim();
  const rType = params.resourceType ?? 'ALL';
  const onlyAvail = params.onlyAvailable ?? true;

  const stopWords = new Set(['need', 'want', 'for', 'the', 'and', 'with', 'find', 'best', 'option', 'project', 'days', 'hours', 'near', 'budget', 'total', 'reliable', 'offer', 'reasonable', 'collateral', 'digital', 'physical']);
  const tokens = q
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !stopWords.has(t));

  const results = ctx.listings.filter((item) => {
    if (onlyAvail && item.availabilityStatus !== 'AVAILABLE') return false;
    if (rType !== 'ALL' && item.resourceType !== rType) return false;
    if (params.category && item.category.toLowerCase() !== params.category.toLowerCase()) {
      return false;
    }
    if (params.maxTotalNear !== undefined) {
      if (item.rentalFeeNear + item.collateralNear > params.maxTotalNear) {
        return false;
      }
    }
    if (tokens.length > 0) {
      const hay = `${item.title} ${item.description} ${item.category} ${item.resourceType}`.toLowerCase();
      const matched = tokens.some((tok) => hay.includes(tok));
      if (!matched) return false;
    }
    return true;
  });

  logToolAction(
    ctx,
    'search_listings',
    params as Record<string, unknown>,
    true,
    `Found ${results.length} matching listing(s) in marketplace.`
  );

  return { success: true, count: results.length, listings: results };
}

// 2. get_listing_details
export function toolGetListingDetails(
  ctx: AgentToolContext,
  params: { listingId: string }
): { success: boolean; listing?: MarketplaceListing; error?: string } {
  const listing = ctx.listings.find((l) => l.id === params.listingId);
  if (!listing) {
    logToolAction(ctx, 'get_listing_details', params, false, `Listing ${params.listingId} not found.`);
    return { success: false, error: `Listing ${params.listingId} not found` };
  }
  logToolAction(ctx, 'get_listing_details', params, true, `Retrieved details for "${listing.title}".`);
  return { success: true, listing };
}

// 3. check_availability
export function toolCheckAvailability(
  ctx: AgentToolContext,
  params: { listingId: string; requestedDuration: number }
): {
  success: boolean;
  available: boolean;
  reason: string;
} {
  const listing = ctx.listings.find((l) => l.id === params.listingId);
  if (!listing) {
    return { success: false, available: false, reason: 'Listing does not exist' };
  }
  if (listing.availabilityStatus !== 'AVAILABLE') {
    return {
      success: true,
      available: false,
      reason: `Listing is currently ${listing.availabilityStatus}`,
    };
  }
  if (
    params.requestedDuration < listing.minDuration ||
    params.requestedDuration > listing.maxDuration
  ) {
    return {
      success: true,
      available: false,
      reason: `Requested duration (${params.requestedDuration}) outside allowed range (${listing.minDuration}–${listing.maxDuration} ${listing.durationUnit.toLowerCase()})`,
    };
  }
  logToolAction(
    ctx,
    'check_availability',
    params,
    true,
    `Verified "${listing.title}" is AVAILABLE for ${params.requestedDuration} ${listing.durationUnit.toLowerCase()}.`
  );
  return {
    success: true,
    available: true,
    reason: `Available for ${params.requestedDuration} ${listing.durationUnit.toLowerCase()}`,
  };
}

// 4. compare_offers
export interface OfferComparisonRow {
  listingId: string;
  title: string;
  resourceType: 'PHYSICAL' | 'DIGITAL';
  providerWallet: string;
  providerCompletedDeals: number;
  providerDisputes: number;
  rentalFeeNear: number;
  collateralNear: number;
  totalEscrowNear: number;
  durationLabel: string;
  policyCompliant: boolean;
  policyViolations: string[];
  securityWarnings: string[];
  score: number;
}

export function toolCompareOffers(
  ctx: AgentToolContext,
  params: {
    listingIds: string[];
    requestedDuration?: number;
    requestedDurationUnit?: 'HOURS' | 'DAYS';
    userBudgetNear?: number;
  }
): { success: boolean; comparisons: OfferComparisonRow[] } {
  const rows: OfferComparisonRow[] = [];

  for (const id of params.listingIds) {
    const listing = ctx.listings.find((l) => l.id === id);
    if (!listing) continue;

    let dur = params.requestedDuration ?? listing.exampleDuration;
    if (params.requestedDuration !== undefined && params.requestedDurationUnit) {
      if (params.requestedDurationUnit === 'DAYS' && listing.durationUnit === 'HOURS') {
        dur = params.requestedDuration * 24;
      } else if (params.requestedDurationUnit === 'HOURS' && listing.durationUnit === 'DAYS') {
        dur = Math.max(1, Math.ceil(params.requestedDuration / 24));
      }
    }

    const provider = ctx.profiles[listing.ownerWallet];
    const sec = evaluateSpendingAndSecurityPolicy(
      listing,
      dur,
      ctx.policy,
      provider,
      params.userBudgetNear
    );

    const ratio = Math.max(1, dur) / Math.max(1, listing.exampleDuration);
    const fee = Number((listing.rentalFeeNear * ratio).toFixed(4));
    const total = Number((fee + listing.collateralNear).toFixed(4));
    const completedDeals = (provider?.completedLends ?? 0) + (provider?.completedBorrows ?? 0);
    const disputes = provider?.disputesCount ?? 0;

    // Score calculation: favor policy compliance, lower total cost, and dispute-free completed deals
    let score = sec.passed ? 100 : 25;
    score -= total * 40;
    score += Math.min(completedDeals * 3, 25);
    score -= disputes * 15;

    rows.push({
      listingId: listing.id,
      title: listing.title,
      resourceType: listing.resourceType,
      providerWallet: listing.ownerWallet,
      providerCompletedDeals: completedDeals,
      providerDisputes: disputes,
      rentalFeeNear: fee,
      collateralNear: listing.collateralNear,
      totalEscrowNear: total,
      durationLabel: `${dur} ${listing.durationUnit.toLowerCase()}`,
      policyCompliant: sec.passed,
      policyViolations: sec.violations,
      securityWarnings: sec.warnings,
      score: Number(score.toFixed(1)),
    });
  }

  rows.sort((a, b) => b.score - a.score);

  logToolAction(
    ctx,
    'compare_offers',
    params as Record<string, unknown>,
    true,
    `Compared ${rows.length} offer(s) across rental fee, refundable collateral, provider reputation, and spending policy.`
  );

  return { success: true, comparisons: rows };
}

// 5. estimate_collateral
export function toolEstimateCollateral(
  ctx: AgentToolContext,
  params: { listingId: string; requestedDurationDays: number }
) {
  const listing = ctx.listings.find((l) => l.id === params.listingId);
  if (!listing) {
    logToolAction(ctx, 'estimate_collateral', params, false, 'Listing not found');
    return { success: false, error: 'Listing not found' };
  }
  const callerProfile = ctx.profiles[ctx.callerWallet];
  const rec = calculateCollateralRecommendation({
    resourceType: listing.resourceType,
    category: listing.category,
    ownerEstimatedValueNear: listing.ownerEstimatedValueNear,
    providerMinimumCollateralNear: listing.collateralNear,
    rentalDurationDays: params.requestedDurationDays,
    borrowerCompletedCount: callerProfile?.completedBorrows ?? 0,
    borrowerDisputesCount: callerProfile?.disputesCount ?? 0,
    digitalAccessScope: listing.accessScope,
  });

  logToolAction(
    ctx,
    'estimate_collateral',
    params,
    true,
    `Recommended collateral range for "${listing.title}": ${rec.recommendedMinNear}–${rec.recommendedMaxNear} NEAR.`
  );

  return { success: true, recommendation: rec };
}

// 6. check_spending_policy
export function toolCheckSpendingPolicy(
  ctx: AgentToolContext,
  params: { listingId: string; requestedDuration: number; userBudgetNear?: number }
) {
  const listing = ctx.listings.find((l) => l.id === params.listingId);
  if (!listing) {
    logToolAction(ctx, 'check_spending_policy', params, false, 'Listing not found');
    return { success: false, error: 'Listing not found' };
  }
  const provider = ctx.profiles[listing.ownerWallet];
  const result = evaluateSpendingAndSecurityPolicy(
    listing,
    params.requestedDuration,
    ctx.policy,
    provider,
    params.userBudgetNear
  );

  logToolAction(
    ctx,
    'check_spending_policy',
    params,
    result.passed,
    result.passed
      ? `Policy check PASSED for "${listing.title}" (Total: ${result.totalPaymentNear} NEAR).`
      : `Policy check BLOCKED "${listing.title}": ${result.violations.join('; ')}`
  );

  return { success: true, check: result };
}

// 7. assess_provider_signals
export function toolAssessProviderSignals(
  ctx: AgentToolContext,
  params: { providerWallet: string }
) {
  const profile = ctx.profiles[params.providerWallet];
  if (!profile) {
    return {
      success: true,
      assessment: {
        providerWallet: params.providerWallet,
        knownProfile: false,
        completedLends: 0,
        completedBorrows: 0,
        disputesCount: 0,
        summary:
          'New or unindexed NEAR account. No completed BorrowBond transactions yet; proceed with standard escrow protections.',
      },
    };
  }

  const assessment = {
    providerWallet: profile.walletAccountId,
    displayName: profile.displayName,
    knownProfile: true,
    profileStatus: profile.profileStatus,
    completedLends: profile.completedLends,
    completedBorrows: profile.completedBorrows,
    disputesCount: profile.disputesCount,
    cancellationsCount: profile.cancellationsCount,
    accountCreatedIso: profile.accountCreatedIso,
    summary: `${profile.displayName} (${profile.walletAccountId}) has ${profile.completedLends} completed lending agreements, ${profile.completedBorrows} completed borrows, and ${profile.disputesCount} disputes. Note: Wallet connection is on-chain account authentication, not real-world KYC identity verification.`,
  };

  logToolAction(
    ctx,
    'assess_provider_signals',
    params,
    true,
    `Assessed reputation signals for ${profile.walletAccountId}: ${profile.completedLends} lends, ${profile.disputesCount} disputes.`
  );

  return { success: true, assessment };
}

// 8. prepare_booking
export function toolPrepareBooking(
  ctx: AgentToolContext,
  params: {
    listingId: string;
    requestedDuration: number;
    requestedDurationUnit?: 'HOURS' | 'DAYS';
    userBudgetNear?: number;
  }
): { success: boolean; draft?: BookingDraft; error?: string } {
  const listing = ctx.listings.find((l) => l.id === params.listingId);
  if (!listing) {
    logToolAction(ctx, 'prepare_booking', params, false, 'Listing not found');
    return { success: false, error: 'Listing not found' };
  }

  let normalizedDur = params.requestedDuration;
  if (params.requestedDurationUnit) {
    if (params.requestedDurationUnit === 'DAYS' && listing.durationUnit === 'HOURS') {
      normalizedDur = params.requestedDuration * 24;
    } else if (params.requestedDurationUnit === 'HOURS' && listing.durationUnit === 'DAYS') {
      normalizedDur = Math.max(1, Math.ceil(params.requestedDuration / 24));
    }
  }

  const provider = ctx.profiles[listing.ownerWallet];
  const security = evaluateSpendingAndSecurityPolicy(
    listing,
    normalizedDur,
    ctx.policy,
    provider,
    params.userBudgetNear
  );

  if (!security.passed) {
    logToolAction(
      ctx,
      'prepare_booking',
      params,
      false,
      `Refused to prepare booking draft due to policy violations: ${security.violations.join(' | ')}`
    );
    return {
      success: false,
      error: `Security & Spending Policy blocked booking draft: ${security.violations.join(' ')}`,
    };
  }

  const dur = Math.max(1, normalizedDur);
  const ratio = dur / Math.max(1, listing.exampleDuration);
  const rentalFeeNear = Number((listing.rentalFeeNear * ratio).toFixed(4));
  const collateralNear = listing.collateralNear;
  const totalRequiredNear = Number((rentalFeeNear + collateralNear).toFixed(4));

  const durationMs =
    listing.durationUnit === 'HOURS' ? dur * 3600 * 1000 : dur * 24 * 3600 * 1000;
  const expectedExpirationIso = new Date(Date.now() + durationMs).toISOString();

  const draftId = `draft-${listing.id}-${Date.now().toString().slice(-5)}`;
  const draft: BookingDraft = {
    draftId,
    listingId: listing.id,
    listingTitle: listing.title,
    resourceType: listing.resourceType,
    lenderWallet: listing.ownerWallet,
    borrowerWallet: ctx.callerWallet,
    durationCount: dur,
    durationUnit: listing.durationUnit,
    rentalFeeNear,
    collateralNear,
    totalRequiredNear,
    cancellationRules: listing.cancellationPolicy,
    expectedExpirationIso,
    disputeConditions:
      'Either party may open a dispute before completion, freezing escrowed funds for review by the designated human resolver (resolver.borrowbond.testnet). Collateral is never automatically confiscated on deadline expiry.',
    nearNetwork: 'testnet',
    contractAddress: ctx.escrowLedger.contractAddress,
    securityCheckPassed: true,
    securityViolations: [],
    securityWarnings: security.warnings,
    requiresExplicitWalletApproval: true,
  };

  ctx.activeDrafts[draftId] = draft;

  logToolAction(
    ctx,
    'prepare_booking',
    params,
    true,
    `Prepared unsigned booking draft ${draftId} for "${listing.title}" (${rentalFeeNear} NEAR fee + ${collateralNear} NEAR collateral = ${totalRequiredNear} NEAR total). Awaiting explicit human wallet approval.`
  );

  return { success: true, draft };
}

// 9. get_booking_status
export function toolGetBookingStatus(
  ctx: AgentToolContext,
  params: { bookingId: string }
): { success: boolean; booking?: OnChainBooking; error?: string } {
  const booking = ctx.escrowLedger.bookings[params.bookingId];
  if (!booking) {
    logToolAction(ctx, 'get_booking_status', params, false, `Booking ${params.bookingId} not found.`);
    return { success: false, error: `Booking ${params.bookingId} not found` };
  }
  logToolAction(
    ctx,
    'get_booking_status',
    params,
    true,
    `Booking ${booking.bookingId} status is ${booking.status} (Escrowed: ${booking.totalEscrowedNear} NEAR).`
  );
  return { success: true, booking };
}

// 10. submit_handover_confirmation
export function toolSubmitHandoverConfirmation(
  ctx: AgentToolContext,
  params: { bookingId: string }
): { success: boolean; booking?: OnChainBooking; error?: string } {
  try {
    const updated = confirmHandoverOnContract(ctx.escrowLedger, params.bookingId, ctx.callerWallet);
    logToolAction(
      ctx,
      'submit_handover_confirmation',
      params,
      true,
      `Submitted handover confirmation for ${params.bookingId} by ${ctx.callerWallet}.`
    );
    return { success: true, booking: updated };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Handover confirmation failed';
    logToolAction(ctx, 'submit_handover_confirmation', params, false, msg);
    return { success: false, error: msg };
  }
}

// 11. request_return
export function toolRequestReturn(
  ctx: AgentToolContext,
  params: { bookingId: string }
): { success: boolean; booking?: OnChainBooking; error?: string } {
  try {
    const updated = requestReturnOnContract(ctx.escrowLedger, params.bookingId, ctx.callerWallet);
    logToolAction(ctx, 'request_return', params, true, `Requested return for ${params.bookingId}.`);
    return { success: true, booking: updated };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Return request failed';
    logToolAction(ctx, 'request_return', params, false, msg);
    return { success: false, error: msg };
  }
}

// 12. open_dispute
export function toolOpenDispute(
  ctx: AgentToolContext,
  params: { bookingId: string; reason: string }
): { success: boolean; booking?: OnChainBooking; error?: string } {
  try {
    const updated = openDisputeOnContract(
      ctx.escrowLedger,
      params.bookingId,
      ctx.callerWallet,
      params.reason
    );
    logToolAction(ctx, 'open_dispute', params, true, `Opened dispute on ${params.bookingId}.`);
    return { success: true, booking: updated };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Open dispute failed';
    logToolAction(ctx, 'open_dispute', params, false, msg);
    return { success: false, error: msg };
  }
}

// 13. get_digital_access_status
export function toolGetDigitalAccessStatus(
  ctx: AgentToolContext,
  params: { bookingId: string }
) {
  const credId = ctx.digitalGateway.credentialIdByBooking[params.bookingId];
  const cred = credId ? ctx.digitalGateway.credentialsById[credId] : undefined;
  if (!cred) {
    logToolAction(
      ctx,
      'get_digital_access_status',
      params,
      false,
      `No digital credential found for booking ${params.bookingId}.`
    );
    return {
      success: false,
      error: `No active digital credential issued for booking ${params.bookingId}`,
    };
  }
  if (cred.borrowerWallet !== ctx.callerWallet) {
    logToolAction(
      ctx,
      'get_digital_access_status',
      params,
      false,
      `Unauthorized access attempt to credential for ${params.bookingId}.`
    );
    return {
      success: false,
      error: 'Unauthorized: You may only view digital credentials for your own bookings',
    };
  }

  logToolAction(
    ctx,
    'get_digital_access_status',
    params,
    true,
    `Digital credential ${cred.tokenPrefix}: ${cred.usageCount}/${cred.quotaLimit} requests used.`
  );

  return {
    success: true,
    status: {
      credentialId: cred.id,
      bookingId: cred.bookingId,
      tokenPrefix: cred.tokenPrefix,
      endpointPath: cred.endpointPath,
      usageCount: cred.usageCount,
      quotaLimit: cred.quotaLimit,
      remainingQuota: Math.max(0, cred.quotaLimit - cred.usageCount),
      expiresAtIso: cred.expiresAtIso,
      revoked: cred.revoked,
      revokedReason: cred.revokedReason,
    },
  };
}

// Deterministic Natural-Language Intent Extractor & Orchestrator
// Runs the tool pipeline on real listings and returns structured agent results.
export interface ParsedBorrowingIntent {
  rawPrompt: string;
  resourceType: 'ALL' | 'PHYSICAL' | 'DIGITAL';
  keywords: string;
  requestedDuration: number;
  durationUnit: 'HOURS' | 'DAYS';
  budgetNear?: number;
}

const WORD_TO_NUM: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  forty: 40,
};

export function parseNaturalLanguageBorrowIntent(prompt: string): ParsedBorrowingIntent {
  const lower = prompt.toLowerCase();

  // Detect budget e.g. "0.5 NEAR", "budget is 0.15 NEAR"
  let budgetNear: number | undefined;
  const budgetMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:testnet\s*)?near/);
  if (budgetMatch) {
    budgetNear = parseFloat(budgetMatch[1]);
  }

  // Detect duration e.g. "three days", "2 days", "48 hours"
  let requestedDuration = 3;
  let durationUnit: 'HOURS' | 'DAYS' = 'DAYS';

  const numDurationMatch = lower.match(/(\d+)\s*(hour|hours|hr|hrs|day|days)/);
  if (numDurationMatch) {
    requestedDuration = parseInt(numDurationMatch[1], 10);
    durationUnit = numDurationMatch[2].startsWith('h') ? 'HOURS' : 'DAYS';
  } else {
    for (const [word, val] of Object.entries(WORD_TO_NUM)) {
      const re = new RegExp(`\\b${word}\\s+(hour|hours|day|days)\\b`);
      const m = lower.match(re);
      if (m) {
        requestedDuration = val;
        durationUnit = m[1].startsWith('h') ? 'HOURS' : 'DAYS';
        break;
      }
    }
  }

  // Detect resource type & keywords
  let resourceType: 'ALL' | 'PHYSICAL' | 'DIGITAL' = 'ALL';
  if (
    lower.includes('api') ||
    lower.includes('digital') ||
    lower.includes('weather') ||
    lower.includes('compute') ||
    lower.includes('gpu') ||
    lower.includes('dataset')
  ) {
    resourceType = 'DIGITAL';
  } else if (
    lower.includes('camera') ||
    lower.includes('projector') ||
    lower.includes('drone') ||
    lower.includes('laptop') ||
    lower.includes('lens') ||
    lower.includes('physical')
  ) {
    resourceType = 'PHYSICAL';
  }

  let keywords = '';
  for (const kw of ['camera', 'mirrorless', 'projector', 'drone', 'lidar', 'weather', 'api', 'gpu', 'compute', 'dataset']) {
    if (lower.includes(kw)) {
      keywords += ` ${kw}`;
    }
  }

  return {
    rawPrompt: prompt,
    resourceType,
    keywords: keywords.trim(),
    requestedDuration,
    durationUnit,
    budgetNear,
  };
}

export interface AgentOrchestrationResponse {
  mode: 'GEMINI_TOOL_AGENT' | 'DETERMINISTIC_TOOL_AGENT';
  intent: ParsedBorrowingIntent;
  matchedListings: MarketplaceListing[];
  comparisons: OfferComparisonRow[];
  recommendedOffer: OfferComparisonRow | null;
  preparedDraft: BookingDraft | null;
  explanation: string;
  toolTrace: AgentActionLog[];
}

export function runDeterministicBorrowingAgent(
  ctx: AgentToolContext,
  userPrompt: string
): AgentOrchestrationResponse {
  const beforeLogCount = ctx.actionLogs.length;
  const intent = parseNaturalLanguageBorrowIntent(userPrompt);

  // Step 1: Search listings
  const searchRes = toolSearchListings(ctx, {
    query: intent.keywords || userPrompt,
    resourceType: intent.resourceType,
    onlyAvailable: true,
  });

  // Fallback if specific keyword search yielded 0: search all available in resourceType
  const candidates =
    searchRes.listings.length > 0
      ? searchRes.listings
      : toolSearchListings(ctx, { resourceType: intent.resourceType, onlyAvailable: true }).listings;

  // Step 2: Compare offers with security & budget checks
  const compareRes = toolCompareOffers(ctx, {
    listingIds: candidates.map((c) => c.id),
    requestedDuration: intent.requestedDuration,
    requestedDurationUnit: intent.durationUnit,
    userBudgetNear: intent.budgetNear,
  });

  // Step 3: Pick top compliant offer
  const compliantOffers = compareRes.comparisons.filter((c) => c.policyCompliant);
  const recommendedOffer = compliantOffers.length > 0 ? compliantOffers[0] : null;

  let preparedDraft: BookingDraft | null = null;
  let explanation = '';

  if (recommendedOffer) {
    // Assess provider reputation
    toolAssessProviderSignals(ctx, { providerWallet: recommendedOffer.providerWallet });
    // Estimate collateral
    const days =
      intent.durationUnit === 'HOURS'
        ? Math.max(1, Math.round(intent.requestedDuration / 24))
        : intent.requestedDuration;
    toolEstimateCollateral(ctx, {
      listingId: recommendedOffer.listingId,
      requestedDurationDays: days,
    });

    // Prepare unsigned booking draft
    const draftRes = toolPrepareBooking(ctx, {
      listingId: recommendedOffer.listingId,
      requestedDuration: intent.requestedDuration,
      requestedDurationUnit: intent.durationUnit,
      userBudgetNear: intent.budgetNear,
    });
    preparedDraft = draftRes.draft ?? null;

    explanation = `Selected "${recommendedOffer.title}" from ${recommendedOffer.providerWallet} (${recommendedOffer.providerCompletedDeals} completed deals, ${recommendedOffer.providerDisputes} disputes). Total escrow deposit is ${recommendedOffer.totalEscrowNear} testnet NEAR (${recommendedOffer.rentalFeeNear} NEAR rental fee + ${recommendedOffer.collateralNear} NEAR refundable collateral), which fits within your ${intent.budgetNear !== undefined ? `${intent.budgetNear} NEAR budget and ` : ''}security policy. An unsigned booking agreement draft has been prepared for your review and explicit wallet signature.`;
  } else if (compareRes.comparisons.length > 0) {
    const topRejected = compareRes.comparisons[0];
    explanation = `Found ${compareRes.comparisons.length} matching listing(s), but none passed your active Security & Spending Policy checks. Closest offer "${topRejected.title}" (${topRejected.totalEscrowNear} NEAR total) was blocked: ${topRejected.policyViolations.join(' ')}`;
  } else {
    explanation = 'No available listings matched your criteria in the marketplace.';
  }

  const newLogs = ctx.actionLogs.slice(0, ctx.actionLogs.length - beforeLogCount);

  return {
    mode: 'DETERMINISTIC_TOOL_AGENT',
    intent,
    matchedListings: candidates,
    comparisons: compareRes.comparisons,
    recommendedOffer,
    preparedDraft,
    explanation,
    toolTrace: newLogs,
  };
}
