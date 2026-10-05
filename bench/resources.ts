// SPDX-License-Identifier: Apache-2.0

// Count avoidable work in a fresh process; wrappers forward real operations and are never timed.
import { strict as assert } from "node:assert";
import { createBoundsProfileCases } from "./profile-bounds";

const counts = {
  buffers: 0,
  copies: 0,
  slices: 0,
  errors: 0,
  views: 0,
  hex: 0,
  base64: 0,
  latin1: 0,
  fromCharCodes: 0,
  chars: 0,
  textSlices: 0,
  draws: 0,
  nativeV7: 0,
  nativeV4: 0,
  weakWrites: 0,
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
assert.ok(wrapMethod(OriginalBytes.prototype, "set", "copies"));
// Verify the counter on the same intrinsic before package import captures any methods.
const copyControl = new OriginalBytes(1);
const copiesBefore = counts.copies;
copyControl.set(new OriginalBytes([7]));
assert.equal(copyControl[0], 7);
assert.equal(counts.copies, copiesBefore + 1);
assert.ok(wrapMethod(OriginalBytes.prototype, "slice", "slices"));
wrapMethod(OriginalBytes.prototype, "toHex", "hex");
const hasNativeBase64 = wrapMethod(OriginalBytes.prototype, "toBase64", "base64");
if (
  typeof Bun !== "undefined" &&
  wrapMethod(globalThis.Buffer.prototype, "base64urlSlice", "base64")
) {
  // Count the direct native entry separately from Buffer.toString. A plain array control proves
  // the wrapper reaches the operation before package import captures the optional capability.
  const slice = (
    globalThis.Buffer.prototype as {
      base64urlSlice?: (this: Uint8Array, start: number, end: number) => string;
    }
  ).base64urlSlice;
  assert.ok(slice);
  const before = counts.base64;
  assert.equal(slice.call(new OriginalBytes([1]), 0, 1), "AQ");
  assert.equal(counts.base64, before + 1);
}
// Count character-code and native Latin-1 writers separately where each is actually selected.
const hasLatin1Text =
  typeof globalThis.Buffer === "function" &&
  wrapMethod(globalThis.Buffer.prototype, "toString", "latin1");
const usesLatin1Text = typeof Bun !== "undefined" && hasLatin1Text;
if (usesLatin1Text && wrapMethod(globalThis.Buffer.prototype, "latin1Slice", "latin1")) {
  // Bun's generic toString does not call this property; count either native entry once.
  // The independent control proves direct string construction reaches the added instrument.
  const probe = globalThis.Buffer.from("x") as Uint8Array & {
    latin1Slice?: (this: Uint8Array, start: number, end: number) => string;
  };
  const slice = probe.latin1Slice;
  assert.equal(typeof slice, "function");
  assert.ok(slice);
  const before = counts.latin1;
  assert.equal(slice.call(probe, 0, 1), "x");
  assert.equal(counts.latin1, before + 1);
}
assert.ok(wrapMethod(String, "fromCharCode", "fromCharCodes"));
const expectTextFormatter = (message: string) => {
  if (usesLatin1Text) assert.equal(counts.latin1, 1, `native Latin-1 text: ${message}`);
  else assert.equal(counts.fromCharCodes, 1, `fixed character-code text: ${message}`);
};
assert.ok(wrapMethod(String.prototype, "charCodeAt", "chars"));
assert.ok(wrapMethod(String.prototype, "slice", "textSlices"));
// Browser calls use real Web Crypto below. Loading a Node crypto polyfill would instrument
// unrelated work and conceal which platform source the package actually selected.
if (typeof process !== "undefined" && process.versions?.node) {
  const { default: crypto } = await import("node:crypto");
  assert.ok(wrapMethod(crypto, "randomFillSync", "draws"));
  assert.ok(wrapMethod(crypto, "randomUUID", "nativeV4"));
}
wrapMethod(globalThis.crypto, "randomUUID", "nativeV4");
assert.ok(wrapMethod(globalThis.crypto, "getRandomValues", "draws"));
assert.ok(wrapMethod(WeakMap.prototype, "set", "weakWrites"));
const hasNativeUuidV7 = typeof Bun !== "undefined" && typeof Bun.randomUUIDv7 === "function";
if (hasNativeUuidV7) assert.ok(wrapMethod(Bun, "randomUUIDv7", "nativeV7"));

try {
  const api: typeof import("../src/index") = await import(
    process.env.UUID_SLUG_PROFILE_MODULE ?? "@anizoptera/uuid-slug"
  );
  const id = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
  const compactId = id.replaceAll("-", "");
  const time = 0x0190a1b2c3d4;
  const bytes = api.uuidStringToBytes(id);
  assert.ok(!(bytes instanceof Error));
  const slug = api.uuidStringToPlainSlug(id);
  assert.equal(typeof slug, "string");
  const primary = { seed: "profile-current-seed" };
  const previous = { seed: "profile-previous-seed" };
  const codec = api.createUuidV7MaskingCodec({
    mask: primary,
    sentinels: [{ name: "nil", uuid: "00000000-0000-7000-8000-000000000000" }],
  });
  const sentinelDefinitions = Array.from({ length: 16 }, (_, index) => ({
    name: `sentinel-${index}`,
    uuid: `00000000-0000-7000-8000-${index.toString(16).padStart(12, "0")}`,
  }));
  const indexedSentinelCodec = api.createUuidV7MaskingCodec({
    mask: primary,
    sentinels: sentinelDefinitions,
  });
  const rotated = api.createUuidV7MaskingCodec({ mask: primary, previousMasks: [previous] });
  const older = api.createUuidV7MaskingCodec({ mask: previous });
  const base32Codec = api.createUuidV7MaskingCodec({
    mask: primary,
    maskedSlugAlphabet: api.BASE32HEX,
  });
  const migrationMasks = Array.from({ length: 16 }, (_, index) => ({
    seed: `profile-migration-seed-${index}`,
  }));
  const migrationMany = api.createUuidV7MaskingCodec({
    mask: migrationMasks[0]!,
    previousMasks: migrationMasks.slice(1),
  });
  const migrationLast = api.createUuidV7MaskingCodec({ mask: migrationMasks[15]! });
  assert.ok(!(codec instanceof Error));
  assert.ok(!(indexedSentinelCodec instanceof Error));
  assert.ok(!(rotated instanceof Error));
  assert.ok(!(older instanceof Error));
  assert.ok(!(base32Codec instanceof Error));
  assert.equal(typeof base32Codec.uuidToMaskedSlug(bytes), "string");
  assert.ok(!(migrationMany instanceof Error));
  assert.ok(!(migrationLast instanceof Error));
  const migration = rotated.createUuidSlugMigrationDecoder({
    acceptFixedMask: true,
    acceptPlainSlug: true,
  });
  const migrationManyReader = migrationMany.createUuidSlugMigrationDecoder();
  const masked = codec.uuidToMaskedSlug(id);
  const old = older.uuidToMaskedSlug(id);
  const migrationLastSlug = migrationLast.uuidToMaskedSlug(id);
  assert.equal(typeof masked, "string");
  assert.equal(typeof old, "string");
  assert.equal(typeof migrationLastSlug, "string");
  assert.ok(codec.uuidToString(old as string) instanceof Error);
  const into = new Uint8Array(24);
  let clocks = 0;
  const portable = api.createUuidV7Generator({
    readUnixMs: () => {
      clocks += 1;
      return time;
    },
  });
  assert.ok(!(portable instanceof Error));
  const portableSubMillisecond = api.createUuidV7Generator({
    readUnixMs: () => time + 0.75,
    subMillisecondFractionBits: 12,
  });
  assert.ok(!(portableSubMillisecond instanceof Error));
  const selectedGenerator = api.createUuidV7Generator({ readUnixMs: () => time });
  assert.ok(!(selectedGenerator instanceof Error));
  // Formatting builds its case tables and text buffer on first use, not on every call.
  assert.equal(typeof api.bytesToUuidString(bytes, api.UUID_TEXT_UPPERCASE), "string");
  const reset = () => {
    for (const key of Object.keys(counts) as (keyof typeof counts)[]) counts[key] = 0;
  };
  // Positive controls distinguish an absent operation from an instrument that never saw it.
  reset();
  new Uint8Array(16).subarray().slice();
  assert.ok(new api.UuidSlugError("invalid_uuid", "resource control") instanceof OriginalError);
  assert.ok(id.charCodeAt(process.pid % id.length) > 0);
  assert.equal(id.slice(0, 1), "0");
  assert.equal(String.fromCharCode(65), "A");
  new WeakMap<object, number>().set(copyControl, 1);
  assert.ok(
    counts.buffers > 0 &&
      counts.slices > 0 &&
      counts.views > 0 &&
      counts.errors > 0 &&
      counts.chars > 0 &&
      counts.textSlices > 0 &&
      counts.weakWrites === 1 &&
      counts.fromCharCodes > 0,
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
  // Native text and portable formatting must both avoid temporary byte arrays after setup.
  // Byte-generation counters cannot catch work introduced only in the public text wrapper.
  for (const [name, textCase] of [
    ["default UUIDv4 text", api.UUID_TEXT_LOWERCASE],
    ["uppercase UUIDv4 text", api.UUID_TEXT_UPPERCASE],
  ] as const) {
    assert.equal(typeof api.generateUuidV4(textCase), "string");
    // Neither trusted native output nor the package's own writer needs to read its result back.
    check(name, () => api.generateUuidV4(textCase), { buffers: 0, views: 0, errors: 0, chars: 0 });
    if (typeof Bun !== "undefined")
      assert.equal(counts.nativeV4, 1, `${name}: preserve Bun's direct native selection`);
    if (counts.nativeV4) {
      assert.equal(counts.nativeV4, 1, `${name}: draw one native UUID, not discarded IDs`);
      assert.equal(counts.draws, 0, `${name}: native success must skip portable entropy`);
      assert.equal(counts.chars, 0, `${name}: trust native output without reparsing it`);
    }
  }
  // A fresh owned result needs one array. Extra temporary arrays repeat the removed copy work.
  for (const [name, call] of [
    ["default owned UUIDv4 bytes", () => api.generateUuidV4Bytes()],
    ["default owned UUIDv7 bytes", () => api.generateUuidV7Bytes()],
  ] as const)
    check(name, call, { buffers: 1, views: 0, errors: 0 });
  for (const value of [id, id.slice(0, -1) + "!", "!".repeat(36)])
    check("UUID predicate", () => api.isUuidV7String(value), { buffers: 0, errors: 0, views: 0 });
  for (const value of [slug as string, (slug as string).slice(0, -1) + "B", "!".repeat(22)])
    check("slug predicate", () => api.isPlainUuidV7Slug(value), {
      buffers: 0,
      errors: 0,
      views: 0,
    });
  // Canonical extraction must not recreate substrings after validating the complete UUID.
  // Native JITless parsing is checked separately by the real-process selection regression.
  for (const value of [id, id.toUpperCase()])
    check("canonical UUIDv7 timestamp", () => assert.equal(api.extractUuidV7UnixMs(value), time), {
      buffers: 0,
      views: 0,
      errors: 0,
      textSlices: 0,
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
  check(
    "uppercase UUID formatting",
    () => api.bytesToUuidString(into, 4, api.UUID_TEXT_UPPERCASE),
    {
      buffers: 0,
      views: 0,
      errors: 0,
    },
  );
  check("portable generation", () => portable.generateUuidV7Bytes(into, 4), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  check(
    "sub-millisecond portable generation",
    () => portableSubMillisecond.generateUuidV7Bytes(into, 4),
    { buffers: 0, views: 0, errors: 0 },
  );
  assert.ok(!(api.uuidV7StringBounds(time) instanceof Error), "initialize the lazy bounds table");
  check("UUIDv7 text bounds", () => api.uuidV7StringBounds(time), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  check("UUIDv7 byte bounds", () => api.uuidV7ByteBounds(time), {
    buffers: 2,
    views: 0,
    errors: 0,
  });
  for (const [name, call] of Object.entries(createBoundsProfileCases(api, time))) {
    if (!name.includes(".text")) continue;
    check(`consumed ${name}`, () => call(31), { buffers: 0, views: 0, errors: 0 });
    assert.equal(counts.chars, 2, "bounds timing must read both returned endpoint strings");
  }
  assert.equal(clocks, 1, "one generator call must observe the clock once");
  assert.equal(api.generateUuidV7Bytes(into, 4), into, "initialize the package generator");
  // Preset initialization must precede the pair: otherwise portable setup is already paid and
  // native defaults can construct an unnecessary generator without this witness noticing.
  check("default UUIDv7 preset text initialization", () => api.generateUuidV7(), {
    errors: 0,
  });
  const nativePreset = counts.nativeV7 > 0;
  // Availability is independent of package dispatch; observing zero must not bless lost delegation.
  if (hasNativeUuidV7)
    assert.equal(
      counts.nativeV7,
      1,
      "Bun default UUIDv7 text must reach its native generator once",
    );
  assert.equal(
    counts.buffers,
    nativePreset ? 0 : 1,
    "preset text: native calls must skip portable state; portable calls construct it once",
  );
  assert.equal(
    counts.views,
    nativePreset ? 0 : 1,
    "preset text: native calls need no entropy view; portable calls construct one",
  );
  check("default UUIDv7 preset slug initialization", () => api.generatePlainUuidV7Slug(), {
    errors: 0,
  });
  const nativeSlug = counts.nativeV7 > 0;
  if (hasNativeUuidV7)
    assert.equal(
      counts.nativeV7,
      1,
      "Bun default UUIDv7 slug must reach its native generator once",
    );
  assert.equal(counts.buffers, nativePreset && !nativeSlug ? 1 : 0);
  assert.equal(counts.views, nativePreset && !nativeSlug ? 1 : 0);
  // Portable text or slug presets initialize shared state; two native presets leave it lazy.
  // The pair must reuse shared scratch rather than allocate a duplicate text array.
  check("default UUIDv7 text-generator initialization", () => api.generateUuidV7WithPlainSlug(), {
    buffers: nativePreset && nativeSlug ? 1 : 0,
    views: nativePreset && nativeSlug ? 1 : 0,
    errors: 0,
  });
  check("default UUIDv7 pair", () => api.generateUuidV7WithPlainSlug(), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  assert.equal(
    counts.latin1 + counts.fromCharCodes + counts.base64,
    2,
    "the pair must construct exactly its UUID and slug strings",
  );
  check("default UUIDv7 preset text", () => api.generateUuidV7(), {
    buffers: 0,
    views: 0,
    errors: 0,
    textSlices: 0,
  });
  assert.equal(
    counts.latin1 + counts.fromCharCodes + counts.base64 + counts.nativeV7,
    1,
    "preset generation must use exactly one native ID or portable string writer",
  );
  if (counts.nativeV7) {
    assert.equal(counts.draws, 0, "native UUIDv7 text must not also draw portable entropy");
    assert.equal(counts.chars, 0, "trusted native UUIDv7 text must not reparse every UUID");
  }
  check("default UUIDv7 preset slug", () => api.generatePlainUuidV7Slug(), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  if (counts.nativeV7) {
    assert.equal(counts.draws, 0, "native UUIDv7 slugs must skip portable entropy");
    assert.equal(counts.chars, 0, "trusted native UUIDv7 slugs must skip repeated validation");
    assert.equal(counts.latin1 + counts.fromCharCodes + counts.base64, 0);
    assert.equal(counts.nativeV7, 1, "one slug call must draw exactly one native UUID");
  }
  check("caller-owned v7 generation", () => api.generateUuidV7Bytes(into, 4), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  const entropyBurst = Number(process.env.UUID_SLUG_RESOURCE_ENTROPY_BURST ?? 0);
  if (
    !Number.isSafeInteger(entropyBurst) ||
    (process.env.UUID_SLUG_RESOURCE_ENTROPY_BURST !== undefined && entropyBurst <= 0)
  )
    throw new Error("UUID_SLUG_RESOURCE_ENTROPY_BURST must be a positive safe call count when set");
  if (entropyBurst) {
    // Real pooled refills expose entropy cost that a warmed single draw can hide; this is not timed.
    check(
      "caller-owned v7 entropy burst",
      () => {
        let sink = 0;
        for (let index = 0; index < entropyBurst; index++) {
          assert.equal(api.generateUuidV7Bytes(into, 4), into);
          sink ^= into[4 + (index & 15)] as number;
        }
        return sink;
      },
      { buffers: 0, views: 0, errors: 0 },
    );
  }
  check(
    "selected-generator owned v7 generation",
    () => api.generateUuidV7Bytes({ generator: selectedGenerator }),
    {
      buffers: 2,
      views: 0,
      errors: 0,
    },
  );
  check(
    "selected-generator caller-owned v7 generation",
    () => api.generateUuidV7Bytes({ generator: selectedGenerator, output: into, outputOffset: 4 }),
    { buffers: 1, views: 0, errors: 0 },
  );
  check("exact UUID text conversion", () => api.bytesToUuidString(bytes), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  expectTextFormatter("must be used once");
  into.set(bytes, 4);
  check("small offset UUID text conversion", () => api.bytesToUuidString(into, 4), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  expectTextFormatter("small offsets must use one bounded call");
  const oversized = new Uint8Array(256);
  oversized.set(bytes, 120);
  check("oversized offset UUID text conversion", () => api.bytesToUuidString(oversized, 120), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  expectTextFormatter("oversized offsets must convert only the UUID window");
  check("exact slug formatting", () => api.uuidBytesToPlainSlug(bytes), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  // Slug and UUID writers may select different constructors. Count each actual string method
  // rather than infer slug construction from the UUID text formatter selected on this host.
  assert.equal(
    counts.latin1 + counts.fromCharCodes + counts.base64,
    1,
    "plain slug text must be constructed once",
  );
  if (typeof Bun !== "undefined" && hasNativeBase64)
    assert.equal(counts.base64, 1, "ordinary Bun base64url must reach its native encoder once");
  check("exact base32hex slug formatting", () => api.uuidBytesToPlainSlug(bytes, api.BASE32HEX), {
    buffers: 0,
    views: 0,
    errors: 0,
    base64: 0,
  });
  expectTextFormatter("base32hex must keep its direct writer");
  check("masked base32hex formatting", () => base32Codec.uuidToMaskedSlug(bytes), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  expectTextFormatter("the 27-character masked slug must be constructed once");
  check("UUID text to slug", () => api.uuidStringToPlainSlug(id), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  check("UUID text to base32hex slug", () => api.uuidStringToPlainSlug(id, "base32hex"), {
    buffers: 0,
    views: 0,
    errors: 0,
  });
  check("previous-key decode", () => rotated.maskedSlugToUuidString(old as string), {
    errors: 0,
    chars: 22,
  });
  check(
    "plain timestamp validation",
    () =>
      api.validatePlainUuidV7SlugUnixMs(slug as string, {
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
  check("migration first match", () => migration.uuidSlugToUuidString(old as string), {
    base64: 0,
    errors: 0,
    chars: 22,
    draws: 0,
  });
  check("migration candidates", () => migration.uuidSlugToUuidStringCandidates(old as string), {
    base64: 0,
    errors: 0,
    chars: 22,
    draws: 0,
  });
  check(
    "migration candidates with 16 masks",
    () => migrationManyReader.uuidSlugToUuidStringCandidates(migrationLastSlug as string),
    { slices: 1, errors: 0, chars: 22, draws: 0 },
  );
  check(
    "masked timestamp validation",
    () =>
      codec.validateMaskedUuidV7SlugUnixMs(masked as string, {
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
  check("masked byte encode", () => codec.uuidToMaskedSlug(bytes), {
    buffers: 0,
    copies: 1,
    base64: 1,
    errors: 0,
    hex: 0,
    chars: 22,
  });
  // Warm lazy generator state before counting per-ID work; setup is a different resource boundary.
  assert.ok(!(api.generateUuidV7Value() instanceof Error));
  // One private payload array backs the retained value; discarded arrays are avoidable work.
  check("root UUIDv7 value", () => api.generateUuidV7Value(), {
    buffers: 1,
    views: 0,
    copies: 0,
    slices: 0,
    errors: 0,
  });
  for (const [name, call] of [
    ["default masked UUIDv7 slug", () => codec.generateMaskedUuidV7Slug()],
    ["base32 masked UUIDv7 slug", () => base32Codec.generateMaskedUuidV7Slug()],
    ["default masked UUIDv7 pair", () => codec.generateUuidV7WithMaskedSlug()],
    ["base32 masked UUIDv7 pair", () => base32Codec.generateUuidV7WithMaskedSlug()],
    ["codec UUIDv7 value", () => codec.generateUuidV7Value()],
  ] as const) {
    assert.ok(!(call() instanceof Error));
    // The current generator constructs one payload array; fewer allocations remain permitted.
    // Count extra arrays separately from timing so valid identifiers cannot hide discarded work.
    check(name, call, { buffers: 1, views: 0, copies: 0, slices: 0, errors: 0 });
  }
  const indexedSentinelBytes = api.uuidStringToBytes(sentinelDefinitions[15]!.uuid);
  assert.ok(!(indexedSentinelBytes instanceof Error));
  for (const [name, input] of [
    ["indexed sentinel byte hit", indexedSentinelBytes],
    ["indexed sentinel byte miss", bytes],
  ] as const)
    check(name, () => indexedSentinelCodec.uuidToMaskedSlug(input), {
      buffers: 0,
      slices: 0,
      views: 0,
      errors: 0,
    });
  check("masked string encode", () => codec.uuidToMaskedSlug(id), {
    buffers: 0,
    copies: 0,
    base64: 1,
    errors: 0,
    hex: 0,
  });
  check("masked base32hex string encode", () => base32Codec.uuidToMaskedSlug(id), {
    buffers: 0,
    copies: 0,
    views: 0,
    errors: 0,
  });
  check("masked byte decode", () => codec.maskedSlugToUuidBytes(masked as string), {
    buffers: 1,
    errors: 0,
    hex: 0,
    chars: 22,
  });
  // A plain slug the codec check rejects must reach the plain reading without a discarded error.
  assert.ok(codec.maskedSlugToUuidString(slug as string) instanceof Error);
  check("codec plain slug read", () => codec.uuidToString(slug as string), { errors: 0 });
  const parsed = api.parseUuid(id);
  check("owned generic UUID text decode", () => api.uuidToBytes(id), { buffers: 1, errors: 0 });
  check("owned generic plain slug decode", () => api.uuidToBytes(slug), { buffers: 1, errors: 0 });
  assert.ok(!(parsed instanceof Error));
  // Private validated bytes need no decoding arrays, views or diagnostic objects.
  for (const [name, call] of [
    ["parsed UUID direct text", () => parsed.toString()],
    ["parsed UUID uppercase text", () => parsed.toString(api.UUID_TEXT_UPPERCASE)],
    ["parsed UUID JSON text", () => parsed.toJSON()],
    ["parsed UUID inspection", () => parsed.inspect()],
    ["parsed UUID direct slug", () => parsed.toPlainSlug()],
    ["parsed UUID base32 slug", () => parsed.toPlainSlug(api.BASE32HEX)],
  ] as const)
    check(name, call, { buffers: 0, views: 0, errors: 0 });
  check("parsed UUID text conversion", () => api.uuidToString(parsed), { buffers: 0, errors: 0 });
  check("parsed UUID masked encode", () => codec.uuidToMaskedSlug(parsed), { errors: 0 });
  check("parsed UUID from text", () => api.parseUuid(id), {
    buffers: 1,
    errors: 0,
    weakWrites: 0,
  });
  check("parsed UUID from bytes", () => api.parseUuid(bytes), {
    buffers: 1,
    errors: 0,
    weakWrites: 0,
  });
  // Canonical lowercase text is already the default output, so it must not be parsed and rebuilt.
  const canonical = { buffers: 0, errors: 0, hex: 0, chars: 0 };
  check("canonical UUID text", () => api.uuidToString(id), canonical);
  check("codec canonical UUID text", () => codec.uuidToString(id), canonical);
  const sentinel = codec.sentinels[0];
  assert.ok(sentinel);
  check("cached sentinel", () => codec.uuidToString(sentinel.slug), {
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
