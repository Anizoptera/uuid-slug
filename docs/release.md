# Release integrity and recovery

A release uses Git tags to select history, publishes one verified npm archive and one verified Rust crate, and becomes final only after every destination exposes those exact bytes.

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

## Evidence and notes

Prepare both archives without publishing credentials. Verify version and tag agreement, packaged
APIs, shared behavior, language parity, minimum compatible version, archive integrity, and licenses
before any publication step. Publication must reuse the verified archives; if a registry client must
repack, require byte identity with the verified artifact.

Require the candidate's annotated tag to resolve to the checked-out commit before preparation or
publication. Preserve tag objects in release checkouts; a matching version string cannot identify
the source that verification exercised. This does not change historical lightweight-tag selection.

Release notes contain the committed `CHANGELOG.md` section verbatim, followed by generated API and
size differences against each selected comparison. Report npm and crate compressed bytes separately
from matched linked native and WebAssembly caller probes. State absolute changes; state percentages
only for nonzero denominators. Generated tables do not belong in the changelog.

Version the full consumer effect. A fix with no new public behavior is patch. Backward-compatible
public behavior is minor. Incompatible behavior is major, or minor before 1.0. Structural API checks
provide a lower bound; the committer must classify behavior that declarations cannot expose.

After each public release, set the dev version to the next patch. Compare all unreleased changes
with that release. If they exceed a patch, set the next minor. If they are incompatible, set the
next major, or the next minor before 1.0. Changes to an API that never shipped do not force another
bump. Before the first release, keep the planned version unless the maintainer changes it.

### Set the development version

Run `bun run version:set <X.Y.Z-dev>` when the planned release version changes. The command updates
`package.json`, `rust/Cargo.toml`, and `rust/Cargo.lock`, then checks that all three versions match.
It restores all three files if the update fails. Agents run it whenever the rule above changes the
target. A dev bump NEVER runs `bun run release` or creates a release commit or tag. Release tags and
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

Create or update one draft GitHub release. Publish missing npm or crates.io artifacts only after
checking whether that exact version already exists. Existing versions must match the retained bytes;
never overwrite or attest different content. Attach only registry-matching archives and reproducible
notes.

Keep the GitHub release as a draft until npm, crates.io, both attached archives, and the generated
notes are verified. Verify each attachment by GitHub's SHA-256 digest, and create provenance before
making the draft public. A rerun repairs only missing publication, attachment, or note work. Finalize
the release once every required result is observable and matches the retained release inputs.

Publishing and every other remote write require separate explicit maintainer authorization for the
exact operation.
