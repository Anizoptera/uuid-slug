# @anizoptera/uuid-slug

Use shorter UUIDs in URLs, with optional masking of UUIDv7 timestamps.

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
creating records. Masking removes that directly readable structure from public identifiers,
then recovers the UUID for a lookup. It is obfuscation, not an authorization boundary.

It defines no new identifier scheme. Everything here is a UUID underneath.

## Install

```bash
pnpm add @anizoptera/uuid-slug
```

Requires TypeScript 5.7 or newer for `Uint8Array<ArrayBuffer>` declarations.
Custom `fillRandom` callbacks receive an ordinary `ArrayBuffer` view, which Web Crypto accepts.

## Quick start

```ts
import { createUuidSlugCodec } from "@anizoptera/uuid-slug";

const seed = process.env.ID_MASK_SEED;
if (!seed) throw new Error("Set ID_MASK_SEED to a stable, randomly generated secret.");

// Reuse the codec: the seed is expanded once, at construction.
export const ids = createUuidSlugCodec({ mask: { seed } });

const publicId = ids.uuidV7MaskedSlug();
const uuid = ids.maskedSlugToUuidV7(publicId);
if (uuid instanceof Error) throw uuid;
// Look up uuid in your store and apply the caller's authorization policy.
```

**Generate the seed; do not think one up.** For example, run `openssl rand -base64 32` and
store the result outside your source repository. Seeds shorter than 16 bytes are rejected, but
length alone does not make a seed unpredictable: a known UUID/slug pair allows offline guesses.

Keep the seed and `keyIterations` stable for as long as issued slugs must remain readable.
Changing either derives different keys; retain the old settings in `previousMasks` during
rotation. `keyIterations` defaults to `1`; increasing it adds construction and guessing cost,
but does not turn a human-chosen seed into a suitable secret.

## Two kinds of slug

**Direct slug.** The 16 UUID bytes as unpadded base64url, 22 characters. Pure re-encoding:
`uuidToSlug` and `slugToUuid` preserve the UUID value, and anyone can convert either way. Use it
when you only want the identifier shorter.

Pass `"base32hex"` to get 26 characters instead, and gain one thing: **base32hex slugs of UUIDv7s
sort by creation time as plain strings.** A v7 starts with its timestamp, and base32hex writes
its digits in the same order as their values, so comparing two slugs compares two instants. That
makes them usable directly as an ordered database key. base64url cannot do it — its alphabet runs
`A-Za-z0-9-_`, so `0` stands for a larger value than `A` but sorts before it.

base32hex is also the safer of the two for a **filename**: it is lowercase throughout, so it
survives a case-insensitive filesystem unchanged, and a directory listing comes back in creation
order for free. `uuidV7Slug("base32hex")` generates one directly; the alphabet is an argument on
every keyless entry point that produces a slug, so nothing about choosing it requires a codec.

You never say which alphabet you are reading. The two lengths are different, 22 and 26, so
`slugToUuid` works out the encoding from the slug itself — which means switching alphabet leaves
every slug you have already handed out working.

