# Remaining work

## Runtime support

- [ ] Publish the Rust crate's first version. crates.io trusted publishing needs an existing crate, so this needs the maintainer's crates.io token as `CRATES_IO_BOOTSTRAP_TOKEN` (`dev/release.md` §Publication and recovery).
- [ ] Decide later whether to also publish to JSR, where Deno can load the TypeScript source; it needs a ruling against the one-npm-package rule in `dev/cross-language.md`, a condition-free Deno entry and slow-types checks.
- [ ] Propose the Aponte agent-gotcha rule (packed-consumer checks must match real install layout) and write it only with approval.

## Follow-up

- [ ] Only with explicit named-call authorization, resolve the full-lane Node `Uuid.toMaskedSlug(codec)` timing gap without weakening protected calls or budgets. The full lane passes its gate but does not prove parity. Isolated calls and parsed-value sequences do not reproduce the loss; context placement and positional arguments do not repair it.
- [ ] When `bun audit` reports them fixed upstream, update `@microsoft/api-extractor` (`sprintf-js` via `argparse ~1.0.9`) and `slugid` (`uuid ^9`). Both are development-only. Never override a benchmark rival's dependencies: that changes what is measured. Diesel alerts (via `uuid64rs`) are dismissed on GitHub as unused code.
- [ ] Decide on a masked binary form for transport that must hide the UUID structure. The masked payload is 132 bits (42-bit time offset, 74 payload bits, 16-bit check), so it needs 17 bytes; 16 bytes would mean a 12-bit check (a wrong key passes about 1 time in 4,096) or a shorter time range. Masked text slugs are unaffected.

## Code reduction

Each item keeps behaviour, public API (`api/typescript.api.d.ts`), speed and bundle size unless noted. Gate each with `bun run check`; items touching a hot path also need the named bench rows on Bun and Node before they land.

### Needs a maintainer ruling

- [ ] Limit `encode`/`decodeInto` (`src/alphabet.ts`) to 16-byte payloads: every `src/` caller passes exactly 16 bytes with tail 0 or `OUTER_TAG_BITS`, so the native `toBase64` branch and its Deno probe, the generic encode/decode accumulators and the base32hex 2-bit tail are unreachable in production (~60–70 lines). `bench/decisions.md` §base64/base32 still says to keep native and generic paths "for other lengths"; that text predates the fixed 16-byte writers running first, so rewrite it with the ruling. Drop generic-length tests with it.
- [ ] Decide whether `generateUuidV7Value` (`src/masking-codec.ts`) should use the injected `generateBytes` like the other generation methods; it calls `generateDefaultUuidV7Bytes` directly, so `createUuidV7MaskingCodecWithGenerator` codecs bypass their generator on this method.

### High confidence

