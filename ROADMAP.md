# Rust implementation roadmap

Build a public Rust crate with TypeScript semantic parity, prioritizing filesystem-safe identifiers.

## HLD — maintainer rulings

- Deliver full Rust functionality with [parity from the first increment](docs/cross-language.md).
- Provide filesystem-safe plain and masked forms in both languages; preserve issued formats.
- Keep the ordinary decode result one UUID; candidate enumeration stays explicit.
- Make each decoder accept every value that a supported matching encoder can produce.
- Keep API verbs recognizable, with language-appropriate types and error handling; base64url
  helpers accept exactly one 16-byte UUID payload and reject every other length.
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

### 1. Close supported-platform evidence

- [ ] Run `.github/workflows/rust.yml` on every native runner. Require nonzero shared-parity
  observations per adapter and real filesystem round trips for plain, masked, and sentinel names.
  Preserve exact spelling and UUID identity, include base32 timestamp boundaries, and make no masked
  ordering claim. Record cold setup and execution separately; each lane must keep 4–8× headroom
  below five minutes. The workflow owns runner and target lists.

### 2. Prepare release evidence

- [ ] Audit every changed line against public promises and tasks; reproduce material review
  claims, fix defects and declare unexercised targets/states. Passing tests alone cannot close this.
- [ ] Present release notes, version/tag, artifact, support/provenance and rollback limits before publish.
- [ ] Maintainer only: publish the approved release; then verify registry bytes and Git installation
  through read-only checks. Require downloaded npm and crate bytes to match the reviewed artifacts,
  then run the documented Git and registry consumer checks for both implementations.
