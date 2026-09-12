# TypeScript performance roadmap

## Goal and decision rule

Find remaining avoidable TypeScript work on the existing Node, Bun, Deno, and Chromium
routes without changing public behavior, wire formats, ownership, diagnostics, ordering,
cancellation, or fallback semantics. Treat every candidate as a hypothesis to falsify, not an
implementation commitment. Retain code only after two independent packed complete-route replays
show a material win with no higher-priority regression and the relevant behavior/resource mutation
fails its owning verifier. Record rejected mechanisms and their reopening condition in
`bench/PERFORMANCE.md`, including the tested workloads and runtimes, observed trade-off, statistical
limits, and contract boundary; remove experimental code and generated captures.

Rank latest stable Node Current and Bun first, latest Node LTS and Chromium second, and latest Deno
third. Rank Node Current JITless after Deno; a JITless-only win may justify retention when every
higher rung is unchanged. Supported older Node versions gate correctness and compatibility, not performance trade-offs.
Rank fallbacks only by runtimes whose normal dispatch reaches them; native-shadowed runtimes prove
portability but do not steer. A contract-changing candidate is closed by identifying that boundary
unless the maintainer separately changes the HLD.

## Work

### Highest decision value

- [x] Packed comparisons select a Node executable and record its observed version.
- [x] Complete profiles select a Node executable, isolate its `NODE_OPTIONS`, and name timing
  reports by its observed version.
- [x] Run retained TypeScript candidates on latest Node Current before latest Node LTS; reopen any
  candidate whose higher-priority result contradicts its retention basis.
- [x] Verify CI runs latest Node Current and Bun first, latest Node LTS and Chromium second, and
  latest Deno third while supported Node floors retain correctness coverage.
- [x] Audit latest Node Current profiling, tracing, diagnostics, resource, syscall, and statistics
  capabilities against the harness; add only instruments with distinct decision value.
- [x] Build one capability-join profile from counters, GC and heap state, sampled stacks, traces,
  and runtime-native reports; define a per-signal fallback ladder instead of choosing one profiler.
- [ ] Rebuild Bun and Deno's runtime-native API inventory from installed documentation, release
  deltas, and current upstream docs. Test each relevant addition, change, deprecation, or removal.
- [ ] Rebuild Bun and Deno's Node-compatible API inventory from current Node API candidates;
  reject runtime-name or property-presence claims that lack a semantic probe.
- [ ] Rebuild Deno's web and Chromium-compatible API inventory from current Chromium API candidates;
  separate shared V8 behavior from host API behavior.
- [ ] Probe each relevant capability's call shape, output, ownership, errors, limits, and scheduling
  on every installed runtime; make dispatch capability-based and exercise unavailable semantics.
- [ ] Compare each viable native path and its compatible fallback twice through the complete public
  route; preserve decision-changing evidence, rejected alternatives, limits, and reopening triggers.
- [x] Add per-case page-fault, filesystem-I/O, and context-switch deltas from
  `process.resourceUsage`; existing timing, CPU, and heap data cannot infer them.
- [x] Add per-GC cost and before/after heap state through `v8.GCProfiler`; trace events alone do
  not preserve that state.
- [x] Add Node filesystem and thread-pool trace categories; broad V8 and performance categories do
  not expose these operations.
- [x] Capture Node C++ heap, code metadata, and heap-space state around native profiles.
- [x] Measure Node Current with and without JIT across cold start, throughput, CPU, and memory; keep
  JITless only if a real workload tier values its resource win above its throughput cost.
- [x] Reject duplicate `node:v8` CPU and heap handles: Inspector already scopes the same profilers
  around the measured corpus and captures collected allocations.
- [x] Reject `diagnostics_channel` spans for pure synchronous package calls: they add work but no
  attribution missing from the scoped corpus.
- [x] Reject Node-only histogram tests in the cross-runtime comparator: exact paired samples and
  distribution-free median intervals stay portable and preserve more raw evidence.
- [x] Reject per-iteration event-loop histograms here: direct batch and uninterrupted-block timing
  already measures the relevant responsiveness boundary with less observer work.

