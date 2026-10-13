//! Encode identifier bits without accepting alternate padding spellings.
use crate::{Error, ErrorCode, PlainUuidSlug};
use data_encoding::{BASE64URL_NOPAD, Encoding, Specification};
use std::sync::LazyLock;

static BASE64URL: Encoding = BASE64URL_NOPAD;
// Writers stay lowercase; readers also accept the RFC uppercase base32hex spelling.
static BASE32HEX: LazyLock<Encoding> = LazyLock::new(|| {
    let mut spec = Specification::new();
    spec.symbols.push_str("0123456789abcdefghijklmnopqrstuv");
    spec.encoding().expect("fixed base32hex alphabet is valid")
});

/// Supported output representations; decoding plain slugs infers this from length.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum UuidSlugAlphabet {
    /// Shortest representation; case-sensitive.
    #[default]
    Base64Url,
    /// Lowercase, ASCII-sortable representation safe on case-insensitive filesystems.
    Base32Hex,
}
impl UuidSlugAlphabet {
    /// Number of data bits carried by each character.
    pub const fn bits_per_character(self) -> usize {
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
            Self::Base64Url => Error::new(ErrorCode::InvalidBase64Url),
            Self::Base32Hex => Error::new(ErrorCode::InvalidBase32Hex),
        }
    }
    fn encode_raw(self, bytes: &[u8]) -> String {
        self.encoding().encode(bytes)
    }
    /// Encode exactly one 16-byte UUID payload.
    pub fn uuid_bytes_to_plain_slug(self, uuid_bytes: &[u8; 16]) -> PlainUuidSlug {
        PlainUuidSlug(self.encode_raw(uuid_bytes))
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
        text.truncate(132usize.div_ceil(self.bits_per_character()));
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
                let expected = 128usize.div_ceil(self.bits_per_character());
                if text.len() != expected {
                    return Err(self.error().with_message(format!(
                        "Plain {} slug must contain {expected} ASCII characters; got {} UTF-8 bytes.",
                        self.name(),
                        text.len()
                    )));
                }
                let mut normalized = [0; 26];
                let input = if self == Self::Base32Hex {
                    normalized.copy_from_slice(text.as_bytes());
                    normalized.make_ascii_lowercase();
                    normalized.as_slice()
                } else {
                    text.as_bytes()
                };
                let mut decoded = [0; 16];
                encoding.decode_mut(input, &mut decoded).map_err(|_| {
                    self.error().with_message(format!(
                        "Plain {} slug contains an invalid character or nonzero trailing bits.",
                        self.name()
                    ))
                })?;
                *out = decoded;
                Ok(0)
            }
            4 => {
                let length = 132usize.div_ceil(self.bits_per_character());
                if text.len() != length {
                    return Err(self.error().with_message(format!(
                        "Masked {} slug must contain {length} ASCII characters; got {} UTF-8 bytes.",
                        self.name(),
                        text.len()
                    )));
                }
                // Restore the omitted zero character to decode 17 bytes; the low nibble is not payload.
                let zero = if self == Self::Base64Url { b'A' } else { b'0' };
                let mut padded = [zero; 28];
                padded[..length].copy_from_slice(text.as_bytes());
                if self == Self::Base32Hex {
                    padded[..length].make_ascii_lowercase();
                }
                let mut decoded = [0; 17];
                encoding
                    .decode_mut(&padded[..length + 1], &mut decoded)
                    .map_err(|_| {
                        self.error().with_message(format!(
                            "Masked {} slug contains an invalid character or invalid trailing bits.",
                            self.name()
                        ))
                    })?;
                if decoded[16] & 15 != 0 {
                    return Err(self.error().with_message(format!(
                        "Masked {} slug has nonzero trailing bits.",
                        self.name()
                    )));
                }
                out.copy_from_slice(&decoded[..16]);
                Ok(decoded[16] >> 4)
            }
            _ => Err(self.error()),
        }
    }

    const fn name(self) -> &'static str {
        match self {
            Self::Base64Url => "base64url",
            Self::Base32Hex => "base32hex",
        }
    }
    /// Decode exactly one canonical 16-byte UUID payload.
    pub fn plain_slug_to_uuid_bytes(self, plain_uuid_slug: &str) -> Result<[u8; 16], Error> {
        let mut decoded = [0; 16];
        self.decode_into(plain_uuid_slug, &mut decoded, 0)?;
        Ok(decoded)
    }

    /// Decode into caller storage and return only the decoded range, without allocating.
    /// Invalid text and ranges leave storage unchanged.
    pub fn plain_slug_to_uuid_bytes_into<'a>(
        self,
        plain_uuid_slug: &str,
        output: &'a mut [u8],
        output_offset: usize,
    ) -> Result<&'a mut [u8], Error> {
        let mut decoded = [0; 16];
        self.decode_into(plain_uuid_slug, &mut decoded, 0)?;
        let end = output_offset.checked_add(16).ok_or_else(|| {
            Error::new(ErrorCode::InvalidBuffer).with_message(format!(
                "Output needs 16 bytes at offset {output_offset}, but the offset overflows usize."
            ))
        })?;
        let capacity = output.len();
        let target = output.get_mut(output_offset..end).ok_or_else(|| {
            Error::new(ErrorCode::InvalidBuffer).with_message(format!(
                "Output needs 16 bytes at offset {output_offset}, but holds {}.",
                capacity
            ))
        })?;
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
        for alphabet in [UuidSlugAlphabet::Base64Url, UuidSlugAlphabet::Base32Hex] {
            for tail in 0..16 {
                let text = alphabet.encode_tail(&bytes, tail, 4)?;
                let mut out = [0; 16];
                assert_eq!(alphabet.decode_into(&text, &mut out, 4)?, tail);
                assert_eq!(out, bytes);
                if alphabet == UuidSlugAlphabet::Base32Hex {
                    for padding in 1..8 {
                        let mut alias = text.as_bytes().to_vec();
                        let symbols = b"0123456789abcdefghijklmnopqrstuv";
                        let last = symbols
                            .iter()
                            .position(|&c| c == alias[26])
                            .ok_or(Error::new(ErrorCode::InvalidUuidSlug))?;
                        alias[26] = symbols[last | padding];
                        let mut untouched = [0xab; 16];
                        assert!(
                            alphabet
                                .decode_into(
                                    std::str::from_utf8(&alias)
                                        .map_err(|_| Error::new(ErrorCode::InvalidUuidSlug))?,
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
                    if alphabet == UuidSlugAlphabet::Base64Url {
                        22
                    } else {
                        27
                    }
                );
            }
            let text = alphabet.uuid_bytes_to_plain_slug(&bytes);
            let mut alias = text.into_string().into_bytes();
            let last = alias.len() - 1;
            // The chosen bytes encode with an even final digit in both alphabets.
            alias[last] += 1;
            let mut out = [0xab; 16];
            assert!(
                alphabet
                    .decode_into(
                        std::str::from_utf8(&alias)
                            .map_err(|_| Error::new(ErrorCode::InvalidUuidSlug))?,
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
        let text = UuidSlugAlphabet::Base64Url.uuid_bytes_to_plain_slug(&bytes);
        assert_eq!(
            UuidSlugAlphabet::Base64Url.plain_slug_to_uuid_bytes(&text)?,
            bytes
        );
        for invalid in ["", "Zg", "Zg=", "Zh", "Zg\n", "é"] {
            assert!(
                UuidSlugAlphabet::Base64Url
                    .plain_slug_to_uuid_bytes(invalid)
                    .is_err()
            );
        }
        // Different initial bytes make a missing write observable.
        let mut out = [0x55; 18];
        assert_eq!(
            UuidSlugAlphabet::Base64Url.plain_slug_to_uuid_bytes_into(&text, &mut out, 1)?,
            &bytes
        );
        assert_eq!(&out[..1], &[0x55]);
        assert_eq!(&out[17..], &[0x55]);
        let saved = out;
        assert!(
            UuidSlugAlphabet::Base64Url
                .plain_slug_to_uuid_bytes_into("AAAAAAAAAAAAAAAAAAAAA!", &mut out, 1)
                .is_err()
        );
        assert_eq!(out, saved);
        for offset in [3, usize::MAX] {
            assert!(
                UuidSlugAlphabet::Base64Url
                    .plain_slug_to_uuid_bytes_into(&text, &mut out, offset)
                    .is_err()
            );
            assert_eq!(out, saved);
        }
        Ok(())
    }
}
