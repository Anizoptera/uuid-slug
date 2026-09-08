# Changelog

Notable changes per release, newest first. This file is the source of the GitHub Release
notes: the section for a version is published verbatim when its tag is pushed.

## [Unreleased]

### Added

- `createMaskSchemaAsync` derives the same keys as the synchronous constructor while yielding to other work. Pass an `AbortSignal` to stop derivation; cancellation returns an `aborted` error carrying the signal's reason.

### Performance

- Use available Node and Bun encoding primitives, avoid redundant byte views, and decode rotated-key input once. Freshness checks inspect decoded bytes directly; boolean predicates avoid constructing decoded buffers and discarded errors.
- Add runtime-specific resource and timing regression checks. Reproducible measurements and their limits are documented in `bench/PERFORMANCE.md`; improvements vary by runtime and workload.

### Fixed

- Preserve raw sentinel slugs during generation and reject masked output that would decode as a different sentinel UUID.
- Return `PublicUuidV7Slug` from masked generation, including its sentinel possibility; callers requiring only `MaskedUuidV7Slug` must handle that case.
- Reject invalid alphabet and destructive mask configuration; preserve custom-mask failures as typed errors with their original cause.

- Honor injected generators in both alphabets and reject invalid explicit timestamps and omitted-buffer offsets.
- Validate finite freshness windows and clock readings; preserve entropy and clock failure causes.
- Validate packed consumers on supported runtimes and declarations with TypeScript 5.7.
- Reject incomplete benchmark reports and mismatched release-retry archives.
- Validate the exact cleaned tarball before publication through publish-clean 0.9.1, without a separate validation pack.

## [0.2.0](https://github.com/Anizoptera/uuid-slug/compare/v0.1.0...v0.2.0) (2026-08-11)

### Features

* create uuid-slug package ([f890276](https://github.com/Anizoptera/uuid-slug/commit/f890276d7dc22f1faa81e26aefe4b86ef998322a))

### Bug Fixes

* pin working tsdown loader dependency ([0002bf1](https://github.com/Anizoptera/uuid-slug/commit/0002bf13d7a7534524be480e76c7957a4d3fe40e))
* use public publish-clean dependency ([073e6c2](https://github.com/Anizoptera/uuid-slug/commit/073e6c24d967f13999cd8500b5c28876f7be9359))
