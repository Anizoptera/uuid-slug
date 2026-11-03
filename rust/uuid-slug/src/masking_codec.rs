//! A UUIDv7 masking codec owns its keys and reserved identities so keyed operations cannot use another codec's key.

mod masked_bytes;
pub use masked_bytes::{MaskedOrSentinelUuidV7Bytes, MaskedUuidV7Bytes};

use crate::{
    Error, ErrorCode, MaskedOrSentinelUuidV7Slug, MaskedUuidV7Slug, PlainUuidSlug, Uuid,
    UuidSlugAlphabet, UuidV7Mask, UuidV7Payload, UuidV7PayloadLayout,
};
use alloc::{borrow::Cow, format, string::String, vec, vec::Vec};

/// A named UUID emitted as a plain slug instead of through the mask.
#[derive(Clone, Debug)]
pub struct UuidV7Sentinel {
    /// Application name for this reserved UUID.
    pub name: String,
    /// Reserved UUIDv7.
    pub uuid: Uuid,
    /// Plain slug in the codec's `masked_slug_alphabet`.
    pub plain_uuid_slug: PlainUuidSlug,
}

#[cfg(test)]
mod tests {
    use super::*;
    use alloc::{borrow::ToOwned, string::ToString};
    use std::sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    };

    fn uuid_at(timestamp: u64) -> Uuid {
        let mut bytes = [0; 16];
        bytes[..6].copy_from_slice(&timestamp.to_be_bytes()[2..]);
        bytes[6] = 0x70;
        bytes[8] = 0x80;
        Uuid::from_uuid_bytes_array(bytes)
    }

    #[test]
    fn default_construction_matches_explicit_default_options() -> Result<(), Error> {
        let mask = crate::uuid_v7_test_mask();
        let default = UuidV7MaskingCodec::new(mask.clone());
        let configured = UuidV7MaskingCodec::from_options(UuidV7MaskingCodecOptions::new(mask))?;
        for timestamp in [0, crate::MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS] {
            let uuid = uuid_at(timestamp);
            let slug = default.uuid_to_masked_slug(uuid)?;
            assert_eq!(slug.len(), 22);
            assert_eq!(slug, configured.uuid_to_masked_slug(uuid)?);
            assert_eq!(configured.masked_slug_to_uuid(&slug)?, uuid);
        }
        assert!(default.sentinels().is_empty());
        assert_eq!(
            default
                .uuid_to_masked_slug(uuid_at(crate::MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS + 1))
                .unwrap_err()
                .code(),
            ErrorCode::InvalidTimestamp
        );
        Ok(())
    }

    #[test]
    fn timestamp_validation_borrows_canonical_slugs_and_normalizes_base32_case() -> Result<(), Error>
    {
        let uuid = Uuid::from_uuid_string("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051")?;
        let window = UuidV7TimestampWindow {
            reference_unix_ms: uuid.extract_uuid_v7_unix_ms()? as f64,
            max_timestamp_delta_ms: 0.0,
        };
        for masked_slug_alphabet in [UuidSlugAlphabet::Base64Url, UuidSlugAlphabet::Base32Hex] {
            let codec = UuidV7MaskingCodec::from_options(UuidV7MaskingCodecOptions {
                masked_slug_alphabet,
                sentinels: vec![(
                    "reserved".to_owned(),
                    Uuid::from_uuid_string("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4052")?,
                )],
                ..UuidV7MaskingCodecOptions::new(crate::uuid_v7_test_mask())
            })?;
            let slug = codec.uuid_to_masked_slug(uuid)?;
            let validated = codec.validate_masked_uuid_v7_slug_unix_ms(&slug, window)?;
            assert!(matches!(validated, Cow::Borrowed(_)));
            assert_eq!(validated, slug.as_str());
            if masked_slug_alphabet == UuidSlugAlphabet::Base32Hex {
                let uppercase = slug.to_ascii_uppercase();
                assert_ne!(uppercase, slug.as_str());
                let normalized = codec.validate_masked_uuid_v7_slug_unix_ms(&uppercase, window)?;
                assert!(matches!(normalized, Cow::Owned(_)));
                assert_eq!(normalized, slug.as_str());
                let sentinel = &codec.sentinels()[0].plain_uuid_slug;
                let canonical = codec.validate_masked_uuid_v7_slug_unix_ms(sentinel, window)?;
                assert!(matches!(canonical, Cow::Borrowed(_)));
                let uppercase = sentinel.to_ascii_uppercase();
                let normalized = codec.validate_masked_uuid_v7_slug_unix_ms(&uppercase, window)?;
                assert!(matches!(normalized, Cow::Owned(_)));
                assert_eq!(normalized, sentinel.as_str());
            }
        }
        Ok(())
    }

    #[test]
    fn masked_writers_accept_the_timestamp_endpoint_and_reject_its_successor() -> Result<(), Error>
    {
        for masked_slug_alphabet in [UuidSlugAlphabet::Base64Url, UuidSlugAlphabet::Base32Hex] {
            let codec = UuidV7MaskingCodec::from_options(UuidV7MaskingCodecOptions {
                masked_slug_alphabet,
                ..UuidV7MaskingCodecOptions::new(crate::uuid_v7_test_mask())
            })?;
            let epoch = codec.uuid_to_masked_slug(uuid_at(0))?;
            assert_eq!(
                codec
                    .masked_slug_to_uuid(&epoch)?
                    .extract_uuid_v7_unix_ms()?,
                0
            );
            assert!(
                codec
                    .uuid_to_masked_slug(uuid_at(crate::MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS))
                    .is_ok()
            );
            assert_eq!(
                codec
                    .uuid_to_masked_slug(uuid_at(crate::MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS + 1))
                    .unwrap_err()
                    .code(),
                ErrorCode::InvalidTimestamp
            );
            let sentinel = uuid_at(crate::MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS + 1);
            let codec = UuidV7MaskingCodec::from_options(UuidV7MaskingCodecOptions {
                masked_slug_alphabet,
                sentinels: vec![("future".to_owned(), sentinel)],
                ..UuidV7MaskingCodecOptions::new(crate::uuid_v7_test_mask())
            })?;
            assert_eq!(
                codec.uuid_to_masked_slug(sentinel)?,
                MaskedOrSentinelUuidV7Slug::Sentinel(
                    sentinel.to_plain_uuid_slug(masked_slug_alphabet)
                )
            );
            let plain = sentinel.to_plain_uuid_slug(masked_slug_alphabet);
            assert_eq!(codec.masked_slug_to_uuid(&plain)?, sentinel);
            if masked_slug_alphabet == UuidSlugAlphabet::Base32Hex {
                assert_eq!(codec.masked_slug_to_uuid(&plain.to_uppercase())?, sentinel);
            }
        }
        Ok(())
    }

    #[test]
    fn shifted_range_preserves_uuid_and_previous_range() -> Result<(), Error> {
        let start = 1 << 42;
        let old_mask = crate::uuid_v7_test_mask();
        let writer = UuidV7MaskingCodec::from_options(UuidV7MaskingCodecOptions {
            timestamp_range_start_unix_ms: start,
            ..UuidV7MaskingCodecOptions::new(old_mask.clone())
        })?;
        for timestamp in [start, start + crate::MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS] {
            let uuid = uuid_at(timestamp);
            let slug = writer.uuid_to_masked_slug(uuid)?;
            assert_eq!(writer.masked_slug_to_uuid(&slug)?, uuid);
        }
        assert_eq!(
            writer
                .uuid_to_masked_slug(uuid_at(start - 1))
                .unwrap_err()
                .code(),
            ErrorCode::InvalidTimestamp
        );
        let uuid = uuid_at(start);
        let slug = writer.uuid_to_masked_slug(uuid)?;
        let reader = UuidV7MaskingCodec::from_options(UuidV7MaskingCodecOptions {
            previous_masks: vec![UuidV7PreviousMask {
                mask: old_mask,
                timestamp_range_start_unix_ms: start,
            }],
            ..UuidV7MaskingCodecOptions::new(crate::mask::derive_uuid_v7_mask(
                b"new shifted-range test seed",
                1,
            )?)
        })?;
        assert_eq!(reader.masked_slug_to_uuid(&slug)?, uuid);
        Ok(())
    }

    #[test]
    fn shifted_range_must_fit_uuid_v7_timestamp() {
        let max_start = (1_u64 << 48) - 1 - crate::MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS;
        let latest = uuid_at((1_u64 << 48) - 1);
        let last_range = UuidV7MaskingCodec::from_options(UuidV7MaskingCodecOptions {
            timestamp_range_start_unix_ms: max_start,
            ..UuidV7MaskingCodecOptions::new(crate::uuid_v7_test_mask())
        })
        .expect("last complete range must fit");
        let slug = last_range
            .uuid_to_masked_slug(latest)
            .expect("latest UUIDv7 must fit the last range");
        assert_eq!(
            last_range
                .masked_slug_to_uuid(&slug)
                .expect("latest UUIDv7 must decode"),
            latest
        );
        let error = UuidV7MaskingCodec::from_options(UuidV7MaskingCodecOptions {
            timestamp_range_start_unix_ms: max_start + 1,
            ..UuidV7MaskingCodecOptions::new(crate::uuid_v7_test_mask())
        })
        .expect_err("range beyond UUIDv7 must fail");
        assert_eq!(error.code(), ErrorCode::InvalidTimestamp);
        assert_eq!(
            error.to_string(),
            format!(
                "timestamp_range_start_unix_ms must be from 0 through {max_start}; got {}.",
                max_start + 1
            )
        );
    }

    #[test]
    fn masked_writers_reject_generic_uuid_boundaries() -> Result<(), Error> {
        let codec = UuidV7MaskingCodec::new(crate::uuid_v7_test_mask());
        for uuid in [crate::NIL_UUID, crate::MAX_UUID] {
            assert_eq!(
                codec.uuid_to_masked_slug(uuid).unwrap_err().code(),
                ErrorCode::InvalidUuidVersion
            );
        }
        Ok(())
    }

    #[test]
    fn timestamp_window_accepts_structurally_valid_v7_endpoint_values() -> Result<(), Error> {
        let window = UuidV7TimestampWindow {
            reference_unix_ms: 1_234_567_890_000.0,
            max_timestamp_delta_ms: 0.0,
        };
        for text in [
            "011f71fb-0450-7000-8000-000000000000",
            "011f71fb-0450-7fff-bfff-ffffffffffff",
        ] {
            let uuid = Uuid::from_uuid_string(text)?;
            assert_eq!(window.validate_uuid_v7(uuid)?, uuid);
        }
        Ok(())
    }

    #[test]
    fn timestamp_window_reports_a_valid_uuid_of_the_wrong_version() -> Result<(), Error> {
        let uuid = Uuid::from_uuid_string("1f04e7f5-c0c6-4044-b5a3-6278bb77ffb4")?;
        let error = UuidV7TimestampWindow {
            reference_unix_ms: 0.0,
            max_timestamp_delta_ms: 0.0,
        }
        .validate_uuid_v7(uuid)
        .expect_err("UUIDv4 must not have a UUIDv7 timestamp");
        assert_eq!(error.code(), ErrorCode::InvalidUuidVersion);
        Ok(())
    }

    #[test]
    fn sentinel_names_are_nonempty_and_unique() -> Result<(), Error> {
        let uuid = Uuid::from_uuid_string("00000000-0000-7000-8000-000000000000")?;
        for sentinels in [
            vec![(String::new(), uuid)],
            vec![("nil".to_owned(), uuid), ("nil".to_owned(), uuid_at(1))],
        ] {
            let error = UuidV7MaskingCodec::from_options(UuidV7MaskingCodecOptions {
                sentinels,
                ..UuidV7MaskingCodecOptions::new(crate::uuid_v7_test_mask())
            })
            .expect_err("invalid sentinel names must fail codec construction");
            assert_eq!(error.code(), ErrorCode::InvalidSentinel);
        }
        Ok(())
    }

    #[test]
    fn ciphertext_cannot_alias_a_reserved_identity() -> Result<(), Error> {
        let uuid = Uuid::from_uuid_string("019ff19b-58b8-7000-9b1b-df713bd55607")?;
        let reserved = Uuid::from_uuid_string("00000000-0000-7000-8000-000000000000")?;
        let identity = UuidV7Mask::from_permutation_functions("identity", Ok, Ok)?;
        let (tagged, tail) = crate::payload::mask_bytes(uuid.as_uuid_bytes(), &identity, 0)?;
        assert_eq!(
            tail, 0,
            "The collision must pass the earlier padding condition"
        );
        let delta: [u8; 16] = std::array::from_fn(|i| tagged[i] ^ reserved.as_uuid_bytes()[i]);
        let transform = move |input: [u8; 16]| Ok(std::array::from_fn(|i| input[i] ^ delta[i]));
        let collision = UuidV7Mask::from_permutation_functions("collision", transform, transform)?;
        assert_eq!(
            crate::payload::mask_bytes(uuid.as_uuid_bytes(), &collision, 0)?,
            (*reserved.as_uuid_bytes(), 0)
        );
        for alphabet in [UuidSlugAlphabet::Base64Url, UuidSlugAlphabet::Base32Hex] {
            let codec = UuidV7MaskingCodec::from_options(UuidV7MaskingCodecOptions {
                sentinels: vec![("nil".to_owned(), reserved)],
                masked_slug_alphabet: alphabet,
                ..UuidV7MaskingCodecOptions::new(collision.clone())
            })?;
            assert_eq!(
                codec.uuid_to_masked_slug(uuid).unwrap_err().code(),
                ErrorCode::InvalidMask
            );
            assert_eq!(
                codec.masked_slug_to_uuid(&reserved.to_plain_uuid_slug(alphabet))?,
                reserved
            );
        }
        Ok(())
    }

    #[test]
    fn mixed_parser_preserves_retained_overlap_meanings() -> Result<(), Error> {
        let fixtures: serde_json::Value = serde_json::from_str(include_str!(
            "../tests/fixtures/fixtures-original-slugs.json"
        ))
        .unwrap();
        let overlap = &fixtures["overlap"];
        let slug = overlap["slug"].as_str().unwrap();
        let mask = crate::derive_uuid_v7_mask(overlap["seed"].as_str().unwrap().as_bytes(), 1)?;
        let codec = UuidV7MaskingCodec::new(mask);
        let masked = Uuid::from_uuid_string(overlap["currentUuid"].as_str().unwrap())?;
        let plain = Uuid::from_uuid_string(overlap["plainUuid"].as_str().unwrap())?;
        assert_ne!(masked, plain);
        assert_eq!(codec.parse_uuid(slug)?, masked);
        assert_eq!(Uuid::from_plain_uuid_slug(slug)?, plain);
        // Flip only the outer check, leaving the encrypted block intact. Neither masked
        // validation nor canonical plain decoding can accept this spelling.
        let (bytes, tail) = crate::payload::normalize(slug)?;
        assert_eq!(tail, 0);
        let rejected = UuidSlugAlphabet::Base64Url.encode_tail(&bytes, tail ^ 1, 4)?;
        assert_eq!(
            codec.masked_slug_to_uuid(&rejected).unwrap_err().code(),
            ErrorCode::InvalidUuidSlug
        );
        assert_eq!(
            codec.parse_uuid(&rejected).unwrap_err().code(),
            ErrorCode::InvalidUuidSlug
        );
        Ok(())
    }

    #[test]
    fn callback_failure_respects_first_result_and_atomic_candidates() -> Result<(), Error> {
        assert!(
            UuidV7Mask::from_permutation_functions(
                "not-an-inverse",
                |_| Ok([1; 16]),
                |_| Ok([1; 16])
            )
            .is_err()
        );
        assert!(
            UuidV7Mask::from_permutation_functions(
                "failed",
                |_| Err(Error::new(ErrorCode::InvalidBuffer)),
                Ok,
            )
            .is_err()
        );
        let failing = Arc::new(AtomicBool::new(false));
        let flag = failing.clone();
        let fallible = move |input| {
            if flag.load(Ordering::Relaxed) {
                Err(Error::new(ErrorCode::InvalidBuffer))
            } else {
                Ok(input)
            }
        };
        let custom =
            UuidV7Mask::from_permutation_functions("fallible", fallible.clone(), fallible)?;
        let uuid = Uuid::from_uuid_string("01234567-89ab-7cde-8fab-0123456789ab")?;
        let good = crate::uuid_v7_test_mask();
        let writer = UuidV7MaskingCodec::new(crate::uuid_v7_test_mask());
        let slug = writer.uuid_to_masked_slug(uuid)?;
        let fallback = UuidV7MaskingCodec::from_options(UuidV7MaskingCodecOptions {
            previous_masks: vec![UuidV7PreviousMask::new(good.clone())],
            sentinels: vec![("reserved".to_owned(), uuid_at(0))],
            ..UuidV7MaskingCodecOptions::new(custom.clone())
        })?;
        let first = UuidV7MaskingCodec::from_options(UuidV7MaskingCodecOptions {
            previous_masks: vec![UuidV7PreviousMask::new(custom)],
            ..UuidV7MaskingCodecOptions::new(good)
        })?;
        failing.store(true, Ordering::Relaxed);
        let error = fallback.masked_slug_to_uuid(&slug).unwrap_err();
        assert_eq!(error.code(), ErrorCode::InvalidMask);
        assert!(std::error::Error::source(&error).is_some());
        // Plain fallback must not hide an operational error, even when its padding is valid.
        let plain = uuid.to_plain_uuid_slug(UuidSlugAlphabet::Base64Url);
        let error = fallback.parse_uuid(&plain).unwrap_err();
        assert_eq!(error.code(), ErrorCode::InvalidMask);
        let cause = std::error::Error::source(&error).unwrap();
        assert_eq!(
            cause.downcast_ref::<Error>().unwrap().code(),
            ErrorCode::InvalidBuffer
        );
        assert_eq!(first.parse_uuid(&slug)?, uuid);
        assert_eq!(fallback.parse_uuid(&uuid.to_string())?, uuid);
        assert_eq!(
            fallback.parse_uuid(&uuid.to_plain_uuid_slug(UuidSlugAlphabet::Base32Hex))?,
            uuid
        );
        for alphabet in [UuidSlugAlphabet::Base64Url, UuidSlugAlphabet::Base32Hex] {
            let sentinel = uuid_at(0).to_plain_uuid_slug(alphabet);
            assert_eq!(fallback.parse_uuid(&sentinel)?, uuid_at(0));
        }
        let migration =
            first.create_uuid_slug_migration_decoder(UuidSlugMigrationOptions::default());
        assert_eq!(
            migration.uuid_slug_to_uuid(&slug, Some(UuidSlugMigrationFormat::CurrentMaskedSlug))?,
            uuid
        );
        // Candidate enumeration cannot expose its earlier result after a later callback fails.
        let error = migration
            .uuid_slug_to_uuid_candidates(&slug, Some(UuidSlugMigrationFormat::CurrentMaskedSlug))
            .unwrap_err();
        assert_eq!(error.code(), ErrorCode::InvalidMask);
        assert!(std::error::Error::source(&error).is_some());
        Ok(())
    }
}

