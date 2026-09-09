# Packaged API checks

Run `bun run api:check` before committing, and regenerate the baselines with `bun run api:update` only after Art approves the consumer-visible change.

The reviewed baseline exposes unapproved changes; it is not release history. Routine checks must also compare against the latest released surface so updating this baseline cannot bypass deprecation and versioning rules.

Install the pinned Rust extractor with `cargo install cargo-public-api --version 0.52.0 --locked`, then activate the repository hook once with `bun run hooks:install`.

The TypeScript baseline records declarations reachable from the built public entry, including overloads and optional brands. The Rust baseline records public items with all features and without default features; blanket implementations are omitted because they obscure the crate-owned surface, while derived and auto-trait implementations remain visible.

These declaration baselines do not duplicate package manifests. Artifact checks verify the packed npm manifest, Cargo checks verify the crate graph and feature selections, release checks compare retained package entry metadata, and cargo-semver-checks evaluates Rust compatibility. Contract tests own behavior, target builds own supported compilation, and Art's ruling owns changes to the public contract. Declaration comments are excluded so documentation edits do not masquerade as API changes.
