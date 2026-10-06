// SPDX-License-Identifier: Apache-2.0

import { setImmediate as yieldToLoop } from "node:timers/promises";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { strict as assert } from "node:assert";
import cryptoRandomUuid from "crypto-randomuuid";

import { generationCases } from "./generation-cases";
import type { GenerationCase } from "./generation-case";
import {
  BUN_UUID_V7_BUFFER_CASE,
  bunUuidV7TextCase,
  cryptoRandomUuidCase,
  generationNameFilter,
} from "./generation-case";
import { measureGenerationCases } from "./generation-measure";
import { createConversionCases } from "./conversion-cases";

const nativeUuidV7 = (crypto as { randomUUIDv7?: () => string }).randomUUIDv7?.bind(crypto);

const bunUuidV7 = (
  globalThis as {
    Bun?: {
      randomUUIDv7?: (
        encoding?: "base64url" | "buffer" | "hex",
        timestamp?: number,
      ) => string | Uint8Array;
    };
  }
).Bun?.randomUUIDv7;

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
// Native counter overflow can advance the timestamp. Cache only the clock prefix, never an ID,
// and compare conditional repair with unconditional repair using the same cache. Passing the
// captured clock to Bun is a separate axis: neither mode may retain native timestamp drift.
function createNativeV7ClockRepair(conditional: boolean) {
  let lastMs = -1;
  let prefix = "";
  return (uuid: string, unixMs: number): string => {
    if (unixMs !== lastMs) {
      const digits = unixMs.toString(16).padStart(12, "0");
      prefix = digits.slice(0, 8) + "-" + digits.slice(8) + "-";
      lastMs = unixMs;
    }
    if (conditional && uuid.startsWith(prefix)) return uuid;
    return prefix + uuid.slice(14);
  };
}
// Distinct suffixes and carry boundaries distinguish preserving the native payload from merely
// returning syntactically valid UUIDv7 text. Repeated clocks exercise cached and matching paths.
for (const conditional of [false, true]) {
  const patch = createNativeV7ClockRepair(conditional);
  for (const unixMs of [0, 0xffff_ffff, 0x1_0000_0000, 1_700_000_000_000, 0xffff_ffff_ffff, 0]) {
    for (const hex of ["00112233445576778899aabbccddeeff", "ffeeddccbbaa7987b6543210fedcba98"]) {
      const source = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      const bytes = Buffer.from(hex, "hex");
      bytes.writeUIntBE(unixMs, 0, 6);
      const expected = bytes.toString("hex");
      const repaired = patch(source, unixMs);
      assert.equal(
        repaired.replaceAll("-", ""),
        expected,
        "native-v7 clock repair lost payload or timestamp bits",
      );
      assert.equal(
        patch(repaired, unixMs),
        repaired,
        "matching native timestamps must preserve the complete UUID",
      );
    }
  }
}
// Six timestamp bytes occupy exactly eight base64url characters, so replacing this prefix
// preserves the entire native payload without decoding it. Compare this shorter repair with
// the slower text repair before adding package validation or fallback. Clock changes rebuild
// the prefix; repeated clocks reuse it, and rollback must invalidate it just like forward time.
const base64urlDigits = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function createNativeV7SlugClockRepair(conditional: boolean) {
  let lastMs = -1;
  let prefix = "";
  return (slug: string, unixMs: number): string => {
    if (unixMs !== lastMs) {
      const high = Math.floor(unixMs / 0x1_0000_0000);
      const low = unixMs >>> 0;
      prefix = String.fromCharCode(
        base64urlDigits.charCodeAt(high >>> 10),
        base64urlDigits.charCodeAt((high >>> 4) & 63),
        base64urlDigits.charCodeAt(((high & 15) << 2) | (low >>> 30)),
        base64urlDigits.charCodeAt((low >>> 24) & 63),
        base64urlDigits.charCodeAt((low >>> 18) & 63),
        base64urlDigits.charCodeAt((low >>> 12) & 63),
        base64urlDigits.charCodeAt((low >>> 6) & 63),
        base64urlDigits.charCodeAt(low & 63),
      );
      lastMs = unixMs;
    }
    if (conditional && slug.startsWith(prefix)) return slug;
    return prefix + slug.slice(8);
  };
}
// Buffer's byte writer and encoder do not share the repair's shifts or character positions.
// Complementary payloads and every single payload bit distinguish a correct suffix from a
// syntactically valid slug; cached, matching, carry and rollback cases check both repair modes.
for (const conditional of [false, true]) {
  const patch = createNativeV7SlugClockRepair(conditional);
  const payloads = ["00112233445576778899aabbccddeeff", "ffeeddccbbaa7987b6543210fedcba98"];
  for (let bit = 48; bit < 128; bit++) {
    if ((bit >= 52 && bit < 56) || (bit >= 70 && bit < 72)) continue;
    const bytes = Buffer.alloc(16);
    bytes[6] = 0x70;
    bytes[8] = 0x80;
    bytes[Math.floor(bit / 8)]! |= 1 << (bit % 8);
    payloads.push(bytes.toString("hex"));
  }
  for (const unixMs of [
    0, 63, 64, 0xffff, 0xffff_ffff, 0x1_0000_0000, 1_700_000_000_000, 0xffff_ffff_ffff, 0,
  ]) {
    for (const hex of payloads) {
      const bytes = Buffer.from(hex, "hex");
      const source = bytes.toString("base64url");
      bytes.writeUIntBE(unixMs, 0, 6);
      const expected = bytes.toString("base64url");
      const repaired = patch(source, unixMs);
      assert.equal(repaired, expected, "native-v7 slug repair lost payload or timestamp bits");
      assert.equal(
        patch(repaired, unixMs),
        repaired,
        "matching slug timestamps must preserve every bit",
      );
    }
  }
}
const hostCases: readonly GenerationCase[] = [
  ...generationCases,
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
  ...(bunUuidV7 ? [bunUuidV7TextCase(() => bunUuidV7())] : []),
  ...(bunUuidV7
    ? (
        [
          // A Node `Buffer`, not the plain `Uint8Array` this package returns; timed as a floor only.
          [BUN_UUID_V7_BUFFER_CASE, "v7.bytes.allocate.secure", () => bunUuidV7("buffer")],
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
        if (name === BUN_UUID_V7_BUFFER_CASE)
          Object.assign(candidate, {
            qualification: "rejected",
            rejectionReason: "Native Buffer is not a caller-private plain Uint8Array result.",
          });
        return candidate;
      })
    : []),
  ...(bunUuidV7
    ? [false, true].flatMap((explicitTime) =>
        [false, true].map((conditional): GenerationCase => {
          const repair = createNativeV7ClockRepair(conditional);
          return {
            comparable: "v7.text.secure",
            implementation: "platform-v7-clock-repair",
            name: `platform.bun-repair.v7.text.${explicitTime ? "explicit" : "default"}.${conditional ? "conditional" : "always"}`,
            operation: () => {
              const now = Date.now();
              return repair(bunUuidV7("hex", explicitTime ? now : undefined) as string, now);
            },
            qualification: "qualified",
            secure: true,
            version: 7,
            note: "Cached package-clock timestamp with native UUIDv7 payload; lower bound without package validation or native-failure fallback.",
          };
        }),
      )
    : []),
  ...(bunUuidV7
    ? [false, true].flatMap((explicitTime) =>
        [false, true].map((conditional): GenerationCase => {
          const repair = createNativeV7SlugClockRepair(conditional);
          return {
            comparable: "v7.slug.base64url.secure",
            implementation: "platform-v7-slug-clock-repair",
            name: `platform.bun-repair.v7.slug.base64url.${explicitTime ? "explicit" : "default"}.${conditional ? "conditional" : "always"}`,
            operation: () => {
              const now = Date.now();
              return repair(bunUuidV7("base64url", explicitTime ? now : undefined) as string, now);
            },
            qualification: "qualified",
            secure: true,
            version: 7,
            note: "Cached package-clock timestamp with native UUIDv7 payload; lower bound without package validation or native-failure fallback.",
          };
        }),
      )
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
  cryptoRandomUuidCase(cryptoRandomUuid),
];
// Compose native and host-only generators too; browser-only inventory cannot establish their floor.
const conversions = createConversionCases(Buffer, undefined, hostCases);

const smoke = process.argv.includes("--smoke");
const options = {
  durationMs: Number(process.env.UUID_SLUG_GENERATION_MS ?? (smoke ? 1 : 20)),
  samples: Number(process.env.UUID_SLUG_GENERATION_SAMPLES ?? (smoke ? 1 : 9)),
  warmupMs: Number(process.env.UUID_SLUG_GENERATION_WARMUP_MS ?? (smoke ? 2 : 32)),
  yieldControl: () => yieldToLoop(),
};
const filter = process.env.UUID_SLUG_GENERATION_FILTER;
const matchesName = generationNameFilter(filter);
const selected = [...hostCases, ...conversions.cases].filter((candidate) =>
  matchesName(candidate.name),
);
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
    unsupported: conversions.unsupported.filter(({ name }) => matchesName(name)),
  }),
);
for (const row of await measureGenerationCases(selected, options))
  console.log(JSON.stringify({ kind: "measurement", runtime, ...row }));
