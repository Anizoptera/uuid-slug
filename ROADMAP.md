# Rust implementation roadmap

Build a public Rust crate with TypeScript semantic parity, prioritizing filesystem-safe identifiers.

## HLD — maintainer rulings

- Deliver full Rust functionality; maintain parity from the first Rust increment under
  [the cross-language contract](docs/cross-language.md).
- Provide filesystem-safe plain and masked forms in both languages; preserve issued formats.
- Keep the ordinary decode result one UUID; candidate enumeration stays explicit.
- Keep API verbs recognizable, with language-appropriate types and error handling.
- Reuse the existing native implementation as source material, then refine it for public use.
- Allow small, evidence-justified Rust dependencies; keep npm native-free and dependency-free.
- Support Git installation and crates.io publication with maintained releases and provenance.
- Reuse contract cases and extend benchmarks, profiling and resource measurements to Rust.
- Consumer application adoption and stored-filename migration are separate work.

This roadmap owns unfinished tasks. Durable contracts belong in README and `docs/`; do not link
production code or permanent design rules back to task IDs. No crate or new encoding is shipped
by this document. Registry publication is a later action, after the concrete release is reviewed.

## Execution order

Tasks are dependency-constrained WSJF order: prevent identity loss and contract drift first,
then complete capabilities, measure costs, and prepare distribution. Effort is relative, not a
time estimate. Within a phase, follow listed order unless independent work can run without
contention. Each checkbox is its own task and names its completion evidence. Do not collapse or
discard unfinished entries. Update status only after inspecting that evidence.

### 1. Settle public contracts — high risk reduction, small effort

- [ ] Specify encoding selection and defaults for both languages; resolve any changed public
  behavior with the maintainer before implementation. Done: approved caller examples.
- [ ] Specify safe masked sentinel spelling, collision rejection, format inference and migration
  routing. Done: unambiguous examples covering ordinary IDs, reserved IDs and overlapping forms.
- [ ] Decide whether Node N-API and Bun FFI are development bridges or separately supported
  products. Done: approved distribution boundary; npm remains native-free either way.
- [ ] Settle crate name, initial version, release/tag policy and ownership. Done: maintainer ruling
  plus current registry availability and licensing checks; availability is not a reservation.
- [ ] Define supported Rust targets, MSRV and optional features from actual consumer needs.
  Done: a bounded support matrix and examples that compile on its minimum toolchain.
- [ ] Compare public call sites for all existing exports and codec methods. Done: a capability
  mapping with input, result and failure semantics; missing features remain individually tracked.

### 2. Establish the crate and shared evidence — high risk reduction, medium effort

- [ ] Inspect the native source and its consumers before copying; preserve reusable behavior,
  verify licensing, omit private project identifiers. Done: reviewed source delta and provenance.
- [ ] Compare dependency candidates by responsibility: UUID representation/generation, entropy,
  encoding, hashing, errors and serialization. Done: contract eliminations and measurements of
  live alternatives, with reasons retained beside the chosen implementation.
- [ ] Create the Rust workspace and library with a small public surface and safe core.
  Done: ordinary external consumer builds; development bridges are separate from the crate.
- [ ] Share existing wire, hash and original-producer fixtures across TypeScript and Rust.
  Done: both consume the same expected data without treating either implementation as the oracle.
- [ ] Parameterize reusable behavioral cases over implementation adapters. Done: the first Rust
  capability runs shared cases immediately; unsupported capabilities remain explicit failures or
  tracked omissions, never a green full-parity claim.
- [ ] Define Rust errors and owned/borrowed result types. Done: malformed inputs, entropy failure
  and custom-schema failure retain their causes without panic or partially successful output.
- [ ] Gate each Rust increment in ordinary CI alongside TypeScript. Done: the shared cases for
  implemented capabilities run from the first increment; add each new capability to that lane.

### 3. Deliver plain identifiers and generation — primary consumer value, medium effort

- [ ] Implement UUID parsing, formatting and byte conversion. Done: shared input-boundary cases
  and round trips; every checked construction path validates its promised version and variant.
- [ ] Implement plain base64url and base32hex conversion. Done: shared canonical-padding,
  alphabet, length and byte-order cases, including non-v7 UUIDs.
