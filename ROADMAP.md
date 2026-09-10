# Roadmap

Keep only unfinished work here; durable contracts and decisions belong in their owning documentation.

## Public interface doctrine and adversarial re-audit

Make ordinary TypeScript calls obvious and cheap, make misuse unrepresentable or locally actionable,
and keep every consumer promise and interface-design priority in one durable owner.

- [ ] Establish one durable public-interface doctrine covering worth, shape, truth, guard, compatibility,
  proof, minimal work, type inference, capability selection, errors, and cross-runtime degradation.
- [ ] Point agents and contributors to that owner without duplicating its rules.
- [ ] Re-audit every public interface family, runtime path, and retained abstraction against consumer jobs,
  considering at least twenty materially different interface shapes and combinations before each change.
- [ ] Remove or deepen anything whose caller burden, runtime work, coupling, or misuse surface exceeds its
  ruled consumer value; preserve issued identifiers and all accepted encoder outputs.
- [ ] Prove selected changes through package declarations, runtime consumers, failure paths, resource checks,
  and the TypeScript floor and current compiler.
- [ ] Adversarially pair every doctrine rule and consumer promise with implementation and independent evidence,
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
