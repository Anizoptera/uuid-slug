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
  attributedSourcesFor,
  byteGenerators,
  constantBitCount,
  generators,
  insecureAmong,
  sourcesUsedBy,
} from "./entropy-probe";
import { cases as bufferContractCases } from "./buffer-contract-probe";
import { runtime as bunRuntime } from "../src/runtime/bun";
import {
  isUuidV7String,
  slugToUuid,
  generateUuidV4Slug,
  generateUuidV4Bytes,
  generateUuidV7Slug,
} from "../src/index";
import { unwrap } from "../dev/unwrap";

describe("bun runtime", () => {
  test("exposes every supported native Bun UUIDv7 representation", () => {
    const availability = typeof Bun.randomUUIDv7 === "function" ? "function" : "undefined";
    expect(typeof bunRuntime.uuidV7).toBe(availability);
    expect(typeof bunRuntime.uuidV7Bytes).toBe(availability);
    expect(typeof bunRuntime.uuidV7Slug).toBe(availability);
  });

  // The same list runs on Node's portable generator and Bun's native owned-byte adapter, so both
  // runtime branches must preserve the public caller-buffer contract.
  for (const entry of bufferContractCases) {
    test(entry.name, () => {
      expect(entry.run()).toBeUndefined();
    });
  }

  test("the keyless generateUuidV7Slug honours its alphabet argument, not the native generator", () => {
    // Bun alone provides the native base64url hook. A branch gated only on that hook's presence
    // would ignore the requested alphabet here while every Node case stayed green.
    const sortable = unwrap(generateUuidV7Slug("base32hex"));
    expect(sortable).toHaveLength(26);
    expect<string>(sortable).toBe(sortable.toLowerCase());
    expect(isUuidV7String(slugToUuid(sortable) as string)).toBe(true);
    // The default must still take the native path and still round-trip; a fix that gated the
    // branch away entirely would pass the assertions above.
    expect(unwrap(generateUuidV7Slug())).toHaveLength(22);
    expect(unwrap(generateUuidV4Slug("base32hex"))).toHaveLength(26);
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

  test("leaves every v4 bit random except the six the RFC fixes", () => {
    // Bun draws `fillRandom` from `runtime/web.ts`, which vitest never loads, so a bit pinned
    // there is invisible on the Node lane — the same asymmetry as the cases above.
    expect(constantBitCount(generateUuidV4Bytes)).toBe(6);
  });

  test("draws its own randomness from a source that can be shown to be cryptographic", () => {
    const used = attributedSourcesFor(generateUuidV4Bytes);
    expect(used).not.toEqual([]);
    expect(insecureAmong(used)).toEqual([]);
  });
});
