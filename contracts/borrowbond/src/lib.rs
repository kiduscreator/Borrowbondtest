//! BorrowBond NEAR Testnet Programmable Escrow, Dual Handover/Return & Damage-Deduction Arbitration Contract (V2 Security Hardened)
//!
//! Security & Financial Architecture (Sections 7, 8, 9, 16.4 - 16.11):
//! 1. Exact yoctoNEAR (`u128`) arithmetic with string-serialized `U128` at JSON boundaries to prevent IEEE-754 precision loss.
//! 2. Configurable platform fee (`fee_bps`: 0..=100, maximum 1.00%) snapshotted on each booking at creation (`fee_bps_snapshot`),
//!    deducted strictly from locked collateral upon active completion/resolution (0 fee on cancelled or expired pre-handover bookings):
//!      platform_fee = collateral * fee_bps / 10_000
//!      Borrower refund = C - F - D
//!      Lender payout   = R + D
//!      Treasury payout = F
//!    Guaranteeing the exact settlement invariant:
//!      (C - F - D) + (R + D) + F == R + C, with 0 <= D <= C - F.
//! 3. Dual-confirmation handover (`confirm_handover`) + permissionless `expire_uncompleted_handover` if handover does not complete by deadline.
//! 4. 48-hour lender response window after `request_return` (`lender_response_deadline_ns`) + permissionless `finalize_uncontested_return`
//!    so a non-responsive lender can never freeze a borrower's collateral indefinitely.
//! 5. Mutual damage settlement negotiation (`propose_damage_settlement`, `accept_damage_proposal`, `reject_damage_proposal`) requiring
//!    counterparty wallet signature before settling, plus authorized arbiter resolution (`resolve_dispute_with_damage_deduction`) where
//!    the arbiter cannot award escrow to itself.
//! 6. Pull-over-push `withdraw_claimable` with `#[private] pub fn on_withdraw_complete` callback that verifies `PromiseResult` and
//!    restores the user's `claimable_balances` if the transfer promise fails, while protecting `total_locked_escrow_yocto`,
//!    `total_claimable_yocto`, and `MIN_STORAGE_RESERVE_YOCTO`.

use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, UnorderedMap};
use near_sdk::json_types::U128;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{
    env, near_bindgen, AccountId, Balance, Gas, PanicOnDefault, Promise, PromiseResult,
};

pub const MIN_STORAGE_RESERVE_YOCTO: Balance = 50_000_000_000_000_000_000_000; // 0.05 NEAR minimum contract storage reserve
pub const MAX_PLATFORM_FEE_BPS: u16 = 100; // 100 bps = 1.00% hard cap
pub const BPS_DENOMINATOR: u128 = 10_000;
pub const LENDER_RETURN_RESPONSE_WINDOW_NS: u64 = 48 * 3600 * 1_000_000_000; // 48 hours in nanoseconds
pub const DEFAULT_HANDOVER_GRACE_WINDOW_NS: u64 = 24 * 3600 * 1_000_000_000; // 24 hours in nanoseconds
pub const CALLBACK_GAS: Gas = Gas(10_000_000_000_000); // 10 TGas for withdrawal callback
pub const MAX_EVIDENCE_ITEMS_PER_BOOKING: usize = 25;
pub const MAX_STRING_LEN: usize = 512;

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(crate = "near_sdk::serde")]
pub enum ResourceType {
    PHYSICAL,
    DIGITAL,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(crate = "near_sdk::serde")]