/// UUIDv7 masking options. Masked slugs use base64url by default.
#[derive(Debug)]
pub struct UuidV7MaskingCodecOptions {
    /// Current write key; decoding tries this before previous keys.
    pub mask: UuidV7Mask,
    /// First Unix millisecond accepted by the current mask. The default is zero.
    pub timestamp_range_start_unix_ms: u64,
    /// Previous keys to try after the current key, in this order. No other keys are tried.
    pub previous_masks: Vec<UuidV7PreviousMask>,
    /// Alphabet for masked slugs and sentinel plain slugs.
    pub masked_slug_alphabet: UuidSlugAlphabet,
    /// Reserved UUIDv7 values. Names must be nonempty and unique; UUIDs must also be unique. An empty list disables sentinels.
    pub sentinels: Vec<(String, Uuid)>,
}

impl UuidV7MaskingCodecOptions {
    /// Create default options with this current mask.
    pub fn new(mask: UuidV7Mask) -> Self {
        Self {
            mask,
            timestamp_range_start_unix_ms: 0,
            previous_masks: Vec::new(),
            masked_slug_alphabet: UuidSlugAlphabet::Base64Url,
            sentinels: Vec::new(),
        }
    }
}

/// A previous read key and the timestamp-range start used to write its stored IDs.
#[derive(Debug)]
pub struct UuidV7PreviousMask {
    /// Mask used to read existing IDs.
    pub mask: UuidV7Mask,
    /// First Unix millisecond accepted by this mask.
    pub timestamp_range_start_unix_ms: u64,
}

