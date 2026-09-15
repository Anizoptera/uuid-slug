# TypeScript public interface audit

Make every supported UUID job require the least caller knowledge and runtime work that preserves the published identifier contracts.

## Audit contract

- [ ] Rewrite `docs/public-api.md` where inherited interface conventions conflict with permissive input, a smaller language, direct selected output, or least caller work; preserve only wire, safety, and demonstrated compatibility constraints.
- [ ] Define the JavaScript and TypeScript consumer: an application or coding agent that already has a UUID job, an instant in a standard host form, and a required storage or display representation; success is one obvious inferred call with no caller normalization or unused work.
- [ ] Inventory every root export, public type, overload, parameter, option, callback, property, literal, default, result, error, side effect, ownership rule, package entry, and runtime-selected path.
- [ ] Map each public part to a concrete consumer job and shortest correct detached call; mark anything without a necessary job as a removal candidate.
- [ ] Compare the inventory with `docs/public-api.md`, README capability and representation guidance, generated declarations, package exports, and Rust parity where the contract is shared.
- [ ] Evaluate every call by truth, misuse prevention, predictability, naming, inference, completion help, caller burden, allocation, parsing, fallback work, state retention, and composition.
- [ ] Classify each constraint as wire or platform necessity, published compatibility promise, maintainer ruling, measured trade-off, or removable implementation convention.
- [ ] Record each finding with the observed evidence, consumer consequence, live alternatives, strongest falsifier, and required proof before changing code.

## Interface proof

- [ ] Compile realistic source consumers for every overload, default, option combination, detached method, branded result, caller-owned output, compatible error chain, and intended rejected call.
- [ ] Prove negative type tests fail for the intended diagnostic when their expected-error marker or production restriction is removed.
- [ ] Build declarations, inspect every public declaration and comment as a cold consumer, and query language-service help for every changed symbol.
- [ ] Pack the package and compile and execute fresh consumers through every public export condition and supported TypeScript compiler contract.
- [ ] Run equivalent runtime success and failure cases in Node and Bun, then exercise Deno and browser adapters for behavior that can differ.
- [ ] Execute produced bundles, verify named root imports remove unrelated domains across independent bundlers, and inspect the packed artifact.

## Design and implementation

