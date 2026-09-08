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
  success; freshness must avoid formatting and reparsing; caller-owned paths must avoid temporary
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

Run `bun bench/rust.ts` for optimized Rust calls and separate Node N-API/Bun FFI measurements.
It builds once, then rotates fresh processes and records all samples, CPU time, peak RSS and
context switches. Bridge rows include JSON dispatch and transport; they are not core-only timings.
Caller-buffer and owned decoding use the same inputs. Process RSS includes runtime startup and
does not measure allocation volume or prove leak freedom. Run revision comparisons sequentially
with alternating revision order; do not infer cross-platform performance from one host.

Build before Node measurements; its package export resolves to emitted JavaScript, while Bun uses
TypeScript. Build the driver without bundling the measured package:

```sh
bun run build
bun build bench/profile.ts --target=node --packages=external --outfile=bench/reports/profile.mjs
node --expose-gc bench/reports/profile.mjs
bun --expose-gc bench/profile.ts
```

Set `UUID_SLUG_PROFILE_FILTER` to a case-name substring to narrow attribution. Optional
`UUID_SLUG_PROFILE_MODULE` selects an isolated revision's absolute file URL; resolve that revision's
runtime condition correctly. `UUID_SLUG_PROFILE_SAMPLES` and `UUID_SLUG_PROFILE_MS` control sampling.
Run CPU measurements sequentially with identical inputs and alternating revision order. Record exact
executables, versions, hardware, warmed versus cold state, and all samples rather than only a winner.

Use Node `--cpu-prof` or Bun `--cpu-prof` on the corresponding driver for CPU attribution; use Node
`--heap-prof` or Bun `--heap-prof-md` for retained-heap attribution. A heap snapshot/survivor profile
is not gross allocation volume. `heapDelta` is affected by GC; `maxBatchMs` covers only an inner batch,
whereas `maxUninterruptedMs` covers the entire sample before yielding. Neither establishes a universal
operation-latency bound. Keep generated profiles under ignored `bench/reports/`.
