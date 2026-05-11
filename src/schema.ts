import { UuidSlugError } from "./errors";
import type {
  ExplicitMaskSchema,
  MaskSchema,
  MaskSchemaOptions,
} from "./types";

const LEGACY_PERMUTE = Uint8Array.from([
  9, 13, 3, 8, 14, 0, 11, 7, 6, 1, 15, 4, 2, 5, 10, 12,
]);
const LEGACY_XOR = Uint8Array.from([
  0xa2, 0x70, 0x32, 0x7f, 0x98, 0xb8, 0x9b, 0x5e, 0x1b, 0x26, 0xb6, 0x16, 0x96,
  0xf9, 0xea, 0x3e,
]);

function clone16(bytes: Uint8Array, name: string): Error | Uint8Array {
  if (bytes.length !== 16)
    return new UuidSlugError(
      "invalid_mask_schema",
      `${name} must contain exactly 16 bytes.`,
    );
  return new Uint8Array(bytes);
}

function inversePermutation(permute: Uint8Array): Error | Uint8Array {
  if (permute.length !== 16)
    return new UuidSlugError(
      "invalid_mask_schema",
      "Permutation must contain exactly 16 bytes.",
    );
  const seen = new Uint8Array(16);
  const inverse = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) {
    const value = permute[i] ?? 255;
    if (value > 15 || seen[value] === 1)
      return new UuidSlugError(
        "invalid_mask_schema",
        "Permutation must be a bijection over 0..15.",
      );
    seen[value] = 1;
    inverse[value] = i;
  }
  return inverse;
}

function fnv1a64(data: Uint8Array) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of data) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash;
}

function seedBytes(seed: string | Uint8Array) {
  if (typeof seed !== "string") return new Uint8Array(seed);
  return new TextEncoder().encode(seed);
}

function next64(state: { value: bigint }) {
  state.value ^= state.value << 13n;
  state.value ^= state.value >> 7n;
  state.value ^= state.value << 17n;
  state.value = BigInt.asUintN(64, state.value);
  return state.value;
}

function derivedBytes(seed: Uint8Array, purpose: number, length: number) {
  const state = {
    value: fnv1a64(Uint8Array.from([...seed, purpose])) || 0x9e3779b97f4a7c15n,
  };
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i += 1)
    out[i] = Number((next64(state) >> BigInt((i % 8) * 8)) & 0xffn);
  return out;
}

function derivedPermutation(seed: Uint8Array) {
  const random = derivedBytes(seed, 2, 64);
  const permute = Uint8Array.from({ length: 16 }, (_, i) => i);
  let cursor = 0;
  for (let i = 15; i > 0; i -= 1) {
    const j = (random[cursor] ?? 0) % (i + 1);
    cursor += 1;
    const tmp = permute[i] ?? 0;
    permute[i] = permute[j] ?? 0;
    permute[j] = tmp;
  }
  return permute;
}

function completeSchema(
  id: string,
  xorInput: Uint8Array,
  permuteInput: Uint8Array,
  tagBits: 4 | 6,
): Error | MaskSchema {
  const xor = clone16(xorInput, "XOR mask");
  if (xor instanceof Error) return xor;
  const permute = clone16(permuteInput, "Permutation");
  if (permute instanceof Error) return permute;
  const inverse = inversePermutation(permute);
  if (inverse instanceof Error) return inverse;
  return { id, inverse, permute, tagBits, xor };
}

export const LEGACY_MASK_SCHEMA_V1: MaskSchema = completeSchema(
  "legacy-mask-v1",
  LEGACY_XOR,
  LEGACY_PERMUTE,
  4,
) as MaskSchema;

export function defineMaskSchema(
  schema: ExplicitMaskSchema,
): Error | MaskSchema {
  return completeSchema(
    schema.id ?? "explicit",
    schema.xor,
    schema.permute,
    schema.tagBits,
  );
}

export function createMaskSchema(
  options: MaskSchemaOptions,
): Error | MaskSchema {
  const seed = seedBytes(options.seed);
  if (seed.length === 0)
    return new UuidSlugError(
      "invalid_mask_schema",
      "Mask seed must not be empty.",
    );
  const tagBits = options.tagBits ?? 6;
  if (tagBits !== 4 && tagBits !== 6)
    return new UuidSlugError(
      "invalid_mask_schema",
      "Mask tagBits must be 4 or 6.",
    );
  return completeSchema(
    options.id ?? "seeded",
    derivedBytes(seed, 1, 16),
    derivedPermutation(seed),
    tagBits,
  );
}

export const DEFAULT_MASK_SCHEMA: MaskSchema = createMaskSchema({
  id: "default",
  seed: "anizoptera.uuid-slug.default-mask.v1",
}) as MaskSchema;