- [ ] Delete the fixed 16-byte writers inside `encodePortable` (`src/alphabet.ts`, ~53 lines): `encode` returns before reaching them for every 16-byte shape. Repoint bench cases `portable.base64.encode`/`portable.base32.encode`, which time this unreachable code. Prove reachability with `scripts/prove-guard.ts` planting a throw.
- [ ] Merge the two `bytes.length === 16` blocks in `encode` into one block choosing Latin-1 or `fromCharCode` writers (~5 lines; bench `v4.slug`, `v7.slug`, `v7.base32`, `masked.encode.bytes`).
- [ ] Replace `HEX_DECODE`, `lowercaseHexValue` and `parsedHexValue` (`src/uuid.ts`) with `HEX_NIBBLES` lookups (`> 15` means invalid); both tables agree on every code 0–65535 (~12 lines; bench text-validation rows in `bench/conversion-cases.ts`).
- [ ] Inline single-caller error helpers in `src/errors.ts`: `invalidUuidStringInput`, `invalidUuidSlugInput`, `isError`, `failedFallback` (~26 lines, failure paths only). Update packed-artifact annotation expectations if `failedFallback`'s `NO_SIDE_EFFECTS` disappears.
- [ ] Remove the unreachable `typeof value === "string"` check in `normalizeUuidStringInput` (`src/errors.ts`); keep the one in `normalizeUuidSlugInput`, whose callers do not pre-check.
- [ ] Remove unused re-exports in `src/uuid.ts` (`isUuidSlugError`, `UuidSlugError`, `UuidSlugErrorCode`, `UuidBytes`, `UuidString`) and inline `invalidUuidTextCase`; check the same pattern in `src/slug.ts` and `src/v4.ts`.
- [ ] Replace `parseUuidWithCodec` (`src/uuid-value.ts`) with `(uuid) => parseUuid(uuid, maskingCodec)` at its one caller; type-check with every compiler in `scripts/typescript-compilers.ts`.
- [ ] Collapse the 7-line text extraction in `src/slug.ts` and `src/masking-codec.ts` to `const text = typeof uuid === "string" ? uuid : readObjectUuidInput(uuid); if (typeof text !== "string") return text;` (~10 lines; bench `plain.decode`, `masked.decode`).
- [ ] Replace `SLUG_ALPHABET_CODECS`, `slugLength` and the `reduce` in `src/slug.ts` with direct `SLUG_ALPHABET_BY_LENGTH` entries and a `SLUG_LENGTHS` template; the lookup object breaks the `src/AGENTS.md` rule against runtime lookup objects (~10 lines). Reword the comment that names it.
- [ ] Replace the hand-written invalid-character loop in `src/slug.ts` caller-buffer decoding with `isEncoded` plus `decodeInto` diagnostics (~8 lines); base64url trailing-bit errors there then gain the masked-slug hint the no-buffer path already shows.
- [ ] Hoist the repeated "non-canonical trailing bits" message (`src/alphabet.ts`, `src/slug.ts`) to one scalar constant, as `src/AGENTS.md` requires.
- [ ] In `src/masking-codec.ts`: pass `keylessUuidToBytes` all four arguments instead of branching on `outputOrOutputOffset`; make `createUuidV7MaskingCodec` call `createUuidV7MaskingCodecWithGenerator` instead of repeating its try/catch; build `MASKED_PAIR_GENERATION_OPTIONS` by spreading `UUID_V7_MASKING_CODEC_VALUE_OPTIONS`; merge the `isUuidSlugError`/`isMaskHandle` returns; type `previousMasks` as `UuidV7MaskRange[]`; import `MAX_UUID_V7_UNIX_MS` from `src/v7-timestamp.ts` (~15 lines).
- [ ] Build the custom-mask failure error once in `src/mask-handle.ts` and in `applyMix` (`src/payload.ts`) (~10 lines).
- [ ] In `src/payload.ts`: format known 16-byte `unmix` blocks with `formatUuidBytesUnchecked` and drop the impossible error checks; drop the repeated empty-mask guard (~4 lines).
- [ ] Delete the redundant text-case check in `generatePortableUuidV4` (`src/v4.ts`); every caller passes a resolved case or the default (5 lines; also speeds Node UUIDv4 text without native support).
- [ ] Replace `UuidV7GenerationValues` (`src/v7-generator-input.ts`) with `Pick<GenerationOptionValues, "at" | "output" | "outputOffset">` (4 lines, types only).
- [ ] Minor tidying: `#local in codec` without the always-true `&& codec.#local` (`src/masking-codec-protocol.ts`); seed the sync `chain` in `src/mask.ts` like `cooperativeChain`; drop `| undefined` from `HostBuffer` and its `NonNullable` (`src/runtime/portable.ts`); `as number` instead of `?? 0` on fixed blocks in `src/payload.ts`; drop `export` from `UuidVersionOf` and `generateOwnedUuidV4Bytes`.

### Needs a benchmark first (hot path or measured area)

- [ ] Merge the duplicated preset-text branch in `generateUuidV7` (`src/v7-keyless.ts`, ~6 lines) without a non-null assertion; bench v7 text routes (`bench/decisions.md` records wrapper reshapes moving timings).
- [ ] Share the v4/v7 RFC version-digit check in `src/uuid.ts` (~10 lines); adds a call on the non-canonical path only.
- [ ] Share parse/format/case handling between the two `src/migration.ts` read methods (~6 lines); migration has timing and zero-discarded-error budgets.
- [ ] Use one `ownedUuidV7BytesToMaskedSlug` call after copying into scratch (`src/masking-codec.ts`, ~6 lines); bench `masked.encode.bytes`, since a split guard slowed Bun.
- [ ] Share the last-JIT-flag scan in `src/runtime/node.ts` (~4 lines, startup only) without tokenizing `NODE_OPTIONS` unless it mentions jitless.
- [ ] Reuse `writeTimestampWords` from `src/v7-timestamp.ts` in `src/v7-bounds.ts` endpoints only (~5 lines); keep the keyless owned-bytes copy inline.
- [ ] Share `seedWordView` between sync and cooperative derivation in `src/mask.ts` (~2 lines, construction only).
- [ ] Fold `bytesToUuidString`'s large-buffer native-hex rule into `formatUuidBytesUnchecked` (`src/uuid.ts`, ~8 lines); rerun WebKit and Chromium formatter rows.

### Stale text

- [ ] Fix comments: `src/feistel.ts` says `mask.ts` uses `mix32` (the user is `src/payload.ts`); `src/mask.ts` repeats "at module scope"; merge the detached JSDoc block in `src/runtime/types.ts` into the documented member so editor help shows it.
- [ ] Fix `bench/decisions.md`: the check tag uses `mix32`, not the general HalfSipHash path.
