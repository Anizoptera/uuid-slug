# Roadmap

Settle the public product before comparing implementations. Decide Base58 first, resolve every
remaining public-interface question second, and run competitor benchmarks only after those rulings
freeze the operations worth measuring. Contracts live in README, `docs/`, and
`bench/PERFORMANCE.md`; the CLI is outside the current scope.

## Base58 decision

Base58 does not shorten a UUID below the existing 22-character base64url spelling. Its plausible
distinct job is safer human transcription; base32hex already owns case-insensitive sorting, and
base64url owns the smallest existing machine-oriented spelling. Performance cannot create a
consumer job, so do not benchmark Base58 until that job is accepted.

- [x] Inventory maintained Base58 UUID codecs and the consumer claims that differ from base64url
      and base32hex.
- [x] Compare fixed length, canonical decoding, leading-zero preservation, URL and filename use,
      text collation, case handling, visual ambiguity, cross-language availability, dependencies,
      and permanent wire-format cost without using throughput as a proxy for usefulness.
- [ ] Rule whether manual reading or transcription is a supported package job.
- [ ] If it is not, reject Base58 and remove it from the benchmark candidate set.
- [ ] If it is, define the exact alphabet, canonical spelling, accepted input, TypeScript and Rust
      surface, migration cost, and success evidence before adding its conditional benchmark work.

## Public-interface rulings

Resolve each axis from a concrete caller job. The default answer is no public surface because every
export, accepted form, and registry becomes a permanent compatibility and verification obligation.

### UUID constants

- [ ] Rule whether concrete namespace demand justifies owning a changing external registry despite
      this package not generating name-based UUIDs.
- [ ] Rule whether a named RFC example has a runtime consumer job beyond documentation and tests.
- [ ] Rule whether this package should own any external protocol registry such as Bluetooth or COM.
- [ ] Rule whether repeated slug-heavy call sites justify precomputed nil and max slugs instead of
      one conversion per process.
- [ ] Rule whether fixed UUIDv4 or UUIDv7 endpoints serve a caller job distinct from UUIDv7
      timestamp bounds.

### UUID inspection

- [ ] Rule whether callers need a version-neutral UUID variant result in addition to the existing
      version inspection and version-specific RFC-variant guards.

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

### Conditional Base58 competitors

- [ ] Only if Base58 survives its product ruling, compare maintained TypeScript and Rust codecs for
      canonical round trips, complete UUID preservation, output length, allocation, implementation
      weight, and throughput on the repository's supported runtimes.

### Final evidence

- [ ] Run the complete competitor matrix after the candidate inventory and public operations are
      frozen; update measured conclusions without turning competitor behavior into package policy.
- [ ] Run the complete project gate, pair every retained claim with its owning evidence, commit the
      focused benchmark evidence, and leave the repository clean.
