// SPDX-License-Identifier: Apache-2.0

/**
 * Where this package's randomness comes from, on the runtime vitest resolves — Node.
 * `test/runtime.bun.test.ts` proves the same of Bun's adapter; see `entropy-probe.ts` for why
 * neither run substitutes for the other.
 *
 * `test/v7.test.ts` drives the generator with `fillRandom` supplied by the test, which is what
 * makes its cases deterministic — and means it never touches the real entropy source at all.
 * That gap is this file. The regression it exists for is small, plausible and severe: someone
 * adds a `Math.random()` fallback to a runtime adapter "for environments without Web Crypto",
 * every other test stays green, and the identifiers become guessable while still looking
 * perfectly random.
 */
import { describe, expect, it } from "vitest";

import {
  byteGenerators,
  codec,
  distinctValuesFrom,
  generators,
  insecureAmong,
  sourcesUsedBy,
} from "./entropy-probe";

describe("entropy source", () => {
  it.each(generators)("never reaches for Math.random in %s", (_name, generate) => {
    expect(insecureAmong(sourcesUsedBy(generate))).toEqual([]);
  });

  it.each(byteGenerators)("returns plain Uint8Array bytes from %s", (_name, generate) => {
    expect((generate() as Uint8Array).constructor.name).toBe("Uint8Array");
  });

  it.each(generators)("never repeats a value in %s", (_name, generate) => {
    // The instrument above proves WHICH source was called; this proves the source is producing
    // fresh bits. A seed frozen at module load, a reused buffer, or a pool of pre-drawn values
    // all call `getRandomValues` exactly as expected and satisfy every other case in this suite.
    expect(distinctValuesFrom(generate)).toBe(5_000);
  });

  it("draws its own randomness from a source that can be shown to be cryptographic", () => {
    // `uuidV4Bytes` always goes through this package's `fillRandom`, so an empty result is a
    // real finding: our own entropy could not be attributed. The delegating paths cannot make
    // that claim — a native generator draws inside the engine, below any JavaScript patch —
    // so they only assert the negative.
    // Randomness is drawn a pool at a time, so most calls attribute no source at all and the
    // window has to span a refill. Looping until one appears keeps this independent of the pool
    // size, and costs a `Math.random` implementation nothing in detection: that attributes an
    // insecure source on the very first call rather than never attributing one.
    let used: readonly string[] = [];
    for (let i = 0; i < 20_000 && used.length === 0; i += 1)
      used = sourcesUsedBy(() => codec.uuidV4Bytes());
    expect(used).not.toEqual([]);
    expect(insecureAmong(used)).toEqual([]);
  });
});

describe("generated v7 values", () => {
  it("are well-formed, and their timestamps never go backwards", () => {
    // Pins the README's stated guarantee and no more. The timestamp is asserted because
    // millisecond-granular ordering is promised; the RANDOM field deliberately is not, because
    // intra-millisecond ordering is left to the runtime — a platform generator may re-randomise
    // every random bit per call. Asserting strict increase here would pin a stronger promise than
    // this package makes and would fail on a conformant runtime rather than on a defect.
    // `bench/entropy.ts` measures what each runtime actually does; this only holds the contract.
    let previousTimestamp = "";
    for (let i = 0; i < 2_000; i += 1) {
      const hex = codec.uuidV7().replaceAll("-", "");
      expect(hex[12]).toBe("7");
      expect("89ab").toContain(hex[16]);
      const timestamp = hex.slice(0, 12);
      expect(timestamp >= previousTimestamp).toBe(true);
      previousTimestamp = timestamp;
    }
  });
});
