// Opt-in `uuid-simd` kernels for canonical UUID text. They replace only the hot success paths:
// parsing returns `None` on any rejection so the caller re-runs the selected scalar parser, which
// keeps the accepted grammar and the typed error identical by construction; the remaining risk is
// SIMD accepting text the scalar grammar rejects, which `simd_text_tests` falsifies. With `std`,
// `uuid-simd?/detect` picks AVX2/SSE4.1 at run time; without it x86 uses compile-time features.
// These SIMD bodies have no Kani proof (the prover does not model the intrinsics). Verification is
// randomized plus every-byte-at-every-position comparison: parsing against the proven scalar
// grammar, formatting against `core::fmt` hex output, which shares no code with either kernel.
use core::fmt;
use uuid_simd::{AsOut, AsciiCase};

const URN_PREFIX: &[u8; 9] = b"urn:uuid:";

pub(crate) fn parse(text: &[u8]) -> Option<[u8; 16]> {
    // Upstream's 32-digit kernel lost to the owned scalar parser in every paired run on Apple M4
    // (bench/decisions.md), so compact text goes straight to the scalar grammar.
    if text.len() == 32 {
        return None;
    }
    // Upstream matches the URN prefix case-sensitively; the package grammar does not.
    let body = match text.split_at_checked(URN_PREFIX.len()) {
        Some((prefix, rest)) if rest.len() == 36 && prefix.eq_ignore_ascii_case(URN_PREFIX) => rest,
        _ => text,
    };
    let mut out = [0u8; 16];
    uuid_simd::parse(body, out.as_out()).ok()?;
    Some(out)
}

#[allow(unsafe_code)]
pub(crate) fn write_hyphenated(
    bytes: &[u8; 16],
    f: &mut fmt::Formatter<'_>,
    upper: bool,
) -> fmt::Result {
    let case = if upper {
        AsciiCase::Upper
    } else {
        AsciiCase::Lower
    };
    let mut buffer = [0u8; 36];
    let text = uuid_simd::format_hyphenated(bytes, buffer.as_out(), case);
    // SAFETY: the returned slice is the 36 bytes format_hyphenated wrote, all ASCII hex digits or
    // '-' (upstream contract; simd_text_tests compares the text with `core::fmt` hex for random
    // payloads and every byte value in each position). Nothing modifies it during write_str.
    f.write_str(unsafe { core::str::from_utf8_unchecked(text) })
}
