# Changelog

Notable changes per release, newest first. This file is the source of the GitHub Release
notes: the section for a version is published verbatim when its tag is pushed.

## [0.4.0] - 2026-09-08

### Breaking changes

- Codec construction now requires an explicit private mask or `PUBLIC_MASK_SCHEMA`; the public
  schema is never selected by omission. `defaultCodec`, `DEFAULT_MASK_SCHEMA`, and Rust default
  codec options are removed.
- Plain generation stays on the module functions or an explicitly retained generator. Codec
  instances now expose only keyed masking, sentinels, freshness, and opt-in migration; use
  `codec.migration({ plain: true })` to read old plain slugs.
- Codec generator injection now accepts the byte-generation capability it uses. Keep a full
  generator separately when calling its string or explicit-timestamp methods.
- UUID and slug brands now reject unchecked strings and bytes. Guards accept unknown input, owned
  byte operations return version-specific types, and caller-buffer operations preserve the exact
  supplied array subtype while rejecting offsets without a destination.
- UUID generators and configured codec construction return `UuidSlugError | T` instead of throwing. Rust alphabet helpers accept and return fixed 16-byte arrays for UUID payloads.
- Remove the generic base64url helpers and `Base64UrlString`; use `formatUuidSlug`, `parseUuidSlug`, and the exact 22-character `isUuidSlug` case instead.

### Added

- `createCustomMaskSchema` adapts caller-defined reversible transforms into opaque TypeScript
  schema handles. Each TypeScript callback returns transformed bytes or a package error instead of
  managing a destination buffer. Rust callers use separate forward and reverse callbacks with
  `MaskSchema::custom`, or select the deterministic published schema with `public_mask_schema()`.
- Classify TypeScript errors across realms and duplicate package copies with `isUuidSlugError`; Rust schema derivation now returns an opaque future so callers do not depend on scheduler state.
- Publish TypeScript source for Bun and opt-in development tooling; other runtimes receive minified JavaScript with self-contained source maps.
- Use the Rust `uuid-slug` crate for UUID generation, plain encoding, keyed masking, sentinels, key rotation, migration and freshness checks. Browser generation uses the optional `wasm-js` feature; pure conversion and masking can run without platform entropy.
- Select `maskedSlugAlphabet: "base32hex"` for lowercase masked filenames: 27 characters for masked values and 26 for raw sentinels. Decoding retains existing base64url spellings and key material. Masked output has no chronological ordering guarantee.
- Rust callers can decode base64url into caller-owned storage and use first-result migration without allocating a candidate list.

### Fixed

- Fall back to matching portable UUID generation when an optional native string, slug, or byte
  generator fails, while preserving both causes if the fallback also fails.
- Leave portable UUIDv7 sequence state unchanged when entropy fails, so a failed attempt cannot corrupt retry state.
- Restrict base64url byte helpers to one 16-byte UUID payload and reject every other length.
- Leave caller-owned storage unchanged when UUID or plain-slug parsing rejects invalid input.

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
