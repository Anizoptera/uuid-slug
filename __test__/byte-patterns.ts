// Exercise every byte value at multiple positions using the caller's actual backing storage.
export function* bytePatterns(backing: ArrayBufferLike) {
  const bytes = new Uint8Array(backing);
  for (let shift = 0; shift < 256; shift += 16) {
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i + shift) & 255;
    // Consumers must finish reading this view before advancing the iterator.
    yield { bytes, shift };
  }
}
