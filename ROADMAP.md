# Native parity

Complete the remaining performance work without changing identifier formats, secure entropy,
validation, ownership, or published generation guarantees. Preserve the unresolved clock guarantee;
measure clock drift without imposing a new promise. Keep remote writes unauthorized.

## Identifier integrity repairs

Restore lossless conversion, immutable UUID ownership, safe normalization, transactional writes,
typed failures, and version-aware consumer types without changing issued identifiers. Preserve the
native-parity tasks below; they continue after these repairs. Limit active implementation
to one repair group, with verification proceeding on its completed dependencies.
Keep complete routine lanes below five minutes without dropping runtime or artifact coverage;
measure lane durations, isolate timings from competing work, and retain only defect-discriminating checks.

- [ ] Evaluate the reproduced shadowed-length misuse only after the normal writer work: do not retain the shared intrinsic-length experiment without repeated normal-call speed and resource evidence across affected runtimes and tested releases. Restore the unchanged checks if the defense slows or adds resource cost to primary use. Keep supported-format correctness and ordinary invalid-input checks intact; do not expand the unusual-input corpus without a decision-relevant need.

- [x] Reproduce wrapper reentrancy and hostile tags; normalize strings intrinsically and resolve selectors before shared scratch becomes live.
- [x] Reproduce structural codec mutation, malformed bytes, retained storage and throws; isolate private UUID bytes and validate callback results with causes.
- [x] Reproduce uppercase caller-buffer decoding; accept mixed-case base32hex while retaining strict padding and atomic writes.
- [x] Normalize retained codec alphabet options and accept equivalent base32hex sentinels in both languages and migration readers.
- [x] Reject invalid generator presets before clocks, entropy and sequence changes; reject host/class constructor options while accepting cross-realm and null-prototype records.
- [x] Reject malformed offsets, clocks and migration formats without invoking caller coercion hooks.
- [x] Compile positive and negative consumers for known UUIDv4 plain slugs in every UUIDv7-only operation; repair declarations and editor help.
- [x] Preserve Rust enum identity while removing incompatible Borrow<str>; test real collections and update API reports and owning guidance.
- [x] Return fresh decoded arrays without redundant copies; instrument owned conversion allocations and preserve borrowed-input ownership.
- [x] Run regressions against their original mechanisms and isolated mutations; retain restoration copies and verify restoration byte-for-byte.
- [x] Update affected source JSDoc, README and durable contract owners; avoid parallel inventories and unrelated rewrites.
- [x] Resolve Rust API extraction prerequisites, then run complete checks and packed compiler-floor consumers.
- [x] Exercise packed browser and debug/release WebAssembly in every configured browser engine.
- [x] Run repeated packed benchmarks and profiles for affected successful calls across ranked runtimes; record results and limitations in bench/PERFORMANCE.md.
- [x] Audit the full repair diff against baseline e6ab40d47587e032446686ee7dd95a8792ec939e; verify every approved repair, comment and changed line, and commit verified groups without remote writes.

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

## Needs ruling

1. Clock guarantee. Proposed README guarantee: "Current-time UUIDv7 generation never encodes a
   timestamp ahead of the clock, unless the clock moved backwards under the preserve policy."
   If yes: add a burst test on Node and Bun. If bench-only: add a drift row, no test. If neither:
   nothing. Until ruled, write no test that imposes it (asked 2026-09-16, no answer).

## Derived doctrine (agent decisions)

- Keep `fastv7` timed but exclude it from comparable ranking because measured bursts encode
  future timestamps. Its secure entropy and random-bit count do not disqualify it.

- Same output means the same bytes or text, secure entropy, and a truthful clock. A floor or rival
  row that fails one of these stays timed but cannot close a gap.
- Screen first (one process per row, every result read, twice), then run two packed replays on all
  runtimes. A screen chooses; only replays retain.
- Physical limit vs choice: Bun `Date.now()` costs about 22 ns and is the cheapest truthful clock
  in JavaScript. A timer-cached clock is rejected: it lags during synchronous bursts.
- Tool limits: Deno cannot screen through the symlinked source (`#runtime` does not resolve), so
  replays decide Deno; the Bash tool cuts the middle of long output, so log commit-hook output.
- Phase order is WSJF: the widest default win (V8 writers), then unknown gaps before
  known Bun gaps (conversions are common default calls; Bun gaps are a few ns and may be
  irremovable), then configured and batch calls, which rank below single default calls.

## Phase 1: per-engine text and slug writers

