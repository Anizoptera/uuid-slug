use std::{
    hint::black_box,
    sync::Barrier,
    thread,
    time::{Duration, Instant},
};
use uuid64rs::Uuid as _;

const CALLS: usize = 100_000;

struct FixedRandom;

impl uuid7::generator::RandSource for FixedRandom {
    fn next_u32(&mut self) -> u32 {
        7
    }

    fn next_u64(&mut self) -> u64 {
        7
    }
}

fn valid_text(value: &str, version: u8) {
    let parsed = uuid::Uuid::parse_str(value).expect("generator returned invalid UUID text");
    assert_eq!(parsed.get_version_num(), usize::from(version));
    assert_eq!(parsed.get_variant(), uuid::Variant::RFC4122);
}

fn valid_bytes(value: &[u8; 16], version: u8) {
    let parsed = uuid::Uuid::from_bytes(*value);
    assert_eq!(parsed.get_version_num(), usize::from(version));
    assert_eq!(parsed.get_variant(), uuid::Variant::RFC4122);
}

fn measure<T>(name: &str, version: u8, mut generate: impl FnMut() -> T, inspect: impl Fn(&T)) {
    let first = generate();
    inspect(&first);
    black_box(first);
    for round in 0..5 {
        let started = Instant::now();
        for _ in 0..CALLS {
            black_box(generate());
        }
        println!(
            "{}",
            serde_json::json!({
                "kind": "measurement", "name": name, "version": version, "round": round,
                "calls": CALLS, "nsPerCall": started.elapsed().as_nanos() as f64 / CALLS as f64
            })
        );
    }
}

fn measure_batch(name: &str, batch_size: usize, mut generate: impl FnMut()) {
    generate();
    for round in 0..5 {
        let started = Instant::now();
        for _ in 0..CALLS / batch_size {
            generate();
        }
        println!(
            "{}",
            serde_json::json!({
                "kind": "measurement", "name": name, "version": 7, "round": round,
                "calls": CALLS, "batchSize": batch_size,
                "nsPerCall": started.elapsed().as_nanos() as f64 / CALLS as f64
            })
        );
    }
}

fn measure_concurrent(name: &str, factory: &(impl Fn() -> Box<dyn FnMut() + Send> + Sync)) {
    const THREADS: usize = 4;
    for round in 0..5 {
        let ready = Barrier::new(THREADS + 1);
        let start = Barrier::new(THREADS + 1);
        let elapsed = thread::scope(|scope| {
            let mut handles = Vec::with_capacity(THREADS);
            for _ in 0..THREADS {
                handles.push(scope.spawn(|| {
                    let mut generate = factory();
                    ready.wait();
                    start.wait();
                    for _ in 0..CALLS / THREADS {
                        black_box(generate());
                    }
                }));
            }
            ready.wait();
            let started = Instant::now();
            start.wait();
            for handle in handles {
                handle.join().unwrap();
            }
            started.elapsed()
        });
        println!(
            "{}",
            serde_json::json!({
                "kind": "contention", "name": name, "version": 7, "round": round,
                "threads": THREADS, "calls": CALLS,
                "nsPerCall": elapsed.as_nanos() as f64 / CALLS as f64
            })
        );
    }
}

fn probe_behavior() {
    let mut package = uuid_slug::UuidV7Generator::new().with_clock_rollback_policy(
        uuid_slug::UuidV7ClockRollbackPolicy::Error { tolerance_ms: 0 },
    );
    let fill = |bytes: &mut [u8]| {
        bytes.fill(7);
        Ok(())
    };
    let first = package
        .generate_uuid_v7_with_random_fill(2_000.0, fill)
        .unwrap();
    let second = package
        .generate_uuid_v7_with_random_fill(2_000.0, fill)
        .unwrap();
    assert_ne!(first.as_uuid_bytes(), second.as_uuid_bytes());
    assert_eq!(
        package
            .generate_uuid_v7_with_random_fill(1_999.0, fill)
            .unwrap_err()
            .code(),
        uuid_slug::ErrorCode::InvalidTimestamp
    );
    let entropy_error = uuid_slug::UuidV7Generator::new()
        .generate_uuid_v7_with_random_fill(2_000.0, |_| {
            Err(uuid_slug::Error::new(uuid_slug::ErrorCode::RngUnavailable))
        })
        .unwrap_err();
    assert_eq!(entropy_error.code(), uuid_slug::ErrorCode::RngUnavailable);

    let mut aborting = uuid7::V7Generator::new(FixedRandom);
    aborting.set_rollback_allowance(0);
    assert!(aborting.generate_or_abort_with_ts(2_000).is_some());
    assert!(aborting.generate_or_abort_with_ts(1_999).is_none());

    let epoch = Instant::now();
    let mut nexus = nexus_id::UuidV7::from_entropy(epoch, 2_000);
    for _ in 0..4096 {
        nexus.next(epoch).unwrap();
    }
    assert!(nexus.next(epoch).is_err());
    println!("{{\"kind\":\"behavior\",\"validated\":true}}");
}

