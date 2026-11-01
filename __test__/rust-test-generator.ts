// Rust owns sequence transitions and entropy admission; callbacks remain in their JavaScript host.
import {
  api,
  failure,
  handle,
  invoke,
  isUuidSlugError,
  isUint8Array,
  record,
  returnedBytes,
  write,
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
  function draw(at: unknown): unknown {
    if (typeof clock !== "function" || typeof fill !== "function")
      return failure("invalid_options");
    let instant;
    try {
      instant = readUuidV7Instant(at === undefined ? clock() : at);
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
    const args = { generator: id, at: time };
    const requested = api("generate", [args]);
    const random = entropy(requested, fill as Fill);
    if (isUuidSlugError(random)) return random;
    return returnedBytes(
      random instanceof Uint8Array ? api("generate", [{ ...args, random: [...random] }]) : random,
    );
  }
  const generator = {
    payloadLayout: layout,
    generateUuidV7Bytes: (outOrOptions?: unknown, offset?: unknown) => {
      const selected = isUint8Array(outOrOptions)
        ? { output: outOrOptions, outputOffset: offset }
        : record(outOrOptions);
      const output = selected.output;
      const outputOffset = selected.outputOffset ?? 0;
      if (
        output !== undefined &&
        (!isUint8Array(output) ||
          typeof outputOffset !== "number" ||
          !Number.isSafeInteger(outputOffset) ||
          outputOffset < 0 ||
          outputOffset > output.length - 16)
      )
        return failure("invalid_buffer");
      return write(draw(selected.at), output, selected.outputOffset);
    },
    generateUuidV7: (selected?: unknown) => {
      const values = typeof selected === "string" ? { uuidTextCase: selected } : record(selected);
      return invoke("text", draw(values.at), values.textCase ?? values.uuidTextCase);
    },
    generatePlainUuidV7Slug: (selected?: unknown) => {
      const values = record(selected);
      return invoke(
        "plain",
        draw(values.at),
        typeof selected === "string" ? selected : values.alphabet,
      );
    },
    generateUuidV7WithPlainSlug: (selected?: unknown) => {
      const values = record(selected);
      const bytes = draw(values.at);
      return isUuidSlugError(bytes)
        ? bytes
        : {
            uuid: invoke("text", bytes, typeof selected === "string" ? selected : values.textCase),
            slug: invoke("plain", bytes, values.alphabet),
          };
    },
    generateUuidV7Value: (selected?: unknown) =>
      parsedValue(draw(record(selected).at), { ...record(selected), payloadLayout: layout }),
  };
  return Object.freeze(generator);
}

export function generated(name: string, args: unknown[]): unknown {
  const options = record(args[0]);
  if (name.includes("V4")) {
    const fill = name === "generateUuidV4WithRandomFill" ? args[0] : secureFill;
    if (typeof fill !== "function") return failure("invalid_options");
    const requested = api("generate", [{ version: 4 }]);
    const random = entropy(requested, fill as Fill);
    if (isUuidSlugError(random)) return random;
    const bytes = returnedBytes(
      random instanceof Uint8Array
        ? api("generate", [{ version: 4, random: [...random] }])
        : random,
    );
    if (name === "generateUuidV4Bytes") return write(bytes, args[0], args[1]);
    if (name === "generatePlainUuidV4Slug") return invoke("plain", bytes, args[0]);
    return invoke("text", bytes, name === "generateUuidV4WithRandomFill" ? args[1] : args[0]);
  }
  const generator = options.generator ?? createRustGenerator({ coordinateExplicitInstants: false });
  if (isUuidSlugError(generator)) return generator;
  const method = record(generator)[name];
  if (typeof method !== "function") return failure("invalid_options");
  return method(...args);
}
