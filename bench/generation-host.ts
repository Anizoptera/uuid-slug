// SPDX-License-Identifier: Apache-2.0

import { setImmediate as yieldToLoop } from "node:timers/promises";
import crypto from "node:crypto";
import cryptoRandomUuid from "crypto-randomuuid";

import { generationCases } from "./generation-cases";
import type { GenerationCase } from "./generation-cases";
import { measureGenerationCases } from "./generation-measure";

const nativeUuidV7 = (crypto as { randomUUIDv7?: () => string }).randomUUIDv7?.bind(crypto);

const bunUuidV7 = (
  globalThis as {
    Bun?: { randomUUIDv7?: (encoding?: "base64url" | "buffer" | "hex") => string | Uint8Array };
  }
).Bun?.randomUUIDv7;

const hostCases: readonly GenerationCase[] = [
  ...generationCases,
  ...(bunUuidV7
    ? (
        [
          ["platform.bun.v7.text", "v7.text.secure", () => bunUuidV7()],
          // A Node `Buffer`, not the plain `Uint8Array` this package returns; timed as a floor only.
          ["platform.bun.v7.bytes.allocate", "v7.bytes.allocate.secure", () => bunUuidV7("buffer")],
          [
            "platform.bun.v7.slug.base64url",
            "v7.slug.base64url.secure",
            () => bunUuidV7("base64url"),
          ],
        ] as const
      ).map(([name, comparable, operation]) => ({
        comparable,
        implementation: "platform",
        name,
        operation,
        qualification: "qualified" as const,
        secure: true,
        version: 7 as const,
      }))
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
  }),
);
for (const row of await measureGenerationCases(selected, options))
  console.log(JSON.stringify({ kind: "measurement", runtime, ...row }));
