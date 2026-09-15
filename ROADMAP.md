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
- [ ] Rule whether repeated diagnosis and conversion justify an opt-in immutable parsed UUID value
      or only a one-shot serializable result. Keep existing direct functions for one-shot and hot
      paths either way.
- [ ] Design the accepted result around caller decisions and compare it with the existing narrow
      extractors. Keep masking codecs explicit; a diagnosed UUID must not retain key-bearing state.

## Competitor benchmarks

Start only after every preceding ruling is settled, so the matrix measures the final caller jobs
instead of steering the API toward whichever operations competitors happen to expose.

### Rust UUID competitors

- [x] Inventory reusable Rust libraries that generate UUIDv4, UUIDv7, or competing short forms.
- [ ] Re-run the registry census and resolve new or renamed candidates immediately before measurement.
- [ ] Execute each direct generator and retain wrappers only when they add a distinct consumer cost.
- [ ] Compare equivalent text, byte, caller-storage, and batch outcomes without hiding weaker paths.
- [ ] Measure validity, entropy failure, clock rollback, same-millisecond behavior, allocation,
      contention, target support, and throughput.

### Final evidence

- [ ] Run the complete competitor matrix after the candidate inventory and public operations are
      frozen; update measured conclusions without turning competitor behavior into package policy.
- [ ] Run the complete project gate, pair every retained claim with its owning evidence, commit the
      focused benchmark evidence, and leave the repository clean.
