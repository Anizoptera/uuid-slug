# Release policy

The npm package and the Rust crate share one version number. A release may publish both or only one of them.

## Versions

Versions describe the consumer effect. A fix with no new public behavior is a patch. Backward-compatible new behavior is a minor release. Incompatible behavior is a major release, or a minor release while the major version is zero.

An API is deprecated in one published release before it is removed. Removal happens only in a later major release, or a later minor release while the major version is zero.

On npm, stable releases use the `latest` dist-tag and prereleases use `next`.

## Integrity

Each release publishes the exact archives that passed verification. A published version is never overwritten. If it already exists, its bytes must match the verified archive. npm packages are published with provenance.

[`CHANGELOG.md`](../CHANGELOG.md) describes what changed for consumers and how to upgrade. GitHub release notes repeat that section and add the public API changes and package sizes since the previous release.
