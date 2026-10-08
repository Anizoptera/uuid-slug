# Release preparation

## Maintainer requirements

Prepare the repository for release. Preserve supported calls, identifier formats, caller data,
secure randomness and package compatibility. Stop performance experiments and optimization work.
Apply `AGENTS.md` §Work scope before selecting any task; old experiment plans grant no authority.
Keep the planned first release at `0.4.0`; publishing and remote writes require separate authorization.
Use `docs/release.md` for release preparation and recovery. Existing contract owners remain authoritative;
this plan adds no guarantees or acceptance criteria.

## Remaining work

- [x] Put the release/performance scope boundary in root agent guidance and its API, benchmark and release instructions; remove optimization campaigns and historical experiment inventories from this plan.
- [ ] Review release manifests, exports, packaged files, licenses, API baselines and version agreement. Fix actual release defects; do not turn missing performance comparisons into blockers.
- [ ] Review the known private-byte exposure, null timestamp reference, falsy destination, omitted-storage offset and configuration-record issues against the published contracts. Preserve their existing reproductions; use owning correctness tests for necessary repairs, not another benchmark campaign.
- [ ] Reconcile the existing changelog with the planned release and prepare consumer-facing release notes. Preserve the maintainer's package-selection decision; raise a real conflict rather than inventing one.
- [ ] Verify source and packed consumers across the supported runtime and browser paths, plus the required Rust and WebAssembly checks. Reuse valid evidence and rebuild only what changed.
- [ ] Verify local release preparation, history selection, archive validation and recovery without credentials, publication, version changes or tag creation. Report any step that requires the release tag rather than fabricating it.
- [ ] Remove this work's disposable output and resolved failure artifacts; preserve necessary reproductions and reusable caches.
- [ ] Run the required repository checks, inspect every failure, commit focused changes and report the remaining release actions from evidence.

## Existing evidence

API, consumer, browser, WebAssembly and cleanup evidence lives in the existing test harnesses and
`bench/reports/ts-release-audit-*`. Historical performance conclusions belong in
`bench/PERFORMANCE.md`; they do not authorize more experiments or become release prerequisites.
