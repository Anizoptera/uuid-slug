<!-- SPDX-License-Identifier: Apache-2.0 -->

# UUIDv7 across runtimes — measured 2026-08-11

A snapshot, not a claim about today. Apple M4 Max, macOS 26.5.2, Bun 1.3.14, Node 24.15.0 and
Node 26.7.0. Reproduce with `bun run bench:matrix`; add runtimes through
`UUID_SLUG_BENCH_RUNTIMES` (colon-separated executables). Numbers move a few percent per run —
read ratios, not digits.

## What this changed

**Intra-millisecond ordering differs by runtime, and this package does not promise it.**
`crypto.randomUUIDv7` arrived in Node 26.6.0 and re-randomises all 74 random bits on every call:
consecutive values inside one millisecond sort in creation order **50.06%** of the time. Bun's
advances a 12-bit counter and reaches 99.98%. The portable generator reaches 100%. All three are
conformant — RFC 9562 §6.2 leaves the choice to the implementation.

The package delegates to whichever generator the runtime provides and discloses the difference
rather than flattening it (ruling, 2026-08-11). What it does guarantee is enumerated in
README §Guarantees and asserted by the suite: conformance, cryptographic randomness, no repeats,
and time ordering to the millisecond. Ordering _inside_ a millisecond is explicitly not promised —
use a sequence column if you need it.

This audit briefly did the opposite: it asserted strict ordering in a test, rejected Node's native
generator for failing it at a 6.4× throughput cost, and reported that as a defect fix. The
guarantee was never written down anywhere; the test had invented it hours earlier. The rule that
came out of it is in `AGENTS.md` — a promise this package has not published is not a promise, and
a test may assert the published ones and nothing stronger.

CI now runs the suite on `current` as well as `lts/*`, which is how a runtime that changes
behaviour under this package becomes visible at all.

**`uuidV7Bytes` returned a different TYPE per runtime.** Bun's native hands back a node `Buffer`,
which satisfies `Uint8Array` structurally, so nothing in the type system objected. But
`toString("hex")` returns hex from a Buffer and `"1,159,242,…"` from a Uint8Array, and
`JSON.stringify` emits `{"type":"Buffer","data":[…]}` against `{"0":1,…}`. Code written and tested
on Bun would produce different bytes on Node, silently. Now copied into a plain `Uint8Array`
(−20% on that path, 18.0M → 15.1M) and pinned by a test in both runners.

## Throughput, ops/s

| operation               | bun 1.3.14 | node 24.15.0 | node 26.7.0 |
| ----------------------- | ---------: | -----------: | ----------: |
| `package.v4.string`     |     32.56M |        8.25M |       6.94M |
| `package.v7.string`     |     17.24M |        0.98M |       0.97M |
| `package.v7.slug`       |     15.58M |        1.09M |       1.01M |
| `package.v7.maskedSlug` |      3.02M |        0.97M |       0.92M |
| `package.v7.bytes`      |     15.14M |        1.35M |       1.28M |
| `uuid` v4               |     30.04M |        6.84M |       6.13M |
| `uuid` v7               |      5.90M |        1.34M |       1.33M |
| `uuidv7`                |      4.56M |        3.09M |       2.90M |
| `fastv7`                |      8.25M |        8.41M |       6.92M |
| `uuidv7-js`             |      3.67M |        1.25M |       1.24M |
| `@kripod/uuidv7`        |      2.08M |        0.68M |       0.64M |

Same JavaScript, different engine, up to 3.3× apart (`@kripod/uuidv7`) — a library's ranking does
not transfer between runtimes. `fastv7` is the only pure-JS candidate that does not collapse on
Node, and on Node it beats every other library including this package's portable path.

### Native surfaces

| native                                            | bun 1.3.14 | node 24.15.0 | node 26.7.0 | note                           |
| ------------------------------------------------- | ---------: | -----------: | ----------: | ------------------------------ |
| `Bun.randomUUIDv7("buffer")`                      |     19.68M |            — |           — | raw 16 bytes, fastest measured |
| `Bun.randomUUIDv7("base64")`                      |     16.64M |            — |           — | 24 chars, padded               |
| `Bun.randomUUIDv7("base64url")`                   |     16.26M |            — |           — | **22-char slug, natively**     |
| `Bun.randomUUIDv7("hex")`                         |     16.20M |            — |           — | canonical 36-char              |
| `Bun.randomUUIDv5`                                |      8.55M |            — |           — | deterministic, name-based      |
| `crypto.randomUUIDv7()`                           |          — |            — |       6.28M | Node ≥26.6.0                   |
| `crypto.randomUUIDv7({disableEntropyCache:true})` |          — |            — |       1.42M | 4.4× cost                      |
| `crypto.randomUUID()`                             |     27.71M |        8.61M |       6.74M | v4                             |
| `crypto.randomUUID({disableEntropyCache:true})`   |      3.58M |        1.51M |       1.49M | 5.7× cost                      |
| `globalThis.crypto.randomUUID()`                  |     30.90M |        7.95M |       6.62M | Web Crypto binding             |

