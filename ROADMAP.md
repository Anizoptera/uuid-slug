# TypeScript performance roadmap

## HLD boundary

Preserve every published TypeScript contract, wire format, accepted input, output, error, runtime
fallback, ownership rule, and supported runtime. Optimize Node, Bun, Deno, and browser TypeScript
paths only. Do not change the Rust implementation or use it to hide TypeScript cost.

Prioritize performance decisions in this order: Bun and Node first, Chromium second, Deno third.
A Deno-only regression does not veto a clear primary-runtime improvement; quantify it and preserve
all Deno contracts.

Safe APIs remain the default. A substantially faster unsafe public variant is permitted only when
consumer value justifies its explicit misuse risk; its name and declaration must state the lost
protection, and no default or fallback may select it.

## Evidence rules

- Profile the complete public call, not an internal proxy. A faster implementation is rejected if
  correctness, entropy, ownership, fallback, responsiveness, or package behavior changes.
- Compare runtimes independently. Record executable, version, hardware, inputs, warm-up, sample
  distribution, CPU attribution, allocation evidence, and profiler limits.
- Never act on one performance run. Repeat the decision-relevant workload and require a reproducible,
  statistically distinguishable, material effect; an unresolved or negligible result earns no code.
- Correctness gates measurement and acceptance. Before timing each candidate, map every contract and
  failure mode its mechanism can change, audit the owning tests, add the smallest missing falsifiers,
  and mutate the changed mechanism to prove those tests reach it. Run all affected runtime tests
  before and after measurement; reject any speedup whose invariant remains unproved.
- Treat Bun and Node as independent co-primary targets: a repeated material win in either survives
  when the other is unchanged, unless contract risk or lifetime cost outweighs it.
- Exercise every portable encoder and fallback directly on all four runtimes, including hosts whose
  normal route selects a native implementation. For that portable path, first rank runtimes where
  normal dispatch uses it by the main runtime order; rank every runtime that shadows it with a native
  implementation last. Shadowed runtimes verify portability but do not steer fallback trade-offs.
- Before each experiment, state the rival explanations and the result that would reject the change.
  Change one mechanism at a time; alternate baseline and candidate order.
- Keep a change only when repeated measurements show a material win or remove proven wasted work
  without moving cost to another public path. Delete experimental code and generated profiles.
- Record every rejected variant in `bench/PERFORMANCE.md`: name the changed mechanism, repeated
  public-route result, rejection reason, and evidence that would justify retesting it.

## Work

### Inventory and instrumentation

- [ ] Map every public TypeScript method, overload, option, alphabet, success path, failure path,
  caller-owned buffer path, codec mode, migration mode, sentinel path, and runtime delegation path
  to an existing benchmark case or an explicit missing case.
- [x] Add the missing invalid-range, invalid-alphabet, wrong-version, timestamp-window, and
  construction-failure rows; keep returned errors separate from thrown programmer errors.
- [x] Add the missing mask seed representation, derivation-work, custom-transform failure, codec
  option, migration-option combination, and sentinel-collision rows.
- [x] Verify every overload and caller-owned row preserves output identity and atomic failure before
  its timing result can rank an implementation.
- [x] Verify native success, malformed result, throw, portable success, and dual failure by v4 and
  v7 string, byte, caller-owned byte, and slug route; per-capability counts expose wrong delegation.
- [x] Profile cooperative mask derivation separately from synchronous calls across seed type, UTF-8
  boundaries, iteration count, chunk boundaries, cancellation phase, scheduling delay, and runtime.
- [x] Map and execute the packed routes: Node loads `dist/node` with its adapter, Bun loads published
  TypeScript with its adapter, and Deno plus Chromium load `dist` with the web adapter.
- [x] Audit benchmark setup, warm-up, sinks, batching, clocks, GC handling, process isolation, output
  validation, and statistics for optimizer elimination, harness domination, and false comparisons.
