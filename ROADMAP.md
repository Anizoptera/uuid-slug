# UUIDv7 redesign adversarial audit

Prove the redesigned generation interface is the smallest truthful implementation of Art's accepted-input, exact-time, ordering, parity, and least-work requirements; fix every surviving defect without expanding the public language unnecessarily.

## Contract and implementation

- [ ] Reconstruct each changed consumer promise from README, `docs/public-api.md`, emitted declarations, TypeScript calls, Rust calls, and the implementation; treat the completed roadmap as a claim, not evidence.
- [ ] Trace every explicit-instant form through normalization, fraction quantization, sequence coordination, representation formatting, masking, immutable values, and Rust conformance.
- [ ] Falsify cross-realm and hostile-object handling, including `Date`, null-prototype records, getters, proxies, duplicate fields, inherited fields, and objects from another package or realm.
- [ ] Falsify numeric and textual boundaries: negative zero, unsafe integers, floating-point neighbors, excessive fraction digits, offsets, leap dates, maximum UUIDv7 time, and overflow after the final fraction/counter value.
- [ ] Falsify ordered generation under repeated time, rollback, fraction and counter carry, entropy failure, caller-owned output, selected representations, reset policy, and terminal exhaustion; prove failed calls do not mutate state or output.
- [ ] Audit structural generator validation for duplicated work, unsupported-but-valid implementations, hidden receiver requirements, payload-layout drift, thrown accessors, mutable results, and atomicity.
- [ ] Compare TypeScript and Rust semantics by consumer job; retain idiomatic differences only when accepted domain, result, ordering, ownership, failure, and wire meaning remain aligned.
- [ ] Audit every added export, overload, option, branch, allocation, validation pass, test, fixture, and durable sentence by deletion and detection-lift tests; remove anything whose consumer outcome survives deletion.

## Evidence and closure

- [ ] Add the smallest public-seam RED case for each proven defect, mutate every retained new guard or type restriction, then implement the minimal fix.
- [ ] Run focused Node, Bun, Rust, and shared-conformance evidence for each affected path; run packed consumers and browser paths only where runtime or packaging selection can differ.
- [ ] Measure changed hot paths and the complete routine lane; reject optimizations that do not reproduce or that weaken an invariant.
- [ ] Update only the owning durable contract and nearest non-obvious implementation reasoning; keep decisions and rejected live alternatives in one owner.
- [ ] Run `bun run check`, packed web verification when applicable, stale-term search, public declaration/editor review, final diff audit, and Git-state audit.
- [ ] Commit each independently useful checked change, mark this roadmap complete only from external evidence, then remove it and leave Git clean.
