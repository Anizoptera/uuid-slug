//! A codec owns its keys and reserved identities so keyed operations cannot use another codec's key.

use crate::{Alphabet, Error, ErrorCode, MaskSchema, Uuid};

/// A named UUID emitted directly instead of through the mask.
#[derive(Clone, Debug)]
pub struct Sentinel {
    /// Caller-facing name, independent of identity.
    pub name: String,
    /// Reserved UUIDv7.
    pub uuid: Uuid,
    /// Canonical spelling selected by the codec.
    pub slug: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    };

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
            let uuid = Uuid::parse(text)?;
            assert_eq!(window.validate(uuid)?, uuid);
        }
        Ok(())
    }

    #[test]
    fn timestamp_window_reports_a_valid_uuid_of_the_wrong_version() -> Result<(), Error> {
        let uuid = Uuid::parse("1f04e7f5-c0c6-4044-b5a3-6278bb77ffb4")?;
        let error = UuidV7TimestampWindow {
            reference_unix_ms: 0.0,
            max_timestamp_delta_ms: 0.0,
        }
        .validate(uuid)
        .expect_err("UUIDv4 must not have a UUIDv7 timestamp");
        assert_eq!(error.code(), ErrorCode::InvalidUuidVersion);
        Ok(())
    }

    #[test]
    fn sentinel_names_are_nonempty_and_unique() -> Result<(), Error> {
        let uuid = Uuid::parse("00000000-0000-7000-8000-000000000000")?;
        for sentinels in [
            vec![(String::new(), uuid)],
            vec![("nil".to_owned(), uuid), ("nil".to_owned(), uuid)],
        ] {
            let error = Codec::new(CodecOptions {
                sentinels,
                ..CodecOptions::new(crate::public_mask_schema())
            })
            .err()
            .expect("invalid sentinel names must fail codec construction");
            assert_eq!(error.code(), ErrorCode::InvalidSentinel);
        }
        Ok(())
    }

    #[test]
    fn ciphertext_cannot_alias_a_reserved_identity() -> Result<(), Error> {
        let uuid = Uuid::parse("019ff19b-58b8-7000-9b1b-df713bd55607")?;
        let reserved = Uuid::parse("00000000-0000-7000-8000-000000000000")?;
        let identity = MaskSchema::custom("identity", Ok, Ok)?;
        let (tagged, tail) = crate::mask::mask_bytes(uuid.as_bytes(), &identity)?;
        assert_eq!(
            tail, 0,
            "The collision must pass the earlier padding condition"
        );
        let delta: [u8; 16] = std::array::from_fn(|i| tagged[i] ^ reserved.as_bytes()[i]);
        let transform = move |input: [u8; 16]| Ok(std::array::from_fn(|i| input[i] ^ delta[i]));
        let collision = MaskSchema::custom("collision", transform, transform)?;
        assert_eq!(
            crate::mask::mask_bytes(uuid.as_bytes(), &collision)?,
            (*reserved.as_bytes(), 0)
        );
        for alphabet in [Alphabet::Base64Url, Alphabet::Base32Hex] {
            let codec = Codec::new(CodecOptions {
                sentinels: vec![("nil".to_owned(), reserved)],
                slug_alphabet: alphabet,
                ..CodecOptions::new(collision.clone())
            })?;
            assert_eq!(
                codec.encode_uuid(uuid).unwrap_err().code(),
                ErrorCode::InvalidMask
            );
            assert_eq!(codec.decode_slug(&reserved.slug(alphabet))?, reserved);
        }
        Ok(())
    }

    #[test]
    fn callback_failure_respects_first_result_and_atomic_candidates() -> Result<(), Error> {
        assert!(MaskSchema::custom("not-an-inverse", |_| Ok([1; 16]), |_| Ok([1; 16])).is_err());
        assert!(
            MaskSchema::custom("failed", |_| Err(Error::new(ErrorCode::InvalidBuffer)), Ok,)
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
        let custom = MaskSchema::custom("fallible", fallible.clone(), fallible)?;
        let uuid = Uuid::parse("01234567-89ab-7cde-8fab-0123456789ab")?;
        let good = crate::public_mask_schema();
        let writer = Codec::new(CodecOptions::new(crate::public_mask_schema()))?;
        let slug = writer.encode_uuid(uuid)?;
        let fallback = Codec::new(CodecOptions {
            previous_masks: vec![good.clone()],
            ..CodecOptions::new(custom.clone())
        })?;
        let first = Codec::new(CodecOptions {
            previous_masks: vec![custom],
            ..CodecOptions::new(good)
        })?;
        failing.store(true, Ordering::Relaxed);
        let error = fallback.decode_slug(&slug).unwrap_err();
        assert_eq!(error.code(), ErrorCode::InvalidMask);
        assert!(std::error::Error::source(&error).is_some());
        let migration = first.migration_decoder(MigrationOptions::default());
        assert_eq!(
            migration.decode(&slug, Some(MigrationFormat::Current))?,
            uuid
        );
        // Candidate enumeration cannot expose its earlier result after a later callback fails.
        let error = migration
            .candidates(&slug, Some(MigrationFormat::Current))
            .unwrap_err();
        assert_eq!(error.code(), ErrorCode::InvalidMask);
        assert!(std::error::Error::source(&error).is_some());
        Ok(())
    }
}

