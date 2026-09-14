//! Any UUID encodes losslessly as a base64url or base32hex slug. UUIDv7 additionally supports
//! reversible masking.
//!
//! Masking hides structure; its 16-bit check is not authentication. Match decoded candidates
//! against your own store. Select private key material explicitly for real identifiers.

#![forbid(unsafe_code)]
#![doc = include_str!("../README.md")]

mod alphabet;
mod error;
mod generation;
mod mask;
mod masking_codec;
mod payload;
mod siphash;
mod uuid;

pub use alphabet::UuidSlugAlphabet;
pub use error::{Error, ErrorCode};
pub use generation::{
    MAX_UUID_V7_UNIX_MS, UuidV7Bounds, UuidV7ClockRollbackPolicy, UuidV7Generator,
    generate_uuid_v4_into_with_random_fill, generate_uuid_v4_with_random_fill, uuid_v7_bounds,
};
#[cfg(feature = "os-rng")]
pub use generation::{fill_os_random_bytes, generate_uuid_v4};
pub use mask::{
    UuidV7Mask, UuidV7MaskDerivationCancellation, derive_uuid_v7_mask, derive_uuid_v7_mask_async,
    uuid_v7_test_mask,
};
pub use masking_codec::{
    UuidSlugMigrationDecoder, UuidSlugMigrationFormat, UuidSlugMigrationOptions,
    UuidV7MaskingCodec, UuidV7MaskingCodecOptions, UuidV7PreviousMask, UuidV7Sentinel,
    UuidV7TimestampWindow,
};
pub use payload::MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS;
pub use uuid::{
    MAX_UUID, MaskedOrSentinelUuidV7Slug, MaskedUuidV7Slug, NIL_UUID, PlainUuidSlug, Uuid,
};
