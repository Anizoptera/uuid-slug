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

The native Rust crate implements the same wire contract and lives in [`rust/uuid-slug`](rust/uuid-slug).
The npm package remains TypeScript/JavaScript-only.

## Quick start

```ts
import { createUuidSlugCodec, unwrapUuidSlug } from "@anizoptera/uuid-slug";

const seed = process.env.ID_MASK_SEED;
if (!seed) throw new Error("Set ID_MASK_SEED to a stable, randomly generated secret.");

// Reuse the codec: the seed is expanded once, at construction.
const ids = unwrapUuidSlug(createUuidSlugCodec({ mask: { seed } }));

const publicId = unwrapUuidSlug(ids.uuidV7MaskedSlug());
const uuid = unwrapUuidSlug(ids.maskedSlugToUuidV7(publicId));
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
sort by millisecond timestamp as plain strings.** A v7 starts with its timestamp, and base32hex writes
its digits in the same order as their values, so comparing two slugs compares two instants. That
makes them usable directly as an ordered database key. base64url cannot do it — its alphabet runs
`A-Za-z0-9-_`, so `0` stands for a larger value than `A` but sorts before it.

base32hex is also the safer of the two for a **filename**: it is lowercase throughout, so it
survives a case-insensitive filesystem unchanged, and a directory listing comes back in timestamp
order across different milliseconds. `uuidV7Slug("base32hex")` generates one directly; the alphabet is an argument on
every keyless entry point that produces a slug, so nothing about choosing it requires a codec.

You never say which alphabet you are reading. The two lengths are different, 22 and 26, so
`slugToUuid` works out the encoding from the slug itself — which means switching alphabet leaves
every slug you have already handed out working.

**Masked slug.** A UUIDv7 payload and check passed through a small block cipher keyed by your
seed, then encoded as 22 base64url characters by default, or 27 lowercase base32hex characters
with `maskedSlugAlphabet: "base32hex"`. Both preserve the same payload and check. Use it when the identifier is public and you
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
if (ids instanceof Error) throw ids;
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
and enforce authorization separately. Supplying a custom transform still leaves the same short check
and does not turn the API into an authenticated-token system.

**Supply your own secret seed for real identifiers.** Codec construction fails with
`invalid_mask_schema` when `mask` is missing. For tests and demos that need stable public bytes,
select `PUBLIC_MASK_SCHEMA` explicitly; anyone can decode identifiers produced with it.

## Handling errors

Parsing, decoding, formatting, conversion, byte generation, and explicit-timestamp generation
return `T | UuidSlugError`. Check `instanceof Error` within one realm, or use `isUuidSlugError`
when values may cross realms or duplicate package copies. The structural guard recognizes the
package's error name and code vocabulary; it classifies data and does not authenticate untrusted
input. Codec construction returns the same union and requires an explicit mask.

Use `unwrapUuidSlug(result)` when failure ends the current operation. It returns the exact success
type and throws a local or cross-realm `UuidSlugError` unchanged, so the original code, message,
stack, and cause remain available to an outer error boundary. Callers that can recover should keep
the returned union and branch on its error instead.

Use the error's `code` for handling and its `message` for diagnostics. `UuidSlugErrorCode` and
`UUID_SLUG_ERROR_CODES` are the exported type and runtime list of codes. Errors wrapping failed
entropy draws, clock readings, and custom transform calls preserve the original exception as `cause`.

Replace the removed generic base64url helpers with the UUID operations that own the same exact
16-byte contract:

```ts
formatUuidSlug(bytes); // replaces encodeBase64Url(bytes)
formatUuidSlug(bytes, "base32hex"); // select the filesystem-safe spelling directly
parseUuidSlug(slug, output, offset); // replaces decodeBase64Url(slug, output, offset)
slug.length === 22 && isUuidSlug(slug); // replaces isBase64Url(slug)
```

## Types

Branded types distinguish values this library has validated or produced. Plain strings and byte
arrays are not assignable to them; pass raw input directly to package operations or use a guard when
you need to retain the narrowed type. A brand proves format, not issuance: check your store for that.

- Strings: `UuidString`, `UuidV4String`, `UuidV7String`.
- Direct slugs: `UuidSlug` (either alphabet), `UuidV4Slug`, and `UuidV7Slug`. Masked types stay
  separate because their check bits and lengths are not direct UUID encodings. They cover both
  spellings — `MaskedUuidV7Slug`, `SentinelUuidV7Slug`, and `PublicUuidV7Slug` for
  "masked or sentinel", which is what a masking call returns. `SlugAlphabet` names the two
  alphabets. `UuidBytes` labels one validated 16-byte UUID payload; `UuidV4Bytes` and `UuidV7Bytes`
  retain the generated version. Byte operations return those exact types when they allocate the
  payload, or preserve the caller's exact array subtype when writing into supplied storage.

  A value typed as masked, or as possibly masked, is rejected by direct-slug decoding and freshness
  operations; use the codec that owns its key. Raw strings remain accepted because direct and masked
  base64url spellings overlap, so only the application knows which protocol produced external text.
  V7-only timestamp, freshness, and masking operations likewise reject values already typed as v4
  while continuing to validate raw or version-unknown input at runtime.
  Parsing and direct string/slug conversions preserve a known v4 or v7. Formatting mutable bytes
  returns a version-agnostic value because their contents may have changed since validation.
- Shapes: `UuidSlugCodec` and `UuidSlugCodecOptions`, `MaskSchema`, `MaskSchemaOptions`,
  `AsyncMaskSchemaOptions`, and `CustomMaskSchemaOptions`,
  `UuidV7Sentinel` and `UuidV7SentinelDefinition`, `UuidV7BytesSource`,
  `UuidV7Generator` and `UuidV7GeneratorOptions`, `FreshValidationOptions`,
  `MigrationFormat`, `UuidSlugMigration`, `UuidSlugMigrationOptions`, and `UuidSlugErrorCode`.

**Some masked slugs also pass direct-slug guards.** Canonical trailing bits, version, and variant
can all match by chance. A guard answers "is this well formed", never "is this mine". Decode with
the matching API and look up the candidate; a brand or guard cannot establish issuance.

## API

The **Where** column tells you whether to import a function or call a codec method.

- **codec only.** Uses your configured keys or sentinels.
- **module only.** Import these functions directly. Codec settings do not affect them.

| Method                                                  | Where             | Returns                       | What it does                             |
| ------------------------------------------------------- | ----------------- | ----------------------------- | ---------------------------------------- |
| `uuidV4()` / `uuidV7()`                                 | module only       | `UuidSlugError` or UUID string | Generate.                                |
| `uuidV4Bytes()` / `uuidV7Bytes()`                       | module only       | `UuidSlugError` or typed 16 bytes | Generate owned UUID bytes.            |
| `uuidV4Bytes(out, offset?)` / `uuidV7Bytes(...)`        | module only       | `UuidSlugError` or the exact `out` type | Generate into storage you own.   |
| `uuidV7At(ms)` / `uuidV7BytesAt(ms)` / `uuidV7BytesAt(ms, out, offset?)` | module only | `UuidSlugError \| ...` | Generate at an instant you name. |
| `uuidV4Slug(alphabet?)` / `uuidV7Slug(alphabet?)`       | module only       | `UuidSlugError` or direct slug | Generate and encode in one step.         |
| `uuidV7MaskedSlug()`                                    | codec only        | `UuidSlugError` or `PublicUuidV7Slug` | Generate a masked or sentinel slug. |
| `uuidV7ToMaskedSlug(uuid)` / `maskedSlugToUuidV7(slug)` | codec only        | `UuidSlugError \| ...`        | Masked slug, both ways; v7 only.         |
| `validateMaskedSlugFresh(slug, opts?)`                  | codec only        | `UuidSlugError \| ...`        | Unmask, then check the freshness window. |
| `sentinels`                                             | codec only        | array                         | The reserved values this codec knows.    |
| `migration(options?)`                                 | codec only        | migration reader              | Read selected old formats without changing new output. |
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

Each decoder accepts every value that a supported matching encoder can produce. Masked decoding
always accepts both alphabets, sentinels, and current or previous mask schemas. Migration adds only
the old formats you enable. Forms no supported encoder produces are invalid.

Also exported, all module-level:

- Type guards: `isUuidString`, `isUuidV4String`, `isUuidV7String`, `isUuidSlug`, `isUuidV4Slug`,
  `isUuidV7Slug`, and `isUuidV7Bytes` for 16 bytes you already hold.
- `extractUuidV7Timestamp` — the instant a v7 was minted at, and an error for anything that is
  not a v7, because a v4's first six bytes are random and would otherwise read back as a
  plausible date.
- `createMaskSchema` builds a schema from a seed; `createMaskSchemaAsync` adds cooperative
  cancellation; `createCustomMaskSchema` adapts separate forward and reverse callbacks.
  `PUBLIC_MASK_SCHEMA` is the explicit, published-key choice for deterministic examples.
  `UUID_V7_SENTINEL_DEFINITIONS` is the default sentinel list.
- `createUuidV7Generator(options)` builds a full generator from your own `clock` and `fillRandom`.
  A `generator:` codec option needs only its `uuidV7Bytes` method, so a bytes-only source also works.
  The full generator's options type is `UuidV7GeneratorOptions`. Construction throws `TypeError`
  when either configured callback is not a function; callback failures during generation return
  `UuidSlugError` with the thrown value as `cause`. Do not call the same generator from either
  callback: reentrant generation returns `rng_unavailable` so partially updated sequence state
  cannot emit duplicate identifiers.
- `UuidSlugError`, including code `rng_unavailable` when the runtime has no usable randomness.
  `UuidSlugErrorCode` types the `code` property; `isUuidSlugError` recognizes package errors across
  JavaScript realms and duplicate package copies. `unwrapUuidSlug` opts a success-path call into
  throwing that same error unchanged.

### Codec options

```ts
createUuidSlugCodec({
  mask: { seed: "…", keyIterations: 1 }, // required
  sentinels: [{ name: "nil", uuid: "…" }],
  previousMasks: [{ seed: "…previous seed…" }],
  maskedSlugAlphabet: "base32hex", // masked output and sentinel presentation
  generator: myUuidV7Generator,
});
```

The masked payload is fixed at 132 bits, including a 16-bit check. Both alphabet options default
to `"base64url"`. Readers accept either masked spelling without an alphabet argument. Safe
sentinels use 26-character raw base32hex slugs; old 22-character sentinels remain readable.

To supply a different mixing implementation, call
`createCustomMaskSchema({ id, forward, reverse })`. Each callback receives distinct 16-byte input
bytes and returns either a 16-byte result or `UuidSlugError`; `reverse` must invert `forward` for
every input. A callback may mutate and return its isolated input. The factory copies callback results
into package storage, captures the callbacks in an opaque frozen handle, and rejects invalid results
and failed round-trip probes. Unexpected throws become errors with the thrown value as their cause.
Finite probes cannot prove invertibility, so the caller remains responsible for the complete domain.

```ts
const custom = createCustomMaskSchema({
  id: "existing-scheme",
  forward(input) {
    const output = new Uint8Array(16);
    oldSchema.mix(input, output, true);
    return output;
  },
  reverse(input) {
    const output = new Uint8Array(16);
    oldSchema.mix(input, output, false);
    return output;
  },
});
if (custom instanceof Error) throw custom;
const ids = createUuidSlugCodec({ mask: custom });
```

`createMaskSchema({ seed, keyIterations })` returns an error for invalid seed options.
`createUuidSlugCodec(options)` returns an error for invalid options. Create custom handles before
passing them; an arbitrary object is not a schema.

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
if (codec instanceof Error) throw codec;
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
const reader = ids.migration({ original: true, plain: true });
const uuid = reader.decode(incomingSlug);
if (uuid instanceof Error) throw uuid;
// Look up uuid and check the caller's access to the record.
```

