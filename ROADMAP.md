# TypeScript consumer graph

Make each consumer pay only for UUID generation, plain slugs, or masking that it imports.

- [x] Map UUID conversion, UUIDv4 generation, UUIDv7 generation, plain slugs, and masking to
      independent dependency edges.
- [x] Falsify that UUID text/byte conversion needs alphabet, slug, entropy, sequence, or masking
      modules; keep only dependencies required by canonical UUID parsing and formatting.
- [x] Falsify that UUIDv4 generation needs slug, UUIDv7 sequence, timestamp, or masking modules.
- [x] Falsify that UUIDv7 generation needs slug, UUIDv4, masking, migration, or sentinel modules.
- [x] Falsify that plain-slug conversion needs entropy, generation, masking, migration, or sentinels.
- [x] Verify that root composition preserves every existing export, type, comment, and runtime result.
- [x] Keep UUIDv4 and UUIDv7 entries free of slug code when the imported operation returns UUID
      text or bytes.
- [x] Test one plain-slug entry against root imports and finer slug/version splits; retain only the
      smallest public boundary that materially lowers consumer work.
- [x] Compare plain-slug conversion alone, combined slug conversion and generation, `/slug/v4`,
      `/slug/v7`, and caller composition from UUID bytes.
- [x] Reject versioned slug subpaths if their byte or module savings do not repay two extra public
      paths and their permanent compatibility cost.
- [x] Compare broad version entries with generation-only entries; reject broad barrels when direct
      ESM re-exports load capabilities the selected operation does not use.
- [x] Measure each job from the packed root and candidate subpath with Bun, Rolldown, esbuild,
      webpack, and Rspack under equivalent browser production settings.
- [x] Record raw, gzip, Brotli, and Zstandard bytes for every emitted consumer chunk.
- [x] Execute each optimized fixture and reject any optimizer or entry whose behavior differs.
- [x] Measure direct-ESM loaded modules separately from optimized bundle bytes.
- [x] Compare root-only, use-case subpaths, finer subpaths, and selectively joined internal modules.
- [x] Remove every entry or module merge that does not reduce material consumer work.
- [x] Preserve native ESM, truthful side-effect metadata, runtime condition order, and zero runtime dependencies.
- [x] Verify every retained subpath through packed Node, Bun, the project's TypeScript 7 compiler,
      the separate TypeScript 5.7 consumer floor, publint, and ATTW.
- [x] Replace the single-bundler tree-shaking proof with the smallest cross-bundler proof that can
      expose masking leakage, lost side effects, or semantic disagreement.
- [x] Update README usage, public API ownership, and agent guidance only for proven boundaries.
- [x] Read every moved implementation and comment against its original source before removal.
- [x] Prove a named root import removes unrelated code with Bun, esbuild, Parcel, Rollup, tsdown's
      Rolldown engine, Rspack, and webpack from the packed package.
- [x] Test root imports for UUID conversion, plain-slug conversion, UUIDv4 generation, UUIDv7
      generation, direct UUIDv4 slugs, direct UUIDv7 slugs, and combined UUIDv4 plus UUIDv7 use.
- [x] Test caller-composed UUIDv4 and UUIDv7 slugs against their one-call root exports.
- [x] Keep masking as the positive control: its root bundle must retain the cipher and schema code.
- [x] Confirm Aponte uses tsdown and Vite on Rolldown, already covered by the Rolldown lane.
- [x] Add Rollup and Parcel as distinct engines; omit Vite because its production engine is Rolldown.
- [x] Require every optimizer's root bundle to execute correctly and exclude the masking witness.
- [x] Run `bun run check`, inspect the final diff and package archive, then commit focused changes.

## Consumer-graph simplification audit

- [x] Map each retained module, public entry, dependency, and consumer-graph check to the distinct failure it prevents.
- [x] Reduce the matrix from 133 bundled cases plus 19 direct loads to 70 root bundles plus 18 direct loads; the removed subpath bundles repeated the root optimizer verdict instead of testing the direct-ESM reason for those paths.
- [x] Keep the facades, direct slug entries, optimizer adapters, and their dev dependencies: each preserves a public boundary, lowers direct loading, or exercises a distinct optimizer family.
- [x] Test every root use case with every optimizer; test focused entries with Node's loader, reject masking imports, and require fewer loaded modules than root.
- [x] Re-run packed consumers, TypeScript 7 and 5.7, all retained optimizers, runtime tests, and the full repository gate.
- [x] Inspect the final diff and packed artifact, then commit the smallest complete simplification.

## Final tree-shaking audit

- [x] Compare the complete `6a01c48..HEAD` phase diff with its roadmap and public-contract owners.
- [x] Account for every changed, moved, added, and deleted source line and comment against the base tree.
- [x] Compare root and subpath runtime exports, type exports, declaration comments, package conditions, and targets against the base package.
- [x] Compare every moved implementation with its base bytes and prove shared helpers were neither duplicated nor lost.
- [x] Run base and current packed consumers for every unchanged API operation and compare observable results.
- [x] Falsify tree shaking for each root use case across every retained optimizer and inspect unexpected retained code.
- [x] Falsify focused subpaths through direct ESM loading, masking exclusion, combined v4/v7 use, and slug-only use.
- [x] Inspect tests, scripts, dependencies, docs, and comments for redundant proof, stale claims, orphaned files, and needless public surface.
- [x] Run TypeScript 7, the TypeScript 5.7 consumer floor, Node, Bun, package validation, and Rust parity gates.
- [x] Fix each material defect behind its smallest discriminating reproducer; remove audit work that adds no lasting protection.
- [x] Re-read the final diff, close every roadmap item with evidence, run the complete gate, and commit only audited changes.

