//! Run the same contract requests through each development transport.

use serde_json::{Value, json};
use uuid_slug::{
    Error, ErrorCode, Uuid, UuidSlugAlphabet, UuidSlugMigrationFormat, UuidSlugMigrationOptions,
    UuidV7Mask, UuidV7MaskingCodec, UuidV7MaskingCodecOptions, UuidV7PreviousMask,
    UuidV7TimestampWindow, derive_uuid_v7_mask, uuid_v7_bounds, uuid_v7_test_mask,
};

fn text<'a>(value: &'a Value, key: &str) -> Result<&'a str, Error> {
    value[key]
        .as_str()
        .ok_or_else(|| Error::new(ErrorCode::InvalidUuid))
}

fn alphabet(value: &Value) -> Result<UuidSlugAlphabet, Error> {
    match value.as_str().unwrap_or("base64url") {
        "base64url" => Ok(UuidSlugAlphabet::Base64Url),
        "base32hex" => Ok(UuidSlugAlphabet::Base32Hex),
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

fn system_time(value: &Value) -> Result<std::time::SystemTime, Error> {
    let seconds = value["seconds"]
        .as_u64()
        .ok_or_else(|| Error::new(ErrorCode::InvalidTimestamp))?;
    let nanoseconds = value["nanoseconds"].as_u64().unwrap_or(0);
    if nanoseconds > 999_999_999 {
        return Err(Error::new(ErrorCode::InvalidTimestamp));
    }
    std::time::UNIX_EPOCH
        .checked_add(std::time::Duration::new(seconds, nanoseconds as u32))
        .ok_or_else(|| Error::new(ErrorCode::InvalidTimestamp))
}

fn timestamp_range_start(value: &Value) -> Result<u64, Error> {
    value
        .as_u64()
        .ok_or_else(|| Error::new(ErrorCode::InvalidTimestamp))
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

fn mask(value: &Value) -> Result<UuidV7Mask, Error> {
    if value.is_null() {
        return Ok(uuid_v7_test_mask());
    }
    if value == "custom-mix" {
        return UuidV7Mask::from_permutation_functions(
            "custom-mix",
            custom_mix_forward,
            custom_mix_reverse,
        );
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
    derive_uuid_v7_mask(&bytes, iterations as u32, "seeded")
}

fn masking_codec(request: &Value) -> Result<UuidV7MaskingCodec, Error> {
    let mut options = UuidV7MaskingCodecOptions {
        masked_slug_alphabet: alphabet(&request["maskedAlphabet"])?,
        ..UuidV7MaskingCodecOptions::new(mask(&request["mask"])?)
    };
    if !request["timestampRangeStartUnixMs"].is_null() {
        options.timestamp_range_start_unix_ms =
            timestamp_range_start(&request["timestampRangeStartUnixMs"])?;
    }
    if let Some(previous) = request["previous"].as_array() {
        options.previous_masks = previous
            .iter()
            .map(|entry| {
                if entry["mask"].is_null() {
                    return mask(entry).map(UuidV7PreviousMask::new);
                }
                Ok(UuidV7PreviousMask {
                    mask: mask(&entry["mask"])?,
                    timestamp_range_start_unix_ms: if entry["timestampRangeStartUnixMs"].is_null() {
                        0
                    } else {
                        timestamp_range_start(&entry["timestampRangeStartUnixMs"])?
                    },
                })
            })
            .collect::<Result<_, _>>()?;
    }
    if let Some(definitions) = request["sentinels"].as_array() {
        options.sentinels = definitions
            .iter()
            .map(|entry| {
                Ok((
                    text(entry, "name")?.to_owned(),
                    Uuid::from_uuid_string(text(entry, "uuid")?)?,
                ))
            })
            .collect::<Result<_, Error>>()?;
    }
    UuidV7MaskingCodec::new(options)
}

fn run(request: &Value) -> Result<Value, Error> {
    let input = request["input"].as_str().unwrap_or("");
    match text(request, "op")? {
        "generateSequence" => {
            let fraction_bits = request["fractionBits"].as_u64().unwrap_or(0) as u8;
            let mut generator = uuid_slug::UuidV7Generator::new()
                .with_sub_millisecond_fraction_bits(fraction_bits)?;
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
                            generator.generate_uuid_v7_with_random_fill(number(&step["clock"]), fill)
                        } else if step["at"].is_object() {
                            system_time(&step["at"]).and_then(|at| {
                                generator.generate_uuid_v7_at_with_random_fill(at, fill)
                            })
                        } else {
                            generator.generate_uuid_v7_with_random_fill(number(&step["at"]), fill)
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
                uuid_slug::generate_uuid_v4()?
            } else {
                uuid_slug::UuidV7Generator::new().generate_uuid_v7()?
            };
            Ok(json!(uuid.to_string()))
        }
        "parse" => Ok(json!(Uuid::from_uuid_string(input)?.as_uuid_bytes())),
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
            .and_then(|offset| Uuid::from_uuid_bytes(&bytes, offset));
            let field = |operation: fn(Uuid) -> Result<Value, Error>| match &id {
                Ok(uuid) => match operation(*uuid) {
                    Ok(value) => json!({"value": value}),
                    Err(error) => json!({"error": error.code().as_str()}),
                },
                Err(error) => json!({"error": error.code().as_str()}),
            };
            Ok(json!({
                "uuid": field(|u| Ok(json!(u.to_string()))),
                "base64": field(|u| Ok(json!(u.to_plain_uuid_slug(UuidSlugAlphabet::Base64Url).as_str()))),
                "base32": field(|u| Ok(json!(u.to_plain_uuid_slug(UuidSlugAlphabet::Base32Hex).as_str()))),
                "timestamp": field(|u| Ok(json!(u.extract_uuid_v7_unix_ms()?))),
                "v7": bytes.len() == 16 && Uuid::from_uuid_bytes(&bytes, 0).is_ok_and(|u| u.is_uuid_v7())
            }))
        }
        "plain" => Ok(json!(
            Uuid::from_uuid_string(input)?.to_plain_uuid_slug(alphabet(&request["alphabet"])?).into_string()
        )),
        "plainToUuid" => Ok(json!(Uuid::from_plain_uuid_slug(input)?.to_string())),
        "timestamp" => Ok(json!(Uuid::from_uuid_string(input)?.extract_uuid_v7_unix_ms()?)),
        "uuidV7Bounds" => {
            let start = request["start"]
                .as_u64()
                .ok_or_else(|| Error::new(ErrorCode::InvalidTimestamp))?;
            let end = request["end"]
                .as_u64()
                .ok_or_else(|| Error::new(ErrorCode::InvalidTimestamp))?;
            let bounds = uuid_v7_bounds(start, Some(end))?;
            let format = |uuid: Uuid| {
                let text = uuid.to_string();
                if request["textCase"] == "uppercase" {
                    text.to_uppercase()
                } else {
                    text
                }
            };
            Ok(json!({
                "startInclusive": format(bounds.start_inclusive),
                "endInclusive": format(bounds.end_inclusive),
            }))
        }
        "guards" => {
            let uuid = Uuid::from_uuid_string(input).ok();
            let slug = Uuid::from_plain_uuid_slug(input)
                .ok()
                .filter(|uuid| match input.len() {
                    22 => uuid.to_plain_uuid_slug(UuidSlugAlphabet::Base64Url).as_str() == input,
                    26 => uuid.to_plain_uuid_slug(UuidSlugAlphabet::Base32Hex).as_str() == input,
                    _ => false,
                });
            Ok(json!([
                uuid.is_some(),
                uuid.is_some_and(|u| u.is_uuid_v4()),
                uuid.is_some_and(|u| u.is_uuid_v7()),
                slug.is_some(),
                slug.is_some_and(|u| u.is_uuid_v4()),
                slug.is_some_and(|u| u.is_uuid_v7())
            ]))
        }
        "base64Decode" => Ok(json!(UuidSlugAlphabet::Base64Url.plain_slug_to_uuid_bytes(input)?)),
        "base64Guard" => Ok(json!(UuidSlugAlphabet::Base64Url.plain_slug_to_uuid_bytes(input).is_ok())),
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
            let decoded = match UuidSlugAlphabet::Base64Url.plain_slug_to_uuid_bytes_into(input, &mut out, offset) {
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
            Ok(json!(
                UuidSlugAlphabet::Base64Url
                    .uuid_bytes_to_plain_slug(&bytes)
                    .into_string()
            ))
        }
        "validateUuidV7Timestamp" | "validatePlainUuidV7SlugUnixMs" => {
            let uuid = if request["op"] == "validatePlainUuidV7SlugUnixMs" {
                Uuid::from_plain_uuid_slug(input)?
            } else {
                Uuid::from_uuid_string(input)?
            };
            UuidV7TimestampWindow {
                reference_unix_ms: number(&request["now"]),
                max_timestamp_delta_ms: number(&request["window"]),
            }
            .validate_uuid_v7(uuid)?;
            Ok(json!(input))
        }
        "mask" => Ok(json!(
            masking_codec(request)?
                .uuid_to_masked_slug(Uuid::from_uuid_string(input)?)?
                .into_string()
        )),
        "unmask" => {
            let masking_codec = masking_codec(request)?;
            let uuid = if request["acceptPlain"] == true {
                masking_codec
                    .create_uuid_slug_migration_decoder(UuidSlugMigrationOptions {
                        accept_original_masked_slug: false,
                        accept_plain_uuid_slug: true,
                    })
                    .uuid_slug_to_uuid(input, None)?
            } else {
                masking_codec.masked_slug_to_uuid(input)?
            };
            Ok(json!(uuid.to_string()))
        }
        "unmaskV7" => Ok(json!(
            masking_codec(request)?.masked_slug_to_uuid(input)?.to_string()
        )),
        "validateMaskedTimestamp" => Ok(json!(masking_codec(request)?.validate_masked_uuid_v7_slug_unix_ms(
            input,
            UuidV7TimestampWindow {
                reference_unix_ms: number(&request["now"]),
                max_timestamp_delta_ms: number(&request["window"])
            },
        )?)),
        "sentinels" => Ok(json!(
            masking_codec(request)?
                .sentinels()
                .iter()
                .map(|s| json!({"name":s.name,"uuid":s.uuid.to_string(),"slug":s.plain_uuid_slug.as_str()}))
                .collect::<Vec<_>>()
        )),
        "migration" | "candidates" => {
            let masking_codec = masking_codec(request)?;
            let migration_decoder = masking_codec.create_uuid_slug_migration_decoder(UuidSlugMigrationOptions {
                accept_original_masked_slug: request["original"] == true,
                accept_plain_uuid_slug: request["plain"] == true,
            });
            let format = match request["format"].as_str() {
                None => None,
                Some("seeded-mask") => Some(UuidSlugMigrationFormat::CurrentMaskedSlug),
                Some("fixed-mask") => Some(UuidSlugMigrationFormat::OriginalMaskedSlug),
                Some("plain-slug") => Some(UuidSlugMigrationFormat::PlainUuidSlug),
                _ => return Err(Error::new(ErrorCode::InvalidUuidSlug)),
            };
            if request["op"] == "migration" {
                Ok(json!(migration_decoder.uuid_slug_to_uuid(input, format)?.to_string()))
            } else {
                Ok(json!(
                    migration_decoder
                        .uuid_slug_to_uuid_candidates(input, format)?
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
