// Exercise every UUID version and variant nibble with independently stated RFC classifications.
export function* uuidVariants(uuid: string) {
  for (let version = 0; version < 16; version += 1) {
    for (let variant = 0; variant < 16; variant += 1) {
      yield {
        value:
          uuid.slice(0, 14) +
          version.toString(16) +
          uuid.slice(15, 19) +
          variant.toString(16) +
          uuid.slice(20),
        v4: version === 4 && variant >= 8 && variant < 12,
        v7: version === 7 && variant >= 8 && variant < 12,
      };
    }
  }
}
