//! Feed shared TypeScript tests into the actual private Rust primitives.
use serde_json::{Value, json};
use uuid_slug::{Error, ErrorCode, UuidSlugAlphabet};

// Import the production body instead of publishing test hooks or copying its algorithm.
#[path = "../../uuid-slug/src/bit_encoding.rs"]
mod bit_encoding;

#[path = "../../uuid-slug/src/siphash.rs"]
pub(crate) mod siphash;

#[path = "../../uuid-slug/src/feistel.rs"]
mod feistel;

#[path = "../../uuid-slug/src/mask_keys.rs"]
mod mask_keys;

pub(super) fn mask_transform(request: &Value) -> Result<Value, Error> {
    let invalid = || Error::new(ErrorCode::InvalidMask);
    let seed: Vec<u8> =
        serde_json::from_value(request["mask"]["bytes"].clone()).map_err(|_| invalid())?;
    let iterations = request["mask"]["iterations"]
        .as_u64()
        .and_then(|v| u32::try_from(v).ok())
        .ok_or_else(invalid)?;
    let keys = mask_keys::derive(&seed, iterations);
    mix(&json!({"bytes":request["bytes"],"keys":keys,"direction":request["direction"]}))
}

pub(super) fn mix(request: &Value) -> Result<Value, Error> {
    let invalid = || Error::new(ErrorCode::InvalidMask);
    let bytes: [u8; 16] =
        serde_json::from_value(request["bytes"].clone()).map_err(|_| invalid())?;
    let keys: [u32; 8] = serde_json::from_value(request["keys"].clone()).map_err(|_| invalid())?;
    let direction = match request["direction"].as_str() {
        Some("mask") => feistel::Direction::UuidV7Mask,
        Some("unmask") => feistel::Direction::Unmask,
        _ => return Err(invalid()),
    };
    Ok(json!(feistel::feistel(bytes, &keys, direction)))
}

pub(super) fn hash(request: &Value) -> Result<Value, Error> {
    let key: [u32; 2] = serde_json::from_value(request["key"].clone())
        .map_err(|_| Error::new(ErrorCode::InvalidMask))?;
    let bytes: Vec<u8> = serde_json::from_value(request["bytes"].clone())
        .map_err(|_| Error::new(ErrorCode::InvalidMask))?;
    if !request["blockLimit"].is_null() || !request["continuation"].is_null() {
        return continue_hash(request, key, &bytes);
    }
    // Both production entry points must match the published oracle, including partial final words.
    let result = if bytes.len().is_multiple_of(4) {
        let words: Vec<u32> = bytes
            .as_chunks::<4>()
            .0
            .iter()
            .map(|chunk| u32::from_le_bytes(*chunk))
            .collect();
        siphash::hash_words(key, &words)
    } else {
        siphash::hash_bytes(key, &bytes)
    };
    Ok(json!(result))
}

fn continue_hash(request: &Value, key: [u32; 2], bytes: &[u8]) -> Result<Value, Error> {
    let invalid = || Error::new(ErrorCode::InvalidOptions);
    let words = bytes.as_chunks::<4>().0;
    let (mut state, start) = if request["continuation"].is_null() {
        (siphash::HashState::new(key), 0)
    } else {
        let continuation = &request["continuation"];
        let state = serde_json::from_value(continuation["state"].clone()).map_err(|_| invalid())?;
        let start = continuation["block"]
            .as_u64()
            .and_then(|n| usize::try_from(n).ok())
            .ok_or_else(invalid)?;
        (siphash::HashState(state), start)
    };
    if start > words.len() {
        return Err(invalid());
    }
    let limit = if request["blockLimit"].is_null() {
        usize::MAX
    } else {
        request["blockLimit"]
            .as_u64()
            .and_then(|n| usize::try_from(n).ok())
            .ok_or_else(invalid)?
    };
    if limit == 0 {
        return Err(invalid());
    }
    // Subtract first: admission proves the resumed range fits before any index addition.
    let pending = limit <= words.len() - start;
    let end = if pending { start + limit } else { words.len() };
    for word in &words[start..end] {
        state.absorb(u32::from_le_bytes(*word));
    }
    if pending {
        return Ok(json!({ "state": state.0, "block": end }));
    }
    Ok(json!(state.finish(
        siphash::tail_word(&bytes[words.len() * 4..]),
        bytes.len()
    )))
}

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
    let expected = (128 + tail_bits).div_ceil(bit_encoding::bits_per_character(alphabet));
    if input.len() != expected {
        return Err(failure(alphabet));
    }
    let (decoded, tail) = if tail_bits == 0 {
        let mut decoded = [0; 16];
        bit_encoding::decode_identifier_bits(alphabet, input.as_bytes(), &mut decoded)
            .map_err(|()| failure(alphabet))?;
        (decoded, 0)
    } else {
        // Keep the real wire length and tail so shared cases reach production rejection guards.
        match alphabet {
            UuidSlugAlphabet::Base64Url => bit_encoding::decode_masked_base64(
                input.as_bytes().try_into().map_err(|_| failure(alphabet))?,
            ),
            UuidSlugAlphabet::Base32Hex => bit_encoding::decode_masked_base32(
                input.as_bytes().try_into().map_err(|_| failure(alphabet))?,
            ),
        }
        .map_err(|_| failure(alphabet))?
    };
    Ok(json!({ "bytes": decoded, "tail": tail }))
}
