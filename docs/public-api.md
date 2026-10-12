# Public interface design

Design the public interface so the easiest call is correct, validated values stay distinct, failures are actionable, and successful hot paths do only the work the caller requested.

This document owns how TypeScript and Rust public interfaces are formed. README owns consumer
promises, [design.md](design.md) owns the wire format, [security.md](security.md) owns trust
boundaries, and [cross-language.md](cross-language.md) owns parity and distribution.

## UUID slug vocabulary

| Term | Exact representation | Invariants | Public naming |
| --- | --- | --- | --- |
| UUID text | Default output is 36-character hyphenated lowercase text; callers may request uppercase. Parsers also accept compact text, UUID URNs, brace-wrapped text, and mixed case. | [RFC 9562 §4](https://www.rfc-editor.org/rfc/rfc9562.html#section-4) permits uppercase, lowercase, and mixed case; it does not choose a default case. This package emits lowercase by default to give each UUID one stable spelling, match common UUID implementations, and align with lowercase base32hex. | `UuidString`, `UuidV4String`, `UuidV7String`; parameter `uuid` on universal converters and `uuidString` on text-only operations. |
| UUID bytes | Exactly 16 bytes for a standalone value; an explicit offset selects 16 bytes from a larger array. | Successful owned output is a plain `Uint8Array`. Caller-owned output is returned unchanged by identity and is not written on failure. | `UuidBytes`, `UuidV4Bytes`, `UuidV7Bytes`; parameter `uuid` on universal converters and `uuidBytes` on byte-only operations. |
| Plain UUID slug | 22 unpadded base64url characters or 26 lowercase base32hex characters. | Keyless and lossless for any UUID. It contains all 128 UUID bits. Noncanonical padding and spellings are rejected. | `PlainUuidSlug`, `PlainUuidV4Slug`, `PlainUuidV7Slug`; parameter `plainUuidSlug` when the source must be known. |
| Masked UUIDv7 slug | 22 base64url characters or 27 lowercase base32hex characters. | Requires its masking codec, carries the UUIDv7 payload plus a 16-bit check, and keeps a configured 2^42-millisecond UUIDv7 timestamp range. It proves format integrity, not issuance. | `MaskedUuidV7Slug`; parameter `maskedUuidSlug` when the source must be known. |
| Sentinel UUIDv7 slug | A configured UUIDv7 written as its ordinary 22- or 26-character plain slug. | It is a plain slug, not a masked payload. Every plain-slug operation accepts it. A masking codec only preserves its spelling when writing masked results. | `SentinelUuidV7Slug`; masking results use `MaskedOrSentinelUuidV7Slug`. |

`base64url` and `base32hex` name alphabets, not value kinds. A length selects the alphabet only
where the accepted formats have distinct lengths. A 22-character value can be both a valid plain
slug and a valid masked slug for different UUIDs. A masking codec reads it as masked when it
passes the codec's check and as plain otherwise; the keyless root always reads it as plain, and a
source-specific operation applies the meaning the caller states.

- A **UUIDv7 masking codec** is the immutable object that owns a mask, previous masks, sentinels,
  and its masked-slug alphabet. `codec` alone is never sufficient as a public name or prose referent.

Every public name must make sense alone in unrelated code. Do not rely on its receiver, import path,
README, or repository. Keep words that identify the UUID form or result. Remove words that add no
meaning. Use `uuidToString`, not `uuidRepresentationToUuidString` or `uuidToUuidString`.
Apply the same test to methods, types, parameters, properties, options, and callbacks. A name must
state what its value controls when another valid interpretation exists. Use `maskedSlugAlphabet`,
not `outputAlphabet`, because the option selects masked UUID-slug output rather than every output.
Keep a shorter name only when the declaration still has one possible meaning when read alone.
Do not repeat a term across both sides of a conversion name. Keep the shared term on the destination
when the source still names exactly one API form. Use `plainSlugToUuidString`,
`maskedSlugToUuidBytes`, `plainToMaskedUuidSlug`, and `maskedToPlainUuidSlug`. Do not copy full type
names into both sides of an operation.

Rust uses the same domain terms with Rust spelling and ownership conventions. Use
`UuidSlugAlphabet`, `UuidV7Mask`, `UuidV7MaskingCodec`, `PlainUuidSlug`, and
`MaskedUuidV7Slug` wherever the type system can preserve the distinction. Associated constructors
use `from_…`, borrowed views use `as_…`, owned conversions use `to_…`, and fallible domain actions
use the same `generate_…`, `derive_…`, `extract_…`, and `validate_…` verbs as TypeScript. Do not
copy TypeScript's `…To…` shape into Rust, and do not shorten `plain_uuid_slug` or
`masked_uuid_v7_slug` to `slug` where both forms exist. A qualified call such as
`Uuid::from_plain_uuid_slug` must still identify the accepted representation without nearby prose.
Fields and Boolean options follow the same rule: `masked_slug_alphabet`,
`accept_plain_uuid_slug`, and `accept_original_masked_slug` state exactly what they control.

Rust may use an idiomatic receiver or standard trait only when it leaves one meaning. `Display` may
produce canonical lowercase hyphenated UUID text because that is `Uuid`'s documented display form.
`FromStr` may accept supported UUID text because its target type fixes the result. Neither trait
justifies a generic public helper such as `parse_slug`, `encode_uuid`, `decode_slug`, `slug`, or
`timestamp`; those names hide a representation, masking requirement, or unit that changes the call.

Rust returns `PlainUuidSlug`, `MaskedUuidV7Slug`, or `MaskedOrSentinelUuidV7Slug` instead of an
untyped `String`. Each type exposes `as_str()` and `AsRef<str>` without allocation, dereferences to `str`, implements
`Display`, and converts into `String` without copying the slug bytes. Scalar slug types implement
`Borrow<str>`; the enum does not because its equality and hashing include the variant. Keep construction private so
only validated canonical output receives these types. Use the enum variant when a masking codec can
return either a masked payload or a sentinel's plain slug; do not erase that distinction merely to
make two strings fit one collection.

Use the same vocabulary for parameters: `uuid` accepts any UUID form supported by the operation,
`plainUuidSlug` accepts only a plain UUID slug, `maskedUuidSlug` accepts a masked UUIDv7 slug or
registered sentinel, and `uuidSlug` is reserved for readers that intentionally accept several
UUID-slug formats. Use
`alphabet`, `textCase`, `output`, `outputOffset`, and `window` only for those exact choices.

Use each verb for one action: `…To…` converts, `generate…` creates a UUID or slug, `create…` builds
a reusable object, `derive…` makes a mask from a seed, `extract…` reads a field, `validate…` checks
a rule and returns its normalized value, and `is…` is a type guard. Do not use different verbs for
the same action. A verb does not replace a needed UUID form, version, result, or unit.
Conversion methods accept values already in their result form. They validate and normalize them.
On a masking codec, every universal converter reads a 22-character slug as masked when it passes
the codec's check and as plain otherwise; the requested destination never changes that reading.

The root API has no mask. Its `uuidToString`, `uuidToBytes`, and `uuidToPlainSlug` functions accept
UUID text, UUID bytes, or either plain-slug alphabet. They cannot read or write masked slugs.

A `UuidV7MaskingCodec` owns the key required for masked slugs. Its `uuidToString`, `uuidToBytes`,
`uuidToPlainSlug`, and `uuidToMaskedSlug` methods accept UUID text, UUID bytes, both plain-slug
alphabets, both masked-slug alphabets, and registered sentinels. Only `uuidToMaskedSlug` requires
UUIDv7. Source-specific methods apply the meaning the caller states; `plainToMaskedUuidSlug` keeps
a plain reading that the codec's check would otherwise claim as masked.

Keep this codec distinct from `UuidV7Generator`. The generator owns mutable clock and sequence
state. The codec owns immutable masks, retained masks, sentinels, and masked spelling. Stateless
conversion and inspection remain root functions; an unkeyed codec would only duplicate them.

## Rules

Design from caller code, not implementation convenience. Every concept, option, failure, effect,
and wrong turn becomes work at every call site for the life of the API.

Apply these rules in order. A later rule MUST NOT weaken an earlier one.

1. Names, types, results, and errors must state only what the code enforces. Otherwise
   callers build on a false promise.
2. Let types reject invalid combinations. Validate external data once at the
   public boundary. Expose state and side effects so failures stay local and predictable.
   Accept every recoverable, unambiguous equivalent input. The implementation must make
   normalization safe, deterministic, bounded, and negligible-cost; difficulty never moves that
   burden to callers. Normalize once and return one stable form. Keep already-normalized input on
   the least-work path. Reject only different meaning or ambiguity.
   Separate runtime acceptance from TypeScript guidance. Validate arbitrary JavaScript inputs and
   return `UuidSlugError` for invalid input; this does not remove the generation exception in
   §Failures and effects. TypeScript signatures accept every supported UUID form, reject a
   branded value when its known form or UUID version makes the call invalid, and infer every
   version, case, slug kind, and output-ownership fact proved by the call. Widen types only to
   support useful caller operations, not merely to match JavaScript's broader acceptance.
   Do not expose `unknown` just because implementations accept it.
3. Preserve every visible behavior after release, or provide a migration. Hiding
   an implementation detail now is cheaper than supporting it forever.
4. Provide the fewest independent operations that cover real caller jobs.
   Remove any part that adds no capability. The obvious call must be correct, and a simple job must
   need one simple call.
5. Use the best available host capability behind one result, with a
   compatible fallback. Hidden parsing, allocation, or fallback work compounds across every call.
6. Compile caller code, run failure paths, inspect the packed
   package, and measure real operations. Reading the implementation proves none of these.

Before selecting a shape, map independent caller-visible axes and the interactions that change
behavior. Compare live alternatives and combinations. Put the caller contract in public JSDoc.
Keep implementation constraints, rejected alternatives, and invalidating assumptions in nearby
non-JSDoc comments; keep exploration transient.

Model concrete call sites before naming or adding a public part: keyless one-off conversion,
repeated masked writes, current and rotated-key reads, old-format migration, caller-owned buffer
writes, untyped JavaScript input, and known-source resolution of an ambiguous slug. Judge each name
where a consumer constructs, destructures, stores, passes, and calls it outside this package. A
public part that does not shorten or secure one of those jobs has no reason to exist.

Before editing, inventory every root export, type, overload, parameter, option, callback, property,
literal, default, result, error, side effect, ownership rule, package entry, and runtime variant.
Start from the shortest correct caller code for each job. Each retained part must serve a job that
fails without it. The generated declaration baseline records signatures; it does not prove that the
interface is complete, useful, or clear.

## Shape

### Package entries

- Keep the root entry as the complete API. Named imports must tree-shake to the requested domain
  across supported bundlers.
- Add a subpath only when packed consumers prove that it enables useful tree shaking the root cannot
  provide. Startup timing or a lower direct module count alone does not justify permanent API surface.
- Preserve native ESM and module seams. Consumer bundlers already remove unused root exports;
  bundling this package first would hide those seams from them.
- A public condition must select different output or guard an incompatible lower condition. Put
  `deno` before `development` and `node`: Deno activates `node` and may activate `development`.
  Deno loads the published TypeScript graph directly, so do not route it through compiled ESM.
  Bun MUST load TypeScript normally. If it loads compiled public JavaScript directly, `#runtime`
  MUST still select the Bun TypeScript adapter and native primitives. Use the private map for adapters.

- Name every public and internal operation for the domain action it performs. Use one term for one
  behavior and one behavior for one term; encode direction, unit, and ownership where callers or
  maintainers otherwise have to remember them. Names MUST NOT claim visibility, safety, security,
  or provenance unless the interface enforces that property. When a rename breaks callers or
  compilation, repair the model and every dependent use from that meaning. Never restore an opaque
  legacy name merely to make a gate pass. Use explicit operation values instead of Boolean direction
  flags.
- Write the shortest realistic detached call before choosing a name. Include the constructor,
  destructuring or callback handoff, and the call with ordinary variable names. A cold reader must
  identify the operation, accepted value, affected output, unit, and ownership from that snippet.
  If two interpretations remain, add the missing domain term. If none remain, remove repeated words.
  Apply this test to every method, type, parameter, property, option, callback, and returned field.
- Re-run those call sites after each rename. A compiler repair is valid only when it preserves the
  original source meaning; a generic converter cannot replace a source-specific operation where one
  runtime spelling has multiple valid meanings.
- Use `Uuid` in TypeScript identifiers, `uuid` for values, and `UUID` in prose. Functions start with
  the caller's action. Add source, destination, unit, version, ownership, or timing when its absence
  makes the call ambiguous. Types and properties name the value represented. Callbacks name the
  result they must produce. Terms such as `data`, `item`, `handle`, `process`, and `value` need a
  domain meaning that is clear at the declaration.
- Put complexity behind the smallest interface that covers the consumer job. Prefer one obvious
  operation over a sequence that makes callers coordinate package state.
- Prefer destination-led `uuidTo…` methods that accept every input form the implementation can
  distinguish safely. Split by source only when the same runtime value can produce different valid
  UUIDs and no available bit or requested destination resolves which one the caller means.
- Infer UUID text, bytes, plain base32hex, and masked base32hex by validated structure. For
  22-character base64url on a masking codec, run the configured mask check first and the plain
  decoder only after every mask rejects the text. TypeScript brands cannot resolve that final
  overlap because brands do not exist at runtime.
- Use `generateUuidV7WithPlainSlug` or `maskingCodec.generateUuidV7WithMaskedSlug` when storage needs UUID text and a
  slug for the same identifier. Both results come from one generated byte payload.
- `uuidToString`, `uuidToBytes`, `uuidToPlainSlug`, and `uuidToMaskedSlug` cover ordinary
  conversions in one call. Generate or decode bytes once and derive only the requested result; do
  not make callers compose package operations or eagerly allocate every representation.
- Plain conversion preserves all 128 bits and accepts every UUID version and variant. Never apply
  UUIDv7 timestamp validation or the masked timestamp limit to a plain slug operation.
- Keep keyless transformations and generation as module functions. Put keys, sentinels, rotation,
  masked timestamp validation, and migration on the masking codec that owns that configuration.
- A raw 22-character base64url value can be both a valid plain slug and a valid masked slug for
  different UUIDs. On a masking codec the masked reading wins whenever the codec's check passes; a
  plain slug passes that check by chance at the rate `docs/design.md` §Encoding and decoding
  states. Source-specific methods let a caller state known provenance; migration readers expose
  ordered candidates when provenance is unavailable.
- Masked UUIDv7 writers preserve the UUID timestamp. They store it as an offset from
  `timestampRangeStartUnixMs` and return `invalid_timestamp` outside the resulting inclusive
  `2^42`-millisecond range. The default start is zero. Registered sentinels are never masked; like every plain
  UUID slug, they retain the full 48-bit UUIDv7 range.
- Keep mutable sequence state in generators and immutable configuration in codecs. Default
  generation uses package-selected cryptographic entropy. Custom entropy requires a separately
  named call whose callback fills the complete requested array or returns `UuidSlugError`.
- Use `this: void` when a public method has no receiver semantics. This lets callers detach the
  method safely and prevents compatible implementations from adding hidden receiver state.
- Use an overload only when it preserves one operation and makes the common call shorter without
  creating ambiguous argument meaning. Use an options object when independent optional axes would
  otherwise become positional.
- Name a Boolean option for the behavior that `true` enables. Use a semantic union when both values
  are choices rather than enable and disable states.
- Make defaults safe and cheap. Require an explicit choice for secrets, lossy behavior, migration,
  additional accepted forms, expensive work, or weaker guarantees.
- Keep public concepts orthogonal. Selecting a slug alphabet must not select a mask, migration
  policy, entropy source, or runtime adapter.
- Require each masking-codec sentinel to have a nonempty unique application name and unique UUID so
  every entry exposed through `maskingCodec.sentinels` identifies one reserved value without caller repair.
  Reject ambiguity before building arrays or lookup maps so every representation selects the same
  definition.
- Hide implementation seams until two real adapters or a consumer-visible capability need them.
  Tests exercise the same public interface as callers unless an internal seam is required to prove
  a runtime path.

### UUID text and bytes

Keep UUID text/binary conversion directional and version-neutral:

RFC 9562 permits uppercase, lowercase, or mixed-case hexadecimal digits. Package output defaults to
lowercase with hyphens. Every operation that returns UUID text accepts `"uppercase"` or its
`UUID_TEXT_UPPERCASE` constant; use
`UUID_TEXT_LOWERCASE` when code needs to carry the default as an explicit reusable choice.

- `uuidStringToBytes` accepts mixed-case canonical text, compact 32-digit hexadecimal text,
  `urn:uuid:` followed by canonical text, and canonical text enclosed by `{` and `}`. The URN
  prefix is case-insensitive. Wrappers cannot nest and cannot contain compact text. `bytesToUuidString`
  converts 16 bytes to hyphenated UUID text in the selected case. Source and
  destination names remove the parse/format ambiguity, while version-neutral names remain correct
  for every UUID version.
- Apply `UuidTextCase` only to UUID text. It never changes slug alphabets, UUID bytes, masking,
  sentinel identity, migration selection, or accepted input. A function with another output choice
  accepts the case preset in the first unambiguous position, so callers do not construct options or
  pass `undefined` merely to request uppercase UUID text.
- Writers default to lowercase hyphenated UUID and lowercase base32hex text. UUID readers and
  `isUuidText` guards accept every UUID spelling listed above; `isUuidString` guards test normalized
  lowercase hyphenated text. Output brands retain the selected normalized form; text-guard brands
  retain validity and version without claiming normalization. Base32hex readers accept mixed case. Base64url remains
  case-sensitive.
- Export `NIL_UUID` and `MAX_UUID` as canonical `UuidString` values. They are useful boundaries and
  sentinels, but neither value claims UUIDv4 or UUIDv7 semantics.
- Keep RFC example UUIDs in documentation and tests. A named runtime export would turn a fixture
  into a package concept without helping callers generate, validate, inspect, or convert a UUID.
- Do not publish UUID registries owned by external protocols such as Bluetooth or COM. Their names,
  assignments, and release cadence belong to those protocols rather than UUID representation.
- Do not publish precomputed plain slugs for `NIL_UUID` or `MAX_UUID`. Callers that repeatedly need
  one can convert it once, while dedicated exports would duplicate values already derived by the
  public conversion API.
- `uuidV7StringBounds` and `uuidV7ByteBounds` return the inclusive lowest and highest RFC-variant UUIDv7
  values for one millisecond or an inclusive millisecond interval. They construct search keys and
  never generate identifiers. Their range meaning requires comparison in UUID wire-byte order;
  masked slugs, base64url text, and SQL Server `uniqueidentifier` ordering do not satisfy it.
- Do not publish whole-version UUIDv4 or UUIDv7 endpoint constants. No caller job needs them, and
  the variant bits sit inside the UUID, so one lowest-to-highest range also contains values outside
  the RFC variant. Timestamp bounds remain useful because the timestamp occupies the leading bits.
- Accept `Uint8Array` and its subtypes, an exact 16-byte `ArrayBuffer`, and a `DataView` whose
  declared range is exactly 16 bytes. A `DataView` makes its range explicit, so it can select a UUID
  inside a larger buffer without a copy. Apply explicit input offsets only to `Uint8Array`. Reject
  other typed arrays and array-like values because their element and coercion semantics are not UUID
  byte semantics. Preserve a caller-owned output subtype and write only after full validation;
  return plain `Uint8Array` for package-owned bytes.
- Use `byteOffset` for the zero-based start of a 16-byte UUID read from a larger array, and
  `outputOffset` for its write position in caller-owned storage. Omission means zero. Equivalent
  read and write operations must explain this contract with the same terms in each overload's
  declaration documentation. Runtime readers treat `0` as omission on standalone forms, which need
  no offset. This runtime tolerance does not require a TypeScript offset overload. Accept a non-zero
  `byteOffset` only with `Uint8Array` input: every other accepted form holds exactly one UUID, so an
  offset beside one is a caller mistake and returns `invalid_options`. On a masking codec a non-zero
  offset read has no masked spelling to resolve and returns exactly what the keyless reader returns;
  an offset of `0` must still take the codec's own path, because reading a masked slug as plain
  returns a different UUID.
- Keep generic, v4, and v7 byte guards together. The generic guard proves only the 16-byte shape;
  version guards also prove their version and RFC variant bits.
- Do not add aliases before a published contract needs a migration path. Before 1.0, make an
  approved breaking rename directly so one consumer job has one name and one interface.

### Generation and codecs

Ordinary generation defaults must not pay for additional guarantees the caller did not request.

Every default hot path uses the corresponding proper native implementation's guarantees as its
ceiling. Trust native results without extra result validation, trust tracking, or repairs for
stronger package guarantees. Offer stronger guarantees only through explicit configurable paths.
Correct conflicting specifications and tests before implementation; no further approval is needed
for this correction. This does not remove caller-input validation or change identifier wire formats.

Default generation needs no stronger guarantees than correctly implemented primary qualified
rivals provide. Establish those guarantees from their implementations and behavior, not names or
existing package tests. Offer additional guarantees through optional configured generation;
an implementation convention is not a reason to reject an otherwise correct faster default.
When proper native behavior conflicts with a default guarantee, correct that guarantee and its
tests instead of rejecting native output. Measure implementation differences without imposing
stronger default requirements; existing tests cannot override the native baseline.

Choose defaults for end-user performance and resource efficiency across measured trade-offs.
Preserve identifier formats, secure entropy, caller ownership, input validation, and failure handling;
revise any default guarantee that exceeds the corresponding proper native implementation.
An unanswered guarantee proposal or an agent-derived constraint does not extend those contracts.
Measure native timestamp advancement and explain its consumer consequences; do not reject native
generation solely to enforce the unapproved promise that a timestamp never runs ahead of the clock.
Use the existing created-generator controls for callers needing ordering, clock policy, or payload
layout, rather than making ordinary calls pay for those controls or adding a duplicate switch.

- Generate only UUIDv4 and UUIDv7. Keep parsing, version inspection, and plain conversion generic
  for every structurally valid UUID version. Do not add generation, constants, bounds, fields,
  guards, or helpers for another version. Reconsider that boundary only after concrete demand and
  a maintainer ruling.
- Name keyless generation with `generate` plus the produced representation. Keep
  `generateUuidV4`, `generateUuidV4Bytes`, `generatePlainUuidV4Slug`, `generateUuidV7`,
  `generateUuidV7Bytes`, `generatePlainUuidV7Slug`, and `generateUuidV7WithPlainSlug` at module
  scope. The same UUIDv7 text and byte names belong on a generator, so a detached method remains
  self-explanatory. Their `at` option replaces separate current-time and explicit-time names.
- Give every UUID-text generator, decoder, normalizer, validator, masking-codec method, and migration
  reader the same optional `UuidTextCase` choice. Preserve lowercase as the no-argument path and
  infer a case-specific result type from either named preset.
- Create the default generator lazily so a masking codec used only to encode or decode pays no generator
  allocation. Each representation generator may instead receive a created generator when its fraction,
  counter, rollback, entropy, or payload-layout state must span different output forms.
- Keep created generators on preserve-order rollback behavior by default. An explicit reset or
  error policy includes the maximum total clock skew it tolerates from the accepted high-water
  reading. Failed clock and entropy operations leave sequence and clock state unchanged.
- Keep module-level UUIDv7 generation on the fastest validated secure path for each output form; it
  does not coordinate sequence state across calls. Callers explicitly create a generator when they
  need strict ordering, clock policy, fraction bits, custom entropy, or one stable payload layout.
  Pass that generator in the existing representation call; do not generate bytes and convert them.
- Inspect the four-bit UUID version through `extractUuidVersion` or Rust `Uuid::uuid_version`.
  TypeScript returns `UuidVersion`, the exact `0..15` union. The result does not prove that the
  variant or version is valid for another operation.
- A UUIDv7 masking codec exposes `uuidToString`, `uuidToBytes`, `uuidToPlainSlug`, and
  `uuidToMaskedSlug` for ordinary conversions. It also exposes explicit plain and masked source
  methods for callers who know the source meaning and must not let the codec's check override it.
- Name generation `generateMaskedUuidV7Slug` and `generateUuidV7WithMaskedSlug`. Name migration
  operations `uuidSlugToUuidString` and `uuidSlugToUuidStringCandidates` because those readers
  intentionally accept several stored UUID-slug formats.
- Use `maskedSlugAlphabet` for the masking-codec writer choice. It selects emitted slug spelling; it does not
  constrain readers, which infer and accept both supported spellings.
- Require callers to provide `maxTimestampDeltaMs` for every timestamp-window check. Read the
  optional numeric `referenceUnixMs` once, defaulting only that observation to `Date.now()`; do not
  embed an application tolerance or callback protocol in validation.
- Keep direct functions as the least-work path for one-shot calls. Also provide an opt-in immutable
  parsed UUID for workflows that inspect or convert one UUID repeatedly. It owns its validated UUID
  data. UUID bits alone determine equality; attached construction context only presets later calls.
  Structural masking codecs are untrusted callbacks: isolate private bytes, validate returned
  representations, and contain exceptions with their causes. Trust only package-created immutable
  codecs to borrow private storage; a matching interface does not establish ownership.
- Keep parsed construction symmetric. The top-level parser accepts keyless UUID forms and may
  receive a masking codec to accept that codec's masked forms; the masking codec exposes the same
  operation with itself preset. Equivalent calls accept the same forms, return the same parsed UUID,
  and report the same failures. A generator may generate that parsed value directly, but it does not
  participate in parsing an existing UUID.
- Apply that symmetry to every operation with a reusable owner. A top-level call receiving an
  explicit masking codec or generator and the corresponding owner method with that owner preset must
  accept the same remaining inputs, select the same defaults and runtime path, return the same type,
  expose the same effects, and report the same failures. Do not accept an owner where its state
  cannot affect the operation.
- Immutable UUIDv7 generation uses one options object because generation time, generator state, and
  retained masking are independent choices. The top-level call accepts `at`, `generator`, and
  `maskingCodec`; generator and masking-codec methods omit only their preset owner. An explicit
  `at` fills a configured fraction field from the supplied instant and joins a created generator's
  sequence and rollback state. Module-level `at` calls remain uncoordinated.
- Preserve useful immutable construction context in the parsed UUID. A UUID parsed through a masking
  codec may omit that codec from later masked conversions; an unbound UUID must provide one. An
  explicit codec on a later call overrides the preset. Never retain a generator in a UUID: its
  mutable clock, entropy, sequence, and rollback state cannot affect an identifier already produced.
  A UUID generated through a generator retains an immutable copy of that generator's payload layout
  for later payload inspection; other UUIDs must provide the layout. Types must distinguish
  calls with and without each preset so omission is rejected before runtime.
- Retaining a masking codec keeps its key-bearing state reachable for the parsed UUID's lifetime.
  Only explicit construction with that codec may incur this retention. Serialization preserves the
  UUID value but not codec, payload layout, source spelling, or other construction context, so a
  value reconstructed from serialized data is unbound.
- Keep equality and ordering outside the API. Normalize known plain input with `uuidToString`, then
  compare canonical text or bytes; masked input first needs its codec and can be ambiguous without
  provenance. One comparator cannot hide those different meanings honestly.
- Keep generation one identifier at a time. Callers can bound a loop or reuse caller-owned storage;
  a batch helper cannot choose a safe allocation, scheduling, or cancellation limit for them.
- Keep base64url and base32hex as the only slug alphabets. They cover compact URL output and
  case-insensitive sortable output; arbitrary alphabets create private wire formats. Base58 has
  the same 22-character UUID length as base64url, and avoiding look-alike characters does not
  justify a third wire format without concrete demand for IDs that people transcribe manually.
- Keep extracted timestamps in Unix milliseconds. Explicit generation accepts a
  Unix-millisecond `number` or `bigint`, a `Date`, zoned ISO timestamp text, an object with
  `epochMilliseconds` or `epochNanoseconds`, or a `{ seconds, nanoseconds }` timestamp. Normalize
  each form once. Store its containing Unix millisecond and preserve the best sub-millisecond
  fraction the selected UUIDv7 payload layout can represent. A layout with no fraction bits ignores
  only that unrepresentable remainder; callers must not pre-truncate it. Reject text without a time
  zone and conflicting structural fields. Decode optional UUIDv7 payload fields
  only under caller-supplied bit widths because the UUID does not identify its generator or layout.
  Return a Method 3 fraction as its exact value and width; a floating timestamp would hide its
  quantization. Keep every undeclared payload bit as an uninterpreted integer instead of guessing.
  Do not return a `Date`; that would add mutable allocation and lose no caller conversion work.
- A fractional Unix-millisecond number near the current epoch distinguishes all 12 UUIDv7 fraction
  bits, although it cannot preserve an arbitrary nanosecond timestamp. Keep the payload layout
  explicit and stable across runtimes; capability detection may select a clock implementation, but
  it must not silently change stored UUID semantics.
- Successful calls on one generator strictly increase in UUID byte order under the default
  preserve policy, including calls with `at`. The counter continues through equal fraction buckets and clock
  rollback, then carries into the logical fraction and millisecond fields. Reset may move backward
  after its tolerance.
- A structural generator is untrusted. Read and validate its byte method and payload layout before
  generation, validate its result as UUIDv7, and reject output earlier than explicit `at` at the
  fraction width that layout declares. Later output is valid because ordering can advance logical time.
- Module-level text, byte, and paired plain-slug helpers do not share sequence state. Select each
  representation's fastest validated secure runtime or portable path without converting through a
  slower representation.
- Keep standalone operations with complete names. Function properties and representation
  namespaces would duplicate them and make detached names less clear.
- Keep one error-value path. Nullable and throwing duplicates discard diagnostics or split control
  flow without adding a recovery action. A thrown `rng_unavailable` from argument-free or
  preset-only generation is no duplicate: those calls have no error-value path.
- Keep representation-specific generation functions and the paired UUID-plus-slug operation. Each
  function accepts the same `at` and `generator` options, so recorded time and shared state do not
  multiply the function matrix or require an intermediate conversion. A
  universal output selector would retain unrelated formatters behind one function and move the
  selected representation into runtime configuration.

## Types and validation

- Define every member of a closed vocabulary once as a semantic scalar constant and derive its
  union type from those constants. Export each constant that callers pass or compare. Export an
  iterable collection only for a documented iteration workflow; its positions are never identifiers.
  Never maintain parallel literal lists in types, validators, and tests.
- Reject unknown enumerable own string keys in package-owned public options before applying defaults.
  A typo must return the owning operation's configuration error instead of silently selecting
  another clock, alphabet, mask, migration reader, sentinel definition, or timestamp window. Make
  each runtime key map exhaustive against the public options type so either side cannot drift.
- Accept plain records from any realm, including records with a null prototype. Reject arrays and
  objects with host or class behavior instead of silently reading them as empty options.
- Accept ergonomic raw input at the package seam, validate it once, and return the narrowest type
  established by that successful operation. Keep format, UUID version, plain or masked spelling,
  and ownership distinctions when consumers use them.
- Every public identifier, configuration, and selector string input accepts primitive strings and
  genuine `String` objects. This includes UUIDs and slugs, timestamp text, mask seeds and labels,
  sentinel names, and migration formats. Normalize a wrapper once with
  `String.prototype.valueOf.call(value)`, which
  works across realms without invoking caller-defined coercion hooks. Keep primitive strings on the
  direct path. TypeScript continues to guide callers to primitive strings because its structural
  `String` type cannot prove a genuine wrapper. String guards remain primitive-only because
  narrowing an object to a branded primitive would be unsound.
- Make invalid combinations unrepresentable when TypeScript can infer the distinction without a
  cast or annotation. Do not move runtime-only uncertainty into elaborate caller-facing generics.
- Infer non-default text case and retained configuration only from supplied runtime arguments.
  Omission must keep its real default even with explicit generics or reusable typed options.
- Accept a union when every member supports the requested operation. Test mixed UUID versions,
  mixed presets, text/byte inputs and optional configuration directly; separately valid branches
  do not prove that TypeScript can call their union. Infer parsed results from the actual receiver;
  widening a receiver must not let a borrowed method claim another UUID version or missing preset.
- Buffer writes preserve storage identity and useful array subtypes, but invalidate prior UUID
  brands. A mutable array's old brand cannot describe the bytes another writer replaces.
- Parsing an existing immutable UUID must preserve its known capabilities when the runtime retains
  them. Reject every known non-v7 parsed value at v7-only operations, not just UUIDv4.
- Name generics by their job: `Input` captures a value for branded validation, while `Output`
  preserves the exact caller-owned byte-array subtype returned after a successful write.
- Capture string and byte inputs generically and reject a captured brand that proves the
  representation or UUID version cannot satisfy the operation. Keep unbranded values accepted:
  widening has erased their origin, so the runtime validator must judge them. Tuple-wrap the
  conditional check so one invalid member rejects a whole known union instead of distributively
  preserving its other members. Revisit this only if TypeScript can retain erased provenance or
  the package stops accepting external values at its validation seam.
- Use `unknown` only for genuinely unbounded external input or caught values, then narrow it at the
  nearest seam. Do not use `any` in the public surface.
- Use structural checks where values can cross realms or duplicate package copies. An
  `instanceof` fast path is acceptable only when the same interface has a correct cross-realm path
  and measurement shows the fast path removes meaningful work.
- A brand proves only the property the package checked. Never imply issuance, authenticity,
  timestamp validity, ownership, or secrecy from syntax alone.

## Failures and effects

- Make compatible calls compose without intermediate error unwrapping. Design each composition
  to accept the preceding call's success or failure and propagate an existing failure unchanged,
  so callers handle it where they choose to recover or report it. Preserve the original error
  object and its diagnostics; a failed input must skip the receiving operation's conversion,
  callbacks, entropy draws, and output writes. Caller argument expressions still run before a
  JavaScript function receives them.
- Separate cross-boundary recognition from local intermediate narrowing. Composable inputs use the
  marker and cross-realm ladder; results created by a package-local primitive use `instanceof Error`
  after the input seam has already returned foreign failures. Do not make successful local bytes pay
  the general protocol detector again. Isolate each compatibility rung so an inaccessible marker or
  hostile proxy cannot suppress a later independent recognition path.
- Prove composition in both JavaScript execution and TypeScript types. Exercise successful chains,
  unchanged error identity, and skipped downstream work; compile compatible calls without casts
  or intermediate guards and reject incompatible representations and UUID versions. TypeScript
  brands and overloads do not remove JavaScript validation or runtime work.
- Select error checks for the values callers actually pass, and minimize their cost when no error
  is present. Compare error recognition directly; input validation is a separate operation and
  cannot substitute for that comparison. For package-produced values, evaluate marker-only
  recognition without adding native-error, name, or code checks. Add a check only for a stated
  consumer requirement; spoof resistance is not an assumed requirement for composition.
- Compare marker key, marker value, property placement, and read operation independently. Include
  a reserved-looking string such as `__failure`, a package-specific string, and a shared symbol;
  compare own and prototype properties. Neither a short key nor an unusual spelling proves speed
  or uniqueness. Keep the selected spelling and meaning consistent across package copies, and
  expose narrowing without requiring callers to know the marker's storage details.
- Benchmark the actual candidate error layouts and standalone detectors, then their complete
  composed calls. Keep marker-only checks separate from marker-plus-verification checks. State
  any difference in accepted values before comparing performance; compatibility checks are a
  separate cost, not an automatic addition. Preserve diagnostics and error identity, and test
  inference separately from JavaScript behavior. Follow `bench/README.md` for runtime coverage,
  repetitions, and failure controls; a predicate microbenchmark cannot establish total call cost.
- Mark every `UuidSlugError` through one immutable prototype property named `__failure`. Test that
  marker first with `=== true`; its meaning is package failure routing, not authentication. For an
  unmarked value, test local `instanceof Error` first, then use `Error.isError` when available or the
  cross-realm intrinsic Error tag otherwise; finally require the package error name and a known code. Put a
  successful operation's existing string or byte check before this general detector so ordinary
  calls pay no marker or Error-brand read. Remeasure when supported engines change Error layout or
  recognition capabilities.
- Return `UuidSlugError` for every caller-caused or recoverable failure. Package-owned interfaces
  carry failures as values; adapt and contain exception-based dependencies at their boundary.
  Throw only `rng_unavailable` from argument-free or preset-only generation when generation cannot
  obtain secure randomness. These calls return identifiers directly; document the exception with
  `@throws`. Validate a preset before drawing so untyped misuse still returns its error value.
- Keep the stack trace on every `UuidSlugError`. Omit it only where the stack carries no
  information, never to make a failure cheaper; failures are not a performance target.
- Name each error code for the caller's recovery action. Each message identifies the failed
  condition, includes the safe offending value or bound when it helps, and gives the correction
  when the caller can act. Preserve external failures in `cause`; do not guess what caused them.
  Messages are diagnostics, not stable branch keys. A failed call must publish no partial output
  or state.
- Keep one error class with stable, actionable codes. Codes guide different recovery actions without
  multiplying runtime types; do not publish subclasses or operation-specific error-code generics
  when they add no data or behavior and would make a newly reachable code a source break. Validate
  configuration at construction when possible; preserve the original cause when an external
  capability fails.
- Put `UuidSlugError` in the return type only when a well-typed call can return it. Masking-codec and
  UUIDv7-generator construction accept numeric settings whose valid ranges TypeScript cannot
  express, so their types carry the union. Migration-reader construction without options returns
  the reader directly. Configured construction carries the union because typed objects can contain
  extra keys or throwing accessors. Check construction once before reusing the reader.
  Argument-free and preset-only generation returns identifiers directly; failure to obtain secure
  randomness is thrown. Every
  generation call with an explicit time, a generator, caller-owned output, or custom entropy keeps
  the union, as do generator and masking-codec methods, whose custom clocks and configured
  timestamp ranges can fail.
  Forwarded options may be undefined: that branch keeps the ordinary default's result and effect.
  A union containing configured and default calls therefore carries error values and may also throw
  `rng_unavailable` on its default branch. Do not invent retained configuration from that branch.
- Classify sentinel-list shape and duplicate names or UUIDs as `invalid_sentinel`. Keep malformed
  UUID text as `invalid_uuid` and a wrong UUID version as `invalid_uuid_version`; these failures
  require different caller repairs.
- Make validation and conversion deterministic and side-effect free. Generation may consume
  entropy and advance its owned sequence state; failed operations must not publish partial output
  or corrupt the next attempt.
- Keep bounded synchronous work synchronous. Provide cooperative asynchronous work and
  cancellation when derivation can monopolize a host task; do not add promises, scheduling, or
  reactive state to operations that complete as bounded local computation.
- Keep codecs immutable and shareable. Keep mutable generation state inside its generator so
  callers do not coordinate hidden masking-codec locks.

## Capabilities and runtime work

Performance protection constrains an authorized change; it does not authorize an optimization
project. Follow [root agent guidance](../AGENTS.md#work-scope) before experiments, including those proposed for a
correctness repair or release audit. Missing performance evidence is not a release prerequisite.

- Keep defenses against adversarial caller behavior, such as replaced buffer methods, off default
  generation, parsing, conversion and buffer writes. Ordinary callers must not pay for them.
  Additional hardening requires an explicit request and a non-default path; a misuse probe alone
  justifies neither a new API nor labeling the default unsafe. State the added protection and cost.
  Preserve input validation, secure randomness, caller ownership and wire integrity. Retain requested
  hardening only when repeated evidence on every affected runtime shows no normal-call speed or
  resource regression; unresolved cost is not permission to retain it.
- Preserve the union of useful host capabilities behind one semantic interface. Detect optional
  native capabilities once, use the cheapest valid path, and retain a portable fallback with the
  same result and error meaning.
  When the native call is faster, minimize the complete path to it before trying to match it in
  TypeScript. Choose separately for each runtime and output; compare wrapper, conversion and
  resource costs, not just the native function in isolation.
- A fallback may lose only a property the public contract explicitly leaves unpromised. Expose a
  material capability difference instead of silently reducing every runtime to the weakest host.
- Specify the full fallback order for each capability-dependent operation before implementing it:
  each alternative names its availability condition, accepted inputs, result and error meaning,
  fallback trigger, and terminal outcome when no alternative works. Combine complementary
  capabilities where that satisfies the caller's job with less work; use alternatives only where
  capabilities overlap. A portable implementation may be the first choice when measurements favor
  it. Native availability alone does not make an operation preferable.
- Select available implementations once where possible, and test each selected and fallback
  implementation directly. Distinguish unavailable capability, recoverable execution failure,
  and invalid caller input; retry only the failures the operation's contract permits. Never turn
  an ordinary negative error check into a search through progressively broader detectors unless
  the accepted-error contract requires that search. A marker check needing no optional capability
  needs no capability fallback. Keep useful stronger capabilities available without forcing
  callers to configure runtime selection or pay for capabilities their operation does not use.
- Do not perform work merely because configuration or an implementation makes it available. Each
  parse, allocation, copy, entropy draw, hash, mask attempt, import, and system call must serve
  the selected operation and must be reused when one result satisfies several checks.
- Keep successful common paths free of exception-driven capability detection, repeated mask
  derivation, duplicate validation, unnecessary allocation, runtime dependencies, and work for
  opt-in features.
- Measure the consumer-sized operation and the runtime that owns it. Bulk throughput, a different
  adapter, or a green aggregate cannot justify a hot-path claim.

## Compatibility

- Preserve every issued identifier and every input produced by a supported matching encoder.
  Options may add accepted forms but must not remove existing ones.
- Treat names, types, overload priority, defaults, accepted inputs, outputs, errors, side effects,
  performance characteristics, package exports, and runtime selection as interface promises.
- Add a public part only with its consumer consequences and release classification. Remove a
  published part only through the governed deprecation and migration policy.
- Keep TypeScript and Rust semantics aligned without forcing either language into the other's
  conventions. A language-specific interface difference must preserve the same accepted domain,
  result meaning, ownership, and failure behavior.

## Declaration comments

Public declaration comments are part of the interface: they must let a caller choose and use an
export without reconstructing its contract from implementation code.

- Give every root export and public interface member caller-facing JSDoc. State the accepted value,
  result, error or side effect, and boundary that can change the caller's decision.
  Cover overload families, public types and callbacks; include defaults, ownership, ordering, limits and misuse.
  Equivalent operations use the same terms, TSDoc fields and order unless their contracts differ.
- Explain a non-obvious public shape in caller terms: the choice it affects, the misuse it prevents,
  and the public condition that would change the advice. Keep internal alternatives, measurements,
  dispatch, and implementation constraints out of JSDoc and in nearby non-JSDoc comments.
- Preserve semantic units when editing comments. Compare the old and new claims, then remove only
  repetition, session history, implementation trivia, or detail already obvious from the
  declaration. Relocate useful implementation reasoning to the nearest owning non-JSDoc comment;
  never erase it merely because it does not belong in public docs. Keep wire obligations, ownership,
  ordering, security limits, and error behavior at the declaration where a caller encounters them.
- Write in public tokens and plain language. Link to a detailed owner when the full mechanism is too
  large, but keep the decision-relevant reason inline.
- Document every configuration property at that property. Use `@param`, `@defaultValue`, `@returns`, and
  `@remarks` only when the tag makes editor help clearer than plain prose; a tag that
  repeats the declaration is noise.
  Use prose, examples or tables when they explain a workflow better; non-public declarations may use TSDoc for useful editor help.
- Review each changed comment in the built declarations against its declaration and owning
  contract; comment presence does not prove accuracy.

## Proof

For each changed interface, state the consumer job, the misuse or work eliminated, the selected
shape, its rejected live alternatives, and the strongest remaining trade-off. Then prove the
applicable links:

- declaration inference for current names and options, plus compiler rejection of removed ones;
- union calls and optional-options forwarding, with incompatible branded members, missing presets
  and borrowed receivers rejected for the intended reason;
- plain behavior and each construction invariant or failure path in Node and Bun;
- actual adapter selection in Deno and every browser engine selected by the check workflow when that
  path can differ;
- packed export resolution and use from an extracted consumer;
- language-service help for each changed public symbol and execution of every produced bundle;
- shared TypeScript and Rust contract cases for cross-language behavior;
- allocation, operation, and latency measurements for performance claims;
- API baseline and release classification for consumer-visible change.

A passing gate licenses only the paths and failure modes it can observe. Remove a test that merely
repeats another test's evidence, and add a seam or runtime probe when no existing instrument can
reach the claim.
