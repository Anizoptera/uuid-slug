//! Prove fixed-size wire bits and exact reversibility without assuming cryptographic strength.
//!
//! Run `bun scripts/check-rust-proofs.ts`. Kani checks its own compiler's translation,
//! not native machine code, allocation, caller-buffer commits or cryptographic strength.
#![cfg(kani)]

extern crate alloc;
use uuid_slug::UuidSlugAlphabet;

// Import the exact private implementation rather than an executable proof model.
#[path = "../uuid-slug/src/bit_encoding.rs"]
mod bit_encoding;
mod identifier_bits;

#[path = "../uuid-slug/src/feistel.rs"]
mod feistel;
mod feistel_contract;
#[path = "../uuid-slug/src/siphash.rs"]
mod siphash;