impl UuidV7PreviousMask {
    /// Retain a mask whose timestamp range starts at Unix millisecond zero.
    pub fn new(mask: UuidV7Mask) -> Self {
        Self {
            mask,
            timestamp_range_start_unix_ms: 0,
        }
    }
}

#[derive(Debug)]
struct MaskRange {
    mask: UuidV7Mask,
    timestamp_range_start_unix_ms: u64,
}

/// Immutable configuration for UUIDv7 masking and decoding. Generators own the mutable sequence state.
#[derive(Debug)]
pub struct UuidV7MaskingCodec {
    masks: Vec<MaskRange>,
    sentinels: Vec<UuidV7Sentinel>,
    reserved: Vec<(PlainUuidSlug, Uuid)>,
    masked: UuidSlugAlphabet,
}

impl UuidV7MaskingCodec {
    /// Use an explicit mask with base64url output, a timestamp range starting at zero,
    /// and no previous keys or sentinels. Use [`Self::from_options`] to configure those choices.
    ///
    /// ```
    /// use uuid_slug::{derive_uuid_v7_mask, UuidV7MaskingCodec};
    /// # fn main() -> Result<(), uuid_slug::Error> {
    /// let mask = derive_uuid_v7_mask(b"replace-with-your-own-private-seed", 1)?;
    /// let masking_codec = UuidV7MaskingCodec::new(mask);
    /// # assert!(masking_codec.sentinels().is_empty());
    /// # Ok(())
    /// # }
    /// ```
    pub fn new(mask: UuidV7Mask) -> Self {
        // These defaults cannot violate configurable range or sentinel constraints.
        // Construct directly rather than exposing an impossible error or panic to callers.
        Self {
            masks: vec![MaskRange {
                mask,
                timestamp_range_start_unix_ms: 0,
            }],
            sentinels: Vec::new(),
            reserved: Vec::new(),
            masked: UuidSlugAlphabet::Base64Url,
        }
    }

