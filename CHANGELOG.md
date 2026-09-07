# Changelog

Notable changes per release, newest first. This file is the source of the GitHub Release
notes: the section for a version is published verbatim when its tag is pushed.

## [Unreleased]

### Fixed

- Preserve raw sentinel slugs during generation and reject masked output that would decode as a different sentinel UUID.
- Return `PublicUuidV7Slug` from masked generation, including its sentinel possibility; callers requiring only `MaskedUuidV7Slug` must handle that case.
- Reject invalid alphabet and destructive mask configuration; preserve custom-mask failures as typed errors with their original cause.


## [0.2.0](https://github.com/Anizoptera/uuid-slug/compare/v0.1.0...v0.2.0) (2026-08-11)

### Features

* create uuid-slug package ([f890276](https://github.com/Anizoptera/uuid-slug/commit/f890276d7dc22f1faa81e26aefe4b86ef998322a))

### Bug Fixes

* pin working tsdown loader dependency ([0002bf1](https://github.com/Anizoptera/uuid-slug/commit/0002bf13d7a7534524be480e76c7957a4d3fe40e))
* use public publish-clean dependency ([073e6c2](https://github.com/Anizoptera/uuid-slug/commit/073e6c24d967f13999cd8500b5c28876f7be9359))
