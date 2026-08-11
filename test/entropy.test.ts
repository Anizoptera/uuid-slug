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
    const used = sourcesUsedBy(() => codec.uuidV4Bytes());
    expect(used).not.toEqual([]);
    expect(insecureAmong(used)).toEqual([]);
  });
});

describe("generated v7 values", () => {
  it("are well-formed and never go backwards, from the real runtime", () => {
    // The generator tests pin this against injected randomness; this one pins what the runtime
    // in use actually produces, which is what a consumer stores.
    let previous = "";
    for (let i = 0; i < 2_000; i += 1) {
      const hex = codec.uuidV7().replaceAll("-", "");
      expect(hex[12]).toBe("7");
      expect("89ab").toContain(hex[16]);
      expect(hex > previous).toBe(true);
      previous = hex;
    }
  });
});