    /// Configure output spelling, timestamp ranges, previous keys and reserved UUIDv7 identities.
    /// Invalid ranges return `InvalidTimestamp`; duplicate or empty sentinel names or duplicate
    /// identities return `InvalidSentinel`; non-v7 sentinels return `InvalidUuidVersion`.
    pub fn from_options(options: UuidV7MaskingCodecOptions) -> Result<Self, Error> {
        let max_start = crate::MAX_UUID_V7_UNIX_MS - crate::MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS;
        if options.timestamp_range_start_unix_ms > max_start {
            return Err(
                Error::new(ErrorCode::InvalidTimestamp).with_message(format!(
                    "timestamp_range_start_unix_ms must be from 0 through {max_start}; got {}.",
                    options.timestamp_range_start_unix_ms
                )),
            );
        }
        if let Some(previous) = options
            .previous_masks
            .iter()
            .find(|previous| previous.timestamp_range_start_unix_ms > max_start)
        {
            return Err(Error::new(ErrorCode::InvalidTimestamp).with_message(format!(
                "previous_masks[].timestamp_range_start_unix_ms must be from 0 through {max_start}; got {}.",
                previous.timestamp_range_start_unix_ms
            )));
        }
        let mut sentinels: Vec<UuidV7Sentinel> = Vec::new();
        let mut reserved = Vec::new();
        for (name, uuid) in options.sentinels {
            if name.is_empty() {
                return Err(Error::new(ErrorCode::InvalidSentinel)
                    .with_message("Sentinel name must not be empty."));
            }
            if sentinels.iter().any(|entry| entry.name == name) {
                return Err(Error::new(ErrorCode::InvalidSentinel).with_message(format!(
                    "Sentinel name {name:?} must be unique within one masking codec."
                )));
            }
            uuid.extract_uuid_v7_unix_ms().map_err(|_| {
                Error::new(ErrorCode::InvalidUuidVersion).with_message(format!(
                    "Sentinel {name:?} must be an RFC-variant UUIDv7; got {uuid}."
                ))
            })?;
            if sentinels.iter().any(|entry| entry.uuid == uuid) {
                return Err(Error::new(ErrorCode::InvalidSentinel).with_message(format!(
                    "Sentinel {name:?} repeats an earlier sentinel UUID: {uuid}."
                )));
            }
            let plain_uuid_slug = uuid.to_plain_uuid_slug(options.masked_slug_alphabet);
            reserved.push((uuid.to_plain_uuid_slug(UuidSlugAlphabet::Base64Url), uuid));
            reserved.push((uuid.to_plain_uuid_slug(UuidSlugAlphabet::Base32Hex), uuid));
            sentinels.push(UuidV7Sentinel {
                name,
                uuid,
                plain_uuid_slug,
            });
        }
        let mut masks = vec![MaskRange {
            mask: options.mask,
            timestamp_range_start_unix_ms: options.timestamp_range_start_unix_ms,
        }];
        masks.extend(
            options
                .previous_masks
                .into_iter()
                .map(|previous| MaskRange {
                    mask: previous.mask,
                    timestamp_range_start_unix_ms: previous.timestamp_range_start_unix_ms,
                }),
        );
        Ok(Self {
            masks,
            sentinels,
            reserved,
            masked: options.masked_slug_alphabet,
        })
    }

