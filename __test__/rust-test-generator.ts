// Rust owns sequence transitions and entropy admission; callbacks remain in their JavaScript host.
import {
  api,
  commitStorage,
  failure,
  handle,
  invoke,
  isUuidSlugError,
  isUint8Array,
  record,
  returnedBytes,
  stringInput,
} from "./rust-test-api";
import { readUuidV7Instant } from "../src/instant";
import { parsedValue } from "./rust-test-value";

type Fill = (bytes: Uint8Array) => unknown;
function entropy(value: unknown, fill: Fill): unknown {
  const length = record(value).drawRequired;
  if (typeof length !== "number") return value;
  const bytes = new Uint8Array(length);
  try {
    const result = fill(bytes);
    if (result instanceof Error || isUuidSlugError(result))
      return isUuidSlugError(result)
        ? result
        : failure("rng_unavailable", "Random byte generation failed.", result);
    if (result && typeof record(result).then === "function") return failure("rng_unavailable");
  } catch (cause) {
    return failure("rng_unavailable", "Random byte generation failed.", cause);
  }
  return bytes;
}
const secureFill: Fill = (bytes) => crypto.getRandomValues(bytes);

export function createRustGenerator(
  value: unknown = {},
  defaultFill: unknown = secureFill,
): unknown {
  const options = record(value);
  const rollback = record(options.clockRollback);
  const id = handle(
    api("createGenerator", [
      {
        subMillisecondFractionBits: options.subMillisecondFractionBits,
        clockRollback: options.clockRollback ? { ...rollback, mode: rollback.action } : undefined,
      },
    ]),
  );
  if (id instanceof Error) return id;
  const fractionBits = Number(options.subMillisecondFractionBits ?? 0);
  const fill = options.fillRandom ?? defaultFill;
  const clock = options.readUnixMs ?? Date.now;
  const layout = Object.freeze({
    subMillisecondFractionBits: fractionBits,
    counterBits: 42 - fractionBits,
  });
  let generating = false;
  function draw(
    at: unknown,
    explicit = at !== undefined,
    output?: Uint8Array,
    outputOffset = 0,
  ): unknown {
    if (generating) return failure("rng_unavailable");
    generating = true;
    try {
      return drawOnce(at, explicit, output, outputOffset);
    } finally {
      generating = false;
    }
  }
  function drawOnce(
    at: unknown,
    explicit: boolean,
    output?: Uint8Array,
    outputOffset = 0,
  ): unknown {
    if (typeof clock !== "function" || typeof fill !== "function")
      return failure("invalid_options");
    let instant;
    try {
      const source = explicit ? at : clock();
      if (!explicit && typeof source !== "number") return failure("invalid_timestamp");
      instant = readUuidV7Instant(source);
    } catch (cause) {
      return failure("invalid_timestamp", "Clock failed.", cause);
    }
    if (instant instanceof Error) return instant;
    // Quantized JS host forms become an exact SystemTime bucket without adding the epoch first.
    const time = {
      seconds: Math.floor(instant.unixMs / 1000),
      nanoseconds:
        (instant.unixMs % 1000) * 1_000_000 +
        Math.ceil((instant.fractionBucket12 * 1_000_000) / 4096),
    };
    const args = {
      generator: id,
      at: time,
      stateless: explicit && options.coordinateExplicitInstants === false,
      fractionBits,
      hostRandom: fill === secureFill,
      ...(output ? { output: { bytes: [...output] }, outputOffset } : {}),
    };
    const operation = output ? "generateInto" : "generate";
    const requested = api(operation, [args]);
    if (output && "drawRequired" in record(requested)) commitStorage(requested, output);
    const random = entropy(requested, fill as Fill);
    if (isUuidSlugError(random)) return random;
    const result =
      random instanceof Uint8Array ? api(operation, [{ ...args, random: [...random] }]) : random;
    return output ? commitStorage(result, output) : returnedBytes(result);
  }
  const generator = {
    payloadLayout: layout,
    generateUuidV7Bytes: (outOrOptions?: unknown, offset?: unknown) => {
      const selected = isUint8Array(outOrOptions)
        ? { output: outOrOptions, outputOffset: offset }
        : record(outOrOptions);
      const output = selected.output;
      const outputOffset = selected.outputOffset ?? 0;
      if (output === undefined) return draw(selected.at, Object.hasOwn(selected, "at"));
      if (!isUint8Array(output) || typeof outputOffset !== "number")
        return failure("invalid_buffer");
      if (
        !Number.isSafeInteger(outputOffset) ||
        outputOffset < 0 ||
        outputOffset > output.length - 16
      ) {
        // Invalid storage must fail in Rust before any clock read or entropy callback.
        const rejected = api("generateInto", [
          { generator: id, at: 0, output: { bytes: [...output] }, outputOffset },
        ]);
        if ("drawRequired" in record(rejected))
          throw new Error("Rust generation requested entropy for an invalid destination.");
        return commitStorage(rejected, output);
      }
      return draw(selected.at, Object.hasOwn(selected, "at"), output, outputOffset);
    },
    generateUuidV7: (selected?: unknown) => {
      const textCase = stringInput(selected);
      const values = textCase !== undefined ? { textCase } : record(selected);
      return invoke("text", draw(values.at, Object.hasOwn(values, "at")), values.textCase);
    },
    generatePlainUuidV7Slug: (selected?: unknown) => {
      const values = record(selected);
      return invoke(
        "plain",
        draw(values.at, Object.hasOwn(values, "at")),
        typeof selected === "string" ? selected : values.alphabet,
      );
    },
    generateUuidV7WithPlainSlug: (selected?: unknown, selectedCase?: unknown) => {
      const values = record(selected);
      const bytes = draw(values.at, Object.hasOwn(values, "at"));
      const preset = stringInput(selected);
      const alphabet = preset === "base32hex" || preset === "base64url" ? preset : values.alphabet;
      const textCase =
        preset === "uppercase" || preset === "lowercase"
          ? preset
          : (selectedCase ?? values.textCase);
      return isUuidSlugError(bytes)
        ? bytes
        : {
            uuid: invoke("text", bytes, textCase),
            slug: invoke("plain", bytes, alphabet),
          };
    },
    generateUuidV7Value: (selected?: unknown) =>
      parsedValue(draw(record(selected).at, Object.hasOwn(record(selected), "at")), {
        ...record(selected),
        payloadLayout: layout,
      }),
  };
  return Object.freeze(generator);
}

