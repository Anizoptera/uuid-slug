<!-- SPDX-License-Identifier: Apache-2.0 -->

# UUIDv7 across runtimes — measured 2026-08-12

A snapshot, not a claim about today. Apple M4 Max, macOS 26.5.2, Bun 1.3.14, Node 24.15.0 and
Node 26.7.0. Reproduce with `bun run bench:matrix`; add runtimes through
`UUID_SLUG_BENCH_RUNTIMES` (colon-separated executables). Numbers move a few percent per run —
read ratios, not digits. Every figure below comes from that command; nothing here is hand-entered.

## What this changed

**Intra-millisecond ordering differs by runtime, and this package does not promise it.**
`crypto.randomUUIDv7` arrived in Node 26.6.0 and re-randomises all 74 random bits on every call:
consecutive values inside one millisecond sort in creation order **49.97%** of the time — chance.
Bun's advances a 12-bit counter and reaches 99.98%. Node 24, which has no native v7, runs this
package's own generator and reaches 100%. All three are conformant; RFC 9562 §6.2 leaves the
choice to the implementation.

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
behaviour underneath this package turns a lane red rather than a consumer's index.

## Throughput, ops/s

| operation               | bun 1.3.14 | node 24.15.0 | node 26.7.0 |
| ----------------------- | ---------: | -----------: | ----------: |
| `package.v4.string`     |     31.49M |        7.99M |       6.87M |
| `package.v7.string`     |     16.01M |        2.65M |       5.69M |
| `package.v7.slug`       |     14.83M |        2.95M |       2.78M |
| `package.v7.bytes`      |     14.87M |        5.67M |       5.58M |
| `package.v7.maskedSlug` |      3.20M |        2.05M |       1.98M |
| `uuid` v7               |      5.44M |        1.34M |       1.28M |
| `uuidv7`                |      3.72M |        3.06M |       2.74M |
| `fastv7`                |      7.57M |        7.99M |       6.55M |
| `uuidv7-js`             |      2.71M |        1.23M |       1.18M |
| `@kripod/uuidv7`        |      2.05M |        0.65M |       0.62M |

`package.v7.string` more than doubles between Node 24 and Node 26 — 2.65M to 5.69M — because 26.6
added `crypto.randomUUIDv7` and the adapter adopts it. That is the same change that costs
intra-millisecond ordering in the table below: one number moved because the other did.

`package.v7.slug` does NOT follow it up, because a slug needs the bytes and the native string
form would have to be parsed back. `package.v7.maskedSlug` is the slowest row by design — it is
generation plus a four-round keyed cipher plus encoding.

### Native surfaces

| native                                            | bun 1.3.14 | node 24.15.0 | node 26.7.0 | note                       |
| ------------------------------------------------- | ---------: | -----------: | ----------: | -------------------------- |
| `Bun.randomUUIDv7("buffer")`                      |     19.95M |            — |           — | raw 16 bytes               |
| `Bun.randomUUIDv7("base64")`                      |     16.97M |            — |           — | 24 chars, padded           |
| `Bun.randomUUIDv7("base64url")`                   |     16.32M |            — |           — | **22-char slug, natively** |
| `Bun.randomUUIDv7("hex")`                         |     15.89M |            — |           — | canonical 36-char          |
| `Bun.randomUUIDv5`                                |      8.92M |            — |           — | deterministic, name-based  |
| `crypto.randomUUIDv7()`                           |          — |            — |       5.86M | Node ≥26.6.0               |
| `crypto.randomUUIDv7({disableEntropyCache:true})` |          — |            — |       1.41M | 4.2× cost                  |
| `crypto.randomUUID()`                             |     31.08M |        8.63M |       7.08M | v4                         |
| `crypto.randomUUID({disableEntropyCache:true})`   |      3.66M |        1.47M |       1.46M | 4.8–5.9× cost              |
| `globalThis.crypto.randomUUID()`                  |     30.95M |        7.82M |       6.71M | Web Crypto binding         |

Node's entropy cache is worth 4.2–5.9×. This package batches too — `src/runtime/pool.ts` draws an
8 KiB page and hands it out — so that is not a remaining optimisation, and an earlier version of
this file claiming otherwise was already false when written.

`Bun.randomUUIDv7("base64url")` produces the same 22-character encoding this package does. That
agreement is a gate rather than a bench figure: `test/alphabet.test.ts` compares this package's
encoder against `Buffer.toString("base64url")` across every length boundary. At 16.32M against
this package's 14.83M the two are within a factor the run-to-run spread below does not let anyone
call a finding.