fn main() {
    probe_behavior();
    let mut package_v7 = uuid_slug::UuidV7Generator::new();
    measure(
        "package.v4.value",
        4,
        || uuid_slug::generate_uuid_v4().unwrap(),
        |id| valid_text(&id.to_string(), 4),
    );
    measure(
        "package.v7.value",
        7,
        || package_v7.generate_uuid_v7().unwrap(),
        |id| valid_text(&id.to_string(), 7),
    );
    measure("uuid.v4.value", 4, uuid::Uuid::new_v4, |id| {
        valid_bytes(id.as_bytes(), 4)
    });
    measure("uuid.v7.value", 7, uuid::Uuid::now_v7, |id| {
        valid_bytes(id.as_bytes(), 7)
    });
    measure("uuid-lite.v4.value", 4, uuid_lite::Uuid::new_v4, |id| {
        valid_bytes(id.as_bytes(), 4)
    });
    measure("uuid-lite2.v4.value", 4, uuid_lite2::Uuid::new_v4, |id| {
        valid_bytes(id.as_bytes(), 4)
    });
    measure("uuid7.v7.value", 7, uuid7::new_v7, |id| {
        valid_bytes(id.as_bytes(), 7)
    });
    measure("fast-uuid-v7.v7.u128", 7, fast_uuid_v7::gen_id_u128, |id| {
        valid_bytes(&id.to_be_bytes(), 7)
    });
    measure(
        "hyperuuid.v4.value",
        4,
        || hyperuuid::v4::new_v4().unwrap(),
        |id| valid_bytes(id.as_bytes(), 4),
    );
    measure(
        "hyperuuid.v7.value",
        7,
        || hyperuuid::v7::now_v7().unwrap(),
        |id| valid_bytes(id.as_bytes(), 7),
    );
    measure("uuidv7.v7.bytes", 7, uuidv7::create_raw, |id| {
        valid_bytes(id, 7)
    });
    measure("leachuuid7.v7.value", 7, leachuuid7::Uuid7::new, |id| {
        valid_bytes(id.as_bytes(), 7)
    });
    measure("nativelite-uid.v7.value", 7, uid::uuid7, |id| {
        valid_bytes(id.as_bytes(), 7)
    });
    let mut nexus_v4 = nexus_id::UuidV4::from_entropy();
    let epoch = Instant::now();
    let mut nexus_v7 = nexus_id::UuidV7::from_entropy(epoch, 1_700_000_000_000);
    let mut nexus_calls = 0u64;
    measure(
        "nexus-id.v4.value",
        4,
        || nexus_v4.next(),
        |id| valid_text(id.as_str(), 4),
    );
    measure(
        "nexus-id.v7.value",
        7,
        || {
            let now = epoch + Duration::from_millis(nexus_calls / 4096);
            nexus_calls += 1;
            nexus_v7.next(now).unwrap()
        },
        |id| valid_text(id.as_str(), 7),
    );
    measure(
        "rivid-core.v7.bytes",
        7,
        rivid_core::uuidv7::generate_bytes16,
        |id| valid_bytes(id, 7),
    );
    measure("id-forge.v4.value", 4, id_forge::uuid::Uuid::v4, |id| {
        valid_text(&id.to_string(), 4)
    });
    measure("id-forge.v7.value", 7, id_forge::uuid::Uuid::v7, |id| {
        valid_text(&id.to_string(), 7)
    });
    measure(
        "philiprehberger-id-gen.v7.value",
        7,
        philiprehberger_id_gen::Uuid7::new,
        |id| valid_bytes(&id.to_bytes(), 7),
    );
    measure("rok-ids.v7.value", 7, rok_ids::UuidV7::generate, |id| {
        valid_bytes(id.as_bytes(), 7)
    });
    let qubit_v4 = qubit_id::uuid::UuidV4Generator::new();
    measure(
        "qubit-id.v4.value",
        4,
        || qubit_v4.generate().unwrap(),
        |id| valid_bytes(id.as_bytes(), 4),
    );
    measure("uuidv4.v4.text", 4, uuidv4::uuid::v4, |id| {
        valid_text(id, 4)
    });
    measure(
        "uniqer-rs.v4.text",
        4,
        || uniqer_rs::Uniqer::new().uuidv4().unwrap(),
        |id| valid_text(id, 4),
    );
    measure(
        "uniqer-rs.v7.text",
        7,
        || uniqer_rs::Uniqer::new().uuidv7().unwrap(),
        |id| valid_text(id, 7),
    );
    measure(
        "uuid64rs.v4.base64",
        4,
        || uuid64rs::Uuid4::new(None).as_base64(),
        |slug| assert_eq!(slug.len(), 22),
    );
    measure(
        "package.v4.base64url",
        4,
        || {
            uuid_slug::generate_uuid_v4()
                .unwrap()
                .to_plain_uuid_slug(uuid_slug::UuidSlugAlphabet::Base64Url)
        },
        |slug| {
            assert_eq!(
                uuid_slug::Uuid::from_plain_uuid_slug(slug.as_str())
                    .unwrap()
                    .uuid_version(),
                4
            )
        },
    );
    measure(
        "uuid-extra.v4.base64url",
        4,
        uuid_extra::new_v4_b64url_nopad,
        |slug| valid_bytes(uuid_extra::from_b64url_nopad(slug).unwrap().as_bytes(), 4),
    );
    measure(
        "uuid-extra.v7.base64url",
        7,
        uuid_extra::new_v7_b64url_nopad,
        |slug| valid_bytes(uuid_extra::from_b64url_nopad(slug).unwrap().as_bytes(), 7),
    );
    let mut package_slug_generator = uuid_slug::UuidV7Generator::new();
    measure(
        "package.v7.base64url",
        7,
        || {
            package_slug_generator
                .generate_uuid_v7_at_unix_ms(1_700_000_000_000.0)
                .unwrap()
                .to_plain_uuid_slug(uuid_slug::UuidSlugAlphabet::Base64Url)
        },
        |slug| {
            assert_eq!(
                uuid_slug::Uuid::from_plain_uuid_slug(slug.as_str())
                    .unwrap()
                    .uuid_version(),
                7
            )
        },
    );
    let mut package_batch_generator = uuid_slug::UuidV7Generator::new();
    let mut package_batch = [0u8; 16 * 256];
    measure_batch("package.v7.caller-batch", 256, || {
        for chunk in package_batch.chunks_exact_mut(16) {
            package_batch_generator
                .generate_uuid_v7_at_unix_ms(1_700_000_000_000.0)
                .unwrap()
                .write_uuid_bytes(chunk, 0)
                .unwrap();
        }
        black_box(&package_batch);
    });
    let mut hyperuuid_batch = [0u8; 16 * 256];
    measure_batch("hyperuuid.v7.caller-batch", 256, || {
        hyperuuid::v7::new_v7_batch(1_700_000_000_000, 256, &mut hyperuuid_batch).unwrap();
        black_box(&hyperuuid_batch);
    });
    let mut rivid_batch = [0u8; 16 * 256];
    measure_batch("rivid-core.v7.caller-batch", 256, || {
        rivid_core::uuidv7::fill_secure(&mut rivid_batch).unwrap();
        black_box(&rivid_batch);
    });
    measure_concurrent("package.v7.per-thread", &|| {
        let mut generator = uuid_slug::UuidV7Generator::new();
        Box::new(move || {
            black_box(generator.generate_uuid_v7().unwrap());
        })
    });
    measure_concurrent("uuid7.v7.global", &|| {
        Box::new(|| {
            black_box(uuid7::new_v7());
        })
    });
    measure_concurrent("nativelite-uid.v7.global", &|| {
        Box::new(|| {
            black_box(uid::uuid7());
        })
    });
    measure_concurrent("hyperuuid.v7.global", &|| {
        Box::new(|| {
            black_box(hyperuuid::v7::new_v7(1_700_000_000_000).unwrap());
        })
    });
    measure_concurrent("rivid-core.v7.thread-local", &|| {
        Box::new(|| {
            black_box(rivid_core::uuidv7::generate_bytes16());
        })
    });
    println!("{{\"complete\":true}}");
}
