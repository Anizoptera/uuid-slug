export interface Runtime {
  fillRandom(bytes: Uint8Array): void;
  uuidV4?(): string;
  uuidV7?(): string;
  uuidV7Bytes?(out?: Uint8Array, offset?: number): Uint8Array;
  uuidV7Slug?(): string;
}
