# Release integrity and recovery

A release tag publishes both verified packages by default, may select only npm or only the Rust crate, and becomes final after every selected destination exposes its exact bytes.

Agents prepare releases only. Creating a release version or tag, publishing, and finalizing require
the maintainer's final explicit authorization for the exact operation. A preparation request,
approved plan, credentials or passing checks is not release authorization.

## Comparison releases

Git release tags are the history authority. Existing lightweight tags remain valid history; new
releases use annotated tags. Exclude the candidate tag on retries, then select:

1. the highest version below the candidate; and
2. the newest lower minor line while the major is zero, or the newest lower major line after 1.0.

The comparisons must be distinct. If both rules select the same version, walk back to the next older
release line. If none exists, report one comparison instead of repeating it. A first publication has
no predecessor.

npm and crates.io provide the selected release bytes; they do not select history. A registry with no
package history is a first publication and has no predecessor comparison. Once that registry has a
published version, a missing selected version, outage, unreadable metadata, or disagreement between
the tag and published artifact makes the comparison unavailable and stops publication. Retain
selected versions and registry integrity in the release inputs so a retry cannot silently change its
comparison basis.

On retry, verify and reuse the retained inputs without selecting history again. If either registry
already contains the candidate but those inputs are missing, restore the original evidence before
proceeding; the first publication must not become its own new history.
Tag pushes publish both packages unless the repository variable `RELEASE_PACKAGES_ON_TAG` is set to
`npm` or `crate`. Manual dispatch selects `both`, `npm`, or `crate` directly. Selection never changes
the tag, version, history, or retained evidence.

## Evidence and notes

Prepare releases from correctness, compatibility, package and recovery evidence.
Missing performance comparisons do not block release preparation or authorize optimization;
follow [root agent guidance](../AGENTS.md#work-scope) and retain the existing required regression checks.

Prepare both archives once without publishing credentials, even when publishing only one. Verify version and tag agreement, packaged
APIs, shared behavior, language parity, minimum compatible version, archive integrity, and licenses
before any publication step. Publication must reuse the verified archives; if a registry client must
repack, require byte identity with the verified artifact.

Require the candidate's annotated tag to resolve to the checked-out commit before preparation or
publication. Preserve tag objects in release checkouts; a matching version string cannot identify
the source that verification exercised. This does not change historical lightweight-tag selection.

Release notes contain the committed `CHANGELOG.md` section, with one generated API diff appended
at the end of `### Breaking changes`, `### Added` and `### Changed`, followed by package sizes and
links to the published package and the commit history since the previous tag. The changelog holds
prose only: callers need the upgrade explained, and a hand-written diff beside the generated one
splits the same change in two places. A missing `### Added` or `### Changed` heading is created; a
missing `### Breaking changes` heading stops the release while the API breaks callers, because only
prose can say what to change.

Breaking means old caller code stops compiling. TypeScript compatibility comes from the compiler:
each export reaching a changed declaration, including unexported types it uses, must accept old
calls (assignability plus argument count) under every supported compiler; a change any one of them
rejects is breaking. Text comparison cannot decide this, and TypeScript never
relates deferred conditional types across two files, so unchanged exports are compatible by
definition and only changed ones are checked; a false failure can only call a change breaking.
Rust compatibility comes from cargo-semver-checks.
Keep complete API comparisons internal to compatibility checks. Do not publish declaration
inventories, private helper types, repeated older API comparisons, or API attachments.
Include only the packages selected for publication; keep unpublished implementations and their
reports out of consumer notes.
Report npm and crate compressed sizes separately, in binary units (1 KB is 1024 bytes), and keep
matched linked native and WebAssembly caller probes out of consumer notes. State absolute changes;
state percentages only for nonzero denominators.

Version the full consumer effect. A fix with no new public behavior is patch. Backward-compatible
public behavior is minor. Incompatible behavior is major, or minor before 1.0. Structural API checks
provide a lower bound; the committer must classify behavior that declarations cannot expose.

After each public release, set the dev version to the next patch. Compare all unreleased changes
with that release. If they exceed a patch, set the next minor. If they are incompatible, set the
next major, or the next minor before 1.0. Changes to an API that never shipped do not force another
bump. Before the first release, keep the planned version unless the maintainer changes it.

### Set the development version

Run `bun run version:set <X.Y.Z-dev>` when the planned release version changes. The command updates
`package.json`, `rust/Cargo.toml`, and both Cargo lockfiles, then checks workspace version agreement.
It restores all version files if an update fails.
A dev bump NEVER runs `bun run release` or creates a release commit or tag. Release tags and
published manifests never use the `-dev` suffix.

The commit hook checks two independent rules. Generated declarations must match the reviewed
baseline and remain compatible with the latest release. Updating the reviewed baseline cannot
erase release history.

On the tagged commit, the tag is the current release, so the check compares it with the prior
release and enforces the structural minimum version.

Use v0.4.0 as the first release-history baseline because older tags do not contain compiler-derived
API reports. An API must be deprecated in one published release before removal. Remove it only in a
later major release, or a later minor release while the major version is zero.

Package manifests are the only owners of package metadata. Routine checks compare their public
settings with the latest release. `publish-clean` validates the exact npm tarball. The Cargo release
path validates the exact `.crate` after `cargo package`. Declaration reports contain no manifest
copy.

## Publication and recovery

Draft notes with `bun run changelog v<next>`, edit `CHANGELOG.md` for consumers, and commit the
draft before `bun run release <next>`; versioning requires a clean tree. The release commit and
annotated tag message are the version number only. Do not encode publication selection in tags or
add a release bot.
The release command must reject a tag that differs from the manifest or lacks a nonempty changelog
section. Publication keeps that section's prose unchanged and adds the generated parts described
in §Evidence and notes.
Use the release command to check the stable manifest before Git creates its tag; ordinary untagged work must use `-dev`.

Keep `@anizoptera/publish-clean` as a registry dependency and publication in
`.github/workflows/release.yml`, whose filename is bound to trusted publishing. Verification of the
tagged commit runs without publication credentials; only a dependent publication job receives
them. Validate the cleaned archive, publish with public access and provenance, and derive the npm
dist-tag from the Git tag: prereleases use `next`; stable releases use `latest`.

Create or update one draft GitHub release. Publish missing npm or crates.io artifacts only after
checking whether that exact version already exists. Existing versions must match the retained bytes;
never overwrite or attest different content. Attach only registry-matching archives and reproducible
notes.

Keep the GitHub release as a draft until every selected registry and attached archive, plus the
generated notes, are verified. Verify each attachment by GitHub's SHA-256 digest, and create provenance before
making the draft public. A rerun repairs only missing publication, attachment, or note work. Finalize
the release once every required result is observable and matches the retained release inputs.

Write retained archives only through `--tarball-out DIR` into a caller-owned directory, then remove
that directory. Never parse an archive path from human-facing output.

Every remote write requires explicit maintainer authorization for the exact operation.
