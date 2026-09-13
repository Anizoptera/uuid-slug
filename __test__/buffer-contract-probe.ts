// SPDX-License-Identifier: Apache-2.0

/**
 * Every public entry point that takes a caller's buffer and an offset, driven through one hostile
 * offset matrix.
 *
 * Shared by the vitest and the bun:test lanes for the reason `entropy-probe.ts` gives, and here the
 * split is not hypothetical: Node and Bun use different runtime adapters, while UUIDv7 byte
 * generation stays portable on both because Bun's native byte route measured slower. Every adapter
 * must reject the same caller ranges before entropy is consumed and commit only after generation succeeds.
 *
 * The invariant is what makes the failure self-revealing, rather than the offsets: a rejected call
 * MUST report `invalid_buffer` AND leave the buffer byte-identical. Reporting alone would pass a
 * guard that errors after a partial write; an untouched buffer alone would pass a call that wrote
 * nothing and claimed success. Both together admit only "refused, and did nothing".
 */
import { UuidSlugError } from "../src/errors";
import {
  createUuidV7SlugCodec,
  extractUuidV7Timestamp,
  bytesToUuid,
  bytesToSlug,
  uuidToBytes,
  slugToBytes,
  UUID_V7_TEST_MASK,
  generateUuidV4Bytes,
  generateUuidV7Bytes,
  generateUuidV7BytesAt,
} from "../src/index";
import { bytePatterns } from "./byte-patterns";

const UUID = "018f4f2e-4c3d-7000-8000-0123456789ab";
const SLUG = "AY9PLkw9cACAAAEjRWeJqw";
const BASE32_SLUG = "067kubic7lo0100004hkaps9lc";
const INSTANT = 1_700_000_000_000;

/** Fill byte chosen so any stray write shows up as a value no generator would produce wholesale. */
const FILL = 0xee;
const BUFFER_BYTES = 32;
const codec = createUuidV7SlugCodec({ mask: UUID_V7_TEST_MASK });
if (codec instanceof Error) throw codec;
const MASKED_SLUG = codec.encodeUuid(UUID);
if (MASKED_SLUG instanceof Error) throw MASKED_SLUG;

/**
 * `"4"` is in the matrix because a string offset defeats a length guard by CONCATENATION rather
 * than by comparison — `"4" + 16` is `"416"` — so it fails a different half of the check from
 * `0.5`, which defeats it by being an index no store ever lands on. `2 ** 53` is past the point
 * where adding 16 changes the value at all.
 */
const HOSTILE_NUMERIC_OFFSETS: readonly unknown[] = [-1, 0.5, NaN, Infinity, 2 ** 53, 17];
export const HOSTILE_OFFSETS: readonly unknown[] = [...HOSTILE_NUMERIC_OFFSETS, "4"];

/** Entry points that WRITE into the caller's buffer; the strictest form of the invariant. */
const writers: readonly (readonly [string, (out: Uint8Array, offset: number) => unknown])[] = [
  ["uuidToBytes", (out, offset) => uuidToBytes(UUID, out, offset)],
  ["slugToBytes", (out, offset) => slugToBytes(SLUG, out, offset)],
  ["decodeBytes", (out, offset) => codec.decodeSlugToBytes(MASKED_SLUG, out, offset)],
  ["generateUuidV4Bytes", (out, offset) => generateUuidV4Bytes(out, offset)],
  ["generateUuidV7Bytes", (out, offset) => generateUuidV7Bytes(out, offset)],
  ["generateUuidV7BytesAt", (out, offset) => generateUuidV7BytesAt(INSTANT, out, offset)],
];

const malformedWriters: readonly (readonly [string, (out: Uint8Array) => unknown])[] = [
  ["uuidToBytes", (out) => uuidToBytes(UUID.slice(0, -1) + "x", out)],
  ["slugToBytes invalid base64url character", (out) => slugToBytes(SLUG.slice(0, -1) + "!", out)],
  [
    "slugToBytes non-canonical base64url padding",
    (out) => slugToBytes(SLUG.slice(0, -1) + "x", out),
  ],
  [
    "slugToBytes invalid base32hex character",
    (out) => slugToBytes(BASE32_SLUG.slice(0, -1) + "w", out),
  ],
  [
    "slugToBytes non-canonical base32hex padding",
    (out) => slugToBytes(BASE32_SLUG.slice(0, -1) + "d", out),
  ],
  [
    "decodeBytes invalid slug",
    (out) => codec.decodeSlugToBytes(MASKED_SLUG.slice(0, -1) + "!", out),
  ],
];

