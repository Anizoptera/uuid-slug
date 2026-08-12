// SPDX-License-Identifier: Apache-2.0

/**
 * `runtime/web.ts` is the adapter browsers and Deno resolve, and the one no lane executes as a
 * consequence of its own `#runtime` condition — vitest resolves `node`, `bun test` resolves `bun`.
 * It is imported directly here for that reason.
 *
 * What is asserted is the rule `AGENTS.md` states and `runtime/node.ts` already follows: a method
 * is defined only where the platform provides it, so ABSENCE IS REPRESENTABLE. A method that
 * exists and throws is not the same thing — it makes the caller catch and fall back on every call,
 * and `codec.ts` calls `runtime.uuidV4?.()` with no catch at all, so the throw reached consumers.
 *
 * The two capabilities are separable in real browsers, which is why this is not hypothetical:
 * `crypto.randomUUID` is restricted to secure contexts and `crypto.getRandomValues` is not, so an
 * insecure page has exactly the stub built below.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const fill = (bytes: Uint8Array) => {
  bytes.fill(0x7f);
  return bytes;
};

/** Re-imported per case: the probe runs once at module load, so the stub must precede it. */
async function adapterWith(cryptoStub: unknown) {
  vi.stubGlobal("crypto", cryptoStub);
  vi.resetModules();
  return (await import("../src/runtime/web")).runtime;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("web runtime capability probe", () => {
  it("leaves uuidV4 undefined when the page has getRandomValues but not randomUUID", async () => {
    const runtime = await adapterWith({ getRandomValues: fill });
    expect(runtime.uuidV4).toBeUndefined();
    // The capability that IS present must still work: leaving `uuidV4` undefined routes callers to
    // the byte generator, which draws through exactly this.
    const bytes = new Uint8Array(16);
    runtime.fillRandom(bytes);
    expect(bytes.every((byte) => byte === 0x7f)).toBe(true);
  });

  it("defines uuidV4 when the page has randomUUID", async () => {
    const uuid = "3a1d2f4e-5b6c-4d7e-8f90-a1b2c3d4e5f6";
    const runtime = await adapterWith({ getRandomValues: fill, randomUUID: () => uuid });
    expect(runtime.uuidV4?.()).toBe(uuid);
  });
});