## Randomness

50,000 samples per candidate per runtime. Method and limits are documented in `bench/entropy.ts`.

- `distinct` — different random fields drawn.
- `in-tick` — consecutive values **inside one millisecond** that strictly increase, over the
  same-millisecond pairs only. Pairs spanning a tick order by their timestamp whatever the
  generator does, so including them measured the clock.
- `peak/ms` — most values drawn in any single millisecond. It is what decides whether a counter
  wraps.
- `counter` — width of a leading counter advancing by exactly one, with the share of pairs obeying
  it.
- `P(1)` — narrowest and widest share of ones across the 74 random bits.

| candidate        | runtime | source            | in-tick | peak/ms |      counter |
| ---------------- | ------- | ----------------- | ------: | ------: | -----------: |
| **package**      | bun     | native, below JS  |  99.98% |  15,155 | 12b @ 99.98% |
| **package**      | node 24 | `randomFillSync`  | 100.00% |   3,448 |   42b @ 100% |
| **package**      | node 26 | native, below JS  |  49.97% |   8,389 |     1b @ 25% |
| `uuid`           | all     | `getRandomValues` | 100.00% |   1,331 |   32b @ 100% |
| `uuidv7`         | all     | `getRandomValues` | 100.00% |   3,459 |   42b @ 100% |
| `fastv7`         | all     | `getRandomValues` | 100.00% |   4,096 |   12b @ 100% |
| `uuidv7-js`      | all     | `getRandomValues` | 100.00% |   1,303 |   42b @ ~50% |
| `@kripod/uuidv7` | all     | not observable    | 100.00% |     736 |   12b @ 100% |
| `bun-native`     | bun     | native, below JS  |  99.98% |  14,319 | 12b @ 99.98% |
| `node-native`    | node 26 | native, below JS  |  50.23% |   9,277 |     1b @ 25% |

No candidate repeated a value in this sample. No calls reached the wrapped `Math.random` binding;
native draws and references captured before instrumentation were not observed.

`fastv7` peaked at 4,096 draws per millisecond, the capacity of a 12-bit counter. Bun exceeded
that capacity and occasionally produced out-of-order values. Counter wrap is consistent with
these observations; this probe does not isolate the cause or establish behavior under other loads.

Leading-bit increments distinguish counter-like behavior in these samples. They do not establish
how many bits an attacker can predict: that requires analysis of each generator and its entropy
source. The table reports observed increment agreement and ordering, not security strength.

"not observable" is not a finding — a native generator draws below JavaScript, and a library that
captures its source reference at import is instrumented too late. It states what was seen, and it
is why README §Guarantees scopes the cryptographic-randomness promise to this package's own code.

## Known limitation: slugs do not sort

The 22-character base64url form is **not** lexicographically sortable, independent of any
generator. The alphabet is ordered `A–Z a–z 0–9 - _` while ASCII orders `- 0–9 A–Z _ a–z`, so
string comparison does not track byte order. base32hex has no such gap — it runs `0–9 a–v`, which
is ASCII order — which is the whole reason it is offered. `test/alphabet.test.ts` gates both
halves against strictly increasing inputs: zero inversions in base32hex, some in base64url.

The README's design already directs the UUID to the database index and the slug to public URLs, so
nothing here is broken — but "the same identifier in a shorter alphabet" is true of the value and
not of its ordering, and a reader may store the slug expecting otherwise. Use `base32hex` when the
slug itself has to sort.

## Method, and what it does not cover

One process per runtime, one byte of each result consumed so nothing is optimised away. Two
threats were tested rather than assumed:

- **Warm-up** — 1,000 against 100,000 iterations moved Node by under 2%. Not a factor.
- **Bundling** — Node cannot execute the repository's extensionless TypeScript imports, so each
  bench is bundled for it. A Node-targeted bundle resolves `#runtime` to the Node adapter, so it is
  correct for Node and invalid anywhere else, and is never cross-run. Inlining across module
  boundaries can flatter a row a consumer would import unbundled.

Not covered, and stated rather than quietly assumed: memory and allocation behaviour, multi-core or
worker contention, cold-start cost, whether measuring every candidate through one shared call site
goes megamorphic, and statistical randomness quality beyond the measures above — a generator that
passes all of them and is still weak needs a real battery (PractRand, dieharder), which is a
different tool.
