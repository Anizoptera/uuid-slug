//! Store a fixed 16-bit check beside UUIDv7 content without losing timestamp or random bits.
use crate::{Error, ErrorCode, alphabet::Alphabet, mask::Mask, uuid::utf16_len};

fn mix32(mut value: u32) -> u32 {
    value ^= value >> 16;
    value = value.wrapping_mul(0x7feb_352d);
    value ^= value >> 15;
    value = value.wrapping_mul(0x846c_a68b);
    value ^ (value >> 16)
}

fn tag(bytes: &[u8; 16]) -> u16 {
    let mut acc = 0;
    for chunk in bytes.as_chunks::<4>().0 {
        acc = mix32(acc ^ u32::from_be_bytes(*chunk));
    }
    (acc >> 16) as u16
}

/// Mix once before formatting or checking reserved output spellings in either alphabet.
pub(crate) fn mask_bytes(raw: &[u8; 16], mask: &Mask) -> Result<([u8; 16], u8), Error> {
    if raw[6] >> 4 != 7 || raw[8] >> 6 != 2 {
        return Err(Error::new(ErrorCode::InvalidUuidVersion));
    }
    if raw[0] > 3 {
        return Err(Error::new(ErrorCode::InvalidTimestamp));
    }
    let check = tag(raw);
    let inner = check >> 4;
    let mut tagged = *raw;
    tagged[6] = ((inner as u8 & 15) << 4) | (raw[6] & 15);
    tagged[8] = ((inner as u8 & 48) << 2) | (raw[8] & 63);
    tagged[0] = (((inner >> 6) as u8 & 63) << 2) | (raw[0] & 3);
    Ok((mask.mask(tagged)?, (check & 15) as u8))
}

/// Parse text once before trying keys; canonical padding is checked in either alphabet.
pub(crate) fn normalize(slug: &str) -> Result<([u8; 16], u8), Error> {
    let alphabet = if utf16_len(slug) == 27 {
        Alphabet::Base32Hex
    } else {
        Alphabet::Base64Url
    };
    let mut mixed = [0; 16];
    let outer = alphabet.decode_into(slug, &mut mixed, 4)?;
    Ok((mixed, outer))
}

/// A passing check yields a candidate, never proof of issuance; wrong keys return `None`.
/// Owned block copies prevent one custom callback from changing another key's ciphertext.
pub(crate) fn candidate(
    mixed: [u8; 16],
    outer: u8,
    mask: &Mask,
) -> Result<Option<[u8; 16]>, Error> {
    let mut raw = mask.unmask(mixed)?;
    let inner = (raw[6] >> 4) as u16 | ((raw[8] >> 6) as u16) << 4 | ((raw[0] >> 2) as u16) << 6;
    raw[6] = (raw[6] & 15) | 0x70;
    raw[8] = (raw[8] & 63) | 0x80;
    raw[0] &= 3;
    Ok((tag(&raw) == (inner << 4) | outer as u16).then_some(raw))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mask::create_mask;
    #[test]
    fn retained_wire_vectors_and_safe_spelling_preserve_all_check_bits() {
        let fixture: serde_json::Value =
            serde_json::from_str(include_str!("../tests/fixtures/fixtures-wire-format.json"))
                .unwrap();
        let custom = Mask::custom(
            "custom-mix",
            |input| {
                let mut out = [0; 16];
                for (index, byte) in out.iter_mut().enumerate() {
                    let target = (index * 5 + 3) % 16;
                    *byte = input[target] ^ (index * 17) as u8;
                }
                Ok(out)
            },
            |input| {
                let mut out = [0; 16];
                for (index, byte) in input.into_iter().enumerate() {
                    let target = (index * 5 + 3) % 16;
                    out[target] = byte ^ (index * 17) as u8;
                }
                Ok(out)
            },
        )
        .unwrap();
        let seeded = create_mask(b"golden-vector-seed-v3", 1, "seeded-v2").unwrap();
        let default = crate::public_mask();
        for case in fixture.as_array().unwrap() {
            // Codec-level sentinel bypass is deliberately not exercised by this block-level test.
            if case["uuid"] == "00000000-0000-7000-8000-000000000000" {
                continue;
            }
            let mask = match case["schema"].as_str().unwrap() {
                "default" => &default,
                "custom-mix" => &custom,
                _ => &seeded,
            };
            let mut raw = [0; 16];
            Alphabet::Base64Url
                .decode_into(case["direct"].as_str().unwrap(), &mut raw, 0)
                .unwrap();
            let (mixed, tail) = mask_bytes(&raw, mask).unwrap();
            assert_eq!(
                Alphabet::Base64Url.encode_tail(&mixed, tail, 4).unwrap(),
                case["masked"].as_str().unwrap()
            );
            let safe = Alphabet::Base32Hex.encode_tail(&mixed, tail, 4).unwrap();
            assert_eq!(safe.len(), 27);
            let (parsed, tag) = normalize(&safe).unwrap();
            assert_eq!(candidate(parsed, tag, mask).unwrap(), Some(raw));
            for different in 0..16 {
                if different != tail {
                    assert!(candidate(parsed, different, mask).unwrap().is_none());
                }
            }
        }
    }
}
