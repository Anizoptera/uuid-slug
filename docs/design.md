# Design Notes

## Scope

The package focuses on UUID bytes and their textual forms:

- canonical lowercase UUID strings
- raw 16-byte UUID values
- unpadded base64url direct slugs
- reversible masked UUIDv7 slugs

Old API names from source projects are intentionally not exported.

## Masking

Masking replaces known UUIDv7 control bits with a small validation tag, applies a byte permutation, applies an XOR mask, then base64url-encodes the result. Decode reverses the operation and validates the tag before restoring UUIDv7 control bits.

The project seed derives deterministic obfuscation material. It is not a cryptographic secret when shipped to clients.

## Sentinels

Sentinels are a separate transmission class. They bypass masking and use direct raw UUID slugs so boundary values remain recognizable. They are checked before schema decoding to avoid false-positive mask interpretation.

## Release

Release automation uses release-please for version and changelog PRs, then npm trusted publishing through one GitHub Actions workflow. The publish job runs `publish-clean`, validates the cleaned final npm tarball, and publishes with an explicit `latest` dist-tag and provenance.

The built current package is the primary pre-publish check. Installing the published package later is a registry and bin-wiring smoke test, not a substitute for validating the artifact produced by the current commit.
