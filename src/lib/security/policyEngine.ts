// Deterministic AI Security Policy Engine, Prompt-Injection Sanitizer,
// and Transparent Collateral & Reputation Recommendation Engine.

export interface SpendingPolicy {
  walletAccountId: string;
  maxRentalFeeNear: number;
  maxCollateralNear: number;
  maxTotalPaymentNear: number;
  allowedCategories: string[];
  maxDurationDays: number;
  approvedProviders: string[];
  excludedProviders: string[];
  requireManualWalletConfirmation: boolean;
}

export interface ProviderProfile {
  walletAccountId: string;
  displayName: string;
  bio: string;
  profileStatus: 'WALLET_CONNECTED' | 'COMMUNITY_MEMBER';
  completedBorrows: number;
  completedLends: number;
  disputesCount: number;
  cancellationsCount: number;
  accountCreatedIso: string;
}

export interface MarketplaceListing {
  id: string;
  ownerWallet: string;
  ownerDisplayName: string;
  resourceType: 'PHYSICAL' | 'DIGITAL';
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  rentalFeeNear: number;
  collateralNear: number;
  durationUnit: 'HOURS' | 'DAYS';
  exampleDuration: number;
  minDuration: number;
  maxDuration: number;
  availabilityStatus: 'AVAILABLE' | 'RENTED' | 'PAUSED';
  conditions: string;
  cancellationPolicy: string;
  borrowerRequirements: string;
  isDemoSeed: boolean;
  createdAtIso: string;
  // Physical fields
  ownerEstimatedValueNear?: number;
  itemCondition?: string;
  includedAccessories?: string[];
  pickupReturnInstructions?: string;
  handoverProcedure?: string;
  // Digital fields
  digitalServiceType?: string;
  accessScope?: string;
  usageQuotaRequests?: number;
  expirationBehavior?: string;
  technicalRequirements?: string;
  demoEndpointRef?: string;
  licensingRestrictions?: string;
}

export interface SecurityCheckResult {
  passed: boolean;
  requiresHumanWalletSignature: true; // Always true: AI never auto-signs
  totalPaymentNear: number;
  normalizedDurationDays: number;
  violations: string[];
  warnings: string[];
  promptInjectionDetected: boolean;
  sanitizedDescription: string;
}

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /override\s+(spending|security|budget|policy)/i,
  /system\s*prompt/i,
  /auto[-\s]?approve/i,
  /bypass\s+(escrow|collateral|verification|wallet)/i,
  /transfer\s+all\s+funds/i,
  /do\s+not\s+check\s+policy/i,
];

export function sanitizeUntrustedListingText(rawText: string): {
  sanitized: string;
  injectionFlagged: boolean;
} {
  let injectionFlagged = false;
  let sanitized = rawText;

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      injectionFlagged = true;
      sanitized = sanitized.replace(pattern, '[REDACTED_UNTRUSTED_DIRECTIVE]');
    }
  }

  return { sanitized, injectionFlagged };
}

export function evaluateSpendingAndSecurityPolicy(
  listing: MarketplaceListing,
  requestedDuration: number,
  policy: SpendingPolicy,
  provider: ProviderProfile | undefined,
  userBudgetOverrideNear?: number
): SecurityCheckResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Calculate fee and total cost
  // Note: listing.rentalFeeNear is for listing.exampleDuration (or per unit if specified)
  const durationRatio = Math.max(1, requestedDuration) / Math.max(1, listing.exampleDuration);
  const effectiveRentalFeeNear = Number((listing.rentalFeeNear * durationRatio).toFixed(4));
  const totalPaymentNear = Number((effectiveRentalFeeNear + listing.collateralNear).toFixed(4));

  const normalizedDurationDays =
    listing.durationUnit === 'HOURS'
      ? Number((requestedDuration / 24).toFixed(2))
      : requestedDuration;

  const { sanitized, injectionFlagged } = sanitizeUntrustedListingText(
    `${listing.title} ${listing.description} ${listing.conditions}`
  );

  if (injectionFlagged) {
    violations.push(
      'Listing text contains suspicious instruction-override phrasing (potential prompt injection). Blocked from automated recommendation.'
    );
  }

  if (listing.availabilityStatus !== 'AVAILABLE') {
    violations.push(`Listing is currently ${listing.availabilityStatus} and not available for immediate booking.`);
  }

  if (requestedDuration < listing.minDuration || requestedDuration > listing.maxDuration) {
    violations.push(
      `Requested duration (${requestedDuration} ${listing.durationUnit.toLowerCase()}) is outside listing bounds (${listing.minDuration}–${listing.maxDuration} ${listing.durationUnit.toLowerCase()}).`
    );
  }

  if (effectiveRentalFeeNear > policy.maxRentalFeeNear) {
    violations.push(
      `Rental fee (${effectiveRentalFeeNear} NEAR) exceeds your maximum rental fee policy (${policy.maxRentalFeeNear} NEAR).`
    );
  }

  if (listing.collateralNear > policy.maxCollateralNear) {
    violations.push(
      `Required collateral (${listing.collateralNear} NEAR) exceeds your maximum collateral policy (${policy.maxCollateralNear} NEAR).`
    );
  }

  const effectiveMaxTotal =
    userBudgetOverrideNear !== undefined
      ? Math.min(policy.maxTotalPaymentNear, userBudgetOverrideNear)
      : policy.maxTotalPaymentNear;

  if (totalPaymentNear > effectiveMaxTotal) {
    violations.push(
      `Total required deposit (${totalPaymentNear} NEAR = ${effectiveRentalFeeNear} NEAR fee + ${listing.collateralNear} NEAR collateral) exceeds budget limit (${effectiveMaxTotal} NEAR).`
    );
  }

  if (
    policy.allowedCategories.length > 0 &&
    !policy.allowedCategories.includes(listing.category)
  ) {
    violations.push(`Category "${listing.category}" is not in your permitted categories list.`);
  }

  if (normalizedDurationDays > policy.maxDurationDays) {
    violations.push(
      `Requested duration (${normalizedDurationDays} days) exceeds policy maximum (${policy.maxDurationDays} days).`
    );
  }

  if (policy.excludedProviders.includes(listing.ownerWallet)) {
    violations.push(`Provider ${listing.ownerWallet} is on your excluded providers list.`);
  }

  // Warnings & Reputation signals (without unfairly penalizing new users as scammers)
  if (!provider || (provider.completedLends === 0 && provider.completedBorrows === 0)) {
    warnings.push(
      'Provider has no prior completed on-chain transactions on BorrowBond. New providers are not automatically untrustworthy, but verify handover evidence carefully.'
    );
  } else if (provider.disputesCount > 0) {
    warnings.push(
      `Provider has ${provider.disputesCount} historical dispute(s) across ${provider.completedLends + provider.completedBorrows} completed transactions.`
    );
  }

  if (listing.resourceType === 'PHYSICAL' && listing.ownerEstimatedValueNear) {
    if (listing.collateralNear > listing.ownerEstimatedValueNear * 1.1) {
      warnings.push(
        `Requested collateral (${listing.collateralNear} NEAR) is higher than the owner-provided estimated value (${listing.ownerEstimatedValueNear} NEAR).`
      );
    }
  }

  if (listing.resourceType === 'DIGITAL' && listing.accessScope?.toLowerCase().includes('admin')) {
    warnings.push(
      'Digital resource mentions broad/admin scope. Prefer read-only or least-privilege scoped endpoints.'
    );
  }

  if (!listing.conditions || listing.conditions.trim().length < 15) {
    warnings.push('Listing has brief terms and conditions; clarify return expectations before signing.');
  }

  return {
    passed: violations.length === 0,
    requiresHumanWalletSignature: true,
    totalPaymentNear,
    normalizedDurationDays,
    violations,
    warnings,
    promptInjectionDetected: injectionFlagged,
    sanitizedDescription: sanitized,
  };
}

