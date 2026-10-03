# Benchmarks

Measure each runtime separately; a failed or missing measurement must fail the harness.

Rules:

- Keep useful experiment drivers in this repository before running them. Extend an existing
  measurement owner instead of duplicating its clocks, samples or statistics in a temporary script.
  Isolate source substitutions from the shared working tree; retain raw output in `bench/reports/`
  and record the measured conclusion in `bench/PERFORMANCE.md`.
- Measure latest stable Node Current and Bun first, latest Node LTS and Chromium second, and latest
  Deno third. Measure Node Current JITless last; a JITless-only win may survive when every higher
  rung is unchanged. Older supported Node versions prove compatibility, not performance priority.
- Keep direct runtime operations separate from composed pipeline operations.
- Compare performance and resource efficiency against qualified alternatives for each main use
  case. A throughput win with worse allocation or resource costs does not meet the main-use goal;
  keep secondary uses reasonably fast and efficient.
- For a rare-misuse defense, measure ordinary successful calls against the unchanged implementation
  before retaining it. Faster rejection is not a benefit that offsets slower normal calls or more
  resource use. Apply the acceptance rule in [public-api.md](../docs/public-api.md#capabilities-and-runtime-work).
- Keep benchmark dependencies in `devDependencies`.
- Before concluding that no further optimization is justified, measure the same public result against
  the native function and the fastest live competitor, then inspect each faster implementation.
  Local candidate comparisons can select the best candidate offered while missing a better design.
- Run the same candidate set in smoke and full modes so CI detects adapter rot.
- Before timing a candidate, name the contracts and failure modes its changed mechanism can affect.
  Run their owning tests, add any missing direct falsifier, and mutate the mechanism to prove the
  tests fail for the intended defect. A faster result has no standing until those tests pass again.
- Competitor and randomness figures are informational. Process failures, empty output and
  malformed records fail the matrix while successful measurements remain visible.
- Compare consumer outcomes, not implementation choices. Correct wire output, secure entropy, and
  published guarantees are mandatory; weigh other differences by measured consumer harm. Keep a
  materially weaker result out of the comparable ranking, but inspect any faster mechanism that could
  preserve our guarantees. Record the exact mismatch and recheck it after updates.
- Run `bun run bench:matrix --smoke` for a short comparison. Set `UUID_SLUG_BENCH_RUNTIMES` to
  colon-separated executable paths to add runtimes. Each requested runtime must produce both reports.
- `UUID_SLUG_BENCH_ITERATIONS` and `UUID_SLUG_ENTROPY_SAMPLES` accept positive safe integers.
- Conversion rows use fixed inputs and include returned-error handling. Rotation rows distinguish
  current-key success from previous-key success; key derivation is outside the measured calls.
- Conversion comparisons must check exact bytes or text against fixed expected values before
  timing. Native floors include dehyphenation, padding rejection and output formatting where the
  requested result needs them; report an absent capability instead of timing a substitute as native.
- The entropy audit brackets its existing draw burst with wall-clock reads. Compare the largest
  encoded timestamp with the ending clock. The difference and clock change are observations,
  not proof that the wall clock stayed monotonic throughout the burst. Encoded-timestamp counts
  alone cannot establish wall-clock drift.
- Node runs bundles of the benchmark source; Bun runs the TypeScript directly. Inlining may affect
  the comparison. These measurements do not establish the cost of an installed package import.
- Do not publish benchmark reports as package claims.
- Use smoke runs in CI and heavy runs manually.

Run `bun bench/source-candidates.ts v7-draw independent-direct` to screen that source substitution
against its baseline, or use `v4 argument-fast` for the UUIDv4 default-call comparison. Candidate
names select only those substitutions; the baseline is always included. The runner uses a detached
checkout, checks types and the owning Node and Bun tests before timing, and preserves source,
proof output and measurements in `bench/reports/`. Set `UUID_SLUG_CANDIDATE_RUNTIMES` to a
colon-separated selection of `node`, `bun` and `deno`; set `UUID_SLUG_COMPARE_NODE_EXECUTABLE`
to select a Node executable. Each comparison runs in fresh processes with reversed second-pass order.
The source screen runs the maintained resource counters before timing and retains their complete
output, including rejected candidates. Use `v7-draw duplicate-text-scratch` to restore the
redundant private array; the cold text-generator resource witness must reject it before timing.
UUIDv7 source screens time ordinary single-ID text, owned bytes and slugs first; configured and
caller-buffer timing belongs in the later packed comparison after a primary-call gain survives.
These short batch samples select experiments, not retained optimizations or individual-call p99;
add any missing mechanism falsifier before using a candidate's timings to decide a change.
Use `v4 native-zero-hex native-zero-base64` to compare native decoding of fixed zero bytes
before the unchanged secure fill; capability selection runs once and absent decoders use the
ordinary constructor. These candidates measure complete owned-byte generation, not decoder speed.
Prefix a `UUID_SLUG_PROFILE_FILTER` term with `=` to select that exact case; other terms match
substrings. Use exact terms when a successful-call comparison must exclude similarly named failures.
Use `v7-draw independent-direct-lost-bit` to check the payload oracle: both runtime tests must
reject it before timing, with their failure output retained in the report directory.
Set `UUID_SLUG_RESOURCE_ENTROPY_BURST` to a positive call count when running `bench/resources.ts`
against a candidate module to compare secure-source refills over successful caller-buffer draws.
Keep these instrumented counts separate from throughput; the ordinary resource lane omits the burst.

Run `bun run bench:competitors --smoke` to validate the competitor matrix, or
`bun run bench:competitors` for repeated measurements. The matrix compares equal v4/v7 text,
allocated-byte, caller-buffer, base64url slug, and timestamp-extraction calls on Node, Bun, Deno,
and Chromium, building its host corpus once per runtime with that runtime's export condition so
each runtime measures the adapter its consumers load.
It reports unsupported runtime rows instead of dropping them. Each comparable group emits the
fastest package route, fastest external or platform reference, and their median ratio so a local
optimum cannot hide in raw rows.
Use `UUID_SLUG_GENERATION_FILTER=package.v7.pair` to compare the default UUID-plus-slug call
with one owned-byte draw followed by both public conversions. The witness rejects mismatched
UUID and slug payloads, and timing consumes both strings rather than only the returned object.
The generated comparison report names the fastest rival and native floor separately and gives
each its own ratio and uncertainty verdict; an unavailable method is not a timed result.
Use `UUID_SLUG_GENERATION_FILTER=uuid.slug` for UUID-text conversion against slugid and
short-uuid. Construct the short-uuid translator once. Its numeric radix-64 spelling uses the
same alphabet but different bit alignment, so it has a separate comparison group. Fixed-input
witnesses require every output bit to survive. The generation filter accepts one substring;
comma-separated terms belong to `UUID_SLUG_PROFILE_FILTER`, not this filter.

Set `UUID_SLUG_GENERATION_FORKS` to repeat the competitor matrix in fresh host and browser
processes. Each process contributes one median per case; retain its batches separately instead
of counting them as independent runs. Keep the filter narrow for exploration. The default remains
one process for screening; fresh processes still share the machine's scheduling and thermal state.

Run `bun run bench:competitors:rust` for one isolated Rust generator timing process. Its own
lockfile pins the inspected releases without adding benchmark-only crates to the product workspace.

Re-run the full matrix for each release candidate and after changing a competitor or runtime
version. Upgrade benchmark packages only in `devDependencies`, inspect changed public calls and
source mechanisms, update the shared case inventory when capabilities change, then run smoke before
the full matrix. A version change never inherits an earlier performance or compatibility verdict.

Run `bun run bench:results` to refresh the tracked reports in `bench/results/`: `matrix.md` with
package throughput and randomness per runtime, `competitors.md` with its raw `competitors.jsonl`,
and `rust-competitors.md` with its raw `rust-competitors.jsonl`. The Rust report combines three
fresh timing processes and compiles every retained generator call for native Rust and
`wasm32-unknown-unknown` with its strongest supported entropy configuration. These files are
tracked, unlike the profiling artifacts under ignored
`bench/reports/`, because a report git tracks shows its own date and can be diffed between runs,
while a hand-pasted snapshot rots behind a date that looks fresh. Nothing in them is typed in.
They are evidence for `bench/PERFORMANCE.md`, which owns conclusions; a figure in them is one
machine's and moves between runs, so read the direction of a difference, not its digits. The
command runs full settings only.

Set `UUID_SLUG_BENCH_NODE_CURRENT_EXECUTABLE` to the Node Current executable when refreshing
tracked results. The reports include that executable beside the project's Node LTS and record
each process's actual version; both Node releases reuse the same compiled benchmark.

## Measurement limits

Keep [throughput, sampled latency and cold-start measurements](https://github.com/openjdk/jmh/blob/master/jmh-samples/src/main/java/org/openjdk/jmh/samples/JMHSample_02_BenchmarkModes.java)
separate, as JMH does; each answers a different question.

Measure throughput and individual-call latency separately. Timed batches amortize clock and
loop overhead; their per-call averages cannot establish individual-call p99. Keep raw samples,
warm-up settings, runtime versions and execution order. Repeat comparisons in fresh processes
with alternating order; samples from one process can share JIT, GC and thermal effects.

Report uncertainty for the statistic actually used. A standard error describes uncertainty in a
mean under its independence assumptions; it is not latency spread or a percentile. Median intervals
require independent observations too. Do not count calls inside one timed batch as independent
samples or claim a reliable tail percentile from a handful of batches. Retain pauses and outliers;
investigate them with profiles rather than deleting them to improve the result. Measure timer and
result-consumption overhead before using individual-call timing for these short operations.

`bench:compare` reports the mean, sample standard deviation and mean standard error of its
paired observations beside the median interval. Launch a fresh host or browser process for each
revision in each round so one revision cannot train the other's engine state. Intervals and standard
errors remain conditional on independence; host scheduling and thermal drift can violate it too.
Standard error does not replace the raw samples, repeated replays or practical effect size.

Set `UUID_SLUG_PROFILE_LATENCY_SAMPLES` to a positive call count for a separate sampled-latency
pass in `bench:profile`. Select successful scalar or byte results with a narrow filter; object
results need a separate consumer workload. Each observation brackets one call; result
consumption follows the ending timestamp. The report retains acquisition order, an adjacent-clock
control, zero counts and empirical p50/p99. These instrumented timings include clock overhead
and quantization; do not subtract control percentiles or treat calls from one process as independent
confidence samples. This pass does not change the throughput measurement or run by default.
An observed zero p99 is below clock resolution, not a zero-cost call; the report labels it explicitly.

## Regression protection

Run `bun run build && bun run perf:check` to check the package under the selected Node and Bun.
`bun run check` runs this lane after other checks finish, so competing tests cannot distort its timings.
The current-runtime CI lane also runs it with the newest Node and Bun.

- `resources.ts` counts real constructor, view, encoding, text-read and entropy calls in isolated
  processes. Positive controls must reach each instrument before a zero count can pass. Guards must
  allocate no decoded arrays or errors; rotation must decode text once and avoid mismatch errors on
  success; timestamp validation must avoid formatting and reparsing; caller-owned paths must avoid temporary
  arrays/views; repeated v4 draws must remain pooled. Fixed-size writers must construct one string;
  native encoding remains an alternative to measure, not a requirement based on availability.
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

## Capability review

Run this review after every Bun or Deno version change and before periodic runtime performance work:

1. Read the installed runtime's types and docs, its release notes since the last reviewed version,
   and current upstream API docs. Search three sets separately: runtime-native APIs, Node-compatible
   APIs, and web or Chromium-compatible APIs. Include additions, changed behavior, deprecations, and
   removals relevant to package routes or benchmark evidence. Node and Chromium inventories are
   candidate sources for Bun and Deno, not proof of support.
2. Probe each candidate on every installed runtime and record the exact runtime version. Check the
   callable shape, output, ownership, errors, limits, and sync or async behavior needed by this
   package. A property check alone is insufficient; equal names can hide different semantics.
3. Detect capability first and probe once at module load. Use runtime identity only when repeated
   public-route measurements show that equal semantics need different implementations. Treat a
   missing or unsuitable method as unavailable; never use repeated exception-driven fallback.
4. Run the selected path and compatible fallback through the same public-route corpus. Prove wire
   results, errors, ownership, and resource behavior before comparing speed. Run decision-relevant
   measurements twice and apply the runtime priority ladder above.
5. Keep only decision-changing conclusions in `bench/PERFORMANCE.md`: observed versions and
   behavior, selected path, rejected live alternatives, evidence limits, and the condition that
   requires review again. Generated capability inventories and reports stay under `bench/reports/`.

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

Set `UUID_SLUG_PROFILE_NODE_EXECUTABLE` to profile a specific Node release. Each run records the
observed version in its timing report name; run native profiles once per release because their
engine-native artifact names are fixed.
Set `UUID_SLUG_PROFILE_NODE_OPTIONS` to apply `NODE_OPTIONS` only to profiled Node processes, not
the Bun-based build and orchestrator.

The ordinary command records timing, CPU, process memory, page faults, filesystem I/O, context
switches, and responsiveness from Node, Bun, Deno, and Chromium. `:native` adds each host's
independent evidence: inspector and exit CPU or allocation profiles, per-GC heap state, V8 native
ticks and trace events, Deno Markdown and flamegraph reports, Bun
JavaScriptCore JIT samples and heap statistics, JSC and V8-format object graphs, paired mimalloc
states, and Chromium CDP metrics and tracing. The lanes run sequentially to avoid profiler contention.
Generated drivers and reports stay under ignored `bench/reports/`; malformed, empty or missing output
fails the command.

Read the reports together. Use counters to locate resource cost, GC and heap state to
separate allocation from retention, sampled stacks to attribute CPU and allocation, and traces to
expose scheduling and I/O. Prefer each runtime's native source, then its inspector protocol, then
portable process counters and timings. Missing optional detail may fall back; a requested lane that
produces no evidence must fail. Correlate independent signals before changing code. Do not count two
front ends to the same engine profiler as independent evidence.

The same command separately measures cooperative mask construction around byte-packing and UTF-8
chunk boundaries, geometric work factors, host-task progress, and cancellation. These promise-based
rows stay outside the synchronous corpus so task scheduling cannot contaminate per-call throughput.

Before warm-up, the shared corpus validates identifier shape, UUID bytes, caller-owned output
identity and boundaries, and atomic invalid-range failure. These checks stay outside timed calls.

Set `UUID_SLUG_PROFILE_FILTER` to comma-separated case-name substrings before native profiling so startup and unrelated
operations do not dominate attribution. `UUID_SLUG_PROFILE_WARMUP_MS`, `UUID_SLUG_PROFILE_SAMPLES`, and
`UUID_SLUG_PROFILE_MS` control per-case warm-up and timing samples. Add `--smoke` to
`bench/profile-all.ts` only when checking harness wiring. Compare
the current worktree with a committed baseline through `bun run bench:compare <baseline-ref>`; the
driver packs each revision, alternates revision order in fresh processes,
rotates runtime order, and emits JSON Lines containing raw samples and per-operation median ratios. A heap snapshot measures
retention, not gross allocation; sampled profiles are estimates; forced GC changes the workload;
`maxBatchMs` and `maxUninterruptedMs` are observations, not universal latency bounds.
Set `UUID_SLUG_COMPARE_RUNTIMES` to a distinct colon-separated subset of
`node:bun:chromium:firefox:webkit:deno:node-jitless` for a narrow comparison. Use all runtimes before retaining a change.
Browser engines share one built corpus per revision; host-only comparisons skip browser compilation and startup.
Set `UUID_SLUG_COMPARE_NODE_EXECUTABLE` to compare with a specific Node release; without it the
driver runs the `node` that the project directory resolves, which may not be Node Current. Every record
and summary carries `runtimeVersion`; take the release named in a result from that field. Stderr also
prints one line per summarized row: release, baseline and candidate medians, the median ratio, and its
95% interval with `faster`, `slower`, or `unresolved`, which a smoke run has too few rounds to compute.
The current worktree owns the comparison corpus and drivers; packed revisions supply only the code
under test. A baseline must not remove the newer case intended to distinguish it. If packing fails
because Parcel crashes (SIGSEGV) in the consumer-graph check, rerun the replay; the crash says
nothing about the candidate. Every timing probe must read each result: a loop that discards results
lets V8 skip work, and native `randomUUID` then read 23 ns instead of 139 ns on Node 26.8.2.
