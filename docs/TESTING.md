# BorrowBond Testing & QA Guide

## 1. Automated Test Suite

Run the complete automated test suite using:

```bash
npm test
# or directly:
npx --yes tsx --test tests/borrowbond.test.ts
```

### Coverage Matrix (`tests/borrowbond.test.ts`)

- **A1. Escrow Deposit Validation**: Verifies exact `rental_fee + collateral` payment requirement and rejects mismatched deposits.
- **A2. Cancellation & Expiration Accounting**: Verifies 100% refund to borrower's claimable balance on pre-acceptance cancellation or deadline expiry, and rejects unauthorized third-party cancellation.
- **A3. Complete Physical Borrowing Lifecycle**: Tests `REQUESTED → ACCEPTED → ACTIVE → RETURN_REQUESTED → COMPLETED`, verifying that rental fee settles to lender, refundable collateral returns to borrower, duplicate completion is rejected, and claimable balances withdraw cleanly.
- **A4. Dispute Freeze & Authorized Human Resolution**: Verifies that opening a dispute freezes escrowed funds, blocks automatic settlement, rejects unauthorized resolution attempts, and allows only `resolver.borrowbond.testnet` to allocate disputed funds.
- **B1. Digital Access Gateway & Quota Enforcement**: Verifies that credentials cannot be issued before a booking is `ACTIVE`, prevents unauthorized users from accessing another borrower's credential, confirms raw tokens are hashed, enforces request quotas (`HTTP 429` on exhaustion), and rejects expired or revoked tokens (`HTTP 403`).
- **C1. AI Borrowing Agent & Security Policy**: Verifies natural-language extraction of category, duration, and budget; offer comparison; budget refusal when limits are exceeded; unsigned draft creation without auto-signing; and prompt-injection blocking.

## 2. Rust Smart Contract Unit Tests

When `cargo` and the Rust toolchain are installed locally or in CI:

```bash
cd contracts/borrowbond
cargo test
```
