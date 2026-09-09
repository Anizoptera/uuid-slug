# Roadmap

Make UUID generation, conversion, masking, and migration easy to use in TypeScript and Rust, with less unnecessary code and work.

## Goals and approval boundaries

- Maintainer goals: simpler calls, useful expert controls, efficient runtime paths, and better tree-shaking. Allow shared code; do not optimize export, file, or byte counts alone.
- Runtime floors define unguarded compatibility, not a lowest-common-denominator implementation.
  Use newer standard or host capabilities only for measured runtime/resource value, with one probe,
  a compatible fallback, and real-runtime coverage of both paths.
- Written maintainer HLD rulings authorize consumer changes. Contract owners: README guarantees,
  `docs/design.md` wire rules, `docs/security.md` limits, `docs/cross-language.md` parity/distribution,
  and `docs/release.md` release integrity and recovery. Read the owner before changing its contract;
  this SOP grants no approval.
- Preserve masked bytes, the 2^42 masking bound, 2^48 UUIDv7 bound, 16-bit check, raw sentinels,
  caller-ordered first-match keys, call-time byte-seed capture, and opt-in original migration.
  Keep base64url defaults, independent plain/masked alphabets, and length-based plain decoding.
- Preserve `defaultCodec` and `DEFAULT_MASK_SCHEMA`; removal requires maintainer approval. Keep the warning
  that the public default seed is not secret. Do not add seed limits, ordering, 0.2.0 compatibility,
  old aliases, fallback schemas, or a new cipher.
- Each decoder accepts every matching encoder output across lengths, alphabets, schemas, sentinels,
  keys, and enabled migration. Ordinary decode returns one UUID; candidates stay explicit. Invalid
  inputs return typed errors. Freshness stays finite, nonnegative, fractional, inclusive, and symmetric.
- Challenge existing APIs through caller jobs. Show gains, losses, upgrade steps, and limits; preserve contracts until a maintainer rules otherwise.
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
  publication, releases, or remote settings unless a maintainer explicitly requests the exact operation.

### Phase 1: Establish the packaged API boundary