/// Codec construction options. Existing output stays base64url unless explicitly changed.
pub struct CodecOptions {
    /// Current write key; decoding tries this before previous keys.
    pub mask: MaskSchema,
    /// Older read keys, in caller-specified order. No keys are added implicitly.
    pub previous_masks: Vec<MaskSchema>,
    /// Alphabet used by masked output and sentinel presentation.
    pub slug_alphabet: Alphabet,
    /// Reserved identities; an empty list disables sentinels.
    pub sentinels: Vec<(String, Uuid)>,
}

impl CodecOptions {
    /// Start codec configuration from an explicitly selected current mask.
    pub fn new(mask: MaskSchema) -> Self {
        Self {
            mask,
            previous_masks: Vec::new(),
            slug_alphabet: Alphabet::Base64Url,
            sentinels: Vec::new(),
        }
    }
}

/// Immutable keys and precomputed sentinels. Generation state is independently owned.
pub struct Codec {
    schemas: Vec<MaskSchema>,
    sentinels: Vec<Sentinel>,
    reserved: Vec<(String, Uuid)>,
    masked: Alphabet,
}

impl Codec {
    /// Validate reserved identities before a codec can emit unreadable output.
    pub fn new(options: CodecOptions) -> Result<Self, Error> {
        let mut sentinels: Vec<Sentinel> = Vec::new();
        let mut reserved = Vec::new();
        for (name, uuid) in options.sentinels {
            if name.is_empty() || sentinels.iter().any(|entry| entry.name == name) {
                return Err(Error::new(ErrorCode::InvalidSentinel));
            }
            uuid.timestamp()?;
            if sentinels.iter().any(|entry| entry.uuid == uuid) {
                return Err(Error::new(ErrorCode::InvalidUuid));
            }
            let slug = uuid.slug(options.slug_alphabet);
            reserved.push((uuid.slug(Alphabet::Base64Url), uuid));
            reserved.push((uuid.slug(Alphabet::Base32Hex), uuid));
            sentinels.push(Sentinel { name, uuid, slug });
        }
        let mut schemas = vec![options.mask];
        schemas.extend(options.previous_masks);
        Ok(Self {
            schemas,
            sentinels,
            reserved,
            masked: options.slug_alphabet,
        })
    }

    /// Precomputed reserved outputs; callers cannot mutate codec identity tables.
    pub fn sentinels(&self) -> &[Sentinel] {
        &self.sentinels
    }

    fn sentinel(&self, slug: &str) -> Option<Uuid> {
        self.reserved
            .iter()
            .find(|(text, _)| text == slug)
            .map(|(_, uuid)| *uuid)
    }

    /// Encode a v7, preserving sentinel identities and rejecting ciphertext collisions.
    pub fn encode_uuid(&self, uuid: Uuid) -> Result<String, Error> {
        uuid.timestamp()?;
        if let Some(sentinel) = self.sentinels.iter().find(|entry| entry.uuid == uuid) {
            return Ok(sentinel.slug.clone());
        }
        let (bytes, tail) = crate::mask::mask_bytes(uuid.as_bytes(), &self.schemas[0])?;
        // Raw sentinel padding is zero, so a nonzero tag cannot collide with an old spelling.
        if self.masked == Alphabet::Base64Url || (tail == 0 && !self.reserved.is_empty()) {
            let base64 = Alphabet::Base64Url.encode_tail(&bytes, tail, 4)?;
            if self.sentinel(&base64).is_some() {
                return Err(Error::new(ErrorCode::InvalidMask));
            }
            if self.masked == Alphabet::Base64Url {
                return Ok(base64);
            }
        }
        self.masked.encode_tail(&bytes, tail, 4)
    }

