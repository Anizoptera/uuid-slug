// SPDX-License-Identifier: Apache-2.0

import * as api from "../src/index";
import originalFixtures from "../rust/uuid-slug/tests/fixtures/fixtures-original-slugs.json" with { type: "json" };
import { createProfileCases, selectProfileCases, assertProfileOutcome } from "./profile-cases";
import { uuidObjectChecksum } from "./profile-case";

// This private benchmark isolate retains only its prepared corpus, never consumer request data.
// Entropy and setup run inside a request, before the host enables CPU or allocation sampling.
let prepared: ReturnType<typeof prepare> | undefined;

function prepare(calls: number, samples: number, filter: string) {
  const suite = createProfileCases(api, originalFixtures.issued, undefined);
  suite.verify();
  const selected = selectProfileCases(suite.cases, filter);
  let sink = 0;
  const batches = selected.map(([name, operation]) => {
    if (name.startsWith("invalid.")) throw new Error("Select successful consumer calls only");
    assertProfileOutcome(name, operation(0));
    const batch = (count: number): void => {
      for (let index = 0; index < count; index += 1) {
        const value = operation(index);
        if (typeof value === "string") sink ^= value.charCodeAt(index % value.length);
        else if (typeof value === "number") sink ^= value;
        else if (typeof value === "boolean") sink ^= Number(value);
        else if (value instanceof Uint8Array) sink ^= value[index % value.length] as number;
        else if (value instanceof Error) throw value;
        else sink ^= uuidObjectChecksum(value, index) ?? 1;
      }
    };
    batch(calls);
    return { name, batch };
  });
  const bytes = new Uint8Array(16);
  const toHex = (Uint8Array.prototype as { toHex?: () => string }).toHex;
  const toBase64 = (Uint8Array.prototype as { toBase64?: () => string }).toBase64;
  if (toHex && toHex.call(bytes) !== "00000000000000000000000000000000")
    throw new Error("workerd native hex did not encode the zero-byte control");
  if (toBase64 && toBase64.call(bytes) !== "AAAAAAAAAAAAAAAAAAAAAA==")
    throw new Error("workerd native base64 did not encode the zero-byte control");
  const metadata = {
    verified: true,
    verifiedCases: Object.keys(suite.cases).length,
    cases: selected.length,
    calls,
    samples,
    warmupCalls: calls,
    capabilities: {
      randomUUID: typeof crypto.randomUUID,
      getRandomValues: typeof crypto.getRandomValues,
      toHex: typeof toHex,
      toBase64: typeof toBase64,
    },
    timeOrigin: performance.timeOrigin,
  };
  return {
    metadata,
    measure() {
      const rows = [];
      for (const { name, batch } of batches) {
        const milliseconds = [];
        const clockStart = Date.now();
        for (let sample = 0; sample < samples; sample += 1) {
          const start = performance.now();
          batch(calls);
          milliseconds.push(performance.now() - start);
        }
        rows.push({
          name,
          calls,
          warmupCalls: calls,
          milliseconds,
          wallMilliseconds: Date.now() - clockStart,
        });
      }
      // Fixed call counts terminate even when a timer is frozen. Zero durations are invalid
      // measurements, not free calls; the host checks them before accepting any timing result.
      return { ...metadata, sink, rows };
    },
  };
}

export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);
    if (url.pathname === "/prepare") {
      const calls = Number(url.searchParams.get("calls"));
      const samples = Number(url.searchParams.get("samples"));
      if (
        !Number.isSafeInteger(calls) ||
        calls < 1 ||
        calls > 16_777_216 ||
        !Number.isSafeInteger(samples) ||
        samples < 1 ||
        samples > 100
      )
        return new Response("Use bounded positive calls and samples", { status: 400 });
      prepared = prepare(calls, samples, url.searchParams.get("filter") ?? "");
      return Response.json(prepared.metadata);
    }
    if (url.pathname !== "/profile")
      return new Response("Unknown benchmark request", { status: 404 });
    if (!prepared) return new Response("Prepare the corpus before measuring", { status: 409 });
    return Response.json(prepared.measure());
  },
};
