import type * as Api from "@anizoptera/uuid-slug";
import fixtures from "../rust/uuid-slug/tests/fixtures/fixtures-original-slugs.json";
import { unwrap } from "../dev/unwrap";

function equal(actual: unknown, expected: unknown, context: string): void {
  if (actual !== expected)
    throw new Error(`${context}: expected ${String(expected)}, received ${String(actual)}`);
}

const fillWithZeros = (bytes: Uint8Array) => {
  bytes.fill(0);
};

/** Exercise public calls through the module supplied by the consumer's own resolver. */
export async function probeConsumer(api: typeof Api): Promise<void> {
  equal(api.MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS, 2 ** 42 - 1, "masked timestamp offset");
  equal(api.NIL_UUID, "00000000-0000-0000-0000-000000000000", "canonical nil UUID");
  equal(api.MAX_UUID, "ffffffff-ffff-ffff-ffff-ffffffffffff", "canonical max UUID");
  equal(api.extractUuidVersion(api.MAX_UUID), 15, "UUID version inspection");
  equal(
    api.generateUuidV4WithRandomFill(fillWithZeros),
    "00000000-0000-4000-8000-000000000000",
    "explicit UUIDv4 entropy",
  );
  const deterministicV7 = api.createUuidV7GeneratorWithRandomFill(fillWithZeros, {
    readUnixMs: () => 100,
    clockRollback: { action: api.UUID_V7_ROLLBACK_ERROR, toleranceMs: 0 },
  });
  if (deterministicV7 instanceof Error) throw deterministicV7;
  equal(
    unwrap(deterministicV7.generateUuidV7()).slice(0, 13),
    "00000000-0064",
    "explicit UUIDv7 entropy",
  );
  equal(unwrap(api.generateUuidV7()).length, 36, "public UUIDv7 generation");
  const invalidUuid = api.uuidStringToBytes("not a UUID");
  equal(invalidUuid instanceof Error && invalidUuid.code, api.INVALID_UUID, "error value");
  const backfill = api.createUuidV7Generator({});
  if (backfill instanceof Error) throw backfill;
  const destination = new Uint8Array(20).fill(0x55);
  const generators = [
    (ms: number) => api.generateUuidV7({ at: ms }),
    (ms: number) => backfill.generateUuidV7({ at: ms }),
    (ms: number) => api.generateUuidV7Bytes({ at: ms }),
    (ms: number) => backfill.generateUuidV7Bytes({ at: ms }),
    (ms: number) => api.generateUuidV7Bytes({ at: ms, output: destination, outputOffset: 2 }),
    (ms: number) => backfill.generateUuidV7Bytes({ at: ms, output: destination, outputOffset: 2 }),
  ];
  for (const generate of generators) {
    // Cross a native 12-bit counter's capacity; backfilling must not borrow a later instant.
    for (let i = 0; i <= 4096; i++) {
      const result = unwrap(generate(1700000000000));
      const uuid =
        typeof result === "string"
          ? result
          : unwrap(api.bytesToUuidString(result === destination ? result.subarray(2, 18) : result));
      equal(uuid.slice(0, 13), "018bcfe5-6800", "repeated backfill timestamp");
    }
  }
  equal(destination[0], 0x55, "backfill caller prefix");
  equal(destination[19], 0x55, "backfill caller suffix");
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  equal(api.isUuidSlugError(revoked.proxy), false, "revoked error candidate");
  equal(api.isUuidBytes(revoked.proxy), false, "revoked UUID byte candidate");
  equal(api.isUuidV4Bytes(revoked.proxy), false, "revoked UUIDv4 byte candidate");
  equal(api.isUuidV7Bytes(revoked.proxy), false, "revoked UUIDv7 byte candidate");
  const inaccessible = new Proxy(
    {},
    {
      getPrototypeOf() {
        throw new Error("inaccessible prototype");
      },
    },
  );
  equal(api.isUuidSlugError(inaccessible), false, "inaccessible error candidate prototype");
  const uuid = "019ff19b-58b8-7000-9b1b-df713bd5562c";
  equal(api.isUuidV7String(unwrap(api.generateUuidV7())), true, "v7 generation");
  equal(api.isUuidV4String(unwrap(api.generateUuidV4())), true, "v4 generation");
  for (const alphabet of [api.BASE64URL, api.BASE32HEX] as const) {
    const slug = api.uuidStringToPlainSlug(uuid, alphabet);
    if (slug instanceof Error) throw slug;
    equal(api.uuidToString(slug), uuid, `${alphabet} conversion`);
    if (alphabet === api.BASE32HEX) {
      const output = new Uint8Array(20).fill(0x55);
      equal(
        api.plainSlugToUuidBytes(slug.toUpperCase(), output, 2),
        output,
        "uppercase caller storage",
      );
      equal(api.bytesToUuidString(output, 2), uuid, "uppercase caller bytes");
      equal(output[0], 0x55, "uppercase caller prefix");
      equal(output[19], 0x55, "uppercase caller suffix");
      const reserved = unwrap(
        api.createUuidV7MaskingCodec({
          mask: api.UUID_V7_TEST_MASK,
          maskedSlugAlphabet: alphabet,
          sentinels: [{ name: "reserved", uuid }],
        }),
      );
      const upper = unwrap(reserved.uuidToMaskedSlug(uuid)).toUpperCase();
      equal(reserved.maskedSlugToUuidString(upper), uuid, "uppercase sentinel");
      equal(
        reserved.createUuidSlugMigrationDecoder().uuidSlugToUuidString(upper),
        uuid,
        "uppercase sentinel migration",
      );
    }
    const generator = api.createUuidV7Generator({ readUnixMs: () => 1234567890000 });
    if (generator instanceof Error) throw generator;
    const codec = unwrap(
      api.createUuidV7MaskingCodec({
        mask: api.UUID_V7_TEST_MASK,
      }),
    );
    equal(
      codec
        .createUuidSlugMigrationDecoder({ acceptPlainSlug: true })
        .uuidSlugToUuidString(slug, api.PLAIN_SLUG_FORMAT),
      uuid,
      `${alphabet} migration`,
    );
    const generated = unwrap(generator.generateUuidV7());
    equal(generated.slice(0, 13), "011f71fb-0450", `${alphabet} custom readUnixMs`);
  }
  const maskOptions = { seed: "consumer-mask-seed", keyDerivationIterations: 1024 };
  const synchronous = api.deriveUuidV7Mask(maskOptions);
  const asynchronous = await api.deriveUuidV7MaskAsync(maskOptions);
  if (synchronous instanceof Error) throw synchronous;
  if (asynchronous instanceof Error) throw asynchronous;
  equal(
    unwrap(api.createUuidV7MaskingCodec({ mask: asynchronous })).uuidToMaskedSlug(uuid),
    unwrap(api.createUuidV7MaskingCodec({ mask: synchronous })).uuidToMaskedSlug(uuid),
    "async mask wire identity",
  );
  // An independent host task must be able to cancel real derivation through the installed export.
  const controller = new AbortController();
  const channel = new MessageChannel();
  channel.port1.addEventListener("message", () => controller.abort("consumer cancellation"), {
    once: true,
  });
  channel.port1.start();
  channel.port2.postMessage(null);
  try {
    const cancelled = await api.deriveUuidV7MaskAsync({
      seed: maskOptions.seed,
      keyDerivationIterations: 1 << 24,
      signal: controller.signal,
    });
    equal(
      cancelled instanceof api.UuidSlugError && cancelled.code,
      api.ABORTED,
      "host-task cancellation",
    );
    equal(
      cancelled instanceof api.UuidSlugError && cancelled.cause,
      "consumer cancellation",
      "cancellation cause",
    );
  } finally {
    channel.port1.close();
    channel.port2.close();
  }
  const codec = unwrap(api.createUuidV7MaskingCodec({ mask: api.UUID_V7_TEST_MASK }));
  const parsed = unwrap(api.parseUuid(uuid));
  const external = { ...codec };
  Object.defineProperty(external, "uuidToMaskedSlug", {
    value(bytes: Uint8Array) {
      const slug = codec.uuidToMaskedSlug(bytes);
      bytes.fill(0);
      return slug;
    },
  });
  equal(parsed.toMaskedSlug(external), codec.uuidToMaskedSlug(uuid), "structural masking result");
  equal(parsed.toString(), uuid, "private UUID ownership");
  const borrowed = unwrap(api.uuidStringToBytes(uuid));
  const decoder = { ...codec };
  Object.defineProperty(decoder, "uuidToBytes", { value: () => borrowed });
  const decoded = unwrap(api.parseUuid(uuid, decoder));
  borrowed.fill(0);
  equal(decoded.toString(), uuid, "structural decoding ownership");
  const malformed = Reflect.apply(api.parseUuid, undefined, [
    uuid,
    {
      ...codec,
      uuidToBytes: () => new Uint8Array(0),
    },
  ]);
  equal(
    malformed instanceof api.UuidSlugError && malformed.code,
    api.INVALID_OPTIONS,
    "malformed codec bytes",
  );
  const { seed, slug: overlap, currentUuid, originalUuid, plainUuid } = fixtures.overlap;
  const migrating = unwrap(api.createUuidV7MaskingCodec({ mask: { seed } }));
  const reader = migrating.createUuidSlugMigrationDecoder({
    acceptFixedMask: true,
    acceptPlainSlug: true,
  });
  equal(reader.uuidSlugToUuidString(overlap), currentUuid, "migration default");
  equal(
    reader.uuidSlugToUuidString(overlap, api.SEEDED_MASK_FORMAT),
    currentUuid,
    "current migration",
  );
  equal(
    reader.uuidSlugToUuidString(overlap, api.FIXED_MASK_FORMAT),
    originalUuid,
    "original migration",
  );
  equal(reader.uuidSlugToUuidString(overlap, api.PLAIN_SLUG_FORMAT), plainUuid, "plain migration");
  equal(
    JSON.stringify(reader.uuidSlugToUuidStringCandidates(overlap)),
    JSON.stringify([currentUuid, originalUuid, plainUuid]),
    "migration candidates",
  );
  equal(
    JSON.stringify(
      migrating
        .createUuidSlugMigrationDecoder({ acceptPlainSlug: true })
        .uuidSlugToUuidStringCandidates(overlap),
    ),
    JSON.stringify([currentUuid, plainUuid]),
    "fixed-mask migration retirement",
  );
  equal(codec.uuidToMaskedSlug(uuid), "uqgITQGagyxsoNARAd_pxu", "masked wire vector");
  equal(codec.uuidToString("uqgITQGagyxsoNARAd_pxu"), uuid, "masked inverse");
  const sentinelCodec = unwrap(
    api.createUuidV7MaskingCodec({
      mask: api.UUID_V7_TEST_MASK,
      sentinels: [{ name: "reserved", uuid }],
    }),
  );
  const sentinel = api.uuidStringToPlainSlug(uuid);
  equal(sentinelCodec.uuidToMaskedSlug(uuid), sentinel, "custom sentinel encoding");
  equal(sentinelCodec.uuidToString(String(sentinel)), uuid, "custom sentinel decoding");
  const bytes = api.generateUuidV7Bytes({ at: 1234567890000 });
  if (bytes instanceof Error) throw bytes;
  equal(bytes.constructor, Uint8Array, "owned byte constructor");
  const uuidText = api.bytesToUuidString(bytes);
  if (uuidText instanceof Error) throw uuidText;
  const ownedBuffer = new Uint8Array(bytes).buffer;
  equal(api.bytesToUuidString(ownedBuffer), uuidText, "ArrayBuffer UUID input");
  equal(api.bytesToUuidString(new DataView(ownedBuffer)), uuidText, "DataView UUID input");
  const wasmMemory = new WebAssembly.Memory({ initial: 1 });
  new Uint8Array(wasmMemory.buffer, 8, 16).set(bytes);
  equal(
    api.bytesToUuidString(new DataView(wasmMemory.buffer, 8, 16)),
    uuidText,
    "WebAssembly DataView UUID input",
  );
  equal(api.uuidStringToBytes(uuidText) instanceof Uint8Array, true, "directional UUID conversion");
  const out = new Uint8Array(20).fill(0x55);
  equal(
    api.generateUuidV7Bytes({ at: 1234567890000, output: out, outputOffset: 2 }),
    out,
    "caller buffer identity",
  );
  equal(out[0], 0x55, "caller prefix");
  equal(out[19], 0x55, "caller suffix");
  const invalid = Reflect.apply(api.generateUuidV7Bytes, undefined, [{ at: 0, outputOffset: 1 }]);
  equal(invalid instanceof api.UuidSlugError && invalid.code, api.INVALID_BUFFER, "offset error");
  equal("generate" in api, false, "keyed top-level export");
}
