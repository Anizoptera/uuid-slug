// SPDX-License-Identifier: Apache-2.0

// Compare related operations in alternating order; ratios tolerate host speed, not repeated work.
import { strict as assert } from "node:assert";
import { performance } from "node:perf_hooks";
import { setImmediate as yieldToLoop } from "node:timers/promises";

import { unwrap } from "../dev/unwrap";

const api: typeof import("../src/index") = await import(
  process.env.UUID_SLUG_PROFILE_MODULE ?? "@anizoptera/uuid-slug"
);
const ids = Array.from(
  { length: 256 },
  (_, i) => `0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f${i.toString(16).padStart(4, "0")}`,
);
const compactIds = ids.map((id) => id.replaceAll("-", ""));
const slugs = ids.map((id) => unwrap(api.uuidStringToPlainSlug(id)));
const codec = unwrap(api.createUuidV7MaskingCodec({ mask: { seed: "profile-current-seed" } }));
const older = unwrap(api.createUuidV7MaskingCodec({ mask: { seed: "profile-previous-seed" } }));
const rotated = unwrap(
  api.createUuidV7MaskingCodec({
    mask: { seed: "profile-current-seed" },
    previousMasks: [{ seed: "profile-previous-seed" }],
  }),
);
const masked = ids.map((id) => unwrap(codec.uuidToMaskedSlug(id)));
const old = ids
  .map((id) => unwrap(older.uuidToMaskedSlug(id)))
  .filter((slug) => codec.maskedSlugToUuidString(slug) instanceof Error);
assert.ok(old.length > 0);
const timestampWindow = {
  maxTimestampDeltaMs: 86_400_000,
  referenceUnixMs: 0x0190a1b2c3d4,
};
type Operation = (index: number) => unknown;
// These are coarse regression budgets, not public latency promises. Paired primitives set the
// local speed reference; resource counters catch smaller regressions without noisy timing limits.
// The slug guard uses check.ts's packed committed-code comparison: version/variant checks are
// different work from decoding, so decoder speed supplies no valid regression budget for it.
const pairs: { name: string; subject: Operation; reference: Operation; limit: number }[] = [
  {
    name: "compact UUID parsing / hyphenated UUID parsing",
    subject: (i) => api.uuidStringToBytes(compactIds[i & 255] as string),
    reference: (i) => api.uuidStringToBytes(ids[i & 255] as string),
    limit: 1.5,
  },
  {
    name: "UUID guard / parsing",
    subject: (i) => api.isUuidV7String(ids[i & 255]),
    reference: (i) => api.uuidStringToBytes(ids[i & 255] as string),
    limit: 1.5,
  },
  {
    name: "plain timestamp validation / decoding",
    subject: (i) => api.validatePlainUuidV7SlugUnixMs(slugs[i & 255] as string, timestampWindow),
    reference: (i) => api.uuidToBytes(slugs[i & 255] as string),
    limit: 3,
  },
  {
    name: "masked timestamp validation / decoding",
    subject: (i) =>
      codec.validateMaskedUuidV7SlugUnixMs(masked[i & 255] as string, timestampWindow),
    reference: (i) => codec.maskedSlugToUuidString(masked[i & 255] as string),
    limit: 1.5,
  },
  {
    name: "previous key / current key",
    subject: (i) => rotated.maskedSlugToUuidString(old[i % old.length] as string),
    reference: (i) => rotated.maskedSlugToUuidString(masked[i & 255] as string),
    limit: 3,
  },
];
let sink: unknown;
function measure(operation: Operation): number {
  let calls = 0;
  const start = performance.now();
  // Wall time bounds the sample; process CPU excludes scheduler pauses that can dwarf this short lane.
  const cpuStart = process.cpuUsage();
  do {
    for (let i = 0; i < 256; i += 1) {
      sink = operation(i);
      if (sink instanceof Error) throw sink;
    }
    calls += 256;
  } while (performance.now() - start < 3);
  const cpu = process.cpuUsage(cpuStart);
  return (cpu.user + cpu.system) / calls;
}
for (const pair of pairs) {
  // A small fixed call count can finish before the engine compiles either operation, putting
  // compilation into the first timing samples. Warm both sides for the competitor matrix's normal
  // preparation window; retain the existing budgets and all measured ratios.
  const warmupStart = performance.now();
  do {
    for (let i = 0; i < 4096; i += 1) {
      unwrap(pair.subject(i));
      unwrap(pair.reference(i));
    }
  } while (performance.now() - warmupStart < 32);
  const ratios: number[] = [];
  for (let round = 0; round < 9; round += 1) {
    let subject: number;
    let reference: number;
    if (round % 2) {
      subject = measure(pair.subject);
      reference = measure(pair.reference);
    } else {
      reference = measure(pair.reference);
      subject = measure(pair.subject);
    }
    ratios.push(subject / reference);
    await yieldToLoop();
  }
  ratios.sort((a, b) => a - b);
  const median = ratios[Math.floor(ratios.length / 2)] as number;
  console.log(JSON.stringify({ name: pair.name, ratios, median, limit: pair.limit }));
  assert.ok(
    median <= pair.limit,
    `${pair.name}: median ratio ${median.toFixed(2)} exceeds ${pair.limit}. Reproduce alone on this runtime; inspect the subject and reference profiles before changing the budget.`,
  );
}
assert.notEqual(sink, undefined);
