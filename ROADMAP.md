# Remaining work

## Joint Rust and TypeScript release preparation

Deliver the same capabilities and identifier formats through APIs natural to each language, with correct and predictable consumer experience first, performance and resource efficiency second, and maintenance simplicity third.

### Design, authority and completion

Preserve issued identifiers, secure entropy, caller ownership and typed failures. Keep Rust's owned `Uuid` value, immutable masking codecs and separately owned mutable generators. Keep one published Rust crate and the dependency-free TypeScript package; keep Rust dependencies when they do the best reasonable job, replacing them only for demonstrated performance or resource gains without quality loss. Keep `std` optional. Prepare the matching version selected by both manifests (currently `0.6.0-dev`, candidate `0.6.0`); do not change release versions as part of preparation.

Derive internals from these requirements; do not change user-visible APIs, behavior, guarantees or risks without a maintainer ruling. Local implementation, investigation, documentation, verification and focused commits on the current branch are authorized. Release versions, tags, pushes, publication, remote settings/secrets and finalization require explicit authorization for each operation; preparation grants none.

This is the sole live plan. Keep dependent repairs with their task and unrelated unfinished work below. Completion requires acceptance evidence tied to its command, revision, features, profile and target, with coverage limits. Replace superseded evidence; retain only what a remaining decision needs. Durable contracts belong in their existing owners.

Finish work independent of host load first. For queued authorized timing, check the existing host guard once; on refusal, stop without polling, sleeping or forcing busy-host timing. Machine load is measured by the guard, not a missing maintainer permission. Update tooling and competitors to latest stable releases; refresh package evidence when dependency or build inputs change. Decoder/storage timing and final regression timing remain open; missing comparisons do not block preparation (`dev/release.md` §Evidence and notes). Publication stays gated.

### Performance and resource acceptance

Keep existing regression gates required. Authorized comparisons cover v4/v7 generation, parsing/formatting, both alphabets, masking, rotation, migration and mask construction; run them only when host conditions permit, without making missing comparisons a preparation gate.

- [ ] Finish Rust dependency acceptance from the executed candidates in `bench/decisions.md` §Rust dependency replacement screen: thinner `uuid`, owned text/codec alternatives and combined dependency-free core. Compare complete-call speed and build costs with the recorded correctness/resource evidence, under default/reduced features, native/optimized WASM and the Rust floor. Preserve generation, buffer/error/wire contracts and optional `std`; changing interoperability's feature requirements needs a ruling. Dependency count alone decides nothing. The fixed-size codec replaces `data-encoding` pending speed acceptance; UUID replacement remains undecided. Expand candidates only when new evidence changes the decision.
  - [x] Integrate the fixed-size bit codec and remove `data-encoding` (`d8fbd6c`, `2af6d12`). The final `32c0223` tree passes the independent 25,088-case bit/grammar/buffer corpus per feature selection, canonical-padding guard mutation, allocation replay, native/WASM profiles and extracted-crate floor checks. Single-alphabet consumers discard the other encoding table in native release and optimized WASM; the both-alphabet control retains both. Evidence: `bench/decisions.md` §Rust dependency replacement screen. Complete-call speed acceptance remains held.
  - [x] Integrate the direct upstream ASCII parser (`163e2de`): remove duplicate validation and discarded diagnostic construction. The independent native corpus passes 20,125 cases with default/reduced features; parsing still allocates nothing. Native feature/profile checks and both optimized WebAssembly profiles pass after integration. Keep the dependency and interoperability unchanged; complete-call speed acceptance remains open under the timing hold.
- [ ] After choosing the encoder backend, accept its complete decoder costs for returned-byte/caller-buffer APIs, both alphabets, default/reduced features and masking controls. Preserve error precedence, failure atomicity and surrounding bytes. Use `bun bench/rust.ts --codec` with candidate workspace manifests; `--codec-build` prepares the same calls without timing. If replacing `data-encoding`, compare the selected decoder instead of separately tuning the discarded backend. Account for masking size increases; size or constant-alphabet smoke timing is not acceptance. Evidence: `bench/decisions.md` §Rust linked consumers and interoperability.
  - [x] Prepare the maintained comparison command without timing: baseline and isolated workspace replay the same operations under default/reduced features. Reject source mismatch, missing requested cases, incomplete/invalid records and busy overrides. `scripts/__test__/rust-codec.test.ts` protects record acceptance; removing the round bound fails its regression. Precise comparisons remain held while the device is busy.