pub enum BookingStatus {
    REQUESTED,
    ACCEPTED,
    HANDOVER_PENDING,
    ACTIVE,
    RETURN_REQUESTED,
    COMPLETED,
    DISPUTED,
    RESOLVED,
    CANCELLED,
    REFUNDED,
    EXPIRED,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct EvidenceSubmission {
    pub uploader: AccountId,
    pub stage: String,
    pub content_sha256_hash: String,
    pub timestamp_ns: u64,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(crate = "near_sdk::serde")]
pub enum DamageProposalStatus {
    PENDING,
    ACCEPTED,
    REJECTED,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct DamageSettlementProposal {
    pub proposed_by: AccountId,
    pub proposed_damage_yocto: U128,
    pub reason: String,
    pub evidence_sha256_hash: String,
    pub status: DamageProposalStatus,
    pub proposed_at_ns: u64,
    pub responded_by: Option<AccountId>,
    pub responded_at_ns: Option<u64>,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct Booking {
    pub booking_id: String,
    pub listing_id: String,
    pub resource_type: ResourceType,
    pub lender: AccountId,
    pub borrower: AccountId,
    pub rental_fee_yocto: U128,
    pub collateral_yocto: U128,
    pub total_escrowed_yocto: U128,
    pub fee_bps_snapshot: u16,
    pub platform_fee_yocto: U128,
    pub damage_deduction_yocto: U128,
    pub borrower_refund_yocto: U128,
    pub lender_payout_yocto: U128,
    pub treasury_payout_yocto: U128,
    pub registered_tin_or_serial: String,
    pub registered_photos_sha256: String,
    pub return_verified_tin_or_serial: Option<String>,
    pub status: BookingStatus,
    pub lender_handover_confirmed: bool,
    pub borrower_handover_confirmed: bool,
    pub lender_return_confirmed: bool,
    pub borrower_return_confirmed: bool,
    pub created_at_ns: u64,
    pub acceptance_deadline_ns: u64,
    pub handover_deadline_ns: u64,
    pub rental_start_ns: u64,
    pub rental_end_ns: u64,
    pub return_requested_at_ns: u64,
    pub lender_response_deadline_ns: u64,
    pub settled: bool,
    pub dispute_reason: Option<String>,
    pub resolution_notes: Option<String>,
    pub damage_proposal: Option<DamageSettlementProposal>,
    pub evidence_hashes: Vec<EvidenceSubmission>,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct BorrowBondEscrow {
    pub owner: AccountId,
    pub designated_resolver: AccountId,
    pub fee_treasury: AccountId,
    pub fee_bps: u16,
    pub paused: bool,
    pub total_locked_escrow_yocto: Balance,
    pub total_claimable_yocto: Balance,
    pub total_pending_withdrawal_yocto: Balance,
    pub bookings: UnorderedMap<String, Booking>,
    pub claimable_balances: LookupMap<AccountId, Balance>,
}

fn assert_bounded_str(val: &str, field_name: &str) {
    assert!(!val.trim().is_empty(), "{} cannot be empty", field_name);
    assert!(
        val.len() <= MAX_STRING_LEN,
        "{} exceeds maximum length of {} bytes",
        field_name,
        MAX_STRING_LEN
    );
}

#[near_bindgen]
impl BorrowBondEscrow {
    #[init]
    pub fn new(
        owner: AccountId,
        designated_resolver: AccountId,
        fee_treasury: Option<AccountId>,
        fee_bps: Option<u16>,
    ) -> Self {
        assert!(!env::state_exists(), "Already initialized");
        let configured_bps = fee_bps.unwrap_or(100);
        assert!(
            configured_bps <= MAX_PLATFORM_FEE_BPS,
            "Platform fee basis points cannot exceed 100 (1.00%)"
        );
        let treasury = fee_treasury.unwrap_or_else(|| owner.clone());
        Self {
            owner,
            designated_resolver,
            fee_treasury: treasury,
            fee_bps: configured_bps,
            paused: false,
            total_locked_escrow_yocto: 0,
            total_claimable_yocto: 0,
            total_pending_withdrawal_yocto: 0,
            bookings: UnorderedMap::new(b"b"),
            claimable_balances: LookupMap::new(b"c"),
        }
    }

    // ========================================================================
    // ADMINISTRATIVE & FEE GOVERNANCE CONTROLS
    // ========================================================================

    pub fn set_paused(&mut self, paused: bool) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner,
            "Only contract owner can pause or unpause new bookings"
        );
        self.paused = paused;
        env::log_str(&format!(
            "EVENT_JSON:{{\"standard\":\"borrowbond\",\"version\":\"2.0.0\",\"event\":\"pause_changed\",\"data\":{{\"paused\":{}}}}}",
            paused
        ));
    }

    pub fn set_designated_resolver(&mut self, new_resolver: AccountId) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner,
            "Only contract owner can update designated resolver"
        );
        self.designated_resolver = new_resolver.clone();
        env::log_str(&format!(
            "EVENT_JSON:{{\"standard\":\"borrowbond\",\"version\":\"2.0.0\",\"event\":\"resolver_updated\",\"data\":{{\"designated_resolver\":\"{}\"}}}}",
            new_resolver
        ));
    }

