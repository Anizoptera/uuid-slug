# Roadmap

## HLD boundary

- [x] Preserve every published identifier, accepted format, default, and caller-visible failure unless Art explicitly rules otherwise.
- [x] Escalate any proposed public capability, input limit, or compatibility change with measured consequences; derive internal seams, types, tests, and optimizations from the existing contracts.

## Current audit

### Scope and contracts

- [x] Inventory every TypeScript source, runtime adapter, build entry, declaration, test helper, test, benchmark, and verification script.
- [x] Map each public export and observable behavior to README guarantees, public API rules, wire design, security boundaries, and cross-language contracts.
- [x] Separate public contract, intended internal invariant, measured optimization, and unsupported assumption; flag conflicts instead of choosing silently.
- [x] Check for unfinished TODOs, placeholders, dead branches, orphaned helpers, stale comments, unused exports, and duplicate sources of truth.

### Public API and type system

- [x] Audit names, parameter order, overloads, options, defaults, return values, errors, side effects, ownership, and detached-method behavior from cold caller code.
- [x] Audit every brand for the exact runtime proof it represents; reject false provenance, stale mutable brands, accidental widening, and impossible narrowing.
- [x] Audit generic inference, unions, overload priority, variance, readonly promises, literal preservation, and JavaScript escape paths.
- [x] Audit invalid combinations for compile-time rejection without blocking valid unbranded input at runtime validation seams.
- [x] Audit closed vocabularies for one runtime source, exhaustive types, validation parity, declaration output, and consumer discoverability.
- [x] Audit expected failures for stable actionable codes, preserved causes, cross-realm recognition, and no exception-driven normal control flow.
- [x] Audit public JSDoc against signatures and behavior for accepted values, failure boundaries, security limits, ordering, units, and ownership.
- [x] Compile source, emitted declarations, and packed consumers separately; prove important negative type tests fail for the intended diagnostic.
- [x] Exercise public functions from untyped JavaScript with nulls, proxies, throwing getters, foreign realms, detached buffers, shared buffers, subclasses, and forged branded shapes; distinguish returned failures from allowed throws.
- [x] Audit duplicate-package interoperability for errors and mask handles without treating structural recognition as authenticity.
- [x] Audit every exported symbol for a concrete caller job, required visibility, tree-shaking cost, release promise, and simpler composition that could replace it.

### Security and trust

- [x] Map which inputs are trusted configuration, untrusted identifier text, secret material, native output, injected callback output, and cross-package handles; verify each boundary once at its owner.
- [x] Audit masking claims for confidentiality limits, offline guessing, checksum false acceptance, key rotation, sentinel leakage, chosen-input behavior, and denial-of-service through schema count or derivation work.
- [x] Audit entropy and seed handling for copies, retention, zeroization limits, snapshots, process forks, workers, shared memory, and accidental publication in errors, docs, maps, or artifacts.
- [x] Audit attacker-controlled length, iteration, key-list, sentinel-list, and malformed-input work for bounded CPU, memory, allocation, and diagnostics.
- [x] Measure seed, previous-mask, and sentinel scaling through geometric mechanism boundaries; derive dominated ranges before proposing any public limit.
- [x] Keep caller-selected finite schemas unbounded: the design contract forbids a performance cap, async derivation serves large seeds, and rotation/sentinel costs are inherent linear work in explicit configuration.

### Core implementation

