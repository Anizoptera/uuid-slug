# @anizoptera/uuid-slug

Preserve the published identifier contracts and verify the runtime paths that each change reaches.

## Contract owners

- Read `docs/public-api.md` before changing or documenting a public export, type, parameter,
  default, error, runtime path, or performance characteristic; it owns interface shape and the
  declaration comments consumers see.
- The externally visible API is reserved. Put any proposed public export, option, behavior, or
  feature change and its consumer consequences in the same pull request. Merging is the maintainer
  decision; no separate acceptance step exists.
- Keep public types that name a documented value or distinction consumers use in storage,
  parameters, return values, narrowing, or configuration. A package signature need not mention the
  type. Remove it only when no documented value or operation needs its distinction. Apply this rule
  separately to TypeScript and Rust, document the consumer effect, and verify each packaged surface.
- `ROADMAP.md` is transient and never owns a contract, decision, or lasting conclusion. Put
  consumer contracts in README, wire design in `docs/design.md`, security boundaries in
  `docs/security.md`, cross-language and distribution decisions in `docs/cross-language.md`, and
  measured conclusions in `bench/PERFORMANCE.md`.
- Use only `ROADMAP.md` for project planning; never create a shadow, staging, renamed, or temporary
  roadmap file in this repository.
- Read README §Guarantees before changing generation or tests; it owns the consumer guarantees.
  New guarantees require a maintainer ruling before code or tests impose them. Intra-millisecond ordering
  is explicitly not guaranteed: do not gate it or reject a native generator for lacking it.
  Measure implementation differences in `bench/`, where results inform rather than gate.
- Read `docs/design.md` before changing masking, schemas, or sentinels. Preserve its wire layout:
  masked payloads are UUIDv7-only, with a 16-bit check and timestamps below 2^42 milliseconds.
  Preserve both their 22-character base64url and lossless 27-character base32hex spellings.
  Reject overflow rather than truncate. Base64url helpers accept exactly one 16-byte UUID payload
  or its canonical 22-character spelling; reject every other length. Preserve plain-slug padding rejection.
- Read `docs/cross-language.md` before Rust work or changes shared with TypeScript. It owns
  parity, approved filesystem-safe output and distribution boundaries. Keep base64url defaults;
  select filesystem-safe masked output independently from the plain-slug alphabet.
  Preserve length-based alphabet inference for plain decoding.
- Masked slugs and sentinels are core functionality. Sentinels use precomputed raw slugs per
  codec. Decode returns the first passing candidate in caller-specified key order, never proof
  of issuance. Do not reject multiple matches or append fallback schemas on the caller's behalf.
- Every decoder must accept every value that a supported matching encoder can produce. Options
  may add accepted forms; they must not remove existing ones. Reject forms no encoder produces.
- Keyed operations belong only on the codec holding the key, including masked freshness
  validation. Do not add top-level masked shortcuts. Codec construction requires an explicit
  private mask or `PUBLIC_MASK_SCHEMA`; keep the published schema opt-in and remove implicit masked
  defaults.
- Preserve the frozen round count, derivation constants, seed interpretation, alphabets, tag
  widths, and `keyIterations`: changing them changes previously issued identifiers. Comments
  must explain this wire-format obligation, not historical reasons for choosing the constants.
- Do not add old API aliases, compatibility subpaths, or a compatibility decoder for 0.2.0.
  The maintainer ruled that release had no consumers; that exception does not justify breaking other formats.
- Original fixed-mask compatibility is opt-in through `codec.migration`; read README's migration
  sections before changing it. Preserve sentinel priority and stored trailing-bit aliases without
  weakening ordinary strict decoding. Writers and accepted old formats remain independent.
- npm runtime dependencies are forbidden. Rust dependencies require the evidence described in
  `docs/cross-language.md`. Benchmark dependencies stay dev-only and outside published artifacts.
- Order root export conditions as `types`, `bun`, `development`, `node`, then `default`.
  Bun and development load published TypeScript; Node keeps its native-runtime build.
