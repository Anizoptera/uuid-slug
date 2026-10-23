# Remaining work

## Joint Rust and TypeScript release preparation

Deliver the same capabilities and identifier formats through APIs natural to each language, with correct and predictable consumer experience first, performance and resource efficiency second, and maintenance simplicity third.

### Design, authority and completion

Preserve issued identifiers, secure entropy, caller ownership and typed failures. Keep Rust's owned `Uuid` value, immutable masking codecs and separately owned mutable generators. Keep one published Rust crate and the dependency-free TypeScript package. Prepare the matching version selected by both manifests (currently `0.6.0-dev`, candidate `0.6.0`); do not change release versions as part of preparation.

Implementation, investigation, documentation, verification and focused local commits on the current branch are authorized. Release-version changes, tags, pushes, publication, remote settings/secrets and release finalization still require explicit authorization for the exact operation. Keep gated operations open; preparation is not publication.

This is the sole live plan. Preserve unrelated unfinished items below. Add arising defects and dependent repairs to the owning task, replace superseded state in place, and mark a task complete only with evidence that meets its acceptance criterion. Record the command, revision or tree, feature/profile/target, result, and any coverage limit beside the task or in the existing evidence owner. Durable API and distribution decisions belong in their existing contract owners, not only here.

- [ ] Completion audit: map every approved requirement to its implementation and acceptance evidence; map every added public part to a consumer job. No unchecked task may disappear into a completion claim. Report unexecuted platform/remote checks and authorization prerequisites explicitly.
- [ ] Final verification: run `bun run check` on the final code tree; require every locally executable required check to pass. A configured CI job, source inspection, TypeScript/Rust agreement, aggregate pass or unit suite cannot substitute for the packaged consumer, target or failure path it does not execute.
- [ ] Delivery: inspect each staged diff against the request, commit self-contained changes with explicit file lists, preserve unrelated changes, remove task scratch artifacts, and finish with a clean tree. Do not claim publication readiness while required evidence or setup remains unresolved.
- [x] Maintainer request: remove prose hard-wrapping across repository documentation and instructions; preserve words, Markdown structure, code and intentional hard breaks. Keep prose excluded from every formatter entry point and put the no-wrap instruction in root `AGENTS.md`. Verify the actual formatter ignores prose without adding a prose-formatting gate.
  - `3eb2530` excludes Markdown and other prose through the shared formatter configuration; directory and explicit-file probes preserved eight prose fixtures while formatting a JSON control. `1486321` removes prose wraps and fixes report templates: every changed document preserves non-whitespace content, CommonMark structure and GFM rendering; all three report renderers preserve retained inputs and wording. Existing report tests and commit checks passed. No permanent prose checker or formatter was added.

### Rust API and interoperability

- [ ] Preserve `Uuid` as a small owned value with standard formatting and `Result`/`?` composition. Keep codecs shareable without hidden generator locks and keep validated values reusable without reparsing.
- [ ] Add infallible, allocation-free conversions between `Uuid`, `uuid::Uuid` and `[u8; 16]`; add exact-length `TryFrom<&[u8]>` and retain explicit-offset reads for larger buffers. Acceptance: external UUID round trips preserve every bit, including non-v4/v7 and non-RFC values; wrong slice lengths fail; no string-format/reparse route or heap allocation.
  - Implemented in `rust/uuid-slug/src/uuid.rs`, with a runnable crate README example and generated API reports for all/no-default features. On the interoperability tree based on `b5d27f1`, `bun run check:rust:fast` passed 40 native debug unit tests, benchmark compilation and all-feature workspace Clippy. A subsequent pinned-toolchain `cargo test --manifest-path rust/Cargo.toml -p uuid-slug --doc --locked` passed three executable examples and one compile-fail example. `bun run api:update` passed and left the TypeScript API unchanged. Packaged consumer execution and compiled allocation evidence remain required before closing this item.
- [x] Make `UuidV7MaskingCodec::new(mask) -> Self` the default constructor and `from_options(options) -> Result<Self, Error>` the configured constructor. Require an explicit mask in both. Validate configurable timestamps/sentinels once; the default constructor has no invalid timestamp or sentinel setting to reject. Update callers, API reports, documentation and changelog together.
  - Constructor tree based on `445d5c2`: `bun run check:rust:fast` passed 41 native debug tests, four executable doctests and one compile-fail case, bench compilation and all-feature workspace Clippy. Default/configured endpoints and existing invalid configurations are covered. `bun run api:update` passed with both Rust feature reports; target/packaged verification remains in its separate tasks below.
