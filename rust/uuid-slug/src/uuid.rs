//! Preserve every UUID bit while accepting standard text and enforcing canonical slug spellings.
use crate::{Error, ErrorCode, UuidSlugAlphabet};
use std::{borrow::Borrow, fmt, ops::Deref, str::FromStr};

pub(crate) fn utf16_len(text: &str) -> usize {
    text.encode_utf16().count()
}

/// A canonical unpadded base64url or lowercase base32hex spelling of all 128 UUID bits.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct PlainUuidSlug(pub(crate) String);

impl PlainUuidSlug {
    /// Borrow the canonical plain UUID slug.
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Take ownership of the canonical plain UUID slug text.
    pub fn into_string(self) -> String {
        self.0
    }
}

impl AsRef<str> for PlainUuidSlug {
    fn as_ref(&self) -> &str {
        self.as_str()
    }
}

impl Borrow<str> for PlainUuidSlug {
    fn borrow(&self) -> &str {
        self.as_str()
    }
}

impl Deref for PlainUuidSlug {
    type Target = str;

    fn deref(&self) -> &Self::Target {
        self.as_str()
    }
}

impl From<PlainUuidSlug> for String {
    fn from(slug: PlainUuidSlug) -> Self {
        slug.0
    }
}

impl fmt::Display for PlainUuidSlug {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

/// A canonical masked UUIDv7 payload in unpadded base64url or lowercase base32hex.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct MaskedUuidV7Slug(pub(crate) String);

impl MaskedUuidV7Slug {
    /// Borrow the canonical masked UUIDv7 slug.
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Take ownership of the canonical masked UUIDv7 slug text.
    pub fn into_string(self) -> String {
        self.0
    }
}

impl AsRef<str> for MaskedUuidV7Slug {
    fn as_ref(&self) -> &str {
        self.as_str()
    }
}

impl Borrow<str> for MaskedUuidV7Slug {
    fn borrow(&self) -> &str {
        self.as_str()
    }
}

impl Deref for MaskedUuidV7Slug {
    type Target = str;

    fn deref(&self) -> &Self::Target {
        self.as_str()
    }
}

impl From<MaskedUuidV7Slug> for String {
    fn from(slug: MaskedUuidV7Slug) -> Self {
        slug.0
    }
}

impl fmt::Display for MaskedUuidV7Slug {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

/// A masking-codec output: either a masked payload or a registered sentinel's plain slug.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum MaskedOrSentinelUuidV7Slug {
    /// A keyed masked UUIDv7 payload.
    Masked(MaskedUuidV7Slug),
    /// A registered sentinel preserved as an ordinary plain UUID slug.
    Sentinel(PlainUuidSlug),
}

impl MaskedOrSentinelUuidV7Slug {
    /// Borrow either canonical slug spelling without erasing its enum variant.
    pub fn as_str(&self) -> &str {
        match self {
            Self::Masked(slug) => slug.as_str(),
            Self::Sentinel(slug) => slug.as_str(),
        }
    }

    /// Take ownership of either canonical slug spelling.
    pub fn into_string(self) -> String {
        match self {
            Self::Masked(slug) => slug.into_string(),
            Self::Sentinel(slug) => slug.into_string(),
        }
    }
}

impl AsRef<str> for MaskedOrSentinelUuidV7Slug {
    fn as_ref(&self) -> &str {
        self.as_str()
    }
}

impl Borrow<str> for MaskedOrSentinelUuidV7Slug {
    fn borrow(&self) -> &str {
        self.as_str()
    }
}

impl Deref for MaskedOrSentinelUuidV7Slug {
    type Target = str;

