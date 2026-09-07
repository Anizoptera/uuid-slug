# Benchmarks

Measure each runtime separately; a failed or missing measurement must fail the harness.

Rules:

- Keep direct runtime operations separate from composed pipeline operations.
- Keep benchmark dependencies in `devDependencies`.
- Run the same candidate set in smoke and full modes so CI detects adapter rot.
- Performance and randomness figures have no pass thresholds. Process failures, empty output and
  malformed records fail the matrix while successful measurements remain visible.
- Run `bun run bench:matrix --smoke` for a short comparison. Set `UUID_SLUG_BENCH_RUNTIMES` to
  colon-separated executable paths to add runtimes. Each requested runtime must produce both reports.
- `UUID_SLUG_BENCH_ITERATIONS` and `UUID_SLUG_ENTROPY_SAMPLES` accept positive safe integers.
- Conversion rows use fixed inputs and include returned-error handling. Rotation rows distinguish
  current-key success from previous-key success; key derivation is outside the measured calls.
- Node runs bundles of the benchmark source; Bun runs the TypeScript directly. Inlining may affect
  the comparison. These measurements do not establish the cost of an installed package import.
- Do not publish benchmark reports as package claims.
- Use smoke runs in CI and heavy runs manually.
