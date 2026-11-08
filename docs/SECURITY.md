# BorrowBond Security & Privacy Specification

## 1. Core Security Controls Implemented

1. **Zero Client-Side Secrets**:
   - `GEMINI_API_KEY` and `API_GATEWAY_SECRET` are accessed strictly inside `server.ts`. No secret is ever prefixed with `VITE_` or `NEXT_PUBLIC_`.
2. **Hashed Temporary Digital Credentials**:
   - Temporary API tokens (`bb_temp_...`) are hashed using HMAC-SHA256 before storage in `digital_access_credentials`. The raw token is displayed once only to the authenticated borrower wallet.
3. **Deterministic Spending Policy Enforcement**:
   - Spending limits (`maxRentalFeeNear`, `maxCollateralNear`, `maxTotalPaymentNear`, `maxDurationDays`) are enforced by deterministic TypeScript/Rust logic on the backend. The AI model cannot override a policy violation.
4. **Prompt-Injection Sanitization**:
   - All listing titles, descriptions, and conditions are treated as untrusted input and scanned for instruction-override patterns (`ignore previous instructions`, `override spending policy`, `auto-approve`, etc.) before evaluation.
5. **Mandatory Human Wallet Approval**:
   - The AI Borrowing Agent can only create unsigned `BookingDraft` objects (`requiresExplicitWalletApproval: true`). Every financial transaction requires explicit human checkout acceptance and wallet signing.
6. **SSRF Prevention**:
   - The backend never fetches arbitrary user-supplied URLs. Digital resource demonstrations route strictly through the predefined `/api/demo-resource/weather` controlled gateway.

## 2. Honest Prototype Limitations

- This repository is a **NEAR Hackathon 2026 testnet prototype** and has **not** undergone a formal external security audit.
- Physical handover photos and SHA-256 hashes provide tamper-evident supporting records for human dispute resolution, not physical insurance or guaranteed recovery of stolen hardware.
