// SPDX-License-Identifier: Apache-2.0

import { strict as assert } from "node:assert";
import { Buffer } from "node:buffer";

// A fresh process owns the capability replacement before either factory captures its method.
const mode = process.argv[2];
assert.ok(mode === "present" || mode === "absent" || mode === "throw");
const original = (
  Buffer.prototype as {
    latin1Slice?: (this: Uint8Array, start: number, end: number) => string;
  }
).latin1Slice;
let calls = 0;
// eslint-disable-next-line no-extend-native -- This process tests the real optional native boundary before package import.
Object.defineProperty(Buffer.prototype, "latin1Slice", {
  configurable: true,
  value:
    mode === "absent"
      ? undefined
      : function (this: Uint8Array, start: number, end: number) {
          calls += 1;
          if (mode === "throw") throw new Error("native Latin-1 unavailable");
          assert.ok(original, "present proof requires the real native method");
          return original.call(this, start, end);
        },
});
const { bufferLatin1Scratch } = await import("../src/runtime/portable");
const scratch = bufferLatin1Scratch(Buffer)(256);
for (let value = 0; value < 256; value += 1) scratch.bytes[value] = value;
const expected = String.fromCharCode(...Array.from({ length: 256 }, (_, value) => value));
assert.equal(scratch.text(), expected, "scratch must preserve all Latin-1 bytes");
assert.equal(scratch.text(), expected, "a failed method must leave reusable generic text");
const selected = process.env.UUID_SLUG_EXPECT_DIRECT_LATIN1 === "1";
assert.equal(calls, selected && mode !== "absent" ? (mode === "throw" ? 1 : 2) : 0);
const { bytesToUuidString, uuidBytesToPlainSlug, BASE32HEX, UUID_TEXT_UPPERCASE } =
  await import("../src/index");
const genericCalls = calls;
for (let bit = 0; bit < 128; bit += 1) {
  const bytes = new Uint8Array(16);
  bytes[Math.floor(bit / 8)] = 1 << (bit % 8);
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  const text =
    hex.slice(0, 8) +
    "-" +
    hex.slice(8, 12) +
    "-" +
    hex.slice(12, 16) +
    "-" +
    hex.slice(16, 20) +
    "-" +
    hex.slice(20);
  assert.equal(bytesToUuidString(bytes), text);
  assert.equal(bytesToUuidString(bytes, UUID_TEXT_UPPERCASE), text.toUpperCase());
  assert.equal(uuidBytesToPlainSlug(bytes), Buffer.from(bytes).toString("base64url"));
  // Numeric base32 uses the same digit alphabet; shifting supplies the two zero padding bits.
  assert.equal(
    uuidBytesToPlainSlug(bytes, BASE32HEX),
    (BigInt("0x" + hex) << 2n).toString(32).padStart(26, "0"),
  );
}
assert.equal(
  calls - genericCalls,
  selected && mode !== "absent" ? (mode === "throw" ? 3 : 512) : 0,
);
console.log(JSON.stringify({ proof: "native Latin-1 text", mode, calls, bits: 128 }));
