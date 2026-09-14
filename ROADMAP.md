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
- [ ] Resolve whether UUID version inspection should accept text, exact bytes, and plain slugs for
      routing versions other than v4 and v7; the existing guards cover only those two versions.

## Deferred CLI evaluation

- [ ] Evaluate a CLI only when the maintainer reopens this work after concrete shell, migration,
      or debugging demand appears. Do not design or build it during the current session.
