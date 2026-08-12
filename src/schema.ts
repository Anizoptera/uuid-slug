// SPDX-License-Identifier: Apache-2.0

import { UuidSlugError } from "./errors";
import { FEISTEL_KEY_WORDS, feistel16, read32 } from "./feistel";
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

/**
 * Expands a seed into key material. NOT a KDF: the seed reaches the output only through
 * `fnv1a64`, so the material carries at most 64 bits of entropy however long the seed is — a
 * caller passing 32 random bytes gets 64 bits of key, not 256.
 *
 * That is enough here and stays. Masking buys obscurity, not secrecy (Art's ruling, 2026-08-12);
 * a real KDF would need either a dependency or a synchronous SHA-256 of our own, because
 * `crypto.subtle` is async-only and cannot sit under a synchronous constructor; and widening the
 * state would change every key and orphan every masked slug already issued.
 */
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
  // Domain separator, hashed with the seed so a second scheme deriving from the same seed cannot
  // share key bits. Its VALUE is arbitrary; its stability is not — any other number gives every
  // seed different round keys and makes every masked slug ever issued undecodable.
  const material = derivedBytes(seed, 3, FEISTEL_KEY_WORDS * 4);
  const keys = new Int32Array(FEISTEL_KEY_WORDS);
  // Read through `read32` rather than assembled here: round keys are as wire-format-bearing as the
  // block bytes, so they must be big-endian for the same reason, and a second copy of that
  // assembly is a second thing to keep in step.
  for (let i = 0; i < keys.length; i += 1) keys[i] = read32(material, i * 4);
  return {
    id,
    mix(input, output, forward) {
      feistel16(input, 0, keys, forward, output, 0);
    },
  };
}

export function createMaskSchema(options: MaskSchemaOptions): UuidSlugError | MaskSchema {
  const seed = seedBytes(options.seed);
  if (seed.length === 0)
    return new UuidSlugError("invalid_mask_schema", "Mask seed must not be empty.");
  return feistelSchema(options.id ?? "seeded", seed);
}

/**
 * A schema's `mix` MUST be its own inverse; get that wrong and every id it encodes is unreadable,
 * with nothing to notice at the time. So a codec built from a broken schema fails at construction
 * rather than at the first decode.
 *
 * This is a SMOKE TEST, not a proof, and the distinction is worth keeping straight: two probes
 * cannot establish a bijection over 2^128, and a `mix` that round-trips these two blocks and
 * mangles a third passes here. What the probes buy is the two mistakes anyone actually makes — an
 * all-zero block catches a `mix` that ignores `forward`, and a block of distinct bytes catches a
 * reordering applied in the same direction both ways, which is what a permutation table gets
 * wrong. A table is no longer a special case with its own bijection check: anyone bringing a
 * foreign scheme brings a function, so whatever can be checked has to be checked on the function.
 */
export function verifyInvertible(schema: MaskSchema): UuidSlugError | MaskSchema {
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

// Built from `feistelSchema` rather than through `createMaskSchema`, whose only failure is an empty
// seed — a check on CALLER input that a literal here cannot fail. Routing through it would return
// `UuidSlugError | MaskSchema` and force a cast that, at module scope, could only ever hide a real Error
// behind a `MaskSchema` type for every default codec in the process.
export const DEFAULT_MASK_SCHEMA: MaskSchema = feistelSchema("default", seedBytes(DEFAULT_SEED));
