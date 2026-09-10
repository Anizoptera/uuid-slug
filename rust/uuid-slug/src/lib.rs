//! Compact UUIDs preserve their bytes across plain and reversible masked representations.
//!
//! Masking hides structure; its 16-bit check is not authentication. Match decoded candidates
//! against your own store. Select private key material explicitly for real identifiers.

#![forbid(unsafe_code)]
#![doc = include_str!("../README.md")]

pub mod alphabet;
pub mod codec;
pub mod error;
pub mod generation;
mod mask;
pub mod schema;
mod siphash;
pub mod uuid;

pub use alphabet::Alphabet;
pub use codec::{
    Codec, CodecOptions, Freshness, Migration, MigrationFormat, MigrationOptions, Sentinel,
};
pub use error::{Error, ErrorCode};
pub use schema::{MaskSchema, create_mask_schema, create_mask_schema_async, public_mask_schema};
pub use uuid::Uuid;
