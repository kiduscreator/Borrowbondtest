# BorrowBond System Architecture

## 1. High-Level Overview

BorrowBond connects five modular layers:

1. **Frontend Client (`src/views/*`, `src/components/*`)**: React 19 + TypeScript + Tailwind CSS v4 interface adhering to a high-contrast dark fintech aesthetic (`#0B1020` canvas, `#121B2C` elevated surface, `#172338` card surface, `#5EEAD4` electric teal, `#8297FF` secondary blue).
2. **AI Borrowing Agent (`src/lib/ai/agentTools.ts` & `/api/agent/assist`)**: Server-side tool-calling orchestrator powered by `@google/genai` (`gemini-3.8-flash`) with a deterministic tool pipeline fallback when `GEMINI_API_KEY` is not set.
3. **AI Security & Policy Engine (`src/lib/security/policyEngine.ts`)**: Deterministic validator that checks `maxRentalFeeNear`, `maxCollateralNear`, `maxTotalPaymentNear`, `maxDurationDays`, and `allowedCategories`, while sanitizing untrusted listing descriptions against prompt-injection directives.
4. **NEAR Programmable Escrow (`contracts/borrowbond/src/lib.rs` & `src/lib/near/escrowStateMachine.ts`)**: Enforces exact deposit attachment (`rental_fee + collateral`), state transitions, dispute freezes, and claimable balance withdrawals.
5. **Controlled Digital Access Gateway (`src/lib/digital/accessGateway.ts` & `/api/demo-resource/weather`)**: Issues temporary bearer tokens only after verifying `ACTIVE` booking status, stores only HMAC-SHA256 token hashes, and enforces request quotas and expiration timestamps.

## 2. Booking State Machine

```text
REQUESTED ──(lender accepts: physical)──► ACCEPTED ──(both confirm handover)──► ACTIVE
REQUESTED ──(provider accepts: digital)───────────────────────────────────────► ACTIVE
REQUESTED ──(cancelled before accept)───► CANCELLED (100% refunded to borrower)
REQUESTED ──(deadline passed)───────────► EXPIRED   (100% refunded to borrower)

ACTIVE ─────(borrower requests return)──► RETURN_REQUESTED ──(lender confirms)─► COMPLETED
ACTIVE / RETURN_REQUESTED ──(either opens dispute)──► DISPUTED ──(resolver)────► RESOLVED
```

## 3. Database Schema (`supabase/migrations/001_borrowbond_schema.sql`)

Includes 11 relational tables with PostgreSQL Row-Level Security (RLS) enabled:
- `profiles`
- `listings`
- `bookings`
- `booking_evidence`
- `disputes`
- `reviews`
- `spending_policies`
- `digital_access_credentials`
- `digital_usage_events`
- `agent_sessions` & `agent_actions`
- `notifications`
