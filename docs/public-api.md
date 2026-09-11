# Public interface design

Design the public interface so the easiest call is correct, validated values stay distinct, failures are actionable, and successful hot paths do only the work the caller requested.

This document owns how TypeScript and Rust public interfaces are formed. README owns consumer
promises, [design.md](design.md) owns the wire format, [security.md](security.md) owns trust
boundaries, and [cross-language.md](cross-language.md) owns parity and distribution.

## Decision order

Apply these priorities in order: tell the truth, bound harm, preserve published contracts, reduce
caller burden, then broaden capability. Never buy convenience by weakening an earlier priority.

For every public part, name the consumer job that fails without it. Remove the part when existing
operations compose into that job without extra caller state, repeated validation, hidden runtime
work, or an easy wrong turn. Implementation convenience does not justify caller burden.

Count interface cost by everything a caller must learn or coordinate: concepts, invariants,
configuration, ordering, failures, effects, performance, and plausible wrong paths. Symbol count
alone misses that burden, and every observable choice becomes a compatibility obligation for every
future caller.

Before selecting or changing a public concept, map the independent caller-visible axes and their
values, inversions, extremes, and important interactions. Keep candidates only when caller behavior
differs; a counterexample that the map cannot express requires a new axis and another comparison.
State the consumer job, constraints, core assumption, and earliest observable signal expected if
that assumption is correct before implementation. Keep the selected shape's constraints, rejected
live alternatives, and invalidating assumption beside its declarations; connect wider consequences
in their durable owner and keep discarded exploration transient.

## Shape

- Name every public and internal operation for the domain action it performs. Use one term for one
  behavior and one behavior for one term; encode direction, unit, and ownership where callers or
  maintainers otherwise have to remember them. When a rename breaks callers or compilation, repair
  the model and every dependent use from that meaning. Never restore an opaque legacy name merely
  to make a gate pass. Use explicit operation values instead of Boolean direction flags.
- Put complexity behind the smallest interface that covers the consumer job. Prefer one obvious
  operation over a sequence that makes callers coordinate package state.
- Keep keyless transformations and generation as module functions. Put keys, sentinels, rotation,
  masked timestamp validation, and migration on the codec that owns that configuration.
- Keep mutable sequence state in generators and immutable configuration in codecs. Let a codec
  depend on the smallest capability it needs—one `generateUuidV7Bytes` operation—and validate that result
  at the codec seam instead of requiring a full generator or trusting an asserted brand.
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
- Hide implementation seams until two real adapters or a consumer-visible capability need them.
  Tests exercise the same public interface as callers unless an internal seam is required to prove
  a runtime path.

### UUID text and bytes

Keep UUID text/binary conversion directional and version-neutral:

- `uuidToBytes` converts canonical UUID text to 16-byte storage; `bytesToUuid` converts 16 bytes to
  canonical UUID text. Source and destination names remove the parse/format ambiguity, while
  version-neutral names remain correct for every UUID version.
- Accept `Uint8Array` and its subtypes. Exclude `ArrayBuffer`, `DataView`, and array-like values:
  their offset, view, and ownership meanings would make the operation ambiguous. Preserve a
  caller-owned output subtype and write only after full validation; return plain `Uint8Array` for
  package-owned bytes.
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
- Give a codec only the byte-producing function it consumes. The optional
  `generateUuidV7Bytes` callback accepts a detached generator method directly; a one-method source
  object would add a concept without adding an invariant. Create the default generator lazily so a
  codec used only to encode or decode pays no generator allocation.
- Name codec operations for both action and object: `generateSlug`, `encodeUuid`, `decodeSlug`,
  `decodeSlugToBytes`, and `validateSlugTimestamp`. Name migration operations `decodeSlug` and
  `decodeSlugCandidates` because detached readers must still identify their input.
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

- Return `UuidSlugError` for expected data, entropy, clock, configuration, and injected-callback
  failures. Reserve thrown exceptions for programmer errors that the declared interface excludes.
- Keep one error class with stable, actionable codes. Codes guide different recovery actions without
  multiplying runtime types; do not publish subclasses or operation-specific error-code generics
  when they add no data or behavior and would make a newly reachable code a source break. Validate
  configuration at construction when possible; preserve the original cause when an external
  capability fails.
- Provide one opt-in helper that returns the exact success type and throws a recognized package
  error unchanged. Keep the underlying operations as errors-as-values so recoverable callers retain
  explicit control; do not duplicate every operation into a throwing interface.
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
- Do not perform work merely because configuration or an implementation makes it available. Each
  parse, allocation, copy, entropy draw, hash, schema attempt, import, and system call must serve
  the selected operation and must be reused when one result satisfies several checks.
- Keep successful common paths free of exception-driven capability detection, repeated schema
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
- Keep the reason for a non-obvious shape beside its declaration. Name the realistic wrong turn or
  alternative it prevents and the condition that would justify revisiting it; a shorter comment
  that says only what the signature already says is a regression.
- Preserve semantic units when editing comments. Compare the old and new claims, then remove only
  repetition, session history, implementation trivia, or detail already obvious from the
  declaration. Keep wire obligations, ownership, ordering, security limits, and error behavior at
  the declaration where a caller encounters them.
- Write in public tokens and plain language. Link to a detailed owner when the full mechanism is too
  large, but keep the decision-relevant reason inline.
- Review each changed comment in the built declarations against its declaration and owning
  contract; comment presence does not prove accuracy.

## Proof

For each changed interface, state the consumer job, the misuse or work eliminated, the selected
shape, its rejected live alternatives, and the strongest remaining trade-off. Then prove the
applicable links:

- declaration inference and rejection with the TypeScript floor and current compiler;
- direct behavior and failure paths in Node and Bun;
- actual adapter selection in Deno and a browser when that path can differ;
- packed export resolution and use from an extracted consumer;
- shared TypeScript and Rust contract cases for cross-language behavior;
- allocation, operation, and latency measurements for performance claims;
- API baseline and release classification for consumer-visible change.

A passing gate licenses only the paths and failure modes it can observe. Remove a test that merely
repeats another test's evidence, and add a seam or runtime probe when no existing instrument can
reach the claim.
