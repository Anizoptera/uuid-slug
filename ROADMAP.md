# Roadmap

Live work only. Contracts live in README, `docs/`, and `bench/PERFORMANCE.md`.

## UUID constants pending maintainer review

- [ ] Review a complete registry, selected namespace constants, and no namespace exports; account for IANA registry growth and the lack of name-based UUID generation in this package.
- [ ] Review RFC example and test-vector UUIDs against keeping examples local to documentation and conformance tests.
- [ ] Review protocol-owned UUID registries such as Bluetooth and COM against depending on their owning packages or registries.
- [ ] Review precomputed plain-slug forms of `NIL_UUID` and `MAX_UUID` in both alphabets against one-time conversion by callers.
- [ ] Review UUIDv4 and UUIDv7 endpoint constants or timestamp-range builders for database bounds against generic byte and text construction.

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
- [ ] Review a generation-only package surface against this package's conversion, storage, masking, migration, and typed-failure jobs.

## Deferred CLI evaluation

- [ ] Evaluate a CLI only when the maintainer reopens this work after concrete shell, migration,
      or debugging demand appears. Do not design or build it during the current session.
