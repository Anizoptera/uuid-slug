# Remaining work

## Cross-runtime implementation comparison

Compare every maintained TypeScript runtime, native Rust feature variant and WASM variant on equivalent API jobs, warmed and optimized for performance: minified JavaScript and release Rust/WASM, without debug artifacts or disabled JITs. Cover API variants and common scenarios, retain raw evidence, and generate a rerunnable Markdown report centered on relative differences and uncertainty. Keep small fluctuations out of rankings. Benchmark work is authorized; product changes, publication and remote writes are not.

- [x] Cover each distinct Rust capability selection, including reduced browser WASM, std-only and OS entropy without std; the complete 76-lane smoke produced 304 captures with release-profile checks.
- [x] Trace and fault-test secure entropy selection in JavaScript and browser Rust/WASM before timing; the complete smoke records source rejection and recovery, reduced-build absence, and report rejection of missing policy or insecure source labels. A zero-fill mutation fails the real-worker regression.
- [x] Reuse the measurement and correctness corpus across runtime variants; add missing jobs without changing product behavior.
- [x] Keep one rerun command and validated relative report; the existing process supervisor owns interruption cleanup, and complete JSON Lines can regenerate the report without timing.
- [x] Pair adjacent fresh-process reference/candidate repeats, retain comparison edges, and include both workerd modes without mixing HTTP dispatch into per-call timing.
- [x] Preserve Bun FFI before Node-API fallback and Node-API before Node FFI fallback; the complete check executes automatic selection and missing-primary-library fallback with real native libraries on both hosts.
- [ ] Diagnose the full-corpus timing noise before restarting the matrix: identical Node artifacts show individual-job repeat displacements up to 5.6×. Distinguish scheduling delay, JIT/GC state and harness work with independent evidence; test whether closer job pairing changes that result. The interrupted full run is retained in task scratch as `corpus-pairing-incomplete.jsonl`, not a final report.
  - [x] Add optional per-batch caller-thread CPU observations and falsify incomplete data; four identical Node workers retain 396 jobs each, including 393 synchronous CPU series. One elapsed repeat differs by about 19× while its CPU repeat stays within about 4%; the original run's cause remains unproved.
  - [x] Screen whole-corpus and per-job ABBA on the same warmed three-job Node workers, with idle processes suspended and order reversed across six fresh cohorts: 144 captures from 48 processes. All identical-artifact intervals include 1; per-job pairing narrows two intervals and widens one, so this screen establishes no general winner.
  - [x] Compare the same schedulers on the complete 396-job JavaScript corpus in two fresh crossover blocks: 6,336 captures from 16 processes, with runtime, priming and secure-source receipts. Per-job scheduling lowers the worst observed log-ratio error in 194 jobs and raises it in 202; this bounded A/A screen establishes no general winner or A/B validity.
  - [x] Read the new Vault guide and its notes on paired scheduling, hierarchical variance allocation, warm-up, PELT, detectability, confidence sequences, work counters and the TT-MDE artifact; their source observations are not independently reproduced findings.
  - [ ] Make every timed result contribute to an emitted witness; an integer check on XOR state is tautological, and opaque setup results need a meaningful consumption boundary. Qualify with actual optimized workers and valid-output extra-work controls before treating timings as implementation evidence.
  - [x] Fix reference reversal on varied even-sized ratio samples: the log-space midpoint gives reciprocal report estimates; the regression rejects the prior 4 and 0.5 results. Keep the report's typical-ratio estimand distinct from arithmetic mean cost and tails.
  - [x] Randomize implementation exposure and ABBA/BAAB orientation before timing, retain actual acquisition order, and state common-distribution and independent-block assumptions; eight report regressions reject broken windows while accepting either balanced orientation. Legacy captures remain explicitly nonrandomized. Do not adopt concurrent Duet as isolated performance or use A/A alone to qualify differing bottlenecks.
  - [ ] Stream and validate raw observations once, retain compact process summaries in memory, and preallocate known timing buffers; measure the retention change against the same real records.
  - [ ] Preserve the previous complete report and evidence through failed updates; inspect existing artifact helpers before choosing a bounded publication design and expose any changed retention semantics for review.
  - [ ] Assess repetition allocation from the retained hierarchy and cost, preserve pairing during budget changes, and keep a fixed-sample final decision unless a matching adaptive-inference model is established. Unbounded pauses do not satisfy bounded confidence-sequence assumptions merely because a hang deadline exists.
  - [ ] Include actual maintained per-call native and WASM bridge costs as separately labeled transport jobs, using the existing host registry and release artifacts; compiled Rust application loops must not stand in for crossing costs.
  - [ ] Remove experimental builder controls and task scratch after their retained evidence and consumers are settled. Active scratch: `/var/folders/fh/5p3dywss4w53y0mr9f6ftnwc0000gn/T/uuid-slug-final-check.jsJEFaXC94`; no full acquisition is running.
