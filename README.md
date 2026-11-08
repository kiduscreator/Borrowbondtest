# BorrowBond

> **Borrow anything. Secure every agreement.**  
> Built for **NEAR HACKATHON 2026** — Primary Track: **Agent Economy** | Additional Applicable Tracks: **AI Security & Defense**, **Open Innovation**

BorrowBond is an intelligent peer-to-peer borrowing marketplace where individuals, businesses, and authorized AI agents discover, rent, and temporarily access **physical resources** (cameras, 4K laser projectors, inspection drones) and **programmable digital resources** (metered API gateways, GPU compute slots) through transparent borrowing agreements, refundable collateral, and NEAR-powered programmable escrow.

---

## 1. Problem & Solution

### The Problem
- **Idle Physical & Digital Capacity**: High-value equipment (cinema cameras, surveying drones) and metered digital services (specialty APIs, batch GPU slots) sit underutilized because informal sharing lacks enforceable return accountability and programmable access revocation.
- **Opaque Deposit Risks**: Traditional rental platforms commingle rental fees with security deposits, charge high intermediary fees, or lack transparent state machines for handover and return verification.
- **Unchecked AI Agent Spending**: As AI agents begin transacting on behalf of users, giving an LLM unrestricted wallet access or trusting unverified marketplace descriptions introduces severe prompt-injection and budget-drain risks.

### The BorrowBond Solution
1. **Unified Borrowing Marketplace**: One platform for physical hardware and digital APIs/compute, always separating the **Rental Fee** from the **Refundable Collateral**.
2. **AI Borrowing Agent (Tool-Using Assistant)**: Parses natural-language requests, executes 13 validated application tools (`search_listings`, `compare_offers`, `estimate_collateral`, `prepare_booking`, etc.), compares real inventory, and prepares unsigned agreement drafts.
3. **AI Security Agent (Deterministic Policy & Prompt-Injection Defense)**: Enforces maximum rental fee, maximum collateral, total payment caps, permitted categories, and sanitizes untrusted listing text against prompt injection. Never allows an AI action to silently sign or submit a blockchain transaction.
4. **NEAR Programmable Escrow (`contracts/borrowbond`)**: Locks exact `rental_fee + collateral` in yoctoNEAR, enforces strict state transitions (`REQUESTED → ACCEPTED → ACTIVE → RETURN_REQUESTED → COMPLETED` or `ACTIVE → DISPUTED → RESOLVED`), and credits claimable balances using a safe pull-withdrawal pattern.
5. **Temporary Digital Access Gateway**: Verifies on-chain booking activation before issuing SHA-256 hashed temporary bearer tokens, enforcing live request quotas and timestamp expiration on the server.

---

## 2. Reproducible Verification Guide ("Do X, See Y")

Follow these exact steps to verify every core capability:

1. **Explore Physical & Digital Marketplaces**:
   - Open the application (`http://localhost:3000`).
   - Click **Explore Marketplace** or toggle between **All Resources**, **Physical**, and **Digital**.
   - Adjust the **Max Rental Fee** and **Max Collateral** sliders and verify that every card clearly separates **Rental Fee** from **Refundable Collateral**.
2. **Run the AI Borrowing & Security Agent**:
   - On the Landing Page or **AI Agent** tab, run:
     > `"I need a camera for three days. My total budget is 0.5 NEAR. Find a reliable offer with reasonable collateral."`
   - Observe the **Offer Comparison Matrix**, the **Agent Tool Execution Trace** (`search_listings`, `compare_offers`, `assess_provider_signals`, `estimate_collateral`, `prepare_booking`), and the **Unsigned Agreement Draft** (`0.05 NEAR` fee + `0.20 NEAR` collateral = `0.25 NEAR` total).
   - Click **Test Budget Refusal (0.04 NEAR)** to verify that the AI Security Agent deterministically blocks offers that exceed budget or spending policy limits.
