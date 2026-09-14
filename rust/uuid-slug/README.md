# uuid-slug

Encode any UUID as a 22-character base64url or 26-character base32hex slug. UUIDv7 also supports
reversible masking and 27-character lowercase masked filenames.

Install the crate from crates.io or this repository.

```rust
use uuid_slug::{Alphabet, Codec, CodecOptions, Uuid, create_mask};

# fn main() -> Result<(), uuid_slug::Error> {
let uuid = Uuid::parse("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051")?;
let filename = uuid.slug(Alphabet::Base32Hex);
assert_eq!(Uuid::parse_slug(&filename)?, uuid);

let mask = create_mask(b"replace-with-your-own-secret-seed", 1, "current")?;
let codec = Codec::new(CodecOptions {
    slug_alphabet: Alphabet::Base32Hex,
    ..CodecOptions::new(mask)
})?;
let masked = codec.encode_uuid(uuid)?;
assert_eq!(codec.decode_slug(&masked)?, uuid);
# Ok(())
# }
```

Direct slugs hold all 128 UUID bits: 22 base64url or 26 lowercase base32hex characters.
Masked slugs hold the same 132-bit payload in 22 base64url or 27 base32hex characters.
Decoding infers the representation; nonzero padding is rejected. Sentinels remain raw UUIDs.
Every decoder accepts every value that a supported matching encoder can produce.

Masking supports UUIDv7 only. It replaces the recognizable UUIDv7 layout, including its timestamp,
with a keyed reversible payload. It is obfuscation, not authentication or encryption for secrets.
Its 16-bit check can accept an unissued UUID; look up decoded candidates in your own store. Each
configured key adds a possible candidate. Pass `public_mask()` explicitly only for examples
and wire fixtures because its seed is public. Keep your private seed and iteration count to read issued IDs.
Masking accepts UUIDv7 timestamps through `MAX_MASKED_UUID_V7_UNIX_MS`; direct slugs retain the
full UUIDv7 timestamp range. Registered sentinels are always direct slugs and are never masked.

Keep previous keys while stored identifiers still need them. The current key writes new masks;
previous keys only add read candidates. Install readers for the new key and spelling before
switching writers. A rollback must retain those readers or it can strand newly issued identifiers.
Here, `stored` is an existing slug written with the previous key.

```rust
use uuid_slug::{Codec, CodecOptions, MigrationOptions, create_mask};

# fn main() -> Result<(), uuid_slug::Error> {
let old_key = create_mask(b"previous-private-seed", 1, "previous")?;
let new_key = create_mask(b"replacement-private-seed", 1, "current")?;
# let uuid = uuid_slug::Uuid::parse("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051")?;
# let stored = Codec::new(CodecOptions::new(old_key.clone()))?.encode_uuid(uuid)?;
let reader = Codec::new(CodecOptions {
    previous_masks: vec![old_key],
    ..CodecOptions::new(new_key)
})?;
let id = reader.decode_slug(&stored)?;
# assert_eq!(id, uuid);
let migration = reader.migration_decoder(MigrationOptions {
    original: true,
    direct: true,
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
v4 IDs. Failures return `Error`, retaining the underlying cause. Match `Error::code()` against
`ErrorCode`; use `ErrorCode::as_str()` only when a text protocol needs the shared TypeScript
spelling. Within-millisecond ordering is not a cross-language guarantee. IDs are not bearer secrets.

Default feature `os-rng` provides platform entropy. Disable default features for pure conversion,
masking, or caller-supplied entropy. Browser generation additionally requires `wasm-js`.
`mask::create_mask_async` returns an opaque, cancelable, bounded-work future without an
executor dependency; its executor must schedule unrelated host tasks between polls. The concrete
derivation state is private so scheduling internals do not become caller obligations.

`uuid` handles strict-guarded parsing and formatting; `data-encoding` handles both alphabets.
`getrandom` remains the fallible entropy source because upstream UUID random constructors panic on
entropy failure. A small stack adapter preserves the mask's four external check bits. This shares
encoding machinery without adding separate architecture-specific dependencies.
