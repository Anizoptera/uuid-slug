# Public interface design

Design the public interface so the easiest call is correct, validated values stay distinct, failures are actionable, and successful hot paths do only the work the caller requested.

This document owns how TypeScript and Rust public interfaces are formed. README owns consumer
promises, [design.md](design.md) owns the wire format, [security.md](security.md) owns trust
boundaries, and [cross-language.md](cross-language.md) owns parity and distribution.

## Rules

Design from caller code, not implementation convenience. Every concept, option, failure, effect,
and wrong turn becomes work at every call site for the life of the API.

Apply these rules in order. A later rule MUST NOT weaken an earlier one.

1. Names, types, results, and errors must state only what the code enforces. Otherwise
   callers build on a false promise.
2. Let types reject invalid combinations. Validate external data once at the
   public boundary. Expose state and side effects so failures stay local and predictable.
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
- Put complexity behind the smallest interface that covers the consumer job. Prefer one obvious
  operation over a sequence that makes callers coordinate package state.
- Keep keyless transformations and generation as module functions. Put keys, sentinels, rotation,
  masked timestamp validation, and migration on the codec that owns that configuration.
- Keep mutable sequence state in generators and immutable configuration in codecs. Keep
  cryptographic entropy behind the package runtime so public generation cannot accept weaker bytes.
- Use `this: void` when a public method has no receiver semantics. This lets callers detach the
  method safely and prevents compatible implementations from adding hidden receiver state.
- Use an overload only when it preserves one operation and makes the common call shorter without
  creating ambiguous argument meaning. Use an options object when independent optional axes would
  otherwise become positional.
- Make defaults safe and cheap. Require an explicit choice for secrets, lossy behavior, migration,
  additional accepted forms, expensive work, or weaker guarantees.
- Keep public concepts orthogonal. Selecting a slug alphabet must not select a mask, migration
  policy, entropy source, or runtime adapter.
- Require each codec sentinel to have a nonempty unique application name and unique UUID so every
  entry exposed through `codec.sentinels` identifies one reserved value without caller repair.
  Reject ambiguity before building arrays or lookup maps so every representation selects the same
  definition.
- Hide implementation seams until two real adapters or a consumer-visible capability need them.
  Tests exercise the same public interface as callers unless an internal seam is required to prove
  a runtime path.

### UUID text and bytes

Keep UUID text/binary conversion directional and version-neutral:

- `uuidStringToBytes` converts canonical UUID text to 16-byte storage; `bytesToUuidString` converts 16 bytes to
  canonical UUID text. Source and destination names remove the parse/format ambiguity, while
  version-neutral names remain correct for every UUID version.
- Accept `Uint8Array` and its subtypes. Exclude `ArrayBuffer`, `DataView`, and array-like values:
  their offset, view, and ownership meanings would make the operation ambiguous. Preserve a
  caller-owned output subtype and write only after full validation; return plain `Uint8Array` for
  package-owned bytes.
- Use `byteOffset` for the zero-based start of a 16-byte UUID read from a larger array, and
  `outputOffset` for its write position in caller-owned storage. Omission means zero. Equivalent
  read and write operations must explain this contract with the same terms in each overload's
  declaration documentation.
- Keep generic, v4, and v7 byte guards together. The generic guard proves only the 16-byte shape;
  version guards also prove their version and RFC variant bits.
- Do not add aliases before a published contract needs a migration path. Before 1.0, make an
  approved breaking rename directly so one consumer job has one name and one interface.

### Generation and codecs

- Name keyless generation with `generate` plus the produced representation. Keep
  `generateUuidV4`, `generateUuidV4Bytes`, `generateUuidV4Slug`, `generateUuidV7`,
  `generateUuidV7Bytes`, `generateUuidV7At`, `generateUuidV7BytesAt`, and
  `generateUuidV7Slug` at module scope; use the same UUIDv7 names on a generator so a detached
  method remains self-explanatory.
- Create the default generator lazily so a codec used only to encode or decode pays no generator
  allocation. Codec generation uses that package-owned source; callers encode externally produced
  UUIDs through `uuidStringToSlug` instead of replacing the codec's entropy source.
- Name codec operations by source and destination: `generateUuidSlug`, `uuidStringToSlug`,
  `uuidBytesToSlug`, `uuidSlugToString`, `uuidSlugToBytes`, `extractUuidSlugTimestamp`, and
  `validateUuidSlugTimestamp`. Keep text and byte inputs separate so each name and input type state
  the representation and the successful route avoids representation dispatch. Name migration
  operations `uuidSlugToString` and `uuidSlugToStringCandidates` because detached readers must still identify
  their input.
