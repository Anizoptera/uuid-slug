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

## Unresolved findings: no repair or experiment is authorized by this plan

`referenceUnixMs: null` selects the current clock; timestamp windows accept class instances.
Parsed `toBytes` treats falsy storage as omission; it and root `uuidToBytes` ignore `outputOffset`
without storage, while `uuidStringToBytes` rejects it. Normal-call controls are in
`bench/reports/ts-release-preparation-consumer-findings.log`; ordinary-call harm and severity are unproven.

An overridden output `set` exposes parsed UUID bytes through parsed, root and codec calls, and cached
sentinel bytes through both codec byte readers. `bench/reports/ts-release-preparation-codec-byte-findings.log`
proves later sentinel decoding changes; normal output mutation does not change retained bytes.
The proposed built-in typed-array writer avoids another copy but remains unimplemented: retention requires unauthorized normal-call measurements, which do not gate preparation (`docs/public-api.md` §Capabilities and runtime work).

- [ ] Proposed type repair: root and codec readers must accept literal-zero offsets on standalone forms, as `docs/public-api.md` §UUID text and bytes requires. Runtime accepts `uuidToString(text, 0)`, `uuidToBytes(text, 0)` and `uuidToPlainSlug(text, 0)`; emitted types reject them. When type edits are authorized, preserve inferred results and add zero/nonzero controls to the existing consumer fixture.
