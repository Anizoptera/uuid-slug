use crate::{UuidSlugAlphabet, bit_encoding::decode_identifier_bits};

// Reference wire symbols stay independent of the runtime tables, so both cannot change together.
const BASE64URL: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const BASE32HEX: &[u8] = b"0123456789abcdefghijklmnopqrstuv";

fn reference_spelling<const BYTES: usize, const CHARS: usize, const BITS: usize>(
    payload: &[u8; BYTES],
    symbols: &[u8],
) -> ([u8; CHARS], u8) {
    // Project individual network-order bits; the production decoder uses an accumulator.
    let mut text = [0; CHARS];
    let mut symbol = 0;
    let mut last_digit = 0;
    while symbol < CHARS {
        let mut digit = 0u8;
        let mut within = 0;
        while within < BITS {
            let position = symbol * BITS + within;
            digit <<= 1;
            if position < BYTES * 8 {
                digit |= (payload[position / 8] >> (7 - position % 8)) & 1;
            }
            within += 1;
        }
        text[symbol] = symbols[usize::from(digit)];
        last_digit = digit;
        symbol += 1;
    }
    (text, last_digit)
}

// Reconstruct the oracle's normalized payload from the real decoder's bytes and four-bit tail.
fn decode_payload<const BYTES: usize, const CHARS: usize>(
    alphabet: UuidSlugAlphabet,
    text: &[u8; CHARS],
) -> Result<[u8; BYTES], crate::bit_encoding::MaskedDecodeError> {
    let mut decoded = [0; BYTES];
    if BYTES == 17 {
        let (bytes, tail) = match alphabet {
            UuidSlugAlphabet::Base64Url => {
                crate::bit_encoding::decode_masked_base64(text.as_slice().try_into().unwrap())
            }
            UuidSlugAlphabet::Base32Hex => {
                crate::bit_encoding::decode_masked_base32(text.as_slice().try_into().unwrap())
            }
        }?;
        // Shifting first would hide invalid high bits in the decoder's returned tail.
        assert!(tail < 16, "decoded tail must fit four bits");
        decoded[..16].copy_from_slice(&bytes);
        decoded[16] = tail << 4;
    } else {
        decode_identifier_bits(alphabet, text, &mut decoded)
            .map_err(|()| crate::bit_encoding::MaskedDecodeError::InvalidCharacter)?;
    }
    Ok(decoded)
}

fn verify_decoding<const BYTES: usize, const CHARS: usize, const BITS: usize>(
    alphabet: UuidSlugAlphabet,
    symbols: &[u8],
) {
    let mut payload: [u8; BYTES] = kani::any();
    if BYTES == 17 {
        // Masked callers normalize 132 payload bits into 17 bytes; the low nibble is not data.
        payload[BYTES - 1] &= 0xf0;
    }
    let (mut canonical, last_digit) = reference_spelling::<BYTES, CHARS, BITS>(&payload, symbols);
    if alphabet == UuidSlugAlphabet::Base32Hex {
        let uppercase: [bool; CHARS] = kani::any();
        for (byte, upper) in canonical.iter_mut().zip(uppercase) {
            if upper && byte.is_ascii_lowercase() {
                *byte -= b'a' - b'A';
            }
        }
    }
    let result = decode_payload::<BYTES, CHARS>(alphabet, &canonical);
    assert!(result.is_ok(), "canonical text must decode");
    let decoded = result.unwrap();
    assert_eq!(decoded, payload, "every payload bit must survive decoding");

    // Corrupt only wire padding: masked base64url has none, while masked base32hex has three bits.
    let spare = CHARS * BITS - if BYTES == 17 { 132 } else { 128 };
    if spare != 0 {
        let padding: u8 = kani::any();
        kani::assume(padding > 0 && usize::from(padding) < (1usize << spare));
        let mut bad_padding = canonical;
        bad_padding[CHARS - 1] = symbols[usize::from(last_digit | padding)];
        let rejected = decode_payload::<BYTES, CHARS>(alphabet, &bad_padding);
        assert!(
            if BYTES == 17 {
                matches!(
                    rejected,
                    Err(crate::bit_encoding::MaskedDecodeError::NonzeroPadding)
                )
            } else {
                rejected.is_err()
            },
            "nonzero decoder padding must fail"
        );
    }

    // One arbitrary non-alphabet byte at any position must fail without relying on bad padding.
    let invalid: u8 = kani::any();
    kani::assume(!symbols.iter().any(|&symbol| {
        symbol == invalid
            || (alphabet == UuidSlugAlphabet::Base32Hex
                && symbol.is_ascii_lowercase()
                && invalid == symbol - (b'a' - b'A'))
    }));
    let position: usize = kani::any();
    kani::assume(position < CHARS);
    let mut bad_character = canonical;
    bad_character[position] = invalid;
    assert!(
        matches!(
            decode_payload::<BYTES, CHARS>(alphabet, &bad_character),
            Err(crate::bit_encoding::MaskedDecodeError::InvalidCharacter)
        ),
        "a non-alphabet byte must fail"
    );
}

