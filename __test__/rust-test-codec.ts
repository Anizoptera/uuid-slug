// Retain native masks and codecs once; JavaScript wrappers only expose the shared test call shape.
import {
  api,
  failure,
  handle,
  input,
  invoke,
  isUuidSlugError,
  payload,
  record,
  registerCallback,
  returnedBytes,
  stringInput,
  write,
} from "./rust-test-api";
import { generated } from "./rust-test-generator";
import { parsedValue, valueOptions } from "./rust-test-value";
import { setImmediate as nextTask } from "node:timers/promises";
import { encode, BASE64URL } from "./rust-test-implementation";

const masks = new WeakMap<object, number>();
const seeds = new WeakMap<object, object>();
let published: object | undefined;
export function publicTestMask() {
  if (!published) {
    const id = handle(api("deriveMask", [null]));
    if (id instanceof Error) throw id;
    published = Object.freeze({ diagnosticLabel: "public-test-mask" });
    masks.set(published, id);
  }
  return published;
}
export function deriveRustMask(value: unknown): unknown {
  if (isUuidSlugError(value)) return value;
  const options = record(value);
  const seed = options.seed;
  const text = stringInput(seed);
  const descriptor = {
    bytes:
      text !== undefined
        ? [...new TextEncoder().encode(text)]
        : seed instanceof Uint8Array
          ? [...seed]
          : [],
  };
  const id = handle(
    api("deriveMask", [{ ...descriptor, iterations: options.keyDerivationIterations ?? 1 }]),
  );
  if (id instanceof Error) return id;
  const result = Object.freeze({
    diagnosticLabel: stringInput(options.diagnosticLabel) ?? "seeded",
  });
  masks.set(result, id);
  seeds.set(result, { ...descriptor, iterations: options.keyDerivationIterations ?? 1 });
  return result;
}
export function applyRustMask(mask: unknown, source: unknown, output: unknown, direction: unknown) {
  const seed = mask !== null && typeof mask === "object" ? seeds.get(mask) : undefined;
  if (!seed)
    throw new Error("A private mask-transform fixture requires its derived seed descriptor.");
  const value = api("transform", [{ mask: seed, bytes: record(input(source)).bytes, direction }]);
  if (isUuidSlugError(value)) return value;
  const result = write(returnedBytes(value), output);
  return isUuidSlugError(result) ? result : undefined;
}
export function rustMaskedCandidates(
  source: unknown,
  tail: unknown,
  ranges: unknown,
  output: unknown = [],
) {
  if (!Array.isArray(ranges) || !Array.isArray(output))
    throw new Error("Malformed candidate test call.");
  if (!ranges.length) return output;
  const first = record(ranges[0]);
  const codec = createRustCodec({
    mask: first.mask ?? ranges[0],
    timestampRangeStartUnixMs: first.timestampRangeStartUnixMs,
    previousMasks: ranges.slice(1),
  });
  if (isUuidSlugError(codec)) return codec;
  const create = record(codec).createUuidSlugMigrationDecoder;
  if (typeof create !== "function") throw new Error("Rust codec omitted migration binding.");
  const read = record(create()).uuidSlugToUuidStringCandidates;
  if (typeof read !== "function") throw new Error("Rust migration omitted candidate binding.");
  const bytes = source instanceof Uint8Array ? source : undefined;
  if (!bytes || typeof tail !== "number") throw new Error("Malformed candidate bytes or tail.");
  const result = read(encode(bytes, BASE64URL, tail, 4));
  if (isUuidSlugError(result)) return result;
  if (!Array.isArray(result)) throw new Error("Rust migration omitted candidate results.");
  output.push(...result);
  return output;
}
export async function deriveRustMaskAsync(value: unknown): Promise<unknown> {
  const options = record(value);
  const signal = options.signal instanceof AbortSignal ? options.signal : undefined;
  if (signal?.aborted) return failure("aborted", "Mask derivation cancelled.", signal.reason);
  let seed: unknown;
  try {
    seed = options.seed;
  } catch (cause) {
    return failure("invalid_mask", "Reading mask seed failed.", cause);
  }
  const text = stringInput(seed);
  const bytes =
    text !== undefined
      ? [...new TextEncoder().encode(text)]
      : seed instanceof Uint8Array
        ? [...seed]
        : [];
  const label = stringInput(options.diagnosticLabel) ?? "seeded";
  const id = handle(
    api("deriveAsync", [{ bytes, iterations: options.keyDerivationIterations ?? 1 }]),
  );
  if (id instanceof Error) return id;
  for (;;) {
    const result = api("pollDerivation", [id, signal?.aborted ?? false]);
    if (isUuidSlugError(result))
      return signal?.aborted ? failure(result.code, result.message, signal.reason) : result;
    if (result === null) {
      // eslint-disable-next-line no-await-in-loop -- yield only after real Rust work reports Pending
      await nextTask();
      continue;
    }
    const derivedId = handle(result);
    if (derivedId instanceof Error) return derivedId;
    const mask = Object.freeze({ diagnosticLabel: label });
    masks.set(mask, derivedId);
    return mask;
  }
}
function maskId(value: unknown): number | Error {
  if (isUuidSlugError(value)) return value;
  if (value && typeof value === "object") {
    const id = masks.get(value);
    if (id !== undefined) return id;
  }
  const derived = deriveRustMask(value);
  if (derived instanceof Error) return derived;
  const id = derived && typeof derived === "object" ? masks.get(derived) : undefined;
  return id === undefined ? failure("invalid_mask") : id;
}
export function customRustMask(value: unknown): unknown {
  const options = record(value);
  const forward = options.mask,
    reverse = options.unmask;
  if (typeof forward !== "function" || typeof reverse !== "function")
    return failure("invalid_mask");
  const id = handle(
    api("customMask", [
      {
        diagnosticLabel: stringInput(options.diagnosticLabel),
        mask: registerCallback((bytes) => forward(bytes)),
        unmask: registerCallback((bytes) => reverse(bytes)),
      },
    ]),
  );
  if (id instanceof Error) return id;
  const mask = Object.freeze({ diagnosticLabel: options.diagnosticLabel });
  masks.set(mask, id);
  return mask;
}
export function createRustCodec(configuration: unknown, generator?: unknown): unknown {
  const settings = record(configuration);
  const mask = maskId(settings.mask ?? { seed: settings.maskSeed });
  if (mask instanceof Error) return mask;
  const previous: unknown[] = [];
  for (const item of Array.isArray(settings.previousMasks) ? settings.previousMasks : []) {
    const configured = record(item);
    const id = maskId(configured.mask ?? item);
    if (id instanceof Error) return id;
    previous.push(
      configured.mask
        ? { mask: id, timestampRangeStartUnixMs: configured.timestampRangeStartUnixMs }
        : id,
    );
  }
  const built = api("createCodec", [{ ...settings, mask, previousMasks: previous }]);
  if (isUuidSlugError(built)) return built;
  const result = record(built);
  const id = handle(result.id);
  if (id instanceof Error) return id;
  const context = { codec: id };
  const read = (method: string, value: unknown, option?: unknown, source = "universal") =>
    invoke(method, value, option, { ...context, source });
  const nativeBytes = (value: unknown, source = "universal") =>
    returnedBytes(read("bytes", value, undefined, source));
  const codec = {
    sentinels: Array.isArray(result.sentinels)
      ? Object.freeze(result.sentinels.map((value) => Object.freeze(record(value))))
      : [],
    uuidToString: (value: unknown, offsetOrCase?: unknown, textCase?: unknown) =>
      invoke("text", value, typeof offsetOrCase === "number" ? textCase : offsetOrCase, {
        ...context,
        offset: typeof offsetOrCase === "number" ? offsetOrCase : undefined,
      }),
    uuidToBytes: (
      value: unknown,
      offsetOrOutput?: unknown,
      outputOrOffset?: unknown,
      outputOffset?: unknown,
    ) =>
      typeof offsetOrOutput === "number"
        ? write(
            invoke("bytes", value, undefined, { ...context, offset: offsetOrOutput }),
            outputOrOffset,
            outputOffset,
          )
        : write(read("bytes", value), offsetOrOutput, outputOrOffset),
    uuidToPlainSlug: (value: unknown, offsetOrAlphabet?: unknown, alphabet?: unknown) =>
      invoke("plain", value, typeof offsetOrAlphabet === "number" ? alphabet : offsetOrAlphabet, {
        ...context,
        offset: typeof offsetOrAlphabet === "number" ? offsetOrAlphabet : undefined,
      }),
    maskedToPlainUuidSlug: (value: unknown, alphabet?: unknown) =>
      read("plain", value, alphabet, "masked"),
    uuidToMaskedSlug: (value: unknown) => read("mask", value),
    plainToMaskedUuidSlug: (value: unknown) => read("mask", value, undefined, "plain"),
    maskedSlugToUuidString: (value: unknown, textCase?: unknown) =>
      read("text", value, textCase, "masked"),
    maskedSlugToUuidBytes: (value: unknown, output?: unknown, offset?: unknown) =>
      write(read("bytes", value, undefined, "masked"), output, offset),
    extractMaskedUuidV7UnixMs: (value: unknown) => read("timestamp", value, undefined, "masked"),
    extractMaskedUuidV7Payload: (value: unknown, layout: unknown) =>
      payload(read("payload", value, layout, "masked")),
    validateMaskedUuidV7SlugUnixMs: (value: unknown, window: unknown) => {
      const options = record(window);
      const validated = read(
        "validate",
        value,
        { ...options, referenceUnixMs: options.referenceUnixMs ?? Date.now() },
        "masked",
      );
      return typeof validated === "string" && (validated.length === 26 || validated.length === 27)
        ? validated.toLowerCase()
        : validated;
    },
    parseUuid: (value: unknown, selected?: unknown) =>
      parsedValue(nativeBytes(value), {
        ...(value !== null && typeof value === "object" ? valueOptions.get(value) : {}),
        ...record(selected),
        maskingCodec: codec,
      }),
    generateMaskedUuidV7Slug: (options?: unknown) => read("mask", draw(options)),
    generateUuidV7WithMaskedSlug: (options?: unknown) => {
      const bytes = draw(options);
      if (isUuidSlugError(bytes)) return bytes;
      const slug = read("mask", bytes);
      if (isUuidSlugError(slug)) return slug;
      return { uuid: read("text", bytes, stringInput(options) ?? record(options).textCase), slug };
    },
    generateUuidV7Value: (options?: unknown) =>
      parsedValue(draw(options), {
        ...record(options),
        payloadLayout: record(record(options).generator).payloadLayout ?? {
          subMillisecondFractionBits: 0,
          counterBits: 42,
        },
        maskingCodec: codec,
      }),
    createUuidSlugMigrationDecoder: (options?: unknown) => {
      const migration = {
        ...context,
        original: record(options).acceptFixedMask,
        plain: record(options).acceptPlainSlug,
      };
      return Object.freeze({
        uuidSlugToUuidString: (value: unknown, format?: unknown, textCase?: unknown) => {
          if (isUuidSlugError(value)) return value;
          const second = stringInput(format) ?? format;
          const preset = second === "uppercase" || second === "lowercase";
          const data = api("migration", [input(value), preset ? undefined : second], migration);
          return isUuidSlugError(data)
            ? data
            : invoke("text", returnedBytes(data), preset ? second : textCase);
        },
        uuidSlugToUuidStringCandidates: (value: unknown, format?: unknown, textCase?: unknown) => {
          if (isUuidSlugError(value)) return value;
          const second = stringInput(format) ?? format;
          const preset = second === "uppercase" || second === "lowercase";
          const data = api("candidates", [input(value), preset ? undefined : second], migration);
          if (isUuidSlugError(data)) return data;
          if (!Array.isArray(data)) throw new Error("Rust migration omitted its candidates.");
          return data.map((item) =>
            invoke("text", returnedBytes(item), preset ? second : textCase),
          );
        },
      });
    },
  };
  function draw(options: unknown) {
    const value =
      typeof generator === "function" ? generator() : generated("generateUuidV7Bytes", [options]);
    if (isUuidSlugError(value)) return value;
    const valid = invoke("timestamp", value);
    return isUuidSlugError(valid) ? valid : value;
  }
  return Object.freeze(codec);
}
