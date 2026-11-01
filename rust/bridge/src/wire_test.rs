//! Feed shared TypeScript wire tests into the actual private Rust bit codec.
use serde_json::{Value, json};
use uuid_slug::{Error, ErrorCode, UuidSlugAlphabet};

// Import the production body instead of publishing test hooks or copying its algorithm.
#[path = "../../uuid-slug/src/bit_encoding.rs"]
mod bit_encoding;

fn failure(alphabet: UuidSlugAlphabet) -> Error {
    Error::new(match alphabet {
        UuidSlugAlphabet::Base64Url => ErrorCode::InvalidBase64Url,
        UuidSlugAlphabet::Base32Hex => ErrorCode::InvalidBase32Hex,
    })
}

fn tail_bits(request: &Value) -> Result<usize, Error> {
    match request.get("tailBits") {
        None | Some(Value::Null) => Ok(0),
        Some(value) if value == 0 => Ok(0),
        Some(value) if value == 4 => Ok(4),
        _ => Err(Error::new(ErrorCode::InvalidOptions)),
    }
}

pub(super) fn encode(request: &Value, alphabet: UuidSlugAlphabet) -> Result<Value, Error> {
    let bytes: [u8; 16] = serde_json::from_value(request["bytes"].clone())
        .map_err(|_| Error::new(ErrorCode::InvalidBuffer))?;
    let tail_bits = tail_bits(request)?;
    let tail = request["tail"].as_u64().unwrap_or(0);
    if tail > 15 || (tail_bits == 0 && tail != 0) {
        return Err(failure(alphabet));
    }
    let mut payload = [0; 17];
    payload[..16].copy_from_slice(&bytes);
    payload[16] = (tail as u8) << 4;
    Ok(json!(bit_encoding::encode_identifier_bits(
        alphabet,
        &payload[..if tail_bits == 0 { 16 } else { 17 }],
        128 + tail_bits,
    )))
}

pub(super) fn decode(request: &Value, alphabet: UuidSlugAlphabet) -> Result<Value, Error> {
    let input = request["input"].as_str().ok_or_else(|| failure(alphabet))?;
    let tail_bits = tail_bits(request)?;
    let expected = (128 + tail_bits).div_ceil(alphabet.bits_per_character());
    if input.len() != expected {
        return Err(failure(alphabet));
    }
    let mut text = input.as_bytes().to_vec();
    if alphabet == UuidSlugAlphabet::Base32Hex {
        text.make_ascii_lowercase();
    }
    if tail_bits != 0 {
        // The production alphabet restores the omitted zero digit before reading 17 bytes.
        text.push(if alphabet == UuidSlugAlphabet::Base64Url {
            b'A'
        } else {
            b'0'
        });
    }
    let mut decoded = [0; 17];
    let length = if tail_bits == 0 { 16 } else { 17 };
    bit_encoding::decode_identifier_bits(alphabet, &text, &mut decoded[..length])
        .map_err(|()| failure(alphabet))?;
    if decoded[16] & 15 != 0 {
        return Err(failure(alphabet));
    }
    Ok(json!({ "bytes": &decoded[..16], "tail": decoded[16] >> 4 }))
}
