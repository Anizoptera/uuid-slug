import type * as Api from "@anizoptera/uuid-slug";
import fixtures from "../rust/uuid-slug/tests/fixtures/fixtures-original-slugs.json";
import { unwrap } from "../dev/unwrap";

function equal(actual: unknown, expected: unknown, context: string): void {
  if (actual !== expected)
    throw new Error(`${context}: expected ${String(expected)}, received ${String(actual)}`);
}

/** Exercise public calls through the module supplied by the consumer's own resolver. */
export async function probeConsumer(api: typeof Api): Promise<void> {
  equal(unwrap(api.generateUuidV7()).length, 36, "public UUIDv7 generation");
  const invalidUuid = api.uuidToBytes("not a UUID");
  equal(invalidUuid instanceof Error && invalidUuid.code, "invalid_uuid", "error value");
  const backfill = unwrap(api.createUuidV7Generator({}));
  const destination = new Uint8Array(20).fill(0x55);
  const generators = [
    (ms: number) => api.generateUuidV7At(ms),
    (ms: number) => backfill.generateUuidV7At(ms),
    (ms: number) => api.generateUuidV7BytesAt(ms),
    (ms: number) => backfill.generateUuidV7BytesAt(ms),
    (ms: number) => api.generateUuidV7BytesAt(ms, destination, 2),
    (ms: number) => backfill.generateUuidV7BytesAt(ms, destination, 2),
  ];
  for (const generate of generators) {
    // Cross a native 12-bit counter's capacity; backfilling must not borrow a later instant.
    for (let i = 0; i <= 4096; i++) {
      const result = unwrap(generate(1700000000000));
      const uuid =
        typeof result === "string"
          ? result
          : unwrap(api.bytesToUuid(result === destination ? result.subarray(2, 18) : result));
      equal(uuid.slice(0, 13), "018bcfe5-6800", "repeated backfill timestamp");
    }
  }
  equal(destination[0], 0x55, "backfill caller prefix");
  equal(destination[19], 0x55, "backfill caller suffix");
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  equal(api.isUuidSlugError(revoked.proxy), false, "revoked error candidate");
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
  for (const alphabet of ["base64url", "base32hex"] as const) {
    const slug = api.uuidToSlug(uuid, alphabet);
    if (slug instanceof Error) throw slug;
    equal(api.slugToUuid(slug), uuid, `${alphabet} conversion`);
    const generator = unwrap(api.createUuidV7Generator({ clock: () => 1234567890000 }));
    const codec = unwrap(
      api.createUuidV7SlugCodec({
        mask: api.UUID_V7_TEST_MASK,
      }),
    );
    equal(
      unwrap(codec.createMigrationDecoder({ plainSlug: true })).decodeSlug(slug, "plain-slug"),
      uuid,
      `${alphabet} migration`,
    );
    const generated = unwrap(generator.generateUuidV7());
    equal(generated.slice(0, 13), "011f71fb-0450", `${alphabet} custom clock`);
  }
  const schemaOptions = { seed: "consumer-schema-seed", keyDerivationIterations: 1024 };
  const synchronous = api.createUuidV7Mask(schemaOptions);
  const asynchronous = await api.createUuidV7MaskAsync(schemaOptions);
  if (synchronous instanceof Error) throw synchronous;
  if (asynchronous instanceof Error) throw asynchronous;
  equal(
    unwrap(api.createUuidV7SlugCodec({ mask: asynchronous })).encodeUuid(uuid),
    unwrap(api.createUuidV7SlugCodec({ mask: synchronous })).encodeUuid(uuid),
    "async schema wire identity",
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
    const cancelled = await api.createUuidV7MaskAsync({
      seed: schemaOptions.seed,
      keyDerivationIterations: 1 << 24,
      signal: controller.signal,
    });
    equal(
      cancelled instanceof api.UuidSlugError && cancelled.code,
      "aborted",
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
  const { seed, slug: overlap, currentUuid, originalUuid, plainUuid } = fixtures.overlap;
  const migrating = unwrap(api.createUuidV7SlugCodec({ mask: { seed } }));
  const reader = unwrap(migrating.createMigrationDecoder({ originalMask: true, plainSlug: true }));
  equal(reader.decodeSlug(overlap), currentUuid, "migration default");
  equal(reader.decodeSlug(overlap, "original-mask"), originalUuid, "original migration");
  equal(reader.decodeSlug(overlap, "plain-slug"), plainUuid, "plain migration");
  equal(
    JSON.stringify(reader.decodeSlugCandidates(overlap)),
    JSON.stringify([currentUuid, originalUuid, plainUuid]),
    "migration candidates",
  );
  equal(
    JSON.stringify(
      migrating.createMigrationDecoder({ plainSlug: true }).decodeSlugCandidates(overlap),
    ),
    JSON.stringify([currentUuid, plainUuid]),
    "original-mask migration retirement",
  );
  equal(codec.encodeUuid(uuid), "uqgITQGagyxsoNARAd_pxu", "masked wire vector");
  equal(codec.decodeSlug("uqgITQGagyxsoNARAd_pxu"), uuid, "masked inverse");
  const sentinelCodec = unwrap(
    api.createUuidV7SlugCodec({
      mask: api.UUID_V7_TEST_MASK,
      sentinels: [{ name: "reserved", uuid }],
    }),
  );
  const sentinel = api.uuidToSlug(uuid);
  equal(sentinelCodec.encodeUuid(uuid), sentinel, "custom sentinel encoding");
  equal(sentinelCodec.decodeSlug(String(sentinel)), uuid, "custom sentinel decoding");
  const bytes = api.generateUuidV7BytesAt(1234567890000);
  if (bytes instanceof Error) throw bytes;
  equal(bytes.constructor, Uint8Array, "owned byte constructor");
  const uuidText = api.bytesToUuid(bytes);
  if (uuidText instanceof Error) throw uuidText;
  equal(api.uuidToBytes(uuidText) instanceof Uint8Array, true, "directional UUID conversion");
  const out = new Uint8Array(20).fill(0x55);
  equal(api.generateUuidV7BytesAt(1234567890000, out, 2), out, "caller buffer identity");
  equal(out[0], 0x55, "caller prefix");
  equal(out[19], 0x55, "caller suffix");
  const callUuidV7BytesAt = api.generateUuidV7BytesAt as (
    timestamp: number,
    out?: Uint8Array,
    offset?: number,
  ) => Uint8Array | InstanceType<typeof api.UuidSlugError>;
  const invalid = callUuidV7BytesAt(0, undefined, 1);
  equal(invalid instanceof api.UuidSlugError && invalid.code, "invalid_buffer", "offset error");
  equal("generate" in api, false, "keyed top-level export");
}
