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

## Native transport and TypeScript interface audit

Prove each transport and public interface against identical consumer work before changing either design.

- [x] Run one Rust request corpus through every supported Node-API and FFI boundary exposed by the installed Node, Bun and Deno hosts, with nonzero evidence per lane.
- [x] Compare transport correctness, startup, throughput, CPU, memory, boundary operations, safety obligations, and runtime support without treating development bridges as product interfaces.
- [ ] Keep every research adapter on the shared corpus and use measurements to improve it; changing the maintained matrix requires an explicit maintainer decision, not a volatile benchmark snapshot.
- [ ] Ruthlessly audit the TypeScript interface from consumer tasks, error paths, invalid states, defaults, capability degradation, type precision, work performed, and compatibility obligations.
- [ ] Compare at least seven materially different interface shapes and their strongest hybrids, then implement only changes that improve caller leverage without violating frozen identifier contracts.
- [ ] Verify packaged declarations, Node, Bun, Deno, browser, Rust parity, performance budgets, and every changed runtime path; adversarially pair each promise with independent evidence.
