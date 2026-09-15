# Roadmap

Settle the public product before comparing implementations. Base58 is rejected until concrete
human-transcription demand justifies a third UUID spelling. Resolve every remaining public-interface
question, then run competitor benchmarks only after those rulings freeze the operations worth
measuring. Contracts live in README, `docs/`, and `bench/PERFORMANCE.md`; the CLI is outside the
current product and remains rejected until concrete shell, migration, or debugging demand identifies
a job the libraries do not serve. Generation and version-specific APIs remain limited to UUIDv4 and
UUIDv7; other versions retain only version-neutral operations that add no special machinery.

## Public-interface rulings

Resolve each axis from a concrete caller job. The default answer is no public surface because every
export, accepted form, and registry becomes a permanent compatibility and verification obligation.

### UUID constants

- [x] Keep named RFC examples in documentation and tests; they have no runtime consumer job.
- [x] Reject external protocol registries such as Bluetooth or COM; their independent ownership and
      release cadence do not belong in a UUID representation package.
- [x] Reject precomputed nil and max slugs; one conversion per process is cheaper than permanent
      exports for values already derivable from `NIL_UUID` and `MAX_UUID`.

### Unknown-ID diagnosis

- [x] Programmatic migration and debugging tools need one diagnosis of an unknown UUID: its
      normalized value, version, layout family, available timestamp facts, and which package
      operations accept it.
- [x] Repeated diagnosis and conversion justify an opt-in immutable parsed UUID value. Keep existing
      direct functions for one-shot and hot paths.
- [x] Design the immutable UUID around caller decisions and compare it with the existing narrow
      extractors. Provide equivalent top-level and owner methods whenever a codec or generator owns
      operation state; the top-level call receives that owner explicitly and the owner method presets
      itself. Preserve an explicitly supplied masking codec and the immutable generated payload-layout
      snapshot as typed convenience presets. Never retain a generator in a UUID.
  - [x] Implement the immutable UUID core, stable diagnosis, keyless conversions, and JSON.
  - [x] Accept parsed UUIDs across existing conversion and inspection calls without slowing primitive inputs.
  - [x] Add symmetric top-level, masking-codec, and generator parsing or generation entry points.
  - [x] Prove bound and unbound capability inference, malformed JavaScript rejection, ambiguity,
        caller-owned output, serialization, duplicate-package input, tree shaking, and runtime cost.
  - [x] Update README workflows, declarations, and packed consumers; then close this design item.

## Competitor benchmarks

Start only after every preceding ruling is settled, so the matrix measures the final caller jobs
instead of steering the API toward whichever operations competitors happen to expose.

### Rust UUID competitors

- [x] Inventory reusable Rust libraries that generate UUIDv4, UUIDv7, or competing short forms.
- [x] Re-run the registry census and resolve new or renamed candidates immediately before measurement.
- [x] Execute each direct generator and retain wrappers only when they add a distinct consumer cost.
- [x] Compare equivalent text, byte, caller-storage, and batch outcomes without hiding weaker paths.
- [x] Reject invalid generator output and execute entropy failure, rollback, and same-millisecond limits.
- [x] Classify fixed values, caller storage, and returned strings without claiming hidden allocator work.
- [ ] Measure one-thread and concurrent throughput for state-local and process-global generators.
- [ ] Compile each retained generator for its claimed native and `wasm32-unknown-unknown` capability;
      report unsupported lanes instead of weakening every crate to one feature set.
- [ ] Generate the Rust report from raw records so names, medians, qualifications, and omissions have
      one executable owner rather than hand-maintained prose.

### Final evidence

- [ ] Run the complete JavaScript and Rust competitor matrices after the candidate inventory and
      public operations are frozen.
- [ ] Update measured conclusions without turning competitor behavior into package policy.
- [ ] Run the complete project gate and pair every retained claim with its owning evidence.
- [ ] Commit the focused benchmark evidence, remove transient captures, and leave the repository clean.
