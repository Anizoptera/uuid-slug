// SPDX-License-Identifier: Apache-2.0

/**
 * `runtime/portable.ts` is the adapter browsers and Deno resolve, and the one no lane executes as a
 * consequence of its own `#runtime` condition — vitest resolves `node`, `bun test` resolves `bun`.
 * It is imported directly here for that reason.
 *
 * These cases protect the portable adapter's selected path, not merely host capability presence.
 * Browser UUIDv4 text stays on the faster pooled byte path even where `randomUUID` exists;
 * `getRandomValues` remains independently available on insecure contexts.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const fill = (bytes: Uint8Array) => {
  bytes.fill(0x7f);
  return bytes;
};

/** Re-imported per case: the probe runs once at module load, so the stub must precede it. */
async function adapterWith(cryptoStub: unknown, deno?: unknown) {
  vi.stubGlobal("crypto", cryptoStub);
  if (deno !== undefined) vi.stubGlobal("Deno", deno);
  vi.resetModules();
  return (await import("../src/runtime/portable")).runtime;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("portable runtime capability probe", () => {
  it("returns rng_unavailable when Web Crypto entropy is absent", async () => {
    const runtime = await adapterWith(undefined);
    const failure = runtime.fillRandom(new Uint8Array(16));
    expect(failure).toMatchObject({ code: "rng_unavailable" });
  });

  it("loads without Web Crypto when another runtime exposes a Deno-shaped global", async () => {
    const runtime = await adapterWith(undefined, {});
    expect(runtime.fillRandom(new Uint8Array(16))).toMatchObject({ code: "rng_unavailable" });
  });

  it("leaves uuidV4 undefined when the page has getRandomValues but not randomUUID", async () => {
    const runtime = await adapterWith({ getRandomValues: fill });
    expect(runtime.uuidV4).toBeUndefined();
    // The capability that IS present must still work: leaving `uuidV4` undefined routes callers to
    // the byte generator, which draws through exactly this.
    const bytes = new Uint8Array(16);
    runtime.fillRandom(bytes);
    expect(bytes.every((byte) => byte === 0x7f)).toBe(true);
  });

  it("keeps the faster portable v4 route when randomUUID exists", async () => {
    const runtime = await adapterWith({ getRandomValues: fill, randomUUID: vi.fn() });
    expect(runtime.uuidV4).toBeUndefined();
  });

  it("selects Deno's faster native v4 route without changing browser selection", async () => {
    const randomUUID = vi.fn(() => "00000000-0000-4000-8000-000000000000");
    const runtime = await adapterWith({ getRandomValues: fill, randomUUID }, {});
    expect(runtime.uuidV4?.()).toBe("00000000-0000-4000-8000-000000000000");
    expect(randomUUID).toHaveBeenCalledOnce();
  });
});
