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

## Public TypeScript repair

Fix the reproduced declaration defects without changing UUID bits, wire formats, native generation,
or caller-owned storage identity. Type promises must follow supplied arguments and validated values.

- [x] Separate masking-codec declarations from the oversized shared type owner without changing signatures, comments or executable imports.
- [x] Correct case inference for omitted selectors, explicit generics and reusable options; source and packed-consumer fixtures reject the reproduced omissions.
- [x] Remove obsolete UUID brands from written output types while retaining array subtypes; fixtures cover v4/v7 replacement, conversion and parsed-value writers.
- [x] Require options when a generator call claims retained configuration; fixtures preserve no-options calls and reject invented capabilities.
- [x] Reject assignments that invent codec or payload-layout presets; fixtures preserve general `Uuid` storage and unknown capabilities without runtime state.
- [x] Preserve parsed UUID capabilities, including explicit codec replacement and separately loaded package copies; `probeUuidCopies` executes both retained presets.
- [x] Reject known non-v7 parsed values at v7-only methods; fixtures retain unknown-version calls for runtime validation.
- [x] Verify slug ambiguity, the generation failure split and the error-routing marker against `docs/public-api.md` and runtime tests; these are explicit contracts, not unresolved API defects.
- [ ] Resolve the full-lane Node `Uuid.toMaskedSlug(codec)` slowdown without weakening protected calls or budgets. The original conversion bodies are retained; isolated conversion and the parsed-value sequence do not reproduce the full-lane loss. Context placement and positional arguments do not repair it. `bench/reports/api-minimal-complete.log` passes the gate but still reports a slower median; timing parity remains unproved. Further standalone profiling or optimization needs the named-call authorization in `AGENTS.md` §Work scope.
- [x] Regenerate declarations, inspect source and emitted editor help, run source and packed consumers and the complete check, audit the total diff and commit the API repair. `1e5e72e` contains the repair; `bench/reports/api-minimal-complete.log` records the complete check's zero exit and the unresolved timing evidence.

## TypeScript composition repair

Accept supported value unions without caller casts or duplicate dispatch. Preserve precise results,
known-misuse rejection, generation effects and executable JavaScript.

- [x] Reproduce mixed versions, mixed presets, text/byte extraction and optional generation options in the existing consumer fixture; retained red compiler output identifies receiver and overload failures.
- [x] Repair parsed-value receivers; retain explicit-case inference, caller storage types and wrong-receiver rejection.
- [x] Bridge supported extraction and generation unions; preserve whole-union branded rejection and the undefined-options generation exception.
- [x] Regenerate declarations, inspect source and emitted editor help, prove executable JavaScript unchanged and execute source and packed consumers on both supported compilers.
- [x] Run the complete existing check and inspect every diff hunk; `bench/reports/composition-complete.log` records the zero exit after removing the unnecessary output-writer receiver generic without suppressions. Preserve unresolved performance and release holds.
- [x] Challenge preset independence and bound-method compatibility; retained red diagnostics expose unrelated-capability receiver constraints and overload-order binding failures. Receivers depend only on the used preset and bound omission remains valid.
- [x] Regenerate and review the preset-order declarations and editor help; `bench/reports/composition-preset-complete.log` records the complete check's zero exit. Executable JavaScript remains unchanged, and unsuppressed negative controls fail at the intended expressions under the packed-consumer compiler settings.

## Interrupted-check cleanup

- [x] Reproduce a Node descendant performing a late write after child-only interruption; the signal mutation fails at the late-write assertion, while process-group interruption passes. Readiness and stream closure supply completion signals.
- [x] Stop the owned process group on POSIX, retain Windows supervision and archive then remove the owned interrupted-check declarations.
- [x] Verify the lifecycle repair with the owning supervisor checks and complete check; `bench/reports/composition-cleanup-final.log` records the complete check's zero exit. Owned scratch is absent from both temporary roots; Windows execution remains part of candidate CI.

## Release holds: no release operation is authorized

- [ ] Before publication, match package selection to the npm-only `0.4.0` note in `CHANGELOG.md`; the workflow defaults to both packages. Publication still requires final authorization for that exact operation.
- [ ] Before publication, review the candidate commit's CI results for supported runtimes, operating systems and architectures. Workflow configuration does not prove execution.
- [ ] After authorized tag creation, follow `docs/release.md`: prove the annotated tag identifies the checked-out commit, verify both archives and reuse their exact bytes. Tag authorization does not authorize publication or finalization.
