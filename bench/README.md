# Benchmarks

The benchmark harness is maintained source, but it is not published to npm.

Rules:

- Keep direct runtime operations separate from composed pipeline operations.
- Keep benchmark dependencies in `devDependencies`.
- Run the same candidate set in smoke and full modes so CI detects adapter rot.
- Treat uniqueness stress as a correctness gate, not a marketing number.
- Do not publish benchmark reports as package claims.
- Use smoke runs in CI and heavy runs manually.
