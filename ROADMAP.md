# Rust implementation roadmap

Build a public Rust crate with TypeScript semantic parity, prioritizing filesystem-safe identifiers.

## HLD — maintainer rulings

- Deliver full Rust functionality with [parity from the first increment](docs/cross-language.md).
- Provide filesystem-safe plain and masked forms in both languages; preserve issued formats.
- Keep the ordinary decode result one UUID; candidate enumeration stays explicit.
- Keep API verbs recognizable, with language-appropriate types and error handling.
- Reuse the existing native implementation as source material, then refine it for public use.
- Allow small, evidence-justified Rust dependencies; keep npm native-free and dependency-free.
- Support Git installation and crates.io publication with maintained releases and provenance.
- Keep Rust and TypeScript versions equal; support common CPU architectures from the first release.
- Use native GitHub CI builds and tests from the first Rust increment.
- Publish the crate as `uuid-slug`; keep Node/Bun bindings development-only; support WebAssembly.
- Reuse contract cases and extend benchmarks, profiling and resource measurements to Rust.
- Consumer application adoption and stored-filename migration are separate work.

Art owns the HLD above; tasks below are engineering proposals, not approved public decisions.
Public choices are recorded above; verify the engineering tasks below before claiming readiness.

## Execution order

Build the shared runner first; then develop plain conversion and hashing independently.
Join them at codec integration. Reuse builds across concurrent checks; isolate benchmarks.
Commit verified parts under AGENTS.md; keep evidence tied to the changed artifact.

### 1. Settle public contracts — high risk reduction, small effort

- [x] Preserve base64url defaults in both languages: Art's parity and compatibility requirements
  already decide this. Keep plain `slugAlphabet` semantics; select masked output independently.
- [x] Encode safe sentinels as raw 26-character base32hex UUIDs; retain existing 22-character
  reads. Their length separates them from 27-character masked payloads without adding tag bits.
- [x] Keep Node/Bun bridge crates unpublished and outside npm; expose Rust directly as `uuid-slug`.
- [x] Synchronize Cargo from the selected npm version before tagging; reject manifest, lockfile
  and tag disagreement. The version-hook test runs in `check:rust`, without adding Cargo to `check:js`.
- [ ] Derive the common-architecture target matrix from supported Rust targets and consumer needs;
  distinguish native execution from cross-compilation. Keep CPU-specific tuning optional.
- [x] Build and execute WebAssembly in a browser: verify host entropy, errors, cancellation and
  shared wire cases; deterministic conversion/masking must not require JavaScript host services.
- [x] Map public capabilities to Rust call sites in `docs/cross-language.md`; keep generator state
  separate from immutable codecs and preserve checked caller-buffer operations.

### 2. Establish the crate and shared evidence — high risk reduction, medium effort

- [ ] Inspect the native source and its consumers before copying; preserve reusable behavior,
  verify licensing, omit private project identifiers. Accept when: reviewed source delta and provenance.
- [ ] Compare UUID/entropy/encoding/hash/error/serde dependencies for contract fit and measured
  cost; retain reasons, not sibling version pins. Keep default features explicit and audit the lock graph.
- [x] Create `rust/Cargo.toml` with the product and unpublished bridge members; external consumers
  link the product alone. Keep OS entropy and bindings outside pure encoding/masking modules.
- [x] Share wire/hash/original fixtures as data; use one comparator with independent producers.
  A sampled diagnostic may limit printed failures, never which observations determine the result.
- [ ] Parameterize reusable behavioral cases over implementation adapters. Accept when: the first Rust
  increment runs shared cases; extract existing `test/*-probe.ts` closures without changing their
  expectations. Report missing cases per adapter; aggregate success cannot hide an empty adapter.
- [ ] Define owned/borrowed results and errors that retain causes, without panic or partial success.
- [x] Inherit workspace lints in every member: deny correctness/suspicious/perf, document public
  APIs, forbid unsafe in the core; isolate necessary FFI exceptions in bridge crates only.
- [x] Run default Rust formatting once in `check:rust`; keep `format:check` for JavaScript files.
- [x] Add one `check:rust` to the root check: workspace/all-target/all-feature Clippy with warnings
  denied, then workspace tests including doctests. Run Cargo serially; run JS checks alongside it.
- [x] Check default, empty and each optional feature independently from Cargo metadata; include
  known interacting combinations. All-features alone hides missing feature dependencies.
- [ ] Run shared parity on native GitHub OS/CPU runners from the first Rust increment; fail missing
  observations. Keep runner selection in the CI matrix, not a second target list in prose.
- [ ] Connect the first Rust capability to Node through N-API. Accept when: the same shared case reaches
  Rust, preserves error/ownership semantics, and fails when the Rust result is deliberately wrong.
- [ ] Connect that capability to Bun through FFI. Accept when: the same case reaches Rust; explicit
  lengths, owned handles and matched release functions cover cleanup, bad input and repeated calls.

