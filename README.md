# @anizoptera/uuid-slug

[![npm version](https://img.shields.io/npm/v/@anizoptera/uuid-slug?label=npm)](https://www.npmjs.com/package/@anizoptera/uuid-slug)
[![CI](https://github.com/Anizoptera/uuid-slug/actions/workflows/check.yml/badge.svg?branch=main)](https://github.com/Anizoptera/uuid-slug/actions/workflows/check.yml)
[![Node >=20](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](package.json)
[![Bun checked](https://img.shields.io/badge/Bun-checked-000000?logo=bun&logoColor=white)](https://bun.sh/docs/cli/test)
[![Runtime deps](https://img.shields.io/badge/runtime_deps-0-2ea44f)](package.json)
[![License](https://img.shields.io/github/license/Anizoptera/uuid-slug)](LICENSE)

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

## Publishing

Release checks publish from a cleaned package artifact, not the source tree. The artifact check runs `publish-clean`, blocks private project files and benchmark dependencies, then runs package validators against the final cleaned npm tarball.

Use an explicit npm dist-tag:

```bash
pnpm run publish:clean
```

The project script publishes with `--access public --tag latest --provenance`.
`@anizoptera/publish-clean` is consumed from npm; regenerate `bun.lock` after
the first publish-clean release exists on the registry.
