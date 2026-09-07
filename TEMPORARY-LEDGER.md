Implement the approved audit repairs, prove each changed behavior, and keep dependency work on hold until Art releases it.

# Working ledger

This temporary SOP owns the implementation checklist and evidence. Keep unfinished items here until completed; durable contracts belong in their existing project owners.

## Authority and boundaries

- Baseline: `5cea76decbe953ac0cb64f7daf1cc344dc65a941`; implement the full approved audit plan.
- Preserve the masked wire format, timestamp bound, 16-bit check, raw sentinels, first-match key rotation, optional brands, public default schema, plain-only base32hex, and zero runtime dependencies.
- Do not add an intra-millisecond ordering guarantee, old aliases, compatibility decoders, or new cipher.
- Freshness windows must be finite and nonnegative; zero and fractions remain valid, with inclusive symmetric boundaries.
- Art has reserved `publish-clean` for another agent. Do not change that repository or its dependency integration until Art explicitly releases it. The delegated extension task was interrupted immediately after this instruction; await its no-change/readback report.
- No publication or tag is authorized by this ledger. Prepare and verify changes before any necessary release decision.
- WIP limit: one implementation unit. Add the regression first, observe failure, fix, run targeted checks, review the whole unit, and commit only owned paths. Art’s latest instruction reserves full checks for full-work completion and overrides the earlier check-before-every-commit rule.

## Ordered implementation checklist

### A. Identity and configuration — complete

Implemented sentinel-aware byte encoding, collision rejection, public sentinel return type, protected schema witness/cause handling, scalar capture, immutable sentinel metadata, and own-key alphabet lookup. All original eight regressions failed before repair. Targeted Node contract/core/mask tests and Bun contract/golden tests pass; typecheck and lint pass. No wire-format changes. The commit records the final unit diff.

### B. Runtime and freshness contracts — complete

Custom generators now govern both alphabets; absent output buffers use effective-capacity checks; explicit invalid instants cannot become clock requests. Entropy and clock exceptions retain typed causes; v4 implementation is shared instead of duplicated. Bun hooks have narrow branded signatures. Freshness reads once, rejects invalid finite-window/clock settings, and preserves inclusive fractional bounds. Seven Bun regressions failed before repair; targeted Node runtime/buffer/generator tests and Bun boundary cases pass. Full-tree typecheck temporarily sees the independent benchmark task’s in-progress edits; scoped checks govern this unit until that task finishes.

### C. Distribution and verification — active

- [ ] Refactor archive checker into inspection of a supplied final archive; keep current pack entry operational until dependency extension is available.
- [ ] Execute extracted package-name imports under Node and Bun; cover custom generators, sentinels, conversions, brands, and buffer identity.
- [ ] Execute packed browser/default exports in Chromium and Deno; use a Node-floor-compatible JavaScript consumer harness.
- [ ] Reject all runtime dependency declarations; inspect actual module graphs rather than import regex blacklists.
- [ ] Couple runtime CI floor to manifest; typecheck browser config.
- [ ] Replace README parsing gates with executable contract/example tests.
- [ ] Isolate tree-shaking temporary directories and cleanup.
- [ ] Use Oxc declaration emission with required explicit annotations; retain semantic typecheck and test TypeScript 5.7 consumer compatibility.
- [ ] Run distribution checks, review, and commit.

### D. Release gates

- [ ] Share structured Markdown release-note extraction between local validation and CI; ignore headings in fences, reject missing/empty sections, preserve original section bytes.
- [ ] Validate tag/manifest and notes before any upload; test failures through executable process seams.
- [ ] Require reusable credential-free runtime/browser checks on tagged revisions; preserve trusted workflow filename and permission separation.
- [ ] Compare archive to registry integrity before existing-version repair/attestation; reject mismatches; update existing GitHub release notes.
- [ ] Wire exact validated archive publication after dependency hold is released; preserve tag-derived dist-tag.
- [ ] Verify failure-sensitive workflow/process tests, review, and commit.

### E. Measurements and consumer documentation

- [ ] Reject failed, empty, missing, or malformed benchmark child output per requested member; preserve partial evidence and nonzero status.
- [ ] Benchmark real plain/masked conversions and rotation paths; retain informative metrics without arbitrary throughput gates.
- [ ] Replace public fallback seed in quick start with required configuration; retain explicitly ruled defaults.
- [ ] Correct uniqueness, crypto-strength, inverse-proof, masked/plain overlap, and runtime-coverage claims.
- [ ] Explain freshness versus expiry/authentication and database lookup of decoded candidates.
- [ ] Keep README/API comments, design rationale, and benchmark procedure in their existing owners; condense project guidance without losing operative rulings or modifying global guidance.
- [ ] Retain tricky wire-format comments; remove stale histories/rates and incorrect implementation explanations.
- [ ] Run full check, review, and commit.

### F. Dependency extension — held by Art

- [ ] Wait for explicit release of `publish-clean`; inspect its then-current tree and avoid the other agent's changes.
- [ ] Implement optional nonempty `publish-clean.validateArtifact` argv setting: append absolute final tarball path, package cwd, no shell, all modes, before retention/upload.
- [ ] Fail invalid config, launch/nonzero, or archive mutation; quiet guard success and useful failure diagnostics; reuse existing infrastructure with no runtime dependencies/repack.
- [ ] Add subprocess tests for validation order, upload prevention, unchanged bytes, hostile arguments, and cleanup; update help/docs; run package check and commit scoped changes.
- [ ] Independently audit dependency result and arrange its reviewed registry release before adopting a normal registry dependency; no Git/local pin.
- [ ] Switch uuid-slug to configured validator with one packing invocation; prove no recursive pack and exact inspected/uploaded/attested bytes.

### G. Final acceptance

- [ ] Reconcile every item above with source, tests, and evidence; retain any held work explicitly.
- [ ] Run required local check, browser/Deno, supported Node matrix, declaration floor, and publication process regressions.
- [ ] Audit full accumulated diff against baseline for accidental API/wire changes, unnecessary code, missing guards, stale docs, and foreign edits.
- [ ] Confirm granular commits and clean owned tree; report actual limits without claiming DO-178C or cryptographic assurance.

## Evidence and progress

- Audit baseline: existing check passed 190 Vitest and 88 Bun tests; Chromium passed two tests and Deno smoke passed. Independent probes nevertheless reproduced identity, runtime, freshness, schema, and benchmark failures described above.
- Codec work is active. Benchmark fixes are delegated as an independent bounded task; root must review its diff and evidence before accepting it. No dependency work is active.
- Art requires fast feedback: target/warn/error 0.3/1/5 seconds per case, 3/20/30 seconds per fast lane, 1/10/20 seconds per hook, and 30/240/300 seconds per complete routine lane. Timers bound hangs, never establish readiness.
- All HLD changes require Art’s ruling; internal implementation choices derive from the already accepted behavior. No additional end-user scope has been proposed.

## Open issues and proposals

- Dependency extension and final publication integration are held by Art, not omitted.
- Oxc scratch declaration emission rejected inferred declarations in `defaultCodec` and the alphabet map; explicit public typing must be verified rather than suppressing the current TypeScript integration warning.
- Publication remains a separate reviewed action; registry dependency availability must be checked when the dependency hold is released.
