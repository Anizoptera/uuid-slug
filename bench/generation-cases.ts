// SPDX-License-Identifier: Apache-2.0

import { v4 as lukeedV4 } from "@lukeed/uuid";
import { v4 as lukeedSecureV4 } from "@lukeed/uuid/secure";
import { v4 as smithyV4 } from "@smithy/uuid";
import { uuidv7 as kripodV7 } from "@kripod/uuidv7";
import { uuid as fastV7 } from "fastv7";
import * as slugid from "slugid";
import { createTranslator } from "short-uuid";
import { v4 as uuidV4, v7 as uuidV7 } from "uuid";
import uuidRandom from "uuid-random";
import { uuidv4 as unikuV4 } from "uniku/uuid/v4";
import { uuidv7 as unikuV7 } from "uniku/uuid/v7";
import {
  uuidv4 as packageUuidV7V4,
  uuidv4obj as packageUuidV7V4Object,
  uuidv7 as packageUuidV7V7,
  uuidv7obj as packageUuidV7V7Object,
} from "uuidv7";
import { UUIDv7 as UuidV7Js, uuidv7 as uuidv7Js } from "uuidv7-js";

import type { GenerationCase, GenerationValue } from "./generation-case";
import { unwrap } from "../dev/unwrap";
// Candidate comparisons must call the requested package graph, not the working-tree baseline.
// Keep the default import literal so browser builds still contain the ordinary package.
const {
  BASE64URL,
  createUuidV7Generator,
  createUuidV7MaskingCodec,
  uuidBytesToPlainSlug,
  extractUuidV7UnixMs,
  generateUuidV4,
  generateUuidV4Bytes,
  generateUuidV7,
  generateUuidV7Bytes,
  generateUuidV7WithPlainSlug,
  bytesToUuidString,
  generatePlainUuidV4Slug,
  generatePlainUuidV7Slug,
  UUID_V7_TEST_MASK,
  uuidStringToBytes,
  uuidStringToPlainSlug,
  plainSlugToUuidString,
}: typeof import("../src/index") =
  typeof process !== "undefined" && process.env.UUID_SLUG_PROFILE_MODULE
    ? await import(process.env.UUID_SLUG_PROFILE_MODULE)
    : await import("../src/index");
import { drawUuidV4Scratch, generatePortableUuidV4 } from "../src/v4";

type RowOptions = Partial<
  Pick<
    GenerationCase,
    "expectedTimestamps" | "expectedValues" | "note" | "outputOffset" | "rejectionReason" | "secure"
  >
> & { readonly qualification?: GenerationCase["qualification"] };

