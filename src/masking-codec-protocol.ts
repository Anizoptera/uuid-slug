// SPDX-License-Identifier: Apache-2.0

// Only this package's frozen codecs may borrow private UUID storage. Structural callbacks can
// retain or mutate their input; public shape checks cannot establish ownership.
const codecs = /*#__PURE__*/ new WeakSet();

export function registerMaskingCodec<Codec extends object>(codec: Codec): Codec {
  codecs.add(codec);
  return codec;
}

export function isLocalMaskingCodec(codec: object): boolean {
  return codecs.has(codec);
}
