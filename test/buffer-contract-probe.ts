// SPDX-License-Identifier: Apache-2.0

/**
 * Every public entry point that takes a caller's buffer and an offset, driven through one hostile
 * offset matrix.
 *
 * Shared by the vitest and the bun:test lanes for the reason `entropy-probe.ts` gives, and here the
 * split is not hypothetical: the defect this gate exists for reproduced on Node and NOT on Bun.
 * `uuidV7Bytes` resolves to the portable generator under `runtime/node.ts` and to
 * `Bun.randomUUIDv7("buffer")` under `runtime/bun.ts`, and the two disagree about a bad offset —
 * `subarray` truncates a fractional one, `TypedArray.set` throws on it, and direct indexing
 * silently does nothing. A lane that ran on one runtime would report the class fixed while the
 * other still shipped it.
 *
 * The invariant is what makes the failure self-revealing, rather than the offsets: a rejected call
 * MUST report `invalid_buffer` AND leave the buffer byte-identical. Reporting alone would pass a
 * guard that errors after a partial write; an untouched buffer alone would pass a call that wrote
 * nothing and claimed success. Both together admit only "refused, and did nothing".
 */
import { decodeBase64Url } from "../src/base64url";
import { UuidSlugError } from "../src/errors";
import {
  createUuidSlugCodec,
  extractUuidV7Timestamp,
  formatUuid,
  formatUuidSlug,
  hasUuidV7Entropy,
  parseUuid,
  parseUuidSlug,
} from "../src/index";

const codec = createUuidSlugCodec();

const UUID = "018f4f2e-4c3d-7000-8000-0123456789ab";
const SLUG = "AY9PLkw9cACAAAEjRWeJqw";
const INSTANT = 1_700_000_000_000;

/** Fill byte chosen so any stray write shows up as a value no generator would produce wholesale. */
const FILL = 0xee;
const BUFFER_BYTES = 32;

/**
 * `"4"` is in the matrix because a string offset defeats a length guard by CONCATENATION rather
 * than by comparison — `"4" + 16` is `"416"` — so it fails a different half of the check from
 * `0.5`, which defeats it by being an index no store ever lands on. `2 ** 53` is past the point
 * where adding 16 changes the value at all.
 */
export const HOSTILE_OFFSETS: readonly unknown[] = [-1, 0.5, NaN, Infinity, "4", 2 ** 53, 17];

/** Entry points that WRITE into the caller's buffer; the strictest form of the invariant. */
const writers: readonly (readonly [string, (out: Uint8Array, offset: number) => unknown])[] = [
  ["parseUuid", (out, offset) => parseUuid(UUID, out, offset)],
  ["parseUuidSlug", (out, offset) => parseUuidSlug(SLUG, out, offset)],
  ["decodeBase64Url", (out, offset) => decodeBase64Url(SLUG, out, offset)],
  ["uuidV4Bytes", (out, offset) => codec.uuidV4Bytes(out, offset)],
  ["uuidV7Bytes", (out, offset) => codec.uuidV7Bytes(out, offset)],
  ["uuidV7BytesAt", (out, offset) => codec.uuidV7BytesAt(INSTANT, out, offset)],
];

/** Entry points that only READ at the offset, so only the report half of the invariant applies. */
const readers: readonly (readonly [string, (bytes: Uint8Array, offset: number) => unknown])[] = [
  ["formatUuid", (bytes, offset) => formatUuid(bytes, offset)],
  ["formatUuidSlug", (bytes, offset) => formatUuidSlug(bytes, offset)],
  ["extractUuidV7Timestamp", (bytes, offset) => extractUuidV7Timestamp(bytes, offset)],
];

export interface ProbeCase {
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
  ...writers.flatMap(([name, call]) =>
    HOSTILE_OFFSETS.map((offset) => ({
      name: `${name} refuses offset ${String(offset)} and writes nothing`,
      run: () => {
        const buffer = new Uint8Array(BUFFER_BYTES).fill(FILL);
        return refusal(call(buffer, offset as number)) ?? untouched(buffer);
      },
    })),
  ),
  ...readers.flatMap(([name, call]) =>
    HOSTILE_OFFSETS.map((offset) => ({
      name: `${name} refuses offset ${String(offset)}`,
      run: () => refusal(call(new Uint8Array(BUFFER_BYTES).fill(FILL), offset as number)),
    })),
  ),
  {
    // The one guard whose contract is a boolean, so it cannot report a code. `false` is required in
    // BOTH directions: a short buffer used to read missing bytes as zeroes and answer `true`.
    name: "hasUuidV7Entropy answers false for every offset it cannot read sixteen bytes at",
    run: () => {
      const bytes = new Uint8Array(BUFFER_BYTES).fill(FILL);
      const wrong = HOSTILE_OFFSETS.filter((offset) => hasUuidV7Entropy(bytes, offset as number));
      const short = hasUuidV7Entropy(new Uint8Array(8).fill(FILL));
      if (short) return "answered true for an eight-byte buffer";
      return wrong.length === 0 ? undefined : `answered true for ${wrong.map(String).join(", ")}`;
    },
  },
];
