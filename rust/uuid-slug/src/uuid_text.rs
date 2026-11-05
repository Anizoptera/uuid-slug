// UUID text kernels adapted from uuid 1.29.0, MIT license (../LICENSE-UUID-MIT).
// https://github.com/uuid-rs/uuid/blob/4643e607/src/parser.rs
// https://github.com/uuid-rs/uuid/blob/4643e607/src/fmt.rs
// Keep only generic parsing and hyphenated output: generation, UUID objects,
// detailed upstream errors and caller-buffer adapters are not needed here.
// Review upstream changes against these kernels before updating the source revision.
use core::fmt;

pub(crate) fn parse_uuid_text(text: &[u8]) -> Option<[u8; 16]> {
    match (text.len(), text) {
        (32, s) => parse_simple(s),
        (36, s) | (38, [b'{', s @ .., b'}']) => parse_hyphenated(s),
        (45, s) if s[..9].eq_ignore_ascii_case(b"urn:uuid:") => parse_hyphenated(&s[9..]),
        _ => None,
    }
}

#[inline]
fn parse_simple(s: &[u8]) -> Option<[u8; 16]> {
    // This check makes the decoder's complete input statically bounded.
    if s.len() != 32 {
        return None;
    }
    let mut hex = [0u8; 32];
    let mut i = 0;
    while i < 32 {
        hex[i] = s[i];
        i += 1;
    }
    decode_hex32(&hex)
}

#[inline]
fn parse_hyphenated(s: &[u8]) -> Option<[u8; 16]> {
    // Check the full shape before indexing; the decoder rejects every non-hex byte.
    if s.len() != 36 || [s[8], s[13], s[18], s[23]] != [b'-'; 4] {
        return None;
    }
    // Gather once so nibble validation can vectorize without hyphen branches per byte.
    let mut hex = [0u8; 32];
    let mut i = 0;
    while i < 8 {
        hex[i] = s[i];
        i += 1;
    }
    while i < 12 {
        hex[i] = s[i + 1];
        i += 1;
    }
    while i < 16 {
        hex[i] = s[i + 2];
        i += 1;
    }
    while i < 20 {
        hex[i] = s[i + 3];
        i += 1;
    }
    while i < 32 {
        hex[i] = s[i + 4];
        i += 1;
    }
    decode_hex32(&hex)
}

#[inline]
const fn decode_hex32(hex: &[u8; 32]) -> Option<[u8; 16]> {
    let mut nibbles = [0u8; 32];
    let mut bad = 0u8;
    let mut i = 0;
    while i < 32 {
        let c = hex[i];
        let digit = c.wrapping_sub(b'0');
        let alpha = (c | 0x20).wrapping_sub(b'a');
        let is_digit = digit < 10;
        let is_alpha = alpha < 6;
        nibbles[i] = if is_digit {
            digit
        } else {
            alpha.wrapping_add(10)
        };
        bad |= if is_digit | is_alpha { 0 } else { 1 };
        i += 1;
    }
    if bad != 0 {
        return None;
    }
    let mut buf = [0u8; 16];
    let mut j = 0;
    while j < 16 {
        buf[j] = (nibbles[j * 2] << 4) | nibbles[j * 2 + 1];
        j += 1;
    }
    Some(buf)
}

pub(crate) struct Hyphenated(pub(crate) [u8; 16]);

impl fmt::LowerHex for Hyphenated {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write_hyphenated(&self.0, f, false)
    }
}

impl fmt::UpperHex for Hyphenated {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write_hyphenated(&self.0, f, true)
    }
}

#[inline]
#[allow(unsafe_code)]
fn write_hyphenated(bytes: &[u8; 16], f: &mut fmt::Formatter<'_>, upper: bool) -> fmt::Result {
    let text = format_hyphenated(bytes, upper);
    // SAFETY: format_simple maps both nibbles of every byte to ASCII hex;
    // format_hyphenated initializes all 36 output bytes from those digits or '-'.
    // The local array stays alive and unmodified throughout write_str. No caller
    // bytes are interpreted as UTF-8, and no unchecked buffer access is needed.
    f.write_str(unsafe { core::str::from_utf8_unchecked(&text) })
}

// Upstream's arithmetic avoids a retained lookup table; each input is one masked nibble.
#[inline]
const fn nibble_to_hex(nibble: u8, alpha_offset: u8) -> u8 {
    nibble + b'0' + if nibble > 9 { alpha_offset } else { 0 }
}

#[inline]
const fn format_simple(src: &[u8; 16], upper: bool) -> [u8; 32] {
    let alpha_offset = if upper { 0x07 } else { 0x27 };
    let mut dst = [0; 32];
    let mut i = 0;
    while i < 16 {
        let x = src[i];
        dst[i * 2] = nibble_to_hex(x >> 4, alpha_offset);
        dst[i * 2 + 1] = nibble_to_hex(x & 0x0f, alpha_offset);
        i += 1;
    }
    dst
}

#[inline]
const fn format_hyphenated(src: &[u8; 16], upper: bool) -> [u8; 36] {
    let simple = format_simple(src, upper);
    let mut dst = [0; 36];
    let mut i = 0;
    while i < 8 {
        dst[i] = simple[i];
        i += 1;
    }
    dst[8] = b'-';
    while i < 12 {
        dst[i + 1] = simple[i];
        i += 1;
    }
    dst[13] = b'-';
    while i < 16 {
        dst[i + 2] = simple[i];
        i += 1;
    }
    dst[18] = b'-';
    while i < 20 {
        dst[i + 3] = simple[i];
        i += 1;
    }
    dst[23] = b'-';
    while i < 32 {
        dst[i + 4] = simple[i];
        i += 1;
    }
    dst
}
