//! Pack the fixed UUID wire layouts without constructing a general-purpose codec.
use crate::UuidSlugAlphabet;
use alloc::{boxed::Box, string::String};

// Keep format arithmetic shared with source-importing verification adapters, not public callers.
pub(crate) const fn bits_per_character(alphabet: UuidSlugAlphabet) -> usize {
    match alphabet {
        UuidSlugAlphabet::Base64Url => 6,
        UuidSlugAlphabet::Base32Hex => 5,
    }
}

// Symbol order defines issued identifiers; both directions derive from these fixed alphabets.
pub(super) const BASE64URL_SYMBOLS: &[u8] =
    b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
pub(super) const BASE32HEX_SYMBOLS: &[u8] = b"0123456789abcdefghijklmnopqrstuv";

const _: () = {
    assert!(BASE64URL_SYMBOLS.is_ascii() && BASE32HEX_SYMBOLS.is_ascii());
};

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
// Base32hex accepts both ASCII cases; aliases avoid copying and folding every input.
const BASE32HEX_VALUES: [u8; 256] = {
    let mut values = decoding_table(BASE32HEX_SYMBOLS);
    let mut index = 0;
    while index < BASE32HEX_SYMBOLS.len() {
        values[BASE32HEX_SYMBOLS[index].to_ascii_uppercase() as usize] = index as u8;
        index += 1;
    }
    values
};

// Expose a constant caller alphabet so ordinary linking can discard the other table without LTO.
#[inline]
pub(super) fn encode_identifier_bits(
    alphabet: UuidSlugAlphabet,
    bytes: &[u8],
    payload_bits: usize,
) -> Box<str> {
    // Callers select 128 UUID bits or 132 masked bits; zero padding must not become payload.
    let bits = bits_per_character(alphabet);
    let symbols: &[u8] = match alphabet {
        UuidSlugAlphabet::Base64Url => BASE64URL_SYMBOLS,
        UuidSlugAlphabet::Base32Hex => BASE32HEX_SYMBOLS,
    };
    let length = payload_bits.div_ceil(bits);
    let mut out = String::with_capacity(length);
    // Expose the checked ASCII range so String::push need not handle multibyte characters.
    let mut write = |symbol| out.push(char::from(symbol & 0x7f));
    match alphabet {
        UuidSlugAlphabet::Base64Url => {
            encode_blocks::<3, 4, 6, _>(symbols, bytes, length, &mut write)
        }
        UuidSlugAlphabet::Base32Hex => {
            encode_blocks::<5, 8, 5, _>(symbols, bytes, length, &mut write)
        }
    }
    // Safe ASCII writes avoid a UTF-8 validation pass; exact capacity avoids shrink reallocations.
    // Boxing drops String's capacity word from every stored slug and still permits
    // pointer-preserving transfer back to String.
    out.into_boxed_str()
}

#[inline]
pub(super) fn encode_blocks<
    const BYTES: usize,
    const CHARS: usize,
    const BITS: usize,
    Write: FnMut(u8),
>(
    symbols: &[u8],
    input: &[u8],
    output_length: usize,
    mut write: Write,
) {
    // Aligned blocks reuse each input byte; a partial final block is zero-padded at the low end.
    for (input, offset) in input.chunks(BYTES).zip((0..output_length).step_by(CHARS)) {
        let mut word = 0u64;
        for (index, &byte) in input.iter().enumerate() {
            word |= u64::from(byte) << (8 * (BYTES - index - 1));
        }
        for index in 0..CHARS.min(output_length - offset) {
            write(
                symbols[((word >> (BYTES * 8 - BITS * (index + 1))) & ((1 << BITS) - 1)) as usize],
            );
        }
    }
}

// Keep the selected decoder visible so a consumer need not retain the other alphabet's table.
#[inline]
pub(super) fn decode_identifier_bits(
    alphabet: UuidSlugAlphabet,
    input: &[u8],
    out: &mut [u8],
) -> Result<(), ()> {
    // Decode into private scratch; owners commit caller storage only after all input succeeds.
    match alphabet {
        UuidSlugAlphabet::Base64Url => decode_base64(input, out),
        UuidSlugAlphabet::Base32Hex => decode_blocks::<8, 5>(&BASE32HEX_VALUES, input, out),
    }
}

// Preserve the alphabet adapter's distinct invalid-character and padding diagnostics.
#[derive(Debug)]
pub(super) enum MaskedDecodeError {
    InvalidCharacter,
    NonzeroPadding,
}

pub(super) fn decode_masked_base64(input: &[u8; 22]) -> Result<([u8; 16], u8), MaskedDecodeError> {
    let mut bytes = [0; 16];
    decode_identifier_bits(UuidSlugAlphabet::Base64Url, &input[..20], &mut bytes[..15])
        .map_err(|()| MaskedDecodeError::InvalidCharacter)?;
    let (a, b) = (
        BASE64URL_VALUES[usize::from(input[20])],
        BASE64URL_VALUES[usize::from(input[21])],
    );
    if (a | b) & 0xc0 != 0 {
        return Err(MaskedDecodeError::InvalidCharacter);
    }
    // All 132 bits are payload: the final four bits are the check tail, not padding.
    bytes[15] = (a << 2) | (b >> 4);
    Ok((bytes, b & 15))
}

pub(super) fn decode_masked_base32(input: &[u8; 27]) -> Result<([u8; 16], u8), MaskedDecodeError> {
    let mut bytes = [0; 16];
    decode_identifier_bits(UuidSlugAlphabet::Base32Hex, &input[..24], &mut bytes[..15])
        .map_err(|()| MaskedDecodeError::InvalidCharacter)?;
    let (a, b, c) = (
        BASE32HEX_VALUES[usize::from(input[24])],
        BASE32HEX_VALUES[usize::from(input[25])],
        BASE32HEX_VALUES[usize::from(input[26])],
    );
    if (a | b | c) & 0xe0 != 0 {
        return Err(MaskedDecodeError::InvalidCharacter);
    }
    if c & 7 != 0 {
        return Err(MaskedDecodeError::NonzeroPadding);
    }
    // Fifteen final bits carry eight UUID bits, four check bits and three zero padding bits.
    bytes[15] = (a << 3) | (b >> 2);
    Ok((bytes, ((b & 3) << 2) | (c >> 3)))
}

fn decode_base64(input: &[u8], out: &mut [u8]) -> Result<(), ()> {
    if input.len() * 6 / 8 != out.len() {
        return Err(());
    }
    let (groups, tail) = input.as_chunks::<4>();
    let (output_groups, output_tail) = out.as_chunks_mut::<3>();
    // Valid digits use six bits; one combined high-bit check rejects any invalid table entry.
    for (input, output) in groups.iter().zip(output_groups) {
        let [a, b, c, d] = input.map(|byte| BASE64URL_VALUES[usize::from(byte)]);
        if (a | b | c | d) & 0xc0 != 0 {
            return Err(());
        }
        output[0] = (a << 2) | (b >> 4);
        output[1] = (b << 4) | (c >> 2);
        output[2] = (c << 6) | d;
    }
    let output = output_tail;
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
