import type * as Api from "@anizoptera/uuid-slug";
import fixtures from "../rust/uuid-slug/tests/fixtures/fixtures-original-slugs.json";
import { unwrap } from "../dev/unwrap";

function equal(actual: unknown, expected: unknown, context: string): void {
  if (actual !== expected)
    throw new Error(`${context}: expected ${String(expected)}, received ${String(actual)}`);
}

/** Exercise public calls through the module supplied by the consumer's own resolver. */
export async function probeConsumer(api: typeof Api): Promise<void> {
  const backfill = api.createUuidV7Generator({
    fillRandom(bytes) {
      bytes.fill(0x5a);
    },
  });
  const destination = new Uint8Array(20).fill(0x55);
  const generators = [
    (ms: number) => api.uuidV7At(ms),
    (ms: number) => backfill.uuidV7At(ms),
    (ms: number) => api.uuidV7BytesAt(ms),
    (ms: number) => backfill.uuidV7BytesAt(ms),
    (ms: number) => api.uuidV7BytesAt(ms, destination, 2),
    (ms: number) => backfill.uuidV7BytesAt(ms, destination, 2),
  ];
  for (const generate of generators) {
    // Cross a native 12-bit counter's capacity; backfilling must not borrow a later instant.
    for (let i = 0; i <= 4096; i++) {
      const result = unwrap(generate(1700000000000));
      const uuid =
        typeof result === "string"
          ? result
          : unwrap(api.formatUuid(result === destination ? result.subarray(2, 18) : result));
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
  equal(api.isUuidV7String(unwrap(api.uuidV7())), true, "v7 generation");
  equal(api.isUuidV4String(unwrap(api.uuidV4())), true, "v4 generation");
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
    const codec = unwrap(api.createUuidSlugCodec({ mask: api.PUBLIC_MASK_SCHEMA, generator }));
    equal(codec.migration({ plain: true }).decode(slug, "plain"), uuid, `${alphabet} migration`);
    const generated = unwrap(generator.uuidV7());
    equal(
      api.slugToUuid(unwrap(api.uuidToSlug(generated, alphabet))),
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
    unwrap(api.createUuidSlugCodec({ mask: asynchronous })).uuidV7ToMaskedSlug(uuid),
    unwrap(api.createUuidSlugCodec({ mask: synchronous })).uuidV7ToMaskedSlug(uuid),
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
  const codec = unwrap(api.createUuidSlugCodec({ mask: api.PUBLIC_MASK_SCHEMA }));
  const { seed, slug: overlap, currentUuid, originalUuid, plainUuid } = fixtures.overlap;
  const migrating = unwrap(api.createUuidSlugCodec({ mask: { seed } }));
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
  const sentinelCodec = unwrap(
    api.createUuidSlugCodec({
      mask: api.PUBLIC_MASK_SCHEMA,
      sentinels: [{ name: "reserved", uuid }],
    }),
  );
  const sentinel = api.uuidToSlug(uuid);
  equal(sentinelCodec.uuidV7ToMaskedSlug(uuid), sentinel, "custom sentinel encoding");
  equal(sentinelCodec.maskedSlugToUuidV7(String(sentinel)), uuid, "custom sentinel decoding");
  const bytes = api.uuidV7BytesAt(1234567890000);
  if (bytes instanceof Error) throw bytes;
  equal(bytes.constructor, Uint8Array, "owned byte constructor");
  const out = new Uint8Array(20).fill(0x55);
  equal(api.uuidV7BytesAt(1234567890000, out, 2), out, "caller buffer identity");
  equal(out[0], 0x55, "caller prefix");
  equal(out[19], 0x55, "caller suffix");
  const invalid = api.uuidV7BytesAt(0, undefined, 1);
  equal(invalid instanceof api.UuidSlugError && invalid.code, "invalid_buffer", "offset error");
  equal("uuidV7MaskedSlug" in api, false, "keyed top-level export");
}
