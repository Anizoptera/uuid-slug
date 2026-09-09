# TypeScript packaged API

This generated baseline records the consumer-visible declarations and manifest conditions.

## Manifest

```json
{
  "engines": {
    "node": ">=20"
  },
  "exports": {
    ".": {
      "browser": "./dist/index.js",
      "bun": "./src/index.ts",
      "default": "./dist/index.js",
      "deno": "./dist/index.js",
      "node": "./dist/node/index.js",
      "types": "./dist/index.d.ts"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "src",
    "README.md",
    "LICENSE"
  ],
  "imports": {
    "#runtime": {
      "browser": "./src/runtime/web.ts",
      "bun": "./src/runtime/bun.ts",
      "default": "./src/runtime/web.ts",
      "deno": "./src/runtime/web.ts",
      "node": "./src/runtime/node.ts"
    }
  },
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "name": "@anizoptera/uuid-slug",
  "sideEffects": false,
  "type": "module",
  "types": "./dist/index.d.ts"
}
```

## Reachable declarations

```ts
declare interface Alphabet {
    readonly bitsPerChar: number;
    readonly chars: string;
    readonly code: UuidSlugErrorCode;
    readonly decode: Int16Array;
    readonly name: string;
    readonly invalidChars: RegExp;
}
export declare interface AsyncMaskSchemaOptions extends MaskSchemaOptions {
    readonly signal?: AbortSignal;
}
export declare type Base64UrlString = Brand<string, "Base64UrlString">;
declare type Brand<T, Name extends string> = T & {
    readonly [brand]?: {
        [K in Name]: true;
    };
};
declare const brand: unique symbol;
export declare function createMaskSchema(options: MaskSchemaOptions): UuidSlugError | MaskSchema;
export declare function createMaskSchemaAsync(options: AsyncMaskSchemaOptions): Promise<MaskSchema | UuidSlugError>;
export declare function createUuidSlugCodec(): UuidSlugCodec;
export declare function createUuidSlugCodec(options: UuidSlugCodecOptions): UuidSlugError | UuidSlugCodec;
export declare function createUuidV7Generator(options: UuidV7GeneratorOptions): UuidV7Generator;
export declare function decodeBase64Url(value: string, out?: Uint8Array, offset?: number): UuidSlugError | Uint8Array;
export declare const DEFAULT_MASK_SCHEMA: MaskSchema;
export declare const defaultCodec: UuidSlugCodec;
export declare function encodeBase64Url(bytes: Uint8Array): Base64UrlString | UuidSlugError;
declare const ERROR_CODES: readonly [
    "aborted",
    "invalid_base32",
    "invalid_base64url",
    "invalid_buffer",
    "invalid_mask_schema",
    "invalid_timestamp",
    "invalid_uuid",
    "invalid_uuid_slug",
    "invalid_uuid_version",
    "rng_unavailable",
    "stale_uuid"
];
export declare function extractUuidV7Timestamp(bytes: Uint8Array, offset?: number): UuidSlugError | number;
export declare function formatUuid(bytes: Uint8Array, offset?: number): UuidSlugError | UuidString;
export declare function formatUuidSlug(bytes: Uint8Array, offset?: number, alphabet?: SlugAlphabet): UuidSlugError | UuidSlug;
export declare interface FreshValidationOptions {
    now?: () => number;
    windowMs?: number;
}
export declare function hasUuidV7Entropy(bytes: Uint8Array, offset?: number): boolean;
export declare function isBase64Url(value: null | string | undefined): value is Base64UrlString;
export declare function isUuidSlug(slug: null | string | undefined): slug is UuidSlug;
export declare function isUuidString(uuid: null | string | undefined): uuid is UuidString;
export declare function isUuidV4Slug(slug: null | string | undefined): slug is UuidV4Slug;
export declare function isUuidV4String(uuid: null | string | undefined): uuid is UuidV4String;
export declare function isUuidV7Bytes(bytes: Uint8Array): boolean;
export declare function isUuidV7Slug(slug: null | string | undefined): slug is UuidV7Slug;
export declare function isUuidV7String(uuid: null | string | undefined): uuid is UuidV7String;
export declare type MaskedUuidSlug = Brand<UuidSlug, "MaskedUuidSlug">;
export declare type MaskedUuidV7Slug = Brand<MaskedUuidSlug, "MaskedUuidV7Slug">;
export declare interface MaskSchema {
    readonly id: string;
    mix(input: Uint8Array, output: Uint8Array, forward: boolean): void;
}
export declare interface MaskSchemaOptions {
    readonly id?: string;
    readonly seed: string | Uint8Array;
    readonly keyIterations?: number;
}
export declare type MigrationFormat = "current" | "original" | "plain";
export declare function parseUuid(uuid: string, out?: Uint8Array, offset?: number): UuidSlugError | Uint8Array;
export declare function parseUuidSlug(slug: string, out?: Uint8Array, offset?: number): UuidSlugError | Uint8Array;
export declare type PublicUuidV7Slug = MaskedUuidV7Slug | SentinelUuidV7Slug;
export declare type SentinelUuidV7Slug = Brand<UuidV7Slug, "SentinelUuidV7Slug">;
declare const SLUG_ALPHABETS: {
    base32hex: Alphabet;
    base64url: Alphabet;
};
export declare type SlugAlphabet = keyof typeof SLUG_ALPHABETS;
export declare function slugToUuid(slug: string): UuidSlugError | UuidString;
export declare const UUID_SLUG_ERROR_CODES: typeof ERROR_CODES;
export declare const UUID_V7_SENTINEL_DEFINITIONS: readonly UuidV7SentinelDefinition[];
export declare type UuidBytes = Brand<Uint8Array, "UuidBytes">;
export declare class UuidRuntimeError extends UuidSlugError {
    constructor(message: string, options?: ErrorOptions);
}
export declare type UuidSlug = Brand<string, "UuidSlug">;
export declare interface UuidSlugCodec extends UuidV7Generator {
    readonly sentinels: readonly UuidV7Sentinel[];
    migration(this: void, options?: UuidSlugMigrationOptions): UuidSlugMigration;
    uuidV4(this: void): UuidSlugError | UuidV4String;
    uuidV4Bytes(this: void, out?: Uint8Array, offset?: number): UuidSlugError | Uint8Array;
    uuidV4Slug(this: void): UuidSlugError | UuidV4Slug;
    uuidV7Slug(this: void): UuidSlugError | UuidV7Slug;
    uuidV7MaskedSlug(this: void): UuidSlugError | PublicUuidV7Slug;
    uuidV7ToMaskedSlug(this: void, uuid: string): UuidSlugError | PublicUuidV7Slug;
    maskedSlugToUuidV7(this: void, slug: string): UuidSlugError | UuidV7String;
    maskedSlugToUuid(this: void, slug: string): UuidSlugError | UuidString;
    validateMaskedSlugFresh<S extends string>(this: void, slug: S, freshness?: FreshValidationOptions): UuidSlugError | S;
}
export declare interface UuidSlugCodecOptions {
    readonly generator?: UuidV7Generator;
    readonly acceptUnmaskedSlugs?: boolean;
    readonly previousMasks?: readonly (MaskSchema | MaskSchemaOptions)[];
    readonly mask?: MaskSchema | MaskSchemaOptions;
    readonly sentinels?: readonly UuidV7SentinelDefinition[];
    readonly slugAlphabet?: SlugAlphabet;
    readonly maskedSlugAlphabet?: SlugAlphabet;
}
export declare class UuidSlugError extends Error {
    readonly code: UuidSlugErrorCode;
    constructor(code: UuidSlugErrorCode, message: string, options?: ErrorOptions);
}
export declare type UuidSlugErrorCode = (typeof UUID_SLUG_ERROR_CODES)[number];
export declare interface UuidSlugMigration {
    decode(this: void, slug: string, format?: MigrationFormat): UuidSlugError | UuidString;
    candidates(this: void, slug: string, format?: MigrationFormat): UuidSlugError | UuidString[];
}
export declare interface UuidSlugMigrationOptions {
    readonly original?: boolean;
    readonly plain?: boolean;
}
export declare type UuidString = Brand<string, "UuidString">;
export declare function uuidToSlug(uuid: string, alphabet?: SlugAlphabet): UuidSlugError | UuidSlug;
export declare function uuidV4(): UuidSlugError | UuidV4String;
export declare function uuidV4Bytes(out?: Uint8Array, offset?: number): UuidSlugError | Uint8Array;
export declare type UuidV4Slug = Brand<UuidSlug, "UuidV4Slug">;
export declare function uuidV4Slug(alphabet?: SlugAlphabet): UuidSlugError | UuidV4Slug;
export declare type UuidV4String = Brand<UuidString, "UuidV4String">;
export declare const uuidV7: () => UuidSlugError | UuidV7String;
export declare const uuidV7At: (timestamp: number) => UuidSlugError | UuidV7String;
export declare const uuidV7Bytes: (out?: Uint8Array, offset?: number) => UuidSlugError | Uint8Array;
export declare const uuidV7BytesAt: (timestamp: number, out?: Uint8Array, offset?: number) => UuidSlugError | Uint8Array;
export declare interface UuidV7Generator {
    uuidV7(this: void): UuidSlugError | UuidV7String;
    uuidV7Bytes(this: void, out?: Uint8Array, offset?: number): UuidSlugError | Uint8Array;
    uuidV7At(this: void, timestamp: number): UuidSlugError | UuidV7String;
    uuidV7BytesAt(this: void, timestamp: number, out?: Uint8Array, offset?: number): UuidSlugError | Uint8Array;
}
export declare interface UuidV7GeneratorOptions {
    readonly clock?: () => number;
    readonly fillRandom: (bytes: Uint8Array<ArrayBuffer>) => void;
}
export declare interface UuidV7Sentinel {
    readonly name: string;
    readonly slug: SentinelUuidV7Slug;
    readonly uuid: UuidV7String;
}
export declare interface UuidV7SentinelDefinition {
    readonly name: string;
    readonly uuid: UuidV7String;
}
export declare type UuidV7Slug = Brand<UuidSlug, "UuidV7Slug">;
export declare function uuidV7Slug(alphabet?: SlugAlphabet): UuidSlugError | UuidV7Slug;
export declare type UuidV7String = Brand<UuidString, "UuidV7String">;
export declare function validateUuidV7Fresh(uuid: string, options?: FreshValidationOptions): UuidSlugError | UuidV7String;
export declare function validateUuidV7SlugFresh(slug: string, options?: FreshValidationOptions): UuidSlugError | UuidV7Slug;
export {};
```

## Deprecations

(none)