    /// Return the first current masked UUIDv7 candidate, not proof that this codec issued the ID.
    pub fn decode_slug(&self, slug: &str) -> Result<Uuid, Error> {
        if let Some(uuid) = self.sentinel(slug) {
            return Ok(uuid);
        }
        let uuid = self.decode_masked(slug)?;
        uuid.timestamp()?;
        Ok(uuid)
    }

    fn decode_masked(&self, slug: &str) -> Result<Uuid, Error> {
        let (bytes, tail) = crate::mask::normalize(slug)?;
        for schema in &self.schemas {
            match crate::mask::candidate(bytes, tail, schema) {
                Ok(Some(uuid)) => return Ok(Uuid::from_bytes(uuid)),
                Ok(None) => {}
                Err(error) => return Err(error),
            }
        }
        Err(Error::new(ErrorCode::InvalidUuidSlug))
    }

    /// Create an opt-in reader without changing this codec's writer or ordinary decoder.
    pub fn migration_decoder(&self, options: MigrationOptions) -> MigrationDecoder<'_> {
        MigrationDecoder {
            codec: self,
            options,
        }
    }

    /// Validate under this codec's key, retaining the caller's exact accepted spelling.
    pub fn validate_slug_timestamp<'a>(
        &self,
        slug: &'a str,
        window: UuidV7TimestampWindow,
    ) -> Result<&'a str, Error> {
        window.validate(self.decode_slug(slug)?)?;
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
    pub fn validate(self, uuid: Uuid) -> Result<Uuid, Error> {
        let timestamp = uuid
            .timestamp()
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
pub struct MigrationOptions {
    /// Read the original fixed permutation/XOR format, never the unsupported 0.2.0 format.
    pub original: bool,
    /// Read raw UUID slugs, including historical trailing-bit aliases.
    pub plain: bool,
}

/// A known stored format avoids ambiguity between unrelated decoders.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MigrationFormat {
    /// Current keyed mask.
    Current,
    /// Original fixed permutation/XOR format.
    Original,
    /// Unmasked UUID.
    Plain,
}

/// A reader borrowing its codec, so keys and sentinel definitions cannot drift.
pub struct MigrationDecoder<'a> {
    codec: &'a Codec,
    options: MigrationOptions,
}

impl MigrationDecoder<'_> {
    /// Decode with sentinel/current/original/plain priority, stopping at the first candidate.
    pub fn decode(&self, slug: &str, format: Option<MigrationFormat>) -> Result<Uuid, Error> {
        let mut result = None;
        self.read(slug, format, |uuid| {
            result = Some(uuid);
            true
        })?;
        result.ok_or_else(|| Error::new(ErrorCode::InvalidUuidSlug))
    }

    /// Collect distinct candidates atomically: a later callback error fails the whole call.
    pub fn candidates(
        &self,
        slug: &str,
        format: Option<MigrationFormat>,
    ) -> Result<Vec<Uuid>, Error> {
        let mut result = Vec::new();
        self.read(slug, format, |uuid| {
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
        format: Option<MigrationFormat>,
        mut stop: impl FnMut(Uuid) -> bool,
    ) -> Result<(), Error> {
        use MigrationFormat::{Current, Original, Plain};
        if (format == Some(Original) && !self.options.original)
            || (format == Some(Plain) && !self.options.plain)
        {
            return Err(Error::new(ErrorCode::InvalidUuidSlug));
        }
        if let Some(uuid) = self.codec.sentinel(slug) {
            stop(uuid);
            return Ok(());
        }
        let current = format.is_none() || format == Some(Current);
        let original = self.options.original && (format.is_none() || format == Some(Original));
        let plain = self.options.plain && (format.is_none() || format == Some(Plain));
        let length = crate::uuid::utf16_len(slug);
        let base32_plain = length == 26 && plain;
        let safe_masked = length == 27 && current;
        let alpha = if base32_plain || safe_masked {
            Alphabet::Base32Hex
        } else {
            Alphabet::Base64Url
        };
        let mut bytes = [0; 16];
        let tail = alpha.decode_into(slug, &mut bytes, if base32_plain { 0 } else { 4 })?;
        let raw = Uuid::from_bytes(bytes);
        let reserved = if (original || plain) && length != 27 {
            self.codec.sentinel(&raw.slug(Alphabet::Base64Url))
        } else {
            None
        };
        if reserved.is_some_and(&mut stop) {
            return Ok(());
        }
        if current && !base32_plain {
            for schema in &self.codec.schemas {
                if let Some(value) = crate::mask::candidate(bytes, tail, schema)? {
                    let uuid = Uuid::from_bytes(value);
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
    ((checksum >> 4) ^ (checksum & 15) == found).then(|| Uuid::from_bytes(bytes))
}
