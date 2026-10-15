# Performance decisions

Each entry: the decision, the evidence that decided it, alternatives that lost, and what would reopen it.

## Primary TypeScript call review

### Canonical timestamp-validation results

**Keep: timestamp validation that returns canonical slug text reuses decoded bytes and precomputed sentinel text.**

- Why: no material loss on canonical calls repeats on Node 24.21.0, Bun 1.4.2, Deno 2.9.7, Chromium 153.0.8010.12, Firefox 155.0, WebKit 26.6 and Node without JIT. Node 26.10.0 cost ratios: plain base64url 0.779 and 0.773, plain base32hex 0.866 and 0.849.
- Contract: uppercase base32hex calls on Bun and WebKit pay for normalization. The old code skipped it and returned the untouched string, which breaks the canonical-result contract; that cost is required.
- The private plain decoder drops one temporary byte array per call. The existing resource guard rejects restoring that array. Total allocation versus the old code, and allocation parity off Node/Bun/Deno/Chromium, are unmeasured.

**Open defect: explicit `null` timestamp references are not rejected correctly.** Every fix tried so far corrects it but lacks no-loss evidence on normal calls, so none is retained. Each candidate passes a three-reader null regression that fails on current production.

Rejected fixes (Node 26.10/26.11 and Bun 1.4.2 host screens; other runtimes, profiles and total allocation unmeasured):
- Reference-only destructuring: Node 26.10.0 uppercase base32hex plain validation ratio 1.050 (95% 1.001–1.076); Bun clock-default text 1.024 (1.002–3.012). Measured loss.
- Null rejection inside the nullish fallback: all sixteen median-ratio intervals span parity. Inconclusive, so no-loss is not established.
- Finite-number-first selection (validate supplied numbers, default only omitted references): 14 of 16 intervals include parity; Bun masked calls 1.209–1.266 with intervals including parity. Cannot establish no loss.
- Scalar default-parameter selection: Bun masked base32hex ratio 5.429 (95% 1.177–39.855) on Node 26.11.0/Bun 1.4.2. Rejected; cause unknown.

Reopen when: a candidate fixes null rejection and shows no normal-call loss on Node and Bun host screens, then on other runtimes.

### Native Bun default UUIDv7 text

**Keep: Bun default UUIDv7 text delegates directly to native `randomUUIDv7`; Node keeps the package's own generator.**

- Why: Bun 1.4.2 cost ratio 0.578 (95% 0.569–0.620) versus the portable path; Node 26.10.0 ratio 1.061 (1.013–1.110), a loss. Profiles show the Bun path replacing portable formatting and entropy work with native generation.
- Rejected: one shared native implementation for both runtimes; its Node loss rejects that implementation, not native Bun generation.
- The retained default text leads qualified libraries, including `fastv7`, on Node Current, Node LTS, Bun, Deno and Chromium (warm throughput).
- The remaining difference against calling native directly is negligible and accepted. Bun 1.4.2 caller CPU per 2,097,152 calls: package 89.061/88.384 ms vs native 86.946/87.807 ms; second-window committed memory flat. Bun base64url slugs: package 62.699/63.965 ns vs native slugs 66.410/65.579 ns.
- Do not add another wrapper or rewrite the wrapper; preserve direct delegation. Allocation inside native generation is unmeasured.

### Reported Node engine allocation

**Keep these Node calls: both process orders report lower engine heap allocation and caller CPU than each tested matching alternative.**

Node 26.10.0, built `dist/index.js` public API; libraries `uuid` 14.0.2, `uuidv7` 1.2.1, `fastv7` 1.0.2, `slugid` 5.0.1. Every measured alternative passes the payload and private-storage ownership oracle. Reported heap bytes per call:

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

- Limits: engine heap counters include harness work and exclude external backing storage; they do not replace the throughput ranking or prove total allocation or other-runtime parity. No regression threshold follows from them.
- Open gap: UUIDv7 slug generation reports 92–94 bytes per call with no matching alternative compared.

### Bun UUIDv4 slug resources

**Open gap: on Bun 1.4.2 a scratch-backed native composition (Web Crypto into private scratch + native `toBase64`) beats the package UUIDv4 slug call by a few ns, and package first-window memory commitment is higher. Keep the production implementation and its byte pool; no tried integration closes the gap.**

- Gap: package ~43–51 ns vs native scratch 43.8–45.6 ns (ranked medians) and pooled native composition (package byte draw + native encoding) ~40.5–43.9 ns. Package first-window commitment grows 33.9–44.9 MB vs 5.8–14.5 MB for native with allocated bytes; package second windows stay flat (one native-scratch capture grew 8.0 MB). The memory cause is unestablished. Profiles: package time sits in native Latin-1 `toString`; native compositions sit in `toBase64`.
- Pool kept: the pooled composition matches or beats direct Web Crypto + native encoding (41.0–42.8 vs 42.1–42.5 ns), so no pooling penalty is established.
- Node Current, Node LTS, Deno and Chromium favor the package against their measured rivals; Node LTS lacks `toBase64`.
- Contract for any integration: share the one native/fallback writer (no duplicated probe, options, entropy buffer or fallback state); native present/absent/throwing probes must call native 2/0/1 times; corrupt native output must fail the observed-byte oracle; base32 and conversion must not lose.

Rejected integrations (all pass Node/Bun behavior and resource proofs):
- `alphabet:native-leaf` (native `toBase64` at the alphabet leaf): no reproducible commitment drop (45.1/42.7 MB vs 37.7/44.9 MB) and slug generation loses (60.7/69.7 vs 55.2/53.5 ns).
- Native encoding inside slug generation with primitive-preset recognition: small base64url gain comes with base32 cost.
- Generation through the existing `uuidBytesToPlainSlug` converter: no reproduced gain (base64url 44.0/45.7 vs 43.7/44.8 ns).
- Writer extraction (extract the existing writer into one function for conversion and generation): packed Node 26.10.0 base32 ratios 1.084 and 1.081; Bun generation gain not established (0.974, 0.718 with intervals spanning 1).
- `shared-selected` (initialization picks the encoder when native is absent): packed Bun base32 1.037 [1.004, 1.072] and conversion 1.035 [1.008, 1.133] lose; generation gain unresolved.
- `shared-direct` (alphabet selection inside the shared writer): packed Bun generation gains (0.965, 0.933) but base32 loses direction (1.073 [1.026, 1.478], 1.030 [0.997, 1.071]). Further integration must keep base32 off the extra writer.
- `shared-entry` (direct base32 dispatch, native check before alphabet selection): generation differences too small (Bun 42.5/41.6 vs 42.6/42.5 ns) and Node conversion slower (87.7/89.4 vs 85.9/86.4 ns).

Limits: Bun package batches show extreme outliers (e.g. 166.2 ns medians) that exit CPU profiles do not reproduce or explain; gross allocation and individual-call tails are unmeasured.

Reopen when: a design that keeps one shared writer produces a repeated packed complete-call generation gain on Bun without base32 or conversion loss, or new evidence identifies the first-window memory cause.
### Owned UUIDv7 generation allocation

**Keep the owned UUIDv7 generator.** Equal-call profiles estimate fewer bytes allocated beneath the measured loop than the qualified byte-producing rivals.

- Node 26.10.0, public packed package: about 65.5 MB sampled allocation beneath the loop, against about 85.3 MB for `uuidv7` and about 101 MB for `uuid`. Sampled estimates only: setup and warm-up excluded; output allocation is inlined into the loop frame and cannot be discarded as harness overhead. Profiling changes CPU cost, so throughput decisions use the unsampled ranking.
- Bun 1.4.2: package first-window caller CPU 78,734/73,899 µs against `uuidv7` 87,887/88,585 and `uuid` 77,640/81,968; second-window committed growth 0/0 bytes against `uuidv7` 0/1,048,576 and `uuid` 3,145,728/3,670,016. Package beats `uuidv7` in both orders; the `uuid` comparison changes direction. No repeated CPU disadvantage and no continuing committed-memory growth. These captures do not establish gross allocation parity or leak freedom.
- Fresh-process medians: Bun package 32.636 ns, `uuid` 36.682, `uuidv7` 37.069; Deno 148.323, 191.850, 157.073 ns.
- Older byte losses do not justify another rewrite.
- The profiler's forwarding-count regression must fail when the corpus ignores the requested package module (a substituted generator still returns valid UUIDs).
- Reproduce with `bench/profile-bun-memory.ts`, its fixed-call controls and the named qualified generation cases. Native Buffer-copy comparisons stay separate from this library comparison.

**Owned slug decoding: keep; it is faster than the equivalent native calls (2026-10).** Resource gap stays open; no production substitution.

- Deno 2.9.7: package 170/172 ns; native `fromBase64` 302/319; native `setFromBase64` into a fresh array 320/333; Buffer decode plus copy 285/296. Process CPU per call: package 228/232 ns, native alternatives 356–390 ns.
- Bun 1.4.2: package 24/25 ns; native array decode 74/76; native writes 80/82; Buffer copies 115/120.
- Node 24.21.0: package 95/93 ns; Buffer copies 194/188.
- Limits: profiled timings include instrumentation. Deno sampled allocation attributes substantial bytes to every decoder, package included (Buffer copies also allocate through `byteLength` and `getEncodingOps`); total bytes per call and resource parity are not established.

**Argument-free UUIDv7 generation: reject both early default branch (`default-fast`) and split default wrapper (`default-split`).**

- Packed Node 26.10.0 (2026-10): explicit-time calls cost 1.108× baseline with the split [1.06, 1.15] and 1.129× with the early branch [1.10, 1.19]. The early branch's default gain, 0.959 [0.91, 0.98], does not offset the configured-call loss. Firefox 155.0 also shows slower explicit-time calls; Bun 1.4.2 and Deno 2.9.7 unresolved. Chromium, WebKit and Node JITless results cannot override the Node configured-call rejection.
- Source screens that only consume object shape cannot support a field-consumption claim; timing loops must read a generated field.
- The `default-lost-throw` mutation fails the shared entropy test in Node and Bun.
- No new native profile or Node LTS retention replay is justified after this rejection.

**Reject a shared frozen empty options record.** Bun default-value medians favor it, but codec-value medians lose in three of four processes; Node effects vary (Node 26.10.0, Bun 1.4.2, Deno 2.9.7, 2026-10). Rejected before packed replay. Private-field value construction and generation stay unchanged; remaining value-generation and native-floor gaps are not settled.

**Competitor matrices (2026-10, one M4 Max).** Node 26.10.0, Node 24.21.0, Bun 1.4.2, Deno 2.9.7 and Chromium 153.0.8010.12. Throughput screens only, not resource parity or per-call latency.

**Default UUIDv7 text: keep the package; native Bun gap stays open.**

- Bun 1.4.2: package 73.61/72.31 ns vs native UUIDv7 47.02/46.12 ns (ratio about 1.57). Fastest qualified library `uniku` 188.38/184.48 ns; `fastv7` 125.45/123.16 ns.
- Timestamp drift alone does not disqualify default generation under the generation policy in `dev/interface.md`.
- Native UUIDv4 timestamp repair rejected: 173.26/161.54 ns with hexadecimal slicing, 112.69/106.61 ns with fixed character prefixes, both before adding validation or native-failure fallback. Node and Deno also favor the package. This rejects those two mechanisms, not every native repair. Replacing timestamp and version retains all 74 UUIDv7 payload bits.

**Reject cached native UUIDv7 clock repair for text (Bun 1.4.2, 2026-10).** All four forms lose before package validation or fallback; their lower bounds already lose.

| Bun 1.4.2 text result | Bundled median ns | Source median ns |
| --- | ---: | ---: |
| Package default | 73.80 | 74.79 |
| Native UUIDv7 without repair | 48.25 | 52.29 |
| Default native clock, unconditional repair | 113.12 | 114.23 |
| Default native clock, conditional repair | 112.43 | 114.87 |
| Explicit native clock, unconditional repair | 109.47 | 111.87 |
| Explicit native clock, conditional repair | 101.13 | 104.04 |

The oracle checks matching/mismatching timestamps, rollback, carry boundaries and unchanged payload bits; timestamp-loss and payload-loss mutations fail it. This does not reject other repair mechanisms or close native parity. Allocation, cold start and tail latency unmeasured.

**Reject cached native UUIDv7 slug clock repair (Bun 1.4.2, 2026-10).** Every repaired form loses to the package in every process.

| Bun base64url slug result | Median of process medians ns |
| --- | ---: |
| Package default | 79.10 |
| Native UUIDv7 without repair | 64.74 |
| Default native clock, unconditional repair | 123.25 |
| Default native clock, conditional repair | 128.66 |
| Explicit native clock, unconditional repair | 118.75 |
| Explicit native clock, conditional repair | 109.85 |

The shorter slug prefix does not rescue this design. The native floor stays faster, and its timestamp-overflow mismatch stays a separate adoption constraint. Other runtimes and different repairs unmeasured.

**Direct UUIDv7 text construction (`v7-draw` candidates): not retained.** Variants: character codes, native Latin-1 text with individual hex lookups, native Latin-1 with paired lookups. All preserve sequence and entropy handling.

- Bun 1.4.2 (2026-10): paired lookups 75.20/74.12 vs package 79.07/79.30 ns, then 82.64/74.99 vs 80.12/79.26 — the gain reverses in one process; plain-slug controls lose (80.95/81.17 vs package 76.00/77.64 ns). Character codes lose Bun text; individual Latin-1 lookups show only small changes. No new formatter or shared-table refactor is justified.
- Paired output adds one 512-byte lookup array; mixed use would retain both formatter implementations unless storage were shared.
- Mutation proofs (missing tail, missing timestamp, native-only tail) must fail before a screen counts. Native parity stays open.

**Reused-prefix native text (`direct-text-reused-prefix`): production retention unresolved.** Reuses timestamp and upper-counter characters only while timestamp, counter words and selected case table all match; other runtimes keep the original formatter. The stale-prefix mutation must fail Bun timestamp, payload-bit and selected-generator assertions.

- Source screens: Bun text about 74 vs 78–81 ns baseline; slug and Node byte controls regress or change direction.
- Packed (Node 26.10.0, Bun 1.4.2, 2026-10): Bun lowercase/uppercase text 0.877/0.885 and 0.893/0.883, but Node slug 1.022 [1.01, 1.05] and 1.019, Bun slug 1.074 [1.00, 17.05]. Long wall-time pauses outside measured CPU (about 100 ms, cause unknown) are part of the evidence.
- Node source profiles show the same top functions (base64url writing, clock reading) for baseline and candidate; they do not explain the packed slug loss.
- Reopen when profiles resolve the other primary-call losses; added case tables, native storage, generator closures and total allocation remain open.

**Reject capability-gated draw creation (`direct-text-reused-prefix-native-only`) as a fix.** Node slug 85.67/88.54 vs 85.12/86.08 ns; Bun owned bytes 46.81/48.28 vs 45.54/46.49 ns; Bun text still lower (71.19/75.18 vs 79.18/76.55). Conditional closure creation alone is insufficient; no packed replay warranted.

**Reject prefix comparison in the general native byte formatter (`format reused-prefix`).** Bun byte-to-text conversion 42.51/39.77 vs 37.81/38.74 ns outweighs the generation gain (75.45/75.17 vs 77.38/77.67). This rejects the tested general formatter, not a shared formatter accepting generator fields directly. Unexplained long Node pauses (19310 ns slug, 2173 ns conversion) remain unresolved.

**Keep Latin-1 conversion for Bun UUID text; reject UTF-8 and ASCII readers (Bun 1.4.2, 2026-10).** Text: UTF-8 85.71/87.28, ASCII 81.06/85.20 vs 79.64/78.61 ns. Conversion: UTF-8 46.80/47.77, ASCII 44.50/45.11 vs 37.11/38.56 ns. Does not establish exact native decoder cost or a string-allocation floor.

**Reject shared generator-field formatters (`shared-text`, `shared-text-prefix`).** Uncached Bun text gains (74.28/78.62 vs 77.41/81.88 ns) but Node slug loses (86.13/90.99 vs 85.00/85.98). Cached Bun text 76.05/73.41 ns but conversion loses (38.95/40.30 vs 36.71/38.15). Cache invalidation on ordinary conversion needs an interleaved conversion witness to catch a missing invalidation. Does not prove direct field formatting cannot work; packed, cold-construction and allocation unmeasured.

**Default-text CPU attribution (Bun 1.4.2, 2026-10, `bench/profile.ts`, `=v7.string`).** Native string conversion plus the Latin-1 formatter take most samples beneath `generateUuidV7` (56/93, 51/88); pooled copying two. Investigate text construction before pool-copy changes for default text. Coarse sampling; says nothing about byte and slug calls.

**Owned bytes need separate attribution.** Bun: 83/129 samples beneath the public byte call (30 wrapper, 33 generator body); inlining prevents per-check attribution. Deno source profile assigns 814/1092 samples to `bytes`, no separate wrapper frame. `uuid` and `uuidv7` also allocate fresh arrays. Only complete-call replays justify substituting a dispatch bypass, ownership or pooling change.

**Reject the private default-byte draw (`direct-owned-draw`, `cached-owned-draw`); keep the existing method.** Bun bytes 48.08/47.53 vs 50.08/50.11 ns, then 48.83/50.54 vs 50.52/49.95; cached-reference directions vary on Node and Deno. No reproducible gain. The lost-byte mutation must fail the module-default byte oracle on Node and Bun.

**Older matrices superseded.** Native burst timestamp drift keeps native rows as floors, not approved replacements. Bun base64url encoding trails native encoding. Deno decoding trails a Buffer-only floor that does not supply the promised owned plain `Uint8Array`; the owned native comparison favors the package on Deno. Most Node and Chromium generation and conversion calls lead the measured libraries.

**Prioritize Bun's native text gap over the owned-byte comparison (2026-10).** Bun 1.4.2 default text 73.45/72.66 vs native 49.12/49.16 ns; package text beats every qualified library on all runtimes measured; native Bun timestamp behavior still blocks direct adoption. Owned bytes 39.74/39.77 vs `uuid` 39.89/39.27 ns (direction changes; not equivalence). Caller-buffer calls stay slower, 38.75/39.88 vs 33.65/34.06 ns; secondary to default text.

**Canonical guard: no V8 library loss.** Package vs `uuid.validate` (2026-10): Node Current 36.30/52.85 and 34.99/51.50 ns; Node LTS 37.81/54.53 and 36.28/55.42; Deno 35.15/54.16 and 35.43/54.07; Chromium 34.61/51.71 and 35.35/54.50. Bun mixed: 24.76/25.44 and 27.69/26.22. Covers the canonical input corpus only. The cold-import heap increase remains unresolved.

