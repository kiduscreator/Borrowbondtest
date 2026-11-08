use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::collections::UnorderedMap;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{
    env, near_bindgen, AccountId, BorshStorageKey, NearToken, PanicOnDefault, Promise,
};

#[derive(BorshSerialize, BorshStorageKey)]
#[borsh(crate = "near_sdk::borsh")]
pub enum StorageKey {
    Bookings,
    ClaimableBalances,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(crate = "near_sdk::serde")]
#[borsh(crate = "near_sdk::borsh")]
pub enum ResourceType {
    Physical,
    Digital,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(crate = "near_sdk::serde")]
#[borsh(crate = "near_sdk::borsh")]
pub enum BookingStatus {
    Requested,
    Accepted,
    Active,
    ReturnRequested,
    Completed,
    Cancelled,
    Expired,
    Disputed,
    Resolved,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(crate = "near_sdk::serde")]
#[borsh(crate = "near_sdk::borsh")]
pub enum DisputeStatus {
    None,
    Open,
    Resolved,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
#[borsh(crate = "near_sdk::borsh")]
pub struct SettlementInfo {
    pub lender_payout_yocto: u128,
    pub borrower_refund_yocto: u128,
    pub settled_at_ns: u64,
    pub resolution_note: Option<String>,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
#[borsh(crate = "near_sdk::borsh")]
pub struct Booking {
    pub booking_id: String,
    pub listing_id: String,
    pub lender: AccountId,
    pub borrower: AccountId,
    pub resource_type: ResourceType,
    pub rental_fee_yocto: u128,
    pub collateral_yocto: u128,
    pub total_escrowed_yocto: u128,
    pub created_at_ns: u64,
    pub acceptance_deadline_ns: u64,
    pub rental_start_ns: u64,
    pub rental_end_ns: u64,
    pub status: BookingStatus,
    pub dispute_status: DisputeStatus,
    pub lender_handover_confirmed: bool,
    pub borrower_handover_confirmed: bool,
    pub lender_return_confirmed: bool,
    pub borrower_return_confirmed: bool,
    pub settlement: Option<SettlementInfo>,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
#[borsh(crate = "near_sdk::borsh")]
pub struct BorrowBondEscrow {
    pub owner: AccountId,
    pub designated_resolver: AccountId,
    pub bookings: UnorderedMap<String, Booking>,
    pub claimable_balances: UnorderedMap<AccountId, u128>,
}

#[near_bindgen]
impl BorrowBondEscrow {
    #[init]
    pub fn new(owner: AccountId, designated_resolver: AccountId) -> Self {
        assert!(!env::state_exists(), "Already initialized");
        Self {
            owner,
            designated_resolver,
            bookings: UnorderedMap::new(StorageKey::Bookings),
            claimable_balances: UnorderedMap::new(StorageKey::ClaimableBalances),
        }
    }

    #[payable]
    pub fn create_booking(
        &mut self,
        booking_id: String,
        listing_id: String,
        lender: AccountId,
        resource_type: ResourceType,
        rental_fee_yocto: u128,
        collateral_yocto: u128,
        acceptance_deadline_ns: u64,
        rental_start_ns: u64,
        rental_end_ns: u64,
    ) -> Booking {
        assert!(
            self.bookings.get(&booking_id).is_none(),
            "Booking ID already exists"
        );
        let borrower = env::predecessor_account_id();
        assert_ne!(borrower, lender, "Borrower and lender must be distinct accounts");
        assert!(rental_fee_yocto > 0, "Rental fee must be positive");
        assert!(rental_end_ns > rental_start_ns, "Invalid rental window");

        let required_total = rental_fee_yocto
            .checked_add(collateral_yocto)
            .expect("Overflow computing total escrow");
        let attached = env::attached_deposit().as_yoctonear();
        assert_eq!(
            attached, required_total,
            "Attached deposit must equal exact rental_fee + collateral"
        );

        let now = env::block_timestamp();
        assert!(
            acceptance_deadline_ns > now,
            "Acceptance deadline must be in the future"
        );

        let booking = Booking {
            booking_id: booking_id.clone(),
            listing_id,
            lender,
            borrower,
            resource_type,
            rental_fee_yocto,
            collateral_yocto,
            total_escrowed_yocto: required_total,
            created_at_ns: now,
            acceptance_deadline_ns,
            rental_start_ns,
            rental_end_ns,
            status: BookingStatus::Requested,
            dispute_status: DisputeStatus::None,
            lender_handover_confirmed: false,
            borrower_handover_confirmed: false,
            lender_return_confirmed: false,
            borrower_return_confirmed: false,
            settlement: None,
        };

        self.bookings.insert(&booking_id, &booking);
        booking
    }

