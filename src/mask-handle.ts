// SPDX-License-Identifier: Apache-2.0

import { INVALID_MASK, isUint8Array, isUuidSlugError, UuidSlugError } from "./errors.ts";
import type { CustomUuidV7MaskOptions, UuidV7Mask } from "./types.ts";

const MASK_PROTOCOL = Symbol.for("@anizoptera/uuid-slug/mask/1");
const CUSTOM_MASK_FAILURE_MESSAGE = "Custom mask construction failed.";

interface MaskProtocol {
  readonly version: 1;
  readonly mix: (
    input: Uint8Array,
    output: Uint8Array,
    direction: "mask" | "unmask",
  ) => undefined | UuidSlugError;
}

type MaskHandle = UuidV7Mask & { readonly [MASK_PROTOCOL]: MaskProtocol };

/**
 * The versioned global symbol lets genuine handles cross duplicate same-version package copies.
 * The protocol is internal representation, not an authenticity boundary for trusted codec options.
 */
/*#__NO_SIDE_EFFECTS__*/
export function createMaskHandle(label: string, mix: MaskProtocol["mix"]): UuidV7Mask {
  const mask = { label } as MaskHandle;
  Object.defineProperty(mask, MASK_PROTOCOL, {
    value: Object.freeze<MaskProtocol>({ version: 1, mix }),
  });
  return Object.freeze(mask);
}

function maskProtocol(mask: UuidV7Mask): MaskProtocol | undefined {
  if (typeof mask !== "object" || mask === null) return undefined;
  const protocol = (mask as Partial<MaskHandle>)[MASK_PROTOCOL];
  return protocol?.version === 1 && typeof protocol.mix === "function" ? protocol : undefined;
}

export function isMaskHandle(mask: unknown): mask is UuidV7Mask {
  return maskProtocol(mask as UuidV7Mask) !== undefined;
}

export function applyMask(
  mask: UuidV7Mask,
  input: Uint8Array,
  output: Uint8Array,
  direction: "mask" | "unmask",
): undefined | UuidSlugError {
  const protocol = maskProtocol(mask);
  if (!protocol) return new UuidSlugError(INVALID_MASK, "Mask handle is invalid or incompatible.");
  return protocol.mix(input, output, direction);
}

function runCustom(
  transform: CustomUuidV7MaskOptions["mask"],
  input: Uint8Array,
): Uint8Array | UuidSlugError {
  // Callbacks never receive package or caller storage. Copy their result at the codec boundary too,
  // because a callback may retain and mutate the array it returns.
  const output = transform(input.slice());
  if (isUuidSlugError(output)) return output;
  if (!isUint8Array(output) || output.length !== 16)
    return new UuidSlugError(INVALID_MASK, "A custom mask transform must return exactly 16 bytes.");
  return output;
}

/**
 * Build an immutable mask from reversible 16-byte callbacks. Each callback receives isolated bytes,
 * so returning the same array is safe. Invalid results and thrown values return `UuidSlugError`.
 * The caller must ensure `unmask(mask(bytes))` restores every possible 16-byte input.
 *
 * @param options - Diagnostic label and mutually inverse 16-byte transforms.
 * @returns The validated mask, or `UuidSlugError` for an invalid contract or callback result.
 */
export function createCustomUuidV7Mask(
  options: CustomUuidV7MaskOptions,
): UuidV7Mask | UuidSlugError {
  try {
    const { label, mask, unmask } = options;
    if (typeof label !== "string" || typeof mask !== "function" || typeof unmask !== "function")
      return new UuidSlugError(
        INVALID_MASK,
        "A custom UUIDv7 mask requires a string label plus mask and unmask functions.",
      );
    // These probes reject common non-inverses cheaply; no finite sample can prove a bijection over
    // 128 bits, so the public contract keeps full invertibility as the callback author's duty.
    for (const probe of [
      new Uint8Array(16),
      Uint8Array.from({ length: 16 }, (_, index) => index * 17),
    ]) {
      const mixed = runCustom(mask, probe);
      if (isUuidSlugError(mixed))
        return new UuidSlugError(INVALID_MASK, CUSTOM_MASK_FAILURE_MESSAGE, {
          cause: mixed,
        });
      const restored = runCustom(unmask, mixed);
      if (isUuidSlugError(restored))
        return new UuidSlugError(INVALID_MASK, CUSTOM_MASK_FAILURE_MESSAGE, {
          cause: restored,
        });
      if (restored.some((byte, index) => byte !== probe[index]))
        return new UuidSlugError(
          INVALID_MASK,
          `UUIDv7 mask "${label}" does not unmask its own masked output.`,
        );
    }
    return createMaskHandle(label, (input, output, direction) => {
      const mixed = runCustom(direction === "mask" ? mask : unmask, input);
      if (isUuidSlugError(mixed)) return mixed;
      output.set(mixed);
      return undefined;
    });
  } catch (cause) {
    return new UuidSlugError(INVALID_MASK, CUSTOM_MASK_FAILURE_MESSAGE, {
      cause,
    });
  }
}
