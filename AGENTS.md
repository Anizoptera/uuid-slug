# @anizoptera/uuid-slug

- Runtime dependencies are forbidden.
- Masked slugs and sentinels are core functionality, not compatibility add-ons.
- Do not add old API aliases or compatibility subpaths.
- Do not mention private source project names in public files, commits, tests, fixtures, or reports.
- Sentinel slugs are always direct legacy/raw UUID slugs and are precomputed per codec instance.
- Benchmark dependencies stay dev-only and must not appear in the packed artifact.
- Publish through `publish-clean`, validate the final cleaned npm tarball, and pass `--access public --provenance`. The npm dist-tag is derived from the git tag, never hardcoded: a version with a prerelease component publishes as `next`, everything else as `latest`. A bare `npm install` resolves `latest`, so a hardcoded one hands every consumer the next release candidate the moment someone runs `bun run release prerelease`.
- Keep `@anizoptera/publish-clean` as a normal npm dependency. Never pin it to a GitHub SHA or tarball URL: this package publishes through it, so a source nobody else can resolve makes the release unreproducible for anyone but us.
- Keep npm publication in `.github/workflows/release.yml`; npm trusted publishing is keyed by workflow filename.
- Releasing is four commands and no bot: `bun run changelog v<next>` drafts the section from the
  commits since the last tag, you EDIT it, you COMMIT it, then `bun run release <next>` and
  `git push --follow-tags`. The commit is not optional bookkeeping: the bump aborts on a
  dirty tree (`ERR_PNPM_UNCLEAN_WORKING_TREE`), so the drafted section must already be committed.
  The `version` script refuses to commit or tag when `CHANGELOG.md` has no section for the new
  version, and the workflow refuses to publish when that section is empty or when the tag disagrees
  with the manifest.
- `CHANGELOG.md` is the single source of the release notes; the workflow publishes the tagged
  version's section verbatim. Edit the drafted section before tagging — a commit subject says what
  changed in the tree, a release note says what a consumer gets.
- Nothing computes the version — you do. Reaching 1.0.0 is a decision, never a bump, and a pre-1.0
  breaking change is a MINOR. Tags must be annotated: a lightweight `git tag v0.3.0` fails outright
  under `tag.gpgSign = true`, which is why `bun run release` is the tagging command.
- Never read paths out of `publish-clean`'s stdout. `--tarball-out DIR` is the supported way to get
  the published bytes, into a directory the caller owns and deletes; parsing a human-facing message
  couples this repo to that tool's wording and breaks silently when it changes.
- Run `bun run check` before committing.
