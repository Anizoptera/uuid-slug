// The SIMD kernels have no proof, so they must agree with independent oracles. Parsing: SIMD may
// decline (the scalar grammar then decides), but any text SIMD accepts must parse to the same bytes
// under the proven scalar grammar. Formatting: text identical to `core::fmt` hex for every input.
use crate::simd_text;
use alloc::{string::String, vec::Vec};
use core::fmt::Write;

fn scalar_parse(text: &[u8]) -> Option<[u8; 16]> {
    #[cfg(feature = "uuid-interop")]
    return uuid::Uuid::try_parse_ascii(text)
        .ok()
        .map(|id| *id.as_bytes());
    #[cfg(not(feature = "uuid-interop"))]
    crate::uuid_text::parse_uuid_text(text)
}

fn scalar_hyphenated(bytes: &[u8; 16], upper: bool) -> String {
    // Display is SIMD here, so build the oracle from `core::fmt` per byte.
    let mut text = String::new();
    for (i, byte) in bytes.iter().enumerate() {
        if matches!(i, 4 | 6 | 8 | 10) {
            text.push('-');
        }
        if upper {
            write!(text, "{byte:02X}")
        } else {
            write!(text, "{byte:02x}")
        }
        .unwrap();
    }
    text
}

fn simd_hyphenated(bytes: &[u8; 16], upper: bool) -> String {
    let id = crate::Uuid::from(*bytes);
    if upper {
        alloc::format!("{id:X}")
    } else {
        alloc::format!("{id:x}")
    }
}

/// Deterministic xorshift payloads: reproducible failures without a dev-dependency.
fn payloads() -> impl Iterator<Item = [u8; 16]> {
    let mut state = 0x9e37_79b9_7f4a_7c15_u64;
    let edges = [[0u8; 16], [u8::MAX; 16], [0x0f; 16], [0xf0; 16], [0xa5; 16]];
    edges
        .into_iter()
        .chain(core::iter::repeat_with(move || {
            let mut out = [0u8; 16];
            for chunk in out.chunks_mut(8) {
                state ^= state << 13;
                state ^= state >> 7;
                state ^= state << 17;
                chunk.copy_from_slice(&state.to_le_bytes()[..chunk.len()]);
            }
            out
        }))
        .take(2_000)
}

/// Every accepted spelling, with mixed case where the grammar allows it.
fn spellings(bytes: &[u8; 16]) -> Vec<Vec<u8>> {
    let hyphenated = scalar_hyphenated(bytes, false);
    let mixed: String = hyphenated
        .chars()
        .enumerate()
        .map(|(i, c)| {
            if i % 2 == 0 {
                c.to_ascii_uppercase()
            } else {
                c
            }
        })
        .collect();
    let simple: String = mixed.chars().filter(|c| *c != '-').collect();
    [
        simple,
        mixed.clone(),
        alloc::format!("{{{mixed}}}"),
        alloc::format!("urn:uuid:{mixed}"),
        alloc::format!("URN:Uuid:{mixed}"),
    ]
    .into_iter()
    .map(String::into_bytes)
    .collect()
}

#[test]
fn simd_parses_every_accepted_spelling_to_the_scalar_bytes() {
    for bytes in payloads() {
        for text in spellings(&bytes) {
            assert_eq!(scalar_parse(&text), Some(bytes), "scalar oracle {text:?}");
            // Compact text is routed to the faster scalar parser; every other spelling must take
            // the SIMD path, or the feature silently stops doing anything.
            let expected = (text.len() != 32).then_some(bytes);
            assert_eq!(simd_text::parse(&text), expected, "simd {text:?}");
        }
    }
}

#[test]
fn simd_never_accepts_what_the_scalar_grammar_rejects() {
    // Every byte value at every position of every spelling, plus every length up to the longest.
    for text in spellings(&[0x5a; 16]) {
        for position in 0..text.len() {
            for byte in 0..=u8::MAX {
                let mut probe = text.clone();
                probe[position] = byte;
                if let Some(simd) = simd_text::parse(&probe) {
                    assert_eq!(scalar_parse(&probe), Some(simd), "{probe:?}");
                }
            }
        }
    }
    for len in 0..=48 {
        let probe = alloc::vec![b'a'; len];
        if let Some(simd) = simd_text::parse(&probe) {
            assert_eq!(scalar_parse(&probe), Some(simd), "length {len}");
        }
    }
}

#[test]
fn simd_formats_identically_to_the_scalar_oracle() {
    let single_bytes = (0..16).flat_map(|position| {
        (0..=u8::MAX).map(move |byte| {
            let mut bytes = [0u8; 16];
            bytes[position] = byte;
            bytes
        })
    });
    for bytes in payloads().chain(single_bytes) {
        for upper in [false, true] {
            assert_eq!(
                simd_hyphenated(&bytes, upper),
                scalar_hyphenated(&bytes, upper)
            );
        }
    }
}
