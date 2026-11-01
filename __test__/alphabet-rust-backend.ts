// Rust owns every codec result; this boundary only serializes calls and copies returned bytes.
import { afterAll } from "vitest";
import { loadRustBridge } from "../scripts/rust-bridge";
import { BASE32HEX, BASE64URL } from "../src/alphabet";
import type { Alphabet } from "../src/alphabet";
import { NIL_TEST_SENTINEL } from "./sentinel-fixtures";
import { WIRE_FORMAT_MASKS } from "./wire-format-codecs";

export { BASE32HEX, BASE64URL };
export const detailedDiagnostics = false;
export const backendName = "rust";

const bridge = await loadRustBridge();
let calls = 0;
type Request = {
  op: string;
  input?: string;
  alphabet?: string;
  bytes?: number[];
  tail?: number;
  tailBits?: number;
  mask?: (typeof WIRE_FORMAT_MASKS)[keyof typeof WIRE_FORMAT_MASKS];
  sentinels?: typeof NIL_TEST_SENTINEL;
};

function call(request: Request): unknown {
  const replies: unknown = JSON.parse(bridge.evaluate(JSON.stringify([request])));
  if (!Array.isArray(replies) || replies.length !== 1)
    throw new Error("Rust alphabet bridge must return exactly one result per call.");
  const reply: unknown = replies[0];
  if (!reply || typeof reply !== "object") throw new Error("Malformed Rust alphabet result.");
  calls++;
  if ("error" in reply && typeof reply.error === "string")
    return Object.assign(new Error(reply.error), { code: reply.error });
  if (!("value" in reply)) throw new Error("Rust alphabet result omitted its value.");
  return reply.value;
}

function text(request: Request): string | Error {
  const value = call(request);
  if (typeof value === "string" || value instanceof Error) return value;
  throw new Error(`Rust ${request.op} returned a non-text value.`);
}

export function encode(bytes: Uint8Array, alpha: Alphabet, tail = 0, tailBits = 0): string {
  const value = text({ op: "wireEncode", bytes: [...bytes], alphabet: alpha.name, tail, tailBits });
  if (value instanceof Error) throw value;
  return value;
}

export function decodeInto(
  input: string,
  alpha: Alphabet,
  output: Uint8Array,
  offset: number,
  tailBits = 0,
) {
  const value = call({ op: "wireDecode", input, alphabet: alpha.name, tailBits });
  if (value instanceof Error) return value;
  if (
    !value ||
    typeof value !== "object" ||
    !("bytes" in value) ||
    !("tail" in value) ||
    !Array.isArray(value.bytes) ||
    value.bytes.length !== 16 ||
    typeof value.tail !== "number" ||
    !value.bytes.every(
      (byte: unknown) =>
        typeof byte === "number" && Number.isInteger(byte) && byte >= 0 && byte <= 255,
    )
  )
    throw new Error("Malformed Rust decoded UUID bytes or check tail.");
  output.set(value.bytes, offset);
  return value.tail;
}

export function uuidBytesToPlainSlug(bytes: Uint8Array) {
  return text({ op: "plainFromBytes", bytes: [...bytes] });
}

export function plainSlugToUuidBytes(input: string) {
  const value = call({ op: "plainUuidBytes", input });
  if (value instanceof Error) return value;
  if (
    !Array.isArray(value) ||
    value.length !== 16 ||
    !value.every(
      (byte: unknown) =>
        typeof byte === "number" && Number.isInteger(byte) && byte >= 0 && byte <= 255,
    )
  )
    throw new Error("Malformed Rust plain UUID bytes.");
  return Uint8Array.from(value);
}

export function isPlainUuidSlug(input: unknown): boolean {
  return typeof input === "string" && !(plainSlugToUuidBytes(input) instanceof Error);
}

export function uuidStringToPlainSlug(input: string) {
  return text({ op: "plain", input });
}

function codec(mask: keyof typeof WIRE_FORMAT_MASKS) {
  const options = { mask: WIRE_FORMAT_MASKS[mask], sentinels: NIL_TEST_SENTINEL };
  return {
    uuidToMaskedSlug: (input: string) => text({ op: "mask", input, ...options }),
    uuidToString: (input: string) => text({ op: "unmask", input, ...options }),
  };
}
export const codecs = {
  "custom-mix": codec("custom-mix"),
  default: codec("default"),
  "seeded-v2": codec("seeded-v2"),
};

afterAll(() => {
  try {
    if (process.env.UUID_SLUG_WASM_BRIDGE && !bridge.transport.endsWith("WebAssembly"))
      throw new Error("The WASM lane loaded a native bridge; repair the Vitest transport alias.");
    if (!calls) throw new Error("Rust alphabet suite executed no Rust calls.");
    console.log(`${bridge.transport}: alphabet suite executed ${calls} Rust calls`);
  } finally {
    bridge.close();
  }
});
