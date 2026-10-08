# Release preparation

## HLD: maintainer requirements

Prepare the repository for release. Preserve supported calls, identifier formats, caller data,
secure randomness and package compatibility. Stop performance experiments and optimization work.
Apply `AGENTS.md` §Work scope before selecting any task; old experiment plans grant no authority.
Keep the planned first release at `0.4.0`. Prepare only; release version changes, tags, publication
and finalization require the maintainer's final explicit authorization for each operation.
Use `docs/release.md` for release preparation and recovery. Existing contract owners remain authoritative;
this plan adds no guarantees or acceptance criteria.

## TypeScript release audit

- [ ] Review every exported operation, type and option against caller jobs, defaults, ownership, error composition and documented contracts.
- [ ] Reproduce suspected contract failures with valid neighboring calls; inspect existing tests before adding a missing falsifier.
- [ ] Verify source types, emitted declarations, editor help and actual packed consumers through the existing harness; distinguish each check's coverage.
- [ ] Resolve findings within existing authority, record remaining consumer consequences and give a release verdict without new optimization work or release operations.

## Release holds: no release operation is authorized

- [ ] Before publication, match package selection to the npm-only `0.4.0` note in `CHANGELOG.md`; the workflow defaults to both packages. Publication still requires final authorization for that exact operation.
- [ ] Before publication, review the candidate commit's CI results for supported runtimes, operating systems and architectures. Workflow configuration does not prove execution.
- [ ] After authorized tag creation, follow `docs/release.md`: prove the annotated tag identifies the checked-out commit, verify both archives and reuse their exact bytes. Tag authorization does not authorize publication or finalization.

## Unresolved findings: no repair or experiment is authorized by this plan

`referenceUnixMs: null` selects the current clock; timestamp windows accept class instances.
Parsed UUID `toBytes` treats `null`, `false`, `0` and `""` as omitted storage. Without output storage,
it and root `uuidToBytes` ignore `outputOffset`; `uuidStringToBytes` rejects it. Normal-call controls are in
`bench/reports/ts-release-preparation-consumer-findings.log`; ordinary-call harm and severity are unproven.

An overridden output `set` exposes parsed UUID bytes through parsed, root and codec calls, and cached
sentinel bytes through both codec byte readers. `bench/reports/ts-release-preparation-codec-byte-findings.log`
proves later sentinel decoding changes; normal output mutation does not change retained bytes.
The proposed repair uses the built-in typed-array writer without another copy. It remains unimplemented:
retention requires normal-call measurements, which are not authorized. Missing performance evidence
does not gate this audit (`docs/public-api.md` §Capabilities and runtime work).
