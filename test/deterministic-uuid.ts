// SPDX-License-Identifier: Apache-2.0

/**
 * A UUIDv7 with the shape of a generated one but derived from a counter.
 *
 * Rates are the thing several cases here measure — how often a wrong key is accepted, how often a
 * direct slug is mistaken for a masked one — and a rate taken over generated ids is a sample that
 * fails a few runs in a hundred. Over these it is a fixed number, so a bound can sit close to the
 * measurement instead of far enough out to absorb the noise, which is what lets the bound
 * discriminate a real narrowing of the check from an unlucky afternoon.
 *
 * Byte 0 is zeroed because the maskable range ends at 2^42 ms.
 */
import { mix32 } from "../src/feistel";
import { formatUuid } from "../src/uuid";
import type { UuidV7String } from "../src/types";

/**
 * Fills `out` rather than returning a fresh array, and is the form the rate cases use: at a
 * hundred thousand draws an allocation per draw is the measurement's dominant cost, and so is
 * formatting a string only to parse it straight back.
 */
export function deterministicUuidV7Bytes(index: number, out: Uint8Array): Uint8Array {
  for (let word = 0; word < 4; word += 1) {
    const value = mix32(index * 4 + word + 0x9e37_79b9);
    out[word * 4] = value >>> 24;
    out[word * 4 + 1] = (value >>> 16) & 0xff;
    out[word * 4 + 2] = (value >>> 8) & 0xff;
    out[word * 4 + 3] = value & 0xff;
  }
  out[0] = 0;
  out[6] = ((out[6] as number) & 0x0f) | 0x70;
  out[8] = ((out[8] as number) & 0x3f) | 0x80;
  return out;
}

export function deterministicUuidV7(index: number): UuidV7String {
  const uuid = formatUuid(deterministicUuidV7Bytes(index, new Uint8Array(16)));
  if (uuid instanceof Error) throw uuid;
  return uuid as UuidV7String;
}
