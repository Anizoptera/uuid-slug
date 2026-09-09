# Roadmap

Make UUID generation, conversion, masking, and migration easy to use in TypeScript and Rust, with less unnecessary code and work.

## Goals and approval boundaries

- Art's goals: simpler calls, useful expert controls, efficient runtime paths, and better tree-shaking. Allow shared code; do not optimize export, file, or byte counts alone.
- Art's written HLD rulings authorize consumer changes. Contract owners: README guarantees, `docs/design.md` wire rules, `docs/security.md` limits, and `docs/cross-language.md` parity/distribution. Read the owner before changing its contract; this SOP grants no approval.
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
- Publish one dependency-free, native-free npm package and one `uuid-slug` crate with equal versions,
  Git/crates.io provenance, common native targets, and WASM. Rust dependencies need evidence;
  Node/Bun native bindings stay development-only.
- Native CI must run Rust from the first increment. Timeouts bound hangs; signals establish readiness.
- GitHub release notes start with the `CHANGELOG.md` section, then show generated packaged API and
  size changes against the immediate prior release and prior release line. Generated tables stay out of the changelog.
- Do not version, tag, push, publish, release, or change remote state without Art's separate approval.

### Phase 1: Establish the packaged API boundary

- [ ] Reconcile tasks with current code. Extend `scripts/check-artifact.ts`, `scripts/check-rust.ts`, shared cases, and `bench/check.ts` only where they lack required evidence.
- [ ] Extract from packed declarations, Rust sources, and manifests, including reachable types, paths, and features. Reuse reports for caller review and baselines; keep no duplicate signature registry.
- [ ] Test [API Extractor](https://api-extractor.com/), [cargo-public-api](https://github.com/cargo-public-api/cargo-public-api), and [cargo-semver-checks](https://github.com/obi1kenobi/cargo-semver-checks) on this package before choosing tools. Check compiler compatibility, multiple entry points, conditional items, deterministic output, and cold/warm cost.
- [ ] Select tools by required structural coverage and upkeep cost. Pin compatible extractors/compilers, including rustdoc JSON tooling; compare omitted manifest fields separately.
- [ ] Generate one readable baseline per language from packed content. Include TypeScript signatures, brands, overloads, deprecations, export conditions, type paths, runtime/compiler floors, and `sideEffects`.
- [ ] Include Rust public paths, fields, variants, generics, bounds, lifetimes, methods, traits, constants, features, defaults, MSRV, and target conditions. Reuse the feature checks; add selections only for uncovered items or interactions, not the feature power set.
- [ ] Mutation-test exports, overloads, brands, Rust visibility, lifetimes, auto-traits, and features. Record blind spots; contract tests cover semantics, while Art's review grants approval.
- [ ] Commit current baselines before public changes. Add read-only `api:check` with exact diffs, and `api:update` to regenerate both reports after approval, writing only changed files.
- [ ] Make `api:update` build and extract without recursively comparing the old baseline. Show the change class and both diffs; one unchanged language needs no artificial edit.
- [ ] Wire `api:check` into the version-controlled commit gate and `check.yml`. Test fresh-clone setup and CI detection after a local bypass; local hooks detect mistakes but do not enforce approval.
- [ ] Keep routine comparison offline after setup. Cache builds/extraction by inputs, toolchain, targets, and features; compare cold/warm cost with the existing commit checks.
- [ ] Review both languages against Art's HLD ruling. Baseline equality, a version bump, or an agent's HLD edit cannot approve consumer changes or semantic exceptions.

### Phase 2: Design the public API and artifact layout

- [ ] Map packaged APIs to caller jobs: generation, conversion, masked lookup, key rotation, and old-format reads. Identify normal/expert calls; missing local callers do not prove an API is unused.
- [ ] Compare signatures and entry points through first-use and repeated-use examples in both languages. Favor clear defaults, composition, and actionable errors; retain expert storage, entropy, and schema controls.
- [ ] Review API and layout together. For each removal, rename, move, or type/behavior change, show caller gain, upgrade cost, strongest alternative, and rejection case.
- [ ] For base64url helpers, inspect callers and compare removal with exact UUID-specific names.
  Keep a byte type only for a useful, enforceable contract; distinguish 16-byte payloads from version-checked UUIDs and caller buffers. A type predicate must match its runtime validation.
- [ ] Propose typed entropy/mixing failures and retain thrown causes at external boundaries. Use unbounded types only for unbounded inputs or causes; casts must not hide an unhandled domain.
- [ ] Propose consistent construction/generation errors and discrimination across realms and package copies. Test direct typed-error handling and predicates returning `false` for invalid input; preserve causes and explain recovery without needless success-path wrappers.
- [ ] Preserve identical sync/async keys, call-time input capture, and cooperative cancellation through shared primitives. Test queued host work; disclose initial copy/allocation costs instead of seed caps or absolute latency promises.
- [ ] Compare generation paths by state, entropy, caller storage, and measured cost. Share code where useful; preserve native paths and independent state when merging adds work or locks.
- [ ] Compare root and advanced entry points with real imports. Keep common calls simple and expert caller-buffer, offset, entropy, and schema controls accessible; fewer entry points alone is not a benefit.
- [ ] Compile caller cases against optional and strict brands. Recommend the shape with the best balance of misuse prevention and accepted inputs; show literal convenience and upgrade costs for Art's ruling.
- [ ] Trace `maskedSlugToUuid` and `maskedSlugToUuidV7` through plain migration and version checks.
  Propose both only if callers need their distinct result contracts.
- [ ] Trace migration `decode` and `candidates` through parsing and lookup. Preserve the ruled
  one-result and ambiguous-candidate jobs without duplicated parsing.
- [ ] Compile sentinel-definition, resolved-sentinel, and masked-slug-union caller cases. Propose only
  types that prevent a distinct mistake.
- [ ] Challenge the names, placement, and warning for `defaultCodec` and `DEFAULT_MASK_SCHEMA` while
  preserving both ruled capabilities. Any removal needs a new ruling from Art.
- [ ] Propose canonical Rust paths. Trace parameters, returns, traits, and features before hiding modules; callers must retain access to required types.
- [ ] Compare named and opaque Rust futures. Propose cancellation signaling and cause semantics explicitly; required cancellation types are public contracts, not disposable internals.
- [ ] Compare Rust `_with` and `_into_with` calls with simpler compositions. Preserve fallible entropy and caller storage without hidden global locks; fewer variants must not mean more caller work or allocation.
- [ ] Align Rust and TypeScript names around consumer concepts while keeping idiomatic language
  shapes; symmetry means matching capability and semantics, not forced textual identity.
- [ ] Define each decoder's full acceptance matrix: every retained encoder output across plain
  base64url, plain base32hex, masked base64url, masked base32hex, sentinels, current keys, previous
  keys, original masks, stored aliases, and enabled plain migration. Reject unsupported lengths and
  malformed payloads with typed errors; never decode arbitrary byte lengths.
- [ ] Extend shared decoder cases from independent wire vectors and retained producer fixtures across both alphabets, key order, sentinels, migration, invalid inputs, and timestamp/storage boundaries. Agreement between implementations alone is not an oracle.

#### Artifact layout and consumer checks

- [ ] Compare unbundled output, one bundle, and shared chunks on matched imports. Measure archive/bundle size, native startup, runtime cost, and declaration use; choose by overall consumer benefit and upkeep.
- [ ] Exercise installed Node, Bun, Deno, and browser consumers plus Bun/Rolldown bundles. Check export conditions, behavior, declarations, and archive contents; source imports do not verify distribution.
- [ ] Keep the private repository-source route outside published exports and verify it read-only. Route published Bun imports to built code and remove `src` from the archive without making it depend on repository layout.
- [ ] Prefer shared common code with condition-selected runtime adapters. Permit measured duplication when it improves consumer loading or compatibility enough to justify its maintenance cost.
- [ ] Bundle declarations around public entries while preserving reachable types and compiler resolution. Allow required internal type files.
- [ ] Compare diagnostics with/without source maps and propose their source-content policy. Removing `src` does not remove embedded sources; verify retained paths and references.
- [ ] Minify built JavaScript and preserve useful tree-shaking boundaries. Judge unnecessary retained code by representative consumer bundles, not an absolute promise to remove every unused byte.
- [ ] Publish one npm package and one Rust crate. Keep JavaScript chunks internal and Rust targets
  under one release identity. Compare source-only Rust publication with prebuilt delivery; add
  prebuilt artifacts only when a measured consumer need outweighs their release and trust cost.
- [ ] Measure Rust release linking on native and WASM caller probes. Use feature gates for required platform boundaries or costs normal linking retains; avoid multiplying features just to reduce a size number.
- [ ] Track the compressed npm archive and `.crate` archive. For native and WASM code size, design
  one reproducible linked probe for the selected target/feature basis; compiler intermediates are invalid.
- [ ] Minimize unnecessary loading for `uuidToSlug`, `uuidV4`, and `uuidV7Slug`, allowing shared helpers. Measure bundle retention and native startup separately; explain caller costs of entry-point changes.
- [ ] Keep synchronous codecs ready after import, with schema, sentinel, migration, and runtime code available locally. Splitting must not add installation or asynchronous setup.
- [ ] R1 — Submit the exact TypeScript/Rust API proposal: paths, brands, errors, cancellation, removals, language differences, and upgrade examples. Show the preferred choice and strongest alternative; obtain Art's written ruling before public code changes.
- [ ] R2 — Submit runtime conditions, source-map content, and Rust delivery choices with their loading, diagnostic, and trust costs. Obtain Art's ruling before changing published artifacts.
- [ ] R3 — Submit predecessor/channel selection and combined-release completion rules, including the proposed draft-until-both-published behavior. Obtain Art's ruling before enforcing release policy; remote operations need separate authorization.
- [ ] Record Art's exact rulings in the HLD; reflect the approved contracts in their durable owners with reasons and limits, and internal derivations beside their code. No durable source may depend on this temporary SOP.

### Phase 3: Implement and verify approved changes

- [ ] Implement approved caller capabilities across both languages with tests, baselines, and docs in each verified change. Map behavior to checks before editing; extend existing cases.
- [ ] Show each new regression reaches its branch and detects broken behavior. Use completion signals with hang timeouts; retain required evidence when replacing flaky or duplicate checks.
- [ ] Refactor in a separate commit only where changing in place is harder. Name the resisting boundary and preserved behavior; justify abstractions by ownership, failure isolation, or reuse, not caller counts.
- [ ] Implement the approved TypeScript surface and update repository callers and examples. Keep the private source route external; published entries resolve built code.
- [ ] Implement the approved Rust surface and canonical paths. Verify the selected feature/target
  basis and required interactions without compatibility aliases or a feature power set.
- [ ] Implement the approved artifact graph and export map; run installed consumers through each supported condition. Keep internal chunks that consumers need, even when they are not public entry points.
- [ ] Keep Rust native, cross-target, WASM, and JavaScript runtime checks in their owning check, benchmark, and release workflows. Reuse unchanged results for the same inputs; retain separate runtime lanes and the unpinned newest-Node lane.
- [ ] Run `api:update` after implementing the TypeScript and Rust surfaces that Art approved. Review
  both baseline diffs and reject any public item outside the ruling before committing either baseline.
- [ ] Extend final cleaned-archive inspection for the approved graph: reject forbidden source content, unreachable code, wrong adapters, and missing declarations. Validate the runtime and declaration dependency graphs, not a fixed file count or ban on private chunks.
- [ ] Run encoder-to-decoder cases in both languages for supported spellings, schemas, key order, sentinels, migration aliases, boundary timestamps, invalid payloads, and caller-buffer ranges. Preserve atomic writes and test later guards with inputs that pass earlier guards.
- [ ] Compile misuse cases for the approved exports, brands, callbacks, Rust paths, features, and error handling. Each negative case must fail for its intended reason; do not impose rejected API proposals through tests.
- [ ] Test typed-error returns directly and native/portable entropy in Node, Bun, browsers, Rust native, and WASM: failed partial writes, transactional identifier output/state, retry, owned plain `Uint8Array`, preserved caller buffers, and runtime-specific causes.
- [ ] Verify callback invocation and ranges; successful complete entropy fills remain the callback author's responsibility because output bytes cannot prove they were written. Reuse `test/entropy-probe.ts` across Node and Bun.
- [ ] Measure common and expert imports with matched runtimes, toolchains, inputs, and drivers. Reuse resource/performance probes, run competing timings sequentially, and disclose variance and scope; gate meaningful regressions rather than fixed byte ceilings or zero shared code.
- [ ] Update README's API reference and before/after upgrade examples for approved calls, imports, types, and errors. Keep stored-ID migration separate; update `docs/security.md` for entropy, masking, and cancellation limits.
- [ ] Align README's tree-shaking guarantee and its tests with Art's goal of reducing unnecessary code while allowing shared helpers; document the measured bundle boundary separately from native loading.
- [ ] Update `docs/cross-language.md` with the final capability mapping, allowed language-specific
  differences, artifact boundaries, and API-change gate after Art approves the final surface.
- [ ] Update `docs/design.md` only where final API placement changes how consumers select codecs,
  schemas, formats, or sentinels; keep wire-format ownership unchanged.
- [ ] Update project `AGENTS.md` only for short durable rules that future API or packaging work must
  load before acting. Do not copy the implementation checklist into permanent guidance.
- [ ] Remove private project names, stale signatures, import paths, artifact counts, source-path claims, and
  superseded rationale from public docs, code comments, examples, changelog drafts, and scripts.

### Phase 4: Complete release compatibility and recovery

- [ ] Implement Art's approved predecessor/channel policy for npm and Rust: patch, minor, major, prerelease, first publication, missing and ambiguous cases. Select published artifacts and exclude the candidate itself on retries.
- [ ] Retain selected versions and registry integrity with release inputs so retries use the same comparison basis. Extract older APIs from published packages; distinguish absence from outage or unreadable content and report missing comparisons as unavailable.
- [ ] Derive the minimum version from structural diffs and Art's classification of semantic changes; the stronger language result wins, and pre-1.0 breaks require a minor. Check closed unions, enums, exhaustive matches, defaults, errors, and features even when signatures look additive or unchanged.
- [ ] Report parity failures by caller capability, both signatures, semantic difference, and required fix. Reuse shared contract cases and the approved capability mapping; add a names-based check only if it catches a distinct real mismatch without enforcing textual symmetry.
- [ ] Compare size against the immediate prior release and the previous release line: previous minor before 1.0, previous major thereafter. Report published archive bytes separately from linked native/WASM probes rebuilt with matched compiler, target, features, profile, and driver; report zero/missing denominators without invented percentages.
- [ ] Test predecessor choice, wrong versions, registry/tag disagreement, feature-only breaks, source/package drift, and bypass attempts at their owning gate. Reuse existing release tests and extend only the uncovered cases.
- [ ] Prepare npm and crate archives without publishing credentials; check packaged APIs, contracts, parity, version/tag, semver, and integrity. Reuse these artifacts for publication, or require byte identity if a publisher must repack.
- [ ] Generate release notes in `release.yml` from retained inputs: the changelog section verbatim, then API diffs and absolute/percentage npm, crate, native, and WASM size changes against both predecessors. Keep generated tables out of the changelog and reproduce notes on retry.
- [ ] Test release recovery when neither registry, npm only, or both registries contain the version, and when notes/assets fail. Resume missing actions against verified bytes; never replace a published version with different content.
- [ ] Implement Art's approved combined-release completion behavior. The draft-until-both-published proposal requires registry and asset verification before finalization; validation jobs keep no publishing credentials.
- [ ] After Art authorizes remote settings, require his review and the API check for baseline changes and protect their gate, workflow, and HLD owners too. Verify enforcement with remote readback; until then report protection as pending, not installed.

### Phase 5: Verify and close

- [ ] Run `bun run check` under the repository's pinned toolchain, web/browser artifact consumers, the selected Rust feature/target
  basis and required interactions, public API snapshot gate, predecessor semver comparison,
  final-archive inspection, and license verification.
- [ ] Review the total diff against every SOP task and approved HLD change. Check that each retained part serves a caller or verification need and each removed part has a replacement or approved removal; do not delete useful shared code to satisfy a count.
- [ ] Commit each verified code or durable-document change with explicit paths. Leave remote checks,
  versioning, tags, pushes, and publication held until Art authorizes remote writes again.

### Separate dependency follow-up

- [ ] Update this package's git-cliff to registry version 2.14.1 or later when available; verify changelog generation and retain the registry installer. This does not block the API work. The corresponding publish-clean update needs separate repository authorization.
