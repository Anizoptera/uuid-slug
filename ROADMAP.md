# TypeScript release audit

## High-level requirements

Finish the TypeScript release audit; reuse retained evidence and verify necessary fixes under `AGENTS.md` §Runtime boundaries and evidence.
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

## Correctness repairs first

Audit ordinary consumer calls and shipped artifacts before release: create an ID, convert it for storage or URLs, read it back and recover from failure without learning internal machinery. Judge defaults, names, inferred types, errors and resource costs against those jobs.

- [x] Remove proven abandoned scratch and completed generated bundles; preserve evidence and reusable caches. Comparisons and failing fixtures archive before removal; candidate screens clean setup failures and remove successful bundles from one owned directory. Cleanup tests check retained source content, missing deletions and archive failures.
- [ ] Prune generated artifacts against reproductions; preserve raw measurements, uncommitted source and unresolved diagnostics. Keep identical packed captures linked to immutable content-named archives without changing their paths; verify hashes and shared inodes before claiming reclaimed blocks. Every indexed removed artifact must recover with its recorded length and hash; `bench/README.md` owns recovery. Keep the recovery archives while indexed artifacts depend on them.
- [ ] Remove remaining disposable summaries and resolved failure artifacts. Profile cleanup preserves compiler inputs before removing bundles; separately executed Bun source, dynamic external inputs and complete profiler runs remain unverified. Keep API scratch inside the shared supervisor's temporary scope and link its extraction manifest to the repository owner. Forced parent death and descendant cleanup remain unverified. Preserve unresolved diagnostics; verify cleanup without profiling.
- [ ] Repair the defects below with the smallest regressions against actual runtime paths; preserve ordinary-call speed, ownership and failures. `bench/reports/ts-release-audit-retained-defects.log` reproduces the null reference, falsy destination and omitted-storage offset defects despite passing complete and packed-browser checks. Verify necessary fixes; do not restore rejected candidates or restart optimization campaigns.
- [x] Preserve earlier build-input captures in `scripts/archive-scratch.ts`; content-named archives share the latest alias rather than duplicating bytes. Cleanup regressions recover both graphs, reject corrupt history and preserve failed inputs. `bun scripts/compact-reports.ts` compacts macOS reports without changing paths or bytes; successful profile cleanup invokes it automatically. Other filesystems retain ordinary files.

- [ ] NEEDS RULING 1: prioritize private-byte ownership over the measured or unresolved normal-call cost of intrinsic copying. The reviewed shared-copy patch protects parsed `toBytes`, root/codec `uuidToBytes` and cached sentinels on Node/Bun, with native overlap handling, caller identity and atomic range validation. `docs/public-api.md` §Capabilities and runtime work forbids retention until no loss is established; `bench/PERFORMANCE.md` §Parsed UUID value state preserves the contrary or unresolved screens. Keep production unchanged until this priority is ruled; do not restart unchanged experiments.
- [ ] Reject explicit null timestamp references in `src/timestamp.ts` without slowing normal validation. `ts-release-audit-timestamp-null-fallback-unretained.patch` preserves null-only fallback rejection and the three-reader, single-getter regression; its host screen cannot establish no loss. Reference-only, assignment and joint-destructuring shapes also remain unretained. Require `medianRatio95`; do not repeat unchanged shapes or infer a scheduling/JIT cause. Retention requires fresh normal-call resource and runtime evidence.
- [ ] Reject falsy explicit `toBytes` destinations while preserving fresh owned copies, caller identity, exact bytes and atomic range failure. `bench/reports/ts-release-audit-byte-isolated-probe.ts.txt` distinguishes the defect on Node and Bun. Undefined-only recognition and argument-count dispatch reproduce WebKit owned-copy losses in `ts-release-audit-byte-{isolated,arguments}-screen.jsonl`; do not restore them or infer a JIT cause. Omitted-storage offsets are a separate defect.
- [ ] Reject a nonzero parsed-byte write offset beside omitted storage without harming ordinary owned copies. TypeScript rejects this call, but JavaScript currently ignores the offset. The stricter guard reproduces a WebKit owned-copy loss across diagnostic placement, read placement, copying and defaulting alternatives; do not retain those candidates or treat the destination-type correction as closing this separate issue.
- [ ] Enforce `docs/public-api.md` §Types and validation on constructors, timestamp windows, payload layouts and rollback policies: accept cross-realm and null-prototype plain records; reject host/class behavior without slowing normal calls. The rejected `bench/reports/ts-release-audit-record-unretained.patch` produces Chromium setup losses in `ts-release-audit-record-runtime.jsonl`; host results remain unresolved. Do not restore it. Validation machinery is delegated; changing accepted input requires a ruling.

### Retained correctness constraints

