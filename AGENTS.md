# @anizoptera/uuid-slug

Preserve the published identifier contracts and verify the runtime paths that each change reaches.

## Contract owners

- Read README §Guarantees before changing generation or tests; it owns the consumer guarantees.
  New guarantees require Art's ruling before code or tests impose them. Intra-millisecond ordering
  is explicitly not guaranteed: do not gate it or reject a native generator for lacking it.
  Measure implementation differences in `bench/`, where results inform rather than gate.
- Read `docs/design.md` before changing masking, schemas, or sentinels. Preserve its wire layout:
  masked slugs are UUIDv7-only, 22 base64url characters, with a 16-bit check and timestamps below
  2^42 milliseconds. Reject overflow rather than truncate. Preserve plain-slug padding rejection.
- Keep base32hex confined to plain slugs; it exists for chronological string ordering. Masked
  slugs and sentinels stay base64url. Plain decoding infers the alphabet from length.
- Masked slugs and sentinels are core functionality. Sentinels use precomputed raw slugs per
  codec. Decode returns the first passing candidate in caller-specified key order, never proof
  of issuance. Do not reject multiple matches or append fallback schemas on the caller's behalf.
- Keyed operations belong only on the codec holding the key, including masked freshness
  validation. Do not add top-level masked shortcuts. Art explicitly retains `defaultCodec` and
  the public `DEFAULT_MASK_SCHEMA`; warn callers to supply their own seed for real masking.
- Preserve the frozen round count, derivation constants, seed interpretation, alphabets, tag
  widths, and `keyIterations`: changing them changes previously issued identifiers. Comments
  must explain this wire-format obligation, not historical reasons for choosing the constants.
- Do not add old API aliases, compatibility subpaths, or a compatibility decoder for 0.2.0.
  Art ruled that release had no consumers; that exception does not justify breaking other formats.
- Runtime dependencies are forbidden. Benchmark dependencies stay dev-only and outside the archive.
- Public docs use caller-facing tokens such as `"base32hex"`, not internal symbol names.
  Documentation-alignment gates are ruled out; test the API behavior instead.
- Do not mention private source project names in public files, commits, tests, fixtures, or reports.

## Runtime boundaries and evidence

- Gate every runtime-dependent change in both Node Vitest and Bun tests, including branches
  outside `src/runtime/` that use optional capabilities. Neither runner covers the other's
  adapter. Share entropy cases in `test/entropy-probe.ts`.
- Prove a test reaches its target. Inputs for a later rejection must pass earlier guards;
  removing the intended guard must fail its regression. Isolate a component before attributing
  an aggregate result to it, especially when decoding tries multiple schemas.
- Entropy probes must exercise the package's portable draw path as well as native delegation.
  String generation can bypass `fillRandom`; inspect the selected path instead of assuming a
  method name identifies the code under test. Compare byte keys with `join(",")` or hex,
  never platform-dependent string coercion or UTF-8 decoding.
- Preserve an unpinned newest-Node CI lane: pinned runtimes cannot expose newly added native APIs.
- Probe optional capabilities once at module load; absent methods remain undefined. A defined
  method that throws for an absent capability creates exception-driven fallback on every call.
- Cast probes to narrow optional capability shapes, not intersections with ambient types that
  may already declare the method required.
- Runtime values must carry the exact brand the codec returns. Bare strings silently widen
  optional brands. Preserve brand optionality: it separates produced values while accepting
  caller string literals; changing it requires Art's ruling.
- Owned byte outputs must be plain `Uint8Array`, not native `Buffer` subclasses. Adapt at the
  runtime boundary and verify constructors in both runners; preserve caller-supplied buffers.

## Release

- Publish through `publish-clean`; validate the final cleaned archive and use `--access public
  --provenance`. Derive the dist-tag from the git tag: prereleases use `next`, releases `latest`.
- Keep `@anizoptera/publish-clean` a normal registry dependency, never a Git SHA or tarball URL.
- Keep publication in `.github/workflows/release.yml`; trusted publishing binds its filename.
- Run verification on the tagged commit without publishing credentials, then make publication
  depend on it. Keep verification and credential-bearing publication in separate jobs; local
  `preversion` is feedback, not the release gate.
- `CHANGELOG.md` owns release notes. Draft with `bun run changelog v<next>`, edit for consumers,
  commit the draft, run `bun run release <next>`, then `git push --follow-tags`. The draft must
  be committed because versioning requires a clean tree. Do not introduce a release bot.
- Refuse publication unless the tag matches the manifest and its changelog section is nonempty.
  Publish that section verbatim. Refuse local versioning without the new version's section.
- Choose versions explicitly: 1.0.0 is a decision, not an automatic bump; a pre-1.0 breaking
  change is a minor. Use annotated tags through `bun run release`.
- Obtain retained archives through `--tarball-out DIR` in a caller-owned directory and clean it
  up. Never parse archive paths from human-facing stdout.
- Run `bun run check` before committing unless Art explicitly selects narrower intermediate
  checks for the current work; the complete check still gates final delivery.
