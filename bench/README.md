# Benchmarks

Measure each runtime separately; a failed or missing measurement must fail the harness.

## Decision before measurement

Use each measurement to decide whether to retain a specific production improvement.

Choose the largest unresolved cost in an ordinary successful call on Node Current or Bun.
Limit optimization to primary README consumer jobs. Compare current complete calls with the main
qualified rivals, profile their actual hotspots and resource gaps, and select the largest evidenced
gap before changing a component. Secondary scenarios are excluded from this effort; correctness
checks do not authorize performance work on them. Follow the current sequence in `ROADMAP.md`.
Record the call, current evidence, competing explanations, rejection condition and next action in
`ROADMAP.md` before execution. Inspect the faster native or competing implementation; a local
candidate ranking cannot establish that the best available mechanism was considered.

Use the existing tests and profiler to distinguish the explanations, then screen one candidate
through the complete call. Repeat a survivor in independent packed processes and inspect resource
costs before retention. Parallelize preparation, not competing timing processes. Reuse builds and
observations when their inputs remain unchanged. Investigate conflicting instruments before another
replay; more samples do not repair a comparison that measures different work.

Stop the experiment when evidence supports retention or rejection. An unresolved comparison keeps
the gap open; name the missing observation instead of starting a wider matrix or another candidate.
Complete the required correctness checks before committing. Failure or interruption is not a pass.

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
  do not optimize secondary scenarios during the primary-only effort.
