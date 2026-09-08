// SPDX-License-Identifier: Apache-2.0

/**
 * Draws cryptographic randomness a page at a time instead of per id.
 *
 * Randomness calls cost more than copying the 16 bytes an identifier needs. The bounded pool
 * amortizes that call without retaining more unissued material than needed.
 *
 * The source is unchanged — this batches the same CSPRNG, it does not replace or stretch it.
 */
const POOL_BYTES = 8192;

/**
 * Wraps a direct random-fill primitive in a pool.
 *
 * Consumed bytes are zeroed as they are handed out. Batching is what creates the need: without
 * a pool, material for an id is gone once used, whereas a live 8 KiB buffer would otherwise
 * retain the random half of up to 512 already-issued ids, so a heap dump would expose ids the
 * process had already handed out. Zeroing restores the property batching would remove; the cost
 * is one write per byte already being copied.
 *
 * Each module instance owns its pool, so worker threads never share one. This is safe under
 * Node's process model because a new process gets a fresh heap; it would NOT be safe under a
 * POSIX `fork` that copies the heap, where parent and child would issue identical bytes.
 */
export function pooledFill(
  fill: (into: Uint8Array<ArrayBuffer>) => void,
): (bytes: Uint8Array<ArrayBuffer>) => void {
  const pool = new Uint8Array(POOL_BYTES);
  // STARTS EMPTY, and must. Pre-filling here would move the first call's syscall off the hot path,
  // which looks like a free win and is the one change that breaks heap-snapshot safety: a snapshot
  // taken at import time (V8 or JavaScriptCore startup snapshots, and the serverless platforms
  // built on them) would capture drawn randomness, and every process restored from it would issue
  // the SAME identifiers. Nothing else would notice — the bytes stay perfectly random within any
  // one process, so every other case in this suite passes. `test/entropy.test.ts` gates it by
  // importing the package under the instrument and requiring that no source was touched.
  let offset = POOL_BYTES;
  return (bytes) => {
    const { length } = bytes;
    // A request larger than the pool would refill for a single use; serve it directly instead.
    if (length > POOL_BYTES) {
      fill(bytes);
      return;
    }
    if (offset + length > POOL_BYTES) {
      fill(pool);
      offset = 0;
    }
    // Copy and erase in one pass; `subarray` plus `set` would allocate a view per call.
    for (let i = 0; i < length; i += 1) {
      bytes[i] = pool[offset + i] as number;
      pool[offset + i] = 0;
    }
    offset += length;
  };
}
