// SPDX-License-Identifier: Apache-2.0

// Exercise async derivation through real host tasks, independent inputs and cancellation signals.
import { strict as assert } from "node:assert";
import { setImmediate as nextTask } from "node:timers/promises";
import {
  createUuidV7Mask,
  createUuidV7MaskAsync,
  createUuidV7SlugCodec,
  UuidSlugError,
} from "../src/index";
import type { UuidV7Mask } from "../src/index";
import { unwrap } from "../dev/unwrap";

const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
function encoded(schema: UuidV7Mask | UuidSlugError): string {
  assert.ok(!(schema instanceof Error));
  const result = unwrap(createUuidV7SlugCodec({ mask: schema })).encodeUuid(uuid);
  assert.equal(typeof result, "string");
  return result as string;
}
function cancelled(value: UuidV7Mask | UuidSlugError, reason: unknown): void {
  assert.ok(value instanceof UuidSlugError);
  assert.equal(value.code, "aborted");
  assert.equal(value.cause, reason);
}
export const asyncSchemaCases = [
  {
    name: "async derivation preserves byte tails, UTF-8 boundaries and iteration counts",
    async run(this: void) {
      const strings = [
        "async-schema-seed",
        "x".repeat(4095) + "😀" + "尾".repeat(1500),
        "x".repeat(4095) + "\ud800x\udfff",
        "🌍".repeat(2049),
      ];
      const seeds = [
        ...strings,
        ...[16, 17, 18, 4095, 4096, 4097].map((length) =>
          Uint8Array.from({ length }, (_, i) => (i * 37 + (i >>> 8)) & 255),
        ),
      ];
      await Promise.all(
        seeds.flatMap((seed) =>
          [1, 2, 17].map(async (keyDerivationIterations) => {
            const bytes = typeof seed === "string" ? new TextEncoder().encode(seed) : seed;
            const expected = encoded(createUuidV7Mask({ seed: bytes, keyDerivationIterations }));
            assert.equal(
              encoded(await createUuidV7MaskAsync({ seed, keyDerivationIterations })),
              expected,
            );
          }),
        ),
      );
    },
  },
  {
    name: "async construction captures options and byte contents before suspension",
    async run(this: void) {
      const seed = new Uint8Array(32).fill(91);
      const options = { seed, label: "captured", keyDerivationIterations: 65536 };
      const expected = encoded(createUuidV7Mask(options));
      const pending = createUuidV7MaskAsync(options);
      seed.fill(0);
      options.label = "changed";
      options.keyDerivationIterations = 1;
      const result = await pending;
      assert.ok(!(result instanceof Error));
      assert.equal(result.label, "captured");
      assert.equal(encoded(result), expected);
    },
  },
  {
    name: "pre-aborted construction does not read or copy the seed",
    async run(this: void) {
      const reason = { cancelledBy: "caller" };
      const signal = AbortSignal.abort(reason);
      cancelled(
        await createUuidV7MaskAsync({
          signal,
          get seed(): string {
            throw new Error("seed must not be read");
          },
        }),
        reason,
      );
    },
  },
  {
    name: "host-task cancellation stops a long derivation without cancelling its sibling",
    async run(this: void) {
      const controller = new AbortController();
      const reason = new Error("cancel one construction");
      const trigger = nextTask().then(() => controller.abort(reason));
      const pending = createUuidV7MaskAsync({
        seed: "async-schema-seed",
        keyDerivationIterations: 1 << 24,
        signal: controller.signal,
      });
      const sibling = createUuidV7MaskAsync({
        seed: "sibling-schema-seed",
        keyDerivationIterations: 8192,
      });
      const [result, independent] = await Promise.all([pending, sibling]);
      cancelled(result, reason);
      assert.equal(
        encoded(independent),
        encoded(createUuidV7Mask({ seed: "sibling-schema-seed", keyDerivationIterations: 8192 })),
      );
      await trigger;
    },
  },
  {
    name: "a crossed work-slice deadline yields to the host before construction continues",
    async run(this: void) {
      const ownNow = Object.getOwnPropertyDescriptor(performance, "now");
      let clockReads = 0;
      Object.defineProperty(performance, "now", {
        configurable: true,
        value: () => (clockReads++ === 0 ? 0 : 3),
      });
      const controller = new AbortController();
      const trigger = nextTask().then(() => controller.abort("slice cancelled"));
      try {
        const result = await createUuidV7MaskAsync({
          seed: new Uint8Array(4096).fill(29),
          signal: controller.signal,
        });
        cancelled(result, "slice cancelled");
      } finally {
        if (ownNow) Object.defineProperty(performance, "now", ownNow);
        else delete (performance as { now?: () => number }).now;
        await trigger;
      }
    },
  },
  {
    name: "async construction returns invalid-option errors and preserves unexpected causes",
    async run(this: void) {
      await Promise.all(
        [0, -1, 0.5, NaN, Infinity, (1 << 24) + 1].map(async (keyDerivationIterations) => {
          const result = await createUuidV7MaskAsync({
            seed: "async-schema-seed",
            keyDerivationIterations,
          });
          assert.ok(result instanceof UuidSlugError);
          assert.equal(result.code, "invalid_mask");
        }),
      );
      const short = await createUuidV7MaskAsync({ seed: "short" });
      assert.ok(short instanceof UuidSlugError);
      assert.equal(short.code, "invalid_mask");
      const cause = new Error("seed unavailable");
      const result = await createUuidV7MaskAsync({
        get seed(): string {
          throw cause;
        },
      });
      assert.ok(result instanceof UuidSlugError);
      assert.equal(result.cause, cause);
    },
  },
];
