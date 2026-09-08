Prepare uuid-slug for its next release, then stop before versioning or publication.

# Working ledger

## Authority and boundaries

Art approved the audit implementation, runtime performance work, regression protection, and additive asynchronous schema construction. Baseline: `5cea76decbe953ac0cb64f7daf1cc344dc65a941`.

Preserve masked wire bytes, the timestamp bound and 16-bit check, raw sentinels, explicit first-match key rotation, optional brands, the public default schema, plain-only base32hex, and zero runtime dependencies. Do not add intra-millisecond ordering, compatibility decoders, old aliases, or a new cipher. Freshness windows remain finite and nonnegative, including zero/fractions and inclusive symmetric boundaries.

Art authorized releasing publish-clean and adopting its registry version. That release is complete. The current stopping instruction is: “Complete the work Until everything ready for the next release, On that moment, stop and report back to me.” Do not bump, tag, push, or publish uuid-slug. Keep release notes under Unreleased until Art selects the version.

Internal changes derive from these contracts; user-visible changes require Art's ruling. Use explicit-path commits and preserve foreign edits. Timeouts bound hangs, never establish readiness or substitute for performance measurements.

## Completed implementation

- [x] Preserve identity and configuration: sentinel collision handling, PublicUuidV7Slug results, protected metadata/schema witnesses, captured options, callback causes, and invalid alphabet/mask rejection. Shared Node/Bun boundary and wire regressions exercise the repairs.
- [x] Repair runtime and freshness boundaries: injected generators, omitted-buffer offsets, explicit timestamps, entropy/clock causes, finite fractional freshness, and runtime-specific capability handling. Shared cases run in both adapters.
- [x] Validate distribution and release integrity: extracted package-name consumers, TypeScript 5.7 declarations, module/dependency checks, Markdown AST release notes, tag/manifest matching, tag-derived dist-tags, and retained/registry archive integrity. Process tests cover retries and failures.
- [x] Optimize measured work: native encoding, fewer byte views, one text decode across rotation keys, byte-based freshness, allocation-free boolean predicates, conditional fallback tables, and direct portable offset writes. Resource/timing gates reject injected result-preserving regressions.
- [x] Add createMaskSchemaAsync with captured inputs, shared resumable hash arithmetic, host-task yielding, cancellation with original cause, and unchanged synchronous/wire behavior. Wire vectors, interleaved work, input mutation, cancellation, and installed runtime/browser consumers are exercised. Microtask-only scheduling fails the cancellation regression.
- [x] Record profiling methods, results, allocation/retention limits, rejected alternatives, and unresolved mixed-workload parser behavior in bench/PERFORMANCE.md and bench/README.md. Three alternating fresh-process pairs on Node 26.8.1/Bun 1.4.2 replace exploratory numbers. Latest Node and Node 20 each passed 216 cases; latest Bun passed 166.
- [x] Release publish-clean 0.9.1 with documented validateArtifact argv, direct execution, final-byte immutability checks, failure diagnostics and cancellation. Release run 34176986710 passed Linux, Windows, and publication. Registry and GitHub attachment both contained 31,078 bytes with identical SHA-512. Version 0.9.0 failed before upload; its five-second consumer-install cutoff was replaced with the existing child-process hang bound, without changing concurrency.
- [x] Adopt registry publish-clean ^0.9.1 and configure the final-archive hook. Remove the separate workflow pack. A real prepack counter observed one pack; an injected source-path leak failed through the configured hook. The hook inspects its supplied archive directly; optional web coverage propagates into that same inspection.

## Release-readiness closure

- [x] Complete final local checks after integration and release-note updates: bun run check, artifact:web, test:browser, workflow lint, and diff whitespace validation all exited zero.
- [x] Commit the integration and release preparation using explicit paths: `fc627aa` contains the final-artifact integration; `ad1da1e` contains release notes and the corrected source comment. Both repositories passed clean-tree readback. Stop before versioning or publication.

CHANGELOG.md covers the async API, cancellation, runtime optimizations, and final-tarball checks. Art then identified misplaced validator instructions in publish-clean's README. Commit `4987de0` moves them under configuration, adds an option-table link, explains the script arguments and failures, and corrects the built-in-check limitation. Its package check passed. This documentation correction is local; the published 0.9.1 README is unchanged.

## Evidence and limits

The final bun run check exited zero with 216 Node tests, 166 Bun tests, formatting, type-aware lint, typecheck, build, artifact consumers, resource checks and timing gates. artifact:web and test:browser exited zero; the latter ran one browser bundle case. Packed consumers exercised Node/Bun/Deno/Chromium. Workflow lint and git diff --check exited zero. Captures: /tmp/uuid-slug-release-ready-{check,web,browser}.log. The formatter intentionally excludes this ledger and CHANGELOG.md; a file-only invocation found no targets, so the normal format:check command was used and passed.

The published dependency's real loopback registry test checks argv, validation-before-retention/upload, rejected launches/nonzero exits/mutations, and byte identity. Deleting the post-validator comparison makes that test fail. No uuid-slug release has run against hosted publication credentials in this work; local process tests do not prove future hosted behavior.

Some Node parser cases are slower in the mixed profile; isolated runs do not reproduce the slowdown, and restoring the baseline parser worsens the mixed result. No universal speedup or resolved JIT cause is claimed. Async responsiveness measurements do not bound initial input copying, allocation, GC or host pauses. No DO-178C assessment or cryptographic assurance is claimed.

## External tooling follow-up

- [ ] Update git-cliff in both packages when the npm distribution provides 2.14.1. A fresh registry read during closure still reports latest=2.13.1 and no 2.14.1. Both packages already use the available version. This does not block their existing changelog command; do not add a separate binary installer to clear the notice.

No additional out-of-scope proposal was established as necessary.
