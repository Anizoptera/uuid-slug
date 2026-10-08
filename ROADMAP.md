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
- [x] Establish retained findings with normal-call controls; `bench/reports/ts-release-preparation-consumer-findings.log` records each trigger and result. An overridden output `set` can retain and mutate parsed UUID bytes. Null timestamp references select the current clock, falsy destinations select fresh storage, omitted-storage offsets are ignored inconsistently, and timestamp windows accept class instances. These observations do not establish ordinary-call harm or release severity.
- [x] Reconcile the changelog under `0.4.0`; the real note extractor includes the unreleased changes and excludes prior releases. Correct native generation and failure claims from source; preserve the existing npm-only publication note. Before publication, ensure package selection agrees with that note; the workflow default is both packages.
- [x] Verify local source and packed consumers: Bun, installed Node 22/24/26, Deno and packed Chromium/Firefox/WebKit checks pass; Rust checks and both WebAssembly profiles pass. Other Node majors, operating systems and architectures remain unexecuted locally; configured CI is not execution evidence.
- [x] Repair the cross-runtime probe to replay recorded requests. Bun and installed Node 22, 24 and 26 pass the same corpus; deliberate result corruption fails with its matching request. Local generator checks remain intact.
- [x] Repair the newest-runtime workflow conditions: the latest-Bun steps use the normalized Node channel emitted by `scripts/node-floor.ts`. Selector controls and `actionlint` pass; remote execution remains unverified.
- [x] Verify local archive validation, version agreement, history selection and recovery through the existing release tests and archive validators. The actual annotated-tag preflight remains unavailable until the maintainer authorizes a release tag; no tag or publication is needed for this audit.
- [x] Remove disposable npm, Cargo and runtime-probe outputs and generated heap/CPU snapshots; preserve reproductions, source captures, logs and reusable caches.
- [x] Run the required repository checks and commit focused repairs; the runtime replay repair passes `bun run check` and the commit hook. No release operation is authorized.
- [ ] Resolve the correctness-repair evidence boundary before changing shared byte writers: the immutable-value contract requires private storage, but retained rare-misuse defenses require new normal-call measurements while standalone experiments remain unauthorized. The proposed repair uses the built-in typed-array writer instead of caller-overridden `set`, without an extra copy.

## Existing evidence

API, consumer, browser, WebAssembly and cleanup evidence lives in the existing test harnesses and
`bench/reports/ts-release-audit-*` and `bench/reports/ts-release-preparation-*`. Both WebAssembly profiles pass in the configured browser engines. Historical performance conclusions belong in
`bench/PERFORMANCE.md`; they do not authorize more experiments or become release prerequisites.
