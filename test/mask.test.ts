// SPDX-License-Identifier: Apache-2.0

/**
 * The masked wire format's two load-bearing numbers: where the encodable range stops, and how
 * wide the wrong-key check actually is. Both are properties of the FORMAT rather than of any one
 * function, and neither shows up as a failed round-trip — a narrowed check still encodes and
 * decodes every id correctly, and a truncated timestamp still produces a well-formed slug. Only a
 * case that counts wrong answers, or one that reaches past the boundary on purpose, can see them.
 */
import { describe, expect, it } from "vitest";
import { BASE32HEX, BASE64URL } from "../src/alphabet";
import type { Alphabet } from "../src/alphabet";
import {
  maskedSlugToUuidWithSchema,
  uuidToMaskedSlugWithSchema,
  uuidV7BytesToMaskedSlug,
} from "../src/mask";
import { createMaskSchema, defineMaskSchema } from "../src/schema";
import { deterministicUuidV7Bytes } from "./deterministic-uuid";

const schemaOrThrow = (seed: string) => {
  const schema = createMaskSchema({ id: seed, seed });
  if (schema instanceof Error) throw schema;
  return schema;
};

/** The last instant this format can carry, and the first it cannot. Both are valid UUIDv7s. */
const LAST_MASKABLE = "03ffffff-ffff-7fff-bfff-ffffffffffff";
const FIRST_REFUSED = "04000000-0000-7000-8000-000000000000";

describe("the maskable range", () => {
  const schema = schemaOrThrow("range");

  it("masks the last instant before 2^42 ms and refuses the first one at or past it", () => {
    expect(uuidToMaskedSlugWithSchema(LAST_MASKABLE, schema)).toHaveLength(22);
    // Version 7 and the RFC variant are both set here on purpose. Those are checked FIRST, so an
    // input built to reach the timestamp guard has to satisfy them or the earlier guard answers
    // and this case silently stops testing the boundary it names.
    const refused = uuidToMaskedSlugWithSchema(FIRST_REFUSED, schema);
    expect(refused).toBeInstanceOf(Error);
    expect((refused as { code?: string }).code).toBe("invalid_timestamp");
  });

  it("still masks that instant under a narrow tier, which does not claim those bits", () => {
    // The refusal is not a property of masking; it is the price of spending byte 0's top six bits
    // on the check. A tier that leaves them alone must keep encoding the full 48-bit range, and
    // asserting so is what stops the refusal being widened into every schema by a later change.
    const narrow = defineMaskSchema({
      id: "narrow",
      permute: Uint8Array.from({ length: 16 }, (_, i) => (i * 5 + 3) % 16),
      tagBits: 4,
      xor: Uint8Array.from({ length: 16 }, (_, i) => i * 0x11),
    });
    if (narrow instanceof Error) throw narrow;
    expect(uuidToMaskedSlugWithSchema(FIRST_REFUSED, narrow)).toHaveLength(22);
  });
});

describe("the wrong-key check", () => {
  const mine = schemaOrThrow("rate-probe-A");
  const theirs = schemaOrThrow("rate-probe-B");
  const SAMPLE = 100_000;

  const acceptedUnderTheWrongKey = (alpha: Alphabet, length: number) => {
    let accepted = 0;
    const raw = new Uint8Array(16);
    for (let i = 0; i < SAMPLE; i += 1) {
      const slug = uuidV7BytesToMaskedSlug(deterministicUuidV7Bytes(i, raw), mine, alpha);
      if (slug instanceof Error) throw slug;
      // Asserted here rather than through `expect`, which at this sample size costs more than the
      // masking it is checking. A length change is a format change, so throwing is the right loud.
      if (slug.length !== length) throw new Error(`${alpha.name} produced ${slug.length} chars`);
      if (!(maskedSlugToUuidWithSchema(String(slug), theirs, alpha) instanceof Error))
        accepted += 1;
    }
    return accepted;
  };

  // Both bounds are set from a measured count on fixed input, not from a confidence interval, and
  // they are wide enough to survive a reseed. What they discriminate is the loss of a whole region
  // of the check — dropping back to the 12-bit tier puts about 24 in each sample. They do NOT
  // separate 16 bits from 15, and no sample this suite can afford to run would.
  it("accepts a foreign key's 22-character slug at the rate 16 bits predicts", () => {
    expect(acceptedUnderTheWrongKey(BASE64URL, 22)).toBeLessThanOrEqual(8);
  });

  it("accepts a foreign key's 26-character slug at the rate 14 bits predicts", () => {
    // base32hex spends 130 bits on 26 characters against base64url's 132, so it has two fewer to
    // give the check and is four times easier to fool. That is the format's arithmetic showing
    // through, not a defect, and it is why the alphabet is part of the contract.
    expect(acceptedUnderTheWrongKey(BASE32HEX, 26)).toBeLessThanOrEqual(18);
  });
});
