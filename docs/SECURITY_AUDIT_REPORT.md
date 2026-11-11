# BorrowBond Complete Security Audit, Threat Model & Escrow V2 Hardening Report

> **Disclosure**: This report documents the internal application security audit, Web3/smart-contract security hardening, database Row-Level Security (RLS) architecture, and adversarial test verification performed on BorrowBond. BorrowBond has **not** undergone an independent third-party external security audit.

---

## 1. Threat Model Summary & Trust Boundaries (Section 16.1 & 16.23.1)

### Threat Actors Covered
1. **Unauthenticated Visitors**: Can browse public listings and public country/city metadata, but cannot view private pickup street addresses, phone numbers, bookings, evidence, disputes, or mutate any state.
2. **Authenticated Borrowers & Lenders**: May attempt to manipulate prices, bypass collateral, forge transaction hashes, self-accept damage proposals, or access another user's private contact details before booking acceptance.
3. **Malicious Listing Owners**: May attempt to upload SVG/HTML XSS payloads, list cross-country physical items, or refuse to confirm a legitimate return to freeze borrower collateral.
4. **Compromised Accounts / Wallets**: An attacker with a Google/Email session may attempt to hijack a NEAR wallet already linked to another user, or replay an expired NEP-413 challenge.
5. **Malicious / Compromised Administrators or Arbiters**: Restricted by smart-contract invariants (`fee_bps <= 100`, `damage_deduction <= collateral - platform_fee`, exact conservation of funds `R + C`).
6. **NEAR RPC & Third-Party Service Failures**: Handled via multi-endpoint RPC failover (`https://test.rpc.fastnear.com`, `https://rpc.testnet.near.org`) and callback-safe pull withdrawals (`on_withdraw_complete`) that restore user balances if an on-chain transfer promise fails.

### Eight Explicit Trust Boundaries
1. **Browser Frontend (`src/*`)** $\leftrightarrow$ **Express Backend API (`server.ts`, `server/identity.ts`)**: Protected by `sameOriginGuard` (CSRF protection), `securityHeadersMiddleware` (CSP, `X-Content-Type-Options: nosniff`), HttpOnly HMAC-SHA256 session cookies (`bb_session`), and sliding-window rate limiting.
2. **Express Backend API** $\leftrightarrow$ **Supabase Auth & PostgreSQL (`supabase/migrations/003_*.sql`)**: Enforced via Row-Level Security (RLS) across all 16 tables and separation of public `VITE_SUPABASE_ANON_KEY` from server-only `SUPABASE_SERVICE_ROLE_KEY`.
3. **Frontend Wallet Selector (`src/lib/near/walletSelector.ts`)** $\leftrightarrow$ **NEAR Testnet Wallets (MyNearWallet, Meteor, Sender, Here, Nightly, WalletConnect)**: Pre-signature verification panel displays exact contract receiver, method name, attached deposit in NEAR & yoctoNEAR, 1% platform fee, UTC timestamps, and SHA-256 agreement terms hash before user approval.
4. **Backend Verifier (`src/lib/near/nearRpcVerifier.ts`)** $\leftrightarrow$ **NEAR Testnet JSON-RPC**: Independently verifies account existence, access keys (`view_access_key`), and transaction execution outcomes (`EXPERIMENTAL_tx_status`) without fabricating balances or block numbers on RPC failure.
5. **NEAR Smart Contract (`contracts/borrowbond/src/lib.rs`)**: Enforces caller authorization (`env::predecessor_account_id()`), `U128` JSON boundary serialization, exact deposit checks (`env::attached_deposit() == R + C`), fee cap (`fee_bps <= 100`), mutual damage settlement requiring counterparty signature, 48-hour post-return auto-finalization, and callback-safe withdrawals.

---

## 2. Vulnerabilities Identified & Fixed (Section 15.1 & 16.23.2)

