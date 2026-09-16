# Native parity

## Maintainer rulings (agents never change these; attack them only by asking)

- Goal, 2026-09-16 (AGENTS.md): every default call (no arguments, or only a text-case or alphabet
  preset) costs no more than the fastest native path with the same output on every ranked runtime,
  and beats every qualified competitor. Configured calls may exceed native only by work native
  lacks, and still beat every competitor. Combine native, patched native, pooled entropy, and
  portable work per runtime; never one path everywhere. A native path that breaks a contract is not
  adopted, but its cost stays the target. Every call family needs a floor row. A gap closes only by
  a change or by a cause in `bench/PERFORMANCE.md` that no implementation can remove.
- Scope: successful calls in real use only; single-call paths before caller-buffer batches.
  Runtime rank: Node Current and Bun, then Node LTS and Chromium, then Deno, then Node JITless.
- Correctness first: map contracts, add falsifiers, and mutate before timing. Keep a change only
  when two packed replays reproduce it. Wire formats and README §Guarantees stay fixed.
- `fastv7` is not a proper competitor. Its entropy is secure (`crypto.getRandomValues`); its
  defects are 62 random bits and timestamps ahead of the clock.

## Needs ruling

1. Clock guarantee. Proposed README guarantee: "Current-time UUIDv7 generation never encodes a
   timestamp ahead of the clock, unless the clock moved backwards under the preserve policy."
   If yes: add a burst test on Node and Bun. If bench-only: add a drift row, no test. If neither:
   nothing. Until ruled, write no test that imposes it (asked 2026-09-16, no answer).

## Derived doctrine (agent decisions)

- Same output means the same bytes or text, secure entropy, and a truthful clock. A floor or rival
  row that fails one of these stays timed but cannot close a gap.
- Screen first (one process per row, every result read, twice), then run two packed replays on all
  runtimes. A screen chooses; only replays retain.
- Physical limit vs choice: Bun `Date.now()` costs about 22 ns and is the cheapest truthful clock
  in JavaScript. A timer-cached clock is rejected: it lags during synchronous bursts.
- Tool limits: Deno cannot screen through the symlinked source (`#runtime` does not resolve), so
  replays decide Deno; the Bash tool cuts the middle of long output, so log commit-hook output.
- Phase order is WSJF: a cheap proof, the widest default win (V8 writers), then unknown gaps before
  known Bun gaps (conversions are common default calls; Bun gaps are a few ns and may be
  irremovable), then configured and batch calls, which rank below single default calls.

## Phase 0: prove the delivered state

- [ ] Run `bun run check > log 2>&1`. Done when it exits 0; fix every failure it names first.

## Phase 1: per-engine text and slug writers

Why: V8 formats fastest with one fixed-argument `String.fromCharCode` call over byte-to-code tables.
It returns one flat string, as the Latin-1 read does. Screens, ns per call, current → candidate,
results read, two runs each: UUID text Node 26 60 → 29, Node 24 49 → 31, JITless 775 → 433, Bun
33 → 40; base64url slug Node 26 54 → 22, Node 24 42 → 23, JITless 612 → 332, Bun 28 → 31. An
earlier, not repeated screen favoured it on Chromium and WebKit; Firefox slugs lost a few ns
(unranked). Base32hex and Deno are unscreened. Bun keeps its Latin-1 `Buffer` read. Rejected on V8:
the Latin-1 read, `toHex` plus hyphens, byte-pair strings.

- [ ] Add `fromCharCode` writers for 16-byte input: UUID text in both cases, base64url with a 0- or
      4-bit tail, base32hex with a 0-, 2-, or 4-bit tail (27 characters for 4). Select them wherever
      `runtime.latin1Scratch` is absent. Remove `latin1Scratch` from `src/runtime/node.ts` and from
      Deno in `src/runtime/portable.ts`. For 16 bytes, they replace the `toHex`, native `toBase64`,
      byte-pair, and concatenation branches in `src/uuid.ts` and `src/alphabet.ts`, and the byte-pair
      timestamp table in `src/v7-bounds.ts`; other lengths keep the generic accumulator. Rewrite each
      changed frame's comment: why, rejected alternative, recheck trigger.
- [ ] Before timing: prove output equals the generic accumulator over random bytes for every case
      and tail width in Vitest (new writer) and Bun tests (Latin-1). Plant one wrong table entry, shift,
      and tail mask in turn; each plant must fail a test. Update `bench/resources.ts` expectations.
- [ ] Run two packed replays on all runtimes with
      `UUID_SLUG_PROFILE_FILTER=string,String,slug,base32,encode,bounds`. Predict ≤ 0.6 on Node,
      Chromium, and Deno text and slug rows, Bun unresolved, JITless faster. Reject the change if any
      ranked-runtime row is slower in both.
- [ ] Record the result in `bench/PERFORMANCE.md` (§UUID text formatting, §Latin-1 slug writing).
      Done when Chromium UUIDv4 text is measured against `@lukeed/uuid` (147 / 118 before); if it
      still trails, screen formatting from the pool without the private copy.
- [ ] Bun slug gap (53–54 against 50–52 ns for `toBase64` over Web Crypto bytes): screen native
      `toBase64` over pooled bytes against the Latin-1 writer; adopt only if two replays agree.
- [ ] Uppercase: screen the uppercase table against lowercase output plus `toUpperCase()` on Node
      and Bun; keep the faster per engine.
- [ ] JITless: re-measure UUIDv4 text against native `randomUUID` (1,323–1,329 against 454–455 ns
      before). If it still loses, screen one probe (`--jitless` in `process.execArgv` or
      `NODE_OPTIONS`) that selects native paths for every Node selection that loses without the JIT.