Node's entropy cache is worth 4.4–5.7×; it batches enough randomness for 128 identifiers. This
package draws entropy per call and does not batch — the clearest remaining optimisation for its
portable path, which is what every Node consumer now runs.

`Bun.randomUUIDv7("base64url")` produces the same 22-character encoding this package does
(verified byte-identical against `Buffer.toString("base64url")` over 5,000 random inputs) at
16.26M against this package's 15.58M — a 4% gap. The encoder is not the bottleneck.

## Randomness

`distinct` — different random fields drawn. `ordered` — consecutive values that sort in creation
order. `counter` — width of a leading counter advancing by exactly one, with the share of pairs
obeying it. `P(1)` — narrowest and widest share of ones across the 74 random bits. Method and
limits are documented in `bench/entropy.ts`; 50,000 samples per candidate per runtime.

| candidate        | runtime | source            |    ordered | counter      |       unguessable |
| ---------------- | ------- | ----------------- | ---------: | ------------ | ----------------: |
| **package**      | bun     | native, below JS  |     99.98% | 12b @ 99.98% |           62 bits |
| **package**      | node 24 | `randomFillSync`  |    100.00% | 42b @ 100%   |           32 bits |
| **package**      | node 26 | `randomFillSync`  |    100.00% | 42b @ 100%   |           32 bits |
| `uuid`           | all     | `getRandomValues` |    100.00% | 32b @ 100%   |           42 bits |
| `uuidv7`         | all     | `getRandomValues` |    100.00% | 42b @ 100%   |           32 bits |
| `fastv7`         | all     | `getRandomValues` |    100.00% | 12b @ 100%   |           62 bits |
| `uuidv7-js`      | all     | `getRandomValues` |    100.00% | 42b @ ~50%   | partly determined |
| `@kripod/uuidv7` | all     | not observable    |    100.00% | 12b @ 100%   |           62 bits |
| `bun-native`     | bun     | native, below JS  |     99.98% | 12b @ 99.98% |           62 bits |
| `node-native`    | node 26 | native, below JS  | **50.06%** | none         |           74 bits |

No candidate repeated a value, and none reached `Math.random` on any path.

Three counter designs are visible, all sanctioned by RFC 9562 §6.2, trading unguessability
against ordering:

- **Fixed counter** (everything except the two below) — fully determined by the previous value,
  so ordering is exact and those bits are free to an attacker.
- **Random increment** (`uuidv7-js`) — 42 bits advance by exactly one only ~50% of the time; the
  rest is a random positive step, so the field is partly determined and still ordered.
- **No counter** (`node-native`) — maximum unguessability, no intra-millisecond ordering.

`unguessable` is stated only where the counter holds at ~100%; for a random increment no single
number is honest. Bun's 12-bit counter holds 4096 values per millisecond and wraps beyond that,
which is the 0.02% of pairs out of order — measured, not inferred, at 8,629 draws in one
millisecond. Wrapping does **not** repeat a value: 200,000 draws produced 200,000 distinct fields.

"not observable" is not a finding — a native generator draws below JavaScript, and a library that
captures its source reference at import is instrumented too late. It states what was seen.

## Known limitation: slugs do not sort

The 22-character base64url form is **not** lexicographically sortable, independent of any
generator. The alphabet is ordered `A–Z a–z 0–9 - _` while ASCII orders `- 0–9 A–Z _ a–z`, so
string comparison does not track byte order: 200,000 strictly increasing 16-byte inputs produced
**15,720 order inversions** (7.9%). The README's design already directs the UUID to the database
index and the slug to public URLs, so nothing here is broken — but "the same identifier in a
shorter alphabet" is true of the value and not of its ordering, and a reader may store the slug
expecting otherwise. A sort-preserving variant is possible at the same 22 characters by ordering
the alphabet to match ASCII; that is a maintainer's decision, not a defect.

## Method, and what it does not cover

One process per runtime, 1,000,000 iterations per row after a 1,000-iteration warm-up, one byte
of each result consumed so nothing is optimised away. Three threats were tested rather than
assumed:

- **Warm-up** — 1,000 against 100,000 iterations moved Node by under 2%. Not a factor.
- **Shared call site** — measuring every candidate through one function could go megamorphic;
  isolated processes agreed with in-suite figures within run-to-run variance (~5%). Isolation
  would have been complexity for nothing.
- **Bundling** — Node cannot execute the repository's extensionless TypeScript imports, so each
  bench is bundled for it. Under Bun that bundle measured 1.51M against 16.4M for the same code,
  because a Node-targeted bundle resolves `#runtime` to the Node adapter. The bundle is therefore
  correct for Node and invalid anywhere else, and is never cross-run.

Not covered: memory and allocation behaviour, multi-core or worker contention, cold-start cost,
and statistical randomness quality beyond the three measures above — a generator that passes all
of them and is still weak needs a real battery (PractRand, dieharder), which is a different tool.
