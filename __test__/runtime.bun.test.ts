// SPDX-License-Identifier: Apache-2.0

/**
 * Bun's adapter, which is the one most consumers of this package actually run: the `bun` export
 * condition resolves to `src/index.ts`, so Bun executes this TypeScript directly.
 *
 * The entropy cases here mirror `__test__/entropy.test.ts` deliberately. Vitest runs on Node and
 * resolves `#runtime` to `runtime/node.ts`, so nothing it asserts constrains `runtime/bun.ts`
 * or the `runtime/portable.ts` it draws `fillRandom` from — measured 2026-08-11, a `Math.random`
 * rewritten into `runtime/portable.ts` left the entire vitest suite green.
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
import { generateUuidV4Bytes } from "../src/index";

describe("bun runtime", () => {
  test("selects direct native UUIDv4 and preserves absent-capability fallback", () => {
    // Adapter capabilities are captured at import; a fresh process must select each real branch.
    for (const mode of ["native", "missing-loader", "missing-method"]) {
      const script = [
        'import { strict as assert } from "node:assert";',
        "const loader = process.getBuiltinModule;",
        "const mode = process.argv.at(-1);",
        'if (mode === "missing-loader") process.getBuiltinModule = undefined;',
        'if (mode === "missing-method") process.getBuiltinModule = () => ({});',
        'const { runtime } = await import("./src/runtime/bun.ts");',
        'if (mode === "native") assert.equal(runtime.uuidV4, loader("node:crypto").randomUUID);',
        'const { generateUuidV4, isUuidV4String } = await import("./src/index.ts");',
        "assert.equal(isUuidV4String(generateUuidV4()), true);",
      ].join("\n");
      const result = Bun.spawnSync([process.execPath, "-e", script, mode], {
        cwd: import.meta.dir + "/..",
        stdout: "pipe",
        stderr: "pipe",
      });
      expect([mode, result.exitCode, result.stderr.toString()]).toEqual([mode, 0, ""]);
    }
  });
  // The same list runs on Node and Bun's portable owned-byte generators, so both runtime branches
  // must preserve the public caller-buffer contract.
  for (const entry of bufferContractCases) {
    test(entry.name, () => {
      expect(entry.run()).toBeUndefined();
    });
  }

  test("never reaches for Math.random on any generation path", () => {
    for (const [name, generate] of generators) {
      expect([name, insecureAmong(sourcesUsedBy(generate))]).toEqual([name, []]);
    }
  });

  test("returns plain Uint8Array bytes, never a node Buffer", () => {
    for (const [name, generate] of byteGenerators) {
      const bytes = generate();
      expect([name, (bytes as Uint8Array).constructor]).toEqual([name, Uint8Array]);
    }
  });

  test("leaves every v4 bit random except the six the RFC fixes", () => {
    // Bun draws `fillRandom` from `runtime/portable.ts`, which vitest never loads, so a bit pinned
    // there is invisible on the Node lane — the same asymmetry as the cases above.
    expect(constantBitCount(generateUuidV4Bytes)).toBe(6);
  });

  test("draws its own randomness from a source that can be shown to be cryptographic", () => {
    const used = attributedSourcesFor(generateUuidV4Bytes);
    expect(used).not.toEqual([]);
    expect(insecureAmong(used)).toEqual([]);
  });
});