## Verification value audit

- [x] Inventory every test, check, benchmark gate, hook, and CI lane with its runtime cost and owning contract.
- [x] Map each verifier to the material defect it can uniquely detect and the decision its result changes.
- [x] Prove representative high-risk verifiers fail for the intended defect instead of an unrelated error.
- [x] Find duplicate, implementation-restating, always-green, skipped, timing-based, flaky, and unstable-internal checks.
- [x] Compare Node, Bun, compiler, packed-package, optimizer, Rust, benchmark, hook, and CI coverage for gaps and repeated work.
- [x] Audit test layout and naming against runner discovery, import boundaries, developer use, and the requested `__test__` policy.
- [x] Measure isolated tests, routine lanes, the commit hook, and the complete gate; remove or redesign work that misses its feedback loop.
- [x] Audit fixtures, probes, fakes, models, snapshots, randomized inputs, cleanup, diagnostics, and concurrency for false evidence.
- [x] Fix each material defect with the smallest proof that fails before the fix and passes after it.
- [x] Re-read every changed line and comment, run the complete gate, inspect the final diff, and leave no open audit task.

## Verification oracle audit

- [x] Map each routine command to the exact production artifact, defect class, oracle, and overlapping verifier.
- [x] Mutate tree-shaking witnesses independently from retained code and reject any oracle that fails on harmless implementation text.
- [x] Mutate resource and performance expectations and require each gate to fail for its claimed defect.
- [x] Trace packed-artifact checks for repeated builds, tests, installs, and compiler passes that add no independent evidence.
- [x] Inspect every test double and reference implementation for an independently anchored oracle or remove it.
- [x] Measure per-file and per-lane runtime, setup, cleanup, isolation, and parallel behavior; redesign every slow or mode-sensitive verifier.
- [x] Audit every TypeScript test artifact for `__test__` placement, discovery, and non-duplication.
- [x] Fix each material defect behind the smallest discriminating reproducer, then run the complete gate and inspect the final diff.

## Distribution efficiency audit

- [x] Inventory every packed JavaScript, declaration, source map, source file, manifest field, and repeated byte range; map each retained byte class to a consumer need.
- [x] Read the public-contract owners and current tsdown/Rolldown documentation before changing any observable package output or optimizer setting.
- [x] Compare tsdown minification, tree-shaking, unbundling, declaration generation, source-map content, target, platform, and annotation-preservation options with isolated builds.
- [x] Verify `sideEffects` metadata against every shipped module and prove consumer bundlers can remove unused modules without dropping required initialization.
- [x] Inventory pure call candidates, distinguish removable construction from required validation or state changes, and verify emitted `/* @__PURE__ */` annotations survive packaging and downstream minification.
- [x] Measure raw, gzip, Brotli, and source-map bytes by entry and module; detect duplicated implementation, embedded sources, absolute paths, private data, and redundant mappings.
- [x] Inspect generated declarations for duplicated types, private implementation leakage, avoidable imports, stale comments, and differences between source and packed public contracts.
- [x] Falsify the chosen settings with packed consumers across every retained optimizer and execute each output; add only the smallest lasting checks that catch material regressions.
- [x] Re-read every changed line and comment, run the complete repository gate, inspect the final archive and diff, and commit each self-contained correction with a clean tree.

## Distribution maintenance guidance

- [x] Add one root guidance trigger for changes to bundling, minification, source maps, package side effects, or optimizer annotations.
- [x] Document the annotation safety boundary and the tsdown settings that preserve tree shaking, stack traces, and useful source maps.
- [x] Remove duplicated or consumer-irrelevant wording, verify every durable claim against config and artifact checks, run the complete gate, and commit with a clean tree.

## Optimizer annotation audit

- [x] Classify every TypeScript function by observable effects, including internal declarations and hostile runtime inputs.
- [x] Apply the strongest sound annotation and remove any annotation falsified by callbacks, mutation, clocks, entropy, getters, proxy traps, or caller-owned writes.
- [x] Measure discarded calls with Bun and independent consumer bundlers; verify packed annotation preservation and runtime behavior.
- [x] Run the complete gate and inspect the archive and diff.

## Import-time capability audit

- [x] Inventory every source-owned module initializer and classify it as constant construction, capability detection, state allocation, or observable effect.
- [x] Measure which initializers execute for each packed public operation under direct ESM loading and every retained consumer optimizer.
- [x] Compare eager module detection, pure annotated construction, lazy memoization, and capability-specific module boundaries on startup work, hot-path work, bundle bytes, stack quality, and runtime correctness.
- [x] Make only changes that reduce consumer work without weakening capability fallback, instrumentation, security, or tree shaking; add a regression check only for a material defect not already detected.
- [x] Update the owning maintenance guidance, run the complete gate, inspect emitted artifacts, and commit with a clean tree.