- [x] Add `UuidV7MaskingCodec::parse_uuid` for supported textual forms. Preserve masked-first interpretation of ambiguous raw text, sentinel priority and explicit source-specific operations. Acceptance: shared deterministic cases cover both alphabets, ordinary UUID text, overlap, rotations, errors and known-source disambiguation.
  - Parser tree following `5e946f0`: the native fast Rust lane passed 43 unit tests, four executable doctests, seven compile-fail cases, bench compilation and all-feature workspace Clippy. Bun Node-API debug executed 29,894 shared observations, including retained overlap identities and reversed key priority. Four `scripts/prove-guard.ts` mutations separately exposed a wrong plain reading, swallowed callback failure, bypassed sentinel lookup and accepted nonzero plain padding; each restored source byte-for-byte. TypeScript and Bun project checking passed; API generation adds only the Rust method under both feature reports. Full target, packaged and performance evidence remains in the tasks below.
  - `bun run check:rust` passed on `3b4b49f`: native feature selections in debug/release, bridge tests, examples and shared transport cases. Each profile executed Bun Node-API/FFI (29,894 observations per transport), Node 26 Node-API/FFI and Node 24 Node-API (29,882 each), Node 22 Node-API and Deno Node-API/FFI (29,870 each). This is native execution evidence, not browser/WASI or packaged-consumer evidence.
- [ ] Prevent known masked values from entering keyless parsing implicitly while preserving ordinary string convenience. Use a small sealed input trait at `Uuid::parse_uuid`, plain-slug parsing and alphabet decoding boundaries, with standard string containers and typed plain slugs accepted. Keep generic wrappers thin over shared nongeneric parsing. Acceptance: unchanged valid calls compile, typed masked and mixed masked-or-sentinel inputs fail for the intended trait bound, and ordinary string coercion remains usable elsewhere.
  - Implemented on the tree based on `70dfc3a`: `KeylessUuidText` seals the four keyless entry points, accepts standard containers and gives compiler recovery advice. `bun run check:rust:fast` passed 42 native tests, four executable doctests, seven compile-fail cases and all-feature workspace Clippy. Direct rustc probes covered both masked types, boxed inputs and explicit raw-string controls at every entry point (24 cases); rejections were E0277 with codec guidance. Admitting both masked types through `scripts/prove-guard.ts` made all six new compile-fail cases fail by compiling successfully; the file was restored byte-for-byte. Packaged consumers, minimum-Rust execution and compiled-cost evidence remain open.
- [ ] Preserve registered plain-sentinel reads through the matching codec. Mixed masked-or-sentinel values require variant selection or explicit raw-text access at a keyless boundary. Explain that `.as_str()` erases provenance and overlapping raw spellings cannot establish their origin; do not promise complete misuse prevention.
- [ ] Review every public symbol through concrete consumer calls: defaults, construction, detached use where meaningful, ownership, errors, formatting, generic bounds and interoperability. Keep useful domain distinctions without copying JavaScript shapes, adding redundant aliases or introducing caller annotations for inferable facts. Put non-obvious implementation reasoning beside its code.

### TypeScript interoperability

- [ ] Preserve direct use of strings, `Uint8Array`, `Buffer`, exact `ArrayBuffer` and ranged `DataView`. Do not introduce UUID-library detection, adapters or runtime dependencies where the existing representations suffice.
- [ ] Verify both directions using actual external producers/consumers: Node `randomUUID()` and the installed `uuid` package's v4/v7 generation, parsing and formatting. Cover both alphabets, ordinary and externally branded strings, byte inputs and unions without casts.
- [ ] Verify caller-output identity, offsets, untouched surrounding bytes and failure atomicity. Distinguish copies required by ownership from avoidable parsing/conversion; do not claim zero-copy where a result must own bytes.
- [ ] Run these calls against packaged declarations with every checker in `scripts/typescript-compilers.ts` and execute real installed package consumers. Include rejected known representation mismatches and intended-diagnostic controls. Extend the existing consumer harness instead of creating a parallel suite.

### Features, unused code, WebAssembly and WASI

Use features for host capabilities and dependency/build costs, rather than adding one switch per function. Ordinary dead-code elimination can remove unreachable Rust code without LTO; explicit WebAssembly exports remain reachable. Verify the actual consumer artifact before promising removal.

| Selection | Required capability |
| --- | --- |
| Default | Standard-library conveniences and the existing OS-seeded fast RNG |
| `std`, defaults disabled | Standard time with caller-selected entropy |
| `os-rng`, defaults disabled | Direct platform entropy without ChaCha state |
| `wasm-js` | Browser JavaScript clock and entropy integration |
| No default features | `no_std` + `alloc` conversions, masking, migration, derivation and explicit-time/custom-entropy generation |

