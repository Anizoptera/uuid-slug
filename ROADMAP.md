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
- Rejected: a character loop for the canonical lowercase UUID text guard took 135 ns on Node 26.8.2
  and 64 ns on Bun against 72 and 24 ns for the current regular expression, results consumed.
- Re-ranked single calls, Node 26.8.2 then Bun: masked generation with a generator 355 and 193 ns,
  masked encode 286 and 185, `codec.uuidToString(plain slug)` 284 and 187, masked decode 235 and
  168, `{ at }` text 189 and 92, plain slug generation 165 and 95; masked costs sit on the frozen
  Feistel floor and plain reads try the masked decode first.

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
- [x] Redo the canonical-text guard screen (regex against a character loop) with results consumed.
- [x] Find the option-object cost in `{ at }` and `{ generator }` generation calls.
- [x] Profile `masked.generate`, `masked.encode`, and `masked.decode` on Node 26.8.2 and Bun;
      screen the candidates together, then replay the survivors on every runtime.
- [x] Re-rank the primary single-call rows on Node 26.8.2 and Bun after the retained changes.
- [x] Run `bun run check` before final delivery.
- [x] Remove the second option read from keyless `generateUuidV7({ at })` without exposing a new
      method on public generators.
- [x] Replay the value-state and payload changes on Node 24.21.0.

## Native parity

Target (AGENTS.md ruling): default calls match the fastest native path producing the same output
and beat qualified competitors on every ranked runtime; configured calls beat competitors and exceed
a native floor only by work it lacks. Each hypothesis names its mechanism, the contract it could
break, and the result that kills it. Keep only changes that reproduce in packed replays.

Status from the 2026-09-16 floors and reports, ns package / floor or rival:

- Missed default: Bun UUIDv4 text 31–36 / 27–32; Bun UUIDv4 slug 53–54 / 50–52; Bun UUIDv7 text
  75–82 / 39–45 and slug 77–82 / 54–58 (native drifts ahead of the clock); Bun UUIDv7 new bytes
  44.9 / `uuid` 40.6; Chromium UUIDv4 text 147 / `@lukeed/uuid` 118.
- Missed configured: Bun UUIDv7 caller bytes 43.5 / `uuid` 37.0; Bun UUIDv4 caller bytes 27.9 /
  `uuid` 26.1 (native floor 17.5).
- Unmeasured: every conversion, parse, guard and extraction call against native primitives; every
  configured generation call against competitor options; Node Current in the tracked reports.

### Instrument first

- [ ] Add Node Current to `bench:results` beside the pinned LTS, so the first-ranked runtime has
      tracked rows instead of scratch probes.
- [ ] Add native floor rows for conversions on every runtime where the primitive exists:
      `plainSlugToUuidBytes` against `Uint8Array.fromBase64(slug, { alphabet: "base64url",
      lastChunkHandling: "strict" })` plus a length check; `uuidBytesToPlainSlug` against
      `toBase64({ alphabet: "base64url", omitPadding: true })`; `uuidStringToBytes` against
      `Uint8Array.fromHex` and `Buffer.from(hex, "hex")` over dehyphenated text; `bytesToUuidString`
      against `toHex` or `Buffer` hex plus hyphens; `uuidStringToPlainSlug` and
      `plainSlugToUuidString` against those pairs; `isUuidString` against a canonical regex;
      `extractUuidV7UnixMs(text)` against `parseInt` over the 12 timestamp digits.
- [ ] Add competitor rows for conversions (`uuid` `parse`, `stringify`, `validate`) and census UUID
      slug packages (search the registry for base64url UUID encoders such as `slugid` and
      `short-uuid`); rank only those producing the same 128-bit lossless form.
- [ ] Add configured-call competitor rows: `uuid.v7({ msecs })` against `{ at }`, stateful
      generator objects against `createUuidV7Generator`, and caller-buffer rows already present.
- [ ] Make the generated report print package / floor and package / best rival per call and
      runtime with a parity verdict, so this status list is produced instead of copied.
- [ ] Replace `fastv7`'s rejection reason with its measured clock drift (47–88 ms ahead after a
      2M-call burst); `@kripod/uuidv7` shares its 62-random-bit layout unrejected, so the bit count
      cannot be the disqualifier. Add the burst drift probe as a bench row whatever the guarantee
      ruling decides.
- [ ] Maintainer ruling: make "current-time UUIDv7 generation never encodes a timestamp ahead of the
      clock unless the clock moved backwards under the preserve policy" a README guarantee with a
      burst test on Node and Bun, a bench-only row, or neither. Asked 2026-09-16 without an answer;
      the test stays unwritten until ruled.

### Generation hypotheses

- [x] UUIDv4 slugs encode from the shared scratch draw: 0.79–0.91 on Node, Chromium, and Bun and
      0.41–0.46 on Deno; Bun and Deno fallback text 3–10% slower (bench/PERFORMANCE.md).
- [x] Keyless UUIDv7 slugs and pairs draw into the text scratch: slugs 0.89 on Node 26.8.2, 0.90
      on Chromium, 0.56 on Deno, unresolved on Bun (bench/PERFORMANCE.md).
- [x] Primitive UUIDv7 slug presets skip option reads: 0.85–0.94 on Node, Chromium, JITless, and
      Deno; Bun unresolved in one of two replays (bench/PERFORMANCE.md).