export function generated(name: string, args: unknown[]): unknown {
  const options = record(args[0]);
  if (name.includes("V4")) {
    const fill = name === "generateUuidV4WithRandomFill" ? args[0] : secureFill;
    if (typeof fill !== "function") return failure("invalid_options");
    const output = name === "generateUuidV4Bytes" ? args[0] : undefined;
    if (output !== undefined && !isUint8Array(output)) return failure("invalid_buffer");
    const operation = output ? "generateInto" : "generate";
    const request = {
      version: 4,
      hostRandom: fill === secureFill,
      ...(output ? { output: { bytes: [...output] }, outputOffset: args[1] ?? 0 } : {}),
    };
    const requested = api(operation, [request]);
    if (output && "drawRequired" in record(requested)) commitStorage(requested, output);
    const random = entropy(requested, fill as Fill);
    if (isUuidSlugError(random)) return random;
    const result =
      random instanceof Uint8Array ? api(operation, [{ ...request, random: [...random] }]) : random;
    if (output) return commitStorage(result, output);
    const bytes = returnedBytes(result);
    if (name === "generateUuidV4Bytes") return bytes;
    if (name === "generatePlainUuidV4Slug") return invoke("plain", bytes, args[0]);
    return invoke("text", bytes, name === "generateUuidV4WithRandomFill" ? args[1] : args[0]);
  }
  const generator = options.generator ?? createRustGenerator({ coordinateExplicitInstants: false });
  if (isUuidSlugError(generator)) return generator;
  const method = record(generator)[name];
  if (typeof method !== "function") return failure("invalid_options");
  return method(...args);
}
