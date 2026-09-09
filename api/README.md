# Packaged API checks

Run `bun run api:check` before committing, and regenerate the baselines with `bun run api:update` only after Art approves the consumer-visible change.

Install the pinned Rust extractor with `cargo install cargo-public-api --version 0.52.0 --locked`, then activate the repository hook once with `bun run hooks:install`.

The TypeScript baseline records the package export conditions and the declarations reachable from the built public entry, including overloads and optional brands. The Rust baseline records manifest conditions and public items with all features and without default features; blanket implementations are omitted because they obscure the crate-owned surface, while derived and auto-trait implementations remain visible.

These structural baselines do not prove runtime behavior, semantic compatibility, every target-specific configuration, or approval. Contract tests own behavior, target builds own supported compilation, and Art's ruling owns changes to the public contract. Declaration comments are excluded so documentation edits do not masquerade as API changes.
