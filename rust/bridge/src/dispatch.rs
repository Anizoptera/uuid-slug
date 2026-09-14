//! Run the same contract requests through each development transport.

use serde_json::{Value, json};
use uuid_slug::{
    Alphabet, Codec, CodecOptions, Error, ErrorCode, Mask, MigrationFormat, MigrationOptions, Uuid,
    UuidV7TimestampWindow, create_mask, public_mask,
};

fn text<'a>(value: &'a Value, key: &str) -> Result<&'a str, Error> {
    value[key]
        .as_str()
        .ok_or_else(|| Error::new(ErrorCode::InvalidUuid))
}

fn alphabet(value: &Value) -> Result<Alphabet, Error> {
    match value.as_str().unwrap_or("base64url") {
        "base64url" => Ok(Alphabet::Base64Url),
        "base32hex" => Ok(Alphabet::Base32Hex),
        _ => Err(Error::new(ErrorCode::InvalidUuidSlug)),
    }
}

fn number(value: &Value) -> f64 {
    match value.as_str() {
        Some("NaN") => f64::NAN,
        Some("Infinity") => f64::INFINITY,
        Some("-Infinity") => f64::NEG_INFINITY,
        _ => value.as_f64().unwrap_or(f64::NAN),
    }
}

fn custom_mix_forward(input: [u8; 16]) -> Result<[u8; 16], Error> {
    let mut output = [0; 16];
    for (index, byte) in output.iter_mut().enumerate() {
        let target = (index * 5 + 3) % 16;
        *byte = input[target] ^ (index * 17) as u8;
    }
    Ok(output)
}

fn custom_mix_reverse(input: [u8; 16]) -> Result<[u8; 16], Error> {
    let mut output = [0; 16];
    for (index, byte) in input.into_iter().enumerate() {
        let target = (index * 5 + 3) % 16;
        output[target] = byte ^ (index * 17) as u8;
    }
    Ok(output)
}

fn mask(value: &Value) -> Result<Mask, Error> {
    if value.is_null() {
        return Ok(public_mask());
    }
    if value == "custom-mix" {
        return Mask::custom("custom-mix", custom_mix_forward, custom_mix_reverse);
    }
    let bytes = if let Some(units) = value["utf16"].as_array() {
        // JSON strings cannot preserve lone UTF-16 surrogates in serde_json; explicit units do.
        let units: Result<Vec<u16>, Error> = units
            .iter()
            .map(|v| {
                v.as_u64()
                    .and_then(|n| u16::try_from(n).ok())
                    .ok_or_else(|| Error::new(ErrorCode::InvalidMask))
            })
            .collect();
        String::from_utf16_lossy(&units?).into_bytes()
    } else if let Some(bytes) = value["bytes"].as_array() {
        bytes
            .iter()
            .map(|v| {
                v.as_u64()
                    .and_then(|n| u8::try_from(n).ok())
                    .ok_or_else(|| Error::new(ErrorCode::InvalidMask))
            })
            .collect::<Result<Vec<_>, _>>()?
    } else {
        text(value, "seed")?.as_bytes().to_vec()
    };
    let iterations = if value["iterations"].is_null() {
        1.0
    } else {
        number(&value["iterations"])
    };
    if !iterations.is_finite()
        || iterations.fract() != 0.0
        || !(1.0..=16_777_216.0).contains(&iterations)
    {
        return Err(Error::new(ErrorCode::InvalidMask));
    }
    create_mask(&bytes, iterations as u32, "seeded")
}

fn codec(request: &Value) -> Result<Codec, Error> {
    let mut options = CodecOptions {
        slug_alphabet: alphabet(&request["maskedAlphabet"])?,
        ..CodecOptions::new(mask(&request["mask"])?)
    };
    if let Some(previous) = request["previous"].as_array() {
        options.previous_masks = previous.iter().map(mask).collect::<Result<_, _>>()?;
    }
    if let Some(definitions) = request["sentinels"].as_array() {
        options.sentinels = definitions
            .iter()
            .map(|entry| {
                Ok((
                    text(entry, "name")?.to_owned(),
                    Uuid::parse(text(entry, "uuid")?)?,
                ))
            })
            .collect::<Result<_, Error>>()?;
    }
    Codec::new(options)
}

