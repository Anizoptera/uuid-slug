# @anizoptera/uuid-slug

Short, URL-safe UUIDs. Turns a 36-character UUID into 22 characters, and optionally hides
the creation time that a UUIDv7 puts on display.

[![npm version](https://img.shields.io/npm/v/@anizoptera/uuid-slug?label=npm)](https://www.npmjs.com/package/@anizoptera/uuid-slug)
[![CI](https://github.com/Anizoptera/uuid-slug/actions/workflows/check.yml/badge.svg?branch=main)](https://github.com/Anizoptera/uuid-slug/actions/workflows/check.yml)
[![Node >=20](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](package.json)
[![Runtime deps](https://img.shields.io/badge/runtime_deps-0-2ea44f)](package.json)
[![License](https://img.shields.io/github/license/Anizoptera/uuid-slug)](LICENSE)

A UUID in a URL is 36 characters of hex and dashes. The same 16 bytes written as base64url
are 22 characters, and nothing is lost: it is the same identifier in a shorter alphabet.

UUIDv7 adds a second problem. It begins with a millisecond timestamp, which is exactly
what you want in a database index and rarely what you want in public. A v7 id tells anyone
who reads it when the record was created, and two of them tell them how fast you are
creating records. This package can shuffle those bytes on the way out, so the public string
gives none of that away, and shuffle them back when it comes in.

It defines no new identifier scheme. Everything here is a UUID underneath.

## Install

```bash
pnpm add @anizoptera/uuid-slug
```

## Quick start

```ts
import { createUuidSlugCodec } from "@anizoptera/uuid-slug";

// One codec per project. Reuse it: the seed is expanded once, at construction.
export const ids = createUuidSlugCodec({
  mask: { seed: process.env.ID_MASK_SEED ?? "project-stable-obfuscation-seed" },
});

const publicId = ids.uuidV7MaskedSlug();
// "CDBiXO8S_tf_43FriI8bmQ" — 22 characters, no timestamp anyone can read

const uuid = ids.maskedSlugToUuidV7(publicId);
if (uuid instanceof Error) return badRequest(uuid.message);
// "019ff19b-58b8-7000-9b1b-df713bd5562c", safe to use as a database key
```

Keep the seed stable forever. Change it and every slug you already handed out comes back as
`invalid_uuid_slug`, unless you list the old schema under `legacy.masks` (see below).

## Two kinds of slug

**Direct slug.** The 16 UUID bytes as unpadded base64url, 22 characters. Pure re-encoding:
`uuidToSlug` and `slugToUuid` are exact inverses, and anyone can convert either way. Use it
when you only want the identifier shorter.

**Masked slug.** The same 16 bytes, reordered and XORed with material derived from your
seed, then base64url-encoded. The constant version and variant bits of a UUIDv7 are
replaced by a small checksum, so the result has no fixed giveaway bits and a corrupted slug
is rejected instead of decoding into a plausible wrong UUID. Use it when the identifier is
public and you would rather not publish creation times. The exact steps are in
[how masking works](docs/design.md).

**Sentinels** are reserved UUIDs that skip masking on purpose, so they stay recognisable in
logs and support tickets. Three are defined by default, and they always encode to the same
fixed slugs:

| Name            | UUID                                   | Slug                     |
| --------------- | -------------------------------------- | ------------------------ |
| `nil`           | `00000000-0000-7000-8000-000000000000` | `AAAAAAAAcACAAAAAAAAAAA` |
| `anonymousUser` | `00000000-0001-7000-8000-000000000000` | `AAAAAAABcACAAAAAAAAAAA` |
| `unknownUser`   | `00000000-0002-7000-8000-000000000000` | `AAAAAAACcACAAAAAAAAAAA` |

Pass your own list as `sentinels` to replace them. Decoding checks sentinels first, so they
can never be misread as a masked slug.

## What masking is not

Masking is obfuscation, not encryption. The mask is a fixed byte shuffle plus a fixed XOR,
derived from your seed by a plain hash, not a key-derivation function. Anyone who sees a
few slugs whose UUIDs they already know can work out the mask and read the rest.

So: it stops a casual reader learning your creation times and record rates. It does not
make an id secret. Masked slugs are not tokens, not capabilities, and not a substitute for
an authorisation check.

The top-level exports (`uuidV7MaskedSlug`, `maskedSlugToUuid`, and friends) use a default
codec whose seed is a constant published in this package's source. Anyone holding the
package can decode those. They exist for tests, demos and direct slugs — **if you mask
anything real, build your own codec with your own seed.**

## Errors are returned, not thrown

One rule covers the whole API:

- **Give it input, get `Error | T` back.** Every parse, decode, format and convert function
  returns the error instead of throwing it. Check with `instanceof Error` before use.
- **Give it nothing, get the value.** The generators (`uuidV4`, `uuidV7`, `uuidV4Slug`,
  `uuidV7Slug`, `uuidV7MaskedSlug`) return the value directly and throw if the runtime has
  no usable randomness, which is not a condition you can handle locally anyway.

Errors are `UuidSlugError` with a `code` you can branch on: `invalid_base64url`,
`invalid_buffer`, `invalid_mask_schema`, `invalid_uuid`, `invalid_uuid_slug`,
`invalid_uuid_version`, `rng_unavailable`, `stale_uuid`.

TypeScript sees branded types (`UuidV7Slug`, `MaskedUuidV7Slug`, and so on). They document
which flavour a value is and survive narrowing; they are not enforced at runtime.

## API

Everything below is a method on a codec. Each is also a top-level export bound to the
default codec, under the same name, except the sentinel list, which is
`UUID_V7_SENTINELS`.

| Method                                                  | Returns               | What it does                              |
| ------------------------------------------------------- | --------------------- | ----------------------------------------- |
| `uuidV4()` / `uuidV7()`                                 | UUID string           | Generate.                                 |
| `uuidV4Bytes(out?, offset?)` / `uuidV7Bytes(...)`       | `Error \| Uint8Array` | Generate into a buffer you own.           |
| `uuidV4Slug()` / `uuidV7Slug()`                         | direct slug           | Generate and encode in one step.          |
| `uuidV7MaskedSlug()`                                    | masked slug           | Generate a v7 and mask it.                |
| `uuidToSlug(uuid)` / `slugToUuid(slug)`                 | `Error \| ...`        | Direct slug, both ways.                   |
| `uuidToMaskedSlug(uuid)` / `maskedSlugToUuid(slug)`     | `Error \| ...`        | Masked slug, both ways.                   |
| `uuidV7ToMaskedSlug(uuid)` / `maskedSlugToUuidV7(slug)` | `Error \| ...`        | Same, but refuse anything that is not v7. |
| `parseUuid` / `formatUuid`                              | `Error \| ...`        | UUID string to bytes and back.            |
| `parseUuidSlug` / `formatUuidSlug`                      | `Error \| ...`        | Slug to bytes and back.                   |
| `sentinels`                                             | array                 | The reserved values this codec knows.     |

`uuidV7ToMaskedSlug` returns an unmasked sentinel slug when the input is a sentinel, which
is the point of sentinels.

Also exported: type guards (`isUuidString`, `isUuidV4String`, `isUuidV7String`,
`isUuidSlug`, `isUuidV4Slug`, `isUuidV7Slug`), base64url helpers (`encodeBase64Url`,
`decodeBase64Url`, `isBase64Url`), `extractUuidV7Timestamp`, and the schema builders
`createMaskSchema` / `defineMaskSchema`.

### Codec options

```ts
createUuidSlugCodec({
  mask: { seed: "…", tagBits: 6 }, // or a schema built with defineMaskSchema
  sentinels: [{ name: "nil", uuid: "…" }],
  legacy: { masks: [oldSchema], directDecode: false },
  generator: myUuidV7Generator,
});
```

`tagBits` is how many bits of checksum go into the freed version and variant bits: 6 by
default, or 4 to match a schema that already issued slugs with the narrower tag. More bits means a
corrupt slug is more reliably rejected.

`legacy.masks` is how you rotate a seed. Decoding tries the current schema first, then each
old one in order, so slugs issued under a previous seed keep working. `directDecode: true`
additionally accepts unmasked direct slugs, for migrating off unmasked ids.

### Rejecting stale ids

```ts
import { validateUuidV7Fresh } from "@anizoptera/uuid-slug";

const ok = validateUuidV7Fresh(uuid, { windowMs: 60_000 });
```

Returns an error when the v7 timestamp sits outside the window (24 hours by default) or the
random half is degenerate. `validateUuidV7SlugFresh` and `validateMaskedUuidV7SlugFresh` do
the same starting from a slug. Useful for one-shot ids like a signup link; it is a sanity
check on the id itself, not authentication.

## Guarantees

What this package promises, and — just as importantly — what it does not. Each line is measured
across every supported runtime by `bun run bench:matrix`; the current figures are in
[`bench/RESULTS.md`](bench/RESULTS.md).

- **Conformance.** Every generated id is a valid RFC 9562 UUID: correct version and variant bits.
- **Randomness.** All random bits come from a cryptographic source — `crypto.getRandomValues` or
  `node:crypto`, never `Math.random`, on any code path. Values do not repeat.
- **Time ordering, to the millisecond.** A v7 carries a 48-bit millisecond timestamp in its
  leading bits, so ids created in _different_ milliseconds sort by creation time. This is what
  makes it a good database key.
- **NOT ordered within a millisecond.** Two ids created in the same millisecond may sort in
  either order. RFC 9562 §6.2 leaves this to the implementation and runtimes genuinely differ —
  measured, a platform generator may re-randomise every random bit per call, giving roughly a coin
  flip. Do not use a v7 to recover the order of events inside a millisecond; use a sequence column.
- **NOT lexicographically sortable as a slug.** The 22-character base64url form is the same 16
  bytes in a shorter alphabet, and the value round-trips exactly — but base64url's alphabet is not
  in ASCII order, so comparing slugs as _strings_ does not track time. Sort by the UUID, or by a
  timestamp column. A masked slug is deliberately unordered by design.
- **One type for bytes.** `uuidV4Bytes` and `uuidV7Bytes` return a plain `Uint8Array` on every
  runtime, never a platform-specific subclass whose `toString` or JSON shape differs.

## Runtime

No runtime dependencies, on any platform.

- **Bun** uses `Bun.randomUUIDv7`.
- **Node** uses native `crypto.randomUUID`, and native `crypto.randomUUIDv7` where the
  version provides it, otherwise the bundled v7 generator.
- **Browsers and Deno** use Web Crypto for randomness plus the bundled v7 generator.

## License

Apache-2.0. Copyright 2026 Anizoptera and Art Shendrik.
