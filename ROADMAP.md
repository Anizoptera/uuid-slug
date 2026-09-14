# Roadmap

Live work only. Contracts live in README, `docs/`, and `bench/PERFORMANCE.md`.

## Competitor ideas pending maintainer review

These ideas remain undecided until the maintainer accepts or rejects each consumer trade-off.

- [ ] Review a parsed UUID value object for repeated inspection, conversion, comparison, serialization, and worker transfer against its allocation and identity costs.
- [ ] Review UUID variant inspection alongside the implemented version inspection and version-specific guards.
- [ ] Review equality and ordering across UUID text, bytes, plain slugs, and codec-owned masked slugs against normalize-then-compare caller code.
- [ ] Review unbounded, bounded, and progressive batch generation against one-at-a-time generation, allocation limits, cancellation, and event-loop fairness.
- [ ] Review custom alphabets against interoperability, private wire-format, validation, and type-safety costs.
- [ ] Review `Date` input and output against numeric Unix milliseconds at application boundaries.
- [ ] Review standalone operations, function-attached helpers, and representation-specific namespaces for discovery and detached-name clarity.
- [ ] Review error values, result objects, exceptions, and nullable results for composition, diagnosis, and ordinary call burden.
- [ ] Review one output selector for text, bytes, and each slug alphabet against separate strictly typed generation functions.
- [ ] Review Bun's positional encoding argument against named, strictly typed generation functions.
- [ ] Review caller-supplied exact random bytes, counters, and complete UUIDv7 fields against the implemented explicit entropy callback and generator-owned state.
- [ ] Review ordinary array byte inputs against exact `Uint8Array`, `ArrayBuffer`, and `DataView` inputs; account for holes, coercion, invalid elements, and cross-realm use.
- [ ] Review UUID v1, v3, v5, and v6 generation separately from version-neutral parsing and slug conversion; the maintainer has ruled these versions unrelated to current generation work.
- [ ] Review a generation-only package surface against this package's conversion, storage, masking, migration, and typed-failure jobs.

## Deferred CLI evaluation

- [ ] Evaluate a CLI only when the maintainer reopens this work after concrete shell, migration,
      or debugging demand appears. Do not design or build it during the current session.