- Use `outputAlphabet` for the codec writer choice. It selects emitted slug spelling; it does not
  constrain readers, which infer and accept both supported spellings.
- Require callers to provide `maxTimestampDeltaMs` for every timestamp-window check. Read the
  optional numeric `referenceUnixMs` once, defaulting only that observation to `Date.now()`; do not
  embed an application tolerance or callback protocol in validation.

## Types and validation

- Define each closed vocabulary once as an `as const` runtime value and derive its union type from
  that value. Export the value when consumers need to validate, enumerate, document, or present the
  members; keep a type-only union only when no runtime use exists. Never maintain parallel literal
  lists in types, validators, and tests.
- Accept ergonomic raw input at the package seam, validate it once, and return the narrowest type
  established by that successful operation. Keep format, UUID version, direct or masked spelling,
  and ownership distinctions when consumers use them.
- Make invalid combinations unrepresentable when TypeScript can infer the distinction without a
  cast or annotation. Do not move runtime-only uncertainty into elaborate caller-facing generics.
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
  unmarked value, use `Error.isError` when available and the cross-realm intrinsic Error tag
  otherwise, then require the package error name and a known code. Do not add `instanceof` to
  package-owned result handling. Remeasure the marker when supported engines change Error layout
  or recognition capabilities.
- Return `UuidSlugError` for every caller-caused or recoverable failure. Package-owned interfaces
  carry failures as values; adapt and contain exception-based dependencies at their boundary.
- Keep one error class with stable, actionable codes. Codes guide different recovery actions without
  multiplying runtime types; do not publish subclasses or operation-specific error-code generics
  when they add no data or behavior and would make a newly reachable code a source break. Validate
  configuration at construction when possible; preserve the original cause when an external
  capability fails.
- Put `UuidSlugError` in a return type only when a well-typed call can fail. Codec construction
  can fail on valid TypeScript input, such as a short seed or a duplicate sentinel, so its type
  carries the union. `createUuidV7Generator` and `createMigrationDecoder` cannot, so their types
  do not; malformed untyped input still gets a returned error, stated at the declaration. Forcing
  every TypeScript caller to narrow a value that is never an error is the worse trade, and
  widening a return type later breaks every caller, so settle this before the call ships.
- Classify sentinel-list shape and name identity as `invalid_sentinel`. Keep malformed UUID text as
  `invalid_uuid`, a wrong UUID version as `invalid_uuid_version`, and duplicate UUID compatibility
  unchanged; these failures require different caller repairs.
- Make validation and conversion deterministic and side-effect free. Generation may consume
  entropy and advance its owned sequence state; failed operations must not publish partial output
  or corrupt the next attempt.
- Keep bounded synchronous work synchronous. Provide cooperative asynchronous work and
  cancellation when derivation can monopolize a host task; do not add promises, scheduling, or
  reactive state to operations that complete as bounded local computation.
- Keep codecs immutable and shareable. Keep mutable generation state inside its generator so
  callers do not coordinate hidden codec locks.

## Capabilities and runtime work

- Preserve the union of useful host capabilities behind one semantic interface. Detect optional
  native capabilities once, use the cheapest valid path, and retain a portable fallback with the
  same result and error meaning.
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
- Keep the safe operation as the default. Add an explicitly named unsafe variant only when repeated
  public-route measurements show a substantial consumer benefit that retained checks prevent. State
  the lost protection at the declaration, constrain every remaining invariant in its types, and
  never select the unsafe variant implicitly.
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
- Document every configuration property at that property. Use `@defaultValue`, `@returns`, and
  `@remarks` only when the tag makes editor help clearer than plain prose; a tag that
  repeats the declaration is noise.
- Review each changed comment in the built declarations against its declaration and owning
  contract; comment presence does not prove accuracy.

## Proof

For each changed interface, state the consumer job, the misuse or work eliminated, the selected
shape, its rejected live alternatives, and the strongest remaining trade-off. Then prove the
applicable links:

- declaration inference for current names and options, plus compiler rejection of removed ones;
- direct behavior and each construction invariant or failure path in Node and Bun;
- actual adapter selection in Deno and every browser engine selected by the check workflow when that
  path can differ;
- packed export resolution and use from an extracted consumer;
- shared TypeScript and Rust contract cases for cross-language behavior;
- allocation, operation, and latency measurements for performance claims;
- API baseline and release classification for consumer-visible change.

A passing gate licenses only the paths and failure modes it can observe. Remove a test that merely
repeats another test's evidence, and add a seam or runtime probe when no existing instrument can
reach the claim.