`original` accepts the original fixed permutation/XOR format with its 4-bit checksum.
It does **not** accept the different masked format from package version 0.2.0.
`plain` accepts direct UUID slugs of any version, including old base64url spellings whose
last four bits were ignored. Ordinary `slugToUuid` remains strict about those trailing bits.
Both options must be booleans; malformed reader configuration throws `TypeError` at construction.
Neither option changes generation, ordinary codec methods, keys or sentinels.

`decode` returns one UUID or `UuidSlugError`: sentinels first, then current keys, then enabled
original and plain formats. A successful decode still needs a record lookup. The same slug can
decode to different UUIDs in different formats; the original check has only four bits.

When you know the input format, name it to avoid trying unrelated formats:

```ts
const uuid = reader.decode(oldSlug, "original"); // "plain" or "current" also works
if (uuid instanceof Error) throw uuid;
const replacement = ids.uuidV7ToMaskedSlug(uuid);
if (replacement instanceof Error) throw replacement;
// Keep uuid in the database; use replacement in new links.
```

Enable an old format before selecting it. Recognized sentinels always return their reserved UUID,
including old trailing-bit aliases when reading original or plain slugs.
With literal options, TypeScript offers only `"current"` and the formats enabled with `true`;
options whose values are dynamic remain selectable because they may be enabled at runtime.

