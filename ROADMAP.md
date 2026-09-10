# Roadmap

Keep only unfinished work here; durable contracts and decisions belong in their owning documentation.

## TypeScript public interface audit

Make validated values hard to forge while keeping ordinary calls simple, preserving every issued identifier, and charging no new runtime work to successful hot paths.

- [ ] Compare at least twenty live interface families across naming, failure handling, validation,
  byte ownership, dependency injection, migration, configuration, and extension seams before
  selecting any public change.
- [ ] Make UUID and slug brands strict without requiring casts in ordinary generation, parsing,
  guarding, conversion, sentinel configuration, or caller-buffer use.
- [ ] Give owned 16-byte results precise inferred types, preserve the exact supplied buffer subtype,
  and make an offset without a destination unrepresentable.
- [ ] Let guards validate unbounded external values directly and keep runtime failures inside the
  package's documented error language.
- [ ] Remove or rename public concepts whose names promise more than their implementation proves,
  while retaining every documented consumer capability.
- [ ] Re-audit migration configuration, codec naming, schema construction, defaults, sentinels,
  errors, and tree-shaken keyless paths; change them only when a candidate strictly improves the
  ruled consumer outcome.
- [ ] Verify generated declarations and packed consumers with the TypeScript floor and current
  compiler, then run Node, Bun, Deno, browser, Rust-parity, artifact, and performance gates.
- [ ] Pair every retained public part with a documented consumer job and independent evidence,
  remove this completed section, commit the closure, and leave the worktree clean.

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
