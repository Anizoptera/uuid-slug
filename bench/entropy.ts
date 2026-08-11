// SPDX-License-Identifier: Apache-2.0

/**
 * Measures what every UUIDv7 implementation actually does with randomness, so a choice between
 * them rests on observation rather than on each package's description of itself.
 *
 * REPORTS, never gates. The subjects are third-party libraries whose behaviour changes only
 * when a version is bumped here, so running this on every check would spend time re-deriving a
 * constant — and would fail this repository's lane for a property of somebody else's package
 * that nobody here can fix. THIS package's own guarantees are gated in `test/entropy.test.ts`
 * and `test/v7.test.ts`, which are deterministic and run in milliseconds.
 *
 * It replaces a collision count over 100,000 samples, which was theatre: a v7 holds 74 random
 * bits, so a repeat cannot be observed at that sample size even from an implementation seeded
 * with a constant. A check that cannot fail measures nothing.
 *
 * WHAT EACH COLUMN ANSWERS, and why it is worth the loop:
 *
 * - `source`   Which entropy source the implementation reached for. See `instrument.ts` for why
 *              an unobserved result means unmeasured, never insecure.
 * - `v7`       Share of values whose version and variant bits are correct. These sit in bits the
 *              entropy source also writes, so a missing mask yields something that looks
 *              well-formed and is not a v7.
 * - `ordered`  Share of consecutive pairs that do not go backwards. Time ordering is the whole
 *              reason to prefer v7 over v4, and it is a property of the generator, not the format.
 * - `guessable` Random-field bit positions whose skew is past 6 sigma — far beyond chance at
 *              these sample sizes, so it is structure. In practice it is a counter: legitimate
 *              under RFC 9562 §6.2, and it means those bits are PREDICTABLE from a previous
 *              value and must not be counted toward unguessability.
 * - `Δbits`    Mean bits differing between consecutive values, out of 74. Half, near 37, means
 *              consecutive values are unrelated; far below it means one value narrows the next.
 */
import { candidates, type BenchCandidate } from "./candidates";
import { instrument } from "./instrument";

const smoke = process.argv.includes("--smoke");
const samples = Number(process.env.UUID_SLUG_ENTROPY_SAMPLES ?? (smoke ? 20_000 : 200_000));

/** Bits 52–63 (`rand_a`) and 66–127 (`rand_b`): everything RFC 9562 declares random. */
const RANDOM_BITS: readonly number[] = [
  ...Array.from({ length: 12 }, (_, i) => 52 + i),
  ...Array.from({ length: 62 }, (_, i) => 66 + i),
];

const hexToBytes = (uuid: string, out: Uint8Array) => {
  let index = 0;
  for (let i = 0; i < uuid.length; i += 1) {
    const code = uuid.charCodeAt(i);
    if (code === 45 /* '-' */) continue;
    const nibble = code <= 57 ? code - 48 : (code | 0x20) - 87;
    if (index % 2 === 0) out[index >> 1] = nibble << 4;
    else out[index >> 1] = (out[index >> 1] ?? 0) | nibble;
    index += 1;
  }
};

const bitAt = (bytes: Uint8Array, position: number) =>
  ((bytes[position >> 3] ?? 0) >> (7 - (position & 7))) & 1;

interface Report {
  candidate: string;
  samples: number;
  sources: string[];
  conformingValues: number;
  nonDecreasingPairs: number;
  maxBiasSigma: number;
  /**
   * Positions carrying structure rather than entropy. A LOWER BOUND — see `guessableBits`
   * below for the one counter bit that evades both detectors.
   */
  guessableBits: number[];
  meanConsecutiveHamming: number;
}