- [ ] Finish the owned-storage acceptance by timing complete `String`/`Box<str>` lifecycles with exact-capacity encoding, both alphabets and default/reduced features. Preserve borrowed reads, variant identity, no-copy text transfer and cleanup. Resource evidence: `bench/decisions.md` §Rust linked consumers and interoperability. Caller-buffer/inline/borrowed outputs serve different jobs and cannot substitute for owned results; do not add their APIs or experiments to close this comparison. Boxed slug storage is integrated; speed acceptance remains open.
  - [x] Store immutable slug text as `Box<str>` (`32c0223`). Actual typed collections request 4 KB less storage per 512 slugs than their `String` controls, with no shrink reallocations, across both alphabets, feature selections and plain/masked/sentinel cases. Borrowed reads, variant identity, pointer-preserving `String` transfer and cleanup pass; public declarations remain unchanged. Evidence: `bench/decisions.md` §Rust linked consumers and interoperability. Complete-call speed acceptance remains held.
- [ ] Compare cold initialization, latency, throughput, allocations, retained/per-thread memory, linked size and build cost separately under `bench/methods.md`. State compiler, machine, profile, workload and statistical limits; process RSS does not measure allocation. Reuse the resource evidence in `bench/decisions.md`; rerun only inputs affected by the accepted change.
- [ ] Eliminate unnecessary string round trips, repeated validation/derivation, unrelated outputs, entropy calls and allocations. Accept or reject the byte-based Rust sentinel check after complete-call timing; its isolated resource/collision proof is in `bench/decisions.md` §Rust linked consumers and interoperability. Define rival predictions before measuring remaining mechanisms and automatic policies.
  - [x] Integrate the byte-based sentinel collision check (`080c34a`). Its guard mutation fails the collision regression; restoration passes. Default/reduced allocation replays preserve round trips, variants, pointer-preserving transfer and cleanup, removing the 28 transient base32hex allocations per 512-ID collection. Native and optimized WebAssembly checks pass; complete-call speed acceptance remains open under the timing hold.
- [ ] Pass performance/resource gates for every affected runtime without weakening baselines or budgets. Any TypeScript source change requires `bun run perf:check:all` before commit. Host load must satisfy the existing timing gate; repeated busy-host attempts add no evidence.

### Features, unused code, WebAssembly and WASI

Use features for host capabilities and dependency/build costs, not per-function switches. Ordinary dead-code elimination can remove unreachable Rust code without LTO; explicit WASM exports remain reachable. Inspect consumer artifacts, not the broad development bridge. `no_std` means shared-code portability, not allocation-free APIs or universal embedded support; do not hide duplicate algorithms or large abstractions behind it.

| Selection | Required capability |
| --- | --- |
| Default | Standard-library conveniences and the existing OS-seeded fast RNG |
| `std`, defaults disabled | Standard time with caller-selected entropy |
| `os-rng`, defaults disabled | Direct platform entropy without ChaCha state |
| `wasm-js` | Browser JavaScript clock and entropy integration |
| No default features | `no_std` + `alloc` conversions, masking, migration, derivation and explicit-time/custom-entropy generation |

Repair coupling at shared call boundaries when artifacts retain unrelated code. Do not add v4/v7, masking or per-function switches merely because functions exist; keep standard/reduced routes on one implementation. Pruning is implemented; runtime-cost acceptance remains open above.

### Correctness, entropy and verification

Use the independent oracles below when an accepted change affects their contracts; TypeScript/Rust agreement alone cannot prove correctness. Extend existing checks only for material failures they cannot expose. Construction cost, execution correctness and performance acceptance remain separate.