- [x] Replace fixed-order single-pass candidate acceptance with one alternating baseline/candidate
  driver over identical packed artifacts, randomized runtime order, distributions, and control rows.
- [x] Report paired per-round ratios with an exact distribution-free 95% median interval; short
  smoke runs make no performance claim, and retained changes require two significant full replays.
- [x] Enumerate syntax, call-shape, allocation-ownership, specialization, inlining, closure, module,
  lookup, arithmetic, typed-array, and runtime-delegation variants that can change generated code or JIT behavior.
- [x] Extend one maintained profiling harness to run the same applicable public-operation corpus on
  Node, Bun, Deno, and a real browser; fail on missing runtimes, cases, malformed output, or zero work.
- [x] Add native CPU profiling launch and normalization for Node, Bun, Deno/V8, and the browser;
  retain raw engine profiles only under ignored `bench/reports/`.
- [x] Census current official runtime profiling surfaces and probe installed CLIs with invalid-option
  controls; distinguish documented, accepted, effective, unavailable, and version-dependent channels.
- [x] Capture Bun's separate JavaScriptCore and native allocator heaps through `heapStats`, a JSC
  object-graph snapshot, forced-GC survivor state, and paired mimalloc reports; do not treat the
  V8-format exit snapshot as allocation sampling.
- [x] Capture Bun's JavaScriptCore sampling profile, including JIT-tier bytecode attribution, and
  reject unstable profiler entry points that crash the installed runtime.
- [x] Capture Node and Deno V8 CPU, allocation, retained-heap, GC, native-code, and process-resource
  evidence through the strongest available independent channels; record unsupported channels.
- [x] Capture Chromium CPU, allocation, retained-heap, task/GC trace, performance metrics, and
  responsiveness from the shipped browser artifact through CDP.
- [x] Add allocation and retained-memory probes that distinguish gross allocation, survivor growth,
  caller-owned output, and runtime startup where each host exposes suitable evidence.
- [x] Add event-loop responsiveness probes for long-running construction and repeated public calls;
  measure uninterrupted work separately from throughput and reject readiness sleeps.
- [x] Keep smoke instrumentation within routine feedback budgets and put deeper sampling behind the
  same harness without giving slow evidence gating authority.
- [x] Keep corpus preparation outside native capture windows and start measurement only from an
  observed runtime-ready signal; quantify unavoidable profiler start/stop self-noise.

### Candidate map

- [x] Reject unrolled HalfSipHash compression rounds: two packed 24-round replays found no
  reproducible Bun or Node gain, while direct duplication increased the hash core.
- [x] Reject unrolled HalfSipHash finalization rounds: two packed 24-round replays found no
  repeatable Bun or Node gain, while straight-line duplication enlarged the hash core.
- [x] Reject fixed-length dispatch inside the existing hash function: two packed 24-round replays
  reproduced 3–7% regressions across major Node masking routes.
- [x] Reject union-discriminated scalar Feistel message arguments: two packed 24-round replays
  reproduced Bun and Chromium regressions because polymorphic hash dispatch outweighed removed stores.
- [x] Reject a dedicated scalar hash entry over one shared round core: two packed 24-round replays
  reproduced 2.7–6.4% Node and 9–23% Chromium regressions across masked routes.
- [x] Reject ordinary numeric-array hash scratch: two packed 24-round replays reproduced 2.1–6.2%
  Node and 22–50% Chromium regressions despite reducing packed code by 30 bytes.
- [x] Reject per-call hash scratch: two packed 24-round replays reproduced 7.4–20.6% Node and
  4.1–6.7% Bun regressions because the runtime did not eliminate the two allocations.
- [x] Reject codec-closure hash scratch: two packed 24-round replays found no repeatable runtime
  gain, while the factory and shared-core seam added code and the second replay regressed Bun routes.
