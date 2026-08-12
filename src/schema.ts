// SPDX-License-Identifier: Apache-2.0

import { UuidSlugError } from "./errors";
import { FEISTEL_KEY_WORDS, feistel16 } from "./feistel";
import { halfSipHash } from "./siphash";
import type { MaskSchema, MaskSchemaOptions } from "./types";

/**
 * Shortest seed accepted. It is DEFENCE IN DEPTH, never the protection: no length rule and no work
 * factor saves a genuinely guessable seed — a dictionary word falls in minutes at 200 guesses/sec
 * just as it does at 255,000. The actual protection is a seed nobody can guess, which is why the
 * error below names the command that generates one and README says the same. What this rule buys is
 * that the commonest silent mistake — a short human-chosen word — fails loudly at construction
 * instead of masking nothing forever.
 */
const SEED_MIN_BYTES = 16;

/**
 * Ceiling on the work factor, so a mistyped `1e12` fails at construction instead of hanging the
 * process with no output and nothing to read. The value is a backstop, not a recommendation: at the
 * measured cost per iteration it bounds construction to a few seconds.
 */
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
 * One keyed chain: hash the seed, then re-hash it under the previous output `iterations` times.
 *
 * Iterating is the work factor D1 asks for, and it is the only lever this package has against the
 * one failure a README paragraph cannot prevent. Measured 2026-08-12 before this existed: an
 * attacker holding a single (uuid, slug) pair tested 255,663 candidate seeds per second and found
 * the real one. Each iteration divides that rate, paid ONCE per codec construction and never per
 * id — which is why the default is the cheapest setting and raising it is the caller's call.
 *
 * WIRE-FORMAT-BEARING, exactly like the seed: a different count is a different key, so every masked
 * slug issued under the old one stops decoding.
 */
function chain(key0: number, key1: number, words: Int32Array, length: number, iterations: number) {
  const out = new Int32Array(2);
  halfSipHash(key0, key1, words, length, out);
  for (let i = 1; i < iterations; i += 1)
    halfSipHash(out[0] as number, out[1] as number, words, length, out);
  return out;
}

/**
 * Expand a seed into the Feistel's round keys.
 *
 * Two independent chains XORed is the standard cascade for widening a PRF's key: HalfSipHash takes a
 * 64-bit key, and recovering a round key requires breaking BOTH chains, so the derived key is 128
 * bits rather than 64. That matters because the construction it replaced capped the key at 64 bits
 * however long the seed was — FNV-1a-64 into xorshift64 — so `MaskSchemaOptions.seed` had to warn
 * that 32 random bytes bought a 64-bit key. It no longer does: the seed reaches the round keys
 * through a 128-bit internal state at full width.
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

// Built from `feistelSchema` rather than through `createMaskSchema`, whose failures are a short seed and a
// bad iteration count — checks on CALLER input that the literals here cannot fail. Routing through it would return
// `UuidSlugError | MaskSchema` and force a cast that, at module scope, could only ever hide a real Error
// behind a `MaskSchema` type for every default codec in the process.
export const DEFAULT_MASK_SCHEMA: MaskSchema = feistelSchema("default", seedBytes(DEFAULT_SEED), 1);
