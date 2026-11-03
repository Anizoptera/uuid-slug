# Implementation comparisons

Raw observations: [JSON Lines](implementations-evidence-zlZ3OR/observations.jsonl)

Captured 2026-11-03T02:20:43.642Z; revision `3d1d17e1e184e1dc3d16bd0065d09a9a466a1ef0`; host darwin/arm64; Apple M4 Max.

**Wiring check only. These samples are not performance evidence.**

Raw captures retain execution-time host versions and native transport selections where available; other versions come from the selected executable or compiler records.

Requested reference: `ts/node`. Each job names its actual reference: the requested lane when available, otherwise Node, native release Rust, then another connected measured lane. Each comparison runs reference/candidate/candidate/reference or the reverse. Lane order within each block and each window's orientation were independently randomized before timing. Ratios combine the two neighboring pairs geometrically. Native Rust connects to Node only through a matching artifact, version record and ordered workload. 1 fresh-process blocks, 1 batches per process. A missing interval is unresolved. Retained JSON Lines keep every batch and acquisition order.

Rust application rows time complete compiled calls with result consumption in the native or WASM loop; they exclude a JS crossing per identifier. JS rows include their result witness and errors-as-values checks. Rust owns fixed-array values where JavaScript owns heap arrays. These are consumer-path comparisons, not isolated language or compiler effects. No overall winner is calculated.

Per-call transport rows include one real native crossing for each UUID, text parsing and owned base64url string output, checked against the same JavaScript text-to-slug job. They exclude JSON dispatch. Native libraries are development-only and are not shipped in the npm package; Bun prefers FFI and Node prefers Node-API. Forced alternative rows measure fallback capabilities, not a recommendation to change those defaults.

JavaScript graphs are warmed and minified. Rust uses release optimization level 3, ThinLTO and one code-generation unit, with native CPU tuning for this machine; WASM then uses the maintained Binaryen O2 pipeline. Debug and disabled-JIT runs are excluded. Browser workers use cross-origin isolation. “Unavailable” means no measured result for that job in the lane; it does not establish missing API support. “Uncompared” means a measured result lacks a connection to the reference under matching conditions. Neither means zero cost. Installed Node patches are represented by the newest installed patch per major plus the checkout's selected Node.

workerd labels identify requested compatibility settings, not an absence of Node APIs. These are local workerd measurements, not deployed Workers latency. Warm-up executes real work before sampling; it does not prove a globally optimal compiler or JIT state.

Browser OS entropy without std uses a harness-selected getrandom JS backend; the product's std feature stays disabled. Reduced and std-only browser builds retain operations that need no entropy. Native results cover this host only; other operating systems and CPU architectures are not measured by this run.

## Common caller jobs