- [x] Retain flat 27-character masked output: repeated mixed comparisons remove the earlier read loss; the resource mutation rejects two string constructions.
- [x] Keep the fixed formatter in its owner: helper-only comparisons reproduce Chromium sentinel losses; the selected writer's mixed comparisons do not.
- [x] Exercise every check tail against independent bit packing in Node and Bun; byte-position, shift and tail mutations fail the oracle, and resource counters require one string construction.
- [x] Repeat the selected writer on installed Node and Bun releases; profile selected and portable paths on Node, Bun, Deno and Chromium. Record WebKit's native-profile gap and measurement limits in bench/PERFORMANCE.md.
- [x] Include private alphabet encoders in Bun's existing memory-profile corpus; the real filtered regression fails when its argument is removed, and completes with a fresh sampling artifact when restored.
- [x] Run identical-baseline controls and formatter/slug separation on WebKit; the formatter reproduces the loss, while the selected native-hex hybrid does not in two mixed replays.
- [x] Reject the same-file helper and packed hex-pair alternatives after repeated mixed losses; repeat the surviving shape across runtime and installed-release comparisons.
- [x] Select WebKit native hex only when available; real Node Current mutation proves selection, capability-absent tests prove fallback, and repeated packed browser calls cover the selected engine.
- [x] Reject the shared native ASCII decoder: its mixed base64url and generation losses outweigh its base32hex gain.
- [x] Verify the official Node Current archive checksum and include Node 26.10.0 in final replays; label older observations by actual release.

Why: fixed character-code writers improve measured UUID conversion on Node, Chromium and Deno.
Bun retains Latin-1; WebKit retains native hex when present because the all-fixed formatter slowed
other successful calls. `bench/PERFORMANCE.md` owns repeated results and their limits.

- [x] Add fixed UUID and slug writers with per-engine selection, every supported check tail,
      independent runtime oracles and one-string resource evidence; retain generic lengths.
- [x] Compare a fixed timestamp writer with the byte-pair table in `src/v7-bounds.ts`; preserve
      inclusive endpoints, full timestamp range and both text cases without temporary byte arrays.
      Retain fixed character codes on JIT-enabled Node, Chromium and Deno; keep byte pairs on Bun
      and JITless Node through shared startup selection. Repeated packed and installed-release
      comparisons retain the gains; a real-process mutation proves JITless selection. Bounds workloads must
      read both endpoints; the resource gate rejects an object-only sink.
- [x] Run two packed seven-runtime replays of the retained writer: no successful row is slower in
      both. The predicted 0.6 ratio is not reached by every Node or Deno row; retain the measured
      improvement, without claiming the native-parity goal is closed.
- [x] Record writer results and compare Chromium default UUIDv4 text against `@lukeed/uuid`:
      two competitor runs separate the package below the rival. Other runtime gaps remain open.
- [x] Screen native `toBase64` over package bytes against the Latin-1 writer on Bun; two packed
      replays show no separated gain. Reject the added branch; keep the remaining slug gap open.
- [ ] Close Bun's UUIDv4 slug gap against native encoding over Web Crypto bytes; isolate entropy
      copying from encoding before selecting another candidate.
- [ ] Uppercase: screen the uppercase table against lowercase output plus `toUpperCase()` on Node
      and Bun; keep the faster per engine.
- [x] Select native UUIDv4 text for JITless Node once at startup; prove CLI and `NODE_OPTIONS`
      precedence through compiled child processes and repeat default and uppercase calls across
      installed releases. Keep pooled formatting with the JIT.
- [ ] Close the remaining JITless UUIDv4 wrapper gap against Node's fastest native `randomUUID`;
      the Web Crypto reference is not that floor. Preserve native failure fallback and preset
      validation; retain only cuts that reproduce without slowing higher-ranked runtime calls.

## Phase 2: instrument every call family

- [x] Report sample means, sample standard deviations and standard errors beside paired medians;
      reject a population-variance mutation and run an identical-revision control. Label existing
      competitor intervals as within-process screens.
- [x] Isolate each browser comparison observation in a fresh process; identical-revision
      controls complete in Chromium, Firefox and WebKit without a resolved timing difference.
- [x] Add a separate opt-in call-timing pass with raw acquisition order, timer controls and
      empirical p50/p99. Reject an omitted call-window mutation; label clock-censored p99.
- [x] Extend the existing competitor driver with fresh-process sampling; retain raw batches,
      count one median per process, and reject a flattened-batch mutation. Exercise both Node
      releases, Bun, Deno and Chromium; keep unlike statistical units unresolved.
- [x] Complete throughput and latency statistics: use fresh processes as independent comparison units,
      preserve raw samples and outliers, report sample counts and uncertainty, and measure timer
      overhead before individual-call latency. Never label batch-average percentiles as call p99.
      Prove the report cannot turn correlated batches into independent-run confidence.

Why: conversions, parses, guards, and extraction have no native or competitor rows, so their parity
is unknown; Phase 5 needs them. Masked calls have no native or competitor equivalent: the frozen
Feistel rounds (about half their time) set their floor.

- [x] Add Node Current to `bench:results` beside the pinned LTS. Done when tracked reports carry a
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
- [x] Replace `fastv7`'s rejection reason with its clock drift (47–88 ms ahead after 2M calls):
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