function audit(candidate: BenchCandidate, sources: ReturnType<typeof instrument>): Report | null {
  if (!candidate.uuidV7) return null;
  const ones = new Array<number>(RANDOM_BITS.length).fill(0);
  const flips = new Array<number>(RANDOM_BITS.length).fill(0);
  const current = new Uint8Array(16);
  const previous = new Uint8Array(16);
  let conformingValues = 0;
  let nonDecreasingPairs = 0;
  let hammingTotal = 0;

  sources.reset();
  for (let i = 0; i < samples; i += 1) {
    hexToBytes(candidate.uuidV7(), current);
    if ((current[6] ?? 0) >> 4 === 0x7 && (current[8] ?? 0) >> 6 === 0b10) conformingValues += 1;

    let hamming = 0;
    for (let b = 0; b < RANDOM_BITS.length; b += 1) {
      const bit = bitAt(current, RANDOM_BITS[b] ?? 0);
      ones[b] = (ones[b] ?? 0) + bit;
      if (i > 0 && bit !== bitAt(previous, RANDOM_BITS[b] ?? 0)) {
        hamming += 1;
        flips[b] = (flips[b] ?? 0) + 1;
      }
    }
    if (i > 0) {
      hammingTotal += hamming;
      // Byte order over all 16 bytes is the order a database index imposes.
      let comparison = 0;
      for (let k = 0; k < 16 && comparison === 0; k += 1)
        comparison = (current[k] ?? 0) - (previous[k] ?? 0);
      if (comparison >= 0) nonDecreasingPairs += 1;
    }
    previous.set(current);
  }

  // Two independent tests, unioned, because either alone is blind to half of a counter.
  //
  // A fair bit is Binomial(n, 1/2): mean n/2, sd sqrt(n)/2, so six sigma is far past anything
  // chance produces here and what clears it is structure. That is the MARGINAL frequency, and
  // it sees only a counter's high bits, which sit near zero. The low bits of a counter are
  // uniform over any run — measured 2026-08-11 against `Bun.randomUUIDv7` over 100,000 values,
  // the counter's least significant bit scored P(1) = 0.500 at z = -0.1, a flawless result
  // from a bit that is fully determined by its predecessor.
  //
  // The LAG-1 flip rate catches those: a random bit differs from the previous value's bit half
  // the time, a counter's lowest bit differs every time (z = +316 in that same run) and the
  // ones above it flip at 1/4, 1/8, 1/16 and so on. Of Bun's twelve counter bits, the marginal
  // test found six and the union finds eleven.
  //
  // The residue is exact and worth stating: a counter bit of period four flips at exactly half
  // and is uniform at exactly half, so it passes both. Catching it needs a lag-2 test, and one
  // bit in seventy-four does not pay for the third detector. Read the column as a floor.
  const deviation = Math.sqrt(samples) / 2;
  const flipDeviation = Math.sqrt(samples - 1) / 2;
  const sigmas = ones.map((count) => (count - samples / 2) / deviation);
  const flipSigmas = flips.map((count) => (count - (samples - 1) / 2) / flipDeviation);
  const structured = (index: number) =>
    Math.abs(sigmas[index] ?? 0) > 6 || Math.abs(flipSigmas[index] ?? 0) > 6;

  return {
    candidate: candidate.name,
    samples,
    sources: sources.used(),
    conformingValues,
    nonDecreasingPairs,
    maxBiasSigma: Number(Math.max(...sigmas.map(Math.abs)).toFixed(2)),
    guessableBits: RANDOM_BITS.filter((_, i) => structured(i)),
    meanConsecutiveHamming: Number((hammingTotal / (samples - 1)).toFixed(2)),
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
  `\n${"candidate".padEnd(16)}${"entropy source".padEnd(26)}${"v7".padStart(7)}${"ordered".padStart(9)}${"guessable".padStart(11)}${"Δbits".padStart(7)}`,
);
for (const r of reports)
  console.error(
    r.candidate.padEnd(16) +
      // "unobserved" states only what was seen. The cause may be a native generator drawing
      // below JavaScript or a reference captured at import; both are unmeasured, neither is a
      // finding, and naming one of them here would assert what this instrument cannot see.
      (r.sources.length > 0 ? r.sources.join(",") : "unobserved").slice(0, 25).padEnd(26) +
      percent(r.conformingValues, r.samples).padStart(7) +
      percent(r.nonDecreasingPairs, r.samples - 1).padStart(9) +
      `${r.guessableBits.length}/74`.padStart(11) +
      String(r.meanConsecutiveHamming).padStart(7),
  );
