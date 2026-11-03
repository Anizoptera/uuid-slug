//! Preserve every UUID bit while accepting standard text and enforcing canonical slug spellings.
use crate::{Error, ErrorCode, KeylessUuidText, UuidSlugAlphabet, text};
use alloc::{boxed::Box, format, string::String};
use core::{borrow::Borrow, fmt, ops::Deref, str::FromStr};

pub(crate) fn utf16_len(text: &str) -> usize {
    text.encode_utf16().count()
}

/// A canonical unpadded base64url or lowercase base32hex spelling of all 128 UUID bits.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
// Canonical slugs never grow; boxed text omits capacity and transfers into String without copying.
pub struct PlainUuidSlug(pub(crate) Box<str>);

impl PlainUuidSlug {
    /// Borrow the canonical plain UUID slug.
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Take ownership of the canonical plain UUID slug text.
    pub fn into_string(self) -> String {
        self.0.into_string()
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
        slug.into_string()
    }
}

impl fmt::Display for PlainUuidSlug {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

/// A canonical masked UUIDv7 payload in unpadded base64url or lowercase base32hex.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
// Masked output is immutable too; retaining growable capacity would add unused state per slug.
pub struct MaskedUuidV7Slug(pub(crate) Box<str>);

impl MaskedUuidV7Slug {
    /// Borrow the canonical masked UUIDv7 slug.
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Take ownership of the canonical masked UUIDv7 slug text.
    pub fn into_string(self) -> String {
        self.0.into_string()
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
        slug.into_string()
    }
}

impl fmt::Display for MaskedUuidV7Slug {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

/// A masking-codec output: either a masked payload or a registered sentinel's plain slug.
/// Equality, ordering and hashing include the variant; use `as_str()` for a textual view.
/// Unlike the scalar slug types, this enum cannot implement `Borrow<str>` because strings
/// do not carry that variant and therefore have different equality and hash semantics.
///
/// ```compile_fail
/// use std::borrow::Borrow;
/// use uuid_slug::MaskedOrSentinelUuidV7Slug;
/// fn requires_string_identity<T: Borrow<str>>() {}
/// requires_string_identity::<MaskedOrSentinelUuidV7Slug>();
/// ```
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

// Both UUID types own the same wire-order bytes. Converting through text would add
// formatting, parsing and allocation without establishing any additional invariant.
/// Preserve all 128 bits from the `uuid` crate without allocating or checking the version.
impl From<uuid::Uuid> for Uuid {
    #[inline]
    fn from(uuid: uuid::Uuid) -> Self {
        Self(uuid.into_bytes())
    }
}

/// Transfer all UUID bits to the `uuid` crate without allocating.
impl From<Uuid> for uuid::Uuid {
    #[inline]
    fn from(uuid: Uuid) -> Self {
        Self::from_bytes(uuid.0)
    }
}

/// Own exactly sixteen wire-order bytes, preserving every UUID version and variant.
impl From<[u8; 16]> for Uuid {
    #[inline]
    fn from(bytes: [u8; 16]) -> Self {
        Self(bytes)
    }
}

/// Return all sixteen wire-order bytes without allocating.
impl From<Uuid> for [u8; 16] {
    #[inline]
    fn from(uuid: Uuid) -> Self {
        uuid.0
    }
}

/// Copy exactly sixteen wire-order bytes, returning `InvalidBuffer` for any other length.
/// Use [`Uuid::from_uuid_bytes`] to select a UUID within a larger buffer.
impl TryFrom<&[u8]> for Uuid {
    type Error = Error;

