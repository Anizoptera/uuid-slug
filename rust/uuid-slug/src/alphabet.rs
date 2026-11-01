//! Encode identifier bits without accepting alternate padding spellings.
use crate::{Error, ErrorCode, KeylessUuidText, PlainUuidSlug};
use alloc::{boxed::Box, format};

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
    fn error(self) -> Error {
        match self {
            Self::Base64Url => Error::new(ErrorCode::InvalidBase64Url),
            Self::Base32Hex => Error::new(ErrorCode::InvalidBase32Hex),
        }
    }
    /// Encode exactly one 16-byte UUID payload.
    // Keep the selected alphabet visible across the library boundary.
    #[inline]
    pub fn uuid_bytes_to_plain_slug(self, uuid_bytes: &[u8; 16]) -> PlainUuidSlug {
        PlainUuidSlug(crate::bit_encoding::encode_identifier_bits(
            self, uuid_bytes, 128,
        ))
    }
    /// Encode the 128-bit block and four external check bits without changing their wire order.
    pub(crate) fn encode_tail(
        self,
        bytes: &[u8; 16],
        tail: u8,
        tail_bits: u8,
    ) -> Result<Box<str>, Error> {
        if tail_bits != 4 {
            return Err(self.error());
        }
        let mut full = [0; 17];
        full[..16].copy_from_slice(bytes);
        full[16] = tail << 4;
        Ok(crate::bit_encoding::encode_identifier_bits(
            self, &full, 132,
        ))
    }
    /// Decode an identifier transactionally; invalid input cannot modify the caller's bytes.
    pub(crate) fn decode_into(
        self,
        text: &str,
        out: &mut [u8; 16],
        tail_bits: u8,
    ) -> Result<u8, Error> {
        match tail_bits {
            0 => self.decode_identifier::<0>(text, out),
            4 => self.decode_identifier::<4>(text, out),
            _ => Err(self.error()),
        }
    }

    // Fix the wire layout independently of the caller's string container; there are only
    // plain UUID and masked payload layouts, not one decoder body per input type.
    fn decode_identifier<const TAIL_BITS: u8>(
        self,
        text: &str,
        out: &mut [u8; 16],
    ) -> Result<u8, Error> {
        match TAIL_BITS {
            0 => {
                let expected = 128usize.div_ceil(self.bits_per_character());
                if text.len() != expected {
                    return Err(self.error().with_message(format!(
                        "Plain {} slug must contain {expected} ASCII characters; got {} UTF-8 bytes.",
                        self.name(),
                        text.len()
                    )));
                }
                let mut decoded = [0; 16];
                crate::bit_encoding::decode_identifier_bits(self, text.as_bytes(), &mut decoded)
                    .map_err(|_| {
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
                let length_error = || {
                    self.error().with_message(format!(
                        "Masked {} slug must contain {length} ASCII characters; got {} UTF-8 bytes.",
                        self.name(),
                        text.len()
                    ))
                };
                let (decoded, tail) = match self {
                    Self::Base64Url => crate::bit_encoding::decode_masked_base64(
                        text.as_bytes().try_into().map_err(|_| length_error())?,
                    ),
                    Self::Base32Hex => crate::bit_encoding::decode_masked_base32(
                        text.as_bytes().try_into().map_err(|_| length_error())?,
                    ),
                }
                .map_err(|failure| {
                    self.error().with_message(match failure {
                        crate::bit_encoding::MaskedDecodeError::InvalidCharacter => format!(
                            "Masked {} slug contains an invalid character or invalid trailing bits.",
                            self.name()
                        ),
                        crate::bit_encoding::MaskedDecodeError::NonzeroPadding => format!(
                            "Masked {} slug has nonzero trailing bits.",
                            self.name()
                        ),
                    })
                })?;
                *out = decoded;
                Ok(tail)
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
    ///
    /// ```compile_fail
    /// use uuid_slug::{MaskedUuidV7Slug, UuidSlugAlphabet};
    /// fn reject(masked: &MaskedUuidV7Slug) {
    ///     let _ = UuidSlugAlphabet::Base64Url.plain_slug_to_uuid_bytes(masked);
    /// }
    /// ```
    #[inline]
    pub fn plain_slug_to_uuid_bytes<Input: KeylessUuidText + ?Sized>(
        self,
        plain_uuid_slug: &Input,
    ) -> Result<[u8; 16], Error> {
        let mut decoded = [0; 16];
        // Keep plain and masked layouts specialized independently of the caller's text container.
        self.decode_identifier::<0>(plain_uuid_slug.as_uuid_text(), &mut decoded)?;
        Ok(decoded)
    }

    /// Decode into caller storage and return only the decoded range, without allocating.
    /// Invalid text and ranges leave storage unchanged.
    ///
    /// ```compile_fail
    /// use uuid_slug::{MaskedUuidV7Slug, UuidSlugAlphabet};
    /// fn reject(masked: &MaskedUuidV7Slug) {
    ///     let _ = UuidSlugAlphabet::Base64Url.plain_slug_to_uuid_bytes_into(masked, &mut [0; 16], 0);
    /// }
    /// ```
    #[inline]
    pub fn plain_slug_to_uuid_bytes_into<'a, Input: KeylessUuidText + ?Sized>(
        self,
        plain_uuid_slug: &Input,
        output: &'a mut [u8],
        output_offset: usize,
    ) -> Result<&'a mut [u8], Error> {
        let decoded = self.plain_slug_to_uuid_bytes(plain_uuid_slug)?;
        Self::write_decoded_bytes(&decoded, output, output_offset)
    }

    // Keep the checked write shared without carrying alphabet selection across this call.
    // Decoding must finish first: malformed text takes precedence and never writes output.
    fn write_decoded_bytes<'a>(
        decoded: &[u8; 16],
        output: &'a mut [u8],
        output_offset: usize,
    ) -> Result<&'a mut [u8], Error> {
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
        target.copy_from_slice(decoded);
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
    fn malformed_plain_input_precedes_invalid_destination() {
        for (alphabet, valid, invalid, input_error) in [
            (
                UuidSlugAlphabet::Base64Url,
                "AAAAAAAAAAAAAAAAAAAAAA",
                "AAAAAAAAAAAAAAAAAAAAAB",
                ErrorCode::InvalidBase64Url,
            ),
            (
                UuidSlugAlphabet::Base32Hex,
                "00000000000000000000000000",
                "00000000000000000000000001",
                ErrorCode::InvalidBase32Hex,
            ),
        ] {
            for offset in [3, usize::MAX] {
                for (text, expected) in [(valid, ErrorCode::InvalidBuffer), (invalid, input_error)]
                {
                    let mut output = [0xa5; 18];
                    let error = alphabet
                        .plain_slug_to_uuid_bytes_into(text, &mut output, offset)
                        .unwrap_err();
                    assert_eq!(error.code(), expected);
                    assert_eq!(output, [0xa5; 18]);
                }
            }
        }
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
