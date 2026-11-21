// Target features uuid-simd's kernels need beyond a target's defaults. `simd_text_cfg!` in
// rust/uuid-slug/src/lib.rs compiles the wasm kernel only with simd128, which wasm32 targets lack
// by default; without it a uuid-simd build is the scalar code and every comparison is vacuous.
// Timing (bench/rust.ts) and machine-code comparison (bench/rust-codegen-diff.ts) must build the
// same code, so both take their flags here.
export const codecTargetRustflags = (target: string | undefined): string[] =>
  target?.startsWith("wasm32") ? ["-C", "target-feature=+simd128"] : [];
