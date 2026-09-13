// SPDX-License-Identifier: Apache-2.0

import { ABORTED, INVALID_MASK, isUint8Array, UuidSlugError } from "./errors.ts";
import { FEISTEL_KEY_WORDS, feistel16 } from "./feistel.ts";
import { createMaskHandle } from "./mask-handle.ts";
import { halfSipHash } from "./siphash.ts";
import type { HashContinuation } from "./siphash.ts";
import { encodeUtf8 } from "#runtime";
import type { AsyncUuidV7MaskOptions, UuidV7Mask, UuidV7MaskOptions } from "./types.ts";

const MASK_CONSTRUCTION_FAILURE_MESSAGE = "Mask construction failed.";
const SEED_PROPERTY = "seed";

/** Reject short seeds early; length alone cannot make a chosen secret unpredictable. */
const SEED_MIN_BYTES = 16;

/** Bound accidental work-factor typos; construction cost still depends on the runtime and seed. */
const MAX_KEY_ITERATIONS = 1 << 24;

/** Large aligned byte seeds can share their owned buffer without changing HalfSipHash's byte order. */
const LITTLE_ENDIAN = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
const SEED_WORD_VIEW_MIN_BYTES = 4096;

/*#__NO_SIDE_EFFECTS__*/
function canViewSeedWords(seed: Uint8Array) {
  return LITTLE_ENDIAN && (seed.byteOffset & 3) === 0 && (seed.length & 3) === 0;
}

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
  return encodeUtf8(seed);
}

/** Reject coercible JavaScript values before they can allocate storage or become key material. */
function validateOptions(options: unknown) {
  if (typeof options !== "object" || options === null)
    return new UuidSlugError(
      INVALID_MASK,
      "Mask options must contain a string or Uint8Array seed.",
    );
  const input = options as {
    readonly label?: unknown;
    readonly keyDerivationIterations?: unknown;
    readonly seed?: unknown;
  };
  const seed = input.seed;
  if (typeof seed !== "string" && !isUint8Array(seed))
    return new UuidSlugError(INVALID_MASK, "Mask seed must be a string or Uint8Array.");
  const givenLabel = input.label;
  const label = givenLabel === undefined ? "seeded" : givenLabel;
  if (typeof label !== "string")
    return new UuidSlugError(INVALID_MASK, "Mask label must be a string.");
  const givenIterations = input.keyDerivationIterations;
  const keyDerivationIterations = givenIterations === undefined ? 1 : givenIterations;
  const iterations = validatedIterations(keyDerivationIterations);
  if (typeof iterations !== "number") return iterations;
  return { label, iterations, seed };
}

