// Match Rust's varied wire inputs and complete caller jobs, then retain the wider JS API corpus.
// The builder redirects this source-typed graph to each host's public package entry.
import * as api from "../src/index";
import original from "../rust/uuid-slug/tests/fixtures/fixtures-original-slugs.json" with { type: "json" };
import { unwrap } from "../dev/unwrap";
import { createProfileCases } from "./profile-cases";
import type { ProfileCase } from "./profile-case";

export function implementationCases(): Record<string, ProfileCase> {
  const suite = createProfileCases(api, original.issued, undefined);
  suite.verify();
  const bytes = Array.from({ length: 64 }, (_, index) => {
    const value = Uint8Array.from({ length: 16 }, (_byte, i) => (i * 19 + index) & 255);
    value[0] = (value[0] as number) & 3;
    value[6] = ((value[6] as number) & 15) | 0x70;
    value[8] = ((value[8] as number) & 63) | 0x80;
    return value;
  });
  const text = bytes.map((value) => unwrap(api.bytesToUuidString(value)));
  const compactText = text.map((value) => value.replaceAll("-", ""));
  const views = bytes.map((value) => new DataView(value.buffer));
  const buffers = bytes.map((value) => {
    const buffer = new ArrayBuffer(16);
    new Uint8Array(buffer).set(value);
    return buffer;
  });
  const mask = unwrap(
    api.deriveUuidV7Mask({ seed: "benchmark-seed-not-for-production", keyDerivationIterations: 1 }),
  );
  const compact = unwrap(api.createUuidV7MaskingCodec({ mask }));
  const safe = unwrap(api.createUuidV7MaskingCodec({ mask, maskedSlugAlphabet: api.BASE32HEX }));
  const reserved = unwrap(
    api.createUuidV7MaskingCodec({
      mask: api.UUID_V7_TEST_MASK,
      maskedSlugAlphabet: api.BASE32HEX,
      sentinels: [{ name: "reserved", uuid: text[0] as string }],
    }),
  );
  const encoded = bytes.map((value) => unwrap(compact.uuidToMaskedSlug(value)));
  const encoded32 = bytes.map((value) => unwrap(safe.uuidToMaskedSlug(value)));
  const binary = bytes.map((value) => unwrap(compact.uuidToMaskedBytes(value)));
  const plain = bytes.map((value) => unwrap(api.uuidBytesToPlainSlug(value)));
  const plain32 = bytes.map((value) => unwrap(api.uuidBytesToPlainSlug(value, api.BASE32HEX)));
  const output = new Uint8Array(16);
  const migration = unwrap(compact.createUuidSlugMigrationDecoder());
  const sentinel = unwrap(reserved.uuidToMaskedSlug(text[0] as string));
  const upperSentinel = sentinel.toUpperCase();
  const generator = unwrap(api.createUuidV7Generator());
  const layout = { subMillisecondFractionBits: 0, counterBits: 42 };
  const window = { referenceUnixMs: 0, maxTimestampDeltaMs: 2 ** 48 };
  const shared: Record<string, ProfileCase> = {
    "plain/base64": (i) => api.uuidBytesToPlainSlug(bytes[i % 64] as Uint8Array),
    "plain/base32": (i) => api.uuidBytesToPlainSlug(bytes[i % 64] as Uint8Array, api.BASE32HEX),
    "format/uuid/lowercase": (i) => api.bytesToUuidString(bytes[i % 64] as Uint8Array),
    "format/uuid/uppercase": (i) =>
      api.bytesToUuidString(bytes[i % 64] as Uint8Array, api.UUID_TEXT_UPPERCASE),
    "parse/uuid": (i) => api.uuidStringToBytes(text[i % 64] as string),
    "mask/base64": (i) => compact.uuidToMaskedSlug(bytes[i % 64] as Uint8Array),
    "mask/base32": (i) => safe.uuidToMaskedSlug(bytes[i % 64] as Uint8Array),
    "mask/base32/sentinels": (i) => reserved.uuidToMaskedSlug(bytes[i % 64] as Uint8Array),
    "unmask/base64": (i) => compact.uuidToBytes(encoded[i % 64] as string),
    "unmask/base32": (i) => safe.uuidToBytes(encoded32[i % 64] as string),
    "decode/owned": (i) => api.plainSlugToUuidBytes(plain[i % 64] as string),
    "decode/caller-buffer": (i) => api.plainSlugToUuidBytes(plain[i % 64] as string, output),
    "decode/base32/owned": (i) => api.plainSlugToUuidBytes(plain32[i % 64] as string),
    "decode/base32/caller-buffer": (i) =>
      api.plainSlugToUuidBytes(plain32[i % 64] as string, output),
    "sentinel/base32/canonical": () => reserved.uuidToBytes(sentinel),
    "sentinel/base32/uppercase": () => reserved.uuidToBytes(upperSentinel),
    "construct/codec-precomputed-mask": () =>
      api.createUuidV7MaskingCodec({ mask: api.UUID_V7_TEST_MASK }),
    "migration/first-text": (i) => migration.uuidSlugToUuidString(encoded[i % 64] as string),
    "migration/candidates-text": (i) =>
      migration.uuidSlugToUuidStringCandidates(encoded[i % 64] as string),
    "mask/binary/owned": (i) => compact.uuidToMaskedBytes(bytes[i % 64] as Uint8Array),
    "mask/binary/caller-buffer": (i) =>
      compact.uuidToMaskedBytes(bytes[i % 64] as Uint8Array, output),
    "unmask/binary/owned": (i) => compact.maskedBytesToUuidBytes(binary[i % 64] as Uint8Array),
    "unmask/binary/caller-buffer": (i) =>
      compact.maskedBytesToUuidBytes(binary[i % 64] as Uint8Array, output),
    "unmask/binary/text": (i) => compact.maskedBytesToUuidString(binary[i % 64] as Uint8Array),
    "generation/v4/bytes": () => api.generateUuidV4Bytes(),
    "generation/v4/text": () => api.generateUuidV4(),
    "generation/v4/base64url": () => api.generatePlainUuidV4Slug(),
    "generation/v4/base32hex": () => api.generatePlainUuidV4Slug(api.BASE32HEX),
    "generation/v7/bytes": () => generator.generateUuidV7Bytes(),
    "generation/v7/text": () => generator.generateUuidV7(),
    "generation/v7/base64url": () => api.generatePlainUuidV7Slug({ generator }),
    "generation/v7/base32hex": () =>
      api.generatePlainUuidV7Slug({ alphabet: api.BASE32HEX, generator }),
    "timestamp/extract/bytes": (i) => api.extractUuidV7UnixMs(bytes[i % 64] as Uint8Array),
    "payload/extract/bytes": (i) =>
      api.extractUuidV7Payload(bytes[i % 64] as Uint8Array, {
        subMillisecondFractionBits: 0,
        counterBits: 42,
      }),
    "bytes/read": (i) => api.uuidToBytes(bytes[i % 64] as Uint8Array),
    "construct/generator": () => api.createUuidV7Generator(),
    "bounds/one-millisecond": () => api.uuidV7ByteBounds(1_725_000_000_000),
    "bounds/range": () => api.uuidV7ByteBounds(1_725_000_000_000, 1_725_000_000_001),
    "parse/compact": (i) => api.uuidStringToBytes(compactText[i % 64] as string),
    "failure/uuid-parse": () => api.isUuidSlugError(api.uuidStringToBytes("not-a-uuid")),
    "mask.binary.text-input": (i) => compact.uuidToMaskedBytes(text[i % 64] as string),
    "mask.binary.arraybuffer-input": (i) =>
      compact.uuidToMaskedBytes(buffers[i % 64] as ArrayBuffer),
    "mask.binary.dataview-input": (i) => compact.uuidToMaskedBytes(views[i % 64] as DataView),
    "mask.binary.sentinel": () => reserved.uuidToMaskedBytes(text[0] as string),
    "unmask.binary.sentinel": () => reserved.maskedBytesToUuidBytes(bytes[0] as Uint8Array),
  };
  for (const [suffix, keyed, stored] of [
    ["base64", compact, encoded],
    ["base32", safe, encoded32],
  ] as const) {
    shared[`parse/keyed/${suffix}`] = (i) => keyed.parseUuid(stored[i % 64] as string);
    shared[`payload/masked/${suffix}`] = (i) =>
      keyed.extractMaskedUuidV7Payload(stored[i % 64] as string, layout);
    shared[`timestamp/masked/${suffix}`] = (i) =>
      keyed.validateMaskedUuidV7SlugUnixMs(stored[i % 64] as string, window);
  }
  // Fail on changed identities before timing; two implementations can agree on invalid output.
  bytes.forEach((value, index) => {
    const restored = unwrap(compact.maskedBytesToUuidBytes(binary[index] as Uint8Array));
    if (restored.join(",") !== value.join(","))
      throw new Error("Binary benchmark corpus changed UUID identity");
  });
  // Experimental detectors and third-party rivals belong to their existing dedicated reports.
  return {
    ...Object.fromEntries(
      Object.entries(suite.cases).filter(
        ([name]) =>
          !name.includes("rival") &&
          !name.startsWith("uuid.conversion.") &&
          !name.startsWith("error.detector.") &&
          !name.startsWith("error.marker.") &&
          !name.startsWith("error.native."),
      ),
    ),
    ...shared,
  };
}