    /// Return registered sentinels and their precomputed plain slugs as a read-only slice.
    pub fn sentinels(&self) -> &[UuidV7Sentinel] {
        &self.sentinels
    }

    fn sentinel(&self, slug: &str) -> Option<Uuid> {
        self.reserved
            .iter()
            // Case folding is valid only for the plain base32hex spelling, never base64url.
            .find(|(text, _)| {
                text.as_str() == slug
                    || (slug.len() == 26 && text.len() == 26 && text.eq_ignore_ascii_case(slug))
            })
            .map(|(_, uuid)| *uuid)
    }

    /// Mask a UUIDv7 with the current key and encode it as a slug.
    /// Reject non-v7 input and timestamps outside the codec's inclusive range. Registered sentinels stay plain and retain the full UUIDv7 timestamp range.
    pub fn uuid_to_masked_slug(&self, uuid: Uuid) -> Result<MaskedOrSentinelUuidV7Slug, Error> {
        uuid.extract_uuid_v7_unix_ms()?;
        if let Some(sentinel) = self.sentinels.iter().find(|entry| entry.uuid == uuid) {
            return Ok(MaskedOrSentinelUuidV7Slug::Sentinel(
                sentinel.plain_uuid_slug.clone(),
            ));
        }
        let current = &self.masks[0];
        let (bytes, tail) = crate::payload::mask_bytes(
            uuid.as_uuid_bytes(),
            &current.mask,
            current.timestamp_range_start_unix_ms,
        )?;
        // Plain base64url has zero tail bits and uniquely encodes the UUID bytes. Compare
        // identities before formatting so base32hex never allocates an unused spelling.
        if tail == 0
            && self
                .sentinels
                .iter()
                .any(|entry| entry.uuid.as_uuid_bytes() == &bytes)
        {
            return Err(Error::new(ErrorCode::InvalidMask).with_message(
                "Masked output matches a sentinel slug; use a different mask or sentinel set.",
            ));
        }
        self.masked
            .encode_tail(&bytes, tail, 4)
            .map(MaskedUuidV7Slug)
            .map(MaskedOrSentinelUuidV7Slug::Masked)
    }

