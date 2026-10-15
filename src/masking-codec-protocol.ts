// SPDX-License-Identifier: Apache-2.0

// Only this package's frozen codecs may borrow private UUID storage. Structural callbacks can
// retain or mutate their input; public shape checks cannot establish ownership.
// A private stamp follows the generator ownership protocol without a WeakSet registration or lookup;
// construction and conversion measurements are owned by bench/decisions.md.
// Remeasure construction and parsed conversions if engines change private-field storage.
// eslint-disable-next-line typescript/no-extraneous-class -- returning the codec lets the subclass stamp the existing plain object
class ReturnCodec {
  constructor(codec: object) {
    return codec;
  }
}

class PackageMaskingCodec extends ReturnCodec {
  readonly #local = true;

  static is(codec: object): boolean {
    return typeof codec === "object" && codec !== null && #local in codec && codec.#local;
  }
}

export function registerMaskingCodec<Codec extends object>(codec: Codec): Codec {
  return new PackageMaskingCodec(codec) as object as Codec;
}

export function isLocalMaskingCodec(codec: object): boolean {
  return PackageMaskingCodec.is(codec);
}
