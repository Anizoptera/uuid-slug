//! Compare the production parser with the UUID text grammar, independently of its lookup tables.
use uuid_slug::{ErrorCode, Uuid};

fn hex(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}

// Grammar positions express RFC text, not the production parser's implementation or tables.
fn reference<const N: usize>(text: &[u8; N]) -> Option<[u8; 16]> {
    let start = match N {
        32 | 36 => 0,
        38 if text[0] == b'{' && text[37] == b'}' => 1,
        45 if text[..9].eq_ignore_ascii_case(b"urn:uuid:") => 9,
        _ => return None,
    };
    let hyphens = N != 32;
    if hyphens && [8, 13, 18, 23].iter().any(|&i| text[start + i] != b'-') {
        return None;
    }
    let mut bytes = [0; 16];
    for (index, byte) in bytes.iter_mut().enumerate() {
        let separators = if hyphens {
            usize::from(index >= 4)
                + usize::from(index >= 6)
                + usize::from(index >= 8)
                + usize::from(index >= 10)
        } else {
            0
        };
        let position = start + index * 2 + separators;
        *byte = hex(text[position])? * 16 + hex(text[position + 1])?;
    }
    Some(bytes)
}

// Quantify over every valid UTF-8 string of this byte length, including non-ASCII rejection.
// Invalid UTF-8 is not an admissible &str and is excluded by the actual standard-library check.
fn verify<const N: usize>() {
    let bytes: [u8; N] = kani::any();
    if let Ok(text) = core::str::from_utf8(&bytes) {
        let parsed = Uuid::from_uuid_string(text);
        let expected = reference(&bytes);
        assert_eq!(
            parsed.is_ok(),
            expected.is_some(),
            "UUID parser accepts exactly its text grammar"
        );
        match expected {
            Some(expected) => assert_eq!(
                *parsed.unwrap().as_uuid_bytes(),
                expected,
                "UUID parser preserves every hexadecimal payload bit"
            ),
            None => assert_eq!(
                parsed.unwrap_err().code(),
                ErrorCode::InvalidUuid,
                "UUID parser rejects malformed text with its typed error"
            ),
        }
    }
}

#[kani::proof]
#[kani::unwind(65)]
fn compact_uuid() {
    verify::<32>();
}

#[kani::proof]
#[kani::unwind(65)]
fn canonical_uuid() {
    verify::<36>();
}

#[kani::proof]
#[kani::unwind(65)]
fn wrapped_uuid() {
    verify::<38>();
}

#[kani::proof]
#[kani::unwind(65)]
fn urn_uuid() {
    verify::<45>();
}