    /// Read UUID text, either plain-slug alphabet, or a masked slug using this codec's keys.
    /// Registered sentinels take priority. A 22-character slug is read as masked if any key passes its check; otherwise it is read as plain. A callback error stops decoding.
    /// For known formats, use [`Uuid::from_plain_uuid_slug`] or [`Self::masked_slug_to_uuid`]. The returned UUID owns its bytes and does not retain the codec or keys.
    pub fn parse_uuid(&self, uuid: &str) -> Result<Uuid, Error> {
        match crate::uuid::utf16_len(uuid) {
            22 => {
                if let Some(sentinel) = self.sentinel(uuid) {
                    return Ok(sentinel);
                }
                let (bytes, tail) = crate::payload::normalize(uuid)?;
                if let Some(candidate) = self.decode_candidate(bytes, tail)? {
                    return Ok(candidate);
                }
                // The same decoded block is plain UUID data only with zero padding. Reusing
                // it avoids a second alphabet parse; callback errors never reach this branch.
                if tail == 0 {
                    return Ok(Uuid::from_uuid_bytes_array(bytes));
                }
                Err(Error::new(ErrorCode::InvalidUuidSlug).with_message(
                    "No configured mask accepts this slug and its trailing bits are not canonical plain UUID padding.",
                ))
            }
            27 => self.masked_slug_to_uuid(uuid),
            _ => Uuid::parse_uuid(uuid),
        }
    }

    /// Read a masked slug or registered sentinel. Sentinels take priority; otherwise try the current key, then previous keys in their configured order. Return the first UUID whose check passes.
    /// A wrong key can pass. Check the decoded record and caller access before using it.
    pub fn masked_slug_to_uuid(&self, masked_uuid_slug: &str) -> Result<Uuid, Error> {
        if let Some(uuid) = self.sentinel(masked_uuid_slug) {
            return Ok(uuid);
        }
        let uuid = self.decode_masked(masked_uuid_slug)?;
        uuid.extract_uuid_v7_unix_ms()?;
        Ok(uuid)
    }

    /// Decode with this codec, then apply only the payload layout supplied by the caller.
    pub fn extract_masked_uuid_v7_payload(
        &self,
        masked_uuid_slug: &str,
        layout: UuidV7PayloadLayout,
    ) -> Result<UuidV7Payload, Error> {
        self.masked_slug_to_uuid(masked_uuid_slug)?
            .extract_uuid_v7_payload(layout)
    }

    fn decode_masked(&self, slug: &str) -> Result<Uuid, Error> {
        let (bytes, tail) = crate::payload::normalize(slug)?;
        self.decode_candidate(bytes, tail)?.ok_or_else(|| {
            Error::new(ErrorCode::InvalidUuidSlug).with_message(
                "No configured mask and timestamp range accepts this slug; use the codec configuration that issued it.",
            )
        })
    }

