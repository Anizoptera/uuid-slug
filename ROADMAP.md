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
- `uuidToString(canonical text)` parses and reformats: 228 ns against 143 ns for parsing alone on
  Node; already-normalized input is not on the least-work path.
- `parseUuid` and `generateUuidV7Value` add 100–230 ns per value over the byte routes: `WeakMap`
  state, spread, freeze, and a copy of already-owned decoded bytes (`src/uuid-value.ts`).
- `extractUuidV7Payload(text)` costs 412–508 ns against 104–125 ns for the timestamp.
- The profile corpus now has rows for parsed values, codec plain-slug reads, canonical-text
  normalization, and payload extraction (`1a5dd32`); the filter accepts comma-separated terms.
- Retained: removing the discarded errors made those codec and parsed-value routes 16–30 times
  faster on Node and 1.7–2.9 times on Bun (bench/PERFORMANCE.md). Host load near 14 from unrelated
  processes widens intervals; discard replays whose intervals span the whole row.

## Tasks

- [x] Remove the discarded error from non-byte object input and codec plain-slug reads; add
      resource-gate rows proving zero errors on those successful routes.
- [ ] Return canonical lowercase UUID text from `uuidToString` without reformatting.
- [ ] Measure a private-field `Uuid` value against the `WeakMap` protocol; remove the redundant
      byte copy in `parseUuid`.
- [ ] Packed compare each remaining change on Node and Bun, then Chromium, Deno, and JITless.
- [ ] Record retained results in `bench/PERFORMANCE.md`; run `bun run check`.
