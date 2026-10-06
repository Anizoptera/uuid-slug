// SPDX-License-Identifier: Apache-2.0

// Share defect outcomes so host and browser lanes cannot silently protect different work.
export const RESOURCE_REGRESSION_CASES = [
  ["", ""],
  ["owned-temporary", "default owned UUIDv4 bytes: buffers=2 exceeds 1"],
  ["v4-slug-temporary", "default UUIDv4 slug: buffers=1 exceeds 0"],
  ["v4-base32-temporary", "base32 UUIDv4 slug: buffers=1 exceeds 0"],
  ["v7-base32-temporary", "base32 UUIDv7 slug: buffers=1 exceeds 0"],
  ["slug-parse-temporary", "parsed UUID from plain slug: buffers=2 exceeds 1"],
  ["plain-text-temporary", "plain slug to UUID text: buffers=1 exceeds 0"],
  ["duplicate-pair", "the pair must construct exactly its UUID and slug strings"],
  ["weak-map-state", "parsed UUID from text: weakWrites=1 exceeds 0"],
  ["masked-temporary", "masked string encode: buffers=1 exceeds 0"],
  ["masked-slug-temporary", "default masked UUIDv7 slug: buffers=2 exceeds 1"],
  ["masked-pair-temporary", "default masked UUIDv7 pair: buffers=2 exceeds 1"],
  ["codec-value-temporary", "codec UUIDv7 value: buffers=2 exceeds 1"],
  ["root-value-temporary", "root UUIDv7 value: buffers=2 exceeds 1"],
  ["native-revalidation", "default UUIDv4 text: chars=36 exceeds 0"],
] as const;
