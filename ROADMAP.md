# Roadmap

Reduce the TypeScript and Rust APIs because they expose internals. Ship smaller artifacts without changing behavior or stored identifiers.

## Release-blocking contracts

- `README.md` owns guarantees, `docs/design.md` wire formats, and `docs/cross-language.md` parity and distribution. Art rules final public names and semantics.
- Preserve masked bytes, the 2^42 masking bound, 2^48 UUIDv7 bound, 16-bit check, raw sentinels,
  caller-ordered first-match keys, call-time byte-seed capture, and opt-in original migration.
  Keep base64url defaults, independent plain/masked alphabets, and length-based plain decoding.
- Preserve `defaultCodec` and `DEFAULT_MASK_SCHEMA`; Art must approve any removal. Keep the warning
  that the public default seed is not secret. Do not add seed limits, ordering, 0.2.0 compatibility,
  old aliases, fallback schemas, or a new cipher.
- Each decoder accepts every matching encoder output across lengths, alphabets, schemas, sentinels,
  keys, and enabled migration. Ordinary decode returns one UUID; candidates stay explicit. Invalid
  inputs return typed errors. Freshness stays finite, nonnegative, fractional, inclusive, and symmetric.
- Treat API design as greenfield: propose the best names, signatures, paths, types, and features without aliases. Preserve behavior and stored identifiers. Art rules the final surface.
- Publish one dependency-free, native-free npm package and one `uuid-slug` crate with equal versions,
  Git/crates.io provenance, common native targets, and WASM. Rust dependencies need evidence;
  Node/Bun native bindings stay development-only.
- Native CI must run Rust from the first increment. Timeouts bound hangs; signals establish readiness.
- GitHub release notes start with the `CHANGELOG.md` section, then show generated packaged API and
  size changes against the immediate prior release and prior release line. Generated tables stay out of the changelog.
- Do not version, tag, push, publish, release, or change remote state without Art's separate approval.

### Phase 1: Define the minimal public contracts

- [ ] Inventory the current surface: TypeScript exports from `src/index.ts`; Rust exposes modules
  plus root re-exports from `rust/uuid-slug/src/lib.rs`. Record every exact
  signature, feature, package path, and real caller; classify each by the caller job it serves.
- [ ] Design the full TypeScript and Rust signatures from caller jobs. Use explicit allowlists; hide
  internals and pair equivalent capabilities without forcing identical language syntax.
- [ ] Challenge every exported verb, noun, and entry point with diverse live names and shapes.
  Judge cold call sites, ambiguity, misuse, composition, tree-shaking, errors, and future extension.
- [ ] Challenge that design as a separate task: try deleting every item; test misuse, upgrades,
  stored-format migration, extension, allocation, and error paths; compare viable surfaces; list every removal,
  rename, move, type change, and language-only difference. Stop for Art's ruling before implementation.
- [ ] For base64url helpers, inspect callers and compare removal with exact UUID-specific names.
  Make `UuidBytes` enforce width/version or remove it; make `isUuidV7Bytes` a type predicate only
  if the matching type survives.
- [ ] Use strict domain types and typed error returns. Expose `any` or `unknown` only for a proven
  unbounded external input. Custom entropy and `MaskSchema.mix` return typed failures; catch and
  retain causes only at callback boundaries that can still throw.
- [ ] Design error discrimination that works across realms and copies without `instanceof`.
  Fallible operations return declared typed errors; boolean predicates return `false`.
- [ ] Design synchronous and asynchronous schema creation together. Preserve identical keys,
  bounded cooperative work, prompt cancellation with its cause, captured inputs, and no readiness delays.
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
- [ ] Challenge the names, placement, and warning for `defaultCodec` and `DEFAULT_MASK_SCHEMA` while
  preserving both ruled capabilities. Any removal needs a new ruling from Art.
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
- [ ] Measure the current unbundled and single-file builds. The current build packages internal file
  topology; the single-file probe pulled masking into keyless imports. Compare a small responsibility
  chunk graph with both before choosing the layout. Aponte alone keeps source.
- [ ] Challenge that layout with installed Node, Bun, Deno, and browser consumers plus Bun and
  Rolldown bundles. Compare resolution, startup, size, masking, declarations, maps, archive contents,
  and runtime behavior; reject leaked internals, duplicate code, and dead files.
