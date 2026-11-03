# Implementation comparisons

Raw observations: [JSON Lines](implementations-evidence-0ex9FK/observations.jsonl.gz)

Captured 2026-11-03T02:32:58.850Z; revision `46f45a87ba5e3d4e40aa53ef6034680db93ee81c`; host darwin/arm64; Apple M4 Max.

**Wiring check only. These samples are not performance evidence.**

Raw captures retain execution-time host versions and native transport selections where available; other versions come from the selected executable or compiler records.

Requested reference: `ts/node`. Each job names its actual reference: the requested lane when available, otherwise Node, native release Rust, a measured component root, then another connected measured lane. Each comparison runs reference/candidate/candidate/reference or the reverse. Lane order within each block and each window's orientation were independently randomized before timing. Ratios combine the two neighboring pairs geometrically. Native Rust connects to Node only through a matching artifact, version record and ordered workload. 1 fresh-process blocks, 1 batches per process. A missing interval is unresolved. Retained JSON Lines keep every batch and acquisition order.

Rust application rows time complete compiled calls with result consumption in the native or WASM loop; they exclude a JS crossing per identifier. JS rows include their result witness and errors-as-values checks. Rust owns fixed-array values where JavaScript owns heap arrays. These are consumer-path comparisons, not isolated language or compiler effects. No overall winner is calculated.

Per-call transport rows include one real native or WebAssembly crossing for each UUID, text parsing and owned base64url string output, checked against the same JavaScript text-to-slug job. They exclude JSON dispatch. Native libraries and WASM bindings are development-only and are not shipped in the npm package; Bun prefers FFI and Node prefers Node-API. Forced alternative rows measure fallback capabilities, not a recommendation to change those defaults.

JavaScript graphs are warmed and minified. Rust uses release optimization level 3, ThinLTO and one code-generation unit, with native CPU tuning for this machine; WASM then uses the maintained Binaryen O2 pipeline. Debug and disabled-JIT runs are excluded. Browser workers use cross-origin isolation. “Unavailable” means no measured result for that job in the lane; it does not establish missing API support. “Uncompared” means a measured result lacks a connection to the reference under matching conditions. Neither means zero cost. Installed Node patches are represented by the newest installed patch per major plus the checkout's selected Node.

workerd labels identify requested compatibility settings, not an absence of Node APIs. These are local workerd measurements, not deployed Workers latency. Warm-up executes real work before sampling; it does not prove a globally optimal compiler or JIT state.

Browser OS entropy without std uses a harness-selected getrandom JS backend; the product's std feature stays disabled. Reduced and std-only browser builds retain operations that need no entropy. Native results cover this host only; other operating systems and CPU architectures are not measured by this run.

## Common caller jobs

