# TypeScript release audit

## High-level requirements

Finish the TypeScript release audit without further profiling or benchmark experiments.
Preserve published identifiers, supported calls, caller data, secure entropy and ownership.
Optimize primary single-ID calls only; secondary and caller-buffer optimization remain held.
Rank Node Current and Bun first, Node LTS and Chromium next, then Deno and Node JITless.
Default guarantees follow proper native behavior; stronger guarantees require configuration.
Each primary call must approach its fastest equivalent native result and qualified rivals
in speed and resource use. Configured calls may add only work their requested features need.
Negligible remaining gaps need no new code. Timing alone does not prove resource parity.
Keep contracts in their existing owners: README, `docs/public-api.md`, `docs/design.md`,
`docs/security.md` and `docs/cross-language.md`; this plan grants no new authority.
Factual documentation corrections are authorized; new public contracts and remote writes require approval. Internal verification
choices do not require a ruling; changes to accepted inputs or guarantees do.

## Release blockers and evidence

Audit ordinary consumer calls and shipped artifacts before declaring the TypeScript package ready.

- [x] Keep scratch outside durable evidence paths, retain referenced logs in `bench/reports/retained-logs/`, and keep source captures inert; `artifact:check` rejects executable report captures. The retained scratch archive preserves old evidence, `clean` preserves reports, and Cargo caches stay under `rust/target/`.
- [x] Keep factual documentation aligned with retained production: `bench/PERFORMANCE.md` distinguishes four-byte comparisons from sixteen-byte blocks and records seed/sentinel capture; README names native Bun paths, `fastv7`, and Cloudflare Workers with their verification limits. No new guarantees or experiments.

The consumer must create an ID, convert it for storage or URLs, read it back, and recover from failure without learning internal machinery. Judge defaults, names, inferred types, errors, and resource costs against those jobs.

- [x] Audit public calls, production modules, source/packed types, detached methods, editor help and runtime selection. `ts-release-audit-source-types.log` and the existing packed consumer fixture cover the exported generation, conversion, masking, migration, inspection and error-composition jobs; the defects below remain open.
- [ ] Repair the defects below with the smallest effective regressions against actual runtime paths after cleanup. Keep ordinary-call speed, ownership and failure behavior; do not resume experiments or adopt a rejected candidate.
- [x] Run the complete check and packed browser checks, inspect failures, and report release blockers with exact evidence. `ts-release-audit-retained-final-check-clean.log` records the passing complete check; `ts-release-audit-retained-final-web-direct.log` records extracted-package execution on Node, Bun, Deno, Chromium, Firefox and WebKit. `ts-release-audit-retained-defects.log` independently reproduces the explicit-null reference, falsy byte destination and omitted-storage offset defects on retained production. Passing gates do not close those defects.
- [x] Keep timing protection in the complete check, not a duplicate hook invocation. `ts-release-audit-fast-routing-{check,hook}.log` and `ts-release-audit-fast-routing.log` cover the complete lane and hook with active resource falsifiers. Local duration results do not establish shared-CI headroom; no result cache is needed.

Early falsifiers: an equivalent supported call with different behavior disproves interface consistency; a failing packed consumer disproves source-only readiness; a reproduced complete-call regression rejects simplification; a branch with no executable witness remains unverified.