- [x] Reject unrolled four-round Feistel traversal: two packed 24-round replays found no Bun or Node
  gain; a repeated 2.2% Deno byte-encode gain did not justify 230 extra packed bytes.
- [x] Reject preselected Feistel key start and stride: two packed 24-round replays found no
  statistically distinct Bun or Node route, and the extra loop state had no measured value.
- [x] Reject separate mask and unmask Feistel loops: two packed 24-round replays found no repeatable
  Bun or Node gain, while duplicating the round body added about 80 packed bytes.
- [x] Reject construction-time scalar key capture: two packed 24-round replays found no repeated
  Bun or Node route gain, while scalar selection added about 170 packed bytes.
- [x] Reject inlined fixed-offset big-endian I/O: two packed 24-round replays found no Bun or Node
  gain, while source duplication added about 200 packed bytes and Chromium regressions.
- [x] Reject `DataView` big-endian I/O: two packed 24-round replays reproduced 18–46% Node,
  29–69% Bun, 6–14% Deno, and 47–110% Chromium regressions.
- [x] Reject fixed-offset check-tag unrolling: it produced no cross-runtime win and regressed
  selected Node, Deno, and Chromium masked routes by 4.9%, 8.2%, and 13.9%, respectively.
- [x] Reject tag accumulation during the mandatory input read: a built-in scalar Feistel path had no
  encode route improve significantly in both packed replays, while it added another transform shape.
- [x] Reuse owned UUID blocks for tagging and masking. Retain one shared guard path with a final
  direct ownership branch; duplicated closures and indirect dispatch slowed Bun's borrowed route.
- [x] Reject codec-construction alphabet wrappers: an eight-round packed screen found no
  statistically distinct Node or Bun masked encode route, while four wrappers added indirection.
- [x] Profile and optimize each portable alphabet encoder directly on Node, Bun, Deno, and Chromium,
  including runtimes whose public route normally delegates to native encoding.
- [x] Profile and optimize portable base64url and base32hex decoding directly on Node, Bun, Deno,
  and Chromium; preserve exact character offsets, canonical padding rejection, and caller-owned writes.
- [x] Specialize portable 16-byte base64url decoding. Two packed replays improved direct and
  caller-owned routes on every runtime while exact offsets, canonical tails, and bytes stayed fixed.
- [x] Specialize portable 16-byte base32hex decoding. Two packed replays improved Bun's direct and
  public routes while Node stayed unresolved and every runtime preserved exact decoding behavior.
- [x] Reject regex prevalidation plus direct base32hex bit formulas: the screen regressed Node,
  Deno, and Chromium direct decoding while Bun stayed unresolved.
- [x] Specialize portable 16-byte base32hex encoding. Two packed replays improved Node's direct
  fallback and public conversion while Bun stayed improved or unresolved; all runtimes exercised
  the exact portable implementation.
- [x] Specialize portable 16-byte base64url encoding and expose it to the shared profiler. Two
  packed replays improved Node plain and masked routes while native-shadowed Bun stayed unchanged;
  direct profiles reached the fallback on all four runtimes.
- [x] Keep capability-probed native base64url encoding with a portable fallback. Two public-route
  replays rejected portable encoding on Bun, Deno, and Chromium; Node used the fallback in both.
- [x] Mask the validated parser-owned block directly: repeated packed comparisons improved string
  encoding on every runtime while preserving the caller-owned byte path.
- [x] Reuse one codec-local block for borrowed masked-byte encoding. Nested custom-callback tests
  prove input isolation; two packed replays improved Node and Deno while Bun and Chromium stayed unresolved.
- [x] Replace linear string-sentinel encoding scans with a construction-time UUID index. Geometric
  first, middle, last, miss, byte-path, and construction controls isolated the affected work.
- [x] Reject a construction-time ordered schema array with one uniform decode loop: two packed
  screens found no repeated Node or Bun win, while the first regressed an eight-key Node hit.
