# @anizoptera/uuid-slug

[![npm version](https://img.shields.io/npm/v/@anizoptera/uuid-slug?label=npm)](https://www.npmjs.com/package/@anizoptera/uuid-slug)
[![CI](https://github.com/Anizoptera/uuid-slug/actions/workflows/check.yml/badge.svg?branch=main)](https://github.com/Anizoptera/uuid-slug/actions/workflows/check.yml)
[![Node >=20](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](package.json)
[![Runtime deps](https://img.shields.io/badge/runtime_deps-0-2ea44f)](package.json)
[![License](https://img.shields.io/github/license/Anizoptera/uuid-slug)](LICENSE)

Generate and validate UUIDv4 and UUIDv7. Encode any UUID as a reversible 22-character base64url or
26-character base32hex slug. UUIDv7 also supports keyed masking that removes its recognizable
layout.

See it as a complete UUID library, or as a wrapper around the best UUID implementation each
JavaScript runtime provides: Node and Bun generate through their native functions, Deno and
browsers through the package's own generator over Web Crypto, and every change is timed against
both the runtime's function and the fastest competing package. No runtime dependencies. Random
bits come from a secure source or generation fails; there is no fallback to `Math.random`. Failures
are returned as values, never thrown. Validated UUIDs and slugs carry branded TypeScript types. A
Rust crate implements the same wire format, so a slug issued by Node decodes in Rust with the same
seed.

## TL;DR

A UUID is a 128-bit identifier, 36 characters as text. A slug here is that same value as short
URL-safe text: convert either way and nothing is lost. A masked slug is a UUIDv7 scrambled with a
secret seed plus a 16-bit check, so a public ID does not look like a UUID. The codec holding the
seed reverses it. Masking is obfuscation, not authorization.

```mermaid
flowchart LR
  T["UUID text<br>36 characters"] <--> B["UUID bytes<br>16 bytes"]
  T <--> S["Direct slug<br>22 base64url or 26 base32hex<br>any UUID version, no key"]
  B <--> S
  B -- "codec(seed), UUIDv7 only" --> M["Masked slug<br>22 base64url or 27 base32hex"]
  M -- "codec, check must pass" --> B
  N["Sentinel<br>a reserved UUIDv7"] -- "codec writes it as a direct slug" --> S
```

Always true:

- Failures come back as `UuidSlugError` values, not exceptions. Check with `isUuidSlugError`.
- Types and guards prove a value is well formed, not that you issued it. Look every decoded ID up
  in your store.
- Random bits come from the runtime's secure source. If it is missing you get `rng_unavailable`,
  never `Math.random`.
- The seed, `keyDerivationIterations`, and the sentinel list are part of the wire format: change
  any of them and slugs already handed out stop decoding. Rotate seeds through `previousMasks`.
- Goal: the fastest UUID package on Node, Bun, Deno, and Chromium without dropping a guarantee.
  Every change is timed as a whole call against the runtime's own generator and the fastest package
  with the same guarantees, and stays only if the gain repeats.
  [Measured performance](#measured-performance) lists where the package still loses.

Where to start:

| You need | Call | Read |
| --- | --- | --- |
| Shorter UUIDs in URLs | `generateUuidV7Slug()`, `uuidToSlug`, `slugToUuid` | [Two kinds of slug](#two-kinds-of-slug) |
| Text keys or filenames that sort by UUIDv7 time | the same calls with `"base32hex"` | [Two kinds of slug](#two-kinds-of-slug) |
| Binary keys, written into a buffer you own if you pass one | `generateUuidV7Bytes(out, offset)`, `uuidToBytes`, `bytesToUuid` | [Quick start](#quick-start) |
| Public IDs that do not look like UUIDs | `createUuidV7SlugCodec({ mask: { seed } })`, then `generateSlug`, `encodeUuid`, `decodeSlug` | [Two kinds of slug](#two-kinds-of-slug), [What masking is not](#what-masking-is-not) |
| Rotate the seed without breaking old links | `previousMasks` | [Codec options](#codec-options) |
| Read slugs issued by older package formats | `codec.createMigrationDecoder` | [Reading original slugs during migration](#reading-original-slugs-during-migration) |
| Reserved IDs such as `anonymous` | `sentinels` | [Two kinds of slug](#two-kinds-of-slug) |
| Reject stale or future IDs | `validateUuidV7Timestamp`, `codec.validateSlugTimestamp` | [Validating timestamp windows](#validating-timestamp-windows) |
| The same IDs from a Rust service | the `rust/uuid-slug` crate, same seed | [Cross-language contract](docs/cross-language.md) |
| Plain UUID text only | `generateUuidV4()`, `generateUuidV7()`; bundlers drop the rest | [Measured performance](#measured-performance) |

Traps:

| Assumption | Fact |
| --- | --- |
| A base64url slug sorts by time | No. Only base32hex sorts, only for UUIDv7, only across milliseconds. |
| Two IDs from one millisecond sort in creation order | Not promised on any runtime. Use a sequence column. |
| A masked slug is a token | It is reversible, and its check is 16 bits: per key tried, about one random string in 65,536 decodes to a well-formed UUID you never issued. Check authorization on the record, not the slug. |
| Any UUID can be masked | UUIDv7 only. A timestamp at or past 2^42 ms, year 2109, is refused, never truncated. |
| A guard passed, so the value is mine | A guard says well formed, nothing more: some masked slugs pass direct-slug guards by chance. Decode with the codec, then look the UUID up. |
| A codec works without a mask | Construction fails. `UUID_V7_TEST_MASK` is a published key; anyone can decode what it issues. |
| A seed a human chose is fine | Seeds under 16 bytes are rejected, and length is not the point: one known UUID and slug pair allows offline guesses. Generate the seed. |
| `bytesToSlug` is a base64url helper | It accepts exactly one 16-byte UUID or one canonical slug. Every other length is an error. |
| A migration decoder's successes count old-format traffic | No. The old format's check is only four bits, so one slug can decode under several formats. |

Native APIs are used where they meet the contract and measured faster, the package's own code
everywhere else. base64url and hex use the native encoders on Node and Bun; Deno keeps the
package's encoder because it measured faster there. Every native result is checked before it is
returned.

| Runtime | Loads | Generation |
| --- | --- | --- |
| Node 20 and newer | compiled JavaScript | native `crypto.randomUUID`, and `crypto.randomUUIDv7` where the version has it |
| Bun | published TypeScript | `Bun.randomUUIDv7` for current-time UUIDv7 |
| Deno | published TypeScript | the package's own generator over Web Crypto; no flag or import map needed |
| Browsers, other runtimes | compiled JavaScript | the package's own generator over Web Crypto |

CI covers every published Node major from 20, the latest Bun and Deno, the packed tarball on Node,
Bun, Deno, Chromium, Firefox, and WebKit, and the Rust crate on Linux, macOS, and Windows; see
[Runtime](#runtime).

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [Representations](#representations)
- [Two kinds of slug](#two-kinds-of-slug)
- [What masking is not](#what-masking-is-not)
- [Handling errors](#handling-errors)
- [Types](#types)
- [API](#api)
  - [Codec options](#codec-options)
  - [Changing an existing ID format](#changing-an-existing-id-format)
  - [Reading original slugs during migration](#reading-original-slugs-during-migration)
  - [Validating timestamp windows](#validating-timestamp-windows)
- [Measured performance](#measured-performance)
- [Guarantees](#guarantees)
- [Runtime](#runtime)
- [License](#license)

## Install

```bash
pnpm add @anizoptera/uuid-slug
```

Import from the package root:

```ts
import { generateUuidV7Slug, slugToUuid } from "@anizoptera/uuid-slug";
```

The native Rust crate in [`rust/uuid-slug`](rust/uuid-slug) implements the same wire contract: a
slug issued by a Node service decodes in a Rust service holding the same seed, and one shared case
corpus runs against both implementations in CI. The npm package remains TypeScript/JavaScript-only.

## Quick start

```ts
import {
  generateUuidV7Slug,
  isUuidSlugError,
  slugToUuid,
} from "@anizoptera/uuid-slug";

function createShortId() {
  const slug = generateUuidV7Slug();
  if (isUuidSlugError(slug)) return slug;

  const uuid = slugToUuid(slug);
  if (isUuidSlugError(uuid)) return uuid;
  return { slug, uuid };
}
```

Use a codec only when IDs must hide their UUIDv7 layout:

```ts
import {
  createUuidV7SlugCodec,
  isUuidSlugError,
} from "@anizoptera/uuid-slug";

function createPublicId(seed: string) {
  // Reuse the codec in real code: the seed is expanded once, at construction.
  const ids = createUuidV7SlugCodec({ mask: { seed } });
  if (isUuidSlugError(ids)) return ids;

  const publicId = ids.generateSlug();
  if (isUuidSlugError(publicId)) return publicId;
  return { ids, publicId };
}
```

Keep binary database keys binary through the same codec:

```ts
import { generateUuidV7Bytes, isUuidSlugError } from "@anizoptera/uuid-slug";
import type { UuidV7SlugCodec } from "@anizoptera/uuid-slug";

function roundTripBytes(ids: UuidV7SlugCodec) {
  const inputBytes = generateUuidV7Bytes();
  if (isUuidSlugError(inputBytes)) return inputBytes;
  const publicId = ids.encodeUuid(inputBytes);
  if (isUuidSlugError(publicId)) return publicId;
  return ids.decodeSlugToBytes(publicId);
}
```

Convert canonical UUID text and binary storage with names that state the direction:

```ts
import { bytesToUuid, isUuidSlugError, uuidToBytes } from "@anizoptera/uuid-slug";

function convertUuid() {
  const bytes = uuidToBytes("01990d4d-e600-7000-8000-000000000000");
  if (isUuidSlugError(bytes)) return bytes;
  const uuid = bytesToUuid(bytes);
  if (isUuidSlugError(uuid)) return uuid;

  // Convert atomically into storage you already own.
  const record = new Uint8Array(32);
  return uuidToBytes(uuid, record, 8);
}
```

`uuidToBytes` accepts one canonical lowercase UUID and either allocates a plain `Uint8Array` or
writes 16 bytes at the requested offset. `bytesToUuid` reads 16 bytes at an optional offset.
`Buffer` works because it is a `Uint8Array`; `ArrayBuffer`, `DataView`, and array-like values do
not. Use `isUuidBytes`, `isUuidV4Bytes`, or `isUuidV7Bytes` when unknown binary input must be
narrowed before storage or version-specific work.

**Generate the seed; do not think one up.** For example, run `openssl rand -base64 32` and
store the result outside your source repository. Seeds shorter than 16 bytes are rejected, but
length alone does not make a seed unpredictable: a known UUID/slug pair allows offline guesses.

Keep the seed and `keyDerivationIterations` stable for as long as issued slugs must remain readable.
Changing either derives different keys; retain the old settings in `previousMasks` during
rotation. `keyDerivationIterations` defaults to `1`; increasing it adds construction and guessing cost,
but does not turn a human-chosen seed into a suitable secret.

## Representations

| Representation | Size | Use |
| --- | ---: | --- |
| UUID text | 36 characters | Standard interchange and logs |
| UUID bytes | 16 bytes | Compact database or protocol storage |
| Direct base64url slug | 22 characters | Shortest lossless URL-safe text |
| Direct base32hex slug | 26 characters | Lowercase filenames and sortable UUIDv7 text |
| Masked base64url UUIDv7 slug | 22 characters | Short public ID without recognizable UUID structure |
| Masked base32hex UUIDv7 slug | 27 characters | Lowercase masked text for case-insensitive filesystems |

Direct slugs need no key. Masked slugs require the codec configured with the matching mask. A
sentinel is a reserved UUIDv7 that its codec writes as a direct slug instead of masking.

## Two kinds of slug

**Direct slug.** The 16 UUID bytes as unpadded base64url, 22 characters. Pure re-encoding:
`uuidToSlug` and `slugToUuid` preserve the UUID value, and anyone can convert either way. Use it
when you only want the identifier shorter.

Pass `"base32hex"` to get 26 characters instead, and gain one thing: **base32hex slugs of UUIDv7s
sort by millisecond timestamp as plain strings.** A v7 starts with its timestamp, and base32hex writes
its digits in the same order as their values, so comparing two slugs compares two instants. That
makes them usable directly as an ordered database key. base64url cannot do it: its alphabet runs
`A-Za-z0-9-_`, so `0` stands for a larger value than `A` but sorts before it.

base32hex is also the safer of the two for a **filename**: it is lowercase throughout, so it
survives a case-insensitive filesystem unchanged, and a directory listing comes back in timestamp
order across different milliseconds. `generateUuidV7Slug("base32hex")` generates one directly; the alphabet is an argument on
every keyless entry point that produces a slug, so nothing about choosing it requires a codec.

You never say which alphabet you are reading. The two lengths are different, 22 and 26, so
`slugToUuid` works out the encoding from the slug itself, so switching alphabet leaves every slug
you have already handed out working.

**Masked slug.** Masking supports UUIDv7 only. Its compact payload and check pass through a small
block cipher keyed by your seed, then encoded as 22 base64url characters by default, or 27
lowercase base32hex characters with `outputAlphabet: "base32hex"`. Both preserve the same payload
and check. Use it when the identifier is public and you want an opaque, hash-like spelling instead
of recognizable UUID fields. Masked slugs are reversible and therefore are not hashes. The exact steps are in
[how masking works](docs/design.md).

The application creates one codec from a stable secret seed. Encoding compresses the UUIDv7's
fixed fields, adds a 16-bit check, applies the keyed reversible transform, then writes the selected
slug alphabet. Decoding reverses those steps and rejects a value when its check does not match.
Create the codec once and reuse it; changing its seed changes the mapping.

A supported UUIDv7 carries 116 bits that the masked format must preserve: the version and
variant are fixed, and the top six bits of the timestamp stay zero until the year 2109. 22 base64url
characters hold 132 bits, so the spare 16 carry a check for incorrect decoding. Two things follow,
and both are part of the contract rather than implementation detail:

- **A decoded slug is a candidate, not a proof.** Roughly one random 22-character string in
  65,536 passes the check and decodes to a well-formed, possibly unissued UUID. Look the result
  up in your own store; a wrong candidate is then a miss rather than a wrong answer. Every extra
  mask you try adds another opportunity for false acceptance; the combined rate is
  at most the sum of the individual rates. Keep the rotation list short.
- **Masking refuses a timestamp at or past 2^42 ms**, which arrives in the year 2109. It returns
  `invalid_timestamp` because those six bits are spent on the check. Truncating instead would let
  two UUIDs share one slug, which nothing could recover from. Direct slugs have no such limit.

**Sentinels** are application-selected UUIDv7 values that skip masking on purpose, so they stay
recognisable in logs and support tickets. Codecs default to no sentinels; configure only identities
your application has reserved:

| Name            | UUID                                   | Slug                     |
| --------------- | -------------------------------------- | ------------------------ |
| `nil`           | `00000000-0000-7000-8000-000000000000` | `AAAAAAAAcACAAAAAAAAAAA` |
| `anonymous`     | `00000000-0001-7000-8000-000000000000` | `AAAAAAABcACAAAAAAAAAAA` |
| `unknown`       | `00000000-0002-7000-8000-000000000000` | `AAAAAAACcACAAAAAAAAAAA` |

Read the validated names, UUIDs, and slugs from `codec.sentinels`:

```ts
import { createUuidV7SlugCodec, isUuidSlugError } from "@anizoptera/uuid-slug";

function createIds(seed: string) {
  const ids = createUuidV7SlugCodec({
    mask: { seed },
    sentinels: [{ name: "unknownUser", uuid: "00000000-0002-7000-8000-000000000000" }],
  });
  return isUuidSlugError(ids) ? ids : ids.sentinels;
}
```

Each sentinel name must be nonempty and unique within the codec. Each sentinel UUID must also be
unique, canonical UUIDv7 text.

Keep sentinel definitions stable while their slugs are in use. Decoding checks sentinels first, so they
are reserved even if a mask could produce the same text. Encoding rejects a non-sentinel UUID
whose masked output collides with a reserved slug, using `invalid_mask`; it never returns
a slug that would decode to the wrong sentinel.

## What masking is not

Masking uses a four-round Feistel network with HalfSipHash-2-4 round functions and a
seed-derived key schedule. It removes the directly recognizable UUIDv7 field layout. The package makes no
claim about how hard the mask is to break, with or without known UUID and slug pairs. The round
function is tested against reference vectors; that says nothing about the whole construction. See
[the mechanism and its limits](docs/design.md).

Masked slugs are not authentication tokens or capabilities. The check detects many incorrect
decodes; it is not a message authentication code. Confirm decoded candidates against your store
and enforce authorization separately. Supplying a custom transform still leaves the same short check
and does not turn the API into an authenticated-token system.

```ts
import { isUuidSlugError } from "@anizoptera/uuid-slug";
import type { UuidV7SlugCodec, UuidV7String } from "@anizoptera/uuid-slug";

async function findAuthorizedRecord<Record>(
  ids: UuidV7SlugCodec,
  slug: string,
  findByUuid: (uuid: UuidV7String) => Promise<Record | undefined>,
  canRead: (record: Record) => boolean,
) {
  const uuid = ids.decodeSlug(slug);
  if (isUuidSlugError(uuid)) return uuid;
  const record = await findByUuid(uuid);
  return record !== undefined && canRead(record) ? record : undefined;
}
```

**Supply your own secret seed for real identifiers.** Codec construction fails with
`invalid_mask` when `mask` is missing. For tests and demos that need stable public bytes,
select `UUID_V7_TEST_MASK` explicitly; anyone can decode identifiers produced with it.

## Handling errors

Every operation that can fail, including generation and codec construction, returns
`T | UuidSlugError`. Use `isUuidSlugError` to narrow the union. It checks the error's name and
code rather than its class, so it works across realms and duplicate package copies; by the same
token any object can be shaped to pass it, so it proves nothing about where a value came from.
Codec construction also requires an explicit mask.

Use the error's `code` for handling and its `message` for diagnostics. `UuidSlugErrorCode` and
`UUID_SLUG_ERROR_CODES` are the exported type and runtime list of codes. Errors wrapping failed
entropy draws, clock readings, and custom transform calls preserve the original exception as `cause`.

`bytesToSlug`, `slugToBytes`, and `isUuidSlug` are not general base64url helpers: they accept exactly
one 16-byte UUID payload or its canonical spelling and return an error for every other length.

```ts
import { bytesToSlug } from "@anizoptera/uuid-slug";

function encodeStoredUuid(bytes: Uint8Array) {
  return bytesToSlug(bytes, "base32hex");
}
```

## Types

Branded types distinguish values this library has validated or produced. Plain strings and byte
arrays are not assignable to them; pass raw input directly to package operations or use a guard when
you need to retain the narrowed type. A brand proves format, not issuance: check your store for that.
JavaScript consumers do not need TypeScript. The shipped declarations compile with TypeScript 5.0
and newer.

| Type | What the value is |
| --- | --- |
| `UuidString`, `UuidV4String`, `UuidV7String` | Canonical UUID text; the version is known where the name says so. |
| `UuidSlug`, `UuidV4Slug`, `UuidV7Slug` | A direct slug in either alphabet; the version is known where the name says so. |
| `MaskedUuidV7Slug`, `SentinelUuidV7Slug` | A masked slug, or a sentinel slug, in either spelling. Kept apart from direct slugs because their check bits and lengths are not direct UUID encodings. |
| `UuidV7CodecSlug` | Masked or sentinel: what a masking call returns. |
| `UuidBytes`, `UuidV4Bytes`, `UuidV7Bytes` | One validated 16-byte UUID; generated bytes keep their version. |
| `SlugAlphabet` | `"base64url"` or `"base32hex"`. |
| `UuidV7SlugCodec`, `UuidV7SlugCodecOptions`, `UuidV7Mask`, `UuidV7MaskOptions`, `AsyncUuidV7MaskOptions`, `CustomUuidV7MaskOptions`, `UuidV7Sentinel`, `UuidV7SentinelConfig`, `UuidV7Generator`, `UuidV7GeneratorOptions`, `UuidV7TimestampWindow`, `UuidSlugMigrationFormat`, `UuidSlugMigrationDecoder`, `UuidSlugMigrationOptions`, `UuidSlugErrorCode` | Option, result, and error shapes. |

A brand narrows what a call accepts at compile time. A value already typed as the wrong kind is
rejected before it runs, with or without an output buffer:

| Value typed as | Rejected by | Why |
| --- | --- | --- |
| Masked or possibly masked (`MaskedUuidV7Slug`, `UuidV7CodecSlug`) | Direct-slug decoding and timestamp operations | Its key belongs to the codec; decode there. |
| UUID text (`UuidString` and its versions) | Slug parsers, codecs, and migration readers | Text is not a slug. |
| Known v4 (`UuidV4String`, `UuidV4Slug`, `UuidV4Bytes`) | v7-only timestamp validation, masking, and codec byte masking | A v4 has no timestamp. |

Raw strings and version-unknown values stay accepted everywhere and are validated at runtime,
because direct and masked base64url spellings overlap: only the application knows which protocol
produced external text. Parsing and direct string or slug conversions keep a known v4 or v7 brand.
Formatting bytes returns a version-agnostic value because the bytes may have changed since they
were validated. Byte operations return the exact branded type when they allocate, and the caller's
exact array subtype when writing into supplied storage; codec byte decoding returns owned
`UuidV7Bytes` or that subtype.

**Some masked slugs also pass direct-slug guards.** Canonical trailing bits, version, and variant
can all match by chance. A guard answers "is this well formed", never "is this mine". Decode with
the matching API and look up the candidate; a brand or guard cannot establish issuance.

## API

The **Where** column tells you whether to import a function or call a codec method.

- **codec only.** Uses your configured keys or sentinels.
- **module only.** Import these functions directly. Codec settings do not affect them.

The state split keeps each caller responsible for one thing. A generator owns its clock and mutable
UUIDv7 sequence; the package runtime owns cryptographic entropy. A codec owns immutable masking
keys, sentinels, rotation, and writer settings.
Generator, codec, and migration methods do not depend on `this`; they can be passed as callbacks
without binding them first.

| Method                                                  | Where             | Returns                       | What it does                             |
| ------------------------------------------------------- | ----------------- | ----------------------------- | ---------------------------------------- |
| `generateUuidV4()` / `generateUuidV7()`                   | module only | `UuidSlugError` or UUID string | Generate. |
| `generateUuidV4Bytes()` / `generateUuidV7Bytes()`         | module only | `UuidSlugError` or typed 16 bytes | Generate owned UUID bytes. |
| `generateUuidV4Bytes(out, offset?)` / `generateUuidV7Bytes(...)` | module only | `UuidSlugError` or the exact `out` type | Generate into caller storage. |
| `generateUuidV7At(ms)` / `generateUuidV7BytesAt(ms, out?, offset?)` | module only | `UuidSlugError \| ...` | Generate at an explicit instant. |
| `generateUuidV4Slug(alphabet?)` / `generateUuidV7Slug(alphabet?)` | module only | `UuidSlugError` or direct slug | Generate and encode. |
| `generateSlug()`                                          | codec only | `UuidSlugError` or `UuidV7CodecSlug` | Generate a masked or sentinel slug. |
| `encodeUuid(uuidOrBytes)` / `decodeSlug(slug)`            | codec only | `UuidSlugError \| ...` | Mask UUIDv7 text or bytes; decode to text. |
| `decodeSlugToBytes(slug, out?, offset?)`                  | codec only | `UuidSlugError \| ...` | Decode without producing UUID text. |
| `extractSlugTimestamp(slug)`                              | codec only | `UuidSlugError \| number` | Read time from a masked slug or sentinel. |
| `validateSlugTimestamp(slug, window)`                     | codec only | `UuidSlugError \| ...` | Decode, then check the timestamp window. |
| `sentinels`                                             | codec only        | array                         | The reserved values this codec knows.    |
| `createMigrationDecoder(options?)`                       | codec only | migration reader | Read selected old formats without changing new output. |
| `uuidToSlug(uuid, alphabet?)` / `slugToUuid(slug)`      | module only       | `UuidSlugError \| ...`        | Direct slug, both ways.                  |
| `uuidToBytes(uuid, out?, offset?)` / `bytesToUuid(bytes, offset?)` | module only | `UuidSlugError \| ...` | Convert canonical UUID text and bytes. |
| `slugToBytes` / `bytesToSlug`                      | module only       | `UuidSlugError \| ...`        | Slug to bytes and back.                  |
| `extractUuidV7Timestamp(value, offset?)`            | module only       | `UuidSlugError \| number`     | Read time from UUIDv7 text, direct slug, or bytes. |

A byte offset is the zero-based index where one 16-byte UUID starts inside a larger `Uint8Array`.
Omit it for a standalone 16-byte array. Output offsets select where a method writes; input offsets
select where it reads. Bytes outside that 16-byte range stay unchanged.

There is no version-neutral `uuidToMaskedSlug`. Every UUID version has recognizable fields, but
this package defines one masked wire format for UUIDv7. Its fixed version, variant, and timestamp
range leave room for the format's 16-bit check without lengthening the default 22-character slug.

The `At` pair supports backfilling with a known timestamp. It takes the instant first and returns
an error unless it is a whole number of Unix milliseconds in 0..2^48-1. Its interaction with
current-time generation is runtime-specific; within-millisecond ordering is not promised.

Use an independent generator when the application owns the clock:

```ts
import { createUuidV7Generator } from "@anizoptera/uuid-slug";

function createEventGenerator(readUnixMs: () => number) {
  return createUuidV7Generator({ clock: readUnixMs });
}
```

Both masking entry points return a raw sentinel slug when the UUID is registered as a sentinel.
Their result type is `UuidV7CodecSlug`, the union of masked and sentinel slugs.

The byte decoder returns a new plain `Uint8Array` branded as `UuidV7Bytes` when storage is omitted.
When storage is supplied, it validates and decodes before writing, then returns that exact array;
an error leaves the array unchanged.

Each decoder accepts every value that a supported matching encoder can produce. Masked decoding
always accepts both alphabets, sentinels, and current or previous masks. Migration adds only
the old formats you enable. Forms no supported encoder produces are invalid.

Also exported, all module-level:

- Type guards: `isUuidString`, `isUuidV4String`, `isUuidV7String`, `isUuidSlug`, `isUuidV4Slug`,
  `isUuidV7Slug`, `isUuidBytes`, `isUuidV4Bytes`, and `isUuidV7Bytes`.
- `extractUuidV7Timestamp` reads Unix milliseconds from UUIDv7 text, either direct-slug alphabet,
  or bytes. Use `codec.extractSlugTimestamp` for masked slugs and sentinels because their decoding
  keys belong to the codec. Both return an error for other UUID versions; a v4's first six bytes
  are random and must not be presented as a timestamp.
- `createUuidV7Mask` builds a mask from a seed; `createUuidV7MaskAsync` adds cooperative
  cancellation; `createCustomUuidV7Mask` adapts separate forward and reverse callbacks.
  `UUID_V7_TEST_MASK` is the explicit, published-key choice for deterministic examples.
- `createUuidV7Generator(options)` builds a full generator with your `clock` and the package's
  platform cryptographic entropy. Its options type is `UuidV7GeneratorOptions`. Untyped malformed
  options return `invalid_options`. Generation returns `rng_unavailable` when secure
  platform entropy is unavailable and never substitutes caller-controlled bytes.
- `UuidSlugError`, including code `rng_unavailable` when the runtime has no usable randomness.
  `UuidSlugErrorCode` types the `code` property; `isUuidSlugError` recognizes package errors across
  JavaScript realms and duplicate package copies.
- `UUID_SLUG_ALPHABETS` and `UUID_SLUG_MIGRATION_FORMATS` are the runtime values for
  configuration and user-interface validation. Their TypeScript unions derive from the same lists.

### Codec options

```ts
import { createUuidV7SlugCodec } from "@anizoptera/uuid-slug";

function configureCodec(seed: string, previousSeed: string) {
  return createUuidV7SlugCodec({
    mask: { seed, keyDerivationIterations: 1 },
    sentinels: [{ name: "nil", uuid: "00000000-0000-7000-8000-000000000000" }],
    previousMasks: [{ seed: previousSeed }],
    outputAlphabet: "base32hex",
  });
}
```

The masked payload is fixed at 132 bits, including a 16-bit check. `outputAlphabet` defaults to
`"base64url"`. Readers accept either masked spelling without an alphabet argument. With
`outputAlphabet: "base32hex"`, sentinels are written as 26-character base32hex slugs; their
22-character base64url spelling still decodes.

To supply a different mixing implementation, call
`createCustomUuidV7Mask({ label, mask, unmask })`. Each callback receives distinct 16-byte input
bytes and returns either a 16-byte result or `UuidSlugError`; `unmask` must invert `mask` for
every input. A callback may mutate and return its isolated input. The factory copies callback results
into package storage, captures the callbacks in an opaque frozen handle, and rejects invalid results
and failed round-trip probes. Unexpected throws become errors with the thrown value as their cause.
Finite probes cannot prove invertibility, so the caller remains responsible for the complete domain.

```ts
import {
  createCustomUuidV7Mask,
  createUuidV7SlugCodec,
  isUuidSlugError,
} from "@anizoptera/uuid-slug";

function adaptMask(mix: (input: Uint8Array, output: Uint8Array, forward: boolean) => void) {
  const transform = (direction: "mask" | "unmask") => (input: Uint8Array) => {
    const output = new Uint8Array(16);
    mix(input, output, direction === "mask");
    return output;
  };
  const mask = createCustomUuidV7Mask({
    label: "existing-scheme",
    mask: transform("mask"),
    unmask: transform("unmask"),
  });
  return isUuidSlugError(mask) ? mask : createUuidV7SlugCodec({ mask });
}
```

`createUuidV7Mask({ seed, keyDerivationIterations })` returns an error for invalid seed options.
`createUuidV7SlugCodec(options)` returns an error for invalid options. Create custom handles before
passing them; an arbitrary object is not a mask.

For expensive derivation, await `createUuidV7MaskAsync` and pass the completed mask to the codec:

```ts
import {
  createUuidV7MaskAsync,
  createUuidV7SlugCodec,
  isUuidSlugError,
} from "@anizoptera/uuid-slug";

async function createResponsiveCodec(
  seed: string,
  keyDerivationIterations: number,
  signal: AbortSignal,
) {
  const mask = await createUuidV7MaskAsync({ seed, keyDerivationIterations, signal });
  return isUuidSlugError(mask) ? mask : createUuidV7SlugCodec({ mask });
}
```

The async form derives the same keys and accepts the same seed settings. It splits encoding,
packing and hashing into cooperative work slices, allowing host tasks to run during long
construction. Cancellation stops derivation and returns `UuidSlugError` with code `aborted` and
`signal.reason` as its cause. Invalid options return `invalid_mask`; unexpected construction
failures retain their cause. No partially derived mask is returned.

Options are captured when called. Byte seeds are copied before the first suspension, so later
caller mutation cannot change the key; synchronize concurrent writes to shared backing memory.
Copying a very large byte seed, plus allocation, GC, and host scheduling, can still block longer
than one work slice. Small derivations need no host yield. Construct once and reuse the mask;
passing seed options to each new codec would repeat derivation.

`previousMasks` is how you rotate a seed. Decoding tries `mask` first, then each entry in the
order you list them, and the first whose check passes wins. Put the newest first, and keep the
list short. Nothing else is ever tried: a codec decodes with the masks you gave it and no
others.

```ts
import { createUuidV7SlugCodec } from "@anizoptera/uuid-slug";

function createRotatedCodec(currentSeed: string, previousSeed: string) {
  return createUuidV7SlugCodec({
    mask: { seed: currentSeed },
    previousMasks: [{ seed: previousSeed }],
  });
}
```

Writers use `currentSeed`; readers also accept `previousSeed`. Remove the old seed only after its
IDs no longer need to decode.

### Changing an existing ID format

Preserve the UUID; change only how it is encoded. Do not generate a replacement UUID when
converting an existing ID: references and stored records must still identify the same object.

Deploy readers that accept both formats before any writer issues the new format. Include
background jobs, cached clients and extensions in that rollout. After switching writers, keep
compatible readers available for rollback: an old-only reader cannot read newly issued IDs.

Updating the database does not update bookmarks, shared links, cookies or client storage.
Remove compatibility only when the old IDs in those places no longer need to work.
No recent legacy traffic does not prove that old links are gone. To keep old URLs after removing
their decoder, retain an application-owned mapping from each supported old slug to its UUID.

Keep keys and sentinel definitions stable throughout the rollout. Non-v7 UUIDs and UUIDv7s
timestamped at or beyond 2^42 ms cannot use the current masked format; preserve them as UUIDs
or direct slugs. Never truncate the timestamp or substitute a new identity to make masking pass.

### Reading original slugs during migration

Create a migration reader from your codec. Enable only the old formats your application issued:

```ts
import type { UuidV7SlugCodec } from "@anizoptera/uuid-slug";

function readLegacySlug(ids: UuidV7SlugCodec, incomingSlug: string) {
  const reader = ids.createMigrationDecoder({ originalMask: true, directSlug: true });
  return reader.decodeSlug(incomingSlug);
}
```

`originalMask` accepts the original fixed permutation/XOR format with its 4-bit checksum.
It does **not** accept the different masked format from package version 0.2.0.
`directSlug` accepts direct UUID slugs of any version, including old base64url spellings whose
last four bits were ignored. Ordinary `slugToUuid` remains strict about those trailing bits.
Both options must be booleans; untyped malformed reader configuration returns `invalid_options`.
Neither option changes generation, ordinary codec methods, keys or sentinels.

`decodeSlug` returns one UUID or `UuidSlugError`: sentinels first, then current keys, then enabled
original and direct formats. A successful decode still needs a record lookup. The same slug can
decode to different UUIDs in different formats; the original check has only four bits.

When you know the input format, name it to avoid trying unrelated formats:

```ts
import { isUuidSlugError } from "@anizoptera/uuid-slug";
import type { UuidSlugMigrationDecoder, UuidV7SlugCodec } from "@anizoptera/uuid-slug";

function replaceOriginalSlug(
  ids: UuidV7SlugCodec,
  reader: UuidSlugMigrationDecoder<"original-mask">,
  oldSlug: string,
) {
  const uuid = reader.decodeSlug(oldSlug, "original-mask");
  if (isUuidSlugError(uuid)) return uuid;
  const replacement = ids.encodeUuid(uuid);
  if (isUuidSlugError(replacement)) return replacement;
  return { uuid, replacement }; // Keep uuid in the database; use replacement in new links.
}
```

Enable an old format before selecting it. Recognized sentinels always return their reserved UUID,
including old trailing-bit aliases when reading original or direct slugs.
With literal options, TypeScript offers only `"current-mask"` and the formats enabled with `true`;
options whose values are dynamic remain selectable because they may be enabled at runtime.

For unknown formats, use `decodeSlugCandidates` to find the matching record without guessing:

```ts
import { isUuidSlugError } from "@anizoptera/uuid-slug";
import type { UuidSlugMigrationDecoder, UuidString } from "@anizoptera/uuid-slug";

async function findMigratedRecord(
  reader: UuidSlugMigrationDecoder,
  incomingSlug: string,
  findRecordsByUuids: (uuids: readonly UuidString[]) => Promise<readonly unknown[]>,
) {
  const candidates = reader.decodeSlugCandidates(incomingSlug);
  if (isUuidSlugError(candidates)) return candidates;
  const matches = candidates.length ? await findRecordsByUuids(candidates) : [];
  if (matches.length !== 1)
    return new Error(matches.length ? "ID matches multiple records" : "ID not found");
  return matches[0]; // Check access before returning the record to the caller.
}
```

`findRecordsByUuids` is your database query. Return distinct records by UUID. `decodeSlugCandidates`
returns distinct UUIDs in decoding order, or an empty array if none match. Malformed input and
failed mask callbacks return an error. Callback errors keep their cause; they never produce a
successful but incomplete list.
An old sentinel alias can also be a current masked ID. `decodeSlugCandidates` retains both UUIDs;
`decodeSlug` keeps sentinel priority.

Keep this reader while old inputs must work. Replace it with `ids.createMigrationDecoder({ directSlug: true })`
to stop trying the original mask, or `ids.createMigrationDecoder({ originalMask: true })` to stop direct-slug decoding.
`ids.createMigrationDecoder()` tries only current keys and sentinels. Removing the migration reader entirely
leaves ordinary codec decoding unchanged. Neither method can identify the issuing format from
the slug alone, so successful decoding is not a reliable count of legacy traffic.

### Validating timestamp windows

```ts
import { validateUuidV7Timestamp } from "@anizoptera/uuid-slug";

function validateRecentUuid(uuid: string) {
  return validateUuidV7Timestamp(uuid, { maxTimestampDeltaMs: 60_000 });
}
```

The timestamp must be inside the inclusive interval `referenceUnixMs - maxTimestampDeltaMs`
through `referenceUnixMs + maxTimestampDeltaMs`. The maximum delta is required, finite, and
nonnegative; zero and finite fractions are valid. `referenceUnixMs` defaults to one `Date.now()`
reading and must be finite when supplied. Invalid settings return an error instead of disabling
the check.

`validateUuidV7SlugTimestamp` starts from a direct slug; `codec.validateSlugTimestamp` starts from
a slug decoded with that codec. Successful validation returns the same spelling with its validated
plain or public masked-slug type. This is a symmetric timestamp sanity check, not past-only expiry,
authentication, or replay prevention. Use ordinary decoding for permanent identifiers. For links
with expiration or one-time use, check the stored expiry and consumption state as well.

## Measured performance

The goal is to be fastest at every comparable operation on every supported runtime without
dropping a guarantee below. Native UUID generation is used where its output meets the contract;
otherwise the package's own generator runs. A change stays only if it passes all of this:

- Timed as the whole public call on Node, Bun, Deno, and Chromium, against the runtime's own
  function and the fastest package that keeps the same guarantees.
- Kept only when two separate runs both show the gain and their confidence intervals rule out no
  change. Node and Bun outrank Chromium, and Chromium outranks Deno, so a gain on a lower runtime
  does not pay for a loss on a higher one. Rejected variants stay recorded with their evidence.
- CI counts JavaScript-visible allocations and platform calls on Node and Bun: guards allocate no
  decoded arrays or errors, writes into caller buffers create no temporary views, key rotation
  decodes text once, and repeated random draws come from one pool. CI also compares each
  operation's cost with the runtime function it builds on.
- A package that wins by giving something up is still timed but cannot be the reference:
  `Math.random` entropy, a smaller same-millisecond collision margin, or a timestamp read that skips
  the version check.

The table says where the latest measurements still miss the target. Ratios drift with hardware and
engine versions; read the direction of each gap, not its size.

| Evidence | Scope | Current result |
| --- | --- | --- |
| Generation | Node, Bun, Deno, Chromium; v4/v7 text, owned bytes, caller buffers, direct slugs | Byte output leads on every runtime, into a new array or a caller buffer, except Bun's UUIDv4 write into a caller buffer, which trails `uuid`, and Deno's UUIDv7 new array, which is unresolved against `uuidv7`. UUIDv7 text leads every package and matches the native generator on Node and Bun. UUIDv4 text matches Node's native generator but trails the fastest package on Bun, Deno, and Chromium. |
| Conversion | UUID text, bytes, both direct-slug alphabets, timestamp extraction | Complete validated calls are measured. UUIDv7 timestamp extraction from text trails `uuidv7-js` on every runtime; extraction from bytes and slugs has no comparable package. |
| Bundling | Bun, esbuild, Parcel, Rollup, Rolldown, Rspack, webpack | A named root import keeps only the code it needs. |

[Methods, competitors, results, limitations, and rejected optimizations](bench/PERFORMANCE.md) hold
the numbers. This table only names the gaps. The latest full run on one machine is tracked as
[competitors.md](bench/results/competitors.md) and [matrix.md](bench/results/matrix.md).

## Guarantees

These are API contracts. The benchmarks in [`bench/README.md`](bench/README.md) measure cost;
passing them proves none of this. See [security boundaries](docs/security.md) for entropy failures
and masking limits.

- **Conformance.** Generated ids have RFC 9562 version and variant bits.
- **Secure entropy by default.** Built-in generators use the runtime's cryptographically secure
  random source. They never fall back to weaker randomness. If secure randomness is unavailable,
  generation returns `rng_unavailable`. With a working runtime, collision risk is negligible.
  Treat any collision as a generator or entropy failure.
- **Native generation degrades safely.** Optional native generation is a shortcut, not a second
  behavior: if it throws or returns a malformed UUID, slug, or byte array, the matching portable
  generator is tried. If both fail, the returned error retains both causes.
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
  shorter alphabet, and the value round-trips exactly, but that alphabet runs `A-Za-z0-9-_`, so
  its character order and its value order disagree. Sort by the UUID, or by a timestamp column. A
  masked slug has no chronological ordering in either alphabet.
- **One type for owned bytes.** Without an output buffer, byte generators return a plain
  `Uint8Array`, never a platform-specific subclass. With an output buffer, they return that same
  caller-owned array and write only the requested UUID range.
- **Atomic identifier parsing.** `uuidToBytes` and `slugToBytes` validate the complete identifier
  before writing. Invalid text or destination ranges return an error and leave caller storage
  unchanged.
- **You pay for masking only if you mask.** Named root imports let supported bundlers remove the
  cipher, key derivation, sentinel table, and unrelated generation code.
- **Masking is explicit.** A codec requires private mask options or a package-produced mask.
  The published-key mask is available only as `UUID_V7_TEST_MASK`; omission never
  selects it.

## Runtime

No runtime dependencies, on any platform.

- **Bun** loads the published TypeScript source and uses `Bun.randomUUIDv7` for current-time
  generation. Explicit timestamps use the portable generator to preserve the requested instant.
  If Bun loads the compiled JavaScript directly, it still uses the Bun-specific source and native
  functions. Tooling that opts into the `development` condition loads the same source.
- **Node** uses native `crypto.randomUUID`, and native `crypto.randomUUIDv7` where the
  version provides it, otherwise the bundled v7 generator.
- **Deno** loads the published TypeScript source and runs the package's own generator over Web
  Crypto. No resolver flag or import map is needed.
- **Browsers and other compatible runtimes** run the package's own generator over Web Crypto.

Capabilities are probed once when the module loads. A missing method is left undefined, so no call
pays for a throw and a retry. Native base64url and hex encoders are used where a runtime provides
them and they measured faster; on Deno the portable encoder measured faster, so it is kept there.
The UUIDv7 generator is created on first use, so conversion-only imports draw no entropy.

Every change runs in CI on each published Node major from 20 upward, with the newest left unpinned
so a new native API cannot change behavior unnoticed; on the latest Bun and Deno; and as a packed
consumer on Node, Bun, Deno, Chromium, Firefox, and WebKit. The Rust crate builds and tests
natively on Linux, macOS, and Windows for x86-64 and Arm64, and its WebAssembly build runs in the
same three browser engines.

## License

Apache-2.0. Copyright 2026 Anizoptera and Art Shendrik.
