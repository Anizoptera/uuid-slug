# Changelog

Notable changes per release, newest first. This file is the source of the GitHub Release
notes: the section for a version is published verbatim when its tag is pushed.

## [0.4.0]

### Breaking changes

```diff
- uuidV4()
+ generateUuidV4()
- uuidV7()
+ generateUuidV7()
- uuidV7At(timestamp)
+ generateUuidV7({ at: timestamp })
- createUuidSlugCodec({ mask })
+ createUuidV7MaskingCodec({ mask })
- createMaskSchema({ seed, keyIterations })
+ deriveUuidV7Mask({ seed, keyDerivationIterations })
```

- Byte and plain-slug generators use `generateUuidV4Bytes`, `generateUuidV7Bytes`, `generatePlainUuidV4Slug` and `generatePlainUuidV7Slug`. Use `generateUuidV7WithPlainSlug` when storing both forms.
- Masking requires your private `maskSeed` or a derived `mask`, never both. The default codec, default mask and default sentinels are removed. `UUID_V7_TEST_MASK` is an explicit test key, not a private key.
- Codecs no longer own generators or generate unmasked UUIDs. Use module functions or `createUuidV7Generator`; pass a generator to a codec's generation call when needed.
- Replace `createMaskSchemaAsync` with `deriveUuidV7MaskAsync`, and codec `slugAlphabet` with `maskedSlugAlphabet`.
- Use directional conversions: `uuidStringToBytes`, `bytesToUuidString`, `uuidStringToPlainSlug`, `uuidBytesToPlainSlug`, `plainSlugToUuidString` and `plainSlugToUuidBytes`. `uuidToString`, `uuidToBytes` and `uuidToPlainSlug` accept several UUID representations. `parseUuid` returns a reusable UUID value, not bytes.
- A codec interprets a base64url slug as masked when its check passes, and as plain otherwise. Use explicit plain or masked conversions when the format is known.
- Replace `codec.migration` with `codec.createUuidSlugMigrationDecoder`. Read through `uuidSlugToUuidString` or `uuidSlugToUuidStringCandidates`; enable old formats with `acceptFixedMask` and `acceptPlainSlug`.
- Replace freshness validators with `validateUuidV7StringUnixMs` and `validatePlainUuidV7SlugUnixMs`. Set `maxTimestampDeltaMs` explicitly; `referenceUnixMs` defaults to the current time. `hasUuidV7Entropy` is removed.
- Default generation returns an identifier directly and throws `rng_unavailable` when secure randomness is unavailable. Configured generation, conversions and codec methods return `UuidSlugError` for expected failures. Compatible calls pass preceding errors through unchanged; use `isUuidSlugError` to recognize them.
- TypeScript brands reject known UUID-version and representation mismatches. `MaskedUuidSlug` is removed.
- Use named alphabet, migration-format and error constants instead of arrays. Error codes `invalid_mask_schema` and `invalid_base32` become `invalid_mask` and `invalid_base32hex`. Unknown alphabets and unknown option keys return `invalid_options`.

```diff
- MaskSchema / MaskSchemaOptions / AsyncMaskSchemaOptions
+ UuidV7Mask / UuidV7MaskOptions / AsyncUuidV7MaskOptions
- UuidSlugCodec / UuidSlugCodecOptions
+ UuidV7MaskingCodec / UuidV7MaskingCodecOptions
- UuidSlugMigration / MigrationFormat
+ UuidSlugMigrationDecoder / UuidSlugMigrationFormat
- FreshValidationOptions
+ UuidV7TimestampWindow
- UuidV7SentinelDefinition
+ UuidV7SentinelConfig
- PublicUuidV7Slug
+ MaskedOrSentinelUuidV7Slug
```

### Added

- UUID readers accept mixed-case and compact hexadecimal text, and genuine JavaScript `String` wrappers without calling custom coercion hooks. Writers default to lowercase hyphenated text; use `UUID_TEXT_UPPERCASE` for uppercase.
- Read UUIDs, timestamps and payloads from a larger `Uint8Array` using `byteOffset`. Nonzero offsets on other input forms return `invalid_options`.
- Supply time through `at`; generation preserves the fraction supported by the configured UUIDv7 payload layout. Generators can produce plain slugs and UUID/slug pairs directly.
- Read UUIDv7 timestamps with `extractUuidV7UnixMs`; use codec methods for masked slugs. Masked writers return `invalid_timestamp` beyond their range; `MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS` exposes the limit.
- Decode into new or caller-owned bytes. Owned results are plain `Uint8Array`; writes preserve the caller's buffer subtype and leave its contents unchanged on failure.
- Use `createCustomUuidV7Mask` for a reversible byte transform. Select `BASE32HEX` as `maskedSlugAlphabet` for lowercase filenames: masked slugs use 27 characters and sentinels use 26. Readers also accept base64url.
- Bun, Deno and the `development` export condition load the published TypeScript source; other consumers load compiled ESM.