- [ ] Add a keyless `generateUuidV7WithPlainSlug()` row to the compare corpus; only the
      selected-generator pair is measured.

- [ ] UUIDv7 draw on Bun (about 42 ns against 22 ns for UUIDv4 bytes): ablate the reentrancy
      `try`, `readClock` wrapper, per-call clock validation for the built-in `Date.now`, rollback
      checks the module generator never enables, the four-byte `randomTail` intermediate copy, and
      rewriting unchanged timestamp bytes within one millisecond. Candidate: a module-level
      generator specialized for `Date.now` without rollback or fraction options. Breaks
      reentrancy, clock-failure, or sequence-exhaustion tests; mutate each removed guard. Not the
      entropy source: Bun Web Crypto and `node:crypto` cost the same per byte on an 8 KiB pool, and
      a 256-byte pool costs more.
- [ ] Caller-buffer bytes (Bun UUIDv4 27.9 / 17.5, UUIDv7 43.5 / `uuid` 37.0): copy from the pool
      straight into the caller range after the refill succeeds, removing the private copy. Breaks
      atomicity only if a refill can fail after caller bytes change; prove with the transactional
      buffer tests and entropy-failure injection.
- [ ] Bun UUIDv4 text (4–7 ns over native): ablate the default parameter plus `isUuidTextCase`
      check, the trusted-identity comparison, and the `try` separately; try an argument-count fast
      path. Import-time validation is rejected: it draws entropy before a heap snapshot.
- [ ] Bun UUIDv4 slug (2–4 ns over `toBase64` on Web Crypto bytes): compare the Latin-1 slug writer
      with native `toBase64` over pooled bytes, results consumed.
- [ ] Node JITless: portable UUIDv4 text costs 1,323–1,329 ns against 454–455 ns for native
      `randomUUID` on Node 26.8.2. Evaluate one flag probe (`--jitless` in `process.execArgv` or
      `NODE_OPTIONS`) applied to every Node selection that loses without the JIT, not to this call alone.
- [ ] Node UUIDv7 slug 137 ns costs more than UUIDv7 text 108 ns although it writes 22 characters
      instead of 36: profile the slug writer against native `toBase64` and `Buffer` base64url.
- [ ] New 16-byte arrays: Deno UUIDv4 bytes cost 159 ns against 37 ns into a caller buffer, Node
      47–51 against 34–38. Compare `new Uint8Array(16)`, `pool.slice`, and
      `new Uint8Array(new ArrayBuffer(16))` per runtime. Views onto a shared slab are rejected:
      their `.buffer` exposes other issued IDs.
- [ ] Chromium UUIDv4 text 147 / `@lukeed/uuid` 118 and UUIDv7 slug 177 against text 137: format
      directly from the pool without the private copy, and compare byte-pair concatenation with
      `toHex` plus hyphens under a consuming sink.
- [ ] Deno slugs (UUIDv4 207 ns, UUIDv7 251 ns against 32 and 116 ns text): check which writer
      Deno selects and measure native `toBase64`.
- [ ] Uppercase text on every writer: compare the uppercase formatter with lowercase output plus
      `toUpperCase()`; UUIDv4 native text already uses the latter.
- [ ] `generateUuidV7WithPlainSlug` and `generateUuidV7Value`: measure against separate text, slug,
      and byte calls; each must cost less than the calls a consumer would otherwise combine.
- [ ] `{ at }` and `{ generator }` calls (Node 189 ns text with `at`, Bun 92): compare with
      `uuid.v7({ msecs })` and the stateful generator competitors once their rows exist.

### Conversion hypotheses (after floor rows exist)

- [ ] Plain base64url slug to bytes and back: adopt native `fromBase64` or `toBase64` wherever it
      beats the package decoder with length, padding, and trailing-bit checks kept.
- [ ] UUID text to bytes and back: adopt `fromHex`, `toHex`, or `Buffer` hex wherever they beat the
      one-pass parser and Latin-1 formatter with hyphen positions and mixed case still accepted.
- [ ] Guards and timestamp extraction: close the `uuidv7-js` text extraction gap (1.12–1.32 on
      Node, Bun, and Deno); find its mechanism before copying it.

### Closed

- [x] Inventory native UUID and random APIs, pair generation calls with floors in a per-runtime
      corpus, and measure twice on every runtime.
- [x] Reject Bun native UUIDv7 text and slugs as published values: counter overflow encodes
      timestamps ahead of the clock. Keep validated-once UUIDv4 trust.
- [x] Patch Bun native UUIDv7 output with the package clock: correct, but text cost 91–94 ns and
      slugs 103–106 ns against 70–73 and 66–71 ns for the package generator on Bun 1.4.2, because
      slicing and concatenating the native string costs more than the native call saves.
- [x] Portable UUIDv4 text formats from module scratch instead of new owned bytes, and Node uses it
      instead of `crypto.randomUUID`: 87–88 against 134–135 ns on Node 26.8.2, 76–77 against
      112–115 on Node 24.21.0 in scratch screens; packed replays 0.63–0.71 on both Node releases and
      0.75–0.80 on Chromium, JITless 2.56 slower (bench/PERFORMANCE.md).
- [x] Split the Bun UUIDv7 text cost: about 42 ns draw and 37 ns Latin-1 formatting; `toHex`,
      `Buffer` `hexSlice`, and byte-table concatenation cost 86–94 ns on Bun.
