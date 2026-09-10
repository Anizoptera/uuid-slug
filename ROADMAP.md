# Roadmap

Keep only unfinished work here; durable contracts and decisions belong in their owning documentation.

## TypeScript public interface audit

Make validated values hard to forge while keeping ordinary calls simple, preserving every issued identifier, and charging no new runtime work to successful hot paths.

- [x] Compare more than twenty live interface families before each selected change, including
  alternatives across validation, ownership, injection, migration, configuration, and naming.
- [x] Make UUID and slug brands strict while preserving inferred ordinary generation, parsing,
  guarding, conversion, sentinel configuration, and caller-buffer use.
- [x] Give owned UUID bytes their versioned brands, preserve supplied buffer subtypes, and reject an
  offset without a destination at compile time.
- [x] Let guards narrow unbounded external values and map malformed or throwing injected byte
  sources into the documented error language in Node and Bun.
- [x] Make migration reader selectors match the formats enabled by their construction options.
  - [x] Keep the runtime migration engine broad so untyped calls still receive package errors.
  - [x] Narrow literal codec options without adding runtime work or new public concepts.
  - [x] Prove omitted, false, true, and dynamic boolean options through the packed declaration.
  - [x] Regenerate and review the TypeScript interface baseline.
  - [x] Make standalone typechecking refresh self-referenced declarations while built pipelines
    reuse their existing build.
  - [x] Run the complete repository check before committing the migration slice.
- [ ] Audit the remaining interface families and change only candidates that reduce caller burden or
  make a false promise impossible.
  - [ ] Decide whether the entropy predicate should be removed, folded into validation, or renamed to
    describe only its all-zero and all-one random-bit rejection.
  - [ ] Evaluate the positional `formatUuidSlug(bytes, offset, alphabet)` interface against overload,
    options-object, named-operation, and removal families without slowing the hot path.
  - [ ] Recheck generator injection, freshness, schema construction, codec naming, sentinels, errors,
    defaults, exports, and tree-shaken keyless paths against documented consumer jobs.
  - [ ] Update npm, Cargo, and lockfile development versions together if the final consumer effect
    requires a different pre-1.0 release target.
- [ ] Close the audit with package-level evidence.
  - [ ] Verify declarations and packed consumers with the TypeScript floor and current compiler.
  - [ ] Run Node, Bun, Deno, browser, Rust-parity, artifact, and performance gates.
  - [ ] Pair every retained public part with a documented consumer job and independent evidence.
  - [ ] Adversarially audit the complete diff and all governing instructions.
  - [ ] Remove this completed audit section, commit the closure, and leave the worktree clean.

## Remote-write hold

These entries are inventory, not executable tasks. Do not start or ask about one unless a maintainer explicitly requests that exact operation.

- [ ] **HOLD:** Push local commits to the remote repository.
- [ ] **HOLD:** Push the release tag to the remote repository.
- [ ] **HOLD:** Publish the npm package.
- [ ] **HOLD:** Publish the Rust crate.
- [ ] **HOLD:** Create the draft GitHub release.
- [ ] **HOLD:** Update GitHub release notes or assets.
- [ ] **HOLD:** Finalize the GitHub release.
- [ ] **HOLD:** Change branch protection.
- [ ] **HOLD:** Change any other remote repository setting.

## Dependency follow-up

- [ ] Update git-cliff to registry version 2.14.1 or later when available, verify changelog generation, and retain the registry installer. Updating publish-clean requires separate repository authorization.
