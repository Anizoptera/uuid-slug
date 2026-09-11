// SPDX-License-Identifier: Apache-2.0

/**
 * The masked wire format's timestamp boundary does not show up as a failed round trip: truncation
 * still produces a well-formed slug, so a case must reach past the boundary on purpose to see it.
 * Frozen vectors in `alphabet.test.ts` own the exact 16-bit check layout.
 */
import { describe, expect, it } from "vitest";
import { createUuidSlugCodec } from "../src/codec";
import { createMaskSchema } from "../src/schema";
import { unwrap } from "../dev/unwrap";

/** Pads to the 16-byte seed floor, so cases can keep naming their key after what it tests. */
const schemaOrThrow = (seed: string) => {
  const schema = createMaskSchema({ id: seed, seed: seed.padEnd(16, ".") });
  if (schema instanceof Error) throw schema;
  return schema;
};

/** The last instant this format can carry, and the first it cannot. Both are valid UUIDv7s. */
const LAST_MASKABLE = "03ffffff-ffff-7fff-bfff-ffffffffffff";
const FIRST_REFUSED = "04000000-0000-7000-8000-000000000000";

describe("the maskable range", () => {
  const schema = schemaOrThrow("range");
  const codec = unwrap(createUuidSlugCodec({ mask: schema, sentinels: [] }));

  it("masks the last instant before 2^42 ms and refuses the first one at or past it", () => {
    expect(codec.uuidV7ToMaskedSlug(LAST_MASKABLE)).toHaveLength(22);
    // Version 7 and the RFC variant are both set here on purpose. Those are checked FIRST, so an
    // input built to reach the timestamp guard has to satisfy them or the earlier guard answers
    // and this case silently stops testing the boundary it names.
    const refused = codec.uuidV7ToMaskedSlug(FIRST_REFUSED);
    expect(refused).toBeInstanceOf(Error);
    expect((refused as { code?: string }).code).toBe("invalid_timestamp");
  });

  it("refuses anything that is not a UUIDv7, rather than stamping one on at decode", () => {
    // Decoding restores v7 constants, so accepting another version or variant changes identity.
    // Both inputs fit the timestamp range; its guard must not hide a missing version check.
    expect(codec.uuidV7ToMaskedSlug("0198abcd-1234-4abc-9def-000000000001")).toBeInstanceOf(Error);
    expect(codec.uuidV7ToMaskedSlug("03ffffff-ffff-7fff-0fff-ffffffffffff")).toBeInstanceOf(Error);
  });

  it("round-trips under the RIGHT key at both ends of the range", () => {
    // The wrong-key cases below would stay green against a build whose right-key decode was
    // broken, because a broken check rejects everything and rejecting is what they count. Both
    // ends because byte 0 is the byte the tag borrows: all-ones there is the case a sloppy
    // mask-and-restore corrupts, and all-zero is the case that hides it.
    for (const uuid of [LAST_MASKABLE, "00000000-0000-7000-8000-000000000000"]) {
      const slug = codec.uuidV7ToMaskedSlug(uuid);
      if (slug instanceof Error) throw slug;
      expect(slug).toHaveLength(22);
      expect(codec.maskedSlugToUuidV7(slug)).toBe(uuid);
    }
  });
});
