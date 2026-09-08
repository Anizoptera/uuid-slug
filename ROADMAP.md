# Roadmap

Reduce the TypeScript and Rust APIs because they expose internals. Ship smaller artifacts without changing behavior or stored identifiers.

## Release-blocking contracts

- `README.md` owns guarantees, `docs/design.md` wire formats, and `docs/cross-language.md` parity and distribution. Art rules final public names and semantics.
- Preserve masked bytes, the 2^42 timestamp bound, 16-bit check, raw sentinels, caller-ordered
  first-match keys, call-time byte-seed capture, plain-only base32hex, and opt-in original migration.
  Do not add seed limits, ordering, 0.2.0 compatibility, old aliases, fallback schemas, or a new cipher.
- Each decoder accepts every matching encoder output across lengths, alphabets, schemas, sentinels,
  keys, and enabled migration. Ordinary decode returns one UUID; candidates stay explicit. Invalid
  inputs return typed errors. Freshness stays finite, nonnegative, fractional, inclusive, and symmetric.
- Treat API design as greenfield: propose the best names, signatures, paths, types, and features without aliases. Preserve behavior and stored identifiers. Art rules the final surface.
- Publish one dependency-free, native-free npm package and one `uuid-slug` crate with equal versions,
  Git/crates.io provenance, common native targets, and WASM. Rust dependencies need evidence;
  Node/Bun native bindings stay development-only.
- Native CI must run Rust from the first increment. Timeouts bound hangs; signals establish readiness.
- GitHub release notes show packaged API and size changes against the immediate prior release and
  prior release line; `CHANGELOG.md` does not duplicate them. The planned release is 0.4.0.
- Do not version, tag, push, publish, release, or change remote state without Art's separate approval.
- [x] Copy publish-clean's `LICENSE` exactly; committed as `4c029fb`.

### Phase 1: Define the minimal public contracts

- [ ] Start from the measured surface: TypeScript exports 38 values and 26 types from `src/index.ts`;
  Rust exposes modules plus root re-exports from `rust/uuid-slug/src/lib.rs`. Record every exact
  signature, feature, package path, and real caller; classify each by the caller job it serves.
- [ ] Design the full TypeScript and Rust signatures from caller jobs. Use explicit allowlists; hide
  internals and pair equivalent capabilities without forcing identical language syntax.
- [ ] Challenge every exported verb, noun, and entry point with diverse live names and shapes.
  Judge cold call sites, ambiguity, misuse, composition, tree-shaking, errors, and future extension.
- [ ] Challenge that design as a separate task: try deleting every item; test misuse, upgrades,
  migration, extension, allocation, and error paths; compare viable surfaces; list every removal,
  rename, move, type change, and language-only difference. Stop for Art's ruling before implementation.
- [ ] For base64url helpers, inspect callers and compare removal with exact UUID-specific names.
  Make `UuidBytes` enforce width/version or remove it; make `isUuidV7Bytes` a type predicate only
  if the matching type survives.
- [ ] Use strict domain types and typed error returns. Do not expose `any` or `unknown` without an
  unbounded external input. Custom entropy and `MaskSchema.mix` return typed failures; catch and
  retain causes only at callback boundaries that can still throw.
- [ ] Trace and measure duplicate generation paths. Keep only paths required by distinct codec state
  or measured zero-cost use.
- [ ] Compare root and advanced entry points with real imports. Propose the smallest placement that
  keeps caller-buffer, offset, custom entropy, and custom schema concerns out of common calls.
- [ ] Compile real caller cases against optional and strict brands. Report prevented misuse and lost
  literal convenience; choose the strictest shape that accepts every required input.
- [ ] Propose consistent codec construction and generation errors without adding success-path
  wrappers or allocations that provide no caller value.
- [ ] Trace `maskedSlugToUuid` and `maskedSlugToUuidV7` through plain migration and version checks.
  Propose both only if callers need their distinct result contracts.