    pub fn set_platform_fee_config(&mut self, fee_bps: u16, fee_treasury: AccountId) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner,
            "Only contract owner can update platform fee configuration"
        );
        assert!(
            fee_bps <= MAX_PLATFORM_FEE_BPS,
            "Platform fee basis points cannot exceed 100 (1.00%)"
        );
        self.fee_bps = fee_bps;
        self.fee_treasury = fee_treasury.clone();
        env::log_str(&format!(
            "EVENT_JSON:{{\"standard\":\"borrowbond\",\"version\":\"2.0.0\",\"event\":\"fee_config_updated\",\"data\":{{\"fee_bps\":{},\"fee_treasury\":\"{}\"}}}}",
            fee_bps, fee_treasury
        ));
    }

    fn credit_claimable(&mut self, account: &AccountId, amount: Balance) {
        if amount == 0 {
            return;
        }
        let current = self.claimable_balances.get(account).unwrap_or(0);
        let updated = current
            .checked_add(amount)
            .expect("Claimable balance overflow");
        self.claimable_balances.insert(account, &updated);
        self.total_claimable_yocto = self
            .total_claimable_yocto
            .checked_add(amount)
            .expect("Total claimable balance overflow");
    }

    /// Settles an active booking using the exact invariant:
    ///   platform_fee = collateral * fee_bps_snapshot / 10_000
    ///   borrower_refund = C - F - D
    ///   lender_payout   = R + D
    ///   treasury_payout = F
    ///   (C - F - D) + (R + D) + F == R + C
    fn execute_active_settlement(
        &mut self,
        booking: &mut Booking,
        damage_deduction_yocto: Balance,
        target_status: BookingStatus,
    ) {
        assert!(!booking.settled, "Booking already settled");
        let rental_fee: Balance = booking.rental_fee_yocto.0;
        let collateral: Balance = booking.collateral_yocto.0;
        let total_escrowed: Balance = booking.total_escrowed_yocto.0;

        assert_eq!(
            rental_fee.checked_add(collateral).expect("Escrow overflow"),
            total_escrowed,
            "Corrupted booking escrow sum"
        );

        let platform_fee: Balance = collateral
            .checked_mul(booking.fee_bps_snapshot as u128)
            .expect("Fee multiplication overflow")
            / BPS_DENOMINATOR;

        let max_damage_deductible: Balance = collateral
            .checked_sub(platform_fee)
            .expect("Platform fee exceeds collateral");

        assert!(
            damage_deduction_yocto <= max_damage_deductible,
            "Damage deduction cannot exceed remaining collateral after platform fee (C - F)"
        );

        let borrower_refund: Balance = max_damage_deductible
            .checked_sub(damage_deduction_yocto)
            .expect("Borrower refund underflow");
        let lender_payout: Balance = rental_fee
            .checked_add(damage_deduction_yocto)
            .expect("Lender payout overflow");
        let treasury_payout: Balance = platform_fee;

        let total_distributed = borrower_refund
            .checked_add(lender_payout)
            .and_then(|v| v.checked_add(treasury_payout))
            .expect("Settlement sum overflow");

        assert_eq!(
            total_distributed, total_escrowed,
            "Settlement conservation invariant violated: distributed != escrowed"
        );

        booking.settled = true;
        booking.status = target_status;
        booking.platform_fee_yocto = U128(platform_fee);
        booking.damage_deduction_yocto = U128(damage_deduction_yocto);
        booking.borrower_refund_yocto = U128(borrower_refund);
        booking.lender_payout_yocto = U128(lender_payout);
        booking.treasury_payout_yocto = U128(treasury_payout);

        self.total_locked_escrow_yocto = self
            .total_locked_escrow_yocto
            .checked_sub(total_escrowed)
            .expect("Total locked escrow underflow");

        let treasury_account = self.fee_treasury.clone();
        self.credit_claimable(&booking.lender, lender_payout);
        self.credit_claimable(&booking.borrower, borrower_refund);
        self.credit_claimable(&treasury_account, treasury_payout);
    }

    // ========================================================================
    // 1. CREATE BOOKING & LOCK ESCROW
    // ========================================================================

    /// Borrower creates a booking and locks `rental_fee_yocto + collateral_yocto` in escrow.
    #[payable]
    pub fn create_booking(
        &mut self,
        booking_id: String,
        listing_id: String,
        resource_type: ResourceType,
        lender: AccountId,
        rental_fee_yocto: U128,
        collateral_yocto: U128,
        registered_tin_or_serial: String,
        registered_photos_sha256: String,
        acceptance_deadline_ns: u64,
        rental_end_ns: u64,
    ) -> Booking {
        assert!(!self.paused, "Contract is currently paused for new bookings");
        assert_bounded_str(&booking_id, "booking_id");
        assert_bounded_str(&listing_id, "listing_id");
        assert_bounded_str(&registered_tin_or_serial, "registered_tin_or_serial");
        assert_bounded_str(&registered_photos_sha256, "registered_photos_sha256");

        let borrower = env::predecessor_account_id();
        assert_ne!(borrower, lender, "Lender and borrower must be distinct accounts");
        assert!(
            self.bookings.get(&booking_id).is_none(),
            "Booking ID already exists"
        );
        assert!(rental_fee_yocto.0 > 0, "Rental fee must be positive");
        if resource_type == ResourceType::PHYSICAL {
            assert!(
                collateral_yocto.0 > 0,
                "Physical resource bookings require positive collateral"
            );
        }

        let now_ns = env::block_timestamp();
        assert!(
            acceptance_deadline_ns > now_ns,
            "Acceptance deadline must be in the future"
        );
        assert!(
            rental_end_ns > acceptance_deadline_ns,
            "Rental end timestamp must be after acceptance deadline"
        );

        let attached = env::attached_deposit();
        let required = rental_fee_yocto
            .0
            .checked_add(collateral_yocto.0)
            .expect("Deposit addition overflow");
        assert_eq!(
            attached, required,
            "Attached NEAR deposit must equal exact rental_fee_yocto + collateral_yocto"
        );

        let booking = Booking {
            booking_id: booking_id.clone(),
            listing_id,
            resource_type,
            lender,
            borrower,
            rental_fee_yocto,
            collateral_yocto,
            total_escrowed_yocto: U128(required),
            fee_bps_snapshot: self.fee_bps,
            platform_fee_yocto: U128(0),
            damage_deduction_yocto: U128(0),
            borrower_refund_yocto: U128(0),
            lender_payout_yocto: U128(0),
            treasury_payout_yocto: U128(0),
            registered_tin_or_serial,
            registered_photos_sha256,
            return_verified_tin_or_serial: None,
            status: BookingStatus::REQUESTED,
            lender_handover_confirmed: false,
            borrower_handover_confirmed: false,
            lender_return_confirmed: false,
            borrower_return_confirmed: false,
            created_at_ns: now_ns,
            acceptance_deadline_ns,
            handover_deadline_ns: acceptance_deadline_ns.saturating_add(DEFAULT_HANDOVER_GRACE_WINDOW_NS),
            rental_start_ns: 0,
            rental_end_ns,
            return_requested_at_ns: 0,
            lender_response_deadline_ns: 0,
            settled: false,
            dispute_reason: None,
            resolution_notes: None,
            damage_proposal: None,
            evidence_hashes: Vec::new(),
        };

        self.total_locked_escrow_yocto = self
            .total_locked_escrow_yocto
            .checked_add(required)
            .expect("Total locked escrow overflow");
        self.bookings.insert(&booking_id, &booking);

        env::log_str(&format!(
            "EVENT_JSON:{{\"standard\":\"borrowbond\",\"version\":\"2.0.0\",\"event\":\"booking_created\",\"data\":{{\"booking_id\":\"{}\",\"total_escrowed_yocto\":\"{}\",\"fee_bps_snapshot\":{}}}}}",
            booking_id, required, self.fee_bps
        ));

        booking
    }

    // ========================================================================
    // 2. ACCEPTANCE, CANCELLATION & EXPIRATION (0 PLATFORM FEE BEFORE ACTIVE)
    // ========================================================================

    /// Lender accepts the booking request before `acceptance_deadline_ns`.
    pub fn accept_booking(&mut self, booking_id: String) -> Booking {
        let mut booking = self.bookings.get(&booking_id).expect("Booking not found");
        assert_eq!(
            env::predecessor_account_id(),
            booking.lender,
            "Only the lender can accept a booking"
        );
        assert_eq!(
            booking.status,
            BookingStatus::REQUESTED,
            "Booking is not in REQUESTED state"
        );
        let now_ns = env::block_timestamp();
        assert!(
            now_ns <= booking.acceptance_deadline_ns,
            "Acceptance deadline has passed"
        );

        if booking.resource_type == ResourceType::DIGITAL {
            booking.status = BookingStatus::ACTIVE;
            booking.rental_start_ns = now_ns;
            booking.lender_handover_confirmed = true;
            booking.borrower_handover_confirmed = true;
        } else {
            booking.status = BookingStatus::ACCEPTED;
            booking.handover_deadline_ns = now_ns.saturating_add(DEFAULT_HANDOVER_GRACE_WINDOW_NS);
        }

        self.bookings.insert(&booking_id, &booking);
        booking
    }

    /// Either borrower or lender cancels a REQUESTED booking (or an ACCEPTED physical booking before handover completes).
    /// Refunds 100% of `total_escrowed_yocto` to borrower with 0 platform fee.
    pub fn cancel_requested_booking(&mut self, booking_id: String) -> Booking {
        let mut booking = self.bookings.get(&booking_id).expect("Booking not found");
        let caller = env::predecessor_account_id();
        assert!(
            caller == booking.borrower || caller == booking.lender,
            "Only borrower or lender can cancel a booking"
        );
        assert!(
            booking.status == BookingStatus::REQUESTED
                || (booking.status == BookingStatus::ACCEPTED
                    && (!booking.lender_handover_confirmed || !booking.borrower_handover_confirmed)),
            "Cannot cancel once handover is completed by both parties"
        );
        assert!(!booking.settled, "Already settled");

        let refund = booking.total_escrowed_yocto.0;
        booking.settled = true;
        booking.status = BookingStatus::CANCELLED;
        booking.borrower_refund_yocto = U128(refund);

        self.total_locked_escrow_yocto = self
            .total_locked_escrow_yocto
            .checked_sub(refund)
            .expect("Total locked escrow underflow");
        self.credit_claimable(&booking.borrower, refund);

        self.bookings.insert(&booking_id, &booking);
        booking
    }

    /// Permissionless timeout refund if lender never accepted before `acceptance_deadline_ns`.
    pub fn expire_unaccepted_booking(&mut self, booking_id: String) -> Booking {
        let mut booking = self.bookings.get(&booking_id).expect("Booking not found");
        assert_eq!(
            booking.status,
            BookingStatus::REQUESTED,
            "Booking is not in REQUESTED state"
        );
        assert!(
            env::block_timestamp() > booking.acceptance_deadline_ns,
            "Acceptance deadline has not passed yet"
        );
        assert!(!booking.settled, "Already settled");

        let refund = booking.total_escrowed_yocto.0;
        booking.settled = true;
        booking.status = BookingStatus::EXPIRED;
        booking.borrower_refund_yocto = U128(refund);

        self.total_locked_escrow_yocto = self
            .total_locked_escrow_yocto
            .checked_sub(refund)
            .expect("Total locked escrow underflow");
        self.credit_claimable(&booking.borrower, refund);

        self.bookings.insert(&booking_id, &booking);
        booking
    }

    /// Permissionless timeout refund if booking was ACCEPTED or HANDOVER_PENDING but both parties
    /// did not complete handover before `handover_deadline_ns`.
    pub fn expire_uncompleted_handover(&mut self, booking_id: String) -> Booking {
        let mut booking = self.bookings.get(&booking_id).expect("Booking not found");
        assert!(
            booking.status == BookingStatus::ACCEPTED
                || booking.status == BookingStatus::HANDOVER_PENDING,
            "Booking is not awaiting physical handover"
        );
        assert!(
            env::block_timestamp() > booking.handover_deadline_ns,
            "Handover grace deadline has not passed yet"
        );
        assert!(!booking.settled, "Already settled");

        let refund = booking.total_escrowed_yocto.0;
        booking.settled = true;
        booking.status = BookingStatus::EXPIRED;
        booking.borrower_refund_yocto = U128(refund);

        self.total_locked_escrow_yocto = self
            .total_locked_escrow_yocto
            .checked_sub(refund)
            .expect("Total locked escrow underflow");
        self.credit_claimable(&booking.borrower, refund);

        self.bookings.insert(&booking_id, &booking);
        booking
    }

    // ========================================================================
    // 3. DUAL HANDOVER & RETURN WORKFLOW + 48H LENDER RESPONSE PROTECTION
    // ========================================================================

    /// Dual physical handover confirmation:
    /// - Lender confirms handing over the product (`lender_handover_confirmed = true`).
    /// - Borrower confirms receiving the product (`borrower_handover_confirmed = true`).
    /// Only when BOTH confirm does the agreement transition to `ACTIVE`.
    pub fn confirm_handover(&mut self, booking_id: String) -> Booking {
        let mut booking = self.bookings.get(&booking_id).expect("Booking not found");
        assert!(
            booking.status == BookingStatus::ACCEPTED
                || booking.status == BookingStatus::HANDOVER_PENDING,
            "Booking must be in ACCEPTED or HANDOVER_PENDING state"
        );
        let caller = env::predecessor_account_id();
        assert!(
            caller == booking.lender || caller == booking.borrower,
            "Only lender or borrower can confirm handover"
        );

        if caller == booking.lender {
            booking.lender_handover_confirmed = true;
        }
        if caller == booking.borrower {
            booking.borrower_handover_confirmed = true;
        }

        if booking.lender_handover_confirmed && booking.borrower_handover_confirmed {
            booking.status = BookingStatus::ACTIVE;
            booking.rental_start_ns = env::block_timestamp();
        } else {
            booking.status = BookingStatus::HANDOVER_PENDING;
        }

        self.bookings.insert(&booking_id, &booking);
        booking
    }

    /// Borrower initiates return of a physical item (`ACTIVE -> RETURN_REQUESTED`)
    /// and starts the 48-hour lender response window (`lender_response_deadline_ns`).
    pub fn request_return(&mut self, booking_id: String) -> Booking {
        let mut booking = self.bookings.get(&booking_id).expect("Booking not found");
        assert_eq!(
            env::predecessor_account_id(),
            booking.borrower,
            "Only borrower can initiate return"
        );
        assert_eq!(
            booking.status,
            BookingStatus::ACTIVE,
            "Booking must be ACTIVE to initiate return"
        );

        let now_ns = env::block_timestamp();
        booking.borrower_return_confirmed = true;
        booking.status = BookingStatus::RETURN_REQUESTED;
        booking.return_requested_at_ns = now_ns;
        booking.lender_response_deadline_ns = now_ns.saturating_add(LENDER_RETURN_RESPONSE_WINDOW_NS);

        self.bookings.insert(&booking_id, &booking);
        booking
    }

    /// Lender confirms safe return of the exact registered item (matching `registered_tin_or_serial`)
    /// and settles escrow with 0 damage deduction:
    /// - `lender_payout = R`
    /// - `borrower_refund = C - F`
    /// - `treasury_payout = F`
    pub fn confirm_return_and_complete(
        &mut self,
        booking_id: String,
        verified_tin_or_serial: String,
    ) -> Booking {
        let mut booking = self.bookings.get(&booking_id).expect("Booking not found");
        let caller = env::predecessor_account_id();
        assert!(
            caller == booking.lender || caller == booking.borrower,
            "Only lender or borrower can confirm return"
        );
        assert!(
            booking.status == BookingStatus::ACTIVE
                || booking.status == BookingStatus::RETURN_REQUESTED,
            "Booking must be ACTIVE or RETURN_REQUESTED"
        );
        assert!(!booking.settled, "Already settled");

        if caller == booking.borrower {
            booking.borrower_return_confirmed = true;
        }
        if caller == booking.lender {
            assert_eq!(
                verified_tin_or_serial.trim().to_uppercase(),
                booking.registered_tin_or_serial.trim().to_uppercase(),
                "Anti-scam TIN/serial mismatch: returned item does not match registered serial. Open a dispute instead."
            );
            booking.return_verified_tin_or_serial = Some(verified_tin_or_serial);
            booking.lender_return_confirmed = true;
        }

        if booking.lender_return_confirmed && booking.borrower_return_confirmed {
            self.execute_active_settlement(&mut booking, 0, BookingStatus::COMPLETED);
        } else {
            booking.status = BookingStatus::RETURN_REQUESTED;
            if booking.return_requested_at_ns == 0 {
                let now_ns = env::block_timestamp();
                booking.return_requested_at_ns = now_ns;
                booking.lender_response_deadline_ns =
                    now_ns.saturating_add(LENDER_RETURN_RESPONSE_WINDOW_NS);
            }
        }

        self.bookings.insert(&booking_id, &booking);
        booking
    }

    /// Permissionless auto-completion if borrower requested return (`RETURN_REQUESTED`) and the lender
    /// neither confirmed return, proposed damage, nor opened a dispute before `lender_response_deadline_ns` (48h).
    pub fn finalize_uncontested_return(&mut self, booking_id: String) -> Booking {
        let mut booking = self.bookings.get(&booking_id).expect("Booking not found");
        assert_eq!(
            booking.status,
            BookingStatus::RETURN_REQUESTED,
            "Booking must be in RETURN_REQUESTED state"
        );
        assert!(
            booking.lender_response_deadline_ns > 0
                && env::block_timestamp() > booking.lender_response_deadline_ns,
            "48-hour lender response window has not expired yet"
        );
        if let Some(ref proposal) = booking.damage_proposal {
            assert_ne!(
                proposal.status,
                DamageProposalStatus::PENDING,
                "Cannot auto-finalize while a damage settlement proposal is pending response"
            );
        }

        booking.lender_return_confirmed = true;
        booking.resolution_notes = Some(
            "Auto-finalized after 48-hour lender response window expired without dispute.".to_string(),
        );
        self.execute_active_settlement(&mut booking, 0, BookingStatus::COMPLETED);

        self.bookings.insert(&booking_id, &booking);
        booking
    }

    // ========================================================================
    // 4. MUTUAL DAMAGE SETTLEMENT NEGOTIATION & ARBITER RESOLUTION
    // ========================================================================

    /// Lender or borrower proposes a specific damage settlement amount (`0 <= D <= C - F`).
    /// Never deducts funds unilaterally — requires the counterparty's wallet signature via `accept_damage_proposal`.
    pub fn propose_damage_settlement(
        &mut self,
        booking_id: String,
        proposed_damage_yocto: U128,
        reason: String,
        evidence_sha256_hash: String,
    ) -> Booking {
        assert_bounded_str(&reason, "reason");
        assert_bounded_str(&evidence_sha256_hash, "evidence_sha256_hash");

        let mut booking = self.bookings.get(&booking_id).expect("Booking not found");
        let caller = env::predecessor_account_id();
        assert!(
            caller == booking.lender || caller == booking.borrower,
            "Only lender or borrower can propose a damage settlement"
        );
        assert!(
            booking.status == BookingStatus::ACTIVE
                || booking.status == BookingStatus::RETURN_REQUESTED
                || booking.status == BookingStatus::DISPUTED,
            "Damage settlement can only be proposed on ACTIVE, RETURN_REQUESTED, or DISPUTED bookings"
        );
        assert!(!booking.settled, "Booking already settled");

        let platform_fee = booking
            .collateral_yocto
            .0
            .checked_mul(booking.fee_bps_snapshot as u128)
            .expect("Fee overflow")
            / BPS_DENOMINATOR;
        let max_damage = booking
            .collateral_yocto
            .0
            .checked_sub(platform_fee)
            .expect("Fee exceeds collateral");
        assert!(
            proposed_damage_yocto.0 <= max_damage,
            "Proposed damage cannot exceed collateral minus platform fee (C - F)"
        );

        booking.damage_proposal = Some(DamageSettlementProposal {
            proposed_by: caller,
            proposed_damage_yocto,
            reason,
            evidence_sha256_hash,
            status: DamageProposalStatus::PENDING,
            proposed_at_ns: env::block_timestamp(),
            responded_by: None,
            responded_at_ns: None,
        });

        self.bookings.insert(&booking_id, &booking);
        booking
    }

    /// Counterparty accepts the pending `DamageSettlementProposal` and immediately executes atomic settlement.
    pub fn accept_damage_proposal(&mut self, booking_id: String) -> Booking {
        let mut booking = self.bookings.get(&booking_id).expect("Booking not found");
        let caller = env::predecessor_account_id();
        assert!(
            caller == booking.lender || caller == booking.borrower,
            "Only lender or borrower can accept a damage proposal"
        );
        assert!(!booking.settled, "Booking already settled");

        let proposal = booking
            .damage_proposal
            .as_mut()
            .expect("No damage proposal exists on this booking");
        assert_eq!(
            proposal.status,
            DamageProposalStatus::PENDING,
            "Damage proposal is not PENDING"
        );
        assert_ne!(
            caller, proposal.proposed_by,
            "Proposer cannot self-accept their own damage settlement proposal"
        );

        let agreed_damage = proposal.proposed_damage_yocto.0;
        proposal.status = DamageProposalStatus::ACCEPTED;
        proposal.responded_by = Some(caller.clone());
        proposal.responded_at_ns = Some(env::block_timestamp());

        booking.resolution_notes = Some(format!(
            "Mutual damage settlement agreed by {} and {}.",
            booking.lender, booking.borrower
        ));
        self.execute_active_settlement(&mut booking, agreed_damage, BookingStatus::RESOLVED);

        self.bookings.insert(&booking_id, &booking);
        booking
    }

    /// Counterparty rejects the pending `DamageSettlementProposal` and escalates the booking to `DISPUTED`.
    pub fn reject_damage_proposal(&mut self, booking_id: String, reason: String) -> Booking {
        assert_bounded_str(&reason, "reason");
        let mut booking = self.bookings.get(&booking_id).expect("Booking not found");
        let caller = env::predecessor_account_id();
        assert!(
            caller == booking.lender || caller == booking.borrower,
            "Only lender or borrower can reject a damage proposal"
        );
        assert!(!booking.settled, "Booking already settled");

        let proposal = booking
            .damage_proposal
            .as_mut()
            .expect("No damage proposal exists on this booking");
        assert_eq!(
            proposal.status,
            DamageProposalStatus::PENDING,
            "Damage proposal is not PENDING"
        );
        assert_ne!(
            caller, proposal.proposed_by,
            "Only the counterparty can reject a damage proposal"
        );

        proposal.status = DamageProposalStatus::REJECTED;
        proposal.responded_by = Some(caller);
        proposal.responded_at_ns = Some(env::block_timestamp());

        booking.status = BookingStatus::DISPUTED;
        booking.dispute_reason = Some(reason);

        self.bookings.insert(&booking_id, &booking);
        booking
    }

    /// Record SHA-256 hash of condition evidence or dispute proof on-chain.
    pub fn submit_evidence_hash(
        &mut self,
        booking_id: String,
        stage: String,
        content_sha256_hash: String,
    ) -> Booking {
        assert_bounded_str(&stage, "stage");
        assert_bounded_str(&content_sha256_hash, "content_sha256_hash");

        let mut booking = self.bookings.get(&booking_id).expect("Booking not found");
        let caller = env::predecessor_account_id();
        assert!(
            caller == booking.lender
                || caller == booking.borrower
                || caller == self.designated_resolver,
            "Unauthorized evidence uploader"
        );
        assert!(
            booking.evidence_hashes.len() < MAX_EVIDENCE_ITEMS_PER_BOOKING,
            "Maximum evidence submissions reached for this booking"
        );

        booking.evidence_hashes.push(EvidenceSubmission {
            uploader: caller,
            stage,
            content_sha256_hash,
            timestamp_ns: env::block_timestamp(),
        });

        self.bookings.insert(&booking_id, &booking);
        booking
    }

    /// Either borrower or lender opens a dispute while `ACTIVE` or `RETURN_REQUESTED`, freezing escrow.
    pub fn open_dispute(&mut self, booking_id: String, reason: String) -> Booking {
        assert_bounded_str(&reason, "reason");
        let mut booking = self.bookings.get(&booking_id).expect("Booking not found");
        let caller = env::predecessor_account_id();
        assert!(
            caller == booking.lender || caller == booking.borrower,
            "Only lender or borrower can open a dispute"
        );
        assert!(
            booking.status == BookingStatus::ACTIVE
                || booking.status == BookingStatus::RETURN_REQUESTED,
            "Disputes can only be opened on ACTIVE or RETURN_REQUESTED bookings"
        );

        booking.status = BookingStatus::DISPUTED;
        booking.dispute_reason = Some(reason);
        self.bookings.insert(&booking_id, &booking);
        booking
    }

    /// Designated BorrowBond arbiter (`designated_resolver`) resolves a `DISPUTED` booking with
    /// an assessed damage deduction (`0 <= D <= C - F`).
    /// The arbiter cannot transfer escrow to itself; funds are strictly split between borrower, lender, and fee treasury.
    pub fn resolve_dispute_with_damage_deduction(
        &mut self,
        booking_id: String,
        damage_deduction_yocto: U128,
        resolution_notes: String,
    ) -> Booking {
        assert_bounded_str(&resolution_notes, "resolution_notes");
        assert_eq!(
            env::predecessor_account_id(),
            self.designated_resolver,
            "Only the designated BorrowBond Team resolver can resolve a dispute"
        );

        let mut booking = self.bookings.get(&booking_id).expect("Booking not found");
        assert_eq!(
            booking.status,
            BookingStatus::DISPUTED,
            "Booking is not in DISPUTED state"
        );
        assert!(!booking.settled, "Already settled");

        booking.resolution_notes = Some(resolution_notes);
        self.execute_active_settlement(&mut booking, damage_deduction_yocto.0, BookingStatus::RESOLVED);

        self.bookings.insert(&booking_id, &booking);
        booking
    }

    // ========================================================================
    // 5. CALLBACK-SAFE PULL WITHDRAWAL (`withdraw_claimable` + `on_withdraw_complete`)
    // ========================================================================

    /// Pull-over-push withdrawal of settled claimable balance with promise-result callback protection.
    /// Ensures `env::account_balance()` retains `total_locked_escrow_yocto + remaining_claimable + MIN_STORAGE_RESERVE_YOCTO`.
    pub fn withdraw_claimable(&mut self) -> Promise {
        let caller = env::predecessor_account_id();
        let amount = self.claimable_balances.get(&caller).unwrap_or(0);
        assert!(amount > 0, "No claimable balance available");

        let remaining_claimable = self
            .total_claimable_yocto
            .checked_sub(amount)
            .expect("Total claimable balance underflow");
        let required_post_withdrawal_balance = self
            .total_locked_escrow_yocto
            .checked_add(remaining_claimable)
            .and_then(|v| v.checked_add(self.total_pending_withdrawal_yocto))
            .and_then(|v| v.checked_add(MIN_STORAGE_RESERVE_YOCTO))
            .expect("Contract reserve calculation overflow");

        let post_balance = env::account_balance().saturating_sub(amount);
        assert!(
            post_balance >= required_post_withdrawal_balance,
            "Contract storage & escrow reserve protection triggered: insufficient unlocked balance"
        );

        // Optimistically zero out caller's claimable balance before promise dispatch (Checks-Effects-Interactions)
        self.claimable_balances.insert(&caller, &0);
        self.total_claimable_yocto = remaining_claimable;
        self.total_pending_withdrawal_yocto = self
            .total_pending_withdrawal_yocto
            .checked_add(amount)
            .expect("Pending withdrawal overflow");

        Promise::new(caller.clone()).transfer(amount).then(
            Self::ext(env::current_account_id())
                .with_static_gas(CALLBACK_GAS)
                .on_withdraw_complete(caller, U128(amount)),
        )
    }

    /// Private callback invoked after `Promise::new(recipient).transfer(amount)` completes.
    /// If the transfer failed for any reason, restores `amount` to `recipient`'s `claimable_balances`.
    #[private]
    pub fn on_withdraw_complete(&mut self, recipient: AccountId, amount: U128) -> bool {
        let amt = amount.0;
        self.total_pending_withdrawal_yocto = self
            .total_pending_withdrawal_yocto
            .checked_sub(amt)
            .expect("Pending withdrawal underflow");

        match env::promise_result(0) {
            PromiseResult::Successful(_) => {
                env::log_str(&format!(
                    "EVENT_JSON:{{\"standard\":\"borrowbond\",\"version\":\"2.0.0\",\"event\":\"withdrawal_completed\",\"data\":{{\"recipient\":\"{}\",\"amount_yocto\":\"{}\"}}}}",
                    recipient, amt
                ));
                true
            }
            _ => {
                // Restore claimable balance so user funds are never lost on failed transfer
                self.credit_claimable(&recipient, amt);
                env::log_str(&format!(
                    "EVENT_JSON:{{\"standard\":\"borrowbond\",\"version\":\"2.0.0\",\"event\":\"withdrawal_restored_after_failure\",\"data\":{{\"recipient\":\"{}\",\"amount_yocto\":\"{}\"}}}}",
                    recipient, amt
                ));
                false
            }
        }
    }

    // ========================================================================
    // 6. VIEW METHODS
    // ========================================================================

    pub fn get_booking(&self, booking_id: String) -> Option<Booking> {
        self.bookings.get(&booking_id)
    }

    pub fn get_claimable_balance(&self, account_id: AccountId) -> U128 {
        U128(self.claimable_balances.get(&account_id).unwrap_or(0))
    }

    pub fn get_contract_metrics(&self) -> (U128, U128, U128, u16, AccountId, AccountId, bool) {
        (
            U128(self.total_locked_escrow_yocto),
            U128(self.total_claimable_yocto),
            U128(self.total_pending_withdrawal_yocto),
            self.fee_bps,
            self.fee_treasury.clone(),
            self.designated_resolver.clone(),
            self.paused,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;

    fn account(name: &str) -> AccountId {
        name.parse().unwrap()
    }

    fn setup_ctx(predecessor: &str, deposit: u128, timestamp_ns: u64) {
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id(account("borrowbondtest.testnet"))
            .predecessor_account_id(account(predecessor))
            .attached_deposit(deposit)
            .block_timestamp(timestamp_ns)
            .account_balance(500 * ONE_NEAR);
        testing_env!(builder.build());
    }

    #[test]
    fn test_exact_1_percent_platform_fee_and_normal_completion() {
        setup_ctx("owner.testnet", 0, 1_000);
        let mut contract = BorrowBondEscrow::new(
            account("owner.testnet"),
            account("resolver.testnet"),
            Some(account("treasury.testnet")),
            Some(100), // 1% = 100 bps
        );

        let rental = 10 * ONE_NEAR;
        let collateral = 100 * ONE_NEAR;
        setup_ctx("borrower.testnet", rental + collateral, 2_000);
        contract.create_booking(
            "bk-1".to_string(),
            "lst-1".to_string(),
            ResourceType::PHYSICAL,
            account("lender.testnet"),
            U128(rental),
            U128(collateral),
            "SN-1001".to_string(),
            "sha256-photos".to_string(),
            10_000,
            50_000,
        );

        setup_ctx("lender.testnet", 0, 3_000);
        contract.accept_booking("bk-1".to_string());
        contract.confirm_handover("bk-1".to_string());

        setup_ctx("borrower.testnet", 0, 4_000);
        let active = contract.confirm_handover("bk-1".to_string());
        assert_eq!(active.status, BookingStatus::ACTIVE);

        contract.request_return("bk-1".to_string());

        setup_ctx("lender.testnet", 0, 5_000);
        let done = contract.confirm_return_and_complete("bk-1".to_string(), "SN-1001".to_string());
        assert_eq!(done.status, BookingStatus::COMPLETED);

        // Expected: fee = 1 NEAR, borrower refund = 99 NEAR, lender payout = 10 NEAR
        assert_eq!(done.platform_fee_yocto.0, 1 * ONE_NEAR);
        assert_eq!(done.borrower_refund_yocto.0, 99 * ONE_NEAR);
        assert_eq!(done.lender_payout_yocto.0, 10 * ONE_NEAR);
        assert_eq!(
            contract.get_claimable_balance(account("borrower.testnet")).0,
            99 * ONE_NEAR
        );
        assert_eq!(
            contract.get_claimable_balance(account("lender.testnet")).0,
            10 * ONE_NEAR
        );
        assert_eq!(
            contract.get_claimable_balance(account("treasury.testnet")).0,
            1 * ONE_NEAR
        );
        assert_eq!(contract.total_locked_escrow_yocto, 0);
    }

    #[test]
    fn test_mutual_damage_negotiation_and_invariant() {
        setup_ctx("owner.testnet", 0, 1_000);
        let mut contract = BorrowBondEscrow::new(
            account("owner.testnet"),
            account("resolver.testnet"),
            Some(account("treasury.testnet")),
            Some(100),
        );

        let rental = 5 * ONE_NEAR;
        let collateral = 50 * ONE_NEAR;
        setup_ctx("borrower.testnet", rental + collateral, 2_000);
        contract.create_booking(
            "bk-dmg".to_string(),
            "lst-1".to_string(),
            ResourceType::DIGITAL,
            account("lender.testnet"),
            U128(rental),
            U128(collateral),
            "SN-DIG-1".to_string(),
            "sha256-dig".to_string(),
            10_000,
            50_000,
        );

        setup_ctx("lender.testnet", 0, 3_000);
        contract.accept_booking("bk-dmg".to_string());

        // Lender proposes 4 NEAR damage deduction
        contract.propose_damage_settlement(
            "bk-dmg".to_string(),
            U128(4 * ONE_NEAR),
            "Minor scratch on case".to_string(),
            "sha256-ev".to_string(),
        );

        // Borrower accepts proposal
        setup_ctx("borrower.testnet", 0, 4_000);
        let settled = contract.accept_damage_proposal("bk-dmg".to_string());
        assert_eq!(settled.status, BookingStatus::RESOLVED);
        // Collateral = 50, Fee (1%) = 0.5, Damage = 4 -> Borrower gets 45.5 NEAR, Lender gets 5 + 4 = 9 NEAR, Treasury gets 0.5 NEAR
        let half_near = ONE_NEAR / 2;
        assert_eq!(settled.treasury_payout_yocto.0, half_near);
        assert_eq!(settled.lender_payout_yocto.0, 9 * ONE_NEAR);
        assert_eq!(settled.borrower_refund_yocto.0, 45 * ONE_NEAR + half_near);
        assert_eq!(
            settled.treasury_payout_yocto.0
                + settled.lender_payout_yocto.0
                + settled.borrower_refund_yocto.0,
            rental + collateral
        );
    }

    #[test]
    #[should_panic(expected = "Platform fee basis points cannot exceed 100 (1.00%)")]
    fn test_reject_fee_above_1_percent() {
        setup_ctx("owner.testnet", 0, 1_000);
        BorrowBondEscrow::new(
            account("owner.testnet"),
            account("resolver.testnet"),
            Some(account("treasury.testnet")),
            Some(101),
        );
    }
}
