Use runtime-native encoding and avoid intermediate decoding work; measure mixed workloads as well as isolated calls before changing the parser.

# Performance study

This measurement compares performance baseline `37f6258` with `2c5ba55` on an Apple M4 Max with 128 GiB RAM, Node 26.8.1 and Bun 1.4.2. It is a local experiment, not a cross-hardware speed guarantee. Runtime dependencies and public wire formats are unchanged.

## Method

Follow the package-import commands in [the benchmark guide](README.md#profiling). For this replay set `UUID_SLUG_PROFILE_MS=5`; retain the default seven samples. Use three fresh process pairs per runtime, alternate before/after order, and run CPU measurements sequentially. Each process exercises the same 256 deterministic inputs and all cases. The table gives the median of the three per-process medians in nanoseconds per call, including driver consumption and error classification. Small differences can reflect JIT state, scheduler noise and clock overhead; these are not confidence intervals.

Build both revisions separately and select the baseline with `UUID_SLUG_PROFILE_MODULE` pointing to its absolute file URL: emitted `dist/node/index.js` on Node, `src/index.ts` on Bun. Keep the driver identical. A filter changes warm-up history, so an isolated measurement does not explain a mixed-workload result by itself.

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
| `construct.schema` | 523 | 463 | 402 | 297 |

## Costs removed and alternatives rejected

- Native hexadecimal/base64 encoding replaces JavaScript assembly where supported. Older runtimes keep portable paths. Exact-sized buffers bypass redundant views; caller-owned generation writes at the requested offset.
- Boolean validation no longer constructs decoded buffers or discarded errors. A scanner shared with parsing regressed Bun in the measured trial and was rejected; both paths retain the same character table and contract corpus.
- Rotation decodes text once and constructs a mismatch error only after all explicit keys fail. Custom callbacks still receive owned bytes. Removing those copies would alter ownership semantics.
- TimestampValidation consumes decoded bytes directly. Formatting remains at string-returning boundaries; it is not part of validation.
- Async and synchronous construction share hash arithmetic and final key expansion. The initial continuation rewrite regressed masking; a single state branch replaced repeated optional-state lookups. Native generators remain delegated without introducing an ordering requirement.
- Portable v7 currently requests 16 bytes from its entropy callback for both initial and
  same-millisecond generation. Requesting only the four consumed continuation bytes reduced pool
  demand but measured about 2% slower on Bun's `v7.bytes` path, so it added a branch without a
  demonstrated consumer-path gain. Callbacks fill the supplied view and must not depend on its
  current length; revisit the internal draw size only with a measured end-to-end improvement.
- Node's mixed-workload parser row regresses while isolated parsing improves. Restoring the exact baseline parser inside the current package measured about 93 ns for parsing and 74 ns for caller-owned parsing, versus 82/62 ns with the final parser. Direct lookup inlining and a combined sign check did not improve the mixed result and were discarded. This rules out restoring the old parser as a remedy; it does not identify the remaining JIT/workload cause. The mixed result remains disclosed, not relabelled as a speedup.

### Rejected TypeScript hot-path shapes

Use the general HalfSipHash path and the four-word check-tag loop. Retest only when a runtime or
compiler change moves either result outside the identical-code noise band.

On 2026-09-11, `bun run bench:compare HEAD` packed both revisions and ran six or eight alternating
fresh-process rounds on Node 24.20.0, Bun 1.4.1, Deno 2.9.6, and Chrome 152. An identical-code control
put all masked median ratios within 3.3% of 1.0 under the same warm-up policy.

- A separate fixed-eight-byte HalfSipHash function removed continuation, tail, length, and input-array
  handling from Feistel rounds. Bun improved by 2–4%; Node and Deno stayed near the control band;
  Chrome's built-in masked routes regressed by 8.7–19.9%. The function also duplicated the hash core.
- Fixed-offset expansion of the four-word check-tag loop produced no consistent runtime win. Selected
  masked routes regressed by up to 4.9% on Node, 8.2% on Deno, and 13.9% on Chrome.
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

An internal unchecked formatter removed range validation from the exact fallback but produced no
distinguishable gain in a 24-round screen on any runtime. Keep one validated formatter until a
string-assembly change improves the complete fallback rather than only removing its boundary check.
A fixed template using the same byte-pair table produced no formatter win and made Node offset
formatting 2.3% slower with its 95% median interval above no change; retain the compact loop.
Replacing the entropy pool's copy-and-erase loop with `set(subarray)` plus ranged `fill` regressed
UUIDv4 byte routes by 57–88% on Node, 60–95% on Bun, 20–108% on Deno, and 65–87% on Chromium.
The allocated view and two native calls cost more than one 16-byte JavaScript loop.
A separate fixed-16 loop improved Node caller-owned UUIDv4 by 4.7–5.1% and Chromium UUIDv4 byte
routes, but Bun gained nothing and Node portable-v7 caller output regressed by 5.3% in one replay.
The extra dispatch moved JIT cost among pool consumers instead of reducing the shared work.

## Allocation and key rotation

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
model. Removing diagnostic errors or callback-owned buffers would change contracts, not remove waste.

## Regression protection and limits

`bun run perf:check` protects JavaScript-visible allocation, decoding, encoding and entropy work, plus coarse relative pipeline timings on both runtimes. Its injected result-preserving regressions must fail. Shared functional cases protect wire identity, ownership, invalid input and optional native branches. Async cases protect snapshots, UTF-8 chunk boundaries, cancellation and independent concurrent constructions; changing host yields to microtasks makes cancellation fail.

The Bun test lane uses two isolated workers. Automatic parallelism increased contention without
shortening the complete local check on 2026-09-11; change the cap only after measuring the complete
lane with the same corpus and isolation.

The gates do not prove all performance properties. Relative timing cannot detect a slowdown shared by both sides. Constructor counters cannot see every engine allocation. Latest-runtime CI complements pinned runs, but this study did not execute hosted CI or measure every OS/architecture. Keep these limits when interpreting a pass.
