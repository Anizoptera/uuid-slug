# uuid-slug

The crate generates UUIDv4/v7 and encodes any UUID as a 22-character base64url or 26-character base32hex slug. UUIDv7 fields can be masked with a key; lowercase masked slugs use 27 characters for case-insensitive filenames.

After the first crates.io publication, install with:

```sh
cargo add uuid-slug
```

Rust 1.97 or newer is required. Before publication, use a local checkout by adding this dependency to your application's `Cargo.toml`, adjusting the repository path:

```toml
[dependencies]
uuid-slug = { path = "../uuid-slug/rust/uuid-slug" }
```

## Generate an ID

With default features, generate a UUIDv7 and derive a URL slug from that same ID. Use `generate_uuid_v4()` instead when you need a random UUID without a timestamp.

```rust
# fn main() -> Result<(), uuid_slug::Error> {
# #[cfg(all(feature = "std", feature = "os-rng"))]
# {
use uuid_slug::{generate_uuid_v7, UuidSlugAlphabet};

let id = generate_uuid_v7()?;
let url_id = id.to_plain_uuid_slug(UuidSlugAlphabet::Base64Url);
println!("UUID: {id}; URL slug: {url_id}");
# }
# Ok(())
# }
```

Both generators return an owned `Uuid`; generation failures propagate with `?`. Module-level UUIDv7 calls do not promise ordering. Use a [created generator](#generation-and-timestamps) when you need a shared sequence or clock policy.

## Convert and mask existing UUIDs

```rust
use uuid_slug::{UuidSlugAlphabet, Uuid, UuidV7MaskingCodec, UuidV7MaskingCodecOptions, derive_uuid_v7_mask};

# fn main() -> Result<(), uuid_slug::Error> {
let uuid = Uuid::from_uuid_string("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051")?;
let filename = uuid.to_plain_uuid_slug(UuidSlugAlphabet::Base32Hex);
assert_eq!(Uuid::from_plain_uuid_slug(&filename)?, uuid);

let mask = derive_uuid_v7_mask(b"replace-with-your-own-secret-seed", 1, "current")?;
let masking_codec = UuidV7MaskingCodec::from_options(UuidV7MaskingCodecOptions {
    masked_slug_alphabet: UuidSlugAlphabet::Base32Hex,
    ..UuidV7MaskingCodecOptions::new(mask)
})?;
let masked = masking_codec.uuid_to_masked_slug(uuid)?;
assert_eq!(masking_codec.masked_slug_to_uuid(&masked)?, uuid);
let binary = masking_codec.uuid_to_masked_bytes(uuid)?;
assert_eq!(masking_codec.masked_bytes_to_uuid(binary.as_ref())?, uuid);
assert_eq!(masking_codec.parse_uuid(&masked)?, uuid);
assert_eq!(masking_codec.parse_uuid(&filename)?, uuid);
# Ok(())
# }
```

Slug conversions return `PlainUuidSlug`, `MaskedUuidV7Slug`, or `MaskedOrSentinelUuidV7Slug`, so Rust keeps representations distinct. Borrow one anywhere an `&str` is accepted, format it with `Display`, or convert it into `String` without copying its text. `Uuid::parse_uuid` reads UUID text or a plain slug when the input can be either. `{:X}` formats uppercase UUID text and `Display` lowercase, both without allocating. `uuid_variant()` returns the RFC 9562 variant.

Parse stored plain-slug text with `text.parse::<PlainUuidSlug>()?`; it validates padding and normalizes base32hex to lowercase without encoding the UUID again. Codec and configuration values support `Debug` while keeping mask keys hidden.

Keyless parsers accept strings, typed plain slugs and their standard borrowed or owned containers through `KeylessUuidText`. They reject typed masked slugs: pass those to their masking codec. For a `MaskedOrSentinelUuidV7Slug`, select its `Sentinel` variant before keyless decoding. A sentinel is a named, reserved UUIDv7 that the codec leaves unmasked.

Custom string wrappers can pass `.as_str()`, but a string no longer tells the compiler whether it was masked. For generic input, use `Input: KeylessUuidText + ?Sized`. To pass the parser as a function pointer with ordinary string coercions, use `let parse: fn(&str) -> Result<Uuid, uuid_slug::Error> = Uuid::parse_uuid`.

Use `UuidV7MaskingCodec::new(mask)` for base64url output with no sentinels or previous keys. Use `UuidV7MaskingCodec::from_options(options)?` to select those settings or a different timestamp range. Both require an explicit mask; only configured construction can return a validation error.

Use `masking_codec.parse_uuid(text)?` when input may be UUID text, a plain slug or a masked slug. Registered sentinels take priority. For ambiguous 22-character text, the first passing mask decides the UUID; plain decoding applies only when every mask rejects it. Callback failures are returned, not retried as plain text. Use `Uuid::from_plain_uuid_slug` or `masked_slug_to_uuid` when you know the source. The returned `Uuid` owns its bytes without retaining the codec or keys.

Plain slugs preserve all 128 UUID bits without version, variant or timestamp limits. Masked text encodes 116 UUIDv7 bits plus a 16-bit check; decoding restores the fixed version and variant bits. Slug decoding infers the alphabet and rejects nonzero padding.

`uuid_to_masked_bytes` returns a 16-byte `MaskedOrSentinelUuidV7Bytes` without text encoding. Borrow its bytes with `as_bytes()` for transport and decode with `masked_bytes_to_uuid`. Registered sentinels retain raw UUID bytes. Binary has a 12-bit check; text has a 16-bit check. Neither check authorizes access.

Use `uuid_to_masked_bytes_into` and `masked_bytes_to_uuid_bytes_into` for caller-owned storage; failure leaves the entire buffer unchanged. Raw UUID conversion accepts every 16-byte value, including masked bytes, so byte content cannot uniquely identify the representation. Choose the reader from the known format.

Masking supports UUIDv7 only. It replaces the recognizable UUIDv7 layout, including its timestamp, with a keyed reversible payload. Its cryptographic strength is not established. An incorrect key can pass the check and return the wrong UUID. Additional read keys can increase false matches. Look up decoded records and check caller access.

Use `uuid_v7_test_mask()` only for examples and wire fixtures because its seed is public. Keep your private seed and iteration count to read issued IDs.

Masking stores a timestamp offset from `timestamp_range_start_unix_ms` and restores the UUID's timestamp on decode. The inclusive end is the start plus `MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS`. Timestamps outside that range are rejected, never truncated. Plain slugs retain the full UUIDv7 timestamp range. Registered sentinels are never masked.

## Interoperability

Convert directly between this crate's `Uuid`, `uuid::Uuid` and `[u8; 16]` with `.into()`. These conversions preserve every bit without allocating or formatting text, including UUID versions and variants this crate does not generate.

The example also needs `uuid` as a direct dependency of your app. If missing, add this under `[dependencies]` in your app's `Cargo.toml`:

```toml
uuid = { version = "1", default-features = false }
```

```rust
use uuid_slug::{Uuid, UuidSlugAlphabet};

# fn main() -> Result<(), uuid_slug::Error> {
let external = uuid::Uuid::from_bytes([0x55; 16]);
let id: Uuid = external.into();
let slug = id.to_plain_uuid_slug(UuidSlugAlphabet::Base64Url);
let restored: uuid::Uuid = Uuid::from_plain_uuid_slug(&slug)?.into();
assert_eq!(restored, external);

let bytes: [u8; 16] = id.into();
assert_eq!(Uuid::try_from(bytes.as_slice())?, id);
# Ok(())
# }
```

`Uuid::try_from(slice)` copies exactly 16 bytes and rejects every other length with `ErrorCode::InvalidBuffer`. For a UUID within a larger buffer, use `Uuid::from_uuid_bytes(buffer, offset)`; the offset is in bytes.

## Caller-owned storage

Decode directly into a packet or database buffer without allocating a byte array on the heap. The returned slice borrows exactly the 16-byte UUID range; the offset is in bytes. Invalid text or an invalid destination range leaves the entire buffer unchanged.

```rust
use uuid_slug::UuidSlugAlphabet;

# fn main() -> Result<(), uuid_slug::Error> {
let mut packet = [0xa5; 24];
let bytes = UuidSlugAlphabet::Base64Url.plain_slug_to_uuid_bytes_into(
    "AZChssPUfl-KmwwdLj9AUQ", &mut packet, 4,
)?;
# assert_eq!(bytes, &[0x01, 0x90, 0xa1, 0xb2, 0xc3, 0xd4, 0x7e, 0x5f, 0x8a, 0x9b, 0x0c, 0x1d, 0x2e, 0x3f, 0x40, 0x51]);
# assert_eq!(&packet[..4], &[0xa5; 4]);
# assert_eq!(&packet[20..], &[0xa5; 4]);
# Ok(())
# }
```

Already have a `Uuid`? Borrow its bytes with `as_uuid_bytes()`, or copy them into an existing buffer with `write_uuid_bytes(&mut buffer, offset)?`.

Generate directly into storage with `generate_uuid_v4_into(&mut buffer, offset)?` or `generate_uuid_v7_into(&mut buffer, offset)?`. For a shared sequence, use `generator.generate_uuid_v7_into`; supplied-time variants are `generate_uuid_v7_at_into` for `SystemTime` and `generate_uuid_v7_at_unix_ms_into` for fractional Unix milliseconds. These calls use the same default secure entropy as ordinary generation and leave the buffer and sequence unchanged on failure. Select a `_with_random_fill` method only when supplying your own entropy provider.

## Key rotation

Keep previous keys while stored identifiers still need them. The current key writes new slugs; previous keys only add read candidates. Install readers for the new key and spelling before switching writers. A rollback must retain those readers or it can strand newly issued identifiers. Here, `stored` is an existing slug written with the previous key.

```rust
use uuid_slug::{
    UuidSlugMigrationOptions, UuidV7MaskingCodec, UuidV7MaskingCodecOptions,
    UuidV7PreviousMask, derive_uuid_v7_mask,
};

# fn main() -> Result<(), uuid_slug::Error> {
let old_key = derive_uuid_v7_mask(b"previous-private-seed", 1, "previous")?;
let new_key = derive_uuid_v7_mask(b"replacement-private-seed", 1, "current")?;
# let uuid = uuid_slug::Uuid::from_uuid_string("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051")?;
# let stored = UuidV7MaskingCodec::new(old_key.clone()).uuid_to_masked_slug(uuid)?;
let masking_codec = UuidV7MaskingCodec::from_options(UuidV7MaskingCodecOptions {
    previous_masks: vec![UuidV7PreviousMask::new(old_key)],
    ..UuidV7MaskingCodecOptions::new(new_key)
})?;
let id = masking_codec.masked_slug_to_uuid(&stored)?;
# assert_eq!(id, uuid);
let migration_decoder = masking_codec.create_uuid_slug_migration_decoder(UuidSlugMigrationOptions {
    accept_original_masked_slug: true,
    accept_plain_uuid_slug: true,
});
let candidates = migration_decoder.uuid_slug_to_uuid_candidates(&stored, None)?;
# assert!(candidates.contains(&uuid));
# Ok(())
# }
```

Use `uuid_slug_to_uuid` when one candidate suffices; name a `UuidSlugMigrationFormat` when the stored format is known. Use `uuid_slug_to_uuid_candidates` for explicit lookup across possible formats or keys, and check the result against your store. Disable each legacy reader only after its stored values are migrated; neither option enables the unsupported 0.2.0 masked format.

## Generation and timestamps

Keep a generator when successive calls must share ordering state. Supplied times join that same sequence:

```rust
# fn main() -> Result<(), uuid_slug::Error> {
# #[cfg(all(feature = "std", feature = "os-rng"))]
# {
use std::time::{Duration, SystemTime};
use uuid_slug::UuidV7Generator;

let mut generator = UuidV7Generator::new();
let recorded_at = SystemTime::UNIX_EPOCH + Duration::from_millis(1_720_000_000_000);
let first = generator.generate_uuid_v7_at(recorded_at)?;
let second = generator.generate_uuid_v7_at(recorded_at)?;
assert!(first < second);
# assert_eq!(first.extract_uuid_v7_unix_ms()?, 1_720_000_000_000);
# }
# Ok(())
# }
```

On a `UuidV7Generator`, `generate_uuid_v7()` reads the system clock and `generate_uuid_v7_at(SystemTime)` takes a supplied time. Both use secure randomness and the same generator sequence. Use `generate_uuid_v7_at_unix_ms()` when another API supplies fractional Unix milliseconds.

### Clock rollback

With the default preserve-order policy, successful calls on one generator strictly increase in UUID byte order. If the clock stalls or moves backward, the generator advances the logical fraction, then the millisecond timestamp when needed. The fraction or timestamp can therefore be ahead of the clock.

Use `with_clock_rollback_policy` to reset or return `InvalidTimestamp` when the total clock rollback exceeds your tolerance. Reset calls beyond that tolerance can move backward. Same-millisecond ordering depends on the generator and is not a cross-language guarantee.

### Sub-millisecond time

`with_sub_millisecond_fraction_bits(bits)` uses `0..=12` leading payload bits for the clock fraction; zero disables it. Supplied times fill that field. `payload_layout()` returns the fraction and counter widths.

Native and WASI generation read the clock through `SystemTime`. Browser WebAssembly with `wasm-js` uses millisecond `Date.now()`. If you have a finer reading, pass fractional Unix milliseconds to `generate_uuid_v7_at_unix_ms()`.

### Inspect payloads

The crate accepts every RFC 9562 UUIDv7 and preserves all 74 payload bits. Pass the generator's known fraction and counter widths to `Uuid::extract_uuid_v7_payload` through `UuidV7PayloadLayout`; the UUID format does not identify them. Unassigned low bits remain in `remaining`. For masked slugs, use `UuidV7MaskingCodec::extract_masked_uuid_v7_payload`.

### Timestamp searches

`uuid_v7_bounds(start, end)` returns the inclusive lowest and highest UUIDv7 search keys. Pass `None` for a single millisecond. Pass the result directly to `BTreeMap::range` or another `RangeBounds<Uuid>` consumer; comparisons must use UUID byte order.

## Errors

Failures return `Error`, retaining any underlying cause. Match `Error::code()` against `ErrorCode`; use `ErrorCode::as_str()` when a text protocol needs the shared TypeScript spelling. `Display` explains the failure. Do not parse its text: messages can change.

```rust
use uuid_slug::{ErrorCode, Uuid};

# fn main() -> Result<(), uuid_slug::Error> {
let user_input = "not-a-uuid";
match Uuid::from_uuid_string(user_input) {
    Ok(id) => println!("{id}"),
    Err(error) if error.code() == ErrorCode::InvalidUuid => {
        eprintln!("Enter UUID text, for example 0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051: {error}");
    }
    Err(error) => return Err(error),
}
# Ok(())
# }
```

## Features

Defaults enable `std` and `fast-rng`. `fast-rng` uses a per-thread ChaCha12 generator seeded from the OS. It reseeds after 64 KB or a native process-ID change; seed failures return `rng_unavailable`.

For an OS draw on every call, disable defaults and enable `os-rng`; `fill_os_random_bytes` always draws directly from the OS. Add `std` for `SystemTime` methods and current-time generation. Browser generation uses `wasm-js`, which includes `std` and `os-rng`.

With default features disabled, the crate uses `no_std` plus `alloc`: conversions, masking, migration, derivation and explicit Unix-millisecond generation remain available. Your target must provide an allocator and pointer-width/8-bit atomics. `std` alone adds standard-library time without an entropy dependency.

Supply entropy through the `_with_random_fill` methods, or enable `os-rng` on a supported host. Custom callbacks must fill every requested byte or return an error. Production IDs require cryptographically secure entropy; successful partial fills cannot be detected.

`derive_uuid_v7_mask_async` limits hashing work per poll and needs no particular executor. The executor must let other host tasks run between polls. Pass `None` when dropping the future is sufficient to stop work. Pass `Some(token.clone())` to cancel through a `UuidV7MaskDerivationCancellation` shared with another task.

For conversions alone, or when your application supplies time and entropy, disable defaults in the dependency declaration:

```toml
[dependencies]
uuid-slug = { path = "../uuid-slug/rust/uuid-slug", default-features = false }
```

For browser WebAssembly generation, add `features = ["wasm-js"]` to that declaration. For WASI generation, use defaults or `features = ["std", "os-rng"]`; the WASI host supplies clock and entropy access. Keep the JavaScript feature for browser integration.

Features select host capabilities and dependencies, independently of UUID version or slug alphabet. A v4-only or v7-only application does not need a per-version feature. Unused functions can be removed from the linked application, but enabling a feature still affects its dependency graph and compilation. Other dependencies can also enable features through Cargo feature unification.