| Lane | plain/base64 | plain/base32 |
| --- | ---: | ---: |
| Reference | ts/node | ts/node |
| ts/node | reference | reference |
| ts/node-22 | 1× [?] | 1.1× [?] |
| ts/node-24 | 0.87× [?] | 1× [?] |
| ts/bun | 1.8× [?] | 0.85× [?] |
| ts/deno | 0.74× [?] | 0.99× [?] |
| ts/chromium | 0.84× [?] | 0.86× [?] |
| ts/firefox | 1.3× [?] | 1.3× [?] |
| ts/webkit | 1.3× [?] | 1.4× [?] |
| ts/workerd-web | 0.87× [?] | 0.96× [?] |
| ts/workerd-node-compatible | 0.84× [?] | 0.97× [?] |
| rust/native/release/fast-rng | 0.54× [?] | 0.44× [?] |
| rust/wasm32-wasip1/release/fast-rng | 2.6× [?] | 0.47× [?] |
| rust/wasm32-wasip2/release/fast-rng | 2.5× [?] | 0.45× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/workerd-web | 2.4× [?] | 0.67× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/workerd-node-compatible | 2.5× [?] | 0.69× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/node | 2.8× [?] | 0.6× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/node-22 | 2.4× [?] | 0.73× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/node-24 | 2.5× [?] | 0.73× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/bun | 1.8× [?] | 0.57× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/deno | 2.7× [?] | 0.69× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/chromium | 2.6× [?] | 0.57× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/firefox | 2.1× [?] | 0.93× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/webkit | 2× [?] | 0.6× [?] |
| rust/native/release/os-rng | 0.53× [?] | 0.48× [?] |
| rust/wasm32-wasip1/release/os-rng | 2.4× [?] | 0.44× [?] |
| rust/wasm32-wasip2/release/os-rng | 2.3× [?] | 0.44× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/workerd-web | 2.5× [?] | 0.65× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/workerd-node-compatible | 2.6× [?] | 0.69× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/node | 2.6× [?] | 0.59× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/node-22 | 2.4× [?] | 0.72× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/node-24 | 2.5× [?] | 0.69× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/bun | 1.7× [?] | 0.59× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/deno | 2.6× [?] | 0.66× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/chromium | 2.6× [?] | 0.6× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/firefox | 2× [?] | 0.93× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/webkit | 2× [?] | 0.61× [?] |
| rust/native/release/os-rng-no-std | 0.52× [?] | 0.42× [?] |
| rust/wasm32-wasip1/release/os-rng-no-std | 2.3× [?] | 0.48× [?] |
| rust/wasm32-wasip2/release/os-rng-no-std | 2.4× [?] | 0.45× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-web | 2.4× [?] | 0.67× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-node-compatible | 2.7× [?] | 0.74× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node | 2.6× [?] | 0.59× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node-22 | 2.4× [?] | 0.72× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node-24 | 2.6× [?] | 0.75× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/bun | 1.6× [?] | 0.57× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/deno | 2.5× [?] | 0.69× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/chromium | 2.5× [?] | 0.57× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/firefox | 2.2× [?] | 0.92× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/webkit | 2× [?] | 0.61× [?] |
| rust/native/release/std | 0.56× [?] | 0.44× [?] |
| rust/wasm32-wasip1/release/std | 2.4× [?] | 0.42× [?] |
| rust/wasm32-wasip2/release/std | 2.7× [?] | 0.45× [?] |
| rust/wasm32-unknown-unknown/release/std/workerd-web | 2.5× [?] | 0.7× [?] |
| rust/wasm32-unknown-unknown/release/std/workerd-node-compatible | 2.5× [?] | 0.64× [?] |
| rust/wasm32-unknown-unknown/release/std/node | 2.7× [?] | 0.55× [?] |
| rust/wasm32-unknown-unknown/release/std/node-22 | 2.4× [?] | 0.72× [?] |
| rust/wasm32-unknown-unknown/release/std/node-24 | 2.6× [?] | 0.69× [?] |
| rust/wasm32-unknown-unknown/release/std/bun | 1.8× [?] | 0.59× [?] |
| rust/wasm32-unknown-unknown/release/std/deno | 2.7× [?] | 0.7× [?] |
| rust/wasm32-unknown-unknown/release/std/chromium | 2.5× [?] | 0.58× [?] |
| rust/wasm32-unknown-unknown/release/std/firefox | 2.2× [?] | 0.94× [?] |
| rust/wasm32-unknown-unknown/release/std/webkit | 1.8× [?] | 0.62× [?] |
| rust/native/release/reduced | 0.55× [?] | 0.46× [?] |
| rust/wasm32-wasip1/release/reduced | 2.4× [?] | 0.43× [?] |
| rust/wasm32-wasip2/release/reduced | 2.7× [?] | 0.46× [?] |
| rust/wasm32-unknown-unknown/release/reduced/workerd-web | 2.6× [?] | 0.7× [?] |
| rust/wasm32-unknown-unknown/release/reduced/workerd-node-compatible | 2.6× [?] | 0.68× [?] |
| rust/wasm32-unknown-unknown/release/reduced/node | 2.7× [?] | 0.58× [?] |
| rust/wasm32-unknown-unknown/release/reduced/node-22 | 2.5× [?] | 0.71× [?] |
| rust/wasm32-unknown-unknown/release/reduced/node-24 | 2.6× [?] | 0.68× [?] |
| rust/wasm32-unknown-unknown/release/reduced/bun | 1.7× [?] | 0.56× [?] |
| rust/wasm32-unknown-unknown/release/reduced/deno | 2.5× [?] | 0.69× [?] |
| rust/wasm32-unknown-unknown/release/reduced/chromium | 2.4× [?] | 0.55× [?] |
| rust/wasm32-unknown-unknown/release/reduced/firefox | 2.2× [?] | 0.97× [?] |
| rust/wasm32-unknown-unknown/release/reduced/webkit | 1.9× [?] | 0.6× [?] |