    fn try_from(bytes: &[u8]) -> Result<Self, Error> {
        // A slice carries no selected offset: accepting its prefix would hide a wrong range.
        <[u8; 16]>::try_from(bytes).map(Self).map_err(|_| {
            Error::new(ErrorCode::InvalidBuffer).with_message(format!(
                "Expected exactly 16 UUID bytes; got {}. Select a 16-byte slice or use Uuid::from_uuid_bytes with an offset.",
                bytes.len()
            ))
        })
    }
}

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
    /// The fraction width is `0..=12`; both widths together must fit the 74-bit payload.
    /// Zero omits a field. Invalid widths return `InvalidOptions`.
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
    /// Parse UUID text or a plain slug without a key. The plain-slug lengths (22 and 26) are disjoint
    /// from every accepted UUID text length, so the length alone selects the decoder. Length counts
    /// UTF-16 units, as TypeScript does, so non-ASCII input gets the same error code in both.
    /// Masked slugs need their codec: use `UuidV7MaskingCodec::masked_slug_to_uuid`.
    ///
    /// ```compile_fail
    /// use uuid_slug::{MaskedUuidV7Slug, Uuid};
    /// fn reject(masked: &MaskedUuidV7Slug) { let _ = Uuid::parse_uuid(masked); }
    /// ```
    #[inline]
    pub fn parse_uuid<Input: KeylessUuidText + ?Sized>(uuid: &Input) -> Result<Self, Error> {
        text::parse_uuid(uuid.as_uuid_text())
    }
    /// Infer the plain alphabet from the disjoint 22- and 26-character lengths.
    ///
    /// ```compile_fail
    /// use uuid_slug::{MaskedUuidV7Slug, Uuid};
    /// fn reject(masked: &MaskedUuidV7Slug) { let _ = Uuid::from_plain_uuid_slug(masked); }
    /// ```
    #[inline]
    pub fn from_plain_uuid_slug<Input: KeylessUuidText + ?Sized>(
        plain_uuid_slug: &Input,
    ) -> Result<Self, Error> {
        text::from_plain_uuid_slug(plain_uuid_slug.as_uuid_text())
    }
    /// Encode the UUID unchanged in the chosen alphabet.
    // Preserve a caller's constant alphabet through this public forwarding boundary.
    #[inline]
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
    /// RFC 9562 variant field, read from the leading bits of byte 8.
    pub const fn uuid_variant(&self) -> UuidVariant {
        match self.0[8] >> 5 {
            0..=3 => UuidVariant::Ncs,
            4 | 5 => UuidVariant::Rfc,
            6 => UuidVariant::Microsoft,
            _ => UuidVariant::Future,
        }
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
        let (fraction, counter, remaining) =
            crate::payload_fields::split(payload, fraction_bits, layout.counter_bits);
        Ok(UuidV7Payload {
            unix_ms,
            sub_millisecond_fraction: (fraction_bits != 0).then(|| UuidV7PayloadField {
                value: fraction,
                bits: fraction_bits,
            }),
            counter: (layout.counter_bits != 0).then(|| UuidV7PayloadField {
                value: counter,
                bits: layout.counter_bits,
            }),
            remaining: UuidV7PayloadField {
                value: remaining,
                bits: remaining_bits,
            },
        })
    }
}
pub(crate) fn range(capacity: usize, offset: usize) -> Result<core::ops::Range<usize>, Error> {
    let end = crate::buffer_range::uuid_end(capacity, offset).ok_or_else(|| {
        Error::new(ErrorCode::InvalidBuffer).with_message(format!(
            "Buffer needs 16 bytes at offset {offset}, but holds {capacity}."
        ))
    })?;
    Ok(offset..end)
}
impl FromStr for Uuid {
    type Err = Error;
    fn from_str(text: &str) -> Result<Self, Error> {
        // The ASCII parser enforces our complete UUID grammar, including case-insensitive URNs.
        // Detailed upstream diagnostics would be discarded when mapping to our typed error.
        uuid::Uuid::try_parse_ascii(text.as_bytes())
            .map(|id| Self(*id.as_bytes()))
            .map_err(|_| Error::new(ErrorCode::InvalidUuid))
    }
}
/// Lowercase hyphenated text, the default UUID spelling.
impl fmt::Display for Uuid {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        fmt::LowerHex::fmt(self, f)
    }
}
/// `{:x}`: lowercase hyphenated text, the same as `Display`.
impl fmt::LowerHex for Uuid {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        fmt::LowerHex::fmt(&uuid::Uuid::from_bytes(self.0).hyphenated(), f)
    }
}
/// `{:X}`: uppercase hyphenated text, the TypeScript `UUID_TEXT_UPPERCASE` spelling.
/// Formatting writes into the caller's writer without allocating.
impl fmt::UpperHex for Uuid {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        fmt::UpperHex::fmt(&uuid::Uuid::from_bytes(self.0).hyphenated(), f)
    }
}

