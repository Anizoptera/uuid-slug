# Roadmap

## Current audit

### Scope and contracts

- [ ] Inventory every TypeScript source, runtime adapter, build entry, declaration, test helper, test, benchmark, and verification script.
- [ ] Map each public export and observable behavior to README guarantees, public API rules, wire design, security boundaries, and cross-language contracts.
- [ ] Separate public contract, intended internal invariant, measured optimization, and unsupported assumption; flag conflicts instead of choosing silently.
- [ ] Check for unfinished TODOs, placeholders, dead branches, orphaned helpers, stale comments, unused exports, and duplicate sources of truth.

### Public API and type system

- [ ] Audit names, parameter order, overloads, options, defaults, return values, errors, side effects, ownership, and detached-method behavior from cold caller code.
- [ ] Audit every brand for the exact runtime proof it represents; reject false provenance, stale mutable brands, accidental widening, and impossible narrowing.
- [ ] Audit generic inference, unions, overload priority, variance, readonly promises, literal preservation, and JavaScript escape paths.
- [ ] Audit invalid combinations for compile-time rejection without blocking valid unbranded input at runtime validation seams.
- [ ] Audit closed vocabularies for one runtime source, exhaustive types, validation parity, declaration output, and consumer discoverability.
- [ ] Audit expected failures for stable actionable codes, preserved causes, cross-realm recognition, and no exception-driven normal control flow.
- [ ] Audit public JSDoc against signatures and behavior for accepted values, failure boundaries, security limits, ordering, units, and ownership.
- [ ] Compile source, emitted declarations, and packed consumers separately; prove important negative type tests fail for the intended diagnostic.

### Core implementation

- [ ] Audit UUID parsing, formatting, byte offsets, canonical spelling, version/variant checks, atomic writes, subtype preservation, and cross-realm byte views.
- [ ] Audit base64url/base32hex encoding and decoding across lengths, invalid characters, padding bits, tail bits, offsets, aliasing, and native fallbacks.
- [ ] Audit UUIDv4/v7 generation across clock bounds, fractional and hostile clocks, rollback, sequence rollover, entropy failure, native validation, and atomic output.
- [ ] Audit codec construction, lazy generation, immutable state, key order, sentinel names/UUIDs/slugs, collision handling, and callback failure containment.
- [ ] Audit masking for injectivity, tag placement, schema isolation, custom callback mutation/retention, wrong-key rejection, and all supported spellings.
- [ ] Audit key derivation for seed byte meaning, Unicode chunk boundaries, iteration bounds, sync/async equivalence, cancellation, cooperative progress, and partial publication.
- [ ] Audit migration readers for enabled-format authority, candidate order, deduplication, sentinel priority, retained aliases, ambiguity, and no writer-policy leakage.
- [ ] Audit cryptographic primitives against independent vectors, integer-width semantics, endianness, reentrancy, shared scratch state, and unsupported security claims.
- [ ] Audit numeric operations for NaN, infinities, fractions, signed zero, coercion, overflow, precision loss, and boundary arithmetic.
- [ ] Audit mutation and aliasing for caller-owned arrays, package-owned outputs, subarrays, buffers, shared buffers, callback inputs, cached state, and frozen wrappers.

### Runtime and performance

- [ ] Audit Node, Bun, and web capability discovery separately for module-load timing, secure-context gaps, version drift, binding, malformed native results, and fallback parity.
- [ ] Audit entropy pooling for refill boundaries, direct large draws, zeroization, import-time draws, worker/process isolation, reentrancy, and retained random material.
- [ ] Audit hot paths for avoidable parsing, allocation, copies, schema attempts, entropy calls, clock reads, exceptions, imports, and repeated capability probes.
- [ ] Measure only consumer-sized operations on the runtime that owns each path; distinguish latency, throughput, startup, memory, and fallback costs.
- [ ] Check async work for real host yielding, cancellation latency, starvation, cleanup, deterministic settlement, and absence of readiness sleeps.

### Tests and verification

- [ ] Assign every test and gate a material defect, independent oracle, production link, decision point, and marginal value beyond types or existing checks.
- [ ] Remove or merge tests that only confirm existence, restate implementation, duplicate another oracle, test a double, or bind harmless refactors.
- [ ] Check positive, negative, boundary, malformed, adversarial, state-transition, differential, metamorphic, property, and regression coverage where each can expose a distinct defect.
- [ ] Check Node and Bun suites for equivalent intended coverage and runtime-specific branches; verify browser/Deno claims through their actual packaged paths.
- [ ] Check deterministic isolation under supported parallel and isolated modes; hunt shared globals, order dependence, leaked instrumentation, timing guesses, and skipped cases.
- [ ] Measure per-case, fast-lane, hook, complete-lane, startup, setup, cleanup, and repeated-resource cost; redesign any verifier that misses its decision window.
- [ ] Challenge test oracles with targeted mutations or removed guards; reject false-green tests and tests failing for unrelated diagnostics.
- [ ] Audit scripts and package gates for exit-code trust, empty corpora, partial batches, duplicated work, wrong cwd/toolchain, generated-file drift, and misleading aggregate passes.
- [ ] Verify artifact contents, export conditions, tree shaking, npm dependency absence, declaration/API baselines, and extracted consumer resolution.
- [ ] Verify TypeScript/Rust conformance corpora vary every claimed axis per case and do not repeat construction failures across irrelevant dimensions.

### Findings, fixes, and closure

- [x] Prevent reentrant UUIDv4 entropy callbacks from overwriting shared scratch bytes and returning duplicate identifiers; preserve the allocation-free ordinary path.
- [ ] Record each credible defect with exact evidence, consequence, strongest rival explanation, and the observation that can overturn it.
- [ ] For each proven defect, enumerate distinct live fixes across API shape, type constraint, invariant, algorithm, data structure, runtime seam, test oracle, and deletion; compare hybrids by caller burden, correctness, compatibility, work, and owned complexity.
- [ ] Add the smallest red reproducer before fixing a bug; prove it fails because the intended defect is reachable, then keep it only if its marginal value exceeds its rent.
- [ ] Fix proven defects with the smallest complete design; run the narrowest valid falsifiers and commit each self-contained change with explicit files.
- [ ] Re-audit affected callers, declarations, docs, runtime paths, tests, and cross-language behavior after every semantic fix.
- [ ] Run packed-consumer, declaration, runtime, artifact, interoperability, performance, and full repository checks required by the final state.
- [ ] Re-read every changed line and nearby comment; remove redundant work, stale claims, shadow sources, completed plan state, and any verifier that did not earn its place.