## Runtime and control evidence

| Lane | Runtime | SHA-256 prefix | A/A repeat ratio, median [95% interval] |
| --- | --- | --- | --- |
| ts/node | v26.13.0 | 7d1a1eda099f | 1× [?]; plain/base64 |
| ts/node-22 | v22.23.4 | 7d1a1eda099f | 0.95× [?]; plain/base64 |
| ts/node-24 | v24.22.2 | 7d1a1eda099f | 1× [?]; plain/base32 |
| ts/bun | 1.4.4 | f906ae37070c | 0.98× [?]; plain/base32 |
| ts/deno | deno 2.9.8 (stable, release, aarch64-apple-darwin) | b123671cadbc | 1× [?]; plain/base64 |
| ts/chromium | 156.0.8078.4 | cedffb48d32b | 1× [?]; plain/base64 |
| ts/firefox | 157.0 | cedffb48d32b | 1.1× [?]; plain/base32 |
| ts/webkit | 27.2 | cedffb48d32b | 0.94× [?]; plain/base32 |
| ts/workerd-web | workerd 2026-11-02 | d1580ff39584 | 1× [?]; plain/base32 |
| ts/workerd-node-compatible | workerd 2026-11-02 | d1580ff39584 | 0.95× [?]; plain/base32 |
| rust/native/release/fast-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13) | 817ced0edfa1 | 0.89× [?]; failure/plain/base32 |
| rust/wasm32-wasip1/release/fast-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 9d054b3e082e | 0.94× [?]; parse/plain/base64 |
| rust/wasm32-wasip2/release/fast-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0; jco 1.39.0 | b906fdda8202 | 0.91× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/fast-rng/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 024f5cabb6c1 | 1.1× [?]; plain/base32 |
| rust/wasm32-unknown-unknown/release/fast-rng/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 024f5cabb6c1 | 0.97× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/fast-rng/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 024f5cabb6c1 | 0.95× [?]; plain/base32 |
| rust/wasm32-unknown-unknown/release/fast-rng/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | 024f5cabb6c1 | 1.1× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/fast-rng/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | 024f5cabb6c1 | 1.1× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/fast-rng/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | 024f5cabb6c1 | 1.1× [?]; plain/base64 |
| rust/wasm32-unknown-unknown/release/fast-rng/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | 024f5cabb6c1 | 1× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/fast-rng/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | 024f5cabb6c1 | 0.89× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/fast-rng/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | 024f5cabb6c1 | 1.1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/fast-rng/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | 024f5cabb6c1 | 0.86× [?]; plain/base64 |
| rust/native/release/os-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13) | 3786227bbb63 | 1.2× [?]; plain/base32 |
| rust/wasm32-wasip1/release/os-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 83554357b2b4 | 1× [?]; plain/base64 |
| rust/wasm32-wasip2/release/os-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0; jco 1.39.0 | 70ca4a88c6cf | 1× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | af1fb858753b | 0.95× [?]; plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | af1fb858753b | 1× [?]; plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | af1fb858753b | 1.1× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | af1fb858753b | 0.87× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | af1fb858753b | 0.95× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | af1fb858753b | 1.1× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | af1fb858753b | 0.93× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | af1fb858753b | 1.1× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | af1fb858753b | 0.91× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | af1fb858753b | 1.1× [?]; parse/plain/base64 |
| rust/native/release/os-rng-no-std | rustc 1.99.1 (58cf8f9c3 2026-10-13) | b7958489ef67 | 1× [?]; plain/base32 |
| rust/wasm32-wasip1/release/os-rng-no-std | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 86e975d8cbd9 | 1.3× [?]; plain/base32 |
| rust/wasm32-wasip2/release/os-rng-no-std | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0; jco 1.39.0 | d94680c8cf20 | 0.97× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 695bb3b85f28 | 1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 695bb3b85f28 | 1× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 695bb3b85f28 | 0.91× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | 695bb3b85f28 | 0.87× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | 695bb3b85f28 | 0.96× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | 695bb3b85f28 | 1.1× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | 695bb3b85f28 | 1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | 695bb3b85f28 | 0.93× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | 695bb3b85f28 | 1.1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | 695bb3b85f28 | 1.2× [?]; parse/plain/base32 |
| rust/native/release/std | rustc 1.99.1 (58cf8f9c3 2026-10-13) | 9c51f5ba531c | 0.93× [?]; failure/plain/base32 |
| rust/wasm32-wasip1/release/std | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 1cc13cf14017 | 0.89× [?]; failure/plain/base32 |
| rust/wasm32-wasip2/release/std | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0; jco 1.39.0 | 7c3ac1149e39 | 1.1× [?]; plain/base32 |
| rust/wasm32-unknown-unknown/release/std/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 94d23ed6ad55 | 1.1× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/std/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 94d23ed6ad55 | 0.95× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/std/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 94d23ed6ad55 | 1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/std/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | 94d23ed6ad55 | 1.1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/std/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | 94d23ed6ad55 | 1.1× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/std/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | 94d23ed6ad55 | 1.2× [?]; plain/base32 |
| rust/wasm32-unknown-unknown/release/std/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | 94d23ed6ad55 | 1.1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/std/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | 94d23ed6ad55 | 1.1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/std/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | 94d23ed6ad55 | 0.95× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/std/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | 94d23ed6ad55 | 0.89× [?]; parse/plain/base32 |
| rust/native/release/reduced | rustc 1.99.1 (58cf8f9c3 2026-10-13) | 749739da088a | 1× [?]; failure/plain/base64 |
| rust/wasm32-wasip1/release/reduced | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 2dd7a2d9de29 | 0.96× [?]; parse/plain/base64 |
| rust/wasm32-wasip2/release/reduced | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0; jco 1.39.0 | 6dc83811ed54 | 1.1× [?]; plain/base64 |
| rust/wasm32-unknown-unknown/release/reduced/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 6b3d48a1f3ec | 1× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/reduced/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 6b3d48a1f3ec | 1.1× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 6b3d48a1f3ec | 0.96× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/reduced/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | 6b3d48a1f3ec | 1.1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | 6b3d48a1f3ec | 1.1× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | 6b3d48a1f3ec | 0.94× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/reduced/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | 6b3d48a1f3ec | 1× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | 6b3d48a1f3ec | 1.1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | 6b3d48a1f3ec | 0.96× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | 6b3d48a1f3ec | 0.93× [?]; parse/plain/base32 |
| cross-language/rust-native | rustc 1.99.1 (58cf8f9c3 2026-10-13) | 817ced0edfa1 | 0.9× [?]; failure/plain/base64 |
| transport/typescript/node | v26.13.0 | 33dcb9e23ef4 | 1× [?]; transport/plain/base64 |
| transport/native/node-22/napi | Node 22.23.4 | 346fb7466fc3 | 0.63× [?]; transport/plain/base64 |
| transport/native/node-24/napi | Node 24.22.2 | 346fb7466fc3 | 1.1× [?]; transport/plain/base64 |
| transport/native/node-26/napi | Node 26.13.0 | 346fb7466fc3 | 0.88× [?]; transport/plain/base64 |
| transport/native/node-26/ffi | Node 26.13.0 | 346fb7466fc3 | 1× [?]; transport/plain/base64 |
| transport/native/bun/ffi | Bun 1.4.4 | 346fb7466fc3 | 1× [?]; transport/plain/base64 |
| transport/native/bun/napi | Bun 1.4.4 | 346fb7466fc3 | 0.78× [?]; transport/plain/base64 |
| transport/native/deno/napi | Deno 2.9.8 | 346fb7466fc3 | 1× [?]; transport/plain/base64 |
| transport/native/deno/ffi | Deno 2.9.8 | 346fb7466fc3 | 1× [?]; transport/plain/base64 |