- [x] Infer both possible versions when a branded plain UUIDv4 slug passes a codec's masked check. The collision in `__test__/codec-boundary-probe.ts` and exact packed consumer types protect the distinction; emitted JavaScript is unchanged.
- [x] Stop inferring immutable result versions from mutable byte brands. Exact v4 and v7 consumer assertions fail with the old inference; Node and Bun exercise changed byte contents. The complete check passes and all emitted JavaScript remains identical.
- [x] Preserve recognized entropy callback failures without the Error-only wrappers. Shared runtime and packed consumers protect identity, atomic writes, sequence recovery, and inaccessible markers. Current-time package-generator text reuses its existing scratch; explicit time and structural generators keep validated byte generation. The preset-inline full check passes; repeated packed comparisons cover every runtime selection, and focused Firefox/Deno replay does not reproduce their initial losses. Native profiles and resource controls cover the changed text paths. Raw `ts-release-audit-entropy-*` evidence retains rejected candidates and uncertainty; the measurements do not establish individual-call latency or total allocation parity.
- [x] Omit range checks only for freshly allocated UUIDv7 output at offset zero. Caller-owned output and nonzero offsets retain validation. The owned-output and inline packed replays cover default bytes, explicit-time text, and parsed values; runtime tests retain offset diagnostics and ownership. Attribution remains limited because complete-call comparisons include the entropy correction.
- [x] Keep preset UUIDv7 formatting beside its draw and configured formatting in its helper. The preset-inline full check and focused replay preserve the protected calls without relaxed budgets; they do not isolate helper-call cost or close rival gaps.
- [x] Capture mask seeds and sentinel UUIDs once before validation. Node and Bun mutations reject repeated reads; packed consumers exercise synchronous and cooperative capture. Repeated complete-construction comparisons and native profiles cover string seeds, reusable byte seeds, and sentinels. Timing remains inconclusive and establishes no speedup; capture removes property reads and a byte-brand check without adding validation, storage, or work to repeated identifier calls. Raw evidence is under `bench/reports/ts-release-audit-capture-*`; retain the correctness correction without claiming constructor performance parity.
- [x] Normalize accepted base32hex timestamp-validation results before assigning canonical slug brands; preserve case-sensitive base64url and canonical branded inputs. Rust borrows canonical text and owns case normalization. Private decode scratch and precomputed sentinel text avoid repeated work. Shared runtime probes protect reentrant window reads, wire meaning and canonical guards; source and packed types preserve justified brands. Repeated packed comparisons, native profiles and resource falsifiers are recorded in `bench/PERFORMANCE.md`; `ts-release-audit-canonical-slug-check-final.log` records the passing complete check, and both Wasm profiles pass every selected browser.
- [ ] Reject explicit null timestamp references without slowing normal validation. `src/timestamp.ts` defaults null through `??`; `ts-release-audit-retained-defects.log` reproduces it. Assignment and destructuring candidates remain unretained: `ts-release-audit-timestamp-branch-replay.jsonl` and `ts-release-audit-timestamp-fixed-work-node-replay.jsonl` do not exclude material loss. Use `medianRatio95` for ordinary comparison summaries; the old no-loss verdict used an absent statistic and is invalid. The three-reader witness in `ts-release-audit-timestamp-default-probe.ts.txt` remains unexecuted. Do not repeat unchanged controls or infer a scheduling/JIT cause from them.
- [ ] Reject invalid explicit destinations in parsed UUID `toBytes` without slowing ordinary owned copies. The destination-only comparison also reproduces a WebKit owned-copy loss, so production retains the committed implementation. Preserve owned copies, caller identity, exact bytes and atomic range failure. Raw `ts-release-audit-omission-*` replays retain rejected arrangements without establishing a JIT cause. Further profiling is stopped.
  - [ ] Keep the falsy-destination witness in `ts-release-audit-byte-isolated-probe.ts.txt`; it fails unchanged and passes with undefined-only recognition in Node and Bun. Reject that shape and argument-count dispatch: `ts-release-audit-byte-isolated-screen.jsonl` and `ts-release-audit-byte-arguments-screen.jsonl` reproduce WebKit copy losses. Neither the unchanged control nor profiles establish their cause. The omitted-storage offset is a separate defect.
- [ ] Reject a nonzero parsed-byte write offset beside omitted storage without harming ordinary owned copies. TypeScript rejects this call, but JavaScript currently ignores the offset. The stricter guard reproduces a WebKit owned-copy loss across diagnostic placement, read placement, copying and defaulting alternatives; do not retain those candidates or treat the destination-type correction as closing this separate issue.
- [ ] Reconcile option-record acceptance with `docs/public-api.md` without slowing normal calls. Construction, timestamp windows, payload layouts, and rollback policies must not silently accept host or class behavior.
  - [ ] Keep the rejected constructor patch and regression cases in `bench/reports/ts-release-audit-record-unretained.patch`. `ts-release-audit-record-runtime.jsonl` records Chromium setup losses; host results remain unresolved. Do not restore it or repeat those comparisons unchanged.
  - [ ] Apply `docs/public-api.md` §Types and validation separately to constructors, timestamp windows and payload layouts. Its plain-record rule decides acceptance; choosing validation machinery is delegated. Escalate only a proposed change to accepted caller inputs, with its consequences.
