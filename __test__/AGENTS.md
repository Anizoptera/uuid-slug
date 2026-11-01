# Shared tests and backend coverage

Read `../dev/cross-language.md` §Parity before changing implementation selection; it owns the required native loader order and reuse of TypeScript tests for Rust and WebAssembly.

- Reuse test bodies and independent expected results. A separately generated conformance corpus is additional evidence, never evidence that the TypeScript suite ran against Rust. Record the selected implementation and nonzero execution for each backend. Keep JavaScript host-only checks explicit; never count TypeScript fallback or an unsupported case as Rust execution.
- Exercise automatic native loading with the forced-transport variable absent, as well as each forced route. Use real libraries: remove the primary artifact in an isolated directory to reach fallback, and use an uncached missing path for total failure. Require an execution result from the loading controls; a skipped helper must not satisfy the lane. Disabling fallback must fail the missing-primary control. Reuse `scripts/rust-conform-matrix.ts` rather than creating another host registry.
- Execute processed WebAssembly, never raw compiler output, for acceptance. Read `../dev/cross-language.md` §Distribution and dependencies and `../bench/methods.md` §Compiler and WebAssembly optimization before changing its pipeline or interpreting its measurements.

Keep transport, serialization and caller ownership checks beside shared semantic tests; none substitutes for the others. Extend the nearest harness and preserve its interruption cleanup and feedback budget.