A/A uses identical artifacts in separate processes. Its worst median displacement exposes unstable jobs; it is not a correction factor. Inspect the retained per-job repeats before attributing a small gap to implementation. Host load can affect implementations differently, so order balancing and controls reduce confounding but cannot remove it.

## TypeScript

| Caller job | Reference | ts/node | ts/node-22 | ts/node-24 | ts/bun | ts/deno | ts/chromium | ts/firefox | ts/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| plain/base32 | ts/node | reference | 1.1× [?] | 1× [?] | 0.85× [?] | 0.99× [?] | 0.86× [?] | 1.3× [?] | 1.4× [?] |
| plain/base64 | ts/node | reference | 1× [?] | 0.87× [?] | 1.8× [?] | 0.74× [?] | 0.84× [?] | 1.3× [?] | 1.3× [?] |

## TypeScript workerd

| Caller job | Reference | ts/workerd-web | ts/workerd-node-compatible |
| --- | --- | ---: | ---: |
| plain/base32 | ts/node | 0.96× [?] | 0.97× [?] |
| plain/base64 | ts/node | 0.87× [?] | 0.84× [?] |

## Rust native

| Caller job | Reference | rust/native/release/fast-rng | rust/native/release/os-rng | rust/native/release/os-rng-no-std | rust/native/release/std | rust/native/release/reduced |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | reference | 0.91× [?] | 0.96× [?] | 1× [?] | 0.98× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | reference | 0.96× [?] | 0.99× [?] | 1× [?] | 1× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | reference | 0.98× [?] | 0.99× [?] | 1.2× [?] | 1× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | reference | 1× [?] | 0.99× [?] | 1× [?] | 1× [?] |
| plain/base32 | ts/node | 0.44× [?] | 0.48× [?] | 0.42× [?] | 0.44× [?] | 0.46× [?] |
| plain/base64 | ts/node | 0.54× [?] | 0.53× [?] | 0.52× [?] | 0.56× [?] | 0.55× [?] |

