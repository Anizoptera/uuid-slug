// SPDX-License-Identifier: Apache-2.0

// Restore wasted work at the same public entry the resource gate calls, without mutating shared
// source. Valid results distinguish a resource rejection from an unrelated correctness failure.
import * as api from "@anizoptera/uuid-slug";
import { Buffer } from "node:buffer";

export * from "@anizoptera/uuid-slug";

const mode = process.env.UUID_SLUG_RESOURCE_REGRESSION;
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
    const result: ReturnType<typeof target> = Reflect.apply(target, receiver, args);
    if (mode === "duplicate-native") Reflect.apply(target, receiver, args);
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
    return result;
  },
});

export const createUuidV7MaskingCodec = new Proxy(api.createUuidV7MaskingCodec, {
  apply(target, receiver, args) {
    const codec: ReturnType<typeof target> = Reflect.apply(target, receiver, args);
    if (mode !== "masked-temporary" || codec instanceof Error) return codec;
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
