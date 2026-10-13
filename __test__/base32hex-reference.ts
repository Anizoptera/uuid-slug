// SPDX-License-Identifier: Apache-2.0

export function encodeBase32hexReference(bytes: Uint8Array, tail = 0, tailBits = 0): string {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  value = (value << BigInt(tailBits)) | BigInt(tail);
  const chars = Math.ceil((bytes.length * 8 + tailBits) / 5);
  value <<= BigInt(chars * 5 - bytes.length * 8 - tailBits);
  // Numeric radix 32 supplies RFC digits independently of production alphabet metadata.
  return chars === 0 ? "" : value.toString(32).padStart(chars, "0");
}