    // A rejected check is absence, not a callback failure. Keep those outcomes distinct so
    // mixed-format readers can reuse the decoded bytes without swallowing external failures.
    fn decode_candidate(&self, bytes: [u8; 16], tail: u8) -> Result<Option<Uuid>, Error> {
        for range in &self.masks {
            match crate::payload::candidate(
                bytes,
                tail,
                &range.mask,
                range.timestamp_range_start_unix_ms,
            ) {
                Ok(Some(uuid)) => return Ok(Some(Uuid::from_uuid_bytes_array(uuid))),
                Ok(None) => {}
                Err(error) => return Err(error),
            }
        }
        Ok(None)
    }

    /// Create an opt-in reader without changing this codec's writer or ordinary decoder.
    pub fn create_uuid_slug_migration_decoder(
        &self,
        options: UuidSlugMigrationOptions,
    ) -> UuidSlugMigrationDecoder<'_> {
        UuidSlugMigrationDecoder {
            codec: self,
            options,
        }
    }

    /// Decode a masked slug or registered sentinel, check its timestamp window, and return canonical text.
    /// Canonical input is borrowed; mixed-case base32hex is copied to lowercase.
    pub fn validate_masked_uuid_v7_slug_unix_ms<'a>(
        &self,
        slug: &'a str,
        window: UuidV7TimestampWindow,
    ) -> Result<Cow<'a, str>, Error> {
        window.validate_uuid_v7(self.masked_slug_to_uuid(slug)?)?;
        // Decoding proved ASCII alphabet and padding. Borrow the common spelling rather than
        // re-encoding its UUID; base64url case carries bits and must never be normalized.
        Ok(
            if slug.len() == 22 || !slug.bytes().any(|byte| byte.is_ascii_uppercase()) {
                Cow::Borrowed(slug)
            } else {
                Cow::Owned(slug.to_ascii_lowercase())
            },
        )
    }
}

/// Accept timestamps within the allowed distance before or after a reference time, including both ends. Fractional milliseconds are accepted.
#[derive(Clone, Copy, Debug)]
pub struct UuidV7TimestampWindow {
    /// Reference Unix time in milliseconds. Read the clock once before constructing the window.
    pub reference_unix_ms: f64,
    /// Allowed distance from the reference time, in milliseconds, including the limit.
    pub max_timestamp_delta_ms: f64,
}

impl UuidV7TimestampWindow {
    /// Reject invalid windows and timestamps outside the caller's accepted range.
    pub fn validate_uuid_v7(self, uuid: Uuid) -> Result<Uuid, Error> {
        let timestamp = uuid.extract_uuid_v7_unix_ms().map_err(|_| {
            Error::new(ErrorCode::InvalidUuidVersion)
                .with_message("Timestamp validation requires an RFC-variant UUIDv7.")
        })? as f64;
        if !self.max_timestamp_delta_ms.is_finite()
            || self.max_timestamp_delta_ms < 0.0
            || !self.reference_unix_ms.is_finite()
        {
            return Err(Error::new(ErrorCode::InvalidTimestamp).with_message(format!(
                "Timestamp window requires a finite reference_unix_ms and a finite nonnegative max_timestamp_delta_ms; got {} and {}.",
                self.reference_unix_ms, self.max_timestamp_delta_ms
            )));
        }
        if timestamp < self.reference_unix_ms - self.max_timestamp_delta_ms
            || timestamp > self.reference_unix_ms + self.max_timestamp_delta_ms
        {
            return Err(
                Error::new(ErrorCode::TimestampOutsideWindow).with_message(format!(
                    "UUIDv7 timestamp {timestamp} is outside {}..={} Unix milliseconds.",
                    self.reference_unix_ms - self.max_timestamp_delta_ms,
                    self.reference_unix_ms + self.max_timestamp_delta_ms
                )),
            );
        }
        Ok(uuid)
    }
}

/// Enable additional legacy formats. The current masked format is always available.
#[derive(Clone, Copy, Debug, Default)]
pub struct UuidSlugMigrationOptions {
    /// Read slugs made with the original public fixed mask. Version 0.2.0 is not supported.
    pub accept_original_masked_slug: bool,
    /// Read plain UUID slugs, including old base64url spellings with nonzero trailing bits.
    pub accept_plain_uuid_slug: bool,
}

/// Select a known stored format so the reader does not try other interpretations.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum UuidSlugMigrationFormat {
    /// Current masked-slug format, using the current or a previous key.
    CurrentMaskedSlug,
    /// Original public fixed-mask format.
    OriginalMaskedSlug,
    /// Plain UUID slug.
    PlainUuidSlug,
}

/// A migration reader that borrows its codec and uses that codec's keys and sentinels. It cannot outlive the codec.
#[derive(Debug)]
pub struct UuidSlugMigrationDecoder<'a> {
    codec: &'a UuidV7MaskingCodec,
    options: UuidSlugMigrationOptions,
}

