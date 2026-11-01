//! Prove fixed-size decoder bits and rejection against independent wire symbols.
//!
//! Run `bun scripts/check-rust-proofs.ts`. Kani checks its own compiler's translation,
//! not native machine code, allocation, caller-buffer commits or masking cryptography.
#![cfg(kani)]

extern crate alloc;
use uuid_slug::UuidSlugAlphabet;

// Import the exact private implementation rather than an executable proof model.
#[path = "../uuid-slug/src/bit_encoding.rs"]
mod bit_encoding;
mod identifier_bits;
