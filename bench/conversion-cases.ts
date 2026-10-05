// SPDX-License-Identifier: Apache-2.0

import type { Buffer } from "node:buffer";
import { parse, stringify, validate } from "uuid";
import { unwrap } from "../dev/unwrap";
import {
  bytesToUuidString,
  extractUuidV7UnixMs,
  isUuidString,
  plainSlugToUuidBytes,
  plainSlugToUuidString,
  uuidBytesToPlainSlug,
  uuidStringToBytes,
  uuidStringToPlainSlug,
} from "../src/index";
import type { GenerationCase, GenerationValue } from "./generation-case";

// These independent fixed spellings expose payload loss without asking the package to verify itself.
// They describe this small warm corpus, not the full accepted-input space of any implementation.
const texts = ["01990d4d-e600-7123-a456-789abcdef012", "01990d4d-e601-7fed-b012-3456789abcde"];
const slugs = ["AZkNTeYAcSOkVniavN7wEg", "AZkNTeYBf-2wEjRWeJq83g"];
const bytes = [
  new Uint8Array([1, 153, 13, 77, 230, 0, 113, 35, 164, 86, 120, 154, 188, 222, 240, 18]),
  new Uint8Array([1, 153, 13, 77, 230, 1, 127, 237, 176, 18, 52, 86, 120, 154, 188, 222]),
];
const timestamps = [1_756_864_833_024, 1_756_864_833_025];
const canonicalUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const canonicalSlug = /^[A-Za-z0-9_-]{21}[AQgw]$/;
const base64Options = { alphabet: "base64url", omitPadding: true } as const;
const decodeOptions = { alphabet: "base64url", lastChunkHandling: "strict" } as const;

interface ByteCapabilities {
  fromBase64?: (text: string, options: typeof decodeOptions) => Uint8Array;
  fromHex?: (hex: string) => Uint8Array;
}
interface BytePrototypeCapabilities {
  toBase64?: (this: Uint8Array, options: typeof base64Options) => string;
  toHex?: (this: Uint8Array) => string;
}
interface ByteDecodeIntoCapability {
  setFromBase64?: (
    this: Uint8Array,
    text: string,
    options: typeof decodeOptions,
  ) => { read: number; written: number };
}

