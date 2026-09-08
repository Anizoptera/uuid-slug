import type * as Api from "../src/index";
import fixtures from "../rust/uuid-slug/tests/fixtures/fixtures-original-slugs.json";

function equal(actual: unknown, expected: unknown, context: string): void {
  if (actual !== expected)
    throw new Error(`${context}: expected ${String(expected)}, received ${String(actual)}`);
}

/** Exercise public calls through the module supplied by the consumer's own resolver. */
export async function probeConsumer(api: typeof Api): Promise<void> {
  const uuid = "019ff19b-58b8-7000-9b1b-df713bd5562c";
  equal(api.isUuidV7String(api.uuidV7()), true, "v7 generation");
  equal(api.isUuidV4String(api.uuidV4()), true, "v4 generation");
  for (const alphabet of ["base64url", "base32hex"] as const) {
    const slug = api.uuidToSlug(uuid, alphabet);
    if (slug instanceof Error) throw slug;
    equal(api.slugToUuid(slug), uuid, `${alphabet} conversion`);
    const generator = api.createUuidV7Generator({
      clock: () => 1234567890000,
      fillRandom: (b) => {
        b.fill(0x12);
      },
    });
    const codec = api.createUuidSlugCodec({ generator, slugAlphabet: alphabet });
    equal(codec.migration({ plain: true }).decode(slug, "plain"), uuid, `${alphabet} migration`);
    equal(
      api.slugToUuid(codec.uuidV7Slug()),
      "011f71fb-0450-7121-8848-484a12121212",
      `${alphabet} custom generator`,
    );
  }
  const schemaOptions = { seed: "consumer-schema-seed", keyIterations: 1024 };
  const synchronous = api.createMaskSchema(schemaOptions);
  const asynchronous = await api.createMaskSchemaAsync(schemaOptions);
  if (synchronous instanceof Error) throw synchronous;
  if (asynchronous instanceof Error) throw asynchronous;
  equal(
    api.createUuidSlugCodec({ mask: asynchronous }).uuidV7ToMaskedSlug(uuid),
    api.createUuidSlugCodec({ mask: synchronous }).uuidV7ToMaskedSlug(uuid),
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
    const cancelled = await api.createMaskSchemaAsync({
      seed: schemaOptions.seed,
      keyIterations: 1 << 24,
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
  const codec = api.createUuidSlugCodec();
  const { seed, slug: overlap, currentUuid, originalUuid, plainUuid } = fixtures.overlap;
  const migrating = api.createUuidSlugCodec({ mask: { seed } });
  const reader = migrating.migration({ original: true, plain: true });
  equal(reader.decode(overlap), currentUuid, "migration default");
  equal(reader.decode(overlap, "original"), originalUuid, "original migration");
  equal(reader.decode(overlap, "plain"), plainUuid, "plain migration");
  equal(
    JSON.stringify(reader.candidates(overlap)),
    JSON.stringify([currentUuid, originalUuid, plainUuid]),
    "migration candidates",
  );
  equal(
    JSON.stringify(migrating.migration().candidates(overlap)),
    JSON.stringify([currentUuid]),
    "migration retirement",
  );
  equal(codec.uuidV7ToMaskedSlug(uuid), "uqgITQGagyxsoNARAd_pxu", "masked wire vector");
  equal(codec.maskedSlugToUuidV7("uqgITQGagyxsoNARAd_pxu"), uuid, "masked inverse");
  const sentinelCodec = api.createUuidSlugCodec({ sentinels: [{ name: "reserved", uuid }] });
  const sentinel = api.uuidToSlug(uuid);
  equal(sentinelCodec.uuidV7ToMaskedSlug(uuid), sentinel, "custom sentinel encoding");
  equal(sentinelCodec.maskedSlugToUuidV7(String(sentinel)), uuid, "custom sentinel decoding");
  const bytes = codec.uuidV7BytesAt(1234567890000);
  if (bytes instanceof Error) throw bytes;
  equal(bytes.constructor, Uint8Array, "owned byte constructor");
  const out = new Uint8Array(20).fill(0x55);
  equal(codec.uuidV7BytesAt(1234567890000, out, 2), out, "caller buffer identity");
  equal(out[0], 0x55, "caller prefix");
  equal(out[19], 0x55, "caller suffix");
  const invalid = codec.uuidV7BytesAt(0, undefined, 1);
  equal(invalid instanceof api.UuidSlugError && invalid.code, "invalid_buffer", "offset error");
  equal("uuidV7MaskedSlug" in api, false, "keyed top-level export");
}
