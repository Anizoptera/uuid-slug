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

npm and crates.io provide the selected release bytes; they do not select history. A missing selected
version, an outage, unreadable metadata, or disagreement between the tag and published artifact makes
the comparison unavailable and stops publication. Retain selected versions and registry integrity in
the release inputs so a retry cannot silently change its comparison basis.

## Evidence and notes

Prepare both archives without publishing credentials. Verify version and tag agreement, packaged
APIs, shared behavior, language parity, minimum compatible version, archive integrity, and licenses
before any publication step. Publication must reuse the verified archives; if a registry client must
repack, require byte identity with the verified artifact.

Release notes contain the committed `CHANGELOG.md` section verbatim, followed by generated API and
size differences against each selected comparison. Report npm and crate compressed bytes separately
from matched linked native and WebAssembly caller probes. State absolute changes; state percentages
only for nonzero denominators. Generated tables do not belong in the changelog.

## Publication and recovery

Create or update one draft GitHub release. Publish missing npm or crates.io artifacts only after
checking whether that exact version already exists. Existing versions must match the retained bytes;
never overwrite or attest different content. Attach only registry-matching archives and reproducible
notes.

Keep the GitHub release as a draft until npm, crates.io, both attached archives, and the generated
notes are verified. A rerun repairs only missing publication, attachment, or note work. Finalize the
release once every required result is observable and matches the retained release inputs.

Remote writes remain forbidden without Art's explicit authorization for the exact operation.