**Reject reused native buffer copy for Bun plain-slug encoding.** `Buffer.alloc(16)` once plus `set` and `toString("base64url")`: 68.83/67.58 vs public call 61.03/63.34 ns (Bun 1.4.2). Rejects the copy-based proposal, not direct encoding from native generation storage. Exploratory: no mutation proof.

**Reject `numeric-clock-first` and `timestamp-words`.** Numeric-first clock recognition has inconsistent Node direction and loses Bun owned bytes; fixed timestamp stores lose Bun owned bytes and slug. Reproduce: `bun bench/source-candidates.ts v7-draw numeric-clock-first timestamp-words` with `UUID_SLUG_COMPARE_NODE_EXECUTABLE`.

**Keep the separate safe-integer check after truncation (`bounded-clock` rejected).** Deno byte effects reverse; Bun text 83.03 vs 78.13 ns in one order. Validation and owned-byte gaps stay open.

**Clock overflow must fail both runtime proofs.** The shared numeric-clock case checks invalid readings, valid endpoints, fractional truncation and unchanged caller storage; the overflow mutation fails it in Node and Bun. It proves the timestamp bound, not entropy or every generation contract.

**Keep generator text on the module's existing scratch buffer (scratch sharing).** A private scratch-draw method adds a function per generator with unresolved Bun effects; the direct module formatter has not earned replacing cached generator text delegation. Sharing the buffer saves one retained 16-byte array: lazy text-generator init allocates one array and one view, and the `duplicate-text-scratch` mutation fails the Bun resource witness (two arrays vs limit one). Packed default-slug gains reproduce on Node Current 0.954–0.957 and WebKit 0.933–0.950; Deno 0.947 [0.94, 0.97]; Node LTS 0.940 [0.92, 0.99]; Bun unresolved 0.968–0.970. Bun native-floor gap and competitor resource comparisons stay open.

**Keep the module-default scratch draw uncached (`keyless cached-draw` rejected).** Bun slug gains reverse between screens (e.g. 78.93/80.42 and 78.56/83.70 ns baseline/candidate). No retained function reference.

**Created-generator payload fixtures do not protect the module-default slug draw.** A pinned final byte passed the earlier proof. The shared real-entropy test exercises both alphabets and paired output and rejects that mutation in Node and Bun (`__test__/runtime-boundary-probe.ts`). It detects fixed tail bits, not bias or independence.

**Reject `owned-range-zero` (skip range validation for fresh owned bytes at offset zero).** Node and Bun bytes improve, but Deno bytes rise from 152–153 to 156 ns and Bun text rises: it moves cost onto other primary calls.

**Keep the primitive-preset dedicated pair path.** Packed default-pair ratios: Node Current 0.858–0.866, Bun 0.853–0.859, Chromium 0.795–0.814, Deno 0.815–0.873; Node control replay 0.851 [0.84, 0.87]. Firefox and WebKit unresolved. One replay also shows slower unchanged Node controls, so collateral loss is not ruled out. Selected-generator text 1.018 [1.00, 1.05] despite unchanged implementation remains a retention uncertainty.

**Plain-slug conversion vs slugid 5.0.1 and short-uuid 6.0.3.** Package/slugid ratios 0.096–0.213 encode, 0.077–0.332 decode (repeat 0.097–0.213, 0.078–0.327), valid canonical v4 input on Node Current, Node LTS, Bun, Deno, Chromium. short-uuid uses `any-base` numeric conversion, so its output has different bit alignment and is not an interchangeable canonical plain slug; it is timed separately with integer witnesses. No representation change is implied for issued slugs. Malformed input, allocation and other UUID versions unmeasured.

**Parsed UUID writers format private bytes directly, without repeating public byte validation (keep).** Packed default-text ratios: Node Current 0.703–0.706, Bun 0.785–0.808, Chromium 0.941–0.943, Deno 0.677–0.697; Firefox, WebKit and JITless also gain. Chromium focused: parsing 0.999 [0.97, 1.03] (unresolved, not equivalent), text 0.943, slug 0.931. Changed methods create no counted arrays, views or errors. Selector validation stays intact; caller-buffer byte conversions carry the private-storage defect in §Parsed UUID value state.

**Keep the dedicated two-string pair call rather than composing public conversions (2026-10).** Pair vs composition: Node 26.10.0 117/119 vs 147/149 ns; Node 24.21.0 120/118 vs 148/147; Bun 1.4.2 105/109 vs 119/122; Deno 2.9.7 110/112 vs 213/222; Chromium 153.0.8010.12 113/109 vs 138/135. Both strings consumed; a decoding witness requires equal payloads. Allocation unmeasured; Bun's internal preset-path cost is a candidate, not an established defect.

Measurements are local on an Apple M4 Max (128 GiB), not a cross-hardware guarantee. Runtime dependencies and public wire formats are unchanged.
## Identifier integrity boundaries

**Keep owned decoding without the redundant array copy, the private ownership stamp for package codecs, and the full copy-and-validate path for external codec callbacks.**

- Owned UUID text and plain-slug decoding build one array, not two. Packed median ratios 2026-10: text to owned bytes 0.80–0.84 Node 26.8.2, 0.77–0.81 Bun 1.4.2, 0.74–0.78 Chromium 153, 0.63–0.67 Deno 2.9.7; base64url slug to bytes 0.71–0.76 on Node/Bun. Node 26.8.2 JITless gains (0.94–0.98) stay unresolved. Node and Bun constructor counters require exactly one array; restoring the copy fails that check. Borrowed bytes still need isolation.
- Package codecs borrow immutable UUID storage through a private ownership stamp. A `WeakSet` registration was rejected because it raised codec construction cost. The stamp adds 14–17 ns to Node 26.8.2 parsed masking and 5–7 ns on Node 24 LTS; construction cost is unresolved. Reopen if engine private-field costs change.
- External codec callbacks get a byte copy, original-version validation and returned-spelling validation. Without them a callback could mutate private storage or return malformed branded results. Their slowdown (1.27–1.29 Node 26.8.2, 1.78–1.81 Deno) is a safety cost, not an optimization target; removing the checks fails the ownership and malformed-result regressions.
- Rust 1.98.1 sentinel base32hex decode (`UUID_SLUG_PROFILE_FILTER=sentinel/base32 UUID_SLUG_RUST_BENCH_RAW=1 bun bench/rust.ts`): canonical 2.0–3.9 ns, uppercase 11.3–20.3 ns; core peak RSS about 1.8 MiB. These are absolute costs, not an improvement claim, and do not cover scaling with sentinel count.

Limits: profile timings include instrumentation and do not replace packed ratios; sampled allocation and retained heap do not prove total allocation volume or leak freedom.

## Method

