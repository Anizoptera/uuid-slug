// SPDX-License-Identifier: Apache-2.0

// Count avoidable work in a fresh process; wrappers forward real operations and are never timed.
import { strict as assert } from "node:assert";
import crypto from "node:crypto";

const counts = {
  buffers: 0,
  slices: 0,
  errors: 0,
  views: 0,
  hex: 0,
  base64: 0,
  chars: 0,
  draws: 0,
};
const OriginalBytes = Uint8Array;
const OriginalError = Error;
const undo: (() => void)[] = [];
function wrapMethod(host: object, name: string, counter: keyof typeof counts): boolean {
  while (!Object.hasOwn(host, name) && Object.getPrototypeOf(host))
    host = Object.getPrototypeOf(host) as object;
  const descriptor = Object.getOwnPropertyDescriptor(host, name);
  if (!descriptor || typeof descriptor.value !== "function") return false;
  const original = descriptor.value as (...args: never[]) => unknown;
  Object.defineProperty(host, name, {
    ...descriptor,
    value(this: object, ...args: never[]) {
      counts[counter] += 1;
      return Reflect.apply(original, this, args);
    },
  });
  undo.push(() => Object.defineProperty(host, name, descriptor));
  return true;
}
globalThis.Uint8Array = new Proxy(OriginalBytes, {
  construct(target, args, newTarget) {
    counts.buffers += 1;
    return Reflect.construct(target, args, newTarget);
  },
});
globalThis.Error = new Proxy(OriginalError, {
  construct(target, args, newTarget) {
    counts.errors += 1;
    return Reflect.construct(target, args, newTarget);
  },
});
assert.ok(wrapMethod(OriginalBytes.prototype, "subarray", "views"));
assert.ok(wrapMethod(OriginalBytes.prototype, "slice", "slices"));
const hasHex = wrapMethod(OriginalBytes.prototype, "toHex", "hex");
const hasBase64 = wrapMethod(OriginalBytes.prototype, "toBase64", "base64");
assert.ok(wrapMethod(String.prototype, "charCodeAt", "chars"));
assert.ok(wrapMethod(crypto, "randomFillSync", "draws"));
assert.ok(wrapMethod(globalThis.crypto, "getRandomValues", "draws"));

