// SPDX-License-Identifier: Apache-2.0

import { setImmediate as yieldToLoop } from "node:timers/promises";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { strict as assert } from "node:assert";
import cryptoRandomUuid from "crypto-randomuuid";

import { generationCases } from "./generation-cases";
import type { GenerationCase } from "./generation-case";
import { measureGenerationCases } from "./generation-measure";
import { createConversionCases } from "./conversion-cases";

const nativeUuidV7 = (crypto as { randomUUIDv7?: () => string }).randomUUIDv7?.bind(crypto);

const bunUuidV7 = (
  globalThis as {
    Bun?: { randomUUIDv7?: (encoding?: "base64url" | "buffer" | "hex") => string | Uint8Array };
  }
).Bun?.randomUUIDv7;

const conversions = createConversionCases(Buffer);
// Native UUIDv4 supplies exactly the 74 random bits UUIDv7 keeps after replacing its timestamp
// and version. Compare complete text calls without depending on native UUIDv7 counter overflow.
// These are lower-bound experiments, not adopted generators or proof of fallback behavior.
function v7FromNativeV4Hex(uuid: string, unixMs: number): string {
  const timestamp = unixMs.toString(16).padStart(12, "0");
  return timestamp.slice(0, 8) + "-" + timestamp.slice(8) + "-7" + uuid.slice(15);
}
const hexCodes = Uint8Array.from("0123456789abcdef", (digit) => digit.charCodeAt(0));
function v7FromNativeV4Codes(uuid: string, unixMs: number): string {
  // Fixed character positions avoid temporary timestamp slices; compare their complete cost
  // with native numeric formatting rather than assuming the longer body is faster.
  const high = Math.floor(unixMs / 0x1_0000_0000);
  const low = unixMs >>> 0;
  return (
    String.fromCharCode(
      hexCodes[high >>> 12]!,
      hexCodes[(high >>> 8) & 15]!,
      hexCodes[(high >>> 4) & 15]!,
      hexCodes[high & 15]!,
      hexCodes[low >>> 28]!,
      hexCodes[(low >>> 24) & 15]!,
      hexCodes[(low >>> 20) & 15]!,
      hexCodes[(low >>> 16) & 15]!,
      45,
      hexCodes[(low >>> 12) & 15]!,
      hexCodes[(low >>> 8) & 15]!,
      hexCodes[(low >>> 4) & 15]!,
      hexCodes[low & 15]!,
      45,
      55,
    ) + uuid.slice(15)
  );
}
// An independent byte writer checks timestamp carries, version replacement and every retained
// payload byte before any timing. Normal random outputs cannot reveal a deterministic bit loss.
for (const patch of [v7FromNativeV4Hex, v7FromNativeV4Codes]) {
  for (const unixMs of [0, 0xffff_ffff, 0x1_0000_0000, 1_700_000_000_000, 0xffff_ffff_ffff]) {
    for (const hex of ["00112233445546778899aabbccddeeff", "ffeeddccbbaa4987b6543210fedcba98"]) {
      const source = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      const bytes = Buffer.from(hex, "hex");
      bytes.writeUIntBE(unixMs, 0, 6);
      bytes[6] = (bytes[6]! & 15) | 0x70;
      const expected = bytes.toString("hex");
      assert.equal(
        patch(source, unixMs).replaceAll("-", ""),
        expected,
        "native-v4 timestamp repair must preserve all UUIDv7 payload bits",
      );
    }
  }
}
const hostCases: readonly GenerationCase[] = [
  ...generationCases,
  ...conversions.cases,
  ...[v7FromNativeV4Hex, v7FromNativeV4Codes].map((patch) => ({
    comparable: "v7.text.secure",
    implementation: "platform-v4-clock-repair",
    name: `platform.v4-repair.v7.text.${patch === v7FromNativeV4Hex ? "hex" : "codes"}`,
    operation: () => patch(crypto.randomUUID(), Date.now()),
    qualification: "qualified" as const,
    secure: true,
    version: 7 as const,
    note: "Independent native UUIDv4 payload with package-clock timestamp; lower bound without package validation or native-failure fallback.",
  })),
  ...(bunUuidV7
    ? (
        [
          ["platform.bun.v7.text", "v7.text.secure", () => bunUuidV7()],
          // A Node `Buffer`, not the plain `Uint8Array` this package returns; timed as a floor only.
          ["platform.bun.v7.bytes.allocate", "v7.bytes.allocate.secure", () => bunUuidV7("buffer")],
          [
            "platform.bun-copy.v7.bytes.allocate",
            "v7.bytes.allocate.secure",
            () => Uint8Array.from(bunUuidV7("buffer") as Uint8Array),
          ],
          [
            "platform.bun-constructor-copy.v7.bytes.allocate",
            "v7.bytes.allocate.secure",
            () => new Uint8Array(bunUuidV7("buffer") as Uint8Array),
          ],
          [
            "platform.bun-set-copy.v7.bytes.allocate",
            "v7.bytes.allocate.secure",
            () => {
              const owned = new Uint8Array(16);
              owned.set(bunUuidV7("buffer") as Uint8Array);
              return owned;
            },
          ],
          [
            "platform.bun.v7.slug.base64url",
            "v7.slug.base64url.secure",
            () => bunUuidV7("base64url"),
          ],
        ] as const
      ).map(([name, comparable, operation]): GenerationCase => {
        const candidate: GenerationCase = {
          comparable,
          implementation: "platform",
          name,
          operation,
          qualification: "qualified",
          secure: true,
          version: 7,
        };
        if (name === "platform.bun.v7.bytes.allocate")
          Object.assign(candidate, {
            qualification: "rejected",
            rejectionReason: "Native Buffer is not a caller-private plain Uint8Array result.",
          });
        return candidate;
      })
    : []),
  ...(nativeUuidV7
    ? [
        {
          comparable: "v7.text.secure",
          implementation: "platform",
          name: "platform.node-crypto.v7.text",
          operation: nativeUuidV7,
          qualification: "qualified" as const,
          secure: true,
          version: 7 as const,
        },
      ]
    : []),
  {
    comparable: "v4.text.secure",
    implementation: "node-native-or-polyfill",
    name: "crypto-randomuuid.v4.text",
    operation: cryptoRandomUuid,
    qualification: "qualified",
    secure: true,
    version: 4,
  },
];

const smoke = process.argv.includes("--smoke");
const options = {
  durationMs: Number(process.env.UUID_SLUG_GENERATION_MS ?? (smoke ? 1 : 20)),
  samples: Number(process.env.UUID_SLUG_GENERATION_SAMPLES ?? (smoke ? 1 : 9)),
  warmupMs: Number(process.env.UUID_SLUG_GENERATION_WARMUP_MS ?? (smoke ? 2 : 32)),
  yieldControl: () => yieldToLoop(),
};
const filter = process.env.UUID_SLUG_GENERATION_FILTER;
const selected = hostCases.filter((candidate) => !filter || candidate.name.includes(filter));
if (selected.length === 0) throw new Error("Generation benchmark filter selected no cases");
const versions = process.versions as typeof process.versions & { deno?: string };
const runtime = versions.bun
  ? `bun ${versions.bun}`
  : versions.deno
    ? `deno ${versions.deno}`
    : `node ${process.version}`;

console.log(
  JSON.stringify({
    caseNames: selected.map(({ name }) => name),
    kind: "environment",
    runtime,
    samples: options.samples,
    unsupported: conversions.unsupported.filter(({ name }) => !filter || name.includes(filter)),
  }),
);
for (const row of await measureGenerationCases(selected, options))
  console.log(JSON.stringify({ kind: "measurement", runtime, ...row }));
