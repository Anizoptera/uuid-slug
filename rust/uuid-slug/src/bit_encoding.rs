//! Pack the fixed UUID wire layouts without constructing a general-purpose codec.
use crate::UuidSlugAlphabet;
use alloc::{boxed::Box, string::String, vec};

// Symbol order defines issued identifiers; both directions derive from these fixed alphabets.
pub(super) const BASE64URL_SYMBOLS: &[u8] =
    b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
pub(super) const BASE32HEX_SYMBOLS: &[u8] = b"0123456789abcdefghijklmnopqrstuv";

const fn decoding_table(symbols: &[u8]) -> [u8; 256] {
    let mut values = [u8::MAX; 256];
    let mut index = 0;
    while index < symbols.len() {
        values[symbols[index] as usize] = index as u8;
        index += 1;
    }
    values
}

const BASE64URL_VALUES: [u8; 256] = decoding_table(BASE64URL_SYMBOLS);
const BASE32HEX_VALUES: [u8; 256] = decoding_table(BASE32HEX_SYMBOLS);

// Expose a constant caller alphabet so ordinary linking can discard the other table without LTO.
#[inline]
pub(super) fn encode_identifier_bits(
    alphabet: UuidSlugAlphabet,
    bytes: &[u8],
    payload_bits: usize,
) -> Box<str> {
    // Callers select 128 UUID bits or 132 masked bits; zero padding must not become payload.
    let bits = alphabet.bits_per_character();
    let symbols: &[u8] = match alphabet {
        UuidSlugAlphabet::Base64Url => BASE64URL_SYMBOLS,
        UuidSlugAlphabet::Base32Hex => BASE32HEX_SYMBOLS,
    };
    let mut out = vec![0; payload_bits.div_ceil(bits)];
    match alphabet {
        UuidSlugAlphabet::Base64Url => encode_blocks::<3, 4, 6>(symbols, bytes, &mut out),
        UuidSlugAlphabet::Base32Hex => encode_blocks::<5, 8, 5>(symbols, bytes, &mut out),
    }
    // Only the fixed ASCII tables can contribute bytes; retain safe UTF-8 validation.
    String::from_utf8(out)
        .expect("UUID alphabets contain only ASCII")
        .into_boxed_str()
}

#[inline]
pub(super) fn encode_blocks<const BYTES: usize, const CHARS: usize, const BITS: usize>(
    symbols: &[u8],
    input: &[u8],
    output: &mut [u8],
) {
    // Aligned blocks reuse each input byte; a partial final block is zero-padded at the low end.
    for (input, output) in input.chunks(BYTES).zip(output.chunks_mut(CHARS)) {
        let mut word = 0u64;
        for (index, &byte) in input.iter().enumerate() {
            word |= u64::from(byte) << (8 * (BYTES - index - 1));
        }
        for (index, symbol) in output.iter_mut().enumerate() {
            *symbol =
                symbols[((word >> (BYTES * 8 - BITS * (index + 1))) & ((1 << BITS) - 1)) as usize];
        }
    }
}

pub(super) fn decode_identifier_bits(
    alphabet: UuidSlugAlphabet,
    input: &[u8],
    out: &mut [u8],
) -> Result<(), ()> {
    // The alphabet owner checks text length and supplies private 16/17-byte scratch storage.
    match alphabet {
        UuidSlugAlphabet::Base64Url => decode_base64(input, out),
        UuidSlugAlphabet::Base32Hex => decode_blocks::<8, 5>(&BASE32HEX_VALUES, input, out),
    }
}

fn decode_base64(input: &[u8], out: &mut [u8]) -> Result<(), ()> {
    if input.len() * 6 / 8 != out.len() {
        return Err(());
    }
    let (groups, tail) = input.as_chunks::<4>();
    // Valid digits use six bits; one combined high-bit check rejects any invalid table entry.
    for (input, output) in groups.iter().zip(out.chunks_exact_mut(3)) {
        let [a, b, c, d] = input.map(|byte| BASE64URL_VALUES[usize::from(byte)]);
        if (a | b | c | d) & 0xc0 != 0 {
            return Err(());
        }
        output[0] = (a << 2) | (b >> 4);
        output[1] = (b << 4) | (c >> 2);
        output[2] = (c << 6) | d;
    }
    let output = &mut out[groups.len() * 3..];
    // The partial group carries either one or two bytes; its remaining low bits must be zero.
    match tail {
        [] => Ok(()),
        [a, b] => {
            let (a, b) = (
                BASE64URL_VALUES[usize::from(*a)],
                BASE64URL_VALUES[usize::from(*b)],
            );
            if (a | b) & 0xc0 != 0 || b & 0xf != 0 {
                return Err(());
            }
            output[0] = (a << 2) | (b >> 4);
            Ok(())
        }
        [a, b, c] => {
            let (a, b, c) = (
                BASE64URL_VALUES[usize::from(*a)],
                BASE64URL_VALUES[usize::from(*b)],
                BASE64URL_VALUES[usize::from(*c)],
            );
            if (a | b | c) & 0xc0 != 0 || c & 3 != 0 {
                return Err(());
            }
            output[0] = (a << 2) | (b >> 4);
            output[1] = (b << 4) | (c >> 2);
            Ok(())
        }
        _ => Err(()),
    }
}

fn decode_blocks<const CHARS: usize, const BITS: usize>(
    values: &[u8; 256],
    input: &[u8],
    out: &mut [u8],
) -> Result<(), ()> {
    let mut written = 0;
    for input in input.chunks(CHARS) {
        let mut word = 0u64;
        for &byte in input {
            let value = values[usize::from(byte)];
            if value == u8::MAX {
                return Err(());
            }
            word = (word << BITS) | u64::from(value);
        }
        let count = input.len() * BITS / 8;
        let spare = input.len() * BITS % 8;
        // Nonzero spare bits would give one UUID several spellings.
        if word & ((1 << spare) - 1) != 0 {
            return Err(());
        }
        let output = out.get_mut(written..written + count).ok_or(())?;
        for (index, target) in output.iter_mut().enumerate() {
            *target = (word >> (input.len() * BITS - 8 * (index + 1))) as u8;
        }
        written += count;
    }
    // Callers commit private scratch only after the complete requested payload succeeds.
    if written != out.len() {
        Err(())
    } else {
        Ok(())
    }
}
