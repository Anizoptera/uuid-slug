# @anizoptera/uuid-slug

- Runtime dependencies are forbidden.
- Masked slugs and sentinels are core functionality, not compatibility add-ons.
- Do not add old API aliases or compatibility subpaths.
- Do not mention private source project names in public files, commits, tests, fixtures, or reports.
- Sentinel slugs are always direct legacy/raw UUID slugs and are precomputed per codec instance.
- Benchmark dependencies stay dev-only and must not appear in the packed artifact.
- Publish through `publish-clean`, validate the final cleaned npm tarball, and pass `--access public --tag latest --provenance` unless another release policy is intentional.
- Keep `@anizoptera/publish-clean` as an npm dependency, not a GitHub SHA; regenerate `bun.lock` after the package exists on npm.
- Keep npm publication in `.github/workflows/release.yml`; npm trusted publishing is keyed by workflow filename.
- Run `bun run check` before committing.