- [x] Exhaustive migration candidates reuse one private block restored from four scalar ciphertext
  words. A zero-schema behavior case and the 1/4/8/16-schema profile corpus separate first, middle,
  last, miss, and exhaustive routes; two packed replays retained gains at 8 and 16 schemas on every
  runtime with no repeated first-match regression, while the resource probe reduced 16-schema
  slicing from 16 to one.
- [x] Canonical UUID text now packs directly into base64url only when the runtime lacks the native
  encoder. Two packed replays retained a 20–21% Node fallback gain; Bun, Deno, and Chromium kept
  their native path without a repeated change. The resource probe observes zero fallback buffers,
  while byte-space and diagnostic mutations prove wire identity and parser-error preservation.
- [x] Canonical UUID text packs directly into base32hex without an intermediate byte array. Two
  packed replays retained public-route gains on every runtime while byte and masked controls stayed
  unchanged. The shared byte-space and diagnostic falsifiers cover both direct alphabets; the
  resource probe observes no temporary buffer.

### Conditional implementation candidates

- [x] Compare byte-sentinel identity structures at 0/1/4/16/64 entries under
  first/middle/last/miss and forced-collision inputs. Charge construction, retained memory, string
  encoding, and byte encoding; retain no index that slows ordinary codecs.
- [x] Test linear sentinel scan as the small-set control and determine the measured crossover where
  indexing repays setup and lookup work.
- [x] Test an adaptive linear/indexed sentinel strategy so 0/1/small sets pay no index cost while
  larger sets avoid full scans; derive its threshold from repeated complete-route measurements.
- [x] Test first-sentinel specialization before indexed lookup because default sentinels can make
  the first entry materially hotter than the remainder.
- [x] Test a last-32-bit sentinel bucket map with full 16-byte equality inside each bucket; reject
  if collisions change identity or four-byte key extraction costs more than the avoided scan.
- [x] Test two-level sentinel buckets only if one 32-bit key leaves measured collision chains;
  reject extra maps when one discriminating word already bounds the chain.
- [x] Test a sorted sentinel-key table with binary search against hash lookup; include construction,
  branch prediction, collision ranges, and exact-equality fallback.
- [x] Test compact open-addressed sentinel storage against built-in `Map`; reject owned hashing or
  probing code unless retained memory and lookup both improve materially across primary runtimes.
- [x] Test a compact fingerprint table before full sentinel equality; vary fingerprint width and
  adversarial collisions, and retain only if fewer byte comparisons repay false-positive checks.
- [x] Test packed scalar sentinel words instead of retained byte arrays; charge conversion and code
  size, and reject if it duplicates the canonical sentinel identity source.
- [x] Test canonical UUID-string sentinel lookup for string inputs as an independent path; reject if
  formatting bytes merely moves more work ahead of the existing exact byte comparison.
- [x] Test direct canonical base64url slug-to-UUID formatting without an intermediate byte array.
  Preserve canonical-tail rejection and exact invalid-character offsets; reject if native
  hexadecimal formatting or code duplication dominates the public route.
- [x] Test direct canonical base32hex slug-to-UUID formatting without an intermediate byte array.
  Preserve canonical-tail rejection and exact invalid-character offsets; reject if native
  hexadecimal formatting or code duplication dominates the public route.
- [x] Test scalar scratch only in final KDF round-key expansion, isolated from the previously
  rejected polymorphic hot hash paths. Measure construction across seed forms and iteration
  boundaries; reject unless allocation and complete construction both improve repeatedly.
- [x] Test streaming UTF-8 packing for cooperative string seeds with `TextEncoder.encodeInto` where
  available and the current encoder as fallback. Vary ASCII, multibyte, surrogate boundaries, and
  geometric seed sizes; retain only if peak memory and elapsed work improve without extra ordinary
  seed cost or changed derived keys.
- [x] Test streaming byte-seed hashing that avoids the full packed-word allocation while preserving
  the frozen HalfSipHash byte stream. Compare synchronous and cooperative construction over
  geometric seed sizes; reject unless large-input resource savings justify the additional state
  machine and ordinary seeds remain unaffected.
- [x] Test a standalone specialized UUID validator rather than sharing parser control flow. Compare
  valid values and invalid character/hyphen/version/variant positions under mixed workloads; reject
  unless both primary runtimes improve repeatedly without a second validation truth source.
