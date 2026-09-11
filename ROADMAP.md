# Roadmap

Make the TypeScript interface name each value by domain meaning, prevent ambiguous sentinel
definitions, and preserve the direct calls and runtime work that existing consumer jobs require.

## Contract

- Preserve every wire encoding, decoder acceptance rule, error-as-value path, runtime adapter,
  caller-owned byte write, and TypeScript/Rust behavior shared by the current interface.
- Keep the explicit conversion and generation functions: replacing them with one option-driven
  operation would introduce output unions, invalid combinations, and caller-side branching.
- Keep keyed work on the immutable codec and keyless work at module scope; do not add a facade or
  expose an internal seam merely to reduce the root symbol count.
- Rename the codec-produced slug union to `UuidV7CodecSlug`; `PublicUuidV7Slug` describes neither
  representation nor ownership and can imply a security property the value does not carry.
- Rename codec `slugAlphabet` to `outputAlphabet`; readers accept both spellings, so the current
  name can falsely suggest an input restriction.
- Require sentinel names to be nonempty and unique because `codec.sentinels` exposes them as the
  application-facing identity; repeated UUIDs remain invalid independently.

## Work

- [ ] Rename the codec slug result type through declarations, implementation, docs, fixtures,
  benchmarks, and TypeScript API baseline without leaving an alias.
- [ ] Rename the codec writer option through TypeScript and shared conformance callers; preserve
  base64url as the default and unconditional dual-alphabet decoding.
- [ ] Reject empty and duplicate sentinel names at codec construction and prove distinct-name,
  duplicate-name, empty-name, and duplicate-UUID cases through the public codec factory.
- [ ] Build declarations and compile packed consumers with the TypeScript floor and development
  compiler; remove one negative guard and confirm the intended diagnostic before restoring it.
- [ ] Run Node and Bun behavior suites, artifact/API checks, Rust parity checks, and the complete
  repository gate; inspect the final diff and map each changed public promise to direct evidence.
