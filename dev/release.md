# Release integrity and recovery

A release tag publishes both verified packages by default, may select only npm or only the Rust crate, and becomes final after every selected destination exposes its exact bytes.

Agents prepare releases only. Creating a release version or tag, publishing, and finalizing require the maintainer's final explicit authorization for the exact operation. A preparation request, approved plan, credentials or passing checks is not release authorization.

## Comparison releases

Git release tags are the history authority. Existing lightweight tags remain valid history; new releases use annotated tags. Exclude the candidate tag on retries, then select:

1. the highest version below the candidate; and
2. the newest lower minor line while the major is zero, or the newest lower major line after 1.0.

The comparisons must be distinct. If both rules select the same version, walk back to the next older release line. If none exists, report one comparison instead of repeating it. A first publication has no predecessor.

npm and crates.io provide the selected release bytes; they do not select history. A registry with no package history is a first publication and has no predecessor comparison. Once that registry has a published version, a missing selected version, outage, unreadable metadata, or disagreement between the tag and published artifact makes the comparison unavailable and stops publication. Retain selected versions and registry integrity in the release inputs so a retry cannot silently change its comparison basis.

On retry, verify and reuse the retained inputs, including the original package selection, without selecting history again. Never narrow a joint release after one registry fails. Missing original inputs or package selection require restoring that evidence before proceeding; do not infer intent from which registry already has the version. Tag pushes initially select both packages unless `RELEASE_PACKAGES_ON_TAG` is `npm` or `crate`; manual dispatch initially selects `both`, `npm`, or `crate`. Retries must retain that selection, tag, version, history and verified archives.

## Evidence and notes

Write changelog entries for the package consumer, comparing the final release with that package's latest published version rather than intermediate commits.

Before editing notes, establish each selected package's published baseline from its registry's complete package history and matching source or artifact. A shared Git tag does not prove both packages were published, and an absent candidate version does not prove the package has no history. Treat a first publication as new capabilities, never an upgrade from an unpublished API; a failed registry request does not prove there was no publication.

For each entry, ask: what can the consumer now do, what changed from the published version, why does it matter, and what action or limit must they know? Keep only supported answers. Name the package and use short, concrete sentences. Preserve useful capabilities, reasons and boundaries when shortening; never invent a guarantee or migration.

Update the existing entry when an unreleased feature changes. Describe its final behavior once; remove superseded wording and fixes to versions no consumer received. Exclude development, tests, proofs, tooling and internal refactors. Mention documentation only when it changes what callers must know or do. Check the final entries against the published baseline and current API, not commit titles; leave published sections unchanged unless correcting a named factual error. These are semantic review steps, not targets for prose-matching tests.

