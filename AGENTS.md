# @anizoptera/uuid-slug

- Runtime dependencies are forbidden.
- A change to any `src/runtime/*` adapter must be gated in BOTH runners. Vitest runs on Node and
  resolves `#runtime` to `runtime/node.ts`; `bun test test/*.bun.test.ts` resolves the `bun`
  condition to `runtime/bun.ts` and the `runtime/web.ts` it takes `fillRandom` from. Neither run
  constrains the other's adapter — measured 2026-08-11, `Math.random` written into
  `runtime/web.ts` left the ENTIRE vitest suite green, on the runtime most consumers use. The
  shared cases live in `test/entropy-probe.ts` so one list serves both.
- A generator that delegates to the platform must be probed through a path that cannot delegate.
  `uuidV4()`, `uuidV7()` and `uuidV7Slug()` hand off to a native generator whenever the runtime
  has one, so on Bun and Node they never touch this package's own `fillRandom`; only the byte and
  slug forms do so unconditionally. An entropy check through the string forms alone observes
  nothing of our code and passes against any randomness at all.
- A capability probe must test the PROPERTY this package needs, never the method's presence. Node
  26.6.0 added `crypto.randomUUIDv7`, which re-randomises all 74 random bits per call and so sorts
  in creation order 50% of the time inside a millisecond; delegating on presence traded away
  sortability on a runtime upgrade, with no consumer code change. `src/runtime/monotonic.ts` owns
  the probe. Presence is necessary and never sufficient.
- Anything returning bytes must return a plain `Uint8Array`. Bun's native v7 yields a node
  `Buffer`, which satisfies the declared type structurally while `toString("hex")` and
  `JSON.stringify` both behave differently — code written on Bun then produces different bytes on
  Node with nothing raising. Copy at the adapter boundary; both suites pin the constructor.
- `String()` on a typed array is a UTF-8 DECODE, not a serialisation: invalid sequences all become
  U+FFFD, so distinct identifiers collapse to one key. It produced 11 false duplicates in 200,000
  draws whose bytes were provably unique. Key typed arrays by `join(",")` or hex.
- The `runtimes` job in `check.yml` runs the suite on the newest Node deliberately unpinned. The
  guarantees here depend on native behaviour that changes between releases, and the pinned lane
  cannot see a method that does not exist yet.
- `Runtime` methods are optional so ABSENCE is representable. Never define one that throws when
  the platform lacks the capability: the caller treats a defined method as a working one, so it
  calls, catches and falls back on every single invocation. That cost 64% of v7 throughput on
  Node until 0.2.1. Probe once at module load and leave the method undefined.
- Masked slugs and sentinels are core functionality, not compatibility add-ons.
- Do not add old API aliases or compatibility subpaths.
- Do not mention private source project names in public files, commits, tests, fixtures, or reports.
- Sentinel slugs are always direct legacy/raw UUID slugs and are precomputed per codec instance.
- Benchmark dependencies stay dev-only and must not appear in the packed artifact.
- Publish through `publish-clean`, validate the final cleaned npm tarball, and pass `--access public --provenance`. The npm dist-tag is derived from the git tag, never hardcoded: a version with a prerelease component publishes as `next`, everything else as `latest`. A bare `npm install` resolves `latest`, so a hardcoded one hands every consumer the next release candidate the moment someone runs `bun run release prerelease`.
- Keep `@anizoptera/publish-clean` as a normal npm dependency. Never pin it to a GitHub SHA or tarball URL: this package publishes through it, so a source nobody else can resolve makes the release unreproducible for anyone but us.
- Keep npm publication in `.github/workflows/release.yml`; npm trusted publishing is keyed by workflow filename.
- Release is two jobs, and the split is what makes both true at once: `verify` runs `bun run check` on the
  tagged commit holding NO permissions, and `publish` declares `needs: verify` and does only what the
  credential is for. Never merge them: the suite must not run beside a live OIDC identity, and `preversion`
  is fast local feedback, never the gate — a hand-made tag would otherwise reach the registry, permanently.
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
