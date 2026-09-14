import type * as Api from "@anizoptera/uuid-slug";
import fixtures from "../rust/uuid-slug/tests/fixtures/fixtures-original-slugs.json";
import { unwrap } from "../dev/unwrap";

function equal(actual: unknown, expected: unknown, context: string): void {
  if (actual !== expected)
    throw new Error(`${context}: expected ${String(expected)}, received ${String(actual)}`);
}

/** Exercise public calls through the module supplied by the consumer's own resolver. */
export async function probeConsumer(api: typeof Api): Promise<void> {
  equal(api.MAX_MASKED_UUID_V7_UNIX_MS, 2 ** 42 - 1, "masked timestamp endpoint");
  equal(unwrap(api.generateUuidV7()).length, 36, "public UUIDv7 generation");
  const invalidUuid = api.uuidStringToBytes("not a UUID");
  equal(invalidUuid instanceof Error && invalidUuid.code, api.INVALID_UUID, "error value");
  const backfill = api.createUuidV7Generator({});
  const destination = new Uint8Array(20).fill(0x55);
  const generators = [
    (ms: number) => api.generateUuidV7AtUnixMs(ms),
    (ms: number) => backfill.generateUuidV7AtUnixMs(ms),
    (ms: number) => api.generateUuidV7BytesAtUnixMs(ms),
    (ms: number) => backfill.generateUuidV7BytesAtUnixMs(ms),
    (ms: number) => api.generateUuidV7BytesAtUnixMs(ms, destination, 2),
    (ms: number) => backfill.generateUuidV7BytesAtUnixMs(ms, destination, 2),
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
    const slug = api.uuidStringToDirectSlug(uuid, alphabet);
    if (slug instanceof Error) throw slug;
    equal(api.slugToUuidString(slug), uuid, `${alphabet} conversion`);
    const generator = api.createUuidV7Generator({ readUnixMs: () => 1234567890000 });
    const codec = unwrap(
      api.createUuidV7SlugCodec({
        mask: api.UUID_V7_TEST_MASK,
      }),
    );
    equal(
      codec
        .createMigrationDecoder({ acceptDirectSlug: true })
        .slugToUuidString(slug, api.DIRECT_SLUG_FORMAT),
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
    unwrap(api.createUuidV7SlugCodec({ mask: asynchronous })).uuidToSlug(uuid),
    unwrap(api.createUuidV7SlugCodec({ mask: synchronous })).uuidToSlug(uuid),
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
  const codec = unwrap(api.createUuidV7SlugCodec({ mask: api.UUID_V7_TEST_MASK }));
  const { seed, slug: overlap, currentUuid, originalUuid, directUuid } = fixtures.overlap;
  const migrating = unwrap(api.createUuidV7SlugCodec({ mask: { seed } }));
  const reader = migrating.createMigrationDecoder({
    acceptFixedMask: true,
    acceptDirectSlug: true,
  });
  equal(reader.slugToUuidString(overlap), currentUuid, "migration default");
  equal(reader.slugToUuidString(overlap, api.SEEDED_MASK_FORMAT), currentUuid, "current migration");
  equal(
    reader.slugToUuidString(overlap, api.FIXED_MASK_FORMAT),
    originalUuid,
    "original migration",
  );
  equal(reader.slugToUuidString(overlap, api.DIRECT_SLUG_FORMAT), directUuid, "direct migration");
  equal(
    JSON.stringify(reader.slugToUuidStringCandidates(overlap)),
    JSON.stringify([currentUuid, originalUuid, directUuid]),
    "migration candidates",
  );
  equal(
    JSON.stringify(
      migrating
        .createMigrationDecoder({ acceptDirectSlug: true })
        .slugToUuidStringCandidates(overlap),
    ),
    JSON.stringify([currentUuid, directUuid]),
    "fixed-mask migration retirement",
  );
  equal(codec.uuidToSlug(uuid), "uqgITQGagyxsoNARAd_pxu", "masked wire vector");
  equal(codec.slugToUuidString("uqgITQGagyxsoNARAd_pxu"), uuid, "masked inverse");
  const sentinelCodec = unwrap(
    api.createUuidV7SlugCodec({
      mask: api.UUID_V7_TEST_MASK,
      sentinels: [{ name: "reserved", uuid }],
    }),
  );
  const sentinel = api.uuidStringToDirectSlug(uuid);
  equal(sentinelCodec.uuidToSlug(uuid), sentinel, "custom sentinel encoding");
  equal(sentinelCodec.slugToUuidString(String(sentinel)), uuid, "custom sentinel decoding");
  const bytes = api.generateUuidV7BytesAtUnixMs(1234567890000);
  if (bytes instanceof Error) throw bytes;
  equal(bytes.constructor, Uint8Array, "owned byte constructor");
  const uuidText = api.bytesToUuidString(bytes);
  if (uuidText instanceof Error) throw uuidText;
  equal(api.uuidStringToBytes(uuidText) instanceof Uint8Array, true, "directional UUID conversion");
  const out = new Uint8Array(20).fill(0x55);
  equal(api.generateUuidV7BytesAtUnixMs(1234567890000, out, 2), out, "caller buffer identity");
  equal(out[0], 0x55, "caller prefix");
  equal(out[19], 0x55, "caller suffix");
  const callUuidV7BytesAt = api.generateUuidV7BytesAtUnixMs as (
    timestamp: number,
    out?: Uint8Array,
    offset?: number,
  ) => Uint8Array | InstanceType<typeof api.UuidSlugError>;
  const invalid = callUuidV7BytesAt(0, undefined, 1);
  equal(invalid instanceof api.UuidSlugError && invalid.code, api.INVALID_BUFFER, "offset error");
  equal("generate" in api, false, "keyed top-level export");
}
