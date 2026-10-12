# Release preparation

## HLD: maintainer requirements

Prepare the repository for release. Preserve supported calls, identifier formats, caller data,
secure randomness and package compatibility. Stop performance experiments and optimization work.
Apply `AGENTS.md` §Work scope before selecting any task; old experiment plans grant no authority.
Release `0.4.0` to npm only. Push the current state and require candidate CI success before
creating and pushing the release version and tag, publishing to npm and finalizing the release.
These remote operations and the temporary npm-only selector are authorized; do not publish the Rust crate.
Update npm and Rust dependencies, including build and development tools, and update CI actions through `actions-up` before release; preserve required compatibility-test fixtures and consumer contracts.
Use the latest Bun, check the project with Bun and TypeScript separately, and enable type checking in every Bun bundler verification.
Use `docs/release.md` for preparation and recovery; this plan does not change existing contracts or checks.

## Verified local baseline

- [x] Local correctness, packed consumers, tree shaking, native interop, both browser WebAssembly profiles and version agreement pass. Evidence: `bench/reports/composition-cleanup-final.log` and `bench/reports/local-release-*.log`; reuse only for unchanged code and toolchains. Coverage is limited to installed hosts; tree-shaking proof covers module boundaries, not individual methods of returned codec objects.

## Authorized release steps

- [ ] Repair CI runtime setup: the default packed-artifact check requires Deno in the main check and credentials-free release preparation. Review the corrected candidate's runtime, OS and architecture results, including Windows; local evidence cannot replace candidate CI.
- [x] Updated dependency and Actions checks pass locally, including separate TypeScript and Bun project and packed-consumer checks, checked Bun builds and their failing control. Evidence: `bench/reports/release-updated-complete.log`, `release-packed-bun-checker.log`, `release-checked-bundle-red.log` and `release-deno-updated-complete.log`. TypeScript 5 remains the compatibility fixture; Cargo's `crypto-common` requires `generic-array =0.14.7` (`release-rust-generic-array.log`). Require corrected candidate CI before release.
- [ ] Before the release tag push, set `RELEASE_PACKAGES_ON_TAG=npm` and verify readback; manual dispatch must also select npm. The prior variable is absent: restore that state after finalization so this release does not change later publication defaults.
- [ ] With green candidate CI, create `0.4.0` through the release command and verify its annotated tag identifies the checked-out commit. Push the release and require credentials-free archive verification before publication; retain both archives' exact bytes per `docs/release.md`.
- [ ] Publish only npm through release CI, verify registry and attachment bytes against retained archives, and finalize only after all selected results and notes match `docs/release.md`.

## Non-blocking timing follow-up

- [ ] Only with explicit named-call authorization, resolve the full-lane Node `Uuid.toMaskedSlug(codec)` timing gap without weakening protected calls or budgets. `bench/reports/api-minimal-complete.log` passes the gate but does not prove parity. Original conversion bodies remain; isolated calls and parsed-value sequences do not reproduce the loss, and context placement and positional arguments do not repair it. This does not block release preparation (`docs/release.md` §Evidence and notes).
