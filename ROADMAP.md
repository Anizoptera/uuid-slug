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

- [ ] Compare the complete `6a01c48..HEAD` phase diff with its roadmap and public-contract owners.
- [ ] Account for every changed, moved, added, and deleted source line and comment against the base tree.
- [ ] Compare root and subpath runtime exports, type exports, declaration comments, package conditions, and targets against the base package.
- [ ] Compare every moved implementation with its base bytes and prove shared helpers were neither duplicated nor lost.
- [ ] Run base and current packed consumers for every unchanged API operation and compare observable results.
- [ ] Falsify tree shaking for each root use case across every retained optimizer and inspect unexpected retained code.
- [ ] Falsify focused subpaths through direct ESM loading, masking exclusion, combined v4/v7 use, and slug-only use.
- [ ] Inspect tests, scripts, dependencies, docs, and comments for redundant proof, stale claims, orphaned files, and needless public surface.
- [ ] Run TypeScript 7, the TypeScript 5.7 consumer floor, Node, Bun, package validation, and Rust parity gates.
- [ ] Fix each material defect behind its smallest discriminating reproducer; remove audit work that adds no lasting protection.
- [ ] Re-read the final diff, close every roadmap item with evidence, run the complete gate, and commit only audited changes.
