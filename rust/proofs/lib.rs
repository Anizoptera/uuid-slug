//! Prove wire bits, UUID operations and generation without assuming cryptographic strength.
//!
//! Run `bun scripts/check-rust-proofs.ts`. Kani checks its own compiler's translation,
//! not native machine code, allocation failure, OS entropy or cryptographic strength.
#![cfg(kani)]

extern crate alloc;
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
#[path = "../uuid-slug/src/payload_fields.rs"]
mod payload_fields;

#[path = "../uuid-slug/src/buffer_range.rs"]
mod buffer_range;
#[path = "../uuid-slug/src/generation_state.rs"]
mod generation_state;

mod generation {
    include!("../uuid-slug/src/generation.rs");
    include!("generation_transition.rs");
    // Call the real private state engine after clock normalization. This adapter performs no
    // selection or mutation; numeric/SystemTime normalization has separate proof boundaries.
    pub(super) fn from_parts(
        generator: &mut UuidV7Generator,
        unix_ms: u64,
        fraction_12: u16,
        fill: impl FnMut(&mut [u8]) -> Result<(), Error>,
    ) -> Result<Uuid, Error> {
        generator.generate_uuid_v7_from_instant(
            UuidV7Instant {
                unix_ms,
                fraction_12,
            },
            fill,
        )
    }
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
