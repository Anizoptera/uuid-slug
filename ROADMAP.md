# Roadmap

Keep only unfinished work here; durable contracts and decisions belong in their owning documentation.

## Whole-interface simplification audit

Make common identifier jobs obvious and misuse-resistant while preserving every issued identifier, accepted encoder output, runtime capability, and caller-owned storage guarantee.

- [ ] Inventory consumer jobs, public names, overloads, defaults, failure modes, runtime work, allocations, and cross-language equivalents from their owning artifacts.
- [ ] For each independent interface axis, compare at least twenty live shapes and combinations, including deletion and composition, before selecting any addition.
- [ ] Measure the actual public path for every performance claim and distinguish wire-format limits from implementation choices.
- [ ] Prove each selected change through the package seam with TypeScript floor/current consumers and matching Node, Bun, browser, Deno, Rust, bridge, artifact, and resource checks where applicable.
- [ ] Keep only parts that satisfy a ruled consumer job; remove superseded tests and explanations rather than layering compatibility concepts.
- [ ] Adversarially pair every promise with independent evidence, preserve required release versions, remove this completed section, commit each coherent slice, and leave the worktree clean.

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