- [x] Isolate Node's unresolved mixed-workload parser slowdown by varying only preceding operation
  families and order. A product change requires a repeatable public workload mechanism, not a
  benchmark-order artifact; close the task if no code-shape candidate predicts and removes it.
- [x] Test a subarray-free offset byte-to-UUID formatter against native and portable formatting.
  Vary exact, offset, oversized, and caller-supplied buffers; reject unless removing the view yields
  a repeated complete-route win without duplicating the formatter.
- [x] Test packed 32-bit UUID equality against byte loops where exact 16-byte identity dominates.
  Vary aligned, offset, shared, and plain buffers; reject views, endian assumptions, or weaker checks.
- [x] Test a table-driven UUID parser state machine against offset iteration. Preserve exact error
  positions, hyphen rules, version/variant checks, and atomic caller-owned writes.
- [x] Test branchless hexadecimal validation and decode tables against the current guarded parser.
  Separate valid-heavy from invalid-heavy workloads; reject slower diagnostics or opaque control flow.
- [x] Test direct slug decode into four scalar words before materializing bytes. Retain only if it
  removes intermediate writes across validation, masking, and formatting without weakening errors.
- [x] Test fused alphabet decode and canonical-tail validation. Vary every invalid position and tail
  alias; reject if fusion duplicates alphabet truth or modifies output before late failure.
- [x] Test specialized fixed-length base64url and base32hex decoders against the generic accumulator.
  Keep the generic path only where variable length is public; require packed-route wins in both alphabets.
- [x] Test scalar UUID formatting from four words against byte indexing and native `toHex`. Preserve
  offset-buffer behavior and reject any primary-runtime regression or duplicated format inventory.
- [x] Test generator counter state as packed scalars versus the current split words. Vary rollover,
  clock rollback, reseed, native delegation, and caller-owned output before changing state shape.
- [ ] Test random-pool refill size geometrically across syscall count, cache footprint, contention,
  latency tails, and discarded bytes; choose no fixed size from throughput alone.
- [ ] Test a ring cursor over the random pool against copy-and-erase traversal. Preserve erasure and
  caller ownership; reject retained secret bytes or extra views even if average throughput improves.
- [ ] Test thresholded migration-candidate deduplication with linear scan below crossover and `Set`
  above it; compare duplicate-heavy and distinct-heavy schema outputs before adding a second structure.
- [ ] Test compact bitsets only for closed bounded validation sets now represented by `Set`; reject
  them where coercion, readability, or sparse domains erase the lookup benefit.
- [ ] Test lazy construction of rare migration and sentinel structures against eager setup. Preserve
  immutability and deterministic errors; reject hidden mutable initialization or first-call latency spikes.
- [ ] Test reusable bounded scratch owned by synchronous codec closures where calls cannot overlap.
  Reject it for reentrant callbacks, async paths, caller aliasing, or retained secrets.
- [ ] Test chunked cooperative KDF state as a resumable iterator with one bounded buffer. Preserve
  cancellation, call-time snapshots, progress, and exact frozen output before replacing chunk arrays.

### Workload-gated candidates

- [ ] Measure candidate deduplication growth before replacing `Array.includes` with a `Set`. Vary
  schemas that yield 0/1/many duplicate and distinct UUIDs; proceed only if realistic candidate
  counts make quadratic comparison material after charging the set allocation.
- [ ] Measure fresh package import repeatedly before changing module topology. Separate parsing,
  adapter probing, initialization, and filesystem cache state; alter exports only if startup is a
  demonstrated consumer bottleneck and the public synchronous API remains intact.
- [ ] Measure repeated-decode locality before designing a bounded decode cache. Proceed only with a
  real reuse distribution, explicit capacity and invalidation, and total memory/latency benefit;
  unbounded storage and hidden mutable codec behavior remain forbidden.
- [ ] Measure large cooperative string-seed peak memory before replacing chunk arrays with a bounded
  reusable encoding buffer. Proceed only when retained/gross allocation evidence shows the chunks,
  rather than packed words or hashing, dominate.
- [ ] Measure invalid-input frequency and `UuidSlugError` construction attribution before exploring
  cheaper error creation. Preserve `Error` identity, stack, cause, code, and diagnostics; no change
  is allowed if the proposed saving weakens an observable error contract.

### Contract-boundary falsification