- [ ] Trace migration `decode` and `candidates` through parsing and lookup. Preserve the ruled
  one-result and ambiguous-candidate jobs without duplicated parsing.
- [ ] Compile sentinel-definition, resolved-sentinel, and masked-slug-union caller cases. Propose only
  types that prevent a distinct mistake.
- [ ] Re-evaluate `defaultCodec` and `DEFAULT_MASK_SCHEMA` from greenfield call sites. Retain them only
  if their public seed cannot be mistaken for secret masking and they simplify a real caller job.
- [ ] Propose removing Rust's duplicate module and root paths. Choose one canonical public path for every
  retained item and hide implementation modules.
- [ ] Propose removing Rust items exposed only through public implementation modules, including
  feature-gated cancellation and future internals not intended as library contracts.
- [ ] Propose the fewest Rust `_with` and `_into_with` variants that still support
  fallible entropy injection and caller-owned storage without hidden global synchronization.
- [ ] Align Rust and TypeScript names around consumer concepts while keeping idiomatic language
  shapes; symmetry means matching capability and semantics, not forced textual identity.
- [ ] Define each decoder's full acceptance matrix: every retained encoder output across plain
  base64url, plain base32hex, masked base64url, masked base32hex, sentinels, current keys, previous
  keys, original masks, stored aliases, and enabled plain migration. Reject unsupported lengths and
  malformed payloads with typed errors; never decode arbitrary byte lengths.
- [ ] Present every proposed TypeScript and Rust signature, name, path, semantic, removal, and language difference to Art. Record his ruling before changing any public surface.

### Phase 2: Design the artifact layout

- [ ] Start from Art's approved surface. Keep one npm package and one Rust crate; Aponte gets TypeScript source and all other consumers get optimized built code.
- [ ] Design from measured facts: `unbundle: true` emits 69 files and 468 KiB; Bun uses source while
  Node and browsers use separate builds. Bun bundled current/single-file imports as `uuidToSlug`
  2,986/5,836 B, `uuidV7Slug` 6,019/8,377 B, and codec 18,698/18,754 B; the single file pulled masking
  into both keyless imports. Use small keyless, codec/migration, and runtime-adapter chunks. Aponte
  alone keeps source.
- [ ] Challenge that layout as a separate task with installed Bun, Node, Deno, and browser consumers
  and their real bundlers. Compare resolved files, startup, size, masking inclusion, declarations,
  maps, archive contents, and runtime behavior; reject leaked internals, duplicate code, and dead files.
- [ ] Keep Aponte on TypeScript source through an Aponte-owned workspace alias or explicit source
  entry. Do not route every Bun consumer to source merely because Aponte uses Bun.
- [ ] Route Bun, Node, Deno, browsers, and generic package consumers outside Aponte to built,
  minified, tree-shaken output selected by package export conditions.
- [ ] Remove `src` from the published package unless the explicit Aponte source entry requires it;
  expose only the minimum source files that entry needs.
- [ ] Share browser and Node code except their runtime adapters; package conditions must select the
  correct adapter without duplicating the common graph.
- [ ] Bundle declarations into the smallest stable type artifact graph. Internal declaration files
  must not expose or preserve internal module boundaries without a consumer need.
- [ ] Keep sourcemaps only when they provide useful consumer diagnostics; if retained, verify their
  sources and paths against the final archive.
- [ ] Minify and optimize every JavaScript artifact; keep enough module structure for bundlers to
  remove every unused capability.
- [ ] Publish one npm package and one Rust crate. Keep JavaScript chunks internal and use Rust
  features within the one crate; do not create packages, crates, or prebuilt binaries per target.
- [ ] Let each Rust native or WASM build compile only selected capabilities. Defaults must not force
  masking, migration, sentinels, async work, or OS entropy into every build.
- [ ] Record compressed npm size and each Rust target's binary or WASM size from reproducible release
  builds. Track the artifact users download; compiler intermediates do not measure consumer cost.
- [ ] Preserve the keyless boundary: importing `uuidToSlug`, `uuidV4`, or `uuidV7Slug` must not load
  mask derivation, sentinel tables, migration code, or the public default seed.
