// Retained producer settings are data so native adapters do not initialize TypeScript codecs.
export const WIRE_FORMAT_MASKS = {
  "custom-mix": "custom-mix",
  default: null,
  "seeded-v2": { seed: "golden-vector-seed-v3" },
} as const;