- [ ] Implement shared `core`/`alloc` code with narrow host boundaries. Keep `os-rng` independent of `std` where its backend supports it; require `std` for `fast-rng` thread-local state and gate clock-dependent methods separately. Preserve errors and wire behavior; declare required atomic capabilities rather than claiming every embedded target.
- [ ] Test default, disabled-default and distinct supported feature combinations in isolated consumer graphs. Inspect normal dependencies separately from workspace development dependencies; feature unification must not conceal unwanted or missing dependencies.
- [ ] Keep browser WebAssembly and WASI distinct: browsers use JavaScript integration; WASI uses host capabilities. Execute browser profiles and both WASI targets; do not publish an unsolicited prebuilt WASM ABI.
- [ ] Extend the existing linked-size harness with empty, v4-only, v7-only, parsing-only, individual-alphabet and masking consumers. Check ordinary release and optional ThinLTO separately, inspect retained code/imports with positive controls, and execute supported artifacts. Separate final code size, dependency inclusion and build cost. The development bridge's broad exports are not a minimal-consumer artifact.
- [ ] Repair accidental coupling if a consumer retains unrelated code. Do not introduce v4/v7, masking or per-function feature switches merely because those functions exist. Keep standard and reduced-capability routes on one implementation rather than a second library.

### Correctness, entropy and verification

- [ ] Map generation, representations, inspection, supplied time, caller storage, masking, sentinels, rotation, migration, derivation and cancellation to executable Rust and TypeScript cases. Use issued-ID fixtures, independent reference vectors and checkable properties as oracles; cross-language agreement alone is insufficient.
- [ ] Exercise malformed text/Unicode, canonical padding, generic conversions for every UUID version/variant, timestamp endpoints, fraction boundaries, overflow, rollback, key order, sentinel exceptions and ambiguous spellings. Preserve the complete UUID and masked payloads, frozen derivation and original migration aliases.
- [ ] Verify failed operations publish no partial identifier, leave caller storage and generator state recoverable, preserve underlying causes, and draw no entropy after an earlier validation failure. Prove important negative cases reach their intended guard with the existing guard-proof harness.
- [ ] Exercise actual entropy backends, initial seed, required reseed, threads/process boundaries, failures and retries. Recheck backend documentation when changing a feature/target path. Never substitute weak randomness or reuse a stream after required reseeding fails. Statistical output tests cannot certify cryptographic security.
- [ ] Keep short local operations synchronous. Verify expensive derivation's bounded polling, cancellation, drop behavior and executor independence. Measure construction work separately from polling; a bounded poll does not make seed capture or scheduling free.
- [ ] Run debug/release, feature combinations, the minimum Rust version, examples, doctests, Clippy, benchmark compilation and isolated extracted-crate consumers. Resolve Cargo/rustc through the repository's pinned rustup toolchain and bind compiler/PATH for subcommands.
- [ ] Execute every locally supported native/browser/WASI lane and retain the full required architecture matrix in CI. State which lanes ran, compiled only or remain unexecuted; require nonzero corpus execution per adapter.
- [ ] Correct Rust documentation and tests that elevate incidental default thread-local ordering above the governing generation promise; preserve explicitly configured ordering/rollback guarantees. A faster implementation may not sacrifice wire integrity, entropy or failure behavior.
- [ ] Add tests only for material failure modes not already established by stronger checks. Extend existing harnesses; do not add infrastructure or fragile implementation-mirroring assertions without a distinct oracle or execution boundary.

### Performance and resource work

Authorized complete-call measurements cover UUIDv4/v7 generation, parsing/formatting, both alphabets, masked reads/writes, rotation, migration and mask construction. Existing regression gates remain required; exploratory rankings do not become an endless publication gate.

