// SPDX-License-Identifier: Apache-2.0

/**
 * Report observed randomness behavior without treating sample statistics as security guarantees.
 * Distinct fields expose repetition within this sample; leading increments characterize
 * counters; per-bit frequencies expose skew. None proves unpredictability. Native entropy
 * sources and references captured before instrumentation can remain unobserved.
 *
 * Ordering is measured only between consecutive values sharing a timestamp. Counter width
 * is reported with its observed agreement rate, never translated into unguessable bits.
 * Package correctness gates live in test/; this report also includes third-party candidates.
 */
import { candidates, runtimeName, type BenchCandidate } from "./candidates";
import { instrument } from "../test/instrument";

const smoke = process.argv.includes("--smoke");
const samples = Number(process.env.UUID_SLUG_ENTROPY_SAMPLES ?? (smoke ? 20_000 : 200_000));
if (!Number.isSafeInteger(samples) || samples <= 0)
  throw new Error("UUID_SLUG_ENTROPY_SAMPLES must be a positive safe integer");

/** Widest counter this scans for: the whole random field. */
const FIELD_BITS = 74n;

/** The 74 bits RFC 9562 declares random — `rand_a` (12) then `rand_b` (62) — as one integer. */
const randomField = (hex: string): bigint => {
  const value = BigInt(`0x${hex}`);
  return (((value >> 64n) & 0xfffn) << 62n) | (value & ((1n << 62n) - 1n));
};

const timestamp = (hex: string) => hex.slice(0, 12);

interface Report {
  candidate: string;
  /**
   * The engine's own name, as IT reported it. Without this field `bench/matrix.ts` falls back to
   * the label it guessed from the executable path, so two Node versions both printed
   * `## Randomness — node` — in the one section where they differ most, since a native v7 that
   * exists on only one of them changes the row completely.
   */
  runtime: string;
  samples: number;
  sources: string[];
  distinctFields: number;
  conformingValues: number;
  /** Same-millisecond pairs that strictly increase, over the same-millisecond pairs seen. */
  orderedWithinTick: number;
  sameTickPairs: number;
  /**
   * Most values drawn inside a single millisecond. It is what decides whether a counter can wrap:
   * a 12-bit counter holds 4096 per tick, so this figure crossing that is the measured explanation
   * for the fraction of pairs out of order, rather than an inferred one.
   */
  peakDrawsPerTick: number;
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
  // Normalize after sampling so reporting work cannot change the observed draw rate.
  for (let i = 0; i < values.length; i++) values[i] = (values[i] as string).replaceAll("-", "");

  const fields = values.map(randomField);
  const distinctFields = new Set(fields).size;

  let conformingValues = 0;
  let peakDrawsPerTick = 0;
  const drawsPerTick = new Map<string, number>();
  const ones = Array.from<number>({ length: 74 }).fill(0);
  for (let i = 0; i < samples; i += 1) {
    const hex = values[i] ?? "";
    const tick = timestamp(hex);
    const count = (drawsPerTick.get(tick) ?? 0) + 1;
    drawsPerTick.set(tick, count);
    peakDrawsPerTick = Math.max(peakDrawsPerTick, count);
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
    if ((values[i] ?? "") > (values[i - 1] ?? "")) orderedWithinTick += 1;
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
    runtime: runtimeName,
    samples,
    sources: used,
    distinctFields,
    conformingValues,
    orderedWithinTick,
    sameTickPairs: pairs.length,
    peakDrawsPerTick,
    counterBits,
    counterHolds: Number(counterHolds.toFixed(4)),
    minOnesRatio: Number(Math.min(...ratios).toFixed(3)),
    maxOnesRatio: Number(Math.max(...ratios).toFixed(3)),
  };
}

const sources = instrument();
let reports: Report[];
try {
  reports = candidates.map((candidate) => audit(candidate, sources)).filter((r) => r !== null);
} finally {
  sources.restore();
}

for (const report of reports) console.log(JSON.stringify(report));

if (sources.unavailable.length > 0)
  console.error(`not instrumentable in this runtime: ${sources.unavailable.join(", ")}`);

const percent = (part: number, whole: number) => `${((part / whole) * 100).toFixed(1)}%`;
console.error(
  `\n${"candidate".padEnd(16)}${"entropy source".padEnd(25)}${"distinct".padStart(9)}${"v7".padStart(7)}${"in-tick".padStart(8)}${"peak/ms".padStart(9)}${"counter".padStart(16)}${"P(1) range".padStart(15)}`,
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
      String(r.peakDrawsPerTick).padStart(9) +
      `${r.counterBits}b @ ${(r.counterHolds * 100).toFixed(2)}%`.padStart(16) +
      `${r.minOnesRatio}-${r.maxOnesRatio}`.padStart(15),
  );