For unknown formats, use `candidates` to find the matching record without guessing:

```ts
const candidates = reader.candidates(incomingSlug);
if (candidates instanceof Error) throw candidates;
const matches = candidates.length ? await findRecordsByUuids(candidates) : [];
if (matches.length === 0) throw new Error("ID not found");
if (matches.length !== 1) throw new Error("ID matches multiple records; supply its original format");
const record = matches[0];
// Check access to record before returning it.
```

`findRecordsByUuids` is your database query. Return distinct records by UUID. `candidates`
returns distinct UUIDs in decoding order, or an empty array if none match. Malformed input and
failed mask callbacks return an error. Callback errors keep their cause; they never produce a
successful but incomplete list.
An old sentinel alias can also be a current masked ID. `candidates` retains both UUIDs;
`decode` keeps sentinel priority.

Keep this reader while old inputs must work. Replace it with `ids.migration({ plain: true })`
to stop trying the original mask, or `ids.migration({ original: true })` to stop plain decoding.
`ids.migration()` tries only current keys and sentinels. Removing the migration reader entirely
leaves ordinary codec decoding unchanged. Neither method can identify the issuing format from
the slug alone, so successful decoding is not a reliable count of legacy traffic.

### Rejecting stale ids

```ts
import { validateUuidV7Fresh } from "@anizoptera/uuid-slug";

const ok = validateUuidV7Fresh(uuid, { windowMs: 60_000 });
```