- [x] Preserve the brand boundaries in `__test__/codec-boundary-probe.ts` and packed consumers: a plain UUIDv4 slug can pass a masked check; mutable byte brands cannot prove immutable result versions.
- [x] Preserve retained entropy and formatting paths: callback-error identity, atomic writes and sequence recovery; reusable scratch only for package-generated current-time text; unchecked ranges only for fresh offset-zero output; configured and structural generation stays validated. `bench/reports/ts-release-audit-entropy-*` and preset-inline replays do not isolate helper cost, individual latency or total allocation.
- [x] Preserve single seed/sentinel capture and canonical base32hex timestamp results, including reentrant window reads; base64url remains case-sensitive. Their reasons, rejected alternatives and resource limits belong in `bench/PERFORMANCE.md`; constructor timing remains inconclusive.
- [x] Preserve migration-reader error unions for explicit configuration and infallible omitted options; source/packed consumers retain enabled-format inference. `bench/reports/ts-release-audit-migration-type-falsification.log` distinguishes missing caller guards and missing error unions.
- [x] Retain packed-path evidence in `bench/reports/ts-release-audit-packed-web-direct.log`: Node compiled, Bun source/direct compiled, Deno source/development/direct compiled, independent optimizers and Chromium/Firefox/WebKit. Source tests alone do not cover these paths.
- [x] Keep Wasm checks on the pinned compiler with explicit `RUSTC` and its dynamic-library directory on macOS; PATH-tool failures do not prove package failure. `bench/reports/ts-release-audit-canonical-slug-wasm-{debug,release}-fixed.log` covers both profiles and all selected browsers, including entropy failure and cooperative cancellation.

## Retained performance evidence

- [x] Reconcile retained generation and conversion evidence in `bench/PERFORMANCE.md` §Native floors and the owning sections below. Bun slug/encoding gaps, the missing direct Node JITless floor, total-allocation limits and Deno source-entry limits remain open; documentation reconciliation does not close parity. No further measurement campaign is authorized.

### Generation

- [x] Owned bytes must be fresh plain arrays; Buffer-only and shared-storage floors are not equivalent results. Float64 counter storage raises construction or Bun byte costs; narrow closure counters remain unresolved. Unaligned entropy-word reads lose on Bun. Keep the retained four-byte and sixteen-byte block copies and their loss/erasure oracles; do not reopen constructor substitutions unchanged.
- [x] Reconcile Bun UUIDv4 slugs in `bench/PERFORMANCE.md` §Bun UUIDv4 slug resources. Native encoding after package drawing is faster, but shared writers, live bindings, early dispatch and fixed blocks regress base32/conversion or lack repeated gains. Preserve the gap; binding does not fix it and pooling is not a proven cause.
- [x] Native Bun UUIDv7 text remains selected; clock advancement alone does not disqualify it. Native repair, extra trust validation and wrapper-only tuning did not earn retention. `bench/PERFORMANCE.md` §Native Bun default UUIDv7 text owns the comparison and resource limits.
- [x] Reconcile Bun UUIDv7 slug/native and owned-byte/rival rankings in `bench/PERFORMANCE.md` §Native Bun default UUIDv7 text and §Owned UUIDv7 generation allocation; keep Deno/`uuidv7` distinct. Retained small-sample rankings do not justify another rewrite or prove total allocation parity. Clock/sequence allocation remains unattributed.
- [x] Retain the established draw rather than rejected shortcut, clock-inline, timestamp-cache and fixed-tail rewrites: gains are inconsistent or confined to secondary calls. Earlier independent draws add refills; do not infer an entropy-source bottleneck. `bench/PERFORMANCE.md` §Portable UUIDv7 entropy draw and §Exact counter storage preserve the alternatives and limits.
- [x] Record Bun UUIDv4 text's remaining rival, startup and total-allocation gaps in `bench/PERFORMANCE.md` §Native floors. Repeated native calls do not isolate worthwhile wrapper cost. Default-parameter, argument-count and preset shortcuts are rejected; removing `try` breaks fallback and import-time validation draws entropy. Recording the gaps does not close parity.
- [x] Reconcile owned UUIDv4 evidence in `bench/PERFORMANCE.md` §Native floors and §Portable UUIDv4 ownership paths. Deno throughput does not prove total-allocation or source-entry parity. Explicit buffers, scratch copies, constructor substitutions and native zero-byte decoding lose or remain unresolved; shared slabs violate ownership. Preserve fresh arrays and failure atomicity.
- [x] Record the missing direct Node `randomUUID` comparison in `bench/PERFORMANCE.md` §Native floors. The retained JITless package captures and Web Crypto comparison do not establish that floor or resource parity. Preserve fallback and presets; tuning remains behind higher-ranked calls.

### Configured calls

- [x] Dedicated UUID-plus-slug calls beat public composition in the latest retained matrix. Independent text draws lose on Node LTS/Deno; Bun-only dispatch retains costs on unselected graphs, and construction-selected updates slow base32 pairs. Frozen empty options raise codec-value costs. These shapes remain rejected, not pending implementations.
- [x] Record configured-call evidence limits in `bench/PERFORMANCE.md` §Native floors: explicit `{ at }` versus `uuid.v7({ msecs })` and selected generators versus stateful rivals remain unmeasured; default pairs have retained throughput comparisons. No new benchmark campaign is authorized.
- [x] Record missing pair total-allocation and immutable-value comparisons in `bench/PERFORMANCE.md` §Native floors. Retained pair throughput does not establish immutable-value resource parity; preserve generators, instants, layout identity and pair consistency.
- [x] Check generation failures with real caller examples in `__test__/consumer-probe.ts` and the shared runtime-boundary corpus. Node and Bun exercise callback-error identity, atomic caller writes, native fallback and dual failures. Preserve the approved default/configured distinction; caller-visible changes require a ruling.