| ID | Severity | Component | Vulnerability Identified | Fix Implemented |
| :--- | :--- | :--- | :--- | :--- |
| **VULN-01** | **CRITICAL** | `server.ts` (`/auth/callback`, `/auth/google-authorize`) | Legacy `/auth/google-authorize` rendered a local HTML fake Google chooser and `/auth/callback` accepted a raw `?email=` query parameter without OAuth code exchange or CSRF `state` verification. | Removed `/auth/google-authorize` and `DEFAULT_GOOGLE_CLIENT_ID`; enforced single-use `issueOAuthStateToken` / `consumeOAuthStateToken`, strict redirect allowlist (`validateAllowedRedirectUri`), and genuine OAuth token exchange. |
| **VULN-02** | **CRITICAL** | `contracts/borrowbond/src/lib.rs` & `escrowStateMachine.ts` | `withdraw_claimable` zeroed `claimable_balances` and issued `Promise::new(caller).transfer(amount)` without a failure callback; if the transfer promise failed on-chain, funds were permanently lost. | Added `PendingWithdrawal` tracking and `#[private] pub fn on_withdraw_complete` callback (`simulateWithdrawalCallbackOnContract` in TS) that restores `claimable_balances[recipient]` if the promise fails. |
| **VULN-03** | **HIGH** | `contracts/borrowbond/src/lib.rs` & `escrowStateMachine.ts` | No post-return timeout existed if a borrower initiated return (`RETURN_REQUESTED`) and the lender became unresponsive, potentially locking borrower collateral indefinitely. | Added a 48-hour lender response deadline (`lender_response_deadline_ns` / `lenderResponseDeadlineIso`) and permissionless `finalize_uncontested_return` so borrower collateral is automatically refunded if uncontested after 48h. |
| **VULN-04** | **HIGH** | `contracts/borrowbond/src/lib.rs` & `escrowStateMachine.ts` | No on-chain mechanism for two-party negotiated damage settlement without full arbiter escalation; risk of unilateral damage claims. | Implemented `propose_damage_settlement`, `accept_damage_proposal`, and `reject_damage_proposal`. Proposals require counterparty signature (`caller != proposer`) and enforce `damage <= collateral - platform_fee`. |
| **VULN-05** | **HIGH** | `server/identity.ts` | Google/Email login was not strictly separated from NEAR wallet ownership, and no registry prevented linking an already-owned NEAR wallet to a second user account. | Implemented `linkWalletToUserIdentity` & `wallet_links` table requiring cryptographic NEP-413 signature proof and blocking reassignment of any wallet already linked to another account. |
| **VULN-06** | **MEDIUM** | `server.ts` & `UnifiedAccountModals.tsx` | When NEAR RPC was unreachable or an account was uncreated, fallback handlers returned fabricated balances (`4.9998 NEAR`), fake block heights (`276819337`), and fake code hashes. | Replaced with `nearRpcVerifier.ts` (`queryNearAccountAndKeysLive`), returning `verifiedOnChain: false` and honest RPC status when an account cannot be verified on-chain. |
| **VULN-07** | **MEDIUM** | `CreateListingWizard.tsx` & `policyEngine.ts` | Create Listing form included a one-click `"Auto-Fill iPhone 18 Pro Max (256/32 Silver)"` preset button, embedded SVG data-URI renders, and hardcoded default prices (`$15` / `$500`). | Removed the iPhone 18 preset button, embedded SVGs, and pre-filled prices. Listing inputs start clean and AI collateral estimation is an explicit optional user action. |
| **VULN-08** | **MEDIUM** | `server/identity.ts` | Listing images and evidence notes lacked strict SVG script / path-traversal validation. | Added `validateListingImageSecurity` and `validateEvidenceSubmissionSecurity` blocking `<script>`, `javascript:`, `onerror=`, `onload=`, executable extensions, and `../` path traversal. |

---

## 3. Authentication & Session Security Controls (Section 16.2 & 16.23.3)

