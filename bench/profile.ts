// SPDX-License-Identifier: Apache-2.0

// Profile the public package with varying inputs; keep setup, GC and reporting outside timed batches.
import { performance } from "node:perf_hooks";
import { setImmediate as yieldToLoop } from "node:timers/promises";
import originalFixtures from "../rust/uuid-slug/tests/fixtures/fixtures-original-slugs.json";

const beforeImport = performance.now();
const api: typeof import("../src/index") = await import(
  process.env.UUID_SLUG_PROFILE_MODULE ?? "@anizoptera/uuid-slug"
);
const importMs = performance.now() - beforeImport;
const unwrap = <T>(value: T | InstanceType<typeof api.UuidSlugError>): T => {
  if (value instanceof Error) throw value;
  return value;
};
const instant = 1_725_000_000_000;
const now = { now: () => instant };
const current = { seed: "profile-current-seed" };
const previous = { seed: "profile-previous-seed" };
const codec = api.createUuidSlugCodec({ mask: current });
const older = api.createUuidSlugCodec({ mask: previous });
const rotated = api.createUuidSlugCodec({ mask: current, previousMasks: [previous] });
const migration = rotated.migration({ original: true, plain: true });
const originals = originalFixtures.issued.filter(({ slug, raw }) => slug !== raw);
const portable = api.createUuidV7Generator({
  clock: () => instant,
  fillRandom: (bytes) => crypto.getRandomValues(bytes),
});
// Fixed, varied payloads make separate runtime/revision processes exercise the same inputs.
const ids = Array.from({ length: 256 }, (_, i) => {
  const time = (instant + i).toString(16).padStart(12, "0");
  const a = ((i * 251) & 4095).toString(16).padStart(3, "0");
  const b = (0x8000 | ((i * 31337) & 16383)).toString(16);
  const tail = (Math.imul(i + 1, 0x9e3779b1) >>> 0).toString(16).padStart(8, "0");
  return `${time.slice(0, 8)}-${time.slice(8)}-7${a}-${b}-${tail}${i.toString(16).padStart(4, "0")}`;
});
const raw = ids.map((id) => unwrap(api.parseUuid(id)));
const slugs = ids.map((id) => unwrap(api.uuidToSlug(id)));
const base32 = ids.map((id) => unwrap(api.uuidToSlug(id, "base32hex")));
const masked = ids.map((id) => unwrap(codec.uuidV7ToMaskedSlug(id)));
const old = ids.map((id) => unwrap(older.uuidV7ToMaskedSlug(id)));
// A check can pass under the wrong key. Keep only witnesses that actually reach the previous key.
const oldOnly = old.filter((slug) => codec.maskedSlugToUuidV7(slug) instanceof Error);
if (oldOnly.length === 0) throw new Error("No previous-key-only fixtures");
const into = new Uint8Array(24);
const sentinel = codec.sentinels[0];
if (!sentinel) throw new Error("Missing sentinel fixture");
const badUuid = "z".repeat(36);
const badSlug = "!".repeat(22);
const cases: Record<
  string,
  (i: number) => string | number | boolean | Uint8Array | Error | object