- [x] Audit UUID parsing, formatting, byte offsets, canonical spelling, version/variant checks, atomic writes, subtype preservation, and cross-realm byte views.
- [x] Audit base64url/base32hex encoding and decoding across lengths, invalid characters, padding bits, tail bits, offsets, aliasing, and native fallbacks.
- [x] Audit UUIDv4/v7 generation across clock bounds, fractional and hostile clocks, rollback, sequence rollover, entropy failure, native validation, and atomic output.
- [x] Audit codec construction, lazy generation, immutable state, key order, sentinel names/UUIDs/slugs, collision handling, and callback failure containment.
- [x] Audit masking for injectivity, tag placement, schema isolation, custom callback mutation/retention, wrong-key rejection, and all supported spellings.
- [x] Audit key derivation for seed byte meaning, Unicode chunk boundaries, iteration bounds, sync/async equivalence, cancellation, cooperative progress, and partial publication.
- [x] Audit migration readers for enabled-format authority, candidate order, deduplication, sentinel priority, retained aliases, ambiguity, and no writer-policy leakage.
- [x] Audit cryptographic primitives against independent vectors, integer-width semantics, endianness, reentrancy, shared scratch state, and unsupported security claims.
- [x] Audit numeric operations for NaN, infinities, fractions, signed zero, coercion, overflow, precision loss, and boundary arithmetic.
- [x] Audit mutation and aliasing for caller-owned arrays, package-owned outputs, subarrays, buffers, shared buffers, callback inputs, cached state, and frozen wrappers.

### Runtime and performance

- [x] Audit Node, Bun, and web capability discovery separately for module-load timing, secure-context gaps, version drift, binding, malformed native results, and fallback parity.
- [x] Audit entropy pooling for refill boundaries, direct large draws, zeroization, import-time draws, worker/process isolation, reentrancy, and retained random material.
- [x] Audit hot paths for avoidable parsing, allocation, copies, schema attempts, entropy calls, clock reads, exceptions, imports, and repeated capability probes.
- [x] Measure only consumer-sized operations on the runtime that owns each path; distinguish latency, throughput, startup, memory, and fallback costs.
- [x] Check async work for real host yielding, cancellation latency, starvation, cleanup, deterministic settlement, and absence of readiness sleeps.
- [x] Audit concurrent calls, nested callbacks, worker isolation, duplicate modules, mutable runtime instrumentation, and every module-level cache or scratch buffer for interference.
- [x] Audit memory lifetime and cleanup for pools, seeds, derived keys, sentinels, callback-retained arrays, message ports, continuations, temporary candidates, and failed construction.
- [x] Audit startup and import behavior for eager entropy, eager derivation, hidden I/O, environment capture, side effects, source maps, and bundle-specific dead code.
- [x] Audit package condition order and resolution under Node, Bun, Deno, browsers, bundlers, CommonJS interop, development source, and default fallback without claiming lanes that were not executed.

### Tests and verification

- [x] Assign every test and gate a material defect, independent oracle, production link, decision point, and marginal value beyond types or existing checks.
- [x] Remove or merge tests that only confirm existence, restate implementation, duplicate another oracle, test a double, or bind harmless refactors.
- [x] Check positive, negative, boundary, malformed, adversarial, state-transition, differential, metamorphic, property, and regression coverage where each can expose a distinct defect.
- [x] Check Node and Bun suites for equivalent intended coverage and runtime-specific branches; verify browser/Deno claims through their actual packaged paths.
- [x] Check deterministic isolation under supported parallel and isolated modes; hunt shared globals, order dependence, leaked instrumentation, timing guesses, and skipped cases.
- [x] Measure per-case, fast-lane, hook, complete-lane, startup, setup, cleanup, and repeated-resource cost; redesign any verifier that misses its decision window.
- [x] Challenge test oracles with targeted mutations or removed guards; reject false-green tests and tests failing for unrelated diagnostics.
- [x] Audit scripts and package gates for exit-code trust, empty corpora, partial batches, duplicated work, wrong cwd/toolchain, generated-file drift, and misleading aggregate passes.
- [x] Verify artifact contents, export conditions, tree shaking, npm dependency absence, declaration/API baselines, and extracted consumer resolution.
- [x] Verify TypeScript/Rust conformance corpora vary every claimed axis per case and do not repeat construction failures across irrelevant dimensions.
- [x] Audit README examples, declaration examples, benchmarks, and test helpers as executable consumers; reject examples that compile while teaching unsafe or incompatible use.
- [x] Audit probabilistic and statistical tests for explicit hypotheses, discriminating controls, stable thresholds, sample limits, and deterministic alternatives.
- [x] Audit every timeout as a hang bound rather than a readiness oracle; verify every asynchronous test waits on the actual completion signal.
- [x] Audit cleanup after success, expected failure, assertion failure, cancellation, and process termination so one case cannot contaminate another lane.
- [x] Compare test names and assertions with the defect each can catch; split bundled claims and remove assertions that cannot change a maintenance decision.