| Contract | Oracle and failure control |
| --- | --- |
| UUID/slug bits and frozen masks | Issued wire/original-slug fixtures constrain exact bytes and text; published HalfSipHash vectors constrain hashing; one-hot UUID/payload cases expose lost or merged bits. `payload.rs`, `siphash.rs`, `uuid.rs`, shared conformance and legacy probes exercise these independently of mutual agreement. |
| Generic text and canonical alphabets | `uuid.rs` and `alphabet.rs` cases plus the shared corpus cover all version/variant combinations, Unicode lengths, accepted wrappers/case and padding rejection. The padding-guard mutation fails; ordinary and historical alias readers remain separate. |
| Timestamp/layout boundaries | `generation.rs` uses `floor`/`fract` and explicit bucket/endpoints as independent oracles; its fraction-rounding mutation fails. Exact `SystemTime`, rollback high-water state, logical carry and exhaustion are exercised, not inferred from wall-clock samples. |
| Mask meaning, sentinels and migration | Retained overlap/key-overlap fixtures and callback-error cases check first-match priority, source-specific reads, sentinel exceptions, shifted ranges and atomic candidate failure. Wrong-source, swallowed-error and sentinel-bypass mutations fail. |
| Failure atomicity and causes | Generation tests vary partial failed draws and compare retries with unchanged control state. Buffer tests check nonzero surrounding bytes and overflow; moving a write before validation fails its guard proof. Preserve typed causes. Reuse native/browser seed, reseed, thread and fork controls; they do not certify OS randomness, snapshots retaining a PID or unexecuted hosts. |
| Cooperative derivation | Native manual polling covers seed capture and block/iteration boundaries. Browser runs exercise pre/mid cancellation, pending-future drop and real host-task scheduling. These functional checks do not measure synchronous construction cost or certify a worst-case poll duration. |

- [x] Establish local native/browser/WASI correctness, feature/profile/floor checks and 32-bit compilation. Recheck affected lanes after accepted changes with `bun run check:rust` and both profiles of `scripts/rust-wasm.ts`; preserve `.github/workflows/check.yml`'s architecture matrix. Other native architectures and Linux/Windows remain unexecuted locally; compile checks, configured CI and sampled browser polls prove neither their execution nor timing bounds. Stable-tag preparation remains separate.
  - Extracted `32c0223` archive, Rust 1.97.0 release: default/reduced unit suites pass 47/42 cases; each selection passes 8 runnable and 7 compile-fail doctests. Local Linux docsrs checks and no-default `wasm32v1-none` compilation pass. The same source tree passes native feature/profile checks, both optimized browser/WASI profiles and default/reduced debug/release compilation for i686 and ARMv7 Linux. Exact bytes, source matches, commands and dependency graph: `bench/reports/joint-current-artifacts.LihLzb/refresh.json`. Cross-compilation is not other-native-architecture execution; hosted docs.rs and stable-tag verification remain open.

### Documentation and exact-artifact release preparation

- [x] Refresh the development crate from `32c0223`; its SHA-256 is `7226fc67dfb4772fbec56eff5659520c229f8be417adde074198e3f01d2985e1`, with 19 shipped source files matched. Reuse the unchanged validated npm archive and its validator evidence. The current pair, hashes, source matches, metadata, reduced dependency graph and successful extracted tests/docs/portability commands remain in `bench/reports/joint-current-artifacts.LihLzb/refresh.json`. These bytes serve development review; hosted docs.rs and stable-tag preparation remain unverified. Treat crates.io as a first publication; keep internal API comparisons out of consumer notes.

### Final checks and release holds

- [x] Synchronize the Rust competitor workspace's lockfile (`52b109f`): remove only the obsolete `data-encoding` package/edge; both default/all-feature `--locked` checks pass. Rust guidance now requires affected path-consumer lockfiles and checks before commit. On the same code tree, build, API compatibility, format/lint, string/symlink/README checks, both project type checkers, competitor smoke, 389 Node tests and 407 Bun tests pass. Completed Rust and exact-artifact checks above remain valid; product sources are unchanged from `32c0223`. Precise performance checks remain held.
- [x] Complete the remaining non-timing resource gates: Deno's primary-resource test and Chromium's browser-resource script pass their controls and reject the planted result-preserving defects. Node/Bun resource controls and defects pass in the completed test batch. This covers operation counts, not speed. The existing timing preflight refuses the host at load 16.4 versus limit 4; no timed process starts and no retry is scheduled.
- [ ] Run `bun run check` on the accepted code tree when the host is available; every locally executable required check must pass. Keep busy overrides and baseline changes disabled. Apply local feedback budgets and CI headroom from `bench/methods.md` §Regression protection; remote job duration remains unexecuted. Configured CI, source inspection, mutual agreement and aggregate passes cannot prove an unexecuted consumer, target or failure path. Remove passed host-probe bundles immediately.
- [ ] After code acceptance, inspect staged hunks against the request, commit with explicit file lists, preserve unrelated changes, delete task scratch and finish with a clean tree. Keep only evidence serving a retained conclusion or unresolved decision; do not accumulate throwout reports or claim readiness while checks/setup remain unresolved.
- [ ] Authorization required: change to the release version/create its tag only after explicit approval; run the exact-tag preparation gate and review generated release notes before any authorized push/publication.
- [ ] Authorization required: publish both verified artifacts under `dev/release.md`, verify registry bytes, configure trusted publishing, remove/revoke the bootstrap credential and verify remote state. Retain the original package selection and verified archives on partial retries; never move a published tag or omit a selected package. Keep the release draft until destinations, attachments, notes and provenance match.

