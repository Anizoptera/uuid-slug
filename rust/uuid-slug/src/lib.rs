//! Any UUID encodes losslessly as a base64url or base32hex slug. UUIDv7 additionally supports
//! reversible masking.
//!
//! Masking hides structure; its 16-bit check is not authentication. Match decoded candidates
//! against your own store. Select private key material explicitly for real identifiers.

#![forbid(unsafe_code)]
#![doc = include_str!("../README.md")]

pub mod alphabet;
pub mod codec;
pub mod error;
pub mod generation;
pub mod mask;
mod payload;
mod siphash;
pub mod uuid;

pub use alphabet::Alphabet;
pub use codec::{
    Codec, CodecOptions, MigrationDecoder, MigrationFormat, MigrationOptions, Sentinel,
    UuidV7TimestampWindow,
};
pub use error::{Error, ErrorCode};
pub use mask::{Mask, create_mask, create_mask_async, public_mask};
pub use payload::MAX_MASKED_UUID_V7_UNIX_MS;
pub use uuid::Uuid;
