export interface Runtime {
  /**
   * The buffer is pinned to a plain `ArrayBuffer` because Web Crypto's `getRandomValues`
   * rejects a `SharedArrayBuffer` view at runtime, and the unparameterised `Uint8Array`
   * admits one. Narrowing here makes that refusal unrepresentable instead of a throw.
   */
  fillRandom(bytes: Uint8Array<ArrayBuffer>): void;
  uuidV4?(): string;
  uuidV7?(): string;
  uuidV7Bytes?(out?: Uint8Array, offset?: number): Uint8Array;
  uuidV7Slug?(): string;
}
