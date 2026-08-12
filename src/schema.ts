// SPDX-License-Identifier: Apache-2.0

import { UuidSlugError } from "./errors";
import { FEISTEL_KEY_WORDS, feistel16 } from "./feistel";
import type { MaskSchema, MaskSchemaOptions } from "./types";

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

function feistelSchema(id: string, seed: Uint8Array): MaskSchema {
  // A distinct purpose byte keeps this key material independent of the substitution scheme's,
  // so a seed used under both schemes does not reuse bits across them.
  const material = derivedBytes(seed, 3, FEISTEL_KEY_WORDS * 4);
  const keys = new Int32Array(FEISTEL_KEY_WORDS);
  for (let i = 0; i < keys.length; i += 1)
    keys[i] =
      ((material[i * 4] as number) << 24) |
      ((material[i * 4 + 1] as number) << 16) |
      ((material[i * 4 + 2] as number) << 8) |
      (material[i * 4 + 3] as number) |
      0;
  return {
    id,
    mix(input, output, forward) {
      feistel16(input, 0, keys, forward, output, 0);
    },
  };
}

export function createMaskSchema(options: MaskSchemaOptions): Error | MaskSchema {
  const seed = seedBytes(options.seed);
  if (seed.length === 0)
    return new UuidSlugError("invalid_mask_schema", "Mask seed must not be empty.");
  return feistelSchema(options.id ?? "seeded", seed);
}

/**
 * A schema's `mix` MUST be its own inverse; get that wrong and every id it encodes is unreadable,
 * with nothing to notice at the time. So prove it once, here, rather than trusting the caller —
 * a codec built from a broken schema must fail at construction, not at the first decode.
 *
 * Two probes: an all-zero block, which catches a `mix` that ignores `forward`, and one whose bytes
 * are all distinct, which catches a reordering applied in the same direction both ways. That is
 * what a permutation table gets wrong, and a table is no longer a special case with its own
 * bijection check — anyone bringing a foreign scheme now brings a function, so the guarantee has
 * to be checked on the function.
 */
export function verifyInvertible(schema: MaskSchema): Error | MaskSchema {
  const mixed = new Uint8Array(16);
  const restored = new Uint8Array(16);
  for (const probe of [new Uint8Array(16), Uint8Array.from({ length: 16 }, (_, i) => i * 17)]) {
    schema.mix(probe, mixed, true);
    schema.mix(mixed, restored, false);
    if (restored.some((byte, i) => byte !== probe[i]))
      return new UuidSlugError(
        "invalid_mask_schema",
        `Mask schema "${schema.id}" does not reverse its own mixing step.`,
      );
  }
  return schema;
}

/**
 * A PUBLIC key. It ships in the tarball, so every masked slug produced under it is decodable by
 * anyone who installed this package, and it therefore provides none of the obscurity masking
 * exists for.
 *
 * It is exported rather than hidden so that choosing it can be DELIBERATE: a test or demo wanting
 * byte-identical output across machines writes `mask: DEFAULT_MASK_SCHEMA` and says so at the call
 * site. The hazard is the SILENT path — `createUuidSlugCodec()` with no `mask` lands here without
 * the caller writing anything — which is why that fallback and `defaultCodec` both carry the same
 * warning, and why the masked methods are not exported as bare functions.
 */
const DEFAULT_SEED = "anizoptera.uuid-slug.default-mask.v1";

export const DEFAULT_MASK_SCHEMA: MaskSchema = createMaskSchema({
  id: "default",
  seed: DEFAULT_SEED,
}) as MaskSchema;
