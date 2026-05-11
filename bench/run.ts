import { performance } from "node:perf_hooks";
import { uuidv7 as kripodUuidV7 } from "@kripod/uuidv7";
import { uuid as fastUuidV7 } from "fastv7";
import { v4 as uuidV4, v7 as uuidV7 } from "uuid";
import { uuidv7 as uuidv7Js } from "uuidv7-js";
import { uuidv7 as uuidv7Package } from "uuidv7";
import { createUuidSlugCodec } from "../src/index";

const smoke = process.argv.includes("--smoke");
const iterations = Number(
  process.env.UUID_SLUG_BENCH_ITERATIONS ?? (smoke ? 10_000 : 1_000_000),
);
const stressCount = Number(
  process.env.UUID_SLUG_STRESS_COUNT ?? (smoke ? 1_000 : 100_000),
);
const codec = createUuidSlugCodec();

interface BenchCandidate {
  readonly name: string;
  readonly uuidV4?: () => string;
  readonly uuidV7?: () => string;
}

interface BunUuidGlobal {
  readonly Bun?: {
    randomUUIDv7?: (
      encoding?: "hex" | "buffer" | "base64url",
    ) => string | Uint8Array;
  };
}

const bunUuidV7 = (globalThis as BunUuidGlobal).Bun?.randomUUIDv7;

const candidates: readonly BenchCandidate[] = [
  {
    name: "package",
    uuidV4: () => codec.uuidV4(),
    uuidV7: () => codec.uuidV7(),
  },
  {
    name: "uuid",
    uuidV4: uuidV4,
    uuidV7: uuidV7,
  },
  {
    name: "uuidv7",
    uuidV7: uuidv7Package,
  },
  {
    name: "fastv7",
    uuidV7: fastUuidV7,
  },
  {
    name: "uuidv7-js",
    uuidV7: uuidv7Js,
  },
  {
    name: "@kripod/uuidv7",
    uuidV7: kripodUuidV7,
  },
  ...(bunUuidV7
    ? [
        {
          name: "bun-native",
          uuidV7: () => String(bunUuidV7("hex")),
        },
      ]
    : []),
];

function measure(name: string, fn: () => string) {
  for (let i = 0; i < 1_000; i += 1) fn();
  let blackhole = 0;
  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) blackhole ^= fn().charCodeAt(0);
  const elapsed = performance.now() - start;
  console.log(
    JSON.stringify({
      blackhole,
      elapsedMs: elapsed,
      iterations,
      name,
      opsPerSecond: Math.round((iterations / elapsed) * 1000),
    }),
  );
}

function uuidV7RandomPayload(uuid: string) {
  const hex = uuid.replaceAll("-", "");
  return `${hex.slice(13, 16)}${hex.slice(17)}`;
}

function stress(candidate: BenchCandidate) {
  if (!candidate.uuidV7) return;
  const uuidSet = new Set<string>();
  const payloadSet = new Set<string>();
  for (let i = 0; i < stressCount; i += 1) {
    const uuid = candidate.uuidV7();
    uuidSet.add(uuid);
    payloadSet.add(uuidV7RandomPayload(uuid));
  }
  const result = {
    candidate: candidate.name,
    kind: "v7.uniqueness",
    payloadCollisions: stressCount - payloadSet.size,
    samples: stressCount,
    uuidCollisions: stressCount - uuidSet.size,
  };
  console.log(JSON.stringify(result));
  if (result.uuidCollisions > 0 || result.payloadCollisions > 0) {
    throw new Error(`UUID v7 uniqueness stress failed for ${candidate.name}`, {
      cause: result,
    });
  }
}

for (const candidate of candidates) {
  if (candidate.uuidV4)
    measure(`${candidate.name}.v4.string`, candidate.uuidV4);
  if (candidate.uuidV7) {
    measure(`${candidate.name}.v7.string`, candidate.uuidV7);
    stress(candidate);
  }
}

measure("package.v7.slug", () => codec.uuidV7Slug());
measure("package.v7.maskedSlug", () => codec.uuidV7MaskedSlug());
