// SPDX-License-Identifier: Apache-2.0

import { UuidSlugError } from "./errors";
import { FEISTEL_KEY_WORDS, feistel16 } from "./feistel";
import { halfSipHash } from "./siphash";
import type { MaskSchema, MaskSchemaOptions } from "./types";

/** Reject short seeds early; length alone cannot make a chosen secret unpredictable. */
const SEED_MIN_BYTES = 16;

/** Bound accidental work-factor typos; construction cost still depends on the runtime and seed. */
const MAX_KEY_ITERATIONS = 1 << 24;

/**
 * Initial keys for the two derivation chains, nothing-up-my-sleeve: the little-endian ASCII of
 * "uuid" with "slgA" and "slgB", so a reader can check they conceal no chosen structure.
 *
 * Their VALUES are arbitrary. Their STABILITY is wire-format-bearing — any other numbers give every
 * seed different round keys and make every masked slug ever issued undecodable.
 */
const CHAIN_A_KEY1 = 0x41676c73;
const CHAIN_B_KEY1 = 0x42676c73;
const CHAIN_KEY0 = 0x64697575;

function seedBytes(seed: string | Uint8Array) {
  if (typeof seed !== "string") return new Uint8Array(seed);
  return new TextEncoder().encode(seed);
}

/** Repack bytes as the little-endian 32-bit words `halfSipHash` absorbs. */
function seedWords(seed: Uint8Array) {
  const words = new Int32Array(Math.ceil(seed.length / 4) + 1);
  for (const [index, byte] of seed.entries())
    words[index >>> 2] = (words[index >>> 2] as number) | (byte << ((index & 3) * 8)) | 0;
  return words;
}

/**
 * Hash the seed under successive outputs, for `iterations` total hashes. This work is paid
 * at construction, never per id. The count changes key material and must remain stable for
 * issued slugs; retain the old count with its seed when rotating schemas.
 */
function chain(key0: number, key1: number, words: Int32Array, length: number, iterations: number) {
  const out = new Int32Array(2);
  halfSipHash(key0, key1, words, length, out);
  for (let i = 1; i < iterations; i += 1)
    halfSipHash(out[0] as number, out[1] as number, words, length, out);
  return out;
}

/**
 * Derive each round key by XORing outputs from two fixed derivation chains. Their combined
 * state is 128 bits; that representation does not establish 128-bit security. Chain constants,
 * word indices and byte order are frozen by the issued wire format.
 */
function derivedKeys(seed: Uint8Array, iterations: number) {
  const words = seedWords(seed);
  const chainA = chain(CHAIN_KEY0, CHAIN_A_KEY1, words, seed.length, iterations);
  const chainB = chain(CHAIN_KEY0, CHAIN_B_KEY1, words, seed.length, iterations);
  const keys = new Int32Array(FEISTEL_KEY_WORDS);
  const index = new Int32Array(1);
  const fromA = new Int32Array(2);
  const fromB = new Int32Array(2);
  for (let word = 0; word < FEISTEL_KEY_WORDS; word += 2) {
    index[0] = word;
    halfSipHash(chainA[0] as number, chainA[1] as number, index, 4, fromA);
    halfSipHash(chainB[0] as number, chainB[1] as number, index, 4, fromB);
    keys[word] = (fromA[0] as number) ^ (fromB[0] as number);
    keys[word + 1] = (fromA[1] as number) ^ (fromB[1] as number);
  }
  return keys;
}

function feistelSchema(id: string, seed: Uint8Array, iterations: number): MaskSchema {
  const keys = derivedKeys(seed, iterations);
  return {
    id,
    mix(input, output, forward) {
      feistel16(input, 0, keys, forward, output, 0);
    },
  };
}

export function createMaskSchema(options: MaskSchemaOptions): UuidSlugError | MaskSchema {
  const seed = seedBytes(options.seed);
  if (seed.length < SEED_MIN_BYTES)
    return new UuidSlugError(
      "invalid_mask_schema",
      `Mask seed must be at least ${SEED_MIN_BYTES} bytes, got ${seed.length}. Generate one with \`openssl rand -base64 32\` rather than choosing it; a guessable seed hides nothing however long it is.`,
    );
  const iterations = options.keyIterations ?? 1;
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > MAX_KEY_ITERATIONS)
    return new UuidSlugError(
      "invalid_mask_schema",
      `Mask keyIterations must be a whole number in 1..${MAX_KEY_ITERATIONS}, got ${String(options.keyIterations)}.`,
    );
  return feistelSchema(options.id ?? "seeded", seed, iterations);
}

/**
 * Refuse schemas that cannot undo these representative blocks. The reverse call must invert
 * the forward call; the same function need not be an involution. Finite probes are not a proof
 * over the full domain. Preserve each original input separately so a mutating callback cannot
 * rewrite the witness and make a destructive transformation appear reversible.
 */
export function verifyInvertible(schema: MaskSchema): UuidSlugError | MaskSchema {
  const mixed = new Uint8Array(16);
  const restored = new Uint8Array(16);
  for (const probe of [new Uint8Array(16), Uint8Array.from({ length: 16 }, (_, i) => i * 17)]) {
    try {
      schema.mix(probe.slice(), mixed, true);
      schema.mix(mixed, restored, false);
    } catch (cause) {
      return new UuidSlugError(
        "invalid_mask_schema",
        `Mask schema "${schema.id}" failed its invertibility check.`,
        { cause },
      );
    }
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

// Built from `feistelSchema` rather than through `createMaskSchema`, whose failures are a short seed and a
// bad iteration count — checks on CALLER input that the literals here cannot fail. Routing through it would return
// `UuidSlugError | MaskSchema` and force a cast that, at module scope, could only ever hide a real Error
// behind a `MaskSchema` type for every default codec in the process.
export const DEFAULT_MASK_SCHEMA: MaskSchema = feistelSchema("default", seedBytes(DEFAULT_SEED), 1);
