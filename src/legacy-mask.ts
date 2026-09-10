// SPDX-License-Identifier: Apache-2.0

import { UuidSlugError } from "./errors";

// These tables and the four-bit checksum define the original wire format.
// Changing them would change the UUID recovered from an existing slug.
const PERMUTE = [9, 13, 3, 8, 14, 0, 11, 7, 6, 1, 15, 4, 2, 5, 10, 12] as const;
const XOR = [
  0xa2, 0x70, 0x32, 0x7f, 0x98, 0xb8, 0x9b, 0x5e, 0x1b, 0x26, 0xb6, 0x16, 0x96, 0xf9, 0xea, 0x3e,
] as const;

/** Return a matching candidate or undefined; callers resolve sentinels before trying masks. */
export function decodeOriginalMask(mixed: Uint8Array): Uint8Array | undefined | UuidSlugError {
  if (mixed.length !== 16)
    return new UuidSlugError("invalid_buffer", "Original masked slugs require 16 decoded bytes.");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++)
    bytes[PERMUTE[i] as number] = (mixed[i] as number) ^ (XOR[i] as number);
  const found = (bytes[6] as number) >>> 4;
  bytes[6] = ((bytes[6] as number) & 15) | 0x70;
  let checksum = 0;
  for (const byte of bytes) checksum ^= byte;
  // A mismatch is expected while trying formats; allocate diagnostics only if the reader fails.
  return ((checksum >>> 4) ^ (checksum & 15)) === found ? bytes : undefined;
}