- [x] Reuse one restored private block across failed previous-key attempts. Geometric comparisons
  improved multi-key hits and failures without a repeated current-key regression.
- [x] Reject built-in mask exception bypass: two packed screens found no repeatable built-in win,
  while Node timestamp extraction regressed and custom decode also lost in the second screen.
- [x] Reject a private built-in schema discriminant: two packed screens found no repeatable Node or
  Bun gain, so its `WeakMap`, lookup, and second constructor did not earn their lifetime cost.
- [ ] Falsify eager runtime adapter imports versus guarded lazy capability loading using cold and warm routes.
- [ ] Falsify native UUID generation delegation versus portable generation by output form and entropy behavior.
- [x] Map portable UUIDv4 independently across forced text fallback, owned and caller-owned bytes,
  entropy refill, and both slug alphabets; reuse public rows where those routes are always portable.
- [x] Map portable UUIDv7 across string, owned and caller-owned bytes, both slug alphabets,
  explicit time, same-millisecond continuation, advancing and rollback clocks, and entropy refills.
- [x] Force and profile portable UUIDv4 directly on Node, Bun, Deno, and Chromium, including hosts
  whose public text route delegates to native UUID generation.
- [x] Force and profile portable UUIDv7 directly on Node, Bun, Deno, and Chromium; native and
  routine captures cover CPU, allocation, entropy, state transitions, and uninterrupted duration.
- [x] Route the exact private UUIDv4 text fallback into the shared profiler; its source-built case
  executes on Node, Bun, Deno, and Chromium without disabling each host's native public route.
- [x] Falsify portable UUIDv4 alternatives for entropy reuse, owned and caller-owned writes,
  formatting, branches, and shared-pool interactions; retain only repeated public-route wins.
- [ ] Falsify portable UUIDv7 alternatives for entropy draw size and reuse, state layout, byte
  assembly, formatting, caller-owned writes, clock reads, branches, and runtime-specific primitives.
- [x] Draw only the ten entropy bytes portable UUIDv7 consumes; two packed replays improved
  byte-oriented routes on Node and Bun without changing payload-bit coverage or atomic failure.
- [x] Refill only the four portable UUIDv7 tail bytes on same-millisecond and rollback continuation;
  two packed replays improved affected Node and Bun routes while advancing-time movement did not repeat.
- [x] Reject four fixed portable UUIDv7 tail writes: primary byte routes were unresolved and Bun
  string generation regressed in the packed screen, so unrolling added code without route value.
- [x] Reject `Uint8Array#set` for the four-byte portable UUIDv7 tail: complete Node and Bun routes
  regressed beyond the unrelated control, so intrinsic call overhead exceeds the tiny copy.
- [x] Reject one safe-integer portable UUIDv7 sequence state: it improved Bun continuation but
  regressed Node caller-owned and rollback routes because every write had to split the 42-bit value.
- [x] Reject bypassing range validation for owned UUIDv7 output at default offset: Bun improved,
  but Node's ordinary gain did not repeat and explicit-time owned output repeatedly regressed.
- [x] Reject hoisting non-number clock rejection before truncation: every portable route stayed
  statistically unresolved on all four runtimes, while the branch duplicated error construction.
- [x] Split portable UUIDv4 generation by output ownership: package-owned output draws directly into
  its result; caller-owned output retains private staging and shows no primary-runtime regression.
- [x] Select the portable UUIDv7 timestamp writer once per module: fixed word writes repeatedly
  improved Node and Chromium while Bun retained its faster loop; per-call dispatch regressed Bun.
- [x] Optimize retained portable UUIDv4 paths to the measured frontier without changing entropy,
  UUID layout, ownership, fallback, error, or wire contracts.
- [ ] Optimize retained portable UUIDv7 paths to the measured frontier without changing entropy,
  UUID layout, ordering, ownership, fallback, error, or wire contracts.
