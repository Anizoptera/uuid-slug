# Remaining work

## Runtime support

- [ ] Publish the Rust crate's first version. crates.io trusted publishing needs an existing crate, so this needs the maintainer's crates.io token as `CRATES_IO_BOOTSTRAP_TOKEN` (`dev/release.md` §Publication and recovery).
- [ ] Decide later whether to also publish to JSR, where Deno can load the TypeScript source; it needs a ruling against the one-npm-package rule in `dev/cross-language.md`, a condition-free Deno entry and slow-types checks.
- [ ] Propose the Aponte agent-gotcha rule (packed-consumer checks must match real install layout) and write it only with approval.

## Follow-up

- [ ] Only with explicit named-call authorization, resolve the full-lane Node `Uuid.toMaskedSlug(codec)` timing gap without weakening protected calls or budgets. The full lane passes its gate but does not prove parity. Isolated calls and parsed-value sequences do not reproduce the loss; context placement and positional arguments do not repair it.
- [ ] Make `perf:check` stop failing on noise: one full run flagged Node `bytes.base32` 3.8% slower ([1.01, 1.06]) while two isolated reruns of the same revisions gave 0.98 and 0.99. With ~100 rows each tested alone, a chance "resolved" row fails the whole `bun run check`. Fix the decision rule (multiple-comparison correction, or confirm a flagged row in a fresh process before failing), not the budgets. Done when an unchanged-package comparison passes repeatedly and a planted slowdown still fails.
- [ ] When `bun audit` reports them fixed upstream, update `@microsoft/api-extractor` (`sprintf-js` via `argparse ~1.0.9`) and `slugid` (`uuid ^9`). Both are development-only. Never override a benchmark rival's dependencies: that changes what is measured. Diesel alerts (via `uuid64rs`) are dismissed on GitHub as unused code.
- [ ] Decide on a masked binary form for transport that must hide the UUID structure. The masked payload is 132 bits (42-bit time offset, 74 payload bits, 16-bit check), so it needs 17 bytes; 16 bytes would mean a 12-bit check (a wrong key passes about 1 time in 4,096) or a shorter time range. Masked text slugs are unaffected.

## Code reduction

Each item keeps behaviour, public API (`api/typescript.api.d.ts`), speed and bundle size unless noted. Gate each with `bun run check`; items touching a hot path also need the named bench rows on Bun and Node before they land.

### Safe, in priority order (rule breaches first, then the biggest cuts)

- [ ] Build the custom-mask failure error once in `src/mask-handle.ts` and in `applyMix` (`src/payload.ts`); in `src/payload.ts` also format known 16-byte `unmix` blocks with `formatUuidBytesUnchecked`, dropping impossible error checks and the repeated empty-mask guard (~14 lines).
- [ ] Minor tidying: replace `UuidV7GenerationValues` (`src/v7-generator-input.ts`) with `Pick<GenerationOptionValues, "at" | "output" | "outputOffset">`; `#local in codec` without the always-true `&& codec.#local` (`src/masking-codec-protocol.ts`); seed the sync `chain` in `src/mask.ts` like `cooperativeChain`; drop `| undefined` from `HostBuffer` and its `NonNullable` (`src/runtime/portable.ts`); `as number` instead of `?? 0` on fixed blocks in `src/payload.ts`; drop `export` from `UuidVersionOf` and `generateOwnedUuidV4Bytes`.

### Needs a benchmark first (hot path or measured area)

- [ ] Collapse the 7-line text extraction in `src/slug.ts` and `src/masking-codec.ts` to `const text = typeof uuid === "string" ? uuid : readObjectUuidInput(uuid); if (typeof text !== "string") return text;` (~10 lines). Adds a second `typeof` to every string decode; bench `plain.decode` and `masked.decode` first, since `perf:check` cannot see a change this small.
- [ ] Merge the duplicated preset-text branch in `generateUuidV7` (`src/v7-keyless.ts`, ~6 lines) without a non-null assertion; bench v7 text routes (`bench/decisions.md` records wrapper reshapes moving timings).
- [ ] Share the v4/v7 RFC version-digit check in `src/uuid.ts` (~10 lines); adds a call on the non-canonical path only.
- [ ] Share parse/format/case handling between the two `src/migration.ts` read methods (~6 lines); migration has timing and zero-discarded-error budgets.
- [ ] Use one `ownedUuidV7BytesToMaskedSlug` call after copying into scratch (`src/masking-codec.ts`, ~6 lines); bench `masked.encode.bytes`, since a split guard slowed Bun.
- [ ] Share the last-JIT-flag scan in `src/runtime/node.ts` (~4 lines, startup only) without tokenizing `NODE_OPTIONS` unless it mentions jitless.
- [ ] Reuse `writeTimestampWords` from `src/v7-timestamp.ts` in `src/v7-bounds.ts` endpoints only (~5 lines); keep the keyless owned-bytes copy inline.
- [ ] Share `seedWordView` between sync and cooperative derivation in `src/mask.ts` (~2 lines, construction only).
- [ ] Fold `bytesToUuidString`'s large-buffer native-hex rule into `formatUuidBytesUnchecked` (`src/uuid.ts`, ~8 lines); rerun WebKit and Chromium formatter rows.