## Rust wasm32-wasip1

| Caller job | Reference | rust/wasm32-wasip1/release/fast-rng | rust/wasm32-wasip1/release/os-rng | rust/wasm32-wasip1/release/os-rng-no-std | rust/wasm32-wasip1/release/std | rust/wasm32-wasip1/release/reduced |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.4× [?] | 1.3× [?] | 1.4× [?] | 1.6× [?] | 1.4× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.5× [?] | 1.3× [?] | 1.5× [?] | 1.4× [?] | 1.4× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1× [?] | 0.95× [?] | 1× [?] | 0.99× [?] | 0.96× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.1× [?] | 1× [?] | 0.96× [?] | 1× [?] | 1× [?] |
| plain/base32 | ts/node | 0.47× [?] | 0.44× [?] | 0.48× [?] | 0.42× [?] | 0.43× [?] |
| plain/base64 | ts/node | 2.6× [?] | 2.4× [?] | 2.3× [?] | 2.4× [?] | 2.4× [?] |

## Rust wasm32-wasip2

| Caller job | Reference | rust/wasm32-wasip2/release/fast-rng | rust/wasm32-wasip2/release/os-rng | rust/wasm32-wasip2/release/os-rng-no-std | rust/wasm32-wasip2/release/std | rust/wasm32-wasip2/release/reduced |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.4× [?] | 1.4× [?] | 1.4× [?] | 1.5× [?] | 1.6× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.4× [?] | 1.5× [?] | 1.5× [?] | 1.5× [?] | 1.5× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.1× [?] | 1× [?] | 0.96× [?] | 0.97× [?] | 1× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 0.95× [?] | 1× [?] | 0.95× [?] | 0.9× [?] | 0.97× [?] |
| plain/base32 | ts/node | 0.45× [?] | 0.44× [?] | 0.45× [?] | 0.45× [?] | 0.46× [?] |
| plain/base64 | ts/node | 2.5× [?] | 2.3× [?] | 2.4× [?] | 2.7× [?] | 2.7× [?] |

