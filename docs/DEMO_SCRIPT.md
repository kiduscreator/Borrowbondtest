# BorrowBond — NEAR Hackathon 2026 Demo Script & Submission Kit

## 1. 3-Minute Video Demonstration Script

1. **[0:00 - 0:20] Introduction & Problem**:
   - "Welcome to BorrowBond — *Borrow anything. Secure every agreement.* Built for the 2026 NEAR Hackathon across the Agent Economy and AI Security tracks."
   - Show the landing page, highlighting the NEAR Testnet block height indicator and the two connected marketplaces: **Physical Resources** and **Digital Resources**.
2. **[0:20 - 0:45] Marketplace & Fee/Collateral Separation**:
   - Open the **Marketplace** view. Filter between Physical (Demo Mirrorless Camera, 4K Laser Projector, Inspection Drone) and Digital (Demo Weather API, GPU Compute Sandbox).
   - Point out how every card separates the **Rental Fee** from the **Refundable Collateral**.
3. **[0:45 - 1:25] AI Borrowing Agent & AI Security Policy**:
   - Open the **AI Agent** view and submit:
     `"I need a camera for three days. My total budget is 0.5 NEAR. Find a reliable offer with reasonable collateral."`
   - Show the **Offer Comparison Matrix**, the **Agent Tool Execution Trace**, and the **Unsigned Agreement Draft** (`0.05 NEAR` fee + `0.20 NEAR` collateral = `0.25 NEAR`).
   - Click **Test Budget Refusal (0.04 NEAR)** to demonstrate the **AI Security Agent** deterministically blocking offers that exceed user policy.
4. **[1:25 - 1:55] Explicit Human Wallet Checkout & Physical Escrow Workflow**:
   - Click **Review & Sign in Checkout** on the camera draft. Check the explicit acceptance box and sign the transaction.
   - On the **Transaction Details** page, log a condition inspection note (generating a SHA-256 hash), switch wallets between `alex-builder.testnet` and `optics-lab.testnet` to confirm handover and satisfactory return, and show the collateral refunded to the borrower's claimable balance.
5. **[1:55 - 2:35] Programmable Digital API Access & Quota Enforcement**:
   - Open **Dashboard → Digital Access & API Gateway**.
   - Show the temporary bearer credential issued for `bk-demo-weather-101`.
   - Click **Send Live API Request (Uses 1 Quota)** and show the live JSON weather telemetry response and decremented quota counter.
   - Click **Test Expired Timestamp Rejection** or **Revoke Token Now** to demonstrate immediate `HTTP 403` enforcement.
6. **[2:35 - 3:00] Architecture & Repository Wrap-up**:
   - Show the Rust smart contract (`contracts/borrowbond/src/lib.rs`), Supabase SQL schema, and passing test suite (`npm test`).

---

## 2. Draft X (Twitter) Submission Post (Requires Explicit User Approval Before Posting)

> Built **BorrowBond** for the 2026 @NEARProtocol Hackathon! #NEARHackathon
>
> "Borrow anything. Secure every agreement."
>
> - Unified Physical & Digital resource marketplace
> - Tool-using AI Borrowing Agent + Deterministic AI Security Policy layer
> - NEAR Testnet programmable escrow separating rental fees from refundable collateral
> - Temporary SHA-256 hashed API credentials with live quota & expiry enforcement

---

## 3. Hackathon Submission Checklist

- [x] Primary Track: **Agent Economy** | Additional Tracks: **AI Security & Defense**, **Open Innovation**
- [x] Unified Physical & Digital Marketplace with working filters
- [x] AI Borrowing Agent with 13 validated tools & comparison matrix
- [x] AI Security Agent enforcing spending policies & prompt-injection sanitization
- [x] Explicit human approval required before any escrow transaction
- [x] NEAR Rust smart contract (`contracts/borrowbond/src/lib.rs`) & state machine tests
- [x] Working Controlled Demo Weather API Gateway (`/api/demo-resource/weather`)
- [x] Reproducible README, Architecture, Testing, and Security documentation
