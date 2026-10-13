# uuid-slug

The crate generates UUIDv4/v7 and encodes any UUID as a 22-character base64url or 26-character base32hex slug.
UUIDv7 fields can be masked with a key; lowercase masked slugs use 27 characters for case-insensitive filenames.

Install the crate from crates.io or this repository.

```rust
use uuid_slug::{UuidSlugAlphabet, Uuid, UuidV7MaskingCodec, UuidV7MaskingCodecOptions, derive_uuid_v7_mask};

# fn main() -> Result<(), uuid_slug::Error> {
let uuid = Uuid::from_uuid_string("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051")?;
let filename = uuid.to_plain_uuid_slug(UuidSlugAlphabet::Base32Hex);
assert_eq!(Uuid::from_plain_uuid_slug(&filename)?, uuid);

let mask = derive_uuid_v7_mask(b"replace-with-your-own-secret-seed", 1, "current")?;
let masking_codec = UuidV7MaskingCodec::new(UuidV7MaskingCodecOptions {
    masked_slug_alphabet: UuidSlugAlphabet::Base32Hex,
    ..UuidV7MaskingCodecOptions::new(mask)
})?;
let masked = masking_codec.uuid_to_masked_slug(uuid)?;
assert_eq!(masking_codec.masked_slug_to_uuid(&masked)?, uuid);
# Ok(())
# }
```

Slug conversions return `PlainUuidSlug`, `MaskedUuidV7Slug`, or
`MaskedOrSentinelUuidV7Slug`, so Rust keeps representations distinct. Borrow one anywhere an
`&str` is accepted, format it with `Display`, or convert it into `String` without copying its text.

Plain slugs preserve all 128 UUID bits without version, variant or timestamp limits.
Masked slugs preserve the 132-bit payload. Decoding infers the representation and rejects nonzero padding.

Masking supports UUIDv7 only. It replaces the recognizable UUIDv7 layout, including its timestamp,
with a keyed reversible payload. Its cryptographic strength is not established.
An incorrect key can pass the 16-bit check and return the wrong UUID; look up decoded records
and check caller access. Each read key adds that risk. Use `uuid_v7_test_mask()` only for examples
and wire fixtures because its seed is public. Keep your private seed and iteration count to read issued IDs.
Masking stores a timestamp offset from `timestamp_range_start_unix_ms` and restores the UUID's
timestamp on decode. The inclusive end is the start plus `MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS`; plain slugs
retain the full UUIDv7 timestamp range. Registered sentinels are always plain slugs and are never masked.

## Key rotation

Keep previous keys while stored identifiers still need them. The current key writes new slugs;
previous keys only add read candidates. Install readers for the new key and spelling before
switching writers. A rollback must retain those readers or it can strand newly issued identifiers.
Here, `stored` is an existing slug written with the previous key.

```rust
use uuid_slug::{
    UuidSlugMigrationOptions, UuidV7MaskingCodec, UuidV7MaskingCodecOptions,
    UuidV7PreviousMask, derive_uuid_v7_mask,
};

# fn main() -> Result<(), uuid_slug::Error> {
let old_key = derive_uuid_v7_mask(b"previous-private-seed", 1, "previous")?;
let new_key = derive_uuid_v7_mask(b"replacement-private-seed", 1, "current")?;
# let uuid = uuid_slug::Uuid::from_uuid_string("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051")?;
# let stored = UuidV7MaskingCodec::new(UuidV7MaskingCodecOptions::new(old_key.clone()))?.uuid_to_masked_slug(uuid)?;
let masking_codec = UuidV7MaskingCodec::new(UuidV7MaskingCodecOptions {
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

Use `uuid_slug_to_uuid` when one candidate suffices; name a `UuidSlugMigrationFormat` when the stored format is known.
Use `uuid_slug_to_uuid_candidates` for explicit lookup across possible formats or keys, and check the result against
your store. Disable each legacy reader only after its stored values are migrated; neither option
enables the unsupported 0.2.0 masked format.

## Generation and timestamps

`UuidV7Generator` owns its sequence. `generate_uuid_v7()` reads the system clock;
`generate_uuid_v7_at(SystemTime)` accepts an exact standard-library time. Both use secure platform
entropy and join the same sequence. Use `generate_uuid_v7_at_unix_ms()` only when a numeric interop
boundary already supplies fractional Unix milliseconds.
The crate accepts every RFC 9562 UUIDv7 and preserves its 74 payload bits. Use
`Uuid::extract_uuid_v7_payload` with `UuidV7PayloadLayout` only when the generator's leading
fraction and counter widths are known. Every undeclared low bit remains in `remaining`.
`with_sub_millisecond_fraction_bits` assigns 1 through 12 leading payload bits to the clock
fraction; `payload_layout` returns that split and the remaining counter width.
Supplied time fills the configured fraction field. Native current-time generation reads the operating
system's sub-millisecond clock; WebAssembly's built-in clock uses millisecond `Date.now()`, so pass a
fractional reading to `generate_uuid_v7_with_random_fill` when that precision matters.
When the clock stalls or moves backward, the generator advances this logical fraction and then
the millisecond timestamp when needed; extracted fractions can be later than the clock reading.
Successful calls on one generator strictly increase in UUID byte order under the default preserve
policy. Reset-policy calls after their tolerance are outside that sequence.
Use `UuidV7MaskingCodec::extract_masked_uuid_v7_payload` for masked slugs. Masking rejects timestamps outside the codec's
configured range instead of truncating them. Same-millisecond ordering depends on the generator.
`uuid_v7_bounds(start, end)` returns the inclusive lowest and highest UUIDv7 search keys; pass
`None` for one millisecond. Use the bounds only with comparison in UUID wire-byte order.
Preserve-order clock rollback is the default. Use `with_clock_rollback_policy` to reset or return
`InvalidTimestamp` after a chosen total-skew tolerance.
`generate_uuid_v4()` creates random IDs. Failures return `Error`, retaining the underlying cause. Match `Error::code()` against
`ErrorCode`; use `ErrorCode::as_str()` only when a text protocol needs the shared TypeScript
spelling. Use `Display` for the case-specific diagnostic; do not parse its text. Within-millisecond
ordering is not a cross-language guarantee.

## Features

Default feature `os-rng` provides platform entropy. Disable default features for pure conversion,
masking, or caller-supplied entropy. Browser generation additionally requires `wasm-js`.
`derive_uuid_v7_mask_async` returns an opaque, cancelable, bounded-work future without an
executor dependency; its executor must schedule unrelated host tasks between polls.
