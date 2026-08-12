// SPDX-License-Identifier: Apache-2.0

/**
 * Measures what every UUIDv7 implementation does with randomness, so a choice between them
 * rests on observation rather than on each package's description of itself.
 *
 * REPORTS, never gates. The subjects are third-party libraries whose behaviour changes only
 * when a version is bumped here, so running this on every check would spend time re-deriving a
 * constant, and failing this repository's lane for a property of somebody else's package helps
 * nobody. THIS package's guarantees are gated in `test/entropy.test.ts` and
 * `test/runtime.bun.test.ts`, deterministically and in milliseconds.
 *
 * Three measures, no thresholds and no statistics. An earlier version of this file reached for
 * a monobit test, found it blind to half of a counter, bolted a lag-1 flip rate on top and
 * documented the period-four bit that still evaded both — three layers to answer a question
 * with an exact answer. Measured 2026-08-11, that stack reported 11, 31 and 41 structured bits
 * where the direct measurement below reports 12, 32 and 42: wrong, on every candidate, in the
 * direction that flatters. When a property can be measured exactly, estimating it is a bug.
 *
 * - `distinct` counts different random fields. This is the catastrophic-failure detector, and
 *   the reason it is worth its line: a generator with a constant seed, a small pool of
 *   pre-drawn values, or a weak LCG shows up instantly and unmistakably. Measured over 200,000
 *   samples: a constant seed yields 1 distinct value, a pool of 1,000 yields 1,000, a textbook
 *   LCG yields 5,596. Nothing else here catches a generator that repeats itself while every
 *   individual value still looks fine.
 * - `counter` is the width, in bits, of a leading counter that advances by exactly one within a
 *   millisecond, printed with the share of consecutive pairs that actually obey it. Both halves
 *   are needed and neither is a threshold. At ~100% those bits are fully determined by the
 *   previous value, so 74 minus the width is what an attacker cannot guess. Well below that, the
 *   width means something else entirely: `uuidv7-js` reports 42 bits at 50%, which is RFC 9562
 *   §6.2 Method 3 — a monotonic counter advanced by a RANDOM increment rather than by one, so
 *   those 42 bits are partly determined and partly not. A single derived "unguessable bits"
 *   column would have to print a confident number for that row, and every number it could print
 *   is wrong, which is why the reader gets the two measured quantities instead. A counter is a
 *   sanctioned design and a fact about unguessability, not a defect.
 * - `P(1)` is the narrowest and widest share of ones across the 74 random bit positions. A
 *   stuck or heavily skewed bit is visible immediately without a significance threshold; a
 *   healthy generator sits at 0.50 on both ends.
 *
 * What this does NOT do: judge subtle statistical quality. A generator that passes all three
 * and is still weak needs a real battery (PractRand, dieharder), which is a different tool.
 * `instrument.ts` covers the one case no output inspection ever can — a library calling
 * `Math.random`, whose values are indistinguishable from a CSPRNG's by any test here.
 */
import { candidates, type BenchCandidate } from "./candidates";
import { instrument } from "../test/instrument";

const smoke = process.argv.includes("--smoke");
const samples = Number(process.env.UUID_SLUG_ENTROPY_SAMPLES ?? (smoke ? 20_000 : 200_000));

/** Widest counter this scans for: the whole random field. */
const FIELD_BITS = 74n;

/** The 74 bits RFC 9562 declares random — `rand_a` (12) then `rand_b` (62) — as one integer. */
const randomField = (uuid: string): bigint => {
  const value = BigInt(`0x${uuid.replaceAll("-", "")}`);
  return (((value >> 64n) & 0xfffn) << 62n) | (value & ((1n << 62n) - 1n));
};

const timestamp = (uuid: string) => uuid.replaceAll("-", "").slice(0, 12);

interface Report {
  candidate: string;
  samples: number;
  sources: string[];
  distinctFields: number;
  conformingValues: number;
  /** Same-millisecond pairs that strictly increase, over the same-millisecond pairs seen. */
  orderedWithinTick: number;
  sameTickPairs: number;
  counterBits: number;
  counterHolds: number;
  minOnesRatio: number;
  maxOnesRatio: number;
}

