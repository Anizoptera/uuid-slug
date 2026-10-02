// SPDX-License-Identifier: Apache-2.0

type Api = Pick<
  typeof import("../src/index"),
  "generateUuidV4" | "generateUuidV4Bytes" | "UUID_TEXT_UPPERCASE"
>;
type PrivateV4Api = Pick<typeof import("../src/v4"), "generatePortableUuidV4">;

/** Keep UUIDv4 output forms together so runtime selection is compared through each result. */
export function createUuidV4ProfileCases(api: Api, into: Uint8Array, privateV4Api?: PrivateV4Api) {
  const crypto = globalThis.crypto;
  return {
    ...(crypto?.randomUUID
      ? {
          "native.v4.string": () => crypto.randomUUID(),
          "native.v4.string.uppercase": () => crypto.randomUUID().toUpperCase(),
        }
      : {}),
    "v4.string": () => api.generateUuidV4(),
    "v4.string.uppercase": () => api.generateUuidV4(api.UUID_TEXT_UPPERCASE),
    ...(privateV4Api ? { "portable.v4.string": () => privateV4Api.generatePortableUuidV4() } : {}),
    "v4.bytes": () => api.generateUuidV4Bytes(),
    "v4.into": () => api.generateUuidV4Bytes(into, 4),
  };
}
