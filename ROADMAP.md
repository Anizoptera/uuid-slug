# Remaining work

## Cross-runtime implementation comparison

Compare every maintained TypeScript runtime, native Rust feature variant and WASM variant on equivalent API jobs; cover API variants and common scenarios, retain raw evidence, and generate a rerunnable Markdown report centered on relative differences and uncertainty. Keep small fluctuations out of rankings. Benchmark work is authorized; product changes, publication and remote writes are not.

- [ ] Map existing workloads and runtime/build variants; identify missing API jobs and distinguish direct calls from transport overhead.
- [ ] Reuse the measurement and correctness corpus across runtime variants; add missing jobs without changing product behavior.
- [ ] Implement one rerun command, raw evidence validation and a generated relative report with explicit coverage and uncertainty.
- [ ] Falsify reporting with identical controls, reversed comparisons, missing lanes and invalid measurements; run the complete selected matrix without overlapping timing workloads.
- [ ] Review the generated report against raw records, document rerun controls and limits, commit the results and remove owned scratch.

## Joint Rust and TypeScript release preparation

Deliver the same capabilities and identifier formats through APIs natural to each language, with correct and predictable consumer experience first, performance and resource efficiency second, and maintenance simplicity third.

### Design, authority and completion

Preserve issued identifiers, secure entropy, caller ownership and typed failures. Keep Rust's owned `Uuid` value, immutable masking codecs and separately owned mutable generators. Keep one published Rust crate and the dependency-free TypeScript package; keep Rust dependencies when they do the best reasonable job, replacing them only for demonstrated performance or resource gains without quality loss. Keep `std` optional. Prepare the matching version selected by both manifests (currently `0.6.0-dev`, candidate `0.6.0`); do not change release versions as part of preparation.

Derive internals from these requirements; do not change user-visible APIs, behavior, guarantees or risks without a maintainer ruling. Local implementation, investigation, documentation, verification and focused commits on the current branch are authorized. Release versions, tags, pushes, publication, remote settings/secrets and finalization require explicit authorization for each operation; preparation grants none.

This is the sole live plan. Keep dependent repairs with their task and unrelated unfinished work below. Completion requires acceptance evidence tied to its command, revision, features, profile and target, with coverage limits. Replace superseded evidence; retain only what a remaining decision needs. Durable contracts belong in their existing owners.

- [ ] Refresh the development archives referenced by `bench/reports/joint-current-artifacts.LihLzb/refresh.json` before release use: they predate masked binary support and the reader type corrections. Stable-tag verification remains separate.

Use `bench/decisions.md` for codec, interoperability, storage and O2 choices, rejected alternatives and measurement limits. Deno base32 parity, other native-platform execution, hosted docs.rs, remote job duration and trusted publishing remain unverified. Keep existing regression gates; missing performance comparisons do not block preparation or authorize new experiments.

### Release holds

- [ ] Authorization required: change to the release version/create its tag only after explicit approval; run the exact-tag preparation gate and review generated release notes before any authorized push/publication.
- [ ] Authorization required: publish both verified artifacts under `dev/release.md`, verify registry bytes, configure trusted publishing, remove/revoke the bootstrap credential and verify remote state. Retain the original package selection and verified archives on partial retries; never move a published tag or omit a selected package. Keep the release draft until destinations, attachments, notes and provenance match.

## Runtime support

- [ ] Decide later whether to also publish to JSR, where Deno can load the TypeScript source; it needs a ruling against the one-npm-package rule in `dev/cross-language.md`, a condition-free Deno entry and slow-types checks.
- [ ] Propose the Aponte agent-gotcha rule (packed-consumer checks must match real install layout) and write it only with approval.

## Follow-up

- [ ] Resolve the advisory affecting competitor `slugid` through its `uuid ^9` dependency. Keep this dev-only comparison on the upstream dependency graph; do not silently override it.

- [ ] Resolve the upstream-relative Node base32 gap: its median stays about 3% higher; one full lane fails at 1.031 [1.0033, 1.1382], while the unchanged replay and seven-runtime matrix pass. The pre-reduction control also has a higher median; a direct comparison finds no resolved loss from the four reductions. Cause and parity remain unproved; preserve both outcomes and the full filter (`bench/decisions.md` §Historical base32 slowdown).
