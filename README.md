# @anizoptera/uuid-slug

Zero-dependency UUID v4/v7 generation, canonical parsing, 22-character base64url direct slugs, and configurable masked UUIDv7 slugs.

This package does not define a new identifier scheme. Direct slugs are the same 16 UUID bytes encoded as unpadded base64url. Masked slugs are reversible obfuscation for textual transmission; they are not encryption, authentication, bearer tokens, or secret material.

## Install

```bash
pnpm add @anizoptera/uuid-slug
```

## Usage

```ts
import { createUuidSlugCodec } from "@anizoptera/uuid-slug";

export const ids = createUuidSlugCodec({
  mask: { seed: "project-stable-obfuscation-seed" },
});

const publicId = ids.uuidV7MaskedSlug();
const uuid = ids.maskedSlugToUuidV7(publicId);
```

Create one codec per project policy and reuse it. Schema derivation and sentinel maps are precomputed at construction.

## Sentinels

Sentinels are precomputed per codec and always use direct raw UUID slugs so they stay recognizable in logs and textual transmission.

Default sentinels:

- `00000000-0000-7000-8000-000000000000` -> `AAAAAAAAcACAAAAAAAAAAA`
- `00000000-0001-7000-8000-000000000000` -> `AAAAAAABcACAAAAAAAAAAA`
- `00000000-0002-7000-8000-000000000000` -> `AAAAAAACcACAAAAAAAAAAA`

## Runtime

- Bun uses `Bun.randomUUIDv7` for v7 string, bytes, and direct slug paths.
- Node uses native `crypto.randomUUID` for v4 and native `crypto.randomUUIDv7` when present; otherwise it uses the package fallback v7 generator.
- Browser and Deno use Web Crypto for v4/random bytes and the fallback v7 generator.

Runtime dependencies are forbidden. Benchmark candidates are dev-only and excluded from the packed artifact.
