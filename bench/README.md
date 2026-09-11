# Benchmarks

Measure each runtime separately; a failed or missing measurement must fail the harness.

Rules:

- Keep direct runtime operations separate from composed pipeline operations.
- Keep benchmark dependencies in `devDependencies`.
- Run the same candidate set in smoke and full modes so CI detects adapter rot.
- Competitor and randomness figures are informational. Process failures, empty output and
  malformed records fail the matrix while successful measurements remain visible.
- Run `bun run bench:matrix --smoke` for a short comparison. Set `UUID_SLUG_BENCH_RUNTIMES` to
  colon-separated executable paths to add runtimes. Each requested runtime must produce both reports.
- `UUID_SLUG_BENCH_ITERATIONS` and `UUID_SLUG_ENTROPY_SAMPLES` accept positive safe integers.
- Conversion rows use fixed inputs and include returned-error handling. Rotation rows distinguish
  current-key success from previous-key success; key derivation is outside the measured calls.
- Node runs bundles of the benchmark source; Bun runs the TypeScript directly. Inlining may affect
  the comparison. These measurements do not establish the cost of an installed package import.
- Do not publish benchmark reports as package claims.
- Use smoke runs in CI and heavy runs manually.


## Regression protection

Run `bun run build && bun run perf:check` to check the package under the selected Node and Bun.
`bun run check` runs this lane after other checks finish, so competing tests cannot distort its timings.
The current-runtime CI lane also runs it with the newest Node and Bun.

- `resources.ts` counts real constructor, view, encoding, text-read and entropy calls in isolated
  processes. Positive controls must reach each instrument before a zero count can pass. Guards must
  allocate no decoded arrays or errors; rotation must decode text once and avoid mismatch errors on
  success; timestamp validation must avoid formatting and reparsing; caller-owned paths must avoid temporary
  arrays/views; repeated v4 draws must remain pooled. Native encoders must be used when available.
- These counts cover JavaScript-visible operations, not allocations inside an engine, `.slice()`
  species construction, JIT storage, or arbitrary object literals. They do not establish total bytes
  allocated or absence of leaks. Byte ownership and wire correctness remain separate functional tests.
- `latency.ts` alternates each operation with its related primitive on the same runtime and uses the
  median of repeated ratios. The coarse limits live beside those pairs; they catch material pipeline
  slowdowns without pinning laptop nanoseconds. They cannot detect a slowdown shared by both sides.
- A failing timing ratio requires a standalone rerun and profiles of both sides. Do not raise a limit
  to clear a failure. Host contention, JIT changes and reference speedups can affect the ratio; preserve
  evidence and explain the cause before adjusting the implementation or the internal budget.
- The harness tests inject a discarded error and repeated parsing while preserving the result. Both
  must fail their respective gates. Timing samples deliberately run a short CPU burst; they are not
  a production batching API or a promise of event-loop responsiveness.

## Profiling

Run `bun bench/rust.ts` for optimized Rust calls and every native lane discovered from supported
installed Node, Bun and Deno hosts. It builds once, rotates fresh processes, asserts the transport
each process loaded, and prints compact medians for cold startup, fixed JSON dispatch, single and
batched requests, direct typed calls, CPU time and peak RSS. Set `UUID_SLUG_RUST_BENCH_RAW=1` to
retain every workload sample. Bridge rows include string conversion and transport; JSON rows also
include serialization and dispatch, so neither is a core-only timing.
Generation rows count real platform-source calls and requested bytes, not kernel syscalls or
entropy quality. Parallel rows use independent generators at a fixed clock and include thread
startup/join cost; they measure generation with contention, not system-clock reads.
Caller-buffer and owned decoding use the same inputs. Process RSS includes runtime startup and
does not measure allocation volume or prove leak freedom. Run revision comparisons sequentially
with alternating revision order; do not infer cross-platform performance from one host.
Set `UUID_SLUG_PROFILE_FILTER=decode/owned` or `decode/caller-buffer` when launching the Rust
benchmark executable to isolate allocation cost with identical inputs and iteration counts.
On macOS, Instruments' Allocations template can record a separately signed debugging copy;
never add debugging entitlements to a distributed artifact. Export its Statistics detail and
compare both execution orders. Include setup and warm-up when interpreting process totals.

Run one corpus through every installed JavaScript runtime:

```sh
bun run bench:profile
UUID_SLUG_PROFILE_FILTER=plain.encode bun run bench:profile:native
```

The ordinary command records timing, CPU, process-memory and responsiveness rows from Node, Bun,
Deno and Chromium. `:native` adds each host's independent native evidence: inspector and exit CPU or
allocation profiles, V8 native ticks and trace events, Deno Markdown and flamegraph reports, Bun
JavaScriptCore JIT samples and heap statistics, JSC and V8-format object graphs, paired mimalloc
states, and Chromium CDP metrics and tracing. The lanes run sequentially to avoid profiler contention.
Generated drivers and reports stay under ignored `bench/reports/`; malformed, empty or missing output
fails the command.

The same command separately measures cooperative schema construction around byte-packing and UTF-8
chunk boundaries, geometric work factors, host-task progress, and cancellation. These promise-based
rows stay outside the synchronous corpus so task scheduling cannot contaminate per-call throughput.

Set `UUID_SLUG_PROFILE_FILTER` to a case-name substring before native profiling so startup and unrelated
operations do not dominate attribution. `UUID_SLUG_PROFILE_WARMUP_MS`, `UUID_SLUG_PROFILE_SAMPLES`, and
`UUID_SLUG_PROFILE_MS` control per-case warm-up and timing samples. Add `--smoke` to
`bench/profile-all.ts` only when checking harness wiring. Compare
the current worktree with a committed baseline through `bun run bench:compare <baseline-ref>`; the
driver packs each revision, alternates revision order in fresh processes,
rotates runtime order, and emits JSON Lines containing raw samples and per-operation median ratios. A heap snapshot measures
retention, not gross allocation; sampled profiles are estimates; forced GC changes the workload;
`maxBatchMs` and `maxUninterruptedMs` are observations, not universal latency bounds.
