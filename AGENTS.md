# @anizoptera/uuid-slug

- Runtime dependencies are forbidden.
- Masked slugs and sentinels are core functionality, not compatibility add-ons.
- Do not add old API aliases or compatibility subpaths.
- Do not mention private source project names in public files, commits, tests, fixtures, or reports.
- Sentinel slugs are always direct legacy/raw UUID slugs and are precomputed per codec instance.
- Benchmark dependencies stay dev-only and must not appear in the packed artifact.
- Run `bun run check` before committing.
