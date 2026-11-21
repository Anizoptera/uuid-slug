#![deny(unsafe_code)]
#![cfg_attr(not(feature = "std"), no_std)]
#![cfg_attr(docsrs, feature(doc_cfg))]
#![doc = include_str!("../README.md")]

// Portable representations and masks need owned storage, independently of clocks and entropy.
extern crate alloc;
#[cfg(test)]
extern crate std;

// The one definition of when `uuid-simd` text kernels replace the owned scalar ones. uuid-simd
// 0.8 has hyphenated kernels only for AVX2/SSE4.1, NEON and simd128 (its multiversion.rs) and
// otherwise runs a plain scalar fallback; x86 picks a kernel at run time only with its `detect`
// feature, which our `std` enables. Swapping our proven scalar code for another scalar copy cannot
// gain and was never measured, so SIMD text is selected only where uuid-simd really runs SIMD, and
// every other build compiles exactly like one without the feature. Each call wraps ONE item or
// statement; `if` and `unless` must keep the same predicate.
macro_rules! simd_text_cfg {
    (if $($one:tt)*) => {
        #[cfg(all(feature = "uuid-simd", any(
            all(any(target_arch = "x86", target_arch = "x86_64"), any(feature = "std", target_feature = "sse4.1")),
            all(target_arch = "aarch64", target_feature = "neon"),
            all(target_arch = "wasm32", target_feature = "simd128"),
        )))]
        $($one)*
    };
    (unless $($one:tt)*) => {
        #[cfg(not(all(feature = "uuid-simd", any(
            all(any(target_arch = "x86", target_arch = "x86_64"), any(feature = "std", target_feature = "sse4.1")),
            all(target_arch = "aarch64", target_feature = "neon"),
            all(target_arch = "wasm32", target_feature = "simd128"),
        ))))]
        $($one)*
    };
}

mod alphabet;
mod bit_encoding;
mod buffer_range;
mod error;
mod feistel;
mod generation;
mod generation_state;
mod mask;
mod mask_keys;
mod masking_codec;
mod payload;
mod payload_fields;
#[cfg(feature = "fast-rng")]
mod random;
mod siphash;
mod text;
mod uuid;
// Text backends are chosen at compile time, so an unselected engine never compiles.
simd_text_cfg!(if mod simd_text;);
#[cfg(test)]
simd_text_cfg!(if mod simd_text_tests;);
#[cfg(not(feature = "uuid-interop"))]
mod uuid_text;
#[cfg(test)]
mod uuid_text_tests;

pub use alphabet::UuidSlugAlphabet;
pub use error::{Error, ErrorCode};
pub use generation::{
    MAX_UUID_V7_UNIX_MS, UuidV7Bounds, UuidV7ClockRollbackPolicy, UuidV7Generator,
    generate_uuid_v4_into_with_random_fill, generate_uuid_v4_with_random_fill, uuid_v7_bounds,
};
#[cfg(feature = "os-rng")]
pub use generation::{
    fill_os_random_bytes, generate_uuid_v4, generate_uuid_v4_batch, generate_uuid_v4_into,
};
#[cfg(all(feature = "std", feature = "os-rng"))]
pub use generation::{generate_uuid_v7, generate_uuid_v7_into};
pub use mask::{
    UuidV7Mask, UuidV7MaskDerivationCancellation, derive_uuid_v7_mask, derive_uuid_v7_mask_async,
    uuid_v7_test_mask,
};
pub use masking_codec::{
    MaskedOrSentinelUuidV7Bytes, MaskedUuidV7Bytes, UuidSlugMigrationDecoder,
    UuidSlugMigrationFormat, UuidSlugMigrationOptions, UuidV7MaskingCodec,
    UuidV7MaskingCodecOptions, UuidV7PreviousMask, UuidV7Sentinel, UuidV7TimestampWindow,
};
pub use payload::MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS;
pub use text::KeylessUuidText;
pub use uuid::{
    MAX_UUID, MaskedOrSentinelUuidV7Slug, MaskedUuidV7Slug, NIL_UUID, PlainUuidSlug, Uuid,
    UuidV7Payload, UuidV7PayloadField, UuidV7PayloadLayout, UuidVariant,
};
