// SPDX-License-Identifier: Apache-2.0

// Lives in `test/` rather than `bench/` because `test/entropy-probe.ts` GATES on it, and a
// correctness gate must not break when the benchmark tree is refactored. It is a general-purpose
// randomness detector, not a benchmark; `bench/entropy.ts` is the other caller and imports it here.

/**
 * Counting wrappers over every entropy source reachable from JavaScript, so a caller can ask
 * which one an implementation actually reached for rather than trusting its description.
 *
 * This is the only check that can see the difference between a cryptographic source and a
 * seeded PRNG: `Math.random` output passes every statistical test a UUID audit can run, so no
 * amount of looking at the values reveals it. The distinction matters because a v7's random
 * field is what makes an identifier unguessable, and an identifier that can be guessed from a
 * previous one is an enumeration hole wherever it is exposed.
 *
 * TWO BOUNDARIES, both of which make an unobserved result mean "not measured", never "uses
 * nothing":
 *
 * - Patches are installed when `instrument()` runs, so an implementation that destructured or
 *   bound a reference at import time keeps calling the original and is never counted.
 * - A native implementation (Bun's `randomUUIDv7`, Node's `randomUUID`) draws entropy inside
 *   the engine, below any JavaScript binding, and cannot be counted at all.
 *
 * Each patch proves it took effect before being trusted. A patch that silently did nothing
 * would report every implementation as using no source whatsoever — a false finding that
 * looks exactly like a real one, which is the failure this guards against.
 */
import nodeCrypto from "node:crypto";

export interface EntropyInstrument {
  /** Sources this runtime would not let us wrap; absent from every result. */
  readonly unavailable: readonly string[];
  /** Zero the counters before measuring one implementation. */
  reset(): void;
  /** Sources called since the last `reset`, sorted. Empty means unmeasured, not unused. */
  used(): string[];
  /** Puts every original back. Always call it; the patches are global. */
  restore(): void;
}

export function instrument(): EntropyInstrument {
  const counts = new Map<string, number>();
  const unavailable: string[] = [];
  const undoAll: (() => void)[] = [];

  const patch = (
    label: string,
    install: (bump: () => void) => () => void,
    exercise: () => void,
  ) => {
    counts.set(label, 0);
    const undo = install(() => counts.set(label, (counts.get(label) ?? 0) + 1));
    exercise();
    if ((counts.get(label) ?? 0) === 0) {
      undo();
      counts.delete(label);
      unavailable.push(label);
      return;
    }
    undoAll.push(undo);
  };

  patch(
    "Math.random",
    (bump) => {
      const original = Math.random;
      Math.random = () => {
        bump();
        return original();
      };
      return () => {
        Math.random = original;
      };
    },
    () => Math.random(),
  );

  patch(
    "crypto.getRandomValues",
    (bump) => {
      const host = globalThis.crypto;
      // Held only to reassign on restore, never invoked through this reference, so no `this` is lost.
      // eslint-disable-next-line typescript/unbound-method -- saved for restoration, never called
      const original = host.getRandomValues;
      // Returns the argument rather than the wrapped call's result: Web Crypto fills in place
      // and its return value IS the array it was handed, so this is identical behaviour and
      // keeps the generic honest, where forwarding the result would need a cast to restore it.
      host.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
        bump();
        original.call(host, array);
        return array;
      };
      return () => {
        host.getRandomValues = original;
      };
    },
    () => globalThis.crypto.getRandomValues(new Uint8Array(1)),
  );

  const exercise: Record<string, () => void> = {
    randomBytes: () => void nodeCrypto.randomBytes(1),
    randomFillSync: () => void nodeCrypto.randomFillSync(new Uint8Array(1)),
    randomUUID: () => void nodeCrypto.randomUUID(),
  };
  for (const name of Object.keys(exercise)) {
    patch(
      `node:crypto.${name}`,
      (bump) => {
        const host = nodeCrypto as unknown as Record<string, (...args: never[]) => unknown>;
        const original = host[name];
        if (!original) return () => {};
        host[name] = (...args: never[]) => {
          bump();
          return original(...args);
        };
        return () => {
          host[name] = original;
        };
      },
      exercise[name] ?? (() => {}),
    );
  }

  return {
    unavailable,
    reset: () => {
      for (const key of counts.keys()) counts.set(key, 0);
    },
    used: () =>
      [...counts.entries()]
        .filter(([, calls]) => calls > 0)
        .map(([label]) => label)
        // eslint-disable-next-line unicorn/no-array-sort -- sorts the array `map` just created
        .sort(),
    restore: () => {
      for (const undo of undoAll) undo();
    },
  };
}

/** Sources that are not cryptographically secure and must never appear in a result. */
export const INSECURE_SOURCES: readonly string[] = ["Math.random"];
