// Expose JavaScript call shapes while identifier operations run in the Rust crate.
import { encode, decodeInto, halfSipHash, feistel16 } from "./rust-test-implementation";
import {
  api,
  input,
  invoke,
  isUuidSlugError,
  payload,
  record,
  returnedBytes,
  write,
} from "./rust-test-api";
import {
  applyRustMask,
  createRustCodec,
  customRustMask,
  deriveRustMask,
  deriveRustMaskAsync,
  publicTestMask,
} from "./rust-test-codec";
import { createRustGenerator, generated } from "./rust-test-generator";
import { parsedValue } from "./rust-test-value";

function bytes(
  value: unknown,
  output?: unknown,
  offset?: unknown,
  source = "universal",
  codec?: number,
) {
  return write(invoke("bytes", value, undefined, { source, codec }), output, offset);
}
function bounds(start: unknown, end?: unknown, textCase?: unknown, asBytes = false) {
  if (typeof end === "string") {
    textCase = end;
    end = undefined;
  }
  if (!asBytes && textCase !== undefined && textCase !== "lowercase" && textCase !== "uppercase")
    return api("text", ["00000000-0000-7000-8000-000000000000", textCase]);
  const result = api("bounds", [start, end]);
  if (isUuidSlugError(result)) return result;
  const values = record(result);
  const format = (value: unknown) =>
    asBytes ? returnedBytes(value) : invoke("text", returnedBytes(value), textCase);
  return {
    startInclusive: format(values.startInclusive),
    endInclusive: format(values.endInclusive),
  };
}

const functions: Record<string, (...args: unknown[]) => unknown> = {
  uuidStringToBytes: (value, output, offset) => bytes(value, output, offset, "text"),
  plainSlugToUuidBytes: (value, output, offset) => bytes(value, output, offset, "plain"),
  uuidToBytes: (value, offsetOrOutput, outputOrOffset, outputOffset) =>
    typeof offsetOrOutput === "number"
      ? write(
          invoke("bytes", value, undefined, { offset: offsetOrOutput }),
          outputOrOffset,
          outputOffset,
        )
      : bytes(value, offsetOrOutput, outputOrOffset),
  bytesToUuidString: (value, offsetOrCase = 0, textCase) =>
    invoke("text", value, typeof offsetOrCase === "number" ? textCase : offsetOrCase, {
      offset: typeof offsetOrCase === "number" ? offsetOrCase : 0,
    }),
  uuidToString: (value, offsetOrCase, textCase) =>
    invoke("text", value, typeof offsetOrCase === "number" ? textCase : offsetOrCase, {
      offset: typeof offsetOrCase === "number" ? offsetOrCase : undefined,
    }),
  plainSlugToUuidString: (value, textCase) => invoke("text", value, textCase, { source: "plain" }),
  uuidStringToPlainSlug: (value, alphabet) => invoke("plain", value, alphabet, { source: "text" }),
  uuidBytesToPlainSlug: (value, offsetOrAlphabet = 0, alphabet) =>
    invoke("plain", value, typeof offsetOrAlphabet === "string" ? offsetOrAlphabet : alphabet, {
      offset: typeof offsetOrAlphabet === "string" ? 0 : offsetOrAlphabet,
    }),
  uuidToPlainSlug: (value, offsetOrAlphabet, alphabet) =>
    invoke("plain", value, typeof offsetOrAlphabet === "number" ? alphabet : offsetOrAlphabet, {
      offset: typeof offsetOrAlphabet === "number" ? offsetOrAlphabet : undefined,
    }),
  extractUuidV7UnixMs: (value, offset = 0) => invoke("timestamp", value, undefined, { offset }),
  extractUuidVersion: (value) => invoke("version", value),
  extractUuidV7Payload: (value, layout, offset = 0) =>
    payload(invoke("payload", value, layout, { offset })),
  parseUuid: (value, codec) => {
    const selected = record(codec);
    return typeof selected.parseUuid === "function"
      ? selected.parseUuid(value)
      : parsedValue(value);
  },
  uuidV7StringBounds: (start, end, textCase) => bounds(start, end, textCase),
  uuidV7ByteBounds: (start, end) => bounds(start, end, undefined, true),
  deriveUuidV7Mask: deriveRustMask,
  applyMask: applyRustMask,
  deriveUuidV7MaskAsync: deriveRustMaskAsync,
  createCustomUuidV7Mask: customRustMask,
  createUuidV7MaskingCodec: createRustCodec,
  createUuidV7MaskingCodecWithGenerator: createRustCodec,
  createPortableUuidV7Generator: createRustGenerator,
  createUuidV7Generator: createRustGenerator,
  createUuidV7GeneratorWithRandomFill: (fill, options) =>
    createRustGenerator({ ...record(options), fillRandom: fill }),
  validateUuidV7StringUnixMs: (value, window, textCase) => {
    const result = validate(value, window, "text");
    return isUuidSlugError(result) ? result : invoke("text", value, textCase, { source: "text" });
  },
  validatePlainUuidV7SlugUnixMs: (value, window) => validate(value, window, "plain"),
};
function validate(value: unknown, window: unknown, source: string) {
  const options = record(window);
  const result = invoke(
    "validate",
    value,
    { ...options, referenceUnixMs: options.referenceUnixMs ?? Date.now() },
    { source },
  );
  return isUuidSlugError(result)
    ? result
    : typeof result === "string" && result.length === 26
      ? result.toLowerCase()
      : result;
}
function guard(name: string, value: unknown) {
  const source = name.includes("Slug")
    ? "plain"
    : name.endsWith("String") || name.endsWith("Text")
      ? "text"
      : "universal";
  const parsed = input(value);
  if (
    name.endsWith("Bytes") &&
    (!parsed ||
      typeof parsed !== "object" ||
      !("bytes" in parsed) ||
      !Array.isArray(parsed.bytes) ||
      parsed.bytes.length !== 16)
  )
    return false;
  if (
    name.endsWith("String") &&
    (typeof value !== "string" || value.length !== 36 || value !== value.toLowerCase())
  )
    return false;
  if (name.endsWith("Text") && typeof value !== "string") return false;
  if (
    name.includes("Slug") &&
    (typeof value !== "string" || (value.length === 26 && value !== value.toLowerCase()))
  )
    return false;
  const version = api("version", [parsed], { source });
  if (isUuidSlugError(version)) return false;
  if (name.includes("V4") || name.includes("V7")) {
    const inspection = record(api("inspect", [parsed], { source }));
    return version === (name.includes("V4") ? 4 : 7) && inspection.variant === "rfc";
  }
  return true;
}

export function bindRustExport(name: string, metadata: unknown): unknown {
  if (name === "UUID_V7_TEST_MASK") return publicTestMask();
  if (name === "isUuidSlugError" || name === "UuidSlugError" || typeof metadata !== "function")
    return metadata;
  if (name === "encode") return encode;
  if (name === "decodeInto") return decodeInto;
  if (name === "halfSipHash") return halfSipHash;
  if (name === "feistel16") return feistel16;
  if (name.startsWith("isUuid") || name.startsWith("isPlainUuid"))
    return (value: unknown) => guard(name, value);
  if (name.startsWith("generate")) return (...args: unknown[]) => generated(name, args);
  const bound = functions[name];
  if (bound) return bound;
  return () => {
    throw new Error(
      `Missing Rust test binding: ${name}. Implement its Rust route; do not use TypeScript fallback.`,
    );
  };
}