function audit(candidate: BenchCandidate, sources: ReturnType<typeof instrument>): Report | null {
  if (!candidate.uuidV7) return null;

  sources.reset();
  const values: string[] = [];
  for (let i = 0; i < samples; i += 1) values.push(candidate.uuidV7());
  const used = sources.used();

  const fields = values.map(randomField);
  const distinctFields = new Set(fields).size;

  let conformingValues = 0;
  const ones = Array.from<number>({ length: 74 }).fill(0);
  for (let i = 0; i < samples; i += 1) {
    const hex = (values[i] ?? "").replaceAll("-", "");
    if (hex[12] === "7" && "89ab".includes(hex[16] ?? "")) conformingValues += 1;
    const field = fields[i] ?? 0n;
    for (let b = 0; b < 74; b += 1)
      ones[b] = (ones[b] ?? 0) + Number((field >> BigInt(73 - b)) & 1n);
  }

  // Same-millisecond pairs only: across a millisecond boundary every implementation reseeds, so a
  // pair spanning one says nothing about whether a counter is running inside a tick.
  //
  // ORDERING IS COUNTED HERE, over the same pairs, for the same reason. Counting every consecutive
  // pair instead — which this did — mixes in the cross-millisecond ones, and those order by their
  // timestamp prefix whatever the generator does below it, so the figure rose with the draw rate
  // and reported the clock rather than the generator. Strict `>` rather than `>=`: two equal
  // canonical forms are one value seen twice, which a database index does not order and
  // `distinctFields` already reports.
  const pairs: [bigint, bigint][] = [];
  let orderedWithinTick = 0;
  for (let i = 1; i < samples; i += 1) {
    if (timestamp(values[i] ?? "") !== timestamp(values[i - 1] ?? "")) continue;
    pairs.push([fields[i - 1] ?? 0n, fields[i] ?? 0n]);
    // Lexicographic order over the canonical form is the order a database index imposes.
    if ((values[i] ?? "").replaceAll("-", "") > (values[i - 1] ?? "").replaceAll("-", ""))
      orderedWithinTick += 1;
  }

  // The width whose leading slice advances by exactly one most often, with the share of pairs that
  // obey it reported beside it instead of thresholded. Two properties of this scan are worth
  // stating because both were got wrong first. The +1 property does NOT grow with width: it peaks
  // AT the counter's true width and fails on either side, since a narrower slice holds only the
  // counter's high bits (which do not step by one) and a wider one drags in random bits. And
  // unanimity is the wrong bar: a 12-bit counter holds 4096 values per millisecond, so a fast
  // generator exhausts and wraps inside one tick, and a single wrap among 200,000 pairs erased the
  // whole measurement. A share near 1 means a counter of that width; the low shares an
  // unstructured field yields are printed too, so no rule in this file decides which is which.
  let counterBits = 0;
  let counterHolds = 0;
  if (pairs.length > 100)
    for (let width = 1n; width <= FIELD_BITS; width += 1n) {
      const shift = FIELD_BITS - width;
      let held = 0;
      for (const [before, after] of pairs) if (after >> shift === (before >> shift) + 1n) held += 1;
      const share = held / pairs.length;
      // `>=` resolves a tie to the WIDER slice. Ties are not expected — beside a real counter the
      // neighbouring widths collapse to chance — so this only fixes the degenerate case where no
      // width beats another and the answer should be the whole field rather than its first bit.
      if (share >= counterHolds) {
        counterHolds = share;
        counterBits = Number(width);
      }
    }

  const ratios = ones.map((count) => count / samples);
  return {
    candidate: candidate.name,
    samples,
    sources: used,
    distinctFields,
    conformingValues,
    orderedWithinTick,
    sameTickPairs: pairs.length,
    counterBits,
    counterHolds: Number(counterHolds.toFixed(4)),
    minOnesRatio: Number(Math.min(...ratios).toFixed(3)),
    maxOnesRatio: Number(Math.max(...ratios).toFixed(3)),
  };
}

const sources = instrument();
const reports = candidates.map((candidate) => audit(candidate, sources)).filter((r) => r !== null);
sources.restore();

for (const report of reports) console.log(JSON.stringify(report));

if (sources.unavailable.length > 0)
  console.error(`not instrumentable in this runtime: ${sources.unavailable.join(", ")}`);

const percent = (part: number, whole: number) => `${((part / whole) * 100).toFixed(1)}%`;
console.error(
  `\n${"candidate".padEnd(16)}${"entropy source".padEnd(25)}${"distinct".padStart(9)}${"v7".padStart(7)}${"in-tick".padStart(8)}${"counter".padStart(16)}${"P(1) range".padStart(15)}`,
);
for (const r of reports)
  console.error(
    r.candidate.padEnd(16) +
      // "unobserved" states only what was seen: a native generator drawing below JavaScript and
      // a reference captured at import are both unmeasured, and neither is a finding.
      (r.sources.length > 0 ? r.sources.join(",") : "unobserved").slice(0, 24).padEnd(25) +
      String(r.distinctFields).padStart(9) +
      percent(r.conformingValues, r.samples).padStart(7) +
      (r.sameTickPairs === 0 ? "n/a" : percent(r.orderedWithinTick, r.sameTickPairs)).padStart(8) +
      `${r.counterBits}b @ ${(r.counterHolds * 100).toFixed(2)}%`.padStart(16) +
      `${r.minOnesRatio}-${r.maxOnesRatio}`.padStart(15),
  );
