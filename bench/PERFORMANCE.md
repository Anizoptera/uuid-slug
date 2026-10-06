Choose each runtime's writer from repeated consumer-call measurements, including mixed workloads and isolated calls.

# Performance study

## Primary TypeScript call review

### Native Bun default UUIDv7 text

Bun defaults use native UUIDv7 text generation; Node keeps its independent package generator.

The focused packed comparison in `bench/reports/native-v7-default-packed-isolated.log` compares
the candidate with commit `840937b` on Bun 1.4.2 and Node 26.10.0. Each of twelve fresh process
pairs supplies one median from nine 10 ms batches after 64 ms warm-up. Bun's paired median cost
ratio is 0.578, with a 95% interval of 0.569–0.620; Node's is 1.061, with an interval of
1.013–1.110. These are single-machine warm throughput observations, not individual-call latency.
The broader repeat in `native-v7-primary-packed-repeat.log` has large outliers even in unchanged
controls; its intervals do not establish parity. No outliers are removed.

Equal-call Bun profiles in `native-v7-profile-baseline/` and `native-v7-profile-candidate/`
execute 2,097,152 default text calls each. The baseline samples native string conversion, portable
formatting, generation and entropy work; the candidate samples native UUIDv7 generation instead.
One profile pair supports that changed execution path, not a universal CPU or allocation ratio.
The resource witnesses in `native-v7-resources-baseline-bun.jsonl` and
`native-v7-resources-bun.jsonl` replace one portable string-writer call with one native generation
call per warmed preset-text operation. They observe no byte-array or view construction on either
warmed path and do not measure allocations inside native generation.

The initial shared implementation's Node loss rejects that implementation, not native Bun generation.
`bench/reports/current-native-baseline-v7-ranking-repeat.jsonl` compares the retained default text
with qualified libraries, including `fastv7`, across fresh processes. The package leads those
libraries on Node Current, Node LTS, Bun, Deno and Chromium. Bun's remaining direct-native
difference is negligible and accepted; preserve delegation rather than adding another wrapper.
These are warmed throughput comparisons, not individual-call latency or total allocation.

Matched current-package/native captures `current-native-v7-text-resources-4` through `-7`
use Bun 1.4.2, 65,536 preparation calls and two windows of 2,097,152 completed calls.
The order is package, native, native, package. The native case shares its definition and
captured function call with the host corpus. Package caller CPU is 89.061 and 88.384 ms against native
86.946 and 87.807 ms. Second-window process CPU is 88.311 and 87.352 ms against native
88.073 and 87.356 ms. Every second window keeps committed memory flat. First-window
commitment varies and cannot establish per-call allocation. JavaScriptCore profiles assign
924/971 and 930/977 package samples to native `randomUUIDv7`, versus 920/948 and 968/986
native samples. The remaining samples include the package wrapper and harness; sampling
does not measure gross allocation or an exact CPU ratio. These captures select no material
resource loss for another wrapper rewrite. Preserve direct delegation under the accepted
small-difference ruling. Each report directory retains heap statistics, sampling and a snapshot;
adjacent `.jsonl` files retain the second window. Logs are
`/tmp/uuid-slug-native-v7-text-resources-{4,5,6,7}.log`.

### Reported Node engine allocation

Preserve the Node calls below; both process orders report lower engine heap allocation and caller CPU than each tested matching alternative.

Node allocation comparisons under `current-primary-native-heap-allocation/` load the built
public `dist/index.js` API on Node 26.10.0. Fresh processes reverse case order between paired
passes, with 65,536 preparation calls and 262,144 measured calls. The qualified corpus checks payloads
before measurement; owned byte-generation and slug-decoding rows also check private storage.
`text-byte-ownership.jsonl` separately passes the existing payload and private-storage oracle
for every measured text-to-byte alternative, including native hex and Buffer with a copy.
The installed libraries are `uuid` 14.0.2, `uuidv7` 1.2.1, `fastv7` 1.0.2 and `slugid` 5.0.1.
The table gives observed reported heap bytes per call, rounded to whole bytes, not confidence bounds.

| Complete call | Package | Matching alternatives |
| --- | --- | --- |
| UUIDv4 text | 75–78 | `uuid`: 662–664; Web Crypto: 657–658; `crypto-randomuuid`: 657–662 |
| Owned UUIDv4 bytes | 245–260 | `uuid`: 361–369; Web Crypto: 376 |
| UUIDv4 base64url slug | 59–64 | `slugid`: 934–969; Web Crypto with native encoding: 488 |
| UUIDv7 text | 106–111 | `fastv7`: 682–686; `uuid`: 1,100–1,109; `uuidv7`: 1,440–1,443 |
| Owned UUIDv7 bytes | 263–265 | `uuidv7`: 319–320; `uuid`: 401–407 |
| UUID text to bytes | 243–244 | `uuid`: 386–391; native hex: 516–522; Buffer with a copy: 683–695 |
| Bytes to UUID text | 69–70 | Native hex: 498–499; Buffer: 607–615; `uuid`: 707–717 |
| Plain slug to owned bytes | 245–247 | Native base64: 282–284; Buffer with a copy: 356–366; native decoding into a fresh array: 364–366 |

These counter differences include harness and engine work; external backing storage is outside
their scope. Caller CPU includes yields, while batch timing has a narrower scope and large
outliers. These captures do not replace the throughput ranking or establish total allocation,
individual-call latency, other-runtime parity, or costs for unmeasured input forms. UUIDv7 slug
generation reports 92–94 bytes per call without a matching allocation comparison; keep that gap open.
The additional `crypto-randomuuid` captures reuse its existing qualified case factory. The final
profiler executes that case on Node Current, Node LTS, Bun and Deno; only qualified hosts report
the heap-allocation field. No regression threshold follows from these two-process comparisons.

### Bun UUIDv4 slug resources

Scratch-backed native generation exposes a Bun UUIDv4 slug gap; replacing only the writer does not close it.

`current-primary-v4-slug-bun-resources/` retains Bun 1.4.2 profiles from fresh processes in
reversed order. Repeated-call captures use 65,536 preparation calls, two windows of 1,048,576
completed calls and a separate sampling pass. The qualified corpus checks that each result decodes as a
UUIDv4 slug before measurement. Caller CPU is unsampled; committed and resident memory are
process observations after collection, not gross allocation or per-ID memory.

The initial package captures report 46.9–48.7 ns of caller CPU per call, against
48.5–51.7 ns for Web Crypto with an allocated array and 196.0–213.8 ns for `slugid`.
Package first-window commitment rises by 36.2–37.9 MB, compared with 5.8–14.5 MB for the
native composition. Package second-window commitment stays flat, but resident memory rises
by 5.5–6.4 MB. One-call controls after identical preparation have only 0–0.13 MB of first-window
commitment growth; observation alone does not reproduce the large increase.

The `alphabet:native-leaf` screen in `candidates-alphabet-Wx7UPz/` passes Node and Bun
behavioral proofs and resource counts. Bun native present, absent and throwing probes pass;
deliberate native-output corruption fails the intended oracle. Profiles confirm `toBase64`
replaces sampled Latin-1 `toString` execution. Yet the
matched candidate captures do not reduce commitment reproducibly: baseline increases are
37.7 and 44.9 MB, versus 45.1 and 42.7 MB with native encoding. The short throughput screen
also loses UUIDv4 slug generation in both orders, at 60.7 and 69.7 ns versus 55.2 and 53.5 ns.
Reject this candidate; sampled string construction did not establish the memory cause.

The native floor need not allocate bytes when it returns only a slug. The maintained corpus
therefore retains both allocating and scratch-backed native calls, with shared encoding options.
The repeated memory captures prefixed `scratch-` report:

| Complete call | Caller CPU per call, two processes (ns) | First-window commitment growth (MB) | Second-window commitment growth (MB) |
| --- | --- | --- | --- |
| Package | 49.0; 48.8 | 33.9; 38.2 | 0; 0 |
| Native, allocated bytes | 47.6; 48.4 | 11.5; 11.8 | 0; 0 |
| Native, private scratch | 43.8; 43.4 | 27.7; 15.9 | 0; 8.0 |

`scratch-ranked.jsonl` retains three fresh-process medians per call after 16 ms preparation,
with five 5 ms batches per process. Bun package medians are 51.0 ns; native scratch medians
are 43.8–45.6 ns. Node Current, Node LTS, Deno and Chromium favor the package against their
available measured rivals. The scratch-backed row executes wherever `toBase64` is available;
Node LTS has no such row. These small samples provide no confidence interval or latency-tail
proof. Keep the Bun complete-call difference and unresolved memory behavior open; neither
the native-writer screen nor these observations establish a removable pooling cost.

`current-primary-v4-slug-pooled-native/` compares the actual package byte draw followed by
native encoding with direct Web Crypto and the same native encoder. Both use private 16-byte
arrays; the package draw also includes its existing failure handling. This composition is not
the published slug call. Three fresh-process Bun medians are 41.0, 41.1 and 42.8 ns, versus
48.0–50.0 ns for the published call and 42.1–42.5 ns for direct Web Crypto plus native encoding.
The screen does not establish a pooling penalty. Preserve the pool and test native encoding
at slug generation; the shared `alphabet:native-leaf` candidate remains rejected.

Reversed fixed-call memory captures use the same preparation and window counts above. Package
caller CPU is 46.2 and 46.9 ns per call; pooled native composition reports 41.6 and 40.9 ns.
First-window commitment increases by 36.9 and 38.5 MB for the package, versus 28.0 and 35.0 MB
for the composition; all second-window commitment readings stay flat. These observations do not
measure gross allocation. Sampling confirms native `toBase64` replaces the package's Latin-1
`toString`. Small process counts, fixed case order and engine variability limit the comparison;
public-call dispatch, unsupported capabilities and fallback costs remain unmeasured for this composition.

`candidates-v4-slug-PMge43/` screens native encoding inside UUIDv4 slug generation on Bun 1.4.2.
Two fresh processes per implementation use reversed order, 16 ms preparation and three 5 ms
batches; UUIDv4 text and owned-byte jobs precede the slug calls. Base64url medians are 51.3 and
49.1 ns against baseline 51.1 and 52.4 ns; the gain does not repeat. Base32 medians are 49.0
and 49.2 ns against 45.0 and 46.5 ns. This screen does not justify retention. These batches
provide no confidence interval or individual-call latency.
Both implementations pass Node and Bun runtime tests and the existing resource counters.
The native candidate reaches two native calls with the method present, zero when absent and
one when throwing; fallback preserves the observed secure payload. Changing the first returned
character fails the independent byte oracle. This proves the selected paths, not a resource gain.
The isolated comparisons below supersede this mixed-job screen's placement rejection.

Each isolated process selects one alphabet, reuses the same built module and profiler, and uses
64 ms preparation followed by seven 20 ms batches. Two fresh processes per implementation run
in baseline/candidate/candidate/baseline order. Native entry reports base64url medians of 42.1
and 42.4 ns against 43.9 and 44.9 ns; base32 reports 43.5 and 43.7 ns against 43.9 and 44.1 ns.
The small base64url gain repeats without the earlier base32 loss. It earns further comparison,
not production retention or duplicated capability probes.

`candidates-v4-slug-lM14MI/` isolates primitive-preset recognition. Base64url medians are 42.2
and 42.8 ns against 44.2 and 43.4 ns; base32 reports 43.5 and 43.5 ns against 43.1 and 42.5 ns.
Reject that extra branch: the small gain accompanies a base32 cost. Longer mixed-job windows
also retain sharp within-process drift, so more batches alone do not settle that comparison.
Isolation changes the evidence; these captures do not identify GC, allocation or JIT as its cause.

The `floor-isolated-*` captures in `candidates-v4-slug-PMge43/` use the same preparation and
batch settings, with package/native-scratch/pooled-composition order followed by its reverse.
Package medians are 46.2 and 46.8 ns; native scratch reports 43.7 and 42.6 ns; native encoding
after the actual package draw reports 42.1 and 42.8 ns. Aggregate caller CPU per completed call
is respectively 46.6 and 46.8, 43.3 and 42.7, and 42.3 and 42.7 ns. The composition excludes
public dispatch and fallback. Compare within each measurement: selecting a generation case adds
an operation wrapper that the ordinary case lacks. The remaining gap is small.
All isolated figures have only two process observations per implementation and no confidence
interval; batches are not independent process samples. They establish neither individual-call
tails nor total allocation. Native integration remains open pending shared ownership and packed
complete-call speed and resource evidence.

`candidates-v4-slug-ZdXXc8/` tests generation through the existing `uuidBytesToPlainSlug`
converter, reusing its native probe, options and permanent fallback state. Node and Bun runtime
proofs and resource counters pass; native present, absent and throwing calls report 2, 0 and 1
attempts, and native corruption fails the observed-byte oracle. The same isolated settings
give base64url medians of 44.0 and 45.7 ns against 43.7 and 44.8 ns; caller CPU reports 43.8
and 44.9 ns against 43.2 and 44.1 ns. Base32 medians are 43.7 and 45.1 ns against 44.8 and
44.7 ns. Reject this candidate: it adds no reproduced complete-call gain. These comparisons
do not isolate the converter's byte checks from dispatch, inlining or process variability.

`candidates-v4-slug-REuaL1/` extracts the existing native/fallback writer unchanged into one
internal function shared by conversion and generation. The 521-byte body and comments match
exactly; no native probe, options object, entropy buffer or fallback state is duplicated.
Node and Bun behavior and resource proofs pass. Native present, absent and throwing captures
report 2, 0 and 1 attempts; native corruption fails the independent observed-byte oracle.
The first isolated Bun screen uses the settings above. Generation medians are 42.1 and 52.0 ns
against 43.5 and 54.6 ns; base32 reports 43.6 and 44.4 ns against 42.7 and 43.8 ns; conversion
reports 69.4 and 70.6 ns against 79.0 and 69.4 ns. These process shifts do not establish a cause.
The reversed repeat reports generation at 42.1 and 42.6 ns against 44.4 and 43.4 ns, base32 at
43.1 and 43.5 ns against 44.4 and 43.4 ns, and conversion at 72.0 and 67.6 ns against 69.2 and
69.0 ns. Generation retains a small benefit; other directions vary. Production retention needs
packed complete-call and resource comparisons; these source batches provide no confidence interval.

Do not retain this extraction: packed calls do not establish a useful generation gain without
loss elsewhere. `v4-slug-shared-writer-packed-6GZZTS/` compares committed source through packed
consumers on Node 26.10.0 and Bun 1.4.2, with six fresh process pairs per host, seven batches,
20 ms sample windows and 64 ms preparation. Node base32 candidate/baseline median ratios are
1.084 and 1.081; their reported 95% intervals are [1.084, 1.129] and [0.897, 1.129]. The direction
repeats, but the second interval does not establish a loss. Bun generation ratios are 0.974 and
0.718 with intervals [0.938, 1.531] and [0.370, 1.035]; neither establishes a gain. Conversion
also remains unresolved. Process shifts prevent causal attribution; batches are not independent
samples, and throughput does not establish individual-call tails or total allocation. Preserve
the existing implementation. Native encoding remains a candidate only with integration that
preserves other outputs and produces a useful repeated complete-call gain.

`candidates-v4-slug-8mprBz/` tests `shared-selected`: initialization chooses the existing encoder
directly when the shared native writer is unavailable. The unchanged 521-byte native body has
one exact copy; Node and Bun correctness and resource proofs pass. Native present, absent and
throwing calls report 2, 0 and 1 attempts; corrupt generation fails the observed-byte oracle.
Isolated source processes use seven 20 ms batches after 64 ms preparation. Bun generation
reports 41.3 and 41.3 ns against 42.9 and 43.1 ns, then 41.5 and 42.4 ns against 43.0 and
42.8 ns in reversed order. Node base32 reports 48.7 and 48.7 ns against 48.5 and 48.7 ns in
the first screen; the repeat shifts widely for both implementations. Conversion directions
also vary. These two observations per implementation per screen establish no independent
confidence interval, allocation parity or cause for the shifts. The small generation benefit
selects packed testing only; it does not justify production extraction.

### Owned UUIDv7 generation allocation

Keep the owned UUIDv7 generator: equal-call Node profiles estimate fewer allocated bytes beneath the measured loop than the qualified byte-producing rivals.

`bench/reports/current-primary-v7-owned-node-resources/` compares Node 26.10.0 calls after
65,536 warm-up calls, with 262,144 measured calls per fresh process. Captures `6` and `7`
select the normal public package through `UUID_SLUG_PROFILE_MODULE`; generation frames point
to `dist/v7-keyless.js`. The earlier source-corpus captures remain separate.
Estimated JavaScript allocation beneath the measured loop is 65,542,416 and 65,429,712 bytes
for the public package, 85,332,536 and 85,206,152 for `uuidv7`, and 101,370,696 and 100,746,360
for `uuid`. These are sampled estimates, not total allocation or independent confidence bounds.
Most output allocation is inlined into the loop frame; that frame cannot be discarded as harness
overhead. Setup, warm-up and allocations outside the measured loop are excluded from these totals.
Profiling changes CPU cost; use the separate unsampled ranking for throughput decisions.

The profiler reuses qualified generation calls and their payload and private-storage witnesses.
Its forwarding-count regression fails when the corpus ignores the requested package module,
even though the substituted generator still returns valid UUIDs.

On Bun 1.4.2, equal-call captures select no owned UUIDv7 generator change. Six fresh processes
run the package, `uuidv7`, and `uuid`, then reverse that order. Each uses 65,536 preparation
calls, two windows of 2,097,152 measured calls, and a separate sampling pass of that size.
Every case passes the qualified corpus's payload and private-storage witnesses before profiling.

| Generator | First-window caller CPU, two processes (µs) | Second-window committed growth (bytes) |
| --- | --- | --- |
| Package | 78,734; 73,899 | 0; 0 |
| `uuidv7` | 87,887; 88,585 | 0; 1,048,576 |
| `uuid` | 77,640; 81,968 | 3,145,728; 3,670,016 |

Package caller CPU is lower than `uuidv7` in both orders; its comparison with `uuid` changes
direction. These captures show neither a repeated package CPU disadvantage nor continuing
package committed-memory growth. Preserve generation; first-window capacity varies, and retained
heap and sampled stacks do not establish gross allocation parity, leak freedom or confidence bounds.
Raw captures are `bench/reports/current-primary-v7-owned-bun-resources/{0,1,2,3,4,5}/`.
Reproduce with `bench/profile-bun-memory.ts`, its fixed-call controls, and the named qualified
generation cases; native Buffer-copy comparisons remain separate from this library comparison.

Owned slug decoding remains faster than the measured equivalent native calls in two resource
captures on 2026-10-04. `bench/reports/owned-decoder-resource-clean/` and
`bench/reports/owned-decoder-resource-repeat/` contain CPU, sampled allocation, heap, trace and
process-counter artifacts from the shared profiling corpus. Each capture uses seven 20 ms
batches after 16 ms warm-up; exact-byte and fresh plain-array witnesses run before measurement.
The package API is supplied by the profiling driver, not the conversion factory's source default.
The earlier `owned-decoder-resource-profile/` capture overlaps verification and is excluded.

On Deno 2.9.7, compiled package decoding measures 170/172 ns, native `fromBase64` 302/319 ns,
native `setFromBase64` into a fresh array 320/333 ns, and Buffer decoding followed by a copy
285/296 ns. Process CPU divided by timed calls measures 228/232 ns for the package and
356–381/370–390 ns for these native alternatives. All four rows report no filesystem reads,
writes or major page faults. On Bun 1.4.2, package decoding measures 24/25 ns against
74/76 ns for native array decoding, 80/82 ns for native writes and 115/120 ns for Buffer copies.
Node 24.21.0 measures 95/93 ns for the package against 194/188 ns for Buffer copies.
These profiled timings include instrumentation and do not replace ordinary throughput comparisons.

Deno's sampled allocation attributes substantial bytes to every decoder closure, including
the package. Buffer copies also allocate through Deno's `byteLength` and `getEncodingOps`.
The methods complete different call counts, warm-up is included, and source attribution can
merge inlined allocations. These captures do not establish total bytes per call, resource parity,
or a production-source Deno verdict. Two processes with fixed case order cannot bound a small
remaining effect. Keep the resource gap open; no production substitution follows from this study.

Argument-free immutable UUIDv7 generation has no caller configuration to read. The
`primary-value-consumed-screen.log` and `primary-value-consumed-repeat.log` source screens
on 2026-10-03 compare an early default branch with unchanged generation on Node 26.10.0,
Bun 1.4.2 and Deno 2.9.7. Each candidate has two fresh processes per runtime, reversed order,
three 5 ms batches and 16 ms warm-up. The timing loop reads the generated version; verification
checks frozen values and UUIDv7 bytes. Older `primary-value-screen.log` timings only consume
object shape and cannot support a field-consumption claim. The `default-lost-throw` mutation
fails the shared entropy test in both Node and Bun before timing (`primary-value-mutation.log`).
These are selection screens, not independent confidence intervals or resource-parity evidence.
Node and Bun favor the early branch in both field-consuming screens; Deno observations and
explicit-time controls vary. The follow-up `primary-value-split-screen.log` also compares a
small default wrapper with a separate configured helper. Its default-call results favor that
split on Node, show a small or unresolved Bun effect, and do not settle Deno. Packed comparisons
must decide retention; no production optimization follows from these samples alone.

The six-pair packed `primary-value-packed.jsonl` comparison selects `default-split`, while
`primary-value-shared-packed.jsonl` selects `default-fast`. Both use normal packed imports,
alternating revision order, rotated runtime order, fresh processes, 5 ms batches and 16 ms warm-up.
The second comparison shares UUID field consumption across host and browser timing; the first
comparison's browser results still consume only object shape and cannot establish the same job.
Node 26.10.0 explicit-time calls cost 1.108 times baseline with the split and 1.129 times with
the early branch; their reported 95% median-ratio intervals are [1.06, 1.15] and [1.10, 1.19].
The early branch's Node default ratio is 0.959 [0.91, 0.98], but that gain does not offset the
configured-call loss. Reject both. The second comparison also shows slower explicit-time calls
on Firefox 155.0; Bun 1.4.2 and Deno 2.9.7 intervals remain unresolved. Chromium 153.0.8010.12,
WebKit 26.6 and Node Current JITless cannot override the Node configured-call rejection.
Six pairs give coarse intervals conditional on independence, not general regression bounds.
No new native profile or Node LTS retention replay is justified after this rejection.

`primary-value-empty-screen.log` and `primary-value-empty-repeat.log` compare a shared frozen
empty options record while preserving public generation control flow. They use the same source
screen settings on Node 26.10.0, Bun 1.4.2 and Deno 2.9.7, including generator and codec values
and masked base64url and base32hex generation because all share the reader. Both screens pass
their behavior and resource checks. Bun default-value medians favor the shared record, but its
codec-value medians lose in three of four fresh processes; Node effects vary. Reject it before
packed replay. These short observations cannot establish resource parity, small-effect
equivalence or a cause for the variation. Private-field value construction and generation
remain unchanged; this does not settle the remaining value-generation or native-floor gaps.

Two competitor matrices on 2026-10-03 retain three fresh-process medians per row, each from
five 5 ms batches after 16 ms warm-up. The raw files are
`bench/reports/primary-review.jsonl` and `bench/reports/primary-review-repeat.jsonl`.
Node 26.10.0, Node 24.21.0, Bun 1.4.2, Deno 2.9.7 and Chromium 153.0.8010.12 run on one M4 Max.
These short observations screen throughput; they do not establish resource parity or individual-call latency.

Two refreshed default-text matrices (`primary-native-v4-repair-matrix.jsonl` and
`primary-native-v4-repair-repeat.jsonl`) on 2026-10-03 use five fresh processes per runtime,
seven 5 ms batches per process and 16 ms warm-up. Each independent observation is the process
median. Node 24.21.0, Node 26.10.0, Bun 1.4.2, Deno 2.9.7 and Chromium 153.0.8010.12 complete
the ordinary library comparison; host processes also measure native UUIDv4 timestamp repair.
An independent Buffer writer checks timestamp boundaries and two complementary payload patterns
before timing either repair. Replacing the timestamp and version retains all 74 UUIDv7 payload bits.

Bun default text reads 73.61/72.31 ns across the matrices, against native Bun UUIDv7 at
47.02/46.12 ns: the remaining package/native ratio is about 1.57 in both. The fastest qualified
measured library, `uniku`, reads 188.38/184.48 ns; `fastv7` reads 125.45/123.16 ns.
Timestamp drift alone does not disqualify default generation under the generation policy in
`docs/public-api.md`. The package leads these measured libraries on this workload;
that does not close the native gap or establish resource parity. Native UUIDv4 repair costs
173.26/161.54 ns using hexadecimal slicing and 112.69/106.61 ns using fixed character prefixes.
Both lose before adding package validation or native-failure fallback. Node and Deno also favor
the package over both repaired forms. Reject those two mechanisms, not every possible native
repair. The small process sample does not establish small-effect equivalence, call p99, startup
cost or a physical floor; the matrices share one machine and fixed within-process case order.

Cached native UUIDv7 clock repair also loses before package validation or fallback. On
2026-10-04, `native-v7-clock-repair-matrix.jsonl` retains five fresh processes per runtime,
each with nine 20 ms batches and 32 ms warm-up. It uses each runtime's bundled benchmark graph.
Five `native-v7-clock-repair-source-*.jsonl` files repeat the Bun comparison through its normal
TypeScript entry. Every call consumes the returned string; the independent Buffer oracle checks
matching and mismatching timestamps, rollback, carry boundaries and unchanged payload bits.
Timestamp-loss and payload-loss mutations fail that oracle (`native-v7-repair-oracle.log`).

| Bun 1.4.2 text result | Bundled median ns | Source median ns |
| --- | ---: | ---: |
| Package default | 73.80 | 74.79 |
| Native UUIDv7 without repair | 48.25 | 52.29 |
| Default native clock, unconditional repair | 113.12 | 114.23 |
| Default native clock, conditional repair | 112.43 | 114.87 |
| Explicit native clock, unconditional repair | 109.47 | 111.87 |
| Explicit native clock, conditional repair | 101.13 | 104.04 |

Each table value is the median of five process medians, not five independent call latencies.
The fastest repair still loses in every source process against that process's package default.
Reject these four repairs before paying for package integration or an allocation study: their
lower bounds already lose. This does not reject other repair mechanisms, establish a physical
floor or close native parity. Bundled and source runs share a machine and engine; they test graph
sensitivity rather than independent platforms. Neither gross allocation, cold-start cost nor
individual-call tail latency was measured for these rejected candidates.

Cached native UUIDv7 slug clock repair also loses before package integration. On 2026-10-04,
five fresh Bun 1.4.2 processes use normal TypeScript imports, nine 20 ms batches per case and
32 ms warm-up. `native-v7-slug-repair-source-*.jsonl` retains each process's complete output;
`native-v7-slug-repair-source-summary.jsonl` retains their medians. The independent Buffer
encoder checks timestamp boundaries, rollback, matching prefixes and each of the 74 payload
bits. Timestamp-prefix and suffix-loss mutations fail before timing; their logs are
`native-v7-slug-repair-timestamp-mutation.log` and
`native-v7-slug-repair-payload-mutation.log`.

| Bun base64url slug result | Median of process medians ns |
| --- | ---: |
| Package default | 79.10 |
| Native UUIDv7 without repair | 64.74 |
| Default native clock, unconditional repair | 123.25 |
| Default native clock, conditional repair | 128.66 |
| Explicit native clock, unconditional repair | 118.75 |
| Explicit native clock, conditional repair | 109.85 |

Every repaired form loses against the package in every process. Reject these four mechanisms
before adding package validation, failure fallback or resource studies. The shorter slug prefix
does not rescue this cached native-repair design. The native floor remains faster and its
timestamp-overflow mismatch remains a separate adoption constraint. These process medians
measure throughput on one machine, with case order rotating within each process. They do not
establish individual-call latency, gross allocation, cold-start cost, other runtimes or a
physical limit on different repairs.

Direct UUIDv7 text construction does not earn production retention from the current screens.
The maintained `v7-draw` candidates eliminate intermediate byte writes using character codes,
native Latin-1 text with individual hexadecimal lookups, or native Latin-1 text with paired
lookups. All preserve the original sequence and entropy handling. Independent text encoding
checks timestamp and counter boundaries in both cases; walking input bits checks all 74 payload
bits. Missing-tail and missing-timestamp mutations fail Node and Bun tests. Native-only
missing-tail mutations fail Bun tests; Node retains the original formatter when that capability
is absent. The mutation logs are `direct-text-tail-mutation.log`,
`direct-text-timestamp-mutation.log`, `direct-text-native-mutation.log` and
`direct-text-pairs-mutation.log` under `bench/reports/`.

On 2026-10-04, `candidates-v7-draw-LpFeXx` and `candidates-v7-draw-KUVQDQ` retain two fresh
processes per candidate and runtime, with reversed candidate order, nine 20 ms batches and
32 ms warm-up. Node 26.10.0 and Bun 1.4.2 run source-derived bundles on one M4 Max. The first
screen compares all three candidates; the repeat selects paired lookups only.

| Bun text comparison | Package process medians ns | Paired lookup process medians ns |
| --- | ---: | ---: |
| First screen | 79.07 / 79.30 | 75.20 / 74.12 |
| Repeat | 80.12 / 79.26 | 82.64 / 74.99 |

The apparent paired-lookup gain reverses in one repeat process. Its repeat plain-slug controls
also lose: package medians are 76.00 / 77.64 ns against 80.95 / 81.17 ns. The character-code
candidate loses Bun text in both first-screen processes; individual Latin-1 lookups show only
small changes. These observations do not justify another formatter or shared-table refactor.
They do not establish which engine or scheduling mechanism explains the changes.

The counted-resource witness records one additional 512-byte lookup array when preset text
follows the existing paired-output job. Warm preset text records no new arrays, views, errors
or slices and exactly one native string conversion. Those counters do not measure native
buffer allocation, generator closures, gross allocation or retained heap after collection.
Mixed use would retain both formatter implementations unless storage were shared.

Each independent observation is a process median; batches within a process are not independent
samples or individual-call latencies. These small samples do not bound negligible effects.
Packed imports, cold construction, other runtimes and complete resource parity remain
unmeasured for these candidates. Exclude `direct-text-native-screen.log` from native-candidate
selection because its native-specific mutation proof follows that screen; the two named
longer screens follow the mutation proofs. Keep native parity open.

Compare reused prefix calculations before rejecting fused native text construction entirely.
`v7-draw direct-text-reused-prefix` retains characters for the timestamp and upper counter
only while the timestamp, high counter word, upper low word and selected case table all match.
The refreshed prefix and random suffix use one shared native text buffer. Other runtimes retain
the original formatter; configured text still uses the existing byte writer.
The stale-prefix mutation fails Bun's timestamp, payload-bit and selected-generator assertions
before timing (`reused-prefix-refined-mutation.log`). Intact Node and Bun proofs pass.

Two 2026-10-04 refined screens use nine 20 ms batches after 32 ms warm-up and two fresh
processes in reversed candidate order on Node 26.10.0 and Bun 1.4.2. Bun text reads
78.31/81.01 ns against candidate 74.02/75.15 ns, then 80.19/79.60 ns against 73.90/73.54 ns.
Slug controls change direction; the repeat Node byte controls are slower in both orders.
The first Node observations also include 199 ns candidate text and 286 ns baseline slug;
their source and cause remain unresolved. Preserve all observations rather than dropping them.
Raw proofs, counted resources, source snapshots and timings are in `candidates-v7-draw-Ytd7zd/`
and `candidates-v7-draw-ZFXxkn/` under `bench/reports/`. The earlier stores-only screen
(`reused-prefix-screen.log`) still computes the prefix every call and gives inconsistent savings.
Repeated source throughput supports a packed comparison, not retention: added case tables,
native storage, generator closures, total allocation and other runtime effects remain open.

Keep reused-prefix production retention unresolved after the packed comparisons.
Two six-round packed comparisons on the same Node and Bun releases use 20 ms batches and
32 ms warm-up. `reused-prefix-packed-retry.jsonl` gives Bun lowercase/uppercase ratios
0.877/0.885 with intervals below one, but Node slug ratio 1.022 [1.01, 1.05] is slower.
`reused-prefix-packed-repeat.jsonl` gives text medians 0.893/0.883 on Bun and Node slug
1.019, with broad intervals; Bun slug is slower at 1.074 [1.00, 17.05].
Round four includes long wall-time pauses on Bun candidate and Node baseline calls. Bun
candidate bytes take 112.58 ms with 4.56 ms CPU; Node baseline explicit-time text takes
103.66 ms with 0.30 ms CPU. These counters expose elapsed time outside measured CPU work,
not its cause. Keep the pauses in the evidence. The text gain does not establish resource
parity or justify other primary-call losses. Profiles must resolve those losses before retention.
Packed source snapshots are `packed-source-gsQPt5/` and `packed-source-C8u1w9/`.
The first attempt (`reused-prefix-packed.log`) fails before timing when Parcel receives
SIGSEGV during the candidate consumer check; it supplies no performance evidence.

Two Node source profiles select only ordinary slug generation through the retained screen
modules, with seven 20 ms batches and 32 ms warm-up. Baseline/candidate CPU profiles have
1106/1093 samples; base64url writing accounts for 282/275 and clock reading for 200/196.
Both retain the same largest sampled functions. These sampled source profiles do not identify
the cause of the packed slug loss, prove identical generated machine code, or establish
allocation parity. Raw CPU, allocation, GC, heap and completed-call records remain in
`bench/reports/reused-prefix-profiles/`.

Reject capability-gated draw creation as a demonstrated fix for the primary-call losses.
`direct-text-reused-prefix-native-only` creates the extra draw function only when native
Latin-1 formatting is available. The intact Node/Bun suites and resource checks pass before
two fresh processes in reversed order, using nine 20 ms batches and 32 ms warm-up.
Node slug medians are 85.12/86.08 ns baseline and 85.67/88.54 ns candidate; Bun owned bytes
are 45.54/46.49 ns baseline and 46.81/48.28 ns candidate. Bun text remains lower at
71.19/75.18 ns against 79.18/76.55 ns. The small sample does not establish the cause of
the losses or equivalence, but gives no reason to run a packed replay of this refinement.
`reused-prefix-native-only-screen.log` and `candidates-v7-draw-x068RE/` retain the proof,
source and measurements. Conditional closure creation alone is insufficient for retention.

Reject prefix comparisons in the general native byte formatter for these primary workloads.
`format reused-prefix` shares the existing text buffer and case tables, comparing the first
ten input bytes as two four-byte words and one two-byte word before rewriting their characters.
The stale mutation fails independent timestamp and byte-position assertions on Bun before
timing; intact Node/Bun behavior and resource checks pass.
Two fresh processes in reversed order use nine 20 ms batches and 32 ms warm-up.
Bun byte-to-text conversion takes 42.51/39.77 ns against baseline 37.81/38.74 ns;
generation text takes 75.45/75.17 ns against 77.38/77.67 ns. The conversion losses outweigh
the small generation gain. Preserve the second Node candidate's long pauses, including
19310 ns slug and 2173 ns conversion observations; their cause remains unresolved.
`format-reused-prefix-mutation.log`, `format-reused-prefix-screen.log` and
`candidates-format-7LR3Ox/` retain the exact proofs and samples. This screen rejects the
tested general formatter, not a shared formatter accepting generator fields directly.

Keep Latin-1 conversion for the measured Bun UUID text calls rather than the tested UTF-8 or ASCII substitutions.
The `format utf8-text ascii-text` source experiment changes only the UUID scratch's native
text reader, retaining its byte writes, case tables and character buffer. Node's selected
formatter remains unchanged. The lost-final-byte mutation fails Bun's independent timestamp
and byte-position text witnesses before timing; intact behavior and resource proofs pass.
Two fresh processes per candidate and runtime use reversed order, nine 20 ms batches and
32 ms warm-up on Bun 1.4.2 and Node 26.10.0. Bun UTF-8 text takes 85.71/87.28 ns and ASCII
text 81.06/85.20 ns against baseline 79.64/78.61 ns. UTF-8 conversion takes 46.80/47.77 ns
and ASCII conversion 44.50/45.11 ns against 37.11/38.56 ns. Reject both before packed replay
or cold-construction studies. These source screens do not establish exact native decoder
cost, independent-call latency or an unavoidable string-allocation floor.
`uuid-ascii-mutation.log`, `uuid-ascii-screen.log`, `candidates-format-OBrQxV/` and
`candidates-format-JdUouZ/` retain the proofs, source and raw observations.

Reject the tested shared generator-field formatters before packed replay because other primary calls regress.
`v7-draw shared-text` eliminates intermediate UUID bytes and reuses the UUID formatter's
character buffer and case tables. `shared-text-prefix` also retains unchanged prefix characters;
ordinary conversion invalidates the cache rather than comparing its input bytes. Native-absent
hosts retain their byte formatter and do not create the added native draw closure.
Lost-tail, stale-prefix and missing-invalidation mutations fail independent Bun text assertions.
The interleaved conversion witness catches the last mutation; intact Node/Bun behavior and
resource checks pass. The artifacts retain both replaced sources rather than only the generator.
Two fresh process orders per candidate on Node 26.10.0 and Bun 1.4.2 use nine 20 ms batches
and 32 ms warm-up. Uncached Bun text takes 74.28/78.62 ns against 77.41/81.88 ns, but Node
slug takes 86.13/90.99 ns against 85.00/85.98 ns. Cached Bun text takes 76.05/73.41 ns,
but conversion takes 38.95/40.30 ns against 36.71/38.15 ns. Reject both source forms rather
than expanding the runtime matrix. This screen does not identify the engine-level cause of
the control losses or prove that direct field formatting cannot work; cold construction,
total allocation and packed performance remain unmeasured for these rejected forms.
`shared-text-mutation.log`, `shared-text-prefix-mutation.log`,
`shared-text-invalidation-mutation.log`, `shared-text-screen.log` and
`candidates-v7-draw-VPcWuX/` retain the mutation proofs and comparison observations.

Two Bun 1.4.2 CPU captures on 2026-10-03 select only `=v7.string` through the maintained
`bench/profile.ts` corpus, with seven 20 ms batches and 16 ms warm-up. Raw files are
`bench/reports/primary-v7-default-only.cpuprofile` and
`bench/reports/primary-v7-default-only-repeat.cpuprofile`, with matching JSONL records.
The CLI profiler includes import and corpus verification, so attribution follows parent links
and counts only samples beneath the public `generateUuidV7` frame in `src/v7-keyless.ts`.
That frame contains 93/119 and 88/114 total samples. Native string conversion plus the Latin-1
formatter account for 56/93 and 51/88 of those caller samples; pooled copying accounts for two
in each capture. This supports investigating text construction before pool-copy changes for
this default-text call. It does not establish exact time fractions: sampling is coarse,
inlining can hide frames, and both captures share one machine. No allocation total, improvement,
native parity or conclusion about byte and slug calls follows from these profiles.

Owned bytes require separate attribution. The 2026-10-03 exact `=v7.bytes` capture uses
seven 20 ms batches after 16 ms warm-up; `bench/reports/primary-owned-v7-profile/` retains
CPU, heap and resource output for Node, Bun, Deno and Chromium. Bun has 83/129 samples beneath
the public byte call, including 30 in its wrapper and 33 in the generator body. Inlining prevents
assigning those samples to individual checks or allocation. The Deno source follow-up
(`deno-source.cpuprofile` and `deno-source.heapprofile` in that directory) profiles `src/index.ts`
separately from the driver's compiled entry. It assigns 814/1092 CPU samples and about 147 MB
of sampled allocation to `bytes`; no separate public-wrapper frame appears. Allocation includes warm-up
and instrumentation and cannot establish bytes allocated per ordinary call or competitor parity.
The inspected `uuid` and `uuidv7` byte implementations also allocate fresh arrays. Compare
bypassing default option dispatch through the existing private draw before changing ownership
or pooling: profiles locate work, but only complete-call replays can justify that substitution.

The private default-byte draw does not earn retention. Two 2026-10-03 source screens compare
`keyless direct-owned-draw cached-owned-draw` on Node 26.10.0, Bun 1.4.2 and Deno 2.9.7, with
two fresh processes per candidate/runtime in reversed order, three 5 ms batches and 16 ms warm-up.
Direct lookup first lowers Bun bytes from 50.08/50.11 ns to 48.08/47.53 ns; the repeat reads
50.52/49.95 ns against 48.83/50.54 ns. Cached-reference directions vary on Node and Deno.
Keep the existing method; these short samples do not establish a reproducible shared gain,
small-effect equivalence, total resource parity or a physical floor. Source, behavior and
counted-resource proofs are in the artifact directories named by `primary-owned-draw-screen.log`
and `primary-owned-draw-repeat.log` in `bench/reports/`. The lost-byte mutation fails the
module-default byte oracle on Node and Bun before timing (`primary-owned-draw-mutation.log`).

Before the fixed text writes, the earlier matrices measured Bun default UUIDv7 text at
86–87 ns against native 44–47 ns, and plain slugs at 76–78 ns against native 60–61 ns.
Native burst timestamp drift keeps those rows as floors rather
than approved replacements. The earlier owned UUIDv7 comparisons favor `uuid` on Bun and
`uuidv7` on Deno; use the fresh Bun comparison below before selecting another byte optimization.
Bun base64url encoding trails native encoding; Deno decoding trails a Buffer-only floor
that does not supply the promised owned plain Uint8Array. The owned native comparison below
favors the package on Deno. Most ordinary Node and Chromium generation
and conversion calls lead the measured libraries; earlier timestamp-library losses are superseded.

Prioritize Bun's remaining native text gap rather than the older owned-byte loss.
Two fresh-process comparisons on 2026-10-04 use nine 20 ms batches after 32 ms warm-up.
`primary-text-rivals.jsonl` records Bun 1.4.2 default UUIDv7 text at 73.45/72.66 ns against
native 49.12/49.16 ns. Node 26.10.0, Node 24.21.0, Deno 2.9.7 and Chromium 153.0.8010.12
also execute the maintained text corpus. Package text is faster than every qualified library
in these observations; native Bun timestamp behavior still prevents direct adoption.
`primary-v7-bytes-rivals-first.log` and `primary-v7-bytes-rivals-repeat.log` record Bun owned
bytes at 39.74/39.77 ns against `uuid` at 39.89/39.27 ns. Their changed direction supersedes
the earlier clear Bun loss without establishing equivalence. Caller-buffer calls remain slower:
38.75/39.88 ns against 33.65/34.06 ns. Keep that secondary job behind default text.

The retained canonical guard no longer shows the earlier V8 library loss in the fresh corpus.
`primary-guard-rivals.jsonl` uses the same process and batch settings: package/`uuid.validate`
medians are 36.30/52.85 and 34.99/51.50 ns on Node Current, 37.81/54.53 and 36.28/55.42 ns
on Node LTS, 35.15/54.16 and 35.43/54.07 ns on Deno, and 34.61/51.71 and 35.35/54.50 ns
on Chromium. Bun reads 24.76/25.44 and 27.69/26.22 ns, so its direction remains mixed.
These comparisons cover the maintained canonical input corpus, not every accepted spelling.
Two process observations cannot establish small-effect equivalence, individual-call tails,
or allocation parity; the earlier cold-import heap increase remains unresolved.

Reject a reused native buffer copy as a replacement for ordinary Bun plain-slug encoding.
The exploratory candidate allocates `Buffer.alloc(16)` once, then calls `scratch.set(bytes)`
and `scratch.toString("base64url")` after the existing alphabet resolution and scratch draw.
On Bun 1.4.2, two reversed-order processes read 68.83/67.58 ns against the public call's
61.03/63.34 ns; a wrapper retaining the existing encoder reads 60.71/63.12 ns.
`native-buffer-slug-first.json` and `native-buffer-slug-repeat.json` retain all nine 20 ms
batches per process after 32 ms warm-up and 128 walking-bit round-trip witnesses.
This exploratory comparison lacks a mutation proof and packed failure/resource coverage;
it does not license adoption or attribute the loss to a specific native instruction.
It rejects the copy-based proposal, not direct encoding from native generation storage.

The maintained source screen compares `numeric-clock-first` and `timestamp-words` with its
unchanged baseline in both acquisition orders on Node 26.10.0 and Bun 1.4.2. Run
`bun bench/source-candidates.ts v7-draw numeric-clock-first timestamp-words` with the desired
`UUID_SLUG_COMPARE_NODE_EXECUTABLE`. Both owning runtime proofs pass before timing.
The raw screen is `bench/reports/primary-clock-screen.log` and its reported artifact directory.
Numeric-first clock recognition has inconsistent Node direction and loses Bun owned-byte calls;
fixed timestamp stores lose Bun owned-byte and slug calls. Neither earns a production change.
Three short batches per process cannot establish small-effect equivalence or a physical floor.

Removing the separate safe-integer check after truncation does not earn a shared production
change. Two 2026-10-03 source screens compare `v7-draw bounded-clock` on Node 26.10.0, Bun
1.4.2 and Deno 2.9.7, using two fresh processes per candidate/runtime in reversed order,
three 5 ms batches and 16 ms warm-up. Deno byte effects reverse within both screens; Bun
text reads 83.03 ns against 78.13 ns in the repeat's second order. The short samples cannot
establish small-effect equivalence, resource parity or a physical limit. Keep the existing
validation and owned-byte gaps open. Raw files are `primary-bounded-clock-screen.log` and
`primary-bounded-clock-repeat.log` in `bench/reports/`.

Clock overflow must reach both runtime proofs. The initial overflow mutation fails Node's
clock test while Bun's previous corpus accepts it. The shared numeric-clock case checks invalid
readings, valid endpoints, fractional truncation and unchanged caller storage. Unchanged source
passes 44 cases in each runner; the same overflow mutation fails that case in both runners
before timing (`bench/reports/primary-bounded-clock-shared-mutation.log`). This witness proves
the timestamp bound, not secure entropy or every generation contract.

The private scratch-draw method in `199a1b9` removes repeated selector and buffer work,
but adds a function to every constructed generator. `primary-scratch-screen.jsonl` and
`primary-scratch-all-replay.jsonl` leave most Bun effects unresolved; the broad Node replay
has large uncertainty intervals. `primary-scratch-all-repeat.jsonl` is excluded from retention
because a commit hook started before its process was observed complete. Prefer testing whether
the module's existing scratch can serve as the generator's text buffer: that avoids the extra
method and a duplicate retained array without changing caller-owned output validation.
The shared-buffer replay (`primary-shared-scratch-all-replay.jsonl`) leaves Bun text and
slug effects unresolved and reports slower Firefox default text. The direct module formatter
therefore has not earned replacing cached generator text delegation. Keep the buffer-sharing
candidate separate from that text change; its resource benefit is one fewer retained 16-byte
array, while complete-call speed still requires repeated evidence.
`primary-buffer-only-resource-check.log` measures one array and one view for lazy text-generator
initialization on Node and Bun. The maintained `duplicate-text-scratch` experiment restores the
original array allocation, passes behavioral tests, then fails the Bun resource witness at
two arrays against its limit of one. `primary-buffer-resource-mutation.log` identifies the
preserved source and proof directory. This isolates retained setup storage; it does not measure
total allocated bytes, startup latency or competitor resource parity.
Two six-process-pair buffer-only replays (`primary-buffer-only-all-replay.jsonl` and
`primary-buffer-only-all-repeat.jsonl`) reproduce default-slug gains on Node Current
at ratios 0.954–0.957 and WebKit at 0.933–0.950. Bun remains unresolved at
0.968–0.970. The focused Deno replay gives slug ratio 0.947 [0.94, 0.97],
with explicit-time slug 0.999 [1.00, 1.05]; the focused Node LTS replay gives
slug 0.940 [0.92, 0.99] and explicit-time slug 1.003 [0.96, 1.02]. Neither
control establishes equivalence. Native profiling completes on Node, Bun, Deno and Chromium
in `primary-buffer-native-complete.log`, with raw files preserved under `primary-buffer-native/`.
These profiles include instrumentation and do not substitute for comparative throughput.
Retain scratch sharing for the measured storage reduction and reproduced slug gains; the
Bun native-floor gap and competitor resource comparisons remain open.

Keep the module-default scratch draw uncached: its complete-call gains do not reproduce.
Two 2026-10-03 screens (`primary-slug-cache-screen.log` and `primary-slug-cache-repeat.log`)
compare `keyless cached-draw` on Node 26.10.0 and Bun 1.4.2 with two fresh processes per
candidate/runtime in reversed order, three 5 ms batches and 16 ms warm-up. Bun slug medians
first read 81.65/80.07 and 82.23/78.70 ns, baseline/candidate; the repeat reads 78.93/80.42
and 78.56/83.70 ns. Pair gains also reverse. This does not justify a retained function reference
or packed retention comparison; it does not establish equivalence or a physical limit.
Both intact screens pass behavior and counted resources, not total allocation parity.

Created-generator payload fixtures do not protect the module-default slug draw.
`primary-slug-cache-mutation.log` records a pinned final byte passing the earlier proof; its
timings cannot justify preservation. The shared real-entropy test now exercises both alphabets
and paired output. Unchanged production passes 134 Node and 43 Bun cases, and
`primary-slug-cache-mutation-secured.log` identifies both runners rejecting that same mutation
at `__test__/runtime-boundary-probe.ts:117` before timing. The test detects fixed tail bits;
it does not prove unbiased or independent entropy.

The `owned-range-zero` screen skips range validation only for fresh package-owned UUIDv7
bytes at offset zero. Its Node and Bun byte medians improve in both acquisition orders, but
Deno byte medians rise from 152–153 ns to 156 ns and Bun text medians also rise. The raw
observations are in `bench/reports/primary-owned-range-screen.log`; the reported artifact
directory preserves source substitutions and passing Node/Bun proofs. This screen does not
justify a shared production branch: it moves cost onto other primary calls.

Two six-process-pair packed replays compare `6700c49` with the primitive-preset pair path
in `f61ff8f`, using `primary-pair-all-replay.jsonl` and `primary-pair-all-repeat.jsonl`.
Both default-pair ratio intervals lie below one on Node Current, Bun, Chromium and Deno:
median ratios are respectively 0.858–0.866, 0.853–0.859, 0.795–0.814 and 0.815–0.873.
Uppercase and base32hex cases are measured separately; Firefox and WebKit default effects
remain unresolved. One replay also reports slower unchanged Node controls, so it cannot
establish absence of collateral loss. Native profiles in `primary-pair-native.log` cover
both returned strings, all four presets and composed/selected-generator controls on Node,
Bun, Deno and Chromium. Profile timings include instrumentation; retained heap does not
measure total allocation. A twelve-process-pair Node control replay (`primary-pair-node-control.jsonl`)
reproduces the default-pair gain at ratio 0.851 [0.84, 0.87]; default text, owned bytes and
composed-pair controls remain unresolved. Selected-generator text costs 1.018 [1.00, 1.05]
despite unchanged implementation; its small effect remains a retention uncertainty.

Conversion comparisons use slugid 5.0.1 and short-uuid 6.0.3, with reusable setup outside
each call. Their published interfaces are described at
[slugid](https://www.npmjs.com/package/slugid) and
[short-uuid](https://www.npmjs.com/package/short-uuid); installed code supplies the mechanism
evidence. slugid parses UUID text, encodes base64, replaces alphabet characters and removes
padding; decoding reverses those steps before UUID formatting. short-uuid uses `any-base`
numeric conversion, so the same alphabet gives different bit alignment from canonical base64url.
Its separate group uses independently computed integer witnesses. No representation change is
implied for issued package slugs.

`primary-slug-comparison.jsonl` and `primary-slug-repeat.jsonl` retain seven fresh-process
medians per row from five 10 ms batches after 32 ms warm-up. They measure two canonical v4
inputs on Node Current, Node LTS, Bun, Deno and Chromium. Package/slugid median ratios span
0.096–0.213 for encoding and 0.077–0.332 for decoding in the first run, and 0.097–0.213 and
0.078–0.327 respectively in the repeat. These are valid-input throughput observations, not
malformed-input equivalence, allocation comparisons or performance for every UUID version.
short-uuid's numeric conversion is timed separately; its output is not an interchangeable
canonical plain slug. Fixed-value witnesses run before timing.

Parsed UUID writers format their immutable private bytes directly instead of repeating public
byte validation. Two six-process-pair packed replays against `dad0cc6` cover lowercase,
uppercase, JSON, every inspection field, both slug alphabets and unchanged parsing controls:
`primary-value-complete-replay.jsonl` and `primary-value-complete-repeat.jsonl`.
Default text median ratios are 0.703–0.706 on Node Current, 0.785–0.808 on Bun,
0.941–0.943 on Chromium and 0.677–0.697 on Deno. Firefox, WebKit and JITless
also reproduce default-text gains. JSON, inspection and alternate spellings do not all show
statistical separation on every engine. Chromium's first parse control interval slightly
excludes one; the second includes one. A twelve-process-pair focused replay
(`primary-value-chromium-control.jsonl`) gives parsing ratio 0.999 [0.97, 1.03],
text 0.943 [0.91, 0.96] and slug 0.931 [0.90, 0.94]. Parsing remains unresolved,
not proven equivalent; the focused observations reproduce the writer gains.
Native profiles cover the changed methods on Node, Bun, Deno and Chromium.
`primary-value-resource-check.log` records passing Node and Bun resource and latency gates;
the changed methods create no counted arrays, views or errors. These counters do not measure
inspection objects or total allocated bytes. Selector validation and private ownership remain intact.

Default-pair comparisons retain seven fresh-process medians per row, each from five 10 ms
batches after 32 ms warm-up, in `primary-pair-baseline.jsonl` and `primary-pair-repeat.jsonl`.
The dedicated pair costs 137–137 ns on Node Current versus 151–151 ns for one owned-byte draw
and both public conversions; Node LTS costs 134–135 versus 147–147, Chromium 134–134 versus
139–139, and Deno 124–124 versus 216–216. Bun costs 120–126 versus 125–126 with inconsistent
separation. Both strings are consumed and an independent decoding witness requires equal UUID
payloads. Caller composition does not replace the dedicated pair; the Bun internal preset-path
cost remains a candidate, not an established defect. These are same-machine throughput results,
not packed-revision improvement or allocation measurements.

The current dedicated pair is faster than composing the same result in two refreshed matrices
on 2026-10-04 (`current-pair-job.jsonl` and `current-pair-job-repeat.jsonl`). Each row retains five
fresh-process medians from nine 20 ms batches after 32 ms warm-up; both returned strings are
consumed and the existing independent decoding witness checks their equal payloads. Node 26.10.0
measures 117/119 ns against 147/149 ns for composition, Node 24.21.0 120/118 against 148/147,
Bun 1.4.2 105/109 against 119/122, Deno 2.9.7 110/112 against 213/222, and Chromium
153.0.8010.12 113/109 against 138/135. Keep the dedicated call rather than replacing it with
public conversion composition. These observations do not establish total allocation, performance
against every external implementation, or an improvement attributable to one intervening change.
Five processes and fixed row order limit small-effect confidence; Bun's repeat includes one fast
composition process overlapping dedicated-call observations. Immutable-value comparisons remain
separate from this two-string job.

This measurement compares performance baseline `37f6258` with `2c5ba55` on an Apple M4 Max with 128 GiB RAM, Node 26.8.1 and Bun 1.4.2. It is a local experiment, not a cross-hardware speed guarantee. Runtime dependencies and public wire formats are unchanged.

## Identifier integrity boundaries

Two packed replays on 2026-10-02 compare `e6ab40d` with the production code in `85ff386` on an Apple M4 Max. Each replay alternates six fresh process pairs per runtime, with one 5 ms sample after 16 ms warm-up per process. Node 26.8.2, Bun 1.4.2, Chromium 153.0.8010.12, Deno 2.9.7 and Node 26.8.2 JITless use the same corpus; two additional Node 24.21.0 replays cover LTS. These are filtered, warm-throughput measurements on one machine, not native-floor or competitor comparisons.

Reproduce the comparable calls with `bun bench/compare.ts e6ab40d` and `UUID_SLUG_PROFILE_FILTER=plain.encode,base32.encode,slug.bytes,slug.base32,slug.into,uuid.toBytes,value.parse,value.toMaskedSlug,sentinel.decode,sentinel.base32,v7.string.selected,construct.codec,guard.slug`. Select the Node executable through `UUID_SLUG_COMPARE_NODE_EXECUTABLE`. The table gives candidate/baseline median ratios from both replays; a range alone does not establish statistical separation.

| Consumer call | Node 26.8.2 | Bun | Node LTS | Chromium | Deno | Node JITless |
| --- | --- | --- | --- | --- | --- | --- |
| UUID text to owned bytes | 0.80–0.84 | 0.77–0.81 | 0.79–0.80 | 0.74–0.78 | 0.63–0.67 | 0.94–0.98 |
| Base64url plain slug to owned bytes | 0.74–0.76 | 0.71–0.73 | 0.76–0.76 | 0.75–0.76 | 0.59–0.60 | 0.97–0.97 |
| Base32hex plain slug to owned bytes | 0.77–0.78 | 0.75–0.76 | 0.78–0.78 | 0.78–0.78 | 0.60–0.60 | 0.98–0.98 |
| Parse with a package codec | 0.94–0.94 | 0.94–0.95 | 0.98–0.99 | 0.95–0.96 | 0.81–0.82 | 1.00–1.00 |
| Parsed UUID masking with a package codec | 1.08–1.10 | 0.99–1.01 | 1.03–1.04 | 1.02–1.03 | 1.01–1.04 | 1.00–1.01 |
| Parsed UUID masking with an external codec | 1.27–1.29 | 1.29–1.30 | 1.41–1.41 | 1.30–1.35 | 1.78–1.81 | 1.07–1.10 |

Owned text and slug decoding removes one redundant array construction. Node and Bun constructor counters require one array, and deliberately restoring the copy fails that check. Both replays' 95% ratio intervals lie below 1 for owned text and plain-slug decoding on the JIT-enabled runtimes; JITless gains remain unresolved except where an individual replay separates them. Borrowed bytes still require isolation.

Package codecs use a private ownership stamp to borrow immutable UUID storage. WeakSet registration instead raised codec construction cost in the first replay; the private stamp leaves construction unresolved in the two final replays. Its recognition adds 14–17 ns to Node 26.8.2 parsed masking and 5–7 ns on LTS. External callbacks require a byte copy, original-version validation and returned-spelling validation: they could previously mutate private storage or return malformed branded results. Their slower calls are safety costs, not optimizations; removing those checks fails the ownership and malformed-result regressions. Revisit the stamp if engine private-field costs change.

Native CPU, allocation, retained-heap and process-resource profiles cover the same filtered calls on Node 26.8.2, Bun, Deno and Chromium. Separate profiles use precomputed uppercase base32hex inputs for caller-owned decoding and sentinel text/byte reads. Host counters show no filesystem reads, writes or major faults in those uppercase rows; their largest timed batch is below 0.3 ms. Profile timings include instrumentation and cannot substitute for packed replay ratios. Sampled allocation and retained heap do not prove total allocation volume or leak freedom; error rows and construction also affect sampled CPU shares.

Rust 1.98.1 sentinel measurements use `UUID_SLUG_PROFILE_FILTER=sentinel/base32 UUID_SLUG_RUST_BENCH_RAW=1 bun bench/rust.ts`. Inputs pass through `black_box` before decoding. Three fresh core processes provide fifteen samples per spelling: canonical reads span 2.0–3.9 ns and uppercase reads 11.3–20.3 ns. Core process peak RSS spans 1.78–1.81 MiB and CPU totals 8.3–13.5 ms. The same command measures every discovered Node-API and FFI host separately. These fixed-input observations establish costs under this workload, not improvement over a baseline that rejected uppercase sentinels, scalability across sentinel counts, or kernel syscall counts.

## Method

Follow the package-import commands in [the benchmark guide](README.md#profiling). For this replay set `UUID_SLUG_PROFILE_MS=5`; retain the default seven samples. Use three fresh process pairs per runtime, alternate before/after order, and run CPU measurements sequentially. Each process exercises the same 256 deterministic inputs and all cases. The table gives the median of the three per-process medians in nanoseconds per call, including driver consumption and error classification. Small differences can reflect JIT state, scheduler noise and clock overhead; these are not confidence intervals.

Build both revisions separately and point `UUID_SLUG_PROFILE_MODULE` at the absolute built file
selected on Node, or at `src/index.ts` on Bun. Keep the driver identical. A filter
changes warm-up history, so an isolated measurement does not explain a mixed-workload result by itself.

### Bun 1.4.2 retained-change replay

Exact commit-boundary comparisons use the earlier revision's driver, so every measured operation
exists on both sides. Two 24-round replays on 2026-09-12 supersede Bun 1.4.1 only where noted:

- Sentinel indexing retained its large hit-path gains. Owned UUIDv4 output improved by 5–8%.
- Fixed base32hex encoding improved its direct fallback by 4–5%; fixed base64url decoding improved
  its direct fallback by 18–24%. Native-shadowed base64url encoding and fixed base32hex decoding
  had no repeated Bun movement, so their cross-runtime evidence remains the retention basis.
- The portable UUIDv7 timestamp split had no repeated Bun movement. Of the entropy changes, only
  rollback caller-owned output repeated a Bun gain; Node and secondary-runtime evidence still owns
  the other retained branches.
- Borrowed masking scratch, codec-owned masking storage, and runtime-selected UTF-8 encoding had no
  repeated Bun movement. Their deterministic resource reduction or other-runtime gains remain intact.
- Moving previous-key scratch creation above the primary attempt regressed Bun's current-key string
  path by 31–35%. Creating scratch only after that attempt misses restored the primary path and kept
  an 8-key last-match gain of 3–9% over per-key allocation.
- The original in-place mask change regressed isolated historical byte and base32hex encode routes,
  but restoring a second output block in the current composed tree improved no encode route in two
  replays. Keep the current single block; the interaction, not the old boundary alone, decides.

Profiler warm-up and batch-size boundaries were measured directly on Bun 1.4.2. These replays do not
replace Node, Chromium, Deno, resource, or correctness evidence and do not transfer Bun's result to them.

### Remaining TypeScript costs

The complete 183-operation corpus ran on Node 24.20.0, Bun 1.4.2, Deno 2.9.6, and Chromium 151 on
2026-09-12. It covered generation, conversion, guards, masking, migration, construction, failures,
both alphabets, caller-owned output, explicit time, rotation positions, and optional native paths.
The same corpus then ran under each runtime's CPU, allocation, retained-heap, and responsiveness
instruments. The prepared-value control cost 6.5–11.9 ns per call, below the material operation rows.

Codec construction with 16 sentinels was the largest successful row at 7.1–21.7 microseconds per
call; sentinel work scales with configured values and is paid once per codec. The largest repeated
steady-state row was a last match among 16 previous keys at 2.5–3.0 microseconds. Caller order and
first-match semantics require each preceding key to run because the wire format carries no key
selector. Four scalar ciphertext words remove per-key outer allocation without charging codecs that
have no previous keys.
Bun's independent JSC samples attributed the mixed corpus chiefly to HalfSipHash, expected error
construction, alphabet encoding, sentinel construction, and Feistel traversal. Equal-duration
profiling overrepresents rare errors and setup; sample share is not consumer frequency.

The tested alternatives below showed no further repeatable benefit. Deleting mask attempts,
reordering keys, or adding a wire key selector changes accepted identifiers or first-match behavior.
Parallel attempts add coordination and cannot return before every earlier key has resolved. The
repository has no caller trace or telemetry that establishes repeated identical decodes; its
equal-duration synthetic profiles cannot supply consumer frequency. A synthetic cache-hit ratio
would therefore encode an assumption, not measure locality. A bounded cache adds mutable capacity
and invalidation policy without that workload evidence, while an unbounded cache violates the
resource contract. Construction-time uniform dispatch, direct
built-in dispatch, hash and Feistel specializations, alternate byte layouts, and platform delegates
were measured separately above and either lost a primary route or produced no repeated gain.
Sentinel construction already computes each required spelling once and builds the lookup structures
that make repeated string hits constant-time. Reopen optimization only when a new mechanism removes
complete-route work or a measured consumer trace supplies reuse distance and frequency sufficient
to choose capacity and invalidation, then shows total memory and latency benefit.

A wire key selector is not a decode optimization: it changes issued identifiers, exposes key
selection, and cannot identify existing values that carry no marker. Automatic key reordering and
parallel attempts likewise cannot preserve the caller-ordered first passing candidate. Ordinary
synchronous operations complete below worker startup, messaging, transfer, and coordination costs;
blocking for a worker would retain the synchronous call shape by adding latency, not by removing
work. Keep direct synchronous execution unless a new public async contract is explicitly approved
for a measured workload that exceeds those fixed costs.

## Native development boundaries

The development bridge matrix ran on the same Apple M4 Max through Node 22.23.2, Node 24.20.0,
Node 26.8.2, Bun 1.4.2 and Deno 2.9.6. Node 26 supplied the experimental FFI boundary; Bun and
Deno supplied both Node-API and FFI boundaries. Every lane passed the same 28,426 conformance
observations before measurement.

`bun bench/rust.ts` built the Rust benchmark and bridge once, then rotated five cold-start probes
and three workload processes per lane. The table reports medians. Fixed dispatch evaluates an empty
JSON request array; single and batch rows include JSON encoding, dispatch and decoding; direct plain
calls cross the typed string boundary without JSON. Workload process totals include all warm-up and
timed rounds. Peak RSS is a process high-water mark, not allocation volume.

| Host boundary | Startup ms | Fixed ns/call | Single ns/id | Batch 64 ns/id | Direct ns/call | Workload CPU ms | Peak RSS MiB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Node 22 Node-API | 28.54 | 148.66 | 618.53 | 351.78 | 138.78 | 156.98 | 51.25 |
| Node 24 Node-API | 28.05 | 125.95 | 591.15 | 335.43 | 123.76 | 156.56 | 56.27 |
| Node 26 Node-API | 30.42 | 133.67 | 602.77 | 339.88 | 125.69 | 162.02 | 64.88 |
| Node 26 FFI | 29.53 | 495.39 | 960.44 | 342.86 | 463.57 | 397.32 | 66.75 |
| Bun Node-API | 13.24 | 133.02 | 631.10 | 339.96 | 134.42 | 147.71 | 40.03 |
| Bun FFI | 12.33 | 117.79 | 592.62 | 341.78 | 119.64 | 143.26 | 44.50 |
| Deno Node-API | 23.43 | 131.95 | 604.49 | 342.86 | 134.55 | 156.81 | 54.88 |
| Deno FFI | 24.77 | 398.70 | 894.67 | 353.29 | 398.08 | 384.70 | 57.58 |

On this run, Node and Deno FFI added roughly 263–338 ns to the direct string call relative to their
Node-API lanes, while Bun FFI and Node-API were close. Batch-64 rows converged within about 18 ns per
identifier because shared Rust and JSON work dominated the per-call transport cost. These observations
do not rank the adapters across other hardware, operating systems, host revisions, permissions or
workloads, and they do not turn development bridges into npm distribution candidates.

## Measured calls

| Call | Node before | Node after | Bun before | Bun after |
|---|---:|---:|---:|---:|
| `control` | 3 | 3 | 2 | 2 |
| `v4.string` | 135 | 141 | 28 | 27 |
| `v7.string` | 164 | 164 | 62 | 63 |
| `v4.bytes` | 50 | 50 | 31 | 31 |
| `v4.into` | 31 | 31 | 27 | 29 |
| `v7.bytes` | 153 | 75 | 69 | 70 |
| `v7.into` | 78 | 55 | 78 | 77 |
| `v7.at` | 384 | 167 | 61 | 63 |
| `v7.at.into` | 76 | 54 | 65 | 64 |
| `portable.string` | 978 | 727 | 335 | 109 |
| `portable.into` | 595 | 568 | 58 | 36 |
| `v4.slug` | 296 | 153 | 256 | 69 |
| `v7.slug` | 345 | 170 | 70 | 58 |
| `v7.base32` | 365 | 258 | 311 | 228 |
| `parse` | 68 | 82 | 39 | 34 |
| `parse.into` | 49 | 62 | 31 | 31 |
| `format` | 204 | 99 | 211 | 69 |
| `plain.encode` | 317 | 181 | 245 | 71 |
| `plain.decode` | 296 | 166 | 246 | 106 |
| `base32.encode` | 338 | 268 | 259 | 188 |
| `base32.decode` | 297 | 190 | 240 | 110 |
| `slug.into` | 67 | 55 | 34 | 34 |
| `guard.invalid.uuid` | 3267 | 8 | 142 | 15 |
| `guard.invalid.slug` | 4044 | 16 | 187 | 21 |
| `guard.uuid` | 75 | 58 | 45 | 32 |
| `guard.slug` | 93 | 38 | 45 | 41 |
| `timestamp.uuid` | 111 | 125 | 54 | 53 |
| `timestamp.slug` | 409 | 95 | 288 | 49 |
| `timestamp.masked` | 624 | 227 | 443 | 173 |
| `masked.generate` | 635 | 444 | 402 | 281 |
| `masked.encode` | 452 | 381 | 363 | 245 |
| `masked.decode` | 497 | 307 | 376 | 231 |
| `rotation.current` | 497 | 334 | 375 | 246 |
| `rotation.previous` | 4423 | 485 | 666 | 373 |
| `sentinel.encode` | 164 | 80 | 121 | 43 |
| `sentinel.decode` | 76 | 11 | 40 | 8 |
| `invalid.uuid` | 3116 | 3429 | 137 | 135 |
| `invalid.slug` | 3862 | 3817 | 174 | 183 |
| `invalid.mask` | 4025 | 4027 | 308 | 320 |
| `construct.codec` | 1990 | 1510 | 1912 | 1028 |
| `construct.mask` | 523 | 463 | 402 | 297 |

## Costs removed and alternatives rejected

- Bun writes UUID text and slugs through reused Latin-1 scratch; other engines construct fixed UUID spellings with one character-code call. Generic payload lengths retain native or portable encoding. Caller-owned generation writes at the requested offset.
- Boolean validation no longer constructs decoded buffers or discarded errors. A scanner shared with parsing regressed Bun in the measured trial and was rejected; both paths retain the same character table and contract corpus.
- Rotation decodes text once and constructs a mismatch error only after all explicit keys fail. Custom callbacks still receive owned bytes. Removing those copies would alter ownership semantics.
- TimestampValidation consumes decoded bytes directly. Formatting remains at string-returning boundaries; it is not part of validation.
- Async and synchronous construction share hash arithmetic and final key expansion. The initial continuation rewrite regressed masking; a single state branch replaced repeated optional-state lookups.
- Portable v7 currently requests 16 bytes from its entropy callback for both initial and
  same-millisecond generation. Requesting only the four consumed continuation bytes reduced pool
  demand but measured about 2% slower on Bun's `v7.bytes` path, so it added a branch without a
  demonstrated consumer-path gain. Callbacks fill the supplied view and must not depend on its
  current length; revisit the internal draw size only with a measured end-to-end improvement.
- Object inputs reach the wrapper and buffer slot probes in `stringInput` and `uuidByteView`. Calling
  a probe on anything else throws a native `TypeError`, and building it dominated the call. Measured
  2026-09-16, nine rounds of 300,000 calls, medians, Node 24.21.0 and Bun 1.4.2: a plain object cost
  1,447 ns and 220 ns per `stringInput` call and 1,597 ns and 221 ns per `uuidByteView` call.
  Deciding by local identity and then the object tag, and looking for a caller's own
  `Symbol.toStringTag` only after the tag misses, left those at 10.3 ns and 7.9 ns, and 11.5 ns and
  6.1 ns. Valid buffers kept their cost: `ArrayBuffer` 22.60 to 22.64 ns and `DataView` 29.93 to
  30.83 ns on Node, both unchanged on Bun. A primitive string is unchanged. A genuine `String`
  wrapper pays the tag read it did not pay before, 4.82 to 7.54 ns on Node and 2.12 to 6.41 ns on
  Bun; that input already costs hundreds of nanoseconds through a public call, and no primitive
  reaches this branch. Keep the identity check first and the own-tag lookup last: reading the tag
  before local identity, and computing that lookup eagerly, costs valid `ArrayBuffer` input 65 ns and
  `DataView` input 76 ns on Node. The counters in `bench/resources.ts` cannot gate any of this: a native
  `TypeError` is built from the intrinsic, so it never passes the `globalThis.Error` construct trap.
  Acceptance is gated by the cross-realm and hidden-tag cases in the test lanes instead. Remeasure
  if a probe stops throwing.
- Node's earlier mixed-workload parser regression did not survive controlled order tests. Two
  fresh-process replays on 2026-09-12 used Node 26.8.2 to compare `37f6258` with `2c5ba55` after
  generation, formatting, decoding, valid and invalid guards, errors, construction, and reversed
  two-family orders. No predecessor reproduced a candidate slowdown: repeated single-family median
  ratios were 0.86–0.96. The empty
  prefix and parse-before-guard controls changed direction between replays. Restoring the baseline
  parser remained slower in the current package, while direct lookup inlining and a combined sign
  check did not improve the old mixed row. Treat that row as benchmark-history evidence, not a
  product mechanism. Reopen only when a public workload reproduces a slowdown twice and a code-shape
  candidate predicts it.

### Rejected TypeScript hot-path shapes

Use the general HalfSipHash path and the four-word check-tag loop. Retest only when a runtime or
compiler change moves either result outside the identical-code noise band.

On 2026-09-11, `bun run bench:compare HEAD` packed both revisions and ran six or eight alternating
fresh-process rounds on Node 24.20.0, Bun 1.4.1, Deno 2.9.6, and Chrome 152. An identical-code control
put all masked median ratios within 3.3% of 1.0 under the same warm-up policy.

- A separate fixed-eight-byte HalfSipHash function removed continuation, tail, length, and input-array
  handling from Feistel rounds. Bun improved by 2–4%; Node and Deno stayed near the control band;
  Chrome's built-in masked routes regressed by 8.7–19.9%. The function also duplicated the hash core.
- A fixed-eight-byte branch inside the shared hash skipped tail, continuation, and block-limit setup
  without changing its arguments or rounds. Two 24-round replays made major Node masking routes
  3–7% slower; Deno and Chromium also regressed, so one setup path remains.
- A union-discriminated hash input passed Feistel's two message words as scalars and removed eight
  typed-array stores per masked block. Two 24-round replays made Bun byte-decode routes 3–8% slower
  and Chromium routes 9–21% slower. Keep the monomorphic typed-array input; retest scalar input only
  through a distinct entry that does not make the general hash call polymorphic.
- Separate monomorphic array and scalar entries fed one shared union core. Two 24-round replays made
  Node masked routes 2.7–6.4% slower and Chromium routes 9–23% slower. Isolated Bun decode gains did
  not offset the primary Node loss, so direct typed-array calls remain. Retest only after an engine
  change to wrapper inlining or union-core specialization.
- Ordinary numeric arrays replaced Feistel's two typed-array scratch buffers while other hash callers
  retained typed arrays. Two 24-round replays made Node masked routes 2.1–6.2% slower and Chromium
  routes 22–50% slower; Deno also regressed. Keep fixed signed 32-bit storage despite its 30-byte
  packed cost. Retest only if every target engine changes numeric-array or polymorphic indexed access.
- Moving both typed scratch buffers into each Feistel call made scratch naturally reentrant but added
  two allocations. Two 24-round replays made Node masked routes 7.4–20.6% slower and Bun routes
  4.1–6.7% slower; Deno and Chromium also regressed. Keep allocation-free ownership. Retest only if
  target engines demonstrate escape analysis for these arrays on the packed public routes.
- Binding typed scratch once per codec added a factory and shared transform core. The first 24-round
  replay found no distinct route; the second found only two Bun regressions. Keep module scratch while
  the transform stays synchronous and callback-free. Reopen closure ownership if that assumption changes.
- Expanding the fixed four-round Feistel loop into four literal round bodies removed loop control and
  added 230 packed bytes. Two 24-round replays found no distinct Bun or Node route. A 2.2% Deno
  byte-encode gain repeated, while the second replay also regressed Chromium decode. Keep the compact
  loop; retest only if a primary engine stops optimizing this constant trip count.
- Separate ascending mask and descending unmask loops moved the direction branch outside traversal
  but duplicated the round body and added about 80 packed bytes. Two 24-round replays found no
  repeatable Bun or Node gain. Keep one reversible loop; retest only if a target engine makes its
  per-round direction selection measurably dominant.
- A mask-bound transform captured all eight keys as numbers and selected them through scalar
  branches, removing every hot key-array read. Two 24-round replays found no repeated Bun or Node
  route gain; the distinct improvements moved between routes. Keep indexed keys and avoid about
  170 packed bytes. Retest only if a primary engine changes typed-array indexing or scalar-call cost.
- Inlining all four big-endian reads and writes into Feistel exposed constant offsets but duplicated
  about 200 packed bytes. Two 24-round replays found no Bun or Node gain; Chromium routes regressed
  in both runs. Keep the byte-order helpers. Retest only if generated code shows a primary engine no
  longer inlines or specializes these fixed-offset calls.
- `DataView` replaced shift-based Feistel word I/O, creating one input view and reusing it for
  in-place output or creating one output view. Two 24-round replays made Node routes 18–46%, Bun
  29–69%, Deno 6–14%, and Chromium 47–110% slower. Keep shift-based helpers. Retest only if views can
  be reused safely across varying caller buffers or target engines eliminate their whole-route cost.
- Fixed-offset expansion of the four-word check-tag loop produced no consistent runtime win. Selected
  masked routes regressed by up to 4.9% on Node, 8.2% on Deno, and 13.9% on Chrome.
- Passing four pre-read tagged words through an optional built-in-mask protocol removed Feistel's
  second input read but added scalar dispatch and another transform shape. Two six-round packed
  replays found no encode route that improved significantly twice. Bun string encoding improved
  11-14% only in the second replay; Node byte encoding regressed 0.1-4.4% only in the first.
  Keep the two compact reads. Retest only if a primary engine can inline the scalar protocol without
  making the general transform polymorphic.
- A tuple or scratch array could carry the same four words, but would replace four byte reads with
  allocation or four stores. A callback would add per-word indirect calls. A mask-only Feistel copy
  would avoid dispatch by duplicating the wire-format round core. These variants add more hot work or
  a second cipher owner than the measured scalar protocol, so they do not warrant separate timing.
- Inlining both compression rounds removed the counted loop but duplicated its arithmetic. Two
  24-round packed replays found no statistically distinct Bun route and no repeatable Node route;
  Chromium was also unresolved. The loop remains the smaller implementation.
- Inlining all four finalization rounds enlarged the hash core without a repeatable primary-runtime
  gain. The first 24-round replay found no distinct route; the second isolated two Node byte-decode
  gains that did not reproduce, so the finalization loop remains.
- Preselecting Feistel key start and stride moved the direction choice outside the four-round loop.
  Two 24-round packed replays found no statistically distinct Bun or Node route. A Deno byte-decode
  improvement appeared only in the first replay, so the indexed direction expression remains.

These measurements isolate shipped public routes, not each generated-machine-code difference. The
fixed-length trial changed both message dispatch and argument shape, so it does not reject either
mechanism independently; the roadmap keeps those axes separate.

### Final KDF scratch reuse

Reusing scratch inside final round-key expansion was rejected. Reusing each hash output as its own
one-word input removed the index array but introduced aliasing. Reusing one output array with two
scalar chain-A words removed that aliasing and one two-word allocation. In two 24-round packed
replays, the non-aliasing variant improved Node construction by 1–4% and Deno by 5–9%; Bun stayed
within noise. Chromium byte-seed construction improved, but eight-iteration string construction was
about 45% slower in both replays. Keep separate input and output arrays until complete construction
improves across iteration boundaries; allocation count alone does not justify the browser loss.

### Cooperative UTF-8 packing

Direct `TextEncoder.encodeInto` packing was rejected. The candidate counted UTF-8 bytes in bounded
slices, allocated exact word storage, then encoded into its byte view on little-endian hosts; the
existing chunk encoder remained the fallback. Geometric probes covered ASCII strings from 16 bytes
through 1 MiB, a 64 KiB multibyte string, and a surrogate pair crossing the chunk boundary. The
candidate never improved elapsed work across Node 26.8.2, Bun 1.4.2, Deno 2.9.6, and Chromium 153.
At 1 MiB it was about 35% slower on Node and 12% slower on Bun. Keep the one-pass chunk encoder;
avoiding encoded chunk retention does not repay an extra Unicode scan.

Live checkpoint sampling on 2026-09-12 covered 1, 4, and 16 MiB ASCII seeds twice. Node 26.8.2
added 2.36, 9.38, and 37.44 MB of `ArrayBuffer` storage: encoded chunks and packed words remain two
seed-sized owners, so neither dominates. Bun 1.4.2's native allocator reproduced 9.3–9.45 MB at
4 MiB and 31.1–31.3 MB at 16 MiB; its 1 MiB result included a fixed allocator jump and was not
attributable. The probes sample live storage only at cooperative checkpoints; they do not measure
gross allocation, string storage, or browser and Deno heaps. The bounded candidate removes one
seed-sized owner but adds the slower second Unicode pass, and no consumer workload establishes such
large secret seeds. Reopen only with a real large-seed workload whose peak-memory budget outweighs
the measured elapsed loss.

### Cooperative KDF state

Keep the call-local generator and hash continuation. They already resume packing, absorption, and
iteration without shared mutable state; cancellation discards only that call, and concurrent calls
advance independently. A manual iterator would change bookkeeping, not the seed storage each chain
must replay for every iteration.

One fixed buffer cannot replace the packed seed without re-encoding or otherwise replaying its
source. The bounded `encodeInto` replay was slower in both geometric comparisons above. Live peak
sampling found chunks and packed words to be peer seed-sized owners, not chunk domination, while
the aligned byte view removes the second allocation for eligible byte seeds. Keep the string chunk
array unless a real large-seed workload values its peak-memory saving above the measured elapsed
loss. Changing the KDF to avoid replay would change all issued identifiers.

Byte-seed capture must finish before the async constructor returns its promise. The mutation
regression changes caller bytes and options immediately after the call and requires the original
label, work factor, and derived key. Deferring the copy therefore changes observable keys.
Transferring the caller buffer would detach caller-owned storage; copying before transfer preserves
ownership but removes no main-thread work. A worker has the same boundary: messaging can move the
snapshot only after the synchronous copy already required by the contract, then adds startup,
scheduling, cancellation, and fallback. Reconsider off-thread byte capture only if a new host
primitive can preserve caller storage and synchronously snapshot it without that copy.

### Owned masking blocks

Mask UUID bytes in place only when the codec owns the block. UUID strings parse into a private
16-byte block, and codec generation uses its package-owned byte source. Caller-supplied byte arrays
still take the copying path. This removes one buffer allocation without changing the public surface.

On 2026-09-11, two packed comparisons used 24 alternating rounds on Node 24.20.0, Bun 1.4.1,
Deno 2.9.6, and Chromium 151. Each summary uses
paired candidate/baseline ratios and an exact distribution-free 95% interval for their median.
String encoding improved by 4.7–5.8% on Node, 4.6–4.7% on Bun, 4.3–5.9% on Chromium, and
18.2–18.7% on Deno. Generation improved by 3.9–4.3%, 3.3%, 3.3–4.6%, and 10.3–12.0%,
respectively. Every interval for these improvements excluded 1.0.

Borrowed-byte encoding remained statistically unresolved on Node, Bun, and Chromium. Deno regressed
by 3.0–3.6% in the mixed workload; the retained runtime priority puts Bun and Node first, Chromium
second, and Deno third. A duplicated guard closure was rejected after it made Bun's borrowed route
slower in two mixed-workload runs. Indirect function dispatch and split guard helpers also slowed a
primary borrowed route in exploratory trials; one shared guard path with a final direct ownership
branch avoided that cost. Revisit the branch if a runtime changes either primary result.

### Borrowed masking scratch

Copy caller-owned UUID bytes into one codec-local block before masking instead of allocating a block
per call. Built-in transforms are synchronous and callback-free. Custom transforms receive their own
copy before user code runs, so a nested call cannot mutate the outer callback input. If either boundary
changes, the scratch must become call-local or use explicit reentrancy isolation.

The retained block ends as the masked payload returned by the call; it never holds a mask key or
pooled entropy. Decode callbacks and asynchronous derivation can overlap, so their mutable storage
remains call-local. Feistel's callback-free module scratch is measured separately above.

Two six-round packed replays on 2026-09-12 measured `masked.encode.bytes` on Node 24.20.0, Bun 1.4.1,
Deno 2.9.6, and Chromium 151. Node improved by 5.0–5.8% with both 95% median intervals below 1.0.
Deno improved by 25.4–25.5%. Bun and Chromium remained unresolved. The resource probe measured zero
per-call buffers instead of one; restoring the copying helper made that probe fail at the exact row.
The retained change therefore improves Node and Deno, leaves Bun and Chromium unresolved, and removes
proven work without changing caller ownership.

### Sentinel encode lookup

Index canonical sentinel UUID strings when constructing a codec. String encoding checks that map
once, then parses a miss without repeating the same lookup as a byte scan. Byte input retains the
linear scan because it has no canonical string key and sentinel lists are expected to stay small.

Two 24-round comparisons on 2026-09-12 covered 4, 8, and 16 sentinels on Node 24.20.0, Bun 1.4.1,
Deno 2.9.6, and Chromium 151. At 16 sentinels, first, middle, and last string hits improved by
86–97%, while misses improved by 8–28%; every 95% median interval excluded no change in both
replays. Byte controls were unresolved on the focused replay. Codec construction was unresolved at
1, 4, 8, and 16 sentinels on most runtime/cardinality pairs. A focused third Bun replay at 16
sentinels improved construction by 4.1%; its interval excluded no change, so the earlier isolated
4.5% regression did not reproduce.

A map lookup followed by the original string-to-byte scan was rejected. At eight sentinels, misses
regressed by 4.6% on Node, 5.7% on Bun, 1.8% on Deno, and 2.0% on Chromium, with every interval
above no change. Splitting string encoding from byte encoding removed an incidental Bun byte-path
movement but left that duplicate miss work. Restore a string scan only if sentinel strings cease to
be canonical keys or repeated complete-route measurements show the map losing at supported
cardinalities.

Index byte sentinels only at 16 or more entries. Compare the first entry directly, then use a
32-bit fingerprint in an open-addressed typed-array table to select remaining candidates; full
16-byte equality still decides identity. Smaller sets keep the original inline scan. This avoids
setup and helper dispatch where an index does not repay its cost, while deliberate hash collisions
cannot select the wrong sentinel.

Two six-round packed replays on 2026-09-12 used Node 26.8.2, Bun 1.4.2, Chromium 153, Deno 2.9.6,
and Node 26.8.2 JITless. For 16 sentinels, middle hits improved by 53–56% on Node, 22–37% on Bun,
61–63% on Chromium, 53–55% on Deno, and 58–59% under JITless; last hits improved by 59–77%.
At 64 sentinels, middle and last hits improved by 54–87% and 74–92%, while misses improved by
41–65%. Separate same-tail and full-fingerprint collision corpora retained middle, last, and miss
gains in both replays on every runtime. First hits were faster or unresolved. No unchanged small-set
or string row regressed in the same runtime and case in both complete replays.

The initial `Map` index increased median retained codec memory by about 0.8 KiB at 16 sentinels and
2.9 KiB at 64, roughly 8–9% or 49 bytes per indexed entry. Replacing that map with two half-full
typed arrays reduced retained codec memory by another 3% at 16 and 7% at 64. Construction stayed
unresolved except for a 4% Node 64-entry improvement. The steady route allocates no buffer or view,
so repeated middle or last hits amortize setup; codecs with fewer than 16 sentinels retain neither
cost.

A last-word map was rejected because same-tail inputs restored a linear collision chain and
repeatedly slowed Bun and JITless middle, last, or miss routes by 4–7%. A lazy second map removed
that failure but duplicated lookup state; one full fingerprint key produced the same bounded
candidate set with less state. Thresholds of four and eight were rejected because setup was not
repaid and Bun's eight-entry middle route regressed. A sorted fingerprint array reduced theoretical
entry overhead but added binary-search branches and screened 9–12% slower on Bun first hits, with
6–16% Node string or miss movements. Calling an indexed helper below the crossover also caused a
repeatable 12–14% first-hit loss despite doing no indexed work, so the linear path stays inline.
Reopen these shapes only when engine or workload evidence moves the crossover or retained memory
becomes more valuable than the measured lookup loss.

Two six-round packed replays compared the built-in fingerprint `Map` with open addressing on every
runtime above. At 16 and 64 sentinels, middle and last hits improved by 23–35% on Node, 6–14% on
Bun, 16–22% on Chromium, and 24–34% on Deno; JITless was unresolved. Misses improved or were
unresolved. Small-set, string, first-hit, and collision controls had no repeated regression. The
table uses power-of-two capacity at most half full; exact equality and continued probing preserve
full-fingerprint collisions. One Apple M4 Max and six paired rounds bound these results to the tested
engines and corpus. Reconsider `Map` if an engine reverses either primary-runtime result.

Packed scalar sentinel words were rejected. One six-round Node/Bun replay improved ordinary indexed
middle and last hits by 6–12% on Node and 6–8% on Bun; forced-collision hits improved by 11–18% and
26%. The flat four-word table could not replace canonical bytes because slug decoding returns those
bytes. It therefore doubled index ArrayBuffer storage from 256 to 512 bytes at 16 sentinels and from
1,024 to 2,048 bytes at 64, added about 0.24 KiB to the minified codec, slowed Node construction by
3–5%, and repeated a 3–6% Bun miss loss. Keep one canonical identity source; reconsider scalar
equality only if decode no longer requires retained bytes or an engine can compare them without a
second representation.

Packed 32-bit comparison without retained words was also rejected. Two isolated replays across
plain, aligned, unaligned, and shared buffers made exact matches 15% faster on Bun 1.4.2 and 25%
faster on Node 26.8.2 with a compact endian-neutral loop, but early mismatches lost 6–8%. Restricting
it to fingerprint matches preserved the byte loop for ordinary misses. Two packed public-route
replays then improved Bun indexed hits by 8–28%, while Node, Chromium 153, and Deno 2.9.6 were
smaller or unresolved; every Node JITless indexed middle and last hit regressed by 12–17% in both
replays. `DataView` comparison was 5–15 times slower because it created two views per call. Keep the
early-exit byte loop. Reopen packed equality only if an engine supplies allocation-free unaligned
loads or JITless no longer pays for the required word assembly.

### Masked sentinel collision check

Masked encoding looks up its canonical base64url slug among the codec's sentinel slugs only when the
outer check tail is zero. Sentinel slugs are plain encodings with zero trailing bits, so a slug
with any other tail cannot collide. Before this, every base64url write ran the lookup.

Two packed `17e2f97`-to-candidate replays on 2026-09-16 measured argument-free `masked.generate`
at 0.60 and 0.62 of baseline on Node 26.8.2, 0.64 and 0.74 on Chromium 153, 0.81 and 0.77 on Deno
2.9.6, and 0.88 and 0.87 on Node 24.21.0, every interval below 1. Bun 1.4.2 and Node 26.8.2
JITless were unresolved. `masked.encode.bytes` improved by 7–18% on Deno 2.9.6 and Node 24.21.0
and was unresolved on Node 26.8.2. Node CPU profiles put the encoding function's self time near
180 ns before and 20 ns after on generation, and 66 ns before and 12 ns after on byte encoding. On
byte encoding the row total did not move while the benchmark loop's own share rose from 1.3% to
8.7%. That is consistent with the lookup flattening the V8 base64url result, which is built by
string concatenation, so that without the lookup the caller's first read pays for flattening.

### Previous-key attempt storage

Preserve the decoded ciphertext as four scalar words, then restore the mutable block between failed
mask checks. Package-created built-in masks retain no input, and custom callbacks receive a
separate inner copy, so no outer attempt array is required.

Two 24-round comparisons on 2026-09-12 covered 4, 8, and 16 previous keys on Node 24.20.0 and Bun
1.4.1. At 8 keys, last-key hits improved by 10–11% on Node and 9–10% on Bun; total failures improved
by 4% and 7%, respectively. At 16 keys, last-key hits improved by 12–13% on Node and 11–13% on Bun;
total failures improved by 6–7% on both. Every cited 95% median interval excluded no change in both
replays. Current-key controls were unresolved. At 4 keys, Node last-key hits and Bun failures
improved, while Bun last-key hits were unresolved; one 8% Node failure regression did not repeat.

Two secondary-runtime replays at 16 keys improved Deno last-key hits by 42–43% and failures by
20–21%; Chromium improved by 15–18% and 9–10%. Current-key controls remained unresolved. Those
scratch results are historical evidence; the scalar result below supersedes their storage shape.

Bun 1.4.2 invalidated the original scratch placement: current-key string decoding regressed by
31–35% in both replays. A first repair restored that path but allocated a second block on fallback
and added iterator work; the complete matrix exposed 8–34% regressions on Node, Deno, and Chromium
rotation routes. Preserve the ciphertext as four scalar words instead. One fixed-block write restores
the mutable input before each previous-key attempt, so decoding allocates no outer scratch arrays.

Two 24-round replays on 2026-09-12 covered current, previous, 4/8/16-key last-hit, miss, and byte
routes on all four runtimes. No row regressed significantly. Previous-key byte decoding improved
13–16% on Node, 10–16% on Bun, 38–42% on Deno, and 17–21% on Chromium; every interval excluded no
change in both replays. Removing restoration made the owning tests reject two valid rotated slugs.
Keep the scalar snapshot while the ciphertext remains one fixed 16-byte block.

The final resource lane observed one buffer per previous-key decode: the returned decoded block,
with no outer scratch buffer, views, or discarded errors. A post-change native profile ran 14
rotation rows per runtime; its largest measured 64-call batch was 0.90 ms and its largest
uninterrupted sample was 2.44 ms. These local maxima show what the run reached, not a latency bound.

A construction-time `[current, ...previous]` array with one uniform decode loop was rejected. Two
eight-round packed screens covered current, previous, 4/8/16-key last-hit and miss routes plus codec
construction on Node 24.20.0 and Bun 1.4.1. No row improved significantly in both screens. The first
screen regressed Node's eight-key last hit by 1.8%; its 95% median interval excluded no change, but
the regression did not repeat. Keep the separate current-key fast path and previous-key loop until a
precompiled operation removes measured per-attempt work rather than only reshaping traversal.

### Discarded errors on successful reads

A successful read builds no error it will throw away: on V8 each one captures a stack that costs
more than the whole conversion. Two universal-reader paths did. Non-string input first asked the byte
reader, which built an `invalid_buffer` error before the parsed-UUID and `String` readers ran, so a
parsed `Uuid` passed back to a converter paid for one. A codec reading a plain 22-character slug
built the check-miss error before taking the plain reading. `readObjectUuidInput` now builds an error
only when no reader accepts the object, and `unmaskSlug` reports a check miss as `undefined`.

Two six-round packed replays on 2026-09-16 compared `1a5dd32` with the change. Median ns per call:

| Route | Node 26.8.2 | Bun 1.4.2 | Chromium | Deno 2.9.6 | Node JITless |
| --- | ---: | ---: | ---: | ---: | ---: |
| `codec.uuidToString(plain slug)` | 5,959–6,091 → 380–382 | 505–549 → 298–303 | 2,170–2,214 → 354–362 | 7,419–7,423 → 748–768 | 10,929–10,991 → 9,657–9,797 |
| `codec.uuidToBytes(plain slug)` | 5,884–6,067 → 271–277 | 360–365 → 205–209 | 2,097–2,111 → 264–266 | 6,033–6,136 → 515–526 | 10,618–11,036 → 9,281–9,640 |
| `uuidToString(parsed Uuid)` | 5,582–5,613 → 189–192 | 303–329 → 120–122 | 1,817–2,003 → 128–133 | 5,717–5,792 → 146–150 | 2,158–2,205 → 718–724 |
| `codec.uuidToMaskedSlug(parsed Uuid)` | 5,541–5,656 → 316–317 | 411–417 → 211–215 | 1,953–2,298 → 294–306 | 5,710–5,784 → 313–319 | 9,081–9,170 → 7,872–7,950 |

Every primary-runtime interval excluded no change in both replays. No masked-decode, rotation,
timestamp, or byte-input control was slower in both replays on any runtime. A load average near 14
from unrelated processes widened intervals, and one Node and Bun replay too noisy to read was
discarded.

A `decodeMaskedSlug` wrapper that built the miss error around `unmaskSlug` was rejected: the Node
`maskedSlugToUuidString` text route slowed 16–20% in both replays, with both intervals above no
change, while its byte routes were unchanged. Direct calls restored parity. `bench/resources.ts`
gates zero errors on the codec plain-slug read and on parsed-UUID text and masked conversion; the
pre-change source fails both rows. Remeasure if engine error construction stops capturing stacks.

### Generation option reading

Generation options are copied into one object by assigning each accepted own property. The
previous reader spread one conditional object literal per option, allocating a temporary object for
every key. Calls without an options object never reach the reader.

Two packed `2251e8f`-to-candidate replays on 2026-09-16 measured median ratios; every listed pair
had its 95% interval below 1 unless marked unresolved:

| Runtime | `v7.at` | `v7.slug.selected-generator` | `masked.generate.selected-generator` |
| --- | ---: | ---: | ---: |
| Node 26.8.2 | 0.78, 0.79 | 0.90, 0.90 | 0.91, 0.97 unresolved |
| Bun 1.4.2 | 0.31, 0.33 | 0.53, 0.52 | 0.68, 0.70 |
| Node 24.21.0 | 0.80, 0.77 | 0.93, 0.92 | 0.95, 0.92 |
| Chromium 153 | 0.82, 0.84 | 0.91 unresolved, 0.91 | unresolved, unresolved |
| Deno 2.9.6 | 0.77, 0.79 | unresolved, unresolved | 0.72, 0.94 |
| Node 26.8.2 JITless | 0.95, 0.93 | unresolved, unresolved | unresolved, unresolved |

One Node 26.8.2 replay was disturbed, with no interval resolved on any row, and was replaced by a
third. Argument-free `masked.generate` read 1.06 slower in two Node 26.8.2 runs, but seven
candidate runs had a median ratio of 0.99, and three HEAD-against-HEAD runs spread from 0.98 to
1.03, so it is unresolved. Bytes and caller-buffer variants of `v7.at` improved by similar ratios.

### Selected generator reads

A call that passes `generator` draws a package generator's bytes straight from its sequence. The
public generator carries its sequence in a private field added before the object is frozen, so the
brand check is one `#field in value` test, a lookalike or proxy cannot carry it, and the object keeps
its plain prototype and key list. The sequence then writes fresh or caller-owned bytes after the
call's usual `at` and range checks. Any other object still takes the structural read and the
untrusted-generator call: a validated object, a scratch buffer, byte validation, an `at` check, and
a copy. On that route, slug, text, and masked-slug writers skip the copy because they consume the
bytes and never return them; byte and UUID-value results still copy, because the generator may keep
a reference to its output buffer.

A first step recognized package generators through a module `WeakSet` and skipped only the
structural read and the copy. Two packed `487ac93`-to-`4380caa` replays on 2026-09-16 measured
median ratios; every listed pair had its 95% interval below 1 unless marked unresolved. The
structural row passes a spread copy of a package generator, so it gains only the skipped copy:

| Runtime | `v7.slug.selected-generator` | `v7.bytes.selected-generator` | `v7.slug.structural-generator` | `masked.generate.selected-generator` |
| --- | ---: | ---: | ---: | ---: |
| Node 26.8.2 | 0.87, 0.87 | 0.93, 0.89 | 0.96, 0.93 unresolved | 0.92, 0.91 |
| Bun 1.4.2 | 0.77, 0.81 | 0.88, 0.89 | unresolved, 0.90 | 0.91, 0.91 |
| Node 24.21.0 | 0.89 unresolved, 0.84 unresolved | 0.94, 0.91 | 0.94, 0.94 unresolved | 0.91, 0.93 |
| Chromium 153 | 0.86, 0.89 | 0.92, 0.94 | unresolved, unresolved | 0.91, 0.93 |
| Deno 2.9.6 | 0.72, 0.72 | 0.86, 1.02 unresolved | 0.76, 0.72 | 0.77, 0.80 |
| Node 26.8.2 JITless | 0.92, 0.91 | 0.91, 0.89 | unresolved, unresolved | unresolved, unresolved |

`v7.string.selected-generator` measured 0.86 on Node 26.8.2, 0.87 on Chromium, 0.74 on Deno, and
0.92 on Node 26.8.2 JITless in one replay; a second replay was disturbed, with HEAD baselines up to
1.9 times their first reading, and resolved only Node 26.8.2 at 0.67 and Deno at 0.57. Bun measured
0.77, 0.82, and 0.79 across three replays, and Node 24.21.0 resolved 0.67 in one of two.

That step made `construct.generator` and `construct.generator.default` 1.13–1.40 times slower in
every replay that resolved. Routing package generators to their sequence through a module `WeakMap`
was rejected: an isolated Node 26.8.2 probe put default creation at 610 ns against 380 ns with the
`WeakSet` and 277 ns with no registration. A module-private symbol property is also rejected:
`Object.getOwnPropertySymbols` exposes it, so a lookalike could claim to be package built.

Two packed `4380caa`-to-candidate replays on 2026-09-16, for the sequence draw and the private-field
brand together, measured median ratios; every listed pair had its 95% interval below 1 unless marked
unresolved or slower:

| Runtime | `v7.slug.selected-generator` | `v7.bytes.selected-generator` | `v7.slug.structural-generator` | `masked.generate.selected-generator` | `construct.generator.default` |
| --- | ---: | ---: | ---: | ---: | ---: |
| Node 26.8.2 | unresolved, 0.91 | 0.80, 0.81 | unresolved, unresolved | unresolved, 0.92 | 0.76, 0.79 |
| Bun 1.4.2 | 0.92, unresolved | 0.78, 0.75 | unresolved, unresolved | unresolved, unresolved | 0.85, 0.88 |
| Node 24.21.0 | 0.93, 0.93 | 0.81, 0.79 | 1.08 slower, unresolved | 0.96, 0.95 | unresolved, unresolved |
| Chromium 153 | 0.91, 0.90 | 0.77, 0.76 | 1.05, 1.05 slower | 0.93, 0.94 | unresolved, unresolved |
| Deno 2.9.6 | unresolved, unresolved | 0.70, 0.70 | unresolved, unresolved | unresolved, unresolved | 0.87, unresolved |
| Node 26.8.2 JITless | 0.84, 0.86 | 0.76, 0.78 | unresolved, unresolved | unresolved, unresolved | unresolved, unresolved |

`v7.pair.selected-generator` and `v7.string.selected-generator` measured 0.86–0.96 wherever they
resolved, and `construct.generator` 0.70–0.81. The slower cells are caller-built generators,
whose structural route now also runs the brand test and reads the absent sequence draw. Before the
brand replaced the `WeakMap`, Node 26.8.2 `v7.at.bytes` read 1.33–1.40 slower in the packed corpus
but not in an isolated probe or a process mixing generator draws with keyless `{ at }` bytes; with
the brand it is unresolved on every runtime. Keyless `v7.at`, `v7.slug`, and `masked.generate` never
reach either change.

### Keyless option draws

Module-level `generateUuidV7`, `generateUuidV7Bytes`, `generatePlainUuidV7Slug`, and
`generateUuidV7Value` read an options object once and pass the normalized instant, output, and
offset to the module generator's internal draw. They previously built a new options object for that
generator's public method, which scanned and read every option again. Text formatting draws into a
module scratch buffer because it reads the bytes before returning and the module generators run no
caller code. Argument-free calls never read options and keep their direct paths.

Two packed `a89d5e7`-to-candidate replays on 2026-09-16 measured median ratios; every listed pair had
its 95% interval below 1 unless marked unresolved:

| Runtime | `v7.at` | `v7.at.bytes` | `v7.at.into` | `v7.at.slug` | `value.generate.at` |
| --- | ---: | ---: | ---: | ---: | ---: |
| Node 26.8.2 | 0.67, 0.65 | 0.68, 0.65 | 0.58, 0.58 | 0.56, 0.58 | 0.54, 0.53 |
| Bun 1.4.2 | 0.83, 0.80 unresolved | 0.58, 0.56 | 0.54, 0.62 | 0.58, 0.53 | 0.43, 0.40 |
| Node 24.21.0 | 0.63, 0.67 | 0.68, 0.70 | 0.58, 0.62 | 0.54, 0.55 | 0.50, 0.50 |
| Chromium 153 | 0.80, 0.79 | 0.69, 0.70 | 0.59, 0.58 | 0.64, 0.64 | 0.55, 0.54 |
| Deno 2.9.6 | 0.66, 0.67 | 0.77, 0.75 | 0.61, 0.59 | 0.66, 0.67 | 0.65, 0.63 |
| Node 26.8.2 JITless | 0.86, 0.88 | 0.79, 0.78 | 0.77, 0.74 | 0.73, 0.74 | 0.68, 0.66 |

No argument-free text, bytes, caller-buffer, slug, or value row read slower in both replays; single
slower readings were 1.03 for Chromium `v7.string` and 1.01 for JITless `value.generate`. Node 24.21.0
`v7.slug.selected-generator`, a route this change does not reach, read 1.05 and 1.03 slower in the
packed corpus; three isolated probes of the same call measured 228–230 ns against 233–240 ns before.

### UUID text formatting

Bun formats UUID bytes through reused ASCII scratch and one `toString("latin1")` call.
WebKit uses native hex plus hyphen insertion when native hex is available. Other engines use
one fixed-argument `String.fromCharCode` call, with lowercase or uppercase
character codes selected before writing. The fixed writer stays in the formatter: a separate
helper slowed Chromium sentinel decoding in two mixed-workload comparisons, while slug-only
comparisons did not reproduce that loss. This finding identifies the changed formatter, not an
engine mechanism; sampled profiles are needed before attributing it to inlining or optimization.

Two earlier six-round packed comparisons of the all-fixed candidate against `44679d0`, read 2026-10-02, measured the following
candidate/baseline median ratios. Each pair has both 95% intervals below 1 unless marked.
The corpus varied bytes, case, offset, alphabet and check tail, consumed each result, and
alternated revision order in fresh processes. It does not prove results on other hardware or
runtime releases. The installed Node release below is not latest Current.

| Runtime | UUID text | Uppercase text | Base64url bytes | Base32hex bytes |
| --- | ---: | ---: | ---: | ---: |
| Node 26.8.2 | 0.63, 0.62 | 0.71, 0.69 | 0.57, 0.57 | 0.63, 0.63 |
| Bun 1.4.2 | 1.08 unresolved, 1.04 slower | unresolved | unresolved | unresolved |
| Chromium 153.0.8010.12 | 0.48, 0.48 | 0.25, 0.25 | 0.39, 0.40 | 0.28, 0.28 |
| Firefox 155.0 | 0.89, 0.89 | 0.53, 0.51 | 0.92, 1.03 unresolved | 0.43, 0.48 |
| WebKit 26.6 | 0.64, 0.62 | 0.47, 0.46 | unresolved | 0.32, 0.32 |
| Deno 2.9.7 | 0.69, 0.71 | 0.76, 0.76 | 0.63, 0.63 | 0.69, 0.69 |
| Node 26.8.2 JITless | 0.57, 0.56 | 0.59, 0.58 | 0.66, 0.66 | 0.69, 0.68 |
| Node 26.10.0 | 0.63, 0.64 | 0.70, 0.71 | 0.60, 0.59 | 0.64, 0.64 |
| Node 26.10.0 JITless | 0.56, 0.58 | 0.58, 0.58 | 0.67, 0.68 | 0.69, 0.69 |

The all-fixed candidate is rejected: WebKit `v4.bytes` measured 1.08 and 1.07,
with both intervals above 1. Chromium sentinel base32hex decoding was unresolved in both
comparisons (0.99 and 1.00), after the direct formatter replaced the separate helper.
The byte-position, case and tail oracle rejected three targeted writer mutations; the resource
counter rejected a valid masked slug constructed through two string calls.

The official Node release index lists 26.10.0 as Current, read 2026-10-02. Its macOS Arm64
archive matched the SHA-256 in the release's `SHASUMS256.txt` before execution. Two additional
packed replays per installed release covered Node 22.23.2, 24.20.0, 24.21.0, 26.8.1 and 26.8.2,
and Bun 1.3.14, 1.4.0, 1.4.1 and 1.4.2. Each emitted 30 selected operation summaries; no successful
operation was slower with both intervals above 1. This installed-release corpus is narrower than
the mixed seven-runtime corpus and does not cover every supported Node major.

Two isolated WebKit comparisons did not reproduce the byte-generation loss: 0.95 and 1.10,
with both intervals spanning 1. The mixed-corpus loss remains unresolved; isolation alone does
not establish that it was noise.

Two further mixed WebKit comparisons measured `guard.bytes.any` at 1.28 and 1.43,
with both intervals above 1. Two identical-baseline controls left that guard unresolved.
Splitting the changes located the loss in the formatter: formatter-only comparisons measured
1.23 and 1.31, both separated from parity; slug-only comparisons measured 1.02 and 1.00,
both unresolved. These results identify the changed function, not the engine mechanism.

A same-file formatter helper did not resolve the trade-off: two Chromium comparisons made
sentinel base32hex decoding 1.33 and 1.31 times baseline. Packing each hex pair into one
16-bit table entry reduced table reads but made WebKit `v4.bytes` 1.13 and 1.17 times
baseline, with both intervals above 1. Neither candidate is retained.

Selecting native hex only for WebKit avoids those repeated losses in two further six-round packed
comparisons against `44679d0`. Each comparison emitted 973 summaries across seven runtimes.
No successful production call had both 95% intervals above 1; individual slower rows remain
unresolved rather than evidence of no regression. The only repeated slower row was invalid-slug
rejection on Node, which is not a performance target. Default generation, byte guards, sentinel
decoding, conversions and portable encoders were measured together, not inferred from formatter cost.

| Runtime | UUID text | Uppercase text | Base64url bytes | Base32hex bytes |
| --- | ---: | ---: | ---: | ---: |
| Node 26.10.0 | 0.68, 0.63 | 0.74, 0.72 | 0.61, 0.58 | 0.65, 0.65 |
| Bun 1.4.2 | unresolved | unresolved | unresolved | 1.06 slower, 1.01 unresolved |
| Chromium 153.0.8010.12 | 0.48, 0.48 | 0.25, 0.27 | 0.37, 0.41 | 0.28, 0.29 |
| Firefox 155.0 | unresolved | 0.44, 0.46 | 0.91 faster, 0.87 unresolved | 0.50, 0.50 |
| WebKit 26.6 | unresolved | unresolved | unresolved | 0.28, 0.30 |
| Deno 2.9.7 | 0.71, 0.73 | 0.76, 0.81 | 0.63, 0.62 | 0.67, 0.70 |
| Node 26.10.0 JITless | 0.58, 0.58 | 0.59, 0.59 | 0.67, 0.66 | 0.67, 0.69 |

Unmarked numeric pairs have both intervals below 1. WebKit byte generation measured 0.98 and
0.98; its byte guard measured 0.89 and 1.11, all unresolved. Native hex gives up the isolated fixed
formatter gain to avoid its repeated mixed-workload losses. A native ASCII decoder through shared
scratch is rejected: its first mixed comparison made WebKit base64url byte conversion 2.04 times
baseline and UUIDv4 slug generation 2.13 times baseline, despite faster base32hex output.
Two fresh replays of the selected native-hex candidate on each installed Node and Bun release
listed above emitted 30 summaries each; none had a repeated slower interval. These checks do
not cover every release. Fresh native CPU and memory profiles cover selected and portable writers
on Node 26.10.0, Bun, Deno and Chromium; WebKit has packed-call evidence, not a native profile.
The instrumented UUID-format batches stayed below 0.3 ms with no filesystem reads, writes or
major faults. Heap samples do not establish total allocation volume or leak freedom.
The native-selection regression fails when selection is removed on Node 26.10.0, where hex
exists, and passes after byte-identical restoration. An older worker lacking hex cannot prove it.
The two seven-runtime replays took 261 and 258 seconds, below the five-minute ceiling but above
the four-minute warning. These measurements cover one macOS Arm64 host, the named releases and
the tested corpus; they neither establish performance on every release nor prove a native floor.

Two fresh nine-sample competitor runs with `UUID_SLUG_GENERATION_FILTER=v4.text`, read
2026-10-02, measured Chromium's default UUIDv4 text call at 58.43 and 58.58 ns against
116.39 and 116.47 ns for `@lukeed/uuid/secure`; their median intervals do not overlap in
either run. These are runtime-conditioned source bundles, not packed import or allocation
measurements. Bun's fastest package call still trails its fastest reference by median ratios
1.17 and 1.19; Deno's 1.00 ratios do not establish superiority. These remaining default-call
gaps stay open rather than inheriting the Chromium result.

Two fixed-write source screens on 2026-10-03 compare Bun's UUID-text indexing loop with direct
writes while preserving its case tables, scratch storage and native string conversion.
Each screen uses two fresh processes per candidate/runtime in reversed acquisition order,
three 5 ms batches and 16 ms warmup on Node 26.10.0, Bun 1.4.2 and Deno 2.9.7.
Bun default UUIDv7 text falls from 96–101 ns to 90–92 ns in all four comparisons;
byte-to-text conversion falls from 47–51 ns to 41–42 ns. Node/Deno controls vary and do not
establish equivalence. Node and Bun behavior tests and resource counters pass the valid candidate;
the corrupted last digit fails Bun's independently constructed offset-output assertion before timing.
Retain fixed writes after two six-pair packed replays on the seven engines listed in the wrapper
comparison below. Each pair uses one 5 ms batch after 16 ms warmup. Bun candidate/baseline
median ratios are 0.90 and 0.92 for default UUIDv7 text, 0.91 and 0.89 for uppercase text,
0.89 and 0.88 for byte-to-text conversion, and 0.85 and 0.86 for parsed lowercase text;
every corresponding reported 95% interval excludes 1. Other Bun results remain unresolved
unless their intervals exclude 1; the second uppercase parsed result remains unresolved.
The first Firefox byte-to-text loss and second WebKit uppercase parsed loss do not reproduce
in the other full replay or focused browser comparison. The focused intervals still allow
losses up to 20% for Firefox byte-to-text and 6% for WebKit uppercase parsed text; absence of
a repeated loss does not prove equivalence. No other full-replay row reports a distinct loss.
Fresh retained-source checks pass 133 Node cases and 42 Bun cases. The native profile driver
completes its Node, Bun, Deno and Chromium CPU, heap and resource captures in
`bench/reports/primary-format-native/`; instrumented costs do not replace packed timings.
Neither sampled heaps nor the source counters establish total allocation parity or individual-call
latency. The retained change adds fixed writes, not arrays, views, imports or another dispatch.
Raw evidence is in `bench/reports/primary-format-screen.log`, `primary-format-repeat.log` and
`primary-format-mutation.log`; packed output is in `primary-format-packed.jsonl`,
`primary-format-packed-repeat.jsonl` and `primary-format-browser-controls.jsonl`.

Allocated-generation witnesses require a plain Uint8Array and different backing storage on
successive calls for every qualified allocated-byte row. The earlier witness enforced this only
for fixed-input decoding: the Bun native Buffer row remained qualified despite its floor-only
comment. The stronger witness rejects that row before timing
(`bench/reports/primary-owned-v7-bytes-checked.log`). Buffer-only generation stays timed and
rejected; native copies provide the owned-output floors. Fresh-array fixtures pass while Buffer,
reused-array and reused-backing fixtures fail in `__test__/benchmark.bun.test.ts`.

Two ownership-checked matrices on 2026-10-03 use five fresh processes per runtime, seven 5 ms
batches and 16 ms warm-up on Node 24.21.0, Node 26.10.0, Bun 1.4.2, Deno 2.9.7 and Chromium
153.0.8010.12. Raw files are `bench/reports/primary-owned-v7-bytes-copies.jsonl` and
`primary-owned-v7-bytes-copies-repeat.jsonl`. Bun package bytes read 48.05/45.36 ns, against
`uuid` at 41.39/40.34 ns. Deno package bytes read 161.11/148.50 ns, against `uuidv7` at
150.27/135.36 ns. Those library gaps remain open. Bun native Buffer reads 55.08/53.22 ns;
copying it through `Uint8Array.from` reads 223.26/213.14 ns, the copying constructor reads
68.97/65.14 ns, and a fresh array plus `set` reads 65.73/63.68 ns. Compare the fastest complete
copy rather than imposing generic iteration on a native floor. These samples preserve ownership
and ordinary UUID structure; they do not establish total allocation parity, small-effect
equivalence, individual-call latency or native timestamp compatibility with package generation.
Each statistical observation is a process median; the processes still share machine conditions.

Two wider-write source screens on 2026-10-03 retain the existing tables and native Latin-1
conversion, replacing fixed byte stores with 16-bit or 32-bit DataView stores. Explicit
little-endian stores preserve all characters and hyphens. One DataView remains over the existing
scratch; no backing buffer is added, but the resource counters do not establish total view cost.
Each screen runs two fresh processes per candidate on Node 26.10.0 and Bun 1.4.2, reversing the
second acquisition order, with three 5 ms batches and 16 ms warm-up. The owning runtime tests and
counted resources pass both intact candidates. Zeroing the final character fails Bun's independent
offset-output assertion at `__test__/runtime-boundary-probe.ts:212` before timing.

Bun default text reads 92.21/89.10 ns for the baseline, 91.61/94.08 ns for 16-bit writes and
100.90/102.23 ns for 32-bit writes in the first screen. The repeat reads 91.34/87.08 ns,
89.41/90.63 ns and 88.05/88.59 ns respectively. Byte-to-text conversion reads 41.86/41.88 ns,
43.67/42.63 ns and 73.72/79.58 ns initially; the repeat reads 41.52/41.53 ns,
42.91/41.24 ns and 40.84/41.67 ns. Neither candidate yields a consistent default-text and
conversion gain, so neither earns a production change or packed replay. The first 32-bit losses
do not reproduce; these short samples do not identify their cause or prove equivalence. Node
controls also vary, including a large first-screen outlier on an unchanged selected formatter.
Raw evidence is `bench/reports/primary-format-word-screen.log`, `primary-format-word-repeat.log`
and `primary-format-word-mutation.log`; each names its isolated source and proof directory.

The following Latin-1 comparison describes the earlier implementation, not the selected writers.

Two packed `35ad052`-to-candidate replays on 2026-09-16 measured median ratios; every listed pair
had its 95% interval below 1 unless marked unresolved:

| Runtime | `uuid.toString.bytes` | `v7.string` | `plain.toString` | `value.toString` | `codec.toString.plain` |
| --- | ---: | ---: | ---: | ---: | ---: |
| Node 26.8.2 | 0.70, 0.72 | 0.77, 0.79 | 0.80, 0.82 | 0.76, 0.78 | 0.89, 0.91 |
| Bun 1.4.2 | 0.54, 0.55 | 0.62, 0.65 | 0.60, 0.66 | 0.60, 0.62 | 0.75, 0.79 |
| Node 24.21.0 | 0.47, 0.47 | 0.59, 0.59 | 0.67, 0.69 | 0.46, 0.47 | 0.81, 0.83 |
| Deno 2.9.6 | 0.70, 0.70 | 0.82, 0.83 | 0.89, unresolved | 0.76, 0.78 | 0.95, unresolved |
| Node 26.8.2 JITless | 2.40, 2.40 slower | 1.52, 1.54 slower | 1.42, 1.43 slower | 2.08, 2.09 slower | 1.06, 1.06 slower |

Chromium 153 stayed unresolved on every row; one `v4.string` replay read 1.04 and did not reproduce.
Native `randomUUID` text, canonical text passthrough, and sentinel timestamps stayed unresolved
everywhere. Node JITless loses because it interprets the 32 typed-array writes one by one; the gains
on every higher-priority runtime outweigh that final rung. An isolated probe with consumed results
measured a fresh `Buffer.allocUnsafe(36)` per call 35–42% slower than the reused buffer, and
`TextDecoder("latin1")` slower than `toHex` on Node and Deno. Calling the undocumented
`Buffer#latin1Slice` instead of `toString("latin1")` saved only 2–7 ns on Node 26.8.2, Bun, and
Deno, so it was rejected. Recheck if `toHex` or a native
formatter stops trailing `Buffer#toString("latin1")` on Node, Bun, or Deno.

### UUID text parsing

UUID text decodes in one pass: a 128-entry nibble table marks non-hex characters with bit 8, and the
loop ORs every character code and decoded pair so one check after the loop rejects bad text. Caller
output receives the bytes only after that check, from a module scratch array. Two packed
`1c6ea69`-to-candidate replays on 2026-09-16 measured these median ratios, with every cited 95%
interval below 1:

| Runtime | `parse` | `parse.into` | `value.parse.uuid` | `timestamp.uuid` | `masked.encode` |
| --- | ---: | ---: | ---: | ---: | ---: |
| Node 26.8.2 | 0.49, 0.50 | 0.48, 0.51 | 0.58, 0.60 | 0.61, 0.61 | 0.79, 0.81 |
| Bun 1.4.2 | 0.29, 0.30 | 0.36, 0.37 | 0.38, 0.42 | 0.43, 0.44 | 0.70, 0.73 |
| Node 24.21.0 | 0.52, 0.53 | 0.51, 0.54 | 0.56, 0.60 | 0.58, 0.58 | 0.83, 0.86 |
| Chromium 153 | 0.59, 0.62 | 0.58, 0.59 | 0.62, 0.64 | 0.58, 0.60 | 0.84, unresolved |
| Deno 2.9.6 | 0.67, 0.68 | 0.49, 0.53 | 0.70, 0.71 | 0.70, 0.72 | 0.83, 0.84 |
| Node 26.8.2 JITless | 0.34, 0.35 | 0.34, 0.34 | 0.38, 0.39 | 0.42, 0.43 | 0.74, 0.78 |

`plain.encode` was 0.67 on Node 26.8.2, 0.47–0.48 on Bun, and 0.70–0.71 on Chromium; it stayed
unresolved on Deno and Node 24.21.0, where text-to-base64url conversion skips the byte parser.
Byte, slug, and masked-slug inputs stayed unresolved everywhere. Recheck if a native hex decoder
accepts hyphenated text or the accepted UUID spellings change.

### Canonical UUID text

`uuidToString` and a codec's `uuidToString` return canonical lowercase text unchanged when lowercase
output is selected, instead of parsing it and formatting the same text again. Decoded bytes, and
`plainSlugToUuidString` results, go straight to the unchecked formatter because a successful decode
always yields exactly 16 bytes.

Two six-round packed replays per runtime on 2026-09-16 compared `d8306ba` with the change. Median ns
per call:

| Route | Node 26.8.2 | Bun 1.4.2 | Node 24.21.0 | Chromium | Deno 2.9.6 | Node 26.8.2 JITless |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `uuidToString(canonical text)` | 299–308 → 77–78 | 236–243 → 35 | 320–323 → 77–80 | 229–238 → 84 | 396–399 → 81–83 | 4,338–4,342 → 747–748 |
| `codec.uuidToString(canonical text)` | 313–315 → 81–83 | 237–238 → 36 | 331–337 → 82–83 | 236–242 → 83–85 | 401–410 → 84 | 4,353–4,429 → 805–809 |
| `plainSlugToUuidString` | 182–183 → 165–167 | 128–131 → 115–121 | 249–258 → 211–213 | 172–174 → 155–165 | 275–296 → 257–267 | 1,590–1,613 → 1,402–1,430 |
| `uuidToString(plain slug)` | 192–195 → 182–188 | 136–147 → 119 | 258–268 → 227–228 | 175–176 → 165–168 | 286–288 → 272–282 | 1,629–1,724 → 1,550–1,583 |
| `codec.uuidToString(sentinel slug)` | 10–11 → 10–11 | 12 → 16 | 12 → 12 | 14 → 11 | 12 → 12 | 153 → 158–159 |

Canonical text is faster on every runtime in both replays. `plainSlugToUuidString` is faster in
both replays on Node 26.8.2, Bun, Node 24.21.0, and JITless, and in one replay on Chromium and Deno.
`uuidToString(plain slug)` is faster in both replays on Bun and Node 24.21.0, in one on Node 26.8.2
and JITless, and unresolved on Chromium and Deno. Mixed-case text, byte input, and masked decoding
were no slower in either replay on Node 26.8.2, Bun, Node 24.21.0, Chromium, or Deno.

A Bun sentinel read through the codec costs about 4 ns more in both replays. With
`BUN_JSC_maximumFunctionForCallInlineCandidateBytecodeCostForDFG` and
`BUN_JSC_maximumFunctionForCallInlineCandidateBytecodeCostForFTL` raised to 1000 for both sides,
the difference disappeared, so the larger function is no longer inlined into the benchmark's
one-line caller. A HEAD-against-HEAD replay of the same rows showed no difference. Checking for a
sentinel before canonical text lost the same amount, and moving both checks into a helper lost
about 5 ns. On JITless, byte input to `uuidToString` and the sentinel read were each 3–4% slower in
one of the two replays.

Two further shapes were rejected. Keeping `bytesToUuidString` at the end of the codec method did not
recover the Bun sentinel read. A `typeof uuid === "string"` guard ahead of the keyless check made
Node 24.21.0 mixed-case text 7–9% slower in both replays. `bench/resources.ts` gates zero buffers,
errors, hex calls, and character reads on canonical text for both methods; the pre-change source
fails both rows. Remeasure when either method changes shape or the engines change their inlining
limits.

The canonical text guards keep regular expressions: a character loop took 135 ns on Node 26.8.2 and
64 ns on Bun against 72 and 24 ns for `UUID_RE`, results consumed.

Pairing hexadecimal digits in the expression reduces canonical guard work on the measured V8
engines and Firefox; Bun keeps the original expression because pairing slowed successful base32hex
normalization in repeated packed comparisons. Fully expanding every digit also lost on mixed-case
normalization in Chromium and Deno, despite faster canonical calls.

Two packed comparisons on 2026-10-02 used six fresh process pairs per engine, alternating revision
order, against `08790fb`. Each process had one 5 ms throughput batch after 16 ms warmup. The retained
`0dd6cfe` expression changed `isUuidString` from about 75–78 to 38–42 ns on Node 26.10.0 and Deno
2.9.7, 81–82 to 44 ns on Chromium 153.0.8010.12, and 78–83 to 46–47 ns on Firefox 155.
Node 24.21.0's paired median ratios were 0.507 in both further comparisons; both 95% intervals
excluded parity. JITless Node also improved; WebKit 26.6's smaller guard gain reproduced. Bun 1.4.2
keeps its former pattern and has no reproduced canonical gain. No successful comparison row had a
resolved loss in both replays, although individual replays contained losses. These are batch
throughput results, not individual-call p99. Reports retain raw observations, sample standard
deviations, standard errors, and paired median intervals; six process pairs give limited precision.

Two independent competitor comparisons used six fresh processes per implementation. The first
used nine 20 ms batches and 32 ms warmup; the second used three 5 ms batches and 16 ms warmup.
Package / best-reference median ratios were 0.724/0.656 on Node Current, 0.586/0.594 on Node LTS,
0.634/0.619 on Deno, and 0.630/0.621 on Chromium. Their best reference was `uuid.validate`.
Bun's ratios were 0.992 against the direct expression and 1.055 against `uuid.validate`; the
Bun gap remains unresolved. Different batch settings are separate observations, not pooled samples.

Two native profile comparisons covered Node, Bun, Deno and Chromium. Node and Deno guard CPU cost
fell in both; Bun's did not. Node and Chromium attributed no allocation samples to the package
guard, while Deno attributed at most 0.011 bytes per call. Missing samples do not prove zero
allocation. Mixed-case conversion retained similar sampled allocation bands on Node, Deno and
Chromium; Bun gross allocation volume remains unmeasured. Profiling includes instrumentation costs
and cannot establish resource superiority over the rival from these small samples.

Twelve alternating fresh-process import pairs per Node Current and Bun measured direct built and
source entries respectively, excluding process launch. Node import and first-call timing were
unresolved. Bun's candidate import was faster, but its net heap delta was 711,680 versus 694,272
bytes in every pair. This 17,408-byte increase remains unexplained: source paths and cache conditions
were not isolated, and net heap delta is not allocation volume. The measurements do not close
startup resource parity. Recheck with matched entry paths and cache conditions before attributing
the difference to the expression selection.

### Parsed UUID value state

A parsed or generated `Uuid` keeps its bytes, codec, and payload layout in private fields of
`LocalUuidValue`. The rejected module `WeakMap` cost one registration per value, which was more than
the rest of value creation, and needed a state object and a frozen layout copy per value. Text parsed
without a codec keeps its freshly decoded bytes; byte input and bytes returned by a codec are copied.

Two six-round packed replays on 2026-09-16 compared `281dc5e` with `80d3722`. Median ns per call:

| Route | Node 26.8.2 | Bun 1.4.2 | Chromium 153 | Deno 2.9.6 | Node 26.8.2 JITless |
| --- | ---: | ---: | ---: | ---: | ---: |
| `parseUuid(text)` | 304–326 → 222–228 | 225–231 → 146–152 | 283–295 → 168–171 | 737–746 → 308–314 | 4,183–4,212 → 4,047–4,144 |
| `parseUuid(plain slug)` | 349–352 → 111–115 | 138–142 → 54–56 | 192–219 → 111–113 | 377–383 → 225–228 | 1,474–1,482 → 1,390–1,399 |
| `parseUuid(bytes)` | 124–129 → 87–90 | 126–153 → 41–42 | 139–146 → 89–91 | 341–350 → 174–185 | 468–477 → 445 |
| `parseUuid(masked slug, codec)` | 389–438 → 279–284 | 310–314 → 208–217 | 399–841 → 265–270 | 1,138–1,467 → 545–578 | 8,646–8,662 → 8,498–8,502 |
| `generateUuidV7Value()` | 218–231 → 110–113 | 162–181 → 68 | 240–477 → 116 | 325–337 → 204–211 | 1,200–1,222 → 1,105–1,106 |

Every row is faster in both replays on Node, Bun, Chromium, and Deno. On JITless, text and slug
parsing and generation are faster in both, byte parsing in one, and masked parsing is unresolved.
Conversions from an existing value were no slower in both replays, except Deno
`codec.uuidToMaskedSlug(value)`, which was 7% slower in one replay and unresolved in the other.
Two six-round Node 24.21.0 replays compared `281dc5e` with `80d3722` and measured median ratios of
0.54 and 0.58 for `parseUuid(text)`, 0.41 and 0.42 for a plain slug, 0.51 and 0.65 for bytes, 0.60 and
0.65 for a masked slug with its codec, and 0.47 and 0.48 for `generateUuidV7Value()`.
`bench/resources.ts` allows one buffer for `parseUuid(text)`; the `WeakMap` source used two.

### UUIDv7 payload assembly

`uuidV7PayloadFromBytesUnchecked` assembles the upper 34 and lower 40 payload bits as exact numbers
and joins them with one BigInt shift; payload fields use `BigInt.asUintN`. The rejected per-byte form
converted and shifted one BigInt per byte and built each field mask with a shift. In a scratch probe
on 2026-09-16, assembly took 124 → 52 ns on Node 26.8.2 and 243 → 41 ns on Bun 1.4.2.
`extractUuidV7Payload(text)` also reads decoded bytes directly instead of a copy.

Two six-round packed replays on 2026-09-16 compared `43c2ef1` with `634d5a5`, layout
`{ subMillisecondFractionBits: 0, counterBits: 42 }`. Median ns per call:

| Route | Node 26.8.2 | Bun 1.4.2 | Chromium 153 | Deno 2.9.6 | Node 26.8.2 JITless |
| --- | ---: | ---: | ---: | ---: | ---: |
| `extractUuidV7Payload(bytes)` | 252–256 → 149 | 383–393 → 124 | 216–217 → 133–135 | 240–246 → 138–141 | 1,441–1,462 → 976–979 |
| `extractUuidV7Payload(text)` | 446–451 → 306–307 | 536–552 → 250–255 | 332–346 → 223–226 | 629–647 → 395–399 | 5,346–5,406 → 4,622–4,720 |

Both rows are faster in both replays on every runtime. Timestamp extraction and value formatting
were not slower in both replays on any runtime.
Two six-round Node 24.21.0 replays compared `43c2ef1` with `634d5a5` and measured median ratios of 0.65 and
0.65 from text and 0.59 and 0.59 from bytes; timestamp extraction read 0.99 and 0.98.

### Runtime capability review

The 2026-09-12 review probed Node 26.8.2, Bun 1.4.2, Deno 2.9.6, and Chromium
153 twice. Node and Bun expose `node:crypto.randomUUIDv7`; Deno does not. The probe detected no
counter in Node's 74 payload bits, and consecutive same-millisecond values ordered near chance.
Bun's generator advances a 12-bit counter (50,000-sample entropy probe of 2026-08-12 on Node
26.7.0 and Bun 1.3.14). Module-level text promises no ordering. Default native text and slug results
are trusted directly without result validation or identity tracking; see Native floors. Bun also exposes
`Bun.randomUUIDv7`: its buffer form is a `Buffer`, explicit zero is accepted, and NaN throws
`ERR_OUT_OF_RANGE`. Keep runtime dispatch capability-based because shared Node API names do not
imply shared implementation.

All four runtimes mutate and return the supplied `getRandomValues` view, support `encodeInto`, and
produce `AP8` from native base64url encoding. Node, Deno, and Chromium reject a 65,537-byte entropy
request with `QuotaExceededError`; Bun 1.4.2 accepts it. This package requests only fixed 16-byte
draws, so the limit difference changes no route. Deno's Node-compatible `resourceUsage` exposes the
same counters used by the profiler. Re-run the review after either runtime changes and periodically
before runtime performance work; release notes and property presence are candidate discovery, not
semantic evidence.

### Native floors

Compare complete calls with the fastest proper native implementations and qualified competitors;
negligible remaining differences are acceptable and do not justify extra code or continued tuning.
Configured calls may exceed a native floor by work that floor lacks (AGENTS.md). `bench/generation-cases.ts` and `bench/generation-host.ts` hold the floor
rows: Web Crypto `randomUUID`, Web Crypto bytes with version bits for allocated and caller-owned
output, those bytes encoded by native `toBase64` for UUIDv4 slugs, Node `crypto.randomUUIDv7`, and
`Bun.randomUUIDv7` text, `Buffer`, and base64url output. The competitor matrix builds its host
corpus once per runtime with that runtime's export condition. A single node-target bundle ran the
Node adapter on Bun and Deno, so competitor results before 2026-09-16 do not describe the Bun or
Deno routes. Deno 2.9.6 has no native UUIDv7. Chromium 153 exposes only `getRandomValues` and, in
secure contexts, `randomUUID`; the package keeps its own UUIDv4 text there because it is faster.

Two full competitor runs on 2026-09-16 measured Node 24.21.0, Bun 1.4.2, Deno 2.9.6, and Chromium;
one-row-per-process probes added Node 26.8.2. Medians in nanoseconds, package against floor:

| Call | Node 26.8.2 | Node 24.21.0 | Bun 1.4.2 | Deno 2.9.6 | Chromium |
| --- | --- | --- | --- | --- | --- |
| UUIDv4 text | 139–149 / 144–152 | 120–123 / 119 | 31–36 / 27–32 | 32 / 32 | 146–148 / 543–549 |
| UUIDv4 new bytes | 47–51 / 601–634 | 50–52 / 642–655 | 22 / 22 | 160 / 175–192 | 50 / 484–494 |
| UUIDv4 caller buffer | 34–35 | 38–40 / 553–560 | 28–29 / 17–18 | 37–38 / 62–63 | 37 / 296–299 |
| UUIDv4 base64url slug | 102–105 / 728–732 | 100–105 | 53–54 / 50–52 | 210–215 / 268–272 | 145–148 / 602–613 |
| UUIDv7 text | 108–111 / 164–165 | 111–114 / 150–153 | 75–82 / 39–45 | 112–113 | 143–145 |
| UUIDv7 new bytes | 67 | 72–75 | 44–45 / 50–51 | 173–174 | 74 |
| UUIDv7 base64url slug | 138–144 | 140 | 77–82 / 54–58 | 237–248 | 179–182 |

Node 26.8.2 figures and Bun's UUIDv7 text and slug figures come from probes that consume every
result; the other cells come from the matrix. A cell without a floor has no native primitive for that output on that runtime. Node's
unpooled Web Crypto and `randomFillSync` calls cost far more than the pooled draw, and Node's native
UUIDv7 text is slower than the portable generator, so Node keeps portable UUIDv7 and bytes.

Portable UUIDv4 text also beats Node's native `crypto.randomUUID` once it formats from the module
scratch array instead of allocating owned bytes and passing them through `bytesToUuidString`'s input,
case, and range checks. Two packed replays against `75c7e3b` measured default UUIDv4 text at 0.626–0.661
of its previous cost on Node 26.8.2 (151–160 to 100 ns) and 0.700–0.713 on Node 24.21.0 (126–129 to
89–92 ns), with Node using the portable path instead of native text. The portable path alone read
0.655–0.677 on both Node releases, 0.733–0.774 on Bun, 0.395–0.408 on Deno, and 0.769–0.781 on
Chromium, where default text improved to 0.753–0.795. Bun and Deno keep native text: it stayed
unresolved there at 37–41 ns against 60–63 and 91–92 ns portable. UUIDv4 bytes, slugs, and guards
stayed unresolved, except one Deno byte-guard replay at 1.178 that the other replay did not repeat.
Those older Node 26.8.2 JITless measurements selected pooled formatting. Startup selection now
uses native UUIDv4 text without the JIT and retains pooled formatting with it. Two packed
six-round comparisons against `40f3628` on 2026-10-02 measured Node 26.10.0 JITless default text
at 0.545 and 0.544 of its former cost (1,031–1,052 to 562–572 ns), and uppercase at 0.571 and
0.556 (1,051–1,054 to 586–600 ns). Both comparisons separate the improvements. The measured
`native.v4.string` reference calls Web Crypto, not Node's fastest crypto primitive: its 503–513 ns
still leaves a wrapper gap, so this selection does not close native parity. The Node floor-table
cells above predate both changes.

Startup mode detection scans existing CLI arguments backwards and stops at the last explicit
setting. It parses `NODE_OPTIONS` only when no CLI setting settles the answer and the environment
contains a possible mode flag; ordinary imports create no token array. Two six-round packed
comparisons against `da09017` on each installed Node release listed under UUIDv7 text bounds
cover default and uppercase UUIDv4 and all bounds forms in both modes. No row has a repeated
separated gain or loss. These warm measurements do not quantify import-time savings; avoiding
the combined argument array, mapped token array and unnecessary parsing is the reason for the
shape. Real child processes also check both environment flag orders against V8 mode observation.
Fresh native profiles cover the filtered calls on Node 26.10.0, Bun 1.4.2, Deno 2.9.7 and
Chromium, plus a separate compiled JITless Node capture. The latter has eight operation records
and nonempty CPU, allocation, heap, GC and V8-state artifacts; their format checks establish
capture completion, not a cold-start allocation count or a measured startup speedup.

UUIDv4 slugs encode from that same scratch through one shared draw instead of owned bytes. Two
packed replays against `bf95bbb` measured base64url slugs at 0.794–0.824 on Node 26.8.2, 0.820–0.854
on Chromium, 0.412–0.455 on Deno, and 0.896–0.908 on Bun, with base32hex slugs at 0.83–0.92 on
the same lanes. The shared draw is a call Bun does not inline: portable UUIDv4 text read 1.103 and
1.032 on Bun and 1.043 and 1.032 on Deno, where native text is the default and portable text only
serves fallback. It stayed unresolved on Node and Chromium, where portable text is the default.
Inline the draw into the text writer if Bun or Deno portable text becomes a default.

Module-level UUIDv7 slugs and text-plus-slug pairs without a generator draw into the keyless text
scratch instead of owned bytes. Two packed replays against `aba4ec0` measured base64url slugs at
0.885–0.887 on Node 26.8.2, 0.904–0.907 on Chromium, and 0.558–0.562 on Deno, with base32hex slugs
at 0.883–0.912, 0.932 unresolved, and 0.548–0.560. Bun stayed unresolved at 0.950 and 1.021, so
allocation is not where Bun's slug cost sits. Generator rows, text, and bytes stayed unresolved; the
corpus has no row for the keyless pair.

A primitive alphabet preset skips the `{ alphabet }` object, option reads, generator check, and `at`
check in `generatePlainUuidV7Slug`. Two packed replays against `6b5bcc9` measured base64url slugs at
0.897 and 0.936 on Node 26.8.2, 0.875 and 0.849 on Chromium, 0.877 and 0.902 JITless, and 0.930
unresolved then 0.926 on Deno. Bun read 0.961 unresolved then 0.891, so the Bun effect is not
established; base32hex slugs followed on every lane. Generator rows stayed unresolved.

Patching Bun's native UUIDv7 output with the package clock produces correct values but loses: text
cost 91–94 ns and slugs 103–106 ns against 70–73 and 66–71 ns for the package generator in two
one-process screens on Bun 1.4.2, because slicing and concatenating the native string costs more
than the native call saves.

`Bun.randomUUIDv7` is the fastest measured UUIDv7 text and slug on Bun and encodes timestamps
ahead of the clock. When its 12-bit counter overflows
within one millisecond it advances the encoded millisecond, and repeated overflow compounds. After
a burst of 2 million calls on Bun 1.4.2, native text and slugs encoded timestamps 567–576 ms ahead of
`Date.now()`, while the package generator stayed at or behind the clock. Passing `Date.now()` as its
timestamp cost 51 ns and still encoded up to 8 ms ahead during a one-second burst of 20 million
reads, with about 85% of samples at least 1 ms ahead. Rejecting values ahead of the clock cost 94 ns
and rejected 99.8% of them. Bun's `node:crypto.randomUUIDv7` ran 429 ms ahead after the same burst.
The measured portable UUIDv7 text and slug calls cost
about 36 ns and 23 ns above the native floor. In these bursts, that gap accompanies timestamps
that stay at the clock; it does not establish an unavoidable validation or dispatch cost.
Art's default-generation policy in `docs/public-api.md` supersedes rejection solely for timestamp
advancement. The measurements remain evidence of the trade-off, not a never-ahead contract.

Node 26.8.2's `crypto.randomUUIDv7` draws its 12 bits after the timestamp randomly on every call
and encoded no timestamp ahead of the clock during a burst of 2 million calls, but it is slower than
the package generator.

Default native output needs neither result validation nor identity tracking; stronger guarantees
belong only to explicit configurable paths under `docs/public-api.md`. Validating every native
UUIDv7 value cost 61–63 ns against a 41–43 ns floor on Bun, while trusting a validated function reached the floor. A shared trust helper
added a call Bun did not inline, costing 38–40 ns for UUIDv4 text against 31–33 ns with the trusted
call at each call site. These measurements do not justify preserving a trust step on defaults.
Remeasure if Bun changes the `randomUUIDv7` overflow policy or clock
argument, if Node's native UUIDv7 text overtakes the portable generator, or if a runtime adds native
UUIDv7 bytes.

The packed comparison `current-direct-native-baseline-packed.jsonl` compares `91c6d52` with
`a52bf59` on Node 26.10.0 and Bun 1.4.2, using six alternating fresh-process pairs, seven
16 ms batches and 128 ms warm-up per call. Removing native-result validation and identity tracking
leaves every measured timing difference unresolved. Bun UUIDv4 text has ratio 0.988 [0.91, 1.01],
UUIDv7 text 0.988 [0.92, 1.01], and UUIDv7 slug 0.989 [0.97, 1.05]. The change enforces the native
baseline and removes unnecessary machinery; it does not establish a throughput win or native parity.

`current-direct-native-other-runtime-packed.jsonl` repeats UUIDv4 text, UUIDv7 text and UUIDv7
slug calls with the same settings on Chromium 153.0.8010.12, Firefox 155.0, WebKit 26.6, Deno
2.9.7 and Node 26.10.0 without JIT. Every timing difference remains unresolved on those hosts too.

The corpus replays also marked Bun explicit-time caller output and selected-generator bytes 10–17%
slower twice. Neither reproduced alone or after warming keyless text, slug, and byte calls: three
alternating rounds of eight process pairs gave overlapping explicit-time byte ranges, and one round
suggested at most 3 ns. Treat the effect as unresolved warm-up history, not a retained regression.

Remaining gaps and their causes:

- Bun UUIDv4 text stays 2–5 ns above its floor. The package adds the public text-case check, the
  success-result branch, and the `try` that keeps native failures on the portable fallback.
  Removing the `try` saved about 1 ns and would break that fallback guarantee.
  The maintained UUIDv4 screen on 2026-10-02 compared an undefined fast path, an argument-count
  fast path and direct preset comparisons on Node 26.10.0 and Bun 1.4.2. Each candidate passed
  the owning Node and Bun tests before timing. Node default text stayed at 70–74 ns against
  70–71 ns for the baseline. Bun's undefined fast path measured 37–38 ns against 38–40 ns,
  while the other candidates varied by pass. Keep the existing implementation: these short
  samples do not establish a worthwhile gain on both primary runtimes. Three 5 ms batches per
  process after 16 ms warmup, with reversed second-pass order, are screening evidence; they do
  not establish independent-run confidence, individual-call p99 or resource parity. Raw samples
  and proof output are in `bench/reports/candidates-v4-1790977311163/`.
  Native helper inlining with string-first success recognition is retained for its repeated Bun
  gain without adding public options or removing fallback. The 2026-10-04
  `v4-native-inline-screen.log` compares helper inlining alone with that
  combination; `v4-native-inline-repeat.log` repeats the combination. Node 26.10.0 and Bun 1.4.2
  each use two fresh processes per candidate per screen, nine 20 ms batches and 32 ms warm-up.
  Bun default native text favors the combination in all four processes. The trusted-native
  lost-fallback mutation fails the shared failure witness in both runners
  (`v4-native-inline-mutation-retry.log`). The first mutation attempt stops at generated TypeScript
  syntax and supplies no behavioral proof (`v4-native-inline-mutation.log`).

  `v4-native-inline-packed.jsonl` compares the combination through packed imports over eight
  revision pairs on Node and Bun. Bun default text has median ratio 0.941 with reported 95%
  interval [0.92, 0.97]; Node default text remains unresolved. The eight-pair broad repeat,
  `v4-native-inline-packed-all.jsonl`, includes Chromium 153.0.8010.12, Firefox 155.0, WebKit 26.6,
  Deno 2.9.7 and Node 26.10.0 JITless. Bun default text repeats at 0.950 [0.91, 0.96]; Deno reads
  0.971 [0.96, 0.99], and JITless reads 0.936 [0.93, 0.95]. WebKit default text reads 1.038
  [0.999, 1.087], with seven paired observations slower and one slightly faster. Keep this
  possible regression unresolved; it requires a focused replay before retention.
  Uppercase and portable calls, owned and caller-buffer bytes, and both slug alphabets remain
  controls. Their unresolved intervals do not prove equivalence or identify an engine cause.

  String-first recognition without moving the helper does not reproduce a Bun gain in
  `v4-string-first-screen.log`: baseline process medians are 37.27 and 32.06 ns, against 32.46 and
  32.30 ns for the candidate. Reject that substitution before packed measurement. Its lost-throw
  mutation fails shared dual-failure and reentrancy witnesses on Node and Bun
  (`v4-string-first-mutation.log`).

  The twelve-pair focused combination replay in `v4-native-inline-packed-focused.jsonl` repeats
  Bun default text at 0.965 [0.946, 0.981] and uppercase at 0.980 [0.971, 0.993]. WebKit default
  text reads 0.990 [0.929, 1.029], so the earlier slowdown does not repeat but a small regression
  remains possible. WebKit uppercase reads 0.940 [0.896, 0.974]. Portable-text controls remain
  unresolved on both runtimes. CPU profiles and equal-call resource observations below accompany
  the timing decision. Packed observations are fresh processes on one machine;
  within-process batches are not independent call latencies. Packed startup and gross allocation
  parity remain unmeasured for this candidate.

  The eight-pair Node 24.21.0 replay in `v4-native-inline-packed-lts.jsonl` leaves every selected
  case unresolved: default text reads 1.012 [0.99, 1.02], uppercase 0.998 [0.96, 1.03], and portable
  text 0.992 [0.95, 1.03]. Owned bytes, caller-buffer bytes and both slug alphabets also remain
  unresolved. This supplies the missing LTS observation, not proof that small differences are absent.

  Native CPU captures in `candidates-v4-vJ4kFK/` use the retained API modules and the existing
  profile corpus. Only `*-serial-*` captures enter this comparison; the earlier captures were
  launched without awaiting each exit and are excluded for possible profiler contention.
  Two sequential baseline/candidate pairs reverse execution order and retain completed calls
  beside each profile. Each selected case uses five 100 ms batches after 32 ms warm-up.
  Bun baseline default text completes 14.57 and 14.56 million calls; the candidate completes
  15.70 and 15.09 million. Baseline samples include `nativeOrPortableUuidV4` and `generateUuidV4`;
  candidate samples include the combined `generateUuidV4`. Native `randomUUID` dominates both.
  Frame disappearance follows source inlining and alone proves no removed cost; profiles combine
  default, uppercase and native-floor cases, so sample totals do not isolate default-call cost.
  Import observations and heap deltas vary and do not establish cold or allocation parity.

  Node 26.10.0 with JIT selects portable generation: the built runtime exposes native UUIDv4 only
  under its JITless selection, and these normal-Node CPU profiles contain the portable formatter.
  Its default completed-call direction changes between execution orders. These captures verify
  that the native-helper change does not describe normal Node's hot path; they do not supply a
  native-Node speedup or total allocation evidence. The artifact preparation uses one 1 ms batch
  only to verify driver execution, not to select code.

  Equal-call Bun memory captures under `candidates-v4-vJ4kFK/*-memory-*/` execute 1,048,576 calls
  of exactly one text case per process, with baseline/candidate order reversed in the second pair.
  Default-text collected heap deltas are 418,737 and 417,561 bytes for baseline, versus 339,078
  and 345,212 for the candidate. Uppercase deltas are 696,867 and 708,489 versus 559,990 and
  572,557. Candidate collected-cell deltas are also smaller in both orders. Native committed-memory
  deltas change direction, and peak RSS does not establish a gain. These are forced-GC retention
  observations with setup outside the counted calls; two pairs cannot establish total allocation
  per call, leak freedom or a population-wide resource advantage.

  Four alternating Bun cold pairs use the same retained API graphs and the existing profile
  driver's `importMs`. Baseline reads 1.931–1.969 ms and candidate reads 1.915–2.024 ms; each
  direction occurs twice. The one-batch timing settings only verify execution. These observations
  exclude process startup and packed resolution and leave small import-cost differences unresolved.

  The text-allocation mutation fails the new default-text resource witness with `buffers=1 exceeds
  0` before timing (`v4-native-text-resource-mutation.log`). The intact candidate passes both
  owning runtime suites and both text counters with zero observed arrays, views or diagnostics
  (`v4-native-text-resource-intact.log`, `candidates-v4-p8bvne/`). Together with repeated throughput
  and collected-heap observations, this earns removal of the private helper and the ordinary native
  success Error check. It does not establish native-floor parity, gross allocation parity or absence
  of small cross-runtime differences; those remain open. Trust proper native output directly;
  preserve exception fallback and dual-failure causes when remeasuring.
  The committed implementation's packed replay (`v4-inline-production-floors.jsonl`) uses
  eight fresh-process pairs on Node 26.10.0 and Bun 1.4.2, 20 ms batches and 32 ms warm-up.
  Bun default text reads 38 to 35 ns, ratio 0.933 [0.92, 0.96]; uppercase is unresolved.
  Node default text is unresolved. The unchanged Node native control reads slower in this replay,
  so small changes in unrelated controls cannot be attributed to the implementation.
  Native rows here include the corpus's property call; they do not close the fastest native-floor gap.
- Bun UUIDv7 text costs about 79 ns against 27 ns for native UUIDv4 text: about 42 ns draws the
  timestamp, sequence, and random bits, and 37 ns formats them through the Latin-1 `Buffer` path.
  With every result's last character read, formatting the same bytes through `toHex`, `Buffer`
  `hexSlice`, or a byte-table concatenation cost 86–94 ns on Bun 1.4.2. The measured Bun native
  generators advance their timestamps during sustained bursts.
  A focused default-text comparison on 2026-10-02 retained three fresh-process observations per
  implementation on Node 24.21.0, Node 26.10.0, Bun 1.4.2, Deno 2.9.7 and Chromium
  153.0.8010.12. Each process ran nine 5 ms batches after 16 ms warmup. Bun module-default
  text measured 83 ns, with mean standard error 1.53 ns, against 47 ns and 0.66 ns for
  `Bun.randomUUIDv7`. The package's created-generator text measured 79 ns; that separate
  workflow must not hide the module-default gap. Bun native text remains the timing target,
  with its previously measured timestamp behavior kept separate from cost. Three processes
  give limited uncertainty evidence and do not establish call p99 or resource parity. Raw
  batches, process medians and statistics are in `bench/reports/v7-primary-rivals.jsonl`.
  Two alternating source-bundle screens on 2026-10-02 skipped the fraction comparison when its
  width was zero. Node 26.10.0 default text remained about 93 ns and owned bytes about 80–82 ns.
  Bun 1.4.2 owned bytes improved from 51 to 47 ns in one screen but only 48 to 47 ns in the other;
  text and configured calls had mixed directions. Reject the extra branch: three 5 ms batches in
  each process after 16 ms warmup do not establish a worthwhile improvement. The fractional-clock
  oracle checks the actual new bucket, not merely increasing byte order; disabling advancement
  fails its Node test and the direct Bun witness. This screen does not settle the other draw costs.
  Two further alternating source-bundle screens cached timestamp bytes in the private text buffer
  and copied them to byte outputs. Node owned bytes rose from 81–82 to 85–86 ns, and fractional
  caller-buffer draws from 47 to 52 ns. Bun text rose from 83–86 to 88–90 ns and owned bytes from
  47–49 to 51 ns. Reject this cache: the repeated successful-call losses outweigh its small Node
  fixed-clock buffer gain. The same short-batch limits apply. A stale-cache mutation fails the
  Node timestamp cases and direct Bun clock-advance witness; caller-buffer mutation and offset
  witnesses pass with the candidate. Different cache shapes remain unmeasured.
  Two alternating source-bundle screens compared clock-call inlining, counter-write inlining,
  direct zero-fraction seeding, a separate zero-fraction continuation, and their combination.
  Node 26.10.0 direct seeding raised owned-byte cost from 82 to 85 ns; clock inlining raised
  fractional caller-buffer cost from 48 to 49–50 ns. Counter-write inlining raised Bun 1.4.2
  owned-byte cost in both screens, while the combined candidate raised caller-buffer cost on both
  hosts. Separate continuation duplicated sequence logic without a repeated primary-call gain.
  Reject these shapes. Each candidate passed the existing Node state-machine cases and direct
  Bun fraction, clock-advance and caller-buffer witnesses before timing. Three 5 ms batches per
  process after 16 ms warmup are selection evidence, not independent confidence samples.
  Four direct tail stores also survived the source screens, but two packed six-pair replays
  across Node, Bun, Chromium, Firefox, WebKit, Deno and Node JITless reproduced a separated gain
  only for Node's fractional-clock caller-buffer case: ratios 0.970 and 0.973, with 95% intervals
  [0.936, 0.993] and [0.965, 0.988]. Default text and owned-byte gains remained unresolved.
  Reject the rewrite: this small secondary gain does not justify more code. Each process measured
  one 5 ms batch after 16 ms warmup; fresh-process medians, not calls, are the comparison units.
  The shared Node/Bun entropy witness rejects a duplicated tail byte and checks both complementary
  byte patterns across text, owned bytes, explicit timestamps and offset caller storage.
  The maintained independent-draw screen on 2026-10-02 measured Node 26.10.0 and Bun 1.4.2
  with three 5 ms batches after 16 ms warmup and reversed second-pass order. Node results were
  mixed; Bun text fell from 93 to 86–89 ns and slugs from 84–86 to 79 ns. Over 4,096
  instrumented caller-buffer draws, both hosts required five secure-source refills instead of two.
  Reject this shape: its modest Bun gain increases entropy-source work on both primary hosts.
  These counts cover the instrumented burst, not total CPU or allocation. The candidate requests
  ten entropy bytes per call instead of four on sequence continuation. A maintained lost-bit
  mutation fails the independent module-mode oracle in both runtime lanes before timing.
  A primary-call-only screen on 2026-10-02 bypassed the inner text-case resolver for the known
  lowercase constant. Node 26.10.0 text changed from 95 to 94 ns, then from 92 to 95 ns;
  Bun 1.4.2 text changed from 91 to 99 ns, then from 98 to 93 ns. Reject the shortcut:
  the decision-relevant text gain does not reproduce. Owned-byte calls also lost in both passes.
  Existing Node/Bun behavior tests passed before timing. Three 5 ms batches after 16 ms warmup
  remain screening evidence, not independent confidence or resource parity; raw evidence is in
  `bench/reports/candidates-v7-draw-1790977930802/`.
  Two module-wrapper screens on 2026-10-03 separate function size from known-preset validation.
  Node 26.10.0, Bun 1.4.2 and Deno 2.9.7 each run three 5 ms batches after 16 ms warmup,
  with reversed second-pass acquisition order. A smaller wrapper forwarding configured calls
  to the complete original implementation lowers Bun default-text cost in all four comparisons:
  99–110 ns baselines against 84–88 ns. The preset shortcut alone does not reproduce that gain.
  Node explicit-time calls rise from 144–162 ns to 175–194 ns; Deno explicit-time costs also rise.
  Reject the duplicated configured dispatch as a production shape; test a helper containing only
  the configured tail before attributing those losses to outlining itself. The uppercase mutation
  fails `core.test.ts`'s consumer assertion before timing. Existing Node/Bun cases and resource
  counters pass each valid source variant. These short batches do not establish independent-process
  uncertainty, packed behavior, allocation parity or call p99. Raw output is in
  `bench/reports/primary-keyless-screen.log` and `primary-keyless-repeat.log`; the failed mutation
  is in `primary-keyless-mutation.log`.
  Reject the refined wrapper with only the configured tail in its helper. The packed comparison
  on 2026-10-03 uses six fresh-process pairs per call, one 5 ms batch and 16 ms warmup across
  Node 26.10.0, Bun 1.4.2, Deno 2.9.7, Chromium, Firefox, WebKit and Node JITless.
  Node explicit-time paired candidate/baseline median ratio is 1.21 with a reported 95% interval
  of 1.03–1.23; Deno default text is 1.10 (1.03–1.11), and explicit time is 1.19 (1.15–1.24).
  Bun default text is 0.90 (0.69–1.04), which does not establish an improvement.
  These results reinforce the configured-call losses from the source screens; outlining this
  helper does not earn production code. Other intervals do not prove equivalence, and this
  comparison does not measure total allocation or individual-call latency. The packed output is
  `bench/reports/primary-keyless-packed-retry.jsonl`. An earlier packing attempt failed with
  Parcel SIGSEGV before timing; the unchanged retry passed packaging and completed all pairs.
  Its cause remains unresolved; the failed attempt provides no performance evidence.
- Two alternating allocation screens on 2026-10-02 compared owned UUIDv7 generation using
  `new Uint8Array(16)`, an explicit `ArrayBuffer`, and a copy of the private text buffer.
  Node 26.10.0 owned calls cost about 78 ns, 150–152 ns, and 87 ns respectively; Bun 1.4.2
  cost 48–50 ns, 142–150 ns, and 64–67 ns. Deno 2.9.7's explicit-buffer direction varied,
  while the copied buffer lost twice. Retain the ordinary constructor. Preflight checks require
  plain arrays, independent backing storage and unchanged earlier results after later draws.
  These source-bundle screens use the same short-batch settings as the draw comparisons above;
  they do not settle UUIDv4 allocation or Deno's remaining owned-output gap.
  Two separate Deno allocation-and-fixed-write screens also compared plain views over
  `Buffer.allocUnsafeSlow(16)` and `Buffer.alloc(16)`. Their medians were 132–134 ns against
  112 ns for the ordinary constructor. Reject these alternatives without adding a Deno
  dependency or dispatch branch. Seven batches within each process do not establish independent
  confidence, and allocation plus a fixed write does not measure complete UUID generation.
  The maintained UUIDv4 constructor screen used Node 26.10.0, Bun 1.4.2 and Deno 2.9.7 with
  the same three-batch settings and reversed second-pass order. Ordinary, explicit-buffer and
  scratch-copy medians were respectively 51, 132–157 and 61 ns on Node, and 22, 116–122 and
  36 ns on Bun. Deno's explicit-buffer result changed from faster to slightly slower against
  its baseline; the scratch copy lost twice. Reject both substitutions without a dispatch branch.
  Existing Node/Bun ownership and runtime tests passed before timing. These screens do not
  establish resource parity or close the owned-output gap; raw evidence is in
  `bench/reports/candidates-v4-1790977421904/`.
  Native decoding of fixed zero bytes before secure filling also loses in both passes on all
  three hosts. Hex and base64 allocation cost respectively 138–149 and 208–220 ns on Node,
  29 and 57–58 ns on Bun, and 143–157 and 211–224 ns on Deno. Reject both shapes. Decoder
  selection runs once at module load without consuming entropy. The same Node/Bun preflight
  and short-sample limits apply; raw evidence is in `bench/reports/candidates-v4-1790977591482/`.
- Bun UUIDv4 caller-buffer output costs 28–29 ns against 17–18 ns. The floor fills a view prepared
  outside the timed call; the package checks the caller range, copies from the package pool into
  private storage, then copies into caller storage, so entropy failure cannot partly write caller
  data and Web Crypto never receives a caller view. A 16-byte loop in place of `set` was
  inconclusive, and drawing into a per-call `subarray` cost 36 ns on Bun and 49–53 ns on Node 26.
  The strongest remaining candidate lets the pool write at a caller offset, removing the private
  copy; it changes every adapter's `fillRandom` for a secondary path. Try it if caller-buffer output
  becomes a primary workload.
- Bun UUIDv4 slugs cost 2–4 ns more than Web Crypto bytes encoded with `toBase64`. The package
  path copies from its pool and uses its own slug writer. Two six-round packed Bun 1.4.2
  comparisons on 2026-10-02 against `da09017` replaced only plain base64url encoding with
  native `toBase64` over the package bytes. UUIDv4 slug ratios were 0.998 and 1.005; plain
  encoding ratios were 1.022 and 1.010, all unresolved. Masked and sentinel controls had no
  repeated separated loss. Reject the extra branch because it has no reproduced gain; this
  does not prove no native encoding design can improve the call. Node 24 has no `toBase64` floor.

### Feistel round function

The Feistel round writes HalfSipHash-2-4 out for its fixed two-word, 8-byte message instead of calling
the general function through word arrays. A consumed-result probe put the four-round network at
87 ns before and 72 ns after on Node 26.8.2, and 82 and 66 ns on Bun 1.4.2, with identical output
over 2,000 random keys and blocks in both directions.

Two packed `af5f468`-to-candidate replays on 2026-09-16 measured every masked encode, decode, and
generation row at 0.87–0.98 of baseline on Node 26.8.2, 0.65–0.98 on Bun 1.4.2, 0.88–0.95 on
Chromium 153, 0.88–1.01 on Node 24.21.0, 0.87–0.99 on Deno 2.9.6, and 0.91–0.97 on Node 26.8.2
JITless. Each cell was faster or unresolved; none was slower. The fixed Feistel vector and the
wire-format vectors killed six mutants of the written-out rounds, constants, key schedule, and
output words. Recheck if the round function or its message length changes. Node 26.8.2 CPU
profiles then put Feistel work at about half of masked encode and decode time; the frozen round
count sets that floor.

### Latin-1 slug writing

Bun writes UUID slug character codes into reused scratch and reads them with one
`Buffer#toString("latin1")` call. Other engines use fixed character-code arguments for 16-byte
payloads, including the complete 27-character masked base32hex spelling. The generic accumulator
still handles other lengths. Native encoding remains a measured alternative; its presence alone
does not establish a faster consumer call.

The following comparison describes the earlier Latin-1 implementation.

Two packed `22d3055`-to-candidate replays on 2026-09-16 measured median ratios; every listed pair
had its 95% interval below 1 unless marked:

| Runtime | `v4.slug` | `v7.slug` | `v7.base32` | `masked.generate` | `masked.encode.bytes` |
| --- | ---: | ---: | ---: | ---: | ---: |
| Node 26.8.2 | 0.84, 0.83 | 0.82, 0.84 | 0.62, 0.64 | 0.82, 0.82 | 0.76, 0.79 |
| Bun 1.4.2 | unresolved, unresolved | unresolved, unresolved | 0.45, 0.43 | 0.89, 0.86 | 0.85, 0.86 |
| Node 24.21.0 | 0.56, 0.60 | 0.63, 0.65 | 0.58, 0.60 | 0.77, 0.79 | 0.71, 0.69 |
| Deno 2.9.6 | 0.73, 0.73 | 0.83, 0.75 | 0.75, 0.73 | unresolved, 0.81 | 0.74, 0.73 |
| Node 26.8.2 JITless | 1.64, 1.58 slower | 1.41, 1.39 slower | 1.13, 1.12 slower | unresolved, unresolved | 1.06, 1.05 slower |

Chromium 153 does not select this writer; its rows were unresolved, and three cells of 1.02–1.04 in
an earlier replay did not reproduce. Node JITless interprets the 22 typed-array writes one by one;
the gains on every higher-priority runtime outweigh that final rung. Recheck if native `toBase64`
stops trailing this writer on Bun, or if a runtime gains a native base32hex encoder.

### Masked base32hex slugs

The 27-character masked base32hex spelling uses the fixed writers and decoder: characters 24 and 25
hold the last byte and the check tail's top two bits, and character 26 holds the tail's low two bits
followed by three zero bits, which decoding requires. It previously used the generic bit
accumulator in both directions.

Two packed `6db699c`-to-candidate replays on 2026-09-16 measured median ratios; every listed pair
had its 95% interval below 1 unless marked unresolved:

| Runtime | `masked.base32.encode` | `masked.base32.encode.bytes` | `masked.base32.decode` | `masked.base32.generate` |
| --- | ---: | ---: | ---: | ---: |
| Node 26.8.2 | 0.70, 0.65 | 0.59, 0.57 | 0.86, 0.80 | 0.65, 0.66 |
| Bun 1.4.2 | 0.57, 0.54 | 0.48, 0.50 | unresolved, unresolved | 0.58, 0.57 |
| Node 24.21.0 | 0.65, 0.65 | 0.57, 0.56 | 0.82, 0.81 | 0.68, 0.66 |
| Chromium 153 | 0.94, 0.95 | unresolved, unresolved | 0.89, 0.87 | unresolved, unresolved |
| Deno 2.9.6 | 0.74, 0.74 | 0.63, 0.62 | 0.86, 0.87 | 0.78, 0.76 |
| Node 26.8.2 JITless | 0.97, 0.97 | 0.95, 0.96 | unresolved, unresolved | 0.94, unresolved |

Trade-off: in a process that encodes both masked alphabets, base64url `masked.encode.bytes` read
1.05 and 1.02 slower on Node 26.8.2 and 1.04 once on Deno 2.9.6, because both alphabets now share
one branch of `encode`. Three runs of the base64url rows alone were unresolved at 0.98–1.05.

### Native base64url encoding

Keep Bun's indexed base64url block writer: fixed block positions do not reproduce a complete-call
gain. Two 2026-10-03 source screens compare `alphabet fixed-blocks` on Node 26.10.0 and Bun 1.4.2,
with two fresh processes per candidate/runtime in reversed order, three 5 ms batches per process
and 16 ms warm-up. `primary-slug-fixed-screen.log` and `primary-slug-fixed-repeat.log` retain
all six caller rows and name their isolated source, behavior and resource artifacts.
The first Bun default-slug comparison reads 96.23/92.98 and 91.48/89.73 ns, baseline/candidate;
the repeat reads 92.51/90.87 and 88.52/90.01 ns. Conversion and paired-output effects also change
direction. These short screens do not bound equivalence or establish individual-call latency,
but they fail the repeatability needed to justify a larger production body; no packed retention
comparison follows. Tables, buffers, entropy, tails and native string construction are unchanged.
`primary-slug-fixed-mutation.log` records the isolated lost-byte candidate failing Bun's independent
Buffer encoder assertion at `__test__/runtime-boundary-probe.ts:181` before timing. Both intact
screens pass Node/Bun behavior and JavaScript-visible resource counters; those counters do not
measure engine-internal allocation. Native parity remains open.

Keep the fixed UUID writer until native encoding lowers complete caller cost without moving cost
onto other primary calls. Two source screens on 2026-10-03 compare `native-branch` and
`native-dispatch` on Node 26.10.0, Bun 1.4.2 and Deno 2.9.7, with reversed acquisition order,
three 5 ms batches per process and 16 ms warm-up. The raw files are
`primary-native-encoder-screen-repeat.log` and `primary-native-encoder-screen-independent.log`
under `bench/reports/`; each names its source, runtime proof and resource artifacts.
Bun conversion and pair costs do not improve consistently. Module-selected dispatch raises
Bun base32hex slug medians in both orders of both screens despite leaving its writer unchanged.
Neither shape earns a production change. These short screens do not establish equivalence or
a physical limit; the earlier packed UUIDv4 comparison also rejected an early native branch.

`primary-native-encoder-oracle.log` retains the fresh-process capability proofs and corrupted
native-return check. Each candidate selects native for the varied plain corpus, keeps masked
tails outside it, and falls back after a native throw. Replacing only the last native digit fails
the independent Buffer oracle for both candidates. Resource counters require one constructed
plain-slug string and two pair strings, whether Latin-1 or base64 constructs the plain result;
they do not measure total allocation bytes or native-internal work.

Native `Uint8Array.prototype.toBase64` is probed once for generic payload lengths. UUID payloads
select the fixed writers described above. The following earlier native comparison does not rank
those fixed writers: two 24-round comparisons on 2026-09-12 disabled
only native encoding on the public plain-encode route. The portable path was 2.29–2.34 times slower
on Bun 1.4.1, 13–15% slower on Deno 2.9.6, and 14–29% slower on Chromium 151; every 95% median
interval excluded parity in both replays. Node 24.20.0 was unresolved because both revisions used
the fallback. Remove native delegation only if a supported runtime reproduces a complete-route loss
or changes the strict output contract.

A Bun 1.4.2 and Chromium 153 recheck preserved native selection: Bun's fallback was 57–96% slower in
both replays, while Chromium remained unresolved. Deno 2.9.6 reversed its earlier result and made
the fallback 26–27% faster. Detect Deno once at module load and treat its native method as
unavailable; this preserves the default build and lets every other host select by capability.
Recheck the exception after a Deno update and remove it when native no longer loses materially.

### Fixed-size portable base64url encoding

Encode 16-byte base64url payloads in five 24-bit groups plus the final byte. Keep the generic bit
accumulator for other lengths, alphabets, and tail widths. This specializes the UUID shape without
changing native delegation or the wire format.

Two 24-round packed comparisons on 2026-09-12 improved Node 24.20.0 plain encoding by 10–11%,
masked string encoding by 7–8%, and masked byte-input encoding by 9–10%. Every 95% median interval
excluded no change in both replays. Bun 1.4.1 uses native base64url encoding on these public routes
and remained unresolved around parity. Direct fallback profiles reached the same implementation on
Node, Bun, Deno, and Chromium; two runs put their median cost between 115 and 138 ns per payload.
Those absolute runs prove reachability and scale only; they do not rank algorithm alternatives.

Retest the fixed specialization if Node gains a native encoder or if UUID routes stop owning exactly
16 bytes. The generic path remains the contract owner for every other supported input shape.

### Fixed-size portable base32hex encoding

Encode 16-byte base32hex payloads in three five-byte groups plus the final byte. Keep the generic
bit accumulator for other lengths and tail widths. Base32hex has no native delegate, so every
runtime normally consumes this portable path.

Two 24-round packed comparisons on 2026-09-12 improved Node 24.20.0 direct portable encoding by
11–13% and public UUID-to-base32 conversion by 7–10%. Bun 1.4.1 was improved or unresolved on those
routes; no Bun route regressed. Deno 2.9.6 and Chromium 151 also improved on direct and public
conversion. Masked and sentinel encode routes were unresolved on every runtime; the complete-route
measurements could not distinguish the changed encoder there. Every cited improvement's 95% median
interval excluded no change in both replays.

Retest the fixed groups if UUID routes stop owning exactly 16 bytes or a runtime adds native
base32hex encoding. The generic path still owns all other input shapes.

### Fixed-size portable base64url decoding

Decode a 16-byte base64url payload as five complete four-character groups plus the final byte.
Keep the generic accumulator for every other length, alphabet, and tail width. Exact invalid-character
offsets and canonical trailing-bit rejection remain part of this specialized path.

Two 24-round packed comparisons on 2026-09-12 improved direct decoding by 12–13% on Node 24.20.0,
16–17% on Bun 1.4.1, 26–27% on Deno 2.9.6, and 22–24% on Chromium 151. Caller-owned public decoding
improved by 10–11%, 7–10%, 14–19%, and 13–15%, respectively. Every cited 95% median interval
excluded no change in both replays. Public allocated decoding also improved on Bun, Deno, and
Chromium in both replays; Node improved by 4–5%, but one interval included no change.

Retest the fixed decoder if UUID routes stop decoding exactly 16 bytes or use a tail width other than
zero or four. The generic path remains responsible for every other supported shape.

### Fixed-size portable base32hex decoding

Decode a 16-byte base32hex payload as three complete eight-character groups plus the final byte.
Reset the accumulator per complete group and keep the generic decoder for every other shape.

Two 24-round packed comparisons on 2026-09-12 improved direct decoding by 12–14% on Bun 1.4.1,
8–10% on Deno 2.9.6, and 7–9% on Chromium 151. Bun public decoding improved by 4.6–4.8%; every
cited interval excluded no change in both replays. Node 24.20.0 stayed unresolved around parity.
Masked and sentinel routes were unresolved; one 2.3% Node caller-owned masked regression appeared
only in the first replay. Exact invalid offsets, canonical low bits, every tail value, and decoded
bytes passed direct mutation-checked tests before measurement.

Two later 24-round packed replays on Node 26.8.2 and Bun 1.4.2 tested deleting this specialization.
The generic decoder was 12–17% slower on direct base32hex decoding in both runs and both runtimes;
public and masked routes were smaller or unresolved. Keep the specialization while fixed 16-byte
decode remains a public hot path; runtime evolution strengthened rather than erased its value.

Retest this grouping if UUID routes stop decoding exactly 16 bytes or use a tail width other than
zero or two. The generic path remains responsible for every other supported shape.

Regex prevalidation followed by fixed bit formulas was rejected. An eight-round packed screen
regressed direct decoding by 23% on Node, 31% on Deno, and 22% on Chromium; Bun was unresolved.
Retest only if primary engines materially change regex or fixed-index string access.

Both fixed decoders check validity once after decoding: they OR every character code and every
table digit, then rescan only a rejected value to report its first invalid offset. Two packed
`17e2f97`-to-candidate replays on 2026-09-16 measured median ratios; every listed pair had its 95%
interval below 1 unless marked unresolved:

| Runtime | `plain.decode` | `value.parse.slug` | `base32.decode` | `portable.base32.decode` |
| --- | ---: | ---: | ---: | ---: |
| Node 26.8.2 | 0.90, 0.89 | 0.85, 0.88 | 0.85, 0.86 | 0.65, 0.63 |
| Bun 1.4.2 | 0.83, 0.88 | 0.83, 0.82 | 0.77, 0.78 | 0.63, 0.64 |
| Node 24.21.0 | 0.94, 0.88 | 0.90, 0.87 | 0.85, 0.89 unresolved | 0.66, 0.66 |
| Chromium 153 | unresolved, unresolved | 0.89, unresolved | 0.85, 0.88 | 0.59, 0.55 |
| Deno 2.9.6 | unresolved, unresolved | unresolved, unresolved | 0.88, 0.92 | 0.70, 0.70 |
| Node 26.8.2 JITless | 0.95, unresolved | 0.92, 0.93 | 0.90, 0.91 | 0.82, 0.82 |

Masked decoding moved by at most 8% and was mostly unresolved because HalfSipHash dominates it;
two single Chromium replays read 1.005 and 1.024 slower and did not reproduce. Tests reject a
non-ASCII character whose low seven bits alias a valid digit at every offset.

### Plain base64url slug-to-UUID formatting

Direct JavaScript decoding into canonical UUID text was rejected. One six-round packed comparison
made `slugToUuidString` 46–47% slower on Node 26.8.2 and about 100% slower on Bun 1.4.2 while adding about
0.77 KiB to the minified UUID module. Avoiding one 16-byte array did not repay fixed-block decode and
hex assembly; the current byte decoder plus runtime-selected formatter remains smaller and faster.
Reconsider only if the native formatter disappears or a direct string primitive replaces JavaScript
concatenation.

### Plain base32hex slug-to-UUID formatting

Direct JavaScript decoding into canonical UUID text was rejected. One six-round packed comparison
made `slugToUuidString` 28–29% slower on Node 26.8.2 and about 115% slower on Bun 1.4.2 while adding about
0.44 KiB to the minified UUID module. Avoiding one 16-byte array did not repay bit accumulation and
hex assembly; the current fixed decoder plus runtime-selected formatter remains smaller and faster.
Reconsider only if the native formatter disappears or a direct string primitive replaces JavaScript
concatenation.

### UUID text to plain slug

Converting UUID text to a plain slug parses into reused 16-byte scratch and encodes it through the
shared writer. Separate text-to-slug writers, which read hex pairs from validated text and
concatenated characters, were deleted. The parser copies into caller-owned output with a byte loop:
`Uint8Array#set` made Bun `plain.encode` 1.20 times slower in two replays of an earlier candidate.

Two packed `22d3055`-to-candidate replays on 2026-09-16 measured median ratios, including the
Latin-1 writer above; every listed pair had its 95% interval below 1 unless marked:

| Runtime | `plain.encode` | `base32.encode` | `parse.into` |
| --- | ---: | ---: | ---: |
| Node 26.8.2 | 0.71, 0.75 | 0.50, 0.48 | unresolved, unresolved |
| Bun 1.4.2 | unresolved, unresolved | 0.29, 0.29 | unresolved, unresolved |
| Node 24.21.0 | 0.46, 0.46 | 0.41, 0.43 | 0.95, 0.96 |
| Chromium 153 | 0.90, 0.95 | 0.91, 0.90 | unresolved, 0.99 |
| Deno 2.9.6 | 0.53, 0.49 | 0.48, 0.46 | unresolved, unresolved |
| Node 26.8.2 JITless | 1.44, 1.50 slower | 0.59, 0.61 | 1.17, 1.18 slower |

Text-to-slug conversion allocates no array; the resource gate holds that budget at zero.

### UUIDv7 text bounds

Bounds timings must read both returned endpoint strings. Object-only consumption does not measure
the cost of reading or flattening those strings; the older packed bounds timings below use that
weaker sink and cannot establish the consumer formatting cost.

Two packed comparisons against `40f3628` on 2026-10-02 read changing character positions in both
endpoints and compared a fixed character-code prefix with the byte-pair writer. Bun retained byte
pairs. Lowercase, uppercase and interval calls improved on Node 26.10.0 (ratios 0.64–0.71), Chromium
153.0.8010.12 (0.60–0.66) and Deno 2.9.7 (0.63–0.68). Firefox 155.0 and WebKit 26.6 did not separate
in both runs. Node 26.10.0 JITless regressed for lowercase and uppercase in both runs (1.09–1.12);
the interval regression separated in only one. Reject this selection without a JITless exception. Each comparison
used six alternating rounds; these local observations do not prove other releases or cold-start
cost. The resource gate requires both endpoint reads and no per-call byte-array allocation.

The retained selection shares Node's startup JITless flag with UUIDv4 generation: byte pairs on
Bun and JITless Node, fixed character codes elsewhere. Two further seven-runtime packed replays
against `40f3628` retained the bounds gains on Node 26.10.0 (0.629–0.712), Chromium (0.59–0.66)
and Deno 2.9.7 (0.64–0.68). Bun, JITless Node, Firefox and WebKit did not show a repeated separated
bounds loss. Two additional replays include uppercase UUIDv4 and Web Crypto references; no
successful measured row is slower in both. These filtered warm comparisons do not establish
whole-package parity, cold initialization cost, other hardware, or all runtime releases.

Installed-release replays cover Node 22.23.2, 24.20.0, 24.21.0, 26.8.1, 26.8.2 and 26.10.0,
with and without the JIT, and Bun 1.3.14, 1.4.0, 1.4.1 and 1.4.2. Each has two six-round packed
comparisons of bounds, UUIDv4 text and bytes, and formatting. No successful measured row is
slower in both replays; individual separated losses do not establish identical cost or a repeatable
regression. Real compiled-package child processes check CLI and `NODE_OPTIONS`
precedence against V8 executable-heap state; removing JITless bounds selection fails that oracle.

Warm constructor counters require zero temporary byte arrays for text bounds and reads of both
endpoints. Native profiles complete the selected corpus on Node, Bun, Deno and Chromium, with a
separate compiled Node JITless capture. Short heap deltas include collector noise; Deno lacks
forced collection, and these captures do not prove leak freedom or compare first-use table cost.
Firefox and WebKit native profiling remains unmeasured.

UUIDv7 text bounds format the timestamp directly instead of allocating byte bounds and passing them
through the generic formatter. Three million-call rounds on 2026-09-14 measured the direct form at
about 42% of the composed path's time on Node 24.21.0 and about 90% on Bun 1.4.2. This isolated local
comparison varied only the formatter and checked identical output; it does not measure installed
package import cost, memory retention, other runtimes, or consumer frequency. Recheck if UUID text
formatting or engine string handling changes.

The timestamp is formatted from a lazily built table of 256 byte-pair strings instead of
`Number.prototype.toString(16)`. Two packed `ec67d78`-to-candidate replays on 2026-09-16 measured
`v7.bounds.text` medians, with every 95% paired-ratio interval below 1:

| Runtime | Baseline ns | Candidate ns | Ratio |
| --- | ---: | ---: | ---: |
| Node 26.8.2 | 505, 506 | 83, 84 | 0.17, 0.17 |
| Bun 1.4.2 | 133, 133 | 57, 52 | 0.43, 0.39 |
| Chromium 153 | 491, 498 | 80, 80 | 0.16, 0.16 |
| Deno 2.9.6 | 493, 492 | 83, 83 | 0.17, 0.17 |
| Node 26.8.2 JITless | 891, 888 | 471, 466 | 0.53, 0.52 |

`v7.bounds.bytes`, which the change does not reach, stayed unresolved on every runtime. An isolated probe,
one process per variant, formatted both endpoints in about 600 ns with `toString(16)` on Node 26.8.2
and Node 24.21.0 against 65 and 64 ns with byte pairs. Per-nibble lookups without a table took
112 ns on Node 26.8.2 and 51 ns on Bun against 65 and 27 ns for byte pairs. Node 24.21.0 was probed
but not replayed through the packed comparison. Recheck if V8 speeds up `toString(16)` for
millisecond timestamps.

The shared one-millisecond profile completed both text and byte bounds on Node 24.21.0, Bun 1.4.2,
Deno 2.9.6, and Chromium 151. Resource counters observed no byte-array allocation for text bounds
and exactly the two returned arrays for byte bounds.

### Portable UUIDv7 timestamp writes

Select the fixed 48-bit timestamp writer once when the module loads. Bun keeps the six-byte loop;
other runtimes split the timestamp into one high 16-bit word and one low 32-bit word. The split
avoids five iterative divisions on V8 without adding a branch to each UUID write.

Two packed comparisons on 2026-09-11 used 24 alternating rounds on Node 24.20.0, Bun 1.4.1,
Deno 2.9.6, and Chromium 151. Each interval is the exact distribution-free 95% interval for the
median paired ratio. Node's caller-owned continuation route improved by 6.8% and 8.6%, and its
advancing-clock route improved by 14.8% and 14.3%. Chromium's caller-owned continuation route
improved by 13.3% and 12.3%; its advancing-clock route improved by 4.4% and 5.0%. Those intervals
excluded no change in both replays. Bun had no significant regression in either replay; its byte
route ranged from a 0.6% to a 4.1% slower median with intervals crossing no change. Deno improved
on caller-owned continuation, advancing-clock, and rollback routes in both replays.

A universal word writer was rejected because Bun's advancing and rollback routes regressed by
6.2% and 5.3%. A per-call runtime branch was rejected because it slowed Bun byte routes by 4–10%.
The module-selected function keeps one implementation per engine without recurring dispatch cost.
Replace this split if JavaScriptCore no longer favors the loop or V8 no longer favors fixed writes.

### Portable UUIDv7 profile coverage

Profile the portable generator directly even when a runtime provides native UUIDv7 generation.
The shared corpus covers strings, owned and caller-owned bytes, explicit timestamps, steady
same-millisecond generation, advancing and rollback clocks, entropy-pool refills, and generation
through both slug alphabets. The slug cases combine the forced portable generator with the package's
production encoders, so native generation cannot hide fallback work.

Routine and native-instrumented runs on 2026-09-12 each emitted every portable case on Node 24.20.0,
Bun 1.4.1, Deno 2.9.6, and Chromium 151. The native run captured CPU, allocation, retained heap,
runtime memory, and event-loop traces through each host's available instruments. Every synchronous
portable case kept its longest measured batch below 1 ms and its longest uninterrupted interval
below 2.5 ms. These profiles locate work and responsiveness boundaries; they do not rank candidate
implementations without paired repeated comparisons.

### Portable UUIDv7 entropy draw

Draw the ten bytes the portable UUIDv7 layout consumes: six seed the 42-bit sequence and four fill
the random tail. The timestamp, version, variant, and sequence fields replace the other six bytes of
a 16-byte draw, so copying them from the entropy pool cannot affect the result. Change the draw size
only if the portable layout starts consuming more entropy bits.

Two packed comparisons on 2026-09-12 used 24 alternating rounds on Node 24.20.0, Bun 1.4.1,
Deno 2.9.6, and Chromium 151. Node byte-oriented routes improved by 10–17%; Bun improved by 4–8%.
Deno and Chromium byte-oriented routes improved by 4–19%. The corresponding 95% median intervals
excluded no change in both replays. String and slug pipelines improved less because formatting
dominates them. The unrelated portable UUIDv4 control was unresolved in the second replay.

The 16-byte private draw was rejected because six copied bytes had no path to the UUID. The retained
payload-bit test discovers the requested draw length and proves that its bits remain independent and
cover every non-structural random payload bit instead of pinning an internal buffer size.

On same-millisecond and rollback continuation, refill only the four random tail bytes. The six-byte
sequence seed remains live state and is not read from the entropy buffer again. Two 24-round packed
comparisons on 2026-09-12 improved Node owned and caller-owned byte routes by 8.1–12.5% and
11.6–17.8%; Bun improved them by 6.7–7.4% and 7.4–8.2%. Rollback improved by 11.3–14.9% on Node
and 8.5–8.8% on Bun. Every interval excluded no change in both replays. Bun advancing-time and
explicit-time controls were unresolved; Node explicit-time caller output moved despite using the
unchanged full draw, so it is not evidence for this mechanism. The portable UUIDv4 control was
unresolved in both replays.

Refilling all ten bytes on continuation was rejected because six newly copied seed bytes are ignored.
Restore it only if continuation begins consuming a new seed or a runtime makes the four-byte draw
reproducibly slower on a complete affected route.

Four fixed tail assignments were rejected in favor of the compact four-iteration copy loop. A
24-round packed comparison on 2026-09-12 found no distinct Node or Bun byte-route gain, while Bun
string generation regressed 1.3% with its 95% median interval above no change. Reconsider direct
writes only if a primary runtime shows a complete-route gain without regressing another output form.

`Uint8Array#set` was rejected for the same four-byte copy. One 24-round packed comparison regressed
Node portable routes by 3–21% and Bun routes by 6–42%. Bun's unrelated UUIDv4 control also regressed
8%, but every Bun v7 route lost more and Node independently showed the same direction. Reconsider
bulk copy only if the copied region grows enough to amortize its call overhead.

A single safe-integer sequence state was rejected in favor of separate 10-bit and 32-bit words.
Two 12-round replays on 2026-09-12 made Bun continuation bytes 16–20% slower, advancing reseeds
18–19% slower, rollback 17–19% slower, and explicit-time byte routes 36–47% slower. Node advancing
reseeds improved 5–6%, but explicit-time byte routes regressed 5–8%. Packing simplifies increment
and overflow, but every output pays division to recover the high word. Rollover, rollback, reseed,
caller-owned output, and native fallback contracts passed their focused lanes. Reconsider only if
primary engines remove the complete-route losses.

Skipping `checkRange` for package-owned output at offset zero was rejected. In two 24-round packed
comparisons, Bun ordinary owned bytes improved 7.8% in both replays. Node improved 5.2% once, then
was unresolved, while Node explicit-time owned bytes regressed 5.1–5.4% in both replays. Both owned
routes skipped the same check, so the conflicting Node result does not support a general mechanism
win. Retain the shared direct check unless both Node routes improve without nested hot-path branches.

Hoisting non-number clock rejection before truncation was rejected. An eight-round packed screen
left every portable route statistically unresolved on Node, Bun, Deno, and Chromium, while the
candidate duplicated the invalid-clock error construction. Retest only if a primary engine changes
its treatment of repeated `typeof` checks on monomorphic numeric values.

Portable UUIDv7 keeps ten-byte initial draws, four-byte continuation draws, split sequence words,
module-selected timestamp writes, and direct caller-owned writes. These choices preserve its 42-bit
randomized sequence, fresh 32-bit continuation tail, atomic failure, and caller-buffer contract.
They do not establish an implementation frontier: the original candidate set omitted direct-string
competitor designs and treated an earlier formatter result as independent of later hot-path changes.
Re-run formatter and dispatch candidates after material surrounding changes, with the platform and
fastest live competitor as external floors.

Codec-construction alphabet wrappers were rejected. Four literal-alphabet wrappers let the codec
select base64url or base32hex masking once, but still called the shared implementation. An
eight-round packed screen left base64url string and byte encoding and base32hex string encoding
statistically unresolved on both Node 24.20.0 and Bun 1.4.1; paired median ratios ranged from 0.98
to 1.04 and every 95% interval crossed 1. Keep the direct call and its one alphabet branch. Retest
only if a primary engine stops specializing the codec's captured alphabet across that call.

Built-in mask exception bypass was rejected. Marking built-in mask handles as non-throwing added
a protocol field and a per-call branch so only custom callbacks entered `try`/`catch`. Two
eight-round packed screens found no repeatable built-in win. Node timestamp extraction regressed
4.1–6.5% in both screens; one screen also regressed caller-owned decode by 9.3%. Custom Node decode
regressed 7.7% in the second screen, showing that the shared branch moved cost onto the protected
extension path. Existing Node and Bun tests failed when the custom catch was removed, proving they
detect lost exception containment and original-cause preservation. Keep one contained path; retest
only if an engine demonstrates material exception-region overhead without adding hot-path dispatch.

Private built-in mask dispatch was rejected. A local `WeakMap` associated built-in handles with
their Feistel keys, preserving the existing callback protocol for custom and duplicate-copy handles
while dispatching local built-ins directly. Two eight-round packed screens found no statistically
distinct built-in route on Node 24.20.0 or Bun 1.4.1. The first screen regressed Node custom decode
by 2.7–9.8%; that loss did not repeat, but no built-in gain emerged to pay for the map, lookup, and
second constructor. Reversing only the direct branch failed six frozen built-in wire vectors while
custom vectors passed. Keep the single callback protocol; retest only if direct dispatch produces a
repeatable primary-runtime route gain large enough to exceed its compatibility machinery.

Mask seed encoding is selected by the runtime module. Node uses `Buffer.from`; Bun, Deno, and
Chromium reuse one `TextEncoder`. Two 24-round packed comparisons on 2026-09-12 improved Node string
construction by 16.2–16.4% and its iterated route by 9.0–9.1%. Chromium improved the same routes by
15.4–16.0% and 9.8–11.6%. Bun was unresolved in the first replay and improved string construction
4.0% in the second; Deno stayed unresolved. Byte-seed construction stayed unresolved on every
runtime in both replays, so the gain did not move work onto the no-encoding route. Node and Bun
functional tests covered synchronous and cooperative UTF-8 boundaries, and a result-changing
encoding mutation failed that oracle before timing.

Constructing a fresh `TextEncoder` per seed was retained in neither adapter. Reusing one encoder
alone did not produce a repeated primary-runtime gain. Packing each four encoded bytes into one
word reduced loop iterations in an initial screen, but two 24-round replays did not reproduce the
gain; the extra tail path therefore had no measured value. Adding encoding to the `Runtime` object
was also rejected: conditional module resolution already selects exactly one implementation, so an
optional method would expose no capability distinction and would add a property dispatch. Retest
these choices if a primary runtime changes its UTF-8 primitive or the complete construction route
stops preserving the gains above.

Lazy runtime-adapter loading was rejected. Two fresh-process profiles on 2026-09-12 measured root
dynamic import at 5.23/4.13 ms on Node 26.8.2, 1.75/1.62 ms on Bun 1.4.2, and 2.57/2.58 ms on Deno
2.9.6. Two browser launches measured 24 fresh-page imports at 3.10–3.80 ms in Chromium. These clocks
exclude process or browser launch and use warm filesystem caches; they combine parsing with module
evaluation, so they cannot rank either component alone. That finer attribution cannot turn the
decision while total import remains low-single-digit milliseconds and no startup workload makes it
material.

The package import map selects exactly one adapter before evaluation. Its capability probes perform
no entropy draw, and UUIDv7 generator state remains lazy until first generation. Dynamic adapter
loading would therefore move evaluation into a warm synchronous call or change that call to async;
it cannot remove the work. Replacing Node's adapter with Web Crypto would discard native UUID hooks
and its synchronous entropy boundary, while removing Bun's web-adapter import would duplicate the
portable entropy fallback. Keep conditional adapter selection, module-load probes, and lazy generator
state. Retest only when a measured consumer startup budget makes import material or a synchronous
runtime gains deferred module evaluation that can preserve the public call shape.

Module-level UUIDv7 text and bytes use separate lazy portable state and do not coordinate ordering.
Callers who need strict ordering use `createUuidV7Generator`.

Two repeated complete-route comparisons on 2026-09-14 measured Node 24.21.0, Bun 1.4.2, Deno 2.9.6,
and Chromium 153. Module text and a directly called created generator had overlapping sample ranges
on Node, Deno, and Chromium. Bun's module wrapper had a 107.9 ns and 116.8 ns median against 106.1 ns
and 109.2 ns for the direct generator; one replay overlapped and one showed a small wrapper cost.
A fresh-random-payload module candidate cost 226 ns on Node, 334 ns on Bun, 176 ns on Deno, and
166 ns on Chromium in its smoke comparison, versus 178 ns, 125 ns, 152 ns, and 164 ns for the
counter path. Smoke timings are directional only, but the large Bun loss and no reproduced win on
higher-priority Node reject the extra entropy work.

Validating every native result rejected native dispatch on 2026-09-12: two focused replays measured
Node native at 234 ns and 240 ns against 147 ns and 156 ns portable, and two broader replays
measured Bun native at 121 ns against 111 ns and 112 ns portable. Native floors supersedes the Bun
decision: Bun trusts native output directly without result validation or identity tracking.
Node keeps portable UUIDv7 text.

### Portable UUIDv4 ownership paths

Draw entropy directly into package-owned output. Keep caller-owned output on a separate path that
draws into private storage before copying, so entropy failure cannot partly modify caller data and
Web Crypto never receives an unsupported caller view.

Two packed comparisons on 2026-09-11 used 24 alternating rounds on Node 24.20.0, Bun 1.4.1,
Deno 2.9.6, and Chromium 151. Owned byte generation improved by 10.7–13.3% on Node, 30.2–33.2%
on Bun, and 7.4–9.3% on Chromium. Bun base64url and base32hex slug generation improved by
7.9–10.8% and 7.7–9.3%. Each interval excluded no change in both replays. Caller-owned writes
were unresolved on Node, Bun, and Chromium and improved by 10.1–12.2% on Deno.

The exact private text fallback was measured independently even where the public string route uses
a native API. Two 96-round replays improved it by 2.7% and 4.2% on Node, 2.3% and 1.9% on Bun,
and 2.3% and 2.4% on Chromium; every 95% median interval excluded no change. Deno was unresolved.

A shared path with an ownership branch after the entropy draw was rejected because caller-owned
writes regressed by 4.1–4.3% on Bun and 4.3–5.7% on Deno. Moving the branch before the draw still
regressed Bun by 3.6–5.7%. The retained split duplicates the short guard and draw sequence to keep
both hot paths branch-free. Merge it if a primary runtime no longer improves owned output or if
caller-owned output regresses reproducibly.

Use the unchecked formatter only behind the generator-owned 16-byte text buffer. The earlier isolated
screen found no gain, but it omitted the allocation removal and direct competitor floor; the combined
public route was retained after the competitor matrix exposed that interaction. A direct byte-pair
formatter was re-screened after that discovery and lost on Chromium without closing Node or Deno.
The selected formatter and its later comparisons are described under UUID text formatting.
Replacing the entropy pool's copy-and-erase loop with `set(subarray)` plus ranged `fill` regressed
UUIDv4 byte routes by 57–88% on Node, 60–95% on Bun, 20–108% on Deno, and 65–87% on Chromium.
The allocated view and two native calls cost more than one 16-byte JavaScript loop.
A separate fixed-16 loop improved Node caller-owned UUIDv4 by 4.7–5.1% and Chromium UUIDv4 byte
routes, but Bun gained nothing and Node portable-v7 caller output regressed by 5.3% in one replay.
The extra dispatch moved JIT cost among pool consumers instead of reducing the shared work.

Pool sizes of 2, 4, 16, 32, and 64 KiB were compared twice with the retained 8 KiB size on
Node 26.8.2 and Bun 1.4.2; the 64 KiB endpoint was also compared twice on Deno 2.9.6 and
Chromium 153. For 16-byte requests, 8 KiB makes one source call per 512 ids and retains at most
8 KiB per runtime-module instance. Separate instances share no cursor or lock; larger pools only
reduce calls into the potentially contended platform source. Two KiB regressed Node by 5.8–8.6%
and Bun by 4.9–5.3%. Four KiB was unstable on Node. Sizes from 16 through 64 KiB did not produce
a repeatable gain on every primary runtime; 64 KiB regressed Bun by 1.3% in one full-runtime replay
and doubled Deno's worst observed batch from 0.051–0.078 ms to 0.107–0.110 ms in both tail replays.
Larger pools also retain and can discard proportionally more unused random bytes. Keep 8 KiB unless
a changed platform source moves both the primary-runtime crossover and complete-route latency.

A wrap-preserving cursor was rejected. Atomic refill failure requires keeping the old tail outside
the pool until the new draw succeeds; the smallest lawful variant allocated and erased a carry only
at wraps. It improved 10-byte generation on Node and Deno, and advancing-clock generation on Bun,
in two replays, but did not improve 4-byte continuation and left Chromium unresolved. An 8,160-byte
control divisible by every 4-, 10-, and 16-byte request removed homogeneous tail waste without the
cursor and was neutral on Node, Bun, and Deno; it also increased v4 source calls from one per 512 ids
to one per 510. The cursor's gains therefore did not isolate tail reuse and do not justify extra
allocation and failure state. Keep the one-buffer linear cursor; reconsider only if discarded-byte
measurement, not unrelated JIT movement, becomes material.

Compact bitsets do not fit the package's production Sets. Error codes form a closed vocabulary but
arrive as strings, so a bitset still needs a string-to-index classifier and duplicates the existing
runtime vocabulary. Sentinel names and UUIDs are caller-defined, sparse, and unbounded. Keep Sets
for both domains; reconsider a bitset only when the lookup key is already a bounded integer.

Migration state is already constructed only by the explicit `createUuidSlugMigrationDecoder` call.
Sentinel construction validates every definition and freezes the public list before returning the
codec; its maps serve ordinary string encode and decode, and its large byte index serves byte encode.
Deferring any remaining structure would add hidden mutable initialization and move eager work into
an unpredictable first call. Keep sentinel state eager and immutable.

## Allocation and key rotation

### Profiler batch size

The initial study selected 256 calls per timed batch. A geometric study on 2026-09-12 held the operation, warm-up,
five-millisecond sample, sink, and seven samples fixed while varying 1, 4, 16, 64, 256, 1024,
and 2048 calls on Node 24.20.0, Bun 1.4.1, Deno 2.9.6, and Chromium 152. It covered a prepared-string
control, ordinary UUID-to-slug conversion, and a 16-key last-hit decode.

Batches of 1–16 made clock and loop cost dominate the control. Sizes 64–1024 gave similar operation
throughput, but 256 kept the slow route below 0.95 ms per batch on every runtime. At 2048, that route
blocked for 4.34–6.03 ms and stretched a nominal five-millisecond sample to 8.24–9.02 ms. A configurable
batch-size surface was rejected because it would let unrelated runs silently use incomparable harnesses.
The fixed value required retesting when representative work exceeded one millisecond per batch.

Bun 1.4.2 and the complete construction inventory triggered another retest. Across three fresh
20-route replays per candidate, fixed 64 kept the largest ordinary host batch near 1 ms; fixed 256
reached 2.1–3.2 ms. Per-case geometric calibration matched fixed 64 on expensive routes but still
selected 256 for cheaper Chromium routes that later paused for 3.8–6.3 ms. Fixed 64 is the simpler
bound: it avoids calibration and its extra JIT state while retaining enough calls to amortize clocks.
It does not claim to bound runtime scheduling or collection. Stalls migrated between cheap cases,
and a native Chromium replay observed minor and major collection near 3.6 ms and microtask execution
at 4.7 ms. Adaptive calibration was rejected because those pauses are not predicted by warm batch cost.
Remove the separate untimed 2048-call burst that followed each completed warm-up: the 16/20/64 ms
same-code study found no later stable tier, while the fixed burst duplicated setup and inherited the
slow route's 4 ms violation. Host and browser profiling now enter measurement after the same elapsed
warm-up rule instead of adding operation-count-dependent work.

### Profiler warm-up

Use a 16 ms per-case warm-up. Identical packed-code comparisons on 2026-09-12 varied warm-up through
1, 4, 8, 16, 20, and 64 ms with 16 alternating rounds on Node 24.20.0, Bun 1.4.2, Deno 2.9.6,
and Chromium 152. They covered conversion, portable generation, and a 16-key decode. Bun 1.4.2
conversion reached the same measured tier at 16, 20, and 64 ms, and same-code comparisons at 16 ms
remained unresolved for all three routes. Longer warm-up therefore added setup without reproduced
stability value. This supersedes the Bun 1.4.1 probe, where 16 ms appeared to stop before a slower tier.

One 20 ms Deno run reported a false 3.3% same-code improvement; a 24-round replay was unresolved
with a 95% median interval of 0.965–1.027. This is why one significant interval cannot retain a
candidate: two independent full replays remain mandatory. Retest the warm-up boundary when a primary
runtime changes JIT tiers or when identical-code replays repeatedly report the same false direction.

The throughput driver `bench/run.ts` warms each operation for 1,000 iterations. On 2026-08-12,
raising that to 100,000 moved Node by under 2%, so longer warm-up buys nothing there.

### Profiler capture boundary

Corpus construction, outcome verification, case selection, and warm-up finish before inspector CPU and
allocation sampling starts. Process-exit profilers also include startup and warm-up. Chromium publishes its runner only after preparation; the driver
waits for the published runner rather than elapsed time. Profiler start and stop remain outside each
reported operation sample, but forced collection, reporting, host-task yields, and profiler sampling
remain inside the wider native capture.

A control-only native capture on 2026-09-12 used seven 2 ms samples after 20 ms of warm-up. The
control returns a prepared string, so it retains the same dispatch, batching, sink, clock, and yield
structure without exercising package logic:

| Runtime | Timed control work | Native capture | Process CPU during row |
| --- | ---: | ---: | ---: |
| Node 24.20.0 | 13.66 ms | 30.58 ms | 16.46 ms |
| Bun 1.4.1 | 13.68 ms | 50.86 ms | 17.26 ms |
| Deno 2.9.6 | 14.14 ms | 30.60 ms | 16.07 ms |
| Chromium 152 | 13.95 ms | 47.10 ms | unavailable |

The capture-minus-work gap bounds combined profiler and harness self-noise; it does not isolate
profiler start/stop cost. Eight direct captures after one discarded warm-up measured the median
inspector command round trips around a 1 ms busy interval:

| Runtime | Start | Stop |
| --- | ---: | ---: |
| Node 24.20.0 | 5.37 ms | 0.57 ms |
| Bun 1.4.1 | 0.003 ms | 0.051 ms |
| Deno 2.9.6 | 3.41 ms | 0.48 ms |
| Chromium 152 | 1.01 ms | 0.35 ms |

These are one local probe of command latency, not a stable runtime constant. Bun returned no sample
in two of eight one-millisecond captures, and CPU attribution is too sparse to infer profiler cost:
its control run emitted 39 samples, while Chromium attributed 16.70 ms to idle time. Use focused
filters and operation timings for comparisons; use native profiles to locate work, not to infer
per-call latency from capture duration.

### Primary UUIDv7 attribution

Two sequential captures on 2026-10-04 use Node 26.10.0, Bun 1.4.2, Deno 2.9.7 and Chromium,
with only `v7.string`, `v7.bytes` and `v7.slug` selected, seven 15 ms batches and 16 ms warm-up.
Raw files are in `bench/reports/primary-hotspots-current/` and
`bench/reports/primary-hotspots-repeat/`. Parent links distinguish public-call descendants from
harness, startup and collection samples. Both captures put formatting ahead of entropy copying
for text and slugs; owned-byte generation concentrates samples in the byte generator.

Node text formatting contributes 308 self samples in each capture, while clock reading contributes
125/149. Its slug writer contributes 216/236 and clock reading 140/146. Deno text formatting
contributes 295/295, and its owned-byte generator 613/606. Bun text descendants include native
string construction, the byte-to-text writer and clock reading; inlined case labels and anonymous
native frames prevent complete per-case attribution. Do not interpret missing case labels as zero work
or these sample counts as individual-call costs.

Inspector allocation sampling includes collected objects and uses a 4,096-byte sampling interval.
The byte-generator frame under scratch-backed text and slug calls estimates about 31–33 bytes per
completed call on Node and Deno, and 23–24 on Chromium, in both captures. The sequence helper
also has sampled allocation. This rules out assuming that reused output scratch eliminates all
generation allocation. It does not identify the allocating expression: boxed numbers, engine state
and inlined callees remain possible explanations. Owned output adds required array storage;
heap snapshots and post-GC deltas measure retention, not this allocation volume.

Process-exit profiles require their own completed-call records. The repeat preserves adjacent
`node-exit.jsonl`, `node-v8.jsonl`, `deno-cli.jsonl`, `bun-cpu.jsonl` and `bun-heap.jsonl`;
the first capture lacks those records and cannot support normalized allocation estimates for those
processes. Node and Deno inspector counts and Chromium counts come from the same captured processes.
Deno loads compiled output here, so normal TypeScript entry cost remains unmeasured. These are
two processes on one machine with fixed case order, not confidence bounds or competitor resource
parity. Investigate clock and sequence allocation and fewer string-construction steps before
another entropy-copy candidate; require a causal substitution and repeated complete-call gains
before changing production code.

Removing the clock wrapper alone does not remove the sampled allocation. Two source screens on
2026-10-04 compare `v7-draw inline-clock` with unchanged generation on Node 26.10.0, Bun 1.4.2
and Deno 2.9.7. Each screen runs two fresh processes per candidate/runtime in reversed order,
with three 5 ms batches after 16 ms warm-up. Both behavior and counted-resource proofs pass.
Bun text and slug directions reverse in the first screen; the repeat's owned bytes lose at
52.90/54.25 ns against 49.94/50.25 ns. Node and Deno effects vary. Reject this shared substitution;
these short samples establish neither equivalence nor an engine-level limit.

Fixed Float64 storage isolates mutable numeric state from the same clock, entropy, sequence and
formatting work (`v7-numeric-state-screen.log`, `v7-numeric-state-repeat.log`, 2026-10-04).
Node 26.10.0, Bun 1.4.2 and Deno 2.9.7 each use two fresh processes per screen, reversed second
order, seven 10 ms batches and 32 ms warm-up. The timestamp mutation fails both owning runtime
clock witnesses before timing (`v7-numeric-state-mutation.log`). Intact behavior and counted
resources pass. Node owned bytes favor the candidate in all four processes, but Bun text and
byte gains do not reproduce: one repeat reads 88.99 versus 81.96 ns for text and 62.51 versus
45.65 ns for bytes. Deno slug directions also vary. Reject shared retention rather than funding
broader timing or generator-construction work from these inconsistent primary-call effects.

Four sequential Node inspector captures use only `v7.string`, five 100 ms batches, 32 ms warm-up,
a 4,096-byte allocation sampling interval and collected-object sampling. Order is baseline,
candidate, candidate, baseline; adjacent call counts are 4,080,000, 4,305,664, 4,135,424 and
4,163,584 (`candidates-v7-draw-vgbib6/node-state-*/`). `advanceSequence` self allocation estimates
33,061,872 and 30,915,472 bytes for the baseline, versus 4,352 and zero for the candidate.
The byte-generator frame still estimates 131,713,936 and 132,657,872 baseline bytes versus
137,225,616 and 133,093,448 candidate bytes: about 32 bytes per completed call on both sides.
Profile-wide estimates fall from about 97–98 to 90 bytes per call, including harness and reporting.
The unchanged string-construction frame stays about 56 bytes per call, so the sequence reduction
is not merely a matching increase there. These sampled estimates identify an effect of state
representation; they do not prove numeric boxing, gross allocation, or cross-runtime resource parity.
Isolate counter storage from timestamp storage before choosing a smaller retained representation.

The five-process competitor refresh (`v7-text-priority-current.jsonl`) uses nine 20 ms batches and
32 ms warm-up on the same observed runtime releases plus Chromium 153.0.8010.12 and Node 24.21.0.
Bun package/default text medians range from 70.90 to 75.22 ns; native Bun medians range from
46.47 to 56.88 ns, with package/native median ratio 1.468. Native clock-overflow behavior remains
a separate adoption constraint; its lower cost remains the target. This bundled corpus checks
priority, not installed-package cost, allocation parity, or individual-call latency.

Counter-only state evidence (2026-10-04): `candidates-v7-draw-Adpjya` and
`candidates-v7-draw-Xm7MsF` compare two Float64 or Uint32 counter slots against numeric closure
words, leaving timestamp and high-water storage unchanged. Each screen passes Node and Bun
behavior and resource checks before timing. Each runtime has two fresh processes per candidate,
with reversed candidate order; each process records seven 15 ms batches after 16 ms warm-up.
The first screen includes Deno; its second-order byte and baseline-text results vary substantially,
so they do not establish a stable Deno effect. The repeat isolates Node Current and Bun.
Uint32 text costs exceed the Node baseline in all four processes. Float64 text, byte and slug
directions vary; these screens do not establish a complete-call throughput advantage or equivalence.

The `counter-uint32-lost-carry` substitution in `candidates-v7-draw-Us5Xw7` fails the timestamp
ceiling and caller-output assertion in both Node and Bun; Node also rejects fraction and timestamp
overflow. No new guarantee is imposed. Four sequential Node v26.10.0 inspector captures under
`candidates-v7-draw-Xm7MsF/counter-profile-*` select only default UUIDv7 text in baseline,
Float64, Float64, baseline order. Completed-call counts are 831,552 / 921,344 / 892,224 / 844,928.
Sequence-frame self allocation is 5,745,600 / 0 / 4,128 / 5,803,056 sampled bytes, approximately
6.9 / 0 / 0.005 / 6.9 bytes per completed call. Sampling begins after correctness and warm-up.
Timestamp storage is unchanged, so counter storage alone accounts for this sampled-frame reduction;
the exact allocating expression remains unresolved. Profiles still contain output strings,
generation, harness and reporting allocation. Two pairs and sampled stacks do not prove gross
allocation, retained storage, packed throughput or generator-construction parity. Keep production
unchanged unless complete-call trade-offs justify the extra array.

`counter-storage-packed.log` compares the same packed revision with and without Float64 counters
on Node Current and Bun, with eight fresh process pairs and 15 ms observations. Every selected
result is unresolved. Its filter misspells `v7.at.bytes` as `v7.bytes.at`, so it does not measure
configured byte output. `counter-storage-packed-repeat.log` uses the correct name, asserts all five
requested cases on both hosts, and retains twelve fresh process pairs with 45 ms observations and
64 ms warm-up. Node default construction is 1.078 [1.057, 1.107] candidate/baseline; Bun construction
is 1.044 [1.025, 1.052] and owned bytes are 1.024 [1.002, 1.042]. Ordinary text and slug gains remain
unresolved. Reject shared Float64 retention: sampled sequence allocation savings do not justify
these construction and primary-call losses. Neither comparison proves an immutable bound on other
counter representations or a runtime-specific implementation.

`candidates-v7-draw-BGz2Hz` and `candidates-v7-draw-wNOMf3` compare 30/12 and 31/11 closure
counter splits without an extra array, using the same screen controls on Node, Bun and Deno.
Both splits pass behavior and resource checks. Node owned-byte medians improve in all four
processes; text and slug direction varies, as do Bun and Deno results. The low30 lost-carry
mutation in `candidates-v7-draw-TTkWbE` fails the shared Node/Bun ceiling and caller-output oracle;
Node additionally rejects fraction-bucket carry loss. Four sequential Node captures under
`candidates-v7-draw-wNOMf3/narrow-profile-*` use baseline, low31, low31, baseline order with
741,696 / 292,736 / 753,152 / 812,736 completed text calls. Sequence-frame self allocation is
0 / 0 / 0 / 6,233,984 bytes; byte-generator self allocation is
29,877,216 / 9,431,008 / 23,926,352 / 25,514,608 bytes. Combining both frames yields approximately
40.3 / 32.2 / 31.8 / 39.1 sampled bytes per completed call. The first baseline has no sequence
samples but more byte-frame allocation, so missing sequence samples alone cannot prove elimination.
Counter representation changes this combined allocation without adding retained storage; the
allocating expression and packed throughput remain unresolved. The slower first candidate capture
has its own lower call count; it does not license borrowing another process's denominator.

Keep the narrower counter unresolved until independent packed measurements bound its trade-offs.
`counter-low31-packed.log` and `counter-low31-packed-repeat.log` each compare twelve fresh
process pairs on Node v26.10.0 and Bun v1.4.2, with 45 ms observations after 64 ms warm-up.
Both return every requested case: ordinary text, owned bytes, slugs, explicit-time bytes and
default generator construction. Each summary contains twelve baseline and candidate observations.
The first Node owned-byte ratio is 0.972 [0.964, 0.988]; its repeat is
0.971 [0.904, 1.013]. Every other interval includes parity in both comparisons.
The repeat contains substantial lost execution time: a Node baseline byte batch receives
355 microseconds of process CPU time over 67.469 ms of wall time, and a Bun baseline byte batch
receives 21,918 microseconds over 450.324 ms. Process CPU includes all process threads;
these discrepancies establish lost execution time without identifying its host cause.
Retain those observations rather than filtering them away. Batch averages do not prove
individual-call latency, and these conditional intervals do not establish equivalence or a
reproduced throughput gain. Lower sampled Node allocation remains a reason to investigate,
not sufficient evidence to change production or select a runtime-specific implementation.

`counter-low31-packed-long.log` extends the same five-case Node Current/Bun comparison to
120 ms observations and 128 ms warm-up, preserving twelve fresh process pairs.
The Node byte median ratio is 0.962; the paired median ratio is 0.973 with a
95% interval [0.932, 0.990]. Every other interval includes parity. Longer windows do not
remove execution interference: minimum process-CPU/wall ratios across retained observations
are 0.030 on Node and 0.006 on Bun. Do not interpret unresolved Bun results as equivalence.

`counter-low31-packed-secondary.log` checks the same exact cases and sample counts on
Node v24.21.0, Chromium and Deno v2.9.7 with 60 ms observations and 64 ms warm-up.
Every Node LTS and Chromium interval includes parity. Deno text has paired median ratio
0.983 [0.944, 0.998]; its other cases remain unresolved. This single Deno comparison does
not establish a reproduced gain. All requested case names and per-revision observation counts
match in both reports. Keep shared retention open: the Node byte gain appears in two
packed comparisons, but the remaining intervals still permit primary-call or construction losses.
Runtime-specific selection also remains unmeasured; its dispatch and ownership costs cannot be
inferred from these shared source substitutions.

Defer further counter refinements while the larger Bun default-text gap remains open.
`counter-direct-screen.log` and `counter-direct-repeat.log` compare reconstructed and direct
31/11 counter writes in two fresh process orders on Node, Bun and Deno, with seven 15 ms
batches and 16 ms warm-up. Both intact candidates pass behavior and counted resources.
The direct writer's lost-bit mutation in `candidates-v7-draw-6ZeOjC` fails the shared payload-bit
oracle in Node and Bun; Node also rejects explicit-time fraction loss. Node byte screens improve
against baseline, but Bun primary-call effects vary. These small screens establish no packed
advantage, construction parity or negligible loss; they do not justify adoption.

Two fresh Bun default-text captures in `v7-bun-priority/first` and `repeat` use seven 40 ms
batches after 32 ms warm-up. Parent-linked samples beneath the public `generateUuidV7` call
total 240/237 out of 267/271 profile samples. The Latin-1 formatter and native `toString`
contribute 108/116 combined self samples; `readClock` contributes 56/61. This ranking supports
text construction before counter or pool-copy work. CLI profiles include startup and corpus
checks; parent restriction excludes unrelated frames but cannot separate setup calls to the same
function. Inlining and coarse CPU sampling also limit exact cost attribution.
Bun's Buffer `latin1Slice` is callable and preserves the probed ASCII text; ordinary
`toString("latin1")` does not call an overridden `latin1Slice` property. That positive probe
identifies a direct-string-construction experiment, not a speedup or a supported public capability.

The complete-call screen `candidates-format-xLIUBN` on Bun 1.4.2 compares captured
`latin1Slice` with the existing generic text call in two reversed fresh-process orders.
Default UUIDv7 text reads 85.23/88.49 ns against 91.34/90.81 ns; uppercase reads
71.29/75.11 against 82.42/79.49, and byte-to-text conversion reads 38.38/38.87 against
42.21/41.29. Byte and slug controls vary without a consistent gain. Both candidates pass
the owning behavior tests and counted resources; `candidates-format-jV2RlI` rejects the
missing-final-character mutation in Bun's independent text oracle before timing.
These process orders are a screen, not an uncertainty bound or retained-heap comparison.
The source screen alone does not establish retention. The packed comparisons below supersede
the rejection based only on the saving's size; a reproduced saving in the hottest default-call
component can reduce the gap without closing it. Cold construction, absent-method behavior
and native exceptions still require evidence before production selection.

Direct Latin-1 construction survives the primary-host packed timing comparison.
On 2026-10-04, `primary-direct-latin1-current-screen.log` compares the retained fixed formatter
with `format direct-latin1` on Node 26.10.0 and Bun 1.4.2. Both intact forms pass behavior and
counted resources. `primary-direct-latin1-current-mutation.log` rejects the missing final
character at the independent Bun text assertion before packed timing.
Two packed comparisons each use six fresh-process pairs, one 20 ms batch and 32 ms warm-up.
Bun default-text median ratios are 0.936 [0.925, 0.989] and 0.961 [0.871, 0.968]; uppercase
ratios are 0.954 [0.942, 0.975] and 0.950 [0.912, 0.975]. Conversion ratios are 0.921
[0.886, 0.964] and 0.947 [0.881, 0.955]. Node and Bun byte/slug controls have unresolved
intervals; those intervals do not establish negligible loss. Primary timing warrants integration
checks, not adoption: fallback behavior, construction resources and affected-call profiles
remain unverified. The native UUIDv7 gap stays open. These are batch
throughput observations from one machine, not independent-call latency or total allocation.
`primary-direct-latin1-packed.log` and `primary-direct-latin1-packed-repeat.log` retain raw
observations; `packed-source-uHpPDY/` and `packed-source-JKb0I0/` retain the packed sources.

The remaining-runtime replay prevents adoption of this source form. Six fresh-process pairs
with one batch per process compare Chromium 153.0.8010.12, Firefox 155.0, WebKit 26.6, Deno 2.9.7
and Node 26.10.0 JITless. Their primary-call intervals are unresolved except JITless byte-to-text
conversion, whose ratio is 1.030 [1.01, 1.05], slower. These results do not identify the engine
cause or reject the native method itself. Moving the method selection into the Buffer
implementation can preserve the portable formatter and avoid the added scratch-wrapper object;
that alternative needs a verified multi-batch comparison before retention. `primary-direct-latin1-secondary-packed.log` and
`packed-source-YKi2aH/` retain the observations and sources. No production path selects the candidate.

The packed driver must verify the requested batch count before its data can select production code.
The earlier direct-Latin-1 packed records contain one `ns` value per process despite a requested
larger count: the host environment and browser URL hard-coded one sample. Their six process-pair
ratios remain observations, but they do not represent medians over the requested batches. Source
screens honor the count and are unaffected by this correction. Retain pauses and use fresh
processes as independent observations; extra batches do not increase that independent count.
The sample-count control (`packed-sample-count-control.log`) returns the requested batches
on Node, Bun and Chromium, but exposes pooled batches in summary uncertainty. Summaries must
instead use one median per fresh process and reject a process count different from the rounds;
raw records retain every batch. Earlier single-batch comparisons are unaffected by this second
correction. The control is an instrument check, not evidence of a production improvement.

The corrected driver proves the requested batches and independent process medians before candidate selection.
On 2026-10-04, `packed-process-median-control.log` contains 12 raw observations across
Node 26.10.0, Bun 1.4.2 and Chromium, each with three batches. Each runtime summary contains
two medians per revision for two fresh-process rounds; an independent sorted-array check
matches each median to its raw record. This verifies host and browser count transport and
summary units, not production speed.

The Buffer-factory candidate does not yet establish a default UUIDv7 text benefit.
`latin1-adapter-primary-process-medians.log` and its `-repeat.log` compare the same
committed source with `latin1:direct-latin1` through packed public calls. Each uses six
fresh-process pairs, nine 5 ms batches per process and 32 ms warm-up on Node 26.10.0 and
Bun 1.4.2. Bun default-text paired median ratios are 0.990 [0.924, 1.090] and
0.995 [0.311, 1.046]; uppercase and slug intervals also remain unresolved. Byte-to-text
conversion ratios are 0.932 [0.905, 0.945] and 0.835 [0.507, 0.964]. Node owned-byte
generation reads 1.010 [1.002, 1.018] in the first comparison but is unresolved in the repeat.
The repeat also varies sharply in unchanged controls. Keep every batch and process observation;
these results do not establish a generation gain, equivalence, or the cause of variation.

Equal-call Bun profiles still rank character writes and string construction above clock and entropy work.
The `latin1-adapter-profile-baseline`, `-candidate`, `-candidate-repeat` and `-baseline-repeat`
directories each retain a JavaScriptCore profile of 2,097,152 completed `v7.string` calls,
with reversed second-pair order and 100 microsecond sampling. Baseline function summaries
report 255/311 samples in the Latin-1 character writer and 279/321 in native `toString`;
candidate summaries report 212/292 in that same writer and 227/270 in `latin1Slice`.
These sampled summaries locate remaining work; their counts are not exact cost fractions or
independent throughput measurements. Collected heap includes engine state and does not prove
gross allocation or resource parity. Bun rejects `HeapProfiler.enable` in the generic inspector
capture; that failed capture supplies no profile evidence. The Bun-specific profiler completes
all four captures. No production implementation selects this candidate.

Two Bun 1.4.2 chunk-construction screens on 2026-10-04 (`v7-chunks-join-proofed-screen.log`
and `v7-chunks-join-proofed-repeat.log`) compare public caller-buffer generation followed by
hexadecimal chunks with ordinary package text. Concatenation reads 186.68/147.45 ns and native
join over reused parts reads 150.31/122.80 ns, against 88.44/72.02 ns for default text.
Two matching conversion screens (`v7-chunks-join-conversion.log` and its `-repeat`) alternate
the same bytes and consume returned characters. Concatenation reads 106.62/117.41 ns and join
reads 77.82/78.76 ns, against 40.61/41.08 ns for the package formatter. This isolates a loss
outside generation dispatch; it does not identify rope allocation, flattening or native join
as the cause. Reject both composed calls without broadening to auxiliary runtimes.
Independent native hexadecimal encoding checks all 128 walking input bits. The `lost-tail`
and `joined-lost-tail` mutations fail that oracle before timing, with captures in
`v7-chunks-mutation.log` and `v7-chunks-join-mutation.log`. Exclude the initial join screen
from selection because its dedicated mutation proof follows it. Each retained screen uses
nine 20 ms batches after 32 ms warm-up, rotating case order; each process median is one
observation. Pauses remain in the raw samples, including a conversion batch average near
47 microseconds. These one-machine screens do not bound negligible effects or a fused
generator's cost, and do not establish retained-heap or allocation parity.
The experiment source is retained as `bench/reports/v7-chunks-source.patch` against `d79d3ae`;
its final labels exclude the rejected candidates from package rankings. The measured mechanisms
are unchanged by those labels. The maintained benchmark excludes these rejected experiments.

Do not retain prepacked hexadecimal pairs: packed default-generation gains remain unresolved.
Bun 1.4.2 screens on 2026-10-04 retain source, proofs, counters and raw samples in
`candidates-format-cKPCHB` and `candidates-format-wwlhwE`. Default text baseline/candidate
medians are 78.84/76.45 and 82.44/75.65 ns in the first screen, then 81.51/76.65 and
77.54/76.91 ns in the repeat. Conversion medians are 36.75/36.39 and 41.07/37.72 ns,
then 38.45/36.31 and 37.38/35.93 ns. Unchanged byte and slug controls also move;
these four process pairs do not bound the gain or establish installed-package performance.
Each process uses nine 20 ms batches after 32 ms warm-up, with reversed candidate order
in its second round. The lost-byte mutation fails Bun's independent offset and payload
oracles in `candidates-format-2doXyK`; intact Node/Bun behavior and Bun resource proofs pass
before timing. Warm counters preserve one Latin-1 call per text result, but do not count
all table allocations or the added DataView.
Packed captures `packed-pairs-packed-first.jsonl` and `packed-pairs-packed-repeat.jsonl`
use six 20 ms and eight 80 ms fresh-process pairs, with 32 ms and 64 ms warm-up respectively.
Every compared row remains unresolved; unchanged byte and slug controls also shift.
The repeat includes CPU/wall ratios below one and pauses of tens of milliseconds beneath
changed and unchanged calls. These records establish lost execution time, not its cause.
Keep those observations and reject a favorable median as sufficient evidence.
The focused `packed-pairs-packed-focused.jsonl` uses sixteen process pairs, 40 ms windows
and 48 ms warm-up. Default text has ratio 0.944 with a 95% median-ratio interval of
0.89..1.01; conversion has ratio 0.979 with interval 0.94..0.99. The small conversion-only
gain does not justify new retained tables and a view while the larger generation benefit
remains unresolved. Cold costs, allocation parity and auxiliary runtimes remain unmeasured;
this rejection does not prove no gain is possible. Source snapshots remain in the report
directories above and commit `bc27861`; the maintained candidate inventory excludes it.

Local workerd evidence (2026-10-04): `workerd-public-repeat.jsonl` runs the compiled public entry
with the portable implementation in both plain-web and `nodejs_compat` configurations. The bundle
input manifest contains `dist/index.js` and `dist/runtime/portable.js`, with no production source
or Node implementation. Each mode passes the shared 351-case profile oracle before timing four
successful calls, using seven batches of 262,144 calls and one equal-sized warm-up. Observed workerd
is 2026-10-04 and the compatibility date is 2026-10-04. Native Web Crypto UUID generation, secure
byte filling and typed-array hex/base64 methods are callable in both modes. These runs establish
local harness feasibility, not a throughput winner, packed installation, or another provider's support.

`workerd-native-prepared.jsonl` selects UUIDv7 text in separate inspector captures after correctness
setup and warm-up finish. Plain-web CPU contains 15 nodes and 159 samples; Node-compatible CPU
contains 15 nodes and 167 samples. Allocation profiles contain 36,168 and 35,501 samples.
Dispatch, result consumption and response serialization remain included; profile totals cannot
be divided by timed calls to claim per-call package allocation. The one-call
`workerd-clock-control.stderr` run fails when batch durations are zero. Local batch durations are
integer milliseconds; retain raw durations, enlarge batches when necessary and use fresh processes
for decisions. Host request time includes dispatch and remains separate from identifier timing;
preparation and inspector commands are excluded.
[Cloudflare's timer documentation](https://developers.cloudflare.com/workers/runtime-apis/performance/)
states that local timers advance during CPU work while deployed timers advance after I/O. The local
clock therefore cannot establish deployed timestamp progression or production edge latency.

Two clean Node inspector process pairs use the retained candidate bundles and the same filtered
public calls, seven 15 ms batches, 16 ms warm-up and a 4,096-byte allocation sampling interval.
Baseline text estimates 31.1/32.4 bytes per call under the byte-generator frame, against
32.3/32.6 for the inline-clock candidate; slug estimates 31.8/32.2 against 32.4/31.7.
The sequence helper also remains sampled. This falsifies the claim that deleting the wrapper
eliminates this allocation; it does not rule out allocation from clock values or captured state.
Sampling, inlining and one-machine process pairs do not identify the allocating expression.

Raw screens are `primary-inline-clock-screen.log` and `primary-inline-clock-repeat.log` in
`bench/reports/`. Matched profiles are the `allocation-clean-forward-*` and
`allocation-clean-reverse-*` directories under `candidates-v7-draw-YZqIen`; other allocation
directories there are excluded because process completion was not awaited between captures.
The exception-containment mutation fails the shared throwing-clock witness in both runners
before its timing (`primary-inline-clock-mutation.log`, `candidates-v7-draw-wstnCj`).
Keep production unchanged and separate required owned-output allocation from removable work.

Node Inspector allocation sampling used a 1,024-byte interval with both `includeObjectsCollectedByMajorGC` and `includeObjectsCollectedByMinorGC` enabled. Each operation ran 32,768 calls (construction: 2,048), after warm-up. The empty control sampled approximately zero bytes per call. These are sampling estimates from one matched process pair, not exact allocation counts:

| Operation | Before bytes/call | After bytes/call |
|---|---:|---:|
| Slug predicate | 236 | 0 |
| Caller-owned v4 generation | 1 | 1 |
| Plain-slug timestamp validation | 1,596 | 249 |
| Masked timestamp validation | 2,041 | 464 |
| Previous-key decoding | 2,772 | 1,596 |
| Codec construction | 9,577 | 6,336 |

The remaining rotation allocations include callback ownership copies. Last-key decoding with 16 explicitly configured keys measured approximately 66.6→2.57 microseconds on Node and 4.91→2.62 microseconds on Bun. Every earlier key was separately checked to reject the fixture before attributing that measurement to the last key.

Node/Bun CPU profiles and retained-heap profiles were also captured with the commands in the benchmark guide. Retained-heap profiles cannot measure gross allocation. Four repeated burst epochs did not establish a persistent leak; that limited observation is not proof of absence. Cold package imports remained in the millisecond range in fresh processes and are not a demonstrated optimization gain.

## Cooperative construction

The async constructor snapshots byte inputs before suspension, splits encoding/packing/hashing into checkpoints, and yields through ordinary host tasks. It preserves synchronous key material. A prioritized browser continuation failed to let an independently queued cancellation message run; ordinary message tasks passed the same installed-export test. Node/Bun use `setImmediate`.

Keep synchronous and cooperative construction as separate public contracts. Repeated boundary
profiles completed 16-byte seeds through 64 iterations and 4,097-byte seeds at one iteration with
zero host tasks. At 4,096 iterations, Node and Chromium crossed the two-millisecond work deadline
and yielded, while Bun and Deno completed without scheduling; at 65,536 iterations every runtime
yielded. A seed-size or iteration threshold would therefore encode one runtime's speed as policy.
The cooperative loop already selects from measured elapsed work: it returns without scheduling
when work stays below the deadline and yields when it crosses. Replacing it with synchronous work
would remove observed cancellation and host progress; replacing the synchronous API would change
its return contract. Retest only if profiling shows generator checkpoints materially dominate a
below-deadline workload or the scheduling contract changes.

For a 19-byte seed at 65,536 iterations, completed construction matched the synchronous output.
Independent host-task gaps measured 2.22 ms on Node 24.20.0, 4.29 ms on Bun 1.4.1,
2.43 ms on Deno 2.9.6 and 2.30 ms in Chrome 152, with total construction between 6.6 and
8.2 ms. These are local observations, not maximum guarantees.

Direct constructor probes measured synchronous byte-seed capture at 2.305/2.365 ms for 1 MiB,
3.527/3.472 ms for 16 MiB and 9.051/7.969 ms for 64 MiB on Bun/Node. The copy preserves the bytes
present when the call begins; an input cap or deferred copy would change that public behavior.
Keep the snapshot and treat its cost as an explicit responsiveness limit until a replacement
preserves call-time ownership without blocking the caller.

With a one-MiB seed and the maximum iteration count, call-time capture took 2.10–2.59 ms across
Node, Bun, Deno and Chrome. A queued timer or immediate observed cancellation after 2.10–4.46 ms,
and the promise settled 0.04–0.26 ms later. Node delayed a queued MessageChannel task to
9.92–10.04 ms, while the same task took 10.56 ms without derivation; that result measures Node's
MessageChannel startup rather than package blocking.

Cancellation retention probes discarded one-MiB jobs and forced collection between observations.
Node's eight epochs ended around 5.22 MB heap used. Bun's extended 32-epoch probe rose transiently
to 3.79 MB, then settled near 1.72 MB. Three fresh Deno processes retained 168.6–168.7 KiB after
16 jobs; three fresh Chrome processes retained 86.9 KiB. These probes falsify retention proportional
to all cancelled inputs in those runs. Heap-after-GC deltas do not measure gross allocation or prove
that every application is leak-free.

Large aligned byte seeds reuse their owned snapshot as little-endian hash words; smaller, unaligned,
odd-length, string, and big-endian inputs keep the packing path. Two packed replays on 2026-09-12
measured 4 KiB construction at 59–80% of baseline and 64 KiB at 59–77% across Node 26.8.2, Bun
1.4.2, Deno 2.9.6, Chromium 153, and Node JITless. The 16-byte, 4,095-byte, and 4,097-byte controls
had no repeated difference. A 64 KiB resource probe reduced newly allocated `Int32Array` storage
from 65,732 to 192 bytes by replacing the packed seed with one view. Cooperative 64 KiB settlement
improved on Node, Bun, and Deno; at 1 MiB it improved without increasing the observed host-task gap.
These local timings do not establish a cross-device crossover. Keep the portable packer as the
fallback and remeasure the threshold when an engine changes typed-array or hash-loop behavior.

## Migration decoding

Migration parses each input once and stops at the first match for `decode`; `candidates` tries
all enabled formats. Resource checks cover both paths on Node and Bun, including zero discarded
errors and no entropy draws. Ordinary codec calls do not enter the migration reader.

Reuse validated base64 text for sentinel lookup instead of encoding the decoded bytes again.
Only the final character needs canonicalization for a trailing-bit alias; base32 still requires
base64 encoding. Sentinel priority, candidate identities and strict ordinary decoding stay intact.

Against `afa12c0`, three alternating fresh-process pairs used the method above on the same machine.
The identical driver ran 46 cases, including varied migration inputs and original producer fixtures.
Median nanoseconds per call (before → after):

| Migration call | Node 24.20.0 | Node 26.8.1 | Bun 1.4.2 |
| --- | ---: | ---: | ---: |
| Current key | 604 → 451 | 503 → 419 | 294 → 284 |
| Previous key | 748 → 614 | 672 → 597 | 423 → 408 |
| All candidates | 989 → 810 | 909 → 808 | 711 → 695 |
| Known plain | 452 → 244 | 355 → 210 | 184 → 139 |
| Known original | 488 → 302 | 369 → 245 | 273 → 225 |

Native base64 calls fell from one to zero per measured migration call on Node 26 and Bun;
buffer, view, character-read, error and entropy counts did not increase. Node 24 avoids the portable
encoder instead. The resource budget rejects the actual baseline implementation on Bun.
Collected-heap deltas varied by kilobytes, including negative values; they do not measure gross
allocation or establish a memory bound. Small Bun differences remain sensitive to JIT and scheduling.
Separate base32-only pairs measured 429 → 423, 347 → 338 and 194 → 185 ns respectively;
the encoder path is unchanged, so these small differences are not attributed to the optimization.
Baseline CPU samples included encoding, parsing, hashing, GC and error construction. Equal-duration
cases overrepresent rare errors relative to many applications; their sample shares are not a traffic
model, and the repository contains no caller trace or telemetry that supplies invalid-input
frequency. Synthetic frequency would encode the result into the workload. Failures are not a
performance target, so `UuidSlugError` construction stays as it is; `Error` identity,
stack, cause, code, and diagnostics remain public behavior, not removable work. Removing diagnostic
errors or callback-owned buffers would change contracts, not remove waste.

Exhaustive seeded-mask candidate decoding allocates one private 16-byte block and restores it from
four scalar ciphertext words between masks. Keep first-match migration separate: sharing that
setup measurably slowed Chromium's common path. Two 12-round packed replays on 2026-09-12 measured
8- and 16-mask candidate gains of 9.9–13.9% on Node, 7.6–15.5% on Bun, 38.0–44.9% on Deno, and
7.1–12.8% on Chromium; one-mask first-match intervals included no change in both replays. The
resource probe observed one slice at 16 masks. Custom callbacks still receive isolated bytes,
and the original decoded block remains available to later migration formats. A later six-round
replay measured 19% on Node 26.8.2, 21% on Bun 1.4.2, 44% on Deno 2.9.6, and 15% on Chromium 153;
the Node JITless interval included no change.

Keep linear candidate deduplication. Ordinary migration yields at most current, original, and plain
interpretations; only deliberately overlapping custom masks can produce dozens. Two all-runtime
replays per candidate found that lazy `Set` promotion at 8, 16, or 32 candidates regressed its
promotion boundary. The inline 32 threshold was 8–10% slower on Node, 8–9% on Bun, 5–6% on
Chromium, and 5–9% on Deno, while 64 distinct candidates improved by 10–32%. Duplicate-heavy scans
had no repeatable gain. Reconsider a `Set` only if observed workloads approach dozens of distinct
candidates; tail-only speed does not justify a second structure on every call.

Canonical UUID text packs directly into base64url only when `Uint8Array.prototype.toBase64` is
absent. Node v24.20.0 took that fallback on 2026-09-12; Bun 1.4.2, Deno 2.9.6, and Chromium 151 used
the native encoder. Two packed replays measured a 20–21% Node paired-median gain while every native
interval included no change. The fallback allocates no byte buffer, preserves parser diagnostics,
and matches the byte encoder while every byte position traverses all 256 values. Reconsider the
split only when Node gains native base64url encoding or another runtime changes its capability.

Canonical UUID text also packs directly into base32hex. Two packed replays on 2026-09-12 measured
paired-median gains of 19–20% on Node 26.8.2, 9–13% on Bun 1.4.2, 39–42% on Deno 2.9.6, and 22–24%
on Chromium 153. Node 24.21.0 improved by 22% in a separate replay. Byte and masked controls showed
no repeated change. The direct route allocates no byte buffer and shares byte extraction, exhaustive
byte-space comparison, and exact parser diagnostics with base64url. Reconsider it if a runtime adds
native base32hex encoding.

Versioned UUID guards reject a wrong version or RFC variant before scanning canonical syntax, then
delegate the full grammar to `isUuidString`. Two packed primary-runtime replays on 2026-09-12 used
prebuilt invalid values spanning early, middle, and late hex, hyphen, version, variant, and uppercase
failures. The mixed invalid route took 63–64% of baseline on Node 26.8.2 and 72–75% on Bun 1.4.2;
mixed valid v4/v7 intervals included no change. An eight-round all-runtime replay measured 72% on
Chromium 153, 66% on Deno 2.9.6, and 55% on Node JITless, while every mixed-valid interval included
no change. A fused specialized grammar pass also improved invalid values, but its clean primary
replay was no faster than the precheck on Node and was slower on Bun. It duplicated the canonical
syntax loop while mixed-valid intervals still included no change. Keep one grammar validator and
the cheap version/variant precheck; reconsider only if valid-heavy traffic regresses on a later engine.

On engines using `toHex`, native offset UUID formatting converts the whole buffer only through 32 bytes; larger buffers keep a
16-byte view so work cannot scale with unrelated caller data. Direct byte formatting was 2.1–3.2
times slower in Node 26.8.2 and Bun 1.4.2; allocating a view or copy kept the avoidable object, while
unbounded whole-buffer conversion became 1.7–17 times slower at 256–4,096 bytes. Three packed
replays measured the bounded offset route at 83–87% of baseline on Node, 80–87% on Bun, 83–86% on
Chromium 153, and 81–82% on Deno 2.9.6. Two Node JITless replays measured 92–96%; a noisy third was
unresolved. Exact-buffer intervals included no change. Resource probes observe one native hex call
and no view at 24 bytes, but one view at 256 bytes; lowering the boundary makes the small-buffer probe
fail. Reconsider 32 only when runtime primitives change or wider caller-buffer distributions justify
a new measured crossover.

Formatting four 32-bit words with `toString(16)`, padding, and slicing was slower than bounded native
`toHex` in two 12-round replays on 2026-09-12. Direct formatting took 3.67–3.68 times baseline on
Node 26.8.2 and 1.74–1.78 times on Bun 1.4.2; offset formatting took 3.76–3.77 and 1.90–1.91 times.
Keep native `toHex` with the byte-pair fallback. Reconsider scalar formatting only if those runtime
primitives change.

A UUID parser table derived from the canonical byte offsets replaced four direct hyphen checks and
16 byte-offset checks with one 36-character state walk. Two six-round packed replays on 2026-09-12
measured valid parsing 8–27% slower on Node 26.8.2, 25–56% slower on Bun 1.4.2, 8–14% slower on
Chromium 153, and 1–6% slower on Node JITless. Deno 2.9.6 had large process outliers, but paired
medians were 3–19% slower. The table also added module initialization and retained state. Exact
hex offsets, hyphen precedence, and atomic caller-owned writes remained covered, but invalid-path
behavior cannot offset a repeated success-path regression. Keep direct structural checks and offset
iteration; reconsider a table only if an engine can remove its lookup and full-text scan costs.

A four-word UUID decode cut valid-path table reads from 64 to 32 and improved two packed replays by
20–25% on Node 26.8.2, 33–43% in stable Bun 1.4.2 rounds, 22–27% on Chromium 153, 22–25% on Deno
2.9.6 caller-output parsing, and 36–40% on Node JITless. Whole-input and four-byte failure rescans,
encoded invalid offsets, and fully inlined exits all preserved exact diagnostics and atomic writes,
but the strongest form repeatedly slowed late-invalid Node input by 29–42% and middle or late Bun
input by 3–17%. Keep the guarded two-pass parser and the early, middle, and late invalid probes;
reconsider fusion when engine behavior changes or one pass avoids failure-position regressions.

Staging fixed-length slug decode in four scalar words made late failures atomic without a separate
validation pass, but added byte-to-word selection to every decoded byte. Two packed Node 26.8.2 and
Bun 1.4.2 replays measured the core base64url decoder about 44–62% slower; public plain decode and
masked byte routes also regressed. Keep the grouped byte decoder and caller-owned prevalidation.
Reconsider scalar staging only when downstream masking or formatting can consume words directly;
materializing the same bytes after staging cannot repay the extra branches.

Decoding caller-owned slugs once into a private 16-byte block fused character and canonical-tail
validation with decoding, then committed only successful output. Two packed public-route replays
made Bun 1.4.2 about 11–12% faster but Node 26.8.2 about 6–8% slower. Early, middle, late, and tail
failures showed no repeated compensating gain. Keep caller-owned prevalidation; a temporary block
is useful only when allocation and commit are cheaper than the primary runtime's second scan.

Node v26.8.2 profiling combines process counters, `GCProfiler`, V8 heap/code/space state, Inspector
CPU and allocation samples, heap snapshots, V8 ticks, and trace events. Each source answers a
different question; correlation is evidence, while two APIs over the same V8 sampler are not
independent. Runtime-native evidence comes first, then Inspector, then portable counters and timing.
Missing optional detail may fall back, but an evidence lane may not silently produce nothing.

Two fresh Node v26.8.2 base32 profiles compared normal JIT with `--jitless`. JITless used 28% less
RSS, but package import was 21–23% slower, the public encode route was 14.1–14.6 times slower, and
CPU per operation was 13.9–14.2 times higher. Keep JIT as the performance default. JITless remains
the final performance rung and a deployment fallback when executable-memory policy outweighs
throughput and startup cost. A JITless-only win may justify code when every higher rung is unchanged.

## Regression protection and limits

### Error recognition

Repeated profiles on 2026-09-13 used Node 26.8.2, Node 24.21.0, Bun 1.4.2, Deno 2.9.6, and
Chromium with seven or nine 30 ms samples after warm-up. Short, long, string, and symbol markers
did not produce a repeatable winner. For unmarked local package errors, marker then `instanceof`
then native recognition led marker then native recognition on Node, Deno, and Chromium and was
effectively tied on Bun. Successful strings cost about 4–9 ns because their primitive check exits
before every Error operation. Successful byte inputs were much slower when sent through the general
detector, so public operations now validate their expected string or byte shape first and use local
`instanceof Error` for package-created intermediate results. The native `Error.isError` benchmark
row exists only when that capability is callable; an unavailable capability is never timed as a
constant result. Keep the immutable prototype `__failure` marker first, then local `instanceof`,
then native or intrinsic cross-realm recognition. Remeasure when an engine changes Error layout or
recognition; these warm measurements do not establish cold-start, other hardware, or hostile-proxy
cost.

A 2026-09-13 packed-revision replay isolated each fallible recognition rung so an inaccessible
marker cannot suppress local or cross-realm Error recognition. Six alternating samples on Node
26.8.2, Bun 1.4.2, Chromium, Deno 2.9.6, and Node JITless found no statistically distinct regression
in successful-value or marked-failure classification. One Deno run showed a 6% successful-value
gain; the immediate repeat overlapped no change, so no Deno improvement is established. These
measurements cover the existing ordinary success and marked-failure corpus, not hostile proxies;
the hostile-marker regression test establishes correctness but not its cost.

The same date's six-sample packed replay replaced repeated UUID separators with one module-local
constant. Direct encode and decode showed no statistically distinct change on Node 26.8.2, Bun
1.4.2, Chromium, Deno 2.9.6, or Node JITless. This covers warm complete direct conversions; it does
not establish cold module initialization cost.

On 2026-09-16, packed comparisons against `a3833fa` kept JavaScript `String`-object recovery behind
primitive checks. Two six-round Bun 1.4.2 replays found no statistically distinct change in native
or portable UUIDv4 text generation. Two complete-runtime migration replays and two additional Bun
replays measured current masked-slug decoding with the optional format omitted. One Bun interval
favored the baseline, while the other three overlapped no change; no repeatable regression is
established. Node 24.21.0, Chromium, Deno 2.9.6, and Node JITless also found no reproduced
regression. These warm single-operation comparisons cover primitive inputs and default selectors;
they do not measure wrapper recovery, construction, cold start, or other hardware.

The same date's six-round packed comparison against `7cf7e61` moved the primitive-string exit into
the shared UUID string normalizers and removed duplicate checks from decode-heavy masked and
migration readers. Node 24.21.0 and Bun 1.4.2 found no statistically distinct regression in masked
string, owned-byte, caller-buffer, or current migration decoding. One Bun caller-buffer interval
favored the candidate, but no improvement is established because the related rows overlapped no
change. These warm profiles cover primitive base64url input; wrapper inputs, base32hex, sentinels,
rotation, cold start, other runtimes, and other hardware remain unmeasured.

### Consumer graph

Packed browser production builds on 2026-09-12 gave Bun, esbuild, Parcel, Rollup, Rolldown, Rspack,
and webpack job-sized output from named root imports. Focused imports produced effectively the same
optimized bytes, so they did not provide additional tree shaking and do not justify public entries.

The packed probes execute every optimized bundle and require the masking seed only in the masked
case. A 2026-08-12 Bun-only predecessor measured 13,082 bytes for `uuidStringToPlainSlug` before masking was
made removable and 2,229 after; the current cross-bundler check replaces that narrower proof.

`bun run perf:check` protects JavaScript-visible allocation, decoding, encoding and entropy work, plus coarse relative pipeline timings on both runtimes. Its injected result-preserving regressions must fail. Shared functional cases protect wire identity, ownership, invalid input and optional native branches. Async cases protect snapshots, UTF-8 chunk boundaries, cancellation and independent concurrent constructions; changing host yields to microtasks makes cancellation fail.

The Bun test lane uses two isolated workers. Automatic parallelism increased contention without
shortening the complete local check on 2026-09-11; change the cap only after measuring the complete
lane with the same corpus and isolation.

### High-resolution UUIDv7 generation

Measured 2026-09-14 on macOS Arm64 with Node 24.21.0, Bun 1.4.2, Deno 2.9.6, and bundled headless
Chromium. In 200,000 consecutive reads, `performance.timeOrigin + performance.now()` had a smallest
positive step of 0.000244140625 ms in Node, Bun, and Deno, but about 0.1 ms in Chromium. `Date.now`
advanced in 1 ms steps. No clock moved backward during this short run; that does not establish
rollback behavior, and browser privacy settings can reduce timer resolution further.

Two consecutive filtered profiles compared caller-buffer generation with a fixed fractional clock
against the automatic high-resolution clock. Median nanoseconds per call were 44.36/47.11 versus
74.77/76.14 in Node, 27.18/26.12 versus 67.38/67.25 in Bun, 48.04/46.79 versus 104.47/105.11 in
Deno, and 43.40/44.20 versus 109.27/108.89 in Chromium. The clock dominates the added cost. Keep
fraction bits opt-in and probe the clock implementation once; do not infer accuracy from API presence.

The fraction arithmetic itself was smaller and reproducible in Node, Deno, and Chromium, while Bun
changed direction between short runs. These measurements cover one machine, current runtime modes,
and caller-buffer output. They do not compare power use, other CPUs, browser privacy modes, or clock
behavior under system suspend and wall-clock adjustment.

The benchmark harness runs only its independent child-process cases concurrently. On Bun 1.4.2,
five-run medians fell from 655 ms to 266 ms for that file and from 889 ms to 693 ms for the complete
Bun test lane. Keep parser and statistics cases serial; they do not wait and gain nothing from overlap.

## UUID competitor audit

Use `bun run bench:competitors` to compare the package's JavaScript paths with current npm
alternatives. Each case validates its output before warm-up, rotates measurement order, yields
between bounded samples, and fails on duplicate, missing, malformed, empty, or non-finite results.

UUIDv7 interoperability is not a generator whitelist. Conversion and masking preserve the full
74-bit payload without interpreting it. Optional inspection accepts an explicit count of leading
Method 3 fraction bits and following Method 1 counter bits. It returns every other bit unchanged.
The UUID cannot identify its generator or layout, so library names never select an interpretation.
The conformance matrix tests both boundaries, alternating patterns, every bit position, and real
output from each installed JavaScript generator below. Both TypeScript and Rust must parse each
input, extract the same timestamp, and preserve all 128 bits through both plain and masked alphabets.

| Generator | Use of the 74 payload bits |
| --- | --- |
| package, `uuidv7` 1.2.1 | 42-bit random-start counter and 32 newly random bits |
| `uuid` 14.0.2, `uniku` 0.6.0 | 32-bit random-start counter and 42 newly random bits |
| `fastv7` 1.0.2, `@kripod/uuidv7` 0.3.4 | 12-bit zero-start counter and 62 newly random bits |
| `uuidv7-js` 2.0.0 | Random initial payload, then a random positive increment within the same millisecond |

RFC 9562 permits four useful payload models: random bits; a fixed counter in the leading bits;
a randomly seeded value increased by random positive amounts; and 1 through 12 leading fraction
bits, optionally followed by a fixed counter. The first and third models remain in `remaining`:
one UUID cannot prove that random-looking bits came from either process. The second and fourth can
be decoded only when the caller already knows their widths.

### Rust competitor inventory

This is the benchmark work list, not a claim that crates.io has no other UUID package. The census
uses the registry searches `uuid`, `uuid v4`, `uuid7`, and `uuidv7`. It includes reusable libraries
that generate UUIDv4 or UUIDv7 and excludes CLIs, database extensions, domain packages, parsers,
formatters, and libraries that only consume UUIDs. Re-run the same searches before benchmarking.
Run `bun run bench:competitors:audit` to detect a newer release or repository commit. Release
dates come from crates.io; commit dates come from each package's declared GitHub repository. A new
version requires source inspection before its evidence or benchmark result can be carried forward.

| Crate | Versions | Release | Repo commit | Why retained | Evidence |
| --- | --- | --- | --- | --- | --- |
| [`uuid` 1.26.1](https://docs.rs/uuid/1.26.1/uuid/) | v4, v7 | 2026-09-10 | 2026-09-10 | Main Rust UUID library; configurable v7 counter width and random source | matrix executed; native and wasm compiled; source inspected |
| [`uuid7` 1.8.0](https://docs.rs/uuid7/1.8.0/uuid7/) | v4, v7 | 2026-05-17 | 2026-05-17 | Dedicated stateful generator; batch, rollback, fork, and caller-RNG behavior | matrix and rollback probe executed; native and wasm compiled; source inspected |
| [`fast-uuid-v7` 0.1.9](https://docs.rs/fast-uuid-v7/0.1.9/fast_uuid_v7/) | v7 | 2026-08-17 | 2026-08-17 | Multiple timestamp-fraction and sequential paths; allocation-free output | matrix executed; native and wasm compiled; source inspected |
| [`hyperuuid` 0.3.0](https://docs.rs/hyperuuid/0.3.0/hyperuuid/) | v4, v7 | 2026-09-04 | 2026-09-04 | Allocation-free scalar and batch API | matrix executed; native and wasm compiled; source inspected |
| [`uuidv7` 0.1.7](https://docs.rs/uuidv7/0.1.7/uuidv7/) | v7 | 2025-01-29 | 2025-01-29 | Small stateless text and byte generator | matrix executed; native and wasm compiled; source inspected |
| [`leachuuid7` 0.1.0](https://docs.rs/leachuuid7/0.1.0/leachuuid7/) | v7 | 2025-03-16 | unavailable | Independent random-payload implementation | matrix executed; native and wasm compiled; source inspected |
| [`nativelite-uid` 0.1.0](https://docs.rs/nativelite-uid/0.1.0/nativelite_uid/) | v7 | 2026-09-07 | 2026-09-06 | Standard-library-only monotonic generator | matrix executed; native compiled; wasm generation unsupported; source inspected |
| [`nexus-id` 1.1.5](https://docs.rs/nexus-id/1.1.5/nexus_id/) | v4, v7 | 2026-05-10 | 2026-09-13 | Low-latency generators with caller storage and batch paths | matrix and same-millisecond limit executed; native and wasm compiled; source inspected |
| [`rivid-core` 1.1.0](https://docs.rs/rivid-core/1.1.0/rivid_core/) | v7 | 2026-08-27 | 2026-09-02 | Text, raw bytes, caller storage, and batch generation | matrix executed; native and wasm compiled; source inspected |
| [`id-forge` 1.0.0](https://docs.rs/id-forge/1.0.0/id_forge/) | v4, v7 | 2026-05-20 | 2026-05-21 | Zero-dependency typed generator with monotonic variants | matrix executed; native and wasm compiled; source inspected |
| [`philiprehberger-id-gen` 0.3.0](https://docs.rs/philiprehberger-id-gen/0.3.0/philiprehberger_id_gen/) | v7 | 2026-05-31 | 2026-06-19 | General ID library with text, bytes, parsing, and explicit timestamps | matrix executed; native and wasm compiled; source inspected |
| [`uniqer_rs` 0.0.4](https://docs.rs/uniqer_rs/0.0.4/uniqer_rs/) | v4, v7 | 2025-09-03 | 2025-09-03 | Builder wrapper over `uuid`; measures allocated-text wrapper cost, not a new generator | matrix executed; native and wasm compiled; source inspected |
| [`uuid-extra` 0.0.2](https://docs.rs/uuid-extra/0.0.2/uuid_extra/) | v4, v7 | 2025-06-29 | 2025-06-29 | `uuid` wrapper with direct base64 output | matrix executed; native and wasm compiled; source inspected |
| [`rok-ids` 0.1.0](https://docs.rs/rok-ids/0.1.0/rok_ids/) | v7 | 2026-05-10 | repository unavailable | Typed value wrapper over `uuid` | matrix executed; native and wasm compiled; source inspected |
| [`uuid-lite` 1.10.8](https://docs.rs/uuid-lite/1.10.8/uuid_lite/) | v4 | 2026-09-13 | unavailable | Minimal direct `getrandom` generator with fixed-size output | matrix executed; native and wasm compiled; source inspected |
| [`uuid-lite2` 1.10.1](https://docs.rs/uuid-lite2/1.10.1/uuid_lite2/) | v4 | 2026-08-24 | unavailable | Separately published copy of the same minimal v4 mechanism | matrix executed; native and wasm compiled; source inspected |
| [`uuid64rs` 0.0.14](https://docs.rs/uuid64rs/0.0.14/uuid64rs/) | v4 | 2021-04-19 | 2021-04-19 | Base64 UUID generator and direct slug competitor | matrix executed; native and wasm compiled; source inspected |
| [`uuidv4` 1.0.0](https://docs.rs/uuidv4/1.0.0/uuidv4/) | v4 | 2023-08-24 | unavailable | Small standalone generator | matrix executed; native and wasm compiled; source inspected |
| [`qubit-id` 0.6.0](https://docs.rs/qubit-id/0.6.0/qubit_id/) | v4 | 2026-09-02 | 2026-09-14 | Synchronous and asynchronous generator interfaces | matrix executed; native and wasm compiled; source inspected |

`uuid-tag` changes UUID payload bits to carry an application tag, so it does not produce the same
caller outcome as an ordinary UUID generator. `switchy_uuid` is a deterministic simulation adapter,
and `rs-uuid` generates shorter custom IDs;
neither is a production RFC UUID generator. CLI and database packages remain excluded for the same
reason: their process or storage overhead would measure a different job.

Benchmark direct implementations separately from wrappers. Measure text, owned bytes, caller
storage, and batch calls only where the crate exposes them. Also record entropy failure, clock
rollback, same-millisecond behavior, allocation, contention, target support, and output validity.
Base58 codecs are outside the benchmark set because no accepted consumer job needs their third UUID
spelling. Performance cannot supply the missing human-transcription requirement.

The 2026-09-15 executable matrix validated every retained direct generator's RFC version and
variant. It also exercised the package's typed entropy failure and strict rollback error, `uuid7`'s
rollback abort, and `nexus-id`'s 4,096-value same-millisecond limit. Three repeated native runs found
the package and `uuid` equivalent for v4 values, while package v7 values led `uuid` and matched
`hyperuuid` within run variation. Direct base64url output likewise left the package and `uuid-extra`
effectively tied for v4, while the package led for v7. These are per-call OS-entropy outcomes.

Seeded or process-global generators ran tens to hundreds of times faster, but they do less entropy
work per call and carry mutable sequence, rollback, fork, or exhaustion behavior. They are mechanism
floors, not equivalent secure-generation winners. `hyperuuid` and `rivid-core` batch APIs were much
faster than the package's scalar caller-storage loop because they amortize entropy acquisition and
timestamp work across the batch. A dedicated package batch interface remains unjustified until a
real caller needs batch generation; benchmark speed alone does not create that contract.

The matrix treats returned fixed-size values and caller buffers as allocation-free public outcomes,
and returned `String` values as allocated outcomes; it makes no claim about hidden allocator work.
Across three fresh processes, four-thread generation cost 248 to 345 ns per package call. `uuid7`
and `nativelite-uid` remained near 76 to 93 ns, `hyperuuid` ranged from 194 to 337 ns, and
`rivid-core` remained near 8 ns. These rows isolate simultaneous generation after per-thread setup,
but their entropy and state-sharing contracts differ, so the figures do not rank interchangeable
results. The package keeps independent generator state and secure entropy per call; this measurement
does not justify replacing either guarantee with shared or seeded state.

Isolated consumers compiled every retained generator call natively. Nineteen also compiled for
`wasm32-unknown-unknown` after enabling each crate's documented feature or the matching
caller-selected `getrandom` WebAssembly backend. `nativelite-uid` 0.1.0 alone failed in its library:
its WebAssembly branch calls `fill_random`, which is not defined for that target. The target matrix
proves compilation, not browser execution or entropy quality; this package's executed WebAssembly
profiles remain the behavioral evidence for its own WebAssembly support.

Rust `uuid` uses a 42-bit leading counter by default. Its additional-precision mode dedicates 1
through 12 of those leading bits to a Method 3 fraction, leaving the rest of the 42-bit field as the
counter. `fast-uuid-v7` exposes 4-, 8-, and 12-bit fraction variants with random trailing bits, plus
a separate 18-bit leading-counter variant. These layouts fit the same explicit fraction-then-counter
model. `leachuuid7` documents a 60-bit timestamp, but its source writes the RFC 9562
48-bit timestamp and then sets the standard version and variant bits. The source behavior is what
the compatibility claim covers.

### TypeScript competitor inventory

Run `bun run bench:competitors:audit` to compare both inventories with npm, crates.io, and each
package's declared GitHub repository. A changed release or repository date requires source
inspection before carrying its evidence forward. Dates show activity, not maintainability by
themselves; stable code may need few commits, while frequent commits may still leave consumer
defects unresolved.

| Package | Release | Repo commit | Why retained |
| --- | --- | --- | --- |
| [`uuid` 14.0.2](https://www.npmjs.com/package/uuid) | 2026-08-18 | 2026-09-15 | Main UUID library; v4 and configurable v7 text and caller storage |
| [`@smithy/uuid` 1.4.2](https://www.npmjs.com/package/@smithy/uuid) | 2026-08-15 | 2026-09-11 | High-volume UUIDv4 wrapper used by AWS packages |
| [`@lukeed/uuid` 2.0.1](https://www.npmjs.com/package/@lukeed/uuid) | 2023-03-31 | 2024-01-20 | Small pooled UUIDv4 implementation |
| [`uuidv7` 1.2.1](https://www.npmjs.com/package/uuidv7) | 2026-03-22 | 2026-08-25 | Stateful v7 generator with rollback policy and owned bytes |
| [`crypto-randomuuid` 1.0.0](https://www.npmjs.com/package/crypto-randomuuid) | 2021-08-09 | unavailable | Small native UUIDv4 wrapper |
| [`uuid-random` 1.3.2](https://www.npmjs.com/package/uuid-random) | 2020-06-24 | 2021-05-20 | Standalone UUIDv4 text generator |
| [`uniku` 0.6.0](https://www.npmjs.com/package/uniku) | 2026-08-13 | 2026-08-13 | v4 and v7 text, caller storage, conversion, and timestamp operations |
| [`@kripod/uuidv7` 0.3.4](https://www.npmjs.com/package/@kripod/uuidv7) | 2022-07-03 | 2022-08-25 | Small zero-start counter UUIDv7 generator |
| [`uuidv7-js` 2.0.0](https://www.npmjs.com/package/uuidv7-js) | 2026-05-11 | 2026-05-11 | Random-increment UUIDv7 generator and validated timestamp extraction |
| [`fastv7` 1.0.2](https://www.npmjs.com/package/fastv7) | 2025-12-20 | 2025-12-20 | Minimal zero-start UUIDv7 generator with a distinct collision trade-off |

The inventory covers the most-downloaded packages and every distinct relevant strategy found.
Official npm downloads for 2026-09-05 through 2026-09-11 ranged from 206,849,086 for `uuid` to 293
for `fastv7`; low-download packages remain only where their strategy or API differs. The deprecated
`uuidv4` wrapper and older duplicate generators add no independent implementation evidence.

| Capability | Strongest retained alternatives | This package |
| --- | --- | --- |
| v4 generation | `uuid` and `uniku`: text and caller buffer; smaller packages: text or owned bytes | Text, owned bytes, caller buffer, plain slug |
| v7 generation | `uuid` and `uniku`: text and caller buffer; `uuidv7`: text and owned object bytes | Text, owned bytes, caller buffer, direct or masked slug |
| Controlled generation | `uuid`: entropy, timestamp, sequence; `uuidv7`: isolated generator and rollback policy | Caller-supplied clock, isolated generator, explicit timestamp; entropy stays runtime-owned |
| Inspection | `uuid`: validate/version; `uniku`: validate/convert/timestamp; `uuidv7`: parse/format/version/variant | Typed guards, parse/format, slug conversion, timestamp and window checks |
| Timestamp extraction | `uuidv7-js`: validated v7 text; `uniku`: canonical text without v7 rejection | Validated v7 UUID text, bytes with offset, plain slugs, and codec-owned masked slugs |

The measured gaps concern the cost of existing calls. They do not establish demand for batch
helpers, NIL/MAX constants, permissive UUID spelling, or caller-selected rollback policies.
`uuidv7` exposes finer clock-rollback control. This package promises ordering within one generator
under its preserve policy. Direct encoding accepts every UUID version, independently of v4/v7 generation.

Two full local runs on 2026-09-13 used Node 24.21.0, Bun 1.4.2, Deno 2.9.6, and Chromium, with nine
20 ms samples after 32 ms warm-up per case. Both runs agreed on every direction below. A `--smoke`
run taken first disagreed with them on Bun byte routes by 30–70%, so smoke output validates the
harness and ranks nothing. The package led every allocated-byte and caller-buffer group on Node,
Chromium, and Deno, and Bun's owned-byte groups. Bun's UUIDv4 caller-buffer write trailed `uuid`
by about 10% in both runs. Deno's owned UUIDv7 bytes were unresolved against `uuidv7`: 12% behind,
then 2% ahead. UUIDv7 text led every package on all four runtimes. Raw platform generation was 5%
faster on Node and 2.07 times faster on Bun. Bun's native generator encodes timestamps ahead of the
clock during bursts; see Native floors for measurements and the current qualification policy. UUIDv4 text matched
Node's native generator within 1% before portable text replaced it (see Native floors); on Bun it
trailed `crypto-randomuuid` by about 10% and the native generator by 5%; on Deno it trailed `uniku`
by about 30% and paid 34% over the native generator for validation and the error-value boundary; on Chromium
it trailed the pooled portable generator in `@lukeed/uuid` by 13–15%. A single 2026-09-12 run had
put the Chromium gap at about 4% and found no Bun caller-buffer loss; the paired runs supersede it.
`fastv7`'s 12-bit counter advances the encoded millisecond on overflow. That difference is
informational for module-level defaults, not a qualification failure. After a burst of 2 million calls it encoded timestamps up to 47 ms ahead of
`Date.now()` on Node 26.8.2 and 88 ms ahead on Bun 1.4.2, with 95–97% of values ahead; `uuid`,
`uuidv7`, `uniku`, `uuidv7-js`, `@kripod/uuidv7`, and this package stayed at or behind the clock. This package also starts its 42-bit sequence
from a random seed. `fastv7` and `@kripod/uuidv7` both use a zero-start counter with 62 random bits;
that shared choice does not disqualify one of them. Faster mechanisms remain candidates when
they preserve the requested identifier; default guarantees must not exceed proper native behavior.
Validated text timestamp extraction trailed `uuidv7-js` by 3–8% on Node, Bun, and Deno and by
14–15% on Chromium in both runs. `uniku` timestamp results are not ranked because its call accepts
non-v7 UUID text.

These are single-machine warm-throughput observations, not universal rankings. Process startup,
bundle size, memory, operating-system entropy quality, other hardware, and other engine versions
were not measured. Platform rows expose wrapper cost; they are floors, not APIs that satisfy the
package's failure contract.

Rejected rows remain timed and are reconsidered after every package update. The insecure
`@lukeed/uuid` entry uses `Math.random`, so it cannot establish secure UUIDv4 performance. The
`uniku` timestamp call does not verify UUIDv7, so it cannot establish validated UUIDv7 extraction
performance. `fastv7` encodes timestamps ahead of the clock during measured bursts.
Native platform rows are always qualified floors; error handling around them is package overhead,
not a reason to hide them.

The 2026-10-02 entropy report brackets 50,000 draws per candidate with two wall-clock reads,
then parses the largest encoded timestamp outside the burst. `fastv7` exceeded the ending clock
by 8 ms on Bun 1.4.2, 5 ms on Node 24.21.0 and 6 ms on Node 26.10.0; the package matched the
ending clock in these samples. Separate replays observed 8 ms on Bun and 4 ms on Node Current.
These signed differences do not prove that the clock stayed monotonic between endpoints or
measure the fraction of values ahead at issuance. They add no clock guarantee. The existing
encoded-timestamp counts alone could not measure this difference.

Default competitor report intervals describe batches within one process, conditional on independent
observations. Opt-in fresh-process runs use one median per process and retain every raw batch.
JIT, GC, shared caches and thermal drift can violate independence. Treat single-process
verdicts as screening evidence; paired fresh-process replays govern retained changes. Standard
error in those replays describes uncertainty in a mean, not call-latency spread. No individual-call
p99 is established by the batch averages. The paired comparison starts a fresh browser process
per revision and round; reloading a page alone would retain shared process state. See
`bench/README.md` for the measurement boundaries.

A focused 2026-10-02 replay used six fresh processes per runtime and three batches per process
for UUIDv4 text on Node 24.21.0, Node 26.10.0, Bun 1.4.2, Deno 2.9.7 and Chromium 153.0.8010.12.
Every measurement row retained eighteen batches but reported six statistical observations.
This checks the evidence unit, not runtime superiority; shared machine conditions remain.
Reports leave unlike observation units unresolved. A flattened-batch mutation must fail the
sample-count regression, even when its medians look plausible.

### Fixed conversion comparisons

#### Owned plain-slug decoding

Compare the complete owned array, not Buffer bytes with the same payload. The native rows
validate canonical padding before decoding; Buffer output needs a copy to prevent exposing
pooled backing storage. `ownedBytes` witnesses reject Buffer subclasses and reused backing
storage before timing. Identical-payload mutations fail those witnesses in
`primary-owned-decode-witness.log`; byte equality alone would pass them.

Three matrices on 2026-10-03 use seven fresh-process medians per row, five 10 ms batches and
32 ms warm-up on Node 24.21.0, Node 26.10.0, Bun 1.4.2, Deno 2.9.7 and Chromium 153.0.8010.12.
The raw files are `primary-owned-decode-comparison.jsonl`, `primary-owned-decode-repeat.jsonl`
and `primary-owned-decode-independent.jsonl` in `bench/reports/`. The last two execute the
ownership witnesses. Costs vary broadly between runs; these processes share machine conditions.
Their automatic comparison summaries include the Buffer-only result and do not rank equal
ownership contracts; compare the individual owned rows. The qualification smoke in
`primary-owned-ranking-smoke.jsonl` excludes Buffer-only results from all five runtime rankings
and retains an explicit rejection on each runtime offering Buffer. Its short smoke timings prove
report routing, not performance. `primary-owned-ranking-proof.log` records 40 passing tests,
including actual Buffer bytes rejected by the owned-storage witness.

On Deno the last two package medians are 292 and 160 ns, against 452 and 244 ns for Buffer
decoding plus copying, 550 and 293 ns for `fromBase64`, and 521 and 286 ns for native writes
into fresh arrays. Each corresponding package median interval ends below its owned native
alternative's interval. Buffer-only medians remain lower at 219 and 119 ns, with overlapping
intervals in the broader repeat. Keep the current decoder: no measured owned native alternative
earns replacement. This does not establish total allocation parity, every input form, call p99
or a mathematical floor. The Buffer-only cost remains a target for investigating less owned work.

The installed Bun declaration gives `setFromBase64` a numeric offset parameter. Bun 1.4.2
and Deno 2.9.7 accept decoding options and reject the numeric control; the fixed-input matrix
exercises the real options form on each available runtime. A narrow optional capability type
contains that declaration mismatch rather than weakening other prototype methods.

#### UUIDv4 draw and encoder isolation

Use separate draw, fixed-input encoder and complete-generation rows to locate Bun slug costs;
component timings cannot select a public implementation. Two 2026-10-02 Bun 1.4.2 screens use
six fresh processes, seven 5 ms batches and 16 ms warm-up. Pooled copy-and-erase draws cost
15.16–15.22 ns and direct scratch draws 15.28–15.45 ns. Selected fixed encoding costs
34.12–34.78 ns versus native encoding at 30.47–30.55 ns. Complete package slugs cost
43.92–44.24 ns, pooled-native slugs 40.85–41.20 ns, direct-scratch-native slugs 42.47–42.74 ns,
and direct-owned-native slugs 46.94–46.96 ns. Generation checks precede timing; fixed encoding
uses an exact slug witness. These source-only screens do not establish allocation volume or
statistical separation. The prior packed native-encoding comparison remains the retention
decision; the refreshed single-process native UUIDv4 slug floor is unresolved.

#### Canonical UUIDv7 timestamp validation screen

Compare full UUIDv7 validation before timestamp parsing; parsing alone is a lower bound.
The installed `uuidv7-js` parser uses a case-inclusive canonical regex then `parseInt`.
The baseline accepted-text guard scans every hexadecimal digit before parsing.
Two 2026-10-02 screens on Node 26.10.0 and Bun 1.4.2 use six fresh processes and seven 5 ms
batches after 16 ms warm-up, with 256 varying timestamps in lowercase, uppercase and compact text.
Every timestamp is checked before timing. A case-insensitive canonical regex plus parsing costs
84.40–86.34 ns versus 111.09–111.25 ns on lowercase Node input, and 58.78–59.84 ns versus
82.67–84.51 ns on Bun. Uppercase inputs show the same direction; compact fallback stays near
its current cost. Explicit-case classes and the case-insensitive flag are close, so deriving the
case-insensitive regex from the existing canonical pattern avoids a second syntax definition.
These source-only screens motivate a candidate, not retention; packed calls, malformed payloads,
accepted alternate spellings and resource costs must decide it.

Keep case-insensitive canonical validation in `isUuidV7Text`; preserve the shared parser for
compact, URN and braced spellings. Against `55815a2`, two six-round packed replays on
2026-10-02 measure canonical extraction ratios of 0.739/0.793 on Node 26.10.0 and
0.659/0.624 on Bun 1.4.2, with both intervals below 1. Mixed-case extraction also improves
in both. Canonical guard ratios are 0.643/0.606 and 0.462/0.458 respectively. Chromium
153.0.8010.12, Firefox 155.0, WebKit 26.6, Deno 2.9.7 and Node Current JITless favor the
canonical calls, although some browser intervals remain unresolved. Compact and wrapped
guards have no repeated resolved loss; isolated control losses do not reproduce. Each round
uses fresh processes, alternating revision order, one 5 ms sample and 16 ms warm-up.

Host records show lower canonical-call CPU cost and no measured filesystem I/O. One native
profile pair estimates canonical extraction at 95.71/96.69 sampled bytes per operation on
Node, 95.90/94.96 on Deno and 72.06/72.62 on Chromium, baseline/candidate. Guard allocation
samples remain near zero. Sampling error and GC make these estimates insufficient to rank
small allocation differences; live-heap deltas are not allocation volume. Bun's native CPU,
heap and allocator artifacts cover the same successful calls. Full-payload corruption and
wrong-version/variant regressions fail a validation-bypass mutation in both Node and Bun.

Six alternating fresh imports per revision measure median root import at 12.06/12.28 ms on
Node and 5.41/4.47 ms on Bun, with median live-heap increases about 15/17 KiB. Imports use
warm filesystem caches and include module parsing; these observations do not attribute that
increase solely to the additional regex or establish a startup speed difference. The regex
derives from the canonical syntax once; repeated construction would charge every call.
Recheck the complete calls, fallback spellings, allocations and startup after engine or syntax
changes. The native parse-only floor and the remaining competitor gaps still require work.

#### Canonical timestamp parsing screen

Read validated canonical timestamp digits without constructing intermediate strings if packed
calls retain the gain. Two 2026-10-02 source screens compare ten parsing choices with the same
UUIDv7 text guard: joined and split `parseInt`, arithmetic and table digit loops, arithmetic and
table fixed words, hexadecimal `Number` and `BigInt`, Buffer decoding, and native `fromHex`.
Each uses six fresh processes on Node 26.10.0 and Bun 1.4.2, seven 5 ms batches after 16 ms
warm-up, lowercase and uppercase inputs, and exact witnesses including zero and the 48-bit ceiling.
Fixed arithmetic costs 66.05–69.27 ns on Node and 35.12–37.49 ns on Bun, against public
extraction at 87.10–90.88 and 66.10–68.19 ns. Fixed table reads are slightly slower on Node
and faster on Bun; split parsing and digit loops lose to fixed reads. Hexadecimal Number,
BigInt and native byte decoding do not beat fixed reads in either screen. These observations
select a portable candidate; they do not prove packed performance or allocation volume.

Keep fixed arithmetic for canonical UUIDv7 timestamp extraction with the JIT, and retain native
radix parsing on JITless Node. Two packed replays against `9ccfd29` use six fresh-process pairs
per runtime, alternating revisions, seven 5 ms batches and 16 ms warm-up. Canonical lowercase
and mixed-case ratios are 0.804–0.837 and 0.819–0.823 on Node 26.10.0, 0.645–0.663 and
0.607–0.649 on Bun 1.4.2, 0.814–0.862 and 0.830–0.871 on Chromium 153.0.8010.12,
0.797–0.812 and 0.790–0.801 on Deno 2.9.7, and 0.614–0.666 and 0.591–0.612 on
WebKit 26.6. Their paired 95% intervals exclude parity in both replays. Firefox 155.0 separates
the lowercase gain in both; its mixed-case intervals remain unresolved. Two additional Node
24.21.0 replays separate both canonical gains. These are batch throughput comparisons, not p99.

Do not apply fixed digit reads unconditionally: two earlier packed replays slow JITless Node
canonical extraction by 36–40%. Reusing its existing startup selection retains native parsing;
the final JITless ratios are 1.011–1.018 and 1.009–1.015, with all intervals spanning parity.
A Node base64url extraction control reads 1.049 in one final replay; a focused twelve-pair replay
reads 0.991 with interval 0.97–1.01 and does not reproduce the loss. Compact and slug results
do not justify a universal improvement claim. Recheck this selection after parser or engine changes.

Use native allocation sampling alongside CPU profiles and direct operation counts. One complete
Node, Bun, Deno and Chromium profile pair records all four selected cases. Canonical lowercase
and mixed-case sampled bytes per timed operation fall from 95.87/97.18 to 15.90/15.42 on Node,
97.49/96.27 to 16.00/15.95 on Deno, and 71.21/71.56 to 12.24/11.80 on Chromium.
The compact controls remain near their prior allocation costs. Chromium capture includes warm-up,
while its denominator counts timed calls; neither these estimates nor retained heap prove an exact
allocation floor. Bun canonical CPU cost falls from 66.38/64.65 to 39.37/38.31 ns per operation;
its heap snapshots measure retention and do not establish gross allocation. Successful rows record
no filesystem reads or writes. The resource gate observes zero substring calls on Node and Bun,
and restoring sliced parsing fails it without changing the timestamp result.

Preserve full text validation and the complete 48-bit result. The existing independent timestamp
carry oracle fails for signed low words and a misplaced digit in both Node and Bun. Real child
processes check parser selection against V8 executable-heap state across CLI and environment
precedence; forcing fixed parsing fails that regression. No new table or capability probe is
initialized for this reader. Native parse-only floors and Bun gross allocation volume remain open.

Compare the complete timestamp call against the qualified `uuidv7-js` call, not bare parsing.
Two six-process competitor replays on the same installed releases report package/rival ratios
of 0.759–0.813 on Node LTS, 0.758–0.771 on Node Current, 0.600–0.613 on Bun,
0.731–0.750 on Deno and 0.787–0.818 on Chromium. Each process contributes one median
from nine batches; raw batches, standard deviations, mean standard errors and median intervals
remain in the fresh-process records. These comparisons measure throughput, not individual-call tails.

Keep the real rival call in the shared profiling corpus with identical lowercase and mixed-case
inputs and independently constructed timestamps. Two native profile runs sample 15.56–16.36
bytes per timed operation for package canonical calls against 95.07–96.76 for the rival on Node,
15.81–16.26 against 94.12–96.28 on Deno, and 11.75–12.07 against 71.62–72.11 on
Chromium. The warm-up and sampling limits above still apply. Package CPU cost is lower in both
Node and Deno runs; Bun records 36.70–41.77 ns per operation against 62.80–68.11 for the
rival. A Bun probe forwarding real `String.prototype.slice` calls observes zero package slices
and two rival slices in both text cases; its positive control sees one. Bun gross allocation
volume remains unmeasured. A wrong finite rival timestamp fails corpus verification on Node
and Bun before timing starts. Preserve these distinctions when rechecking upgraded rivals.

#### Uppercase writer screen

Keep the direct uppercase writer unless a complete successful-call comparison favors lowercase
formatting followed by `toUpperCase()`. Two 2026-10-02 screens on Node 26.10.0 and Bun 1.4.2
use six fresh processes per runtime, seven 5 ms batches after 16 ms warm-up, and 256 varied
16-byte inputs. Each output is checked against independently constructed uppercase hex before
timing; both candidates include public byte validation and result handling.

Lowercase-then-uppercase/direct-uppercase median process ratios are 1.107 and 1.094 on Node,
and 1.040 and 1.048 on Bun. Node's twelve process ratios exceed 1; Bun has individual ratios
below 1, so its small difference remains unresolved. These are source-corpus screens with fixed
candidate order and rotating batch order, not packed retention evidence or allocation profiles.
The alternative earns no production change; its extra case conversion offers no repeated speed
benefit here. Recheck after a formatter or engine change.

Compare successful conversion calls with `UUID_SLUG_GENERATION_FILTER=conversion` and
`UUID_SLUG_GENERATION_FORKS=6`; exact fixed outputs must pass before timing begins.
Two 2026-10-02 runs use six fresh processes, three 5 ms batches per process and 16 ms warm-up
on Node 24.21.0, Node 26.10.0, Bun 1.4.2, Deno 2.9.7 and Chromium 153.0.8010.12.
Each run has 113 measurement rows. Each row retains eighteen batches and six process observations.
The corpus alternates two canonical UUIDv7 values with distinct payload tails; it does not measure
all UUID versions, normalization, caller-owned buffers, cold startup or packed consumers.

`bench/conversion-cases.ts` supplies six text/byte/base64url conversions, text validation and timestamp
extraction, with `uuid` parse/stringify/validate comparisons. Native hex and base64url comparisons
include required dehyphenation, padding and output formatting. Strict native base64url decoding
requires `slug + "=="`; the unpadded spelling fails on the probed Bun implementation. Absent
methods are reported without timing. Node 24.21.0 reports six unavailable native byte methods;
the other ranked hosts expose them. Buffer results retain their native ownership difference.
Regex and `parseInt` are lower bounds without the package's complete semantic validation.

Repeated package/native median ratios expose Bun byte-to-slug costs of 1.14–1.17 and Deno
slug-to-byte costs of 1.16–1.20. Timestamp extraction costs 2.13–3.41 times the `parseInt` lower
bound across these runtimes. These ranges identify work to investigate; they do not establish
statistical separation, consumer harm or a safe replacement. The fixed-output regression rejects
a second result with lost payload bits even when the UUID version remains correct; disabling that
comparison fails the regression. No production optimization follows from this harness alone.

A 2026-10-02 timer-only probe took 100,000 adjacent `performance.now()` pairs on this machine.
The median difference was 41 ns on Bun 1.4.2 and 42 ns on Node 26.10.0; their observed p99
differences were 42 ns and 125 ns. There were 34,210 and 12,576 zero differences respectively.
This single uncalibrated probe includes loop warm-up and quantization. It is not a timer-cost
bound, but shows that naive per-call timestamps can be on the same scale as UUID conversion.
Subtracting its median from a call's p99 would not recover the call-latency distribution.

The opt-in call-timing pass brackets individual successful scalar or byte calls and consumes each
result after the ending timestamp. Raw samples retain acquisition order and pauses; an adjacent-clock
control rotates before and after calls. Empirical percentiles carry no independent-run confidence.
Native profiling runs separately. An omitted call-window mutation fails the elapsed-work regression.

On 2026-10-02, `format.uppercase` produced 10,000 call observations and 10,000 timer controls per
process on Node 24.21.0, Node 26.10.0, Bun 1.4.2 and Deno 2.9.7. Separate Chromium 153.0.8010.12,
Firefox 155.0 and WebKit 26.6 probes retained the same counts. All three browser call p99 observations
were zero under their clocks; this establishes a resolution limit, not zero call latency. Host
observations include timer overhead and do not establish uninstrumented p99 or a performance ranking.

The gates do not prove all performance properties. Relative timing cannot detect a slowdown shared by both sides. Constructor counters cannot see every engine allocation. Latest-runtime CI complements pinned runs, but this study did not execute hosted CI or measure every OS/architecture. Keep these limits when interpreting a pass.
# UUIDv7 continuation comparisons

## Unaligned entropy word copying

One DataView read and erase does not reproduce a primary-call gain over four byte stores.
Observed 2026-10-04: `word-four-screen.log` and `word-four-repeat.log` compare the same pooled
entropy with a retained DataView, explicit big-endian unpacking and an unaligned four-byte erase.
Each screen has two fresh processes per candidate on Node 26.10.0, Bun 1.4.2 and Deno 2.9.7,
reversed second-pass order, three 5 ms batches and 16 ms warm-up. The lost-fourth-byte mutation
fails the shared pool and generated-tail witnesses on both Node and Bun (`word-four-mutation.log`).
Both intact candidates pass the existing behavior and counted-resource checks.

Bun's first owned-byte observations are 50.02/49.15 ns against 50.73/48.78 ns; the repeat is
51.23/48.94 ns against 50.75/48.26 ns. Bun slug costs favor the candidate in the first screen,
then rise to 80.46/78.08 ns against 78.76/76.29 ns. Node and Deno directions also vary across
the screens. Reject the added retained view without a packed replay or cold-initialization study;
no reproduced primary-call gain earns that state. These short screens select candidates, not
confidence intervals, individual-call latency or total-allocation claims. The resource counters
do not measure DataView allocation, so their pass does not prove equal retained memory.

## Exact counter storage

A single exact Number counter does not reproduce the focused Bun slug gain through packed calls.

Observed 2026-10-04: `number-counter-screen-shared.log` and `number-counter-screen-repeat.log`
compare one 42-bit Number with the current split words in two fresh processes per runtime per
screen, reversing second-pass order. The candidate keeps seed bits, fractional layouts, entropy
failure transactionality and writer bytes. Both behavior and resource proofs pass. The widened
overflow mutant fails Node and Bun's shared timestamp-ceiling witness; the original Bun corpus
did not reject it, so its timing evidence is superseded by the shared-witness runs.

Bun slug costs favor the candidate in all four focused observations, but
`number-counter-packed.jsonl` does not reproduce that gain: Bun candidate/baseline is 1.016
with paired median-ratio 95% interval [0.934, 1.148]. Owned bytes are 0.978 [0.921, 1.037].
The packed comparison contains 77 summaries across seven runtimes, each using six fresh process
pairs and consuming complete returned results. Node text, bytes and slugs remain unresolved.
Reject the rewrite because no worthwhile primary Bun gain survives; this is not proof that one
Number is intrinsically slower. No production counter change follows.

`pool-four-owned-rivals.jsonl` and `pool-four-owned-rivals-repeat.jsonl` each compare five fresh
processes on Node 24.21.0, Node 26.10.0, Bun 1.4.2, Deno 2.9.7 and Chromium 153.0.8010.12.
Owned UUIDv7 generation trails `uuid` on Bun at package/best ratios 1.170 and 1.203, and
`uuidv7` on Deno at 1.080 and 1.089. The package leads the measured qualified rivals on Node
and Chromium. These comparisons check fresh plain-array ownership and secure generation;
they do not measure total allocation or establish parity with every possible implementation.
The installed `uuidv7` counter uses one Number and pooled Uint32 entropy, while the package
erases consumed entropy and preserves its configured failure behavior. The aggregate gap does
not identify which difference causes it.

# Four-byte entropy copying

Fixed four-byte copies reduce measured Node generation cost while preserving consumed-byte erasure.

The isolated `pool` comparison keeps pool capacity, entropy source, refill policy and output ownership
unchanged. `fixed-four-lost-byte` fails the shared Node and Bun four-byte witness and the module-default
byte and slug payload witnesses before timing. Both focused screens preserve counted arrays, views
and entropy draws. The separate source cursor raises Node UUIDv4 owned-byte cost in all four focused
observations, so it does not replace the indexed loop for other lengths.

Observed 2026-10-04: `bench/reports/pool-four-packed.jsonl` and
`pool-four-packed-repeat.jsonl` each contain 91 summaries from six fresh process pairs per runtime,
with alternating revision order. Both pack the same committed baseline and apply the isolated
`pool:fixed-four` substitution. Each covers default UUIDv4 text and bytes, caller buffers, default
UUIDv7 text, uppercase, bytes, both slug alphabets, explicit time, paired output, a selected generator
and immutable values. Every returned result is consumed.

| Node 26.10.0 call | First candidate/baseline | Repeat candidate/baseline |
| --- | --- | --- |
| Owned UUIDv4 bytes | 0.821 [0.779, 0.849] | 0.842 [0.784, 0.880] |
| Caller-buffer UUIDv4 | 0.715 [0.693, 0.803] | 0.766 [0.715, 0.785] |
| Owned UUIDv7 bytes | 0.942 [0.897, 0.966] | 0.960 [0.948, 0.995] |

Intervals are the maintained paired median-ratio 95% intervals. Node's uppercase UUIDv7 and
immutable-value gains also reproduce. Chromium's caller-buffer UUIDv4 and base32hex UUIDv7 gains
reproduce; owned-byte and ordinary text effects remain unresolved there. Deno 2.9.7 owned UUIDv4
gains reproduce, but UUIDv7 owned-byte gains do not. Bun 1.4.2 owned-byte and ordinary text gains
remain unresolved; neither replay resolves a Bun slowdown. Firefox effects remain unresolved.

WebKit 26.6 owned UUIDv4 bytes resolve slower only in the second broad replay: 1.022 [1.011, 1.044].
The focused `pool-four-lts-webkit.jsonl` comparison reverses that result to 0.955 [0.930, 0.986].
That same comparison observes Node 24.21.0 owned UUIDv4 at 0.887 [0.857, 0.903] and owned UUIDv7
at 0.970 [0.953, 0.995]. No slowdown reproduces across these comparisons; unresolved effects are
not proof of equivalence, especially with the wider browser intervals.

`bench/reports/pool-four-native/` contains nonempty CPU and heap evidence for Node 26.10.0,
Bun 1.4.2, Deno 2.9.7 and Chromium. The selected corpus checks exact output and ownership before
profiling. Production behavior checks pass 384 Node and 328 Bun tests, including lazy entropy,
refill failures and consumed-byte erasure. Fixed stores add no array, view or retained state;
the maintained resource counters preserve those counts. Profiles include setup and warm-up, and
Deno profiles execute compiled output, so they do not establish total per-call allocation parity
or the cost of Deno's normal source entry. Native and competitor parity remains open.

Retain the fixed stores for four-byte draws and the indexed loop for other lengths. Recompare
through `pool indexed-loop` when draw widths or runtime typed-array handling change; the UUIDv4
gains arise despite its unchanged copy width, so the results do not establish a loop-only cause.

### Plain base32hex conversions against scure

Keep the existing encoder and decoder for the measured single-UUID base32hex calls; this comparison
finds no rival throughput gap that justifies production code.

`current-base32-scure-comparison.jsonl` and `current-base32-scure-comparison-repeat.jsonl` compare
bytes-to-slug, slug-to-owned-bytes, UUID-text-to-slug and slug-to-UUID-text against `@scure/base`
2.4.0. Its public `base32hexnopad` uses uppercase, so the complete lowercase calls include case
conversion. Text calls compose it with `uuid.parse` or `uuid.stringify`; test-only alphabet helpers
are excluded. Fixed spellings from Python's RFC 4648 encoder check both payloads before timing;
owned decoding also requires separate plain `Uint8Array` backing storage.

Each replay uses three fresh processes per runtime, five batches per process, 15 ms per batch
and 40 ms warm-up. The repeated run covers Node 24.21.0 and 26.10.0, Bun 1.4.2, Deno 2.9.7 and
Chromium 153.0.8010.12. All 40 rows qualify. Package median costs are 0.100–0.501 times the rival
cost across these four calls and five runtimes. The earlier replay agrees on Node LTS, Bun, Deno
and Chromium; Node Current appears only in the repeated run, with three independent processes.

These warmed calls alternate two UUIDv7 payloads in fixed case order. They do not establish a
general-input ranking, individual-call latency, total allocation or a precise confidence interval
from three process observations. Recompare when the public rival codec gains lowercase output,
its implementation changes, or a changed runtime narrows this measured lead.

### Lowercase scure component comparison

Keep the current base32hex implementation for this corpus; removing the rival's case conversion
does not reveal a throughput gap that warrants a production rewrite.

`current-base32-scure-components.jsonl` and `current-base32-scure-components-repeat.jsonl`
include all four existing calls and scure's exported `__TESTS.radix2(5)` and lowercase
`__TESTS.alphabet` composition. Setup occurs once, outside timing. These are actual release-pinned
components from `@scure/base` 2.4.0, not a documented configurable public codec. The public-codec
rows remain separate. Both comparisons use the same independent fixed spellings and fresh-owned-byte
qualification as the public-codec comparison above.

Each replay has 60 qualified rows across Node 24.21.0 and 26.10.0, Bun 1.4.2, Deno 2.9.7 and
Chromium 153.0.8010.12. Each row has three fresh-process observations, each summarizing five
15 ms batches after 40 ms warm-up. Across both replays, package median costs are 0.102–0.525 times
the lowercase component costs. Node Current ratios are 0.140–0.520 and Bun ratios are 0.298–0.507.

The two UUID payloads and fixed case order limit the conclusion to these warmed calls; three
process observations do not establish precise confidence intervals, general-input dominance,
individual-call latency or total allocation. Recompare when either implementation or runtime changes.

### Fixed-call warm-up screen

Do not replace routine elapsed-time warm-up with a fixed call count on this evidence; passing
large-slowdown fixtures does not establish equivalent preparation or sensitivity to smaller losses.

The 269.63-second full-check log `/tmp/uuid-slug-base32-check.log` contains 3,072 packed timing
rows: 48 calls, 16 process pairs and two hosts. Recorded warm-up totals 116.15 seconds; seven
3 ms sampling windows per row require at least another 64.512 seconds. These totals exclude
packing, startup, cleanup and other checks, so warm-up alone cannot repair the whole lane.

`current-fixed-warmup-control-4096.jsonl` and `current-elapsed-warmup-control-32.jsonl` retain
16 process pairs and seven 3 ms batches for six representative calls on Node 24.21.0 and Bun
1.4.2. Both unchanged controls pass. Fixed preparation records 0.474 seconds of warm-up versus
12.295 seconds for elapsed preparation, but Bun plain decoding measures 1.349 times its matched
elapsed-control median and masked pairs measure 1.122 times. Separate acquisition epochs cannot
attribute those differences to preparation alone.

`current-fixed-warmup-codec-defect-4096.jsonl` and
`current-fixed-warmup-pair-defect-4096.jsonl` reject discarded-draw mutations for codec values
and masked pairs on both hosts. They inject large losses and do not establish smaller-loss
sensitivity. `current-fixed-warmup-control-16384.jsonl` passes its unchanged control but records
Bun sampling-window overruns and materially different costs; the cause remains unresolved.

The screen's batch arrays were sorted before reporting, so their original time order is lost.
Host and browser records must retain acquisition order; summaries compute medians separately.
`current-acquisition-order/` exercises real Node, Bun, Deno and Chromium decoding and masked pairs
with seven batches per call and preserves nonmonotonic arrays. This reporting check establishes
neither adequate warm-up nor a faster complete lane. Routine timing policy remains unchanged.

`current-warmup-interleaved/` retains four fresh processes per host and preparation setting,
alternating host and setting order. Elapsed 32 ms preparation and fixed 4,096, 16,384 and 65,536
calls cover the same six operations on Bun 1.4.2 and Node 24.21.0: 32 processes, 192 call records
and 1,344 chronological batches. Every setting has sampling-window overruns; unchanged costs
vary substantially within settings. Bun's first elapsed-control decoding preparation consumes
9.362 ms of caller-thread CPU during 64.401 ms of wall time. Elapsed preparation therefore does
not establish equal executed work in this screen. A process snapshot after acquisition shows other
CPU consumers but cannot attribute earlier pauses or separate scheduling from engine work.

The original interleaved Node screen enables explicit GC; the routine packed comparison does not.
`current-warmup-interleaved-matched-gc/` repeats the same process and batch counts with GC disabled
on both hosts. Every setting still has overruns, so explicit GC is not their sole explanation.
Bun decoding medians with 4,096 preparation calls range from 85.093 to 150.520 ns, versus 64.319
to 76.229 ns for elapsed controls. Reject that count for equivalent preparation on this screen.
Larger counts remain unresolved. Four processes per setting cannot qualify the family-wise gate
or establish smaller-loss sensitivity; these data do not select a preparation policy.

`current-fixed-warmup-control-65536.jsonl` passes the six-call packed unchanged control with
16 process pairs per host. Recorded preparation totals 3.676 seconds; the earlier elapsed control
records 12.295 seconds under a different acquisition epoch. The matching `codec-defect` report
rejects discarded generation confined to codec values on both hosts for the intended diagnostic.
That large mutation does not establish smaller-loss sensitivity.

`current-fixed-warmup-full-control-65536.jsonl` passes every primary call on Node 24.21.0 and Bun
1.4.2 in 98.433 seconds, including packing and cleanup. Its filter comes from `bench/check.ts`;
all 3,072 records retain seven batches and 65,536 preparation calls. Preparation totals 22.384
seconds; sampling alone requires at least 64.512 seconds. This is the packed comparison, not the
complete routine lane. No routine policy change follows until detection and remaining acquisition
costs meet the feedback-loop requirements.

### Single-draw codec timing defect

Use one discarded secure draw to expose an avoidable codec-value cost; many draws conceal a
gate's inability to detect smaller losses. The fixture changes no output contract or runtime policy.

`current-codec-single-draw-established-policy.jsonl` retains 16 packed process pairs, seven
3 ms batches and elapsed 32 ms preparation for six calls on Node 24.21.0 and Bun 1.4.2. Bun
rejects the codec-value loss for the intended diagnostic. Node's median ratio is 1.583, but its
family-wise interval includes no loss, so that path remains unresolved rather than detected.

`current-fixed-warmup-control-65536-ms1.jsonl` passes unchanged calls; the matching
`current-codec-single-draw-ms1.jsonl` rejects the single-draw loss on both hosts. They retain
the same process counts, seven batches and uncertainty, with 65,536 preparation calls and 1 ms
sampling windows. All 384 timing records appear in each report. Separate acquisition epochs
cannot attribute the detection difference to one setting. This screen neither qualifies every
primary call nor establishes a faster complete routine lane; routine policy remains unchanged.

`current-codec-single-draw-ms3-fixed.jsonl` keeps 65,536 preparation calls with the original
3 ms sampling window. Node rejects the one-draw loss; Bun's median ratio is 1.715 but its
family-wise interval includes no loss. This miss prevents treating the one-millisecond screen
as proof that shorter windows caused better detection. Retain both misses when evaluating policy.

Full unchanged controls with 65,536 preparation calls pass every primary call in 63.713 seconds
with 1 ms windows and 48.832 seconds with one-third-millisecond windows. The corresponding
`current-fixed-warmup-full-control-65536-ms1.jsonl` and
`current-fixed-warmup-full-control-65536-ms-third.jsonl` reports each retain
all 3,072 records, seven batches and the routine process counts and uncertainty. Packing and
cleanup are included; other routine checks are not. The narrow one-third-millisecond control
passes; its defect report rejects the one-draw codec loss on both hosts. These separate-epoch
screens do not establish reliable full-inventory defect detection or CI headroom; repeat the
decision-relevant controls and losses before retention. Routine policy remains unchanged.

Short requested windows do not bound observed uninterrupted time. The full 1 ms control reaches
36.889 ms on Node and 107.951 ms on Bun; the one-third-millisecond control reaches 16.748 ms
and 29.339 ms. These wall-clock observations include descheduling and do not attribute a pause
to package execution. Preparation totals 26.440 and 27.495 seconds respectively, so preparation
and process overhead must be examined before shrinking sampling further.

Do not adopt 32,768 preparation calls with one-third-millisecond windows: the repeated full
defect misses Node despite a large median loss. The two unchanged controls exit zero in 31.122
and 32.630 seconds; the defect runs exit one in 29.328 and 36.681 seconds. All four reports
retain 3,072 records, seven batches, 16 process pairs and the full primary inventory. Their names
are `current-fixed-warmup-full-{control,defect}-32768-ms-third.jsonl`, with `-replay` before
the extension for repeats. The first defect detects codec ratios 1.584 on Node and 1.719 on Bun;
the repeat detects Bun's 1.741 but leaves Node's 1.632 unresolved. Other diagnostics include
Node formatting and Bun UUIDv7 text or plain decoding; their causes remain unresolved.

Node's repeated defect has baseline codec batches near 300 ns in rounds 4 and 6, versus near
120 ns in rounds 5 and 7. The slower baseline sequences stay slow across all seven batches;
a single interrupted batch cannot explain them. The source diff adds only the discarded codec
draw. Engine state, generated-code effects and scheduling remain competing explanations;
inspect the complete preceding workload before attributing this to the preparation count.

Eight baseline V8 captures retain the same packed graph and full preparation history in
`current-preparation-v8-trace/`, with optimization traces, CPU profiles and all 48 timing rows.
They reproduce codec medians near 120 ns and 300 ns. Captures 0 and 7 are slow; capture 1 is
fast. All three show `uuidObjectChecksum` wrong-map deoptimization and reoptimization before
timing, so that event's presence cannot distinguish them. These instrumented captures include
startup and preparation; isolate the measured codec interval before attributing sampled CPU.

Reject timestamp-based clipping in the `markers/` captures: V8 profile and `process.hrtime()`
timestamps have different origins on this host. The `codec/` captures instead start and stop the
inspector around the codec samples, retaining the full preceding workload. All eight return
every primary row and a nonempty profile; their codec intervals contain only 11–21 CPU samples,
including inspector and task work. A slow capture remains, but these small counts cannot identify
its cause. Extend only the diagnostic codec interval before comparing sampled stacks; do not
use instrumented throughput to qualify routine timing policy.

The longer `codec-long/` captures extend only codec sampling to 20 ms on Node 24.21.0.
All eight retain 48 primary rows and 489–888 CPU samples in that interval. Generation, clock
reading and immutable value construction contribute more self samples than the harness loop.
The early slow sequence does not remain slow throughout longer windows; these instrumented
captures do not establish removable wrapper overhead or a routine preparation policy.

### Codec computation timing defect

Use computation the resource counters cannot see to assess timing detection beyond those counters.

The discarded codec draw already fails `resources.ts` on Node 24.21.0 and Bun 1.4.2:
`codec UUIDv7 value: buffers=2 exceeds 1`. Matching unchanged packed controls exit zero with
one buffer. The `codec:bigint-byte-generation-timing` replacement converts the final generated
byte to BigInt and back modulo 256, preserving the byte, errors, entropy and sequence state.
The source screen passes 177 Node tests, 80 Bun tests and the resource witness; both packed
resource lanes also exit zero. Constructor counts do not measure engine-internal allocation.

Two full packed comparisons with 32,768 preparation calls and seven one-millisecond batches
retain 3,072 records each, covering every primary call in 16 process pairs on each host.
Node codec ratios are 1.064 and 1.055, with family-wide intervals [0.987, 1.129] and
[1.006, 1.109]; only the repeat detects Node. Bun ratios are 1.246 and 1.240, with intervals
[1.108, 1.324] and [1.141, 1.352]; both detect Bun. Both checks exit one for the intended
codec diagnostic, in 49.274 and 51.264 seconds. These measurements expose work omitted by the
constructor counters and inconsistent detection of the smaller Node timing loss; they do not
justify changing timing policy. Native heap captures in §Fixed measured-call screen report
additional allocation; passing constructor counts cannot establish allocation-neutral computation.
Raw reports are `current-bigint-byte-full-defect.jsonl` and its `-replay` counterpart.
The matched full unchanged control exits zero in 44.354 seconds with the same inventory,
preparation, process count and sampling settings; `current-bigint-byte-full-control.jsonl`
retains its records. One unchanged control does not establish a false-positive rate.
Reproduce the source screen with `bun bench/source-candidates.ts codec bigint-byte-generation-timing`;
use the same substitution through `bench/compare.ts --source-candidate=codec:bigint-byte-generation-timing`
for packed comparisons, preserving the primary inventory from `bench/check.ts`.

Optimized-code captures on Node 24.21.0 retain the fixture's final-byte work despite the
immutable-value checksum observing only the version field. The real retained profiler runs
32,768 preparation calls per case and seven batches: twenty milliseconds for the codec alone,
then one millisecond per case for the complete primary inventory. The complete capture contains
all 48 cases and positive finite samples.
Its optimized codec frame retains the byte-15 load, heap-allocation sequence, conversion call
and byte-15 store; elimination of that sequence does not explain this capture. Raw compiler
output is `current-codec-bigint-optimized-code.log` and `current-codec-bigint-full-optimized-code.log`.
Run Node with `--print-opt-code --trace-opt --trace-deopt`
against the retained `candidates-codec-VFbLst/profile.mjs` and its
candidate module, using the same profile controls and the recorded primary inventory.
Compiler tracing changes execution cost. These two processes establish neither uninstrumented
timing sensitivity nor the cause of other processes' misses; keep the timing policy unchanged.

### Local checksum accumulation screen

Reject local checksum accumulation because the full comparison misses the computation defect.

The candidate reads every result through the same checksum branches but publishes the checksum
once per completed batch. Existing profiler tests pass before and after the change: 53 tests,
284 assertions, and type checking exits zero. The real fixed-call formatter records 130 measured calls
and checksum 56 with both kernels. These checks do not establish timing detection.
Full unchanged and computation-defect comparisons retain 3,072 records each: all 48 primary
calls in 16 process pairs on Node 24.21.0 and Bun 1.4.2, with 32,768 preparation calls and seven
one-millisecond batches. Both exit zero, in 58.487 and 57.775 seconds respectively.
The defect's codec ratios are 1.086 on Node and 1.218 on Bun, but their family-wide intervals
are [0.807, 2.715] and [0.495, 1.273]. Ordinary intervals exclude parity on both hosts; they
cannot replace the protected family-wide rule. Broad process shifts remain in both reports.
Restore the original profiler; these separate captures establish no lane-speed improvement.
Raw reports are `current-local-checksum-{control,defect}.jsonl`; original and
candidate source captures are in `current-preparation-v8-trace/before-local-checksum-*.ts.txt`.

### Independent compiled-loop screen

Reject independently compiled loops because both hosts miss the targeted computation defect.

Each case compiles the same typed loop separately and returns its checksum once per batch.
Both reports retain all 48 calls across 64 process groups, with 32,768 preparation calls,
seven one-millisecond batches and 16 process pairs on Node 24.21.0 and Bun 1.4.2.
The unchanged control exits zero in 54.750 seconds. The defect exits one in 77.546 seconds
for Node `plain.decode`, while codec-value ratios of 1.120 and 1.213 remain unresolved:
their family-wide intervals are [0.728, 1.236] and [0.493, 2.353]. An unrelated failure
cannot prove targeted detection. Preserve the original profiler and timing policy; these
captures do not establish the cause of process variation or a lane-speed improvement.
Reports are `current-isolated-loops-{control,defect}.jsonl`; source captures are
`current-preparation-v8-trace/{before-isolated-loops-baseline,isolated-loops-candidate}.ts.txt`.

### Fixed measured-call screen

Keep measured-call mode experimental until detection repeats within the complete-lane budget.

The unchanged profiler uses 32,768 preparation calls and seven equal-call batches in
16 process pairs on Node 24.21.0 and Bun 1.4.2. Each report retains 3,072 primary-call records,
each with 57,344 completed calls. The control exits zero in 39.688 seconds; the defect exits
one in 55.551 seconds for Bun's codec computation. Node's ratio 1.038 remains unresolved
with family-wide interval [0.952, 1.128]; Bun's ratio 1.261 has interval [1.005, 1.467].
Reports are `current-fixed-measured-8192-{control,defect}.jsonl`.

At 16,384 calls per batch, every record completes 114,688 calls with the same preparation,
process pairs and uncertainty rule. The control exits zero in 115.894 seconds; the defect
exits one in 175.067 seconds for codec computation on both hosts. Node's ratio 1.080 has
family-wide interval [1.038, 1.179]; Bun's ratio 1.250 has interval [1.032, 3.350].
Reports are `current-fixed-measured-16384-{control,defect}.jsonl`. Sampling consumes 68.364
seconds in the control and 100.931 in the defect; recorded preparation adds 25.404 and
41.474 seconds. Remaining parent time includes unmeasured setup, builds, GC and yields;
these records do not split it further. Detection has not been repeated, and neither capture
establishes complete-lane or CI headroom. Test sampling cost before adding another driver.

One batch of 16,384 calls, with the same preparation and process pairs, retains all 3,072
records on Node 26.10.0 and Bun 1.4.2. The control exits zero in 30.437 seconds; the defect
exits one in 27.547 seconds, detecting codec computation on both hosts. Their family-wide
intervals are [1.015, 1.165] and [1.186, 1.340]. Bun `plain.decode` also fails with interval
[1.252, 1.467]; the source mutation preserves output but its wider process effects remain
unresolved. Reports are `current-fixed-measured-16384-one-batch-current-{control,defect}.jsonl`.
This single screen does not prove repeated detection, other-runtime coverage or complete-lane
headroom. Changing both the Node release and sample count also prevents attributing the
elapsed difference from the earlier screen to sampling alone.

An identical repeat retains the complete inventory and passes the control in 31.031 seconds.
The defect exits one in 27.758 seconds, with codec intervals [1.005, 1.153] on Node and
[1.158, 1.292] on Bun. Bun decoding also fails again, with interval [1.310, 1.523].
Reports are `current-fixed-measured-16384-one-batch-current-repeat-{control,defect}.jsonl`.
Both primary-host screens detect this computation defect; they do not establish detection of
every material loss, its effect on decoding, other-runtime coverage or complete-lane headroom.

Bun decoder-only comparisons retain 16 process pairs and the same fixed counts. Shared
correctness setup still exercises every case. Without bulk codec work the ratio is 1.000
with interval [0.966, 1.029]; adding codec preparation gives 1.005 [0.980, 1.017]. Adding
the complete primary preparation sequence gives 1.077 [0.908, 1.374], without preceding
timed calls. None reproduces the full-inventory loss conclusively. They do not isolate its
cause or justify treating it as noise. Reports are
`current-fixed-measured-one-batch-bun-decoder-{isolated,codec-preparation,primary-preparation}.jsonl`.

The same one-batch setting retains all 3,072 records on Node 24.21.0 and Deno 2.9.7.
Both the control and computation defect exit zero. The codec ratios are 1.063 [0.977, 1.115]
on Node and 0.997 [0.962, 1.077] on Deno, using family-wide intervals. These misses reject
extending the setting to those hosts. Deno's near-one ratio does not establish whether the
injected computation survives optimization; increasing sampling alone cannot settle that.
Reports are `current-fixed-measured-one-batch-lts-deno-{control,defect}.jsonl`.

A Deno compiler-graph capture of the packed candidate retains the computation after register
allocation: instruction 239 loads byte 15, instruction 273 calls `ToNumberConvertBigInt`, and
instruction 285 stores byte 15. The graph identifies `src/masking-codec.ts` and includes the
injected source. The complete workload returns all 48 fixed-count records. This rejects
elimination in that traced compilation, not every untraced execution state; graph tracing changes
compiler scheduling and its timings cannot select code. Evidence is
`current-deno-codec-turbo/candidate/turbo-generateUuidV7Value-314.json` and adjacent `raw.log`.
The assembly-printing control emits no assembly; graph tracing does produce compiler evidence.
Launch the retained profiler directly for these diagnostics: compiler messages invalidate the
comparison's JSON-only stdout protocol. Keep the timing miss unresolved.

Doubling measured calls to 32,768, with preparation and one batch unchanged, retains the
complete Node LTS/Deno inventory. The control exits zero; the defect exits one for Node's
codec ratio 1.051 [1.011, 1.101], while Deno's 1.032 [0.893, 1.222] still misses. This
single screen neither proves repeated Node detection nor resolves Deno's execution variability.
Reports are `current-fixed-measured-32768-one-batch-lts-deno-{control,defect}.jsonl`.

The same Deno defect records vary in reported caller-thread CPU too: baseline costs span
199–251 ns per call and candidate costs span 207–267 ns. Across the 16 process pairs,
the median paired CPU ratio is 1.026 and the paired wall ratio is 1.029. CPU includes the
yield and surrounding instrumentation; these are descriptive ratios, without new confidence
intervals. Removing wall-only pauses cannot remove the recorded CPU variation. These records
do not identify its cause or justify a CPU-only gate, pause filtering or a timing-policy change.

Reversed optimization-event captures return every fixed-count case on Deno. Both value
generators, the codec wrapper and shared batch loop report TurboFan optimization before
measurement; no optimization or deoptimization event is logged during codec measurement.
Reported codec CPU still spans 222–251 ns per call for the baseline and 227–239 ns for the
candidate. This excludes a logged transition in those captures, not compilation effects in
untraced runs. Reports are `current-deno-codec-opt-events-{0,1}-{baseline,candidate}.log`.
Their heap deltas differ, but snapshots cannot identify a collection or its cost.

Native heap statistics expose `total_allocated_bytes` on Node 26.10.0 and Deno 2.9.7.
Allocation followed by collection increases this counter while live heap falls. Node 24.21.0
omits the field. Bun 1.4.2 returns it, but collection reduces its value from 1,422,302 to
906,413; that field cannot provide the same cumulative measurement. The field name and current
Node declarations do not establish runtime semantics. Use qualified counters only; an absent
counter is missing evidence, not zero allocation.
Controls retain ten MiB of typed-array backing storage, while the Node Current and Deno
counter differences remain below one MiB; the counter does not include all external storage.
Probe source and per-host records live in `current-native-heap-counter/capability-*`.

Clean profiler captures at 32,768 prepared and measured calls cover all 48 primary calls.
In two reversed process pairs, codec computation adds 1,479,648 and 1,835,056 reported heap
bytes on Node 26.10.0, and 1,199,112 and 1,444,168 on Deno 2.9.7. Deno's candidate batch
timing is lower in both pairs; allocation therefore adds evidence that timing alone misses.
The interval includes harness and engine work, excludes forced collection and reporting,
and does not measure total process allocation or external backing storage. Two pairs cannot
establish a regression budget. Bun and Node LTS captures omit the unavailable metric.
Raw records and counts live in `current-native-heap-counter/`; every process returns all cases.

Equal counts let the mean batch timing and aggregate CPU use the same call weighting.
Node's first candidate codec record averages 570 ns against 205 ns of caller-thread CPU
per call; Bun's baseline round four averages 750 ns against 79 ns. CPU covers the wider
interval including inter-batch yields, so those gaps bound time outside that thread's CPU.
They do not identify the cause or justify replacing wall timing with CPU. Unequal elapsed
batches' median timings and aggregate CPU have different weights and cannot support that bound.

### Per-case preparation screen

Reject immediate per-case preparation: the screen still misses the Bun computation defect.

The before-all and before-case controls use the same extracted preparation helper with
32,768 calls, seven one-millisecond batches and 16 process pairs per host. Each control and
the before-case defect report retains 3,072 complete primary-call records. Both controls exit
zero in 49.487 and 63.972 seconds. Before-case Bun codec process medians span 65–291 ns on
the baseline and 75–267 ns on the identical candidate, versus medians near 60 ns in the
before-all control. The before-case defect exits one in 46.990 seconds, detecting Node's
1.061 ratio with family-wide interval [1.020, 2.026] but missing Bun's 1.110 ratio. Broad
unchanged shifts remain; separate epochs cannot attribute them to placement alone.
Keep the original profiler and timing policy. Reports are
`current-case-preparation-{before-all-control,before-each-control,before-each-defect}.jsonl`;
the baseline and rejected profiler source captures are under `current-preparation-v8-trace/`
as `before-case-placement-{baseline,candidate}.ts.txt`. The rejected source selects placement
with `UUID_SLUG_PROFILE_WARMUP_BEFORE_CASE`; native captures and prior-work probes retain
before-all preparation. These source captures are experiments, not supported profiler options.
The restored worktree's `bun run check` and actual `.githooks/pre-commit` both exit zero,
with `/usr/bin/time -p` wall times of 7.42 and 6.78 seconds. `performanceBaseline()` returns
no production baseline for this worktree, so these measurements exclude changed-production
packed timing and do not close that lane or cold CI headroom. Logs are
`/tmp/uuid-slug-case-preparation-{check,hook}.log`.

### Reduced before-all preparation screen

Reject reduced preparation because the computation defect passes the protected comparison.

The original profiler uses 16,384 preparation calls, seven one-millisecond batches and
16 process pairs on Node 24.21.0 and Bun 1.4.2. Both the unchanged control and BigInt
byte-computation defect retain 3,072 records across 64 complete process groups, with every
primary call present once per group and seven positive finite samples per record.
The control exits zero in 59.754 seconds; codec-value median ratios are 0.999 on Node
and 0.904 on Bun, with family-wide intervals [0.752, 1.841] and [0.569, 2.058].
The defect also exits zero in 48.737 seconds despite ratios of 1.033 and 1.321;
its family-wide intervals [0.952, 1.174] and [0.760, 2.523] include parity on both hosts.
These observations reject this setting without establishing that preparation count causes
the misses or broad timing shifts. Stop the count reduction and retain the original policy.
Raw reports are `current-preparation-16384-{control,defect}.jsonl` in `bench/reports/`;
execution logs are `/tmp/uuid-slug-preparation-16384-{control,defect}.log`.

### Shared ending-clock screen

Reject the shared ending-clock candidate because the full comparison still misses Node's defect.

The candidate uses one timestamp for block duration and total elapsed time, replacing two
adjacent ending reads. Preparation remains 32,768 calls with seven one-millisecond batches
and 16 process pairs on Node 24.21.0 and Bun 1.4.2. Both reports retain 3,072 complete
records with seven positive finite samples each. The unchanged control exits zero in
45.234 seconds; codec-value ratios are 0.974 and 0.989 with family-wide intervals
[0.898, 1.070] and [0.869, 1.210]. The computation defect exits one in 48.205 seconds:
Bun's ratio 1.275 is detected with interval [1.188, 1.339], while Node's ratio 1.046
remains unresolved with interval [0.960, 1.137]. This fails the both-host detection criterion;
it does not establish that clock reads explain prior misses or quantify their overhead.
The original profiler remains unchanged. Reports are `current-shared-end-clock-{control,defect}.jsonl`;
raw source captures are `current-preparation-v8-trace/before-shared-end-clock-{baseline,candidate}.ts.txt`.
Logs are `/tmp/uuid-slug-shared-end-clock-{tests,control,defect}.log`. The owning benchmark
tests pass all 53 cases, including partial-batch call counts and failures after an initial witness.

### Unchanged packed graph checks

Skip primary-call regression timing when independently packed output is byte-identical; measuring
the same implementation again cannot distinguish a code regression.

For the scure benchmark-only dependency addition, the complete `bun run check` takes 269.63 seconds
before the identity check and 20.10 seconds after it on Node 24.21.0 and Bun 1.4.2. These individual
wall-clock observations include builds, subprocesses, cleanup and host scheduling; they are not
confidence bounds or the cost of checking changed production. Both executions exit zero.
`/tmp/uuid-slug-base32-check.log` and `/tmp/uuid-slug-base32-identity-check-pass.log` retain output.

Source, compiled code, manifest changes, added assets and missing files prevent the exemption;
unsupported file kinds fail. Replacing byte comparison with unconditional success fails the
owning mutation test in `/tmp/uuid-slug-identity-byte-defect.log`. A real changed-production
comparison against `a52bf59^` still runs sixteen fresh processes per runtime for `bytes.base32`
on Node and Bun and exits zero in `/tmp/uuid-slug-identity-real-change.log`. Explicit source
experiments also retain timing. The slower changed-production lane and CI headroom remain open.