impl UuidSlugMigrationDecoder<'_> {
    /// Return the first matching UUID. With `None`, try sentinels, current-format keys, then enabled original-mask and plain decoding.
    /// `Some(format)` selects a known format, which must be enabled in this reader.
    pub fn uuid_slug_to_uuid(
        &self,
        uuid_slug: &str,
        format: Option<UuidSlugMigrationFormat>,
    ) -> Result<Uuid, Error> {
        let mut result = None;
        self.read(uuid_slug, format, |uuid| {
            result = Some(uuid);
            true
        })?;
        result.ok_or_else(|| {
            Error::new(ErrorCode::InvalidUuidSlug)
                .with_message("Slug does not match any enabled migration format.")
        })
    }

    /// Return matching UUIDs without duplicates. A canonical sentinel returns only its UUID.
    /// A legacy sentinel alias can also be a current masked ID; retain both UUIDs, sentinel first, so neither stored identity is lost.
    /// Use `None` for all enabled formats, or `Some(format)` for a known enabled format. An empty vector means the slug is well-formed but no selected format or key matched.
    /// A callback error fails the whole call, even after earlier matches.
    pub fn uuid_slug_to_uuid_candidates(
        &self,
        uuid_slug: &str,
        format: Option<UuidSlugMigrationFormat>,
    ) -> Result<Vec<Uuid>, Error> {
        let mut result = Vec::new();
        self.read(uuid_slug, format, |uuid| {
            if !result.contains(&uuid) {
                result.push(uuid);
            }
            false
        })?;
        Ok(result)
    }

    // Share decoder priority without allocating a candidate list for first-result reads.
    fn read(
        &self,
        slug: &str,
        format: Option<UuidSlugMigrationFormat>,
        mut stop: impl FnMut(Uuid) -> bool,
    ) -> Result<(), Error> {
        use UuidSlugMigrationFormat::{CurrentMaskedSlug, OriginalMaskedSlug, PlainUuidSlug};
        if (format == Some(OriginalMaskedSlug) && !self.options.accept_original_masked_slug)
            || (format == Some(PlainUuidSlug) && !self.options.accept_plain_uuid_slug)
        {
            let message = match format {
                Some(OriginalMaskedSlug) => {
                    "Original-mask decoding is disabled; set accept_original_masked_slug to true."
                }
                Some(PlainUuidSlug) => {
                    "Plain-slug decoding is disabled; set accept_plain_uuid_slug to true."
                }
                _ => "Requested migration format is disabled.",
            };
            return Err(Error::new(ErrorCode::InvalidUuidSlug).with_message(message));
        }
        if let Some(uuid) = self.codec.sentinel(slug) {
            stop(uuid);
            return Ok(());
        }
        let current = format.is_none() || format == Some(CurrentMaskedSlug);
        let original = self.options.accept_original_masked_slug
            && (format.is_none() || format == Some(OriginalMaskedSlug));
        let plain = self.options.accept_plain_uuid_slug
            && (format.is_none() || format == Some(PlainUuidSlug));
        let length = crate::uuid::utf16_len(slug);
        let base32_plain = length == 26 && plain;
        let safe_masked = length == 27 && current;
        let alpha = if base32_plain || safe_masked {
            UuidSlugAlphabet::Base32Hex
        } else {
            UuidSlugAlphabet::Base64Url
        };
        let mut bytes = [0; 16];
        let tail = alpha.decode_into(slug, &mut bytes, if base32_plain { 0 } else { 4 })?;
        let raw = Uuid::from_uuid_bytes_array(bytes);
        let reserved = if (original || plain) && length != 27 {
            self.codec
                .sentinel(&raw.to_plain_uuid_slug(UuidSlugAlphabet::Base64Url))
        } else {
            None
        };
        if reserved.is_some_and(&mut stop) {
            return Ok(());
        }
        if current && !base32_plain {
            for range in &self.codec.masks {
                if let Some(value) = crate::payload::candidate(
                    bytes,
                    tail,
                    &range.mask,
                    range.timestamp_range_start_unix_ms,
                )? {
                    let uuid = Uuid::from_uuid_bytes_array(value);
                    if stop(uuid) {
                        return Ok(());
                    }
                }
            }
        }
        if reserved.is_some() {
            return Ok(());
        }
        if original
            && length == 22
            && let Some(uuid) = decode_original(bytes)
            && stop(uuid)
        {
            return Ok(());
        }
        if plain && length != 27 {
            stop(raw);
        }
        Ok(())
    }
}

fn decode_original(mixed: [u8; 16]) -> Option<Uuid> {
    // These bytes and the four-bit check are the original wire format, not tunable parameters.
    const PERMUTE: [usize; 16] = [9, 13, 3, 8, 14, 0, 11, 7, 6, 1, 15, 4, 2, 5, 10, 12];
    const XOR: [u8; 16] = [
        0xa2, 0x70, 0x32, 0x7f, 0x98, 0xb8, 0x9b, 0x5e, 0x1b, 0x26, 0xb6, 0x16, 0x96, 0xf9, 0xea,
        0x3e,
    ];
    let mut bytes = [0; 16];
    for i in 0..16 {
        bytes[PERMUTE[i]] = mixed[i] ^ XOR[i];
    }
    let found = bytes[6] >> 4;
    bytes[6] = (bytes[6] & 15) | 0x70;
    let checksum = bytes.iter().fold(0, |acc, byte| acc ^ byte);
    ((checksum >> 4) ^ (checksum & 15) == found).then(|| Uuid::from_uuid_bytes_array(bytes))
}
