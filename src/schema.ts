// SPDX-License-Identifier: Apache-2.0

import { UuidSlugError } from "./errors";
import { FEISTEL_KEY_WORDS, feistel16 } from "./feistel";
import { createSchemaHandle } from "./schema-handle";
import { halfSipHash } from "./siphash";
import type { HashContinuation } from "./siphash";
import { yieldToHost } from "./yield";
import type { AsyncMaskSchemaOptions, MaskSchema, MaskSchemaOptions } from "./types";

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
  writeSeedWords(seed, words);
  return words;
}

/** Pack one byte range; a running byte offset also handles UTF-8 chunks ending mid-word. */
function writeSeedWords(
  seed: Uint8Array,
  words: Int32Array,
  offset = 0,
  start = 0,
  end = seed.length,
) {
  for (let index = start; index < end; index += 1) {
    const absolute = offset + index;
    words[absolute >>> 2] =
      (words[absolute >>> 2] as number) | ((seed[index] as number) << ((absolute & 3) * 8));
  }
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
  return roundKeys(chainA, chainB);
}

/** The same final key expansion follows synchronous and cooperative derivation. */
function roundKeys(chainA: Int32Array, chainB: Int32Array) {
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
  return schemaFromKeys(id, derivedKeys(seed, iterations));
}

function schemaFromKeys(id: string, keys: Int32Array): MaskSchema {
  return createSchemaHandle(id, (input, output, forward) => {
    feistel16(input, 0, keys, forward, output, 0);
  });
}

export function createMaskSchema(options: MaskSchemaOptions): UuidSlugError | MaskSchema {
  const seed = seedBytes(options.seed);
  const short = invalidSeedLength(seed.length);
  if (short) return short;
  const iterations = options.keyIterations ?? 1;
  const invalid = invalidIterations(iterations);
  if (invalid) return invalid;
  return feistelSchema(options.id ?? "seeded", seed, iterations);
}

function invalidSeedLength(length: number): UuidSlugError | undefined {
  if (length < SEED_MIN_BYTES)
    return new UuidSlugError(
      "invalid_mask_schema",
      `Mask seed must be at least ${SEED_MIN_BYTES} bytes, got ${length}. Generate one with \`openssl rand -base64 32\` rather than choosing it; a guessable seed hides nothing however long it is.`,
    );
  return undefined;
}

function invalidIterations(iterations: number): UuidSlugError | undefined {
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > MAX_KEY_ITERATIONS)
    return new UuidSlugError(
      "invalid_mask_schema",
      `Mask keyIterations must be a whole number in 1..${MAX_KEY_ITERATIONS}, got ${String(iterations)}.`,
    );
  return undefined;
}

/** Bounded byte work between checkpoints, independent of total seed size or iteration count. */
const CHUNK_BYTES = 4096;

function* cooperativeChain(
  key0: number,
  key1: number,
  words: Int32Array,
  length: number,
  iterations: number,
): Generator<void, Int32Array, void> {
  const out = new Int32Array(2);
  out[0] = key0;
  out[1] = key1;
  const hashesPerChunk = Math.max(1, Math.floor(CHUNK_BYTES / (length + 4)));
  let sinceCheckpoint = 0;
  for (let i = 0; i < iterations; i += 1) {
    let continuation: HashContinuation | undefined;
    do {
      continuation = halfSipHash(out[0], out[1], words, length, out, continuation, CHUNK_BYTES / 4);
      if (continuation) yield;
    } while (continuation);
    sinceCheckpoint += 1;
    if (sinceCheckpoint >= hashesPerChunk) {
      sinceCheckpoint = 0;
      yield;
    }
  }
  return out;
}