## Rust browser WASM release/fast-rng

| Caller job | Reference | rust/wasm32-unknown-unknown/release/fast-rng/workerd-web | rust/wasm32-unknown-unknown/release/fast-rng/workerd-node-compatible | rust/wasm32-unknown-unknown/release/fast-rng/node | rust/wasm32-unknown-unknown/release/fast-rng/node-22 | rust/wasm32-unknown-unknown/release/fast-rng/node-24 | rust/wasm32-unknown-unknown/release/fast-rng/bun | rust/wasm32-unknown-unknown/release/fast-rng/deno | rust/wasm32-unknown-unknown/release/fast-rng/chromium | rust/wasm32-unknown-unknown/release/fast-rng/firefox | rust/wasm32-unknown-unknown/release/fast-rng/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.2× [?] | 1.2× [?] | 1.4× [?] | 1.6× [?] | 1.5× [?] | 0.87× [?] | 1.2× [?] | 1.2× [?] | 1.7× [?] | 0.78× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1.3× [?] | 1.7× [?] | 1.7× [?] | 0.91× [?] | 1.4× [?] | 1.3× [?] | 1.7× [?] | 0.81× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1.1× [?] | 1.1× [?] | 1.1× [?] | 1.3× [?] | 1.3× [?] | 1× [?] | 1.4× [?] | 1.2× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1× [?] | 1× [?] | 1.1× [?] | 0.99× [?] | 1.3× [?] | 1× [?] | 1.3× [?] | 1.1× [?] |
| plain/base32 | ts/node | 0.67× [?] | 0.69× [?] | 0.6× [?] | 0.73× [?] | 0.73× [?] | 0.57× [?] | 0.69× [?] | 0.57× [?] | 0.93× [?] | 0.6× [?] |
| plain/base64 | ts/node | 2.4× [?] | 2.5× [?] | 2.8× [?] | 2.4× [?] | 2.5× [?] | 1.8× [?] | 2.7× [?] | 2.6× [?] | 2.1× [?] | 2× [?] |

## Rust browser WASM release/os-rng

| Caller job | Reference | rust/wasm32-unknown-unknown/release/os-rng/workerd-web | rust/wasm32-unknown-unknown/release/os-rng/workerd-node-compatible | rust/wasm32-unknown-unknown/release/os-rng/node | rust/wasm32-unknown-unknown/release/os-rng/node-22 | rust/wasm32-unknown-unknown/release/os-rng/node-24 | rust/wasm32-unknown-unknown/release/os-rng/bun | rust/wasm32-unknown-unknown/release/os-rng/deno | rust/wasm32-unknown-unknown/release/os-rng/chromium | rust/wasm32-unknown-unknown/release/os-rng/firefox | rust/wasm32-unknown-unknown/release/os-rng/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.2× [?] | 1.4× [?] | 1.2× [?] | 1.6× [?] | 1.6× [?] | 0.89× [?] | 1.6× [?] | 1.3× [?] | 1.7× [?] | 0.79× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1.3× [?] | 1.7× [?] | 1.8× [?] | 0.92× [?] | 1.6× [?] | 1.3× [?] | 1.6× [?] | 0.85× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 0.95× [?] | 1.1× [?] | 1× [?] | 1.2× [?] | 1.3× [?] | 1× [?] | 1.4× [?] | 1.1× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.2× [?] | 1× [?] | 1.1× [?] | 1× [?] | 1.1× [?] | 1.3× [?] | 0.99× [?] | 1.2× [?] | 1.1× [?] |
| plain/base32 | ts/node | 0.65× [?] | 0.69× [?] | 0.59× [?] | 0.72× [?] | 0.69× [?] | 0.59× [?] | 0.66× [?] | 0.6× [?] | 0.93× [?] | 0.61× [?] |
| plain/base64 | ts/node | 2.5× [?] | 2.6× [?] | 2.6× [?] | 2.4× [?] | 2.5× [?] | 1.7× [?] | 2.6× [?] | 2.6× [?] | 2× [?] | 2× [?] |