fn run(request: &Value) -> Result<Value, Error> {
    let input = request["input"].as_str().unwrap_or("");
    match text(request, "op")? {
        "generateSequence" => {
            let mut generator = uuid_slug::generation::UuidV7Generator::new();
            let steps = request["steps"]
                .as_array()
                .ok_or_else(|| Error::new(ErrorCode::InvalidBuffer))?;
            Ok(Value::Array(
                steps
                    .iter()
                    .map(|step| {
                        let fill = |out: &mut [u8]| {
                            if step["fail"] == true {
                                return Err(Error::new(ErrorCode::RngUnavailable));
                            }
                            out.fill(step["byte"].as_u64().unwrap_or(0) as u8);
                            Ok(())
                        };
                        let result = if step["at"].is_null() {
                            generator.generate_with(number(&step["clock"]), fill)
                        } else {
                            generator.at_with(number(&step["at"]), fill)
                        };
                        match result {
                            Ok(uuid) => json!({"value":uuid.to_string()}),
                            Err(error) => json!({"error":error.code().as_str()}),
                        }
                    })
                    .collect(),
            ))
        }
        "hostGenerate" => {
            let uuid = if request["version"] == 4 {
                uuid_slug::generation::uuid_v4()?
            } else {
                uuid_slug::generation::UuidV7Generator::new().generate()?
            };
            Ok(json!(uuid.to_string()))
        }
        "parse" => Ok(json!(Uuid::parse(input)?.as_bytes())),
        "byteOperations" => {
            let bytes: Vec<u8> = serde_json::from_value(request["bytes"].clone())
                .map_err(|_| Error::new(ErrorCode::InvalidBuffer))?;
            // An offset wider than this target still produces each operation's range error.
            let id = usize::try_from(
                request["offset"]
                    .as_u64()
                    .ok_or_else(|| Error::new(ErrorCode::InvalidBuffer))?,
            )
            .map_err(|_| Error::new(ErrorCode::InvalidBuffer))
            .and_then(|offset| Uuid::from_slice(&bytes, offset));
            let field = |operation: fn(Uuid) -> Result<Value, Error>| match &id {
                Ok(uuid) => match operation(*uuid) {
                    Ok(value) => json!({"value": value}),
                    Err(error) => json!({"error": error.code().as_str()}),
                },
                Err(error) => json!({"error": error.code().as_str()}),
            };
            Ok(json!({
                "uuid": field(|u| Ok(json!(u.to_string()))),
                "base64": field(|u| Ok(json!(u.slug(Alphabet::Base64Url)))),
                "base32": field(|u| Ok(json!(u.slug(Alphabet::Base32Hex)))),
                "timestamp": field(|u| Ok(json!(u.timestamp()?))),
                "v7": bytes.len() == 16 && Uuid::from_slice(&bytes, 0).is_ok_and(|u| u.is_v7())
            }))
        }
        "direct" => Ok(json!(
            Uuid::parse(input)?.slug(alphabet(&request["alphabet"])?)
        )),
        "undirect" => Ok(json!(Uuid::parse_slug(input)?.to_string())),
        "timestamp" => Ok(json!(Uuid::parse(input)?.timestamp()?)),
        "guards" => {
            let uuid = Uuid::parse(input)
                .ok()
                .filter(|uuid| uuid.to_string() == input);
            let slug = Uuid::parse_slug(input)
                .ok()
                .filter(|uuid| match input.len() {
                    22 => uuid.slug(Alphabet::Base64Url) == input,
                    26 => uuid.slug(Alphabet::Base32Hex) == input,
                    _ => false,
                });
            Ok(json!([
                uuid.is_some(),
                uuid.is_some_and(|u| u.is_v4()),
                uuid.is_some_and(|u| u.is_v7()),
                slug.is_some(),
                slug.is_some_and(|u| u.is_v4()),
                slug.is_some_and(|u| u.is_v7())
            ]))
        }
        "base64Decode" => Ok(json!(Alphabet::Base64Url.decode(input)?)),
        "base64Guard" => Ok(json!(Alphabet::Base64Url.decode(input).is_ok())),
        "base64DecodeTo" => {
            // Wasm usize is 32-bit: casts would turn a rejected offset into an in-bounds write.
            let capacity = usize::try_from(
                request["capacity"]
                    .as_u64()
                    .ok_or_else(|| Error::new(ErrorCode::InvalidBuffer))?,
            )
            .map_err(|_| Error::new(ErrorCode::InvalidBuffer))?;
            // Keep it out of bounds while letting the decoder preserve its text-error priority.
            let offset = usize::try_from(
                request["offset"]
                    .as_u64()
                    .ok_or_else(|| Error::new(ErrorCode::InvalidBuffer))?,
            )
            .unwrap_or(usize::MAX);
            let mut out = vec![165; capacity];
            // Expose rejected-range storage so the host can detect writes before an error.
            let decoded = match Alphabet::Base64Url.decode_to(input, &mut out, offset) {
                Ok(decoded) => decoded,
                Err(error) if error.code() == ErrorCode::InvalidBuffer => {
                    return Ok(json!({"error": "invalid_buffer", "storage": out}));
                }
                Err(error) => return Err(error),
            };
            let bytes = json!(decoded);
            Ok(json!({"bytes": bytes, "storage": out}))
        }
        "base64Encode" => {
            let bytes = request["bytes"]
                .as_array()
                .ok_or_else(|| Error::new(ErrorCode::InvalidBuffer))?
                .iter()
                .map(|v| {
                    v.as_u64()
                        .and_then(|n| u8::try_from(n).ok())
                        .ok_or_else(|| Error::new(ErrorCode::InvalidBuffer))
                })
                .collect::<Result<Vec<_>, _>>()?;
            let bytes =
                <[u8; 16]>::try_from(bytes).map_err(|_| Error::new(ErrorCode::InvalidBuffer))?;
            Ok(json!(Alphabet::Base64Url.encode(&bytes)))
        }
        "validateUuidV7Timestamp" | "validateDirectUuidV7SlugUnixMs" => {
            let uuid = if request["op"] == "validateDirectUuidV7SlugUnixMs" {
                Uuid::parse_slug(input)?
            } else {
                Uuid::parse(input)?
            };
            UuidV7TimestampWindow {
                reference_unix_ms: number(&request["now"]),
                max_timestamp_delta_ms: number(&request["window"]),
            }
            .validate(uuid)?;
            Ok(json!(input))
        }
        "mask" => Ok(json!(codec(request)?.encode_uuid(Uuid::parse(input)?)?)),
        "unmask" => {
            let codec = codec(request)?;
            let uuid = if request["acceptDirect"] == true {
                codec
                    .migration_decoder(MigrationOptions {
                        original: false,
                        direct: true,
                    })
                    .decode(input, None)?
            } else {
                codec.decode_slug(input)?
            };
            Ok(json!(uuid.to_string()))
        }
        "unmaskV7" => Ok(json!(codec(request)?.decode_slug(input)?.to_string())),
        "validateMaskedTimestamp" => Ok(json!(codec(request)?.validate_slug_timestamp(
            input,
            UuidV7TimestampWindow {
                reference_unix_ms: number(&request["now"]),
                max_timestamp_delta_ms: number(&request["window"])
            },
        )?)),
        "sentinels" => Ok(json!(
            codec(request)?
                .sentinels()
                .iter()
                .map(|s| json!({"name":s.name,"uuid":s.uuid.to_string(),"slug":s.slug}))
                .collect::<Vec<_>>()
        )),
        "migration" | "candidates" => {
            let codec = codec(request)?;
            let migration = codec.migration_decoder(MigrationOptions {
                original: request["original"] == true,
                direct: request["direct"] == true,
            });
            let format = match request["format"].as_str() {
                None => None,
                Some("seeded-mask") => Some(MigrationFormat::Current),
                Some("fixed-mask") => Some(MigrationFormat::Original),
                Some("direct-slug") => Some(MigrationFormat::Direct),
                _ => return Err(Error::new(ErrorCode::InvalidUuidSlug)),
            };
            if request["op"] == "migration" {
                Ok(json!(migration.decode(input, format)?.to_string()))
            } else {
                Ok(json!(
                    migration
                        .candidates(input, format)?
                        .iter()
                        .map(ToString::to_string)
                        .collect::<Vec<_>>()
                ))
            }
        }
        _ => Err(Error::new(ErrorCode::InvalidUuid)),
    }
}

/// Return one result per input; transport errors remain distinct from library error codes.
pub fn evaluate(input: &str) -> String {
    let requests: Vec<Value> = match serde_json::from_str(input) {
        Ok(value) => value,
        Err(error) => return json!({"transportError":error.to_string()}).to_string(),
    };
    Value::Array(
        requests
            .iter()
            .map(|request| match run(request) {
                Ok(value) => json!({"value": value}),
                Err(error) => json!({"error": error.code().as_str()}),
            })
            .collect(),
    )
    .to_string()
}
