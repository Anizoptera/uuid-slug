//! Share complete Rust operations across benchmark hosts without duplicating workloads.
mod inspection;
use std::hint::black_box;
use uuid_slug::{
    Error, Uuid, UuidSlugAlphabet, UuidV7MaskingCodec, UuidV7MaskingCodecOptions,
    derive_uuid_v7_mask,
};

/// Preserve each caller's concrete closure and result type through the timing loop.
pub trait Recorder {
    /// Consume every operation result inside the host's timed batch.
    fn sample<T>(&mut self, name: &str, inputs: &[Uuid], operation: impl FnMut(Uuid) -> T);
}

/// Visit the same complete Rust calls in native, WASI and browser benchmark hosts.
pub fn visit(visitor: &mut impl Recorder) -> Result<(), Error> {
    // Keep result consumption inside each operation; the host controls only clocks and batches.
    macro_rules! measure {
        ($name:expr, $inputs:expr, $operation:expr) => {{
            visitor.sample($name, $inputs, $operation);
        }};
    }
    let ids: Vec<Uuid> = (0..64)
        .map(|index| {
            let mut bytes = std::array::from_fn(|i| (i * 19 + index) as u8);
            bytes[0] &= 3;
            bytes[6] = (bytes[6] & 15) | 0x70;
            bytes[8] = (bytes[8] & 63) | 0x80;
            Uuid::from_uuid_bytes_array(bytes)
        })
        .collect();
    #[cfg(feature = "os-rng")]
    {
        // Compare the same complete calls with default features and std + os-rng. Fixed-time
        // callback probes cannot reveal whether clock reads or formatting erase entropy savings.
        use uuid_slug::generate_uuid_v4;
        measure!("generation/v4/bytes", &ids, |_| generate_uuid_v4().unwrap());
        measure!("generation/v4/text", &ids, |_| {
            generate_uuid_v4().unwrap().to_string()
        });
        #[cfg(feature = "std")]
        let mut generator = uuid_slug::UuidV7Generator::new();
        #[cfg(feature = "std")]
        measure!("generation/v7/bytes", &ids, |_| {
            generator.generate_uuid_v7().unwrap()
        });
        #[cfg(feature = "std")]
        measure!("generation/v7/text", &ids, |_| {
            generator.generate_uuid_v7().unwrap().to_string()
        });
        for (alphabet, name) in [
            (UuidSlugAlphabet::Base64Url, "base64url"),
            (UuidSlugAlphabet::Base32Hex, "base32hex"),
        ] {
            measure!(&format!("generation/v4/{name}"), &ids, |_| {
                generate_uuid_v4().unwrap().to_plain_uuid_slug(alphabet)
            });
            #[cfg(feature = "std")]
            measure!(&format!("generation/v7/{name}"), &ids, |_| {
                generator
                    .generate_uuid_v7()
                    .unwrap()
                    .to_plain_uuid_slug(alphabet)
            });
        }
    }
    let mask = derive_uuid_v7_mask(b"benchmark-seed-not-for-production", 1)?;
    let compact = UuidV7MaskingCodec::new(mask.clone());
    let safe = UuidV7MaskingCodec::from_options(UuidV7MaskingCodecOptions {
        masked_slug_alphabet: UuidSlugAlphabet::Base32Hex,
        ..UuidV7MaskingCodecOptions::new(mask)
    })?;
    let reserved = UuidV7MaskingCodec::from_options(UuidV7MaskingCodecOptions {
        masked_slug_alphabet: UuidSlugAlphabet::Base32Hex,
        sentinels: vec![("reserved".to_owned(), ids[0])],
        ..UuidV7MaskingCodecOptions::new(uuid_slug::uuid_v7_test_mask())
    })?;
    let sentinel = &reserved.sentinels()[0].plain_uuid_slug;
    let uppercase_sentinel = sentinel.to_uppercase();
    // Opaque inputs prevent folding a repeated sentinel lookup into a precomputed UUID.
    measure!("sentinel/base32/canonical", &ids, |_| {
        reserved
            .masked_slug_to_uuid(black_box(sentinel.as_str()))
            .unwrap()
    });
    measure!("sentinel/base32/uppercase", &ids, |_| {
        reserved
            .masked_slug_to_uuid(black_box(uppercase_sentinel.as_str()))
            .unwrap()
    });
    measure!("plain/base64", &ids, |id| {
        id.to_plain_uuid_slug(UuidSlugAlphabet::Base64Url)
    });
    measure!("plain/base32", &ids, |id| {
        id.to_plain_uuid_slug(UuidSlugAlphabet::Base32Hex)
    });
    measure!("format/uuid/lowercase", &ids, |id| id.to_string());
    measure!("format/uuid/uppercase", &ids, |id| format!("{id:X}"));
    measure!("mask/base64", &ids, |id| {
        compact.uuid_to_masked_slug(id).unwrap()
    });
    measure!("mask/base32", &ids, |id| {
        safe.uuid_to_masked_slug(id).unwrap()
    });
    // Sentinel-enabled writers may otherwise format an unused collision-check spelling.
    measure!("mask/base32/sentinels", &ids, |id| {
        reserved.uuid_to_masked_slug(id).unwrap()
    });
    let text: Vec<String> = ids.iter().map(ToString::to_string).collect();
    let encoded: Vec<_> = ids
        .iter()
        .map(|id| compact.uuid_to_masked_slug(*id))
        .collect::<Result<_, _>>()?;
    let mut cursor = 0;
    measure!("parse/uuid", &ids, |_| {
        cursor = (cursor + 1) % text.len();
        Uuid::from_uuid_string(&text[cursor]).unwrap()
    });
    measure!("unmask/base64", &ids, |_| {
        cursor = (cursor + 1) % encoded.len();
        compact.masked_slug_to_uuid(&encoded[cursor]).unwrap()
    });
    let encoded_base32: Vec<_> = ids
        .iter()
        .map(|id| safe.uuid_to_masked_slug(*id))
        .collect::<Result<_, _>>()?;
    measure!("unmask/base32", &ids, |_| {
        cursor = (cursor + 1) % encoded_base32.len();
        safe.masked_slug_to_uuid(&encoded_base32[cursor]).unwrap()
    });
    // Reduced builds derive the explicit public test key here; this is not codec-only setup.
    measure!("construct/public-test-mask-and-codec", &ids, |_| {
        UuidV7MaskingCodec::new(uuid_slug::uuid_v7_test_mask())
    });
    let plain_uuid_slugs: Vec<_> = ids
        .iter()
        .map(|id| id.to_plain_uuid_slug(UuidSlugAlphabet::Base64Url))
        .collect();
    let mut out = [0; 16];
    measure!("decode/owned", &ids, |_| {
        cursor = (cursor + 1) % plain_uuid_slugs.len();
        UuidSlugAlphabet::Base64Url
            .plain_slug_to_uuid_bytes(&plain_uuid_slugs[cursor])
            .unwrap()
    });
    measure!("decode/caller-buffer", &ids, |_| {
        cursor = (cursor + 1) % plain_uuid_slugs.len();
        black_box(
            UuidSlugAlphabet::Base64Url
                .plain_slug_to_uuid_bytes_into(&plain_uuid_slugs[cursor], &mut out, 0)
                .unwrap(),
        );
    });
    // Keep each alphabet constant at its call site, as in a consumer selecting one spelling.
    let base32_slugs: Vec<_> = ids
        .iter()
        .map(|id| id.to_plain_uuid_slug(UuidSlugAlphabet::Base32Hex))
        .collect();
    measure!("decode/base32/owned", &ids, |_| {
        cursor = (cursor + 1) % base32_slugs.len();
        UuidSlugAlphabet::Base32Hex
            .plain_slug_to_uuid_bytes(&base32_slugs[cursor])
            .unwrap()
    });
    measure!("decode/base32/caller-buffer", &ids, |_| {
        cursor = (cursor + 1) % base32_slugs.len();
        black_box(
            UuidSlugAlphabet::Base32Hex
                .plain_slug_to_uuid_bytes_into(&base32_slugs[cursor], &mut out, 0)
                .unwrap(),
        );
    });
    let migration = compact.create_uuid_slug_migration_decoder(Default::default());
    let binary: Vec<_> = ids
        .iter()
        .map(|id| compact.uuid_to_masked_bytes(*id))
        .collect::<Result<_, _>>()?;
    for (id, encoded) in ids.iter().zip(&binary) {
        assert_eq!(compact.masked_bytes_to_uuid(encoded.as_bytes())?, *id);
    }
    measure!("mask/binary/owned", &ids, |id| compact
        .uuid_to_masked_bytes(id)
        .unwrap());
    measure!("mask/binary/caller-buffer", &ids, |id| compact
        .uuid_to_masked_bytes_into(id, &mut out, 0)
        .unwrap());
    measure!("unmask/binary/owned", &ids, |_| {
        cursor = (cursor + 1) % binary.len();
        compact
            .masked_bytes_to_uuid(binary[cursor].as_bytes())
            .unwrap()
    });
    measure!("unmask/binary/caller-buffer", &ids, |_| {
        cursor = (cursor + 1) % binary.len();
        compact
            .masked_bytes_to_uuid_bytes_into(binary[cursor].as_bytes(), &mut out, 0)
            .unwrap()
    });
    measure!("unmask/binary/text", &ids, |_| {
        cursor = (cursor + 1) % binary.len();
        compact
            .masked_bytes_to_uuid(binary[cursor].as_bytes())
            .unwrap()
            .to_string()
    });
    measure!("migration/first", &ids, |_| {
        cursor = (cursor + 1) % encoded.len();
        migration.uuid_slug_to_uuid(&encoded[cursor], None).unwrap()
    });
    measure!("migration/first-text", &ids, |_| {
        cursor = (cursor + 1) % encoded.len();
        migration
            .uuid_slug_to_uuid(&encoded[cursor], None)
            .unwrap()
            .to_string()
    });
    measure!("migration/candidates-text", &ids, |_| {
        cursor = (cursor + 1) % encoded.len();
        migration
            .uuid_slug_to_uuid_candidates(&encoded[cursor], None)
            .unwrap()
            .iter()
            .map(ToString::to_string)
            .collect::<Vec<_>>()
    });
    measure!("migration/candidates", &ids, |_| {
        cursor = (cursor + 1) % encoded.len();
        migration
            .uuid_slug_to_uuid_candidates(&encoded[cursor], None)
            .unwrap()
    });
    inspection::visit(&ids, visitor);
    Ok(())
}