Packed comparisons: `bun bench/compare.ts <baseline>` (also `bun run bench:compare`), filtered with `UUID_SLUG_PROFILE_FILTER=<ops>`; pick Node through `UUID_SLUG_COMPARE_NODE_EXECUTABLE`. Source comparisons build both revisions separately and point `UUID_SLUG_PROFILE_MODULE` at the built file on Node or `src/index.ts` on Bun, with an identical driver. See [the benchmark guide](README.md#run-a-comparison).

Decisions rest on paired candidate/baseline median ratios from alternating fresh processes, repeated in at least two independent replays; a result counts only when its 95% interval excludes 1 in both. What the instruments cannot show:

- A filter changes warm-up history, so an isolated result does not explain a mixed-workload result, and vice versa. Isolation alone does not prove a mixed-corpus loss was noise.
- Results are batch throughput on one Apple M4 Max for the named releases; they do not give individual-call latency (p99), other hardware, or other releases.
- Native CPU/heap profiles include instrumentation; sampled heaps and resource counters do not establish total allocation volume, leak freedom or resource parity. Missing allocation samples do not prove zero allocation.
- Equal-duration profiling overrepresents rare errors and setup; sample share is not consumer frequency.
- Absence of a repeated loss does not prove equivalence.

### Bun 1.4.2 retained-change replay

**All changes retained under Bun 1.4.1 stay retained under Bun 1.4.2 (2026-09), with one placement repair.**

- Sentinel indexing kept its large hit-path gains; owned UUIDv4 output improved 5–8%.
- Fixed base32hex encoding fallback improved 4–5%; fixed base64url decoding fallback 18–24%. Native-shadowed base64url encoding, fixed base32hex decoding, the portable UUIDv7 timestamp split, borrowed masking scratch, codec-owned masking storage and runtime-selected UTF-8 encoding showed no repeated Bun movement; their cross-runtime or resource evidence remains the retention basis. Of entropy changes only rollback caller-owned output repeated a Bun gain.
- Creating previous-key scratch above the primary attempt regressed Bun's current-key string path 31–35%. Create it only after the primary attempt misses (superseded by scalar words, see Previous-key attempt storage).
- Keep the single in-place mask output block: restoring a second block in the current tree improved no encode route. The interaction with the composed tree decides, not the old boundary alone.

Bun results do not transfer to Node, Chromium or Deno.

### Remaining TypeScript costs

**No further optimization of key rotation or sentinel construction; keep direct synchronous execution.**

Full-corpus profiles (2026-09, Node 24.20.0, Bun 1.4.2, Deno 2.9.6, Chromium 151): codec construction with 16 sentinels is the largest row at 7.1–21.7 µs, paid once per codec and scaling with sentinel count. The largest steady-state row is a last match among 16 previous keys at 2.5–3.0 µs. Bun samples attribute the mixed corpus mainly to HalfSipHash, expected error construction, alphabet encoding, sentinel construction and Feistel traversal.

Constraints: caller key order and first-match semantics require every earlier key to be tried, because the wire format carries no key selector.

Rejected:
- Deleting attempts, reordering keys automatically, or adding a wire key selector: changes accepted identifiers or first-match behavior; a selector also changes issued IDs, exposes key selection and cannot mark existing values.
- Parallel attempts: cannot return before every earlier key resolves; adds coordination.
- Decode caches: no caller trace establishes repeated identical decodes; a bounded cache adds mutable capacity and invalidation without workload evidence; an unbounded cache violates the resource contract.
- Workers / off-thread execution: ordinary synchronous calls finish below worker startup, messaging and transfer costs; blocking on a worker adds latency.
- Construction-time uniform dispatch, direct built-in dispatch, hash/Feistel specializations, alternate byte layouts, platform delegates: each lost a primary route or gave no repeated gain (see sections below).

Reopen when a new mechanism removes complete-route work, or a measured consumer trace supplies reuse distance and frequency for a cache and shows total memory and latency benefit. Async execution needs an explicitly approved public async contract for a workload exceeding the fixed costs.

## Native development boundaries

**Development bridges (Node-API and FFI) are research lanes only, not npm distribution candidates; the data does not rank adapters beyond this machine.**

`bun bench/rust.ts` builds and measures every host lane after the shared conformance corpus passes. Medians on Apple M4 Max, 2026-09:

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

Fixed dispatch is an empty JSON request; single and batch rows include JSON encode/dispatch/decode; direct calls cross the typed string boundary without JSON. Node and Deno FFI add about 263–338 ns per direct call over Node-API; Bun FFI and Node-API are close. Batch-64 rows converge within about 18 ns/id because shared Rust and JSON work dominate. Peak RSS is a high-water mark, not allocation volume.

## Measured calls

**Undated before/after snapshot of the main TypeScript optimization pass (ns per call); keep as the reference for which calls the removed costs below affected.** Largest movements:

| Call | Node before | Node after | Bun before | Bun after |
|---|---:|---:|---:|---:|
| `v7.at` | 384 | 167 | 61 | 63 |
| `portable.string` | 978 | 727 | 335 | 109 |
| `v4.slug` | 296 | 153 | 256 | 69 |
| `format` | 204 | 99 | 211 | 69 |
| `plain.encode` | 317 | 181 | 245 | 71 |
| `guard.invalid.uuid` | 3267 | 8 | 142 | 15 |
| `guard.invalid.slug` | 4044 | 16 | 187 | 21 |
| `timestamp.slug` | 409 | 95 | 288 | 49 |
| `rotation.previous` | 4423 | 485 | 666 | 373 |
| `sentinel.decode` | 76 | 11 | 40 | 8 |
| `construct.codec` | 1990 | 1510 | 1912 | 1028 |

Regressions in that snapshot: Node `parse` 68 → 82 and `parse.into` 49 → 62 (see the parser note below and UUID text parsing, which later cut parsing roughly in half); `invalid.*` error rows were unchanged (error construction dominates).

## Costs removed and alternatives rejected

- **Keep** Bun writing UUID text and slugs through reused Latin-1 scratch; other engines build fixed UUID spellings with one character-code call. Generic payload lengths keep native or portable encoding. Caller-owned generation writes at the requested offset.
- **Keep** boolean validation free of decoded buffers and discarded errors. **Rejected:** a scanner shared with parsing (regressed Bun). Both paths keep the same character table and contract corpus.
- **Keep** rotation decoding text once and building a mismatch error only after all explicit keys fail. Custom callbacks still receive owned bytes; removing those copies would change ownership semantics.
- **Keep** timestamp validation consuming decoded bytes directly; formatting stays at string-returning boundaries.
- **Keep** async and sync construction sharing hash arithmetic and final key expansion, with a single state branch instead of repeated optional-state lookups. **Rejected:** the first continuation rewrite (regressed masking).
- **Keep** portable v7 requesting 16 bytes per entropy callback for initial and same-millisecond generation. **Rejected:** requesting only the four consumed continuation bytes (about 2% slower on Bun `v7.bytes`). Callbacks must fill the supplied view and not depend on its length. Reopen only with a measured end-to-end gain.
- **Keep** object-input probes in `stringInput` and `uuidByteView` ordered: local identity first, then the object tag, and the caller's own `Symbol.toStringTag` lookup last and lazily. Calling a probe on a non-matching object throws a native `TypeError`, whose construction dominated: a plain object cost 1,447 ns (Node 24.21.0) / 220 ns (Bun 1.4.2) per `stringInput` call and 1,597 / 221 ns per `uuidByteView`; the ordered check cuts these to 10.3 / 7.9 ns and 11.5 / 6.1 ns (2026-09). Valid `ArrayBuffer` and `DataView` costs are unchanged; primitive strings are unchanged; genuine `String` wrappers pay a tag read (Node 4.82 → 7.54 ns, Bun 2.12 → 6.41 ns). **Rejected:** reading the tag before identity or computing the own-tag lookup eagerly (costs valid `ArrayBuffer` 65 ns, `DataView` 76 ns on Node). `bench/resources.ts` counters cannot gate this (a native `TypeError` bypasses the `globalThis.Error` construct trap); the cross-realm and hidden-tag test cases gate acceptance. Remeasure if a probe stops throwing.
- **No parser change for the old Node mixed-workload row.** Controlled order tests on Node 26.8.2 (2026-09) found no reproducible candidate slowdown (single-family ratios 0.86–0.96). Restoring the baseline parser stayed slower; direct lookup inlining and a combined sign check did not help. Treat the row as benchmark history. Reopen only when a public workload reproduces a slowdown twice and a code-shape candidate predicts it.

### Rejected TypeScript hot-path shapes

**Keep the general HalfSipHash path for the check tag (the Feistel round now inlines it; see Feistel round function), the monomorphic typed-array hash input, module-level typed scratch, the compact reversible four-round Feistel loop, indexed keys, shift-based byte-order helpers and the four-word check-tag loop.** Retest only when a runtime or compiler change moves a result outside the identical-code noise band (about ±3.3% on masked routes, Node 24.20.0, Bun 1.4.1, Deno 2.9.6, Chrome 152, 2026-09).

Rejected (each in two packed replays unless noted):
- Separate fixed-eight-byte HalfSipHash function called from the round: Bun +2–4%, Chrome masked routes 8.7–19.9% slower; duplicates the hash core. (Writing the rounds out inside `feistel16` later won; see Feistel round function.)
- Fixed-eight-byte branch inside the shared hash: Node masking 3–7% slower; Deno and Chromium also regressed.
- Union-discriminated hash input (scalar message words): Bun byte decode 3–8% slower, Chromium 9–21% slower. Retest scalar input only through a distinct entry that keeps the general hash call monomorphic.
- Separate array and scalar entries over one union core: Node masked 2.7–6.4% slower, Chromium 9–23% slower. Retest after engine changes to wrapper inlining or union-core specialization.
- Ordinary numeric arrays for Feistel scratch: Node 2.1–6.2% slower, Chromium 22–50% slower, Deno regressed. Keep signed 32-bit typed storage despite its 30-byte packed cost. Retest only if every target engine changes numeric-array or polymorphic indexed access.
- Per-call typed scratch (reentrant): Node 7.4–20.6% slower, Bun 4.1–6.7% slower. Retest only if engines show escape analysis for these arrays on packed public routes.
- Per-codec bound scratch with a factory: no gain, two Bun regressions. Module scratch is valid while the transform stays synchronous and callback-free; reopen closure ownership if that changes.
- Unrolled four-round Feistel (+230 packed bytes), split mask/unmask loops (+80 bytes), mask-bound scalar keys (+170 bytes), inlined big-endian reads/writes (+200 bytes; Chromium regressed), unrolled compression rounds, unrolled finalization rounds, preselected key start/stride: no repeated Bun or Node gain. Retest only if a primary engine stops optimizing the constant trip count, inlining the fixed-offset helpers, or makes the per-round direction choice dominant.
- `DataView` Feistel word I/O: Node 18–46%, Bun 29–69%, Deno 6–14%, Chromium 47–110% slower. Retest only if views can be reused safely across caller buffers or engines remove their whole-route cost.
- Fixed-offset expansion of the check-tag loop: up to 4.9% slower Node, 8.2% Deno, 13.9% Chrome.
- Passing four pre-read tagged words through an optional built-in-mask protocol: no encode route improved twice. Retest only if a primary engine inlines the scalar protocol without making the transform polymorphic. Tuple, scratch-array, callback and mask-only Feistel copy variants add more hot work or a second cipher owner, so they were not timed.

These isolate public routes, not machine-code differences. The fixed-length trial changed message dispatch and argument shape together, so it rejects neither mechanism independently.

### Final KDF scratch reuse

**Rejected: reusing scratch inside final round-key expansion; keep separate input and output arrays.** Self-aliased one-word input introduced aliasing. The non-aliasing variant (one output array plus two scalar chain-A words) improved construction 1–4% on Node and 5–9% on Deno, but made Chromium eight-iteration string construction about 45% slower (2026-09). Reopen when complete construction improves across iteration boundaries; allocation count alone does not justify the browser loss.

### Cooperative UTF-8 packing

**Rejected: direct `TextEncoder.encodeInto` packing; keep the one-pass chunk encoder.** The candidate (count UTF-8 bytes in bounded slices, allocate exact word storage, encode into its byte view) never improved elapsed work on Node 26.8.2, Bun 1.4.2, Deno 2.9.6 or Chromium 153 across 16 B–1 MiB inputs (2026-09); at 1 MiB it was about 35% slower on Node and 12% on Bun.

Live checkpoint sampling showed encoded chunks and packed words as two peer seed-sized owners (Node 26.8.2: 2.36 / 9.38 / 37.44 MB of `ArrayBuffer` at 1 / 4 / 16 MiB seeds). The candidate removes one owner but adds a slower second Unicode pass. Sampling covers checkpoints only, not gross allocation, strings, or browser/Deno heaps. Reopen only with a real large-seed workload whose peak-memory budget outweighs the elapsed loss.

### Cooperative KDF state

**Keep the call-local generator and hash continuation.** They resume packing, absorption and iteration without shared mutable state; cancellation discards only that call and concurrent calls advance independently. A manual iterator changes bookkeeping, not the seed storage each chain must replay per iteration. One fixed buffer cannot replace the packed seed without replaying its source (see Cooperative UTF-8 packing). Changing the KDF to avoid replay would change all issued identifiers.

Correctness constraints:
- Read each mask seed and sentinel UUID once, then validate and use that captured value; an accessor could otherwise feed different values to validation and construction. Node and Bun mutation tests distinguish repeated reads. This affects setup, not per-identifier calls.
- Byte-seed capture must finish before the async constructor returns its promise; the mutation regression changes caller bytes and options right after the call and requires the original label, work factor and derived key. Rejected: deferring the copy (changes observable keys); transferring the caller buffer (detaches caller storage); a worker (still needs the synchronous copy, then adds startup, scheduling, cancellation and fallback). Reopen only if a host primitive can snapshot caller storage synchronously without that copy.

### Owned masking blocks

**Mask UUID bytes in place only when the codec owns the block; caller-supplied byte arrays keep the copying path.** UUID strings parse into a private 16-byte block and codec generation uses its package-owned byte source, so one buffer allocation goes away with no public change. String encoding improved 4.7–5.8% Node 24.20.0, 4.6–4.7% Bun 1.4.1, 4.3–5.9% Chromium 151, 18.2–18.7% Deno 2.9.6; generation 3.9–4.3%, 3.3%, 3.3–4.6%, 10.3–12.0% (2026-09).

Borrowed-byte encoding stayed unresolved on Node, Bun and Chromium; Deno regressed 3.0–3.6% in the mixed workload, accepted under runtime priority (Bun and Node first, Chromium second, Deno third). Rejected: a duplicated guard closure (slower Bun borrowed route twice); indirect dispatch and split guard helpers (slowed a primary borrowed route). Keep one shared guard path with a final direct ownership branch. Revisit if a runtime changes either primary result.

### Borrowed masking scratch

**Copy caller-owned UUID bytes into one codec-local block before masking instead of allocating per call.** Valid because built-in transforms are synchronous and callback-free, and custom transforms get their own copy before user code runs, so nested calls cannot mutate the outer input. If either boundary changes, the scratch must become call-local or explicitly reentrancy-isolated. The block ends as the returned masked payload; it never holds a key or pooled entropy. Decode callbacks and async derivation can overlap, so their mutable storage stays call-local.

`masked.encode.bytes` (2026-09): Node 24.20.0 5.0–5.8% faster, Deno 2.9.6 25.4–25.5% faster, Bun and Chromium unresolved. The resource probe measures zero per-call buffers instead of one; restoring the copying helper fails it.

### Sentinel encode lookup

**Index canonical sentinel UUID strings at codec construction; string encoding checks the map once, and a miss parses without repeating the lookup as a byte scan.** At 16 sentinels (2026-09, Node 24.20.0, Bun 1.4.1, Deno 2.9.6, Chromium 151) string hits improved 86–97% and misses 8–28%; construction was unresolved or slightly faster.

Rejected: map lookup followed by the original string-to-byte scan (misses 4.6% Node, 5.7% Bun, 1.8% Deno, 2.0% Chromium slower at eight sentinels). Restore a string scan only if sentinel strings stop being canonical keys or complete-route measurements show the map losing at supported cardinalities.

**Index byte sentinels only at 16 or more entries.** Compare the first entry directly, then use a 32-bit fingerprint in an open-addressed, power-of-two, at-most-half-full typed-array table; full 16-byte equality still decides identity, so deliberate collisions cannot select the wrong sentinel. Smaller sets keep the inline linear scan. At 16 sentinels middle hits improved 53–56% Node 26.8.2, 22–37% Bun 1.4.2, 61–63% Chromium 153, 53–55% Deno 2.9.6, 58–59% JITless; last hits 59–77%. At 64: middle 54–87%, last 74–92%, misses 41–65%. Collision corpora kept the gains; no small-set or string row regressed twice. Typed arrays cost about 3% (16) and 7% (64) less retained codec memory than a `Map` index (which added about 49 bytes per entry); steady hits allocate nothing.

Rejected:
- Last-word map: same-tail inputs restore a linear chain; Bun and JITless 4–7% slower. A lazy second map fixes it but duplicates state.
- Thresholds of four and eight: setup not repaid; Bun eight-entry middle route regressed.
- Sorted fingerprint array: Bun first hits 9–12% slower, Node 6–16% movements.
- Calling an indexed helper below the crossover: repeatable 12–14% first-hit loss, so the linear path stays inline.
- Built-in fingerprint `Map`: open addressing beat it by 23–35% Node, 6–14% Bun, 16–22% Chromium, 24–34% Deno on middle/last hits. Reconsider if an engine reverses a primary-runtime result.
- Packed scalar sentinel words: Node 6–12%, Bun 6–8% faster hits, but decoding must return canonical bytes, so it doubled index storage (256 → 512 B at 16, 1,024 → 2,048 B at 64), added about 0.24 KiB minified, slowed Node construction 3–5% and repeated a 3–6% Bun miss loss. Reconsider only if decode no longer needs retained bytes or an engine compares them without a second representation.
- Packed 32-bit comparison of retained bytes: exact matches 15% (Bun) / 25% (Node) faster in isolation, early mismatches 6–8% slower; restricted to fingerprint matches, Bun hits gained 8–28% but every Node JITless indexed middle/last hit regressed 12–17%. `DataView` comparison was 5–15 times slower (two views per call). Keep the early-exit byte loop. Reopen if an engine supplies allocation-free unaligned loads or JITless stops paying for word assembly.

Reopen the threshold or index shape when engine or workload evidence moves the crossover or retained memory becomes worth the lookup loss.

### Masked sentinel collision check

**Look up a masked base64url slug among sentinel slugs only when its outer check tail is zero.** Sentinel slugs are plain encodings with zero trailing bits, so any other tail cannot collide. Argument-free `masked.generate` ratios (2026-09): 0.60–0.62 Node 26.8.2, 0.64–0.74 Chromium 153, 0.77–0.81 Deno 2.9.6, 0.87–0.88 Node 24.21.0; Bun 1.4.2 and JITless unresolved. `masked.encode.bytes` improved 7–18% on Deno and Node 24.21.0. On Node byte encoding the row total did not move although the encoder's self time fell 66 → 12 ns: the lookup was flattening V8's concatenated base64url string, so without it the caller's first read pays for flattening.

### Previous-key attempt storage

**Preserve the decoded ciphertext as four scalar words and restore the mutable block with one fixed write before each previous-key attempt; no outer scratch arrays.** Built-in masks retain no input and custom callbacks get a separate inner copy. Valid while the ciphertext is one fixed 16-byte block. Removing the restoration makes the owning tests reject valid rotated slugs.

Evidence (2026-09, Node, Bun 1.4.2, Deno, Chromium): no route regressed; previous-key byte decoding improved 13–16% Node, 10–16% Bun, 38–42% Deno, 17–21% Chromium. The resource lane sees one buffer per previous-key decode (the returned block), no scratch, views or discarded errors.

Rejected:
- Per-key outer allocation and the earlier scratch array: scalar words beat them (scratch had given 8-key last-hit gains of 9–11% over per-key allocation).
- Creating scratch above the primary attempt: Bun 1.4.2 current-key string decoding 31–35% slower.
- Second block on fallback plus iterator work: 8–34% regressions on Node, Deno and Chromium rotation routes.
- Construction-time `[current, ...previous]` array with one uniform loop: no repeated gain. Keep the separate current-key fast path until a precompiled operation removes measured per-attempt work.

### Discarded errors on successful reads

**A successful read never builds an error it throws away; on V8 each one captures a stack costing more than the conversion.** `readObjectUuidInput` builds an error only when no reader accepts the object, and `unmaskSlug` reports a check miss as `undefined`. Median ns, 2026-09:

| Route | Node 26.8.2 | Bun 1.4.2 | Chromium | Deno 2.9.6 | Node JITless |
| --- | ---: | ---: | ---: | ---: | ---: |
| `codec.uuidToString(plain slug)` | 5,959–6,091 → 380–382 | 505–549 → 298–303 | 2,170–2,214 → 354–362 | 7,419–7,423 → 748–768 | 10,929–10,991 → 9,657–9,797 |
| `uuidToString(parsed Uuid)` | 5,582–5,613 → 189–192 | 303–329 → 120–122 | 1,817–2,003 → 128–133 | 5,717–5,792 → 146–150 | 2,158–2,205 → 718–724 |

Rejected: a `decodeMaskedSlug` wrapper building the miss error around `unmaskSlug` (Node `maskedSlugToUuidString` text 16–20% slower); direct calls restore parity. `bench/resources.ts` gates zero errors on the codec plain-slug read and parsed-UUID text and masked conversion. Remeasure if engine error construction stops capturing stacks.

### Generation option reading

**Copy generation options into one object by assigning each accepted own property; calls without options never reach the reader.** Spreading one conditional literal per option allocated a temporary object per key. Ratios 2026-09: `v7.at` 0.77–0.84 on Node 26.8.2, Node 24.21.0, Chromium 153 and Deno 2.9.6, 0.31–0.33 Bun 1.4.2, 0.93–0.95 JITless; selected-generator slug 0.90 Node 26.8.2, 0.52–0.53 Bun. Argument-free `masked.generate` is unresolved (identical-code runs spread 0.98–1.03).

### Selected generator reads

**A package generator passed as `generator` draws straight from its private sequence, recognized by a `#field in value` brand test.** The private field is added before freezing, so lookalikes and proxies cannot carry it and the object keeps its plain prototype and keys. The sequence writes fresh or caller-owned bytes after the usual `at` and range checks. Any other object takes the structural, untrusted path: validated object, scratch buffer, byte validation, `at` check, copy. On that path slug, text and masked-slug writers skip the copy because they never return the bytes; byte and UUID-value results still copy, because the generator may keep a reference to its output.

Evidence 2026-09 (brand plus sequence draw): `v7.bytes.selected-generator` 0.70–0.81 on every runtime; `construct.generator.default` 0.76–0.79 Node 26.8.2, 0.85–0.88 Bun 1.4.2; `construct.generator` 0.70–0.81. Accepted cost: caller-built generators on the structural route also run the brand test (Node 24.21.0 1.08 and Chromium 153 1.05 slower in some replays). Keyless `v7.at`, `v7.slug` and `masked.generate` never reach this code.

Rejected:
- Module `WeakSet` recognition: made generator construction 1.13–1.40 times slower.
- Module `WeakMap` from generator to sequence: default creation 610 ns vs 380 ns (`WeakSet`) vs 277 ns (none), Node 26.8.2.
- Module-private symbol property: `Object.getOwnPropertySymbols` exposes it, so a lookalike could claim package origin.

### Keyless option draws

**Module-level `generateUuidV7`, `generateUuidV7Bytes`, `generatePlainUuidV7Slug` and `generateUuidV7Value` read options once and pass the normalized instant, output and offset to the module generator's internal draw**, instead of building a new options object for its public method. Text formatting draws into module scratch, valid because it reads the bytes before returning and module generators run no caller code. Argument-free calls never read options. Ratios 2026-09: `v7.at` 0.63–0.83 across Node 26.8.2/24.21.0, Bun 1.4.2, Chromium 153, Deno 2.9.6; `value.generate.at` 0.40–0.65; JITless 0.66–0.88. No argument-free row was slower twice.

### UUID text formatting

**Bun formats UUID bytes through reused ASCII scratch with fixed direct writes and one `toString("latin1")`; WebKit uses native hex plus hyphen insertion when native hex exists; other engines use one fixed-argument `String.fromCharCode` call with case-specific codes selected before writing. The fixed writer stays inside the formatter.**

Evidence for the selected shape against the former formatter (2026-10), ratios:
- Node 26.10.0: text 0.63–0.68, uppercase 0.72–0.74, base64url bytes 0.58–0.61, base32hex 0.65.
- Chromium 153: text 0.48, uppercase 0.25–0.27, base32hex 0.28–0.29. Deno 2.9.7 0.62–0.81. JITless 0.58–0.69.
- WebKit 26.6: base32hex 0.28–0.30, others unresolved; Firefox 155 uppercase 0.44–0.46, base32hex 0.50.
- Bun fixed direct writes vs the indexing loop: default UUIDv7 text 0.90/0.92, uppercase 0.91/0.89, byte-to-text 0.89/0.88, parsed lowercase 0.85/0.86.
- No successful production call was slower with both intervals above 1 across seven runtimes and installed Node 22–26 and Bun 1.3.14–1.4.2 releases. The only repeated slower row was invalid-slug rejection on Node, not a performance target.

Native-selection regression: fails on Node 26.10.0 (which has hex) when selection is removed. An engine lacking hex cannot prove it.

Rejected:
- All-fixed formatter everywhere: WebKit `v4.bytes` 1.07–1.08 and `guard.bytes.any` 1.28–1.43 slower in mixed workloads, located in the formatter (isolated comparisons did not reproduce; isolation does not prove noise). Native hex on WebKit gives up the isolated fixed-writer gain to avoid these losses.
- Separate or same-file formatter helper: Chromium sentinel base32hex decoding 1.31–1.33 times baseline. Attributes to the changed function, not an identified engine mechanism.
- One 16-bit table entry per hex pair: WebKit `v4.bytes` 1.13–1.17.
- Native ASCII decoder through shared scratch: WebKit base64url bytes 2.04 times, UUIDv4 slug generation 2.13 times baseline.
- 16-bit or 32-bit `DataView` stores for Bun's writer: no consistent default-text and conversion gain.
- Fresh `Buffer.allocUnsafe(36)` per call: 35–42% slower than reused scratch. `TextDecoder("latin1")`: slower than `toHex` on Node and Deno. Undocumented `Buffer#latin1Slice`: saves only 2–7 ns.
- Accepted cost of the Latin-1 path: Node 26.8.2 JITless is 1.42–2.40 times slower because it interprets 32 typed-array writes one by one; higher-priority runtimes outweigh that rung.

Owned-output contract: allocated-generation benchmark rows require a plain `Uint8Array` with different backing storage on each call (`__test__/benchmark.bun.test.ts`). Bun native `Buffer` generation is rejected as an owned-output floor; compare against the fastest complete copy (fresh array plus `set` or the copying constructor, about 64–69 ns on Bun 1.4.2), not generic iteration.

Open gaps (2026-10): Bun default UUIDv4 text trails its fastest reference at 1.17–1.19; Bun package v7 bytes 45–48 ns vs `uuid` 40–41 ns; Deno 2.9.7 package v7 bytes 149–161 ns vs `uuidv7` 135–150 ns. Chromium default UUIDv4 text leads `@lukeed/uuid/secure` (58 vs 116 ns); Deno's 1.00 ratio does not establish superiority.

Reopen when `toHex` or a native formatter stops trailing `Buffer#toString("latin1")` on Node, Bun or Deno, or when WebKit's mixed-workload formatter loss changes.

### UUID text parsing

**Decode UUID text in one pass: a 128-entry nibble table marks non-hex characters with bit 8, the loop ORs every code and pair, and one check after the loop rejects bad text.** Caller output receives bytes only after that check, from module scratch. Ratios 2026-09: `parse` 0.49–0.50 Node 26.8.2, 0.29–0.30 Bun 1.4.2, 0.52–0.53 Node 24.21.0, 0.59–0.62 Chromium 153, 0.67–0.68 Deno 2.9.6, 0.34–0.35 JITless; `masked.encode` 0.70–0.86. Recheck if a native hex decoder accepts hyphenated text or the accepted UUID spellings change.

### Canonical UUID text

**`uuidToString` and a codec's `uuidToString` return canonical lowercase text unchanged when lowercase output is selected; decoded bytes and `plainSlugToUuidString` results go straight to the unchecked formatter** (a successful decode always yields 16 bytes). Canonical text, 2026-09: Node 26.8.2 299–308 → 77–78 ns, Bun 1.4.2 236–243 → 35 ns, Node JITless 4,338–4,342 → 747–748 ns. `bench/resources.ts` gates zero buffers, errors, hex calls and character reads on canonical text for both methods.

Accepted cost: a Bun sentinel read through the codec costs about 4 ns more because the larger method is no longer inlined into a one-line caller (raising Bun's JSC inlining limits removes the difference).

Rejected: checking for a sentinel before canonical text (same loss); moving both checks into a helper (about 5 ns loss); keeping `bytesToUuidString` at the end of the codec method (did not recover Bun); a `typeof uuid === "string"` guard ahead of the keyless check (Node 24.21.0 mixed-case 7–9% slower). Remeasure when either method changes shape or engines change inlining limits.

**Canonical guards keep regular expressions.** A character loop took 135 ns Node 26.8.2 and 64 ns Bun vs 72 and 24 ns for `UUID_RE`.

**Pair hexadecimal digits in the guard expression on V8 engines, Firefox and WebKit; Bun keeps the original expression.** `isUuidString` 2026-10: Node 26.10.0 and Deno 2.9.7 about 75–78 → 38–42 ns, Chromium 153 81–82 → 44 ns, Firefox 155 78–83 → 46–47 ns, Node 24.21.0 ratio 0.507. Rejected: pairing on Bun (slowed successful base32hex normalization repeatedly); fully expanding every digit (lost on mixed-case normalization in Chromium and Deno).

Against competitors the guard leads the best reference (`uuid.validate`) at 0.59–0.72 on Node Current/LTS, Deno and Chromium. Open gaps: Bun 0.992 vs the direct expression and 1.055 vs `uuid.validate`, unresolved; Bun gross allocation unmeasured; Bun import net heap rose 17,408 bytes with the change, unexplained (source paths and cache conditions were not isolated). Recheck with matched entry paths and cache conditions before attributing it to the expression.

### Parsed UUID value state

**A parsed or generated `Uuid` keeps its bytes, codec and payload layout in private fields of `LocalUuidValue`.** Text parsed without a codec keeps its freshly decoded bytes; byte input and codec-returned bytes are copied. Rejected: a module `WeakMap` (one registration per value cost more than the rest of creation, plus a state object and frozen layout copy per value). Effect 2026-09: `parseUuid(text)` 304–326 → 222–228 ns Node 26.8.2, 225–231 → 146–152 ns Bun 1.4.2; `generateUuidV7Value()` 218–231 → 110–113 ns Node, 162–181 → 68 ns Bun; Node 24.21.0 ratios 0.41–0.65. `bench/resources.ts` allows one buffer for `parseUuid(text)` (the `WeakMap` version used two).

**Open defect: caller-buffer conversions can expose private bytes.** On Bun 1.4.2, a destination whose `set` method is replaced can retain the source and zero it; later reads through `value.toBytes`, root `uuidToBytes` and codec `uuidToBytes` then return zeroes. Candidate fixes pass the shared ownership regression but none establishes the required normal-call no-loss condition, so none is retained:
- Intrinsic copying: WebKit 26.6 owned/caller-write ratios 1.099 / 1.090 (slower).
- Indexed copying or an isolated indexed helper: caller writes improve, owned-copy cost unresolved.
- Captured intrinsic: 1.136 / 1.588 on WebKit.
- Shared intrinsic copy with early owned-copy return (also protects cached sentinel reads): WebKit normal-call cost unresolved.
- Unbound captured `Uint8Array.prototype.set` via `.call`: Bun owned-copy 23 → 24–26 ns; not justified.
- `Function.prototype.call` bound to the intrinsic: Bun caller writes 16.6 → 33 ns; rejected.
- Private writer isolating range validation and intrinsic copy: WebKit ratios 0.995 / 1.028, both unresolved; not retained.

Reproduce candidates with `bun bench/source-candidates.ts parsed-value <candidate>` (e.g. `UUID_SLUG_CANDIDATE_RUNTIMES=bun UUID_SLUG_PROFILE_MS=2 UUID_SLUG_PROFILE_SAMPLES=3 bun bench/source-candidates.ts parsed-value bound-native-copy`).

### UUIDv7 payload assembly

**`uuidV7PayloadFromBytesUnchecked` assembles the upper 34 and lower 40 payload bits as exact numbers and joins them with one BigInt shift; fields use `BigInt.asUintN`.** `extractUuidV7Payload(text)` reads decoded bytes directly instead of a copy. Rejected: per-byte BigInt conversion and shift-built masks (assembly 124 → 52 ns Node 26.8.2, 243 → 41 ns Bun 1.4.2). Packed `extractUuidV7Payload(bytes)` 2026-09: 252–256 → 149 ns Node, 383–393 → 124 ns Bun, faster on every runtime; Node 24.21.0 ratios 0.59 (bytes) and 0.65 (text). Timestamp extraction and formatting were not slower.

### Runtime capability review

**Keep runtime dispatch capability-based; shared Node API names do not imply shared implementation.** Probed 2026-09 on Node 26.8.2, Bun 1.4.2, Deno 2.9.6, Chromium 153:
- Node and Bun expose `node:crypto.randomUUIDv7`; Deno does not. Node's 74 payload bits show no counter and same-millisecond values order near chance. Bun advances a 12-bit counter. Module-level text promises no ordering, and default native text and slug results are trusted directly without result validation or identity tracking (see Native floors).
- `Bun.randomUUIDv7` buffer form returns a `Buffer`, accepts explicit zero, and throws `ERR_OUT_OF_RANGE` on NaN.
- All four mutate and return the supplied `getRandomValues` view, support `encodeInto`, and produce `AP8` from native base64url. Node, Deno and Chromium reject a 65,537-byte entropy request with `QuotaExceededError`; Bun accepts it. The package draws fixed 16-byte requests, so no route changes.
- Deno's Node-compatible `resourceUsage` exposes the counters the profiler uses.

Re-run the review after a runtime changes and periodically before runtime performance work. Release notes and property presence are candidate discovery, not semantic evidence.
### Native floors

**Compare complete calls with the fastest proper native implementations and qualified competitors; negligible remaining differences do not justify extra code or further tuning.** Configured calls may exceed a native floor by work that floor lacks (AGENTS.md).

- Floor rows live in `bench/generation-cases.ts` and `bench/generation-host.ts`: Web Crypto `randomUUID`; Web Crypto bytes with version bits (allocated and caller-owned); those bytes encoded by native `toBase64` for UUIDv4 slugs; Node `crypto.randomUUIDv7`; `Bun.randomUUIDv7` text, `Buffer` and base64url output.
- The competitor matrix builds its host corpus once per runtime with that runtime's export condition. Competitor results before 2026-09 ran the Node adapter on Bun and Deno and do not describe those routes.
- Deno 2.9.6 has no native UUIDv7. Chromium 153 exposes only `getRandomValues` and (secure contexts) `randomUUID`; the package keeps its own UUIDv4 text there because it is faster.
- Open: total-allocation parity for paired results and immutable UUID values; explicit `{ at }` calls against `uuid.v7({ msecs })`; selected generators against equivalent stateful rivals. Default rankings cannot establish configured-call speed or resource parity.

**Current gaps against floors (2026-09/10).**
- Bun UUIDv4 text 32.8–34.1 ns vs `crypto-randomuuid` 28.8–29.5 ns; Bun owned bytes 20.7 vs 20.1 ns. Preserve these gaps rather than tuning from medians. Deno owned bytes 143.6 ns beat Web Crypto 176.9 ns; allocation and source-entry cost unmeasured.
- Bun byte-to-base64url 37.0 ns vs native `toBase64` 34.8 ns; the rejected integrations under Native base64url encoding do not close it.
- Owned plain-slug decoding beats every measured equivalent native result on all five runtimes (see Owned plain-slug decoding). UUID text/byte conversion beats `uuid`, native hex and Buffer compositions. Buffer-only byte results are incomplete floors: they do not return private plain arrays. Deno text-to-bytes: 156.8 ns vs native `fromHex` 196.4 ns. Total allocation and other input forms remain unproved. These rankings do not justify another writer change.

Medians in ns, package / floor, 2026-09 (Node 24.21.0, Bun 1.4.2, Deno 2.9.6, Chromium; Node 26.8.2 from per-process probes). A cell without a floor has no native primitive for that output. Node cells predate the UUIDv4 text changes below.

| Call | Node 26.8.2 | Node 24.21.0 | Bun 1.4.2 | Deno 2.9.6 | Chromium |
| --- | --- | --- | --- | --- | --- |
| UUIDv4 text | 139–149 / 144–152 | 120–123 / 119 | 31–36 / 27–32 | 32 / 32 | 146–148 / 543–549 |
| UUIDv4 new bytes | 47–51 / 601–634 | 50–52 / 642–655 | 22 / 22 | 160 / 175–192 | 50 / 484–494 |
| UUIDv4 caller buffer | 34–35 | 38–40 / 553–560 | 28–29 / 17–18 | 37–38 / 62–63 | 37 / 296–299 |
| UUIDv4 base64url slug | 102–105 / 728–732 | 100–105 | 53–54 / 50–52 | 210–215 / 268–272 | 145–148 / 602–613 |
| UUIDv7 text | 108–111 / 164–165 | 111–114 / 150–153 | 75–82 / 39–45 | 112–113 | 143–145 |
| UUIDv7 new bytes | 67 | 72–75 | 44–45 / 50–51 | 173–174 | 74 |
| UUIDv7 base64url slug | 138–144 | 140 | 77–82 / 54–58 | 237–248 | 179–182 |

**Node keeps portable UUIDv7 and bytes.** Node's unpooled Web Crypto and `randomFillSync` cost far more than the pooled draw, and Node's native UUIDv7 text is slower than the portable generator.

**Portable UUIDv4 text formats from the module scratch array, not from owned bytes through `bytesToUuidString`'s checks.** It beats Node's native `crypto.randomUUID`: default text 0.63–0.66 of former cost on Node 26.8.2 (151–160 → 100 ns), 0.70–0.71 on Node 24.21.0 (126–129 → 89–92 ns), 0.75–0.80 on Chromium (2026-09). Bun and Deno keep native text: 37–41 ns vs 60–63 and 91–92 ns portable.
- Node without JIT selects native UUIDv4 text at startup; with JIT it keeps pooled formatting. Node 26.10.0 JITless default text 0.545 of former cost (1,031–1,052 → 562–572 ns), uppercase 0.56–0.57 (2026-10).
- Open: the measured `native.v4.string` reference (503–513 ns JITless) calls Web Crypto, not Node's fastest primitive. `bench/profile-v4.ts` names direct Node `randomUUID` as `native.node.v4.string`, but no retained capture measures it. Native parity, wrapper cost and total allocation remain open.

**Startup JIT-mode detection scans CLI arguments backwards, stops at the last explicit setting, and parses `NODE_OPTIONS` only when the CLI does not settle it and the environment contains a possible mode flag.** Ordinary imports build no token array. Warm timings showed no repeated gain or loss on any installed Node release; the shape is kept to avoid the combined argument array, token array and needless parsing, not for a measured startup win. Real child processes check both environment flag orders against V8 mode observation.

**UUIDv4 slugs encode from the same scratch through one shared draw, not owned bytes.** Base64url slugs 0.79–0.82 on Node 26.8.2, 0.82–0.85 Chromium, 0.41–0.46 Deno, 0.90–0.91 Bun; base32hex 0.83–0.92 (2026-09). The shared draw is a call Bun does not inline: portable UUIDv4 text read 1.03–1.10 on Bun and Deno, where portable text only serves fallback. Reopen: inline the draw into the text writer if Bun or Deno portable text becomes a default.

**Module-level UUIDv7 slugs and keyless text-plus-slug pairs draw into the keyless text scratch, not owned bytes.** Base64url slugs 0.885–0.887 Node 26.8.2, 0.904–0.907 Chromium, 0.558–0.562 Deno; Bun unresolved (0.950, 1.021), so allocation is not Bun's slug cost (2026-09). The corpus has no keyless-pair row.

**A primitive alphabet preset skips the `{ alphabet }` object, option reads, generator check and `at` check in `generatePlainUuidV7Slug`.** Base64url slugs 0.90–0.94 Node 26.8.2, 0.85–0.88 Chromium, 0.88–0.90 JITless, ~0.93 Deno; Bun effect not established (2026-09).

**Rejected: patching `Bun.randomUUIDv7` output with the package clock.** Correct values, but text 91–94 ns and slugs 103–106 ns vs 70–73 and 66–71 ns for the package generator on Bun 1.4.2: slicing and concatenating the native string costs more than the native call saves.

**`Bun.randomUUIDv7` is the fastest measured UUIDv7 text and slug on Bun, and it encodes timestamps ahead of the clock.** Its 12-bit counter overflow advances the encoded millisecond, compounding: after 2 million calls on Bun 1.4.2 it ran 567–576 ms ahead of `Date.now()`; Bun's `node:crypto.randomUUIDv7` 429 ms ahead; the package generator stayed at or behind the clock. Passing `Date.now()` cost 51 ns and still ran up to 8 ms ahead (~85% of samples ≥1 ms ahead); rejecting ahead-of-clock values cost 94 ns and rejected 99.8%. Portable text and slug cost about 36 and 23 ns above the native floor; that gap does not prove an unavoidable cost. The default-generation policy in `dev/interface.md` supersedes rejection solely for timestamp advancement; these numbers document the trade-off, not a never-ahead contract.

Node 26.8.2 `crypto.randomUUIDv7` randomizes the 12 bits after the timestamp per call and stayed at the clock over 2 million calls, but is slower than the package generator.

**Default native output is trusted directly: no result validation, no identity tracking.** Stronger guarantees belong only on explicit configurable paths (`dev/interface.md`). Validating each native UUIDv7 value cost 61–63 ns vs a 41–43 ns floor on Bun; a shared trust helper Bun did not inline cost 38–40 vs 31–33 ns for UUIDv4 text. Removing validation left every timing unresolved on Node 26.10.0, Bun 1.4.2, Chromium 153, Firefox 155, WebKit 26.6, Deno 2.9.7 and JITless Node (2026-10): it removes machinery, not a measured throughput win.
Reopen when: Bun changes the `randomUUIDv7` overflow policy or clock argument; Node native UUIDv7 text overtakes the portable generator; a runtime adds native UUIDv7 bytes.

Bun explicit-time caller output and selected-generator bytes read 10–17% slower in corpus replays but did not reproduce in isolation (at most ~3 ns): treat as warm-up history, not a regression.

**Remaining gaps and their causes**

- **Bun UUIDv4 text: 2–5 ns above floor.** The package adds the public text-case check, the success-result branch and the `try` that keeps native failures on the portable fallback. Removing `try` saves ~1 ns and breaks that fallback guarantee.
  - Kept: native helper inlined into `generateUuidV4` with string-first success recognition; no private helper and no ordinary native-success Error check. Bun default text 38 → 35 ns, ratio 0.93–0.97; collected-heap deltas ~340 KB vs ~418 KB per 1,048,576 calls (2026-10, Bun 1.4.2). Node 24.21.0 and 26.10.0 unresolved (normal Node with JIT uses portable text, so this does not touch its hot path). A resource witness requires zero buffers for default text. Preserve exception fallback and dual-failure causes when remeasuring.
  - Open: WebKit 26.6 default text 0.990 [0.929, 1.029], a small regression still possible; native-floor parity, gross allocation, packed startup and cold import cost remain unmeasured.
  - Rejected: string-first recognition without moving the helper (no Bun gain reproduced: 32–37 ns either way); undefined fast path, argument-count fast path and direct preset comparisons (Node 70–74 vs 70–71 ns; Bun gain not repeatable).
- **Bun UUIDv7 text: ~79–83 ns vs 47 ns for `Bun.randomUUIDv7` and 27 ns for native UUIDv4 text.** About 42 ns draws timestamp, sequence and random bits; 37 ns formats through the Latin-1 `Buffer` path. Bun native text stays the timing target; its timestamp behavior is kept separate from cost. Do not let the created-generator path (79 ns) hide the module-default gap (2026-10). Rejected (2026-10, Node 26.10.0 / Bun 1.4.2 unless noted):
  - Formatting via `toHex`, `Buffer` `hexSlice` or byte-table concatenation: 86–94 ns.
  - Skipping the fraction comparison at zero width: no repeated gain (Bun owned bytes 51→47 once, 48→47 again).
  - Caching timestamp bytes in the text buffer: Node owned bytes 81–82 → 85–86 ns, Bun text 83–86 → 88–90 ns. Other cache shapes unmeasured.
  - Clock-call inlining, counter-write inlining, direct zero-fraction seeding, separate zero-fraction continuation, and their combination: each raised some primary cost (e.g. Node seeding 82 → 85 ns owned bytes).
  - Four direct tail stores: only Node fractional-clock caller-buffer gained (0.970, 0.973); too small for more code.
  - Independent draws: Bun text 93 → 86–89 ns, but five secure-source refills instead of two per 4,096 draws (ten entropy bytes per call instead of four on continuation).
  - Bypassing the text-case resolver for the lowercase constant: text gain does not reproduce; owned bytes lost.
  - Smaller module wrapper forwarding configured calls (Bun 99–110 → 84–88 ns, but Node explicit-time 144–162 → 175–194 ns) and its refined configured-tail helper (Node explicit time 1.21, Deno default text 1.10, explicit 1.19; Bun 0.90 unresolved).
  - Correctness constraints kept by these screens: the fractional-clock oracle checks the actual new bucket; the shared Node/Bun entropy witness rejects duplicated tail bytes across text, owned bytes, explicit timestamps and offset caller storage.
- **Owned output uses the ordinary `new Uint8Array(16)`.** UUIDv7 owned: Node 78 ns vs 150–152 (explicit `ArrayBuffer`) and 87 (copy of private text buffer); Bun 48–50 vs 142–150 and 64–67. UUIDv4 owned: Node 51 vs 132–157 and 61; Bun 22 vs 116–122 and 36. Deno `Buffer.allocUnsafeSlow(16)`/`Buffer.alloc(16)` views: 132–134 vs 112 ns. Native hex/base64 decode of zero bytes before filling lost everywhere (Node 138–149 / 208–220 ns, Bun 29 / 57–58 ns, Deno 143–157 / 211–224 ns). No dispatch branch or Deno dependency. Results must be plain arrays with independent backing storage, unchanged by later draws. Deno's remaining owned-output gap is open (2026-10).
- **Bun UUIDv4 caller-buffer output: 28–29 ns vs 17–18 ns.** The package checks the caller range, copies from the pool into private storage, then into caller storage, so entropy failure cannot partly write caller data and Web Crypto never receives a caller view. A 16-byte loop instead of `set` was inconclusive; drawing into a per-call `subarray` cost 36 ns on Bun and 49–53 ns on Node 26. Reopen: if caller-buffer output becomes a primary workload, try letting the pool write at a caller offset (changes every adapter's `fillRandom`).
- **Bun UUIDv4 slugs: 2–4 ns above Web Crypto bytes + `toBase64`.** Rejected: replacing plain base64url encoding with native `toBase64` over package bytes (slug ratios 0.998, 1.005; plain encoding 1.022, 1.010; Bun 1.4.2, 2026-10). This does not prove no native design can help. Node 24 has no `toBase64` floor.

### Feistel round function

**Keep HalfSipHash-2-4 written out for the fixed two-word, 8-byte message** instead of the general function over word arrays. Four-round network 87 → 72 ns on Node 26.8.2, 82 → 66 ns on Bun 1.4.2; every masked encode, decode and generation row faster or unresolved on Node 26.8.2 (0.87–0.98), Bun (0.65–0.98), Chromium 153, Node 24.21.0, Deno 2.9.6 and JITless (2026-09). Output identical; the fixed Feistel and wire-format vectors kill mutants of rounds, constants, key schedule and output words. Feistel work is about half of masked encode/decode time; the frozen round count sets that floor. Reopen if the round function or message length changes.

### Latin-1 slug writing

**Bun writes slug character codes into reused scratch and reads them with one `Buffer#toString("latin1")`; other engines use fixed character-code arguments for 16-byte payloads, including the 27-character masked base32hex spelling.** The generic accumulator handles other lengths. Native encoding is a measured alternative; its presence alone does not prove a faster consumer call.

Median ratios against the prior writer, 2026-09 (this measured the earlier Latin-1 implementation); each pair's 95% interval below 1 unless marked:

| Runtime | `v4.slug` | `v7.slug` | `v7.base32` | `masked.generate` | `masked.encode.bytes` |
| --- | ---: | ---: | ---: | ---: | ---: |
| Node 26.8.2 | 0.84, 0.83 | 0.82, 0.84 | 0.62, 0.64 | 0.82, 0.82 | 0.76, 0.79 |
| Bun 1.4.2 | unresolved, unresolved | unresolved, unresolved | 0.45, 0.43 | 0.89, 0.86 | 0.85, 0.86 |
| Node 24.21.0 | 0.56, 0.60 | 0.63, 0.65 | 0.58, 0.60 | 0.77, 0.79 | 0.71, 0.69 |
| Deno 2.9.6 | 0.73, 0.73 | 0.83, 0.75 | 0.75, 0.73 | unresolved, 0.81 | 0.74, 0.73 |
| Node 26.8.2 JITless | 1.64, 1.58 slower | 1.41, 1.39 slower | 1.13, 1.12 slower | unresolved, unresolved | 1.06, 1.05 slower |

Chromium 153 does not select this writer (unresolved). JITless Node loses because it interprets the 22 typed-array writes one by one; gains on every higher-priority runtime outweigh it. Reopen if native `toBase64` stops trailing this writer on Bun, or a runtime gains a native base32hex encoder.

### Masked base32hex slugs

**The 27-character masked base32hex spelling uses fixed writers and a fixed decoder, not the generic bit accumulator.** Characters 24–25 hold the last byte and the check tail's top two bits; character 26 holds the tail's low two bits followed by three zero bits, which decoding requires.

Median ratios, 2026-09; 95% interval below 1 unless marked:

| Runtime | `masked.base32.encode` | `masked.base32.encode.bytes` | `masked.base32.decode` | `masked.base32.generate` |
| --- | ---: | ---: | ---: | ---: |
| Node 26.8.2 | 0.70, 0.65 | 0.59, 0.57 | 0.86, 0.80 | 0.65, 0.66 |
| Bun 1.4.2 | 0.57, 0.54 | 0.48, 0.50 | unresolved, unresolved | 0.58, 0.57 |
| Node 24.21.0 | 0.65, 0.65 | 0.57, 0.56 | 0.82, 0.81 | 0.68, 0.66 |
| Chromium 153 | 0.94, 0.95 | unresolved, unresolved | 0.89, 0.87 | unresolved, unresolved |
| Deno 2.9.6 | 0.74, 0.74 | 0.63, 0.62 | 0.86, 0.87 | 0.78, 0.76 |
| Node 26.8.2 JITless | 0.97, 0.97 | 0.95, 0.96 | unresolved, unresolved | 0.94, unresolved |

Trade-off: in a process encoding both masked alphabets, base64url `masked.encode.bytes` read 1.02–1.05 slower on Node 26.8.2 and 1.04 once on Deno 2.9.6, because both alphabets share one branch of `encode`. Base64url rows alone were unresolved (0.98–1.05).

### Native base64url encoding

**Keep Bun's indexed base64url block writer.** Fixed block positions did not reproduce a complete-call gain (Bun default slug 89–96 ns either way, directions flip; 2026-10, Node 26.10.0 / Bun 1.4.2). A lost-byte mutation fails Bun's independent Buffer encoder assertion in `__test__/runtime-boundary-probe.ts`. Native parity remains open.

**Keep the fixed UUID writer until native encoding lowers complete caller cost without moving cost onto other primary calls.** Rejected (2026-10, Node 26.10.0 / Bun 1.4.2 / Deno 2.9.7): a `native-branch` and a module-selected `native-dispatch`. Bun conversion and pair costs did not improve consistently; dispatch raised Bun base32hex slug medians in every order despite leaving that writer unchanged. Any native candidate must select native for the plain corpus, keep masked tails outside it, fall back after a native throw, and construct one plain-slug string (two for pairs).

**Native `Uint8Array.prototype.toBase64` is probed once and used for generic payload lengths; UUID payloads use the fixed writers.** Disabling native on the public plain-encode route made the portable path 2.29–2.34× slower on Bun 1.4.1, 13–15% on Deno 2.9.6, 14–29% on Chromium 151 (2026-09); Bun 1.4.2 recheck: fallback 57–96% slower. Remove native delegation only if a supported runtime reproduces a complete-route loss or the strict output contract changes.

**Deno exception: detect Deno once at module load and treat its native method as unavailable.** Deno 2.9.6 made the fallback 26–27% faster (2026-09). Reopen after a Deno update; remove the exception when native no longer loses materially.

### Fixed-size portable base64url encoding

**Encode 16-byte base64url payloads as five 24-bit groups plus the final byte; keep the generic accumulator for other lengths, alphabets and tail widths.** Wire format and native delegation unchanged. Node 24.20.0: plain encoding +10–11%, masked string +7–8%, masked byte-input +9–10% (2026-09); Bun 1.4.1 uses native here and stayed near parity. Fallback profiles on Node, Bun, Deno and Chromium cost 115–138 ns per payload (reachability, not ranking). Reopen if Node gains a native encoder or UUID routes stop owning exactly 16 bytes.

### Fixed-size portable base32hex encoding

**Encode 16-byte base32hex payloads as three five-byte groups plus the final byte; keep the generic accumulator for other lengths and tail widths.** Base32hex has no native delegate, so every runtime uses this path. Node 24.20.0 direct encoding +11–13%, public UUID-to-base32 +7–10%; Deno 2.9.6 and Chromium 151 improved; Bun 1.4.1 improved or unresolved, never regressed (2026-09). Masked and sentinel routes unresolved. Reopen if UUID routes stop owning exactly 16 bytes or a runtime adds native base32hex encoding.

### Fixed-size portable base64url decoding

**Decode 16-byte base64url payloads as five four-character groups plus the final byte; keep the generic accumulator for every other length, alphabet and tail width.** Exact invalid-character offsets and canonical trailing-bit rejection remain part of the fixed path. Direct decoding +12–13% Node 24.20.0, +16–17% Bun 1.4.1, +26–27% Deno 2.9.6, +22–24% Chromium 151; caller-owned public decoding +10–11%, +7–10%, +14–19%, +13–15% (2026-09). Reopen if UUID routes stop decoding exactly 16 bytes or use a tail width other than zero or four.

### Fixed-size portable base32hex decoding

**Decode 16-byte base32hex payloads as three eight-character groups plus the final byte, resetting the accumulator per group; keep the generic decoder for every other shape.** Direct decoding +12–14% Bun 1.4.1, +8–10% Deno 2.9.6, +7–9% Chromium 151; Node 24.20.0 at parity (2026-09). Deleting it made direct decoding 12–17% slower on Node 26.8.2 and Bun 1.4.2. Exact invalid offsets, canonical low bits and every tail value are tested. Reopen if UUID routes stop decoding exactly 16 bytes or use a tail width other than zero or two.

**Rejected: regex prevalidation plus fixed bit formulas.** Direct decoding regressed 23% Node, 31% Deno, 22% Chromium. Reopen only if primary engines materially change regex or fixed-index string access.

**Both fixed decoders validate once after decoding: OR every character code and table digit, then rescan only a rejected value to report its first invalid offset.** Median ratios, 2026-09; 95% interval below 1 unless marked:

| Runtime | `plain.decode` | `value.parse.slug` | `base32.decode` | `portable.base32.decode` |
| --- | ---: | ---: | ---: | ---: |
| Node 26.8.2 | 0.90, 0.89 | 0.85, 0.88 | 0.85, 0.86 | 0.65, 0.63 |
| Bun 1.4.2 | 0.83, 0.88 | 0.83, 0.82 | 0.77, 0.78 | 0.63, 0.64 |
| Node 24.21.0 | 0.94, 0.88 | 0.90, 0.87 | 0.85, 0.89 unresolved | 0.66, 0.66 |
| Chromium 153 | unresolved, unresolved | 0.89, unresolved | 0.85, 0.88 | 0.59, 0.55 |
| Deno 2.9.6 | unresolved, unresolved | unresolved, unresolved | 0.88, 0.92 | 0.70, 0.70 |
| Node 26.8.2 JITless | 0.95, unresolved | 0.92, 0.93 | 0.90, 0.91 | 0.82, 0.82 |

Masked decoding moved at most 8%, mostly unresolved, because HalfSipHash dominates it. Tests reject a non-ASCII character whose low seven bits alias a valid digit at every offset.

### Plain base64url slug-to-UUID formatting

**Rejected: decoding directly into canonical UUID text in JavaScript.** `slugToUuidString` 46–47% slower on Node 26.8.2, ~100% slower on Bun 1.4.2, +0.77 KiB minified (2026-09). Keep byte decoder plus runtime-selected formatter. Reopen only if the native formatter disappears or a direct string primitive replaces JavaScript concatenation.

### Plain base32hex slug-to-UUID formatting

**Rejected: decoding directly into canonical UUID text in JavaScript.** `slugToUuidString` 28–29% slower on Node 26.8.2, ~115% slower on Bun 1.4.2, +0.44 KiB minified (2026-09). Keep fixed decoder plus runtime-selected formatter. Reopen only if the native formatter disappears or a direct string primitive replaces JavaScript concatenation.

### UUID text to plain slug

**UUID text to plain slug parses into reused 16-byte scratch and encodes through the shared writer; separate text-to-slug writers were deleted.** Text-to-slug conversion allocates no array; the resource gate holds that budget at zero. The parser copies into caller-owned output with a byte loop: `Uint8Array#set` made Bun `plain.encode` 1.20× slower.

Median ratios including the Latin-1 writer, 2026-09; 95% interval below 1 unless marked:

| Runtime | `plain.encode` | `base32.encode` | `parse.into` |
| --- | ---: | ---: | ---: |
| Node 26.8.2 | 0.71, 0.75 | 0.50, 0.48 | unresolved, unresolved |
| Bun 1.4.2 | unresolved, unresolved | 0.29, 0.29 | unresolved, unresolved |
| Node 24.21.0 | 0.46, 0.46 | 0.41, 0.43 | 0.95, 0.96 |
| Chromium 153 | 0.90, 0.95 | 0.91, 0.90 | unresolved, 0.99 |
| Deno 2.9.6 | 0.53, 0.49 | 0.48, 0.46 | unresolved, unresolved |
| Node 26.8.2 JITless | 1.44, 1.50 slower | 0.59, 0.61 | 1.17, 1.18 slower |

### UUIDv7 text bounds

**Bounds timings must read both returned endpoint strings;** object-only consumption does not measure formatting or string flattening. The resource gate requires both endpoint reads and zero per-call byte-array allocation for text bounds (byte bounds allocate exactly the two returned arrays).

**Text bounds format the timestamp directly, not via byte bounds and the generic formatter.** Direct form ~42% of composed time on Node 24.21.0, ~90% on Bun 1.4.2 (2026-09). Reopen if UUID text formatting or engine string handling changes.

**Writer selection shares Node's startup JITless flag with UUIDv4: byte pairs on Bun and JITless Node, fixed character-code prefix elsewhere.** Fixed codes: ratios 0.63–0.71 Node 26.10.0, 0.59–0.66 Chromium 153, 0.63–0.68 Deno 2.9.7; Firefox 155 and WebKit 26.6 unresolved (2026-10). Rejected: fixed codes everywhere, because Node 26.10.0 JITless lowercase and uppercase regressed 1.09–1.12. No successful row is slower in both replays across Node 22.23.2–26.10.0 (with and without JIT) and Bun 1.3.14–1.4.2. Real compiled-package child processes check CLI and `NODE_OPTIONS` precedence against V8 executable-heap state; removing JITless selection fails that oracle. Open: cold initialization, first-use table cost, other hardware, Firefox/WebKit native profiling.

**Byte pairs come from a lazily built table of 256 strings, not `Number.prototype.toString(16)`.** `v7.bounds.text` medians, 2026-09; every 95% interval below 1:

| Runtime | Baseline ns | Candidate ns | Ratio |
| --- | ---: | ---: | ---: |
| Node 26.8.2 | 505, 506 | 83, 84 | 0.17, 0.17 |
| Bun 1.4.2 | 133, 133 | 57, 52 | 0.43, 0.39 |
| Chromium 153 | 491, 498 | 80, 80 | 0.16, 0.16 |
| Deno 2.9.6 | 493, 492 | 83, 83 | 0.17, 0.17 |
| Node 26.8.2 JITless | 891, 888 | 471, 466 | 0.53, 0.52 |

Rejected: per-nibble lookups without a table (112 ns Node 26.8.2, 51 ns Bun vs 65 and 27 ns). Node 24.21.0 probe: ~600 ns with `toString(16)` vs 64 ns. Reopen if V8 speeds up `toString(16)` for millisecond timestamps.

### Portable UUIDv7 timestamp writes

**Select the 48-bit timestamp writer once at module load: Bun keeps the six-byte loop; other runtimes write one high 16-bit and one low 32-bit word.** The split avoids five divisions on V8 without a per-write branch. Node caller-owned continuation +6.8–8.6%, advancing clock +14.3–14.8%; Chromium +12.3–13.3% and +4.4–5.0%; Deno improved; Bun no significant regression (2026-09, Node 24.20.0, Bun 1.4.1, Deno 2.9.6, Chromium 151).
Rejected: a universal word writer (Bun advancing and rollback −6.2%, −5.3%); a per-call runtime branch (Bun byte routes 4–10% slower). Reopen if JavaScriptCore stops favoring the loop or V8 stops favoring fixed writes.

### Portable UUIDv7 profile coverage

**Profile the portable generator directly even where native UUIDv7 exists.** The shared corpus covers strings, owned and caller-owned bytes, explicit timestamps, steady same-millisecond generation, advancing and rollback clocks, entropy-pool refills, and generation through both slug alphabets with production encoders, so native generation cannot hide fallback work. On Node 24.20.0, Bun 1.4.1, Deno 2.9.6 and Chromium 151 (2026-09) every synchronous case kept its longest batch below 1 ms and longest uninterrupted interval below 2.5 ms. Profiles locate work; they do not rank candidates.

### Portable UUIDv7 entropy draw

**Draw ten bytes initially (six seed the 42-bit sequence, four fill the random tail); on same-millisecond and rollback continuation refill only the four tail bytes.** The other six bytes of a 16-byte draw are overwritten by structural fields, and the live sequence seed is never reread. Ten-byte draw: Node byte routes +10–17%, Bun +4–8%, Deno/Chromium +4–19% (2026-09, Node 24.20.0, Bun 1.4.1). Four-byte continuation: Node owned/caller bytes +8.1–12.5% / +11.6–17.8%, Bun +6.7–7.4% / +7.4–8.2%, rollback +11.3–14.9% Node, +8.5–8.8% Bun. The payload-bit test discovers the requested draw length and proves its bits independent and covering every non-structural random bit, instead of pinning a buffer size. Change the draw size only if the layout consumes more entropy bits.

Rejected:
- 16-byte private draw: six copied bytes never reach the UUID.
- Refilling all ten bytes on continuation: six seed bytes ignored. Restore only if continuation consumes a new seed or the four-byte draw becomes reproducibly slower on a complete route.
- Four fixed tail assignments instead of the four-iteration loop: no Node/Bun byte gain; Bun string generation −1.3%. Reopen only for a primary-runtime complete-route gain with no other regression.
- `Uint8Array#set` for the four-byte copy: Node −3–21%, Bun −6–42%. Reopen if the copied region grows enough to amortize the call.
- One safe-integer sequence state instead of separate 10-bit and 32-bit words: Bun continuation −16–20%, explicit-time bytes −36–47%; Node explicit-time −5–8%. Every output pays a division to recover the high word. Reopen only if primary engines remove these losses.
- Skipping `checkRange` for package-owned output at offset zero: Bun owned +7.8%, but Node explicit-time owned −5.1–5.4%. Keep the shared direct check unless both Node routes improve without nested hot-path branches.
- Hoisting non-number clock rejection before truncation: unresolved everywhere, duplicates error construction. Reopen only if an engine changes repeated `typeof` handling on monomorphic numbers.
- Codec-construction alphabet wrappers: ratios 0.98–1.04, all unresolved on Node 24.20.0 and Bun 1.4.1. Keep the direct call with its one alphabet branch. Reopen if an engine stops specializing the captured alphabet.
- Built-in mask exception bypass (non-throwing flag so only custom callbacks enter `try`/`catch`): no repeatable built-in win; Node timestamp extraction −4.1–6.5%, custom decode −7.7%. Keep one contained path; tests fail if the custom catch is removed (exception containment and original cause). Reopen only if an engine shows material exception-region overhead without added dispatch.
- Private built-in mask dispatch via `WeakMap` of Feistel keys: no distinct built-in gain on Node 24.20.0 or Bun 1.4.1, one Node custom-decode loss. Keep the single callback protocol. Reopen only for a repeatable primary gain exceeding the compatibility machinery.

**Portable UUIDv7 keeps ten-byte initial draws, four-byte continuation draws, split sequence words, module-selected timestamp writes and direct caller-owned writes.** These preserve the 42-bit randomized sequence, fresh 32-bit continuation tail, atomic failure and caller-buffer contract. They are not a proven frontier: direct-string competitor designs were never in the candidate set. Re-run formatter and dispatch candidates after material surrounding changes, with the platform and fastest live competitor as floors.

**Mask seed encoding is selected per runtime module: Node uses `Buffer.from`; Bun, Deno and Chromium reuse one `TextEncoder`.** Node string construction +16.2–16.4%, iterated route +9.0–9.1%; Chromium +15.4–16.0% and +9.8–11.6%; Bun up to +4.0%; Deno unresolved; byte-seed construction unresolved everywhere (2026-09). Tests cover synchronous and cooperative UTF-8 boundaries. Rejected: a fresh `TextEncoder` per seed; packing four encoded bytes per word (gain did not reproduce); an encoding method on the `Runtime` object (module resolution already selects one implementation; it would add a property dispatch). Reopen if a primary runtime changes its UTF-8 primitive or the construction route loses these gains.

**Rejected: lazy runtime-adapter loading.** Root dynamic import costs 5.23/4.13 ms Node 26.8.2, 1.75/1.62 ms Bun 1.4.2, 2.57/2.58 ms Deno 2.9.6, 3.10–3.80 ms Chromium (2026-09, warm caches, parse plus evaluation). The import map selects one adapter before evaluation; probes draw no entropy and UUIDv7 state is lazy, so dynamic loading would only move work into a warm synchronous call or make it async. Replacing Node's adapter with Web Crypto would lose native UUID hooks and the synchronous entropy boundary; dropping Bun's web-adapter import would duplicate the portable entropy fallback. Keep conditional adapter selection, module-load probes and lazy generator state. Reopen only for a measured consumer startup budget or a synchronous runtime with deferred evaluation preserving the call shape.

**Module-level UUIDv7 text and bytes use separate lazy portable state and do not coordinate ordering;** callers needing strict ordering use `createUuidV7Generator`. Module wrapper vs direct generator overlapped on Node, Deno and Chromium; Bun showed at most a small wrapper cost (2026-09). Rejected: fresh random payload per module call (Node 226 vs 178 ns, Bun 334 vs 125 ns).

**Bun trusts native UUIDv7 output directly (see Native floors); Node keeps portable UUIDv7 text.** Validated native lost on Node (234–240 vs 147–156 ns portable).

### Portable UUIDv4 ownership paths

**Draw entropy directly into package-owned output; caller-owned output draws into private storage, then copies,** so entropy failure cannot partly modify caller data and Web Crypto never receives an unsupported caller view. Owned bytes +10.7–13.3% Node, +30.2–33.2% Bun, +7.4–9.3% Chromium; Bun slugs +7.7–10.8% (2026-09, Node 24.20.0, Bun 1.4.1, Deno 2.9.6, Chromium 151). Private text fallback +1.9–4.2% on Node, Bun, Chromium.
Rejected: one shared path with an ownership branch after the draw (caller-owned −4.1–4.3% Bun, −4.3–5.7% Deno) or before it (Bun −3.6–5.7%). The split duplicates a short guard and draw to keep both paths branch-free. Merge if a primary runtime stops gaining on owned output or caller-owned output regresses reproducibly.

**The unchecked formatter is used only behind the generator-owned 16-byte text buffer** (see UUID text formatting). A direct byte-pair formatter lost on Chromium without closing Node or Deno.

**Entropy pool: one 8 KiB buffer with a linear cursor and a JavaScript copy-and-erase loop.** 8 KiB makes one source call per 512 UUIDv4 ids and retains at most 8 KiB per runtime-module instance; instances share no cursor or lock. Rejected (2026-09, Node 26.8.2, Bun 1.4.2, Deno 2.9.6, Chromium 153):
- `set(subarray)` plus ranged `fill`: UUIDv4 byte routes 57–88% slower Node, 60–95% Bun, 20–108% Deno, 65–87% Chromium.
- A separate fixed-16 loop: Node caller-owned +4.7–5.1%, but no Bun gain and Node portable-v7 caller output −5.3%; it moved JIT cost among pool consumers.
- 2 KiB (Node −5.8–8.6%, Bun −4.9–5.3%); 4 KiB unstable on Node; 16–64 KiB no repeatable gain, 64 KiB Bun −1.3% and doubled Deno's worst batch (0.051–0.078 → 0.107–0.110 ms). Larger pools also retain and discard more random bytes. Reopen only if a changed platform source moves both the crossover and complete-route latency.
- Wrap-preserving cursor (carry allocated and erased at wraps, required for atomic refill failure): gains did not isolate tail reuse; an 8,160-byte control was neutral and raised v4 source calls to one per 510. Reopen only if discarded-byte measurement becomes material.

**Keep `Set`s for error codes and sentinels, not bitsets.** Error codes arrive as strings, so a bitset needs a classifier duplicating the runtime vocabulary; sentinel names and UUIDs are caller-defined, sparse and unbounded. Reopen only when the key is already a bounded integer.

**Keep sentinel state eager and immutable.** Migration state is built only by the explicit `createUuidSlugMigrationDecoder` call. Sentinel construction validates every definition and freezes the public list before returning the codec; its maps serve string encode/decode and its byte index serves byte encode. Deferring structure would add hidden mutable initialization and move eager work into an unpredictable first call.
## Allocation and key rotation

### Profiler batch size

**Keep a fixed 64 calls per timed batch.** Measured 2026-09 on Node 24.20.0, Bun 1.4.1/1.4.2, Deno 2.9.6, Chromium 152.

- Batches of 1–16 let clock and loop cost dominate a prepared-string control. 64–1024 gave similar throughput.
- Fixed 64 kept the largest ordinary host batch near 1 ms; fixed 256 reached 2.1–3.2 ms (Bun 1.4.2, full construction inventory). At 2048 the slow route blocked 4.34–6.03 ms and stretched a nominal 5 ms sample to 8.24–9.02 ms.
- Fixed 64 bounds batch cost only; it does not bound runtime scheduling or collection (Chromium showed GC near 3.6 ms and microtask execution at 4.7 ms).

Rejected:
- Configurable batch size: unrelated runs could silently use incomparable harnesses.
- Per-case geometric/adaptive calibration: matched 64 on expensive routes but picked 256 for cheap Chromium routes that then paused 3.8–6.3 ms; pauses are not predicted by warm batch cost, and calibration adds JIT state.
- Untimed 2048-call burst after warm-up: removed. No later stable tier appeared, it duplicated setup and inherited the slow route's 4 ms violation. Host and browser profiling enter measurement after the same elapsed warm-up rule.

Reopen when representative work exceeds about 1 ms per batch.

### Profiler warm-up

**Use a 16 ms per-case warm-up.** 2026-09 on Node 24.20.0, Bun 1.4.2, Deno 2.9.6, Chromium 152, warm-up varied 1–64 ms: Bun conversion reached the same tier at 16, 20 and 64 ms, and longer warm-up added setup without reproduced stability. This supersedes a Bun 1.4.1 probe suggesting 16 ms stopped before a slower tier.

- One significant interval never retains a candidate; two independent full replays are mandatory. A 20 ms Deno same-code run reported a false 3.3% improvement; its replay was unresolved (0.965–1.027).
- Reopen when a primary runtime changes JIT tiers, or identical-code replays repeatedly report the same false direction.
- The throughput driver `bench/run.ts` warms each operation 1,000 iterations; 100,000 moved Node under 2% (2026-08), so longer warm-up buys nothing there.

### Profiler capture boundary

**Start inspector CPU/allocation sampling only after corpus construction, outcome verification, case selection and warm-up.** Process-exit profilers also include startup and warm-up. Chromium's driver waits for the published runner, not elapsed time. Profiler start/stop stay outside each reported sample; forced collection, reporting, host-task yields and sampling stay inside the native capture.

Control-only capture (prepared string, same dispatch/batching/sink/clock/yield), 2026-09-12, seven 2 ms samples:

| Runtime | Timed control work | Native capture | Process CPU during row |
| --- | ---: | ---: | ---: |
| Node 24.20.0 | 13.66 ms | 30.58 ms | 16.46 ms |
| Bun 1.4.1 | 13.68 ms | 50.86 ms | 17.26 ms |
| Deno 2.9.6 | 14.14 ms | 30.60 ms | 16.07 ms |
| Chromium 152 | 13.95 ms | 47.10 ms | unavailable |

The capture-minus-work gap bounds combined profiler and harness noise; it does not isolate start/stop cost. Median inspector command round trips (one local probe, not a runtime constant):

| Runtime | Start | Stop |
| --- | ---: | ---: |
| Node 24.20.0 | 5.37 ms | 0.57 ms |
| Bun 1.4.1 | 0.003 ms | 0.051 ms |
| Deno 2.9.6 | 3.41 ms | 0.48 ms |
| Chromium 152 | 1.01 ms | 0.35 ms |

Bun returned no sample in two of eight 1 ms captures; CPU attribution is too sparse to infer profiler cost. **Compare with focused filters and operation timings; use native profiles to locate work, never to infer per-call latency from capture duration.**

### Primary UUIDv7 attribution

**Production UUIDv7 generation is unchanged; every candidate below is rejected or open. The Bun default-text gap against native stays open.**

Where the time goes (2026-10, Node 26.10.0, Bun 1.4.2, Deno 2.9.7, Chromium; `v7.string`, `v7.bytes`, `v7.slug`):
- Text formatting outranks entropy copying for text and slugs; owned-byte generation concentrates in the byte generator. Node text formatting 308 self samples vs clock reading 125/149; Deno text formatting 295, owned-byte generator 613/606. Missing case labels (Bun inlining) are not zero work; sample counts are not per-call costs.
- Bun default text: the Latin-1 formatter plus native `toString` take 108/116 self samples, `readClock` 56/61, out of ~240 under `generateUuidV7`. Equal-call Bun profiles rank character writes and string construction above clock and entropy. So: text construction first, before counter or pool-copy work.
- Sampled allocation (4,096-byte interval, includes collected objects): the byte-generator frame under scratch-backed text and slug calls is about 31–33 bytes/call on Node and Deno, 23–24 on Chromium. Reused output scratch does not eliminate generation allocation; the allocating expression is unidentified. Owned output adds required array storage. Heap snapshots and post-GC deltas measure retention, not allocation volume.
- Bun gap (bundled corpus, Chromium 153.0.8010.12, Node 24.21.0 also run): package text 70.90–75.22 ns vs native 46.47–56.88 ns, ratio 1.468. Native clock-overflow behavior is a separate adoption constraint; its lower cost remains the target. This checks priority, not installed-package cost or allocation parity.
- Order of investigation: clock and sequence allocation and fewer string-construction steps before another entropy-copy candidate. Production changes require a causal substitution and repeated complete-call gains.

Rejected or open candidates:
- **Inline clock (remove the clock wrapper): reject.** Bun owned bytes lose 52.90/54.25 ns vs 49.94/50.25; other directions vary. Byte-generator allocation is unchanged (Node text 31.1/32.4 baseline vs 32.3/32.6 candidate bytes/call), so deleting the wrapper does not remove the allocation. The exception-containment mutation must fail the shared throwing-clock witness.
- **Fixed Float64 storage for timestamp and counter state: reject.** Node owned bytes improve in all four processes, but Bun does not reproduce: text 88.99 vs 81.96 ns, bytes 62.51 vs 45.65 ns. It does remove Node `advanceSequence` sampled allocation (~33 MB to ~0 per capture; profile-wide ~97–98 to 90 bytes/call). The timestamp mutation must fail both runtime clock witnesses.
- **Float64 counter slots only: reject.** Removes ~6.9 sampled bytes/call of sequence allocation on Node, but packed Node 26.10.0/Bun 1.4.2 lose: Node default construction 1.078 [1.057, 1.107], Bun construction 1.044 [1.025, 1.052], Bun owned bytes 1.024 [1.002, 1.042]; text and slug unresolved. Allocation savings do not justify construction and primary-call losses.
- **Uint32 counter slots: reject.** Text slower than Node baseline in all four processes. The `counter-uint32-lost-carry` mutation must fail the timestamp ceiling and caller-output assertions (Node also fraction/timestamp overflow).
- **31/11 (or 30/12) closure counter split, no extra array: open, not adopted.** Combined sampled allocation falls from ~39–40 to ~32 bytes/call on Node with no retained storage. Packed Node owned bytes: 0.972 [0.964, 0.988], repeat 0.971 [0.904, 1.013], long windows 0.973 [0.932, 0.990]; Deno text 0.983 [0.944, 0.998] once; every other Node 26.10.0, Bun 1.4.2, Node 24.21.0 and Chromium interval includes parity, which still permits primary-call or construction losses. Runtime-specific selection is unmeasured (dispatch and ownership costs unknown). Lost-carry mutations must fail the shared ceiling and caller-output oracle. **Further counter refinements, including direct 31/11 writes (Node byte gains, Bun varies, no packed advantage), are deferred while the Bun default-text gap is open.**
- **Direct Latin-1 construction via Bun Buffer `latin1Slice`: not adopted.** Source screen on Bun 1.4.2: default text 85.23/88.49 vs 91.34/90.81 ns, uppercase 71.29/75.11 vs 82.42/79.49, conversion 38.38/38.87 vs 42.21/41.29. Packed primary ratios (default text 0.936, 0.961; uppercase 0.954, 0.950; conversion 0.921, 0.947) came from single-batch records (see driver rule below), and the remaining-runtime replay (Chromium 153.0.8010.12, Firefox 155.0, WebKit 26.6, Deno 2.9.7, Node 26.10.0 JITless) found JITless conversion 1.030 [1.01, 1.05] slower. `latin1Slice` is callable on Bun and `toString("latin1")` does not route through an overridden `latin1Slice`; that is an experiment lead, not a supported capability. Cold construction, absent-method behavior and native exceptions need evidence before selection.
- **Buffer-factory form (method selection inside the Buffer implementation, keeping the portable formatter): not adopted.** Bun default text 0.990 [0.924, 1.090] and 0.995 [0.311, 1.046], uppercase and slug unresolved; conversion 0.932 [0.905, 0.945] and 0.835 [0.507, 0.964]; Node owned bytes 1.010 [1.002, 1.018] then unresolved. No generation gain established.
- **Caller-buffer generation then hexadecimal chunks (concatenation or native join): reject.** Bun 1.4.2: concatenation 186.68/147.45 ns and join 150.31/122.80 ns vs 88.44/72.02 ns default text; conversion 106.62/117.41 and 77.82/78.76 vs 40.61/41.08 ns. Cause (ropes, flattening, join) unidentified. Mutations must fail an independent native-hex oracle over all 128 walking bits. The maintained benchmark excludes these experiments.
- **Prepacked hexadecimal pair tables: reject.** Bun 1.4.2 focused packed: default text 0.944 [0.89, 1.01], conversion 0.979 [0.94, 0.99]. A small conversion-only gain does not justify retained tables and an added DataView while the generation gain is unresolved. Cold cost, allocation parity and auxiliary runtimes unmeasured; this does not prove no gain is possible.

Packed-driver rules (instrument, not production evidence):
- The driver must verify the requested batch count before its data can select production code; earlier direct-Latin-1 packed records held one sample per process despite a larger request.
- Summaries use one median per fresh process and reject a process count different from the rounds; raw records keep every batch. Extra batches do not increase the independent count.
- Keep pauses and lost-execution observations (process CPU far below wall time, e.g. CPU/wall 0.030 Node, 0.006 Bun); never filter them away. Unresolved intervals are not equivalence; a favorable median alone is insufficient.

workerd (local, 2026-10-04):
- The compiled public entry with the portable implementation runs in plain-web and `nodejs_compat` modes and passes the shared 351-case oracle; the bundle contains `dist/index.js` and `dist/runtime/portable.js` only. Web Crypto UUID, secure byte fill and typed-array hex/base64 are callable in both. This establishes harness feasibility, not a winner or another provider's support.
- Local batch durations are integer milliseconds and a run fails at zero duration: keep raw durations, enlarge batches as needed, use fresh processes. Profile totals include dispatch and serialization; do not divide them into per-call allocation.
- [Cloudflare's timer documentation](https://developers.cloudflare.com/workers/runtime-apis/performance/): local timers advance during CPU work, deployed timers only after I/O. Local runs cannot establish deployed timestamp progression or edge latency.

Separate required owned-output allocation from removable work.

Key-rotation allocation (Node Inspector, 1,024-byte interval, major and minor collected objects included; one matched process pair, estimates):

| Operation | Before bytes/call | After bytes/call |
|---|---:|---:|
| Slug predicate | 236 | 0 |
| Caller-owned v4 generation | 1 | 1 |
| Plain-slug timestamp validation | 1,596 | 249 |
| Masked timestamp validation | 2,041 | 464 |
| Previous-key decoding | 2,772 | 1,596 |
| Codec construction | 9,577 | 6,336 |

Remaining rotation allocation includes callback ownership copies (a contract). Last-key decoding with 16 configured keys fell about 66.6 to 2.57 µs on Node and 4.91 to 2.62 µs on Bun; every earlier key must be checked to reject the fixture before attributing the time to the last key. Retained-heap profiles cannot measure gross allocation; four burst epochs showed no persistent leak (not proof of absence). Cold imports are in the millisecond range and not a demonstrated optimization target.

## Cooperative construction

**Keep synchronous and cooperative construction as separate public contracts; the cooperative loop yields on measured elapsed work, not a size or iteration threshold.**

- The async constructor snapshots byte inputs before suspension, checkpoints encoding/packing/hashing, preserves synchronous key material, and yields through ordinary host tasks (Node/Bun `setImmediate`). A prioritized browser continuation blocked an independently queued cancellation message; ordinary message tasks passed. Changing host yields to microtasks breaks cancellation.
- Why no threshold: at 4,096 iterations Node and Chromium crossed the 2 ms deadline and yielded while Bun and Deno did not; at 65,536 all yielded. A threshold would encode one runtime's speed as policy. Synchronous-only would lose cancellation and host progress; replacing the sync API would change its return contract.
- Observed (2026-09, Node 24.20.0, Bun 1.4.1, Deno 2.9.6, Chrome 152): 19-byte seed, 65,536 iterations, host-task gaps 2.22/4.29/2.43/2.30 ms, total 6.6–8.2 ms, output identical to sync. Local observations, not guarantees.
- Reopen if profiling shows generator checkpoints dominate a below-deadline workload, or the scheduling contract changes.

**Keep the call-time byte-seed snapshot.** It preserves the bytes present when the call begins; an input cap or deferred copy changes public behavior. Cost (Bun/Node): 2.305/2.365 ms at 1 MiB, 3.527/3.472 ms at 16 MiB, 9.051/7.969 ms at 64 MiB. Treat it as an explicit responsiveness limit until a replacement keeps call-time ownership without blocking. At 1 MiB and max iterations, capture took 2.10–2.59 ms; a queued timer observed cancellation after 2.10–4.46 ms and settlement followed 0.04–0.26 ms later. Node's ~10 ms MessageChannel delay is its startup cost, not package blocking.

Cancellation retention: discarded 1 MiB jobs did not retain memory proportional to all cancelled inputs (Node ~5.22 MB heap after eight epochs; Bun peaked 3.79 MB, settled ~1.72 MB; Deno 168.6–168.7 KiB; Chrome 86.9 KiB). Post-GC deltas do not measure gross allocation or prove every application leak-free.

**Keep reusing large aligned byte seeds as little-endian hash words; keep the portable packer for small, unaligned, odd-length, string and big-endian inputs.** 2026-09 packed: 4 KiB construction at 59–80% of baseline, 64 KiB at 59–77% (Node 26.8.2, Bun 1.4.2, Deno 2.9.6, Chromium 153, Node JITless); 16, 4,095 and 4,097-byte controls unchanged. New `Int32Array` storage at 64 KiB fell from 65,732 to 192 bytes. Cooperative settlement improved without a larger host-task gap. No cross-device crossover established. Remeasure the threshold when an engine changes typed-array or hash-loop behavior.

## Migration decoding

**Migration parses each input once; `decode` stops at the first match, `candidates` tries all enabled formats. Ordinary codec calls never enter the migration reader.** Resource checks on Node and Bun require zero discarded errors and no entropy draws.

**Reuse validated base64 text for sentinel lookup instead of re-encoding decoded bytes.** Only the final character needs canonicalization for a trailing-bit alias; base32 still requires base64 encoding. Sentinel priority, candidate identities and strict ordinary decoding stay intact. Median ns before → after:

| Migration call | Node 24.20.0 | Node 26.8.1 | Bun 1.4.2 |
| --- | ---: | ---: | ---: |
| Current key | 604 → 451 | 503 → 419 | 294 → 284 |
| Previous key | 748 → 614 | 672 → 597 | 423 → 408 |
| All candidates | 989 → 810 | 909 → 808 | 711 → 695 |
| Known plain | 452 → 244 | 355 → 210 | 184 → 139 |
| Known original | 488 → 302 | 369 → 245 | 273 → 225 |

Native base64 calls fell from one to zero per call on Node 26 and Bun (Node 24 avoids the portable encoder); no other resource count increased. The resource budget rejects the old implementation on Bun. Base32-only differences are not attributed to this change.

**Do not optimize failures.** No caller trace or telemetry gives invalid-input frequency, and a synthetic frequency would encode the result into the workload. `UuidSlugError` construction stays; `Error` identity, stack, cause, code and diagnostics are public behavior. Removing diagnostic errors or callback-owned buffers changes contracts.

**Keep exhaustive seeded-mask candidate decoding on one private 16-byte block restored from four scalar ciphertext words; keep first-match migration separate.** Sharing that setup slowed Chromium's common path. 2026-09 packed 8/16-mask candidate gains: Node 9.9–13.9%, Bun 7.6–15.5%, Deno 38.0–44.9%, Chromium 7.1–12.8% (repeat: Node 26.8.2 19%, Bun 1.4.2 21%, Deno 2.9.6 44%, Chromium 153 15%; Node JITless unchanged). One-mask first-match unchanged. Custom callbacks still receive isolated bytes; the original decoded block stays available to later formats.

**Keep linear candidate deduplication.** Ordinary migration yields at most current, original and plain interpretations. Lazy `Set` promotion at 8/16/32 regressed its boundary (inline 32: Node 8–10%, Bun 8–9%, Chromium 5–6%, Deno 5–9% slower) while only 64 distinct candidates improved 10–32%. Reopen only if observed workloads approach dozens of distinct candidates.

**Pack canonical UUID text directly into base64url only when `Uint8Array.prototype.toBase64` is absent.** Node 24.20.0 takes the fallback: 20–21% gain; native runtimes (Bun 1.4.2, Deno 2.9.6, Chromium 151) unchanged (2026-09). The fallback allocates no byte buffer, preserves parser diagnostics and matches the byte encoder over all 256 values per byte position. Reopen when Node gains native base64url or another runtime changes capability.

**Pack canonical UUID text directly into base32hex.** 2026-09 gains: Node 26.8.2 19–20%, Bun 1.4.2 9–13%, Deno 2.9.6 39–42%, Chromium 153 22–24%, Node 24.21.0 22%; byte and masked controls unchanged. No byte buffer; shares byte extraction, exhaustive byte-space comparison and exact diagnostics with base64url. Reopen if a runtime adds native base32hex.

**Versioned UUID guards check version and RFC variant first, then delegate the full grammar to `isUuidString`.** Mixed invalid input took 63–64% of baseline on Node 26.8.2, 72–75% on Bun 1.4.2, 72% Chromium 153, 66% Deno 2.9.6, 55% Node JITless; mixed valid unchanged. Rejected: a fused specialized grammar pass, no faster than the precheck on Node and slower on Bun, duplicating the syntax loop. Keep one grammar validator; reopen only if valid-heavy traffic regresses on a later engine.

**Native `toHex` offset formatting converts the whole buffer only up to 32 bytes; larger buffers use a 16-byte view** so work cannot scale with unrelated caller data. Bounded route: 83–87% of baseline Node, 80–87% Bun, 83–86% Chromium 153, 81–82% Deno 2.9.6, 92–96% Node JITless; exact-buffer unchanged. Rejected: direct byte formatting (2.1–3.2x slower, Node 26.8.2/Bun 1.4.2); always allocating a view or copy (keeps the avoidable object); unbounded whole-buffer conversion (1.7–17x slower at 256–4,096 bytes). Resource probes expect one hex call and no view at 24 bytes, one view at 256; lowering the boundary fails the small-buffer probe. Reopen when runtime primitives change or caller-buffer distributions justify a new crossover.

**Keep native `toHex` with the byte-pair fallback.** Rejected: four 32-bit words via `toString(16)`, padding and slicing: direct 3.67–3.68x baseline on Node 26.8.2 and 1.74–1.78x on Bun 1.4.2; offset 3.76–3.77x and 1.90–1.91x (2026-09). Reopen only if those primitives change.

**Keep direct structural checks and offset iteration in the UUID parser.** Rejected: a table-driven 36-character state walk: valid parsing 8–27% slower Node 26.8.2, 25–56% Bun 1.4.2, 8–14% Chromium 153, 1–6% Node JITless, 3–19% Deno 2.9.6, plus module initialization and retained state. Invalid-path gains cannot offset a success-path regression. Reopen only if an engine removes lookup and full-scan cost.

**Keep the guarded two-pass parser with early, middle and late invalid probes.** Rejected: a fused four-word decode (64 to 32 table reads; valid path 20–25% faster Node 26.8.2, 33–43% Bun 1.4.2, 22–27% Chromium 153, 22–25% Deno 2.9.6, 36–40% Node JITless) because its strongest form slowed late-invalid Node input 29–42% and middle/late Bun input 3–17%; whole-input and four-byte rescans, encoded invalid offsets and inlined exits all failed the same way. All variants must preserve exact diagnostics and atomic writes. Reopen when engines change or one pass avoids failure-position regressions.

**Keep the grouped byte slug decoder with caller-owned prevalidation.** Rejected: staging fixed-length slug decode in four scalar words: core base64url decoder about 44–62% slower on Node 26.8.2 and Bun 1.4.2, public plain and masked byte routes also slower. Reopen only when downstream masking or formatting can consume words directly.

**Keep caller-owned prevalidation over decoding into a private 16-byte block then committing.** The block was 11–12% faster on Bun 1.4.2 but 6–8% slower on Node 26.8.2, with no compensating failure-path gain. A temporary block pays only when allocation and commit cost less than the primary runtime's second scan.

**Node profiling evidence order: runtime-native first, then Inspector, then portable counters and timing.** Node v26.8.2 combines process counters, `GCProfiler`, V8 heap/code/space state, Inspector CPU and allocation samples, heap snapshots, V8 ticks and trace events. Two APIs over the same V8 sampler are not independent evidence. Optional detail may fall back, but an evidence lane must never silently produce nothing.

**Keep JIT as the performance default; JITless is the last performance rung and a deployment fallback** when executable-memory policy outweighs throughput and startup. Node v26.8.2 base32: JITless used 28% less RSS but import was 21–23% slower, public encode 14.1–14.6x slower, CPU per operation 13.9–14.2x higher. A JITless-only win may justify code when every higher rung is unchanged.

## Regression protection and limits

### Matrix timeout witness

**Hang throughput once and require healthy entropy afterwards from the same member; do not time out both.** The Bun matrix witness keeps its 1,000 ms startup allowance and healthy control. A fixture timer exits 17 after 2,000 ms if the real deadline is removed, and that exit must fail the assertion, so a broken guard cannot pass via the fail-safe. Required falsifications: replacing the transport timeout with `undefined` fails on `exited 17`; skipping entropy after a failed throughput report fails on the missing same-member report. The focused witness drops from ~2,057 ms to ~1,066 ms; complete-hook gain and CI headroom are not established. Deadline and package behavior are unchanged; changed-production cost remains open.

### Error recognition

**Keep the order: immutable prototype `__failure` marker, then local `instanceof`, then native or intrinsic cross-realm recognition.** 2026-09 (Node 26.8.2, Node 24.21.0, Bun 1.4.2, Deno 2.9.6, Chromium): marker type (short, long, string, symbol) had no repeatable winner; marker→`instanceof`→native led marker→native on Node, Deno and Chromium and tied on Bun. Successful strings cost about 4–9 ns because the primitive check exits first.

- Public operations validate their expected string or byte shape first and use local `instanceof Error` for package-created intermediates; routing successful bytes through the general detector was much slower.
- The native `Error.isError` benchmark row exists only when callable; an unavailable capability is never timed as a constant.
- Each fallible rung is isolated so an inaccessible marker cannot suppress local or cross-realm recognition; packed replays found no reproduced regression. Hostile-proxy cost is unmeasured (the regression test proves correctness only).
- Reopen when an engine changes Error layout or recognition. Cold start and other hardware are unmeasured.

Neutral refactors with no reproduced regression (warm, primitive inputs, default selectors; cold initialization, wrapper inputs, base32hex, sentinels and rotation unmeasured):
- One module-local UUID separator constant (direct encode/decode, all five runtimes).
- `String`-object recovery behind primitive checks (UUIDv4 text, masked migration decode).
- Primitive-string exit inside the shared UUID string normalizers, removing duplicate checks from masked and migration readers.

### Consumer graph

**Keep one root entry: named root imports tree-shake to job-sized output.** 2026-09 packed browser builds with Bun, esbuild, Parcel, Rollup, Rolldown, Rspack and webpack: focused imports gave effectively the same bytes, so they justify no extra public entries. Probes execute every optimized bundle and require the masking seed only in the masked case. (A Bun-only 2026-08 predecessor measured `uuidStringToPlainSlug` at 13,082 bytes before masking was removable and 2,229 after.)

**`bun run perf:check` guards JavaScript-visible allocation, decoding, encoding and entropy work plus coarse relative pipeline timings on both runtimes; its injected result-preserving regressions must fail.** Shared functional cases protect wire identity, ownership, invalid input and optional native branches. Async cases protect snapshots, UTF-8 chunk boundaries, cancellation and independent concurrent constructions; switching host yields to microtasks must fail cancellation.

**The Bun test lane uses two isolated workers.** Automatic parallelism increased contention without shortening the complete local check (2026-09). Change the cap only after measuring the complete lane with the same corpus and isolation.

### High-resolution UUIDv7 generation

**Keep fraction bits opt-in and probe the clock implementation once; never infer accuracy from API presence.** 2026-09, macOS Arm64, Node 24.21.0, Bun 1.4.2, Deno 2.9.6, headless Chromium:

- `performance.timeOrigin + performance.now()` had a smallest step of 0.000244140625 ms on Node, Bun and Deno, about 0.1 ms on Chromium; `Date.now` steps 1 ms. Browser privacy settings can lower resolution further. No backward step was seen, which does not establish rollback behavior.
- Caller-buffer generation, fixed fractional clock vs automatic high-resolution clock (ns/call): Node 44.36/47.11 vs 74.77/76.14, Bun 27.18/26.12 vs 67.38/67.25, Deno 48.04/46.79 vs 104.47/105.11, Chromium 43.40/44.20 vs 109.27/108.89. The clock dominates the added cost; fraction arithmetic is small (Bun direction unstable).
- Unmeasured: power, other CPUs, privacy modes, behavior under suspend or wall-clock adjustment.

**The benchmark harness runs only its independent child-process cases concurrently; parser and statistics cases stay serial** (they do not wait and gain nothing). Bun 1.4.2 five-run medians: that file 655 to 266 ms, complete Bun lane 889 to 693 ms.
## UUID competitor audit

Run `bun run bench:competitors` to compare the package's JavaScript paths with current npm alternatives. Each case validates its output before warm-up and fails on duplicate, missing, malformed, empty or non-finite results.

**UUIDv7 interoperability is not a generator whitelist.** Conversion and masking preserve the full 74-bit payload without interpreting it. Optional inspection accepts an explicit count of leading Method 3 fraction bits and following Method 1 counter bits, and returns every other bit unchanged. A UUID cannot identify its generator or layout, so library names never select an interpretation. The conformance matrix tests both boundaries, alternating patterns, every bit position and real output from each installed JavaScript generator below; TypeScript and Rust must both parse each input, extract the same timestamp and preserve all 128 bits through plain and masked alphabets.

| Generator | Use of the 74 payload bits |
| --- | --- |
| package, `uuidv7` 1.2.1 | 42-bit random-start counter and 32 newly random bits |
| `uuid` 14.0.2, `uniku` 0.6.0 | 32-bit random-start counter and 42 newly random bits |
| `fastv7` 1.0.2, `@kripod/uuidv7` 0.3.4 | 12-bit zero-start counter and 62 newly random bits |
| `uuidv7-js` 2.0.0 | Random initial payload, then a random positive increment within the same millisecond |

RFC 9562 permits four useful payload models: random bits; a fixed leading counter; a randomly seeded value increased by random positive amounts; and 1–12 leading fraction bits, optionally followed by a fixed counter. The first and third stay in `remaining`: one UUID cannot prove which process made random-looking bits. The second and fourth decode only when the caller already knows their widths.

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


Excluded: `uuid-tag` (changes payload bits to carry a tag, a different caller outcome), `switchy_uuid` (deterministic simulation adapter), `rs-uuid` (shorter custom IDs, not RFC UUIDs), CLI and database packages (process or storage overhead measures a different job). Base58 codecs are out: no accepted consumer job needs a third UUID spelling, and performance cannot supply the missing human-transcription requirement.

Benchmark direct implementations separately from wrappers. Measure text, owned bytes, caller storage and batch calls only where the crate exposes them. Also record entropy failure, clock rollback, same-millisecond behavior, allocation, contention, target support and output validity. Returned fixed-size values and caller buffers count as allocation-free outcomes, returned `String` as allocated; hidden allocator work is not claimed.

**Keep per-call OS entropy and independent generator state; no batch API.** Executable matrix, 2026-09: every retained direct generator produced valid RFC version and variant; the package's typed entropy failure and strict rollback error, `uuid7`'s rollback abort and `nexus-id`'s 4,096-value same-millisecond limit were exercised. Native runs: package and `uuid` equivalent for v4; package v7 led `uuid` and matched `hyperuuid`. Direct base64url: tied with `uuid-extra` for v4, package led for v7.
- Rejected as equivalents: seeded or process-global generators run tens to hundreds of times faster but do less entropy work per call and carry mutable sequence, rollback, fork or exhaustion behavior. They are mechanism floors, not secure-generation winners.
- Rejected: a package batch interface. `hyperuuid` and `rivid-core` batch APIs are much faster than a scalar caller-storage loop because they amortize entropy and timestamp work. Reopen when a real caller needs batch generation; speed alone does not create the contract.
- Four-thread contention (2026-09): package 248–345 ns per call; `uuid7` and `nativelite-uid` ~76–93 ns; `hyperuuid` 194–337 ns; `rivid-core` ~8 ns. Their entropy and state-sharing contracts differ, so this ranks nothing and does not justify shared or seeded state.

**WebAssembly targets.** All retained generators compiled natively; all but `nativelite-uid` 0.1.0 compiled for `wasm32-unknown-unknown` with each crate's documented feature or the matching caller-selected `getrandom` backend (`nativelite-uid` calls `fill_random`, undefined on that target). This proves compilation only; the package's executed WebAssembly profiles remain the behavioral evidence for its own support.

**Rival v7 layouts fit the explicit fraction-then-counter model.** Rust `uuid` uses a 42-bit leading counter by default; its additional-precision mode dedicates 1–12 of those bits to a Method 3 fraction, the rest stays counter. `fast-uuid-v7` exposes 4-, 8- and 12-bit fraction variants with random trailing bits, plus an 18-bit leading-counter variant. `leachuuid7` documents a 60-bit timestamp, but its source writes the RFC 9562 48-bit timestamp and standard version/variant bits; compatibility covers the source behavior.

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

Measured gaps concern the cost of existing calls. They do not establish demand for batch helpers, NIL/MAX constants, permissive UUID spelling or caller-selected rollback policies. `uuidv7` exposes finer clock-rollback control; this package promises ordering within one generator under its preserve policy. Direct encoding accepts every UUID version, independently of v4/v7 generation.

**Competitor standing (2026-09; Node 24.21.0, Bun 1.4.2, Deno 2.9.6, Chromium; two agreeing full runs).** `--smoke` output validates the harness and ranks nothing (it disagreed with full runs by 30–70% on Bun byte routes).
- Package leads every allocated-byte and caller-buffer group on Node, Chromium and Deno, and Bun's owned-byte groups.
- Open gaps: Bun UUIDv4 caller-buffer write trails `uuid` by ~10%. Deno owned UUIDv7 bytes vs `uuidv7` unresolved (12% behind, then 2% ahead).
- UUIDv7 text leads every package on all four runtimes. Raw platform generation is 5% faster on Node and 2.07x faster on Bun; Bun's native generator encodes timestamps ahead of the clock during bursts (see Native floors).
- UUIDv4 text: matched Node's native generator within 1% before portable text replaced it (see Native floors); on Bun trails `crypto-randomuuid` ~10% and native 5%; on Deno trails `uniku` ~30% and pays 34% over native for validation and the error-value boundary; on Chromium trails pooled `@lukeed/uuid` by 13–15%.
- `uniku` timestamp results are not ranked: its call accepts non-v7 text.
- Limits: single-machine warm throughput. Startup, bundle size, memory, entropy quality, other hardware and engines unmeasured. Platform rows expose wrapper cost; they are floors, not APIs satisfying the package's failure contract.

**`fastv7` timestamp drift is informational, not a qualification failure.** Its 12-bit counter advances the encoded millisecond on overflow: after 2 million calls it encoded up to 47 ms ahead of `Date.now()` on Node 26.8.2 and 88 ms on Bun 1.4.2 (95–97% of values ahead); 2026-10 bracketed 50,000-draw bursts put it 4–8 ms past the ending clock on Bun 1.4.2, Node 24.21.0 and 26.10.0. `uuid`, `uuidv7`, `uniku`, `uuidv7-js`, `@kripod/uuidv7` and this package stayed at or behind the clock. These signed differences add no clock guarantee. The package seeds its 42-bit sequence randomly; `fastv7` and `@kripod/uuidv7` share a zero-start counter with 62 random bits, which disqualifies neither. Faster mechanisms remain candidates when they preserve the requested identifier; default guarantees must not exceed proper native behavior.

**Rejected rows stay timed and are reconsidered after every package update.** `@lukeed/uuid` uses `Math.random`, so it cannot establish secure UUIDv4 performance. `uniku`'s timestamp call does not verify UUIDv7. `fastv7` runs ahead of the clock in bursts. Native platform rows are always shown as qualified floors; error handling around them is package overhead, not a reason to hide them.

**Statistical unit.** Default report intervals describe batches within one process; treat single-process verdicts as screening. Paired fresh-process replays (one median per process, all raw batches retained) govern retained changes; their standard error describes a mean, not call-latency spread, and batch averages establish no per-call p99. Browser comparisons start a fresh browser process per revision and round; a page reload keeps shared state. Reports must count processes, not flattened batches, as observations; a flattened-batch mutation must fail the sample-count regression. See `bench/README.md`.

### Fixed conversion comparisons

#### Owned plain-slug decoding

**Keep the current decoder; no owned native alternative earns replacement.** Compare complete owned arrays, not Buffer bytes: native rows validate canonical padding first, and Buffer output needs a copy to avoid exposing pooled storage. `ownedBytes` witnesses reject Buffer subclasses and reused backing storage before timing; byte equality alone would pass those mutations. Ranking excludes Buffer-only results.
- Deno 2.9.7, 2026-10: package 292/160 ns vs Buffer+copy 452/244, `fromBase64` 550/293, native write into fresh arrays 521/286; package intervals end below each owned alternative's.
- Open: Buffer-only stays lower at 219/119 ns; that cost remains a target for investigating less owned work. Allocation parity, other input forms, p99 and floor unmeasured.

Bun's installed declaration gives `setFromBase64` a numeric offset parameter, but Bun 1.4.2 and Deno 2.9.7 accept decoding options and reject the numeric form. A narrow optional capability type contains that mismatch rather than weakening other prototype methods.

#### UUIDv4 draw and encoder isolation

**Component timings locate Bun slug costs; they cannot select a public implementation.** Bun 1.4.2, 2026-10: pooled copy-and-erase draws 15.16–15.22 ns vs direct scratch 15.28–15.45 ns; selected fixed encoding 34.12–34.78 ns vs native 30.47–30.55 ns; complete package slugs 43.92–44.24 ns vs pooled-native 40.85–41.20, direct-scratch-native 42.47–42.74, direct-owned-native 46.94–46.96 ns. The prior packed native-encoding comparison remains the retention decision; the refreshed native UUIDv4 slug floor is open.

#### Canonical UUIDv7 timestamp validation screen

**Keep case-insensitive canonical validation in `isUuidV7Text`; keep the shared parser for compact, URN and braced spellings.** Compare full validation before parsing; parsing alone is a lower bound. The regex derives from the existing canonical pattern once (one syntax definition; per-call construction would charge every call).
- Packed replays, 2026-10: canonical extraction ratios 0.739/0.793 on Node 26.10.0 and 0.659/0.624 on Bun 1.4.2 (intervals below 1); guard ratios 0.643/0.606 and 0.462/0.458. Mixed case improves too. Chromium, Firefox, WebKit, Deno and Node JITless favor it, some browser intervals unresolved. Compact and wrapped guards show no repeated loss.
- Resources: lower canonical CPU, no filesystem I/O; allocation estimates too close to rank. Root import 12.06/12.28 ms Node, 5.41/4.47 ms Bun, live heap ~15/17 KiB; no startup difference established.
- Full-payload corruption and wrong-version/variant regressions fail a validation-bypass mutation on Node and Bun.
- Rejected: lowercase-only explicit classes as a separate syntax (close in cost, duplicates the definition).
- Reopen after engine or syntax changes: recheck complete calls, fallback spellings, allocations and startup. Native parse-only floor still open.

#### Canonical timestamp parsing screen

**Keep fixed arithmetic digit reads for canonical UUIDv7 timestamp extraction under the JIT; keep native radix parsing on JITless Node.** Preserve full text validation and the complete 48-bit result.
- Packed replays, 2026-10, canonical lowercase/mixed ratios: Node 26.10.0 0.804–0.837/0.819–0.823; Bun 1.4.2 0.645–0.663/0.607–0.649; Chromium 0.814–0.862/0.830–0.871; Deno 2.9.7 0.797–0.812/0.790–0.801; WebKit 26.6 0.614–0.666/0.591–0.612; intervals exclude parity. Firefox lowercase separates, mixed unresolved; Node 24.21.0 separates both.
- Allocation: sampled bytes per op fall from ~96 to ~16 on Node and Deno, ~71 to ~12 on Chromium; Bun CPU 66.38/64.65 → 39.37/38.31 ns. The resource gate sees zero substring calls on Node and Bun; restoring sliced parsing fails it.
- Rejected: joined/split `parseInt`, arithmetic and table digit loops, hexadecimal `Number` and `BigInt`, Buffer decoding, native `fromHex` (none beat fixed reads). Fixed table reads: slightly slower on Node, faster on Bun.
- Rejected: unconditional fixed reads. They slow JITless Node by 36–40%; the existing startup selection keeps native parsing there (ratios ~1.01, spanning parity).
- Guards: timestamp carry oracle fails for signed low words and a misplaced digit; child-process tests check parser selection against V8 executable-heap state across CLI and environment precedence. No new table or capability probe is initialized.
- No universal improvement claim for compact or slug inputs. Open: native parse-only floors, Bun gross allocation. Recheck after parser or engine changes.

**Package beats `uuidv7-js` on complete timestamp calls.** Compare against the qualified rival call, not bare parsing. Package/rival ratios: 0.759–0.813 Node LTS, 0.758–0.771 Node Current, 0.600–0.613 Bun, 0.731–0.750 Deno, 0.787–0.818 Chromium (throughput only). Sampled bytes per op ~16 vs ~95 on Node and Deno, ~12 vs ~72 on Chromium; Bun 36.70–41.77 vs 62.80–68.11 ns, zero package slices vs two rival slices. Keep the rival in the shared profiling corpus with identical inputs and independently constructed timestamps; a wrong rival timestamp fails corpus verification before timing. Preserve these distinctions when rechecking upgraded rivals.

#### Uppercase writer screen

**Keep the direct uppercase writer.** Rejected: lowercase formatting then `toUpperCase()`, at 1.107/1.094 times the cost on Node 26.10.0 and 1.040/1.048 on Bun 1.4.2 (Bun unresolved), 2026-10; no repeated speed benefit. Source screens only. Recheck after a formatter or engine change.

**Conversion comparison harness.** `bench/conversion-cases.ts` covers six text/byte/base64url conversions, text validation and timestamp extraction, against `uuid` parse/stringify/validate and native hex/base64url (including dehyphenation, padding and formatting). Run with `UUID_SLUG_GENERATION_FILTER=conversion` and `UUID_SLUG_GENERATION_FORKS=6`; exact fixed outputs must pass before timing. Strict native base64url decoding requires `slug + "=="` (unpadded fails on Bun). Absent methods are reported without timing (Node 24.21.0 lacks six native byte methods). Buffer results keep their ownership difference; regex and `parseInt` rows are lower bounds without full validation. The fixed-output regression rejects lost payload bits even when the version stays correct.
- Open gaps (2026-10): Bun byte-to-slug 1.14–1.17x native, Deno slug-to-byte 1.16–1.20x; timestamp extraction 2.13–3.41x the `parseInt` lower bound. These identify work, not a safe replacement.

**Per-call timing.** Adjacent `performance.now()` pairs differ by a median 41 ns on Bun 1.4.2 and 42 ns on Node 26.10.0 (p99 42 and 125 ns), the same scale as UUID conversion; subtracting it from a call's p99 does not recover latency. The opt-in call-timing pass brackets each successful call, consumes the result after the end timestamp, keeps acquisition order and rotates an adjacent-clock control; an omitted call-window mutation fails the elapsed-work regression. Browser p99 reads zero under their clocks: a resolution limit, not zero latency. Host observations include timer overhead.

Gate limits: relative timing cannot detect a slowdown shared by both sides; constructor counters miss engine allocation; hosted CI and other OS/architectures were not run.

# UUIDv7 continuation comparisons

## Unaligned entropy word copying

**Rejected: one retained DataView read and unaligned four-byte erase in place of four byte stores.** No reproduced primary-call gain on Node 26.10.0, Bun 1.4.2 or Deno 2.9.7 (2026-10); directions flip between screens (e.g. Bun owned bytes 50.02/49.15 vs 50.73/48.78 ns, then 51.23/48.94 vs 50.75/48.26). The added retained view needs a packed replay or cold-initialization study to justify it. Resource counters do not measure DataView allocation. A lost-fourth-byte mutation fails the shared pool and generated-tail witnesses.

## Exact counter storage

**Rejected: a single exact 42-bit Number counter instead of split words.** Focused Bun slug gains did not survive packed calls: Bun candidate/baseline 1.016 [0.934, 1.148], owned bytes 0.978 [0.921, 1.037] (2026-10). Not proof one Number is slower. The candidate must keep seed bits, fractional layouts, entropy-failure transactionality and writer bytes; the shared timestamp-ceiling witness rejects a widened-overflow mutant.

**Open gap: owned UUIDv7 generation** trails `uuid` on Bun (package/best 1.170, 1.203) and `uuidv7` on Deno (1.080, 1.089), 2026-10; package leads on Node and Chromium. `uuidv7` uses one Number counter and pooled Uint32 entropy, while the package erases consumed entropy and preserves configured failure behavior; the aggregate gap does not identify which difference causes it.

# Entropy copying

**Keep fixed stores for four-byte draws and four-byte blocks for sixteen-byte draws; other widths keep the indexed loop.** Consumed-byte erasure is preserved.
- Node 26.10.0 packed ratios, 2026-10, candidate/baseline (two replays):

| Node 26.10.0 call | First candidate/baseline | Repeat candidate/baseline |
| --- | --- | --- |
| Owned UUIDv4 bytes | 0.821 [0.779, 0.849] | 0.842 [0.784, 0.880] |
| Caller-buffer UUIDv4 | 0.715 [0.693, 0.803] | 0.766 [0.715, 0.785] |
| Owned UUIDv7 bytes | 0.942 [0.897, 0.966] | 0.960 [0.948, 0.995] |

- Also reproduces: Node uppercase UUIDv7 and immutable values; Chromium caller-buffer UUIDv4 and base32hex UUIDv7; Deno 2.9.7 owned UUIDv4; Node 24.21.0 owned UUIDv4 0.887 and UUIDv7 0.970. Bun 1.4.2 and Firefox unresolved; no slowdown reproduces (one WebKit 1.022 reversed to 0.955 on focus).
- Fixed stores add no array, view or retained state. Lost-byte and missing-erasure mutations fail Node and Bun witnesses for both widths.
- Rejected: a separate source cursor; it raised Node UUIDv4 owned-byte cost in every focused observation.
- The four-byte comparison does not measure the sixteen-byte change. Native and competitor parity remain open. Recompare complete calls when draw widths or runtime typed-array handling change.

### Plain base32hex conversions against scure

**Keep the existing base32hex encoder and decoder.** Against `@scure/base` 2.4.0 `base32hexnopad` (uppercase, so lowercase calls include case conversion; text calls compose `uuid.parse`/`stringify`), package costs are 0.100–0.501 times the rival across bytes↔slug and text↔slug on Node 24.21.0/26.10.0, Bun 1.4.2, Deno 2.9.7 and Chromium, 2026-10. Fixed RFC 4648 spellings and fresh plain `Uint8Array` ownership are checked before timing. Warm single-UUID calls only. Reopen when the rival gains lowercase output, changes implementation, or a runtime narrows the lead.

### Lowercase scure component comparison

**Keep the current base32hex implementation even against scure without case conversion.** Composing scure's exported `__TESTS.radix2(5)` and lowercase `__TESTS.alphabet` (release-pinned internals, not a public codec) still costs more: package ratio 0.102–0.525 across all four calls and five runtimes (Node Current 0.140–0.520, Bun 0.298–0.507), 2026-10. Recompare when either implementation or a runtime changes.

### Fixed-call warm-up screen

**Keep elapsed-time warm-up; do not replace it with a fixed call count on this evidence.** Warm-up was ~116 s of a 269.63 s full check, but sampling alone needs ≥64.5 s, so warm-up cannot fix the whole lane.
- Rejected: 4,096 preparation calls. Bun decoding medians 85–151 ns vs 64–76 ns for elapsed controls (GC-matched); not equivalent preparation.
- 16,384 and 65,536: unchanged controls pass, but Bun window overruns and cost shifts stay unexplained; large-loss mutations detected do not prove smaller-loss sensitivity. Elapsed preparation also does not guarantee equal executed work (Bun 9.4 ms CPU in 64.4 ms wall).
- Host and browser records must retain batch acquisition order; summaries compute medians separately.
- Reopen when detection and remaining acquisition costs meet the feedback-loop requirements.

### Single-draw codec timing defect

**Use one discarded secure draw in codec values as the small-loss detection fixture**; many draws hide a gate's insensitivity. No output contract or runtime policy changes.
- Detection is inconsistent: with 65,536 preparation, 1 ms windows detect on both hosts but 3 ms windows miss Bun (1.715); with elapsed preparation Node misses (1.583). Keep both misses when evaluating policy.
- Rejected: 32,768 preparation with one-third-ms windows; the repeat misses Node (1.632) despite a large loss.
- Short windows do not bound uninterrupted time (up to 108 ms on Bun under 1 ms windows). Examine preparation and process overhead before shrinking sampling further.
- Node slow baseline sequences (~300 vs ~120 ns) persist across whole processes; `uuidObjectChecksum` wrong-map deoptimization appears in both slow and fast captures, so it does not explain them. Diagnose by extending only the codec interval with inspector start/stop (timestamp clipping fails: V8 profile and `process.hrtime()` origins differ). Never use instrumented throughput to qualify timing policy.

### Codec computation timing defect

**The `codec:bigint-byte-generation-timing` fixture tests detection beyond resource counters** (the discarded draw already fails `resources.ts` with `buffers=2 exceeds 1`). It converts the final byte to BigInt and back, preserving byte, errors, entropy and sequence state; Node's optimized code retains the work.
- Detection with 32,768 preparation and 1 ms batches: Bun detected twice (1.246, 1.240); Node only once (1.064 [0.987, 1.129], 1.055 [1.006, 1.109]). Not a reason to change timing policy. Constructor counts cannot prove allocation-neutral computation.
- Reproduce: `bun bench/source-candidates.ts codec bigint-byte-generation-timing`; packed: `bench/compare.ts --source-candidate=codec:bigint-byte-generation-timing` with the primary inventory from `bench/check.ts`. Inspect optimized code with Node `--print-opt-code --trace-opt --trace-deopt` (tracing changes cost).

### Local checksum accumulation screen

**Rejected: publishing the checksum once per batch.** The full comparison misses the computation defect on both hosts (family-wide intervals [0.807, 2.715] Node, [0.495, 1.273] Bun). Ordinary intervals cannot replace the protected family-wide rule. Original profiler kept.

### Independent compiled-loop screen

**Rejected: compiling the typed loop separately per case.** Codec ratios 1.120 and 1.213 stay unresolved on both hosts; an unrelated `plain.decode` failure cannot prove targeted detection. Original profiler and timing policy kept.

### Fixed measured-call screen

**Keep measured-call (equal-call batch) mode experimental** until detection repeats within the complete-lane budget.
- One batch of 16,384 calls on Node 26.10.0 and Bun 1.4.2 detects the codec defect on both hosts in two runs (~28–31 s per run). Bun `plain.decode` also fails each time; cause unresolved.
- Seven batches of 8,192 miss Node; seven of 16,384 detect both but take 115–175 s.
- Rejected for Node 24.21.0 and Deno 2.9.7: one batch misses both (1.063, 0.997); 32,768 calls detect Node but still miss Deno. Deno's compiler graph retains the injected computation, and its caller-thread CPU varies as much as wall time, so CPU-only gates or pause filtering are not justified.
- Bun decoder-only comparisons do not reproduce the full-inventory decoding loss; do not dismiss it as noise.
- Allocation: `total_allocated_bytes` is cumulative on Node 26.10.0 and Deno 2.9.7, absent on Node 24.21.0, and not cumulative on Bun 1.4.2. Use qualified counters only; absence is missing evidence, not zero. It excludes external backing storage. It catches the codec defect (~1.2–1.8 MB) where Deno timing misses it; two pairs set no budget.
- Launch the profiler directly for compiler diagnostics; compiler messages break the comparison's JSON-only stdout.
- With equal call counts, mean batch time and aggregate CPU share weighting; the gap bounds time outside caller-thread CPU without identifying its cause.

### Per-case preparation screen

**Rejected: preparing immediately before each case.** It misses Bun's codec defect (1.110) and widens Bun codec process medians to 65–291 ns vs ~60 ns before-all. Keep before-all preparation and the original profiler. `UUID_SLUG_PROFILE_WARMUP_BEFORE_CASE` existed only in rejected experiment source, not a supported option. Changed-production packed timing and cold CI headroom remain open.

### Reduced before-all preparation screen

**Rejected: 16,384 preparation calls.** The computation defect passes the protected comparison (Node 1.033, Bun 1.321, both intervals include parity). Retain the original policy.

### Shared ending-clock screen

**Rejected: one shared ending timestamp for block and total elapsed time.** Node's defect stays unresolved (1.046 [0.960, 1.137]) while Bun detects it; fails the both-host criterion. Original profiler unchanged.

### Unchanged packed graph checks

**Skip primary-call regression timing when independently packed output is byte-identical**; re-measuring the same implementation cannot show a code regression. A benchmark-only dependency change dropped `bun run check` from 269.63 s to 20.10 s on Node 24.21.0 and Bun 1.4.2. Source, compiled code, manifest changes, added assets and missing files prevent the exemption; unsupported file kinds fail; replacing byte comparison with unconditional success fails the owning mutation test. Changed production still runs sixteen fresh processes per runtime. Explicit source experiments keep timing. Open: the slower changed-production lane and CI headroom.