function hyphenate(hex: string): string {
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Reuse the competitor timer while keeping conversion setup and exact witnesses outside timing. */
export function createConversionCases(
  nodeBuffer?: typeof Buffer,
  api = {
    bytesToUuidString,
    extractUuidV7UnixMs,
    isUuidString,
    plainSlugToUuidBytes,
    plainSlugToUuidString,
    uuidBytesToPlainSlug,
    uuidStringToBytes,
    uuidStringToPlainSlug,
  },
  generators: readonly GenerationCase[] = [],
) {
  const cases: GenerationCase[] = [];
  const unsupported: { readonly name: string; readonly reason: string }[] = [];
  const fromBase64 = (Uint8Array as ByteCapabilities).fromBase64?.bind(Uint8Array);
  const fromHex = (Uint8Array as ByteCapabilities).fromHex?.bind(Uint8Array);
  const toBase64 = (Uint8Array.prototype as BytePrototypeCapabilities).toBase64;
  const toHex = (Uint8Array.prototype as BytePrototypeCapabilities).toHex;
  // The installed Bun declaration gives an offset argument, but real Node-compatible and
  // web-compatible runtimes consume decoding options. Keep that mismatched boundary narrow;
  // the fixed-output witness must validate the actual method before any timing.
  const setFromBase64 = (Uint8Array.prototype as unknown as ByteDecodeIntoCapability).setFromBase64;

  function add<Input>(
    name: string,
    comparable: string,
    inputs: readonly Input[],
    expectedValues: readonly GenerationValue[],
    operation: (input: Input) => GenerationValue,
    ownedBytes = false,
    rejectionReason?: string,
  ): void {
    let next = 0;
    cases.push({
      comparable,
      implementation: "fixed-conversion",
      name,
      expectedValues,
      operation: () => operation(inputs[next++ % inputs.length]!),
      qualification: rejectionReason === undefined ? "qualified" : "rejected",
      ...(rejectionReason === undefined ? {} : { rejectionReason }),
      ...(ownedBytes ? { ownedBytes: true as const } : {}),
      // All rows share this UUIDv7 input corpus; these are conversions, not generation promises.
      version: 7,
    });
  }
  function absent(name: string, capability: string): void {
    unsupported.push({ name, reason: `${capability} is unavailable in this process` });
  }

  add("package.conversion.text.bytes", "conversion.text.bytes", texts, bytes, (input) =>
    unwrap(api.uuidStringToBytes(input)),
  );
  add("package.conversion.bytes.text", "conversion.bytes.text", bytes, texts, (input) =>
    unwrap(api.bytesToUuidString(input)),
  );
  add("package.conversion.bytes.slug", "conversion.bytes.slug", bytes, slugs, (input) =>
    unwrap(api.uuidBytesToPlainSlug(input)),
  );
  add(
    "package.conversion.slug.bytes",
    "conversion.slug.bytes",
    slugs,
    bytes,
    (input) => unwrap(api.plainSlugToUuidBytes(input)),
    true,
  );
  add("package.conversion.text.slug", "conversion.text.slug", texts, slugs, (input) =>
    unwrap(api.uuidStringToPlainSlug(input)),
  );
  add("package.conversion.slug.text", "conversion.slug.text", slugs, texts, (input) =>
    unwrap(api.plainSlugToUuidString(input)),
  );
  add(
    "package.conversion.text.guard",
    "conversion.text.guard",
    texts,
    [true, true],
    api.isUuidString,
  );
  add(
    "package.conversion.text.timestamp",
    "conversion.text.timestamp",
    texts,
    timestamps,
    (input) => unwrap(api.extractUuidV7UnixMs(input)),
  );
  add("uuid.conversion.text.bytes", "conversion.text.bytes", texts, bytes, parse);
  add("uuid.conversion.bytes.text", "conversion.bytes.text", bytes, texts, stringify);
  add("uuid.conversion.text.guard", "conversion.text.guard", texts, [true, true], validate);
  add(
    "platform.regex.conversion.text.guard",
    "conversion.text.guard",
    texts,
    [true, true],
    (input) => canonicalUuid.test(input),
  );
  add(
    "platform.parseint.conversion.text.timestamp",
    "conversion.text.timestamp",
    texts,
    timestamps,
    (input) => Number.parseInt(input.slice(0, 8) + input.slice(9, 13), 16),
  );

  if (fromBase64) {
    add(
      "platform.frombase64.conversion.slug.bytes",
      "conversion.slug.bytes",
      slugs,
      bytes,
      (input) => {
        // Strict decoding requires a complete padded chunk, while the public slug is unpadded.
        if (!canonicalSlug.test(input))
          throw new Error("Native UUID decoding requires a canonical slug");
        const result = fromBase64(input + "==", decodeOptions);
        if (result.length !== 16) throw new Error("Native UUID decoding returned the wrong length");
        return result;
      },
      true,
    );
  } else absent("platform.frombase64.conversion.slug.bytes", "Uint8Array.fromBase64");
  if (setFromBase64) {
    add(
      "platform.setfrombase64.conversion.slug.bytes",
      "conversion.slug.bytes",
      slugs,
      bytes,
      (input) => {
        // Allocate the promised private array before native decoding; a reused output would
        // measure a different ownership contract. Strict native chunks need explicit padding.
        if (!canonicalSlug.test(input))
          throw new Error("Native UUID decoding requires a canonical slug");
        const output = new Uint8Array(16);
        const { read, written } = setFromBase64.call(output, input + "==", decodeOptions);
        if (read !== 24 || written !== 16)
          throw new Error("Native UUID decoding did not consume the complete payload");
        return output;
      },
      true,
    );
  } else
    absent("platform.setfrombase64.conversion.slug.bytes", "Uint8Array.prototype.setFromBase64");
  if (toBase64) {
    add("platform.tobase64.conversion.bytes.slug", "conversion.bytes.slug", bytes, slugs, (input) =>
      toBase64.call(input, base64Options),
    );
  } else absent("platform.tobase64.conversion.bytes.slug", "Uint8Array.prototype.toBase64");
  if (fromHex) {
    add("platform.fromhex.conversion.text.bytes", "conversion.text.bytes", texts, bytes, (input) =>
      fromHex(input.replaceAll("-", "")),
    );
  } else absent("platform.fromhex.conversion.text.bytes", "Uint8Array.fromHex");
  if (toHex) {
    add("platform.tohex.conversion.bytes.text", "conversion.bytes.text", bytes, texts, (input) =>
      hyphenate(toHex.call(input)),
    );
  } else absent("platform.tohex.conversion.bytes.text", "Uint8Array.prototype.toHex");
  if (fromHex && toBase64) {
    add("platform.hexbase64.conversion.text.slug", "conversion.text.slug", texts, slugs, (input) =>
      toBase64.call(fromHex(input.replaceAll("-", "")), base64Options),
    );
  } else
    absent("platform.hexbase64.conversion.text.slug", "Native hex decoding and base64url encoding");
  if (fromBase64 && toHex) {
    add(
      "platform.base64hex.conversion.slug.text",
      "conversion.slug.text",
      slugs,
      texts,
      (input) => {
        if (input.length !== 22) throw new Error("Native UUID decoding requires a canonical slug");
        const result = fromBase64(input + "==", decodeOptions);
        if (result.length !== 16) throw new Error("Native UUID decoding returned the wrong length");
        return hyphenate(toHex.call(result));
      },
    );
  } else
    absent("platform.base64hex.conversion.slug.text", "Native base64url decoding and hex encoding");
  if (nodeBuffer) {
    // These same encoders have fixed payload witnesses below; reuse them for complete rival calls.
    const textToSlug = (input: string) =>
      nodeBuffer.from(input.replaceAll("-", ""), "hex").toString("base64url");
    // Buffer floors retain their native ownership difference; they cannot prove plain Uint8Array ownership.
    const view = (input: Uint8Array) =>
      nodeBuffer.from(input.buffer, input.byteOffset, input.byteLength);
    const decodeSlug = (input: string) => {
      // Buffer decoding accepts aliases, so canonical padding validation is real extra floor work.
      if (!canonicalSlug.test(input))
        throw new Error("Native UUID decoding requires a canonical slug");
      return nodeBuffer.from(input, "base64url");
    };
    add("platform.buffer.conversion.text.bytes", "conversion.text.bytes", texts, bytes, (input) =>
      nodeBuffer.from(input.replaceAll("-", ""), "hex"),
    );
    add("platform.buffer.conversion.bytes.text", "conversion.bytes.text", bytes, texts, (input) =>
      hyphenate(view(input).toString("hex")),
    );
    add("platform.buffer.conversion.bytes.slug", "conversion.bytes.slug", bytes, slugs, (input) =>
      view(input).toString("base64url"),
    );
    add(
      "platform.buffer.conversion.slug.bytes",
      "conversion.slug.bytes",
      slugs,
      bytes,
      decodeSlug,
      false,
      "Returns a Buffer rather than a caller-private plain Uint8Array; keep its cost as an incomplete native floor.",
    );
    add(
      "platform.buffer-copy.conversion.slug.bytes",
      "conversion.slug.bytes",
      slugs,
      bytes,
      // Buffer's pooled backing store is not caller-private. Copy rather than publishing a
      // view that lets one result expose another identifier through its ArrayBuffer.
      (input) => new Uint8Array(decodeSlug(input)),
      true,
    );
    add("platform.buffer.conversion.text.slug", "conversion.text.slug", texts, slugs, textToSlug);
    add("platform.buffer.conversion.slug.text", "conversion.slug.text", slugs, texts, (input) =>
      hyphenate(decodeSlug(input).toString("hex")),
    );
    for (const generator of generators) {
      if (generator.comparable === "v7.bytes.into.secure") {
        // These corpus calls write a caller-owned buffer; reuse its native view outside each ID.
        const output = generator.operation() as Uint8Array;
        if (generator.operation() !== output)
          throw new Error(`${generator.name} must reuse its caller-owned output`);
        const encoded = nodeBuffer.from(
          output.buffer,
          output.byteOffset + (generator.outputOffset ?? 0),
          16,
        );
        cases.push({
          ...generator,
          name: generator.name.replace(".bytes.into", ".slug.base64url.from-buffer"),
          comparable: "v7.slug.base64url.secure",
          implementation: "caller-buffer-native-encoding",
          operation: () => {
            generator.operation();
            return encoded.toString("base64url");
          },
        });
        continue;
      }
      if (generator.comparable === "v7.bytes.allocate.secure") {
        cases.push({
          ...generator,
          name: generator.name.replace(".bytes.allocate", ".slug.base64url.from-bytes"),
          comparable: "v7.slug.base64url.secure",
          implementation: "owned-bytes-native-encoding",
          operation: () => view(generator.operation() as Uint8Array).toString("base64url"),
        });
        continue;
      }
      if (generator.comparable !== "v7.text.secure") continue;
      cases.push({
        ...generator,
        name: generator.name.replace(".text", ".slug.base64url.from-text"),
        comparable: "v7.slug.base64url.secure",
        implementation: "generated-text-native-encoding",
        // The generation corpus owns the text shape; encode all 128 bits without package parsing.
        operation: () => textToSlug(generator.operation() as string),
      });
    }
  }
  if (toBase64) {
    // Browser callers can compose a library generator with native encoding without Buffer.
    // Time parsing too: a text-only generator cannot supply the encoder's bytes for free.
    for (const generator of generators) {
      const text = generator.comparable === "v7.text.secure";
      if (!text && generator.comparable !== "v7.bytes.allocate.secure") continue;
      cases.push({
        ...generator,
        name: generator.name.replace(
          text ? ".text" : ".bytes.allocate",
          text ? ".slug.base64url.from-text.typedarray" : ".slug.base64url.from-bytes.typedarray",
        ),
        comparable: "v7.slug.base64url.secure",
        implementation: "generated-native-typedarray-encoding",
        operation: () =>
          toBase64.call(
            text ? parse(generator.operation() as string) : (generator.operation() as Uint8Array),
            base64Options,
          ),
      });
    }
  }
  return { cases, unsupported };
}