- Target the largest unresolved primary-call cost on the primary runtimes before small gains or
  auxiliary hosts. Use current public-call profiles to choose the mechanism; defer smaller
  experiments while a more prominent cost remains unexplained or untested.
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
- Compare consumer outcomes, not implementation choices. Correct wire output and secure entropy
  remain required; default guarantees must not exceed proper native behavior. Weigh other differences
  by measured consumer harm. Keep a
  materially weaker result out of the comparable ranking, but inspect any faster mechanism that could
  preserve the requested result. Correct stronger default guarantees instead of rejecting proper
  native behavior. Record the exact mismatch and recheck it after updates.
  Name the violated contract when rejecting a row. Timestamp advancement alone does not violate
  a module-level never-ahead guarantee: that guarantee is not published. Keep drift observations
  separate from qualification; apply [generation policy](../docs/public-api.md#generation-and-codecs).
  Default generation needs no stronger guarantees than correctly implemented primary qualified
  rivals provide; additional guarantees belong on optional configured paths. A package test or
  resource count does not establish a consumer requirement that disqualifies a rival.
  Include `fastv7` in default UUIDv7 comparisons: its Web Crypto tail and zero-start counter
  satisfy the native-baseline qualification. Record payload and clock differences separately.
- Run `bun run bench:matrix --smoke` for a short comparison. Set `UUID_SLUG_BENCH_RUNTIMES` to
  colon-separated executable paths to add runtimes. Each requested runtime must produce both reports.
- `UUID_SLUG_BENCH_ITERATIONS` and `UUID_SLUG_ENTROPY_SAMPLES` accept positive safe integers.
- Conversion rows use fixed inputs and include returned-error handling. Rotation rows distinguish
  current-key success from previous-key success; key derivation is outside the measured calls.
- Conversion comparisons must check exact bytes or text against fixed expected values before
  timing. Native floors include dehyphenation, padding rejection and output formatting where the
  requested result needs them; report an absent capability instead of timing a substitute as native.
  Owned decoding compares native arrays, native writes into a fresh array, and Buffer decoding
  followed by a copy. A view over Buffer's pooled storage does not provide private backing storage.
  Keep Buffer-only decoding timed with an explicit ownership rejection; it cannot win the
  equivalent-result ranking for an owned plain array.
  Qualified allocated-generation rows must also return fresh plain arrays with separate backing
  storage. Bun's Buffer-only generation stays timed but rejected; native copying comparisons
  include `Uint8Array.from`, the copying constructor and a fresh array followed by `set`.
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
names select only those substitutions; the baseline is always included. The runner extracts a
committed-source archive, checks types and the owning Node and Bun tests before timing, and preserves source,
proof output and measurements in `bench/reports/`. Set `UUID_SLUG_CANDIDATE_RUNTIMES` to a
colon-separated selection of `node`, `bun` and `deno`; set `UUID_SLUG_COMPARE_NODE_EXECUTABLE`
to select a Node executable. Each comparison runs in fresh processes with reversed second-pass order.
Check that every requested exact case appears in the returned rows; other matching filter terms
do not prove that case ran.
The source screen runs the maintained resource counters before timing and retains their complete
output, including rejected candidates.
Use `UUID_SLUG_PROFILE_MS`, `UUID_SLUG_PROFILE_SAMPLES` and `UUID_SLUG_PROFILE_WARMUP_MS` to
extend noisy source screens without rebuilding between equivalent short runs. The manifest records
their actual settings, and every selected case must return that sample count.
Use `v7-draw duplicate-text-scratch` to restore the redundant private array; the cold text-generator
resource witness must reject it before timing.
UUIDv7 source screens time ordinary single-ID text, owned bytes and slugs. During the primary-only
effort, configured and caller-buffer paths remain correctness coverage, not optimization targets.
Use `v7-draw bounded-clock` to compare a truncation plus timestamp bound with the separate
safe-integer check; `bounded-clock-overflow` must fail the shared Node/Bun clock oracle.
These short batch samples select experiments, not retained optimizations or individual-call p99;
add any missing mechanism falsifier before using a candidate's timings to decide a change.
Use `v7-draw number-counter` to compare an exact 42-bit number with split counter words.
`number-counter-overflow` must fail the timestamp-ceiling oracle before timing.
Use `v7-draw numeric-state` to isolate mutable numeric storage from clock, sequence and formatting
work. Fixed Float64 storage preserves the same values but adds retained storage per generator.
Its `numeric-state-lost-timestamp` mutation must fail the shared clock oracle before timing.
Use `v7-draw counter-float64 counter-uint32` to isolate counter storage while leaving timestamp
and high-water storage unchanged. Both preserve unsigned counter words; `counter-uint32-lost-carry`
must fail the Node and Bun timestamp-ceiling oracle before timing. Measure construction and
retained storage if complete-call gains survive; removing sampled allocation alone is insufficient.
Use `v7-draw counter-low30 counter-low31` to compare narrower closure words without an extra
array. They reconstruct the existing writer inputs and preserve the full counter. The
`counter-low30-lost-carry` mutation must fail the shared ceiling oracle before timing; compare
sampled allocation and complete calls before attributing a benefit to integer representation.
Use `v7-draw counter-low31 counter-low31-direct` to isolate reconstructing wider writer inputs
from writing the same bytes directly. The direct writer must also preserve independently seeded
explicit instants; `counter-low31-direct-lost-bit` must fail the shared payload-bit oracle before
timing. The candidate adds no storage or runtime dispatch.
Compare sampled allocation beneath scratch-backed calls only after complete-call throughput
survives; lower collected heap alone cannot identify removed per-call allocation.
Use `v7-draw inline-clock` to isolate the clock wrapper while preserving callback failures.
`inline-clock-lost-catch` must fail the shared throwing-clock witness in both runners.
Use `v7-draw direct-text` to construct preset UUIDv7 text directly from timestamp, counter and
tail values without intermediate bytes. Configured text and owned bytes retain their existing
functions. `direct-text-lost-tail` and `direct-text-lost-timestamp` must fail the shared text
payload witnesses before timing. The candidate adds a private function per generator; measure
construction before retention if repeated complete-call gains survive.
Use `v7-draw direct-text-latin1` to keep intermediate-byte elimination while selecting native
Latin-1 string construction where available. Other runtimes keep the original formatter.
`direct-text-latin1-lost-tail` must fail the shared tail witness on Bun. Mixed preset and
configured calls can initialize both text buffers; a gain must pay for that retained storage.
Use `v7-draw direct-text-latin1-pairs` to preserve the original paired hex-code lookups while
removing intermediate bytes. Its `-lost-tail` mutation must fail Bun's payload witnesses before
timing. The resource report distinguishes preset-text initialization from repeated calls.
Use `v7-draw direct-text-reused-prefix` to retain unchanged prefix characters in fused native
text construction. Timestamp, upper counter and text case must all invalidate the shared prefix;
`direct-text-reused-prefix-stale` must fail Bun's independent text oracle before timing.
Compare complete default calls before measuring the extra retained cache and generator setup.
Use `v7-draw shared-text shared-text-prefix` to eliminate intermediate UUID bytes with the
existing formatter's character buffer and case tables. The second candidate also reuses generator
prefixes; ordinary UUID conversion must invalidate them. `shared-text-lost-tail`,
`shared-text-prefix-stale` and `shared-text-prefix-no-invalidation` must fail independent text
witnesses before timing. Both source screens and packed comparisons retain both replacement files.
For allocation attribution, run the retained report's `profile.mjs` against each candidate module
with `UUID_SLUG_PROFILE_MODULE` and a separate native directory and name. Retain that process's
call records, alternate candidate order, and await its exit before starting another capture.
Use `alphabet native-branch native-dispatch` to compare Bun native plain base64url encoding
through validated conversion, UUIDv7 generation and pair calls. Both candidates keep masked
tails and base32hex on the existing writer and fall back if native encoding throws.
Use `alphabet fixed-blocks` to compare fixed base64url writes with the indexed loop while keeping
buffers and string construction unchanged; `fixed-blocks-lost-byte` must fail the payload oracle
before timing. Complete slug generation and conversion determine whether the larger body pays.
Use `keyless thin-wrapper preset-fast thin-preset` to separate default UUIDv7 wrapper size
from known-preset validation. The configured implementation remains unchanged; selected-generator
and explicit-time calls are controls alongside ordinary text, owned bytes and slug generation.
Use `keyless thin-configured` to remove the duplicated preset branch from that cold helper;
`thin-configured-lost-options` must fail the explicit-time oracle before any timing.
Use `keyless cached-draw` to compare cached detached generation with repeated lookup for slugs
and paired output; `cached-draw-lost-byte` must fail the generated-payload oracle before timing.
Use `keyless direct-owned-draw cached-owned-draw` to compare the private byte draw with default
option dispatch. `direct-owned-lost-byte` must fail the module-byte oracle in both runners.
Use `value default-fast default-split` to compare argument-free immutable generation without
an empty options record; the second candidate keeps configured calls in a separate helper.
The timing loop reads the UUID version and verification checks frozen values and UUIDv7 bytes.
`value default-lost-throw` must fail both runtime entropy tests before timing.
Use `value-options shared-empty` to compare a shared frozen empty options record across default,
explicit-time, generator and codec values and both masked alphabets. All of them share the reader;
a default-value gain cannot justify slowing another successful consumer call.
For a source candidate that survives its owning proof, pass
`--source-candidate=keyless:thin-configured` to `bench/compare.ts` with the same revision for
baseline and candidate. The replacement lives only in its extracted source archive; both revisions
are packed normally, and the shared production tree remains unchanged.
Use `v4 native-zero-hex native-zero-base64` to compare native decoding of fixed zero bytes
before the unchanged secure fill; capability selection runs once and absent decoders use the
ordinary constructor. These candidates measure complete owned-byte generation, not decoder speed.
On a revision with the native text helper, use `v4 inline-native inline-native-string-first` to separate native helper placement from
successful-string recognition. Preset normalization, direct native delegation, portable
fallback and dual-failure causes stay intact. `inline-native-lost-fallback` must fail the
shared native-exception failure witness in Node and Bun before timing.
`inline-native-extra-buffer` must fail the default-text resource counter on Bun before timing;
the mutation preserves output and exposes work that byte-generation counters cannot see.
Both native mutations also apply to the retained public-function implementation. Historical
helper-placement candidates reject an already-inlined source; reproduce them with
`bench/compare.ts <helper-ref> <helper-ref> --source-candidate=v4:inline-native-string-first`.
Use `v4 string-first` to change only successful-string recognition while keeping the native
helper in place. `string-first-lost-throw` must fail the shared generation-failure witness;
otherwise a fast success check could conceal a changed default-call failure contract.
Use `v4 native-direct-return` on the direct-delegation baseline to return native success before
fallback-error handling. Compare complete calls; preset checks and exception fallback stay intact.
For UUIDv4 native profiling, point `UUID_SLUG_PROFILE_MODULE` at the retained
`<candidate>-<runtime>-api.mjs` and execute the report's `profile.mjs`.
The UUIDv4 artifact without `-api` executes its timing corpus and is not an importable package API.
For equal-call Bun memory comparisons, run `bench/profile-bun-memory.ts` with the candidate API
in `UUID_SLUG_PROFILE_MODULE`, one exact case filter, and `UUID_SLUG_PROFILE_CALLS`.
Use a separate `UUID_SLUG_PROFILE_NATIVE_DIR` for each capture. The report records calls and
selected cases; its collected heap and allocator states measure retention, not gross allocation.
Use `format indexed-loop` to compare Bun's fixed UUID-text writes with its indexed loop through
ordinary generation and byte-to-text conversion; `fixed-writes-lost-byte` must fail the last-byte
oracle before timing. Tables, storage, case selection and string construction stay unchanged.
Use `format direct-latin1` to compare the generic Buffer text call
with a directly captured Latin-1 method. `direct-latin1-lost-byte` must fail the Bun text oracle
before timing; the resource control must count the direct method independently. Keep absent
capabilities on the existing text function and measure cold construction before retention.
Use `latin1 direct-latin1` to select the same method in the Buffer implementation while leaving
the UUID formatter unchanged. Its missing-final-byte and missing-fallback mutations must fail
before timing. The isolated native probe checks all Latin-1 bytes, both UUID text cases and
absent or throwing methods; a throwing method must switch each scratch permanently to generic text.
Use `latin1 whole-buffer` to omit range arguments when the scratch owns exactly the output bytes.
Its missing-final-byte mutation must fail the text oracle before timing; all Latin-1 bytes and
both UUID cases must remain unchanged. Compare complete calls rather than native reads alone.
Use `format utf8-text ascii-text` to compare native decoding of the unchanged ASCII UUID buffer.
`utf8-text-lost-byte` must fail the independent text oracle before timing; general Latin-1 scratch
semantics remain unchanged. Complete generation and conversion calls decide retention.
Use `format word16 word32` to compare wider scratch writes with the fixed byte writer;
`word32-lost-byte` must fail the independent last-byte oracle before timing. Both wider writers
retain one DataView over the existing scratch; the counters do not establish its total heap cost.
Explicit little-endian stores preserve character order independently of host byte order.
Prefix a `UUID_SLUG_PROFILE_FILTER` term with `=` to select that exact case; other terms match
substrings. Use exact terms when a successful-call comparison must exclude similarly named failures.
Use `v7-draw independent-direct-lost-bit` to check the payload oracle: both runtime tests must
reject it before timing, with their failure output retained in the report directory.
Use `pool fixed-four source-cursor` to compare pool copying through complete v4 and v7 calls.
Use `pool indexed-loop` to compare the retained stores with the former indexed copy-and-erase loop.
Use `pool word-four` to compare one unaligned DataView read and erase with four byte stores;
`word-four-lost-byte` must fail the shared payload-and-erasure witness before timing.
The candidate retains one view per initialized pool; account for that cost if throughput survives.
`pool fixed-four-lost-byte` must fail the shared four-byte copy-and-erasure witness before timing.
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
witnesses require every output bit to survive. The generation filter accepts comma-separated
case-name substrings; a single term retains its substring meaning.

Set `UUID_SLUG_GENERATION_FORKS` to repeat the competitor matrix in fresh host and browser
processes. Each process contributes one median per case; retain its batches separately instead
of counting them as independent runs. Keep the filter narrow for exploration. The default remains
one process for screening; fresh processes still share the machine's scheduling and thermal state.
Use `UUID_SLUG_GENERATION_FILTER=v7.text` to include native UUIDv4 text repaired to UUIDv7
alongside package generation, native UUIDv7 and libraries. Host rows compare hexadecimal timestamp
slices with fixed character prefixes. Independent byte witnesses check timestamp carries and
retained payload bits before timing; these lower bounds omit package validation and fallback.
The host comparison also times cached native UUIDv7 clock repair on Bun, both conditional and
unconditional, with and without an explicit native timestamp. Matching prefixes avoid rebuilding
text only in the conditional rows; mismatches must preserve every payload bit.
Use `UUID_SLUG_GENERATION_FILTER=v7.slug.base64url` with `bench/generation-host.ts` to compare
native Bun slug timestamp repair with complete package and library calls. The host includes
conditional and unconditional repair with default and explicit native clocks. Its independent
Buffer encoder checks every retained payload bit and timestamp boundaries before timing.
These repaired calls omit package validation and native-failure fallback; a loss rejects
integration, while a gain requires those costs and overflow behavior to be measured separately.

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
Set `UUID_SLUG_PROFILE_SAMPLES` to control batches per process in packed comparisons; each host
and browser must return that exact count. Summaries record it separately from independent
process observations. Retain every batch; the process median does not make batches independent.

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
  arrays/views; the current repeated-v4-draw check bounds pooled entropy calls. This protects the
  retained implementation's resource cost, not a required pooling algorithm: reassess it against
  complete-call rival evidence before adopting another entropy mechanism. Fixed-size writers must construct one string;
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

Run `bun run build && bun bench/profile-workerd.ts` to exercise the compiled public package in
local Cloudflare workerd, with and without `nodejs_compat`. Both configurations load the portable
package implementation; enabling Node compatibility does not select the package's Node implementation.
The driver uses `bunx workerd` unless `UUID_SLUG_WORKERD_EXECUTABLE` names an installed binary.
It records the observed runtime and compatibility date, bundle inputs, shared correctness checks,
completed calls and raw batch durations under a fresh `bench/reports/workerd-*` directory.
No Cloudflare account or deployment is involved.

Use the existing `UUID_SLUG_PROFILE_FILTER` and `UUID_SLUG_PROFILE_SAMPLES` controls; set
`UUID_SLUG_PROFILE_CALLS` for a fixed batch size. Increase calls geometrically if the local timer
cannot resolve every batch. The driver rejects zero durations and keeps HTTP request time separate
from identifier timing. Repeat comparisons in fresh processes before selecting an implementation.
Add `--native` to capture CPU and sampled allocation through the runtime's inspector. These profiles
exclude correctness setup and warm-up but include dispatch and reporting; their totals are not
per-call package allocation.
Read [Cloudflare's timer limits](https://developers.cloudflare.com/workers/runtime-apis/performance/)
before interpreting results: local timers advance during CPU work, while deployed timers advance
after I/O. Local timing does not prove production latency or deployed UUIDv7 clock behavior.

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

Use `UUID_SLUG_PROFILE_FILTER=conversion.slug.bytes` to profile package decoding against
native decoding into fresh plain arrays and Buffer decoding followed by a private copy.
Use `conversion.text.bytes` or `conversion.bytes.text` for complete UUID conversion comparisons
against `uuid` and the available native functions; these use the same checked conversion corpus.
The conversion corpus checks exact bytes and separate backing storage before profiling.
Host profiles include Buffer copies; browsers include the available typed-array methods.
Compare CPU and sampled allocation with completed call counts; setup, warm-up and engine
sampling prevent these captures from proving total allocation per call.

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
Each process-exit profile retains its own timing and completed-call records in the adjacent
JSON Lines report. Use those counts for that process only; another run has different profiler
overhead and may complete a different number of calls. Attribute sampled stacks beneath public
calls, retaining harness, startup, GC and unattributed samples separately. Inlining can remove
case labels, so their absence does not prove that an operation did no work.

The same command separately measures cooperative mask construction around byte-packing and UTF-8
chunk boundaries, geometric work factors, host-task progress, and cancellation. These promise-based
rows stay outside the synchronous corpus so task scheduling cannot contaminate per-call throughput.

Before warm-up, the shared corpus validates identifier shape, UUID bytes, caller-owned output
identity and boundaries, and atomic invalid-range failure. These checks stay outside timed calls.

Set `UUID_SLUG_PROFILE_NATIVE_DIR` to a separate report directory for each native-profile comparison;
otherwise later profiles replace the default reports. Preserve each candidate's raw profiles before
using them to justify retention.
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
