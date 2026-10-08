# Release preparation

## HLD: maintainer requirements

Prepare the repository for release. Preserve supported calls, identifier formats, caller data,
secure randomness and package compatibility. Stop performance experiments and optimization work.
Apply `AGENTS.md` §Work scope before selecting any task; old experiment plans grant no authority.
Keep the planned first release at `0.4.0`. Prepare only; release version changes, tags, publication
and finalization require the maintainer's final explicit authorization for each operation.
Use `docs/release.md` for preparation and recovery; this plan does not change existing contracts or checks.

## Verification audit

- [x] Map local checks, CI checks and test helpers to the failures they detect; identify duplicate executions, unused helpers and misplaced test code.
- [x] Read test oracles against their production owners; remove tautologies and unsupported guarantees, and repair false-green or fragile checks with minimal reproducers.
- [x] Check setup, isolation, cleanup and completion signals; reuse equivalent work without merging independent runtime or package evidence.
- [x] Run the affected checks and complete local lane, review the total diff, and commit each finished repair without changing release contracts.

## Release holds: no release operation is authorized

- [ ] Before publication, match package selection to the npm-only `0.4.0` note in `CHANGELOG.md`; the workflow defaults to both packages. Publication still requires final authorization for that exact operation.
- [ ] Before publication, review the candidate commit's CI results for supported runtimes, operating systems and architectures. Workflow configuration does not prove execution.
- [ ] After authorized tag creation, follow `docs/release.md`: prove the annotated tag identifies the checked-out commit, verify both archives and reuse their exact bytes. Tag authorization does not authorize publication or finalization.
