// SPDX-License-Identifier: Apache-2.0

import { v4 as lukeedV4 } from "@lukeed/uuid";
import { v4 as lukeedSecureV4 } from "@lukeed/uuid/secure";
import { v4 as smithyV4 } from "@smithy/uuid";
import { uuidv7 as kripodV7 } from "@kripod/uuidv7";
import { uuid as fastV7 } from "fastv7";
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

import { unwrap } from "../dev/unwrap";
import {
  createUuidV7Generator,
  createUuidV7MaskingCodec,
  uuidBytesToPlainSlug,
  extractUuidV7UnixMs,
  generateUuidV4,
  generateUuidV4Bytes,
  generateUuidV7,
  generateUuidV7Bytes,
  UUID_V7_TEST_MASK,
  uuidStringToBytes,
} from "../src/index";
import { generatePortableUuidV4 } from "../src/v4";

export type GenerationValue = number | string | Uint8Array | Readonly<Uint8Array>;

export interface GenerationCase {
  readonly comparable: string;
  readonly implementation: string;
  readonly name: string;
  readonly note?: string;
  readonly outputOffset?: number;
  readonly operation: () => GenerationValue;
  readonly expectedTimestamps?: readonly number[];
  readonly secure?: boolean;
  readonly qualification: "qualified" | "rejected";
  readonly rejectionReason?: string;
  readonly version: 4 | 7;
}

type RowOptions = Partial<
  Pick<
    GenerationCase,
    "expectedTimestamps" | "note" | "outputOffset" | "rejectionReason" | "secure"
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
    "platform.webcrypto.v4.text",
    4,
    "v4.text.secure",
    "platform",
    globalThis.crypto.randomUUID.bind(globalThis.crypto),
    { secure: true },
  ),
  row("package.v4.text.native", 4, "v4.text.secure", "runtime-selected", () =>
    unwrap(generateUuidV4()),
  ),
  row("package.v4.text.portable", 4, "v4.text.secure", "portable", () =>
    unwrap(generatePortableUuidV4()),
  ),
  row("package.v4.bytes.allocate", 4, "v4.bytes.allocate.secure", "portable", () =>
    unwrap(generateUuidV4Bytes()),
  ),
  row(
    "package.v4.bytes.into",
    4,
    "v4.bytes.into.secure",
    "portable",
    () => unwrap(generateUuidV4Bytes(intoV4, 4)),
    { outputOffset: 4, secure: true },
  ),
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

  row("package.v7.text.default", 7, "v7.text.secure", "module-default", () =>
    unwrap(generateUuidV7()),
  ),
  row("package.v7.text.portable", 7, "v7.text.secure", "portable", () =>
    unwrap(portableV7.generateUuidV7()),
  ),
  row("package.v7.bytes.allocate", 7, "v7.bytes.allocate.secure", "portable", () =>
    unwrap(generateUuidV7Bytes()),
  ),
  row(
    "package.v7.bytes.into",
    7,
    "v7.bytes.into.secure",
    "portable",
    () => unwrap(generateUuidV7Bytes(intoV7, 4)),
    { outputOffset: 4, secure: true },
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
  row("fastv7.v7.text", 7, "v7.text.secure", "pooled-portable", fastV7, {
    qualification: "rejected",
    rejectionReason:
      "Independent processes and restarted state reuse sequence zero. This leaves 62 random bits per value; this package also starts its 42-bit sequence from a random seed.",
  }),
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

/** Fail before timing when a row no longer returns the representation it claims. */
export function verifyGenerationCase(candidate: GenerationCase): void {
  const value = candidate.operation();
  if (candidate.expectedTimestamps !== undefined) {
    if (typeof value !== "number" || !candidate.expectedTimestamps.includes(value))
      throw new Error(`${candidate.name} returned the wrong UUIDv7 timestamp`);
    return;
  }
  if (candidate.comparable.includes(".text.")) {
    if (
      typeof value !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value) ||
      value[14] !== String(candidate.version)
    )
      throw new Error(`${candidate.name} did not return canonical UUIDv${candidate.version} text`);
    return;
  }
  const offset = candidate.outputOffset ?? 0;
  if (
    !(value instanceof Uint8Array) ||
    value.length < offset + 16 ||
    value[offset + 6]! >>> 4 !== candidate.version ||
    (value[offset + 8]! & 0xc0) !== 0x80
  )
    throw new Error(`${candidate.name} did not return UUID bytes`);
}
