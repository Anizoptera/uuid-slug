# Release preparation

## HLD: maintainer requirements

Prepare the repository for release. Preserve supported calls, identifier formats, caller data,
secure randomness and package compatibility. Stop performance experiments and optimization work.
Apply `AGENTS.md` §Work scope before selecting any task; old experiment plans grant no authority.
Keep the planned first release at `0.4.0`. Prepare only; release version changes, tags, publication
and finalization require the maintainer's final explicit authorization for each operation.
Use `docs/release.md` for release preparation and recovery. Existing contract owners remain authoritative;
this plan adds no guarantees or acceptance criteria.

## Release holds: no release operation is authorized

- [ ] Before publication, match package selection to the npm-only `0.4.0` note in `CHANGELOG.md`; the workflow defaults to both packages. Publication still requires final authorization for that exact operation.
- [ ] Before publication, review the candidate commit's CI results for supported runtimes, operating systems and architectures. Workflow configuration does not prove execution.
- [ ] After authorized tag creation, follow `docs/release.md`: prove the annotated tag identifies the checked-out commit, verify both archives and reuse their exact bytes. Tag authorization does not authorize publication or finalization.
