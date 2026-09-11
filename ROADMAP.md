# Roadmap

## HLD boundary

- [ ] Preserve every published identifier, accepted format, default, and caller-visible failure unless Art explicitly rules otherwise.
- [ ] Escalate any proposed public capability, input limit, or compatibility change with measured consequences; derive internal seams, types, tests, and optimizations from the existing contracts.

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
- [ ] Exercise public functions from untyped JavaScript with nulls, proxies, throwing getters, foreign realms, detached buffers, shared buffers, subclasses, and forged branded shapes; distinguish returned failures from allowed throws.
- [ ] Audit duplicate-package interoperability for errors and mask handles without treating structural recognition as authenticity.
- [ ] Audit every exported symbol for a concrete caller job, required visibility, tree-shaking cost, release promise, and simpler composition that could replace it.

### Security and trust

- [ ] Map which inputs are trusted configuration, untrusted identifier text, secret material, native output, injected callback output, and cross-package handles; verify each boundary once at its owner.
- [ ] Audit masking claims for confidentiality limits, offline guessing, checksum false acceptance, key rotation, sentinel leakage, chosen-input behavior, and denial-of-service through schema count or derivation work.
- [ ] Audit entropy and seed handling for copies, retention, zeroization limits, snapshots, process forks, workers, shared memory, and accidental publication in errors, docs, maps, or artifacts.
- [ ] Audit attacker-controlled length, iteration, key-list, sentinel-list, and malformed-input work for bounded CPU, memory, allocation, and diagnostics.
- [ ] Measure seed, previous-mask, and sentinel scaling through geometric mechanism boundaries; derive dominated ranges before proposing any public limit.
- [ ] Decide whether resource growth needs a structural fix, a documented boundary, or a public limit from security, responsiveness, compatibility, and caller demand; escalate only if the best complete solution changes caller-visible behavior.

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
- [ ] Audit concurrent calls, nested callbacks, worker isolation, duplicate modules, mutable runtime instrumentation, and every module-level cache or scratch buffer for interference.
- [ ] Audit memory lifetime and cleanup for pools, seeds, derived keys, sentinels, callback-retained arrays, message ports, continuations, temporary candidates, and failed construction.
- [ ] Audit startup and import behavior for eager entropy, eager derivation, hidden I/O, environment capture, side effects, source maps, and bundle-specific dead code.
- [ ] Audit package condition order and resolution under Node, Bun, Deno, browsers, bundlers, CommonJS interop, development source, and default fallback without claiming lanes that were not executed.

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
- [ ] Audit README examples, declaration examples, benchmarks, and test helpers as executable consumers; reject examples that compile while teaching unsafe or incompatible use.
- [ ] Audit probabilistic and statistical tests for explicit hypotheses, discriminating controls, stable thresholds, sample limits, and deterministic alternatives.
- [ ] Audit every timeout as a hang bound rather than a readiness oracle; verify every asynchronous test waits on the actual completion signal.
- [ ] Audit cleanup after success, expected failure, assertion failure, cancellation, and process termination so one case cannot contaminate another lane.
- [ ] Compare test names and assertions with the defect each can catch; split bundled claims and remove assertions that cannot change a maintenance decision.

### Findings, fixes, and closure

- [x] Prevent reentrant UUIDv4 entropy callbacks from overwriting shared scratch bytes and returning duplicate identifiers; preserve the allocation-free ordinary path.
- [x] Remove probabilistic no-collision tests that contradict the published collision contract and add no package-controlled evidence beyond source, pool, and generator-state tests.
- [x] Draw only UUIDv7's ten random payload bytes when seeding and four on same-millisecond increments instead of discarding 60–75% of each entropy draw.
- [ ] Record each credible defect with exact evidence, consequence, strongest rival explanation, and the observation that can overturn it.
- [ ] For each proven defect, enumerate distinct live fixes across API shape, type constraint, invariant, algorithm, data structure, runtime seam, test oracle, and deletion; compare hybrids by caller burden, correctness, compatibility, work, and owned complexity.
- [ ] Add the smallest red reproducer before fixing a bug; prove it fails because the intended defect is reachable, then keep it only if its marginal value exceeds its rent.
- [ ] Fix proven defects with the smallest complete design; run the narrowest valid falsifiers and commit each self-contained change with explicit files.
- [ ] Re-audit affected callers, declarations, docs, runtime paths, tests, and cross-language behavior after every semantic fix.
- [ ] Run packed-consumer, declaration, runtime, artifact, interoperability, performance, and full repository checks required by the final state.
- [ ] Re-read every changed line and nearby comment; remove redundant work, stale claims, shadow sources, completed plan state, and any verifier that did not earn its place.
- [ ] Search every contract owner by subject terms after the implementation review so different wording cannot hide a conflicting rule or duplicate source of truth.
- [ ] Pair every roadmap criterion with its concrete instrument and result; leave no completion mark supported only by code reading or a green aggregate.
- [ ] State the strongest surviving uncertainty and the exact observation that would change each final verdict; never convert unexecuted environments into a universal claim.
- [ ] Audit the audit itself for narrowed searches, truncated output, unchecked files, shared-origin evidence, stale generated output, and conclusions stronger than their instruments.