## Rust browser WASM release/os-rng-no-std

| Caller job | Reference | rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-web | rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-node-compatible | rust/wasm32-unknown-unknown/release/os-rng-no-std/node | rust/wasm32-unknown-unknown/release/os-rng-no-std/node-22 | rust/wasm32-unknown-unknown/release/os-rng-no-std/node-24 | rust/wasm32-unknown-unknown/release/os-rng-no-std/bun | rust/wasm32-unknown-unknown/release/os-rng-no-std/deno | rust/wasm32-unknown-unknown/release/os-rng-no-std/chromium | rust/wasm32-unknown-unknown/release/os-rng-no-std/firefox | rust/wasm32-unknown-unknown/release/os-rng-no-std/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.5× [?] | 1.4× [?] | 1.3× [?] | 1.6× [?] | 1.6× [?] | 0.96× [?] | 1.5× [?] | 1.5× [?] | 1.7× [?] | 0.87× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.4× [?] | 1.5× [?] | 1.5× [?] | 1.7× [?] | 1.7× [?] | 0.96× [?] | 1.6× [?] | 1.4× [?] | 1.8× [?] | 0.96× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1× [?] | 1.1× [?] | 1× [?] | 1.2× [?] | 1.4× [?] | 1× [?] | 1.4× [?] | 1.1× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1× [?] | 1.1× [?] | 1× [?] | 1.1× [?] | 1.2× [?] | 1× [?] | 1.2× [?] | 1.2× [?] |
| plain/base32 | ts/node | 0.67× [?] | 0.74× [?] | 0.59× [?] | 0.72× [?] | 0.75× [?] | 0.57× [?] | 0.69× [?] | 0.57× [?] | 0.92× [?] | 0.61× [?] |
| plain/base64 | ts/node | 2.4× [?] | 2.7× [?] | 2.6× [?] | 2.4× [?] | 2.6× [?] | 1.6× [?] | 2.5× [?] | 2.5× [?] | 2.2× [?] | 2× [?] |

## Rust browser WASM release/std

| Caller job | Reference | rust/wasm32-unknown-unknown/release/std/workerd-web | rust/wasm32-unknown-unknown/release/std/workerd-node-compatible | rust/wasm32-unknown-unknown/release/std/node | rust/wasm32-unknown-unknown/release/std/node-22 | rust/wasm32-unknown-unknown/release/std/node-24 | rust/wasm32-unknown-unknown/release/std/bun | rust/wasm32-unknown-unknown/release/std/deno | rust/wasm32-unknown-unknown/release/std/chromium | rust/wasm32-unknown-unknown/release/std/firefox | rust/wasm32-unknown-unknown/release/std/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.6× [?] | 1.5× [?] | 1.5× [?] | 1.7× [?] | 1.5× [?] | 1× [?] | 1.8× [?] | 1.4× [?] | 1.8× [?] | 0.8× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.6× [?] | 1.5× [?] | 1.6× [?] | 1.8× [?] | 1.7× [?] | 0.91× [?] | 1.8× [?] | 1.6× [?] | 1.8× [?] | 0.95× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1× [?] | 1.1× [?] | 1.1× [?] | 1.2× [?] | 1.4× [?] | 0.96× [?] | 1.3× [?] | 1.2× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1× [?] | 1.1× [?] | 1× [?] | 1.1× [?] | 1.3× [?] | 1.1× [?] | 1.2× [?] | 0.97× [?] |
| plain/base32 | ts/node | 0.7× [?] | 0.64× [?] | 0.55× [?] | 0.72× [?] | 0.69× [?] | 0.59× [?] | 0.7× [?] | 0.58× [?] | 0.94× [?] | 0.62× [?] |
| plain/base64 | ts/node | 2.5× [?] | 2.5× [?] | 2.7× [?] | 2.4× [?] | 2.6× [?] | 1.8× [?] | 2.7× [?] | 2.5× [?] | 2.2× [?] | 1.8× [?] |

