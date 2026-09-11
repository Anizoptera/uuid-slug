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
import { describe, expect, it, vi } from "vitest";

import { instrument } from "./instrument";
import {
  attributedSourcesFor,
  byteGenerators,
  constantBitCount,
  generators,
  insecureAmong,
  sourcesUsedBy,
} from "./entropy-probe";
import { generateUuidV4Bytes } from "../src/index";

describe("entropy source", () => {
  it.each(generators)("never reaches for Math.random in %s", (_name, generate) => {
    expect(insecureAmong(sourcesUsedBy(generate))).toEqual([]);
  });

  it.each(byteGenerators)("returns plain Uint8Array bytes from %s", (_name, generate) => {
    expect((generate() as Uint8Array).constructor.name).toBe("Uint8Array");
  });

  it("leaves every v4 bit random except the six the RFC fixes", () => {
    // A pinned bit narrows the id space despite distinct outputs. This detects stuck bits,
    // not bias, correlations, or predictability in a source whose bits all vary.
    expect(constantBitCount(generateUuidV4Bytes)).toBe(6);
  });

  it("draws its own randomness from a source that can be shown to be cryptographic", () => {
    // `generateUuidV4Bytes` always goes through this package's `fillRandom`, so an empty result is a
    // real finding: our own entropy could not be attributed. The delegating paths cannot make
    // that claim — a native generator draws inside the engine, below any JavaScript patch —
    // so they only assert the negative.
    const used = attributedSourcesFor(generateUuidV4Bytes);
    expect(used).not.toEqual([]);
    expect(insecureAmong(used)).toEqual([]);
  });
});

/**
 * Importing this package must draw NO randomness. That is what makes it safe to load inside a heap
 * snapshot — V8 and JavaScriptCore startup snapshots, and the serverless platforms built on them:
 * a snapshot that captured drawn bytes would hand every restored process the same identifiers.
 *
 * The property is currently incidental — `pool.ts` starts its pool empty and refills on first use —
 * so this is the only thing standing between it and an obvious "optimisation" that pre-fills at
 * module load. Nothing else could see that change: the bytes stay perfectly random inside any one
 * process, so every other case in this file, and in the whole suite, keeps passing.
 */
describe("import-time entropy", () => {
  it("touches no randomness source at module load", async () => {
    // A fresh module registry, or the import below returns the instance the rest of this file
    // already loaded and its module body never runs again — the test would then observe nothing
    // and pass by construction.
    vi.resetModules();
    const sources = instrument();
    try {
      // `instrument()` exercises each source once to prove its patch took effect — the check that
      // makes an empty result mean "nothing was called" rather than "nothing was watched" — so the
      // counters start at one. Zeroing must happen after installing and before the import.
      sources.reset();
      await import("../src/index");
      expect(sources.used()).toEqual([]);
    } finally {
      sources.restore();
    }
  });
});
