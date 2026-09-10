// SPDX-License-Identifier: Apache-2.0

import { UuidSlugError } from "./errors";
import type { CustomMaskSchemaOptions, MaskSchema } from "./types";

const MASK_SCHEMA_PROTOCOL = Symbol.for("@anizoptera/uuid-slug/mask-schema/1");

interface MaskSchemaProtocol {
  readonly version: 1;
  readonly mix: (input: Uint8Array, output: Uint8Array, forward: boolean) => void;
}

type MaskSchemaHandle = MaskSchema & { readonly [MASK_SCHEMA_PROTOCOL]: MaskSchemaProtocol };

/**
 * The versioned global symbol lets genuine handles cross duplicate same-version package copies.
 * The protocol is internal representation, not an authenticity boundary for trusted codec options.
 */
export function createSchemaHandle(id: string, mix: MaskSchemaProtocol["mix"]): MaskSchema {
  const schema = { id } as MaskSchemaHandle;
  Object.defineProperty(schema, MASK_SCHEMA_PROTOCOL, {
    value: Object.freeze<MaskSchemaProtocol>({ version: 1, mix }),
  });
  return Object.freeze(schema);
}

function schemaProtocol(schema: MaskSchema): MaskSchemaProtocol | undefined {
  if (typeof schema !== "object" || schema === null) return undefined;
  const protocol = (schema as Partial<MaskSchemaHandle>)[MASK_SCHEMA_PROTOCOL];
  return protocol?.version === 1 && typeof protocol.mix === "function" ? protocol : undefined;
}

export function isMaskSchema(schema: unknown): schema is MaskSchema {
  return schemaProtocol(schema as MaskSchema) !== undefined;
}

export function applyMaskSchema(
  schema: MaskSchema,
  input: Uint8Array,
  output: Uint8Array,
  forward: boolean,
): void {
  const protocol = schemaProtocol(schema);
  if (!protocol) throw new TypeError("Mask schema handle is invalid or incompatible.");
  protocol.mix(input, output, forward);
}

function runCustom(
  transform: CustomMaskSchemaOptions["forward"],
  input: Uint8Array,
  fill: number,
): Uint8Array {
  const output = new Uint8Array(16).fill(fill);
  transform(input.slice(), output);
  return output;
}

/**
 * Build an opaque handle for an arbitrary reversible 16-byte transform. Construction catches
 * common partial-write and inversion defects; callers still own invertibility over all inputs.
 * Every invocation receives distinct arrays, and the package retains neither callback buffer.
 */
export function createCustomMaskSchema(
  options: CustomMaskSchemaOptions,
): MaskSchema | UuidSlugError {
  try {
    const { id, forward, reverse } = options;
    if (typeof id !== "string" || typeof forward !== "function" || typeof reverse !== "function")
      return new UuidSlugError(
        "invalid_mask_schema",
        "A custom mask schema requires a string id plus forward and reverse functions.",
      );
    for (const probe of [
      new Uint8Array(16),
      Uint8Array.from({ length: 16 }, (_, index) => index * 17),
    ]) {
      const mixed = runCustom(forward, probe, 0x5a);
      const repeated = runCustom(forward, probe, 0xa5);
      if (mixed.some((byte, index) => byte !== repeated[index]))
        return new UuidSlugError(
          "invalid_mask_schema",
          `Mask schema "${id}" does not write its complete output.`,
        );
      const restored = runCustom(reverse, mixed, 0x5a);
      const restoredAgain = runCustom(reverse, mixed, 0xa5);
      if (
        restored.some((byte, index) => byte !== restoredAgain[index]) ||
        restored.some((byte, index) => byte !== probe[index])
      )
        return new UuidSlugError(
          "invalid_mask_schema",
          `Mask schema "${id}" does not reverse its own forward transform.`,
        );
    }
    return createSchemaHandle(id, (input, output, forwardDirection) =>
      (forwardDirection ? forward : reverse)(input, output),
    );
  } catch (cause) {
    return new UuidSlugError("invalid_mask_schema", "Custom mask schema construction failed.", {
      cause,
    });
  }
}