| Lane | plain/base64 | plain/base32 |
| --- | ---: | ---: |
| Reference | ts/node | ts/node |
| ts/node | reference | reference |
| ts/node-22 | 0.92× [?] | 1.1× [?] |
| ts/node-24 | 0.89× [?] | 1× [?] |
| ts/bun | 1.9× [?] | 0.88× [?] |
| ts/deno | 0.83× [?] | 0.92× [?] |
| ts/chromium | 0.78× [?] | 0.83× [?] |
| ts/firefox | 1.2× [?] | 1.3× [?] |
| ts/webkit | 1.3× [?] | 1.4× [?] |
| ts/workerd-web | 0.86× [?] | 0.95× [?] |
| ts/workerd-node-compatible | 0.86× [?] | 0.95× [?] |
| rust/native/release/fast-rng | 0.51× [?] | 0.46× [?] |
| rust/wasm32-wasip1/release/fast-rng | 2.4× [?] | 0.48× [?] |
| rust/wasm32-wasip2/release/fast-rng | 2.2× [?] | 0.45× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/workerd-web | 2.5× [?] | 0.74× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/workerd-node-compatible | 2.4× [?] | 0.7× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/node | 2.5× [?] | 0.62× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/node-22 | 2.2× [?] | 0.77× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/node-24 | 2.6× [?] | 0.72× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/bun | 1.7× [?] | 0.62× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/deno | 2.5× [?] | 0.71× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/chromium | 2.3× [?] | 0.62× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/firefox | 1.9× [?] | 0.92× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/webkit | 1.8× [?] | 0.61× [?] |
| rust/native/release/os-rng | 0.48× [?] | 0.47× [?] |
| rust/wasm32-wasip1/release/os-rng | 2.4× [?] | 0.48× [?] |
| rust/wasm32-wasip2/release/os-rng | 2.3× [?] | 0.5× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/workerd-web | 2.6× [?] | 0.74× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/workerd-node-compatible | 2.5× [?] | 0.68× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/node | 2.5× [?] | 0.6× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/node-22 | 2.4× [?] | 0.76× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/node-24 | 2.5× [?] | 0.73× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/bun | 1.6× [?] | 0.64× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/deno | 2.3× [?] | 0.7× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/chromium | 2.4× [?] | 0.62× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/firefox | 2.1× [?] | 0.96× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/webkit | 1.9× [?] | 0.62× [?] |
| rust/native/release/os-rng-no-std | 0.54× [?] | 0.45× [?] |
| rust/wasm32-wasip1/release/os-rng-no-std | 2.4× [?] | 0.46× [?] |
| rust/wasm32-wasip2/release/os-rng-no-std | 2.2× [?] | 0.48× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-web | 2.2× [?] | 0.67× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-node-compatible | 2.5× [?] | 0.77× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node | 2.4× [?] | 0.59× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node-22 | 2.4× [?] | 0.68× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node-24 | 2.3× [?] | 0.7× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/bun | 1.6× [?] | 0.6× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/deno | 2.4× [?] | 0.72× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/chromium | 2.1× [?] | 0.6× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/firefox | 2× [?] | 0.96× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/webkit | 1.9× [?] | 0.64× [?] |
| rust/native/release/std | 0.51× [?] | 0.48× [?] |
| rust/wasm32-wasip1/release/std | 2.3× [?] | 0.47× [?] |
| rust/wasm32-wasip2/release/std | 2.4× [?] | 0.48× [?] |
| rust/wasm32-unknown-unknown/release/std/workerd-web | 2.3× [?] | 0.73× [?] |
| rust/wasm32-unknown-unknown/release/std/workerd-node-compatible | 2.4× [?] | 0.73× [?] |
| rust/wasm32-unknown-unknown/release/std/node | 2.4× [?] | 0.6× [?] |
| rust/wasm32-unknown-unknown/release/std/node-22 | 2.2× [?] | 0.74× [?] |
| rust/wasm32-unknown-unknown/release/std/node-24 | 2.5× [?] | 0.76× [?] |
| rust/wasm32-unknown-unknown/release/std/bun | 1.8× [?] | 0.6× [?] |
| rust/wasm32-unknown-unknown/release/std/deno | 2.5× [?] | 0.73× [?] |
| rust/wasm32-unknown-unknown/release/std/chromium | 2.6× [?] | 0.63× [?] |
| rust/wasm32-unknown-unknown/release/std/firefox | 1.9× [?] | 0.94× [?] |
| rust/wasm32-unknown-unknown/release/std/webkit | 1.9× [?] | 0.57× [?] |
| rust/native/release/reduced | 0.52× [?] | 0.51× [?] |
| rust/wasm32-wasip1/release/reduced | 2.3× [?] | 0.44× [?] |
| rust/wasm32-wasip2/release/reduced | 2.4× [?] | 0.46× [?] |
| rust/wasm32-unknown-unknown/release/reduced/workerd-web | 2.4× [?] | 0.73× [?] |
| rust/wasm32-unknown-unknown/release/reduced/workerd-node-compatible | 2.4× [?] | 0.73× [?] |
| rust/wasm32-unknown-unknown/release/reduced/node | 2.4× [?] | 0.6× [?] |
| rust/wasm32-unknown-unknown/release/reduced/node-22 | 2.3× [?] | 0.8× [?] |
| rust/wasm32-unknown-unknown/release/reduced/node-24 | 2.5× [?] | 0.77× [?] |
| rust/wasm32-unknown-unknown/release/reduced/bun | 1.7× [?] | 0.61× [?] |
| rust/wasm32-unknown-unknown/release/reduced/deno | 2.3× [?] | 0.7× [?] |
| rust/wasm32-unknown-unknown/release/reduced/chromium | 2.2× [?] | 0.6× [?] |
| rust/wasm32-unknown-unknown/release/reduced/firefox | 2× [?] | 1× [?] |
| rust/wasm32-unknown-unknown/release/reduced/webkit | 1.8× [?] | 0.61× [?] |

## Runtime and control evidence