- [ ] Preserve the masking boundary: codec imports must include every required schema, sentinel,
  migration, and runtime dependency with no dynamic imports or hidden installation work.

### Phase 3: Design the API baseline gate

- [ ] Design a gate like Kotlin's
  <https://github.com/Kotlin/binary-compatibility-validator>, tuned for this package: checked-in
  readable API baselines, pure comparison in normal checks, and an explicit reviewed update command.
- [ ] Challenge the baseline design separately: mutate every API dimension, test tool blind spots,
  remove redundant machinery, and reject any path that can hide or casually accept API drift.
- [ ] Define one deterministic, readable baseline per language. Each baseline must contain every
  public signature and be the only stored API registry for that language.
- [ ] Define TypeScript extraction from built declarations, including names, kinds, generics,
  parameters, returns, overloads, properties, unions, literals, optionality, and deprecations.
- [ ] Define Rust extraction from the built crate under every supported feature set, including
  paths, fields, variants, generics, bounds, lifetimes, methods, traits, constants, and feature gates.
- [ ] Make an intentional API change difficult to land accidentally: require Art's approved HLD
  change, an explicit baseline update, both baseline diffs, semver evidence, and installed-package evidence.
- [ ] Reject one-language baseline updates unless an explicit exception names Art's ruling and the
  semantic reason. The exception stays beside the parity rule and never skips either baseline check.
- [ ] Block additions, removals, renames, tighter parameters, wider returns, weaker brands, lost
  features, moved paths, and new throws without Art's exact HLD ruling, even when semver permits them.
- [ ] Keep the API gate within the normal feedback budget. Cache or parallelize independent
  extraction, parity, consumer, and version checks without weakening their evidence.

### Phase 4: Design release compatibility checks

- [ ] Design exact npm and Rust predecessor selection for patch, minor, major, prerelease,
  unpublished, missing, and ambiguous cases before wiring the release gate.
- [ ] Challenge the release design separately: test wrong versions, wrong predecessors, registry/tag
  disagreement, feature-only breaks, package/source drift, and deliberate bypass attempts.
- [ ] Derive the required version change directly from each API diff: compatible correction,
  compatible addition, or break. The manifest and tag must satisfy the strongest TypeScript or Rust
  result; before 1.0, a break requires a minor. This check informs review but cannot approve HLD.
- [ ] Compare sizes with the immediate prior release and the latest release from the previous release
  line: previous minor before 1.0, previous major from 1.0 onward.
- [ ] Prototype names-only and capability-mapped cross-language checks. Measure which real mismatches
  each detects and its upkeep cost. This is secondary to per-language compatibility; reject a check
  that adds no reliable evidence.
- [ ] Define parity failures in caller terms: capability, TypeScript signature, Rust signature,
  semantic difference, required fix, and the explicit override path.

### Phase 5: Design final verification

- [ ] Design final verification from the claims the release will make. Map each claim to one check
  that can falsify it and remove checks that add no new evidence.
- [ ] Challenge the verification design separately: inject failures, check blind spots and runtimes,
  wait for completion signals, and remove slow, flaky, duplicate, implementation-restating, timeout-based, or false-green checks.

### Phase 6: Implement and document

- [ ] Design each required internal refactor before editing: name the resisting seam, the smaller
  target shape, preserved behavior, and why the refactor costs less than changing in place.
- [ ] Challenge each refactor design separately: seek a smaller cut, check coupling and ownership,
  and reject abstractions that serve fewer than three real uses.
- [ ] Reshape internals under behavior-preserving commits where current seams resist the approved
  API. Keep refactors separate from public behavior changes and stop when the surface needs no more.
- [ ] Implement the approved TypeScript surface and update this repository's callers and examples.
  Preserve Aponte's source route and prove it resolves TypeScript instead of built output.
- [ ] Implement the approved Rust surface and canonical paths. Verify every supported feature
  combination without compatibility aliases.
