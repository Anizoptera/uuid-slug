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

Before selecting or changing a public concept, map the independent caller-visible axes and their
values, inversions, extremes, and important interactions. Keep candidates only when caller behavior
differs; a counterexample that the map cannot express requires a new axis and another comparison.
State the consumer job, constraints, core assumption, and earliest observable signal expected if
that assumption is correct before implementation. Keep the selected shape's constraints, rejected
live alternatives, and invalidating assumption beside its declarations; connect wider consequences
in their durable owner and keep discarded exploration transient.

## Shape

- Put complexity behind the smallest interface that covers the consumer job. Prefer one obvious
  operation over a sequence that makes callers coordinate package state.
- Keep keyless transformations and generation as module functions. Put keys, sentinels, rotation,
  masked freshness, and migration on the codec that owns that configuration.
- Use an overload only when it preserves one operation and makes the common call shorter without
  creating ambiguous argument meaning. Use an options object when independent optional axes would
  otherwise become positional.
- Make defaults safe and cheap. Require an explicit choice for secrets, lossy behavior, migration,
  additional accepted forms, expensive work, or weaker guarantees.
- Keep public concepts orthogonal. Selecting a slug alphabet must not select a mask, migration
  policy, entropy source, or runtime adapter.
- Hide implementation seams until two real adapters or a consumer-visible capability need them.
  Tests exercise the same public interface as callers unless an internal seam is required to prove
  a runtime path.

## Types and validation

- Accept ergonomic raw input at the package seam, validate it once, and return the narrowest type
  established by that successful operation. Keep format, UUID version, direct or masked spelling,
  and ownership distinctions when consumers use them.
- Make invalid combinations unrepresentable when TypeScript can infer the distinction without a
  cast or annotation. Do not move runtime-only uncertainty into elaborate caller-facing generics.
- Capture string inputs generically and reject a captured brand that proves the representation or
  UUID version cannot satisfy the operation. Keep bare strings accepted because `string` does not
  extend any narrower brand: widening has erased the value's origin, and external strings need the
  runtime validator. Tuple-wrap the conditional check so one invalid member rejects a whole known
  union instead of distributively preserving its other members. Revisit this only if TypeScript can
  retain erased provenance or the package stops accepting external text at its validation seam.
- Use `unknown` only for genuinely unbounded external input or caught values, then narrow it at the
  nearest seam. Do not use `any` in the public surface.
- Preserve caller-owned byte-array subtypes and commit caller storage only after complete success.
  Return plain `Uint8Array` for package-owned bytes.
- Use structural checks where values can cross realms or duplicate package copies. An
  `instanceof` fast path is acceptable only when the same interface has a correct cross-realm path
  and measurement shows the fast path removes meaningful work.
- A brand proves only the property the package checked. Never imply issuance, authenticity,
  freshness, ownership, or secrecy from syntax alone.

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