## Rust browser WASM release/reduced

| Caller job | Reference | rust/wasm32-unknown-unknown/release/reduced/workerd-web | rust/wasm32-unknown-unknown/release/reduced/workerd-node-compatible | rust/wasm32-unknown-unknown/release/reduced/node | rust/wasm32-unknown-unknown/release/reduced/node-22 | rust/wasm32-unknown-unknown/release/reduced/node-24 | rust/wasm32-unknown-unknown/release/reduced/bun | rust/wasm32-unknown-unknown/release/reduced/deno | rust/wasm32-unknown-unknown/release/reduced/chromium | rust/wasm32-unknown-unknown/release/reduced/firefox | rust/wasm32-unknown-unknown/release/reduced/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.6× [?] | 1.5× [?] | 1.5× [?] | 1.7× [?] | 1.5× [?] | 1× [?] | 1.4× [?] | 1.5× [?] | 1.8× [?] | 0.94× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.6× [?] | 1.5× [?] | 1.6× [?] | 1.8× [?] | 1.7× [?] | 0.85× [?] | 1.7× [?] | 1.6× [?] | 1.9× [?] | 0.97× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.3× [?] | 1.2× [?] | 1× [?] | 1.1× [?] | 0.98× [?] | 1.1× [?] | 1.3× [?] | 0.99× [?] | 1.3× [?] | 1.2× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 0.99× [?] | 1.1× [?] | 1× [?] | 1.1× [?] | 1.3× [?] | 1× [?] | 1.2× [?] | 1× [?] |
| plain/base32 | ts/node | 0.7× [?] | 0.68× [?] | 0.58× [?] | 0.71× [?] | 0.68× [?] | 0.56× [?] | 0.69× [?] | 0.55× [?] | 0.97× [?] | 0.6× [?] |
| plain/base64 | ts/node | 2.6× [?] | 2.6× [?] | 2.7× [?] | 2.5× [?] | 2.6× [?] | 1.7× [?] | 2.5× [?] | 2.4× [?] | 2.2× [?] | 1.9× [?] |

## Cross-language anchor

| Caller job | Reference | cross-language/rust-native |
| --- | --- | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | uncompared |
| failure/plain/base64 | rust/native/release/fast-rng | uncompared |
| parse/plain/base32 | rust/native/release/fast-rng | uncompared |
| parse/plain/base64 | rust/native/release/fast-rng | uncompared |
| plain/base32 | ts/node | 0.44× [?] |
| plain/base64 | ts/node | 0.54× [?] |

## Per-call transports

| Caller job | Reference | transport/typescript/node | transport/native/node-22/napi | transport/native/node-24/napi | transport/native/node-26/napi | transport/native/node-26/ffi | transport/native/bun/ffi | transport/native/bun/napi | transport/native/deno/napi | transport/native/deno/ffi |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| transport/plain/base64 | transport/typescript/node | reference | 2.6× [?] | 1.9× [?] | 2× [?] | 6.8× [?] | 1.1× [?] | 2.3× [?] | 2× [?] | 4.5× [?] |
