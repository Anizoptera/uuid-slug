# Roadmap

Keep only unfinished work here; durable contracts and decisions belong in their owning documentation.

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

## Unreleased API audit

- [ ] Remove the benchmark-output compaction unless the audit establishes a consumer or verification requirement for it.
- [ ] Finish the adversarial review of all changes since v0.3.0 and resolve every in-subject defect before delivery.