- [ ] Implement UUIDv4 generation. Done: actual entropy-path and bit-layout evidence, including
  failure behavior, without assuming a platform hook exercises the portable implementation.
- [ ] Implement UUIDv7 generation, timestamp extraction and explicit-timestamp operations.
  Done: shared timestamp boundaries and generation guarantees, without stronger ordering promises.
- [ ] Implement the explicit stateful v7 generator. Done: state transitions and independent
  generator ownership are exercised through its public interface.
- [ ] Verify filesystem-safe plain output through real filesystem round trips on supported
  systems. Done: exact spelling/identity retention and timestamp ordering within promised bounds.

### 4. Deliver masking and safe spelling — compatibility-critical, medium/high effort

- [ ] Port HalfSipHash and deterministic key derivation. Done: shared reference vectors and
  string/byte seed cases, including byte order and iteration settings.
- [ ] Implement cooperative cancelable derivation without imposing an application runtime.
  Done: cancellation and host progress observed through real completion signals; synchronous
  small work retains a direct path and derived keys match.
- [ ] Implement built-in masking and unmasking. Done: existing wire fixtures, timestamp overflow,
  checksum rejection and UUID identity preservation match TypeScript.
- [ ] Implement custom schemas. Done: inverse-direction cases, callback errors and output
  ownership exercise the real public interface without hiding invalid custom behavior.
- [ ] Implement sentinels and collision protection. Done: sentinel priority, encode collisions
  and retained callback outputs preserve identity under the shared cases.
- [ ] Implement explicit key rotation. Done: first-match order, all distinct candidates and
  failure behavior match; no implicit schema increases the caller's false-accept surface.
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
- [ ] Implement UUID and slug guards. Done: each version, variant, alphabet and padding boundary
  matches conversion semantics without imposing stronger guarantees.
- [ ] Implement the v7 entropy predicate. Done: shared degenerate/random-field cases match;
  a passing predicate is not described as proof of randomness quality.
- [ ] Reconcile the phase-1 public capability mapping. Done: every exported capability has an
  implementation and relevant evidence; add a separate task for each discovered omission.
- [ ] Verify consumer-shaped Rust examples for generation, filenames, rotation and migration.
  Done: examples compile and run against the public crate without changing another application.

### 6. Native bridges and performance — measured cost reduction, medium effort

- [ ] Connect shared Node cases through N-API under the approved distribution boundary.
  Done: public Rust calls execute with correct ownership, errors and cleanup in Node.
- [ ] Connect shared Bun cases through FFI under the approved distribution boundary.
  Done: real calls cover lengths, lifetimes, errors and cleanup; unsafe code stays isolated and
  justified at the ABI. Generated declarations and loaded binaries agree.
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

- [ ] Complete distribution checks in the existing parity lane. Done: relevant Node/Bun/Rust
  paths run, failures propagate, required fixtures ship, and npm contains no native code.
- [ ] Measure complete feedback lanes and remove redundant evidence. Done: routine complete
  lanes stay below five minutes with 4–8× headroom; fast lanes and hooks meet their stated budgets.
- [ ] Validate Git installation and the actual Cargo package from isolated consumer projects.
  Done: published-file selection, optional features, MSRV, license and docs work outside the tree.
- [ ] Prepare Rust registry authentication and artifact provenance separately from npm release.
  Done: current provider requirements verified, credential-free verification precedes publish,
  and attestations identify the actual crate bytes rather than only the source commit.
- [ ] Update consumer docs and durable design explanations as capabilities become available.
  Done: examples use real public names, migration retirement/rollback consequences remain clear,
  and planned behavior is never presented as released.
- [ ] Audit the total implementation diff against all public promises and this task list.
  Done: inspect every changed line, resolve material defects, independently check review claims,
  and report unexercised targets/states instead of treating passing tests as complete proof.
- [ ] Prepare release notes and the concrete Rust release for maintainer review. Done: version,
  tag, artifact, support limits, provenance path and rollback limits are reviewable before publish.
- [ ] Publish the approved release and verify registry bytes and Git installation. Done: downloaded
  package matches the reviewed artifact; both implementations retain their parity checks.