    pub fn accept_booking(&mut self, booking_id: String) -> Booking {
        let mut booking = self.get_booking_or_panic(&booking_id);
        let caller = env::predecessor_account_id();
        assert_eq!(caller, booking.lender, "Only the lender can accept this booking");
        assert_eq!(
            booking.status,
            BookingStatus::Requested,
            "Booking must be in REQUESTED state"
        );
        assert!(
            env::block_timestamp() <= booking.acceptance_deadline_ns,
            "Acceptance deadline has passed"
        );

        booking.status = match booking.resource_type {
            ResourceType::Digital => BookingStatus::Active,
            ResourceType::Physical => BookingStatus::Accepted,
        };

        self.bookings.insert(&booking_id, &booking);
        booking
    }

    pub fn cancel_booking(&mut self, booking_id: String) -> Booking {
        let mut booking = self.get_booking_or_panic(&booking_id);
        let caller = env::predecessor_account_id();
        assert!(
            caller == booking.borrower || caller == booking.lender,
            "Only borrower or lender may cancel before acceptance"
        );
        assert_eq!(
            booking.status,
            BookingStatus::Requested,
            "Only REQUESTED bookings can be cancelled directly"
        );

        booking.status = BookingStatus::Cancelled;
        let refund = booking.total_escrowed_yocto;
        booking.total_escrowed_yocto = 0;
        booking.settlement = Some(SettlementInfo {
            lender_payout_yocto: 0,
            borrower_refund_yocto: refund,
            settled_at_ns: env::block_timestamp(),
            resolution_note: Some("Cancelled prior to acceptance; 100% refunded to borrower".to_string()),
        });

        self.credit_claimable(&booking.borrower, refund);
        self.bookings.insert(&booking_id, &booking);
        booking
    }

    pub fn expire_booking(&mut self, booking_id: String) -> Booking {
        let mut booking = self.get_booking_or_panic(&booking_id);
        assert_eq!(
            booking.status,
            BookingStatus::Requested,
            "Only REQUESTED bookings can expire"
        );
        assert!(
            env::block_timestamp() > booking.acceptance_deadline_ns,
            "Acceptance deadline has not yet passed"
        );

        booking.status = BookingStatus::Expired;
        let refund = booking.total_escrowed_yocto;
        booking.total_escrowed_yocto = 0;
        booking.settlement = Some(SettlementInfo {
            lender_payout_yocto: 0,
            borrower_refund_yocto: refund,
            settled_at_ns: env::block_timestamp(),
            resolution_note: Some("Expired unaccepted; 100% refunded to borrower".to_string()),
        });

        self.credit_claimable(&booking.borrower, refund);
        self.bookings.insert(&booking_id, &booking);
        booking
    }

    pub fn confirm_handover(&mut self, booking_id: String) -> Booking {
        let mut booking = self.get_booking_or_panic(&booking_id);
        assert_eq!(
            booking.status,
            BookingStatus::Accepted,
            "Booking must be in ACCEPTED state to confirm handover"
        );
        let caller = env::predecessor_account_id();
        if caller == booking.lender {
            booking.lender_handover_confirmed = true;
        } else if caller == booking.borrower {
            booking.borrower_handover_confirmed = true;
        } else {
            env::panic_str("Unauthorized caller for handover confirmation");
        }

        if booking.lender_handover_confirmed && booking.borrower_handover_confirmed {
            booking.status = BookingStatus::Active;
        }

        self.bookings.insert(&booking_id, &booking);
        booking
    }

    pub fn request_return(&mut self, booking_id: String) -> Booking {
        let mut booking = self.get_booking_or_panic(&booking_id);
        let caller = env::predecessor_account_id();
        assert_eq!(
            caller, booking.borrower,
            "Only the borrower can initiate a return request"
        );
        assert_eq!(
            booking.status,
            BookingStatus::Active,
            "Booking must be ACTIVE to request return"
        );

        booking.borrower_return_confirmed = true;
        booking.status = BookingStatus::ReturnRequested;
        self.bookings.insert(&booking_id, &booking);
        booking
    }

