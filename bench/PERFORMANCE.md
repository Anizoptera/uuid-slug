Use runtime-native encoding and avoid intermediate decoding work; measure mixed workloads as well as isolated calls before changing the parser.

# Performance study

This measurement compares performance baseline `37f6258` with `2c5ba55` on an Apple M4 Max with 128 GiB RAM, Node 26.8.1 and Bun 1.4.2. It is a local experiment, not a cross-hardware speed guarantee. Runtime dependencies and public wire formats are unchanged.

## Method

Follow the package-import commands in [the benchmark guide](README.md#profiling). For this replay set `UUID_SLUG_PROFILE_MS=5`; retain the default seven samples. Use three fresh process pairs per runtime, alternate before/after order, and run CPU measurements sequentially. Each process exercises the same 256 deterministic inputs and all cases. The table gives the median of the three per-process medians in nanoseconds per call, including driver consumption and error classification. Small differences can reflect JIT state, scheduler noise and clock overhead; these are not confidence intervals.

Build both revisions separately and select the baseline with `UUID_SLUG_PROFILE_MODULE` pointing to its absolute file URL: emitted `dist/node/index.js` on Node, `src/index.ts` on Bun. Keep the driver identical. A filter changes warm-up history, so an isolated measurement does not explain a mixed-workload result by itself.

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

### Current TypeScript frontier

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

No further TypeScript change has positive measured value at this frontier. Deleting schema attempts,
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
- A schema-bound transform captured all eight keys as numbers and selected them through scalar
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
The retained change therefore improves a co-primary runtime, leaves the other unresolved, and removes
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

### Previous-key attempt storage

Preserve the decoded ciphertext as four scalar words, then restore the mutable block between failed
schema checks. Package-created built-in schemas retain no input, and custom callbacks receive a
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

### Runtime capability review

The 2026-09-12 review probed Node 26.8.2, Bun 1.4.2, Deno 2.9.6, and Chromium
153 twice. Node and Bun expose `node:crypto.randomUUIDv7`; Deno does not. Bun also exposes
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

Two packed Bun comparisons tested native UUID-v7 against the portable generator, then tested the
hybrid selected from that result. Keeping native hex while routing bytes and slugs through the
portable generator cut byte and caller-owned generation by 53–63%, slug generation by 24–32%, and
base32 generation by 21–28% across both hybrid replays. The canonical string route did not regress.
The split preserves wire and validation contracts and must be remeasured after a Bun update.

### Native base64url encoding

Use `Uint8Array.prototype.toBase64` when the runtime provides it; probe once at module load and keep
the fixed-size portable encoder as the fallback. Two 24-round comparisons on 2026-09-12 disabled
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

### Direct base64url slug-to-UUID formatting

Direct JavaScript decoding into canonical UUID text was rejected. One six-round packed comparison
made `slugToUuid` 46–47% slower on Node 26.8.2 and about 100% slower on Bun 1.4.2 while adding about
0.77 KiB to the minified UUID module. Avoiding one 16-byte array did not repay fixed-block decode and
hex assembly; the current byte decoder plus runtime-selected formatter remains smaller and faster.
Reconsider only if the native formatter disappears or a direct string primitive replaces JavaScript
concatenation.

### Direct base32hex slug-to-UUID formatting

Direct JavaScript decoding into canonical UUID text was rejected. One six-round packed comparison
made `slugToUuid` 28–29% slower on Node 26.8.2 and about 115% slower on Bun 1.4.2 while adding about
0.44 KiB to the minified UUID module. Avoiding one 16-byte array did not repay bit accumulation and
hex assembly; the current fixed decoder plus runtime-selected formatter remains smaller and faster.
Reconsider only if the native formatter disappears or a direct string primitive replaces JavaScript
concatenation.

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

Built-in mask exception bypass was rejected. Marking built-in schema handles as non-throwing added
a protocol field and a per-call branch so only custom callbacks entered `try`/`catch`. Two
eight-round packed screens found no repeatable built-in win. Node timestamp extraction regressed
4.1–6.5% in both screens; one screen also regressed caller-owned decode by 9.3%. Custom Node decode
regressed 7.7% in the second screen, showing that the shared branch moved cost onto the protected
extension path. Existing Node and Bun tests failed when the custom catch was removed, proving they
detect lost exception containment and original-cause preservation. Keep one contained path; retest
only if an engine demonstrates material exception-region overhead without adding hot-path dispatch.

Private built-in schema dispatch was rejected. A local `WeakMap` associated built-in handles with
their Feistel keys, preserving the existing callback protocol for custom and duplicate-copy handles
while dispatching local built-ins directly. Two eight-round packed screens found no statistically
distinct built-in route on Node 24.20.0 or Bun 1.4.1. The first screen regressed Node custom decode
by 2.7–9.8%; that loss did not repeat, but no built-in gain emerged to pay for the map, lookup, and
second constructor. Reversing only the direct branch failed six frozen built-in wire vectors while
custom vectors passed. Keep the single callback protocol; retest only if direct dispatch produces a
repeatable primary-runtime route gain large enough to exceed its compatibility machinery.

Schema seed encoding is selected by the runtime module. Node uses `Buffer.from`; Bun, Deno, and
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

Keep native UUID generation only for output forms the host produces directly. Bun supplies canonical
text, base64url, and owned bytes, while Node supplies canonical text when its runtime exposes UUIDv7;
base32hex and unsupported explicit-time forms stay portable rather than parse or coerce a native
result. Existing throughput captures show Node's native UUIDv7 more than doubled the package text
route and cached native UUID generation avoided several-fold entropy-call cost. The 2026-09-12 Bun
entropy replay produced 200,000 distinct conforming package values and matched the native generator's
observed 12-bit progression; native entropy remained below JavaScript instrumentation, so this does
not prove its internal source. Bypassing native delegation failed the shared Node and Bun runtime
tests on native output and dual-failure preservation. Retest delegation per output form if a host
changes its native contract or a repeated complete-route comparison favors the portable path.

Validate each newly observed native generator once, then trust it while its function identity stays
stable. This removes repeated canonical-text validation without hiding replacement adapters; native
throws still enter the portable fallback on every call. The earlier captured-hook experiment retained
per-call output validation, so it did not test this mechanism. Revalidate every output only if a host
can intermittently violate its UUID contract without replacing the function.

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
formatter was re-screened after that discovery and lost on Chromium without closing Node or Deno, so
engines with `Uint8Array.toHex` keep the native intermediate string.
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

Migration state is already constructed only by the explicit `createMigrationDecoder` call.
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

### Profiler capture boundary

Corpus construction, outcome verification, case selection, and warm-up finish before native CPU and
allocation sampling starts. Chromium publishes its runner only after that preparation; the driver
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
frequency. Synthetic frequency would encode the result into the workload. Keep `UuidSlugError`
construction until real traffic and complete-route attribution show material cost; `Error` identity,
stack, cause, code, and diagnostics remain public behavior, not removable work. Removing diagnostic
errors or callback-owned buffers would change contracts, not remove waste.

Exhaustive current-mask candidate decoding allocates one private 16-byte block and restores it from
four scalar ciphertext words between schemas. Keep first-match migration separate: sharing that
setup measurably slowed Chromium's common path. Two 12-round packed replays on 2026-09-12 measured
8- and 16-schema candidate gains of 9.9–13.9% on Node, 7.6–15.5% on Bun, 38.0–44.9% on Deno, and
7.1–12.8% on Chromium; one-schema first-match intervals included no change in both replays. The
resource probe observed one slice at 16 schemas. Custom callbacks still receive isolated bytes,
and the original decoded block remains available to later migration formats. A later six-round
replay measured 19% on Node 26.8.2, 21% on Bun 1.4.2, 44% on Deno 2.9.6, and 15% on Chromium 153;
the Node JITless interval included no change.

Keep linear candidate deduplication. Ordinary migration yields at most current, original, and plain
interpretations; only deliberately overlapping custom schemas can produce dozens. Two all-runtime
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

Native offset UUID formatting converts the whole buffer only through 32 bytes; larger buffers keep a
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

`bun run perf:check` protects JavaScript-visible allocation, decoding, encoding and entropy work, plus coarse relative pipeline timings on both runtimes. Its injected result-preserving regressions must fail. Shared functional cases protect wire identity, ownership, invalid input and optional native branches. Async cases protect snapshots, UTF-8 chunk boundaries, cancellation and independent concurrent constructions; changing host yields to microtasks makes cancellation fail.

The Bun test lane uses two isolated workers. Automatic parallelism increased contention without
shortening the complete local check on 2026-09-11; change the cap only after measuring the complete
lane with the same corpus and isolation.

The benchmark harness runs only its independent child-process cases concurrently. On Bun 1.4.2,
five-run medians fell from 655 ms to 266 ms for that file and from 889 ms to 693 ms for the complete
Bun test lane. Keep parser and statistics cases serial; they do not wait and gain nothing from overlap.

## UUID competitor audit

Use `bun run bench:competitors` to compare the package's JavaScript paths with current npm
alternatives. Each case validates its output before warm-up, rotates measurement order, yields
between bounded samples, and fails on duplicate, missing, malformed, empty, or non-finite results.

The retained set covers the most-downloaded packages and every distinct relevant strategy found:
`uuid`, `@smithy/uuid`, `@lukeed/uuid`, `uuidv7`, `crypto-randomuuid`, `uuid-random`, `uniku`,
`@kripod/uuidv7`, `uuidv7-js`, and `fastv7`. Official npm downloads for 2026-09-05 through
2026-09-11 ranged from 206,849,086 for `uuid` to 293 for `fastv7`; low-download packages remain
only where their strategy or API differs. The deprecated `uuidv4` wrapper and older duplicate
generators add no independent implementation evidence.

| Capability | Strongest retained alternatives | This package |
| --- | --- | --- |
| v4 generation | `uuid` and `uniku`: text and caller buffer; smaller packages: text or owned bytes | Text, owned bytes, caller buffer, direct slug |
| v7 generation | `uuid` and `uniku`: text and caller buffer; `uuidv7`: text and owned object bytes | Text, owned bytes, caller buffer, direct or masked slug |
| Controlled generation | `uuid`: entropy, timestamp, sequence; `uuidv7`: isolated generator and rollback policy | Injectable entropy and clock, isolated generator, explicit timestamp |
| Inspection | `uuid`: validate/version; `uniku`: validate/convert/timestamp; `uuidv7`: parse/format/version/variant | Typed guards, parse/format, slug conversion, timestamp and window checks |
| Timestamp extraction | `uuidv7-js`: validated v7 text; `uniku`: canonical text without v7 rejection | Validated v7 UUID text, bytes with offset, direct slugs, and codec-owned masked slugs |

No measured gap justifies another public API. Batch helpers are a loop over generation and would add
surface without new capability. NIL/MAX constants and permissive UUID spellings do not support this
package's strict v4/v7 slug contract. `uuidv7` exposes finer clock-rollback policy; add such policy
only if a consumer needs behavior other than the current monotonic generator contract.

A full local run on 2026-09-12 used Node 24.21.0, Bun 1.4.2, Deno 2.9.6, and Chromium, with nine
20 ms samples after 32 ms warm-up per case. The package led every measured allocated-byte and
caller-buffer group except Deno v7 allocation, where `uuidv7` was about 3% faster. Native v4 text
was within 1% of Node's platform primitive; Deno paid about 34% over its primitive for the package's
validation and error-value boundary; Chromium's portable text was about 4% behind `@lukeed/uuid`.
The package led v7 text on Bun. `fastv7` led by about 9% on Deno, 15% on Node, and 9% on Chromium,
but has a 12-bit zero-based sequence, bounded rollback policy, no caller-controlled clock, and no
error-value or reentrancy boundary; adopting those omissions would weaken this package's contract.
Validated text timestamp extraction was within about 3% of `uuidv7-js` on Node and Deno and 15% on
Chromium. `uniku` timestamp results are not ranked because its call accepts non-v7 UUID text.

These are single-machine warm-throughput observations, not universal rankings. Process startup,
bundle size, memory, operating-system entropy quality, other hardware, and other engine versions
were not measured. Platform rows expose wrapper cost; they are floors, not APIs that satisfy the
package's failure contract.

The gates do not prove all performance properties. Relative timing cannot detect a slowdown shared by both sides. Constructor counters cannot see every engine allocation. Latest-runtime CI complements pinned runs, but this study did not execute hosted CI or measure every OS/architecture. Keep these limits when interpreting a pass.