### Conversion

- [x] Fixed writers remain selected by runtime: Bun Latin-1, WebKit native hex where available, fixed character codes elsewhere, and the measured JITless alternatives. Shared ASCII decoding, helper-only formatting and unrolled Feistel traversal lose other primary calls. Mask rounds, key order, sentinels and wire formats stay fixed.
- [x] Plain-slug text conversion and parsed-value writers reuse private bytes without discarded arrays. Public decoder reuse and shared writer extraction add validation or regress owned-byte controls. Owned Deno decoding beats equivalent copying methods in retained throughput evidence; source-entry and total allocation comparisons remain incomplete. Scure's codec and lowercase components do not justify a base32 rewrite.
- [x] Reconcile base64url encoding and owned decoding in `bench/PERFORMANCE.md` §Native floors, §Native base64url encoding and §Owned plain-slug decoding. Bun encoding retains a speed gap; owned decoding has lower medians than equivalent measured alternatives. Buffer-only results are incomplete floors; total allocation and Deno source-entry parity remain open. Preserve canonical spelling and ownership.
- [x] Reconcile UUID text/byte conversion in `bench/PERFORMANCE.md` §Native floors, §UUID text formatting and §UUID text parsing. Package medians are lower than equivalent measured rivals; fixed canonical inputs do not establish broader input or total-resource parity. Preserve accepted text forms, case presets, intrinsic wrapper normalization and owned bytes.
- [x] Preserve the qualified `uuidv7-js` extraction comparison: retained runs favor the package, but Bun gross allocation remains unmeasured. A parse-only native call is a lower bound, not equivalent full UUIDv7 validation.
- [x] Record the UUID guard's unresolved Bun rival and cold-import resource gaps in `bench/PERFORMANCE.md` §Canonical UUID text; later V8 comparisons supersede the older loss. Bun keeps its expression because normalization regresses. Preserve compact/wrapped text, nil/max and version-neutral acceptance; tuning remains held.
- [x] Record validated timestamp native-floor and total-resource gaps in `bench/PERFORMANCE.md` §Canonical timestamp parsing screen. A parse-only floor is incomplete; Bun gross allocation remains unmeasured. Preserve full validation and canonical output; the null-reference correctness repair remains active.
- [x] Retain case-insensitive UUIDv7 validation and fixed canonical timestamp reads; the carry oracle rejects signed low words and displaced digits. Packed replays and selection/resource mutations protect the shape, with native parsing on JITless Node. These results do not close the native-floor gaps.

## Edge verification

- [x] Enable edge checking in `.github/workflows/check.yml` through the existing release-profile packed-consumer job; install workerd and reuse its browser bundle. `ts-release-audit-edge-ci-combined.log` records the successful local command; its negative control rejects a missing engine, proving edge execution is required. The shared request corpus covers entropy failures, secure generation and explicit timestamp preservation in web-only and `nodejs_compat` modes. CI execution and deployment remain unverified; deployed checks require exact remote authorization.

## Held work

- [ ] HELD: secondary guards, timestamp extraction, shadowed-length defenses and timing-policy calibration need an explicit scope ruling before optimization resumes. Preserve correctness; calibration cannot block release repairs.
- [ ] HELD: caller-buffer optimization requires a scope ruling. Direct pool-to-caller copying is unretained; entropy failure must leave caller data unchanged, as protected by transactional-write and entropy-failure tests.

## Final verification and delivery

- [ ] Preserve `bench/check.ts`, `bench/resources.ts` and `bench/latency.ts` protection without duplicate hook timing or relaxed budgets. Valid-output waste mutations cover arrays, views, copies and native selection on Node/Bun/Deno/Chromium; counts are not total allocation. WebKit resource coverage and shared-CI headroom remain open; local lane/hook timings do not close them.
- [x] Align README rankings with retained comparisons: counter and clock differences do not exclude qualified rivals; Bun owned UUIDv7 comparisons and resource parity remain unresolved, and the UUIDv4 slug gap stays visible. Preserve the evidence limits in `bench/PERFORMANCE.md`; no new guarantee follows.
- [ ] Run `bun run check` before committing; require exit zero without dropping runtime, artifact, cleanup or defect coverage. Keep packed-artifact verification after build and test producers settle; `ts-release-audit-disk-cleanup-check-2.log` reproduces concurrent packlist traversal of Cargo temporary files. Apply `bench/README.md` §Regression protection; passing gates do not close reproduced defects or missing evidence.
- [ ] Report each release blocker and unresolved primary-call comparison from its evidence. Declare readiness only after the blockers are resolved; do not publish or write remotely.

## Proposals outside this plan

- [ ] Consider printing failed-step diagnostics last in `check:fast`, so truncated hook output still names the failure; this is not a release prerequisite.