    pub fn confirm_satisfactory_return(&mut self, booking_id: String) -> Booking {
        let mut booking = self.get_booking_or_panic(&booking_id);
        let caller = env::predecessor_account_id();
        assert!(
            booking.status == BookingStatus::ReturnRequested
                || (booking.resource_type == ResourceType::Digital
                    && booking.status == BookingStatus::Active),
            "Booking must be in RETURN_REQUESTED (or ACTIVE for digital completion)"
        );

        if caller == booking.lender {
            booking.lender_return_confirmed = true;
        } else if caller == booking.borrower {
            booking.borrower_return_confirmed = true;
        } else {
            env::panic_str("Unauthorized caller for return confirmation");
        }

        if booking.lender_return_confirmed && booking.borrower_return_confirmed {
            assert!(booking.settlement.is_none(), "Already settled");
            assert_eq!(booking.dispute_status, DisputeStatus::None, "Disputed booking cannot auto-settle");

            let fee = booking.rental_fee_yocto;
            let collateral = booking.collateral_yocto;
            booking.total_escrowed_yocto = 0;
            booking.status = BookingStatus::Completed;
            booking.settlement = Some(SettlementInfo {
                lender_payout_yocto: fee,
                borrower_refund_yocto: collateral,
                settled_at_ns: env::block_timestamp(),
                resolution_note: Some("Both parties confirmed satisfactory return".to_string()),
            });

            self.credit_claimable(&booking.lender, fee);
            self.credit_claimable(&booking.borrower, collateral);
        }

        self.bookings.insert(&booking_id, &booking);
        booking
    }

    pub fn open_dispute(&mut self, booking_id: String) -> Booking {
        let mut booking = self.get_booking_or_panic(&booking_id);
        let caller = env::predecessor_account_id();
        assert!(
            caller == booking.borrower || caller == booking.lender,
            "Only borrower or lender can open a dispute"
        );
        assert!(
            booking.status == BookingStatus::Active
                || booking.status == BookingStatus::ReturnRequested,
            "Disputes can only be opened on ACTIVE or RETURN_REQUESTED bookings"
        );

        booking.status = BookingStatus::Disputed;
        booking.dispute_status = DisputeStatus::Open;
        self.bookings.insert(&booking_id, &booking);
        booking
    }

    pub fn resolve_dispute(
        &mut self,
        booking_id: String,
        lender_payout_yocto: u128,
        borrower_refund_yocto: u128,
        resolution_note: String,
    ) -> Booking {
        let mut booking = self.get_booking_or_panic(&booking_id);
        let caller = env::predecessor_account_id();
        assert_eq!(
            caller, self.designated_resolver,
            "Only the designated human resolver can resolve a dispute"
        );
        assert_eq!(
            booking.status,
            BookingStatus::Disputed,
            "Booking must be in DISPUTED state"
        );
        assert!(booking.settlement.is_none(), "Booking already settled");

        let allocated = lender_payout_yocto
            .checked_add(borrower_refund_yocto)
            .expect("Overflow in dispute allocation");
        assert_eq!(
            allocated, booking.total_escrowed_yocto,
            "Dispute allocation must equal exact escrowed funds"
        );

        booking.total_escrowed_yocto = 0;
        booking.status = BookingStatus::Resolved;
        booking.dispute_status = DisputeStatus::Resolved;
        booking.settlement = Some(SettlementInfo {
            lender_payout_yocto,
            borrower_refund_yocto,
            settled_at_ns: env::block_timestamp(),
            resolution_note: Some(resolution_note),
        });

        if lender_payout_yocto > 0 {
            self.credit_claimable(&booking.lender, lender_payout_yocto);
        }
        if borrower_refund_yocto > 0 {
            self.credit_claimable(&booking.borrower, borrower_refund_yocto);
        }

        self.bookings.insert(&booking_id, &booking);
        booking
    }

    pub fn withdraw_claimable(&mut self) -> Promise {
        let caller = env::predecessor_account_id();
        let balance = self.claimable_balances.get(&caller).unwrap_or(0);
        assert!(balance > 0, "No claimable balance available");
        self.claimable_balances.insert(&caller, &0);
        Promise::new(caller).transfer(NearToken::from_yoctonear(balance))
    }

    pub fn get_booking(&self, booking_id: String) -> Option<Booking> {
        self.bookings.get(&booking_id)
    }

    pub fn get_claimable_balance(&self, account_id: AccountId) -> u128 {
        self.claimable_balances.get(&account_id).unwrap_or(0)
    }

    fn get_booking_or_panic(&self, booking_id: &String) -> Booking {
        self.bookings
            .get(booking_id)
            .expect("Booking not found on-chain")
    }

    fn credit_claimable(&mut self, account: &AccountId, amount: u128) {
        if amount == 0 {
            return;
        }
        let current = self.claimable_balances.get(account).unwrap_or(0);
        let updated = current
            .checked_add(amount)
            .expect("Overflow crediting claimable balance");
        self.claimable_balances.insert(account, &updated);
    }
}
