//! Exercise inspection, configuration, rejected input and async jobs outside the basic wire corpus.
use std::{
    future::Future,
    hint::black_box,
    task::{Context, Poll, Waker},
};
use uuid_slug::{
    Uuid, UuidV7Generator, UuidV7MaskDerivationCancellation, UuidV7MaskingCodec,
    UuidV7MaskingCodecOptions, UuidV7PayloadLayout, UuidV7PreviousMask, UuidV7TimestampWindow,
    derive_uuid_v7_mask, derive_uuid_v7_mask_async, uuid_v7_bounds, uuid_v7_test_mask,
};

fn finish<T>(future: impl Future<Output = T>) -> T {
    // This measures future completion in a caller-owned executor, not event-loop responsiveness.
    let mut future = std::pin::pin!(future);
    let mut context = Context::from_waker(Waker::noop());
    loop {
        if let Poll::Ready(value) = future.as_mut().poll(&mut context) {
            return value;
        }
    }
}

pub fn visit(ids: &[Uuid], record: &mut impl super::Recorder) {
    let text: Vec<_> = ids.iter().map(ToString::to_string).collect();
    let compact: Vec<_> = text.iter().map(|s| s.replace('-', "")).collect();
    let urn: Vec<_> = text.iter().map(|s| format!("urn:uuid:{s}")).collect();
    let braced: Vec<_> = text.iter().map(|s| format!("{{{s}}}")).collect();
    let mut cursor = 0;
    macro_rules! scalar {
        ($name:expr, $operation:expr) => {
            record.sample($name, ids, $operation);
        };
    }
    scalar!("inspect/version", |id: Uuid| id.uuid_version());
    scalar!("inspect/variant", |id: Uuid| id.uuid_variant());
    scalar!("inspect/v7", |id: Uuid| id.is_uuid_v7());
    scalar!("inspect/v4", |id: Uuid| id.is_uuid_v4());
    scalar!("timestamp/extract/bytes", |id: Uuid| id
        .extract_uuid_v7_unix_ms()
        .unwrap());
    let layout = UuidV7PayloadLayout::new(0, 42).unwrap();
    scalar!("payload/extract/bytes", |id: Uuid| id
        .extract_uuid_v7_payload(layout)
        .unwrap());
    let window = UuidV7TimestampWindow {
        reference_unix_ms: 0.0,
        max_timestamp_delta_ms: (1u64 << 48) as f64,
    };
    scalar!("timestamp/validate/uuid", |id: Uuid| window
        .validate_uuid_v7(id)
        .unwrap());
    for (name, inputs) in [
        ("parse/compact", &compact),
        ("parse/urn", &urn),
        ("parse/braced", &braced),
        ("parse/universal", &text),
    ] {
        record.sample(name, ids, |_| {
            cursor = (cursor + 1) % inputs.len();
            black_box(Uuid::parse_uuid(black_box(inputs[cursor].as_str())).unwrap());
        });
    }
    let mut out = [0; 20];
    scalar!("bytes/write/offset", |id: Uuid| id
        .write_uuid_bytes(&mut out, 4)
        .unwrap());
    scalar!("bytes/read", |id: Uuid| Uuid::from_uuid_bytes(
        id.as_uuid_bytes(),
        0
    )
    .unwrap());
    scalar!("bounds/one-millisecond", |_: Uuid| uuid_v7_bounds(
        black_box(1_725_000_000_000),
        None
    )
    .unwrap());
    scalar!("bounds/range", |_: Uuid| uuid_v7_bounds(
        black_box(1_725_000_000_000),
        Some(1_725_000_000_001)
    )
    .unwrap());
    scalar!("failure/uuid-parse", |_: Uuid| Uuid::from_uuid_string(
        black_box("not-a-uuid")
    )
    .is_err());
    scalar!("failure/buffer-capacity", |id: Uuid| id
        .write_uuid_bytes(&mut out, 5)
        .is_err());
    scalar!("construct/generator", |_: Uuid| UuidV7Generator::new());
    scalar!("construct/payload-layout", |_: Uuid| {
        UuidV7PayloadLayout::new(black_box(12), 30).unwrap()
    });
    scalar!("construct/mask", |_: Uuid| derive_uuid_v7_mask(
        black_box(b"benchmark-seed-not-for-production"),
        1,
        "bench"
    )
    .unwrap());
    scalar!("construct/mask-iterated", |_: Uuid| derive_uuid_v7_mask(
        black_box(b"benchmark-seed-not-for-production"),
        64,
        "bench"
    )
    .unwrap());
    let mask = uuid_v7_test_mask();
    scalar!("construct/codec-precomputed-mask", |_: Uuid| {
        UuidV7MaskingCodec::new(mask.clone())
    });
    let codec = UuidV7MaskingCodec::new(mask.clone());
    scalar!("construct/migration", |_: Uuid| codec
        .create_uuid_slug_migration_decoder(Default::default()));
    scalar!("construct/custom-mask", |_: Uuid| {
        uuid_slug::UuidV7Mask::from_permutation_functions(
            "bench",
            |bytes| Ok(bytes),
            |bytes| Ok(bytes),
        )
        .unwrap()
    });
    for count in [1, 4, 16, 64] {
        scalar!(&format!("construct/sentinels/{count}"), |_: Uuid| {
            UuidV7MaskingCodec::from_options(UuidV7MaskingCodecOptions {
                sentinels: ids[..count]
                    .iter()
                    .enumerate()
                    .map(|(index, id)| (index.to_string(), *id))
                    .collect(),
                ..UuidV7MaskingCodecOptions::new(mask.clone())
            })
            .unwrap()
        });
    }
    let old = derive_uuid_v7_mask(b"benchmark-previous-key", 1, "previous").unwrap();
    let previous = UuidV7MaskingCodec::new(old.clone());
    let stored: Vec<_> = ids
        .iter()
        .map(|id| previous.uuid_to_masked_slug(*id).unwrap())
        .collect();
    let rotated = UuidV7MaskingCodec::from_options(UuidV7MaskingCodecOptions {
        previous_masks: vec![UuidV7PreviousMask::new(old)],
        ..UuidV7MaskingCodecOptions::new(mask.clone())
    })
    .unwrap();
    record.sample("rotation/previous-key", ids, |_| {
        cursor = (cursor + 1) % stored.len();
        black_box(
            rotated
                .masked_slug_to_uuid(stored[cursor].as_str())
                .unwrap(),
        );
    });
    for iterations in [1, 64] {
        scalar!(&format!("async/future/derive/{iterations}"), |_: Uuid| {
            finish(derive_uuid_v7_mask_async(
                b"benchmark-seed-not-for-production",
                iterations,
                "bench",
                UuidV7MaskDerivationCancellation::default(),
            ))
            .unwrap()
        });
    }
    let cancelled = UuidV7MaskDerivationCancellation::default();
    cancelled.cancel();
    scalar!("async/future/cancelled", |_: Uuid| finish(
        derive_uuid_v7_mask_async(
            b"benchmark-seed-not-for-production",
            64,
            "bench",
            cancelled.clone()
        )
    )
    .is_err());
}
