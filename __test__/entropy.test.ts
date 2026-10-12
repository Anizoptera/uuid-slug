// SPDX-License-Identifier: Apache-2.0

/**
 * Check entropy on Vitest's selected runtime; Node JIT-selection probes run only on Node.
 * `__test__/runtime.bun.test.ts` proves the same of Bun's adapter; see `entropy-probe.ts` for why
 * neither run substitutes for the other.
 *
 * `__test__/v7.test.ts` drives the generator with `fillRandom` supplied by the test, which is what
 * makes its cases deterministic — and means it never touches the real entropy source at all.
 * That gap is this file. The regression it exists for is small, plausible and severe: someone
 * adds a `Math.random()` fallback to a runtime adapter "for environments without Web Crypto",
 * every other test stays green, and the identifiers become guessable while still looking
 * perfectly random.
 */
import { describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";

import { instrument } from "./instrument";
import {
  attributedSourcesFor,
  byteGenerators,
  constantBitCount,
  generators,
  insecureAmong,
  sourcesUsedBy,
} from "./entropy-probe";
import { generateUuidV4, generateUuidV4Bytes } from "../src/index";
import { runtime as nodeRuntime } from "../src/runtime/node";

describe("entropy source", () => {
  it.runIf(!process.versions.deno)(
    "selects native UUIDv4 only when Node actually runs without the JIT",
    () => {
      // Real processes distinguish NODE_OPTIONS from CLI overrides. The V8 executable heap is an
      // independent observation of the process mode, not a copy of the adapter's flag parser.
      const script = `
      import { strict as assert } from 'node:assert';
      import { getHeapStatistics } from 'node:v8';
      import { runtime } from './dist/node/runtime.js';
      import { generateUuidV4, isUuidV4String, uuidV7StringBounds, extractUuidV7UnixMs } from './dist/index.js';
      const disabled = getHeapStatistics().total_heap_size_executable === 0;
      assert.equal(Boolean(runtime.jitless), disabled);
      assert.equal(typeof runtime.uuidV4 === 'function', disabled);
      assert.equal(isUuidV4String(generateUuidV4()), true);
      // Reading both strings must not select the slower fixed writer in JITless mode.
      const fromCharCode = String.fromCharCode;
      let fixedWrites = 0;
      String.fromCharCode = (...codes) => { fixedWrites += 1; return fromCharCode(...codes); };
      const bounds = uuidV7StringBounds(0xffffffffffff);
      assert.ok(!(bounds instanceof Error));
      assert.equal(bounds.startInclusive.charCodeAt(12) + bounds.endInclusive.charCodeAt(12), 'f'.charCodeAt(0) * 2);
      assert.equal(fixedWrites, disabled ? 0 : 2);
      // The timestamp reader makes the opposite choice: native parsing avoids interpreted digits.
      const originalParseInt = globalThis.parseInt;
      let parsedTimestamps = 0;
      globalThis.parseInt = (...args) => { parsedTimestamps += 1; return originalParseInt(...args); };
      assert.equal(extractUuidV7UnixMs(bounds.startInclusive), 0xffffffffffff);
      assert.equal(extractUuidV7UnixMs(bounds.endInclusive), 0xffffffffffff);
      assert.equal(parsedTimestamps, disabled ? 2 : 0);
    `;
      for (const [options, flags] of [
        ["", []],
        ["--jitless", []],
        ['"--jitless"', []],
        ["--jitless --no-jitless", []],
        ["--no-jitless --jitless", []],
        ["--jitless", ["--no-jitless"]],
        ["--no-jitless", ["--jitless"]],
        ["", ["--jitless", "--no-jitless"]],
        ["", ["--no-jitless", "--jitless"]],
      ] as const) {
        const result = spawnSync(
          process.execPath,
          [...flags, "--input-type=module", "-e", script],
          {
            cwd: new URL("..", import.meta.url),
            env: { ...process.env, NODE_OPTIONS: options },
            encoding: "utf8",
          },
        );
        expect(result.status, result.stderr).toBe(0);
      }
    },
  );
  it.runIf(!process.versions.deno)(
    "generates UUIDv4 text from the package's attributable pool on Node with the JIT",
    () => {
      // With the JIT, native text is slower than the pooled portable path, so the adapter omits it and text
      // must draw through `fillRandom`, where the source can be attributed.
      expect(nodeRuntime.uuidV4).toBeUndefined();
      const used = attributedSourcesFor(() => generateUuidV4());
      expect(used).not.toEqual([]);
      expect(insecureAmong(used)).toEqual([]);
    },
  );

  it.each(generators)("never reaches for Math.random in %s", (_name, generate) => {
    expect(insecureAmong(sourcesUsedBy(generate))).toEqual([]);
  });

  it.each(byteGenerators)("returns plain Uint8Array bytes from %s", (_name, generate) => {
    expect((generate() as Uint8Array).constructor).toBe(Uint8Array);
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
