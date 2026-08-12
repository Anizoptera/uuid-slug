# Benchmarks

The benchmark harness is maintained source, but it is not published to npm.

Rules:

- Keep direct runtime operations separate from composed pipeline operations.
- Keep benchmark dependencies in `devDependencies`.
- Run the same candidate set in smoke and full modes so CI detects adapter rot.
- Benchmarks REPORT; they never gate. A number that fails a build makes every routine measurement a
  release blocker and pushes the threshold, not the code. Correctness gates live in `test/` — which
  is why the randomness instrument does too, with this tree importing it from there.
- Do not publish benchmark reports as package claims.
- Use smoke runs in CI and heavy runs manually.