| Lane | Runtime | SHA-256 prefix | A/A repeat ratio, median [95% interval] |
| --- | --- | --- | --- |
| ts/node | v26.13.0 | 7d1a1eda099f | 1× [?]; plain/base32 |
| ts/node-22 | v22.23.4 | 7d1a1eda099f | 0.97× [?]; plain/base32 |
| ts/node-24 | v24.22.2 | 7d1a1eda099f | 1× [?]; plain/base64 |
| ts/bun | 1.4.4 | f906ae37070c | 0.96× [?]; plain/base64 |
| ts/deno | deno 2.9.8 (stable, release, aarch64-apple-darwin) | b123671cadbc | 0.95× [?]; plain/base64 |
| ts/chromium | 156.0.8078.4 | cedffb48d32b | 1.1× [?]; plain/base64 |
| ts/firefox | 157.0 | cedffb48d32b | 0.95× [?]; plain/base32 |
| ts/webkit | 27.2 | cedffb48d32b | 1× [?]; plain/base32 |
| ts/workerd-web | workerd 2026-11-02 | d1580ff39584 | 1× [?]; plain/base32 |
| ts/workerd-node-compatible | workerd 2026-11-02 | d1580ff39584 | 0.97× [?]; plain/base64 |
| rust/native/release/fast-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13) | 6d5b4cc94e87 | 0.87× [?]; parse/plain/base32 |
| rust/wasm32-wasip1/release/fast-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | f7a6296fb097 | 0.97× [?]; plain/base32 |
| rust/wasm32-wasip2/release/fast-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0; jco 1.39.0 | 3aade3a216a6 | 1.1× [?]; failure/plain/base32 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 80b34e327df4 | 0.98× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | 80b34e327df4 | 1.1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | 80b34e327df4 | 0.95× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | 80b34e327df4 | 0.9× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | 80b34e327df4 | 0.97× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | 80b34e327df4 | 0.8× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | 80b34e327df4 | 0.99× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | 80b34e327df4 | 1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 80b34e327df4 | 0.98× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 80b34e327df4 | 0.98× [?]; transport/plain/base64 |
| rust/wasm32-unknown-unknown/release/fast-rng/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 80b34e327df4 | 1.1× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/fast-rng/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 80b34e327df4 | 0.94× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/fast-rng/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 80b34e327df4 | 1.1× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/fast-rng/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | 80b34e327df4 | 0.95× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/fast-rng/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | 80b34e327df4 | 0.92× [?]; plain/base32 |
| rust/wasm32-unknown-unknown/release/fast-rng/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | 80b34e327df4 | 0.88× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/fast-rng/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | 80b34e327df4 | 0.91× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/fast-rng/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | 80b34e327df4 | 0.94× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/fast-rng/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | 80b34e327df4 | 1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/fast-rng/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | 80b34e327df4 | 0.92× [?]; parse/plain/base64 |
| rust/native/release/os-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13) | 4fe9f1ff3918 | 1.1× [?]; plain/base32 |
| rust/wasm32-wasip1/release/os-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 8760193af15b | 1.1× [?]; failure/plain/base64 |
| rust/wasm32-wasip2/release/os-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0; jco 1.39.0 | 74d8720e079a | 1.1× [?]; plain/base32 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | d6dd04f1362f | 0.96× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | d6dd04f1362f | 1.1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | d6dd04f1362f | 1.2× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | d6dd04f1362f | 1.1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | d6dd04f1362f | 1.1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | d6dd04f1362f | 0.97× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | d6dd04f1362f | 1.1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | d6dd04f1362f | 0.41× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | d6dd04f1362f | 1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | d6dd04f1362f | 1× [?]; transport/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | d6dd04f1362f | 0.95× [?]; plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | d6dd04f1362f | 1× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | d6dd04f1362f | 0.94× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | d6dd04f1362f | 0.95× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | d6dd04f1362f | 0.95× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | d6dd04f1362f | 0.98× [?]; plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | d6dd04f1362f | 0.97× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | d6dd04f1362f | 0.96× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | d6dd04f1362f | 1.1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | d6dd04f1362f | 1.2× [?]; parse/plain/base64 |
| rust/native/release/os-rng-no-std | rustc 1.99.1 (58cf8f9c3 2026-10-13) | f9a2c5e1ebcc | 0.87× [?]; failure/plain/base32 |
| rust/wasm32-wasip1/release/os-rng-no-std | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | e3a8f6c26eb5 | 1.1× [?]; parse/plain/base32 |
| rust/wasm32-wasip2/release/os-rng-no-std | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0; jco 1.39.0 | 95b64cd76a36 | 0.95× [?]; failure/plain/base32 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 92370afee720 | 1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | 92370afee720 | 0.93× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | 92370afee720 | 1.1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | 92370afee720 | 1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | 92370afee720 | 1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | 92370afee720 | 1.1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | 92370afee720 | 1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | 92370afee720 | 0.97× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 92370afee720 | 1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 92370afee720 | 0.94× [?]; transport/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 92370afee720 | 1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 92370afee720 | 1.1× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 92370afee720 | 1.1× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | 92370afee720 | 1.1× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | 92370afee720 | 0.93× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | 92370afee720 | 0.89× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | 92370afee720 | 0.94× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | 92370afee720 | 0.96× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | 92370afee720 | 1.1× [?]; plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | 92370afee720 | 0.9× [?]; failure/plain/base64 |
| rust/native/release/std | rustc 1.99.1 (58cf8f9c3 2026-10-13) | aef44132e1d3 | 1.1× [?]; failure/plain/base32 |
| rust/wasm32-wasip1/release/std | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 7cc493a602a4 | 0.91× [?]; parse/plain/base32 |
| rust/wasm32-wasip2/release/std | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0; jco 1.39.0 | 91bd469099c8 | 1.1× [?]; parse/plain/base32 |
| transport/rust/wasm32-unknown-unknown/release/std/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | c140d4743f3d | 1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/std/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | c140d4743f3d | 1.1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/std/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | c140d4743f3d | 1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/std/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | c140d4743f3d | 1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/std/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | c140d4743f3d | 0.92× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/std/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | c140d4743f3d | 1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/std/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | c140d4743f3d | 1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/std/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | c140d4743f3d | 1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/std/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | c140d4743f3d | 1.1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/std/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | c140d4743f3d | 0.98× [?]; transport/plain/base64 |
| rust/wasm32-unknown-unknown/release/std/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | c140d4743f3d | 1.1× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/std/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | c140d4743f3d | 0.95× [?]; plain/base64 |
| rust/wasm32-unknown-unknown/release/std/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | c140d4743f3d | 0.89× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/std/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | c140d4743f3d | 0.98× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/std/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | c140d4743f3d | 1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/std/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | c140d4743f3d | 1.1× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/std/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | c140d4743f3d | 0.98× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/std/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | c140d4743f3d | 0.92× [?]; plain/base32 |
| rust/wasm32-unknown-unknown/release/std/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | c140d4743f3d | 1× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/std/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | c140d4743f3d | 1.1× [?]; parse/plain/base64 |
| rust/native/release/reduced | rustc 1.99.1 (58cf8f9c3 2026-10-13) | de88acec0f88 | 0.95× [?]; failure/plain/base32 |
| rust/wasm32-wasip1/release/reduced | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 7f8ccafe51aa | 1× [?]; parse/plain/base32 |
| rust/wasm32-wasip2/release/reduced | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0; jco 1.39.0 | 02b2e87d1d8a | 0.92× [?]; failure/plain/base32 |
| transport/rust/wasm32-unknown-unknown/release/reduced/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | ccbc5753c10f | 0.98× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/reduced/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | ccbc5753c10f | 1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/reduced/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | ccbc5753c10f | 0.99× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/reduced/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | ccbc5753c10f | 0.98× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/reduced/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | ccbc5753c10f | 0.98× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/reduced/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | ccbc5753c10f | 0.9× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/reduced/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | ccbc5753c10f | 1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/reduced/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | ccbc5753c10f | 1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/reduced/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | ccbc5753c10f | 1× [?]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/reduced/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | ccbc5753c10f | 1× [?]; transport/plain/base64 |
| rust/wasm32-unknown-unknown/release/reduced/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | ccbc5753c10f | 1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | ccbc5753c10f | 1× [?]; plain/base64 |
| rust/wasm32-unknown-unknown/release/reduced/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | ccbc5753c10f | 0.96× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/reduced/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | ccbc5753c10f | 1.1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | ccbc5753c10f | 0.96× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/reduced/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | ccbc5753c10f | 1.1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | ccbc5753c10f | 0.9× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | ccbc5753c10f | 0.94× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/reduced/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | ccbc5753c10f | 1.1× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/reduced/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | ccbc5753c10f | 1.1× [?]; parse/plain/base32 |
| cross-language/rust-native | rustc 1.99.1 (58cf8f9c3 2026-10-13) | 6d5b4cc94e87 | 0.88× [?]; plain/base32 |
| transport/typescript/node | v26.13.0 | b30084935587 | 1× [?]; transport/plain/base64 |
| transport/native/node-22/napi | Node 22.23.4 | 749b2dfdd42a | 1× [?]; transport/plain/base64 |
| transport/native/node-24/napi | Node 24.22.2 | 749b2dfdd42a | 0.91× [?]; transport/plain/base64 |
| transport/native/node-26/napi | Node 26.13.0 | 749b2dfdd42a | 1× [?]; transport/plain/base64 |
| transport/native/node-26/ffi | Node 26.13.0 | 749b2dfdd42a | 0.89× [?]; transport/plain/base64 |
| transport/native/bun/ffi | Bun 1.4.4 | 749b2dfdd42a | 1.1× [?]; transport/plain/base64 |
| transport/native/bun/napi | Bun 1.4.4 | 749b2dfdd42a | 0.77× [?]; transport/plain/base64 |
| transport/native/deno/napi | Deno 2.9.8 | 749b2dfdd42a | 0.97× [?]; transport/plain/base64 |
| transport/native/deno/ffi | Deno 2.9.8 | 749b2dfdd42a | 1× [?]; transport/plain/base64 |

