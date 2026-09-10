# Roadmap

Keep only unfinished work here; durable contracts and decisions belong in their owning documentation.

## TypeScript success-path ergonomics

Make expected failures explicit without forcing every success-path consumer to maintain the same
error-unwrapping helper. The public seam must preserve actionable errors-as-values by default,
offer an opt-in throwing path with correct cross-realm recognition, infer the exact success type,
and add no work to callers that do not select it.

- [ ] Add a public success-value helper through a failing consumer type and runtime case first.
- [ ] Replace the repository's private duplicate with the public operation and document both error policies.
- [ ] Verify current and floor declaration inference, Node and Bun behavior, packed consumption, API classification, and the complete repository gate.
- [ ] Adversarially audit the changed interface and remove this section only when every promise has evidence.

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
