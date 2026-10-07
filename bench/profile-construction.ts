// SPDX-License-Identifier: Apache-2.0

import type { ProfileCase } from "./profile-case";
import type { UuidV7MaskOptions, UuidV7MaskingCodec, UuidV7SentinelConfig } from "../src/types";

/** Keep construction costs separate from repeated identifier work. */
export function createConstructionProfileCases(
  api: typeof import("../src/index"),
  current: UuidV7MaskOptions,
  previous: UuidV7MaskOptions,
  constructionByteSeed: Uint8Array,
  codec: UuidV7MaskingCodec,
  sentinels: readonly UuidV7SentinelConfig[],
  sentinelDefinitions: readonly UuidV7SentinelConfig[],
): Record<string, ProfileCase> {
  return {
    "construct.generator.rollback": () =>
      api.createUuidV7Generator({
        clockRollback: { action: api.UUID_V7_ROLLBACK_PRESERVE },
      }),
    "construct.codec.retained-range": () =>
      api.createUuidV7MaskingCodec({
        mask: current,
        previousMasks: [{ mask: api.UUID_V7_TEST_MASK, timestampRangeStartUnixMs: 0 }],
      }),
    "construct.codec": () => api.createUuidV7MaskingCodec({ mask: current }),
    "construct.mask": () => api.deriveUuidV7Mask(current),
    "construct.mask.bytes": () =>
      api.deriveUuidV7Mask({ seed: new Uint8Array(16), keyDerivationIterations: 1 }),
    "construct.mask.bytes.reused": () =>
      api.deriveUuidV7Mask({ seed: constructionByteSeed, keyDerivationIterations: 1 }),
    "construct.mask.iterated": () =>
      api.deriveUuidV7Mask({ ...current, keyDerivationIterations: 8 }),
    "construct.codec.rotation": () =>
      api.createUuidV7MaskingCodec({
        mask: current,
        previousMasks: [previous, { seed: "profile-third-seed" }],
      }),
    "construct.codec.sentinels": () => api.createUuidV7MaskingCodec({ mask: current, sentinels }),
    "construct.codec.sentinels4": () =>
      api.createUuidV7MaskingCodec({ mask: current, sentinels: sentinelDefinitions.slice(0, 4) }),
    "construct.codec.sentinels8": () =>
      api.createUuidV7MaskingCodec({ mask: current, sentinels: sentinelDefinitions.slice(0, 8) }),
    "construct.codec.sentinels16": () =>
      api.createUuidV7MaskingCodec({ mask: current, sentinels: sentinelDefinitions.slice(0, 16) }),
    "construct.codec.sentinels64": () =>
      api.createUuidV7MaskingCodec({ mask: current, sentinels: sentinelDefinitions }),
    "construct.migration.current": () => codec.createUuidSlugMigrationDecoder(),
    "construct.migration.plain": () =>
      codec.createUuidSlugMigrationDecoder({ acceptPlainSlug: true }),
    "construct.migration.original": () =>
      codec.createUuidSlugMigrationDecoder({ acceptFixedMask: true }),
    "construct.migration.all": () =>
      codec.createUuidSlugMigrationDecoder({ acceptFixedMask: true, acceptPlainSlug: true }),
    "construct.custom": () =>
      api.createCustomUuidV7Mask({
        diagnosticLabel: "profile-identity",
        mask: (input) => input,
        unmask: (input) => input,
      }),
  };
}
