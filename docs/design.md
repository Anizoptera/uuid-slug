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

Release automation uses release-please for version and changelog PRs, then npm trusted publishing via GitHub Actions OIDC. Maintenance branches publish with branch-specific dist-tags instead of `latest`.
