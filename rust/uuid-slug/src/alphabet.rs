//! Encode identifier bits without accepting alternate padding spellings.
use crate::Error;
use data_encoding::{BASE64URL_NOPAD, Encoding, Specification};
use std::sync::LazyLock;

static BASE64URL: Encoding = BASE64URL_NOPAD;
// Case is part of the wire format; the uppercase built-in base32hex alphabet is not interchangeable.
static BASE32HEX: LazyLock<Encoding> = LazyLock::new(|| {
    let mut spec = Specification::new();
    spec.symbols.push_str("0123456789abcdefghijklmnopqrstuv");
    spec.encoding().expect("fixed base32hex alphabet is valid")
});

/// Supported output representations; decoding plain UUIDs infers this from length.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Alphabet {
    /// Shortest representation; case-sensitive.
    #[default]
    Base64Url,
    /// Lowercase, ASCII-sortable representation safe on case-insensitive filesystems.
    Base32Hex,
}
impl Alphabet {
    /// Number of data bits carried by each character.
    pub const fn bits(self) -> usize {
        match self {
            Self::Base64Url => 6,
            Self::Base32Hex => 5,
        }
    }
    fn encoding(self) -> &'static Encoding {
        match self {
            Self::Base64Url => &BASE64URL,
            Self::Base32Hex => &BASE32HEX,
        }
    }
    fn error(self) -> Error {
        match self {
            Self::Base64Url => Error::InvalidBase64Url,
            Self::Base32Hex => Error::InvalidBase32,
        }
    }
    fn encode_raw(self, bytes: &[u8]) -> String {
        self.encoding().encode(bytes)
    }
    /// Encode exactly one 16-byte UUID payload.
    pub fn encode(self, bytes: &[u8]) -> Result<String, Error> {
        if bytes.len() != 16 {
            return Err(Error::InvalidBuffer);
        }
        Ok(self.encode_raw(bytes))
    }
    pub(crate) fn encode_uuid(self, bytes: &[u8; 16]) -> String {
        self.encode_raw(bytes)
    }
    /// Encode the 128-bit block and four external check bits without changing their wire order.
    pub(crate) fn encode_tail(
        self,
        bytes: &[u8; 16],
        tail: u8,
        tail_bits: u8,
    ) -> Result<String, Error> {
        if tail_bits != 4 {
            return Err(self.error());
        }
        let mut full = [0; 17];
        full[..16].copy_from_slice(bytes);
        full[16] = tail << 4;
        let mut text = self.encode_raw(&full);
        text.truncate(132usize.div_ceil(self.bits()));
        Ok(text)
    }
    /// Decode an identifier transactionally; invalid input cannot modify the caller's bytes.
    pub(crate) fn decode_into(
        self,
        text: &str,
        out: &mut [u8; 16],
        tail_bits: u8,
    ) -> Result<u8, Error> {
        let encoding = self.encoding();
        match tail_bits {
            0 => {
                if text.len() != 128usize.div_ceil(self.bits()) {
                    return Err(self.error());
                }
                let mut decoded = [0; 16];
                encoding
                    .decode_mut(text.as_bytes(), &mut decoded)
                    .map_err(|_| self.error())?;
                *out = decoded;
                Ok(0)
            }
            4 => {
                let length = 132usize.div_ceil(self.bits());
                if text.len() != length {
                    return Err(self.error());
                }
                // Restore the omitted zero character to decode 17 bytes; the low nibble is not payload.
                let zero = if self == Self::Base64Url { b'A' } else { b'0' };
                let mut padded = [zero; 28];
                padded[..length].copy_from_slice(text.as_bytes());
                let mut decoded = [0; 17];
                encoding
                    .decode_mut(&padded[..length + 1], &mut decoded)
                    .map_err(|_| self.error())?;
                if decoded[16] & 15 != 0 {
                    return Err(self.error());
                }
                out.copy_from_slice(&decoded[..16]);
                Ok(decoded[16] >> 4)
            }
            _ => Err(self.error()),
        }
    }
    /// Decode exactly one canonical 16-byte UUID payload.
    pub fn decode(self, text: &str) -> Result<Vec<u8>, Error> {
        let mut decoded = [0; 16];
        self.decode_into(text, &mut decoded, 0)?;
        Ok(decoded.to_vec())
    }

    /// Decode into caller storage and return only the decoded range, without allocating.
    /// Invalid text and ranges leave storage unchanged.
    pub fn decode_to<'a>(
        self,
        text: &str,
        out: &'a mut [u8],
        offset: usize,
    ) -> Result<&'a mut [u8], Error> {
        let mut decoded = [0; 16];
        self.decode_into(text, &mut decoded, 0)?;
        let end = offset.checked_add(16).ok_or(Error::InvalidBuffer)?;
        let target = out.get_mut(offset..end).ok_or(Error::InvalidBuffer)?;
        target.copy_from_slice(&decoded);
        Ok(target)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn preserves_mask_tail_and_refuses_padding_aliases() -> Result<(), Error> {
        let bytes = [0xa5; 16];
        for alphabet in [Alphabet::Base64Url, Alphabet::Base32Hex] {
            for tail in 0..16 {
                let text = alphabet.encode_tail(&bytes, tail, 4)?;
                let mut out = [0; 16];
                assert_eq!(alphabet.decode_into(&text, &mut out, 4)?, tail);
                assert_eq!(out, bytes);
                if alphabet == Alphabet::Base32Hex {
                    for padding in 1..8 {
                        let mut alias = text.as_bytes().to_vec();
                        let symbols = b"0123456789abcdefghijklmnopqrstuv";
                        let last = symbols
                            .iter()
                            .position(|&c| c == alias[26])
                            .ok_or(Error::InvalidUuidSlug)?;
                        alias[26] = symbols[last | padding];
                        let mut untouched = [0xab; 16];
                        assert!(
                            alphabet
                                .decode_into(
                                    std::str::from_utf8(&alias)
                                        .map_err(|_| Error::InvalidUuidSlug)?,
                                    &mut untouched,
                                    4,
                                )
                                .is_err()
                        );
                        assert_eq!(untouched, [0xab; 16]);
                    }
                }
                assert_eq!(
                    text.len(),
                    if alphabet == Alphabet::Base64Url {
                        22
                    } else {
                        27
                    }
                );
            }
            let text = alphabet.encode(&bytes)?;
            let mut alias = text.into_bytes();
            let last = alias.len() - 1;
            // The chosen bytes encode with an even final digit in both alphabets.
            alias[last] += 1;
            let mut out = [0xab; 16];
            assert!(
                alphabet
                    .decode_into(
                        std::str::from_utf8(&alias).map_err(|_| Error::InvalidUuidSlug)?,
                        &mut out,
                        0
                    )
                    .is_err()
            );
            assert_eq!(out, [0xab; 16]);
        }
        Ok(())
    }
    #[test]
    fn base64_uuid_payload_is_exact_and_transactional() -> Result<(), Error> {
        let bytes = [0xa5; 16];
        let text = Alphabet::Base64Url.encode(&bytes)?;
        assert_eq!(Alphabet::Base64Url.decode(&text)?, bytes);
        for invalid in ["", "Zg", "Zg=", "Zh", "Zg\n", "é"] {
            assert!(Alphabet::Base64Url.decode(invalid).is_err());
        }
        assert!(Alphabet::Base64Url.encode(&[]).is_err());
        assert!(Alphabet::Base64Url.encode(&[0; 15]).is_err());
        assert!(Alphabet::Base64Url.encode(&[0; 17]).is_err());
        let mut out = [165; 18];
        assert_eq!(Alphabet::Base64Url.decode_to(&text, &mut out, 1)?, &bytes);
        assert_eq!(&out[..1], &[165]);
        assert_eq!(&out[17..], &[165]);
        let saved = out;
        assert!(
            Alphabet::Base64Url
                .decode_to("AAAAAAAAAAAAAAAAAAAAA!", &mut out, 1)
                .is_err()
        );
        assert_eq!(out, saved);
        for offset in [3, usize::MAX] {
            assert!(
                Alphabet::Base64Url
                    .decode_to(&text, &mut out, offset)
                    .is_err()
            );
            assert_eq!(out, saved);
        }
        Ok(())
    }
}
