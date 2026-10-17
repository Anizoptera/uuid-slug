# Remaining work

## Runtime support

- [ ] Decide later whether to also publish to JSR, where Deno can load the TypeScript source; it needs a ruling against the one-npm-package rule in `dev/cross-language.md`, a condition-free Deno entry and slow-types checks.
- [ ] Propose the Aponte agent-gotcha rule (packed-consumer checks must match real install layout) and write it only with approval.

## Follow-up

- [ ] Only with explicit named-call authorization, resolve the full-lane Node `Uuid.toMaskedSlug(codec)` timing gap without weakening protected calls or budgets. The full lane passes its gate but does not prove parity. Isolated calls and parsed-value sequences do not reproduce the loss; context placement and positional arguments do not repair it.
- [ ] Fix the Node `bytes.base32` slowdown from `c7e5da6` (16-byte-only alphabet cut). The full-filter check of `c7e5da6^` → `c7e5da6` fails 3 of 3 runs, 3–5% slower (Bonferroni-corrected intervals all above 1; Node 24.22.0, 2026-10-16); single-row reruns gave 0.98–0.99, a different measurement, so it is not noise. Splitting `encode` into per-alphabet entries (`encodeBase64url`, `encodeBase32hex`) does not fix it: the all-runtime gate passed but Bun `masked.base32.encode.bytes` (1.08) and WebKit `bytes.base32` (1.08) came out slower in one run at load average ~23 (2026-10-17). Done when that full-filter check, rerun on the fix against `c7e5da6^`, passes in fresh invocations with no other row slower.
- [ ] When `bun audit` reports them fixed upstream, update `@microsoft/api-extractor` (`sprintf-js` via `argparse ~1.0.9`) and `slugid` (`uuid ^9`). Both are development-only. Never override a benchmark rival's dependencies: that changes what is measured. Diesel alerts (via `uuid64rs`) are dismissed on GitHub as unused code.
- [ ] Decide on a masked binary form for transport that must hide the UUID structure. The masked payload is 132 bits (42-bit time offset, 74 payload bits, 16-bit check), so it needs 17 bytes; 16 bytes would mean a 12-bit check (a wrong key passes about 1 time in 4,096) or a shorter time range. Masked text slugs are unaffected.

## Code reduction

Each item must keep behaviour, public API (`api/typescript.api.d.ts`), speed, resource use and bundle size.

- [ ] In `src/payload.ts`, format known 16-byte `unmix` candidates with `formatUuidBytesUnchecked` and drop their impossible error checks (~10 lines). It replaces `bytesToUuidString`'s native-hex choice on the migration candidate path.
- [ ] Collapse the 7-line text extraction in `src/slug.ts` and `src/masking-codec.ts` to `const text = typeof uuid === "string" ? uuid : readObjectUuidInput(uuid); if (typeof text !== "string") return text;` (~10 lines). Adds a second `typeof` to every string decode.
- [ ] Merge the duplicated preset-text branch in `generateUuidV7` (`src/v7-keyless.ts`, ~6 lines) without a non-null assertion; `bench/decisions.md` records wrapper reshapes moving v7 text timings.
- [ ] Share the v4/v7 RFC version-digit check in `src/uuid.ts` (~10 lines); adds a call on the non-canonical path only.
- [ ] Share parse/format/case handling between the two `src/migration.ts` read methods (~6 lines); migration has timing and zero-discarded-error budgets.
- [ ] Use one `ownedUuidV7BytesToMaskedSlug` call after copying into scratch (`src/masking-codec.ts`, ~6 lines); a split guard here once slowed Bun `masked.encode.bytes`.
- [ ] Share the last-JIT-flag scan in `src/runtime/node.ts` (~4 lines, startup only) without tokenizing `NODE_OPTIONS` unless it mentions jitless.
- [ ] Reuse `writeTimestampWords` from `src/v7-timestamp.ts` in `src/v7-bounds.ts` endpoints only (~5 lines); keep the keyless owned-bytes copy inline.
- [ ] Share `seedWordView` between sync and cooperative derivation in `src/mask.ts` (~2 lines, construction only).
- [ ] Fold `bytesToUuidString`'s large-buffer native-hex rule into `formatUuidBytesUnchecked` (`src/uuid.ts`, ~8 lines); the rule was measured on WebKit and Chromium.

## Last

- [ ] Publish the Rust crate's first version; not planned for now. crates.io trusted publishing needs an existing crate, so this needs the maintainer's crates.io token as `CRATES_IO_BOOTSTRAP_TOKEN` (`dev/release.md` §Publication and recovery).