3. **Approve & Sign a Borrowing Checkout**:
   - From the AI Agent's prepared draft (or any listing details page), click **Review & Sign in Checkout**.
   - Inspect the itemized breakdown in NEAR and yoctoNEAR, check the explicit user acceptance box, and click **Approve & Sign**.
4. **Complete the Physical Handover, Evidence & Return Settlement Flow**:
   - Open **Dashboard** → click **Manage Agreement** on a physical booking.
   - Use the top-right wallet button to switch between `alex-builder.testnet` (Borrower), `optics-lab.testnet` (Lender), and `resolver.borrowbond.testnet` (Designated Human Resolver).
   - Upload before/after condition notes (recording a SHA-256 content hash), confirm handover and satisfactory return, and verify that the rental fee is credited to the lender and the collateral is refunded to the borrower's claimable balance.
5. **Test Temporary Digital API Credentials & Quota Enforcement**:
   - Open **Dashboard** → **Digital Access & API Gateway** tab.
   - Click **Send Live API Request (Uses 1 Quota)** against `/api/demo-resource/weather`. Observe the live meteorological JSON response and the decremented quota (`19 / 20` remaining).
   - Click **Test Expired Timestamp Rejection** or **Revoke Token Now** and verify that subsequent API calls immediately fail with `HTTP 403`.

---

## 3. Tech Stack & Repository Structure

```text
borrowbond/
├── contracts/
│   └── borrowbond/              # NEAR Rust Smart Contract (near-sdk 5.5.0)
│       ├── Cargo.toml
│       └── src/lib.rs
├── supabase/
│   └── migrations/
│       └── 001_borrowbond_schema.sql  # PostgreSQL schema + Row-Level Security (RLS)
├── src/
│   ├── components/              # Navbar (3-zone Top Bar Contract), ResilientImage
│   ├── views/                   # Landing, Marketplace, ListingDetails, CreateWizard, AiAgent, Checkout, Dashboard, TransactionDetails
│   └── lib/
│       ├── near/escrowStateMachine.ts # Pure escrow state machine & yoctoNEAR accounting
│       ├── digital/accessGateway.ts   # SHA-256 token hashing, quota & expiry enforcement
│       ├── security/policyEngine.ts   # Deterministic spending policy & prompt-injection defense
│       ├── ai/agentTools.ts           # 13 validated AI Agent tools & NL parser
│       └── database/seedData.ts       # Clearly labeled demonstration seed data
├── tests/
│   └── borrowbond.test.ts       # Automated unit & integration tests (node:test)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── TESTING.md
│   ├── DEMO_SCRIPT.md
│   └── SECURITY.md
├── .github/workflows/ci.yml     # GitHub Actions CI pipeline
├── server.ts                    # Express + Vite full-stack server & Demo API Gateway
└── .env.example                 # Placeholder environment variables (no secrets)
```

---

## 4. Installation, Development & Testing Commands

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Run automated unit & integration tests (Contract state machine, Digital API Gateway, AI Agent & Security Policy)
npm test

# 4. Run TypeScript type checking
npm run lint

# 5. Start full-stack development server on http://localhost:3000
npm run dev

# 6. Build production bundle
npm run build
```

---

## 5. Known Limitations & Honest Security Disclosures

- **Testnet Prototype Only**: BorrowBond uses NEAR `testnet` tokens, which have no real-world monetary value. Never deploy this MVP contract to NEAR mainnet without an independent third-party smart contract security audit.
- **Supporting Physical Evidence**: Uploaded before/after photographs, SHA-256 hashes, and one-time handover codes are supporting evidence for the parties and human resolver; they do not physically prevent theft or prove absence of hidden hardware damage.
- **Designated Human Resolver**: Disputed agreements freeze escrowed funds for allocation by a designated resolver account (`resolver.borrowbond.testnet`). This is transparent, auditable human arbitration—not decentralized juror voting.
- **Wallet Authentication vs. KYC**: Connecting a NEAR wallet authenticates control of a blockchain account; BorrowBond never labels wallet-connected users as KYC-verified.
