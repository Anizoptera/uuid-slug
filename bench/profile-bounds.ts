// SPDX-License-Identifier: Apache-2.0

type BoundsApi = Pick<
  typeof import("../src/index"),
  "uuidV7StringBounds" | "uuidV7ByteBounds" | "UUID_TEXT_UPPERCASE"
>;

function readTextBounds(bounds: ReturnType<BoundsApi["uuidV7StringBounds"]>, index: number) {
  if (bounds instanceof Error) return bounds;
  // An object-only sink can leave endpoint formatting unobserved. Read changing positions in
  // both strings as a caller does before ranking string construction or flattening costs.
  const position = index % 36;
  return bounds.startInclusive.charCodeAt(position) + bounds.endInclusive.charCodeAt(position);
}

/** Keep bounds workloads together so comparisons cover each text form and interval call. */
export function createBoundsProfileCases(api: BoundsApi, instant: number) {
  return {
    "v7.bounds.text": (index: number) =>
      readTextBounds(api.uuidV7StringBounds(instant + index), index),
    "v7.bounds.text.uppercase": (index: number) =>
      readTextBounds(api.uuidV7StringBounds(instant + index, api.UUID_TEXT_UPPERCASE), index),
    "v7.bounds.text.interval": (index: number) =>
      readTextBounds(api.uuidV7StringBounds(instant, instant + index), index),
    "v7.bounds.bytes": (index: number) => {
      const bounds = api.uuidV7ByteBounds(instant, instant + index);
      if (bounds instanceof Error) return bounds;
      return (bounds.startInclusive[index & 15] ?? 0) + (bounds.endInclusive[index & 15] ?? 0);
    },
  };
}