    fn deref(&self) -> &Self::Target {
        self.as_str()
    }
}

impl From<MaskedOrSentinelUuidV7Slug> for String {
    fn from(slug: MaskedOrSentinelUuidV7Slug) -> Self {
        slug.into_string()
    }
}

impl fmt::Display for MaskedOrSentinelUuidV7Slug {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

/// A 128-bit UUID; generic parsing accepts every version and variant, including nil.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Uuid([u8; 16]);
/// The all-zero UUID value, without a version or issuance claim.
pub const NIL_UUID: Uuid = Uuid::from_uuid_bytes_array([0; 16]);
/// The all-one UUID value, without a version or issuance claim.
pub const MAX_UUID: Uuid = Uuid::from_uuid_bytes_array([u8::MAX; 16]);

/// Known leading fields in a UUIDv7 generator's 74-bit payload.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct UuidV7PayloadLayout {
    sub_millisecond_fraction_bits: u8,
    counter_bits: u8,
}

impl UuidV7PayloadLayout {
    /// Validate an RFC 9562 Method 3 fraction width followed by a Method 1 counter width.
    pub fn new(sub_millisecond_fraction_bits: u8, counter_bits: u8) -> Result<Self, Error> {
        if sub_millisecond_fraction_bits > 12 {
            return Err(Error::new(ErrorCode::InvalidOptions).with_message(format!(
                "sub_millisecond_fraction_bits must be from 0 through 12; got {sub_millisecond_fraction_bits}."
            )));
        }
        let maximum_counter_bits = 74 - sub_millisecond_fraction_bits;
        if counter_bits > maximum_counter_bits {
            return Err(Error::new(ErrorCode::InvalidOptions).with_message(format!(
                "counter_bits must be from 0 through {maximum_counter_bits} when sub_millisecond_fraction_bits is {sub_millisecond_fraction_bits}; got {counter_bits}."
            )));
        }
        Ok(Self {
            sub_millisecond_fraction_bits,
            counter_bits,
        })
    }

    /// Number of leading payload bits interpreted as a Method 3 fraction.
    pub const fn sub_millisecond_fraction_bits(self) -> u8 {
        self.sub_millisecond_fraction_bits
    }
    /// Number of following payload bits interpreted as a Method 1 counter.
    pub const fn counter_bits(self) -> u8 {
        self.counter_bits
    }
}

/// One exact field extracted from a UUIDv7 payload.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct UuidV7PayloadField<Value> {
    /// Unsigned field value.
    pub value: Value,
    /// Number of bits used by the field.
    pub bits: u8,
}

/// UUIDv7 payload decoded under a caller-known layout.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct UuidV7Payload {
    /// Standard 48-bit Unix millisecond timestamp.
    pub unix_ms: u64,
    /// Method 3 fraction value and width, or `None` when absent.
    pub sub_millisecond_fraction: Option<UuidV7PayloadField<u16>>,
    /// Method 1 counter value and width, or `None` when absent.
    pub counter: Option<UuidV7PayloadField<u128>>,
    /// Uninterpreted least-significant payload value and width.
    pub remaining: UuidV7PayloadField<u128>,
}

