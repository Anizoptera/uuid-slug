// SPDX-License-Identifier: Apache-2.0

/**
 * Direct imports exercise browser capability selection even when Vitest itself runs on Node or Deno.
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
  vi.stubGlobal("Deno", deno);
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

describe("portable UUID text and slug writing", () => {
  // Optional engine encoders must not change the fixed UUID wire output.
  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])(
    "writes canonical text and slugs with native removal %s and WebKit selection %s",
    async (removeNative, webkit) => {
      vi.stubGlobal("navigator", { vendor: webkit ? "Apple Computer, Inc." : "" });
      const toHex = Object.getOwnPropertyDescriptor(Uint8Array.prototype, "toHex");
      const toBase64 = Object.getOwnPropertyDescriptor(Uint8Array.prototype, "toBase64");
      if (removeNative) {
        Reflect.deleteProperty(Uint8Array.prototype, "toHex");
        Reflect.deleteProperty(Uint8Array.prototype, "toBase64");
      }
      try {
        vi.resetModules();
        vi.doMock("#runtime", () => import("../src/runtime/portable"));
        const adapter = await import("../src/runtime/portable");
        expect(typeof adapter.runtime.uuidHex === "function").toBe(
          webkit && !removeNative && typeof toHex?.value === "function",
        );
        const api = await import("../src/index");
        const bytes = Uint8Array.from({ length: 20 }, (_, index) => (index - 2) * 17);
        const lower = "00112233-4455-6677-8899-aabbccddeeff";
        expect(api.bytesToUuidString(bytes, 2)).toBe(lower);
        expect(api.bytesToUuidString(bytes, 2, "uppercase")).toBe(lower.toUpperCase());
        expect(api.uuidToString(bytes.slice(2, 18))).toBe(lower);
        const alphabet = await import("../src/alphabet");
        const uuid = bytes.slice(2, 18);
        const oversized = new Uint8Array(64).fill(0xee);
        oversized.set(uuid, 24);
        expect(api.bytesToUuidString(oversized, 24)).toBe(lower);
        expect(api.bytesToUuidString(oversized, 24, "uppercase")).toBe(lower.toUpperCase());
        expect(api.uuidBytesToPlainSlug(uuid)).toBe(Buffer.from(uuid).toString("base64url"));
        expect(api.uuidBytesToPlainSlug(uuid, "base32hex")).toBe("008i4cq4alj7f24platspnfevs");
        expect(alphabet.encode(uuid, alphabet.BASE64URL, 9, 4)).toBe("ABEiM0RVZneImaq7zN3u_5");
        expect(alphabet.encode(uuid, alphabet.BASE32HEX, 3, 2)).toBe("008i4cq4alj7f24platspnfevv");
        expect(alphabet.encode(uuid, alphabet.BASE32HEX, 9, 4)).toBe("008i4cq4alj7f24platspnfevu8");
      } finally {
        vi.doUnmock("#runtime");
        // eslint-disable-next-line no-extend-native -- restores the engine's own descriptors removed above
        if (toHex) Object.defineProperty(Uint8Array.prototype, "toHex", toHex);
        // eslint-disable-next-line no-extend-native -- restores the engine's own descriptors removed above
        if (toBase64) Object.defineProperty(Uint8Array.prototype, "toBase64", toBase64);
      }
    },
  );
});