- [x] Expose existing migration-reader configuration failures in TypeScript while omitted options remain infallible. Source and packed consumers preserve enabled-format inference; Node and Bun execute typed extra-key and accessor failures. Editor help exposes the union, and `ts-release-audit-migration-type-falsification.log` records TS2339 without the caller guard and TS2578 without the error union. `ts-release-audit-migration-check.log` records the passing complete check; comment-free runtime emit is unchanged.
- [x] Execute the retained npm archive through Node compiled output, Bun source and direct compiled output, Deno source/development and direct compiled output, independent optimizers, and Chromium, Firefox and WebKit. `ts-release-audit-packed-web-direct.log` records the extracted-package result; source-only tests do not establish these paths.
- [x] Select the repository-pinned Rust compiler for WebAssembly checks instead of unrelated PATH tools. `ts-release-audit-wasm-{debug,release}-selected.log` covers both profiles in every selected browser, including real host entropy failure, cancellation and cooperative derivation. The failed system-toolchain log remains separate evidence about tool selection, not package behavior.
- [x] Keep the selected compiler's dynamic libraries available to the Wasm linker on macOS. Cargo's forced library-path configuration with the same explicit `RUSTC` links successfully; the directory derives from that compiler. `ts-release-audit-canonical-slug-wasm-{debug,release}-fixed.log` covers both profiles in Chromium, Firefox and WebKit, including entropy failure and cooperative cancellation.

## Evidence limits and protection

Use existing comparisons to identify unresolved primary-call gaps; rejected experiments do not close them.

- [ ] Reconcile existing primary-call rankings with retained production; do not collect new profiles or benchmarks. Keep missing comparisons and resource evidence explicit rather than calling them parity.
- [ ] Preserve regression protection in `bench/check.ts`, `bench/resources.ts` and `bench/latency.ts`. Existing valid-output waste mutations cover retained arrays, views, copies and native selection on Node, Bun, Deno and Chromium; counted work is not total allocation. Keep WebKit resource and shared-CI headroom limits explicit. Timing-policy calibration remains held and cannot block release repairs.
- [ ] Finish packed workerd consumers and entropy/clock witnesses before adding its correctness smoke lane to the existing workflow. The compiled portable corpus passed both compatibility modes; packed and deployed behavior remain unproved. Keep this follow-up separate from TypeScript release evidence and do not choose an edge-specific implementation from it.
- [ ] HELD outside this optimization effort: secondary guards, timestamp extraction, shadowed-length defenses and timing-policy calibration. Preserve their correctness contracts; reopen optimization only by an explicit scope ruling.

## Open generation evidence

- [x] Owned bytes must be fresh plain arrays; Buffer-only and shared-storage floors are not equivalent results. Float64 counter storage raises construction or Bun byte costs; narrow closure counters remain unresolved. Unaligned entropy-word reads lose on Bun. Keep the retained four-byte and sixteen-byte block copies and their loss/erasure oracles; do not reopen constructor substitutions unchanged.

- [ ] Keep the Bun UUIDv4 slug gap and commitment evidence open. Package drawing followed by native encoding is faster, but shared native writers, live bindings, early preset dispatch and fixed blocks slow base32/conversion or lack repeated gains. Binding does not fix the gap; pooling alone is not an established cause. `bench/PERFORMANCE.md` §Bun UUIDv4 slug resources owns the rejected mechanisms and limits.

- [x] Native Bun UUIDv7 text remains selected; clock advancement alone does not disqualify it. Native repair, extra trust validation and wrapper-only tuning did not earn retention. `bench/PERFORMANCE.md` §Native Bun default UUIDv7 text owns the comparison and resource limits.

- [ ] Keep the JITless UUIDv4 wrapper gap open against Node's `randomUUID`, not only Web Crypto. Preserve native failure fallback and presets; do not tune it ahead of higher-ranked primary gaps.

- [ ] Resolve the existing Bun UUIDv7 slug and owned-byte rankings against the qualified native composition and `uuid`; keep Deno owned-byte comparisons against `uuidv7` distinct. Fresh byte comparisons vary near parity, so older losses cannot choose another rewrite. Clock/sequence allocation remains unattributed; no component timing proves a complete-call lower bound. Reuse retained reports only.
- [x] Retain the established draw rather than rejected shortcut, clock-inline, timestamp-cache and fixed-tail rewrites: gains are inconsistent or confined to secondary calls. Earlier independent draws add refills; do not infer an entropy-source bottleneck. `bench/PERFORMANCE.md` §Portable UUIDv7 entropy draw and §Exact counter storage preserve the alternatives and limits.
- [ ] Keep Bun UUIDv4 text's startup and total-allocation evidence open. Exact repeated-call native comparisons do not isolate a worthwhile persistent wrapper cost. Default-parameter, argument-count and preset shortcuts did not earn retention; removing `try` breaks fallback and import-time validation draws entropy unnecessarily. Do not restore identity tracking or tune a negligible difference.
- [ ] Keep owned UUIDv4's complete allocation/draw gap open, especially Deno; constructor substitutions do not explain it. Explicit buffers, scratch copies and native zero-byte decoding lose or remain unresolved. Shared slabs violate private ownership. Preserve ordinary fresh-array construction and existing failure atomicity; `bench/PERFORMANCE.md` §Portable UUIDv4 ownership paths owns the alternatives.

