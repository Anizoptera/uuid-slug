//! Adapt shared JavaScript calls to the public Rust API; never execute a second codec algorithm.

use serde_json::{Value, json};
use std::cell::RefCell;
use uuid_slug::{
    Error, ErrorCode, Uuid, UuidSlugAlphabet, UuidV7ClockRollbackPolicy, UuidV7Generator,
    UuidV7Mask, UuidV7MaskingCodec, UuidV7PayloadLayout, UuidV7TimestampWindow,
};

// Handles retain the actual Rust objects across calls, including generator sequence state.
// The test owner clears the arena before closing its transport; nothing is persisted.
#[derive(Default)]
struct Objects {
    masks: Vec<UuidV7Mask>,
    codecs: Vec<UuidV7MaskingCodec>,
    generators: Vec<UuidV7Generator>,
    derivations: Vec<Option<Derivation>>,
}
struct Derivation {
    future: std::pin::Pin<Box<dyn std::future::Future<Output = Result<UuidV7Mask, Error>> + Send>>,
    cancellation: uuid_slug::UuidV7MaskDerivationCancellation,
}
thread_local! { static OBJECTS: RefCell<Objects> = RefCell::new(Objects::default()); }

fn invalid(code: ErrorCode) -> Error {
    Error::new(code)
}
fn index(v: &Value) -> Result<usize, Error> {
    v.as_u64()
        .and_then(|v| usize::try_from(v).ok())
        .ok_or_else(|| invalid(ErrorCode::InvalidBuffer))
}
fn bytes(v: &Value) -> Result<Vec<u8>, Error> {
    serde_json::from_value(v["bytes"].clone()).map_err(|_| invalid(ErrorCode::InvalidBuffer))
}
fn masked_byte_range<'a>(bytes: &'a [u8], offset: &Value) -> Result<&'a [u8], Error> {
    if offset.is_null() {
        return Ok(bytes);
    }
    // Borrow the consumer's selected slice; nested gets avoid overflow and never panic.
    bytes
        .get(index(offset)?..)
        .and_then(|tail| tail.get(..16))
        .ok_or_else(|| invalid(ErrorCode::InvalidBuffer))
}
fn alphabet(v: &Value) -> Result<UuidSlugAlphabet, Error> {
    super::dispatch::alphabet(v)
}
fn fill_for_request(
    options: &Value,
    out: &mut [u8],
    required: &mut Option<usize>,
) -> Result<(), Error> {
    if options["hostRandom"] == true {
        return uuid_slug::fill_os_random_bytes(out);
    }
    if options["random"].is_null() {
        *required = Some(out.len());
        return Err(invalid(ErrorCode::RngUnavailable));
    }
    let data: Vec<u8> = serde_json::from_value(options["random"].clone())
        .map_err(|_| invalid(ErrorCode::RngUnavailable))?;
    if data.len() != out.len() {
        return Err(invalid(ErrorCode::RngUnavailable));
    }
    out.copy_from_slice(&data);
    Ok(())
}
fn with_generator<R>(
    options: &Value,
    generators: &mut [UuidV7Generator],
    run: impl FnOnce(&mut UuidV7Generator) -> Result<R, Error>,
) -> Result<R, Error> {
    if options["stateless"] == true {
        let bits = options["fractionBits"]
            .as_u64()
            .and_then(|v| u8::try_from(v).ok())
            .ok_or_else(|| invalid(ErrorCode::InvalidOptions))?;
        run(&mut UuidV7Generator::new().with_sub_millisecond_fraction_bits(bits)?)
    } else {
        run(generators
            .get_mut(index(&options["generator"])?)
            .ok_or_else(|| invalid(ErrorCode::InvalidOptions))?)
    }
}
fn generate_into(options: &Value, generators: &mut [UuidV7Generator]) -> Result<Value, Error> {
    let mut storage = bytes(&options["output"])?;
    let mut required = None;
    let fill = |out: &mut [u8]| fill_for_request(options, out, &mut required);
    let result = index(&options["outputOffset"]).and_then(|offset| {
        if options["version"] == 4 {
            uuid_slug::generate_uuid_v4_into_with_random_fill(&mut storage, offset, fill)
        } else {
            with_generator(options, generators, |generator| {
                if options["at"].is_object() {
                    generator.generate_uuid_v7_at_into_with_random_fill(
                        super::dispatch::system_time(&options["at"])?,
                        &mut storage,
                        offset,
                        fill,
                    )
                } else {
                    generator.generate_uuid_v7_into_with_random_fill(
                        super::dispatch::number(&options["at"]),
                        &mut storage,
                        offset,
                        fill,
                    )
                }
            })
        }
    });
    // Pending callback requests must expose storage too: an early write must remain observable
    // even when the foreign entropy callback fails before a second native call.
    if let Some(length) = required {
        return Ok(json!({"drawRequired":length,"storage":storage}));
    }
    Ok(match result {
        Ok(()) => json!({"storage":storage}),
        Err(error) => {
            json!({"storage":storage,"error":error.code().as_str(),"message":error.to_string()})
        }
    })
}
fn uuid(
    v: &Value,
    source: &str,
    offset: &Value,
    objects: &Objects,
    codec: Option<usize>,
) -> Result<Uuid, Error> {
    if source == "masked-bytes" {
        return objects
            .codecs
            .get(codec.ok_or_else(|| invalid(ErrorCode::InvalidOptions))?)
            .ok_or_else(|| invalid(ErrorCode::InvalidOptions))?
            .masked_bytes_to_uuid(masked_byte_range(&bytes(v)?, offset)?);
    }
    if v.is_object() && v.get("bytes").is_some() {
        if source == "text" {
            return Err(invalid(ErrorCode::InvalidUuid));
        }
        if source == "plain" || source == "masked" {
            return Err(invalid(ErrorCode::InvalidUuidSlug));
        }
        let data = bytes(v)?;
        if offset.is_null() && data.len() != 16 {
            return Err(invalid(ErrorCode::InvalidBuffer));
        }
        return Uuid::from_uuid_bytes(&data, if offset.is_null() { 0 } else { index(offset)? });
    }
    if source == "bytes" {
        return Err(invalid(ErrorCode::InvalidBuffer));
    }
    let text = v.as_str().ok_or_else(|| invalid(ErrorCode::InvalidUuid))?;
    match source {
        "text" => Uuid::from_uuid_string(text),
        "plain" => Uuid::from_plain_uuid_slug(text),
        "masked" => objects
            .codecs
            .get(codec.ok_or_else(|| invalid(ErrorCode::InvalidOptions))?)
            .ok_or_else(|| invalid(ErrorCode::InvalidOptions))?
            .masked_slug_to_uuid(text),
        _ => match codec {
            Some(id) => objects
                .codecs
                .get(id)
                .ok_or_else(|| invalid(ErrorCode::InvalidOptions))?
                .parse_uuid(text),
            None => Uuid::parse_uuid(text),
        },
    }
}