### Findings, fixes, and closure

- [x] Map the strongest suitable cryptographic UUID and byte-generation primitive available in each supported Node, Bun, browser, and Deno runtime, including capability conditions and failure semantics.
- [x] Confirm each runtime adapter prefers its best representation-specific native cryptographic operation while preserving validated portable fallback and fail-closed entropy behavior.
- [x] Prove Node and Bun expose every available modeled native primitive, browser capability loss keeps the cryptographic byte path, every public route avoids non-cryptographic randomness, and packaged Deno/browser paths pass their owning artifact checks.
- [x] Ensure every public identifier generator requires package-controlled platform entropy; caller input cannot replace the trusted source, and unavailable trusted entropy returns `rng_unavailable` without output.
- [x] Remove deterministic or caller-only entropy from public generation while retaining a narrow internal seam for algorithm and parity falsification; update declarations, codecs, docs, examples, benchmarks, and conformance consumers.
- [x] Prove caller entropy properties are ignored and trusted-source failures preserve their cause without changing caller output; retain direct internal state-transition coverage for sequence atomicity.
- [x] Prevent reentrant UUIDv4 entropy callbacks from overwriting shared scratch bytes and returning duplicate identifiers; preserve the allocation-free ordinary path.
- [x] Remove probabilistic no-collision tests that contradict the published collision contract and add no package-controlled evidence beyond source, pool, and generator-state tests.
- [x] Preserve UUIDv7's documented 16-byte entropy callback requests; the narrower draw changed observable callback behavior and contradicted the recorded rejection of that alternative.
- [x] Stop classifying the undocumented legacy `UuidRuntimeError` name as a current package error; retain current-name recognition across realms and duplicate copies.
- [x] Correct stale Node `randomUUIDv7` chronology in benchmark evidence and remove it from runtime compatibility logic; capability presence remains the executable boundary.
- [x] Execute the cleaned archive through its extracted package exports on Node, Bun, Deno, and Chromium; retain the direct archive validator as the packaged-route proof.
- [x] Require the API gate to match the pinned extractor's complete identity; a suffix match accepted unrelated output that shared only the version.
- [x] Record each credible defect with exact evidence, consequence, strongest rival explanation, and the observation that can overturn it.
- [x] For each proven defect, compare live fixes across API, invariant, algorithm, runtime seam, test oracle, and deletion; choose the smallest complete option by caller burden, correctness, compatibility, work, and owned complexity.
- [x] Add the smallest red reproducer before each behavioral fix; retain only regressions whose marginal defect detection exceeds their rent.
- [x] Fix proven defects with the smallest complete design; run narrow falsifiers and commit each self-contained change with explicit files.
- [x] Re-audit affected callers, declarations, docs, runtime paths, tests, and cross-language behavior after every semantic fix.
- [x] Run packed-consumer, declaration, runtime, artifact, interoperability, performance, and full repository checks required by the final state.
- [x] Re-read every changed line and nearby comment; remove redundant work, stale claims, shadow sources, completed plan state, and any verifier that did not earn its place.
- [x] Search every contract owner by subject terms after the implementation review so different wording cannot hide a conflicting rule or duplicate source of truth.
- [x] Pair every roadmap criterion with its concrete instrument and result; leave no completion mark supported only by code reading or a green aggregate.
- [x] State the strongest surviving uncertainty and the exact observation that would change each final verdict; never convert unexecuted environments into a universal claim.
- [x] Audit the audit itself for narrowed searches, truncated output, unchecked files, shared-origin evidence, stale generated output, and conclusions stronger than their instruments.
