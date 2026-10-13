# Contributing

Preserve published identifiers and classify every consumer-visible change before committing.

## Setup

Use the repository's pinned tools. Run `bun install`, install the `cargo-public-api` version named in
`api/README.md`, then run `bun run hooks:install`.

## Changes

Read `docs/public-api.md` before changing any public interface or observable behavior.

Keep release preparation focused on correctness, compatibility, packaging and recovery. Standalone
performance experiments require an explicit request for the affected consumer call; a correctness
repair or an old performance gap does not authorize them. Keep existing required regression checks.
Read [work scope](AGENTS.md#work-scope) before proposing an experiment.

The pre-commit hook runs `bun run check`, including public API checks; do not repeat it manually
for the same unchanged tree. It reports how to update an intentional baseline change. Run `bun run api:update`, review both
diffs, and include them in the pull request. Merging is the maintainer decision; no separate
acceptance step exists.

Use one version in `package.json`, `rust/Cargo.toml`, and `rust/Cargo.lock`. Between releases, use
`X.Y.Z-dev`. Run `bun run version:set <X.Y.Z-dev>` instead of editing version files separately.

- Patch: a backward-compatible fix with no new public behavior.
- Minor: new backward-compatible public behavior.
- Major: incompatible public behavior. Before 1.0, use the next minor instead.

Declarations cannot expose every semantic change. Classify changed defaults, errors, accepted
inputs, output meaning, feature behavior, and guarantees from their consumer effect. A passing check
does not approve a public change.

Read `docs/release.md` before changing versions, public API, package metadata, or release tooling.

## Commits

Commit each self-contained, verified change. Keep unrelated work out and name the files explicitly
when staging or committing.

Use a focused Conventional Commit title and a short body explaining a reason, consumer
effect, constraint, or limit that the diff does not show. State facts and exact evidence. Do not add
activity logs, praise, filler, or guessed intent. Keep each message line unwrapped.

Track failed checks with unfinished work; they block final delivery. Fix them before marking work complete.

## Review

A pull request must state the consumer effect, why the change is needed, the public contracts it
touches, and the checks that could have failed. It must include the required matching version in
`package.json`, `rust/Cargo.toml`, and `rust/Cargo.lock`. State untested boundaries and unresolved
decisions. Do not repeat the diff.
