# TypeScript performance roadmap

## HLD boundary

Preserve every published TypeScript contract, wire format, accepted input, output, error, runtime
fallback, ownership rule, and supported runtime. Optimize Node, Bun, Deno, and browser TypeScript
paths only. Do not change the Rust implementation or use it to hide TypeScript cost.

## Evidence rules

- Profile the complete public call, not an internal proxy. A faster implementation is rejected if
  correctness, entropy, ownership, fallback, responsiveness, or package behavior changes.
- Compare runtimes independently. Record executable, version, hardware, inputs, warm-up, sample
  distribution, CPU attribution, allocation evidence, and profiler limits.
- Before each experiment, state the rival explanations and the result that would reject the change.
  Change one mechanism at a time; alternate baseline and candidate order.
- Keep a change only when repeated measurements show a material win or remove proven wasted work
  without moving cost to another public path. Delete experimental code and generated profiles.

## Work

### Inventory and instrumentation

- [ ] Map every public TypeScript method, overload, option, alphabet, success path, failure path,
  caller-owned buffer path, codec mode, migration mode, sentinel path, and runtime delegation path
  to an existing benchmark case or an explicit missing case.
- [ ] Map the supported Node, Bun, Deno, and browser execution routes, including native capability
  selection and portable fallback, to the package artifact each consumer loads.
- [ ] Audit benchmark setup, warm-up, sinks, batching, clocks, GC handling, process isolation, output
  validation, and statistics for optimizer elimination, harness domination, and false comparisons.
- [ ] Enumerate syntax, call-shape, allocation-ownership, specialization, inlining, closure, module,
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