- [x] Repeat packed comparisons for each changed portable UUIDv4 route and exercise the private
  fallback implementation on every runtime regardless of native capability.
- [ ] Repeat packed comparisons for each changed portable UUIDv7 route and verify native-capability
  failure selects the optimized fallback on every runtime.
- [ ] Falsify per-call capability lookup versus the current module-load probe and captured adapter.
- [ ] Falsify construction-time TextEncoder and word packing versus runtime-specific UTF-8 primitives.
- [ ] Falsify synchronous derivation versus cooperative derivation at measured seed and iteration boundaries.
- [ ] Falsify current 256-call batches against geometric batch sizes for clock cost and event-loop blocking.
- [ ] Falsify fixed warm-up against geometric warm-up durations using identical-code comparisons.
- [x] Reject a duplicated fixed-eight-byte scalar HalfSipHash path: it improved Bun masking by 2–4%,
  stayed within noise on Node and Deno, and regressed Chromium built-in masking by 8.7–19.9%.

### Baseline and attribution

- [ ] Capture alternating warm baselines for generation: v4/v7, string/bytes/slug, explicit time,
  portable generator, native generator, caller-owned output, and both slug alphabets.
- [ ] Capture alternating warm baselines for conversion and guards: UUID parse/format, direct slug
  encode/decode, byte offsets, valid/invalid inputs, versions, and timestamp extraction/validation.
- [ ] Capture alternating warm baselines for masking: construction, encode/decode, byte output,
  sentinels, current/previous keys, timestamp validation, both alphabets, and custom masks.
- [ ] Capture alternating warm baselines for migration: current, previous, original-mask, plain,
  candidate enumeration, success position, and total failure.
- [ ] Attribute CPU samples, allocations, entropy draws, text conversions, views, copies, errors,
  clock reads, and schema attempts for each operation family on every applicable runtime.
- [ ] Identify harness cost by measuring controls with the same dispatch, sink, batching, and yield
  structure; reject rows where harness cost prevents useful attribution.

### Optimization

- [x] Reuse each schema attempt's isolated 16-byte block as transform output; preserve custom-mask
  isolation while reducing ordinary masked encode and one-key decode from two allocations to one.
- [ ] Rank proven bottlenecks by consumer frequency, avoidable work, cross-runtime reach, and change
  risk; optimize the highest-value TypeScript mechanism first.
- [ ] For each selected mechanism, evaluate deletion, platform primitive, fused pass, cached invariant,
  caller-owned storage, lookup structure, arithmetic/layout change, specialization, and runtime-specific
  delegation before adding abstraction.
- [ ] Document every retained unusual syntax form at its code site with the performance reason,
  semantic boundary, and evidence condition that would justify replacing it.
- [ ] Implement each optimization as a focused change with unchanged public semantics and a direct
  falsifier for the behavior or resource invariant it could break.
- [ ] Re-profile every affected operation and its strongest regression rival on all applicable
  runtimes; revert changes that only move cost, win within noise, or regress a higher-priority axis.
- [ ] Repeat attribution and optimization until no remaining measured hotspot has positive expected
  value after correctness risk and lifetime maintenance cost.

### Closure

- [ ] Run targeted Node, Bun, Deno, and browser behavior tests for every changed runtime path and
  deliberately break each new regression instrument to prove it detects the intended defect.
- [ ] Run the complete benchmark matrix in alternating order and report distributions, profiler
  attribution, resource deltas, responsiveness, limitations, and rejected changes.
- [ ] Run `bun run check`, inspect the packed TypeScript artifacts and conditional exports, and verify
  the Rust tree and Rust behavior were not changed.
- [ ] Move durable measured conclusions to `bench/PERFORMANCE.md`, keep reusable harnesses in `bench/`,
  remove generated evidence, clear completed roadmap tasks, and leave the worktree clean.

## Beyond this scope

No item yet. Add only proven improvements that do not affect or block the TypeScript optimization.