- **Google OAuth & Email Authentication**:
  - Uses cryptographically random, single-use OAuth `state` nonces (`issueOAuthStateToken` / `consumeOAuthStateToken`, 10-minute TTL).
  - Validates redirect URIs against an explicit origin allowlist (`validateAllowedRedirectUri`).
  - Email passwords hashed with `crypto.scryptSync` + 16-byte random salt and verified with `crypto.timingSafeEqual`.
- **Session Management**:
  - Sessions are stored in `HttpOnly`, `SameSite=Lax` (or `SameSite=None; Secure` over HTTPS) cookies signed with HMAC-SHA256 (`SESSION_SECRET`).
  - Logout (`POST /api/auth/logout`) revokes the `sessionId` server-side in `revokedSessionIds` and clears the cookie.
- **Separation of Web2 Auth from Web3 Wallet Ownership**:
  - Signing in with Google or Email authenticates the user profile (`authMethod: 'GOOGLE' | 'EMAIL'`), but does **not** grant ownership of any NEAR wallet until verified via NEP-413 Ed25519 signature + `view_access_key` RPC check (`linkWalletToUserIdentity`).

---

## 4. Wallet & Transaction Security Controls (Section 16.3 & 16.23.4)

- **Allowlisted Contract & Methods (`src/lib/near/nearRpcVerifier.ts`)**:
  - Network is strictly enforced as `testnet`.
  - Allowlisted methods: `create_booking`, `accept_booking`, `cancel_booking`, `expire_unaccepted_booking`, `expire_uncompleted_handover`, `confirm_handover`, `request_return`, `confirm_return`, `finalize_uncontested_return`, `propose_damage_settlement`, `accept_damage_proposal`, `reject_damage_proposal`, `open_dispute`, `resolve_dispute_with_damage_deduction`, `submit_evidence`, `submit_review`, `withdraw_claimable`, `set_platform_fee_config`, `set_paused`.
- **Duplicate & Replay Protection**:
  - Every processed `txHash` is recorded in `ledger.processedTxHashes` and `verified_transactions` (`UNIQUE (tx_hash)`), blocking duplicate transaction hash replay.
- **Pre-Signature Transparency (`src/views/CheckoutView.tsx`)**:
  - Displays Contract Receiver, Method (`create_booking`), Network (`testnet`), Attached Deposit in NEAR & yoctoNEAR, Rental Fee, Collateral, 1% Platform Fee breakdown, UTC Return Window, and SHA-256 Agreement Terms Hash before signing.

---

## 5. Smart-Contract Security Controls & Escrow Accounting Invariant (Section 16.4 & 16.23.5)

Implemented in `contracts/borrowbond/src/lib.rs` (and mirrored in `src/lib/near/escrowStateMachine.ts`):
- **JSON Boundary Safety**: All public yoctoNEAR values use `near_sdk::json_types::U128` strings at JSON boundaries to prevent IEEE-754 53-bit JavaScript integer precision loss.
- **Configurable Platform Fee (Max 1%)**:
  - `fee_bps: u16` capped at `MAX_FEE_BPS = 100` (1.00%).
  - Snapshotted on each booking at creation (`fee_bps_snapshot`) so subsequent fee changes never alter active agreements.
  - Platform fee is `0` when a booking is `CANCELLED` or `EXPIRED` prior to activation.
- **Exact Conservation of Funds Invariant**:
  For every active settlement (normal completion, 48h uncontested auto-finalization, mutual damage acceptance, or arbiter resolution):
  $$\text{Platform Fee } (F) = \left\lfloor \frac{\text{Collateral } (C) \times \text{fee\_bps\_snapshot}}{10000} \right\rfloor$$
  $$0 \le \text{Damage Deduction } (D) \le C - F$$
  $$\text{Borrower Refund } (C - F - D) + \text{Lender Payout } (R + D) + \text{Treasury Payout } (F) = R + C$$