const intoV4 = new Uint8Array(24);
const intoV7 = new Uint8Array(24);
const uuidV4Into = new Uint8Array(24);
const uuidV7Into = new Uint8Array(24);
const unikuV4Into = new Uint8Array(24);
const unikuV7Into = new Uint8Array(24);
const randomV4 = new Uint8Array(16);
const randomV7 = new Uint8Array(16);
const fillV4 = () => globalThis.crypto.getRandomValues(randomV4);
const fillV7 = () => globalThis.crypto.getRandomValues(randomV7);
const portableV4Options = { rng: fillV4 };
const platformV4Into = new Uint8Array(24);
const platformV4IntoView = platformV4Into.subarray(4, 20);
/** Set the UUIDv4 version and variant bits that a raw platform draw lacks. */
function asUuidV4<Bytes extends Uint8Array>(bytes: Bytes, offset = 0): Bytes {
  bytes[offset + 6] = (bytes[offset + 6]! & 0x0f) | 0x40;
  bytes[offset + 8] = (bytes[offset + 8]! & 0x3f) | 0x80;
  return bytes;
}
const hasToBase64 = typeof (Uint8Array.prototype as { toBase64?: unknown }).toBase64 === "function";
const base64urlOutputOptions = { alphabet: BASE64URL, omitPadding: true } as const;
const portableV7Options = { rng: fillV7 };
const portableV7 = unwrap(createUuidV7Generator({}));
const timestamp = 1_756_864_833_024;
const timestamps = [timestamp, timestamp + 1] as const;
const timestampUuids = [
  "01990d4d-e600-7000-8000-000000000000",
  "01990d4d-e601-7000-8000-000000000000",
] as const;
const timestampBytes = [
  unwrap(uuidStringToBytes(timestampUuids[0])),
  unwrap(uuidStringToBytes(timestampUuids[1])),
] as const;
// slugid's bundled UUID parser accepts v4, so use the common supported version for conversions.
const conversionUuids = [
  "550e8400-e29b-41d4-a716-446655440000",
  "ffffffff-ffff-4fff-bfff-ffffffffffff",
] as const;
const conversionSlugs = [
  unwrap(uuidStringToPlainSlug(conversionUuids[0])),
  unwrap(uuidStringToPlainSlug(conversionUuids[1])),
] as const;
const shortAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const shortTranslator = createTranslator(shortAlphabet);
// Numeric radix-64 pads on the left; UUID base64url pads trailing bits. The alphabet alone
// cannot make these wire formats identical. Build independent witnesses outside timed calls.
function numericSlug(value: string): string {
  let bits = BigInt("0x" + value.replaceAll("-", ""));
  let encoded = "";
  for (let index = 0; index < 22; index += 1) {
    encoded = shortAlphabet.charAt(Number(bits & 63n)) + encoded;
    bits >>= 6n;
  }
  return encoded;
}
const numericSlugs = [numericSlug(conversionUuids[0]), numericSlug(conversionUuids[1])] as const;
const offsetTimestampBytes = new Uint8Array(24);
const offsetTimestampBytesSecond = new Uint8Array(24);
offsetTimestampBytes.set(timestampBytes[0], 4);
offsetTimestampBytesSecond.set(timestampBytes[1], 4);
const timestampSlugs = [
  unwrap(uuidBytesToPlainSlug(timestampBytes[0])),
  unwrap(uuidBytesToPlainSlug(timestampBytes[1])),
] as const;
const timestampSlugsBase32 = [
  unwrap(uuidBytesToPlainSlug(timestampBytes[0], "base32hex")),
  unwrap(uuidBytesToPlainSlug(timestampBytes[1], "base32hex")),
] as const;
const timestampCodec = unwrap(createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK }));
const timestampCodecBase32 = unwrap(
  createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK, maskedSlugAlphabet: "base32hex" }),
);
const maskedTimestampSlugs = [
  unwrap(timestampCodec.uuidToMaskedSlug(timestampUuids[0])),
  unwrap(timestampCodec.uuidToMaskedSlug(timestampUuids[1])),
] as const;
const maskedTimestampSlugsBase32 = [
  unwrap(timestampCodecBase32.uuidToMaskedSlug(timestampUuids[0])),
  unwrap(timestampCodecBase32.uuidToMaskedSlug(timestampUuids[1])),
] as const;

function alternating<Input, Output>(
  values: readonly [Input, Input],
  operation: (value: Input) => Output,
): () => Output {
  let index = 0;
  return () => operation(values[(index ^= 1)] as Input);
}

const row = (
  name: string,
  version: 4 | 7,
  comparable: string,
  implementation: string,
  operation: () => GenerationValue,
  options: RowOptions = { secure: true },
): GenerationCase => ({
  comparable,
  implementation,
  name,
  operation,
  qualification: "qualified",
  version,
  ...options,
});

/**
 * Calls grouped by work performed. A shared `comparable` value names the requested representation;
 * only rows preserving mandatory output, security, and published guarantees may win that group.
 * Other strategy differences matter only when they materially weaken the requested result.
 */