- [ ] Falsify reporting with identical controls, reversed comparisons, missing lanes and invalid measurements; run the complete selected matrix without overlapping timing workloads.
- [ ] Review the generated report against raw records, document rerun controls and limits, commit the results and remove owned scratch.

## Joint Rust and TypeScript release preparation

Deliver the same capabilities and identifier formats through APIs natural to each language, with correct and predictable consumer experience first, performance and resource efficiency second, and maintenance simplicity third.

### Design, authority and completion

Preserve issued identifiers, secure entropy, caller ownership and typed failures. Keep Rust's owned `Uuid` value, immutable masking codecs and separately owned mutable generators. Keep one published Rust crate and the dependency-free TypeScript package; keep Rust dependencies when they do the best reasonable job, replacing them only for demonstrated performance or resource gains without quality loss. Keep `std` optional. Prepare the matching version selected by both manifests (currently `0.6.0-dev`, candidate `0.6.0`); do not change release versions as part of preparation.

Derive internals from these requirements; do not change user-visible APIs, behavior, guarantees or risks without a maintainer ruling. Local implementation, investigation, documentation, verification and focused commits on the current branch are authorized. Release versions, tags, pushes, publication, remote settings/secrets and finalization require explicit authorization for each operation; preparation grants none.

This is the sole live plan. Keep dependent repairs with their task and unrelated unfinished work below. Completion requires acceptance evidence tied to its command, revision, features, profile and target, with coverage limits. Replace superseded evidence; retain only what a remaining decision needs. Durable contracts belong in their existing owners.

- [ ] Refresh the development archives referenced by `bench/reports/joint-current-artifacts.LihLzb/refresh.json` before release use: they predate masked binary support and the reader type corrections. Stable-tag verification remains separate.

Use `bench/decisions.md` for codec, interoperability, storage and O2 choices, rejected alternatives and measurement limits. Deno base32 parity, other native-platform execution, hosted docs.rs, remote job duration and trusted publishing remain unverified. Keep existing regression gates; missing performance comparisons do not block preparation or authorize new experiments.

### Release holds

- [ ] Authorization required: change to the release version/create its tag only after explicit approval; run the exact-tag preparation gate and review generated release notes before any authorized push/publication.
- [ ] Authorization required: publish both verified artifacts under `dev/release.md`, verify registry bytes, configure trusted publishing, remove/revoke the bootstrap credential and verify remote state. Retain the original package selection and verified archives on partial retries; never move a published tag or omit a selected package. Keep the release draft until destinations, attachments, notes and provenance match.

## Runtime support

- [ ] Decide later whether to also publish to JSR, where Deno can load the TypeScript source; it needs a ruling against the one-npm-package rule in `dev/cross-language.md`, a condition-free Deno entry and slow-types checks.
- [ ] Propose the Aponte agent-gotcha rule (packed-consumer checks must match real install layout) and write it only with approval.

## Follow-up

- [ ] Resolve the advisory affecting competitor `slugid` through its `uuid ^9` dependency. Keep this dev-only comparison on the upstream dependency graph; do not silently override it.

- [ ] Resolve the upstream-relative Node base32 gap: its median stays about 3% higher; one full lane fails at 1.031 [1.0033, 1.1382], while the unchanged replay and seven-runtime matrix pass. The pre-reduction control also has a higher median; a direct comparison finds no resolved loss from the four reductions. Cause and parity remain unproved; preserve both outcomes and the full filter (`bench/decisions.md` §Historical base32 slowdown).