- [x] Reconcile tasks with current code. Extend `scripts/check-artifact.ts`, `scripts/check-rust.ts`, shared cases, and `bench/check.ts` only where they lack required evidence.
- [x] Extract TypeScript declarations and Rust public items for readable baselines. Read package metadata from its canonical manifest only where artifact or release verification needs it.
- [x] Test [API Extractor](https://api-extractor.com/), [cargo-public-api](https://github.com/cargo-public-api/cargo-public-api), and [cargo-semver-checks](https://github.com/obi1kenobi/cargo-semver-checks) on this package before choosing tools. Check compiler compatibility, multiple entry points, conditional items, deterministic output, and cold/warm cost.
- [x] Select tools by required structural coverage and upkeep cost. Pin compatible extractors and compilers, including rustdoc JSON tooling; verify non-declaration contracts at their owning artifact or release boundary.
- [x] Generate one readable declaration baseline per language. Keep export conditions, runtime/compiler floors, and package metadata in their canonical manifests rather than duplicating them in snapshots.
- [x] Include Rust public paths, fields, variants, generics, bounds, lifetimes, methods, traits, and constants in the baseline. Verify features, defaults, MSRV, and target conditions through Cargo and the supported build matrix.
- [x] Mutation-test exports, overloads, brands, Rust visibility, lifetimes, auto-traits, and features. Record blind spots; contract tests cover semantics, while maintainer review grants approval.
- [x] Commit current baselines before public changes. Add read-only `api:check` with exact diffs, and `api:update` to regenerate both reports with the proposed change, writing only changed files.
- [x] Make `api:update` build and extract without recursively comparing the old baseline. Show the change class and both diffs; one unchanged language needs no artificial edit.
- [x] Wire `api:check` into the version-controlled commit gate and `check.yml`. Test fresh-clone setup and CI detection after a local bypass; local hooks expose changes and maintainers decide at merge.
- [x] Keep routine comparison offline after setup. Reuse the complete check's build; extractor and compiler caches own repeated work by toolchain, target, and feature inputs. Compare cold/warm cost with the existing commit checks.
- [x] Review both languages against the maintainer HLD ruling. Baseline equality, a version bump, or an agent's HLD edit cannot approve consumer changes or semantic exceptions.

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
- [x] Compile caller cases against optional and strict brands. Recommend the shape with the best balance of misuse prevention and accepted inputs; show literal convenience and upgrade costs for maintainer ruling.
- [x] Trace `maskedSlugToUuid` and `maskedSlugToUuidV7` through plain migration and version checks.
  Propose both only if callers need their distinct result contracts.
- [x] Trace migration `decode` and `candidates` through parsing and lookup. Preserve the ruled
  one-result and ambiguous-candidate jobs without duplicated parsing.
- [x] Compile sentinel-definition, resolved-sentinel, and masked-slug-union caller cases. Propose only
  types that prevent a distinct mistake.
- [x] Challenge the names, placement, and warning for `defaultCodec` and `DEFAULT_MASK_SCHEMA` while
  preserving both ruled capabilities. Any removal needs a new maintainer ruling.
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
- [x] R1 — Submit the exact TypeScript/Rust API change: paths, brands, errors, cancellation, removals, language differences, and upgrade examples. Show the preferred choice and strongest alternative; the merge decision rules on the complete change.
- [x] R2 — Submit runtime conditions, source-map content, and Rust delivery choices with their loading, diagnostic, and trust costs. The merge decision rules on the complete artifact change.
- [x] R3 — The maintainer selected Git tags as comparison history and ruled that the GitHub release stays draft
  until both registries and exact artifacts verify; retries repair only missing work. Comparisons must
  be distinct: on collision, use the next older release line or emit only the one available version.
- [x] Record exact maintainer API, artifact, and release rulings in their durable owners with reasons and limits. No durable source may depend on this temporary SOP.

### Phase 3: Implement and verify approved changes

- [x] Implement approved caller capabilities across both languages with tests, baselines, and docs in each verified change. Map behavior to checks before editing; extend existing cases.
- [x] Show each new regression reaches its branch and detects broken behavior. Use completion signals with hang timeouts; retain required evidence when replacing flaky or duplicate checks.
- [x] No preparatory refactor was needed; approved changes fit the existing API, runtime-adapter, and artifact-check boundaries.
- [x] Implement the approved TypeScript surface and update repository callers and examples. Publish TypeScript only through the approved Bun and development conditions.
- [x] Implement the approved Rust surface and canonical paths. Verify the selected feature/target
  basis and required interactions without compatibility aliases or a feature power set.
- [x] Implement the approved artifact graph and export map; run installed consumers through each supported condition. Keep internal chunks that consumers need, even when they are not public entry points.
- [x] Keep Rust native, cross-target, WASM, and JavaScript runtime checks in their owning check, benchmark, and release workflows. Reuse unchanged results for the same inputs; retain separate runtime lanes and the unpinned newest-Node lane.
- [x] Run `api:update` after implementing the approved TypeScript and Rust surfaces. Review
  both baseline diffs and reject any public item outside the ruling before committing either baseline.
- [x] Extend final cleaned-archive inspection for the approved graph: reject forbidden payloads, unreachable code, wrong adapters, invalid export conditions, and missing declarations. Validate runtime and declaration dependency graphs, not a fixed file count or ban on private chunks.
- [x] Run encoder-to-decoder cases in both languages for supported spellings, schemas, key order, sentinels, migration aliases, boundary timestamps, invalid payloads, and caller-buffer ranges. Preserve atomic writes and test later guards with inputs that pass earlier guards.
- [x] Compile misuse cases for the approved exports, brands, callbacks, Rust paths, features, and error handling. Each negative case must fail for its intended reason; do not impose rejected API proposals through tests.
- [x] Test typed-error returns directly and native/portable entropy in Node, Bun, browsers, Rust native, and WASM: failed partial writes, transactional identifier output/state, retry, owned plain `Uint8Array`, preserved caller buffers, and runtime-specific causes.
- [x] Verify callback invocation and ranges; successful complete entropy fills remain the callback author's responsibility because output bytes cannot prove they were written. Reuse `test/entropy-probe.ts` across Node and Bun.
- [x] Measure common and expert imports with matched runtimes, toolchains, inputs, and drivers. Reuse resource/performance probes, run competing timings sequentially, and disclose variance and scope; gate meaningful regressions rather than fixed byte ceilings or zero shared code.
- [x] Update README's API reference and before/after upgrade examples for approved calls, imports, types, and errors. Keep stored-ID migration separate; update `docs/security.md` only if its entropy, masking, or cancellation limits change.
- [x] Align README's tree-shaking guarantee and its tests with the maintainer goal of reducing unnecessary code while allowing shared helpers; document the measured bundle boundary separately from native loading.
- [x] Update `docs/cross-language.md` with the final capability mapping, allowed language-specific
  differences, artifact boundaries, and API-change gate with the final surface for merge review.
- [x] Keep `docs/design.md` unchanged because API placement did not change codec, schema, format, or sentinel wire semantics.
- [x] Update project `AGENTS.md` only for short durable rules that future API or packaging work must
  load before acting. Do not copy the implementation checklist into permanent guidance.
- [x] Remove private project names, stale signatures, import paths, artifact counts, source-path claims, and
  superseded rationale from public docs, code comments, examples, changelog drafts, and scripts.

### Phase 4: Complete release compatibility and recovery

- [x] Implement the approved Git-tag predecessor policy for npm and Rust: patch, minor, major,
  prerelease, first publication, missing and ambiguous cases. Exclude the candidate itself on retries;
  require registries to provide the selected versions rather than selecting from registry history.
  - [x] Select strict SemVer history from Git, including prereleases and build metadata; reject
    ambiguous precedence; keep comparisons distinct; accept existing lightweight release tags.
  - [x] Bind each selected tag to its npm and crates.io archive, or stop with a precise unavailable
    reason instead of substituting a registry-selected version. Treat a registry with no package
    history as a first publication with no predecessor; once history exists, missing selected bytes
    are a disagreement and stop release.
- [x] Retain selected versions and registry integrity with release inputs so retries use the same comparison basis. Extract older APIs from published packages; distinguish absence from outage or unreadable content and report missing comparisons as unavailable.
- [x] Derive the minimum version from structural diffs and maintainer classification of semantic changes; the stronger language result wins, and pre-1.0 breaks require a minor. Check closed unions, enums, exhaustive matches, defaults, errors, and features even when signatures look additive or unchanged.
- [x] Report parity failures by caller capability, both signatures, semantic difference, and required fix. Reuse shared contract cases and the approved capability mapping; add a names-based check only if it catches a distinct real mismatch without enforcing textual symmetry.
- [x] Compare size against the immediate prior release and the previous release line: previous minor before 1.0, previous major thereafter. Report published archive bytes separately from linked native/WASM probes rebuilt with matched compiler, target, features, profile, and driver; report zero/missing denominators without invented percentages.
- [x] Test predecessor choice, wrong versions, registry/tag disagreement, feature-only breaks, source/package drift, and bypass attempts at their owning gate. Reuse existing release tests and extend only the uncovered cases.
- [x] Prepare npm and crate archives without publishing credentials; check packaged APIs, contracts, parity, version/tag, semver, and integrity. Reuse these artifacts for publication, or require byte identity if a publisher must repack.
- [x] Generate release notes in `release.yml` from retained inputs: the changelog section verbatim, then API diffs and absolute/percentage npm, crate, native, and WASM size changes against both predecessors. Keep generated tables out of the changelog and reproduce notes on retry.
- [x] Test release recovery when neither registry, npm only, or both registries contain the version, and when notes/assets fail. Resume missing actions against verified bytes; never replace a published version with different content.
- [x] Implement the approved combined-release completion behavior: registry, archive, asset, and
  notes verification precede finalization; reruns repair only missing work; validation jobs keep no
  publishing credentials.
### Phase 5: Verify and close

- [x] Run `bun run check` under the repository's pinned toolchain, web/browser artifact consumers, the selected Rust feature/target
  basis and required interactions, public API snapshot gate, predecessor semver comparison,
  final-archive inspection, and license verification.
- [x] Review the total diff against every SOP task and approved HLD change. Check that each retained part serves a caller or verification need and each removed part has a replacement or approved removal; do not delete useful shared code to satisfy a count.
- [x] Commit each verified code or durable-document change with explicit paths. Remote writes are
  held inventory, not executable roadmap work, unless a maintainer explicitly requests the exact operation.

### Phase 6: Enforce API evolution and exact archive policy

- [x] Keep npm and Cargo on one `X.Y.Z-dev` target between releases. Default to the next patch;
  require the committer to raise it for minor or major consumer changes. Reject `-dev` on release
  tags and require the stable tag and both manifests to match.
- [x] Document patch, minor, and major classification in agent and contributor instructions.
  Structural checks set only a lower bound; maintainers decide semantic behavior at merge.

- [x] Keep two independent API checks: generated declarations must equal the reviewed Git baseline,
  while the current surface must remain legal relative to the latest released surface. Updating the
  review baseline must never erase release history.
- [x] Read the latest released TypeScript and Rust reports from Git tags. Use v0.4.0 as the first
  governed baseline because older tags contain no reports. Keep routine checks usable before that
  tag exists. On a tagged commit, treat that tag as current and compare its predecessor. Do not
  create another maintained snapshot.
- [x] Record deprecation state in both language reports using compiler-derived structure. Reject
  removal unless the item was deprecated in a published release and the current version advances to
  the next major, or the next minor while the major is zero.
- [x] Reuse one compatibility engine in routine CI and release reporting. Keep reviewed-baseline
  equality, predecessor compatibility, changelog classification, and the merge decision as distinct
  evidence; none substitutes for another.
- [x] Keep package metadata in `package.json` and Cargo manifests. Validate the exact cleaned npm
  archive through `publish-clean.validateArtifact`; compare retained package surfaces between
  releases without copying manifest values into API Markdown.
- [x] Validate the exact `.crate` produced by `cargo package`: one canonical root, correct identity,
  intended library targets, required license/readme/source metadata, no foreign or compiled payloads,
  and no build-machine paths. Then execute tests and docs from the extracted archive.
- [x] Mutation-test the owning failures: unapproved additions, non-deprecated removal, same-cycle
  deprecate-and-remove, legal later removal, raised runtime/compiler floor, changed entrypoint,
  malformed archive root, build script/binary payload, and machine-path leak. Retain only cases that
  fail when their intended guard is removed.
- [x] Run every fast local check from the commit hook; check the reviewed baseline first for fast public-API feedback. Keep the complete matrix in routine CI.
  Keep exact archive execution in artifact preparation, and keep every routine lane inside its
  existing latency ceiling.
- [x] Re-run the complete local gate and inspect both produced archives directly. Reconcile the final
  diff against README guarantees, `docs/cross-language.md`, this release policy, and every remaining
  roadmap item before closure.

### Adversarial audit of completed local work

Audit the final change from `b5f72bb` (published 0.3.0) through `905b918`, then verify each repair against the same consumer contracts. Earlier completion marks are claims to inspect, not acceptance evidence. This audit requires local repairs, no subagents, and no remote writes.

Work one area at a time, ordered by failure consequences; add discovered defects under their owning item before fixing them. Close items only with concrete source and execution evidence. Keep remote holds and the separate dependency follow-up intact.

- [x] Authority and scope: reconcile the complete changed-file inventory, approved public changes, retained contracts, prior roadmap tasks, and unfinished work. The total diff from `b5f72bb` is reconciled against README and the four durable design owners; packaged API baselines match the approved surface, held remote work remains open, and no unrelated repository is touched.
- [x] Release integrity: trace credential separation, tag/version/changelog binding, archive identity, publication recovery, notes/assets, and finalization; exercise failures without remote writes. Failure-path regressions, `actionlint`, archive consumers, and the complete local gate pass; credential-bearing jobs and hosted retry behavior remain unexecuted.
  - [x] Bind candidate tags to HEAD and require annotation in shared preflight. The lightweight-tag regression failed before the repair; lightweight and wrong-commit rejection, valid annotated tags, and existing process fixtures pass after it. Complete `bun run check` passes; release CI remains unexecuted.
  - [x] Read candidate and comparison APIs from hash-verified retained archives; measure linked Rust from the retained crate using the repository toolchain. A real report succeeds with unusable checkout Rust; restoring the checkout read fails on that exact manifest. Shared integrity regressions cover modified bytes and unsupported digests.
  - [x] Bind archive versions and source commits to the selected tags. npm archives must carry the selected name and version; crate archives must carry the selected version and Cargo VCS commit. Both reject paths outside their one expected root before extraction.
    - [x] Bind report and finalization inputs to the checked package, version, annotated tag, and commit; bind final notes byte-for-byte to the changelog before remote access.
  - [x] Verify full retry behavior preserves inputs across preparation reruns.
    - [x] Reuse retained local inputs without re-querying registries; reject changed package/commit identity and candidate or historical bytes. A real-Git/local-registry regression exposed repeated reads before the repair; retained-input and process checks pass afterward.
    - [x] Refuse to regenerate lost comparison inputs after either registry contains the candidate; the retry regression covers this first-publication transition.
    - [x] Restore retained evidence on fresh CI preparation attempts. Preparation first reads the current run for one non-expired evidence artifact, restores it when present, and skips every generator and uploader; malformed or duplicate retained state fails closed. `actionlint` and complete `bun run check` pass; a hosted retry remains unexecuted.
    - [x] Preserve private-repository checkout authority when granting artifact reads. Job-level permissions now name both `actions: read` and `contents: read`; `actionlint` and the complete local gate pass.
  - [x] Read back final GitHub state instead of trusting the mutation response. Local transport cases expose retained draft state, lost notes, and a missing archive after a successful acknowledgement; the repaired finalizer rejects them. Complete `bun run check` passes; no remote finalization was attempted.
- [x] Version compatibility: challenge Git predecessor selection, SemVer ordering, prereleases/build metadata, collision collapse, missing registry history, and minimum-version enforcement.
  - [x] Correct collision fallback to skip the entire previous release line; three cases failed before the fix and pass in `scripts/release-history.test.ts`; complete `bun run check` passes.
  - [x] Preserve complete TypeScript declarations, overload order and multiplicity, and Rust feature-selection ownership in API comparisons; regression cases and complete `bun run check` pass.
  - [x] Prevent hyphens in build metadata from bypassing stable compatibility; both affected checks have passing regressions and complete `bun run check` passes.
  - [x] Keep SemVer core comparisons exact beyond JavaScript's safe-integer range. Adjacent large majors failed both predecessor selection and minimum-bump regressions before the repair; release tooling now uses `bigint` for those comparisons.
  - [x] Inspect stable-release checks when prereleases intervene and breaking Rust additions.
    - [x] Run pinned `cargo-semver-checks` against both retained crate feature surfaces. Required public fields, required trait methods, and exhaustive enum variants fail the fixture before release-level calculation; unchanged APIs pass. The readable `cargo-public-api` diff remains separate.
    - [x] Preserve the approved two comparisons when a stable release follows a prerelease: immediate prior release and prior release line. A previous stable release in the same line was never an approved third comparison; adding it would expand the HLD rather than repair its implementation.
- [x] API evidence: built TypeScript declarations and current Rust sources drive Git baselines; retained registry archives drive release comparison. Structural mutation fixtures cover declaration ownership and breaking Rust additions.
- [x] Distribution: cleaned-archive checks cover export-condition order, declaration/runtime graphs, maps, forbidden dependencies, native files, and unreferenced modules. Packed Node, Bun, Deno, and Chromium consumers pass `artifact:web`.
- [x] UUID and alphabet contracts: shared source and packed-consumer cases cover exact lengths, canonical padding/tails, all UUID variants, timestamp bounds, plain byte ownership, buffer ranges, and failure atomicity in Node, Bun, Deno, Chromium, Rust, and WASM.
  - [x] Move `isUuidSlugError` prototype inspection inside its catch boundary; revoked-proxy and throwing-prototype probes both failed before the fix. Their shared packed-consumer regressions pass in `bun run check` and `bun run artifact:web` (Node, Bun, Deno, Chromium).
- [x] Masking and migration: retained independent vectors and producer fixtures cover frozen constants, seed capture, sync/async parity, cancellation, sentinels, caller key order, collision refusal, aliases, and the complete accepted encoder output set across TypeScript and Rust.
- [x] Runtime capabilities: portable and native entropy paths, missing/throwing optional APIs, causes, buffer ownership, and capability-selected adapters execute in the supported Node matrix and current Bun/Deno/browser lanes; local outcomes are recorded below and hosted lanes remain unexecuted.
  - [x] Repair Bun backfilling by leaving native explicit-time hooks absent. The shared keyless/codec string and byte regression failed before the fix and passes on Bun 1.4.1/1.4.2; `bun run check` and packed Node/Bun/Deno/Chromium checks pass. Untimestamped native delegation remains.
  - [x] Generate CI coverage from published Node versions and the package floor, preserving newest Node; wire latest Bun/Deno to ordinary and shared-contract checks. Local runtime executions, wrong-engine/mismatched-outcome controls, adapter resolution, and complete `bun run check` pass. Remote CI execution remains unverified.
    - [x] Run shared contracts and consumer calls on Node 20.0.0 plus latest releases of majors 20–26. Run the ordinary suite on Node 20/22/24/25/26 and latest Bun/Deno; Node 20.0/21/23 use runner-independent contracts because the installed tooling excludes those versions. These are local executions, not CI results.
- [x] Rust implementation: source, manifests, public API, errors, feature selections, native/WASM/32-bit boundaries, dependency features, bridge panic containment, and filesystem caller example are covered by the build matrix below and the complete gate.
  - [x] Apply the clarified build coverage requirement: enumerate every build type and supported target, cover their combinations in CI, and execute every locally runnable combination; declare compile-only and unexecuted combinations individually.
    - [x] Cover debug and release profiles, product libraries, development `rlib`/`cdylib` bridges, examples, tests, doctests, and benchmark compilation; derive target kinds and features from Cargo metadata.
    - [x] Exercise every distinct supported feature selection without allowing workspace feature unification to hide product failures; native runners execute their host rows and cross-target rows compile all product targets.
    - [x] Cover Linux/macOS/Windows x86-64 and Arm64, Linux i686/ARMv7, and browser WASM; native and browser rows execute, while i686 and ARMv7 remain explicitly compile-only.
    - [x] Record the local host/toolchain and per-combination outcomes below; remote CI rows remain configured but unexecuted in this local audit.
    - [x] Execute product tests/doctests and compile benchmarks for each distinct feature selection in debug/release on macOS Arm64; native Bun FFI and Node N-API each pass 28,426 shared observations per profile. Both browser WASM profiles pass secure/failed entropy and cancellation cases. The workflow's i686/ARMv7 all-target checks pass locally for both profiles and default/minimal/all features; those are compile-only results.
- [x] Cross-language verification: the development bridges contain panics at their foreign boundaries; shared independent fixtures reach the built Bun FFI, Node N-API, and browser WASM implementations, with per-capability parity diagnostics and range/ownership cases.
- [x] Performance and resources: matched sequential probes cover latency, allocations, entropy draws, tree-shaking, native startup, linked native/WASM size, and cancellation settlement. The complete local lane stays below its ceiling; hosted headroom is unmeasured rather than inferred.
- [x] Developer feedback: routine verification runs formatting, type-aware lint, typecheck, Vitest, Bun, Rust profiles/features/targets, API/artifact checks, and resource gates without duplicate version-test invocation; failure diagnostics and cleanup paths have targeted regressions.
  - [x] Separate pure release compatibility classification from archive/build orchestration at the responsibility seam; the orchestrator is below the hand-written split tripwire and existing regressions target the extracted module directly.
  - [x] Evaluate direct Bun replacement on the same ordinary suite: four cases need unsupported Vitest lifecycle APIs. Retain Vitest and run the unchanged suite in actual Bun/Deno workers with matching adapters; direct runner replacement is not cleared.
  - [x] Wire every `scripts/*.test.ts` regression into routine verification and remove the duplicate version-test invocation; complete `bun run check` executes them and passes.
- [x] Documentation and consumer experience: README, design, security, cross-language, release, benchmark, changelog, licenses, examples, and project guidance are reconciled against the approved surface and packed behavior; stale removed-helper references and private/transient names are absent.
- [x] Final reconciliation: the repaired total diff passes `bun run check`, both workflow files pass `actionlint`, packed Node/Bun/Deno/Chromium consumers pass `artifact:web`, and `git diff --check` is clean. Hosted CI and remote publication/finalization are explicitly unverified; all verified local repairs are committed.

### Remote-write hold

These entries are inventory, not executable tasks. No agent may prepare, propose, ask about, or
start one unless a maintainer explicitly requests that exact operation. Remote reads remain allowed.

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
