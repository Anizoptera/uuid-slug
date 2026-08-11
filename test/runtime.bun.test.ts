// SPDX-License-Identifier: Apache-2.0

/**
 * Bun's adapter, which is the one most consumers of this package actually run: the `bun` export
 * condition resolves to `src/index.ts`, so Bun executes this TypeScript directly.
 *
 * The entropy cases here mirror `test/entropy.test.ts` deliberately. Vitest runs on Node and
 * resolves `#runtime` to `runtime/node.ts`, so nothing it asserts constrains `runtime/bun.ts`
 * or the `runtime/web.ts` it draws `fillRandom` from — measured 2026-08-11, a `Math.random`
 * rewritten into `runtime/web.ts` left the entire vitest suite green.
 */
import { describe, expect, test } from "bun:test";

import {
  byteGenerators,
  codec,
  distinctValuesFrom,
  generators,
  insecureAmong,
  sourcesUsedBy,
} from "./entropy-probe";
import { createUuidSlugCodec, isUuidV7String } from "../src/index";

describe("bun runtime", () => {
  test("imports the source condition and generates UUIDv7", () => {
    const local = createUuidSlugCodec();
    expect(isUuidV7String(local.uuidV7())).toBe(true);
    expect(local.uuidV7Slug()).toHaveLength(22);
  });

  test("never reaches for Math.random on any generation path", () => {
    for (const [name, generate] of generators) {
      expect([name, insecureAmong(sourcesUsedBy(generate))]).toEqual([name, []]);
    }
  });

  test("returns plain Uint8Array bytes, never a node Buffer", () => {
    // Bun's native v7 hands back a Buffer; this is the gate that keeps it from reaching a
    // consumer, where it would make `toString("hex")` and `JSON.stringify` runtime-dependent.
    for (const [name, generate] of byteGenerators) {
      const bytes = generate();
      expect([name, (bytes as Uint8Array).constructor.name]).toEqual([name, "Uint8Array"]);
    }
  });

  test("never repeats a value on any generation path", () => {
    for (const [name, generate] of generators) {
      expect([name, distinctValuesFrom(generate)]).toEqual([name, 5_000]);
    }
  });

  test("draws its own randomness from a source that can be shown to be cryptographic", () => {
    const used = sourcesUsedBy(() => codec.uuidV4Bytes());
    expect(used).not.toEqual([]);
    expect(insecureAmong(used)).toEqual([]);
  });
});