### 3. Deliver plain identifiers and generation — primary consumer value, medium effort

- [ ] Implement UUID parsing, formatting and byte conversion. Accept when: shared input-boundary cases
  cover strict text, slices/offsets and unchanged buffers on error; private validated fields prevent
  bypass through constructors or deserialization. Generic UUIDs still accept all version nibbles.
- [x] Implement both plain alphabets; pass padding, length, byte-order and non-v7 contract cases.
- [x] Implement UUIDv4 generation. Evidence: actual entropy-path and bit-layout checks, including
  failure behavior, without assuming a platform hook exercises the portable implementation.
- [x] Implement v7 generation/extraction/explicit timestamps; pass bounds without promising strict order.
- [x] Implement the explicit stateful v7 generator. Evidence: state transitions and independent
  ownership cover clock rollback, fractional clocks versus explicit instants, counter exhaustion,
  entropy failure/retry and explicit-time calls that leave the current sequence untouched.
- [ ] Verify filesystem-safe plain output through real filesystem round trips on supported
  systems. Accept when: exact spelling/identity retention and timestamp ordering within promised bounds.
  - [x] Exercise exact names and base32 timestamp boundaries on the local filesystem; native CI
    must execute the same example before extending that evidence to other supported systems.

### 4. Deliver masking and safe spelling — compatibility-critical, medium/high effort

- [x] Port HalfSipHash and deterministic key derivation. Evidence: shared reference vectors and
  UTF-8/byte seeds, UTF-16 replacement at JS bridges, little-endian hash words, big-endian block
  words, iteration bounds and wrapping arithmetic agree; chunk boundaries cannot change keys.
- [x] Implement cooperative cancelable derivation without imposing an application runtime.
  Direct and cooperative paths share hash primitives; native boundary tests verify captured seeds
  and stable keys. Browser execution verifies abort-before-poll, mid-work abort/drop and host progress.
- [x] Implement built-in masking and unmasking. Evidence: existing wire fixtures, timestamp overflow,
  checksum rejection and UUID identity preservation match TypeScript.
- [x] Implement custom schemas. Evidence: inverse-direction cases, callback errors and output
  ownership cover reentrancy and retained buffers; immutable built-in codecs share safely, while
  custom callbacks need explicit thread-safety bounds. Finite inverse probes are not a proof.
- [x] Implement sentinels and collision protection. Shared cases cover caller-defined, empty,
  duplicate and invalid definitions. The Rust collision test reaches both alphabet branches and
  fails when the collision guard is removed; owned callback arrays prevent retained aliases.
- [x] Implement explicit key rotation. Evidence: first-match order, all distinct candidates and
  failure behavior match; normalize spelling once, not once per key; never append implicit schemas.
- [x] Add the approved safe masked spelling in TypeScript and Rust together. Evidence: all 132 bits
  survive cross-language conversion, strict padding rejects aliases, and old outputs stay valid.
- [ ] Verify safe masked filenames on supported filesystems. Accept when: exact round trips for normal
  and sentinel values; no chronological-order claim for masked output.

### 5. Complete migration and validation — full parity, medium effort

- [x] Implement freshness validation. Evidence: ordinary and sentinel cases, finite windows, fractions, inclusive
  boundaries and codec-local masked validation match existing semantics.
- [x] Implement the opt-in original fixed-mask reader. Evidence: retained producer fixtures and
  accepted historical aliases match; the unsupported 0.2.0 scheme remains unsupported.
- [x] Implement known-format and mixed-format migration reads. Evidence: priority, sentinel/plain
  collisions, non-v7 plain UUIDs and explicit candidate enumeration match shared cases.
- [x] Implement independent compatibility switches. Evidence: disabling each legacy path removes
  that path while preserving current formats and separately enabled compatibility.
- [x] Implement arbitrary-byte base64url utilities, including allocation-free caller-buffer decoding.
  Shared cases cover empty/malformed text, UTF-16 error priority, exact result slices and offsets.
- [x] Implement guards matching conversion at version, variant, alphabet and padding boundaries.
  Shared cases reject every nonzero plain padding spelling in both alphabets and exercise each
  version nibble/variant prefix; explicit expected rejections prevent mutual false acceptance.
- [x] Implement the v7 entropy predicate. Evidence: shared degenerate/random-field cases match;
  a passing predicate is not described as proof of randomness quality.
- [ ] Reconcile every public capability with both implementations and its shared evidence.
- [x] Run external Rust examples for generation, filenames, rotation and migration against the crate.
  Packaged-source and local Git consumers pass outside the workspace with entropy enabled and
  disabled; the filesystem example preserves exact names and identities on the local filesystem.

### 6. Performance and bridge completion — measured cost reduction, medium effort

