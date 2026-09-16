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
  slug and masked generation up to 1.9 on Bun (bench/PERFORMANCE.md). Keyless option calls read
  their options once and draw through the module generator's internal entry point, making `{ at }`
  rows 0.40-0.88 on every runtime.
- Retained: Node, Bun, and Deno format UUID text through one reused `Buffer` Latin-1 read, 1.05–2.2
  times faster there; Node JITless is 1.06–2.4 times slower (bench/PERFORMANCE.md).
- Rejected: calling `crypto.randomUUID` directly instead of through the Node adapter wrapper read
  0.95 unresolved on Node 26.8.2 and 1.08 slower on Node 24.21.0.
- Single-call paths outrank batch writes into caller-owned buffers (AGENTS.md).
- Retained (bench/PERFORMANCE.md): the sentinel collision lookup runs only for a zero check tail
  (argument-free masked generation 0.60 on Node 26.8.2); fixed slug decoders check validity once
  (base32hex 0.77-0.92 everywhere); Node, Bun, and Deno write 16-byte slugs through one Latin-1
  read; text-to-slug parses into scratch and uses the shared writer, deleting the direct writers
  (text to base32hex 0.29 on Bun, 0.48 on Node 26.8.2); the Feistel round writes HalfSipHash out
  (masked rows 0.65-0.98). Node 26.8.2 JITless trades 1.05-1.64 slower base64url slug writing.
- After these, Node 26.8.2 CPU profiles put Feistel work at about half of masked encode and decode
  time; the frozen round count sets that floor. Node's `Buffer#toString` wrapper plus
  `latin1Slice` is about a fifth of masked byte encoding.
- A packed compare can fail while packing when Parcel crashes (SIGSEGV) in the consumer-graph
  check; rerun that replay.
- Retained (bench/PERFORMANCE.md): 27-character masked base32hex slugs use fixed formulas (encode
  0.48-0.74 except Chromium 0.94); a package generator passed as `{ generator }` draws from its
  sequence, recognized by a private-field brand (bytes 0.70-0.81, slug 0.84-0.93, creation 0.70-0.88);
  caller-built generators skip the byte copy in text and slug writers but read 1.05 slower on
  Chromium and once 1.08 on Node 24.21.0.
- Rejected: calling `Buffer#latin1Slice` directly instead of `toString("latin1")` saved only 2-7 ns
  on Node 26.8.2, Bun, and Deno through an undocumented method.

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
- [x] Profile `masked.generate`, `masked.encode`, and `masked.decode` on Node 26.8.2 and Bun;
      screen the candidates together, then replay the survivors on every runtime.
- [ ] Re-rank the primary single-call rows on Node 26.8.2 and Bun after the retained changes.
- [ ] Run `bun run check` before final delivery.
- [x] Remove the second option read from keyless `generateUuidV7({ at })` without exposing a new
      method on public generators.
- [ ] Replay the value-state and payload changes on Node 24.21.0.
