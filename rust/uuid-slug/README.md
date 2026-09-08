# uuid-slug

Convert UUIDs to compact slugs, with optional reversible UUIDv7 masking and lowercase filenames.

The crate is under implementation; publication and full cross-runtime verification are not complete.

```rust
use uuid_slug::{Alphabet, Codec, CodecOptions, Uuid, create_mask_schema};

# fn main() -> Result<(), uuid_slug::Error> {
let uuid = Uuid::parse("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051")?;
let filename = uuid.slug(Alphabet::Base32Hex);
assert_eq!(Uuid::parse_slug(&filename)?, uuid);

let codec = Codec::new(CodecOptions {
    mask: create_mask_schema(b"replace-with-your-own-secret-seed", 1, "current")?,
    masked_slug_alphabet: Alphabet::Base32Hex,
    ..CodecOptions::default()
})?;
let masked = codec.uuid_v7_to_masked_slug(uuid)?;
assert_eq!(codec.masked_slug_to_uuid(&masked)?, uuid);
# Ok(())
# }
```

Plain slugs hold all 128 UUID bits: 22 base64url or 26 lowercase base32hex characters.
Masked slugs hold the same 132-bit payload in 22 base64url or 27 base32hex characters.
Decoding infers the representation; nonzero padding is rejected. Sentinels remain raw UUIDs.

Masking is obfuscation, not authentication or encryption for secrets. Its 16-bit check can accept
an unissued UUID; look up decoded candidates in your own store. Each configured key adds a possible
candidate. The default seed is public. Keep your seed and iteration count to read issued IDs.
Masking accepts UUIDv7 timestamps below 2^42 milliseconds; plain UUIDs have no such restriction.

Keep previous keys while stored identifiers still need them. The current key writes new masks;
previous keys only add read candidates. Install readers for the new key and spelling before
switching writers. A rollback must retain those readers or it can strand newly issued identifiers.
Here, `stored` is an existing slug written with the previous key.

```rust
use uuid_slug::{Codec, CodecOptions, MigrationOptions, create_mask_schema};

# fn main() -> Result<(), uuid_slug::Error> {
let old_key = create_mask_schema(b"previous-private-seed", 1, "previous")?;
let new_key = create_mask_schema(b"replacement-private-seed", 1, "current")?;
# let uuid = uuid_slug::Uuid::parse("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051")?;
# let stored = Codec::new(CodecOptions { mask: old_key.clone(), ..Default::default() })?.uuid_v7_to_masked_slug(uuid)?;
let reader = Codec::new(CodecOptions {
    mask: new_key,
    previous_masks: vec![old_key],
    ..CodecOptions::default()
})?;
let id = reader.masked_slug_to_uuid(&stored)?;
# assert_eq!(id, uuid);
let migration = reader.migration(MigrationOptions {
    original: true,
    plain: true,
});
let candidates = migration.candidates(&stored, None)?;
# assert!(candidates.contains(&uuid));
# Ok(())
# }
```

Use `decode` when one candidate suffices; name a `MigrationFormat` when the stored format is known.
Use `candidates` for explicit lookup across possible formats or keys, and check the result against
your store. Disable each legacy reader only after its stored values are migrated; neither option
enables the unsupported 0.2.0 masked format.

`generation::UuidV7Generator` owns its sequence. `generate()` uses secure platform entropy;
`at()` takes an explicit timestamp without changing the sequence. `generation::uuid_v4()` generates
v4 IDs. Failures return `Error`, retaining the underlying cause. Within-millisecond ordering is
not a cross-language guarantee. IDs are not bearer secrets.

Default feature `os-rng` provides platform entropy. Disable default features for pure conversion,
masking, or caller-supplied entropy. Browser generation additionally requires `wasm-js`.
`schema::create_mask_schema_async` returns a cancelable, bounded-work future without an executor
dependency; its executor must schedule unrelated host tasks between polls.

`uuid` handles strict-guarded parsing and formatting; `data-encoding` handles both alphabets.
`getrandom` remains the fallible entropy source because upstream UUID random constructors panic on
entropy failure. A small stack adapter preserves the mask's four external check bits. This shares
encoding machinery without adding separate architecture-specific dependencies.