- [ ] Reconcile Node and Bun bridge coverage against the public capability mapping. Accept when: every
  shared case reaches Rust; native callback/cancellation checks cover what adapters cannot express.
- [ ] Audit the FFI lifecycle. Accept when: targeted unsafe checks exercise bounds, use-after-release,
  cancellation and teardown; panic never unwinds across C and no failed call leaks owned storage.
  - [x] Run the existing pointer-copy/handle-release regression under Miri; retain native Node/Bun
    checks because Miri does not execute either host's ABI binding.
- [ ] Benchmark direct Rust calls separately from Node/Bun crossings and batched calls.
  Accept when: varied equivalent workloads, optimized artifacts, consumed outputs and repeated paired
  runs distinguish core work from transport and setup; include cheap ordinary single-ID calls.
- [ ] Profile CPU, allocations, retained memory, entropy calls, construction cost and contention.
  Accept when: measurements name reached paths, positive controls, machine/toolchain and limitations;
  throughput alone cannot justify a change.
  - [x] Record optimized direct-call and separate native-bridge timings, CPU time, peak RSS and
    context switches through `bun bench/rust.ts`; validate every process's complete output.
    Peak RSS does not establish allocation volume or leak freedom.
  - [x] Compare owned and caller-buffer decoding under native allocation tracing in both orders;
    validate that each trace executed the selected workload. Owned decoding is the positive
    control; attribute the allocation difference separately from setup and retained memory.
  - [x] Trace first-result migration against candidate enumeration with the same single-key input;
    both execution orders show one fewer allocation per first-result call, including warm-up.
  - [x] Measure real platform entropy calls/bytes and independent generators under thread
    contention. Include thread startup/join cost and keep kernel-call and entropy-quality claims
    outside what these counters can establish.
- [ ] Measure cancellation latency and event-loop blocking through real host execution.
  Accept when: operations exceeding the 4 ms target are bounded/cooperative or off-loop, with 8 ms
  warnings and 32 ms errors; delays never substitute for completion signals.
- [ ] Apply only measured optimizations that preserve contracts. Accept when: paired comparisons of
  affected paths show the benefit and disclose tradeoffs; no unsupported universal speed claim.

### 7. Distribution and release — public maintenance, medium effort

- [ ] Gate Node/Bun/Rust artifacts: failures propagate, required fixtures ship, npm stays native-free.
- [ ] Measure complete feedback lanes and remove redundant evidence. Accept when: routine complete
  lanes, including setup, stay below five minutes with 4–8× headroom; cache by lockfile/toolchain/
  target/profile. Run OS lanes independently; report cold builds separately without exempting them.
- [ ] Validate Git and packaged Cargo consumers outside the workspace; check default/optional
  features, MSRV, license and docs so workspace feature unification cannot hide missing dependencies.
  - [x] Run packaged-source and local Git consumers on the declared Rust minimum, with platform
    entropy enabled and disabled; exercise generation, rotation, migration and safe spellings.
- [ ] Prepare Rust registry authentication and artifact provenance separately from npm release.
  Accept when: current provider requirements verified, credential-free verification precedes publish,
  and attestations identify the actual crate bytes rather than only the source commit.
  - [x] Implement reviewed-crate packaging and checksum preflight; run both locally against
    committed source. Publication and registry attestations remain separate remote actions.
- [ ] Update consumer docs alongside each capability: executable public examples, retained
  migration retirement/rollback consequences, and explicit availability.
- [ ] Audit every changed line against public promises and tasks; reproduce material review
  claims, fix defects and declare unexercised targets/states. Passing tests alone cannot close this.
- [ ] Present release notes, version/tag, artifact, support/provenance and rollback limits before publish.
- [ ] Publish the approved release and verify registry bytes and Git installation. Accept when: downloaded
  package matches the reviewed artifact; both implementations retain their parity checks.

### 8. Security and safety audit — required before publication

- [ ] Deeply audit Rust and TypeScript security and safety, prioritizing randomness correctness.
  Trace every native, portable and WebAssembly generation path to its actual entropy source;
  verify secure defaults, failure propagation, bit preservation, state isolation and concurrency.
  Review seed handling, masking limits, parser/buffer safety and bridge ownership. Use statistical
  probes to detect defects, never as proof of cryptographic security. Fix material findings and
  document evidence and limits before publication; release depends on this audit.
  - [x] Reject partial TypeScript entropy refills without consuming them; verify repeated failure,
    retry, erased consumed bytes and unchanged caller output in Node and Bun. Moving the cursor
    before the source call must make the shared regression fail.
  - [x] Exercise Rust browser v4/v7 generation against real Web Crypto and failing host draws;
    deterministic contracts must make no entropy calls. Keep source-quality limits in security docs.
  - [x] Verify Rust v4/v7 and portable TypeScript v7 entropy-bit preservation with one-hot inputs;
    failed Rust prefixes preserve output and retry state across initialization, rollback and overflow.