### Performance and fixes

- Bun uses native default UUIDv7 text and base64url slug generation. Encoding, sentinel lookup and previous-key decoding avoid unnecessary buffers and repeated work.
- If optional native generation throws, portable generation is attempted. Failure of both preserves both causes.
- Failed entropy, generation or parsing leaves generator state and caller storage unchanged. Plain-slug byte conversion accepts exactly one 16-byte UUID.

## [0.3.0] - 2026-09-08

### Breaking changes

- Masking now uses a keyed Feistel construction and a fixed 16-bit check. The 0.2.0 permutation/XOR format and its key derivation differ; retaining the old seed in `previousMasks` alone does not migrate that format.
- Call masked operations through your codec. Bare masked functions and `UUID_V7_SENTINELS` are removed; use `codec.sentinels`. Sentinels remain raw, recognizable slugs.
- Replace `legacy.masks` with `previousMasks` for current-format key rotation, and `legacy.directDecode` with `acceptUnmaskedSlugs` for plain slugs. Masked freshness validation is now `codec.validateMaskedSlugFresh`.
- Use standalone functions for plain conversion, parsing and formatting. Replace `plainSlugToUuidBytes` with `parseUuidSlug` and `uuidBytesToSlug` with `formatUuidSlug`. `createRuntimeGenerator` is no longer exported.
- Custom mask schemas expose `mix(input, output, forward)` instead of permutation/XOR tables. `defineMaskSchema`, `ExplicitMaskSchema`, `LEGACY_MASK_SCHEMA_V1` and configurable `tagBits` are removed from the current-format API.
- Current-format seeds require at least 16 bytes. Masking rejects timestamps at or beyond `2^42` milliseconds; timestamp extraction rejects non-v7 UUIDs. Plain UUID slugs keep the full UUID value.

### Added

- `codec.migration({ original: true, plain: true })` reads original fixed-mask IDs and old plain slugs without changing new output. `decode` returns one UUID candidate; name a known format or use `candidates` for application lookup. Disable each old format independently after migration. This does not add support for the unused 0.2.0 masked format.
- `createMaskSchemaAsync` derives the same keys as the synchronous constructor while yielding to other work. Pass an `AbortSignal` to stop derivation; cancellation returns an `aborted` error carrying the signal's reason.
- Generate or encode plain slugs with `"base32hex"` for 26 lowercase characters ordered by timestamp. Decoding infers the alphabet from the length.
- `uuidV7At` and `uuidV7BytesAt` generate UUIDv7s at a supplied timestamp. Custom generators must implement these methods.
- `keyIterations` controls schema derivation work; keep it with the seed when rotating keys. `UUID_SLUG_ERROR_CODES` and `UuidSlugErrorCode` expose the error contract.

### Performance

- Use available Node and Bun encoding primitives, avoid redundant byte views, and decode rotated-key input once. Freshness checks inspect decoded bytes directly; boolean predicates avoid constructing decoded buffers and discarded errors.
- Add runtime-specific resource and timing regression checks. Reproducible measurements and their limits are documented in `bench/decisions.md`; improvements vary by runtime and workload.

### Fixed

- Preserve raw sentinel slugs during generation and reject masked output that would decode as a different sentinel UUID.
- Return `PublicUuidV7Slug` from masked generation, including its sentinel possibility; callers requiring only `MaskedUuidV7Slug` must handle that case.
- Reject invalid alphabet and destructive mask configuration; preserve custom-mask failures as typed errors with their original cause.
- Honor injected generators in both alphabets and reject invalid explicit timestamps and omitted-buffer offsets.
- Validate finite freshness windows and clock readings; preserve entropy and clock failure causes.
- Validate packed consumers on supported runtimes and declarations with TypeScript 5.7.
- Reject incomplete benchmark reports and mismatched release-retry archives.
- Validate the exact cleaned tarball before publication through publish-clean 0.9.1, without a separate validation pack.

## [0.2.0](https://github.com/Anizoptera/uuid-slug/compare/v0.1.0...v0.2.0) (2026-08-11)

### Features

* create uuid-slug package ([f890276](https://github.com/Anizoptera/uuid-slug/commit/f890276d7dc22f1faa81e26aefe4b86ef998322a))

### Bug Fixes

* pin working tsdown loader dependency ([0002bf1](https://github.com/Anizoptera/uuid-slug/commit/0002bf13d7a7534524be480e76c7957a4d3fe40e))
* use public publish-clean dependency ([073e6c2](https://github.com/Anizoptera/uuid-slug/commit/073e6c24d967f13999cd8500b5c28876f7be9359))