> = {
  control: (i) => ids[i & 255] as string,
  "v4.string": () => api.uuidV4(),
  "v7.string": () => api.uuidV7(),
  "v4.bytes": () => api.uuidV4Bytes(),
  "v4.into": () => api.uuidV4Bytes(into, 4),
  "v7.bytes": () => api.uuidV7Bytes(),
  "v7.into": () => api.uuidV7Bytes(into, 4),
  "v7.at": (i) => api.uuidV7At(instant + (i & 255)),
  "v7.at.into": (i) => api.uuidV7BytesAt(instant + (i & 255), into, 4),
  "portable.string": () => portable.uuidV7(),
  "portable.into": () => portable.uuidV7Bytes(into, 4),
  "v4.slug": () => api.uuidV4Slug(),
  "v7.slug": () => api.uuidV7Slug(),
  "v7.base32": () => api.uuidV7Slug("base32hex"),
  parse: (i) => api.parseUuid(ids[i & 255] as string),
  "parse.into": (i) => api.parseUuid(ids[i & 255] as string, into, 4),
  format: (i) => api.formatUuid(raw[i & 255] as Uint8Array),
  "plain.encode": (i) => api.uuidToSlug(ids[i & 255] as string),
  "plain.decode": (i) => api.slugToUuid(slugs[i & 255] as string),
  "base32.encode": (i) => api.uuidToSlug(ids[i & 255] as string, "base32hex"),
  "base32.decode": (i) => api.slugToUuid(base32[i & 255] as string),
  "slug.into": (i) => api.parseUuidSlug(slugs[i & 255] as string, into, 4),
  "guard.invalid.uuid": () => api.isUuidV7String(badUuid),
  "guard.invalid.slug": () => api.isUuidV7Slug(badSlug),
  "guard.uuid": (i) => api.isUuidV7String(ids[i & 255]),
  "guard.slug": (i) => api.isUuidV7Slug(slugs[i & 255]),
  "fresh.uuid": (i) => api.validateUuidV7Fresh(ids[i & 255] as string, now),
  "fresh.slug": (i) => api.validateUuidV7SlugFresh(slugs[i & 255] as string, now),
  "fresh.masked": (i) => codec.validateMaskedSlugFresh(masked[i & 255] as string, now),
  "masked.generate": () => codec.uuidV7MaskedSlug(),
  "masked.encode": (i) => codec.uuidV7ToMaskedSlug(ids[i & 255] as string),
  "masked.decode": (i) => codec.maskedSlugToUuidV7(masked[i & 255] as string),
  "rotation.current": (i) => rotated.maskedSlugToUuidV7(masked[i & 255] as string),
  "rotation.previous": (i) => rotated.maskedSlugToUuidV7(oldOnly[i % oldOnly.length] as string),
  "migration.current": (i) => migration.decode(masked[i & 255] as string),
  "migration.previous": (i) => migration.decode(oldOnly[i % oldOnly.length] as string),
  "migration.candidates": (i) => migration.candidates(masked[i & 255] as string),
  "migration.plain": (i) => migration.decode(slugs[i & 255] as string, "plain"),
  "migration.base32": (i) => migration.decode(base32[i & 255] as string, "plain"),
  "migration.original": (i) => migration.decode(originals[i % originals.length]!.slug, "original"),
  "sentinel.encode": () => codec.uuidV7ToMaskedSlug(sentinel.uuid),
  "sentinel.decode": () => codec.maskedSlugToUuidV7(sentinel.slug),
  "invalid.uuid": () => api.parseUuid(badUuid),
  "invalid.slug": () => api.parseUuidSlug(badSlug),
  "invalid.mask": (i) => codec.maskedSlugToUuidV7(oldOnly[i % oldOnly.length] as string),
  "construct.codec": () => api.createUuidSlugCodec({ mask: current }),
  "construct.schema": () => api.createMaskSchema(current),
};
let sink = 0;
function batch(
  fn: (i: number) => ReturnType<(typeof cases)[string]>,
  count: number,
  expectedError: boolean,
) {
  for (let i = 0; i < count; i += 1) {
    const value = fn(i);
    if (expectedError !== value instanceof Error)
      throw new Error("Profile operation changed its expected success/failure outcome", {
        cause: value,
      });
    if (typeof value === "string") sink ^= value.charCodeAt(i % value.length);
    else if (typeof value === "number") sink ^= value;
    else if (typeof value === "boolean") sink ^= Number(value);
    else if (value instanceof Uint8Array) sink ^= value[i % value.length] as number;
    else if (value instanceof Error) sink ^= value.message.length;
    else sink ^= Object.keys(value).length;
  }
}
const gc = (globalThis as { gc?: () => void }).gc;
const filter = process.env.UUID_SLUG_PROFILE_FILTER;
const samples = Number(process.env.UUID_SLUG_PROFILE_SAMPLES ?? 7);
const duration = Number(process.env.UUID_SLUG_PROFILE_MS ?? 20);
if (!Number.isSafeInteger(samples) || samples < 1 || !Number.isFinite(duration) || duration <= 0)
  throw new Error("Profile samples must be a positive integer and duration positive milliseconds");
const selected = Object.entries(cases).filter(([name]) => !filter || name.includes(filter));
if (selected.length === 0) throw new Error("Profile filter selected no cases");
console.log(
  JSON.stringify({
    runtime: process.versions.bun ? `bun ${process.versions.bun}` : `node ${process.version}`,
    executable: process.execPath,
    importMs,
    gc: Boolean(gc),
    samples,
    duration,
  }),
);
for (const [name, fn] of selected) {
  const witness = fn(0);
  if (name.startsWith("invalid.") !== witness instanceof Error)
    throw new Error(`Unexpected outcome for ${name}`, { cause: witness });
  const expectedError = name.startsWith("invalid.");
  batch(fn, 2048, expectedError);
  gc?.();
  const heapBefore = process.memoryUsage();
  const cpuBefore = process.cpuUsage();
  const ns: number[] = [];
  let maxBatchMs = 0;
  let maxUninterruptedMs = 0;
  let operations = 0;
  for (let sample = 0; sample < samples; sample += 1) {
    let count = 0;
    const start = performance.now();
    let elapsed = 0;
    do {
      const began = performance.now();
      batch(fn, 256, expectedError);
      maxBatchMs = Math.max(maxBatchMs, performance.now() - began);
      count += 256;
      elapsed = performance.now() - start;
    } while (elapsed < duration);
    maxUninterruptedMs = Math.max(maxUninterruptedMs, elapsed);
    ns.push((elapsed * 1e6) / count);
    operations += count;
    await yieldToLoop();
  }
  const cpu = process.cpuUsage(cpuBefore);
  const heapAfter = process.memoryUsage();
  gc?.();
  const retained = process.memoryUsage();
  ns.sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      name,
      ns,
      operations,
      maxBatchMs,
      maxUninterruptedMs,
      sink,
      cpuUs: cpu.user + cpu.system,
      heapDelta: heapAfter.heapUsed - heapBefore.heapUsed,
      retainedDelta: retained.heapUsed - heapBefore.heapUsed,
      rss: retained.rss,
      arrayBuffers: retained.arrayBuffers,
    }),
  );
}