impl Uuid {
    /// Take owned bytes without imposing a version restriction.
    pub const fn from_uuid_bytes_array(bytes: [u8; 16]) -> Self {
        Self(bytes)
    }
    /// Borrow all sixteen UUID bytes in wire order.
    pub const fn as_uuid_bytes(&self) -> &[u8; 16] {
        &self.0
    }
    /// Read sixteen bytes at an offset, rejecting overflow and short buffers.
    pub fn from_uuid_bytes(bytes: &[u8], offset: usize) -> Result<Self, Error> {
        let range = range(bytes.len(), offset)?;
        let mut out = [0; 16];
        out.copy_from_slice(&bytes[range]);
        Ok(Self(out))
    }
    /// Parse an accepted UUID spelling: canonical, compact, URN, or brace-wrapped canonical text.
    pub fn from_uuid_string(uuid_string: &str) -> Result<Self, Error> {
        uuid_string.parse()
    }
    /// Infer the plain alphabet from the disjoint 22- and 26-character lengths.
    pub fn from_plain_uuid_slug(plain_uuid_slug: &str) -> Result<Self, Error> {
        let alphabet = match utf16_len(plain_uuid_slug) {
            22 => UuidSlugAlphabet::Base64Url,
            26 => UuidSlugAlphabet::Base32Hex,
            _ => {
                return Err(Error::new(ErrorCode::InvalidUuidSlug).with_message(format!(
                    "Plain UUID slug must contain 22 base64url or 26 base32hex characters; got {}.",
                    utf16_len(plain_uuid_slug)
                )));
            }
        };
        let mut bytes = [0; 16];
        alphabet.decode_into(plain_uuid_slug, &mut bytes, 0)?;
        Ok(Self(bytes))
    }
    /// Encode the UUID unchanged in the chosen alphabet.
    pub fn to_plain_uuid_slug(&self, alphabet: UuidSlugAlphabet) -> PlainUuidSlug {
        alphabet.uuid_bytes_to_plain_slug(&self.0)
    }
    /// Copy the UUID to a checked destination range; failure does not write.
    pub fn write_uuid_bytes(&self, out: &mut [u8], offset: usize) -> Result<(), Error> {
        let target = range(out.len(), offset)?;
        out[target].copy_from_slice(&self.0);
        Ok(())
    }
    /// Version nibble, without assuming the RFC variant.
    pub const fn uuid_version(&self) -> u8 {
        self.0[6] >> 4
    }
    /// Whether the variant is RFC 9562's `10` bit pattern.
    pub const fn is_rfc_uuid_variant(&self) -> bool {
        self.0[8] >> 6 == 2
    }
    /// Require version 7 and the RFC variant without interpreting its 74 payload bits.
    pub const fn is_uuid_v7(&self) -> bool {
        self.uuid_version() == 7 && self.is_rfc_uuid_variant()
    }
    /// Require both version 4 and the RFC variant.
    pub const fn is_uuid_v4(&self) -> bool {
        self.uuid_version() == 4 && self.is_rfc_uuid_variant()
    }
    /// Read the 48-bit millisecond timestamp, refusing random bytes from other versions.
    pub fn extract_uuid_v7_unix_ms(&self) -> Result<u64, Error> {
        if !self.is_uuid_v7() {
            return Err(Error::new(ErrorCode::InvalidUuidVersion));
        }
        Ok(self.0[..6]
            .iter()
            .fold(0u64, |value, &byte| (value << 8) | u64::from(byte)))
    }

