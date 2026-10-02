// SPDX-License-Identifier: Apache-2.0

// Only the 26-character plain spelling is case-insensitive. Normalizing a base64url key would
// merge distinct UUIDs; exact hits and codecs without sentinels require no normalization.
export function findSentinel<Value>(
  sentinels: ReadonlyMap<string, Value>,
  slug: string,
): Value | undefined {
  return (
    sentinels.get(slug) ??
    (slug.length === 26 && sentinels.size !== 0 ? sentinels.get(slug.toLowerCase()) : undefined)
  );
}
