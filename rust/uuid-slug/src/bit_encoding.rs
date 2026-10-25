//! Pack the fixed UUID wire layouts without constructing a general-purpose codec.
use crate::UuidSlugAlphabet;
use alloc::{string::String, vec};

pub(super) fn encode_identifier_bits(
    alphabet: UuidSlugAlphabet,
    bytes: &[u8],
    payload_bits: usize,
) -> String {
    // Callers select 128 UUID bits or 132 masked bits; zero padding must not become payload.
    let bits = alphabet.bits_per_character();
    let symbols: &[u8] = match alphabet {
        UuidSlugAlphabet::Base64Url => {
            b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
        }
        UuidSlugAlphabet::Base32Hex => b"0123456789abcdefghijklmnopqrstuv",
    };
    let mut out = vec![0; payload_bits.div_ceil(bits)];
    for (index, symbol) in out.iter_mut().enumerate() {
        let bit = index * bits;
        let byte = bit / 8;
        // A two-byte window covers every 5/6-bit group; missing low bytes are zero padding.
        let word = (u16::from(bytes.get(byte).copied().unwrap_or(0)) << 8)
            | u16::from(bytes.get(byte + 1).copied().unwrap_or(0));
        *symbol = symbols[((word >> (16 - bits - bit % 8)) & ((1 << bits) - 1)) as usize];
    }
    // Only the fixed ASCII tables can contribute bytes; retain safe UTF-8 validation.
    String::from_utf8(out).expect("UUID alphabets contain only ASCII")
}

pub(super) fn decode_identifier_bits(
    alphabet: UuidSlugAlphabet,
    input: &[u8],
    out: &mut [u8],
) -> Result<(), ()> {
    // The alphabet owner checks text length and supplies private 16/17-byte scratch storage.
    let bits = alphabet.bits_per_character();
    let mut accumulator = 0u32;
    let mut available = 0;
    let mut written = 0;
    for &byte in input {
        let value = match alphabet {
            UuidSlugAlphabet::Base64Url => match byte {
                b'A'..=b'Z' => byte - b'A',
                b'a'..=b'z' => byte - b'a' + 26,
                b'0'..=b'9' => byte - b'0' + 52,
                b'-' => 62,
                b'_' => 63,
                _ => return Err(()),
            },
            UuidSlugAlphabet::Base32Hex => match byte {
                b'0'..=b'9' => byte - b'0',
                b'a'..=b'v' => byte - b'a' + 10,
                _ => return Err(()),
            },
        };
        // At most 13 low bits remain relevant; older bits may shift out without losing payload.
        accumulator = (accumulator << bits) | u32::from(value);
        available += bits;
        if available >= 8 {
            available -= 8;
            let target = out.get_mut(written).ok_or(())?;
            *target = (accumulator >> available) as u8;
            written += 1;
        }
    }
    // Nonzero spare bits would give one UUID several spellings. Callers commit scratch only on success.
    if written != out.len() || accumulator & ((1 << available) - 1) != 0 {
        Err(())
    } else {
        Ok(())
    }
}