/// RFC 9562 variant field values.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum UuidVariant {
    /// `0xx`: reserved for NCS backward compatibility.
    Ncs,
    /// `10x`: the RFC 9562 layout, used by UUIDv4 and UUIDv7.
    Rfc,
    /// `110`: reserved for Microsoft backward compatibility.
    Microsoft,
    /// `111`: reserved for future definition.
    Future,
}

#[cfg(test)]
mod tests {
    use super::*;
    use alloc::{borrow::ToOwned, string::ToString};

    #[test]
    fn external_uuid_conversions_preserve_each_wire_bit() -> Result<(), Error> {
        // Single-bit and inverted-bit inputs include every version/variant field;
        // known-version examples alone would miss accidental RFC normalization.
        for bit in 0..128 {
            for background in [0, u8::MAX] {
                let mut bytes = [background; 16];
                bytes[bit / 8] ^= 1 << (bit % 8);
                let external = uuid::Uuid::from_bytes(bytes);
                let id = Uuid::from(external);
                assert_eq!(id.as_uuid_bytes(), &bytes);
                assert_eq!(uuid::Uuid::from(id), external);
                assert_eq!(<[u8; 16]>::from(id), bytes);
                assert_eq!(Uuid::from(bytes), id);
                assert_eq!(Uuid::try_from(bytes.as_slice())?, id);
            }
        }
        Ok(())
    }

    #[test]
    fn slice_conversion_requires_an_exact_payload() -> Result<(), Error> {
        let bytes = [0x55; 32];
        for length in [0, 1, 15, 17, 31, 32] {
            assert_eq!(
                Uuid::try_from(&bytes[..length]).unwrap_err().code(),
                ErrorCode::InvalidBuffer
            );
        }
        assert_eq!(
            Uuid::try_from(&bytes[8..24])?,
            Uuid::from_uuid_bytes(&bytes, 8)?
        );
        Ok(())
    }

    #[test]
    fn collections_preserve_slug_variants() {
        use std::collections::{BTreeMap, HashMap};
        let text = "AAAAAAAAAAAAAAAAAAAAAA".to_owned();
        let masked =
            MaskedOrSentinelUuidV7Slug::Masked(MaskedUuidV7Slug(text.clone().into_boxed_str()));
        let sentinel = MaskedOrSentinelUuidV7Slug::Sentinel(PlainUuidSlug(text.into_boxed_str()));
        let hash = HashMap::from([(masked.clone(), 1), (sentinel.clone(), 2)]);
        let ordered = BTreeMap::from([(masked.clone(), 1), (sentinel.clone(), 2)]);
        assert_eq!(hash.get(&masked), Some(&1));
        assert_eq!(hash.get(&sentinel), Some(&2));
        assert_eq!(ordered.get(&masked), Some(&1));
        assert_eq!(ordered.get(&sentinel), Some(&2));
        assert_eq!(masked.as_str(), sentinel.as_str());
        let scalar = match sentinel {
            MaskedOrSentinelUuidV7Slug::Sentinel(slug) => slug,
            _ => unreachable!(),
        };
        assert_eq!(
            HashMap::from([(scalar, 3)]).get("AAAAAAAAAAAAAAAAAAAAAA"),
            Some(&3)
        );
    }
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
