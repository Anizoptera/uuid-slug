# Roadmap

Make UUID generation, conversion, masking, and migration easy to use in TypeScript and Rust, with less unnecessary code and work.

## Goals and approval boundaries

- Art's goals: simpler calls, useful expert controls, efficient runtime paths, and better tree-shaking. Allow shared code; do not optimize export, file, or byte counts alone.
- Runtime floors define unguarded compatibility, not a lowest-common-denominator implementation.
  Use newer standard or host capabilities only for measured runtime/resource value, with one probe,
  a compatible fallback, and real-runtime coverage of both paths.
- Art's written HLD rulings authorize consumer changes. Contract owners: README guarantees,
  `docs/design.md` wire rules, `docs/security.md` limits, `docs/cross-language.md` parity/distribution,
  and `docs/release.md` release integrity and recovery. Read the owner before changing its contract;
  this SOP grants no approval.
- Preserve masked bytes, the 2^42 masking bound, 2^48 UUIDv7 bound, 16-bit check, raw sentinels,
  caller-ordered first-match keys, call-time byte-seed capture, and opt-in original migration.
  Keep base64url defaults, independent plain/masked alphabets, and length-based plain decoding.
- Preserve `defaultCodec` and `DEFAULT_MASK_SCHEMA`; Art must approve any removal. Keep the warning
  that the public default seed is not secret. Do not add seed limits, ordering, 0.2.0 compatibility,
  old aliases, fallback schemas, or a new cipher.
- Each decoder accepts every matching encoder output across lengths, alphabets, schemas, sentinels,
  keys, and enabled migration. Ordinary decode returns one UUID; candidates stay explicit. Invalid
  inputs return typed errors. Freshness stays finite, nonnegative, fractional, inclusive, and symmetric.
- Challenge existing APIs through caller jobs. Show gains, losses, upgrade steps, and limits; preserve contracts until Art rules otherwise.
- Prepare one dependency-free, native-free npm package and one `uuid-slug` crate with equal versions,
  Git/crates.io provenance, common native targets, and WASM. Rust dependencies need evidence;
  Node/Bun native bindings stay development-only.
- Native CI must run Rust from the first increment. Timeouts bound hangs; signals establish readiness.
- GitHub release notes start with the `CHANGELOG.md` section, then show generated packaged API and
  size changes against the immediate prior release and prior release line. Generated tables stay out of the changelog.
- Git release tags select both comparison releases, excluding the candidate on retries. Existing
  lightweight tags remain valid history; new releases use annotated tags. Registries
  retrieve and verify the selected bytes but never redefine history. Compare the nearest lower version
  and the newest lower minor before 1.0 or newest lower major thereafter. If those are identical, use
  the next older release line; if none exists, report one comparison rather than duplicate it.
- Keep the GitHub release draft until npm, crates.io, both exact archives, assets, and notes verify.
  Reruns repair only missing work and refuse to replace published or attached bytes that differ.
- Remote reads are allowed. Remote writes remain listed only as held inventory and are outside this
  roadmap's executable scope. Do not start, propose, or ask about versioning, tags, pushes,
  publication, releases, or remote settings unless Art explicitly requests the exact operation.

### Phase 1: Establish the packaged API boundary

