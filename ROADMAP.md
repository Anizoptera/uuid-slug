# TypeScript performance roadmap

## HLD boundary

Preserve every published TypeScript contract, wire format, accepted input, output, error, runtime
fallback, ownership rule, and supported runtime. Optimize Node, Bun, Deno, and browser TypeScript
paths only. Do not change the Rust implementation or use it to hide TypeScript cost.

Prioritize performance decisions in this order: Bun and Node first, Chromium second, Deno third.
A Deno-only regression does not veto a clear primary-runtime improvement; quantify it and preserve
all Deno contracts.

## Evidence rules

- Profile the complete public call, not an internal proxy. A faster implementation is rejected if
  correctness, entropy, ownership, fallback, responsiveness, or package behavior changes.
- Compare runtimes independently. Record executable, version, hardware, inputs, warm-up, sample
  distribution, CPU attribution, allocation evidence, and profiler limits.
- Never act on one performance run. Repeat the decision-relevant workload and require a reproducible,
  statistically distinguishable, material effect; an unresolved or negligible result earns no code.
- Before each experiment, state the rival explanations and the result that would reject the change.
  Change one mechanism at a time; alternate baseline and candidate order.
- Keep a change only when repeated measurements show a material win or remove proven wasted work
  without moving cost to another public path. Delete experimental code and generated profiles.

## Work

### Inventory and instrumentation

- [ ] Map every public TypeScript method, overload, option, alphabet, success path, failure path,
  caller-owned buffer path, codec mode, migration mode, sentinel path, and runtime delegation path
  to an existing benchmark case or an explicit missing case.
- [x] Profile cooperative mask derivation separately from synchronous calls across seed type, UTF-8
  boundaries, iteration count, chunk boundaries, cancellation phase, scheduling delay, and runtime.
- [ ] Map the supported Node, Bun, Deno, and browser execution routes, including native capability
  selection and portable fallback, to the package artifact each consumer loads.
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
- [ ] Keep corpus preparation outside native capture windows and start measurement only from an
  observed runtime-ready signal; quantify unavoidable profiler start/stop self-noise.

### Candidate map

- [ ] Falsify looped versus unrolled HalfSipHash compression rounds without changing message shape.
- [ ] Falsify looped versus unrolled HalfSipHash finalization rounds without changing message shape.
- [ ] Falsify fixed-length dispatch inside the existing hash function without scalar arguments.
- [ ] Falsify scalar Feistel message arguments without duplicating hash rounds.
- [ ] Falsify `Int32Array` versus ordinary numeric scratch while preserving signed 32-bit coercion.
- [ ] Falsify caller scratch versus module scratch versus closure-owned scratch for reentrancy and JIT locality.
- [ ] Falsify indexed versus unrolled four-round Feistel traversal.
- [ ] Falsify one direction branch per round versus preselected start and stride.
- [ ] Falsify shared reversible Feistel code versus separate mask and unmask loops.
- [ ] Falsify indexed key reads versus construction-time scalar capture.
- [ ] Falsify helper calls versus inlined big-endian reads and writes at the fixed offsets.
- [ ] Falsify shifts versus `DataView` for big-endian word I/O on every runtime.
- [x] Reject fixed-offset check-tag unrolling: it produced no cross-runtime win and regressed
  selected Node, Deno, and Chromium masked routes by 4.9%, 8.2%, and 13.9%, respectively.
- [ ] Falsify a separate tag pass versus tag accumulation during the mandatory input read.
- [x] Reuse owned UUID blocks for tagging and masking. Retain one shared guard path with a final
  direct ownership branch; duplicated closures and indirect dispatch slowed Bun's borrowed route.
- [ ] Falsify general alphabet dispatch versus codec-construction specialization.
- [ ] Falsify native base64url conversion versus portable fixed-size encoding per runtime.
- [x] Mask the validated parser-owned block directly: repeated packed comparisons improved string
  encoding on every runtime while preserving the caller-owned byte path.
- [ ] Falsify owned mask output versus caller-owned internal codec scratch under reentrancy constraints.
- [ ] Falsify linear sentinel lookup versus construction-time `Set` lookup across sentinel cardinalities.
- [ ] Falsify linear previous-key traversal versus caller-ordered precompiled decode operations.
- [ ] Falsify exception containment on built-in masks versus a built-in non-throwing path and custom boundary.
- [ ] Falsify generic schema callbacks versus a private built-in schema discriminant without exposing API state.
- [ ] Falsify eager runtime adapter imports versus guarded lazy capability loading using cold and warm routes.
- [ ] Falsify native UUID generation delegation versus portable generation by output form and entropy behavior.
- [ ] Map every portable UUID generation path independently: v4/v7, string/bytes/slug, explicit time,
  same-millisecond continuation, clock rollback, entropy refill, caller-owned output, and each alphabet.
- [ ] Force and profile the portable generator directly on Node, Bun, Deno, and Chromium, including
  hosts with native UUID generation, so delegation cannot hide fallback CPU, allocation, entropy,
  state-transition, or responsiveness costs.
- [ ] Falsify portable generation alternatives for entropy draw size and reuse, state layout, byte
  assembly, formatting, caller-owned writes, clock reads, branches, and runtime-specific primitives.
- [ ] Optimize every retained portable path to the measured runtime frontier without changing its
  entropy, UUID layout, ordering, ownership, fallback, error, or wire contracts.
- [ ] Repeat statistically distinguishable packed comparisons for each changed portable route and
  verify native-capability failure selects the optimized fallback on every runtime.
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
