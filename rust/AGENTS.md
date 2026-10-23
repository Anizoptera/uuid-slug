# rust/ — Rust crate and development bridges

Rules for editing Rust code. Root `AGENTS.md` applies too. `dev/cross-language.md` owns the full rules; read §Parity and §Rust call sites before changing behavior.

- Every feature, fix or contract change MUST land in BOTH TypeScript and Rust, with their shared contract cases (`scripts/rust-conform.ts`). Agreement between the two proves nothing: expected results come from README §Guarantees, `docs/design.md`, retained fixtures and reference vectors.
- Preserve issued IDs: wire constants, alphabets and hash order are frozen (`docs/design.md`).
- Before rejecting a native generator, name the call and published promise it violates (`../dev/interface.md` §Generation and codecs). Simple Bun defaults use Bun directly; different counters, shared state or logical clock advancement alone are not parity defects. Created generators must provide their requested controls.
- Add a Rust dependency only after the comparison in `dev/cross-language.md` §Distribution and dependencies.
- `bridge/` serves development only: never published, no public ABI. Node and Bun load the same generated N-API boundary; browsers load the generated wasm-bindgen boundary. Panic handling cannot contain allocation aborts or WebAssembly traps, so keep real Node, Bun and browser transport checks beside the shared dispatcher tests.
- Verify with `bun run check:rust`, then `scripts/rust-wasm.ts` under `UUID_SLUG_RUST_PROFILE=debug` and `release`. For focused Cargo checks, run `test --doc` separately from `test --lib` or other target selectors; Cargo rejects combining them.
- Run WebAssembly checks on optimized binaries as required by `../dev/cross-language.md` §Distribution and dependencies; compiler output alone is not the final artifact.
- Reuse `scripts/rust-toolchain.ts` and `scripts/command.ts` for custom Cargo feature/profile matrices. Bash 3.2 rejects empty argument arrays under `set -u`, so a shell loop can stop before Cargo runs.
- Direct `rustc` consumer probes must use the Cargo-reported library plus `<target>/<profile>/deps` in `-L dependency`. Cargo can report a top-level rlib, so its parent directory alone does not resolve dependencies. Require a valid call to compile and the invalid call to fail for its intended diagnostic; a missing crate or mismatched toolchain proves nothing about the API.
- Install additional verification toolchains with `rustup toolchain install --no-self-update`; checking compiler compatibility must not also update the shared rustup manager.
