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
- Reuse contract cases and extend benchmarks, profiling and resource measurements to Rust.
- Consumer application adoption and stored-filename migration are separate work.

Art owns the HLD above; tasks below are engineering proposals, not approved public decisions.
Implementation is not ready for approval while the numbered public decisions below remain open.

## Execution order

Build the shared runner first; then develop plain conversion and hashing independently.
Join them at codec integration. Reuse builds across concurrent checks; isolate benchmarks.
Commit verified parts under AGENTS.md; keep evidence tied to the changed artifact.

### 1. Settle public contracts — high risk reduction, small effort

- [ ] Preserve base64url defaults in both languages: Art's parity and compatibility requirements
  already decide this. Keep plain `slugAlphabet` semantics; select masked output independently.
- [ ] R2 — Obtain Art's sentinel-spelling ruling: safe masked output uses a lossless 27-character
  spelling of the existing sentinel, or the plain 26-character spelling with separate routing.
- [ ] R3 — Obtain Art's binding-support ruling: development-only Node/Bun bridges, or separately
  released bindings with an additional ABI/support commitment. Recommend development-only.
- [ ] R4 — Obtain Art's crate-name ruling; recommend `uuid-slug` to match the repository.
- [ ] Wire one release version into npm and Cargo manifests; reject mismatched package/tag versions.
- [ ] Derive the common-architecture target matrix from supported Rust targets and consumer needs;
  distinguish native execution from cross-compilation. Keep CPU-specific tuning optional.
- [ ] R6 — Resolve the submitted browser WebAssembly question; CPU support does not decide host APIs.
- [ ] Map every public export and codec method to Rust input, result and failure semantics.

### 2. Establish the crate and shared evidence — high risk reduction, medium effort

- [ ] Inspect the native source and its consumers before copying; preserve reusable behavior,
  verify licensing, omit private project identifiers. Done: reviewed source delta and provenance.
- [ ] Compare UUID/entropy/encoding/hash/error/serde dependencies for contract fit and measured
  cost; retain reasons, not sibling version pins. Keep default features explicit and audit the lock graph.
- [ ] Create `rust/Cargo.toml` with the product and unpublished bridge members; external consumers
  link the product alone. Keep OS entropy and bindings outside pure encoding/masking modules.
- [ ] Share wire/hash/original fixtures as data; use one comparator with independent producers.
  A sampled diagnostic may limit printed failures, never which observations determine the result.
- [ ] Parameterize reusable behavioral cases over implementation adapters. Done: the first Rust
  increment runs shared cases; extract existing `test/*-probe.ts` closures without changing their
  expectations. Report missing cases per adapter; aggregate success cannot hide an empty adapter.
- [ ] Define owned/borrowed results and errors that retain causes, without panic or partial success.
- [ ] Inherit workspace lints in every member: deny correctness/suspicious/perf, document public
  APIs, forbid unsafe in the core; isolate necessary FFI exceptions in bridge crates only.
- [ ] Add `cargo fmt --all --manifest-path rust/Cargo.toml --check` to `format:check`; use defaults.
- [ ] Add one `rust:check` to the root check: workspace/all-target/all-feature Clippy with warnings
  denied, then workspace tests including doctests. Run Cargo serially; run JS checks alongside it.
- [ ] Check default, empty and each optional feature independently from Cargo metadata; include
  known interacting combinations. All-features alone hides missing feature dependencies.
- [ ] Run shared parity on native GitHub OS/CPU runners from the first Rust increment; fail missing
  observations. Keep runner selection in the CI matrix, not a second target list in prose.
- [ ] Connect the first Rust capability to Node through N-API. Done: the same shared case reaches
  Rust, preserves error/ownership semantics, and fails when the Rust result is deliberately wrong.
- [ ] Connect that capability to Bun through FFI. Done: the same case reaches Rust; explicit
  lengths, owned handles and matched release functions cover cleanup, bad input and repeated calls.

### 3. Deliver plain identifiers and generation — primary consumer value, medium effort

- [ ] Implement UUID parsing, formatting and byte conversion. Done: shared input-boundary cases
  cover strict text, slices/offsets and unchanged buffers on error; private validated fields prevent
  bypass through constructors or deserialization. Generic UUIDs still accept all version nibbles.
- [ ] Implement both plain alphabets; pass padding, length, byte-order and non-v7 contract cases.
- [ ] Implement UUIDv4 generation. Done: actual entropy-path and bit-layout evidence, including
  failure behavior, without assuming a platform hook exercises the portable implementation.
- [ ] Implement v7 generation/extraction/explicit timestamps; pass bounds without promising strict order.
- [ ] Implement the explicit stateful v7 generator. Done: state transitions and independent
  ownership cover clock rollback, fractional clocks versus explicit instants, counter exhaustion,
  entropy failure/retry and explicit-time calls that leave the current sequence untouched.
- [ ] Verify filesystem-safe plain output through real filesystem round trips on supported
  systems. Done: exact spelling/identity retention and timestamp ordering within promised bounds.

### 4. Deliver masking and safe spelling — compatibility-critical, medium/high effort

- [ ] Port HalfSipHash and deterministic key derivation. Done: shared reference vectors and
  UTF-8/byte seeds, UTF-16 replacement at JS bridges, little-endian hash words, big-endian block
  words, iteration bounds and wrapping arithmetic agree; chunk boundaries cannot change keys.