A/A uses identical artifacts in separate processes. Its worst median displacement exposes unstable jobs; it is not a correction factor. Inspect the retained per-job repeats before attributing a small gap to implementation. Host load can affect implementations differently, so order balancing and controls reduce confounding but cannot remove it.

## TypeScript

| Caller job | Reference | ts/node | ts/node-22 | ts/node-24 | ts/bun | ts/deno | ts/chromium | ts/firefox | ts/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| plain/base32 | ts/node | reference | 1.1× [?] | 1× [?] | 0.88× [?] | 0.92× [?] | 0.83× [?] | 1.3× [?] | 1.4× [?] |
| plain/base64 | ts/node | reference | 0.92× [?] | 0.89× [?] | 1.9× [?] | 0.83× [?] | 0.78× [?] | 1.2× [?] | 1.3× [?] |

## TypeScript workerd

| Caller job | Reference | ts/workerd-web | ts/workerd-node-compatible |
| --- | --- | ---: | ---: |
| plain/base32 | ts/node | 0.95× [?] | 0.95× [?] |
| plain/base64 | ts/node | 0.86× [?] | 0.86× [?] |

## Rust native

| Caller job | Reference | rust/native/release/fast-rng | rust/native/release/os-rng | rust/native/release/os-rng-no-std | rust/native/release/std | rust/native/release/reduced |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | reference | 1× [?] | 1× [?] | 0.98× [?] | 0.97× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | reference | 1× [?] | 1.1× [?] | 0.93× [?] | 0.99× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | reference | 0.99× [?] | 0.97× [?] | 1.2× [?] | 0.99× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | reference | 1× [?] | 1× [?] | 1× [?] | 1× [?] |
| plain/base32 | ts/node | 0.46× [?] | 0.47× [?] | 0.45× [?] | 0.48× [?] | 0.51× [?] |
| plain/base64 | ts/node | 0.51× [?] | 0.48× [?] | 0.54× [?] | 0.51× [?] | 0.52× [?] |