- [ ] Keep Aponte's repository-source route outside the published export map. Verify that route
  without changing Aponte; every published Bun import must use built code.
- [ ] Route Bun, Node, Deno, browsers, and generic package consumers outside Aponte to built,
  minified, tree-shaken output selected by package export conditions.
- [ ] Remove `src` from the published package. The Aponte exception must not expose source to other
  consumers or make published output depend on repository layout.
- [ ] Share browser and Node code except their runtime adapters; package conditions must select the
  correct adapter without duplicating the common graph.
- [ ] Bundle declarations into the smallest stable type artifact graph. Internal declaration files
  must not expose or preserve internal module boundaries without a consumer need.
- [ ] Keep sourcemaps only when they provide useful consumer diagnostics; if retained, verify their
  sources and paths against the final archive.
- [ ] Minify and optimize every JavaScript artifact; keep enough module structure for bundlers to
  remove every unused capability.
- [ ] Publish one npm package and one Rust crate. Keep JavaScript chunks internal; do not create
  packages, crates, or prebuilt binaries per target.
- [ ] Prove release linking removes unused Rust capabilities for native and WASM consumers. Add a
  feature only when it removes a measured cost that normal compilation cannot remove; keep platform
  dependencies behind the narrow feature that needs them.
- [ ] Track the compressed npm archive and `.crate` archive. For native and WASM code size, design
  one reproducible linked probe for the selected target/feature basis; compiler intermediates are invalid.
- [ ] Preserve the keyless boundary: importing `uuidToSlug`, `uuidV4`, or `uuidV7Slug` must not load
  mask derivation, sentinel tables, migration code, or the public default seed.
- [ ] Preserve the masking boundary: codec imports must include every required schema, sentinel,
  migration, and runtime dependency with no dynamic imports or hidden installation work.

### Phase 3: Design the API baseline gate

- [ ] Design a gate like Kotlin's
  <https://github.com/Kotlin/binary-compatibility-validator>, tuned for this package: checked-in
  readable API baselines, pure comparison in normal checks, and an explicit reviewed update command.
