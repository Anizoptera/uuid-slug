# Using @anizoptera/uuid-slug

Rules for code that calls this package. The README beside this file explains every call; read its section before using an API you have not used.

- Import named functions from the package root; unused exports tree-shake away. Do not deep-import `dist/` or `src/` files.
- Conversions return `T | UuidSlugError` and never throw. Check once at the end of a chain: `typeof result === "string"` for string results, `isUuidSlugError(result)` otherwise. Branch on `error.code`, never on `message`. Only generation called with no argument or only a text-case or alphabet preset throws, and only `rng_unavailable`.
- Store the UUID (text or 16 bytes) as the record's identity. Slugs are spellings of the same 128 bits; convert at the edge, no mapping table.
- Plain slugs (root functions such as `uuidToPlainSlug`) are keyless and work for any UUID version. Masked slugs need a UUIDv7 masking codec from `createUuidV7MaskingCodec` with an explicit mask. `UUID_V7_TEST_MASK` is public and for tests only.
- A 22-character base64url string can be both a valid plain slug and a valid masked slug for different UUIDs. A codec's `uuidTo…` methods read it as masked whenever the mask check passes. When you know the source, call the source-specific method (`plainToMaskedUuidSlug`, `maskedToPlainUuidSlug`) instead. Base32hex lengths differ (26 plain, 27 masked) and never overlap.
- Never change or regenerate a mask that has issued slugs: those slugs would decode to different UUIDs. Rotate by listing the old mask in the codec's `previousMasks`; see README "Masked slugs".
- Need UUID text and a slug for one new ID? Call `generateUuidV7WithPlainSlug` or `codec.generateUuidV7WithMaskedSlug`; do not generate and then convert.
- Module-level `generateUuidV7` promises no ordering between calls. Create a generator with `createUuidV7Generator` when IDs must strictly increase or need a recorded time, clock-rollback policy or sub-millisecond bits.
- Choose base32hex for case-insensitive or filesystem-safe names and UUIDv7 slugs that sort by timestamp; base64url is shorter, and ASCII sorting can reverse nearby timestamps. Masked slugs have no time order.
- Parse once with `parseUuid` when one UUID is inspected or converted several times; use the direct functions for one-off conversions.
