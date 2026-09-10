//! Measure varied identifier operations separately from setup and host-bridge overhead.
use std::{hint::black_box, time::Instant};
use uuid_slug::{Alphabet, Codec, CodecOptions, Error, Uuid, create_mask_schema};

fn sample<T>(name: &str, inputs: &[Uuid], mut operation: impl FnMut(Uuid) -> T) {
    // Isolate one operation for allocation attribution without changing its workload.
    static FILTER: std::sync::LazyLock<Option<String>> =
        std::sync::LazyLock::new(|| std::env::var("UUID_SLUG_PROFILE_FILTER").ok());
    if FILTER.as_ref().is_some_and(|filter| !name.contains(filter)) {
        return;
    }
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

#[cfg(feature = "os-rng")]
fn entropy_resources() -> Result<(), Error> {
    use uuid_slug::generation::{UuidV7Generator, fill_os_random, uuid_v4_with};
    // Count calls reaching the real platform source, not the OS's internal refills or syscalls.
    for version in [4, 7] {
        let mut generator = UuidV7Generator::new();
        let (mut draws, mut bytes) = (0, 0);
        let calls = 10_000;
        let started = Instant::now();
        for _ in 0..calls {
            let fill = |out: &mut [u8]| {
                draws += 1;
                bytes += out.len();
                fill_os_random(out)
            };
            black_box(if version == 4 {
                uuid_v4_with(fill)?
            } else {
                generator.generate_with(1000.0, fill)?
            });
        }
        println!(
            "{}",
            serde_json::json!({
                "operation": "generation/platform-source", "version": version,
                "calls": calls, "nsPerCall": started.elapsed().as_nanos() as f64 / calls as f64,
                "draws": draws, "requestedBytes": bytes
            })
        );
    }
    // Include thread startup/join cost; each worker owns its sequence and uses real entropy.
    for threads in [1, 4] {
        let calls = 10_000;
        let started = Instant::now();
        std::thread::scope(|scope| {
            let workers: Vec<_> = (0..threads)
                .map(|_| {
                    scope.spawn(|| -> Result<(), Error> {
                        let mut generator = UuidV7Generator::new();
                        for _ in 0..calls / threads {
                            black_box(generator.generate_with(1000.0, fill_os_random)?);
                        }
                        Ok(())
                    })
                })
                .collect();
            for worker in workers {
                worker.join().expect("benchmark worker panicked")?;
            }
            Ok::<_, Error>(())
        })?;
        println!(
            "{}",
            serde_json::json!({
                "operation": "generation/parallel-platform-source", "threads": threads,
                "calls": calls, "nsPerCall": started.elapsed().as_nanos() as f64 / calls as f64
            })
        );
    }
    Ok(())
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
        ..CodecOptions::new(schema.clone())
    })?;
    let safe = Codec::new(CodecOptions {
        masked_slug_alphabet: Alphabet::Base32Hex,
        ..CodecOptions::new(schema)
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
        compact.masked_slug_to_uuid_v7(&encoded[cursor]).unwrap()
    });
    sample("construct/default", &ids, |_| {
        Codec::new(CodecOptions::new(uuid_slug::public_mask_schema())).unwrap()
    });
    let plain: Vec<String> = ids.iter().map(|id| id.slug(Alphabet::Base64Url)).collect();
    let mut out = [0; 16];
    sample("decode/owned", &ids, |_| {
        cursor = (cursor + 1) % plain.len();
        Alphabet::Base64Url.decode(&plain[cursor]).unwrap()
    });
    sample("decode/caller-buffer", &ids, |_| {
        cursor = (cursor + 1) % plain.len();
        black_box(
            Alphabet::Base64Url
                .decode_to(&plain[cursor], &mut out, 0)
                .unwrap(),
        );
    });
    let migration = compact.migration(Default::default());
    sample("migration/first", &ids, |_| {
        cursor = (cursor + 1) % encoded.len();
        migration.decode(&encoded[cursor], None).unwrap()
    });
    sample("migration/candidates", &ids, |_| {
        cursor = (cursor + 1) % encoded.len();
        migration.candidates(&encoded[cursor], None).unwrap()
    });
    #[cfg(feature = "os-rng")]
    if std::env::var_os("UUID_SLUG_PROFILE_FILTER").is_none() {
        entropy_resources()?;
    }
    println!("{{\"complete\":true}}");
    Ok(())
}