## Rust wasm32-wasip1

| Caller job | Reference | rust/wasm32-wasip1/release/fast-rng | rust/wasm32-wasip1/release/os-rng | rust/wasm32-wasip1/release/os-rng-no-std | rust/wasm32-wasip1/release/std | rust/wasm32-wasip1/release/reduced |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.5× [?] | 1.4× [?] | 1.5× [?] | 1.5× [?] | 1.4× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.5× [?] | 1.4× [?] | 1.4× [?] | 1.5× [?] | 1.4× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1× [?] | 1× [?] | 1.1× [?] | 1× [?] | 1× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.1× [?] | 1× [?] | 1.1× [?] | 1× [?] | 1× [?] |
| plain/base32 | ts/node | 0.48× [?] | 0.48× [?] | 0.46× [?] | 0.47× [?] | 0.44× [?] |
| plain/base64 | ts/node | 2.4× [?] | 2.4× [?] | 2.4× [?] | 2.3× [?] | 2.3× [?] |

## Rust wasm32-wasip2

| Caller job | Reference | rust/wasm32-wasip2/release/fast-rng | rust/wasm32-wasip2/release/os-rng | rust/wasm32-wasip2/release/os-rng-no-std | rust/wasm32-wasip2/release/std | rust/wasm32-wasip2/release/reduced |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.5× [?] | 1.5× [?] | 1.5× [?] | 1.5× [?] | 1.6× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.4× [?] | 1.5× [?] | 1.5× [?] | 1.5× [?] | 1.6× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1× [?] | 1× [?] | 1× [?] | 1× [?] | 1× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 0.97× [?] | 1× [?] | 0.99× [?] | 0.96× [?] | 1× [?] |
| plain/base32 | ts/node | 0.45× [?] | 0.5× [?] | 0.48× [?] | 0.48× [?] | 0.46× [?] |
| plain/base64 | ts/node | 2.2× [?] | 2.3× [?] | 2.2× [?] | 2.4× [?] | 2.4× [?] |

## Per-call transports

### transport/plain/base64

