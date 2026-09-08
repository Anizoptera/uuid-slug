// SPDX-License-Identifier: Apache-2.0

// Exercise async derivation through real host tasks, independent inputs and cancellation signals.
import { strict as assert } from "node:assert";
import { setImmediate as nextTask } from "node:timers/promises";
import {
  createMaskSchema,
  createMaskSchemaAsync,
  createUuidSlugCodec,
  UuidSlugError,
} from "../src/index";
import type { MaskSchema } from "../src/index";
import { unwrap } from "../dev/unwrap";

const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
function encoded(schema: MaskSchema | UuidSlugError): string {
  assert.ok(!(schema instanceof Error));
  const result = unwrap(createUuidSlugCodec({ mask: schema })).uuidV7ToMaskedSlug(uuid);
  assert.equal(typeof result, "string");
  return result as string;
}
function cancelled(value: MaskSchema | UuidSlugError, reason: unknown): void {
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
          [1, 2, 17].map(async (keyIterations) => {
            const bytes = typeof seed === "string" ? new TextEncoder().encode(seed) : seed;
            const expected = encoded(createMaskSchema({ seed: bytes, keyIterations }));
            assert.equal(encoded(await createMaskSchemaAsync({ seed, keyIterations })), expected);
          }),
        ),
      );
    },
  },
  {
    name: "async construction captures options and byte contents before suspension",
    async run(this: void) {
      const seed = new Uint8Array(32).fill(91);
      const options = { seed, id: "captured", keyIterations: 65536 };
      const expected = encoded(createMaskSchema(options));
      const pending = createMaskSchemaAsync(options);
      seed.fill(0);
      options.id = "changed";
      options.keyIterations = 1;
      const result = await pending;
      assert.ok(!(result instanceof Error));
      assert.equal(result.id, "captured");
      assert.equal(encoded(result), expected);
    },
  },
  {
    name: "pre-aborted construction does not read or copy the seed",
    async run(this: void) {
      const reason = { cancelledBy: "caller" };
      const signal = AbortSignal.abort(reason);
      cancelled(
        await createMaskSchemaAsync({
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
      const pending = createMaskSchemaAsync({
        seed: "async-schema-seed",
        keyIterations: 1 << 24,
        signal: controller.signal,
      });
      const sibling = createMaskSchemaAsync({ seed: "sibling-schema-seed", keyIterations: 8192 });
      const [result, independent] = await Promise.all([pending, sibling]);
      cancelled(result, reason);
      assert.equal(
        encoded(independent),
        encoded(createMaskSchema({ seed: "sibling-schema-seed", keyIterations: 8192 })),
      );
      await trigger;
    },
  },
  {
    name: "large single-iteration seeds yield before construction finishes",
    async run(this: void) {
      const controller = new AbortController();
      const trigger = nextTask().then(() => controller.abort("large seed cancelled"));
      const result = await createMaskSchemaAsync({
        seed: new Uint8Array(1 << 20).fill(29),
        signal: controller.signal,
      });
      cancelled(result, "large seed cancelled");
      await trigger;
    },
  },
  {
    name: "async construction returns invalid-option errors and preserves unexpected causes",
    async run(this: void) {
      await Promise.all(
        [0, -1, 0.5, NaN, Infinity, (1 << 24) + 1].map(async (keyIterations) => {
          const result = await createMaskSchemaAsync({ seed: "async-schema-seed", keyIterations });
          assert.ok(result instanceof UuidSlugError);
          assert.equal(result.code, "invalid_mask_schema");
        }),
      );
      const short = await createMaskSchemaAsync({ seed: "short" });
      assert.ok(short instanceof UuidSlugError);
      assert.equal(short.code, "invalid_mask_schema");
      const cause = new Error("seed unavailable");
      const result = await createMaskSchemaAsync({
        get seed(): string {
          throw cause;
        },
      });
      assert.ok(result instanceof UuidSlugError);
      assert.equal(result.cause, cause);
    },
  },
];
