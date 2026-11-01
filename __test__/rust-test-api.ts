// JSON is the untyped transport boundary; malformed results must fail the lane, never fall back.
import { call } from "./rust-test-implementation";
import {
  ERROR_CODES,
  UuidSlugError,
  isUuidSlugError,
  stringInput,
  isUint8Array,
} from "../src/errors";

export { UuidSlugError, isUuidSlugError, stringInput, isUint8Array };
const callbacks: ((bytes: Uint8Array) => unknown)[] = [];
export function registerCallback(callback: (bytes: Uint8Array) => unknown) {
  return callbacks.push(callback) - 1;
}
export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
export function failure(code: UuidSlugError["code"], message: string = code, cause?: unknown) {
  return new UuidSlugError(code, message, cause === undefined ? undefined : { cause });
}
export function api(method: string, args: readonly unknown[] = [], context: object = {}): unknown {
  const completed: object[] = [];
  let cause: unknown;
  let reply: Record<string, unknown>;
  for (;;) {
    reply = record(call({ op: "api", method, args, ...context, callbacks: completed }));
    if (!("callback" in reply)) break;
    const request = record(reply.callback);
    const callback = typeof request.callback === "number" ? callbacks[request.callback] : undefined;
    if (!callback) throw new Error("Rust requested an unregistered callback.");
    let output: unknown;
    try {
      output = callback(returnedBytes(request.input) as Uint8Array);
    } catch (error) {
      cause = error;
    }
    if (output instanceof Error || isUuidSlugError(output)) cause = output;
    completed.push({ ...request, output: isUint8Array(output) ? [...output] : null });
  }
  if ("failure" in reply) {
    const error = record(reply.failure);
    const code = ERROR_CODES.find((candidate) => candidate === error.code);
    if (!code || typeof error.message !== "string") throw new Error("Malformed Rust API failure.");
    return failure(code, error.message, cause);
  }
  if (!("result" in reply)) throw new Error(`Rust API omitted ${method}'s result.`);
  return reply.result;
}
export function handle(value: unknown): number | UuidSlugError {
  if (isUuidSlugError(value)) return value;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new Error("Rust API returned an invalid object handle.");
  return value;
}
export function returnedBytes(value: unknown): Uint8Array | UuidSlugError {
  if (isUuidSlugError(value)) return value;
  if (isUint8Array(value)) return value;
  if (
    !Array.isArray(value) ||
    !value.every(
      (byte: unknown) =>
        typeof byte === "number" && Number.isInteger(byte) && byte >= 0 && byte <= 255,
    )
  )
    throw new Error("Rust API returned invalid bytes.");
  return Uint8Array.from(value);
}

export const parsedBytes = new WeakMap<object, Uint8Array>();
export function input(value: unknown): unknown {
  if (isUuidSlugError(value)) return value;
  if (value !== null && typeof value === "object") {
    const parsed = parsedBytes.get(value);
    if (parsed) return { bytes: [...parsed] };
  }
  if (isUint8Array(value)) return { bytes: [...value] };
  const text = stringInput(value);
  // Rust strings cannot contain lone UTF-16 surrogates; replacement preserves these invalid inputs
  // as rejected UUID text without turning a semantic test into a JSON transport failure.
  if (text !== undefined) return text.replace(/[\uD800-\uDFFF]/gu, "\uFFFD");
  // ArrayBuffer and DataView are JavaScript's borrowed input forms, not UUID algorithms.
  try {
    const tag = Object.prototype.toString.call(value);
    if (tag === "[object ArrayBuffer]") return { bytes: [...new Uint8Array(value as ArrayBuffer)] };
    if (tag === "[object DataView]") {
      const view = value as DataView;
      return { bytes: [...new Uint8Array(view.buffer, view.byteOffset, view.byteLength)] };
    }
  } catch {
    /* A detached or revoked host object is not UUID data. */
  }
  return null;
}
export function invoke(
  method: string,
  value: unknown,
  option?: unknown,
  context: object = {},
): unknown {
  if (isUuidSlugError(value)) return value;
  const selected = stringInput(option) ?? option;
  if (
    (method === "text" || method === "plain") &&
    selected !== undefined &&
    typeof selected !== "string"
  )
    return failure("invalid_options");
  const offset = record(context).offset;
  if (offset !== undefined && offset !== 0 && !isUint8Array(value))
    return failure("invalid_options");
  return api(method, [input(value), selected], context);
}
export function write(value: unknown, output?: unknown, offset: unknown = 0): unknown {
  const bytes = returnedBytes(value);
  if (bytes instanceof Error) return bytes;
  if (output === undefined) return bytes;
  if (
    !isUint8Array(output) ||
    typeof offset !== "number" ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > output.length - bytes.length
  )
    return failure("invalid_buffer");
  output.set(bytes, offset);
  return output;
}

export function payload(value: unknown): unknown {
  if (isUuidSlugError(value)) return value;
  const result = record(value);
  const counter = record(result.counter);
  const remaining = record(result.remaining);
  return {
    ...result,
    subMillisecondFraction: result.subMillisecondFraction ?? undefined,
    counter:
      result.counter === null ? undefined : { ...counter, value: BigInt(String(counter.value)) },
    remaining: { ...remaining, value: BigInt(String(remaining.value)) },
  };
}
