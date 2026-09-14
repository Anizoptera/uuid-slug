# Changelog

Notable changes per release, newest first. This file is the source of the GitHub Release
notes: the section for a version is published verbatim when its tag is pushed.

## Unpublished

### Rust crate

- `uuid-slug` implements the same generation, encoding, masking, sentinel, rotation, migration,
  and timestamp contracts as the npm package. It is not published with 0.4.0.

## [0.4.0]

### Breaking changes

- Rename UUID generation to `generateUuidV4`, `generateUuidV4Bytes`, `generateUuidV4Slug`,
  `generateUuidV7`, `generateUuidV7Bytes`, `generateUuidV7At`, `generateUuidV7BytesAt`, and
  `generateUuidV7Slug`.
- Replace `createUuidSlugCodec` with `createUuidV7SlugCodec`. Codec methods are now
  `generateUuidSlug`, `uuidToSlug`, `uuidSlugToString`, `uuidSlugToBytes`,
  `extractUuidSlugTimestamp`, `validateUuidSlugTimestamp`, and `createMigrationDecoder`.
- Codecs no longer accept a generator or expose keyless generation. Use the module generation
  functions, or `createUuidV7Generator` when the application supplies a clock; entropy stays owned
  by the package.
- Codecs require an explicit private mask or `UUID_V7_TEST_MASK` and default to no sentinels.
  `defaultCodec`, `DEFAULT_MASK_SCHEMA`, and `UUID_V7_SENTINEL_DEFINITIONS` are removed.
- Replace `createMaskSchema` and `createMaskSchemaAsync` with `createUuidV7Mask` and
  `createUuidV7MaskAsync`. Rename `keyIterations` to `keyDerivationIterations`.
- Rename public shapes to their domain: `MaskSchema*` to `UuidV7Mask*`, `UuidSlugCodec*` to
  `UuidV7SlugCodec*`, `UuidSlugMigration` to `UuidSlugMigrationDecoder`, `MigrationFormat` to
  `UuidSlugMigrationFormat`, `FreshValidationOptions` to `UuidV7TimestampWindow`,
  `UuidV7SentinelDefinition` to `UuidV7SentinelConfig`, and `PublicUuidV7Slug` to
  `UuidV7CodecSlug`. The version-neutral `MaskedUuidSlug` export is removed.
- Replace `parseUuid`/`formatUuid` with `uuidToBytes`/`bytesToUuid`, and
  `parseUuidSlug`/`formatUuidSlug` with `slugToBytes`/`bytesToSlug`. Remove the generic base64url
  helpers `encodeBase64Url`, `decodeBase64Url`, and `isBase64Url` together with `Base64UrlString`;
  `bytesToSlug`, `slugToBytes`, and `isUuidSlug` accept the 16-byte UUID payload only.
- Migration readers expose `uuidSlugToString` and `uuidSlugToStringCandidates`. Options and format
  names are now `acceptOriginalMask`, `acceptDirectSlug`, `current-mask`, `original-mask`, and
  `direct-slug`.
- Replace `validateUuidV7Fresh` and `validateUuidV7SlugFresh` with `validateUuidV7Timestamp` and
  `validateUuidV7SlugTimestamp`. Validation requires `maxTimestampDeltaMs`; only
  `referenceUnixMs` defaults to the current clock. `hasUuidV7Entropy` is removed.
- Expected generation, conversion, masking, and configuration failures return `UuidSlugError | T`.
  Use `isUuidSlugError` instead of relying on `instanceof` or `UuidRuntimeError`.
- Error codes `invalid_mask_schema` and `invalid_base32` are now `invalid_mask` and
  `invalid_base32hex`. An unknown alphabet name returns `invalid_options` instead of
  `invalid_uuid_slug`.
- UUID and slug brands now reject known wrong representations and UUID versions. Owned byte results
  use version-specific brands; writes preserve the caller's `Uint8Array` subtype.
- Replace codec `slugAlphabet` with `outputAlphabet`; it controls masked output and sentinels rather
  than keyless direct slugs.
- Replace public alphabet and error-code arrays with named constants. Array positions were not
  identifiers and made single-value access fragile.

### Added

- Encode UUIDv7 text or bytes through a codec and decode directly into new or caller-owned bytes.
  Failed writes leave caller storage unchanged.
- Use `createCustomUuidV7Mask` to adapt a reversible byte transform into an opaque mask handle.
- Set `outputAlphabet: "base32hex"` for lowercase masked filenames. Writers emit 27-character
  masked slugs and 26-character sentinels; readers continue to accept base64url spellings.
- Bun, Deno, and the `development` condition load the published TypeScript source. Other consumers
  load compiled ESM.
- Read UUIDv7 timestamps from text, direct slugs, or bytes with `extractUuidV7Timestamp`; use the
  codec method for masked slugs and sentinels.
- Export named alphabet, migration-format, and error-code constants with their union types, plus
  byte guards for runtime validation and narrowing.

### Performance

- Encode and decode the 16-byte UUID payload with fixed-size base64url and base32hex routines, and
  delegate to native `toBase64` and `toHex` where a runtime provides them and measures faster.
- Convert canonical UUID text straight to either slug alphabet, without an intermediate byte
  array, where no native encoder exists.
- On Bun, generate UUIDv7 bytes and slugs through the portable generator; it measured faster than
  converting the native result. Native text generation is kept.
- Index sentinels at codec construction so string and byte lookups no longer scan the list.
- Restore the decoded block between previous-key attempts instead of allocating scratch per key,
  and mask codec-owned bytes in place.
- Draw only the entropy bytes the portable UUIDv7 layout consumes, and refill only the random tail
  within one millisecond.
- Reject a wrong UUID version or variant before scanning canonical syntax in the versioned guards.
- Encode string seeds with each runtime's native UTF-8 primitive.

### Fixed

- Fall back to portable UUID generation when an optional native generator fails or returns invalid
  data. Preserve both causes if fallback also fails.
- Preserve UUIDv7 sequence state and caller-owned storage after failed entropy, generation, or
  parsing.
- Reject direct-slug byte input unless it contains exactly one 16-byte UUID.

## [0.3.0] - 2026-09-08

### Breaking changes

- Masking now uses a keyed Feistel construction and a fixed 16-bit check. The 0.2.0 permutation/XOR format and its key derivation differ; retaining the old seed in `previousMasks` alone does not migrate that format.
- Call masked operations through your codec. Bare masked functions and `UUID_V7_SENTINELS` are removed; use `codec.sentinels`. Sentinels remain raw, recognizable slugs.
- Replace `legacy.masks` with `previousMasks` for current-format key rotation, and `legacy.directDecode` with `acceptUnmaskedSlugs` for plain slugs. Masked freshness validation is now `codec.validateMaskedSlugFresh`.
- Use standalone functions for plain conversion, parsing and formatting. Replace `slugToUuidBytes` with `parseUuidSlug` and `uuidBytesToSlug` with `formatUuidSlug`. `createRuntimeGenerator` is no longer exported.
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
- Add runtime-specific resource and timing regression checks. Reproducible measurements and their limits are documented in `bench/PERFORMANCE.md`; improvements vary by runtime and workload.

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