- **Callback-Safe Pull Withdrawals**:
  - `withdraw_claimable` zeroes `claimable_balances[caller]`, creates a `PendingWithdrawal`, and attaches `#[private] pub fn on_withdraw_complete`. If `env::promise_result(0)` fails, `on_withdraw_complete` restores the exact amount to `claimable_balances[caller]`.

---

## 6. Database Row-Level Security (RLS) Policies (Section 16.5 & 16.23.6)

Defined in `supabase/migrations/003_security_hardening_rls_and_escrow_v2.sql` and enforced in `src/lib/database/supabaseClient.ts` (`BORROWBOND_RLS_POLICY_MATRIX` & `evaluateRlsAccess`):

1. `profiles`: Public read of non-sensitive fields; only profile owner can `INSERT`/`UPDATE`; `DELETE` blocked.
2. `profile_contacts`: Private phone/Telegram/WhatsApp visible only to owner or counterparty of an `ACCEPTED`/`ACTIVE`/`RETURN_REQUESTED`/`DISPUTED` booking.
3. `wallet_links`: Read/insert only by authenticated owner with verified NEP-413 signature; `UNIQUE(wallet_account_id)` prevents wallet hijacking.
4. `listings`: Public read of active listings (`city_name`, `region_name`, `country_code`); only `owner_wallet` can create/modify.
5. `listing_images`: Public read; only listing owner can insert/delete (2 to 10 validated images).
6. `listing_private_addresses`: Exact street/building pickup address hidden from public; selectable only by listing owner or accepted booking counterparty.
7. `bookings`: Selectable and updatable only by `borrower_wallet`, `lender_wallet`, or `designated_resolver`.
8. `booking_timeline_events`: Selectable only by booking participants/arbiter; append-only (`UPDATE`/`DELETE` blocked).
9. `booking_evidence`: Selectable and insertable only by booking participants/arbiter; immutable once logged.
10. `damage_proposals`: Selectable by booking participants/arbiter; insertable by proposer (`borrower` or `lender`); updatable only by counterparty (`caller != proposed_by_wallet`).
11. `disputes`: Selectable by booking participants/arbiter; insertable by borrower/lender; resolvable only by `designated_resolver`.
12. `settlements`: Selectable by booking participants/arbiter; append-only ledger record.
13. `reviews`: Publicly readable; insertable once per participant only when booking is `COMPLETED` or `RESOLVED`.
14. `digital_credentials`: Selectable only by booking borrower/lender.
15. `verified_transactions`: Append-only on-chain transaction verification log (`UNIQUE(tx_hash)`).
16. `security_audit_logs`: Append-only security event log; readable only by designated arbiter/admin.

---

## 7. API, File Upload, Privacy & Rate-Limiting Controls (Sections 16.6–16.9 & 16.23.7–8)

- **CSRF & Security Headers**: `sameOriginGuard` blocks cross-origin state-changing requests (`POST`/`PUT`/`PATCH`/`DELETE`), and `securityHeadersMiddleware` sets strict `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy`.
- **Upload & XSS Sanitization**: `validateListingImageSecurity` enforces 2–10 photos, allowlisted protocols/MIME types, and blocks embedded `<script>` or event handlers in SVGs. `validateEvidenceSubmissionSecurity` blocks path traversal (`../`) and script injection.
- **Privacy & Location Gating**: `sanitizePublicListing` strips `pickupAddress` and `structuredAddress.street` from public listings unless `pickupVisibility === 'PUBLIC'` and `publicAddressConfirmed === true`. Counterparty phone numbers are disclosed only after booking status reaches `ACCEPTED`.

---

## 8. Termux & GitHub Actions WASM Build & Testnet Deployment Guide (Sections 14 & 15.6)

Because compiling `near-sdk-rs` WASM binaries directly inside Android Termux can fail due to mobile clang/rustup target limitations, BorrowBond includes `.github/workflows/build-near-contract.yml` to compile and checksum `borrowbond_escrow.wasm` in GitHub Actions Linux CI, which you can then deploy from Termux in seconds:

### Step 1: Download the CI-Compiled `.wasm` Artifact in Termux
```bash
pkg update && pkg install -y nodejs-lts curl jq gh
npm install -g near-cli-rs

# Download the verified borrowbond-near-contract-wasm artifact from GitHub Actions
gh run download --name borrowbond-near-contract-wasm --dir ./contract-artifact
sha256sum ./contract-artifact/borrowbond_escrow.wasm
```

### Step 2: Deploy & Initialize on NEAR Testnet (`borrowbondtest.testnet`)
```bash
# Deploy WASM binary
near contract deploy borrowbondtest.testnet \
  use-file ./contract-artifact/borrowbond_escrow.wasm \
  without-init-call \
  network-config testnet \
  sign-with-keychain send

# Initialize contract with owner, arbiter, treasury, and 1% (100 bps) fee
near contract call-function as-transaction borrowbondtest.testnet new \
  json-args '{"owner": "borrowbondtest.testnet", "arbiter": "resolver.borrowbond.testnet", "fee_treasury": "treasury.borrowbond.testnet", "fee_bps": 100}' \
  prepaid-gas '30.0 Tgas' \
  attached-deposit '0 NEAR' \
  sign-as borrowbondtest.testnet \
  network-config testnet \
  sign-with-keychain send
```

### Step 3: Verify Contract Configuration on Testnet
```bash
near contract call-function as-read-only borrowbondtest.testnet get_config \
  json-args '{}' \
  network-config testnet \
  now
```

---

## 9. Automated Functional & Adversarial Security Test Results (Section 16.21 & 16.23.9)

Executed via `npx tsx --test tests/borrowbond.test.ts` (**29 / 29 passing, 0 failures**):
- `A1`–`A4`: Exact deposit enforcement, 100% refund on cancellation/expiry, dual handover, return, dispute resolution, and pull withdrawals.
- `B1`–`I3`: Digital credential gateway, AI borrowing agent policy checks, multi-photo validation, anti-scam TIN verification, 3% APY late-return interest, QR payload verification, NEP-413 Ed25519 signature & challenge expiry, and history filtering.
- `J1`–`J14` (`TEST 1`–`TEST 14`): Country-aware physical borrowing, cross-country physical booking rejection, private address/contact gating until acceptance, and country-change protection.
- `K1`–`K7` (Escrow V2 & 20 Adversarial Security Scenarios):
  - `K1`: 1% (`100 bps`) platform fee cap, non-owner fee change rejection, and exact conservation of funds `(C - F - D) + (R + D) + F == R + C`.
  - `K2`: Mutual damage settlement negotiation blocking unilateral deduction, blocking self-acceptance by proposer, enforcing `D <= C - F`, and settling upon counterparty signature.
  - `K3`: Handover grace expiry (`expireHandoverOnContract`) and 48-hour post-return uncontested auto-finalization (`finalizeUncontestedReturnOnContract`).
  - `K4`: Callback-safe withdrawal (`on_withdraw_complete`) restoring user's `claimableBalancesNear` on promise failure + duplicate `txHash` replay rejection.
  - `K5`: Contract call intent validation blocking wrong network (`mainnet`), untrusted contract receiver, disallowed method, and deposit mismatch.
  - `K6`: Wallet ownership hijacking prevention, single-use OAuth `state` CSRF verification, redirect URI allowlist enforcement, and SVG script / path-traversal upload rejection.
  - `K7`: Database RLS policy matrix evaluation across all 16 tables blocking unauthenticated/stranger IDOR access.

---

## 10. Remaining Limitations & Production Recommendations (Section 15.7 & 16.23.10–11)

1. **External Smart-Contract Audit**: Before deploying to NEAR `mainnet`, commission an independent external Rust smart-contract audit and use a multi-signature DAO account (e.g., SputnikDAO) for `owner` and `designated_resolver`.
2. **Production Environment Secrets**: Ensure `SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, and `API_GATEWAY_SECRET` are provisioned in your hosting secret manager and rotated periodically.