function* cooperativeKeys(
  seed: string | Uint8Array,
  iterations: number,
): Generator<void, Int32Array | UuidSlugError, void> {
  // Byte seeds were snapshotted before suspension. Strings are immutable, so encoding can yield.
  const chunks: Uint8Array[] = [];
  let length = 0;
  if (typeof seed === "string") {
    const encoder = new TextEncoder();
    for (let start = 0; start < seed.length;) {
      let end = Math.min(seed.length, start + CHUNK_BYTES);
      // Do not split a surrogate pair: encoding either half alone would substitute U+FFFD.
      const last = seed.charCodeAt(end - 1);
      const next = seed.charCodeAt(end);
      if (end < seed.length && last >= 0xd800 && last <= 0xdbff && next >= 0xdc00 && next <= 0xdfff)
        end -= 1;
      const bytes = encoder.encode(seed.slice(start, end));
      chunks.push(bytes);
      length += bytes.length;
      start = end;
      yield;
    }
  } else {
    chunks.push(seed);
    length = seed.length;
  }
  const short = invalidSeedLength(length);
  if (short) return short;
  const words = new Int32Array(Math.ceil(length / 4) + 1);
  let offset = 0;
  for (const bytes of chunks) {
    for (let start = 0; start < bytes.length; start += CHUNK_BYTES) {
      writeSeedWords(bytes, words, offset, start, Math.min(bytes.length, start + CHUNK_BYTES));
      yield;
    }
    offset += bytes.length;
  }
  chunks.length = 0;
  const chainA = yield* cooperativeChain(CHAIN_KEY0, CHAIN_A_KEY1, words, length, iterations);
  const chainB = yield* cooperativeChain(CHAIN_KEY0, CHAIN_B_KEY1, words, length, iterations);
  return roundKeys(chainA, chainB);
}

/**
 * Derive the same schema while allowing other host tasks to run. Options and byte contents are
 * captured before suspension; cancellation returns an `aborted` error with the signal's reason
 * as its cause. Checkpoints stop computation rather than racing a still-running derivation.
 *
 * Two-millisecond work slices leave headroom for host scheduling. This is a responsiveness target,
 * not a bound on the initial byte snapshot, allocation, GC or scheduler delays. Tiny derivations
 * need no host yield. Passing the result as a codec's `mask` avoids deriving it again.
 */
export async function createMaskSchemaAsync(
  options: AsyncMaskSchemaOptions,
): Promise<MaskSchema | UuidSlugError> {
  try {
    const { signal } = options;
    const aborted = () =>
      new UuidSlugError("aborted", "Mask schema construction was aborted.", {
        cause: signal?.reason,
      });
    if (signal?.aborted) return aborted();
    const { seed: input, keyIterations = 1, id = "seeded" } = options;
    const invalid = invalidIterations(keyIterations);
    if (invalid) return invalid;
    const seed = typeof input === "string" ? input : new Uint8Array(input);
    const steps = cooperativeKeys(seed, keyIterations);
    let deadline = performance.now() + 2;
    while (true) {
      if (signal?.aborted) {
        const failure = aborted();
        steps.return(failure);
        return failure;
      }
      const step = steps.next();
      if (step.done)
        return step.value instanceof Error ? step.value : schemaFromKeys(id, step.value);
      if (performance.now() >= deadline) {
        // eslint-disable-next-line no-await-in-loop -- each slice must yield before continuing the dependent derivation
        await yieldToHost();
        deadline = performance.now() + 2;
      }
    }
  } catch (cause) {
    return new UuidSlugError("invalid_mask_schema", "Mask schema construction failed.", { cause });
  }
}

/**
 * A PUBLIC key. It ships in the tarball, so every masked slug produced under it is decodable by
 * anyone who installed this package, and it therefore provides none of the obscurity masking
 * exists for.
 *
 * It is exported so a deterministic test or example can opt in visibly with
 * `mask: PUBLIC_MASK_SCHEMA`; codec construction never selects it by omission.
 */
const DEFAULT_SEED = "anizoptera.uuid-slug.default-mask.v1";

// Built from `feistelSchema` rather than through `createMaskSchema`, whose failures are a short seed and a
// bad iteration count — checks on CALLER input that the literals here cannot fail. Routing through it would return
// `UuidSlugError | MaskSchema` and force a cast that, at module scope, could only ever hide a real Error
// behind a `MaskSchema` type at module scope.
export const PUBLIC_MASK_SCHEMA: MaskSchema = feistelSchema("default", seedBytes(DEFAULT_SEED), 1);
