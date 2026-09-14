# Roadmap

Live work only. Contracts live in README, `docs/`, and `bench/PERFORMANCE.md`.

## UUIDv7 interoperability proof correction

- [x] Generate UUIDv7 values with every Rust library named by the payload-layout audit.
- [x] Run those values through the TypeScript and Rust plain, masked, guard, and timestamp paths.
- [x] Correct every claim that confuses source inspection with executed interoperability evidence.
- [x] Falsify the permanent test by introducing a payload-bit corruption and requiring failure.
- [x] Run the complete project gate and leave the repository clean.

## Rust UUID competitor benchmark

- [x] Inventory reusable Rust libraries that generate UUIDv4, UUIDv7, or competing short forms.
- [ ] Re-run the registry census and resolve new or renamed candidates before measurement.
- [ ] Execute each direct generator and retain wrappers only when they add a distinct consumer cost.
- [ ] Compare matching text, byte, caller-storage, and batch operations without hiding weaker paths.
- [ ] Measure validity, entropy failure, clock rollback, same-millisecond behavior, allocation,
      contention, target support, and throughput.

## TypeScript UUID competitor refresh

- [ ] Add latest release and repository activity dates to the existing TypeScript competitor set.
- [ ] Extend the competitor audit command without creating a second package inventory.
- [ ] Inspect changed releases before carrying forward compatibility or benchmark evidence.

## External UUIDv7 compatibility audit

- [x] Inventory every UUIDv7 generator already benchmarked or named in project evidence.
- [x] Trace how each generator fills the 74-bit payload and what it promises about ordering.
- [x] Feed every installed JavaScript generator and each Rust generator in the payload-layout table
      through TypeScript and Rust parsing, timestamp, plain-slug, masking, and unmasking paths.
- [x] Add the smallest permanent compatibility proof that catches payload-layout assumptions.
- [x] Document every supported field variation and every operation that intentionally discards
      representation or ordering information.
- [x] Verify source, declarations, packed consumers, both runtimes, and the complete project gate.

## UUIDv4 and UUIDv7 randomness contract audit

- [x] Trace each generation route to its actual random, timestamp, and sequence inputs.
- [x] Replace vague or false consumer claims with the exact v4/v7 distinction.
- [x] Keep the consumer choice in README, trust limits in security guidance, and implementation
      details out of public JSDoc.
- [x] Falsify the corrected contract through source, declarations, packaged consumers, and runtime behavior.

## Configurable masked UUIDv7 timestamp range

Maintainer ruling: only a masking codec may shift the 42-bit masked timestamp range. The default
starts at Unix millisecond zero and preserves every existing masked slug.

- [x] Add one codec option for the inclusive first maskable Unix millisecond.
- [x] Store each previous mask with the range start that produced its retained slugs.
- [x] Subtract the configured start before masking and restore it after unmasking without changing
      the UUID returned to callers.
- [x] Reject invalid starts, timestamps outside the selected range, and ranges that exceed UUIDv7's
      48-bit timestamp field.
- [x] Preserve sentinel behavior outside the masked range.
- [x] Align TypeScript, Rust, wire documentation, public documentation, declarations, and packed
      consumers.
- [x] Falsify both endpoints, adjacent rejected values, nonzero-range round trips, default wire
      compatibility, previous-mask decoding, cross-language parity, and error diagnostics.

## Error diagnostics audit

- [x] Inventory every public TypeScript and Rust failure site, stable code, message, source, and
      caller action.
- [x] Inventory repository checks, hooks, packaging, benchmarks, and release-tool failures.
- [x] Split messages where one text hides different causes or different fixes.
- [x] Keep shared wording in one owner when the failed condition and fix are identical.
- [x] Add focused falsifiers for ambiguous branches and preserve underlying causes.
- [x] Verify source, generated declarations, packed consumers, both runtimes, and repository gates.

## UUID constants pending maintainer review

Maintainer ruling: UUIDv7 timestamp bounds use inclusive endpoints and expose canonical UUID text
and bytes. One operation accepts an optional inclusive end timestamp; omission selects one
millisecond. The result is valid only with comparison that preserves UUID byte order.

- [x] Define one strict generic bounds result whose value retains canonical text case or owned bytes.
- [x] Implement inclusive UUIDv7 bounds for one millisecond or an inclusive millisecond interval.
- [x] Export and document the TypeScript bounds operations.
- [x] Implement and document the equivalent Rust bounds operation.
- [x] Falsify timestamp limits, inverted intervals, fixed version and variant bits, endpoint
      inclusion, byte ownership, declarations, package exports, and cross-language parity.

- [x] Research namespace constants: IANA's registry can grow and this package does not generate
      name-based UUIDs, so exports would add a partial second registry without a consuming operation.
- [ ] Decide whether concrete namespace demand outweighs that registry ownership.
- [x] Research example UUID constants: RFC examples are test vectors, not assigned identities, and
      remain useful only beside the examples or conformance cases that establish their expected result.
- [ ] Decide whether a named public example has a consumer job beyond documentation and tests.
- [x] Research protocol UUID constants: Bluetooth, COM, and similar values belong to changing
      domain registries rather than the version-neutral UUID representation.
- [ ] Decide whether this package should assume ownership of any external protocol registry.
- [x] Research precomputed nil/max slugs: they save one conversion per process but add four public
      contracts that callers can derive from the existing canonical constants.
- [ ] Decide whether repeated slug-heavy call sites justify public nil/max slug constants.
- [x] Research version endpoint constants: UUIDv7 timestamp bounds serve database range queries,
      while fixed v4/v7 minima and maxima describe whole version spaces with no known package job.
- [ ] Decide whether fixed UUIDv4 or UUIDv7 endpoints serve a distinct caller job.

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