Prepare releases from correctness, compatibility, package and recovery evidence. Missing performance comparisons do not block release preparation or authorize optimization; follow [root agent guidance](../AGENTS.md#work-scope) and retain the existing required regression checks.

Prepare both archives once without publishing credentials, even when publishing only one. Verify version and tag agreement, packaged APIs, shared behavior, language parity, minimum compatible version, archive integrity, and licenses before any publication step. Publication must reuse the verified archives; if a registry client must repack, require byte identity with the verified artifact.

For the crate, build API documentation from the extracted archive with `RUSTUP_TOOLCHAIN=nightly RUSTDOCFLAGS='--cfg docsrs -D warnings'` and `cargo doc --all-features --no-deps --locked`, using the repository's Rust toolchain wrapper. This exercises the cfg-derived feature badges used by docs.rs. Run its doctests with default features, without default features and with all features; otherwise cfg-gated interoperability examples can pass without executing their bodies. Check the rendered installation, feature requirements and linked public items; hosted docs.rs must also be checked after publication.

Require the candidate's annotated tag to resolve to the checked-out commit before preparation or publication. Preserve tag objects in release checkouts; a matching version string cannot identify the source that verification exercised. This does not change historical lightweight-tag selection.

Release notes contain the committed `CHANGELOG.md` section, with one generated API diff appended at the end of `### Breaking changes`, `### Added` and `### Changed`, followed by package sizes and links to the published package and the commit history since the previous tag. The changelog holds prose only: callers need the upgrade explained, and a hand-written diff beside the generated one splits the same change in two places. A missing `### Added` or `### Changed` heading is created; a missing `### Breaking changes` heading stops the release while the API breaks callers, because only prose can say what to change.

The diff shows each changed declaration as one group: its old lines directly above its new ones, under an `@@ name @@` header. Write each rename in the prose as `` `old` → `new` ``, or as two lists of the same length (`` `A` and `B` → `X` and `Y` ``); the diff then shows the old and new declarations as one `@@ old → new @@` group under Breaking changes instead of a removal there and an addition under Added. Renames are never guessed: name and signature similarity paired two in five 0.4.0 renames wrongly, and a wrong pair in published notes misleads callers.

Breaking means old caller code stops compiling. TypeScript compatibility comes from the compiler: each export reaching a changed declaration, including unexported types it uses, must accept old calls (assignability plus argument count) under every supported compiler; a change any one of them rejects is breaking. Text comparison cannot decide this, and TypeScript never relates deferred conditional types across two files, so unchanged exports are compatible by definition and only changed ones are checked; a false failure can only call a change breaking. Rust compatibility comes from cargo-semver-checks. The local API gate checks Rust report drift, not publication history: an npm tag can contain an unpublished Rust implementation. Check Rust removal/deprecation policy and version compatibility against registry-verified crate archives during release preparation. A first crate publication has no Rust compatibility baseline; do not invent one from npm's tags or add registry I/O to commit hooks. Keep complete API comparisons internal to compatibility checks. Do not publish declaration inventories, private helper types, repeated older API comparisons, or API attachments. Include only the packages selected for publication; keep unpublished implementations and their reports out of consumer notes. Report npm and crate compressed sizes separately, in binary units (1 KB is 1024 bytes), and keep matched linked native and WebAssembly caller probes out of consumer notes. State absolute changes; state percentages only for nonzero denominators.

Version the full consumer effect. A fix with no new public behavior is patch. Backward-compatible public behavior is minor. Incompatible behavior is major, or minor before 1.0. Structural API checks provide a lower bound; the committer must classify behavior that declarations cannot expose.

After each public release, set the dev version to the next patch. Compare all unreleased changes with that release. If they exceed a patch, set the next minor. If they are incompatible, set the next major, or the next minor before 1.0. Changes to an API that never shipped do not force another bump. Before the first release, keep the planned version unless the maintainer changes it.

### Set the development version

Run `bun run version:set <X.Y.Z-dev>` when the planned release version changes. The command updates `package.json`, `rust/Cargo.toml`, and both Cargo lockfiles, then checks workspace version agreement. It restores all version files if an update fails. A dev bump NEVER runs `bun run release` or creates a release commit or tag. Release tags and published manifests never use the `-dev` suffix.

The API check (`bun run api:check:built`, run by the commit hook and `bun run check`) requires both generated reports to match their reviewed baselines and checks npm compatibility against the latest release tag. Rust publication checks use the verified archives described above. Updating a reviewed baseline cannot erase publication history.

On the tagged commit, the tag is the current release, so the check compares it with the prior release and enforces the structural minimum version.

Use v0.4.0 as the first release-history baseline because older tags do not contain compiler-derived API reports. Before 1.0, breaking changes require a new minor release; from 1.0, they require a new major release. Document consumer migration, including features that become opt-in. Deprecate an API in one published release before removing it entirely; moving an existing API behind an opt-in feature is a breaking availability change, not complete removal. Changing version numbers does not waive issued-ID compatibility.

Package manifests are the only owners of package metadata. Routine checks compare their public settings with the latest release. `publish-clean` validates the exact npm tarball. The Cargo release path validates the exact `.crate` after `cargo package`. Declaration reports contain no manifest copy.

## Publication and recovery

Review development advisories against their actual inputs and the packaged dependency graph. The Rollup resolver's `deepmerge` call copies its literal defaults during module initialization; caller options use object spread. The [prototype-poisoning advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) therefore concerns development tooling rather than a shipped runtime dependency. Recheck that input path when the resolver changes; do not force an incompatible override or remove an independent bundler check to silence the advisory.

Before tagging, make installation and publication-status text correct for the packages selected for that release. In particular, the first crate release must not leave the npm README claiming that the crate is unpublished; keep that status when the crate is not selected. Review the candidate copy before creating the tag, not after publishing its archives.

Consumer-visible changes accumulate under `## [Unreleased]` as they land. Run `bun run changelog <next>` to rename that section to the release, read it as a cold consumer, and commit it before `bun run release <next>`; versioning requires a clean tree. The release commit and annotated tag message are the version number only. Do not encode publication selection in tags or add a release bot. The release command must reject a tag that differs from the manifest or lacks a nonempty changelog section. Publication keeps that section's prose unchanged and adds the generated parts described in §Evidence and notes. Use the release command to check the stable manifest before Git creates its tag; ordinary untagged work must use `-dev`. After pnpm creates the tag, its `postversion` script runs `bun run build && bun scripts/release-prepare.ts` on that local tag: the tag workflow's preparation (archives, history comparisons, report, notes) without publishing. Read `release-artifacts/notes.md`, the exact release body, before pushing. It needs `cargo-semver-checks`, `cargo-public-api` and nightly Rust locally; the report names the required versions.

Keep `@anizoptera/publish-clean` as a registry dependency and publication in `.github/workflows/release.yml`, whose filename is bound to trusted publishing. Verification of the tagged commit runs without publication credentials; only a dependent publication job receives them. Validate the cleaned archive, publish with public access and provenance, and derive the npm dist-tag from the Git tag: prereleases use `next`; stable releases use `latest`.

For a joint release, publish the crate and verify its registry checksum before publishing npm. A failed crate job must hold npm; an npm-only selection must still run without the skipped crate job. Keep both packages selected on retries.

The first crates.io upload requires an API token because [trusted publishing](https://crates.io/docs/trusted-publishing) can be configured only after the crate exists. Complete the following setup when publication is authorized; do not put credentials in chat, source files or command arguments.

1. Sign in to crates.io with the GitHub account that will own the crate. Add and verify its email in [account settings](https://crates.io/settings/profile), as required by the [Cargo publishing guide](https://doc.rust-lang.org/cargo/reference/publishing.html).
2. Create a token in [API token settings](https://crates.io/settings/tokens) with `publish-new`, restricted to `uuid-slug`, and an expiration covering the authorized first publication. The [registry API schema](https://crates.io/api/openapi.json) defines endpoint scopes, crate-name scopes and expiration. Save the token directly as the GitHub repository Actions secret `CRATES_IO_BOOTSTRAP_TOKEN`; this workflow does not need local `cargo login` credentials.
3. Publish through the authorized tagged workflow with the intended package selection. The crate job prefers the bootstrap secret when present. Verify the uploaded crate's checksum against the retained archive before configuring trusted publishing.
4. In the crate's Settings → Trusted Publishing, add GitHub repository owner `Anizoptera`, repository name `uuid-slug` and workflow filename `release.yml`. Leave the environment field empty: the `publish-crate` job has no GitHub environment. Read back those fields before deleting the repository bootstrap secret and revoking its token on crates.io.
5. Verify the trusted-publishing token exchange on the next authorized unpublished version. Re-running an already published version skips authentication, so a green retry cannot prove this setup works. Do not create another release solely to test credentials.

If the crate job reports "No Trusted Publishing config found", supply the first-publication credential or repair the existing crate's trusted-publishing configuration, as applicable. Retry the same tag with its original package selection and retained evidence; do not switch a joint release to `packages=npm` to bypass the failed crate publication. Keep the GitHub release draft until every originally selected destination is verified.

Check publication against the registry itself (`curl https://registry.npmjs.org/@anizoptera%2Fuuid-slug`, `https://crates.io/api/v1/crates/uuid-slug`): `bun pm view` can answer from a stale cache and report a published version as missing.

If an upload returns before its registry readback is visible, recheck the registry and verify its checksum against the original CI evidence before retrying failed jobs with `gh run rerun RUN_ID --failed`. Download that run's archives with `gh run download RUN_ID --name release-evidence --dir DIR`; a local repack is not the publication authority, even when its file contents match. Keep the published tag fixed and both selected packages in recovery.

Create or update one draft GitHub release. Publish missing npm or crates.io artifacts only after checking whether that exact version already exists. Existing versions must match the retained bytes; never overwrite or attest different content. Attach only registry-matching archives and reproducible notes.

Keep the GitHub release as a draft until every selected registry and attached archive, plus the generated notes, are verified. Verify each attachment by GitHub's SHA-256 digest, and create provenance before making the draft public. A rerun repairs only missing publication, attachment, or note work. Finalize the release once every required result is observable and matches the retained release inputs.

Write retained archives only through `--tarball-out DIR` into a caller-owned directory, then remove that directory. Never parse an archive path from human-facing output.

Every remote write requires explicit maintainer authorization for the exact operation.

### Repair an unpushed or unpublished tag

While no registry has the version, fix and move the tag instead of bumping it:

1. Commit each fix with `UUID_SLUG_RELEASE_VERSION=<next>` set: HEAD keeps the stable version but is no longer tagged, and the hook otherwise demands `-dev`.
2. Move the tag: `git tag -f -s -m <next> v<next> HEAD`.
3. Rerun `bun run build && bun scripts/release-prepare.ts` until it passes, and read `release-artifacts/notes.md`.
4. Push the branch, then `git push -f origin v<next>`; moving a pushed tag needs the maintainer's authorization.

Once any registry has the version, never move its tag: release the next patch.
