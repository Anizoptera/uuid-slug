//! Prove wire bits, UUID operations and generation without assuming cryptographic strength.
//!
//! Run `bun scripts/check-rust-proofs.ts`. Kani checks its own compiler's translation,
//! not native machine code, allocation failure, OS entropy or cryptographic strength.
#![cfg(kani)]

extern crate alloc;
use uuid_slug::UuidSlugAlphabet;

// These contracts concern values, error codes and caller state, not diagnostic spelling.
// Trust standard formatting to return without side effects; allocation failure and formatter
// implementation are outside the theorem. No identifier computation is replaced.
#[expect(
    dead_code,
    reason = "Kani resolves this replacement through stub metadata, not a Rust call"
)]
fn diagnostic_text(_: core::fmt::Arguments<'_>) -> alloc::string::String {
    alloc::string::String::new()
}

// Import the exact private implementation rather than an executable proof model.
#[path = "../uuid-slug/src/bit_encoding.rs"]
mod bit_encoding;
mod generation_contract;
mod identifier_bits;
mod text_contract;
mod uuid_contract;

#[path = "../uuid-slug/src/feistel.rs"]
mod feistel;
mod feistel_contract;
#[path = "../uuid-slug/src/siphash.rs"]
mod siphash;