- [ ] Falsify deferred byte-seed copying against the async constructor's call-time snapshot
  contract. Close without implementation if caller mutation can change derived keys; otherwise
  measure the lawful design's call-time blocking and total allocation.
- [ ] Falsify transferring the caller's byte-seed buffer against caller ownership. Test only a
  design that leaves caller storage usable and preserves synchronous capture; close if transfer
  detaches observable storage or an extra copy merely moves the same work.
- [ ] Falsify worker-owned byte-seed snapshots against cross-runtime availability and end-to-end
  cost. Charge worker startup, messaging, transfer, cancellation, and fallback; close if preserving
  synchronous capture leaves the original main-thread copy in place.
- [ ] Falsify fused validation and direct writes into caller-owned output against atomic failure.
  Retain staging unless a single-pass design can prove no caller byte changes for every late invalid
  character, noncanonical tail, range failure, and runtime exception.
- [ ] Falsify a second native-capability cache against the existing module-load probes and injected
  native-failure seam. Close unless attribution shows the one property dispatch is material and a
  cache preserves production fallback tests without duplicate state.
- [ ] Falsify automatic previous-key reordering against caller-ordered first-match semantics. Do not
  implement unless all observable ambiguous matches remain identical; otherwise record that the
  proposed speedup changes the contract.
- [ ] Falsify parallel previous-key attempts against ordered completion and sub-microsecond task
  costs. Charge scheduling, coordination, cancellation, and every earlier unresolved key; close if
  the earliest lawful return cannot beat sequential traversal.
- [ ] Falsify adding a wire key selector against existing identifier compatibility and information
  exposure. Treat it as an HLD change, not an optimization, unless a backward-compatible spelling
  preserves every issued identifier and the maintainer explicitly approves the new observable.
- [ ] Falsify worker offload for ordinary synchronous operations against transfer, scheduling, and
  synchronous API costs. Close if end-to-end latency exceeds direct execution or if preserving the
  call shape requires blocking coordination.
- [ ] Recheck HalfSipHash round unrolling only after a retained upstream layout or engine change
  invalidates its two-replay rejection; otherwise close from existing evidence without rerunning it.
- [ ] Recheck scalar HalfSipHash message protocols only after a retained upstream call-shape or
  engine change invalidates their two-replay rejection; keep the general call monomorphic.
- [ ] Recheck alternate ordinary-array Feistel scratch only after an engine change invalidates its
  two-replay rejection; do not substitute a new array shape without complete-route evidence.
- [ ] Recheck `DataView` Feistel word access only after engines can eliminate its view cost or one
  safely reusable view can serve varying caller buffers; otherwise retain shift-based helpers.
- [ ] Recheck private direct built-in mask dispatch only after attribution predicts a material
  callback-dispatch win that repays the extra registry and constructor.
- [ ] Recheck codec-closure Feistel scratch only if transforms stop being synchronous and
  callback-free or an engine demonstrates a repeated closure-locality gain.
- [ ] Recheck fixed four-round Feistel unrolling only after a primary engine stops optimizing the
  constant trip count; reject any secondary-only gain that does not repay duplicated cipher code.
- [ ] Recheck separate mask and unmask Feistel loops only after direction selection becomes an
  attributed bottleneck; preserve one reversible wire-format implementation otherwise.
- [ ] Recheck construction-time scalar key capture only after typed-array indexing becomes an
  attributed primary-runtime bottleneck; charge its branches and packed-code growth.
- [ ] Recheck fixed-offset big-endian read/write inlining only after generated code shows the shared
  helpers are no longer inlined or specialized by a primary engine.

### Closure

- [ ] Pair every roadmap candidate with its source mechanism, consumer route, contract boundary,
  discriminating experiment, and explicit stop rule; delete duplicates or entries that cannot turn
  a decision.
- [ ] Run affected Node Current, Bun, Node LTS, Chromium, Deno, and Node Current JITless
  behavior/resource lanes for every retained
  change, including a deliberate mutation that proves each new verifier reaches its intended defect.
- [ ] Run two independent packed comparisons for every retained candidate, then the complete profile
  corpus and `bun run check`; verify packaged TypeScript and Rust APIs are unchanged.
- [ ] Move durable conclusions to `bench/PERFORMANCE.md`, remove generated evidence and completed
  roadmap tasks, and leave the worktree clean.
