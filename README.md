# @anizoptera/uuid-slug

Fastest UUIDv4/v7 generation and handling for TS, Rust, and WASM, short base64/base32 plain and masked slugs.  Zero runtime deps, tree-shakable, and optimised for your runtime.  One efficient ID for databases, URLs and files.

[![npm version](https://img.shields.io/npm/v/@anizoptera/uuid-slug?label=npm)](https://www.npmjs.com/package/@anizoptera/uuid-slug)
[![CI](https://github.com/Anizoptera/uuid-slug/actions/workflows/check.yml/badge.svg?branch=main)](https://github.com/Anizoptera/uuid-slug/actions/workflows/check.yml)
[![Node >=20](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](package.json)
[![Runtime deps](https://img.shields.io/badge/runtime_deps-0-2ea44f)](package.json)
[![License](https://img.shields.io/github/license/Anizoptera/uuid-slug)](LICENSE)

- **The fastest compliant UUIDv4/v7 generation and handling across all JS/TS runtimes!**
- 6+ distinct UUID representations are supported!

- **Best performance**, lowest memory and resource allocation on EVERY runtime!
  - Same API that works most efficiently on Node, Bun, Deno, browsers and cloud workers. Native fast paths and portable fallbacks are used automatically.
  - _For even higher performance IDs can be generated or decoded directly into caller-owned buffers; failed validation leaves them unchanged._

- **Zero runtime dependencies.** Small runtime-optimised bundles on Node, Bun, Deno and browsers.

- **One UUID for storage, URLs and files, providing the most efficient representation at every site!**
  - 16-byte binary UUID for storage or transport.
  - **Short 22-character base64url slug for URLs** (39% shorter than a naive UUID text).
  - 26-character base32hex lowercase slug suits case-insensitive (e.g., cross-OS) filenames. Plain UUIDv7 slugs in this alphabet sort by timestamp under ASCII comparison.
  - Optional **UUIDv7 masked slug form that hides timestamp and UUID structure.** Expose your IDs without revealing their creation time or nature!
  - _Any UUID can be converted into a slug, and vice versa. Existing database keys stay unchanged; no mapping table is needed._

- **Most complete functionality. Anything you need to do with UUIDv4/v7 + most operations are applicable to any UUID!**
  - **Full control over guarantees and options.** Control ordering, clock policy, custom payload layout and more.
  - UUIDv7 can use recorded times or an application clock, with configurable handling of clock rollback.
  - IDs and relationships can be created offline, before saving or syncing, without a central allocator or worker number.
  - Masking key rotation and format migration keep old IDs readable while new IDs use current settings. Reserved IDs stay recognizable after rotation.
  - Async key derivation yields during long work and can be cancelled.
  - Optional UUID object for multiple operations over one ID.
  - Timestamp and ordering tools for UUIDv7: timestamp extraction, time-range queries, supplied times and clock controls.
  - Optional, special UUID sentinel values for testing, debugging, tracing and development needs.
  - Optimal, **safe and most efficient defaults!**
  
- **Intuitive, ergonomic, agent-friendly manually tailored API.**
  - Strict types, validation, typed errors, safe buffer writes and one-check composition to prevent integration mistakes.
  - Types catch UUID-version and plain/masked mix-ups before execution. Compatible conversions chain with one error check; failures have stable codes.
  - **Tree shaking removes ANY unused features, including masking and key derivation if you don't use them.**

- TypeScript and Rust implementations that encode and decode the same formats, including masked IDs with matching key settings.


[Install](#install) · [Quick start](#quick-start) · [Contents](#contents) · [API](#api) · [Performance](#performance)


## Install

Use your favorite TS/JS package manager (npm/bun/pnpm/yarn/..), e.g.:
```
bun install @anizoptera/uuid-slug
```

_WASM and Rust versions will be published soon._


## Quick start

One call returns the same ID as `uuid` for storage and `slug` for URLs:

```ts
import { generateUuidV7WithPlainSlug } from "@anizoptera/uuid-slug";
import type { GeneratedUuidV7, PlainUuidV7Slug } from "@anizoptera/uuid-slug";

const { uuid, slug }: GeneratedUuidV7<PlainUuidV7Slug> = generateUuidV7WithPlainSlug();
```

`uuid` has type `UuidV7String`; `slug` has type `PlainUuidV7Slug`.
These are ordinary strings at runtime; TypeScript retains their UUID version and representation.
Unchecked external IDs remain `string` inputs; conversion and parsing validate them.

Use `generateUuidV4()` for random IDs, `generateUuidV7()` for timestamped IDs, or
`generatePlainUuidV7Slug()` for just the slug.
Default generation returns the ID and throws `rng_unavailable` only without secure randomness.
[Conversions return errors as values](#handling-errors).


## Contents

- [Performance](#performance) · [Features](#features) · [Install](#install) · [Quick start](#quick-start)
- [Convert existing IDs](#keep-your-existing-uuids) · [Representations](#representations)
- [Plain slugs](#plain-slugs) · [Masking](#masked-slugs) · [Sentinels](#sentinels) · [Bytes](#work-with-uuid-bytes)
- [Parse once](#parse-once-for-repeated-work) · [Offline IDs](#assign-ids-before-saving-or-syncing)
- [Recorded time](#generate-at-a-recorded-time) · [Extract time](#use-the-uuid-as-the-timestamp-source) · [Ordering](#ordering-and-key-distribution) · [Security limits](#masking-security)
- [Errors](#handling-errors) · [Types](docs/api.md#types)
- [API](#api) · [TypeScript API map](#typescript-api-map)
- [Codec options](docs/api.md#masking-codec-options) · [Migration](docs/api.md#reading-original-slugs-during-migration)
- [Guarantees](#guarantees)
- [Runtime](#runtime)
- [Upgrades and support](#upgrades-and-support)
- [License](#license)

## Keep your existing UUIDs

Encode stored UUIDs; decode incoming slugs before querying the same keys.
Plain encoding preserves every bit, so it adds no collisions. Standard encodings let you decode
plain slugs without this library; masked slugs need the matching key and settings.

```ts
import { plainSlugToUuidString, uuidStringToPlainSlug } from "@anizoptera/uuid-slug";
import type { PlainUuidSlug, UuidSlugError, UuidString } from "@anizoptera/uuid-slug";

const slug: PlainUuidSlug | UuidSlugError = uuidStringToPlainSlug("0198abcd-1234-7abc-9def-0123456789ab");
if (typeof slug === "string") console.log(slug);
else console.error(slug.message);

const uuid: UuidString | UuidSlugError = plainSlugToUuidString("AZirzRI0eryd7wEjRWeJqw");
if (typeof uuid === "string") console.log(uuid); // The database key for this incoming URL slug.
else console.error(uuid.message);
```

## Representations

A masking codec holds the keys and settings to encode and decode UUIDv7 slugs.

All examples encode the same UUIDv7; sizes are characters except for bytes.

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

Pass `BASE32HEX` to a plain-slug writer, for example `generatePlainUuidV7Slug(BASE32HEX)`; see [ordering](#ordering-and-key-distribution).

`uuidToString` infers the alphabet from the length, 22 or 26, so old slugs survive alphabet changes.
It returns lowercase UUID text by default.
Decode before comparing IDs or building cache keys: different spellings can identify the same record.
Preserve base64url case; lowercasing changes the value.

### Masked slugs

Hide UUIDv7 timestamps and other standard fields with a reusable masking codec.
Codecs default to base64url; set `maskedSlugAlphabet: BASE32HEX` for lowercase filenames.

Supply either `maskSeed` or `mask`; neither or both returns `invalid_mask`.
Use `maskSeed` for a secret; `mask` accepts a derived mask, derivation options or
`UUID_V7_TEST_MASK`. Anyone can decode IDs made with the public test mask.

```ts
import {
  createUuidV7MaskingCodec,
  isUuidSlugError,
  UUID_V7_TEST_MASK,
} from "@anizoptera/uuid-slug";
import type { MaskedOrSentinelUuidV7Slug, UuidSlugError, UuidV7MaskingCodec } from "@anizoptera/uuid-slug";

const maskingCodec: UuidV7MaskingCodec | UuidSlugError = createUuidV7MaskingCodec({
  mask: UUID_V7_TEST_MASK,
});

if (isUuidSlugError(maskingCodec)) {
  console.error(maskingCodec.message);
} else {
  const storedUuid: string = "0198abcd-1234-7abc-9def-0123456789ab";
  const slug: MaskedOrSentinelUuidV7Slug | UuidSlugError = maskingCodec.uuidToMaskedSlug(storedUuid);
  if (typeof slug === "string") console.log(slug);
  else console.error(slug.message);
}
```

Construct and check the codec once; reuse it to avoid per-ID key derivation.
Its methods need no `bind`. The public test mask makes this example reproducible; production codecs need a private seed.
Masking accepts UUIDv7s from other generators and preserves all their payload bits.
For new IDs, `maskingCodec.generateUuidV7WithMaskedSlug()` returns the UUID and slug together;
`maskingCodec.generateMaskedUuidV7Slug()` returns just the slug. Both can return `UuidSlugError`.
[Async mask derivation](docs/api.md#masking-codec-options) lets other work run during long setup and supports cancellation.

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

Generation can write an ID into an existing binary record:

```ts
import { generateUuidV7Bytes, isUuidSlugError } from "@anizoptera/uuid-slug";
import type { UuidSlugError } from "@anizoptera/uuid-slug";

const record: Uint8Array = new Uint8Array(32);
const result: Uint8Array | UuidSlugError = generateUuidV7Bytes(record, 8);
if (isUuidSlugError(result)) console.error(result.message);
else console.log(result); // The same record, with its ID at bytes 8 through 23.
```

Write directly into your database or protocol buffer with `uuidStringToBytes`,
`plainSlugToUuidBytes` or `maskingCodec.maskedSlugToUuidBytes`. Pass the array and offset;
the call returns your array and leaves other bytes unchanged. Failed validation leaves the buffer unchanged.
See [buffer examples and accepted byte forms](docs/api.md#work-with-uuid-bytes).

## Parse once for repeated work

`parseUuid` validates and decodes an ID once for repeated conversion and inspection.
It returns an immutable `Uuid` object, not a string. Changes to its byte outputs leave the retained UUID unchanged.

```ts
import { isUuidSlugError, parseUuid } from "@anizoptera/uuid-slug";
import type { PlainUuidSlug, Uuid, UuidBytes, UuidInspection, UuidSlugError } from "@anizoptera/uuid-slug";

const input: string = "0198abcd-1234-7abc-9def-0123456789ab";
const uuid: Uuid | UuidSlugError = parseUuid(input);
if (isUuidSlugError(uuid)) {
  console.error(uuid.message);
} else {
  const bytes: UuidBytes = uuid.toBytes();
  const slug: PlainUuidSlug = uuid.toPlainSlug();
  const details: UuidInspection = uuid.inspect();
  console.log(bytes, slug, details);
}
```

## Assign IDs before saving or syncing

Create IDs before saving, even offline. Related records can reference them without a database round
trip and keep them after synchronization. No central allocator or worker number is needed.

## Generate at a recorded time

Set `at` on UUIDv7 generation calls to encode a record's time instead of now.
It accepts a `Date`, Unix milliseconds, zoned ISO text, Temporal-style instants and
`{ seconds, nanoseconds }` timestamps without manual conversion.
See [accepted time forms and configured fractional precision](docs/api.md#supplied-time).

```ts
import { BASE32HEX, generatePlainUuidV7Slug } from "@anizoptera/uuid-slug";
import type { PlainUuidV7Slug, UuidSlugError, UuidV7Instant } from "@anizoptera/uuid-slug";

const recordedAt: UuidV7Instant = "2026-01-01T12:00:00Z";
const slug: PlainUuidV7Slug | UuidSlugError = generatePlainUuidV7Slug({ at: recordedAt, alphabet: BASE32HEX });
if (typeof slug === "string") console.log(slug);
else console.error(slug.message);
```

Use one created generator across output forms to share a sequence, including `at` calls.
Module-level calls remain independent.

Calls use fresh randomness even at identical timestamps. For retries, retain the first ID or
use a deduplication key; existing records keep their UUIDs. Masked IDs need a
[timestamp range](#masked-slugs) covering the recorded time.

Ordered generation can advance encoded time beyond the supplied time.

## Use the UUID as the timestamp source

Read UUIDv7's millisecond timestamp without a database lookup or UUID-text conversion.
If it is the time you need, omit a separate field:

```ts
import { extractUuidV7UnixMs } from "@anizoptera/uuid-slug";
import type { UuidSlugError } from "@anizoptera/uuid-slug";

const incomingId: string = "AZirzRI0eryd7wEjRWeJqw";
const unixMs: number | UuidSlugError = extractUuidV7UnixMs(incomingId);
if (typeof unixMs === "number") console.log(unixMs);
else console.error(unixMs.message);
```

`extractUuidV7UnixMs(bytes, offset)` reads from a larger buffer.
`maskingCodec.extractMaskedUuidV7UnixMs(slug)` recovers a masked timestamp with the codec's keys.
UUIDv4 has no timestamp and is rejected.

For known fraction and counter layouts, use [payload extraction](docs/api.md#uuidv7-payload-fields).

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

`uuidV7StringBounds(startMs, endMs)` builds inclusive bounds for time-range queries on UUID keys.
The bounds cover every UUIDv7 in the interval, regardless of its payload.
For one millisecond, use `uuidV7StringBounds(ms)`. Compare in UUID wire-byte order;
SQL Server's `uniqueidentifier` uses a different order.

Decode masked filenames or store dates separately to sort them chronologically.

Changing public URLs leaves the UUID index unchanged. For hash partitioning, hash the UUID
so a spelling change does not move the record.

With unchanged settings, built-in masking gives the same UUID the same slug: URLs and filenames
stay stable, and repeated uses are recognizable. Rotation can change the slug;
compare decoded UUIDs to identify the same record.

## Masking security

Masking hides UUIDv7 fields; the matching key restores them. Its cryptographic strength is not established,
including against attacks using known UUID/slug pairs. See the [design](docs/design.md)
and [security limits](docs/security.md).

An incorrect key can pass the 16-bit check and return the wrong UUID.
Keep the rotation list short and confirm decoded IDs against your records;
see the [record lookup example](docs/security.md).

A browser can use your service's masked IDs without the seed. Keep private masking and decoding
on the service; client code exposes the seed. Plain generation and conversion need no seed.

## Handling errors

Conversions return `T | UuidSlugError` and pass errors through unchanged.
Async mask construction resolves to the same union.
Compatible chains need one final check. For string results, `typeof result === "string"`
keeps the branded string type; the other branch is `UuidSlugError`.
Use `isUuidSlugError` for object results or unknown input. It recognizes package errors
across realms and package copies.

```ts
import { isUuidSlugError, uuidStringToBytes } from "@anizoptera/uuid-slug";
import type { UuidBytes, UuidSlugError } from "@anizoptera/uuid-slug";

const bytes: UuidBytes | UuidSlugError = uuidStringToBytes("0198abcd-1234-7abc-9def-0123456789ab");
if (isUuidSlugError(bytes)) console.error(bytes.code, bytes.message);
else console.log(bytes);
```

Check intermediate results only when you also need their values.

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
| Parse once for repeated work | [`parseUuid`](#parse-once-for-repeated-work) returns an immutable `Uuid` object |
| Inspect version, variant, timestamp, or payload | `Uuid.inspect`, `extractUuidVersion`, `extractUuidV7UnixMs`, `extractUuidV7Payload` |
| Narrow untrusted input | `isUuidText`, `isUuidString`, `isUuidBytes`, `isPlainUuidSlug`, their v4/v7 guards, and `isUuidSlugError` |
| Build UUIDv7 database range keys | `uuidV7StringBounds`, `uuidV7ByteBounds` |
| Validate a UUIDv7 timestamp window | `validateUuidV7StringUnixMs` and the plain or masked slug equivalents |
| Derive UUIDv7 masks, with optional async cancellation | `deriveUuidV7Mask`, `deriveUuidV7MaskAsync` |
| Use an application-defined reversible masking transform | [`createCustomUuidV7Mask`](docs/api.md#masking-codec-options) |
| Mask, unmask, rotate keys, or reserve sentinels | `createUuidV7MaskingCodec` and its methods |
| Read explicitly enabled old formats | `maskingCodec.createUuidSlugMigrationDecoder` |

Types catch UUID-version and plain/masked mix-ups; results retain text case and buffer ownership.
Generator, masking-codec and migration methods need no `this` binding.

## Guarantees

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

NPM package uses ES modules. Native APIs and portable TypeScript are selected automatically for each runtime and output, so the caller code does not need to choose or coordinate the implementations. When the runtime supports it, the implementation is chosen statically through the 'package.json' exports. 

The [Rust crate](rust/uuid-slug) uses the same identifier formats. Cross-language masked reads
require matching seeds, iteration counts and timestamp ranges; see [cross-language contracts](docs/cross-language.md).

| Runtime | Package code |
| --- | --- |
| Node 20 and newer | Compiled JavaScript |
| Bun | TypeScript source |
| Deno | TypeScript source; no flag or import map needed |
| Cloudflare Workers, browsers and other compatible runtimes | Compiled JavaScript over Web Crypto |

Bun's native UUIDv7 timestamp can advance ahead of the clock during bursts. Create a generator to control ordering, clock policy or payload layout.

Conversion and timestamp extraction need no randomness, so read-only tools and static builds can use them. Generation needs secure randomness. See [runtime coverage](docs/cross-language.md#distribution-and-dependencies).


## Upgrades and support

Check the [changelog](CHANGELOG.md) before upgrading. And see the [release policy](docs/release.md).

Supported identifier formats remain readable across upgrades. Retain the [matching mask settings and migration readers](docs/api.md#changing-an-existing-id-format) for stored masked IDs.

Plain slugs recover standard UUIDs without keys or this library. Masked IDs need their keys, range settings and sentinel definitions; custom masks also need their transform implementation.

The built-in [wire format](docs/design.md) is documented for independent decoders.

Report bugs through [GitHub issues](https://github.com/Anizoptera/uuid-slug/issues).


## License

Apache-2.0. Copyright 2026 Anizoptera and Art Shendrik.
