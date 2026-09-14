//! A UUIDv7 masking codec owns its keys and reserved identities so keyed operations cannot use another codec's key.

use crate::{
    Error, ErrorCode, MaskedOrSentinelUuidV7Slug, MaskedUuidV7Slug, PlainUuidSlug, Uuid,
    UuidSlugAlphabet, UuidV7Mask,
};

/// A named UUID emitted as a plain slug instead of through the mask.
#[derive(Clone, Debug)]
pub struct UuidV7Sentinel {
    /// Caller-facing name, independent of identity.
    pub name: String,
    /// Reserved UUIDv7.
    pub uuid: Uuid,
    /// Canonical spelling selected by the codec.
    pub plain_uuid_slug: PlainUuidSlug,
}

#[cfg(test)]
mod tests {
    use super::*;
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
    fn masked_writers_accept_the_timestamp_endpoint_and_reject_its_successor() -> Result<(), Error>
    {
        for masked_slug_alphabet in [UuidSlugAlphabet::Base64Url, UuidSlugAlphabet::Base32Hex] {
            let codec = UuidV7MaskingCodec::new(UuidV7MaskingCodecOptions {
                masked_slug_alphabet,
                ..UuidV7MaskingCodecOptions::new(crate::uuid_v7_test_mask())
            })?;
            assert!(
                codec
                    .uuid_to_masked_slug(uuid_at(crate::MAX_MASKED_UUID_V7_UNIX_MS))
                    .is_ok()
            );
            assert_eq!(
                codec
                    .uuid_to_masked_slug(uuid_at(crate::MAX_MASKED_UUID_V7_UNIX_MS + 1))
                    .unwrap_err()
                    .code(),
                ErrorCode::InvalidTimestamp
            );
            let sentinel = uuid_at(crate::MAX_MASKED_UUID_V7_UNIX_MS + 1);
            let codec = UuidV7MaskingCodec::new(UuidV7MaskingCodecOptions {
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
            vec![("nil".to_owned(), uuid), ("nil".to_owned(), uuid)],
        ] {
            let error = UuidV7MaskingCodec::new(UuidV7MaskingCodecOptions {
                sentinels,
                ..UuidV7MaskingCodecOptions::new(crate::uuid_v7_test_mask())
            })
            .err()
            .expect("invalid sentinel names must fail codec construction");
            assert_eq!(error.code(), ErrorCode::InvalidSentinel);
        }
        Ok(())
    }

    #[test]
    fn ciphertext_cannot_alias_a_reserved_identity() -> Result<(), Error> {
        let uuid = Uuid::from_uuid_string("019ff19b-58b8-7000-9b1b-df713bd55607")?;
        let reserved = Uuid::from_uuid_string("00000000-0000-7000-8000-000000000000")?;
        let identity = UuidV7Mask::from_permutation_functions("identity", Ok, Ok)?;
        let (tagged, tail) = crate::payload::mask_bytes(uuid.as_uuid_bytes(), &identity)?;
        assert_eq!(
            tail, 0,
            "The collision must pass the earlier padding condition"
        );
        let delta: [u8; 16] = std::array::from_fn(|i| tagged[i] ^ reserved.as_uuid_bytes()[i]);
        let transform = move |input: [u8; 16]| Ok(std::array::from_fn(|i| input[i] ^ delta[i]));
        let collision = UuidV7Mask::from_permutation_functions("collision", transform, transform)?;
        assert_eq!(
            crate::payload::mask_bytes(uuid.as_uuid_bytes(), &collision)?,
            (*reserved.as_uuid_bytes(), 0)
        );
        for alphabet in [UuidSlugAlphabet::Base64Url, UuidSlugAlphabet::Base32Hex] {
            let codec = UuidV7MaskingCodec::new(UuidV7MaskingCodecOptions {
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
        let writer =
            UuidV7MaskingCodec::new(UuidV7MaskingCodecOptions::new(crate::uuid_v7_test_mask()))?;
        let slug = writer.uuid_to_masked_slug(uuid)?;
        let fallback = UuidV7MaskingCodec::new(UuidV7MaskingCodecOptions {
            previous_masks: vec![good.clone()],
            ..UuidV7MaskingCodecOptions::new(custom.clone())
        })?;
        let first = UuidV7MaskingCodec::new(UuidV7MaskingCodecOptions {
            previous_masks: vec![custom],
            ..UuidV7MaskingCodecOptions::new(good)
        })?;
        failing.store(true, Ordering::Relaxed);
        let error = fallback.masked_slug_to_uuid(&slug).unwrap_err();
        assert_eq!(error.code(), ErrorCode::InvalidMask);
        assert!(std::error::Error::source(&error).is_some());
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

/// UUIDv7 masking-codec options. Existing output stays base64url unless explicitly changed.
pub struct UuidV7MaskingCodecOptions {
    /// Current write key; decoding tries this before previous keys.
    pub mask: UuidV7Mask,
    /// Older read keys, in caller-specified order. No keys are added implicitly.
    pub previous_masks: Vec<UuidV7Mask>,
    /// UuidSlugAlphabet used by masked output and sentinel presentation.
    pub masked_slug_alphabet: UuidSlugAlphabet,
    /// Reserved identities; an empty list disables sentinels.
    pub sentinels: Vec<(String, Uuid)>,
}

impl UuidV7MaskingCodecOptions {
    /// Start codec configuration from an explicitly selected current mask.
    pub fn new(mask: UuidV7Mask) -> Self {
        Self {
            mask,
            previous_masks: Vec::new(),
            masked_slug_alphabet: UuidSlugAlphabet::Base64Url,
            sentinels: Vec::new(),
        }
    }
}

/// Immutable keys and precomputed sentinels. Generation state is independently owned.
pub struct UuidV7MaskingCodec {
    masks: Vec<UuidV7Mask>,
    sentinels: Vec<UuidV7Sentinel>,
    reserved: Vec<(PlainUuidSlug, Uuid)>,
    masked: UuidSlugAlphabet,
}

impl UuidV7MaskingCodec {
    /// Validate reserved identities before a codec can emit unreadable output.
    pub fn new(options: UuidV7MaskingCodecOptions) -> Result<Self, Error> {
        let mut sentinels: Vec<UuidV7Sentinel> = Vec::new();
        let mut reserved = Vec::new();
        for (name, uuid) in options.sentinels {
            if name.is_empty() || sentinels.iter().any(|entry| entry.name == name) {
                return Err(Error::new(ErrorCode::InvalidSentinel));
            }
            uuid.extract_uuid_v7_unix_ms()?;
            if sentinels.iter().any(|entry| entry.uuid == uuid) {
                return Err(Error::new(ErrorCode::InvalidUuid));
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
        let mut masks = vec![options.mask];
        masks.extend(options.previous_masks);
        Ok(Self {
            masks,
            sentinels,
            reserved,
            masked: options.masked_slug_alphabet,
        })
    }

    /// Precomputed reserved outputs; callers cannot mutate codec identity tables.
    pub fn sentinels(&self) -> &[UuidV7Sentinel] {
        &self.sentinels
    }

    fn sentinel(&self, slug: &str) -> Option<Uuid> {
        self.reserved
            .iter()
            .find(|(text, _)| text.as_str() == slug)
            .map(|(_, uuid)| *uuid)
    }

    /// Encode a v7 through [`crate::MAX_MASKED_UUID_V7_UNIX_MS`], rejecting later timestamps unless
    /// the UUID is a registered sentinel; sentinels are returned as plain slugs without masking.
    pub fn uuid_to_masked_slug(&self, uuid: Uuid) -> Result<MaskedOrSentinelUuidV7Slug, Error> {
        uuid.extract_uuid_v7_unix_ms()?;
        if let Some(sentinel) = self.sentinels.iter().find(|entry| entry.uuid == uuid) {
            return Ok(MaskedOrSentinelUuidV7Slug::Sentinel(
                sentinel.plain_uuid_slug.clone(),
            ));
        }
        let (bytes, tail) = crate::payload::mask_bytes(uuid.as_uuid_bytes(), &self.masks[0])?;
        // Raw sentinel padding is zero, so a nonzero tag cannot collide with an old spelling.
        if self.masked == UuidSlugAlphabet::Base64Url || (tail == 0 && !self.reserved.is_empty()) {
            let base64 = UuidSlugAlphabet::Base64Url.encode_tail(&bytes, tail, 4)?;
            if self.sentinel(&base64).is_some() {
                return Err(Error::new(ErrorCode::InvalidMask));
            }
            if self.masked == UuidSlugAlphabet::Base64Url {
                return Ok(MaskedOrSentinelUuidV7Slug::Masked(MaskedUuidV7Slug(base64)));
            }
        }
        self.masked
            .encode_tail(&bytes, tail, 4)
            .map(MaskedUuidV7Slug)
            .map(MaskedOrSentinelUuidV7Slug::Masked)
    }

    /// Return the first current masked UUIDv7 candidate, not proof that this codec issued the ID.
    pub fn masked_slug_to_uuid(&self, masked_uuid_slug: &str) -> Result<Uuid, Error> {
        if let Some(uuid) = self.sentinel(masked_uuid_slug) {
            return Ok(uuid);
        }
        let uuid = self.decode_masked(masked_uuid_slug)?;
        uuid.extract_uuid_v7_unix_ms()?;
        Ok(uuid)
    }

    fn decode_masked(&self, slug: &str) -> Result<Uuid, Error> {
        let (bytes, tail) = crate::payload::normalize(slug)?;
        for mask in &self.masks {
            match crate::payload::candidate(bytes, tail, mask) {
                Ok(Some(uuid)) => return Ok(Uuid::from_uuid_bytes_array(uuid)),
                Ok(None) => {}
                Err(error) => return Err(error),
            }
        }
        Err(Error::new(ErrorCode::InvalidUuidSlug))
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

    /// Validate under this codec's key, retaining the caller's exact accepted spelling.
    pub fn validate_masked_uuid_v7_slug_unix_ms<'a>(
        &self,
        slug: &'a str,
        window: UuidV7TimestampWindow,
    ) -> Result<&'a str, Error> {
        window.validate_uuid_v7(self.masked_slug_to_uuid(slug)?)?;
        Ok(slug)
    }
}

/// A symmetric, inclusive timestamp window in milliseconds; fractions remain meaningful.
#[derive(Clone, Copy, Debug)]
pub struct UuidV7TimestampWindow {
    /// Current Unix time, read once by the caller.
    pub reference_unix_ms: f64,
    /// Maximum allowed past or future distance, inclusive.
    pub max_timestamp_delta_ms: f64,
}

impl UuidV7TimestampWindow {
    /// Reject invalid windows and timestamps outside the caller's accepted range.
    pub fn validate_uuid_v7(self, uuid: Uuid) -> Result<Uuid, Error> {
        let timestamp = uuid
            .extract_uuid_v7_unix_ms()
            .map_err(|_| Error::new(ErrorCode::InvalidUuidVersion))? as f64;
        if !self.max_timestamp_delta_ms.is_finite()
            || self.max_timestamp_delta_ms < 0.0
            || !self.reference_unix_ms.is_finite()
        {
            return Err(Error::new(ErrorCode::InvalidTimestamp));
        }
        if timestamp < self.reference_unix_ms - self.max_timestamp_delta_ms
            || timestamp > self.reference_unix_ms + self.max_timestamp_delta_ms
        {
            return Err(Error::new(ErrorCode::TimestampOutsideWindow));
        }
        Ok(uuid)
    }
}

/// Historical formats enabled explicitly; current masks are always available.
#[derive(Clone, Copy, Debug, Default)]
pub struct UuidSlugMigrationOptions {
    /// Read the original fixed permutation/XOR format, never the unsupported 0.2.0 format.
    pub accept_original_masked_slug: bool,
    /// Read raw UUID slugs, including historical trailing-bit aliases.
    pub accept_plain_uuid_slug: bool,
}

/// A known stored format avoids ambiguity between unrelated decoders.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum UuidSlugMigrationFormat {
    /// Current keyed mask.
    CurrentMaskedSlug,
    /// Original fixed permutation/XOR format.
    OriginalMaskedSlug,
    /// Unmasked UUID.
    PlainUuidSlug,
}

/// A reader borrowing its codec, so keys and sentinel definitions cannot drift.
pub struct UuidSlugMigrationDecoder<'a> {
    codec: &'a UuidV7MaskingCodec,
    options: UuidSlugMigrationOptions,
}

impl UuidSlugMigrationDecoder<'_> {
    /// Decode with sentinel/current/original/plain priority, stopping at the first candidate.
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
        result.ok_or_else(|| Error::new(ErrorCode::InvalidUuidSlug))
    }

    /// Collect distinct candidates atomically: a later callback error fails the whole call.
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
            return Err(Error::new(ErrorCode::InvalidUuidSlug));
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
            for mask in &self.codec.masks {
                if let Some(value) = crate::payload::candidate(bytes, tail, mask)? {
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