| Lane | Reference | Relative cost |
| --- | --- | ---: |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/node | transport/typescript/node | 2.2× [?] |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/node-22 | transport/typescript/node | 2.7× [?] |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/node-24 | transport/typescript/node | 2.5× [?] |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/bun | transport/typescript/node | 2.2× [?] |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/deno | transport/typescript/node | 4.1× [?] |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/chromium | transport/typescript/node | 3× [?] |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/firefox | transport/typescript/node | 4.4× [?] |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/webkit | transport/typescript/node | 3.1× [?] |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/workerd-web | transport/typescript/node | 2.4× [?] |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/workerd-node-compatible | transport/typescript/node | 2.3× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/node | transport/typescript/node | 2.3× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/node-22 | transport/typescript/node | 2.5× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/node-24 | transport/typescript/node | 0.99× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/bun | transport/typescript/node | 2.3× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/deno | transport/typescript/node | 4.3× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/chromium | transport/typescript/node | 2.9× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/firefox | transport/typescript/node | 4.8× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/webkit | transport/typescript/node | 4.7× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/workerd-web | transport/typescript/node | 2.3× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/workerd-node-compatible | transport/typescript/node | 2.2× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/node | transport/typescript/node | 2.3× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/node-22 | transport/typescript/node | 2.7× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/node-24 | transport/typescript/node | 2.7× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/bun | transport/typescript/node | 2.4× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/deno | transport/typescript/node | 4.2× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/chromium | transport/typescript/node | 2.7× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/firefox | transport/typescript/node | 4.4× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/webkit | transport/typescript/node | 3.1× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-web | transport/typescript/node | 2.4× [?] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-node-compatible | transport/typescript/node | 2.5× [?] |
| transport/rust/wasm32-unknown-unknown/release/std/node | transport/typescript/node | 2.3× [?] |
| transport/rust/wasm32-unknown-unknown/release/std/node-22 | transport/typescript/node | 2.5× [?] |
| transport/rust/wasm32-unknown-unknown/release/std/node-24 | transport/typescript/node | 2.8× [?] |
| transport/rust/wasm32-unknown-unknown/release/std/bun | transport/typescript/node | 2.4× [?] |
| transport/rust/wasm32-unknown-unknown/release/std/deno | transport/typescript/node | 3.9× [?] |
| transport/rust/wasm32-unknown-unknown/release/std/chromium | transport/typescript/node | 2.8× [?] |
| transport/rust/wasm32-unknown-unknown/release/std/firefox | transport/typescript/node | 4.9× [?] |
| transport/rust/wasm32-unknown-unknown/release/std/webkit | transport/typescript/node | 3× [?] |
| transport/rust/wasm32-unknown-unknown/release/std/workerd-web | transport/typescript/node | 2.3× [?] |
| transport/rust/wasm32-unknown-unknown/release/std/workerd-node-compatible | transport/typescript/node | 2.4× [?] |
| transport/rust/wasm32-unknown-unknown/release/reduced/node | transport/typescript/node | 2.3× [?] |
| transport/rust/wasm32-unknown-unknown/release/reduced/node-22 | transport/typescript/node | 2.8× [?] |
| transport/rust/wasm32-unknown-unknown/release/reduced/node-24 | transport/typescript/node | 2.5× [?] |
| transport/rust/wasm32-unknown-unknown/release/reduced/bun | transport/typescript/node | 2.4× [?] |
| transport/rust/wasm32-unknown-unknown/release/reduced/deno | transport/typescript/node | 3.6× [?] |
| transport/rust/wasm32-unknown-unknown/release/reduced/chromium | transport/typescript/node | 2.7× [?] |
| transport/rust/wasm32-unknown-unknown/release/reduced/firefox | transport/typescript/node | 4.4× [?] |
| transport/rust/wasm32-unknown-unknown/release/reduced/webkit | transport/typescript/node | 3.1× [?] |
| transport/rust/wasm32-unknown-unknown/release/reduced/workerd-web | transport/typescript/node | 2.2× [?] |
| transport/rust/wasm32-unknown-unknown/release/reduced/workerd-node-compatible | transport/typescript/node | 2.2× [?] |
| transport/typescript/node | transport/typescript/node | reference |
| transport/native/node-22/napi | transport/typescript/node | 2× [?] |
| transport/native/node-24/napi | transport/typescript/node | 1.9× [?] |
| transport/native/node-26/napi | transport/typescript/node | 2× [?] |
| transport/native/node-26/ffi | transport/typescript/node | 6.8× [?] |
| transport/native/bun/ffi | transport/typescript/node | 1.1× [?] |
| transport/native/bun/napi | transport/typescript/node | 2.3× [?] |
| transport/native/deno/napi | transport/typescript/node | 2× [?] |
| transport/native/deno/ffi | transport/typescript/node | 4.4× [?] |


## Rust browser WASM release/fast-rng