## Runtime support

- [ ] Decide later whether to also publish to JSR, where Deno can load the TypeScript source; it needs a ruling against the one-npm-package rule in `dev/cross-language.md`, a condition-free Deno entry and slow-types checks.
- [ ] Propose the Aponte agent-gotcha rule (packed-consumer checks must match real install layout) and write it only with approval.

## Follow-up

Competitor audit: `slugid` requires `uuid ^9`, with an unresolved advisory. This is dev-only; keep the upstream graph for comparison rather than silently overriding its dependencies.

- [ ] Only with explicit named-call authorization, resolve the full-lane Node `Uuid.toMaskedSlug(codec)` timing gap without weakening protected calls or budgets. The full lane passes its gate but does not prove parity. Isolated calls and parsed-value sequences do not reproduce the loss; context placement and positional arguments do not repair it.
- [ ] Requalify and, if it persists, fix the historical Node `bytes.base32` slowdown from `c7e5da6` (16-byte-only alphabet cut). The full-filter check of `c7e5da6^` → `c7e5da6` fails 3 of 3 runs, 3–5% slower (Bonferroni-corrected intervals all above 1; Node 24.22.0, 2026-10-16); single-row reruns gave 0.98–0.99, a different measurement. These runs predate `d4ba9d8`'s environment-size randomization; their cause and current reproducibility remain open. Source comparison through `1402f8a` finds unchanged fixed base32 writer bodies and a changed dispatcher; it proves neither speed nor a repair. Evidence: `bench/decisions.md` §Historical base32 slowdown. The earlier split into `encodeBase64url`/`encodeBase32hex` remains unaccepted: its all-runtime gate passed but Bun `masked.base32.encode.bytes` (1.08) and WebKit `bytes.base32` (1.08) came out slower in one run at load average ~23 (2026-10-17). Done when the corrected full-filter check of current code against `c7e5da6^` passes in fresh invocations with no other row slower; if the gap reproduces, repair it before closure.
- [ ] Decide on a masked binary form for transport that must hide the UUID structure. The masked payload is 132 bits (42-bit time offset, 74 payload bits, 16-bit check), so it needs 17 bytes; 16 bytes would mean a 12-bit check (a wrong key passes about 1 time in 4,096) or a shorter time range. Masked text slugs are unaffected.

## Code reduction

Each item must keep behaviour, public API (`api/typescript.api.d.ts`), speed, resource use and bundle size.

- [ ] In `src/payload.ts`, format known 16-byte `unmix` candidates with `formatUuidBytesUnchecked` and remove impossible error checks; preserve the migration path's native-hex performance.
- [ ] Share text extraction in `src/slug.ts` and `src/masking-codec.ts` without adding avoidable work to string decoding; the direct conditional proposal adds a second `typeof`.
- [ ] Merge duplicated preset-text handling in `src/v7-keyless.ts` without non-null assertions; preserve v7 text timings sensitive to wrapper shape (`bench/decisions.md`).
- [ ] Share the RFC version-digit check in `src/uuid.ts` only if its extra non-canonical-path call preserves performance.
- [ ] Share parse/format/case handling between `src/migration.ts` readers; preserve timing and zero-discarded-error budgets.
- [ ] Share `ownedUuidV7BytesToMaskedSlug` after copying into scratch in `src/masking-codec.ts`; reject split-guard shapes that slow Bun `masked.encode.bytes`.
- [ ] Share the startup-only last-JIT-flag scan in `src/runtime/node.ts`; tokenize `NODE_OPTIONS` only when it mentions jitless.
- [ ] Reuse `writeTimestampWords` in `src/v7-bounds.ts` endpoints; keep the keyless owned-bytes copy inline.
- [ ] Share construction-only `seedWordView` between sync/cooperative derivation in `src/mask.ts`.
- [ ] Fold the large-buffer native-hex rule into `formatUuidBytesUnchecked` in `src/uuid.ts`; preserve its measured WebKit/Chromium benefit.
