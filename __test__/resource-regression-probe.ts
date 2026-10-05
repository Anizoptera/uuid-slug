// SPDX-License-Identifier: Apache-2.0

// Restore wasted work at the same public entry the resource gate calls, without mutating shared
// source. Valid results distinguish a resource rejection from an unrelated correctness failure.
import * as api from "@anizoptera/uuid-slug";
import { Buffer } from "node:buffer";

export * from "@anizoptera/uuid-slug";

// Select before measured calls so one browser bundle can exercise every isolated defect.
const mode =
  typeof process === "undefined"
    ? new URL(location.href).searchParams.get("resource-regression")
    : process.env.UUID_SLUG_RESOURCE_REGRESSION;
const oldState = new WeakMap<object, unknown>();

export const generateUuidV4 = new Proxy(api.generateUuidV4, {
  apply(target, receiver, args) {
    const result: ReturnType<typeof target> = Reflect.apply(target, receiver, args);
    if (mode === "native-revalidation" && typeof result === "string")
      for (let index = 0; index < result.length; index++) result.charCodeAt(index);
    return result;
  },
});

export const generateUuidV4Bytes = new Proxy(api.generateUuidV4Bytes, {
  apply(target, receiver, args) {
    const result: ReturnType<typeof target> = Reflect.apply(target, receiver, args);
    return mode === "owned-temporary" && args.length === 0 && result instanceof Uint8Array
      ? new Uint8Array(result)
      : result;
  },
});

export const generateUuidV7 = new Proxy(api.generateUuidV7, {
  apply(target, receiver, args) {
    if (mode === "lost-native-v7-text") return api.generateUuidV7({ at: Date.now() });
    const result: ReturnType<typeof target> = Reflect.apply(target, receiver, args);
    if (mode === "duplicate-native") Reflect.apply(target, receiver, args);
    if (mode === "native-v7-text-revalidation" && typeof result === "string")
      for (let index = 0; index < result.length; index++) result.charCodeAt(index);
    return result;
  },
});

export const generatePlainUuidV7Slug = new Proxy(api.generatePlainUuidV7Slug, {
  apply(target, receiver, args) {
    // Explicit-time generation preserves valid output while bypassing native default selection.
    if (mode === "lost-native-v7-slug") return api.generatePlainUuidV7Slug({ at: Date.now() });
    const result: ReturnType<typeof target> = Reflect.apply(target, receiver, args);
    if (mode === "native-v7-slug-revalidation" && typeof result === "string")
      for (let index = 0; index < result.length; index++) result.charCodeAt(index);
    if (mode === "v7-base32-temporary" && args[0] === api.BASE32HEX) new Uint8Array(16).fill(0);
    return result;
  },
});

export const generatePlainUuidV4Slug = new Proxy(api.generatePlainUuidV4Slug, {
  apply(target, receiver, args) {
    const result: ReturnType<typeof target> = Reflect.apply(target, receiver, args);
    if (
      (mode === "v4-slug-temporary" && args.length === 0) ||
      (mode === "v4-base32-temporary" && args[0] === api.BASE32HEX)
    )
      new Uint8Array(16).fill(0);
    return result;
  },
});

export const generateUuidV7WithPlainSlug = new Proxy(api.generateUuidV7WithPlainSlug, {
  apply(target, receiver, args) {
    const result: ReturnType<typeof target> = Reflect.apply(target, receiver, args);
    if (mode === "duplicate-pair") Reflect.apply(target, receiver, args);
    return result;
  },
});

export const uuidBytesToPlainSlug = new Proxy(api.uuidBytesToPlainSlug, {
  apply(target, receiver, args) {
    const input: unknown = args[0];
    if (mode === "lost-native-encoder" && input instanceof Uint8Array && args.length === 1)
      return Buffer.from(input.buffer, input.byteOffset, input.byteLength).toString("base64url");
    return Reflect.apply(target, receiver, args);
  },
});

export const parseUuid = new Proxy(api.parseUuid, {
  apply(target, receiver, args) {
    const result: ReturnType<typeof target> = Reflect.apply(target, receiver, args);
    if (mode === "weak-map-state" && !(result instanceof Error)) oldState.set(result, args[0]);
    if (mode === "slug-parse-temporary" && typeof args[0] === "string" && args[0].length === 22)
      new Uint8Array(16).fill(0);
    return result;
  },
});

export const generateUuidV7Value = new Proxy(api.generateUuidV7Value, {
  apply(target, receiver, args) {
    // Discarded storage changes resource cost without weakening the returned immutable value.
    if (mode === "root-value-temporary") new Uint8Array(16).fill(0);
    return Reflect.apply(target, receiver, args);
  },
});

export const createUuidV7MaskingCodec = new Proxy(api.createUuidV7MaskingCodec, {
  apply(target, receiver, args) {
    const codec: ReturnType<typeof target> = Reflect.apply(target, receiver, args);
    if (codec instanceof Error) return codec;
    if (
      mode === "masked-slug-temporary" ||
      mode === "masked-pair-temporary" ||
      mode === "codec-value-temporary"
    )
      return {
        ...codec,
        generateMaskedUuidV7Slug: new Proxy(codec.generateMaskedUuidV7Slug, {
          apply(generate, generateReceiver, inputs) {
            if (mode === "masked-slug-temporary") new Uint8Array(16).fill(0);
            return Reflect.apply(generate, generateReceiver, inputs);
          },
        }),
        generateUuidV7WithMaskedSlug: new Proxy(codec.generateUuidV7WithMaskedSlug, {
          apply(generate, generateReceiver, inputs) {
            if (mode === "masked-pair-temporary") new Uint8Array(16).fill(0);
            return Reflect.apply(generate, generateReceiver, inputs);
          },
        }),
        generateUuidV7Value: new Proxy(codec.generateUuidV7Value, {
          apply(generate, generateReceiver, inputs) {
            if (mode === "codec-value-temporary") new Uint8Array(16).fill(0);
            return Reflect.apply(generate, generateReceiver, inputs);
          },
        }),
      };
    if (mode !== "masked-temporary") return codec;
    return {
      ...codec,
      uuidToMaskedSlug: new Proxy(codec.uuidToMaskedSlug, {
        apply(encode, encodeReceiver, inputs) {
          const input: unknown = inputs[0];
          if (typeof input !== "string") return Reflect.apply(encode, encodeReceiver, inputs);
          const bytes = api.uuidStringToBytes(input);
          if (bytes instanceof Error) return bytes;
          return Reflect.apply(encode, encodeReceiver, [bytes, ...inputs.slice(1)]);
        },
      }),
    };
  },
});