/** Repack bytes as the little-endian 32-bit words `halfSipHash` absorbs. */
/*#__NO_SIDE_EFFECTS__*/
function seedWords(seed: Uint8Array) {
  if (seed.length >= SEED_WORD_VIEW_MIN_BYTES && canViewSeedWords(seed))
    return new Int32Array(seed.buffer, seed.byteOffset, seed.length >>> 2);
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
 * issued slugs; retain the old count with its seed when rotating masks.
 */
/*#__NO_SIDE_EFFECTS__*/
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
/*#__NO_SIDE_EFFECTS__*/
function derivedKeys(seed: Uint8Array, iterations: number) {
  const words = seedWords(seed);
  const chainA = chain(CHAIN_KEY0, CHAIN_A_KEY1, words, seed.length, iterations);
  const chainB = chain(CHAIN_KEY0, CHAIN_B_KEY1, words, seed.length, iterations);
  return roundKeys(chainA, chainB);
}

/** The same final key expansion follows synchronous and cooperative derivation. */
/*#__NO_SIDE_EFFECTS__*/
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

/*#__NO_SIDE_EFFECTS__*/
function feistelMask(label: string, seed: Uint8Array, iterations: number): UuidV7Mask {
  return maskFromKeys(label, derivedKeys(seed, iterations));
}

/*#__NO_SIDE_EFFECTS__*/
function maskFromKeys(label: string, keys: Int32Array): UuidV7Mask {
  return createMaskHandle(label, (input, output, direction) => {
    feistel16(input, 0, keys, direction, output, 0);
  });
}

/**
 * Derive an immutable mask from a secret seed of at least 16 bytes. The seed and iteration count
 * define the wire format; retain the old mask in `previousMasks` before changing either. Invalid
 * options return `invalid_mask`.
 *
 * @param options - Stable secret seed, optional diagnostic label, and derivation work factor.
 * @returns The mask, or `UuidSlugError` when an option or seed is invalid.
 */
export function createUuidV7Mask(options: UuidV7MaskOptions): UuidV7Mask | UuidSlugError {
  try {
    const validated = validateOptions(options);
    if (!(SEED_PROPERTY in validated)) return validated;
    const seed = seedBytes(validated.seed);
    const short = invalidSeedLength(seed.length);
    return short ?? feistelMask(validated.label, seed, validated.iterations);
  } catch (cause) {
    return new UuidSlugError(INVALID_MASK, MASK_CONSTRUCTION_FAILURE_MESSAGE, { cause });
  }
}

/*#__NO_SIDE_EFFECTS__*/
function invalidSeedLength(length: number): undefined | UuidSlugError {
  if (length < SEED_MIN_BYTES)
    return new UuidSlugError(
      INVALID_MASK,
      `Mask seed must be at least ${SEED_MIN_BYTES} bytes, got ${length}. Generate one with \`openssl rand -base64 32\` rather than choosing it; a guessable seed hides nothing however long it is.`,
    );
  return undefined;
}

function validatedIterations(iterations: unknown): number | UuidSlugError {
  if (
    typeof iterations !== "number" ||
    !Number.isInteger(iterations) ||
    iterations < 1 ||
    iterations > MAX_KEY_ITERATIONS
  )
    return new UuidSlugError(
      INVALID_MASK,
      `Mask keyDerivationIterations must be a whole number in 1..${MAX_KEY_ITERATIONS}, got ${String(iterations)}.`,
    );
  return iterations;
}

/** Bounded byte work between checkpoints, independent of total seed size or iteration count. */
const CHUNK_BYTES = 4096;

const host = globalThis as { setImmediate?: (callback: () => void) => void };
const immediate = host.setImmediate?.bind(host);

/** Yield to a host task so timers, input and cancellation can run; a microtask would starve them. */
function yieldToHost(): Promise<void> {
  // Prioritized scheduler continuations can overtake queued cancellation tasks in browsers.
  if (immediate) return new Promise((resolve) => immediate(resolve));
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    // eslint-disable-next-line unicorn/prefer-add-event-listener -- this private port has one handler; assignment also starts delivery
    channel.port1.onmessage = () => {
      channel.port1.close();
      channel.port2.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}

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
    for (let start = 0; start < seed.length;) {
      let end = Math.min(seed.length, start + CHUNK_BYTES);
      // Do not split a surrogate pair: encoding either half alone would substitute U+FFFD.
      const last = seed.charCodeAt(end - 1);
      const next = seed.charCodeAt(end);
      if (end < seed.length && last >= 0xd800 && last <= 0xdbff && next >= 0xdc00 && next <= 0xdfff)
        end -= 1;
      const bytes = encodeUtf8(seed.slice(start, end));
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
  const viewBytes =
    typeof seed !== "string" && seed.length >= SEED_WORD_VIEW_MIN_BYTES && canViewSeedWords(seed);
  const words = viewBytes
    ? new Int32Array(seed.buffer, seed.byteOffset, seed.length >>> 2)
    : new Int32Array(Math.ceil(length / 4) + 1);
  if (!viewBytes) {
    let offset = 0;
    for (const bytes of chunks) {
      for (let start = 0; start < bytes.length; start += CHUNK_BYTES) {
        writeSeedWords(bytes, words, offset, start, Math.min(bytes.length, start + CHUNK_BYTES));
        yield;
      }
      offset += bytes.length;
    }
  }
  chunks.length = 0;
  const chainA = yield* cooperativeChain(CHAIN_KEY0, CHAIN_A_KEY1, words, length, iterations);
  const chainB = yield* cooperativeChain(CHAIN_KEY0, CHAIN_B_KEY1, words, length, iterations);
  return roundKeys(chainA, chainB);
}

/**
 * Derive the same mask without monopolizing the host task. Later mutation of a byte seed does not
 * affect the result. Cancellation returns `aborted` with `signal.reason` as its cause; invalid
 * options return `invalid_mask`. Construct once and reuse the result.
 *
 * @param options - Synchronous mask options plus an optional cancellation signal.
 * @returns A promise for the mask or an expected construction error.
 */
export async function createUuidV7MaskAsync(
  options: AsyncUuidV7MaskOptions,
): Promise<UuidV7Mask | UuidSlugError> {
  try {
    const signal = options?.signal;
    const aborted = () =>
      new UuidSlugError(ABORTED, "Mask construction was aborted.", {
        cause: signal?.reason,
      });
    if (signal?.aborted) return aborted();
    const validated = validateOptions(options);
    if (!(SEED_PROPERTY in validated)) return validated;
    const seed =
      typeof validated.seed === "string" ? validated.seed : new Uint8Array(validated.seed);
    const steps = cooperativeKeys(seed, validated.iterations);
    let deadline = performance.now() + 2;
    while (true) {
      if (signal?.aborted) {
        const failure = aborted();
        steps.return(failure);
        return failure;
      }
      const step = steps.next();
      if (step.done)
        return ArrayBuffer.isView(step.value)
          ? maskFromKeys(validated.label, step.value)
          : step.value;
      if (performance.now() >= deadline) {
        // eslint-disable-next-line no-await-in-loop -- each slice must yield before continuing the dependent derivation
        await yieldToHost();
        deadline = performance.now() + 2;
      }
    }
  } catch (cause) {
    return new UuidSlugError(INVALID_MASK, MASK_CONSTRUCTION_FAILURE_MESSAGE, { cause });
  }
}

/**
 * A PUBLIC key. It ships in the tarball, so every masked slug produced under it is decodable by
 * anyone who installed this package, and it therefore provides none of the obscurity masking
 * exists for.
 *
 * It is exported so a deterministic test or example can opt in visibly with
 * `mask: UUID_V7_TEST_MASK`; codec construction never selects it by omission.
 */
const DEFAULT_SEED = "anizoptera.uuid-slug.default-mask.v1";

// Built from `feistelMask` rather than through `createUuidV7Mask`, whose failures are a short seed and a
// bad iteration count — checks on CALLER input that the literals here cannot fail. Routing through it would return
// `UuidV7Mask | UuidSlugError` and force a cast that, at module scope, could only ever hide a real Error
// behind a `UuidV7Mask` type at module scope.
/** Public-key mask for deterministic tests and examples. Never use it to hide production IDs. */
export const UUID_V7_TEST_MASK: UuidV7Mask = /*#__PURE__*/ feistelMask(
  "default",
  /*#__PURE__*/ seedBytes(DEFAULT_SEED),
  1,
);
