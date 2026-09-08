//! Run the same contract requests through each development transport.

use serde_json::{Value, json};
use uuid_slug::{
    Alphabet, Codec, CodecOptions, Error, Freshness, MaskSchema, MigrationFormat, MigrationOptions,
    Uuid, create_mask_schema,
};

fn text<'a>(value: &'a Value, key: &str) -> Result<&'a str, Error> {
    value[key].as_str().ok_or(Error::InvalidUuid)
}

fn alphabet(value: &Value) -> Result<Alphabet, Error> {
    match value.as_str().unwrap_or("base64url") {
        "base64url" => Ok(Alphabet::Base64Url),
        "base32hex" => Ok(Alphabet::Base32Hex),
        _ => Err(Error::InvalidUuidSlug),
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

fn schema(value: &Value) -> Result<MaskSchema, Error> {
    if value.is_null() {
        return Ok(MaskSchema::default());
    }
    if value == "custom-mix" {
        return MaskSchema::custom("custom-mix", |input, forward| {
            let mut output = [0; 16];
            for index in 0..16 {
                let target = (index * 5 + 3) % 16;
                if forward {
                    output[index] = input[target] ^ (index * 17) as u8;
                } else {
                    output[target] = input[index] ^ (index * 17) as u8;
                }
            }
            Ok(output)
        });
    }
    let bytes = if let Some(units) = value["utf16"].as_array() {
        // JSON strings cannot preserve lone UTF-16 surrogates in serde_json; explicit units do.
        let units: Result<Vec<u16>, Error> = units
            .iter()
            .map(|v| {
                v.as_u64()
                    .and_then(|n| u16::try_from(n).ok())
                    .ok_or(Error::InvalidMaskSchema)
            })
            .collect();
        String::from_utf16_lossy(&units?).into_bytes()
    } else if let Some(bytes) = value["bytes"].as_array() {
        bytes
            .iter()
            .map(|v| {
                v.as_u64()
                    .and_then(|n| u8::try_from(n).ok())
                    .ok_or(Error::InvalidMaskSchema)
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
        return Err(Error::InvalidMaskSchema);
    }
    create_mask_schema(&bytes, iterations as u32, "seeded")
}

fn codec(request: &Value) -> Result<Codec, Error> {
    let mut options = CodecOptions {
        mask: schema(&request["mask"])?,
        masked_slug_alphabet: alphabet(&request["maskedAlphabet"])?,
        slug_alphabet: alphabet(&request["alphabet"])?,
        accept_unmasked_slugs: request["acceptPlain"] == true,
        ..CodecOptions::default()
    };
    if let Some(previous) = request["previous"].as_array() {
        options.previous_masks = previous.iter().map(schema).collect::<Result<_, _>>()?;
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
            let steps = request["steps"].as_array().ok_or(Error::InvalidBuffer)?;
            Ok(Value::Array(
                steps
                    .iter()
                    .map(|step| {
                        let fill = |out: &mut [u8]| {
                            if step["fail"] == true {
                                return Err(Error::RngUnavailable);
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
                            Err(error) => json!({"error":error.code()}),
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
                .map_err(|_| Error::InvalidBuffer)?;
            // An offset wider than this target still produces each operation's range error.
            let id = usize::try_from(request["offset"].as_u64().ok_or(Error::InvalidBuffer)?)
                .map_err(|_| Error::InvalidBuffer)
                .and_then(|offset| Uuid::from_slice(&bytes, offset));
            let field = |operation: fn(Uuid) -> Result<Value, Error>| match &id {
                Ok(uuid) => match operation(*uuid) {
                    Ok(value) => json!({"value": value}),
                    Err(error) => json!({"error": error.code()}),
                },
                Err(error) => json!({"error": error.code()}),
            };
            Ok(json!({
                "uuid": field(|u| Ok(json!(u.to_string()))),
                "base64": field(|u| Ok(json!(u.slug(Alphabet::Base64Url)))),
                "base32": field(|u| Ok(json!(u.slug(Alphabet::Base32Hex)))),
                "timestamp": field(|u| Ok(json!(u.timestamp()?))),
                "entropy": id.as_ref().is_ok_and(Uuid::has_entropy),
                "v7": bytes.len() == 16 && Uuid::from_slice(&bytes, 0).is_ok_and(|u| u.is_v7())
            }))
        }
        "plain" => Ok(json!(
            Uuid::parse(input)?.slug(alphabet(&request["alphabet"])?)
        )),
        "unplain" => Ok(json!(Uuid::parse_slug(input)?.to_string())),
        "timestamp" => Ok(json!(Uuid::parse(input)?.timestamp()?)),
        "entropy" => Ok(json!(Uuid::parse(input)?.has_entropy())),
        "guards" => {
            let uuid = Uuid::parse(input).ok();
            let slug = Uuid::parse_slug(input).ok();
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
        "base64DecodeTo" => {
            // Wasm usize is 32-bit: casts would turn a rejected offset into an in-bounds write.
            let capacity =
                usize::try_from(request["capacity"].as_u64().ok_or(Error::InvalidBuffer)?)
                    .map_err(|_| Error::InvalidBuffer)?;
            // Keep it out of bounds while letting the decoder preserve its text-error priority.
            let offset = usize::try_from(request["offset"].as_u64().ok_or(Error::InvalidBuffer)?)
                .unwrap_or(usize::MAX);
            let mut out = vec![165; capacity];
            let decoded = Alphabet::Base64Url.decode_to(input, &mut out, offset)?;
            let bytes = json!(decoded);
            Ok(json!({"bytes": bytes, "storage": out}))
        }
        "base64Encode" => {
            let bytes = request["bytes"]
                .as_array()
                .ok_or(Error::InvalidBuffer)?
                .iter()
                .map(|v| {
                    v.as_u64()
                        .and_then(|n| u8::try_from(n).ok())
                        .ok_or(Error::InvalidBuffer)
                })
                .collect::<Result<Vec<_>, _>>()?;
            Ok(json!(Alphabet::Base64Url.encode(&bytes)))
        }
        "fresh" => {
            let uuid = Uuid::parse(input)?;
            Freshness {
                now: number(&request["now"]),
                window_ms: number(&request["window"]),
            }
            .validate(uuid)?;
            Ok(json!(input))
        }
        "mask" => Ok(json!(
            codec(request)?.uuid_v7_to_masked_slug(Uuid::parse(input)?)?
        )),
        "unmask" => Ok(json!(
            codec(request)?.masked_slug_to_uuid(input)?.to_string()
        )),
        "unmaskV7" => Ok(json!(
            codec(request)?.masked_slug_to_uuid_v7(input)?.to_string()
        )),
        "freshMasked" => Ok(json!(codec(request)?.validate_masked_slug_fresh(
            input,
            Freshness {
                now: number(&request["now"]),
                window_ms: number(&request["window"])
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
            let migration = codec.migration(MigrationOptions {
                original: request["original"] == true,
                plain: request["plain"] == true,
            });
            let format = match request["format"].as_str() {
                None => None,
                Some("current") => Some(MigrationFormat::Current),
                Some("original") => Some(MigrationFormat::Original),
                Some("plain") => Some(MigrationFormat::Plain),
                _ => return Err(Error::InvalidUuidSlug),
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
        _ => Err(Error::InvalidUuid),
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
                Err(error) => json!({"error": error.code()}),
            })
            .collect(),
    )
    .to_string()
}
