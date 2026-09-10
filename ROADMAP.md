# Roadmap

Keep only unfinished work here; durable contracts and decisions belong in their owning documentation.

## Error interface audit

Distinguish public failures only when the distinction changes a caller's safe recovery, while preserving simple `Error | T` handling and cross-realm classification.

- [ ] Map the exact failure sets and recovery actions of every public operation.
- [ ] Compare at least twenty distinct error-interface shapes and combinations, then compile-probe the strongest candidates through packed consumer declarations.
- [ ] Implement only distinctions that improve inference or make misuse unrepresentable without adding runtime work or redundant public concepts.
- [ ] Verify Node, Bun, packed TypeScript floor/current consumers, API evolution, resources, and cross-language consequences.
- [ ] Adversarially pair the selected contract with evidence, remove this completed section, commit closure, and leave the worktree clean.

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
