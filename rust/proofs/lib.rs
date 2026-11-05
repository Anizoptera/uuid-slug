//! Prove wire bits, UUID operations and generation without assuming cryptographic strength.
//!
//! Run `bun scripts/check-rust-proofs.ts`. Kani checks its own compiler's translation,
//! not native machine code, allocation failure, OS entropy or cryptographic strength.
//! Parser proofs cover the four supported text lengths; buffer-write proofs admit slices up to
//! two UUID slots and every usize offset. Generation transitions start after clock normalization.
//! These kernel and bounded API proofs do not prove the complete masking codec's key selection,
//! sentinel/migration policies, asynchronous derivation or entropy lifecycle.
#![cfg(kani)]

extern crate alloc;
// The state engine calls Error::with_message, which is crate-private. Import its actual type
// graph too; public crate types cannot grant that access, and a proof must not widen the API.
#[path = "../uuid-slug/src/error.rs"]
mod error;
use error::{Error, ErrorCode};
#[path = "../uuid-slug/src/alphabet.rs"]
mod alphabet;
use alphabet::UuidSlugAlphabet;
#[path = "../uuid-slug/src/text.rs"]
mod text;
use text::KeylessUuidText;
#[path = "../uuid-slug/src/uuid.rs"]
mod uuid;
use uuid::{PlainUuidSlug, Uuid, UuidV7PayloadLayout};
#[path = "../uuid-slug/src/uuid_text.rs"]
mod uuid_text;
#[path = "../uuid-slug/src/payload_fields.rs"]
mod payload_fields;

#[path = "../uuid-slug/src/buffer_range.rs"]
mod buffer_range;
#[path = "../uuid-slug/src/generation_state.rs"]
mod generation_state;

mod generation {
    include!("../uuid-slug/src/generation.rs");
    include!("generation_transition.rs");
}

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
mod hash_contract;
mod identifier_bits;
mod text_contract;
mod uuid_contract;

#[path = "../uuid-slug/src/feistel.rs"]
mod feistel;
mod feistel_contract;
#[path = "../uuid-slug/src/siphash.rs"]
mod siphash;