| Caller job | Reference | rust/wasm32-unknown-unknown/release/fast-rng/workerd-web | rust/wasm32-unknown-unknown/release/fast-rng/workerd-node-compatible | rust/wasm32-unknown-unknown/release/fast-rng/node | rust/wasm32-unknown-unknown/release/fast-rng/node-22 | rust/wasm32-unknown-unknown/release/fast-rng/node-24 | rust/wasm32-unknown-unknown/release/fast-rng/bun | rust/wasm32-unknown-unknown/release/fast-rng/deno | rust/wasm32-unknown-unknown/release/fast-rng/chromium | rust/wasm32-unknown-unknown/release/fast-rng/firefox | rust/wasm32-unknown-unknown/release/fast-rng/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.4× [?] | 1.3× [?] | 1.3× [?] | 1.7× [?] | 1.5× [?] | 0.9× [?] | 1.6× [?] | 1.2× [?] | 1.8× [?] | 0.86× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.4× [?] | 1.4× [?] | 1.8× [?] | 1.7× [?] | 0.92× [?] | 1.6× [?] | 1.2× [?] | 1.7× [?] | 0.75× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 0.97× [?] | 1.2× [?] | 0.99× [?] | 1.3× [?] | 1.3× [?] | 1× [?] | 1.4× [?] | 1.2× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1× [?] | 1.1× [?] | 1× [?] | 1.1× [?] | 1.3× [?] | 1× [?] | 1.3× [?] | 1.1× [?] |
| plain/base32 | ts/node | 0.74× [?] | 0.7× [?] | 0.62× [?] | 0.77× [?] | 0.72× [?] | 0.62× [?] | 0.71× [?] | 0.62× [?] | 0.92× [?] | 0.61× [?] |
| plain/base64 | ts/node | 2.5× [?] | 2.4× [?] | 2.5× [?] | 2.2× [?] | 2.6× [?] | 1.7× [?] | 2.5× [?] | 2.3× [?] | 1.9× [?] | 1.8× [?] |

## Rust browser WASM release/os-rng

| Caller job | Reference | rust/wasm32-unknown-unknown/release/os-rng/workerd-web | rust/wasm32-unknown-unknown/release/os-rng/workerd-node-compatible | rust/wasm32-unknown-unknown/release/os-rng/node | rust/wasm32-unknown-unknown/release/os-rng/node-22 | rust/wasm32-unknown-unknown/release/os-rng/node-24 | rust/wasm32-unknown-unknown/release/os-rng/bun | rust/wasm32-unknown-unknown/release/os-rng/deno | rust/wasm32-unknown-unknown/release/os-rng/chromium | rust/wasm32-unknown-unknown/release/os-rng/firefox | rust/wasm32-unknown-unknown/release/os-rng/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.2× [?] | 1.4× [?] | 1.3× [?] | 1.7× [?] | 1.7× [?] | 0.89× [?] | 1.5× [?] | 1.2× [?] | 1.7× [?] | 0.85× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.4× [?] | 1.3× [?] | 1.3× [?] | 1.7× [?] | 1.7× [?] | 0.93× [?] | 1.5× [?] | 1.3× [?] | 1.8× [?] | 0.8× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1× [?] | 1.1× [?] | 1× [?] | 1.3× [?] | 1.2× [?] | 1× [?] | 1.4× [?] | 1.2× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1× [?] | 1.2× [?] | 1× [?] | 1.1× [?] | 1.2× [?] | 0.99× [?] | 1.2× [?] | 1.2× [?] |
| plain/base32 | ts/node | 0.74× [?] | 0.68× [?] | 0.6× [?] | 0.76× [?] | 0.73× [?] | 0.64× [?] | 0.7× [?] | 0.62× [?] | 0.96× [?] | 0.62× [?] |
| plain/base64 | ts/node | 2.6× [?] | 2.5× [?] | 2.5× [?] | 2.4× [?] | 2.5× [?] | 1.6× [?] | 2.3× [?] | 2.4× [?] | 2.1× [?] | 1.9× [?] |

## Rust browser WASM release/os-rng-no-std

| Caller job | Reference | rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-web | rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-node-compatible | rust/wasm32-unknown-unknown/release/os-rng-no-std/node | rust/wasm32-unknown-unknown/release/os-rng-no-std/node-22 | rust/wasm32-unknown-unknown/release/os-rng-no-std/node-24 | rust/wasm32-unknown-unknown/release/os-rng-no-std/bun | rust/wasm32-unknown-unknown/release/os-rng-no-std/deno | rust/wasm32-unknown-unknown/release/os-rng-no-std/chromium | rust/wasm32-unknown-unknown/release/os-rng-no-std/firefox | rust/wasm32-unknown-unknown/release/os-rng-no-std/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.3× [?] | 1.5× [?] | 1.5× [?] | 1.6× [?] | 1.6× [?] | 0.9× [?] | 1.5× [?] | 1.3× [?] | 1.8× [?] | 0.85× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.5× [?] | 1.6× [?] | 1.5× [?] | 1.7× [?] | 1.7× [?] | 0.91× [?] | 1.6× [?] | 1.4× [?] | 1.9× [?] | 0.93× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.2× [?] | 1.3× [?] | 1× [?] | 1.1× [?] | 1× [?] | 1.2× [?] | 1.4× [?] | 1× [?] | 1.3× [?] | 1.1× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1× [?] | 1.1× [?] | 1× [?] | 1.1× [?] | 1.3× [?] | 1× [?] | 1.2× [?] | 0.97× [?] |
| plain/base32 | ts/node | 0.67× [?] | 0.77× [?] | 0.59× [?] | 0.68× [?] | 0.7× [?] | 0.6× [?] | 0.72× [?] | 0.6× [?] | 0.96× [?] | 0.64× [?] |
| plain/base64 | ts/node | 2.2× [?] | 2.5× [?] | 2.4× [?] | 2.4× [?] | 2.3× [?] | 1.6× [?] | 2.4× [?] | 2.1× [?] | 2× [?] | 1.9× [?] |

