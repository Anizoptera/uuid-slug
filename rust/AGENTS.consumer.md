# Using the uuid-slug crate

Rules for code that calls this crate. The README beside this file and the item docs explain every call; read them before using an API you have not used.

- Keep the default features (`std`, `fast-rng`) for ordinary generation. Enable `uuid-interop` only to convert to or from `uuid::Uuid`; it is off by default and the defaults never compile `uuid`. With `--no-default-features` the crate is `no_std` + `alloc`: supply time and entropy through the `_at_unix_ms` and `_with_random_fill` methods. See README "Features".
- Every fallible call returns `Result<_, uuid_slug::Error>`. Branch on `error.code()`, never on the message text.
- Store `Uuid` (or its 16 bytes) as the record's identity. Slugs are spellings of the same 128 bits; convert at the edge, no mapping table.
- `Uuid::parse_uuid` is the one keyless reader: UUID text, plain slugs, `&str`, `String`, or byte input. Exactly 16 bytes are a raw UUID; other byte lengths are ASCII text, so parse network or file buffers directly instead of validating UTF-8 first.
- Plain slugs (`Uuid::to_plain_uuid_slug`, `Uuid::from_plain_uuid_slug`) are keyless and work for any UUID version. Masked slugs need a `UuidV7MaskingCodec` built from an explicit `UuidV7Mask`; `uuid_v7_test_mask()` is public and for tests only. The type system keeps `MaskedUuidV7Slug` out of keyless parsers; do not route it through `&str` to get around that.
- A 22-character base64url string can be both a valid plain slug and a valid masked slug for different UUIDs. Read stored masked slugs with the codec (`masked_slug_to_uuid`); read stored plain slugs with the keyless parsers. Base32hex lengths differ (26 plain, 27 masked) and never overlap.
- Never change or regenerate a mask that has issued slugs: those slugs would decode to different UUIDs. Rotate through `UuidV7MaskingCodecOptions::previous_masks`; see README "Key rotation".
- Module-level `generate_uuid_v7` promises no ordering between calls. Keep one `UuidV7Generator` when IDs must strictly increase or need a recorded time, clock-rollback policy or sub-millisecond bits.
- Many IDs at once: `generate_uuid_v4_batch(&mut [Uuid])` costs less per ID than repeated `generate_uuid_v4` calls and allocates nothing. Writing a slug once: `uuid.display_plain_uuid_slug(alphabet)` formats into any writer without building a `PlainUuidSlug`; keep `to_plain_uuid_slug` when you store the slug.
- Write into existing buffers with the `_into` methods (`write_uuid_bytes`, `generate_uuid_v4_into`); invalid ranges and failures leave the buffer unchanged.
