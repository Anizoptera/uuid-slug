// SPDX-License-Identifier: Apache-2.0

// Share defect outcomes so host and browser lanes cannot silently protect different work.
export const RESOURCE_REGRESSION_CASES = [
  ["", ""],
  ["owned-temporary", "default owned UUIDv4 bytes: buffers=2 exceeds 1"],
  ["duplicate-pair", "the pair must construct exactly its UUID and slug strings"],
  ["weak-map-state", "parsed UUID from text: weakWrites=1 exceeds 0"],
  ["masked-temporary", "masked string encode: buffers=1 exceeds 0"],
  ["native-revalidation", "default UUIDv4 text: chars=36 exceeds 0"],
] as const;