- [ ] Implement cooperative cancelable derivation without imposing an application runtime.
  Share hash primitives, retain the direct sync path; snapshot mutable inputs before returning
  the future. Prove abort-before-poll, mid-work abort/drop, stable keys and unrelated host progress.
- [ ] Implement built-in masking and unmasking. Done: existing wire fixtures, timestamp overflow,
  checksum rejection and UUID identity preservation match TypeScript.
- [ ] Implement custom schemas. Done: inverse-direction cases, callback errors and output
  ownership cover reentrancy and retained buffers; immutable built-in codecs share safely, while
  custom callbacks need explicit thread-safety bounds. Finite inverse probes are not a proof.
- [ ] Implement sentinels and collision protection. Done: sentinel priority, encode collisions
  and retained callback outputs preserve identity under the shared cases.
- [ ] Implement explicit key rotation. Done: first-match order, all distinct candidates and
  failure behavior match; normalize spelling once, not once per key; never append implicit schemas.
- [ ] Add the approved safe masked spelling in TypeScript and Rust together. Done: all 132 bits
  survive cross-language conversion, strict padding rejects aliases, and old outputs stay valid.
- [ ] Verify safe masked filenames on supported filesystems. Done: exact round trips for normal
  and sentinel values; no chronological-order claim for masked output.

### 5. Complete migration and validation — full parity, medium effort

- [ ] Implement freshness validation. Done: finite nonnegative windows, fractions, inclusive
  boundaries and codec-local masked validation match existing semantics.
- [ ] Implement the opt-in original fixed-mask reader. Done: retained producer fixtures and
  accepted historical aliases match; the unsupported 0.2.0 scheme remains unsupported.
- [ ] Implement known-format and mixed-format migration reads. Done: priority, sentinel/plain
  collisions, non-v7 plain UUIDs and explicit candidate enumeration match shared cases.
- [ ] Implement independent compatibility switches. Done: disabling each legacy path removes
  that path while preserving current formats and separately enabled compatibility.
- [ ] Implement arbitrary-byte base64url utilities. Done: empty input, malformed input and
  canonical encoding match the existing public utilities, not only UUID-sized inputs.
- [ ] Implement guards matching conversion at version, variant, alphabet and padding boundaries.
- [ ] Implement the v7 entropy predicate. Done: shared degenerate/random-field cases match;
  a passing predicate is not described as proof of randomness quality.
- [ ] Reconcile every public capability with both implementations and its shared evidence.
- [ ] Run external Rust examples for generation, filenames, rotation and migration against the crate.

### 6. Performance and bridge completion — measured cost reduction, medium effort

- [ ] Reconcile Node and Bun bridge coverage against the public capability mapping. Done: every
  shared case reaches Rust; native callback/cancellation checks cover what adapters cannot express.
- [ ] Audit the FFI lifecycle. Done: targeted unsafe checks exercise bounds, use-after-release,
  cancellation and teardown; panic never unwinds across C and no failed call leaks owned storage.
- [ ] Benchmark direct Rust calls separately from Node/Bun crossings and batched calls.
  Done: varied equivalent workloads, optimized artifacts, consumed outputs and repeated paired
  runs distinguish core work from transport and setup; include cheap ordinary single-ID calls.
- [ ] Profile CPU, allocations, retained memory, entropy calls, construction cost and contention.
  Done: measurements name reached paths, positive controls, machine/toolchain and limitations;
  throughput alone cannot justify a change.
- [ ] Measure cancellation latency and event-loop blocking through real host execution.
  Done: operations exceeding the 4 ms target are bounded/cooperative or off-loop, with 8 ms
  warnings and 32 ms errors; delays never substitute for completion signals.
- [ ] Apply only measured optimizations that preserve contracts. Done: paired comparisons of
  affected paths show the benefit and disclose tradeoffs; no unsupported universal speed claim.

### 7. Distribution and release — public maintenance, medium effort

- [ ] Gate Node/Bun/Rust artifacts: failures propagate, required fixtures ship, npm stays native-free.
- [ ] Measure complete feedback lanes and remove redundant evidence. Done: routine complete
  lanes, including setup, stay below five minutes with 4–8× headroom; cache by lockfile/toolchain/
  target/profile. Run OS lanes independently; report cold builds separately without exempting them.
- [ ] Validate Git and packaged Cargo consumers outside the workspace; check default/optional
  features, MSRV, license and docs so workspace feature unification cannot hide missing dependencies.
- [ ] Prepare Rust registry authentication and artifact provenance separately from npm release.
  Done: current provider requirements verified, credential-free verification precedes publish,
  and attestations identify the actual crate bytes rather than only the source commit.
- [ ] Update consumer docs alongside each capability: executable public examples, retained
  migration retirement/rollback consequences, and explicit availability.
- [ ] Audit every changed line against public promises and tasks; reproduce material review
  claims, fix defects and declare unexercised targets/states. Passing tests alone cannot close this.
- [ ] Present release notes, version/tag, artifact, support/provenance and rollback limits before publish.
- [ ] Publish the approved release and verify registry bytes and Git installation. Done: downloaded
  package matches the reviewed artifact; both implementations retain their parity checks.
