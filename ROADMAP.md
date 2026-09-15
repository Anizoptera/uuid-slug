# TypeScript public interface audit

Make every supported UUID job require the least caller knowledge and runtime work that preserves the published identifier contracts.

## Audit contract

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

- [ ] For each confirmed deficiency, design at least five materially different shapes or implementation strategies, including deletion and composition with existing primitives.
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
