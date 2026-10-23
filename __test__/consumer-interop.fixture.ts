// Real producers constrain byte order, ownership and declarations independently of package round trips.
import { deepStrictEqual, strictEqual } from "node:assert";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { parse, stringify, v4, v7 } from "uuid";
import {
  BASE32HEX,
  BASE64URL,
  generateUuidV4,
  generateUuidV7,
  parseUuid,
  plainSlugToUuidBytes,
  uuidToBytes,
  uuidToPlainSlug,
  uuidToString,
} from "@anizoptera/uuid-slug";
import type { UuidSlugError, UuidString } from "@anizoptera/uuid-slug";

// Keep this installed-package consumer independent of repository module resolution.
function unwrap<Value>(value: Value): Exclude<Value, Error> {
  if (value instanceof Error) throw value;
  return value as Exclude<Value, Error>;
}

// An application's brand must not be confused with this package's representation brands.
export function acceptExternalBrand(
  input: string & { readonly applicationUuid: unique symbol },
): UuidString | UuidSlugError {
  return uuidToString(input);
}

for (const text of [randomUUID(), v4(), v7()]) {
  const expected = parse(text);
  const storage = new Uint8Array(24).fill(0x55);
  storage.set(expected, 4);
  const inputs: (string | Uint8Array | ArrayBuffer | DataView)[] = [
    text,
    expected,
    Buffer.from(expected),
    Uint8Array.from(expected).buffer,
    new DataView(storage.buffer, 4, 16),
  ];
  for (const input of inputs) {
    strictEqual(unwrap(uuidToString(input)), text);
    deepStrictEqual(unwrap(uuidToBytes(input)), expected);
    const parsed = unwrap(parseUuid(input));
    strictEqual(parsed.toString(), text);
    parsed.toBytes().fill(0);
    strictEqual(parsed.toString(), text, "Returned bytes must not expose retained UUID storage");
    for (const alphabet of [BASE64URL, BASE32HEX] as const) {
      const slug = unwrap(uuidToPlainSlug(input, alphabet));
      strictEqual(stringify(unwrap(plainSlugToUuidBytes(slug))), text);
      const output = Buffer.alloc(24, 0xa5);
      const written: Buffer | UuidSlugError = plainSlugToUuidBytes(slug, output, 4);
      strictEqual(unwrap(written), output);
      strictEqual(stringify(output, 4), text);
      deepStrictEqual([...output.subarray(0, 4), ...output.subarray(20)], Array(8).fill(0xa5));
      const saved = Buffer.from(output);
      for (const [badText, offset] of [
        ["!", 4],
        [slug, 9],
        [slug, Number.MAX_SAFE_INTEGER],
      ] as const) {
        strictEqual(plainSlugToUuidBytes(badText, output, offset) instanceof Error, true);
        deepStrictEqual(output, saved, "A failed decode must not alter caller storage");
      }
    }
  }
  deepStrictEqual(storage.subarray(4, 20), expected, "Input views remain caller-owned");
}

for (const generate of [v4, v7]) {
  const output = Buffer.alloc(24, 0xa5);
  strictEqual(generate(undefined, output, 4), output);
  strictEqual(unwrap(uuidToString(output, 4)), stringify(output, 4));
  deepStrictEqual([...output.subarray(0, 4), ...output.subarray(20)], Array(8).fill(0xa5));
}
for (const text of [generateUuidV4(), generateUuidV7()]) strictEqual(stringify(parse(text)), text);

console.log(
  "External UUID producers, byte containers, Buffer identity and failure atomicity passed",
);