export interface CollateralRecommendationInput {
  resourceType: 'PHYSICAL' | 'DIGITAL';
  category: string;
  ownerEstimatedValueNear?: number;
  providerMinimumCollateralNear: number;
  rentalDurationDays: number;
  borrowerCompletedCount: number;
  borrowerDisputesCount: number;
  digitalAccessScope?: string;
}

export interface CollateralRecommendationOutput {
  recommendedMinNear: number;
  recommendedMaxNear: number;
  suggestedPointNear: number;
  factors: string[];
  explanation: string;
  disclaimer: string;
}

export function calculateCollateralRecommendation(
  input: CollateralRecommendationInput
): CollateralRecommendationOutput {
  const factors: string[] = [];
  let baseNear = input.providerMinimumCollateralNear;

  if (input.resourceType === 'PHYSICAL') {
    const refVal = input.ownerEstimatedValueNear ?? input.providerMinimumCollateralNear * 1.25;
    baseNear = Math.max(input.providerMinimumCollateralNear, Number((refVal * 0.65).toFixed(3)));
    factors.push(
      `Owner-provided estimated value (${refVal} testnet NEAR) sets baseline physical replacement buffer.`
    );
  } else {
    baseNear = Math.max(input.providerMinimumCollateralNear, 0.03);
    factors.push(
      'Digital resource uses server-enforced quota and automatic token expiration, requiring lower collateral than physical hardware.'
    );
    if (input.digitalAccessScope?.toLowerCase().includes('write')) {
      baseNear = Number((baseNear * 1.35).toFixed(3));
      factors.push('Write-enabled API scope increases rate-limit abuse buffer (+35%).');
    }
  }

  if (input.rentalDurationDays > 3) {
    baseNear = Number((baseNear * 1.15).toFixed(3));
    factors.push(`Extended borrowing duration (${input.rentalDurationDays} days) adds +15% duration buffer.`);
  }

  if (input.borrowerCompletedCount >= 3 && input.borrowerDisputesCount === 0) {
    factors.push(
      `Borrower has ${input.borrowerCompletedCount} dispute-free completed agreements (supports lower bound of range).`
    );
  } else if (input.borrowerDisputesCount > 0) {
    baseNear = Number((baseNear * 1.25).toFixed(3));
    factors.push(`Borrower has ${input.borrowerDisputesCount} prior dispute(s) (+25% caution buffer).`);
  } else {
    factors.push('First-time or new account history: standard baseline collateral applies.');
  }

  const recommendedMinNear = Number(Math.max(input.providerMinimumCollateralNear, baseNear * 0.85).toFixed(3));
  const recommendedMaxNear = Number(Math.max(recommendedMinNear + 0.02, baseNear * 1.25).toFixed(3));
  const suggestedPointNear = Number(((recommendedMinNear + recommendedMaxNear) / 2).toFixed(3));

  return {
    recommendedMinNear,
    recommendedMaxNear,
    suggestedPointNear,
    factors,
    explanation: `Based on ${input.resourceType.toLowerCase()} resource risk profile, provider minimum (${input.providerMinimumCollateralNear} NEAR), and transaction history, a refundable collateral between ${recommendedMinNear} and ${recommendedMaxNear} testnet NEAR balances borrower accessibility with provider security.`,
    disclaimer:
      'Advisory recommendation only — not insurance, a valuation appraisal, or a guarantee against loss. The lender sets acceptable terms and the borrower explicitly accepts or rejects them.',
  };
}