**Masked slug.** A UUIDv7 payload and check passed through a small block cipher keyed by your
seed, then base64url-encoded. Also 22 characters. Use it when the identifier is public and you
would rather not publish creation times. The exact steps are in
[how masking works](https://github.com/Anizoptera/uuid-slug/blob/main/docs/design.md).

A supported UUIDv7 carries 116 bits that the masked format must preserve — the version and
variant are fixed, and the top six bits of the timestamp stay zero until the year 2109. 22 base64url characters hold 132
bits, so the spare 16 carry a check for incorrect decoding. Two things follow, and both are
part of the contract rather than implementation detail:

- **A decoded slug is a candidate, not a proof.** Roughly one random 22-character string in
  65,536 passes the check and decodes to a well-formed, possibly unissued UUID. Look the result
  up in your own store; a wrong candidate is then a miss rather than a wrong answer. Every extra
  distinct schema you try adds another opportunity for false acceptance; the combined rate is
  at most the sum of the individual rates. Keep the rotation list short.
- **Masking refuses a timestamp at or past 2^42 ms** — the year 2109 — with `invalid_timestamp`,
  because those six bits are spent on the check. Truncating instead would let two UUIDs share one
  slug, which nothing could recover from. Direct slugs have no such limit.

**Sentinels** are reserved UUIDs that skip masking on purpose, so they stay recognisable in
logs and support tickets. The defaults always encode to these fixed slugs:

| Name            | UUID                                   | Slug                     |
| --------------- | -------------------------------------- | ------------------------ |
| `nil`           | `00000000-0000-7000-8000-000000000000` | `AAAAAAAAcACAAAAAAAAAAA` |
| `anonymousUser` | `00000000-0001-7000-8000-000000000000` | `AAAAAAABcACAAAAAAAAAAA` |
| `unknownUser`   | `00000000-0002-7000-8000-000000000000` | `AAAAAAACcACAAAAAAAAAAA` |

Read the names, UUIDs and slugs from `codec.sentinels`. Pass your own list as `sentinels` to replace the defaults:

```ts
const ids = createUuidSlugCodec({
  mask: { seed },
  sentinels: [{ name: "unknownUser", uuid: "00000000-0002-7000-8000-000000000000" }],
});
console.table(ids.sentinels);
```

Keep sentinel definitions stable while their slugs are in use. Decoding checks sentinels first, so they
are reserved even if a mask could produce the same text. Encoding rejects a non-sentinel UUID
whose masked output collides with a reserved slug, using `invalid_mask_schema`; it never returns
a slug that would decode to the wrong sentinel.

## What masking is not

Masking uses a four-round Feistel network with HalfSipHash-2-4 round functions and a
seed-derived key schedule. It removes a directly readable timestamp; this package does not
establish a confidentiality strength for that construction or resistance to known-pair attacks.
A reference-vector test for the round function does not establish those properties for the
whole construction. See [the mechanism and its limits](docs/design.md).

Masked slugs are not authentication tokens or capabilities. The check detects many incorrect
decodes; it is not a message authentication code. Confirm decoded candidates against your store
and enforce authorization separately. Supplying a custom `mix` still leaves the same short check
and does not turn the API into an authenticated-token system.

**Supply your own secret seed for real identifiers.** Omitting `mask` uses the published default
seed, so anyone can decode the result. Reserve that default for tests and demos.
Masked operations are codec methods; `defaultCodec` uses the same public seed.

## Handling errors

Parsing, decoding, formatting, conversion, byte generation, and explicit-timestamp generation
return `UuidSlugError | T`. Check `instanceof Error` before using the value. String-only
generators return a value directly and throw on failure; constructing an invalid codec throws too.

Use the error's `code` for handling and its `message` for diagnostics. `UuidSlugErrorCode` and
`UUID_SLUG_ERROR_CODES` are the exported type and runtime list of codes. Errors wrapping failed
entropy draws, clock readings, and custom `mix` calls preserve the original exception as `cause`.

## Types

Branded types distinguish the values returned by this library. Their marker is optional:
assigning a string does not validate it. Use guards to check format and your store to check issuance.

- Strings: `UuidString`, `UuidV4String`, `UuidV7String`, `Base64UrlString`.
- Slugs: `UuidSlug` (either alphabet), `UuidV4Slug`, `UuidV7Slug`; masked ones are base64url only
  — `MaskedUuidSlug`, `MaskedUuidV7Slug`, `SentinelUuidV7Slug`, and `PublicUuidV7Slug` for
  "masked or sentinel", which is what a masking call returns. `SlugAlphabet` names the two
  alphabets, and `UuidBytes` brands 16 raw bytes — for annotating storage of your own, which is why
  it appears in no signature here: a byte writer returns the caller's output array, which can be
  longer than the UUID range it writes.
- Shapes: `UuidSlugCodec` and `UuidSlugCodecOptions`, `MaskSchema`, `MaskSchemaOptions` and `AsyncMaskSchemaOptions`,
  `UuidV7Sentinel` and `UuidV7SentinelDefinition`, `UuidV7Generator` and
  `UuidV7GeneratorOptions`, `FreshValidationOptions`, `UuidSlugErrorCode`.

**Some masked slugs also pass direct-slug guards.** Canonical trailing bits, version, and variant
can all match by chance. A guard answers "is this well formed", never "is this mine". Decode with
the matching API and look up the candidate; a brand or guard cannot establish issuance.

## API

The **Where** column tells you whether to import a function or call a codec method.

- **codec + top level.** Keyless generation is available directly, for example `import { uuidV7 }`.
  A codec can use your supplied v7 generator; top-level generation uses the platform adapter.
- **codec only.** Uses your configured keys or sentinels.
- **module only.** Import these functions directly. Codec settings do not affect them.

| Method                                                  | Where             | Returns                       | What it does                             |
| ------------------------------------------------------- | ----------------- | ----------------------------- | ---------------------------------------- |
| `uuidV4()` / `uuidV7()`                                 | codec + top level | UUID string                   | Generate.                                |
| `uuidV4Bytes(out?, offset?)` / `uuidV7Bytes(...)`       | codec + top level | `UuidSlugError \| Uint8Array` | Generate into a buffer you own.          |
| `uuidV7At(ms)` / `uuidV7BytesAt(ms, out?, offset?)`     | codec + top level | `UuidSlugError \| ...`        | Generate at an instant you name.         |
| `uuidV4Slug(alphabet?)` / `uuidV7Slug(alphabet?)`       | top level         | direct slug                   | Generate and encode in one step.         |
| `codec.uuidV4Slug()` / `codec.uuidV7Slug()`             | codec             | direct slug                   | Same, in the codec's `slugAlphabet`.     |
| `uuidV7MaskedSlug()`                                    | codec only        | `PublicUuidV7Slug`             | Generate a masked or sentinel slug.       |
| `uuidV7ToMaskedSlug(uuid)` / `maskedSlugToUuidV7(slug)` | codec only        | `UuidSlugError \| ...`        | Masked slug, both ways; v7 only.         |
| `maskedSlugToUuid(slug)`                                | codec only        | `UuidSlugError \| ...`        | Unmask, accepting any UUID version.      |
| `validateMaskedSlugFresh(slug, opts?)`                  | codec only        | `UuidSlugError \| ...`        | Unmask, then check the freshness window. |
| `sentinels`                                             | codec only        | array                         | The reserved values this codec knows.    |
| `uuidToSlug(uuid, alphabet?)` / `slugToUuid(slug)`      | module only       | `UuidSlugError \| ...`        | Direct slug, both ways.                  |
| `parseUuid` / `formatUuid`                              | module only       | `UuidSlugError \| ...`        | UUID string to bytes and back.           |
| `parseUuidSlug` / `formatUuidSlug`                      | module only       | `UuidSlugError \| ...`        | Slug to bytes and back.                  |

There is no `uuidToMaskedSlug`: masking is defined for UUIDv7 only, because a v7 is the version
that leaks a creation time and 22 characters have no room for a version tag as well as the check.

The `At` pair supports backfilling with a known timestamp. It takes the instant first and returns
an error unless it is a whole number of Unix milliseconds in 0..2^48-1. Its interaction with
current-time generation is runtime-specific; within-millisecond ordering is not promised.

Both masking entry points return a raw sentinel slug when the UUID is registered as a sentinel.
Their result type is `PublicUuidV7Slug`, the union of masked and sentinel slugs.

Also exported, all module-level:

- Type guards: `isUuidString`, `isUuidV4String`, `isUuidV7String`, `isUuidSlug`, `isUuidV4Slug`,
  `isUuidV7Slug`, and `isUuidV7Bytes` for 16 bytes you already hold.
- base64url helpers: `encodeBase64Url`, `decodeBase64Url`, `isBase64Url`. `decodeBase64Url` returns
  a view over exactly the bytes it decoded — with or without an `out` buffer — so `.length` is the
  decoded length, never the buffer's. Given `out`, that view shares your buffer's memory.
- `extractUuidV7Timestamp` — the instant a v7 was minted at, and an error for anything that is
  not a v7, because a v4's first six bytes are random and would otherwise read back as a
  plausible date. `hasUuidV7Entropy` answers whether the 74 random bits are anything but
  all-zero or all-one. This rejects obvious degeneracy; it does not measure unpredictability.
- `createMaskSchema` builds a schema from a seed; `createMaskSchemaAsync` adds cooperative cancellation; `DEFAULT_MASK_SCHEMA` is the one a codec uses
  when you pass no `mask`, exported so `mask: DEFAULT_MASK_SCHEMA` can be a visible choice rather
  than an omission. `UUID_V7_SENTINEL_DEFINITIONS` is the default sentinel list.
- `createUuidV7Generator(options)` builds a generator from your own `clock` and `fillRandom`, for
  a `generator:` codec option. Its options type is `UuidV7GeneratorOptions`.
- `UuidSlugError` and its subclass `UuidRuntimeError`, which is what the generators throw when the
  runtime has no usable randomness. `UuidSlugErrorCode` types the `code` property.

### Codec options

```ts
createUuidSlugCodec({
  mask: { seed: "…", keyIterations: 1 }, // or your own { id, mix } schema
  sentinels: [{ name: "nil", uuid: "…" }],
  previousMasks: [{ seed: "…previous seed…" }],
  acceptUnmaskedSlugs: false,
  slugAlphabet: "base32hex", // plain slugs only; masked slugs and sentinels stay base64url
  generator: myUuidV7Generator,
});
```

The current masked format is fixed: 22 base64url characters, including a 16-bit check.
Changing `slugAlphabet` affects plain slugs only.

To supply a different mixing implementation, pass a `MaskSchema`: an `id` and
`mix(input, output, forward)`, where `forward: false` must reverse `forward: true` for every
16-byte input. Construction runs round-trip smoke tests and throws if they fail. Passing them
is not a proof of invertibility; the caller remains responsible for the complete domain.

`createMaskSchema({ seed, keyIterations })` returns an error for invalid seed options.
`createUuidSlugCodec` throws for invalid options, including a supplied schema that fails its
smoke tests. Build a seed schema first when you want to inspect its returned error.

For expensive derivation, await `createMaskSchemaAsync` and pass the completed schema to the codec:

```ts
import { createMaskSchemaAsync, createUuidSlugCodec } from "@anizoptera/uuid-slug";

const controller = new AbortController();
const schema = await createMaskSchemaAsync({
  seed, // the same stored secret used by the synchronous constructor
  keyIterations, // preserve the setting used for issued slugs
  signal: controller.signal, // optional; call controller.abort(reason) to stop
});
if (schema instanceof Error) throw schema;
const codec = createUuidSlugCodec({ mask: schema });
```

The async form derives the same keys and accepts the same seed settings. It splits encoding,
packing and hashing into cooperative work slices, allowing host tasks to run during long
construction. Cancellation stops derivation and returns `UuidSlugError` with code `aborted` and
`signal.reason` as its cause. Invalid options return `invalid_mask_schema`; unexpected construction
failures retain their cause. No partially derived schema is returned.

Options are captured when called. Byte seeds are copied before the first suspension, so later
caller mutation cannot change the key; synchronize concurrent writes to shared backing memory.
The initial copy of a very large byte seed, allocation, GC and host scheduling can exceed the
responsiveness target. Small derivations need no host yield. Construct once and reuse the schema;
passing seed options to each new codec would repeat derivation.

`previousMasks` is how you rotate a seed. Decoding tries `mask` first, then each entry in the
order you list them, and the first whose check passes wins — so put the newest first, and keep
the list short. Nothing else is ever tried: a codec decodes with the schemas you gave it and no
others.

### Rejecting stale ids

```ts
import { validateUuidV7Fresh } from "@anizoptera/uuid-slug";

const ok = validateUuidV7Fresh(uuid, { windowMs: 60_000 });
```

The timestamp must be inside the inclusive interval `now() - windowMs` through
`now() + windowMs`; the default radius is 24 hours. `windowMs` must be finite and nonnegative;
zero and finite fractions are valid. `now` defaults to `Date.now`, must return finite Unix
milliseconds, and is read once per validation. Invalid settings return an error instead of
disabling the check. Degenerate all-zero or all-one random bits are also rejected.

`validateUuidV7SlugFresh` starts from a plain slug; `codec.validateMaskedSlugFresh` starts from
a slug decoded with that codec. This is a symmetric timestamp sanity check, not past-only expiry,
authentication, or replay prevention. Use ordinary decoding for permanent identifiers. For links
with expiration or one-time use, check the stored expiry and consumption state as well.

## Guarantees

These are API contracts. Runtime measurements and their exercised conditions belong in
[`bench/README.md`](bench/README.md); a benchmark pass is not proof of every guarantee.

- **Conformance.** Generated ids have RFC 9562 version and variant bits. A custom generator is
  responsible for honoring its declared contract.
- **Randomness.** Built-in portable generation draws from Web Crypto or `node:crypto`, never
  `Math.random`. Native generation delegates to the platform; a caller-supplied `fillRandom`
  controls its own entropy. Collisions are possible: enforce uniqueness in storage when required.
- **Time ordering, to the millisecond.** A v7 carries a 48-bit millisecond timestamp in its
  leading bits, so UUID strings sort by their encoded timestamps across different milliseconds.
  Backfilled timestamps or a clock adjustment need not reflect generation order.
- **NOT ordered within a millisecond.** Two ids created in the same millisecond may sort in
  either order. RFC 9562 §6.2 permits different counter and random-bit strategies. Do not use a v7
  to recover the order of events inside a millisecond; use a sequence column.
- **Sortable as a slug only in base32hex.** A 26-character base32hex slug compares as a plain
  string in creation order, to the same millisecond granularity as the guarantee above: its digits
  are in ASCII order and a v7 leads with its timestamp. That is the whole reason the alphabet is
  offered.
- **NOT sortable as a base64url slug.** The default 22-character form is the same 16 bytes in a
  shorter alphabet, and the value round-trips exactly — but that alphabet runs `A-Za-z0-9-_`, so
  its character order and its value order disagree. Sort by the UUID, or by a timestamp column. A
  masked slug has no chronological ordering; masking always uses base64url.
- **One type for owned bytes.** Without an output buffer, byte generators return a plain
  `Uint8Array`, never a platform-specific subclass. With an output buffer, they return that same
  caller-owned array and write only the requested UUID range.
- **You pay for masking only if you mask.** The keyless operations — generating an id, converting
  between a UUID and a plain slug — reach no codec, so a bundle that imports only those carries
  none of the cipher, key derivation, or sentinel table. Use named imports with a tree-shaking
  bundler; loading the complete module namespace does not promise that removal.

## Runtime

No runtime dependencies, on any platform.

- **Bun** uses `Bun.randomUUIDv7`.
- **Node** uses native `crypto.randomUUID`, and native `crypto.randomUUIDv7` where the
  version provides it, otherwise the bundled v7 generator.
- **Browsers and Deno** use Web Crypto for randomness plus the bundled v7 generator.

## License

Apache-2.0. Copyright 2026 Anizoptera and Art Shendrik.
