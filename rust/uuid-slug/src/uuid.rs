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
            _ => return Err(Error::new(ErrorCode::InvalidUuidSlug)),
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
    /// Require both version 7 and the RFC variant.
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
}
pub(crate) fn range(capacity: usize, offset: usize) -> Result<std::ops::Range<usize>, Error> {
    let end = offset
        .checked_add(16)
        .filter(|&end| end <= capacity)
        .ok_or(Error::new(ErrorCode::InvalidBuffer))?;
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
