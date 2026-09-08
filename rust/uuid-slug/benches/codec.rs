//! Measure varied identifier operations separately from setup and host-bridge overhead.
use std::{hint::black_box, time::Instant};
use uuid_slug::{Alphabet, Codec, CodecOptions, Error, Uuid, create_mask_schema};

fn sample<T>(name: &str, inputs: &[Uuid], mut operation: impl FnMut(Uuid) -> T) {
    let iterations = 100_000;
    for id in inputs {
        black_box(operation(*id));
    }
    for round in 0..5 {
        let started = Instant::now();
        for index in 0..iterations {
            black_box(operation(inputs[(index + round) % inputs.len()]));
        }
        println!(
            "{}",
            serde_json::json!({
                "operation": name, "round": round, "calls": iterations,
                "nsPerCall": started.elapsed().as_nanos() as f64 / iterations as f64
            })
        );
    }
}

fn main() -> Result<(), Error> {
    let ids: Vec<Uuid> = (0..64)
        .map(|index| {
            let mut bytes = std::array::from_fn(|i| (i * 19 + index) as u8);
            bytes[0] &= 3;
            bytes[6] = (bytes[6] & 15) | 0x70;
            bytes[8] = (bytes[8] & 63) | 0x80;
            Uuid::from_bytes(bytes)
        })
        .collect();
    let schema = create_mask_schema(b"benchmark-seed-not-for-production", 1, "bench")?;
    let compact = Codec::new(CodecOptions {
        mask: schema.clone(),
        ..Default::default()
    })?;
    let safe = Codec::new(CodecOptions {
        mask: schema,
        masked_slug_alphabet: Alphabet::Base32Hex,
        ..Default::default()
    })?;
    sample("plain/base64", &ids, |id| id.slug(Alphabet::Base64Url));
    sample("plain/base32", &ids, |id| id.slug(Alphabet::Base32Hex));
    sample("mask/base64", &ids, |id| {
        compact.uuid_v7_to_masked_slug(id).unwrap()
    });
    sample("mask/base32", &ids, |id| {
        safe.uuid_v7_to_masked_slug(id).unwrap()
    });
    let text: Vec<String> = ids.iter().map(ToString::to_string).collect();
    let encoded: Vec<String> = ids
        .iter()
        .map(|id| compact.uuid_v7_to_masked_slug(*id))
        .collect::<Result<_, _>>()?;
    let mut cursor = 0;
    sample("parse/uuid", &ids, |_| {
        cursor = (cursor + 1) % text.len();
        Uuid::parse(&text[cursor]).unwrap()
    });
    sample("unmask/base64", &ids, |_| {
        cursor = (cursor + 1) % encoded.len();
        compact.masked_slug_to_uuid(&encoded[cursor]).unwrap()
    });
    sample("construct/default", &ids, |_| {
        Codec::new(CodecOptions::default()).unwrap()
    });
    Ok(())
}