## Rust browser WASM release/std

| Caller job | Reference | rust/wasm32-unknown-unknown/release/std/workerd-web | rust/wasm32-unknown-unknown/release/std/workerd-node-compatible | rust/wasm32-unknown-unknown/release/std/node | rust/wasm32-unknown-unknown/release/std/node-22 | rust/wasm32-unknown-unknown/release/std/node-24 | rust/wasm32-unknown-unknown/release/std/bun | rust/wasm32-unknown-unknown/release/std/deno | rust/wasm32-unknown-unknown/release/std/chromium | rust/wasm32-unknown-unknown/release/std/firefox | rust/wasm32-unknown-unknown/release/std/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.5× [?] | 1.5× [?] | 1.5× [?] | 1.7× [?] | 1.5× [?] | 0.97× [?] | 1.7× [?] | 1.5× [?] | 1.7× [?] | 0.96× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.7× [?] | 1.5× [?] | 1.6× [?] | 1.8× [?] | 1.7× [?] | 1.1× [?] | 1.6× [?] | 1.5× [?] | 1.6× [?] | 0.9× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1× [?] | 1.1× [?] | 1× [?] | 1.2× [?] | 1.3× [?] | 1× [?] | 1.2× [?] | 1.1× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1× [?] | 1.1× [?] | 1.1× [?] | 1× [?] | 1.3× [?] | 1× [?] | 1.2× [?] | 1.1× [?] |
| plain/base32 | ts/node | 0.73× [?] | 0.73× [?] | 0.6× [?] | 0.74× [?] | 0.76× [?] | 0.6× [?] | 0.73× [?] | 0.63× [?] | 0.94× [?] | 0.57× [?] |
| plain/base64 | ts/node | 2.3× [?] | 2.4× [?] | 2.4× [?] | 2.2× [?] | 2.5× [?] | 1.8× [?] | 2.5× [?] | 2.6× [?] | 1.9× [?] | 1.9× [?] |

## Rust browser WASM release/reduced

| Caller job | Reference | rust/wasm32-unknown-unknown/release/reduced/workerd-web | rust/wasm32-unknown-unknown/release/reduced/workerd-node-compatible | rust/wasm32-unknown-unknown/release/reduced/node | rust/wasm32-unknown-unknown/release/reduced/node-22 | rust/wasm32-unknown-unknown/release/reduced/node-24 | rust/wasm32-unknown-unknown/release/reduced/bun | rust/wasm32-unknown-unknown/release/reduced/deno | rust/wasm32-unknown-unknown/release/reduced/chromium | rust/wasm32-unknown-unknown/release/reduced/firefox | rust/wasm32-unknown-unknown/release/reduced/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.7× [?] | 1.6× [?] | 1.6× [?] | 1.8× [?] | 1.5× [?] | 0.99× [?] | 1.4× [?] | 1.5× [?] | 1.7× [?] | 0.89× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.7× [?] | 1.6× [?] | 1.6× [?] | 1.8× [?] | 1.7× [?] | 0.99× [?] | 1.5× [?] | 1.5× [?] | 1.8× [?] | 0.87× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 0.99× [?] | 1.1× [?] | 1× [?] | 1.3× [?] | 1.4× [?] | 1× [?] | 1.3× [?] | 1.1× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1× [?] | 1.1× [?] | 1× [?] | 1.1× [?] | 1.3× [?] | 1× [?] | 1.2× [?] | 1× [?] |
| plain/base32 | ts/node | 0.73× [?] | 0.73× [?] | 0.6× [?] | 0.8× [?] | 0.77× [?] | 0.61× [?] | 0.7× [?] | 0.6× [?] | 1× [?] | 0.61× [?] |
| plain/base64 | ts/node | 2.4× [?] | 2.4× [?] | 2.4× [?] | 2.3× [?] | 2.5× [?] | 1.7× [?] | 2.3× [?] | 2.2× [?] | 2× [?] | 1.8× [?] |

## Cross-language anchor

| Caller job | Reference | cross-language/rust-native |
| --- | --- | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | uncompared |
| failure/plain/base64 | rust/native/release/fast-rng | uncompared |
| parse/plain/base32 | rust/native/release/fast-rng | uncompared |
| parse/plain/base64 | rust/native/release/fast-rng | uncompared |
| plain/base32 | ts/node | 0.46× [?] |
| plain/base64 | ts/node | 0.51× [?] |
