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
- Remote write operations are forbidden; do not push, open PRs, upload tags, create releases,
  publish packages, or change remote settings. Keep implementation and commits local.

Art owns the HLD above; tasks below are engineering proposals, not approved public decisions.
Public choices are recorded above; verify the engineering tasks below before claiming readiness.

## Holds

- Preserve call-time byte-seed capture. Large snapshots can block the caller, but no input limit or
  ownership change is approved. `bench/PERFORMANCE.md` owns the measurements and limits.
- Native CI evidence requires Art to authorize its remote execution. Local checks cannot replace it.
- Release version selection and every remote release operation require separate approval.

## Execution order

### 1. Close local responsiveness and security evidence

- [ ] Measure cancellation latency and event-loop blocking through real host execution.
  Use completion signals, verify results against synchronous construction, and measure initial
  snapshots, allocation, garbage collection, scheduling, and cancellation on each supported host.
  Preserve call-time byte ownership. Record evidence and limits in `bench/PERFORMANCE.md`.
- [ ] Audit Rust and TypeScript security boundaries together. Trace each entropy path, failure and
  retry state, masking boundary, parser write guarantee, bridge ownership, and unsafe boundary.
  Fix material defects and update `docs/security.md` only when the durable boundary changes.

### 2. Close supported-platform evidence

- [ ] Run `.github/workflows/rust.yml` on every native runner. Require nonzero shared-parity
  observations per adapter and real filesystem round trips for plain, masked, and sentinel names.
  Preserve exact spelling and UUID identity, include base32 timestamp boundaries, and make no masked
  ordering claim. The workflow owns runner and target lists.

### 3. Prepare release evidence

- [ ] Measure complete feedback lanes and remove redundant evidence. Accept when: routine complete
  lanes, including setup, stay below five minutes with 4–8× headroom; cache by lockfile/toolchain/
  target/profile. Measure native OS lanes independently and report cold setup separately.
- [ ] Prepare Rust registry authentication and artifact provenance separately from npm release.
  Prepare locally; only the maintainer may configure remote credentials or trigger publication.
  Accept when: current provider requirements verified, credential-free verification precedes publish,
  and attestations identify the actual crate bytes rather than only the source commit.
- [ ] Audit every changed line against public promises and tasks; reproduce material review
  claims, fix defects and declare unexercised targets/states. Passing tests alone cannot close this.
- [ ] Present release notes, version/tag, artifact, support/provenance and rollback limits before publish.
- [ ] Maintainer only: publish the approved release; then verify registry bytes and Git installation
  through read-only checks. Require downloaded npm and crate bytes to match the reviewed artifacts,
  then run the documented Git and registry consumer checks for both implementations.
