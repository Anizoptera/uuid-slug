// SPDX-License-Identifier: Apache-2.0

/**
 * Draws cryptographic randomness a page at a time instead of per id.
 *
 * The underlying primitives cost far more per call than per byte, and a v7 id needs only 16
 * bytes, so per-id draws spend nearly all of their time on call overhead. Measured 2026-08-11
 * filling 16 bytes: 1.94M/s (Node 24) and 4.85M/s (Bun) drawing directly, against 38.9M/s and
 * 77.9M/s from an 8 KiB pool — 20x and 16x. Node's own `randomUUID` batches for the same reason,
 * which is why `crypto.randomUUID` measures 8.9M/s against 1.5M/s with its cache disabled.
 *
 * 8 KiB is the knee: 64 KiB gains nothing further on Node and measured slightly worse on Bun,
 * while holding eight times as much unissued material in memory.
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
