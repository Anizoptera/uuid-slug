# Packaged API checks

Run `bun run api:check` to check both reviewed reports and npm compatibility with the latest governed release. On a tagged commit, that tag is the current release and the npm check uses its predecessor. Run `bun run api:update` when a proposed public change alters either report, then include the generated diff in the pull request.

Reviewed files show proposed changes. Rust publication compatibility and deprecation checks run during release preparation against registry-verified crate archives; an npm tag containing Rust source does not prove that crate was published. See [release comparison evidence](../dev/release.md#evidence-and-notes). Updating a reviewed file does not bypass version or deprecation rules.

Install the pinned Rust extractor with `cargo install cargo-public-api --version 0.52.0 --locked`, then activate the repository hook once with `bun run hooks:install`.

The TypeScript baseline is a declaration file containing everything reachable from the built public entry, including overloads and strict brands. The Rust baseline records separate all-feature and no-default-feature surfaces because Cargo features can change the public API. Blanket implementations are omitted because they obscure the crate-owned surface; derived and auto-trait implementations remain visible.

Consumer checks compile packed TypeScript declarations and retained Rust APIs; signature comparisons alone do not check supported calls. See the [interface proof requirements](../dev/interface.md#proof).

The reports retain deprecation annotations and omit other comments, so documentation edits do not appear as API changes. Package metadata and runtime behavior have separate checks.