    /// Interpret preserved payload bits only under the caller's known generator layout.
    pub fn extract_uuid_v7_payload(
        &self,
        layout: UuidV7PayloadLayout,
    ) -> Result<UuidV7Payload, Error> {
        let unix_ms = self.extract_uuid_v7_unix_ms()?;
        let payload = (u128::from(self.0[6] & 0x0f) << 70)
            | (u128::from(self.0[7]) << 62)
            | (u128::from(self.0[8] & 0x3f) << 56)
            | self.0[9..]
                .iter()
                .fold(0u128, |value, &byte| (value << 8) | u128::from(byte));
        let fraction_bits = layout.sub_millisecond_fraction_bits;
        let remaining_bits = 74 - fraction_bits - layout.counter_bits;
        let low_bits = |bits: u8| if bits == 0 { 0 } else { (1u128 << bits) - 1 };
        Ok(UuidV7Payload {
            unix_ms,
            sub_millisecond_fraction: (fraction_bits != 0).then(|| UuidV7PayloadField {
                value: (payload >> (74 - fraction_bits)) as u16,
                bits: fraction_bits,
            }),
            counter: (layout.counter_bits != 0).then(|| UuidV7PayloadField {
                value: (payload >> remaining_bits) & low_bits(layout.counter_bits),
                bits: layout.counter_bits,
            }),
            remaining: UuidV7PayloadField {
                value: payload & low_bits(remaining_bits),
                bits: remaining_bits,
            },
        })
    }
}
pub(crate) fn range(capacity: usize, offset: usize) -> Result<std::ops::Range<usize>, Error> {
    let end = offset
        .checked_add(16)
        .filter(|&end| end <= capacity)
        .ok_or_else(|| {
            Error::new(ErrorCode::InvalidBuffer).with_message(format!(
                "Buffer needs 16 bytes at offset {offset}, but holds {capacity}."
            ))
        })?;
    Ok(offset..end)
}
impl FromStr for Uuid {
    type Err = Error;
    fn from_str(text: &str) -> Result<Self, Error> {
        let input = text.as_bytes();
        let canonical = |value: &[u8]| {
            value.len() == 36 && [8, 13, 18, 23].iter().all(|&index| value[index] == b'-')
        };
        let body = match input {
            value if value.len() == 32 => value,
            value if canonical(value) => value,
            [b'{', value @ .., b'}'] if canonical(value) => value,
            value
                if value.len() == 45
                    && value[..9].eq_ignore_ascii_case(b"urn:uuid:")
                    && canonical(&value[9..]) =>
            {
                &value[9..]
            }
            _ => return Err(Error::new(ErrorCode::InvalidUuid)),
        };
        let body = std::str::from_utf8(body).map_err(|_| Error::new(ErrorCode::InvalidUuid))?;
        uuid::Uuid::parse_str(body)
            .map(|id| Self(*id.as_bytes()))
            .map_err(|_| Error::new(ErrorCode::InvalidUuid))
    }
}
impl fmt::Display for Uuid {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        uuid::Uuid::from_bytes(self.0).hyphenated().fmt(f)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn accepts_generic_bits_but_requires_v7_for_timestamp() -> Result<(), Error> {
        for text in [
            "ffffffff-ffff-7fff-bfff-ffffffffffff",
            "ffffffff-ffff-4fff-bfff-ffffffffffff",
            "ffffffff-ffff-8fff-ffff-ffffffffffff",
            "00000000-0000-0000-0000-000000000000",
        ] {
            let id = Uuid::from_uuid_string(text)?;
            assert_eq!(id.to_string(), text);
            for alphabet in [UuidSlugAlphabet::Base64Url, UuidSlugAlphabet::Base32Hex] {
                assert_eq!(
                    Uuid::from_plain_uuid_slug(&id.to_plain_uuid_slug(alphabet))?,
                    id
                );
            }
        }
        let id = Uuid::from_uuid_string("ffffffff-ffff-ffff-ffff-ffffffffffff")?;
        assert!(id.extract_uuid_v7_unix_ms().is_err());
        assert_eq!(
            Uuid::from_uuid_string("FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF")?,
            id
        );
        assert_eq!(
            Uuid::from_uuid_string("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF")?,
            id
        );
        assert_eq!(id.to_string(), "ffffffff-ffff-ffff-ffff-ffffffffffff");
        for text in [
            "UrN:UuId:FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
            "{FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF}",
        ] {
            assert_eq!(Uuid::from_uuid_string(text)?, id);
        }
        for text in [
            "urn:uuid:ffffffffffffffffffffffffffffffff",
            "{ffffffffffffffffffffffffffffffff}",
            "urn:uuid:{ffffffff-ffff-ffff-ffff-ffffffffffff}",
            "{urn:uuid:ffffffff-ffff-ffff-ffff-ffffffffffff}",
        ] {
            assert!(Uuid::from_uuid_string(text).is_err());
        }
        let mut out = [23; 32];
        assert!(id.write_uuid_bytes(&mut out, usize::MAX).is_err());
        assert_eq!(out, [23; 32]);
        id.write_uuid_bytes(&mut out, 16)?;
        assert_eq!(Uuid::from_uuid_bytes(&out, 16)?, id);
        assert_eq!(&out[..16], &[23; 16]);
        Ok(())
    }