try {
  const api: typeof import("../src/index") = await import(
    process.env.UUID_SLUG_PROFILE_MODULE ?? "@anizoptera/uuid-slug"
  );
  const id = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
  const compactId = id.replaceAll("-", "");
  const time = 0x0190a1b2c3d4;
  const bytes = api.uuidStringToBytes(id);
  assert.ok(!(bytes instanceof Error));
  const slug = api.uuidStringToDirectSlug(id);
  assert.equal(typeof slug, "string");
  const primary = { seed: "profile-current-seed" };
  const previous = { seed: "profile-previous-seed" };
  const codec = api.createUuidV7SlugCodec({
    mask: primary,
    sentinels: [{ name: "nil", uuid: "00000000-0000-7000-8000-000000000000" }],
  });
  const sentinelDefinitions = Array.from({ length: 16 }, (_, index) => ({
    name: `sentinel-${index}`,
    uuid: `00000000-0000-7000-8000-${index.toString(16).padStart(12, "0")}`,
  }));
  const indexedSentinelCodec = api.createUuidV7SlugCodec({
    mask: primary,
    sentinels: sentinelDefinitions,
  });
  const rotated = api.createUuidV7SlugCodec({ mask: primary, previousMasks: [previous] });
  const older = api.createUuidV7SlugCodec({ mask: previous });
  const migrationMasks = Array.from({ length: 16 }, (_, index) => ({
    seed: `profile-migration-seed-${index}`,
  }));
  const migrationMany = api.createUuidV7SlugCodec({
    mask: migrationMasks[0]!,
    previousMasks: migrationMasks.slice(1),
  });
  const migrationLast = api.createUuidV7SlugCodec({ mask: migrationMasks[15]! });
  assert.ok(!(codec instanceof Error));
  assert.ok(!(indexedSentinelCodec instanceof Error));
  assert.ok(!(rotated instanceof Error));
  assert.ok(!(older instanceof Error));
  assert.ok(!(migrationMany instanceof Error));
  assert.ok(!(migrationLast instanceof Error));
  const migration = rotated.createMigrationDecoder({
    acceptFixedMask: true,
    acceptDirectSlug: true,
  });
  const migrationManyReader = migrationMany.createMigrationDecoder();
  const masked = codec.uuidToSlug(id);
  const old = older.uuidToSlug(id);
  const migrationLastSlug = migrationLast.uuidToSlug(id);
  assert.equal(typeof masked, "string");
  assert.equal(typeof old, "string");
  assert.equal(typeof migrationLastSlug, "string");
  assert.ok(codec.slugToUuidString(old as string) instanceof Error);
  const into = new Uint8Array(24);
  let clocks = 0;
  const portable = api.createUuidV7Generator({
    readUnixMs: () => {
      clocks += 1;
      return time;
    },
  });
  const reset = () => {
    for (const key of Object.keys(counts) as (keyof typeof counts)[]) counts[key] = 0;
  };
  // Positive controls distinguish an absent operation from an instrument that never saw it.
  reset();
  new Uint8Array(16).subarray().slice();
  assert.ok(new api.UuidSlugError("invalid_uuid", "resource control") instanceof OriginalError);
  assert.ok(id.charCodeAt(process.pid % id.length) > 0);
  assert.ok(
    counts.buffers > 0 &&
      counts.slices > 0 &&
      counts.views > 0 &&
      counts.errors > 0 &&
      counts.chars > 0,
    JSON.stringify(counts),
  );
  function check(name: string, call: () => unknown, budgets: Partial<typeof counts>) {
    reset();
    const result = call();
    assert.ok(!(result instanceof Error), `${name}: unexpected error`);
    const measured = { ...counts };
    for (const [key, limit] of Object.entries(budgets))
      assert.ok(
        measured[key as keyof typeof counts] <= limit,
        `${name}: ${key}=${measured[key as keyof typeof counts]} exceeds ${limit}; inspect repeated decoding, temporary arrays or discarded diagnostics`,
      );
    console.log(JSON.stringify({ name, ...measured }));
  }
  assert.equal(api.generateUuidV4Bytes(into, 4), into, "initialize the entropy pool");
  check(
    "pooled v4 generation",
    () => {
      for (let i = 0; i < 1024; i += 1) api.generateUuidV4Bytes(into, 4);
    },
    { draws: 64, buffers: 0, views: 0, errors: 0 },
  );
  assert.ok(counts.draws > 0, "pooled entropy must reach an observed real source");
  for (const value of [id, id.slice(0, -1) + "!", "!".repeat(36)])
    check("UUID predicate", () => api.isUuidV7String(value), { buffers: 0, errors: 0, views: 0 });
  for (const value of [slug as string, (slug as string).slice(0, -1) + "B", "!".repeat(22)])
    check("slug predicate", () => api.isDirectUuidV7Slug(value), {
      buffers: 0,
      errors: 0,
      views: 0,
    });
  check("caller-owned UUID conversion", () => api.uuidStringToBytes(id, into, 4), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  check("caller-owned compact UUID conversion", () => api.uuidStringToBytes(compactId, into, 4), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  check("portable generation", () => portable.generateUuidV7Bytes(into, 4), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  assert.equal(clocks, 1, "one generator call must observe the clock once");
  assert.equal(api.generateUuidV7Bytes(into, 4), into, "initialize the package generator");
  check("caller-owned v7 generation", () => api.generateUuidV7Bytes(into, 4), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  check("exact UUID text conversion", () => api.bytesToUuidString(bytes), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  if (hasHex) assert.equal(counts.hex, 1, "available native hex must be used once");
  into.set(bytes, 4);
  check("small offset UUID text conversion", () => api.bytesToUuidString(into, 4), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  if (hasHex) assert.equal(counts.hex, 1, "small offsets must use one bounded native hex call");
  const oversized = new Uint8Array(256);
  oversized.set(bytes, 120);
  check("oversized offset UUID text conversion", () => api.bytesToUuidString(oversized, 120), {
    buffers: 0,
    views: hasHex ? 1 : 0,
    errors: 0,
  });
  if (hasHex) assert.equal(counts.hex, 1, "oversized offsets must convert only the UUID window");
  check("exact slug formatting", () => api.uuidBytesToDirectSlug(bytes), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  if (hasBase64) assert.equal(counts.base64, 1, "available native base64 must be used once");
  check("UUID text to slug", () => api.uuidStringToDirectSlug(id), {
    buffers: hasBase64 ? 1 : 0,
    views: 0,
    errors: 0,
  });
  check("UUID text to base32hex slug", () => api.uuidStringToDirectSlug(id, "base32hex"), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  check("previous-key decode", () => rotated.slugToUuidString(old as string), {
    errors: 0,
    chars: 22,
  });
  check(
    "plain timestamp validation",
    () =>
      api.validateDirectUuidV7SlugUnixMs(slug as string, {
        maxTimestampDeltaMs: 86_400_000,
        referenceUnixMs: time,
      }),
    {
      buffers: 1,
      errors: 0,
      hex: 0,
      chars: 22,
    },
  );
  check("migration first match", () => migration.slugToUuidString(old as string), {
    base64: 0,
    errors: 0,
    chars: 22,
    draws: 0,
  });
  check("migration candidates", () => migration.slugToUuidStringCandidates(old as string), {
    base64: 0,
    errors: 0,
    chars: 22,
    draws: 0,
  });
  check(
    "migration candidates with 16 masks",
    () => migrationManyReader.slugToUuidStringCandidates(migrationLastSlug as string),
    { slices: 1, errors: 0, chars: 22, draws: 0 },
  );
  check(
    "masked timestamp validation",
    () =>
      codec.validateUuidSlugUnixMs(masked as string, {
        maxTimestampDeltaMs: 86_400_000,
        referenceUnixMs: time,
      }),
    {
      buffers: 2,
      errors: 0,
      hex: 0,
      chars: 22,
    },
  );
  check("masked byte encode", () => codec.uuidToSlug(bytes), {
    buffers: 0,
    base64: 1,
    errors: 0,
    hex: 0,
    chars: 22,
  });
  const indexedSentinelBytes = api.uuidStringToBytes(sentinelDefinitions[15]!.uuid);
  assert.ok(!(indexedSentinelBytes instanceof Error));
  for (const [name, input] of [
    ["indexed sentinel byte hit", indexedSentinelBytes],
    ["indexed sentinel byte miss", bytes],
  ] as const)
    check(name, () => indexedSentinelCodec.uuidToSlug(input), {
      buffers: 0,
      slices: 0,
      views: 0,
      errors: 0,
    });
  check("masked string encode", () => codec.uuidToSlug(id), {
    buffers: 1,
    base64: 1,
    errors: 0,
    hex: 0,
  });
  check("masked byte decode", () => codec.slugToUuidBytes(masked as string), {
    buffers: 1,
    errors: 0,
    hex: 0,
    chars: 22,
  });
  const sentinel = codec.sentinels[0];
  assert.ok(sentinel);
  check("cached sentinel", () => codec.slugToUuidString(sentinel.slug), {
    buffers: 0,
    errors: 0,
    hex: 0,
    chars: 0,
  });
} finally {
  for (let i = undo.length - 1; i >= 0; i -= 1) undo[i]?.();
  globalThis.Uint8Array = OriginalBytes;
  globalThis.Error = OriginalError;
}