- [ ] Test [API Extractor](https://api-extractor.com/) for TypeScript and
  [`cargo-semver-checks`](https://github.com/obi1kenobi/cargo-semver-checks) plus
  [`cargo-public-api`](https://github.com/cargo-public-api/cargo-public-api) for Rust against the
  mutation set. Own only policy or glue these tools cannot enforce.
- [ ] Challenge the baseline design separately: mutate every API dimension, test tool blind spots,
  remove redundant machinery, and reject any path that can hide or casually accept API drift.
- [ ] Define one deterministic, readable baseline per language. Each baseline must contain every
  public signature and be the only stored API registry for that language.
- [ ] Define TypeScript extraction from packed declarations and manifest contracts: names, kinds,
  generics, parameters, returns, overloads, properties, unions, literals, optionality, deprecations,
  export conditions, type entry points, runtime floor, and `sideEffects`.
- [ ] Define Rust extraction from the packed crate: public paths, fields, variants, generics, bounds,
  lifetimes, methods, traits, constants, Cargo features, defaults, MSRV, and target gates.
- [ ] Choose the smallest Rust feature/target basis that exposes every conditional public item and
  interaction. Mutation-test its reach; never build the feature power set.
- [ ] Make an intentional API change difficult to land accidentally: require Art's approved HLD
  change, an explicit baseline update, both baseline diffs, semver evidence, and installed-package evidence.
- [ ] Design one approval path for API changes. The approved HLD text is the local authority;
  ordinary checks and `api:update` cannot grant approval, and hosted protection requires Art's review.
- [ ] Wire the fast baseline comparison into a version-controlled commit gate and `check.yml`.
  Fresh-clone setup must enable it; bypassed local checks must still fail before merge. Only the
  explicit reviewed update path may change a baseline.
- [ ] Reject one-language baseline updates unless an explicit exception names Art's ruling and the
  semantic reason. The exception stays beside the parity rule and never skips either baseline check.
- [ ] Block additions, removals, renames, tighter parameters, wider returns, weaker brands, lost
  features, moved paths, and new throws without Art's exact HLD ruling, even when semver permits them.
- [ ] Keep the API gate within the normal feedback budget. Cache or parallelize independent
  extraction, parity, consumer, and version checks without weakening their evidence.

### Phase 4: Design release compatibility checks

- [ ] Design exact npm and Rust predecessor selection for patch, minor, major, prerelease,
  unpublished, missing, and ambiguous cases before wiring the release gate.
- [ ] Extract predecessor APIs from their published packages when they predate checked-in baselines.
  Distinguish an absent release from registry failure or an unreadable artifact; none may pass as unchanged.
- [ ] Challenge the release design separately: test wrong versions, wrong predecessors, registry/tag
  disagreement, feature-only breaks, package/source drift, and deliberate bypass attempts.
- [ ] Derive the minimum version from structural API diffs and the approved classification of
  semantic changes that signatures cannot expose. The strongest TypeScript or Rust result wins;
  before 1.0, a break requires a minor. Semver evidence cannot approve HLD.
- [ ] Treat additions to closed unions, enums, exhaustive matches, defaults, errors, and feature
  behavior as possible breaks even when a tool reports an additive or unchanged signature.
- [ ] Compare sizes with the immediate prior release and the latest release from the previous release
  line: previous minor before 1.0, previous major from 1.0 onward. Report a missing comparison as
  unavailable, never as zero change.
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
  Do not publish an Aponte-only source entry; its repository-source route stays external.
- [ ] Implement the approved Rust surface and canonical paths. Verify the selected feature/target
  basis and required interactions without compatibility aliases or a feature power set.
- [ ] Implement the approved minimal chunk graph and export map. Installed-package tests must prove
  every condition resolves the intended built artifact.
- [ ] Extract and commit the approved TypeScript and Rust API baselines. The built public artifacts
  are their sources; the baselines are the only stored API registries.
- [ ] Add `api:check`: compare both built APIs with both baselines and require symmetric review when
  either changes. Fail with the exact diff, reason, required review, and update command.
- [ ] Add `api:update`: require the intended change class, run the fast lane, regenerate both
  baselines, write only changed files, and show both diffs. Normal checks never rewrite baselines.
- [ ] Mutation-test the API gate against added and hidden exports, overload changes, Rust visibility
  and feature changes, weaker errors, and one-sided parity drift. Keep only tests with unique detection.
- [ ] Add the credential-free release gate. Compare packaged APIs with approved baselines and selected
  releases; verify package/source identity, parity, version, tag, and semver before publication.
- [ ] Generate compact TypeScript and Rust API diffs in GitHub release notes from packaged baselines.
  Start with the approved `CHANGELOG.md` section verbatim, append generated evidence, and keep the
  generated tables out of the changelog. Retries must reproduce the same notes.
- [ ] Add npm archive and verified Rust native/WASM sizes to the same release notes. Reuse release
  artifacts and show absolute and percentage changes against both selected comparison releases.
- [ ] After Art permits remote settings, require the API check and Art's approval for protected
  branch changes to either baseline. Keep release credentials outside this gate.
- [ ] Update the artifact checker to inspect the final cleaned archive and reject source leaks,
  unexported implementation files, wrong runtime targets, duplicate code, and missing declarations.
- [ ] Update README examples, API reference, and `docs/security.md` for retained calls, types, errors,
  entropy, masking limits, and cancellation.
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
- [ ] Verify native and portable entropy paths in Node, Bun, browsers, Rust native, and WASM. Prove
  full callback writes, transactional output, owned `Uint8Array` results, and typed retained causes.
- [ ] Measure common and advanced imports with Bun and the supported browser bundler; verify Node and
  Deno resolution separately. Reject masking in keyless bundles and avoid fixed-byte budgets.
- [ ] Run the complete local check, web/browser artifact consumers, Rust feature matrix, public API
  snapshot gate, predecessor semver comparison, final-archive inspection, and license verification.
- [ ] Adversarially review the total final diff against every task in this section and every retained
  HLD contract. Remove redundant tests, snapshots, scripts, exports, chunks, comments, and docs.
- [ ] Commit each verified code or durable-document change with explicit paths. Leave remote checks,
  versioning, tags, pushes, and publication held until Art authorizes remote writes again.

### Later dependency update

- [ ] Update git-cliff in this package and publish-clean when npm ships the required newer release;
  keep the current registry version until then and do not add another installer.
