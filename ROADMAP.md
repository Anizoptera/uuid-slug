# Roadmap

Live work only. Contracts live in README, `docs/`, and `bench/PERFORMANCE.md`.

## Competitor interface follow-up

Adopt the useful competitor behavior without copying interfaces that add more caller burden than capability.

- [ ] Give created UUIDv7 generators an explicit clock-rollback policy.
  - [ ] Compare preserving the last timestamp, resetting to the observed clock, and returning a typed failure.
  - [ ] Compare a fixed rollback rule with a caller-selected significance threshold and explicit monotonic versus wall-clock semantics.
  - [ ] Choose an explicit default from consumer consequences; keep module-level generation simple.
  - [ ] Prove rollback, repeated timestamps, recovery, overflow, clock failures, and independent generator state.
- [ ] Add caller-provided entropy through a separate explicit generator interface.
  - [ ] Keep cryptographically secure runtime entropy as the zero-configuration default and make the custom source impossible to select accidentally.
  - [ ] Compare an entropy callback, exact random bytes, a caller-selected counter, and complete UUIDv7 fields without coupling independent controls.
  - [ ] Choose the smallest source contract, then prove deterministic output, source failure, malformed output, reuse, and default-path isolation.
- [ ] Re-evaluate the remaining competitor interface ideas from real consumer calls before accepting or rejecting them.
  - [ ] Compare primitive results with a parsed UUID value object for repeated inspection, conversion, equality, serialization, and worker transfer.
  - [ ] Compare standalone UUID version and variant inspection with version-specific guards and caller-side byte inspection.
  - [ ] Compare equality and ordering across UUID text, bytes, plain slugs, and codec-owned masked slugs with normalize-then-compare caller code.
  - [ ] Compare one-at-a-time generation with bounded or progressive batch generation under allocation and event-loop limits.
  - [ ] Test whether custom alphabets solve a real interoperability job that the two canonical alphabets cannot.
  - [ ] Compare numeric Unix milliseconds with `Date` input and output at application boundaries.
  - [ ] Compare standalone operations, function-attached helpers, and representation-specific namespaces for discovery and detached-name clarity.
  - [ ] Compare error values, result objects, exceptions, and nullable results on composition, diagnosis, and ordinary call burden.
  - [ ] Compare separate generation functions with an output selector for text, bytes, and each plain-slug alphabet.

## Generated benchmark reports

- [ ] Render the `bench/matrix.ts` tables as Markdown pipe tables so `bench/results/matrix.md`
      needs no fenced fixed-width blocks.

## Deferred CLI evaluation

- [ ] Evaluate a CLI only when the maintainer reopens this work after concrete shell, migration,
      or debugging demand appears. Do not design or build it during the current session.
