//! Measure varied identifier operations separately from setup and host-bridge overhead.
use std::{hint::black_box, time::Instant};
use uuid_slug::{
    Error, Uuid, UuidSlugAlphabet, UuidV7MaskingCodec, UuidV7MaskingCodecOptions,
    derive_uuid_v7_mask,
};

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
    use uuid_slug::{UuidV7Generator, fill_os_random_bytes, generate_uuid_v4_with_random_fill};
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
                fill_os_random_bytes(out)
            };
            black_box(if version == 4 {
                generate_uuid_v4_with_random_fill(fill)?
            } else {
                generator.generate_uuid_v7_with_random_fill(1000.0, fill)?
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
            let workers: Vec<_> =
                (0..threads)
                    .map(|_| {
                        scope.spawn(|| -> Result<(), Error> {
                            let mut generator = UuidV7Generator::new();
                            for _ in 0..calls / threads {
                                black_box(generator.generate_uuid_v7_with_random_fill(
                                    1000.0,
                                    fill_os_random_bytes,
                                )?);
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
            Uuid::from_uuid_bytes_array(bytes)
        })
        .collect();
    let mask = derive_uuid_v7_mask(b"benchmark-seed-not-for-production", 1, "bench")?;
    let compact = UuidV7MaskingCodec::new(UuidV7MaskingCodecOptions {
        ..UuidV7MaskingCodecOptions::new(mask.clone())
    })?;
    let safe = UuidV7MaskingCodec::new(UuidV7MaskingCodecOptions {
        masked_slug_alphabet: UuidSlugAlphabet::Base32Hex,
        ..UuidV7MaskingCodecOptions::new(mask)
    })?;
    let reserved = UuidV7MaskingCodec::new(UuidV7MaskingCodecOptions {
        masked_slug_alphabet: UuidSlugAlphabet::Base32Hex,
        sentinels: vec![("reserved".to_owned(), ids[0])],
        ..UuidV7MaskingCodecOptions::new(uuid_slug::uuid_v7_test_mask())
    })?;
    let sentinel = &reserved.sentinels()[0].plain_uuid_slug;
    let uppercase_sentinel = sentinel.to_uppercase();
    // Opaque inputs prevent folding a repeated sentinel lookup into a precomputed UUID.
    sample("sentinel/base32/canonical", &ids, |_| {
        reserved
            .masked_slug_to_uuid(black_box(sentinel.as_str()))
            .unwrap()
    });
    sample("sentinel/base32/uppercase", &ids, |_| {
        reserved
            .masked_slug_to_uuid(black_box(uppercase_sentinel.as_str()))
            .unwrap()
    });
    sample("plain/base64", &ids, |id| {
        id.to_plain_uuid_slug(UuidSlugAlphabet::Base64Url)
    });
    sample("plain/base32", &ids, |id| {
        id.to_plain_uuid_slug(UuidSlugAlphabet::Base32Hex)
    });
    sample("mask/base64", &ids, |id| {
        compact.uuid_to_masked_slug(id).unwrap()
    });
    sample("mask/base32", &ids, |id| {
        safe.uuid_to_masked_slug(id).unwrap()
    });
    let text: Vec<String> = ids.iter().map(ToString::to_string).collect();
    let encoded: Vec<_> = ids
        .iter()
        .map(|id| compact.uuid_to_masked_slug(*id))
        .collect::<Result<_, _>>()?;
    let mut cursor = 0;
    sample("parse/uuid", &ids, |_| {
        cursor = (cursor + 1) % text.len();
        Uuid::from_uuid_string(&text[cursor]).unwrap()
    });
    sample("unmask/base64", &ids, |_| {
        cursor = (cursor + 1) % encoded.len();
        compact.masked_slug_to_uuid(&encoded[cursor]).unwrap()
    });
    sample("construct/default", &ids, |_| {
        UuidV7MaskingCodec::new(UuidV7MaskingCodecOptions::new(
            uuid_slug::uuid_v7_test_mask(),
        ))
        .unwrap()
    });
    let plain_uuid_slugs: Vec<_> = ids
        .iter()
        .map(|id| id.to_plain_uuid_slug(UuidSlugAlphabet::Base64Url))
        .collect();
    let mut out = [0; 16];
    sample("decode/owned", &ids, |_| {
        cursor = (cursor + 1) % plain_uuid_slugs.len();
        UuidSlugAlphabet::Base64Url
            .plain_slug_to_uuid_bytes(&plain_uuid_slugs[cursor])
            .unwrap()
    });
    sample("decode/caller-buffer", &ids, |_| {
        cursor = (cursor + 1) % plain_uuid_slugs.len();
        black_box(
            UuidSlugAlphabet::Base64Url
                .plain_slug_to_uuid_bytes_into(&plain_uuid_slugs[cursor], &mut out, 0)
                .unwrap(),
        );
    });
    let migration = compact.create_uuid_slug_migration_decoder(Default::default());
    sample("migration/first", &ids, |_| {
        cursor = (cursor + 1) % encoded.len();
        migration.uuid_slug_to_uuid(&encoded[cursor], None).unwrap()
    });
    sample("migration/candidates", &ids, |_| {
        cursor = (cursor + 1) % encoded.len();
        migration
            .uuid_slug_to_uuid_candidates(&encoded[cursor], None)
            .unwrap()
    });
    #[cfg(feature = "os-rng")]
    if std::env::var_os("UUID_SLUG_PROFILE_FILTER").is_none() {
        entropy_resources()?;
    }
    println!("{{\"complete\":true}}");
    Ok(())
}
