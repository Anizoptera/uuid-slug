// Exercise the public boundary in both feature selections; neither backend is its own oracle.
use crate::{Error, ErrorCode, Uuid};
use alloc::{borrow::ToOwned, format, string::String, string::ToString};
use core::fmt::{self, Write};

fn reference(input: &str) -> Option<[u8; 16]> {
    let body = match input.len() {
        32 | 36 => input,
        38 => input.strip_prefix('{')?.strip_suffix('}')?,
        45 if input.get(..9)?.eq_ignore_ascii_case("urn:uuid:") => &input[9..],
        _ => return None,
    };
    let mut compact = String::new();
    for (index, ch) in body.char_indices() {
        if body.len() == 36 && [8, 13, 18, 23].contains(&index) {
            if ch != '-' {
                return None;
            }
        } else if ch.is_ascii_hexdigit() {
            compact.push(ch);
        } else {
            return None;
        }
    }
    if compact.len() != 32 {
        return None;
    }
    let mut bytes = [0; 16];
    for (index, byte) in bytes.iter_mut().enumerate() {
        *byte = u8::from_str_radix(&compact[index * 2..index * 2 + 2], 16).ok()?;
    }
    Some(bytes)
}

fn check(text: &str) {
    let expected = reference(text);
    let actual = Uuid::from_uuid_string(text);
    assert_eq!(
        actual.as_ref().ok().map(Uuid::as_uuid_bytes).copied(),
        expected,
        "{text:?}"
    );
    if expected.is_none() {
        assert_eq!(actual.unwrap_err().code(), ErrorCode::InvalidUuid);
    }
}

#[test]
fn uuid_text_rejects_corruption_without_changing_the_accepted_grammar() {
    // Changing each position catches shape errors independently of hex decoding;
    // multibyte substitutions keep UTF-8 valid while invalidating UUID ASCII.
    for form in [
        "01234567-89ab-cdef-0123-456789abcdef",
        "0123456789ABCDEF0123456789ABCDEF",
        "{01234567-89Ab-cDeF-0123-456789abcdef}",
        "UrN:UuId:01234567-89ab-cdef-0123-456789abcdef",
    ] {
        check(form);
        for index in 0..form.len() {
            for value in 0..=127u8 {
                let mut text = form.as_bytes().to_vec();
                text[index] = value;
                check(core::str::from_utf8(&text).unwrap());
            }
            for ch in ['é', '中', '😀'] {
                let mut text = form.to_owned();
                text.replace_range(index..index + 1, &ch.to_string());
                check(&text);
            }
        }
    }
    for length in 0..80 {
        check(&"0".repeat(length));
    }
    for text in [
        "{0123456789abcdef0123456789abcdef}",
        "urn:uuid:0123456789abcdef0123456789abcdef",
        "{urn:uuid:01234567-89ab-cdef-0123-456789abcdef}",
        "+123456789abcdef0123456789abcdef",
    ] {
        check(text);
    }
}

#[test]
fn uuid_text_preserves_every_bit_and_propagates_writer_failures() -> Result<(), Error> {
    struct Refuse;
    impl Write for Refuse {
        fn write_str(&mut self, _: &str) -> fmt::Result {
            Err(fmt::Error)
        }
    }
    // One-hot and inverted inputs exercise every version/variant bit too;
    // standard integer formatting provides an independent spelling oracle.
    for bit in 0..128 {
        for background in [0, u8::MAX] {
            let mut bytes = [background; 16];
            bytes[bit / 8] ^= 1 << (bit % 8);
            let id = Uuid::from_uuid_bytes_array(bytes);
            let compact: String = bytes.iter().map(|byte| format!("{byte:02x}")).collect();
            let expected = format!(
                "{}-{}-{}-{}-{}",
                &compact[..8],
                &compact[8..12],
                &compact[12..16],
                &compact[16..20],
                &compact[20..]
            );
            assert_eq!(id.to_string(), expected);
            assert_eq!(format!("{id:X}"), expected.to_ascii_uppercase());
            assert_eq!(format!("{id:>50.4x}"), expected);
            assert_eq!(*Uuid::from_uuid_string(&expected)?.as_uuid_bytes(), bytes);
            assert!(write!(&mut Refuse, "{id}").is_err());
            assert!(write!(&mut Refuse, "{id:X}").is_err());
        }
    }
    Ok(())
}
