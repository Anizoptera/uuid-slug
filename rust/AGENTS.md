# rust/ — Rust crate and development bridges

Rules for editing Rust code. Root `AGENTS.md` applies too. `dev/cross-language.md` owns the full rules; read §Parity and §Rust call sites before changing behavior.

- Every feature, fix or contract change MUST land in BOTH TypeScript and Rust, with their shared contract cases (`scripts/rust-conform.ts`). Agreement between the two proves nothing: expected results come from README §Guarantees, `docs/design.md`, retained fixtures and reference vectors.
- Preserve issued IDs: wire constants, alphabets and hash order are frozen (`docs/design.md`).
- Add a Rust dependency only after the comparison in `dev/cross-language.md` §Distribution and dependencies.
- `bridge/` serves development only: never published, no public ABI. Node and Bun load the same generated N-API boundary; browsers load the generated wasm-bindgen boundary. Panic handling cannot contain allocation aborts or WebAssembly traps, so keep real Node, Bun and browser transport checks beside the shared dispatcher tests.
- Verify with `bun run check:rust`, then `scripts/rust-wasm.ts` under `UUID_SLUG_RUST_PROFILE=debug` and `release`.