fn payload(uuid: Uuid, layout: &Value) -> Result<Value, Error> {
    let field = |key: &str| -> Result<u8, Error> {
        layout[key]
            .as_u64()
            .and_then(|v| u8::try_from(v).ok())
            .ok_or_else(|| invalid(ErrorCode::InvalidOptions))
    };
    let result = uuid.extract_uuid_v7_payload(UuidV7PayloadLayout::new(
        field("subMillisecondFractionBits")?,
        field("counterBits")?,
    )?)?;
    Ok(json!({"unixMs":result.unix_ms,
        "subMillisecondFraction": result.sub_millisecond_fraction.map(|v| json!({"value":v.value,"bits":v.bits})),
        "counter":result.counter.map(|v| json!({"value":v.value.to_string(),"bits":v.bits})),
        "remaining":{"value":result.remaining.value.to_string(),"bits":result.remaining.bits}}))
}

fn run(request: &Value, objects: &mut Objects) -> Result<Value, Error> {
    let args = &request["args"];
    let method = request["method"]
        .as_str()
        .ok_or_else(|| invalid(ErrorCode::InvalidOptions))?;
    let codec = request["codec"]
        .as_u64()
        .and_then(|v| usize::try_from(v).ok());
    match method {
        "writeMaskedBytes" | "writeUnmaskedBytes" => {
            let selected = objects
                .codecs
                .get(codec.ok_or_else(|| invalid(ErrorCode::InvalidOptions))?)
                .ok_or_else(|| invalid(ErrorCode::InvalidOptions))?;
            let mut storage = bytes(&args[1])?;
            let result = index(&args[2]).and_then(|offset| {
                if method == "writeMaskedBytes" {
                    let value = uuid(&args[0], "universal", &Value::Null, objects, codec)?;
                    selected.uuid_to_masked_bytes_into(value, &mut storage, offset)
                } else {
                    selected.masked_bytes_to_uuid_bytes_into(
                        masked_byte_range(&bytes(&args[0])?, &request["offset"])?,
                        &mut storage,
                        offset,
                    )
                }
            });
            Ok(match result {
                Ok(()) => json!({"storage":storage}),
                Err(error) => {
                    json!({"storage":storage,"error":error.code().as_str(),"message":error.to_string()})
                }
            })
        }
        "transform" => super::primitives::mask_transform(&args[0]),
        "generateInto" => generate_into(&args[0], &mut objects.generators),
        "reset" => {
            *objects = Objects::default();
            Ok(Value::Null)
        }
        "deriveMask" => {
            let mask = super::dispatch::mask(&args[0])?;
            let id = objects.masks.len();
            objects.masks.push(mask);
            Ok(json!(id))
        }
        "customMask" => {
            let forward = args[0]["mask"]
                .as_u64()
                .ok_or_else(|| invalid(ErrorCode::InvalidMask))?;
            let reverse = args[0]["unmask"]
                .as_u64()
                .ok_or_else(|| invalid(ErrorCode::InvalidMask))?;
            let mask = UuidV7Mask::from_permutation_functions(
                args[0]["diagnosticLabel"].as_str().unwrap_or("custom"),
                move |input| super::test_callbacks::invoke(forward, input),
                move |input| super::test_callbacks::invoke(reverse, input),
            )?;
            let id = objects.masks.len();
            objects.masks.push(mask);
            Ok(json!(id))
        }
        "deriveAsync" => {
            let seed: Vec<u8> = serde_json::from_value(args[0]["bytes"].clone())
                .map_err(|_| invalid(ErrorCode::InvalidMask))?;
            let iterations = args[0]["iterations"]
                .as_u64()
                .and_then(|v| u32::try_from(v).ok())
                .ok_or_else(|| invalid(ErrorCode::InvalidMask))?;
            let cancellation = uuid_slug::UuidV7MaskDerivationCancellation::default();
            let future = Box::pin(uuid_slug::derive_uuid_v7_mask_async(
                &seed,
                iterations,
                "shared",
                cancellation.clone(),
            ));
            let id = objects.derivations.len();
            objects.derivations.push(Some(Derivation {
                future,
                cancellation,
            }));
            Ok(json!(id))
        }
        "pollDerivation" => {
            let slot = objects
                .derivations
                .get_mut(index(&args[0])?)
                .ok_or_else(|| invalid(ErrorCode::InvalidOptions))?;
            let derivation = slot
                .as_mut()
                .ok_or_else(|| invalid(ErrorCode::InvalidOptions))?;
            if args[1] == true {
                derivation.cancellation.cancel();
            }
            let mut context = std::task::Context::from_waker(std::task::Waker::noop());
            match derivation.future.as_mut().poll(&mut context) {
                std::task::Poll::Pending => Ok(Value::Null),
                std::task::Poll::Ready(result) => {
                    *slot = None;
                    let mask = result?;
                    let id = objects.masks.len();
                    objects.masks.push(mask);
                    Ok(json!(id))
                }
            }
        }
        "createCodec" => {
            let options = &args[0];
            let mut built = uuid_slug::UuidV7MaskingCodecOptions::new(
                objects
                    .masks
                    .get(index(&options["mask"])?)
                    .ok_or_else(|| invalid(ErrorCode::InvalidMask))?
                    .clone(),
            );
            built.masked_slug_alphabet = alphabet(&options["maskedSlugAlphabet"])?;
            if !options["timestampRangeStartUnixMs"].is_null() {
                built.timestamp_range_start_unix_ms = options["timestampRangeStartUnixMs"]
                    .as_u64()
                    .ok_or_else(|| invalid(ErrorCode::InvalidTimestamp))?;
            }
            if let Some(previous) = options["previousMasks"].as_array() {
                for entry in previous {
                    let (id, start) = if entry.is_number() {
                        (index(entry)?, 0)
                    } else {
                        (
                            index(&entry["mask"])?,
                            entry["timestampRangeStartUnixMs"].as_u64().unwrap_or(0),
                        )
                    };
                    built.previous_masks.push(uuid_slug::UuidV7PreviousMask {
                        mask: objects
                            .masks
                            .get(id)
                            .ok_or_else(|| invalid(ErrorCode::InvalidMask))?
                            .clone(),
                        timestamp_range_start_unix_ms: start,
                    });
                }
            }
            if let Some(sentinels) = options["sentinels"].as_array() {
                for sentinel in sentinels {
                    built.sentinels.push((
                        sentinel["name"]
                            .as_str()
                            .ok_or_else(|| invalid(ErrorCode::InvalidSentinel))?
                            .to_owned(),
                        Uuid::from_uuid_string(
                            sentinel["uuid"]
                                .as_str()
                                .ok_or_else(|| invalid(ErrorCode::InvalidUuid))?,
                        )?,
                    ));
                }
            }
            let built = UuidV7MaskingCodec::from_options(built)?;
            let sentinels:Vec<_> = built.sentinels().iter().map(|v|json!({"name":v.name,"uuid":v.uuid.to_string(),"slug":v.plain_uuid_slug.as_str()})).collect();
            let id = objects.codecs.len();
            objects.codecs.push(built);
            Ok(json!({"id":id,"sentinels":sentinels}))
        }
        "createGenerator" => {
            let options = &args[0];
            let bits = options["subMillisecondFractionBits"].as_u64().unwrap_or(0);
            let mut generator = UuidV7Generator::new().with_sub_millisecond_fraction_bits(
                u8::try_from(bits).map_err(|_| invalid(ErrorCode::InvalidOptions))?,
            )?;
            let rollback = &options["clockRollback"];
            if !rollback.is_null() {
                let tolerance_ms = rollback["toleranceMs"].as_u64().unwrap_or(0);
                generator = generator.with_clock_rollback_policy(
                    match rollback["mode"].as_str().unwrap_or("preserve") {
                        "preserve" => UuidV7ClockRollbackPolicy::Preserve,
                        "reset" => UuidV7ClockRollbackPolicy::Reset { tolerance_ms },
                        "error" => UuidV7ClockRollbackPolicy::Error { tolerance_ms },
                        _ => return Err(invalid(ErrorCode::InvalidOptions)),
                    },
                );
            }
            let id = objects.generators.len();
            objects.generators.push(generator);
            Ok(json!(id))
        }
        "generate" => {
            let options = &args[0];
            let mut required = None;
            let fill = |out: &mut [u8]| fill_for_request(options, out, &mut required);
            let result = if options["version"] == 4 {
                uuid_slug::generate_uuid_v4_with_random_fill(fill)
            } else {
                with_generator(options, &mut objects.generators, |generator| {
                    if options["at"].is_object() {
                        generator.generate_uuid_v7_at_with_random_fill(
                            super::dispatch::system_time(&options["at"])?,
                            fill,
                        )
                    } else {
                        generator.generate_uuid_v7_with_random_fill(
                            super::dispatch::number(&options["at"]),
                            fill,
                        )
                    }
                })
            };
            if let Some(length) = required {
                return Ok(json!({"drawRequired":length}));
            }
            Ok(json!(result?.as_uuid_bytes()))
        }
        "bounds" => {
            let start = args[0]
                .as_u64()
                .ok_or_else(|| invalid(ErrorCode::InvalidTimestamp))?;
            let end = if args[1].is_null() {
                None
            } else {
                Some(
                    args[1]
                        .as_u64()
                        .ok_or_else(|| invalid(ErrorCode::InvalidTimestamp))?,
                )
            };
            let bounds = uuid_slug::uuid_v7_bounds(start, end)?;
            Ok(
                json!({"startInclusive":bounds.start_inclusive.as_uuid_bytes(),"endInclusive":bounds.end_inclusive.as_uuid_bytes()}),
            )
        }
        "migration" | "candidates" => {
            let codec = objects
                .codecs
                .get(codec.ok_or_else(|| invalid(ErrorCode::InvalidOptions))?)
                .ok_or_else(|| invalid(ErrorCode::InvalidOptions))?;
            let decoder =
                codec.create_uuid_slug_migration_decoder(uuid_slug::UuidSlugMigrationOptions {
                    accept_original_masked_slug: request["original"] == true,
                    accept_plain_uuid_slug: request["plain"] == true,
                });
            let format = match args[1].as_str() {
                None => None,
                Some("seeded-mask") => Some(uuid_slug::UuidSlugMigrationFormat::CurrentMaskedSlug),
                Some("fixed-mask") => Some(uuid_slug::UuidSlugMigrationFormat::OriginalMaskedSlug),
                Some("plain-slug") => Some(uuid_slug::UuidSlugMigrationFormat::PlainUuidSlug),
                _ => return Err(invalid(ErrorCode::InvalidUuidSlug)),
            };
            let input = args[0]
                .as_str()
                .ok_or_else(|| invalid(ErrorCode::InvalidUuidSlug))?;
            if method == "migration" {
                Ok(json!(
                    decoder.uuid_slug_to_uuid(input, format)?.as_uuid_bytes()
                ))
            } else {
                Ok(json!(
                    decoder
                        .uuid_slug_to_uuid_candidates(input, format)?
                        .iter()
                        .map(|v| v.as_uuid_bytes())
                        .collect::<Vec<_>>()
                ))
            }
        }
        _ => {
            let uuid = uuid(
                &args[0],
                request["source"].as_str().unwrap_or("universal"),
                &request["offset"],
                objects,
                codec,
            )?;
            match method {
                "bytes" => Ok(json!(uuid.as_uuid_bytes())),
                "write" => {
                    let mut storage = bytes(&args[1])?;
                    let result = index(&args[2])
                        .and_then(|offset| uuid.write_uuid_bytes(&mut storage, offset));
                    Ok(match result {
                        Ok(()) => json!({"storage":storage}),
                        Err(error) => {
                            json!({"storage":storage,"error":error.code().as_str(),"message":error.to_string()})
                        }
                    })
                }
                "text" => match args[1].as_str().unwrap_or("lowercase") {
                    "lowercase" => Ok(json!(uuid.to_string())),
                    "uppercase" => Ok(json!(format!("{uuid:X}"))),
                    _ => Err(invalid(ErrorCode::InvalidOptions)),
                },
                "plain" => Ok(json!(uuid.to_plain_uuid_slug(alphabet(&args[1])?).as_str())),
                "mask" => Ok(json!(
                    objects
                        .codecs
                        .get(codec.ok_or_else(|| invalid(ErrorCode::InvalidOptions))?)
                        .ok_or_else(|| invalid(ErrorCode::InvalidOptions))?
                        .uuid_to_masked_slug(uuid)?
                        .as_str()
                )),
                "maskBytes" => Ok(json!(
                    objects
                        .codecs
                        .get(codec.ok_or_else(|| invalid(ErrorCode::InvalidOptions))?)
                        .ok_or_else(|| invalid(ErrorCode::InvalidOptions))?
                        .uuid_to_masked_bytes(uuid)?
                        .as_masked_uuid_bytes()
                )),
                "timestamp" => Ok(json!(uuid.extract_uuid_v7_unix_ms()?)),
                "version" => Ok(json!(uuid.uuid_version())),
                "payload" => payload(uuid, &args[1]),
                "inspect" => Ok(
                    json!({"uuid":uuid.to_string(),"version":uuid.uuid_version(),
                    "variant":match uuid.uuid_variant(){uuid_slug::UuidVariant::Ncs=>"ncs",uuid_slug::UuidVariant::Rfc=>"rfc",uuid_slug::UuidVariant::Microsoft=>"microsoft",uuid_slug::UuidVariant::Future=>"future"},
                    "unixMs":uuid.extract_uuid_v7_unix_ms().ok(),"isNil":uuid==uuid_slug::NIL_UUID,"isMax":uuid==uuid_slug::MAX_UUID}),
                ),
                "validate" => {
                    UuidV7TimestampWindow {
                        reference_unix_ms: super::dispatch::number(&args[1]["referenceUnixMs"]),
                        max_timestamp_delta_ms: super::dispatch::number(
                            &args[1]["maxTimestampDeltaMs"],
                        ),
                    }
                    .validate_uuid_v7(uuid)?;
                    Ok(args[0].clone())
                }
                _ => Err(invalid(ErrorCode::InvalidOptions)),
            }
        }
    }
}

pub fn evaluate(request: &Value) -> Value {
    super::test_callbacks::begin(request);
    let result = OBJECTS.with(|objects| match run(request, &mut objects.borrow_mut()) {
        Ok(value) => json!({"result":value}),
        Err(error) => json!({"failure":{"code":error.code().as_str(),"message":error.to_string()}}),
    });
    super::test_callbacks::pending().map_or(result, |callback| json!({"callback":callback}))
}
