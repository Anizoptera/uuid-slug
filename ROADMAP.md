# Success-path performance

Find and remove substantial cost on the successful calls consumers run, without weakening the
public API. Failure and rare-input paths are not targets.

## Findings

Screen: scratch harness, 9×20,000-call medians beside the nearest sibling route, Node 26.8.2 and
Bun 1.4.2, one machine. A screen chooses what to measure; it retains nothing.

- A parsed `Uuid` passed to `uuidToString` costs 2,882 ns on Node against 62 ns for bytes, and
  ×4.7 on Bun; `codec.uuidToMaskedSlug(uuid)` likewise. `decodeKeylessUuid` and
  `codec.decodeUuid` build an `INVALID_BUFFER` error for every non-byte object before reading the
  value protocol (`src/slug.ts`, `src/masking-codec.ts`).
- `codec.uuidToString(plain 22-character slug)` costs 5,708 ns on Node against 152 ns keyless,
  ×4 on Bun: `decodeMaskedSlug` builds the check-miss error that the codec discards before the
  plain reading (`src/payload.ts`).
- Retained: canonical lowercase text returns unchanged from both `uuidToString` methods, 4 times
  faster on Node and 6.5 on Bun; Bun codec sentinel reads lose about 4 ns to JavaScriptCore
  inlining limits (bench/PERFORMANCE.md).
- Retained: private-field value state makes parsing and value generation 1.4–3.6 times faster on
  Node, Bun, Chromium, and Deno (bench/PERFORMANCE.md).
- Compare records now carry `runtimeVersion`; pass `UUID_SLUG_COMPARE_NODE_EXECUTABLE` for Node
  Current, since the project pins Node 24.21.0.
- Retained: two-number payload assembly makes `extractUuidV7Payload` 1.5–3.2 times faster from bytes
  and 1.1–2.2 from text on every runtime (bench/PERFORMANCE.md).
- The profile corpus now has rows for parsed values, codec plain-slug reads, canonical-text
  normalization, and payload extraction (`1a5dd32`); the filter accepts comma-separated terms.
- Timing probes must read each result: a loop that discards results let V8 skip work, reading native
  `randomUUID` at 23 ns. With a one-character sink like the corpus runner's, native and
  `generateUuidV4()` both cost 139 ns on Node 26.8.2 and 26 ns on Bun, so v4 text generation is
  bound by the native call. The corpus runner's sink is realistic; per-row call sites made no
  difference to `v4.string` (145 ns alone, 139–143 ns among other rows).
- Retained: byte-pair formatting makes `uuidV7StringBounds` about 6 times faster on Node, Chromium,
  and Deno and 2.5 times on Bun (bench/PERFORMANCE.md).
- UUID text parsing costs about 190 ns of the 304 ns `uuidStringToPlainSlug` call on Node. A
  one-pass decode that ORs an invalid-character flag screened at 65 ns against 141 ns on Node and
  27 against 145 ns on Bun; retained after packed replays (bench/PERFORMANCE.md).
- Retained: assigning option values instead of one conditional spread per key makes `{ at }`
  generation 1.2–1.3 times faster on Node, Chromium, and Deno and 3 on Bun, and `{ generator }`
  slug and masked generation up to 1.9 on Bun (bench/PERFORMANCE.md). `generateUuidV7({ at })`
  still costs about 290 ns on Node 26.8.2 against 130 ns without options: the keyless function reads
  its options, then passes a new object that the text generator reads again (`src/v7-keyless.ts`).
  The public generator object copies its methods with a spread, so a private unparsed entry point
  would be exposed on it (`src/v7-generator.ts`).
- Retained: Node, Bun, and Deno format UUID text through one reused `Buffer` Latin-1 read, 1.05–2.2
  times faster there; Node JITless is 1.06–2.4 times slower (bench/PERFORMANCE.md).
- Rejected: calling `crypto.randomUUID` directly instead of through the Node adapter wrapper read
  0.95 unresolved on Node 26.8.2 and 1.08 slower on Node 24.21.0.
- Single-call paths outrank batch writes into caller-owned buffers (AGENTS.md). Masked slug
  generation, encoding, and decoding are the costliest single calls: about 450, 380, and 310 ns on
  Node 26.8.2, and they have not been CPU-profiled.
- Retained: removing the discarded errors made those codec and parsed-value routes 16–30 times
  faster on Node and 1.7–2.9 times on Bun (bench/PERFORMANCE.md). Host load near 14 from unrelated
  processes widens intervals; discard replays whose intervals span the whole row.

## Tasks

- [x] Remove the discarded error from non-byte object input and codec plain-slug reads; add
      resource-gate rows proving zero errors on those successful routes.
- [x] Return canonical lowercase UUID text from `uuidToString` without reformatting.
- [x] Measure a private-field `Uuid` value against the `WeakMap` protocol; remove the redundant
      byte copy in `parseUuid`.
- [x] Packed compare each remaining change on Node and Bun, then Chromium, Deno, and JITless.
- [x] Record retained results in `bench/PERFORMANCE.md`; run `bun run check`.
- [x] Measure `extractUuidV7Payload(text)` against the timestamp route and remove avoidable work.
- [x] Retain the one-pass UUID text parser after packed replays on every runtime.
- [ ] Redo the canonical-text guard screen (regex against a character loop) with results consumed.
- [x] Find the option-object cost in `{ at }` and `{ generator }` generation calls.
- [ ] Profile `masked.generate`, `masked.encode`, and `masked.decode` on Node 26.8.2 and Bun;
      screen the candidates together, then replay the survivors on every runtime.
- [ ] Remove the second option read from keyless `generateUuidV7({ at })` without exposing a new
      method on public generators.
- [ ] Replay the value-state and payload changes on Node 24.21.0.