- [ ] Implement the approved minimal chunk graph and export map. Installed-package consumers must
  prove every condition resolves the intended built artifact.
- [ ] Extract and commit the approved TypeScript and Rust API baselines. The built public artifacts
  are their sources; the baselines are the only stored API registries.
- [ ] Add `api:check`: compare both built APIs with both baselines and require symmetric review when
  either changes. Fail with the exact diff, reason, required review, and update command.
- [ ] Add `api:update`: require the intended change class, run the fast lane, update both baselines
  together, and show both diffs. A normal check must never rewrite a baseline.
- [ ] Mutation-test the API gate against added and hidden exports, overload changes, Rust visibility
  and feature changes, weaker errors, and one-sided parity drift. Keep only tests with unique detection.
- [ ] Add the credential-free release gate. Compare packaged APIs with approved baselines and selected
  releases; verify package/source identity, parity, version, tag, and semver before publication.
- [ ] Remove the separate Rust workflow. Move each useful Rust check to the check, benchmark, or
  release workflow that owns its decision; keep the unpinned newest-Node lane and avoid duplicate work.
- [ ] Run `actions-up` on every workflow. Use its latest valid action versions and verify that updates
  preserve permissions, inputs, and release behavior.
- [ ] Generate compact TypeScript and Rust API diffs in GitHub release notes from packaged baselines.
  Keep generated API tables out of `CHANGELOG.md`.
- [ ] Add npm archive and verified Rust native/WASM sizes to the same release notes. Reuse release
  artifacts and show absolute and percentage changes against both selected comparison releases.
- [ ] Update the artifact checker to inspect the final cleaned archive and reject source leaks,
  unexported implementation files, wrong runtime targets, duplicate code, and missing declarations.
- [ ] Update README examples and API reference to contain only retained public calls and types.
- [ ] Update `docs/cross-language.md` with the final capability mapping, allowed language-specific
  differences, artifact boundaries, and API-change gate after Art approves the final surface.
- [ ] Update `docs/design.md` only where final API placement changes how consumers select codecs,
  schemas, formats, or sentinels; keep wire-format ownership unchanged.
- [ ] Update project `AGENTS.md` only for short durable rules that future API or packaging work must
  load before acting. Do not copy the implementation checklist into permanent guidance.
- [ ] Remove stale names, signatures, import paths, artifact counts, source-path claims, and
  superseded rationale from public docs, code comments, examples, changelog drafts, and scripts.
- [ ] Keep final API decisions and reasons in durable owners. Do not retain transient command logs.

### Phase 7: Verify and close

- [ ] Run real encoder-to-decoder matrices in TypeScript and Rust for every supported spelling,
  schema version, key order, sentinel, migration format, boundary timestamp, invalid payload, and
  caller-buffer range. Invalid payloads must return typed errors without partial writes.
- [ ] Run compile-time misuse cases for removed exports, strict brands, callback failures, canonical
  Rust paths, feature gates, and public error handling. Each case must fail for its intended reason.
- [ ] Call typed-error APIs directly in failure tests. Do not pass returned errors through success
  helpers that throw; removing a typed return must make the regression fail.
- [ ] Run tree-shaking and artifact measurements for common and advanced imports on Bun and Node.
  Reject masking leakage into keyless imports and avoid budgets that merely freeze today's bytes.
- [ ] Run the complete local check, web/browser artifact consumers, Rust feature matrix, public API
  snapshot gate, predecessor semver comparison, final-archive inspection, and license verification.
- [ ] Adversarially review the total final diff against every task in this section and every retained
  HLD contract. Remove redundant tests, snapshots, scripts, exports, chunks, comments, and docs.
- [ ] Commit each verified code or durable-document change with explicit paths. Leave remote checks,
  versioning, tags, pushes, and publication held until Art authorizes remote writes again.

### Later dependency update

- [ ] Update git-cliff in this package and publish-clean when npm ships the required newer release;
  keep the current registry version until then and do not add another installer.