## Phase 2: instrument every call family

Why: conversions, parses, guards, and extraction have no native or competitor rows, so their parity
is unknown; Phase 5 needs them. Masked calls have no native or competitor equivalent: the frozen
Feistel rounds (about half their time) set their floor.

- [ ] Add Node Current to `bench:results` beside the pinned LTS. Done when tracked reports carry a
      Node Current column, so the first-ranked runtime needs no scratch probes.
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
- [ ] Make the generated report print package / floor and package / best rival per call and
      runtime with a parity verdict. Done when gap numbers come from the report, not hand copies.
- [ ] Replace `fastv7`'s rejection reason with its clock drift (47–88 ms ahead after 2M calls):
      `@kripod/uuidv7` has the same 62 random bits and is not rejected, so bits cannot disqualify.
      Add the burst drift probe as a bench row, whatever the clock ruling decides.

## Phase 3: default generation gaps

Why: default generation misses parity, ns package / target. Bun: UUIDv4 text 31–36 / 27–32 native; UUIDv7 text
75–82 / 39–45 and slug 77–82 / 54–58 native; UUIDv7 new bytes 44.9 / `uuid` 40.6. UUIDv7 text is
about 42 ns draw plus 37 ns Latin-1 formatting. The UUIDv7 target is native, but native drifts:
rejected (§Native floors) are `Bun.randomUUIDv7` (567–576 ms ahead after 2M calls), the same with a
`Date.now()` argument (51 ns, up to 8 ms ahead), and patching its text (91–94 ns). A truthful
floor is clock (22 ns) plus entropy plus formatting, so UUIDv7 parity may be impossible.

- [ ] UUIDv7 draw (about 42 ns against 22 ns for UUIDv4 bytes): ablate the reentrancy
      `try`, `readClock` wrapper, per-call clock validation for the built-in `Date.now`, rollback
      checks the module generator never enables, the four-byte `randomTail` intermediate copy, and
      rewriting unchanged timestamp bytes within one millisecond. Candidate: a module-level
      generator specialized for `Date.now` without rollback or fraction options. Breaks
      reentrancy, clock-failure, or sequence-exhaustion tests; mutate each removed guard. Not the
      entropy source: Bun Web Crypto and `node:crypto` cost the same per byte on an 8 KiB pool, and
      a 256-byte pool costs more. Done when two replays retain a cut, including UUIDv7 new bytes
      against `uuid`, or §Native floors records the cost that remains and why.
- [ ] Bun UUIDv4 text: ablate the default parameter plus `isUuidTextCase` check and the
      trusted-identity comparison separately; try an argument-count fast path. Rejected: removing
      the `try` (saves 1 ns, breaks native-failure fallback) and import-time validation (draws
      entropy before a heap snapshot).
- [ ] New 16-byte arrays: Deno UUIDv4 bytes cost 159 ns against 37 ns into a caller buffer, Node
      47–51 against 34–38. Compare `new Uint8Array(16)`, `pool.slice`, and
      `new Uint8Array(new ArrayBuffer(16))` per runtime; keep the fastest after two replays. Views
      onto a shared slab are rejected: their `.buffer` exposes other issued IDs.

## Phase 4: configured calls

Why: a configured call may cost more than native only by work native lacks, and must beat every
competitor. Caller buffers miss that, ns package / `uuid`: Bun UUIDv4 27.9 / 26.1 (native fill
17.5), UUIDv7 43.5 / 37.0. Other configured calls have no competitor rows.

- [ ] Add competitor rows: `uuid.v7({ msecs })` against `{ at }` (text: Node 189 ns, Bun 92), and
      stateful generator packages against `createUuidV7Generator` and `{ generator }`. Add a keyless
      `generateUuidV7WithPlainSlug()` row; only the selected-generator pair is measured. Done when
      each call has a verdict against its best rival.
- [ ] Pairs and values: `generateUuidV7WithPlainSlug` and `generateUuidV7Value` must cost less than
      the separate text, slug, and byte calls a consumer would combine; measure and fix any loss.
- [ ] Caller buffers: copy from the pool straight into the caller range after the refill succeeds,
      removing the private copy; this changes every adapter's `fillRandom`. Caller bytes must stay
      unchanged when entropy fails: prove with the transactional buffer tests and entropy-failure
      injection. Then replace §Native floors' "try it if caller-buffer output becomes primary".

## Phase 5: conversions (needs Phase 2 rows)

- [ ] Plain base64url slug to bytes and back: adopt native `fromBase64` or `toBase64` wherever it
      beats the package decoder with length, padding, and trailing-bit checks kept.
- [ ] UUID text to bytes and back: adopt `fromHex`, `toHex`, or `Buffer` hex wherever they beat the
      one-pass parser and package formatter with hyphen positions and mixed case still accepted.
- [ ] Guards and timestamp extraction: close the `uuidv7-js` text extraction gap (1.12–1.32 on
      Node, Bun, and Deno); find its mechanism before copying it.

## Phase 6: deliver (after every source change)

- [ ] Run `bun run bench:results`; update the Node cells of the §Native floors table, which
      predate pooled UUIDv4 text on Node.
- [ ] Update README direction words (leads, trails, unresolved; no numbers) only where the
      refreshed reports reproduce the change.
- [ ] Run `bun run check > log 2>&1`; done when it exits 0 and the parity report shows no gap
      without a task here or a recorded cause.

## Proposals outside this plan

- `check:fast` could print failed-step lines last, so truncated hook output still names the failure.
