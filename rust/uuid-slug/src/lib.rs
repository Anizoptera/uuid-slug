//! Compact UUIDs preserve their bytes across plain and reversible masked representations.
//!
//! Masking hides structure; its 16-bit check is not authentication. Match decoded candidates
//! against your own store. Use your own seed: the default seed is public.

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
pub use error::Error;
pub use schema::{MaskSchema, create_mask_schema, create_mask_schema_async};
pub use uuid::Uuid;
