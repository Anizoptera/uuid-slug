# Release preparation

## HLD: maintainer requirements

Prepare the repository for release. Preserve supported calls, identifier formats, caller data,
secure randomness and package compatibility. Stop performance experiments and optimization work.
Apply `AGENTS.md` §Work scope before selecting any task; old experiment plans grant no authority.
Keep the planned first release at `0.4.0`. Prepare only; release version changes, tags, publication
and finalization require the maintainer's final explicit authorization for each operation.
Use `docs/release.md` for preparation and recovery; this plan does not change existing contracts or checks.

## Verified local baseline

- [x] Local correctness, packed consumers, tree shaking, native interop, both browser WebAssembly profiles and version agreement pass. Evidence: `bench/reports/composition-cleanup-final.log` and `bench/reports/local-release-*.log`; reuse only for unchanged code and toolchains. Coverage is limited to installed hosts; tree-shaking proof covers module boundaries, not individual methods of returned codec objects.

## Release steps requiring authorization

- [ ] After explicit push authorization, run candidate CI and review its supported runtime, OS and architecture results, including Windows. Local evidence cannot replace candidate CI.
- [ ] Before an authorized release tag push, select npm with `RELEASE_PACKAGES_ON_TAG=npm`; manual dispatch must also select npm. The workflow defaults to both packages, but `CHANGELOG.md` excludes the Rust crate from `0.4.0`. Changing the remote variable requires separate authorization.
- [ ] After explicit release-version and tag authorization, follow `docs/release.md`: verify the annotated tag identifies the checked-out commit, prepare and verify both archives without publication credentials, and retain their exact bytes. Version or tag authorization does not authorize publication.
- [ ] With explicit authorization for each operation, follow `docs/release.md`: publish only npm, verify registry and attachment bytes against retained archives, and finalize only after all selected results and notes match.

## Non-blocking timing follow-up

- [ ] Only with explicit named-call authorization, resolve the full-lane Node `Uuid.toMaskedSlug(codec)` timing gap without weakening protected calls or budgets. `bench/reports/api-minimal-complete.log` passes the gate but does not prove parity. Original conversion bodies remain; isolated calls and parsed-value sequences do not reproduce the loss, and context placement and positional arguments do not repair it. This does not block release preparation (`docs/release.md` §Evidence and notes).
