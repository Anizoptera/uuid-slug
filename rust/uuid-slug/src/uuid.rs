//! Preserve every UUID bit while enforcing canonical text and slug spellings.
use crate::{Alphabet, Error, ErrorCode};
use std::{fmt, str::FromStr};

pub(crate) fn utf16_len(text: &str) -> usize {
    text.encode_utf16().count()
}

/// A 128-bit UUID; generic parsing accepts every version and variant, including nil.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Uuid([u8; 16]);
impl Uuid {
    /// Take owned bytes without imposing a version restriction.
    pub const fn from_bytes(bytes: [u8; 16]) -> Self {
        Self(bytes)
    }
    /// Borrow all sixteen UUID bytes in wire order.
    pub const fn as_bytes(&self) -> &[u8; 16] {
        &self.0
    }
    /// Read sixteen bytes at an offset, rejecting overflow and short buffers.
    pub fn from_slice(bytes: &[u8], offset: usize) -> Result<Self, Error> {
        let range = range(bytes.len(), offset)?;
        let mut out = [0; 16];
        out.copy_from_slice(&bytes[range]);
        Ok(Self(out))
    }
    /// Parse lowercase hexadecimal with the canonical four hyphens.
    pub fn parse(text: &str) -> Result<Self, Error> {
        text.parse()
    }
    /// Infer the plain alphabet from the disjoint 22- and 26-character lengths.
    pub fn parse_slug(text: &str) -> Result<Self, Error> {
        let alphabet = match utf16_len(text) {
            22 => Alphabet::Base64Url,
            26 => Alphabet::Base32Hex,
            _ => return Err(Error::new(ErrorCode::InvalidUuidSlug)),
        };
        let mut bytes = [0; 16];
        alphabet.decode_into(text, &mut bytes, 0)?;
        Ok(Self(bytes))
    }
    /// Encode the UUID unchanged in the chosen alphabet.
    pub fn slug(&self, alphabet: Alphabet) -> String {
        alphabet.encode(&self.0)
    }
    /// Copy the UUID to a checked destination range; failure does not write.
    pub fn write_into(&self, out: &mut [u8], offset: usize) -> Result<(), Error> {
        let target = range(out.len(), offset)?;
        out[target].copy_from_slice(&self.0);
        Ok(())
    }
    /// Version nibble, without assuming the RFC variant.
    pub const fn version(&self) -> u8 {
        self.0[6] >> 4
    }
    /// Whether the variant is RFC 9562's `10` bit pattern.
    pub const fn is_rfc_variant(&self) -> bool {
        self.0[8] >> 6 == 2
    }
    /// Require both version 7 and the RFC variant.
    pub const fn is_v7(&self) -> bool {
        self.version() == 7 && self.is_rfc_variant()
    }
    /// Require both version 4 and the RFC variant.
    pub const fn is_v4(&self) -> bool {
        self.version() == 4 && self.is_rfc_variant()
    }
    /// Read the 48-bit millisecond timestamp, refusing random bytes from other versions.
    pub fn timestamp(&self) -> Result<u64, Error> {
        if !self.is_v7() {
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
        if input.len() != 36 || [8, 13, 18, 23].iter().any(|&i| input[i] != b'-') {
            return Err(Error::new(ErrorCode::InvalidUuid));
        }
        // The dependency accepts uppercase and other UUID spellings; our input contract does not.
        if input.iter().any(u8::is_ascii_uppercase) {
            return Err(Error::new(ErrorCode::InvalidUuid));
        }
        uuid::Uuid::parse_str(text)
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
        let text = "ffffffff-ffff-ffff-ffff-ffffffffffff";
        let id = Uuid::parse(text)?;
        assert_eq!(id.to_string(), text);
        assert!(id.timestamp().is_err());
        assert!(Uuid::parse("FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF").is_err());
        for alphabet in [Alphabet::Base64Url, Alphabet::Base32Hex] {
            assert_eq!(Uuid::parse_slug(&id.slug(alphabet))?, id);
        }
        let mut out = [23; 32];
        assert!(id.write_into(&mut out, usize::MAX).is_err());
        assert_eq!(out, [23; 32]);
        id.write_into(&mut out, 16)?;
        assert_eq!(Uuid::from_slice(&out, 16)?, id);
        assert_eq!(&out[..16], &[23; 16]);
        Ok(())
    }
}