/** Entry points that only READ at the offset, so only the report half of the invariant applies. */
const readers: readonly (readonly [
  string,
  (bytes: Uint8Array, offset: number) => unknown,
  readonly unknown[],
])[] = [
  ["bytesToUuid", (bytes, offset) => bytesToUuid(bytes, offset), HOSTILE_OFFSETS],
  ["bytesToSlug", (bytes, offset) => bytesToSlug(bytes, offset), HOSTILE_NUMERIC_OFFSETS],
  [
    "extractUuidV7Timestamp",
    (bytes, offset) => extractUuidV7Timestamp(bytes, offset),
    HOSTILE_OFFSETS,
  ],
];

interface ProbeCase {
  readonly name: string;
  /** The failure, or `undefined` when the entry point honoured the contract. */
  readonly run: () => string | undefined;
}

function refusal(value: unknown): string | undefined {
  if (!(value instanceof UuidSlugError)) return `returned ${String(value)} instead of an Error`;
  return value.code === "invalid_buffer" ? undefined : `reported code ${value.code}`;
}

function untouched(buffer: Uint8Array): string | undefined {
  const stray = buffer.findIndex((byte) => byte !== FILL);
  return stray < 0 ? undefined : `wrote into the buffer at index ${stray}`;
}

/**
 * Also covers the no-`out` form: an entry point that allocates its own 16 bytes must still refuse
 * an offset it cannot honour, rather than sizing a fresh buffer around it.
 */
export const cases: readonly ProbeCase[] = [
  {
    name: "encoders preserve UUID byte values and shared-buffer slices",
    run: () => {
      for (const backing of [new ArrayBuffer(80), new SharedArrayBuffer(80)]) {
        for (const { bytes, shift } of bytePatterns(backing)) {
          const view = bytes.subarray(4, 20);
          if (bytesToSlug(view) !== Buffer.from(view).toString("base64url"))
            return `base64url differs for shift ${shift}`;
          const hex = Buffer.from(bytes.subarray(4, 20)).toString("hex");
          const expected = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
          if (bytesToUuid(bytes, 4) !== expected || bytesToUuid(bytes.subarray(4, 20)) !== expected)
            return `UUID formatting differs for shift ${shift}`;
        }
      }
      return undefined;
    },
  },
  {
    name: "bytesToSlug selects a whole payload alphabet without a placeholder offset",
    run: () => {
      const payload = uuidToBytes(UUID);
      if (payload instanceof Error) return "could not create the known UUID payload";
      const container = new Uint8Array(24);
      container.set(payload, 4);
      if (bytesToSlug(payload, "base32hex") !== BASE32_SLUG)
        return "whole-payload base32hex output differs from the known spelling";
      return bytesToSlug(container, 4, "base32hex") === BASE32_SLUG
        ? undefined
        : "numeric-offset base32hex output differs from the known spelling";
    },
  },
  ...writers.flatMap(([name, call]) =>
    HOSTILE_OFFSETS.map((offset) => ({
      name: `${name} refuses offset ${String(offset)} and writes nothing`,
      run: () => {
        const buffer = new Uint8Array(BUFFER_BYTES).fill(FILL);
        return refusal(call(buffer, offset as number)) ?? untouched(buffer);
      },
    })),
  ),
  ...malformedWriters.map(([name, call]) => ({
    name: `${name} leaves no partial output`,
    run: () => {
      const buffer = new Uint8Array(BUFFER_BYTES).fill(FILL);
      const result = call(buffer);
      return result instanceof UuidSlugError ? untouched(buffer) : `returned ${String(result)}`;
    },
  })),
  ...readers.flatMap(([name, call, offsets]) =>
    offsets.map((offset) => ({
      name: `${name} refuses offset ${String(offset)}`,
      run: () => refusal(call(new Uint8Array(BUFFER_BYTES).fill(FILL), offset as number)),
    })),
  ),
];