- Public docs use caller-facing tokens such as `"base32hex"`, not internal symbol names.
  Documentation-alignment gates are ruled out; test the API behavior instead.
- Do not mention private source project names in public files, commits, tests, fixtures, or reports.

## Runtime boundaries and evidence

- Keep routine verification in `.github/workflows/check.yml`. Add another workflow only when it
  needs a different trigger or permission boundary.
- Gate every runtime-dependent change in both Node Vitest and Bun tests, including branches
  outside `src/runtime/` that use optional capabilities. Neither runner covers the other's
  adapter. Share entropy cases in `test/entropy-probe.ts`.
- Keep development native interop as one discovered research matrix across supported installed
  Node, Bun and Deno Node-API/FFI boundaries. Run one corpus with nonzero evidence per lane; use
  measurements to improve the adapters, never to discard one from a volatile machine snapshot.
- A runtime/compiler floor forbids unguarded newer APIs, not useful newer APIs. Use a newer
  JavaScript capability only for measured runtime or resource value, probe it once, retain a
  compatible fallback, and exercise both paths in their owning runtime lanes.
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
- Runtime values must carry strict brands that reject unchecked strings and bytes. Keep raw
  function and configuration inputs ergonomic, validate them at the package seam, and infer brands
  from successful generation, parsing, conversion, and guards without caller casts.
- Owned byte outputs must be plain `Uint8Array`, not native `Buffer` subclasses. Adapt at the
  runtime boundary and verify constructors in both runners; preserve caller-supplied buffers.

## Release

- Remote writes are forbidden unless a maintainer explicitly authorizes the exact operation. Do not push,
  open a pull request, upload a tag, create a release, publish a package, or change remote settings.
- Publish through `publish-clean`; validate the final cleaned archive and use `--access public
  --provenance`. Derive the dist-tag from the git tag: prereleases use `next`, releases `latest`.
- Keep `@anizoptera/publish-clean` a normal registry dependency, never a Git SHA or tarball URL.
- Keep publication in `.github/workflows/release.yml`; trusted publishing binds its filename.
- Read `docs/release.md` before changing predecessor selection, release evidence, publication,
  recovery, assets, notes, or finalization.
- Run verification on the tagged commit without publishing credentials, then make publication
  depend on it. Keep verification and credential-bearing publication in separate jobs; local
  `preversion` is feedback, not the release gate.
- `CHANGELOG.md` owns release notes. Draft with `bun run changelog v<next>`, edit for consumers,
  commit the draft, run `bun run release <next>`, then `git push --follow-tags`. The draft must
  be committed because versioning requires a clean tree. Do not introduce a release bot.
- Refuse publication unless the tag matches the manifest and its changelog section is nonempty.
  Publish that section verbatim. Refuse local versioning without the new version's section.
- Choose versions explicitly: 1.0.0 is a decision, not an automatic bump; a pre-1.0 breaking
  change is a minor. New tags use annotated tags through `bun run release`; historical selection
  must retain the existing lightweight release tags.
- Classify the full consumer effect before committing: fixes with no new public behavior are patch;
  backward-compatible public behavior is minor; incompatible behavior is major, or minor before
  1.0. Structural checks provide a lower bound; they cannot classify semantic behavior or approve
  a public change.
- Choose the development target against the latest governed release. After a release, start with
  its next patch. Raise the target only when the changes since that release require a minor or major
  under the rule above. With no governed release, keep the planned first release unless the
  maintainer changes it. Changes to unreleased APIs do not justify a higher target. Use
  `bun run version:set <X.Y.Z-dev>` to update and verify both manifests and the lockfile together.
  Release tags and published manifests use the same stable version without `-dev`.
- Obtain retained archives through `--tarball-out DIR` in a caller-owned directory and clean it
  up. Never parse archive paths from human-facing stdout.
- Run `bun run check` before committing unless a maintainer explicitly selects narrower intermediate
  checks for the current work; the complete check still gates final delivery.