- [x] Do not add `generatePlainUuidV7SlugAtUnixMs`: one more matrix-cell helper would reduce one call site's work by increasing the language every caller must learn.
- [x] Define one shared explicit-instant input that accepts every safe, recoverable, unambiguous standard form, including `Date`, without caller coercion hooks, repeated reads, or runtime-dependent parsing; preserve sub-millisecond time in a caller-selected UUIDv7 fraction field and otherwise use the containing Unix millisecond without making callers discard precision first.
- [ ] Design a smaller orthogonal generation model that expresses current or recorded time, selected representation, caller-owned storage, custom entropy, masking, and stateful generation without ambiguous overloads or work unrelated to the selected result.
- [x] Make explicit `at` calls join a created generator's configured fraction, counter, ordering, and rollback state; keep module-level helpers uncoordinated so one-shot convenience does not create a hidden global ordering promise.
- [x] Replace floating sub-millisecond normalization where it can select the wrong payload bucket; prove exact bucket boundaries for numeric, nanosecond, and zoned-text inputs without adding work to current-time or whole-millisecond paths.
- [x] Make every generated representation use caller-selected generator state directly, including plain, masked, and paired results, without multiplying methods or forcing error unwrapping and intermediate conversion.
- [x] Verify that an uncontrolled structural generator given `at` either proves the requested timestamp/layout or returns an actionable error; never let callback acceptance imply a property the returned UUID does not satisfy.
- [x] Publish and mechanically verify a TypeScript-to-Rust job map that distinguishes intentional idiomatic shape differences from missing accepted inputs, results, ordering, failures, ownership, or wire guarantees.
- [x] Replace Rust's supplied-time-only `f64` interface with an exact standard-time form while retaining a narrow bridge path for fractional Unix milliseconds; prove bucket boundaries near zero and the end of UUIDv7's timestamp range.
- [ ] Prototype at least: format presets on one generator, a discriminated options object, operation-specific methods, immutable generated values, and a hybrid default-plus-options surface; compile cold call sites and count public concepts, decisions, narrowing steps, allocations, and runtime branches.
- [ ] Remove or replace matrix helpers and exported type machinery whose consumer job the selected model subsumes; do not preserve unreleased duplication merely because it exists.
- [x] Change the README's recorded-time example only after the selected interface makes that job direct without growing the existing helper matrix.
- [ ] Falsify these generation-interface topologies against the same cold and repeated caller jobs: keep the sparse named matrix; complete every matrix cell; one discriminated options function; overload one function by semantic preset; no-argument default plus options; fluent builder; immutable generated value; one stateful generator object; representation-specific codec objects; caller callback sink; one output descriptor; a typed multiple-output descriptor; curried configured generator; version namespace; capability subpaths; UUID value constructor; tagged command executor; template-literal call; capability-negotiated generator; bytes-first primitive plus public formatters; function properties; one version-parameterized generator; generated language-specific facades; and a small common tier plus one advanced escape hatch.
- [ ] Falsify these instant-input strategies independently: Unix-millisecond number; branded milliseconds; bigint milliseconds; `Date`; nominal `Temporal.Instant`; nominal `Temporal.ZonedDateTime`; structural `epochMilliseconds`; structural `epochNanoseconds`; strict RFC 3339 text with an explicit offset; canonical ISO text; numeric millisecond text; explicit `{ unixMs }`; explicit `{ seconds, nanoseconds }`; tuple seconds plus nanoseconds; protobuf timestamp; Firestore timestamp; caller normalization adapter; package instant protocol; `valueOf`; `toISOString`; `toTemporalInstant`; and a clock callback for repeated current-time reads.
- [ ] Falsify representation selection independently: separate function names; string discriminant; scalar semantic preset; discriminated output object; destination-array inference; dedicated destination descriptor; output callback; mutable writer; immutable value methods; paired object; typed tuple; typed list of outputs; bitset request; format codec; formatter closure; namespace method; function property; generic return annotation; constructor selection; and package subpath selection.
- [ ] Reject any candidate that makes the default call longer, accepts an ambiguous unit or timezone, claims precision the selected UUIDv7 payload layout cannot carry, invokes uncontrolled coercion, weakens inferred result brands, performs unused work, hides entropy failure, couples masking keys to keyless generation, or makes detached use unclear.
- [ ] Retain a hybrid only when each part wins a different consumer job and removing either part makes that job materially worse; otherwise select the single deeper interface.
- [ ] For each confirmed deficiency and independent decision axis, design at least twenty materially different live shapes or implementation strategies, sampling rare but coherent tails and including deletion, composition, adaptation, and hybrids.
- [ ] Choose refactor-first only where behavior-preserving structure measurably lowers the risk or duplication of the contract change; keep restructuring and behavior changes in separate commits.
- [ ] Implement the smallest deep interface that makes the obvious call correct, preserves all accepted encodings, and hides keys, state, normalization, capabilities, and migration work behind their owners.
- [ ] Keep recoverable failures as `UuidSlugError` values, preserve compatible error identity, and use only the least expensive recognition path valid at each seam.
- [ ] Reject unknown option keys and provably incompatible brands while accepting every recoverable unambiguous runtime form.
- [ ] Keep default hot paths free of opt-in parsing, allocation, derivation, entropy, fallback, state retention, and cross-realm checks.
- [ ] Update the owning README or durable design document with every consumer-visible contract change and update Rust only where the shared contract requires parity.
- [ ] Commit each independently useful, fully checked file-level change with an explicit file list and a lean Conventional Commit message.

## Final falsification

- [ ] Run `bun run check` and require every complete lane to remain within the repository's five-minute ceiling without weakening coverage.
- [ ] Mutate each new guard or type restriction and prove its nearest test fails for the intended reason, restoring files from an independent copy.
- [ ] Search the entire tree for superseded public terms, stale examples, old option literals, duplicated semantic strings, and comments invalidated by changed behavior.
- [ ] Pair every requested criterion and every documented promise with implementation and external evidence; delete every changed part that cannot name a required consumer outcome.
- [ ] Perform an adversarial review of the final diff, package, call sites, runtime branches, documentation, and git state before removing this roadmap.
