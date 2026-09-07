import type * as Api from "../src/index";

function equal(actual: unknown, expected: unknown, context: string): void {
  if (actual !== expected)
    throw new Error(`${context}: expected ${String(expected)}, received ${String(actual)}`);
}

/** Exercise public calls through the module supplied by the consumer's own resolver. */
export function probeConsumer(api: typeof Api): void {
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
    equal(
      api.slugToUuid(codec.uuidV7Slug()),
      "011f71fb-0450-7121-8848-484a12121212",
      `${alphabet} custom generator`,
    );
  }
  const codec = api.createUuidSlugCodec();
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
