# Remaining work

## Joint Rust and TypeScript release preparation

Deliver the same capabilities and identifier formats through APIs natural to each language, with correct and predictable consumer experience first, performance and resource efficiency second, and maintenance simplicity third.

### Design, authority and completion

Preserve issued identifiers, secure entropy, caller ownership and typed failures. Keep Rust's owned `Uuid` value, immutable masking codecs and separately owned mutable generators. Keep one published Rust crate and the dependency-free TypeScript package; keep Rust dependencies when they do the best reasonable job, replacing them only for demonstrated performance or resource gains without quality loss. Keep `std` optional. Prepare the matching version selected by both manifests (currently `0.6.0-dev`, candidate `0.6.0`); do not change release versions as part of preparation.

Derive internals from these requirements; do not change user-visible APIs, behavior, guarantees or risks without a maintainer ruling. Local implementation, investigation, documentation, verification and focused commits on the current branch are authorized. Release versions, tags, pushes, publication, remote settings/secrets and finalization require explicit authorization for each operation; preparation grants none.

This is the sole live plan. Keep dependent repairs with their task and unrelated unfinished work below. Completion requires acceptance evidence tied to its command, revision, features, profile and target, with coverage limits. Replace superseded evidence; retain only what a remaining decision needs. Durable contracts belong in their existing owners.

Current work: resolve the two TypeScript performance investigations, then decide each reduction below independently. Preserve behavior, public declarations, ownership, bundles and resource use. Requalify the historical full workload before choosing a repair; a passing isolated row cannot clear a full-context loss. Retain a reduction only after same-base comparisons and existing all-runtime gates; keep a rejected candidate's reason, not its implementation. Release operations remain held.

### Prepared inputs and limits

The checked code is `4b169a4`; `bench/reports/safe-wire.ohWNSU/full-check-final.json` records the successful `bun run check`. `bench/reports/joint-current-artifacts.LihLzb/refresh.json` binds the development npm/crate archives to their source, hashes and extracted-crate checks. Reuse this evidence only while its inputs match; stable-tag verification is separate.

`bench/decisions.md` owns the fixed-size codec, `uuid` interoperability, boxed storage and O2 selections, their rejected alternatives and measurement limits. Historical native base32 masking costs about 0.8–4.8 ns more; some WASI/decoder comparisons are mixed. Deno base32 parity, other native-platform execution, hosted docs.rs, remote job duration and trusted publishing remain unverified. Keep existing regression gates; missing performance comparisons do not block preparation or authorize new experiments.

### Release holds

- [ ] Authorization required: change to the release version/create its tag only after explicit approval; run the exact-tag preparation gate and review generated release notes before any authorized push/publication.
- [ ] Authorization required: publish both verified artifacts under `dev/release.md`, verify registry bytes, configure trusted publishing, remove/revoke the bootstrap credential and verify remote state. Retain the original package selection and verified archives on partial retries; never move a published tag or omit a selected package. Keep the release draft until destinations, attachments, notes and provenance match.

## Runtime support

- [ ] Decide later whether to also publish to JSR, where Deno can load the TypeScript source; it needs a ruling against the one-npm-package rule in `dev/cross-language.md`, a condition-free Deno entry and slow-types checks.
- [ ] Propose the Aponte agent-gotcha rule (packed-consumer checks must match real install layout) and write it only with approval.

## Follow-up

Competitor audit: `slugid` requires `uuid ^9`, with an unresolved advisory. This is dev-only; keep the upstream graph for comparison rather than silently overriding its dependencies.

- [x] Requalify Node `Uuid.toMaskedSlug(codec)` in the full primary-call workload. Two fresh invocations on Node 26.13.0 and two on Node 24.22.0 pass all 62 comparisons against `c7e5da6^`; parsed-value masking median ratios span 0.983–1.000. No resolved slowdown reproduces, so no source repair is selected. This proves neither parity nor a historical cause; retain ordinary gates and reopen on a corrected full-context failure. Evidence and limits: `bench/decisions.md` §Historical base32 slowdown.
- [x] Requalify the historical Node `bytes.base32` loss with the corrected harness. The same four full-filter invocations pass without dropping another call; median ratios remain 1.019–1.043 and all family-corrected intervals span one. Preserve the earlier 3–5% result as historical, not a diagnosed current defect or disproved observation. No repair or split writer is accepted; the earlier split's Bun/WebKit losses remain relevant. Evidence, exact commands and unresolved limits: `bench/decisions.md` §Historical base32 slowdown.
- [ ] Decide on a masked binary form for transport that must hide the UUID structure. The masked payload is 132 bits (42-bit time offset, 74 payload bits, 16-bit check), so it needs 17 bytes; 16 bytes would mean a 12-bit check (a wrong key passes about 1 time in 4,096) or a shorter time range. Masked text slugs are unaffected.

## Code reduction

Each item must keep behaviour, public API (`api/typescript.api.d.ts`), speed, resource use and bundle size.

These are unaccepted maintenance proposals, not release blockers. `bench/reports/ts-reductions/manifest.json` binds the prepared patch and checks to `e465685`; resource counters do not prove speed or total allocation. Compare each candidate with that same base, then pass the unchanged all-runtime performance/resource gate before applying and committing it. A published baseline can hide offsetting losses. Do not wait for an idle host; use fresh reversed pairs under `bench/methods.md`.

Keep rejected reductions excluded: primitive-string forwarding adds classification without removing decoder work; the configured-tail helper slows Node explicit-time and Deno calls (`bench/decisions.md` §Remaining gaps and their causes); shared RFC checks add dispatch across different v4/v7 paths; CLI and quoted `NODE_OPTIONS` scans need different normalization, and CLI precedence already skips environment parsing. Reopen only with evidence changing those mechanisms.

- [ ] In `src/payload.ts`, format known 16-byte `unmix` candidates with `formatUuidBytesUnchecked` and remove impossible error checks; preserve the migration path's native-hex performance.
- [ ] Evaluate the second-argument case predicate once in each `src/migration.ts` reader; preserve timing and zero-discarded-error budgets. Keep reader-local normalization rather than allocating a tuple or adding callback dispatch to share its few statements.
- [ ] Share `ownedUuidV7BytesToMaskedSlug` after copying into scratch in `src/masking-codec.ts`; reject split-guard shapes that slow Bun `masked.encode.bytes`.
- [ ] Reuse `writeTimestampWords` in `src/v7-bounds.ts` endpoints; keep the keyless owned-bytes copy inline.
- [ ] Share construction-only `seedWordView` between sync/cooperative derivation in `src/mask.ts`.
- [ ] Fold the large-buffer native-hex rule into `formatUuidBytesUnchecked` in `src/uuid.ts`; preserve its measured WebKit/Chromium benefit.
