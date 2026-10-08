# Release preparation

## Maintainer requirements

Prepare the repository for release. Preserve supported calls, identifier formats, caller data,
secure randomness and package compatibility. Stop performance experiments and optimization work.
Apply `AGENTS.md` §Work scope before selecting any task; old experiment plans grant no authority.
Keep the planned first release at `0.4.0`. Prepare only; release version changes, tags, publication
and finalization require the maintainer's final explicit authorization for each operation.
Use `docs/release.md` for release preparation and recovery. Existing contract owners remain authoritative;
this plan adds no guarantees or acceptance criteria.

## Remaining work

- [x] Put the release/performance scope boundary in root agent guidance and its API, benchmark and release instructions; remove optimization campaigns and historical experiment inventories from this plan.
- [x] Review release manifests, exports, packaged files, licenses, API baselines and version agreement. The required repository check, npm archive validator and Cargo archive inspection pass; manifests remain at `0.4.0-dev`.
- [ ] Establish the consumer consequence and triggering input for each retained finding: mutable parsed UUID bytes, null timestamp reference, falsy destination, omitted-storage offset and configuration records. Compare normal calls before proposing repairs or release decisions; reproductions alone do not establish release impact.
- [x] Reconcile the changelog under `0.4.0`; the real note extractor includes the unreleased changes and excludes prior releases. Correct native generation and failure claims from source; preserve the existing npm-only publication note. Before publication, ensure package selection agrees with that note; the workflow default is both packages.
- [ ] Verify source and packed consumers across the supported runtime and browser paths, plus the required Rust and WebAssembly checks. Reuse valid evidence and rebuild only what changed.
- [x] Repair the newest-runtime workflow conditions: the latest-Bun steps use the normalized Node channel emitted by `scripts/node-floor.ts`. Selector controls and `actionlint` pass; remote execution remains unverified.
- [x] Verify local archive validation, version agreement, history selection and recovery through the existing release tests and archive validators. The actual annotated-tag preflight remains unavailable until the maintainer authorizes a release tag; no tag or publication is needed for this audit.
- [ ] Remove this work's disposable output and resolved failure artifacts; preserve necessary reproductions and reusable caches.
- [ ] Run the required repository checks, inspect every failure, commit focused changes and report the remaining release actions from evidence.

## Existing evidence

API, consumer, browser, WebAssembly and cleanup evidence lives in the existing test harnesses and
`bench/reports/ts-release-audit-*` and `bench/reports/ts-release-preparation-*`. Both WebAssembly profiles pass in the configured browser engines. Historical performance conclusions belong in
`bench/PERFORMANCE.md`; they do not authorize more experiments or become release prerequisites.
