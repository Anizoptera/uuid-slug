// SPDX-License-Identifier: Apache-2.0

import { strict as assert } from "node:assert";

// Change the capability before import in a fresh process: cached module selection cannot be
// tested by replacing a method after the encoder has already captured it.
const mode = process.argv[2];
assert.ok(mode === "present" || mode === "absent" || mode === "throw" || mode === "corrupt");
const descriptor = Object.getOwnPropertyDescriptor(Uint8Array.prototype, "toBase64");
const original = descriptor?.value as
  | ((this: Uint8Array, options: { alphabet: "base64url"; omitPadding: boolean }) => string)
  | undefined;
let calls = 0;
// eslint-disable-next-line no-extend-native -- This isolated process must select the real import-time capability boundary before importing the encoder.
Object.defineProperty(Uint8Array.prototype, "toBase64", {
  configurable: true,
  value:
    mode === "absent"
      ? undefined
      : function (this: Uint8Array, options: { alphabet: "base64url"; omitPadding: boolean }) {
          calls += 1;
          if (mode === "throw") throw new Error("native encoding unavailable");
          assert.ok(original, "present-capability proof requires the real native encoder");
          const result = original.call(this, options);
          return mode === "corrupt" ? result.slice(0, 21) + "A" : result;
        },
});
const { encode, BASE64URL, BASE32HEX, BASE64URL_NAME, BASE32HEX_NAME } =
  await import("../src/alphabet");
const { uuidBytesToPlainSlug } = await import("../src/slug");
const publicCall = process.env.UUID_SLUG_PROBE_PUBLIC_PLAIN === "1";
for (let seed = 0; seed < 256; seed += 1) {
  const bytes = Uint8Array.from({ length: 16 }, (_, index) => seed * 197 + index * 131);
  assert.equal(
    publicCall ? uuidBytesToPlainSlug(bytes) : encode(bytes, BASE64URL),
    Buffer.from(bytes).toString("base64url"),
  );
  if (publicCall) {
    assert.equal(
      uuidBytesToPlainSlug(bytes, BASE64URL_NAME),
      Buffer.from(bytes).toString("base64url"),
    );
    assert.equal(
      uuidBytesToPlainSlug(bytes, 0, BASE64URL_NAME),
      Buffer.from(bytes).toString("base64url"),
    );
  }
}
const plainCalls = calls;
const payload = new Uint8Array(16);
for (let tail = 0; tail < 16; tail += 1) {
  assert.equal(encode(payload, BASE64URL, tail, 4), "A".repeat(21) + BASE64URL.chars[tail]);
  assert.equal(encode(payload, BASE32HEX), "0".repeat(26));
  if (publicCall) assert.equal(uuidBytesToPlainSlug(payload, BASE32HEX_NAME), "0".repeat(26));
}
assert.equal(calls, plainCalls, "masked tails and base32hex must keep the existing writer");
assert.equal(
  calls,
  process.env.UUID_SLUG_EXPECT_NATIVE_PLAIN === "1" && mode !== "absent"
    ? mode === "throw" && (publicCall || process.env.UUID_SLUG_PROBE_NATIVE_DISABLE === "1")
      ? 1
      : publicCall
        ? 768
        : 256
    : 0,
  "the proof must reach exactly the selected native plain calls",
);
console.log(JSON.stringify({ proof: "native plain encoding", mode, calls, payloads: 256 }));