- [ ] Compare complete consumer calls against correctness-equivalent rivals with isolated dependency features. Distinguish secure-entropy competitors and unsupported capabilities from infrastructure failures; refresh stale reports in their existing owners.
- [ ] Separate cold initialization, steady-state latency, throughput, allocations, retained/per-thread memory, code size and build cost. Peak process memory is not allocation evidence. State machine/compiler/profile/workload and statistical limits beside each conclusion.
- [ ] Remove unnecessary work first: string round trips, duplicate validation, unrelated output construction, repeated derivation, avoidable entropy calls and allocations. Each retained operation must serve the selected consumer job.
- [ ] Compare owned slug strings plus caller-storage paths, inline storage and borrowed formatting using actual caller workloads. Account for copying, collection density and conversion costs as well as throughput; do not choose one dimension's winner by intuition.
- [ ] Compare other meaningful alternatives at mechanism boundaries, with hypotheses and disconfirming observations specified before measurement. Expand candidate ranges and interactions under the approved experimental method; keep complete-call overhead in automatic policies.
- [ ] Inspect the compiled effect of generic type-protection wrappers. Retain an optimization only with correctness and measurements across affected calls; disclose residual disadvantages and reject universal-fastest or invented numerical-improvement claims.
- [ ] Preserve required performance/resource gates for every affected runtime. Any TypeScript source change needs `bun run perf:check:all` before commit; investigate failures without weakening gates or blaming their age.

### Documentation and exact-artifact release preparation

- [ ] Maintainer request: make crate documentation the primary Rust entry point, with copyable generation, conversion and masking examples, followed by interoperability, caller storage, features, WASM/WASI, rotation and migration. Preserve the protected main README opening.
- [ ] Document accepted input, ownership, defaults, units, errors and decision-changing limits beside each public operation. Show `?` propagation and actionable typed-error handling; explain raw-slug ambiguity beside decoding and the 16-bit check beside keyed calls, without presenting masking as authentication.
- [ ] Correct browser-versus-WASI clocks and publication status. Keep private keys/iteration counts and old readers recoverable during rotation/migration. Keep implementation reasoning in ordinary comments, caller guidance in rustdoc, and searchable names/links rather than a parallel agent-only API manual.
- [ ] Compile and execute examples against the extracted crate and exercise consumer jobs using only public documentation. Verify TypeScript README examples through the existing checker and inspect generated declarations/editor help for changed APIs.
- [ ] Verify metadata, license, normal dependency graph, archive file list, docs.rs configuration and exact archive integrity. Exclude development bridges/benchmarks from publication and Rust/repository-only files from npm. Verify packed root imports and tree shaking through independent optimizers.
- [ ] Prepare both packages from the same revision and version without publishing credentials; validate source/API/manifest agreement and reuse verified bytes. Treat crates.io as a first publication without inventing a predecessor. Keep internal API comparisons separate from consumer release notes.
  - Repair `scripts/release-crate.ts` before preparation: its local `cargo` runner still resolves bare `cargo`, unlike the pinned compiler/PATH helper required by root guidance. Verify the extracted crate and publication commands use the same selected toolchain.
- [ ] Provide guided maintainer-only setup: verified crates.io account, narrowly scoped bootstrap token stored as `CRATES_IO_BOOTSTRAP_TOKEN`, then trusted publishing after first upload. Never request or expose credentials in chat; verify current provider requirements before giving setup instructions.
- [ ] Authorization required: change to the release version/create its tag only after explicit approval; run the exact-tag preparation gate and review generated release notes before any authorized push/publication.
- [ ] Authorization required: publish both verified artifacts, verify registry bytes, configure trusted publishing, remove/revoke the bootstrap credential and verify remote state. Keep the release draft until selected destinations, attachments, notes and provenance match.
- [ ] Preserve partial-release recovery: retry only missing work with retained verified artifacts; once either registry contains the version, never move its tag or silently omit the other package. Keep each gated or failed operation open until its own observable completion.

### Early evidence and open risks

- Local Rust report drift and registry-verified publication compatibility have separate owners. `scripts/rust-api.ts` supplies both with compiler-derived signatures/deprecations. The real-Git API regression fails when the old npm-tag-as-crate-baseline path is restored with `scripts/prove-guard.ts`; the compiler fixture exercises allowed deprecated removal and rejected nondeprecated removal. Full exact-archive release preparation remains unexecuted.
- The compiler prototype accepts ordinary strings and typed plain slugs while rejecting a typed masked slug at a sealed keyless boundary. Full API integration, diagnostics, code generation and packaged consumers remain unchecked.
- The local Node interoperability probe covers external string producers, both alphabets, byte containers, caller-output identity and external formatting readback. It does not establish all-checker compatibility, packed resolution or performance.
- Raw 22-character plain and masked slugs can overlap. A matching codec restores the issued UUID while a plain parser can return another UUID; compile-time provenance protection must not be mistaken for a raw-text authenticity check.
- Existing linked-size evidence exercises masking, not a v4-only consumer. Version-specific removal remains unproved until the new consumer controls run.
- Treat `no_std` as shared-code portability, not a promise of allocation-free APIs or universal embedded support. Revisit any implementation that needs a duplicate algorithm or large new abstraction rather than hiding that cost.

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
