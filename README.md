# @anizoptera/uuid-slug

[![npm version](https://img.shields.io/npm/v/@anizoptera/uuid-slug?label=npm)](https://www.npmjs.com/package/@anizoptera/uuid-slug)
[![CI](https://github.com/Anizoptera/uuid-slug/actions/workflows/check.yml/badge.svg?branch=main)](https://github.com/Anizoptera/uuid-slug/actions/workflows/check.yml)
[![Node >=20](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](package.json)
[![Runtime deps](https://img.shields.io/badge/runtime_deps-0-2ea44f)](package.json)
[![License](https://img.shields.io/github/license/Anizoptera/uuid-slug)](LICENSE)

Fastest UUIDv4/v7 generation and handling, short base64/base32 plain and masked slugs.  Zero runtime dependencies, tree-shakable, optimised for your runtime.  One efficient ID across database, URLs and files.

```text
UUID: 0198abcd-1234-7abc-9def-0123456789ab
Slug: AZirzRI0eryd7wEjRWeJqw
```

Keep your UUID database keys; no slug mapping table. Generate IDs offline.
Plain slugs encode any UUID; masked slugs hide UUIDv7 fields with your key.
Use base64url for short URLs or lowercase base32hex for case-insensitive filenames.

Use JavaScript or TypeScript on Node, Bun, Deno, browsers and Workers, with no native addons or WebAssembly.

[Install](#install) · [Quick start](#quick-start) · [Contents](#contents) · [API](#api) · [Performance](#measured-performance)

## Install

Run `bun add @anizoptera/uuid-slug`; replace `bun add` with `npm install` or `pnpm add`.
The package uses ES modules; see [runtime support](#runtime).

## Quick start

```ts
import { generateUuidV7WithPlainSlug } from "@anizoptera/uuid-slug";

const { uuid, slug } = generateUuidV7WithPlainSlug();
```

Use `generateUuidV4()` for random IDs, `generateUuidV7()` for timestamped IDs, or
`generatePlainUuidV7Slug()` for just the slug. Anyone can decode plain slugs;
[masking](#masked-slugs) hides UUIDv7 fields.
Default generation returns the ID and throws `rng_unavailable` only without secure randomness.
[Conversions return errors as values](#handling-errors).

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [Convert existing IDs](#keep-your-existing-uuids) · [Representations](#representations)
- [Plain slugs](#plain-slugs) · [Masking](#masked-slugs) · [Sentinels](#sentinels) · [Bytes](#work-with-uuid-bytes)
- [Recorded time](#generate-at-a-recorded-time) · [Extract time](#use-the-uuid-as-the-timestamp-source) · [Ordering](#ordering-and-key-distribution) · [Security limits](#masking-security)
- [Errors](#handling-errors) · [Types](docs/api.md#types)
- [API](#api) · [TypeScript API map](#typescript-api-map)
- [Codec options](docs/api.md#masking-codec-options) · [Migration](docs/api.md#reading-original-slugs-during-migration)
- [Measured performance](#measured-performance)
- [Guarantees](#guarantees)
- [Runtime](#runtime)
- [Upgrades and support](#upgrades-and-support)
- [License](#license)

## Keep your existing UUIDs

Encode stored UUIDs; decode incoming slugs before querying the same keys. Plain encoding accepts
every UUID version, including IDs from databases and other libraries. It preserves every bit:
no added collisions or mapping table. Standard encodings let you decode plain slugs without
this library; masked UUIDv7 slugs need the matching key and settings.

```ts
import { isUuidSlugError, plainSlugToUuidString, uuidStringToPlainSlug } from "@anizoptera/uuid-slug";

const slug = uuidStringToPlainSlug("0198abcd-1234-7abc-9def-0123456789ab");
const uuid = plainSlugToUuidString(slug);
if (isUuidSlugError(uuid)) console.error(uuid.message);
else console.log(uuid); // Use this UUID to look up the existing record.
```

Generation supports UUIDv4/v7; parsing, inspection and plain conversion accept other versions.
UUIDv4 has 122 random bits. UUIDv7 has 48 timestamp bits and 74 payload bits for randomness,
counters or fractions. Conversion and masking preserve those bits from any RFC 9562 UUIDv7,
regardless of its generator.

## Representations

A masking codec holds the keys and settings to encode and decode UUIDv7 slugs.

These outputs encode the same UUIDv7.
Sizes are characters, except for UUID bytes.

| Representation | Size | Example | Meaning and use |
| --- | ---: | --- | --- |
| UUID text | 36 | `0198abcd-1234-7abc-9def-0123456789ab` | Lowercase hyphenated output; uppercase optional |
| UUID bytes | 16 | `01 98 ab cd 12 34 7a bc 9d ef 01 23 45 67 89 ab` | Compact storage; writes a new or caller-owned array; encode as text for URLs |
| Plain base64url slug | 22 | `AZirzRI0eryd7wEjRWeJqw` | Lossless for any UUID; case-sensitive; almost time-ordered for UUIDv7 |
| Plain base32hex slug | 26 | `06canj8i6htbp7ff04hkaps9lc` | Keyless, lossless; writes lowercase, accepts mixed case; UUIDv7 sorts by timestamp in ASCII order |
| Masked base64url UUIDv7 slug | 22 | `ap225Qa_y6wN5LQCJgwH0z` | Opaque, case-sensitive, unordered; 16-bit check; requires its codec to decode |
| Masked base32hex UUIDv7 slug | 27 | `daerdp86nv5qo3f4mg12c307qco` | Opaque, unordered; writes lowercase, accepts mixed case; requires its codec to decode |

Parsers accept mixed-case canonical or compact hexadecimal text, brace-wrapped canonical text
and UUID URNs. See [input examples](docs/api.md#uuid-text-input).
Masked examples use the public `UUID_V7_TEST_MASK`; use a private seed for your IDs.

Plain and masked base64url slugs can look identical but decode to different UUIDs.
Read known plain IDs with `plainSlugToUuidString` and known masked IDs with
`maskingCodec.maskedSlugToUuidString`. General codec readers try masks first, then plain decoding
only if every mask rejects the slug.

Generate bytes once when you need several representations, then convert only those you use.
Use paired generation when you need UUID text plus one slug.

## Two kinds of slug

### Plain slugs

Use `uuidStringToPlainSlug` to encode a UUID and `plainSlugToUuidString` to recover it.
Decoders reject `=` padding and nonzero unused bits in the last character.
`isPlainUuidSlug` checks canonical spelling and returns a boolean.

Pass `BASE32HEX` to a plain-slug writer, for example `generatePlainUuidV7Slug(BASE32HEX)`.
See [ordering](#ordering-and-key-distribution) before choosing a sort order.

`uuidToString` infers the alphabet from the length, 22 or 26, so old slugs survive alphabet changes.
It returns lowercase UUID text by default.
Decode before comparing IDs or building cache keys: different spellings can identify the same record.
Preserve base64url case; lowercasing changes the value.

### Masked slugs

Codecs default to base64url; set `maskedSlugAlphabet: BASE32HEX` for lowercase base32hex.

Supply either `maskSeed` or `mask`; neither or both returns `invalid_mask`.
Use `maskSeed` for a secret; `mask` accepts a derived mask, derivation options or
`UUID_V7_TEST_MASK`. Anyone can decode IDs made with the public test mask.

```ts
import {
  createUuidV7MaskingCodec,
  isUuidSlugError,
} from "@anizoptera/uuid-slug";
import type { UuidV7MaskingCodec } from "@anizoptera/uuid-slug";

function createPublicIds(seed: string) {
  return createUuidV7MaskingCodec({ maskSeed: seed });
}

function generateAndRead(publicIds: UuidV7MaskingCodec) {
  const pair = publicIds.generateUuidV7WithMaskedSlug();
  if (isUuidSlugError(pair)) return pair;
  const recovered = publicIds.maskedSlugToUuidString(pair.slug);
  return isUuidSlugError(recovered) ? recovered : { ...pair, recovered };
}
```

Call `createPublicIds(seed)` once, check the result, then pass the codec to `generateAndRead`.
Reuse it for subsequent IDs so key derivation runs once. Its methods need no `bind`.
Use [async mask derivation](docs/api.md#masking-codec-options) when setup must yield or be cancelled.

Generate a random seed, for example with `openssl rand -base64 32`, and keep it outside source control.
Seeds need at least 16 bytes; length alone does not prevent offline guessing from known UUID/slug pairs.

Changing the seed or `keyDerivationIterations` changes keys. Keep old mask settings and range starts
in `previousMasks` while old slugs must work. Retain each live format's sentinel definitions too.
New slugs use current keys. Deploy both readers before switching writers; bookmarks still need
their old decoder. See [migration](docs/api.md#changing-an-existing-id-format).
`keyDerivationIterations` defaults to `1`. More iterations increase setup and guessing costs;
they do not make a human-chosen seed suitable.

Masking covers roughly 139 years from `timestampRangeStartUnixMs`. The default starts at the
Unix epoch and ends in May 2109. Outside that range, masking returns `invalid_timestamp` rather
than lose timestamp bits. Plain slugs and sentinels retain the full UUIDv7 range.
See [exact bounds and range configuration](docs/design.md#representations-and-bit-budget).

### Sentinels

Reserve UUIDv7 values that stay recognizable in logs: codecs write them as plain slugs,
even after key rotation. Codecs have none by default. Keep their definitions unchanged while
their slugs remain in use. See [sentinel setup and collision handling](docs/api.md#sentinels).

## Work with UUID bytes

Write directly into your database or protocol buffer with `uuidStringToBytes`,
`plainSlugToUuidBytes` or `maskingCodec.maskedSlugToUuidBytes`. Pass the array and offset;
the call returns your array and leaves other bytes unchanged. Failed validation leaves the buffer unchanged.
See [buffer examples and accepted byte forms](docs/api.md#work-with-uuid-bytes).

## Assign IDs before saving or syncing

Create IDs before saving, even offline. Related records can reference them without a database round
trip and keep them after synchronization. No central allocator or worker number is needed.
On the server, validate client IDs and ownership; a valid UUID does not authorize record creation or replacement.

## Generate at a recorded time

Set `at` on UUIDv7 generation calls to encode a record's time instead of now.
Pass a `Date` or Unix milliseconds; see [other time inputs and precision](docs/api.md#supplied-time).

```ts
import { BASE32HEX, generatePlainUuidV7Slug } from "@anizoptera/uuid-slug";

function idForImportedRecord(recordedAt: Date) {
  return generatePlainUuidV7Slug({ at: recordedAt, alphabet: BASE32HEX });
}
```

Use one created generator across output forms to share a sequence, including `at` calls.
Each call generates and formats once. Module-level calls remain independent.

Calls use fresh randomness even at identical timestamps. For retries, retain the first ID or
use a deduplication key; existing records keep their UUIDs. Masked IDs need a
[timestamp range](#masked-slugs) covering the recorded time.

Ordered generation can advance encoded time beyond the supplied time.

## Use the UUID as the timestamp source

Read UUIDv7's millisecond timestamp without a database lookup or UUID-text conversion.
If it is the time you need, omit a separate field:

```ts
import { extractUuidV7UnixMs, isUuidSlugError } from "@anizoptera/uuid-slug";

function dateFromId(uuidOrPlainSlug: string) {
  const unixMs = extractUuidV7UnixMs(uuidOrPlainSlug);
  return isUuidSlugError(unixMs) ? unixMs : new Date(unixMs);
}
```

`extractUuidV7UnixMs(bytes, offset)` reads from a larger buffer.
`maskingCodec.extractMaskedUuidV7UnixMs(slug)` recovers a masked timestamp with the codec's keys.
UUIDv4 has no timestamp and is rejected.

For known fraction and counter layouts, use [payload extraction](docs/api.md#uuidv7-payload-fields).

Assign IDs from generation time or a supplied event time.
Keep separate fields for other dates, finer precision, editable times or queries the UUID index
cannot serve. Changing the timestamp changes the ID.

## Ordering and key distribution

Base64url UUIDv7 slugs are almost time-ordered: nearby timestamps have similar prefixes.
ASCII sorting can reverse them: `AAAAAAAz` and `AAAAAAA0` encode consecutive milliseconds,
but the second prefix sorts first.

Base32hex preserves UUID byte order: its alphabet, `0-9a-v`, follows numeric order, with the
most significant bits first. Equal-length slugs sort by timestamp even across field boundaries.
Clocks can move backwards, and UUIDv7 does not promise creation order within a millisecond.
Compare one spelling at a time; database collations and natural file sorting can differ from ASCII.

`uuidV7StringBounds(ms)` returns the lowest and highest UUIDv7 for that millisecond:
both fix the first 48 timestamp bits, with all 74 payload bits zero in the first and one in the second.
Pass an inclusive end millisecond for a longer interval. Compare in UUID wire-byte order;
SQL Server's `uniqueidentifier` uses a different order.

Decode masked filenames or store dates separately to sort them chronologically.

Database write speed and key distribution depend on storage sorting and partition rules;
measure them before choosing masking for that purpose. For hash partitioning, hash the UUID so a spelling
change does not move the record. Changing public URLs leaves the UUID index unchanged.
Sentinels remain plain and keep their grouping.

With unchanged settings, built-in masking gives the same UUID the same slug: URLs and filenames
stay stable, and repeated uses are recognizable. Rotation can change the slug;
compare decoded UUIDs to identify the same record.

## Masking security

Masking hides UUIDv7 fields; the matching key restores them. Its cryptographic strength is not established,
including against attacks using known UUID/slug pairs. See the [design](docs/design.md)
and [security limits](docs/security.md).

Roughly one random 22-character base64url value in 65,536 passes a mask's 16-bit check.
It can decode to an ID you never generated, or to the wrong existing record, even with a
custom transform. More read keys add chances of incorrect decoding; the combined rate is
at most their sum. Keep the rotation list short. Look up the decoded ID and check caller access;
see the [record lookup example](docs/security.md).

A browser can use your service's masked IDs without the seed. Keep private masking and decoding
on the service; client code exposes the seed. Plain generation and conversion need no seed.

## Handling errors

Conversions return `T | UuidSlugError`; async mask construction resolves to the same union.
Chain compatible conversions; check `isUuidSlugError` where you handle failure.
It recognizes package errors across realms and package copies.

```ts
import { isUuidSlugError, plainSlugToUuidBytes, uuidStringToPlainSlug } from "@anizoptera/uuid-slug";

function saveUuid(uuidText: string, save: (bytes: Uint8Array) => void) {
  const bytes = plainSlugToUuidBytes(uuidStringToPlainSlug(uuidText));
  if (isUuidSlugError(bytes)) return bytes;
  save(bytes);
}
```

Conversions pass errors through unchanged. Check intermediate results only when you also need their values.

Handle errors by `code`, with constants such as `INVALID_BUFFER` and the `UuidSlugErrorCode` type.
Use `message` for diagnostics; wording can change while codes stay stable.
Failed entropy draws, clock readings and custom transforms retain their exception as `cause`.

## API

Use the [TypeScript reference](docs/api.md) for [types](docs/api.md#types),
[call signatures](docs/api.md#api), [codec options](docs/api.md#masking-codec-options),
[migration](docs/api.md#reading-original-slugs-during-migration) and
[timestamp windows](docs/api.md#validating-timestamp-windows).
Each export also documents its accepted input, result and failures in editor hover help.

## TypeScript API map

| Job | Main TypeScript API |
| --- | --- |
| Generate UUIDv4 | `generateUuidV4`, `generateUuidV4Bytes`, `generatePlainUuidV4Slug`, `generateUuidV4WithRandomFill` |
| Generate UUIDv7 | `generateUuidV7`, `generateUuidV7Bytes`, `generatePlainUuidV7Slug` |
| Generate one UUIDv7 with its slug | `generateUuidV7WithPlainSlug`, `maskingCodec.generateUuidV7WithMaskedSlug` |
| Generate an immutable UUIDv7 value | `generateUuidV7Value`, or its generator and masking-codec methods |
| Control UUIDv7 time, sequence, rollback, or entropy | `createUuidV7Generator`, `createUuidV7GeneratorWithRandomFill` |
| Convert UUID text, bytes, and plain slugs | `uuidToString`, `uuidToBytes`, `uuidToPlainSlug`, plus source-specific converters |
| Parse once for repeated work | [`parseUuid`](docs/api.md#convert-and-inspect-ids) returns an immutable `Uuid` value |
| Inspect version, variant, timestamp, or payload | `Uuid.inspect`, `extractUuidVersion`, `extractUuidV7UnixMs`, `extractUuidV7Payload` |
| Narrow untrusted input | `isUuidText`, `isUuidString`, `isUuidBytes`, `isPlainUuidSlug`, their v4/v7 guards, and `isUuidSlugError` |
| Build UUIDv7 database range keys | `uuidV7StringBounds`, `uuidV7ByteBounds` |
| Validate a UUIDv7 timestamp window | `validateUuidV7StringUnixMs` and the plain or masked slug equivalents |
| Create UUIDv7 masking | `deriveUuidV7Mask`, `deriveUuidV7MaskAsync`, `createCustomUuidV7Mask` |
| Mask, unmask, rotate keys, or reserve sentinels | `createUuidV7MaskingCodec` and its methods |
| Read explicitly enabled old formats | `maskingCodec.createUuidSlugMigrationDecoder` |

TypeScript distinguishes UUID versions, text case, plain and masked slugs, and caller-owned buffers.
Generator, masking-codec and migration methods need no `this` binding.

## Measured performance

| Operation | Result |
| --- | --- |
| UUIDv7 text | Fastest on Node, Bun, Deno and Chromium. |
| UUIDv7 text and base64url slugs on Bun | On par with native generation. |
| UUIDv4 text | Fastest on Chromium. |
| UUIDv4/v7 bytes | Fastest on Node and Chromium. |
| UUIDv7 timestamp extraction | Fastest validated text extraction on Node, Bun, Deno and Chromium. |
| UUID text/byte generation and plain conversion on Node | Lower heap allocation. |

## Guarantees

See [security limits](docs/security.md) for entropy failures and masking.

- Generated IDs have RFC 9562 version and variant bits.
- Built-in generators use cryptographically secure runtime randomness without weaker fallbacks.
  If it is unavailable, argument-free or preset-only generation throws `UuidSlugError` with code
  `rng_unavailable`. Calls with explicit time, a generator, caller output or custom entropy return it.
- UUIDs can collide. Use a uniqueness constraint where duplicates could overwrite or misidentify
  data. On conflict creating a record, keep the existing record and generate a new ID.
- Default calls retain the selected native generator's ordering and clock behavior.
  Use a created generator to control ordering and clock rollback. Native failures fall back to
  the package's generator; if both fail, the error retains both causes.
- UUIDv7 starts with a 48-bit millisecond timestamp, so UUID strings sort by encoded time across
  different milliseconds. Backfills and clock adjustments can differ from generation order.
- Successful current-time calls on one created generator strictly increase in UUID byte order
  under the default preserve policy; `at` calls share its sequence state. Module-level generation
  and reset-policy calls beyond their tolerance do not guarantee this order. Independent generators,
  package copies, workers and processes have separate state; use a sequence column for ordering across them.
- Plain slugs preserve all UUID bits. Base32hex UUIDv7 slugs sort by timestamp across different
  milliseconds under ASCII comparison. Base64url UUIDv7 slugs are almost time-ordered;
  [ASCII sorting can reverse them](#ordering-and-key-distribution). Masked slugs have no chronological order.
- Byte generators return a new plain `Uint8Array` or your supplied array, writing only the requested range.
- `uuidStringToBytes` and `plainSlugToUuidBytes` validate the whole identifier before writing.
  Invalid text or destination ranges return an error without changing caller storage.
- Named root imports let supported bundlers remove the cipher, key derivation, sentinel table,
  and unrelated generation code.
- A UUIDv7 masking codec requires explicit private mask options or a package-produced mask.
  Use `UUID_V7_TEST_MASK` explicitly for the public test key; omission does not select it.

## Runtime

The [Rust crate](rust/uuid-slug) uses the same identifier formats. Cross-language masked reads
require matching seeds, iteration counts and timestamp ranges; see [cross-language contracts](docs/cross-language.md).

| Runtime | Package code |
| --- | --- |
| Node 20 and newer | Compiled JavaScript |
| Bun | TypeScript source |
| Deno | TypeScript source; no flag or import map needed |
| Cloudflare Workers, browsers and other compatible runtimes | Compiled JavaScript over Web Crypto |

Generation selects native functions or the package's generator for each runtime and output.
See [entropy sources](docs/security.md) for the secure-randomness requirements and fallback choices.

Bun's native UUIDv7 timestamp can advance ahead of the clock during bursts. Create a generator
to control ordering, clock policy or payload layout.

Conversion and timestamp extraction need no randomness, so read-only tools and static builds
can use them. Generation needs secure randomness. See
[runtime coverage](docs/cross-language.md#distribution-and-dependencies).

## Upgrades and support

Check the [changelog](CHANGELOG.md) before upgrading. Breaking changes require a major release,
or a minor release before 1.0. APIs must be deprecated in a published release before removal;
see the [release policy](docs/release.md).
Supported identifier formats remain readable across upgrades. Retain the
[matching mask settings and migration readers](docs/api.md#changing-an-existing-id-format) for stored masked IDs.
Report bugs through [GitHub issues](https://github.com/Anizoptera/uuid-slug/issues).

## License

Apache-2.0. Copyright 2026 Anizoptera and Art Shendrik.