export const generationCases: readonly GenerationCase[] = [
  row(
    "package.uuid.slug.encode",
    4,
    "uuid.slug.base64url.encode",
    "validated-text",
    alternating(conversionUuids, (value) => unwrap(uuidStringToPlainSlug(value))),
    { expectedValues: [conversionSlugs[1], conversionSlugs[0]] },
  ),
  row(
    "slugid.uuid.slug.encode",
    4,
    "uuid.slug.base64url.encode",
    "validated-text",
    alternating(conversionUuids, slugid.encode),
    { expectedValues: [conversionSlugs[1], conversionSlugs[0]] },
  ),
  row(
    "package.uuid.slug.decode",
    4,
    "uuid.slug.base64url.decode",
    "validated-slug",
    alternating(conversionSlugs, (value) => unwrap(plainSlugToUuidString(value))),
    { expectedValues: [conversionUuids[1], conversionUuids[0]] },
  ),
  row(
    "slugid.uuid.slug.decode",
    4,
    "uuid.slug.base64url.decode",
    "validated-uuid-output",
    alternating(conversionSlugs, slugid.decode),
    {
      expectedValues: [conversionUuids[1], conversionUuids[0]],
      note: "Canonical valid input only; permissive slug padding is not compared.",
    },
  ),
  row(
    "short-uuid.uuid.slug.encode",
    4,
    "uuid.slug.numeric-base64url.encode",
    "numeric-radix",
    alternating(conversionUuids, (value) => shortTranslator.fromUUID(value)),
    {
      expectedValues: [numericSlugs[1], numericSlugs[0]],
      note: "Same alphabet and lossless UUID job; different numeric wire format, not canonical base64url.",
    },
  ),
  row(
    "short-uuid.uuid.slug.decode",
    4,
    "uuid.slug.numeric-base64url.decode",
    "numeric-radix",
    alternating(numericSlugs, (value) => shortTranslator.toUUID(value)),
    {
      expectedValues: [conversionUuids[1], conversionUuids[0]],
      note: "Translator setup is outside each call; input uses its numeric wire format.",
    },
  ),
  row("slugid.v4.slug.base64url", 4, "v4.slug.base64url.secure", "pooled-portable", slugid.v4),
  row(
    "platform.webcrypto.v4.text",
    4,
    "v4.text.secure",
    "platform",
    globalThis.crypto.randomUUID.bind(globalThis.crypto),
    { secure: true },
  ),
  row("package.v4.text.native", 4, "v4.text.secure", "runtime-selected", () => generateUuidV4()),
  row("package.v4.text.portable", 4, "v4.text.secure", "portable", () =>
    unwrap(generatePortableUuidV4()),
  ),
  row("package.v4.bytes.allocate", 4, "v4.bytes.allocate.secure", "portable", () =>
    generateUuidV4Bytes(),
  ),
  row(
    "package.v4.bytes.into",
    4,
    "v4.bytes.into.secure",
    "portable",
    () => unwrap(generateUuidV4Bytes(intoV4, 4)),
    { outputOffset: 4, secure: true },
  ),
  row("platform.webcrypto.v4.bytes.allocate", 4, "v4.bytes.allocate.secure", "platform", () =>
    asUuidV4(globalThis.crypto.getRandomValues(new Uint8Array(16))),
  ),
  row(
    "platform.webcrypto.v4.bytes.into",
    4,
    "v4.bytes.into.secure",
    "platform",
    () => {
      globalThis.crypto.getRandomValues(platformV4IntoView);
      return asUuidV4(platformV4Into, 4);
    },
    { outputOffset: 4, secure: true },
  ),
  row("package.v4.slug.base64url", 4, "v4.slug.base64url.secure", "portable", () =>
    generatePlainUuidV4Slug(),
  ),
  ...(hasToBase64
    ? [
        row("platform.webcrypto.v4.slug.base64url", 4, "v4.slug.base64url.secure", "platform", () =>
          (
            asUuidV4(globalThis.crypto.getRandomValues(new Uint8Array(16))) as Uint8Array & {
              toBase64(options: typeof base64urlOutputOptions): string;
            }
          ).toBase64(base64urlOutputOptions),
        ),
        // Slug callers receive only the string; a private scratch avoids unused owned bytes.
        // Keep the allocating row to distinguish storage reuse from native encoding cost.
        row(
          "platform.webcrypto.v4.slug.scratch.base64url",
          4,
          "v4.slug.base64url.secure",
          "platform",
          () =>
            (
              asUuidV4(fillV4()) as Uint8Array & {
                toBase64(options: typeof base64urlOutputOptions): string;
              }
            ).toBase64(base64urlOutputOptions),
        ),
        // Reuse the actual package draw, including its failure boundary. This isolates native
        // encoding from the pooled draw path without copying the pool or adding another RNG.
        row(
          "composition.v4.slug.pooled.base64url",
          4,
          "v4.slug.base64url.secure",
          "pooled-native-encoding",
          () =>
            (
              unwrap(drawUuidV4Scratch()) as Uint8Array & {
                toBase64(options: typeof base64urlOutputOptions): string;
              }
            ).toBase64(base64urlOutputOptions),
          {
            note: "Diagnostic private package draw; public slug selection and fallback are excluded.",
          },
        ),
      ]
    : []),
  row("uuid.v4.text.default", 4, "v4.text.secure", "native-when-available", () => uuidV4()),
  row("uuid.v4.text.portable", 4, "v4.text.secure", "portable", () => uuidV4(portableV4Options)),
  row("uuid.v4.bytes.allocate", 4, "v4.bytes.allocate.secure", "portable", () =>
    uuidV4(portableV4Options, new Uint8Array(16)),
  ),
  row(
    "uuid.v4.bytes.into",
    4,
    "v4.bytes.into.secure",
    "portable",
    () => uuidV4(portableV4Options, uuidV4Into, 4),
    { outputOffset: 4, secure: true },
  ),
  row("uuidv7.v4.text", 4, "v4.text.secure", "portable", packageUuidV7V4),
  row("uniku.v4.text", 4, "v4.text.secure", "native", unikuV4),
  row(
    "uniku.v4.bytes.into",
    4,
    "v4.bytes.into.secure",
    "portable",
    () => unikuV4(undefined, unikuV4Into, 4),
    { outputOffset: 4, secure: true },
  ),
  row(
    "uuidv7.v4.bytes.allocate",
    4,
    "v4.bytes.allocate.secure",
    "portable",
    () => packageUuidV7V4Object().bytes,
  ),
  row("smithy.v4.text", 4, "v4.text.secure", "portable", smithyV4),
  row("lukeed.v4.text.secure", 4, "v4.text.secure", "pooled-portable", lukeedSecureV4),
  row("uuid-random.v4.text", 4, "v4.text.secure", "pooled-portable", uuidRandom),
  row("lukeed.v4.text.insecure", 4, "v4.text.insecure", "math-random", lukeedV4, {
    note: "Not a cryptographically secure UUIDv4 competitor",
    qualification: "rejected",
    rejectionReason: "Math.random does not provide cryptographic UUIDv4 entropy.",
    secure: false,
  }),

  row("package.v7.text.default", 7, "v7.text.secure", "module-default", () => generateUuidV7()),
  row("package.v7.pair.default", 7, "v7.pair.secure", "module-default", () =>
    generateUuidV7WithPlainSlug(),
  ),
  row("package.v7.pair.composed", 7, "v7.pair.secure", "composed", () => {
    // One draw is the equivalent consumer job; separate generators would produce unrelated IDs.
    const bytes = generateUuidV7Bytes();
    return { uuid: unwrap(bytesToUuidString(bytes)), slug: unwrap(uuidBytesToPlainSlug(bytes)) };
  }),
  row("package.v7.text.portable", 7, "v7.text.secure", "portable", () =>
    unwrap(portableV7.generateUuidV7()),
  ),
  row("package.v7.bytes.allocate", 7, "v7.bytes.allocate.secure", "portable", () =>
    generateUuidV7Bytes(),
  ),
  row(
    "package.v7.bytes.into",
    7,
    "v7.bytes.into.secure",
    "portable",
    () => unwrap(generateUuidV7Bytes(intoV7, 4)),
    { outputOffset: 4, secure: true },
  ),
  row("package.v7.slug.base64url", 7, "v7.slug.base64url.secure", "module-default", () =>
    generatePlainUuidV7Slug(),
  ),
  row("uuid.v7.text.default", 7, "v7.text.secure", "portable-stateful", () => uuidV7()),
  row("uuid.v7.text.options", 7, "v7.text.secure", "portable-stateless-options", () =>
    uuidV7(portableV7Options),
  ),
  row("uuid.v7.bytes.allocate", 7, "v7.bytes.allocate.secure", "portable-stateful", () =>
    uuidV7(undefined, new Uint8Array(16)),
  ),
  row(
    "uuid.v7.bytes.into",
    7,
    "v7.bytes.into.secure",
    "portable-stateful",
    () => uuidV7(undefined, uuidV7Into, 4),
    { outputOffset: 4, secure: true },
  ),
  row("uuidv7.v7.text", 7, "v7.text.secure", "portable-stateful", packageUuidV7V7),
  row("uniku.v7.text", 7, "v7.text.secure", "portable-stateful", unikuV7),
  row(
    "uniku.v7.bytes.into",
    7,
    "v7.bytes.into.secure",
    "portable-stateful",
    () => unikuV7(undefined, unikuV7Into, 4),
    { outputOffset: 4, secure: true },
  ),
  row(
    "uuidv7.v7.bytes.allocate",
    7,
    "v7.bytes.allocate.secure",
    "portable-stateful",
    () => packageUuidV7V7Object().bytes,
  ),
  // Web Crypto supplies its tail. Zero-start counters are compatible with the default native
  // baseline; differing payload layouts and clock behavior are observations, not exclusions.
  row("fastv7.v7.text", 7, "v7.text.secure", "pooled-portable", fastV7),
  row("uuidv7-js.v7.text", 7, "v7.text.secure", "portable-stateful", uuidv7Js),
  row("kripod.v7.text", 7, "v7.text.secure", "portable-stateful", kripodV7),

  row(
    "package.v7.timestamp.text",
    7,
    "v7.timestamp.text",
    "validated-text",
    alternating(timestampUuids, (value) => unwrap(extractUuidV7UnixMs(value))),
    { expectedTimestamps: timestamps },
  ),
  row(
    "package.v7.timestamp.bytes",
    7,
    "v7.timestamp.bytes",
    "validated-bytes",
    alternating(timestampBytes, (value) => unwrap(extractUuidV7UnixMs(value))),
    { expectedTimestamps: timestamps },
  ),
  row(
    "package.v7.timestamp.bytes.offset",
    7,
    "v7.timestamp.bytes.offset",
    "validated-bytes",
    alternating([offsetTimestampBytes, offsetTimestampBytesSecond], (value) =>
      unwrap(extractUuidV7UnixMs(value, 4)),
    ),
    { expectedTimestamps: timestamps },
  ),
  row(
    "package.v7.timestamp.slug",
    7,
    "v7.timestamp.slug",
    "validated-base64url",
    alternating(timestampSlugs, (value) => unwrap(extractUuidV7UnixMs(value))),
    { expectedTimestamps: timestamps },
  ),
  row(
    "package.v7.timestamp.slug.base32hex",
    7,
    "v7.timestamp.slug",
    "validated-base32hex",
    alternating(timestampSlugsBase32, (value) => unwrap(extractUuidV7UnixMs(value))),
    { expectedTimestamps: timestamps },
  ),
  row(
    "package.v7.timestamp.masked",
    7,
    "v7.timestamp.masked",
    "authenticated-base64url",
    alternating(maskedTimestampSlugs, (value) =>
      unwrap(timestampCodec.extractMaskedUuidV7UnixMs(value)),
    ),
    { expectedTimestamps: timestamps },
  ),
  row(
    "package.v7.timestamp.masked.base32hex",
    7,
    "v7.timestamp.masked",
    "authenticated-base32hex",
    alternating(maskedTimestampSlugsBase32, (value) =>
      unwrap(timestampCodecBase32.extractMaskedUuidV7UnixMs(value)),
    ),
    { expectedTimestamps: timestamps },
  ),
  row(
    "uuidv7-js.v7.timestamp.text",
    7,
    "v7.timestamp.text",
    "validated-text",
    alternating(timestampUuids, (value) => UuidV7Js.timestamp(value) ?? Number.NaN),
    { expectedTimestamps: timestamps },
  ),
  row(
    "uniku.v7.timestamp.text",
    7,
    "v7.timestamp.text.unchecked-version",
    "parsed-text",
    alternating(timestampUuids, (value) => unikuV7.timestamp(value)),
    {
      expectedTimestamps: timestamps,
      note: "Parses canonical UUID text but does not reject a non-v7 UUID",
      qualification: "rejected",
      rejectionReason: "The call does not verify that its input is UUIDv7.",
    },
  ),
];