    #[test]
    fn payload_layout_controls_interpretation_without_losing_tail_bits() -> Result<(), Error> {
        let fraction = 0xa5bu128;
        let counter = 0x2a55u128;
        let remaining = 0x1234_5678_9abcu128;
        let payload = (fraction << 62) | (counter << 48) | remaining;
        let mut bytes = [0u8; 16];
        bytes[..6].copy_from_slice(&1_700_000_000_123u64.to_be_bytes()[2..]);
        bytes[6] = 0x70 | ((payload >> 70) as u8 & 0x0f);
        bytes[7] = (payload >> 62) as u8;
        bytes[8] = 0x80 | ((payload >> 56) as u8 & 0x3f);
        bytes[9..].copy_from_slice(&(payload as u64).to_be_bytes()[1..]);
        let uuid = Uuid::from_uuid_bytes_array(bytes);

        assert_eq!(
            uuid.extract_uuid_v7_payload(UuidV7PayloadLayout::new(12, 14)?)?,
            UuidV7Payload {
                unix_ms: 1_700_000_000_123,
                sub_millisecond_fraction: Some(UuidV7PayloadField {
                    value: 0xa5b,
                    bits: 12
                }),
                counter: Some(UuidV7PayloadField {
                    value: 0x2a55,
                    bits: 14
                }),
                remaining: UuidV7PayloadField {
                    value: remaining,
                    bits: 48
                },
            }
        );
        assert_eq!(
            uuid.extract_uuid_v7_payload(UuidV7PayloadLayout::new(0, 0)?)?
                .remaining,
            UuidV7PayloadField {
                value: payload,
                bits: 74
            }
        );
        assert_eq!(
            UuidV7PayloadLayout::new(13, 0).unwrap_err().code(),
            ErrorCode::InvalidOptions
        );
        assert_eq!(
            UuidV7PayloadLayout::new(12, 63).unwrap_err().code(),
            ErrorCode::InvalidOptions
        );
        for bit in 0..74 {
            let one_bit = 1u128 << bit;
            let mut bytes = [0u8; 16];
            bytes[6] = 0x70 | ((one_bit >> 70) as u8 & 0x0f);
            bytes[7] = (one_bit >> 62) as u8;
            bytes[8] = 0x80 | ((one_bit >> 56) as u8 & 0x3f);
            bytes[9..].copy_from_slice(&(one_bit as u64).to_be_bytes()[1..]);
            assert_eq!(
                Uuid::from_uuid_bytes_array(bytes)
                    .extract_uuid_v7_payload(UuidV7PayloadLayout::new(0, 0)?)?
                    .remaining
                    .value,
                one_bit
            );
        }
        Ok(())
    }

    #[test]
    fn plain_slug_keeps_its_type_until_string_ownership_is_requested() -> Result<(), Error> {
        let uuid = Uuid::from_uuid_string("0190A1B2-C3D4-7E5F-8A9B-0C1D2E3F0000")?;
        let slug = uuid.to_plain_uuid_slug(UuidSlugAlphabet::Base32Hex);
        let allocation = slug.as_ptr();

        assert_eq!(Uuid::from_plain_uuid_slug(slug.as_ref())?, uuid);
        let text: String = slug.into();
        assert_eq!(text, "068a3cm3qhv5v2kr1geisfo000");
        assert_eq!(text.as_ptr(), allocation);
        Ok(())
    }

    #[test]
    fn canonical_uuid_boundaries_remain_generic_values() -> Result<(), Error> {
        assert_eq!(NIL_UUID.to_string(), "00000000-0000-0000-0000-000000000000");
        assert_eq!(MAX_UUID.to_string(), "ffffffff-ffff-ffff-ffff-ffffffffffff");
        for uuid in [NIL_UUID, MAX_UUID] {
            for alphabet in [UuidSlugAlphabet::Base64Url, UuidSlugAlphabet::Base32Hex] {
                assert_eq!(
                    Uuid::from_plain_uuid_slug(&uuid.to_plain_uuid_slug(alphabet))?,
                    uuid
                );
            }
            assert!(!uuid.is_uuid_v4());
            assert!(!uuid.is_uuid_v7());
        }
        Ok(())
    }
}