## Open configured-call evidence

- [x] Dedicated UUID-plus-slug calls beat public composition in the latest retained matrix. Independent text draws lose on Node LTS/Deno; Bun-only dispatch retains costs on unselected graphs, and construction-selected updates slow base32 pairs. Frozen empty options raise codec-value costs. These shapes remain rejected, not pending implementations.

- [ ] Account for missing equivalent comparisons for explicit-time `{ at }` against `uuid.v7({ msecs })`, and created/selected generators against stateful rivals. The default pair now has retained comparisons; do not treat the old missing-pair row as current. Keep unmeasured configured jobs unresolved without starting another benchmark campaign.
- [ ] Keep pair total allocation and the immutable-value consumer comparison open. Retained matrices favor `generateUuidV7WithPlainSlug` over separate public calls; that does not prove `generateUuidV7Value` resource parity. Preserve explicit generators, instants, layout identity and pair consistency.
- [ ] Check generation failure handling with real caller examples. Preserve the approved default/configured distinction; any proposed change to caller-visible failure behavior requires a ruling with its consequences.
- [ ] HELD: caller-buffer optimization requires a new scope ruling. Direct pool-to-caller copying is an unretained alternative; caller data must stay unchanged when entropy fails. Existing transactional-write and entropy-failure tests retain that requirement.

## Open conversion evidence

- [x] Fixed writers remain selected by runtime: Bun Latin-1, WebKit native hex where available, fixed character codes elsewhere, and the measured JITless alternatives. Shared ASCII decoding, helper-only formatting and unrolled Feistel traversal lose other primary calls. Mask rounds, key order, sentinels and wire formats stay fixed.

- [x] Plain-slug text conversion and parsed-value writers reuse private bytes without discarded arrays. Public decoder reuse and shared writer extraction add validation or regress owned-byte controls. Owned Deno decoding beats equivalent copying methods in retained throughput evidence; source-entry and total allocation comparisons remain incomplete. Scure's codec and lowercase components do not justify a base32 rewrite.

- [ ] Reconcile base64url byte encoding and owned decoding with retained native/fallback selection. Keep padding, trailing-bit rejection, exact length and fresh plain-array ownership. Native Buffer-only results are incomplete floors; Deno total allocation and normal source-entry evidence remain open. No native capability alone proves a faster complete call.
- [ ] Reconcile UUID text/byte conversion with retained native hex and portable writers. Keep hyphens, compact and mixed-case input, intrinsic wrapper normalization, text-case presets and owned bytes. `bench/PERFORMANCE.md` §UUID text formatting and §UUID text parsing own the selected shapes and rejected alternatives.
- [x] Preserve the qualified `uuidv7-js` extraction comparison: retained runs favor the package, but Bun gross allocation remains unmeasured. A parse-only native call is a lower bound, not equivalent full UUIDv7 validation.
- [ ] Keep the UUID guard's Bun rival result and cold-import resource gap unresolved. Fresh V8 comparisons supersede the older V8 loss; Bun retains its expression because normalization otherwise regresses. Compact/wrapped text, nil/max and version-neutral acceptance remain required; secondary guard tuning is held.
- [ ] Keep validated timestamp native-floor and total-resource gaps explicit; preserve full validation and canonical output. Timestamp optimization is held, but the explicit-null correctness defect remains an active release blocker.
- [x] Retain case-insensitive UUIDv7 validation and fixed canonical timestamp reads; the carry oracle rejects signed low words and displaced digits. Packed replays and selection/resource mutations protect the shape, with native parsing on JITless Node. These results do not close the native-floor gaps.

## Final verification and delivery

- [ ] Correct existing report and §Native floors facts from retained evidence without running `bench:results` or new measurements; report evidence gaps as gaps.
- [ ] Correct README direction words only where retained repeated comparisons support them; factual repairs are authorized, new guarantees are not.
- [ ] Run `bun run check` before committing; inspect every failure and require exit zero. Apply `bench/README.md` §Regression protection to complete lanes and hooks without dropping runtime, artifact, cleanup or defect coverage. Passing gates do not close reproduced defects or missing resource evidence.
- [ ] Report each release blocker and unresolved primary-call comparison from its evidence. Declare readiness only after the blockers are resolved; do not publish or write remotely.

## Proposals outside this plan

- [ ] Consider printing failed-step diagnostics last in `check:fast`, so truncated hook output still names the failure; this is not a release prerequisite.