- [x] Reconcile tasks with current code. Extend `scripts/check-artifact.ts`, `scripts/check-rust.ts`, shared cases, and `bench/check.ts` only where they lack required evidence.
- [x] Extract from packed declarations, Rust sources, and manifests, including reachable types, paths, and features. Reuse reports for caller review and baselines; keep no duplicate signature registry.
- [x] Test [API Extractor](https://api-extractor.com/), [cargo-public-api](https://github.com/cargo-public-api/cargo-public-api), and [cargo-semver-checks](https://github.com/obi1kenobi/cargo-semver-checks) on this package before choosing tools. Check compiler compatibility, multiple entry points, conditional items, deterministic output, and cold/warm cost.
- [x] Select tools by required structural coverage and upkeep cost. Pin compatible extractors/compilers, including rustdoc JSON tooling; compare omitted manifest fields separately.
- [x] Generate one readable baseline per language from packed content. Include TypeScript signatures, brands, overloads, deprecations, export conditions, type paths, runtime/compiler floors, and `sideEffects`.
- [x] Include Rust public paths, fields, variants, generics, bounds, lifetimes, methods, traits, constants, features, defaults, MSRV, and target conditions. Reuse the feature checks; add selections only for uncovered items or interactions, not the feature power set.
- [x] Mutation-test exports, overloads, brands, Rust visibility, lifetimes, auto-traits, and features. Record blind spots; contract tests cover semantics, while Art's review grants approval.
- [x] Commit current baselines before public changes. Add read-only `api:check` with exact diffs, and `api:update` to regenerate both reports after approval, writing only changed files.
- [x] Make `api:update` build and extract without recursively comparing the old baseline. Show the change class and both diffs; one unchanged language needs no artificial edit.
- [x] Wire `api:check` into the version-controlled commit gate and `check.yml`. Test fresh-clone setup and CI detection after a local bypass; local hooks detect mistakes but do not enforce approval.
- [x] Keep routine comparison offline after setup. Reuse the complete check's build; extractor and compiler caches own repeated work by toolchain, target, and feature inputs. Compare cold/warm cost with the existing commit checks.
- [x] Review both languages against Art's HLD ruling. Baseline equality, a version bump, or an agent's HLD edit cannot approve consumer changes or semantic exceptions.

### Phase 2: Design the public API and artifact layout

- [x] Map packaged APIs to caller jobs: generation, conversion, masked lookup, key rotation, and old-format reads. Identify normal/expert calls; missing local callers do not prove an API is unused.
- [x] Compare signatures and entry points through first-use and repeated-use examples in both languages. Favor clear defaults, composition, and actionable errors; retain expert storage, entropy, and schema controls.
- [x] Review API and layout together. For each removal, rename, move, or type/behavior change, show caller gain, upgrade cost, strongest alternative, and rejection case.
- [x] For base64url helpers, inspect callers and compare removal with exact UUID-specific names.
  Keep a byte type only for a useful, enforceable contract; distinguish 16-byte payloads from version-checked UUIDs and caller buffers. A type predicate must match its runtime validation.
- [x] Propose typed entropy/mixing failures and retain thrown causes at external boundaries. Use unbounded types only for unbounded inputs or causes; casts must not hide an unhandled domain.
- [x] Propose consistent construction/generation errors and discrimination across realms and package copies. Test direct typed-error handling and predicates returning `false` for invalid input; preserve causes and explain recovery without needless success-path wrappers.
- [x] Preserve identical sync/async keys, call-time input capture, and cooperative cancellation through shared primitives. Test queued host work; disclose initial copy/allocation costs instead of seed caps or absolute latency promises.
- [x] Compare generation paths by state, entropy, caller storage, and measured cost. Share code where useful; preserve native paths and independent state when merging adds work or locks.
- [x] Compare root and advanced entry points with real imports. Keep common calls simple and expert caller-buffer, offset, entropy, and schema controls accessible; fewer entry points alone is not a benefit.
- [x] Compile caller cases against optional and strict brands. Recommend the shape with the best balance of misuse prevention and accepted inputs; show literal convenience and upgrade costs for Art's ruling.
- [x] Trace `maskedSlugToUuid` and `maskedSlugToUuidV7` through plain migration and version checks.
  Propose both only if callers need their distinct result contracts.
- [x] Trace migration `decode` and `candidates` through parsing and lookup. Preserve the ruled
  one-result and ambiguous-candidate jobs without duplicated parsing.
- [x] Compile sentinel-definition, resolved-sentinel, and masked-slug-union caller cases. Propose only
  types that prevent a distinct mistake.
- [x] Challenge the names, placement, and warning for `defaultCodec` and `DEFAULT_MASK_SCHEMA` while
  preserving both ruled capabilities. Any removal needs a new ruling from Art.
- [x] Propose canonical Rust paths. Trace parameters, returns, traits, and features before hiding modules; callers must retain access to required types.
- [x] Compare named and opaque Rust futures. Propose cancellation signaling and cause semantics explicitly; required cancellation types are public contracts, not disposable internals.
- [x] Compare Rust `_with` and `_into_with` calls with simpler compositions. Preserve fallible entropy and caller storage without hidden global locks; fewer variants must not mean more caller work or allocation.
- [x] Align Rust and TypeScript names around consumer concepts while keeping idiomatic language
  shapes; symmetry means matching capability and semantics, not forced textual identity.
- [x] Define each decoder's full acceptance matrix: every retained encoder output across plain
  base64url, plain base32hex, masked base64url, masked base32hex, sentinels, current keys, previous
  keys, original masks, stored aliases, and enabled plain migration. Reject unsupported lengths and
  malformed payloads with typed errors; never decode arbitrary byte lengths.
- [x] Extend shared decoder cases from independent wire vectors and retained producer fixtures across both alphabets, key order, sentinels, migration, invalid inputs, and timestamp/storage boundaries. Agreement between implementations alone is not an oracle.

#### Artifact layout and consumer checks

- [x] Compare unbundled output, one bundle, and shared chunks on matched imports. Measure archive/bundle size, native startup, runtime cost, and declaration use; choose by overall consumer benefit and upkeep.
- [x] Exercise installed Node, Bun, Deno, and browser consumers plus Bun/Rolldown bundles. Check export conditions, behavior, declarations, and archive contents; source imports do not verify distribution.
- [x] Publish TypeScript for Bun and opt-in development tooling, with source conditions before built runtime conditions. Reject extra or reordered conditions in the final archive.
- [x] Prefer shared common code with condition-selected runtime adapters. Permit measured duplication when it improves consumer loading or compatibility enough to justify its maintenance cost.
- [x] Bundle declarations around public entries while preserving reachable types and compiler resolution. Allow required internal type files.
- [x] Ship self-contained source maps with the approved published TypeScript source; verify retained paths and references.
- [x] Minify built JavaScript and preserve useful tree-shaking boundaries. Judge unnecessary retained code by representative consumer bundles, not an absolute promise to remove every unused byte.
- [x] Prepare one npm package and one Rust crate for a shared release identity. Keep JavaScript
  chunks internal. Prefer source-only Rust publication; add prebuilt artifacts only when a measured
  consumer need outweighs their release and trust cost.
- [x] Measure Rust release linking on native and WASM caller probes. Use feature gates for required platform boundaries or costs normal linking retains; avoid multiplying features just to reduce a size number.
- [x] Track the compressed npm archive and `.crate` archive. For native and WASM code size, design
  one reproducible linked probe for the selected target/feature basis; compiler intermediates are invalid.
- [x] Minimize unnecessary loading for `uuidToSlug`, `uuidV4`, and `uuidV7Slug`, allowing shared helpers. Measure bundle retention and native startup separately; explain caller costs of entry-point changes.
- [x] Keep synchronous codecs ready after import, with schema, sentinel, migration, and runtime code available locally. Splitting must not add installation or asynchronous setup.
- [x] R1 — Submit the exact TypeScript/Rust API proposal: paths, brands, errors, cancellation, removals, language differences, and upgrade examples. Show the preferred choice and strongest alternative; obtain Art's written ruling before public code changes.
- [x] R2 — Submit runtime conditions, source-map content, and Rust delivery choices with their loading, diagnostic, and trust costs. Obtain Art's ruling before changing published artifacts.
- [x] R3 — Art selected Git tags as comparison history and ruled that the GitHub release stays draft
  until both registries and exact artifacts verify; retries repair only missing work. Comparisons must
  be distinct: on collision, use the next older release line or emit only the one available version.
- [x] Record Art's exact API, artifact, and release rulings in their durable owners with reasons and limits. No durable source may depend on this temporary SOP.

### Phase 3: Implement and verify approved changes

- [x] Implement approved caller capabilities across both languages with tests, baselines, and docs in each verified change. Map behavior to checks before editing; extend existing cases.
- [x] Show each new regression reaches its branch and detects broken behavior. Use completion signals with hang timeouts; retain required evidence when replacing flaky or duplicate checks.
- [x] No preparatory refactor was needed; approved changes fit the existing API, runtime-adapter, and artifact-check boundaries.
- [x] Implement the approved TypeScript surface and update repository callers and examples. Publish TypeScript only through the approved Bun and development conditions.
- [x] Implement the approved Rust surface and canonical paths. Verify the selected feature/target
  basis and required interactions without compatibility aliases or a feature power set.
- [x] Implement the approved artifact graph and export map; run installed consumers through each supported condition. Keep internal chunks that consumers need, even when they are not public entry points.
- [x] Keep Rust native, cross-target, WASM, and JavaScript runtime checks in their owning check, benchmark, and release workflows. Reuse unchanged results for the same inputs; retain separate runtime lanes and the unpinned newest-Node lane.
- [x] Run `api:update` after implementing the TypeScript and Rust surfaces that Art approved. Review
  both baseline diffs and reject any public item outside the ruling before committing either baseline.
- [x] Extend final cleaned-archive inspection for the approved graph: reject forbidden payloads, unreachable code, wrong adapters, invalid export conditions, and missing declarations. Validate runtime and declaration dependency graphs, not a fixed file count or ban on private chunks.
- [x] Run encoder-to-decoder cases in both languages for supported spellings, schemas, key order, sentinels, migration aliases, boundary timestamps, invalid payloads, and caller-buffer ranges. Preserve atomic writes and test later guards with inputs that pass earlier guards.
- [x] Compile misuse cases for the approved exports, brands, callbacks, Rust paths, features, and error handling. Each negative case must fail for its intended reason; do not impose rejected API proposals through tests.
- [x] Test typed-error returns directly and native/portable entropy in Node, Bun, browsers, Rust native, and WASM: failed partial writes, transactional identifier output/state, retry, owned plain `Uint8Array`, preserved caller buffers, and runtime-specific causes.
- [x] Verify callback invocation and ranges; successful complete entropy fills remain the callback author's responsibility because output bytes cannot prove they were written. Reuse `test/entropy-probe.ts` across Node and Bun.
- [x] Measure common and expert imports with matched runtimes, toolchains, inputs, and drivers. Reuse resource/performance probes, run competing timings sequentially, and disclose variance and scope; gate meaningful regressions rather than fixed byte ceilings or zero shared code.
- [x] Update README's API reference and before/after upgrade examples for approved calls, imports, types, and errors. Keep stored-ID migration separate; update `docs/security.md` only if its entropy, masking, or cancellation limits change.
- [x] Align README's tree-shaking guarantee and its tests with Art's goal of reducing unnecessary code while allowing shared helpers; document the measured bundle boundary separately from native loading.
- [x] Update `docs/cross-language.md` with the final capability mapping, allowed language-specific
  differences, artifact boundaries, and API-change gate after Art approves the final surface.
- [x] Keep `docs/design.md` unchanged because API placement did not change codec, schema, format, or sentinel wire semantics.
- [x] Update project `AGENTS.md` only for short durable rules that future API or packaging work must
  load before acting. Do not copy the implementation checklist into permanent guidance.
- [x] Remove private project names, stale signatures, import paths, artifact counts, source-path claims, and
  superseded rationale from public docs, code comments, examples, changelog drafts, and scripts.

### Phase 4: Complete release compatibility and recovery

- [x] Implement Art's approved Git-tag predecessor policy for npm and Rust: patch, minor, major,
  prerelease, first publication, missing and ambiguous cases. Exclude the candidate itself on retries;
  require registries to provide the selected versions rather than selecting from registry history.
  - [x] Select strict SemVer history from Git, including prereleases and build metadata; reject
    ambiguous precedence; keep comparisons distinct; accept existing lightweight release tags.
  - [x] Bind each selected tag to its npm and crates.io archive, or stop with a precise unavailable
    reason instead of substituting a registry-selected version. Treat a registry with no package
    history as a first publication with no predecessor; once history exists, missing selected bytes
    are a disagreement and stop release.
- [x] Retain selected versions and registry integrity with release inputs so retries use the same comparison basis. Extract older APIs from published packages; distinguish absence from outage or unreadable content and report missing comparisons as unavailable.
- [x] Derive the minimum version from structural diffs and Art's classification of semantic changes; the stronger language result wins, and pre-1.0 breaks require a minor. Check closed unions, enums, exhaustive matches, defaults, errors, and features even when signatures look additive or unchanged.
- [x] Report parity failures by caller capability, both signatures, semantic difference, and required fix. Reuse shared contract cases and the approved capability mapping; add a names-based check only if it catches a distinct real mismatch without enforcing textual symmetry.
- [x] Compare size against the immediate prior release and the previous release line: previous minor before 1.0, previous major thereafter. Report published archive bytes separately from linked native/WASM probes rebuilt with matched compiler, target, features, profile, and driver; report zero/missing denominators without invented percentages.
- [x] Test predecessor choice, wrong versions, registry/tag disagreement, feature-only breaks, source/package drift, and bypass attempts at their owning gate. Reuse existing release tests and extend only the uncovered cases.
- [x] Prepare npm and crate archives without publishing credentials; check packaged APIs, contracts, parity, version/tag, semver, and integrity. Reuse these artifacts for publication, or require byte identity if a publisher must repack.
- [x] Generate release notes in `release.yml` from retained inputs: the changelog section verbatim, then API diffs and absolute/percentage npm, crate, native, and WASM size changes against both predecessors. Keep generated tables out of the changelog and reproduce notes on retry.
- [x] Test release recovery when neither registry, npm only, or both registries contain the version, and when notes/assets fail. Resume missing actions against verified bytes; never replace a published version with different content.
- [x] Implement Art's approved combined-release completion behavior: registry, archive, asset, and
  notes verification precede finalization; reruns repair only missing work; validation jobs keep no
  publishing credentials.
### Phase 5: Verify and close

- [x] Run `bun run check` under the repository's pinned toolchain, web/browser artifact consumers, the selected Rust feature/target
  basis and required interactions, public API snapshot gate, predecessor semver comparison,
  final-archive inspection, and license verification.
- [x] Review the total diff against every SOP task and approved HLD change. Check that each retained part serves a caller or verification need and each removed part has a replacement or approved removal; do not delete useful shared code to satisfy a count.
- [x] Commit each verified code or durable-document change with explicit paths. Remote writes are
  held inventory, not executable roadmap work, unless Art explicitly requests the exact operation.

### Remote-write hold

These entries are inventory, not executable tasks. No agent may prepare, propose, ask about, or
start one unless Art explicitly requests that exact operation. Remote reads remain allowed.

- [ ] **HOLD:** Push local commits to the remote repository.
- [ ] **HOLD:** Push the release tag to the remote repository.
- [ ] **HOLD:** Publish the npm package.
- [ ] **HOLD:** Publish the Rust crate.
- [ ] **HOLD:** Create the draft GitHub release.
- [ ] **HOLD:** Update GitHub release notes or assets.
- [ ] **HOLD:** Finalize the GitHub release.
- [ ] **HOLD:** Change branch protection.
- [ ] **HOLD:** Change any other remote repository setting.

### Separate dependency follow-up

- [ ] Update this package's git-cliff to registry version 2.14.1 or later when available; verify changelog generation and retain the registry installer. This does not block the API work. The corresponding publish-clean update needs separate repository authorization.