// The bound covers the 64-symbol reference membership scan and its terminating iteration.
#[kani::proof]
#[kani::unwind(65)]
fn base64_uuid_bits() {
    verify_decoding::<16, 22, 6>(UuidSlugAlphabet::Base64Url, BASE64URL);
}

#[kani::proof]
#[kani::unwind(65)]
fn base32_uuid_bits() {
    verify_decoding::<16, 26, 5>(UuidSlugAlphabet::Base32Hex, BASE32HEX);
}

#[kani::proof]
#[kani::unwind(65)]
fn base64_masked_bits() {
    verify_decoding::<17, 22, 6>(UuidSlugAlphabet::Base64Url, BASE64URL);
}

#[kani::proof]
#[kani::unwind(65)]
fn base32_masked_bits() {
    verify_decoding::<17, 27, 5>(UuidSlugAlphabet::Base32Hex, BASE32HEX);
}

fn verify_encoding<
    const BYTES: usize,
    const CHARS: usize,
    const BITS: usize,
    const INPUT: usize,
    const OUTPUT: usize,
>(
    symbols: &[u8],
) {
    let mut payload: [u8; BYTES] = kani::any();
    if BYTES == 17 {
        payload[BYTES - 1] &= 0xf0;
    }
    let reference = if BITS == 6 { BASE64URL } else { BASE32HEX };
    let (expected, _) = reference_spelling::<BYTES, CHARS, BITS>(&payload, reference);
    let mut encoded = [0; CHARS];
    // Check the real block writer and its actual tables, without symbolic allocation machinery.
    let mut written = 0;
    crate::bit_encoding::encode_blocks::<INPUT, OUTPUT, BITS, _>(
        symbols,
        &payload,
        CHARS,
        |symbol| {
            encoded[written] = symbol;
            written += 1;
        },
    );
    assert_eq!(
        encoded, expected,
        "encoding must preserve every payload bit and canonical padding"
    );
}

#[kani::proof]
#[kani::unwind(65)]
fn encoding_base64_uuid_bits() {
    verify_encoding::<16, 22, 6, 3, 4>(crate::bit_encoding::BASE64URL_SYMBOLS);
}

#[kani::proof]
#[kani::unwind(65)]
fn encoding_base32_uuid_bits() {
    verify_encoding::<16, 26, 5, 5, 8>(crate::bit_encoding::BASE32HEX_SYMBOLS);
}

#[kani::proof]
#[kani::unwind(65)]
fn encoding_base64_masked_bits() {
    verify_encoding::<17, 22, 6, 3, 4>(crate::bit_encoding::BASE64URL_SYMBOLS);
}

#[kani::proof]
#[kani::unwind(65)]
fn encoding_base32_masked_bits() {
    verify_encoding::<17, 27, 5, 5, 8>(crate::bit_encoding::BASE32HEX_SYMBOLS);
}