The timestamp must be inside the inclusive interval `now() - windowMs` through
`now() + windowMs`; the default radius is 24 hours. `windowMs` must be finite and nonnegative;
zero and finite fractions are valid. `now` defaults to `Date.now`, must return finite Unix
milliseconds, and is read once per validation. Invalid settings return an error instead of
disabling the check.

`validateUuidV7SlugFresh` starts from a plain slug; `codec.validateMaskedSlugFresh` starts from
a slug decoded with that codec. Successful validation returns the same spelling with its validated
plain or public masked-slug type. This is a symmetric timestamp sanity check, not past-only expiry,
authentication, or replay prevention. Use ordinary decoding for permanent identifiers. For links
with expiration or one-time use, check the stored expiry and consumption state as well.

## Guarantees

These are API contracts. Runtime measurements and their exercised conditions belong in
[`bench/README.md`](bench/README.md); a benchmark pass is not proof of every guarantee.
See [security boundaries](docs/security.md) for entropy failures, custom sources and masking limits.

- **Conformance.** Generated ids have RFC 9562 version and variant bits. A custom generator or
  codec byte source is responsible for honoring its declared contract.
- **Randomness.** Built-in portable generation draws from Web Crypto or `node:crypto`, never
  `Math.random`. Native generation delegates to the platform; a caller-supplied `fillRandom`
  controls its own entropy. Collisions are possible: enforce uniqueness in storage when required.
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
  shorter alphabet, and the value round-trips exactly — but that alphabet runs `A-Za-z0-9-_`, so
  its character order and its value order disagree. Sort by the UUID, or by a timestamp column. A
  masked slug has no chronological ordering in either alphabet.
- **One type for owned bytes.** Without an output buffer, byte generators return a plain
  `Uint8Array`, never a platform-specific subclass. With an output buffer, they return that same
  caller-owned array and write only the requested UUID range.
- **Atomic identifier parsing.** `parseUuid` and `parseUuidSlug` validate the complete identifier
  before writing. Invalid text or destination ranges return an error and leave caller storage
  unchanged.
- **You pay for masking only if you mask.** The keyless operations — generating an id, converting
  between a UUID and a plain slug — reach no codec, so a bundle that imports only those carries
  none of the cipher, key derivation, or sentinel table. Use named imports with a tree-shaking
  bundler; loading the complete module namespace does not promise that removal.
- **Masking is explicit.** A codec requires private mask options or a package-produced schema
  handle. The published-key schema is available only as `PUBLIC_MASK_SCHEMA`; omission never
  selects it.

## Runtime

No runtime dependencies, on any platform.

- **Bun** loads the published TypeScript source and uses `Bun.randomUUIDv7` for current-time
  generation. Explicit timestamps use the portable generator to preserve the requested instant.
  Tooling that opts into
  the `development` condition loads the same source.
- **Node** uses native `crypto.randomUUID`, and native `crypto.randomUUIDv7` where the
  version provides it, otherwise the bundled v7 generator.
- **Browsers and Deno** use optimized browser-safe JavaScript and Web Crypto.

## License

Apache-2.0. Copyright 2026 Anizoptera and Art Shendrik.
