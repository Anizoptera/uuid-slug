# Packaged API checks

Run `bun run api:check` before committing. It checks the reviewed files and compatibility with the
latest governed release. On a tagged commit, that tag is the current release and the check uses its
predecessor. Run `bun run api:update` when a proposed public change alters either report, then include
the generated diff in the pull request.

The reviewed files expose proposed changes. Git tags preserve release history. These controls are
separate so updating a reviewed file cannot bypass version or deprecation rules.

Install the pinned Rust extractor with `cargo install cargo-public-api --version 0.52.0 --locked`, then activate the repository hook once with `bun run hooks:install`.

The TypeScript baseline is a declaration file containing everything reachable from the built public entry, including overloads and strict brands. The Rust baseline records separate all-feature and no-default-feature surfaces because Cargo features can change the public API. Blanket implementations are omitted because they obscure the crate-owned surface; derived and auto-trait implementations remain visible.

Keep public types that name a documented value or distinction consumers use in storage, parameters, return values, narrowing, or configuration. A package signature need not mention the type. Remove it only when no documented value or operation needs its distinction. `__test__/consumer-types.fixture.ts` compiles through the packed TypeScript declaration entry. Rust's generated baselines cover its feature surfaces; retained-release checks compile a linked consumer against the extracted crate.

These declaration baselines do not duplicate package manifests. Artifact checks verify the packed npm manifest, Cargo checks verify the crate graph and feature selections, release checks compare retained package entry metadata, and cargo-semver-checks evaluates Rust compatibility. Contract tests own behavior, target builds own supported compilation, and maintainer rulings own changes to the public contract. Deprecation annotations stay on their declarations; other comments are excluded so documentation edits do not masquerade as API changes.
