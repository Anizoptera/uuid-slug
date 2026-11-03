# Implementation comparisons

Raw observations: [JSON Lines](implementations-evidence-ai3kHf/observations.jsonl)

Captured 2026-11-03T00:09:08.855Z; revision `3dca806ec89b65deb50eb7a44ce4c94fe7a45ee7`; host darwin/arm64; Apple M4 Max.

**Wiring check only. These samples are not performance evidence.**

Requested reference: `ts/node`. Each job names its actual reference: the requested lane when available, otherwise Node, native release Rust, then another connected measured lane. Each comparison runs reference/candidate/candidate/reference or the reverse. Lane order within each block and each window's orientation were independently randomized before timing. Ratios combine the two neighboring pairs geometrically. Native Rust connects to Node only through a matching artifact, version record and ordered workload. 1 fresh-process blocks, 1 batches per process. A missing interval is unresolved. Retained JSON Lines keep every batch and acquisition order.

Rust application rows time complete compiled calls with result consumption in the native or WASM loop; they exclude a JS crossing per identifier. JS rows include their result witness and errors-as-values checks. Rust owns fixed-array values where JavaScript owns heap arrays. These are consumer-path comparisons, not isolated language or compiler effects. No overall winner is calculated.

JavaScript graphs are warmed and minified. Rust uses release optimization level 3, ThinLTO and one code-generation unit, with native CPU tuning for this machine; WASM then uses the maintained Binaryen O2 pipeline. Debug and disabled-JIT runs are excluded. Browser workers use cross-origin isolation. “Unavailable” means no measured result for that job in the lane; it does not establish missing API support. “Uncompared” means a measured result lacks a connection to the reference under matching conditions. Neither means zero cost. Installed Node patches are represented by the newest installed patch per major plus the checkout's selected Node.

workerd labels identify requested compatibility settings, not an absence of Node APIs. These are local workerd measurements, not deployed Workers latency. Warm-up executes real work before sampling; it does not prove a globally optimal compiler or JIT state.

Browser OS entropy without std uses a harness-selected getrandom JS backend; the product's std feature stays disabled. Reduced and std-only browser builds retain operations that need no entropy. Native results cover this host only; other operating systems and CPU architectures are not measured by this run.

## Common caller jobs

| Lane | plain/base64 | plain/base32 |
| --- | ---: | ---: |
| Reference | ts/node | ts/node |
| ts/node | reference | reference |
| ts/node-22 | 1.1× [?] | 1.1× [?] |
| ts/node-24 | 1.1× [?] | 1× [?] |
| ts/bun | 2.2× [?] | 0.89× [?] |
| ts/deno | 1× [?] | 0.9× [?] |
| ts/chromium | 0.84× [?] | 0.82× [?] |
| ts/firefox | 1.6× [?] | 1.4× [?] |
| ts/webkit | 1.5× [?] | 1.4× [?] |
| ts/workerd-web | 1× [?] | 0.94× [?] |
| ts/workerd-node-compatible | 0.91× [?] | 0.96× [?] |
| rust/native/release/fast-rng | 0.58× [?] | 0.45× [?] |
| rust/wasm32-wasip1/release/fast-rng | 2.7× [?] | 0.41× [?] |
| rust/wasm32-wasip2/release/fast-rng | 2.8× [?] | 0.47× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/workerd-web | 2.8× [?] | 0.72× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/workerd-node-compatible | 2.9× [?] | 0.72× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/node | 2.8× [?] | 0.58× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/node-22 | 2.6× [?] | 0.73× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/node-24 | 2.8× [?] | 0.75× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/bun | 1.9× [?] | 0.62× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/deno | 2.8× [?] | 0.71× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/chromium | 2.7× [?] | 0.6× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/firefox | 2.4× [?] | 0.99× [?] |
| rust/wasm32-unknown-unknown/release/fast-rng/webkit | 2.2× [?] | 0.6× [?] |
| rust/native/release/os-rng | 0.63× [?] | 0.41× [?] |
| rust/wasm32-wasip1/release/os-rng | 2.8× [?] | 0.47× [?] |
| rust/wasm32-wasip2/release/os-rng | 2.7× [?] | 0.46× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/workerd-web | 2.7× [?] | 0.72× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/workerd-node-compatible | 2.9× [?] | 0.72× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/node | 2.9× [?] | 0.62× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/node-22 | 2.8× [?] | 0.73× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/node-24 | 2.8× [?] | 0.73× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/bun | 1.9× [?] | 0.58× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/deno | 2.6× [?] | 0.69× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/chromium | 2.7× [?] | 0.59× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/firefox | 2.4× [?] | 1× [?] |
| rust/wasm32-unknown-unknown/release/os-rng/webkit | 2.1× [?] | 0.62× [?] |
| rust/native/release/os-rng-no-std | 0.57× [?] | 0.46× [?] |
| rust/wasm32-wasip1/release/os-rng-no-std | 2.6× [?] | 0.46× [?] |
| rust/wasm32-wasip2/release/os-rng-no-std | 2.7× [?] | 0.46× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-web | 2.9× [?] | 0.77× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-node-compatible | 2.9× [?] | 0.69× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node | 2.8× [?] | 0.58× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node-22 | 2.6× [?] | 0.79× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node-24 | 2.9× [?] | 0.73× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/bun | 1.8× [?] | 0.58× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/deno | 2.7× [?] | 0.7× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/chromium | 2.7× [?] | 0.6× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/firefox | 2× [?] | 0.87× [?] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/webkit | 2.1× [?] | 0.6× [?] |
| rust/native/release/std | 0.62× [?] | 0.43× [?] |
| rust/wasm32-wasip1/release/std | 2.6× [?] | 0.43× [?] |
| rust/wasm32-wasip2/release/std | 2.8× [?] | 0.47× [?] |
| rust/wasm32-unknown-unknown/release/std/workerd-web | 2.8× [?] | 0.75× [?] |
| rust/wasm32-unknown-unknown/release/std/workerd-node-compatible | 2.8× [?] | 0.71× [?] |
| rust/wasm32-unknown-unknown/release/std/node | 2.8× [?] | 0.61× [?] |
| rust/wasm32-unknown-unknown/release/std/node-22 | 2.5× [?] | 0.74× [?] |
| rust/wasm32-unknown-unknown/release/std/node-24 | 2.8× [?] | 0.7× [?] |
| rust/wasm32-unknown-unknown/release/std/bun | 2× [?] | 0.61× [?] |
| rust/wasm32-unknown-unknown/release/std/deno | 2.9× [?] | 0.7× [?] |
| rust/wasm32-unknown-unknown/release/std/chromium | 2.6× [?] | 0.61× [?] |
| rust/wasm32-unknown-unknown/release/std/firefox | 2.3× [?] | 1× [?] |
| rust/wasm32-unknown-unknown/release/std/webkit | 2.2× [?] | 0.55× [?] |
| rust/native/release/reduced | 0.64× [?] | 0.44× [?] |
| rust/wasm32-wasip1/release/reduced | 2.8× [?] | 0.45× [?] |
| rust/wasm32-wasip2/release/reduced | 2.8× [?] | 0.44× [?] |
| rust/wasm32-unknown-unknown/release/reduced/workerd-web | 2.8× [?] | 0.74× [?] |
| rust/wasm32-unknown-unknown/release/reduced/workerd-node-compatible | 2.8× [?] | 0.69× [?] |
| rust/wasm32-unknown-unknown/release/reduced/node | 2.9× [?] | 0.61× [?] |
| rust/wasm32-unknown-unknown/release/reduced/node-22 | 2.6× [?] | 0.75× [?] |
| rust/wasm32-unknown-unknown/release/reduced/node-24 | 2.9× [?] | 0.68× [?] |
| rust/wasm32-unknown-unknown/release/reduced/bun | 2.1× [?] | 0.48× [?] |
| rust/wasm32-unknown-unknown/release/reduced/deno | 2.7× [?] | 0.7× [?] |
| rust/wasm32-unknown-unknown/release/reduced/chromium | 2.6× [?] | 0.6× [?] |
| rust/wasm32-unknown-unknown/release/reduced/firefox | 2.3× [?] | 0.98× [?] |
| rust/wasm32-unknown-unknown/release/reduced/webkit | 2.2× [?] | 0.63× [?] |

## Runtime and control evidence

| Lane | Runtime | SHA-256 prefix | A/A repeat ratio, median [95% interval] |
| --- | --- | --- | --- |
| ts/node | v26.13.0 | ac0e4daf0235 | 1.2× [?]; plain/base64 |
| ts/node-22 | v22.23.4 | ac0e4daf0235 | 0.91× [?]; plain/base32 |
| ts/node-24 | v24.22.2 | ac0e4daf0235 | 0.94× [?]; plain/base64 |
| ts/bun | 1.4.4 | 22317a289bfd | 1.1× [?]; plain/base64 |
| ts/deno | deno 2.9.8 (stable, release, aarch64-apple-darwin) | 84a34ac6ed8d | 1.2× [?]; plain/base64 |
| ts/chromium | 156.0.8078.4 | 8d725769f832 | 0.93× [?]; plain/base64 |
| ts/firefox | 157.0 | 8d725769f832 | 0.98× [?]; plain/base32 |
| ts/webkit | 27.2 | 8d725769f832 | 0.94× [?]; plain/base64 |
| ts/workerd-web | workerd 2026-11-02 | 98d317bcde62 | 1× [?]; plain/base64 |
| ts/workerd-node-compatible | workerd 2026-11-02 | 98d317bcde62 | 0.98× [?]; plain/base64 |
| rust/native/release/fast-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13) | 817ced0edfa1 | 0.88× [?]; plain/base32 |
| rust/wasm32-wasip1/release/fast-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 9d054b3e082e | 0.96× [?]; failure/plain/base32 |
| rust/wasm32-wasip2/release/fast-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: jco | b906fdda8202 | 0.94× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/fast-rng/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 024f5cabb6c1 | 0.97× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/fast-rng/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 024f5cabb6c1 | 0.91× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/fast-rng/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 024f5cabb6c1 | 1.1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/fast-rng/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | 024f5cabb6c1 | 1.2× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/fast-rng/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | 024f5cabb6c1 | 1.1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/fast-rng/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | 024f5cabb6c1 | 0.93× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/fast-rng/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | 024f5cabb6c1 | 0.93× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/fast-rng/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | 024f5cabb6c1 | 0.94× [?]; plain/base64 |
| rust/wasm32-unknown-unknown/release/fast-rng/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | 024f5cabb6c1 | 0.94× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/fast-rng/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | 024f5cabb6c1 | 0.89× [?]; parse/plain/base64 |
| rust/native/release/os-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13) | 3786227bbb63 | 1.1× [?]; plain/base32 |
| rust/wasm32-wasip1/release/os-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 83554357b2b4 | 1.1× [?]; failure/plain/base64 |
| rust/wasm32-wasip2/release/os-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: jco | 70ca4a88c6cf | 1.1× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | af1fb858753b | 1× [?]; plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | af1fb858753b | 1× [?]; plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | af1fb858753b | 0.93× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | af1fb858753b | 1.1× [?]; plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | af1fb858753b | 0.78× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | af1fb858753b | 0.86× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | af1fb858753b | 0.9× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | af1fb858753b | 1.1× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | af1fb858753b | 1.1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | af1fb858753b | 0.87× [?]; parse/plain/base64 |
| rust/native/release/os-rng-no-std | rustc 1.99.1 (58cf8f9c3 2026-10-13) | b7958489ef67 | 1.1× [?]; failure/plain/base32 |
| rust/wasm32-wasip1/release/os-rng-no-std | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 86e975d8cbd9 | 0.94× [?]; parse/plain/base32 |
| rust/wasm32-wasip2/release/os-rng-no-std | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: jco | d94680c8cf20 | 0.9× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 695bb3b85f28 | 0.95× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 695bb3b85f28 | 0.95× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 695bb3b85f28 | 1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | 695bb3b85f28 | 0.86× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | 695bb3b85f28 | 1.1× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | 695bb3b85f28 | 0.97× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | 695bb3b85f28 | 0.89× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | 695bb3b85f28 | 0.93× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | 695bb3b85f28 | 0.96× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | 695bb3b85f28 | 0.83× [?]; parse/plain/base32 |
| rust/native/release/std | rustc 1.99.1 (58cf8f9c3 2026-10-13) | 9c51f5ba531c | 0.89× [?]; failure/plain/base64 |
| rust/wasm32-wasip1/release/std | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 1cc13cf14017 | 1.1× [?]; plain/base32 |
| rust/wasm32-wasip2/release/std | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: jco | 7c3ac1149e39 | 1.1× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/std/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 94d23ed6ad55 | 1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/std/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 94d23ed6ad55 | 1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/std/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 94d23ed6ad55 | 0.95× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/std/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | 94d23ed6ad55 | 0.96× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/std/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | 94d23ed6ad55 | 0.97× [?]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/std/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | 94d23ed6ad55 | 1.1× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/std/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | 94d23ed6ad55 | 0.94× [?]; plain/base64 |
| rust/wasm32-unknown-unknown/release/std/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | 94d23ed6ad55 | 0.91× [?]; plain/base32 |
| rust/wasm32-unknown-unknown/release/std/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | 94d23ed6ad55 | 0.95× [?]; plain/base64 |
| rust/wasm32-unknown-unknown/release/std/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | 94d23ed6ad55 | 0.85× [?]; parse/plain/base64 |
| rust/native/release/reduced | rustc 1.99.1 (58cf8f9c3 2026-10-13) | 749739da088a | 1.1× [?]; failure/plain/base64 |
| rust/wasm32-wasip1/release/reduced | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 2dd7a2d9de29 | 0.97× [?]; parse/plain/base64 |
| rust/wasm32-wasip2/release/reduced | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: jco | 6dc83811ed54 | 0.93× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 6b3d48a1f3ec | 1.1× [?]; parse/plain/base64 |
| rust/wasm32-unknown-unknown/release/reduced/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 6b3d48a1f3ec | 0.97× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 6b3d48a1f3ec | 0.91× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | 6b3d48a1f3ec | 1.1× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | 6b3d48a1f3ec | 0.96× [?]; plain/base64 |
| rust/wasm32-unknown-unknown/release/reduced/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | 6b3d48a1f3ec | 1.2× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | 6b3d48a1f3ec | 1.1× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | 6b3d48a1f3ec | 0.88× [?]; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | 6b3d48a1f3ec | 1.1× [?]; failure/plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | 6b3d48a1f3ec | 0.96× [?]; failure/plain/base32 |
| cross-language/rust-native | rustc 1.99.1 (58cf8f9c3 2026-10-13) | 817ced0edfa1 | 1.2× [?]; failure/plain/base64 |

A/A uses identical artifacts in separate processes. Its worst median displacement exposes unstable jobs; it is not a correction factor. Inspect the retained per-job repeats before attributing a small gap to implementation. Host load can affect implementations differently, so order balancing and controls reduce confounding but cannot remove it.

## TypeScript

| Caller job | Reference | ts/node | ts/node-22 | ts/node-24 | ts/bun | ts/deno | ts/chromium | ts/firefox | ts/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| plain/base32 | ts/node | reference | 1.1× [?] | 1× [?] | 0.89× [?] | 0.9× [?] | 0.82× [?] | 1.4× [?] | 1.4× [?] |
| plain/base64 | ts/node | reference | 1.1× [?] | 1.1× [?] | 2.2× [?] | 1× [?] | 0.84× [?] | 1.6× [?] | 1.5× [?] |

## TypeScript workerd

| Caller job | Reference | ts/workerd-web | ts/workerd-node-compatible |
| --- | --- | ---: | ---: |
| plain/base32 | ts/node | 0.94× [?] | 0.96× [?] |
| plain/base64 | ts/node | 1× [?] | 0.91× [?] |

## Rust native

| Caller job | Reference | rust/native/release/fast-rng | rust/native/release/os-rng | rust/native/release/os-rng-no-std | rust/native/release/std | rust/native/release/reduced |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | reference | 1× [?] | 1× [?] | 0.97× [?] | 0.95× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | reference | 0.99× [?] | 1× [?] | 0.96× [?] | 1× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | reference | 0.99× [?] | 0.97× [?] | 1.2× [?] | 0.97× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | reference | 1× [?] | 0.97× [?] | 0.99× [?] | 1× [?] |
| plain/base32 | ts/node | 0.45× [?] | 0.41× [?] | 0.46× [?] | 0.43× [?] | 0.44× [?] |
| plain/base64 | ts/node | 0.58× [?] | 0.63× [?] | 0.57× [?] | 0.62× [?] | 0.64× [?] |

## Rust wasm32-wasip1

| Caller job | Reference | rust/wasm32-wasip1/release/fast-rng | rust/wasm32-wasip1/release/os-rng | rust/wasm32-wasip1/release/os-rng-no-std | rust/wasm32-wasip1/release/std | rust/wasm32-wasip1/release/reduced |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.4× [?] | 1.5× [?] | 1.5× [?] | 1.5× [?] | 1.4× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.4× [?] | 1.5× [?] | 1.5× [?] | 1.4× [?] | 1.4× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1× [?] | 1× [?] | 0.99× [?] | 0.91× [?] | 1× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 1× [?] | 1× [?] | 1× [?] | 1× [?] | 1× [?] |
| plain/base32 | ts/node | 0.41× [?] | 0.47× [?] | 0.46× [?] | 0.43× [?] | 0.45× [?] |
| plain/base64 | ts/node | 2.7× [?] | 2.8× [?] | 2.6× [?] | 2.6× [?] | 2.8× [?] |

## Rust wasm32-wasip2

| Caller job | Reference | rust/wasm32-wasip2/release/fast-rng | rust/wasm32-wasip2/release/os-rng | rust/wasm32-wasip2/release/os-rng-no-std | rust/wasm32-wasip2/release/std | rust/wasm32-wasip2/release/reduced |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.5× [?] | 1.6× [?] | 1.5× [?] | 1.4× [?] | 1.4× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.5× [?] | 1.5× [?] | 1.5× [?] | 1.4× [?] | 1.5× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 0.95× [?] | 0.99× [?] | 0.98× [?] | 0.99× [?] | 1× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 0.96× [?] | 0.98× [?] | 0.95× [?] | 1× [?] | 0.96× [?] |
| plain/base32 | ts/node | 0.47× [?] | 0.46× [?] | 0.46× [?] | 0.47× [?] | 0.44× [?] |
| plain/base64 | ts/node | 2.8× [?] | 2.7× [?] | 2.7× [?] | 2.8× [?] | 2.8× [?] |

## Rust browser WASM release/fast-rng

| Caller job | Reference | rust/wasm32-unknown-unknown/release/fast-rng/workerd-web | rust/wasm32-unknown-unknown/release/fast-rng/workerd-node-compatible | rust/wasm32-unknown-unknown/release/fast-rng/node | rust/wasm32-unknown-unknown/release/fast-rng/node-22 | rust/wasm32-unknown-unknown/release/fast-rng/node-24 | rust/wasm32-unknown-unknown/release/fast-rng/bun | rust/wasm32-unknown-unknown/release/fast-rng/deno | rust/wasm32-unknown-unknown/release/fast-rng/chromium | rust/wasm32-unknown-unknown/release/fast-rng/firefox | rust/wasm32-unknown-unknown/release/fast-rng/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.3× [?] | 1.4× [?] | 1.3× [?] | 1.8× [?] | 1.6× [?] | 0.96× [?] | 1.5× [?] | 1.3× [?] | 1.7× [?] | 0.83× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.4× [?] | 1.3× [?] | 1.6× [?] | 1.7× [?] | 0.89× [?] | 1.6× [?] | 1.3× [?] | 1.7× [?] | 0.88× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1× [?] | 1.1× [?] | 1× [?] | 1.2× [?] | 1.2× [?] | 0.99× [?] | 1.4× [?] | 1.2× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1× [?] | 1.1× [?] | 1.1× [?] | 0.97× [?] | 1.3× [?] | 1× [?] | 1.2× [?] | 1.1× [?] |
| plain/base32 | ts/node | 0.72× [?] | 0.72× [?] | 0.58× [?] | 0.73× [?] | 0.75× [?] | 0.62× [?] | 0.71× [?] | 0.6× [?] | 0.99× [?] | 0.6× [?] |
| plain/base64 | ts/node | 2.8× [?] | 2.9× [?] | 2.8× [?] | 2.6× [?] | 2.8× [?] | 1.9× [?] | 2.8× [?] | 2.7× [?] | 2.4× [?] | 2.2× [?] |

## Rust browser WASM release/os-rng

| Caller job | Reference | rust/wasm32-unknown-unknown/release/os-rng/workerd-web | rust/wasm32-unknown-unknown/release/os-rng/workerd-node-compatible | rust/wasm32-unknown-unknown/release/os-rng/node | rust/wasm32-unknown-unknown/release/os-rng/node-22 | rust/wasm32-unknown-unknown/release/os-rng/node-24 | rust/wasm32-unknown-unknown/release/os-rng/bun | rust/wasm32-unknown-unknown/release/os-rng/deno | rust/wasm32-unknown-unknown/release/os-rng/chromium | rust/wasm32-unknown-unknown/release/os-rng/firefox | rust/wasm32-unknown-unknown/release/os-rng/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1.2× [?] | 1.8× [?] | 1.6× [?] | 0.84× [?] | 1.5× [?] | 1.3× [?] | 1.7× [?] | 0.92× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.4× [?] | 1.4× [?] | 1.3× [?] | 1.7× [?] | 1.8× [?] | 0.92× [?] | 1.4× [?] | 1.4× [?] | 1.7× [?] | 0.94× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.3× [?] | 1.2× [?] | 1.1× [?] | 1.1× [?] | 1× [?] | 1.2× [?] | 1.3× [?] | 1× [?] | 1.4× [?] | 1.1× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 0.99× [?] | 1.1× [?] | 1.2× [?] | 1.1× [?] | 1.3× [?] | 1× [?] | 1.2× [?] | 1× [?] |
| plain/base32 | ts/node | 0.72× [?] | 0.72× [?] | 0.62× [?] | 0.73× [?] | 0.73× [?] | 0.58× [?] | 0.69× [?] | 0.59× [?] | 1× [?] | 0.62× [?] |
| plain/base64 | ts/node | 2.7× [?] | 2.9× [?] | 2.9× [?] | 2.8× [?] | 2.8× [?] | 1.9× [?] | 2.6× [?] | 2.7× [?] | 2.4× [?] | 2.1× [?] |

## Rust browser WASM release/os-rng-no-std

| Caller job | Reference | rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-web | rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-node-compatible | rust/wasm32-unknown-unknown/release/os-rng-no-std/node | rust/wasm32-unknown-unknown/release/os-rng-no-std/node-22 | rust/wasm32-unknown-unknown/release/os-rng-no-std/node-24 | rust/wasm32-unknown-unknown/release/os-rng-no-std/bun | rust/wasm32-unknown-unknown/release/os-rng-no-std/deno | rust/wasm32-unknown-unknown/release/os-rng-no-std/chromium | rust/wasm32-unknown-unknown/release/os-rng-no-std/firefox | rust/wasm32-unknown-unknown/release/os-rng-no-std/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.5× [?] | 1.5× [?] | 1.4× [?] | 1.8× [?] | 1.7× [?] | 0.94× [?] | 1.6× [?] | 1.3× [?] | 1.7× [?] | 0.91× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.5× [?] | 1.6× [?] | 1.5× [?] | 1.8× [?] | 1.7× [?] | 0.94× [?] | 1.6× [?] | 1.5× [?] | 1.8× [?] | 0.91× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1.1× [?] | 1.1× [?] | 1.1× [?] | 1.3× [?] | 1.4× [?] | 0.95× [?] | 1.3× [?] | 1.2× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1× [?] | 1.1× [?] | 1× [?] | 1.1× [?] | 1.3× [?] | 1× [?] | 1.2× [?] | 1× [?] |
| plain/base32 | ts/node | 0.77× [?] | 0.69× [?] | 0.58× [?] | 0.79× [?] | 0.73× [?] | 0.58× [?] | 0.7× [?] | 0.6× [?] | 0.87× [?] | 0.6× [?] |
| plain/base64 | ts/node | 2.9× [?] | 2.9× [?] | 2.8× [?] | 2.6× [?] | 2.9× [?] | 1.8× [?] | 2.7× [?] | 2.7× [?] | 2× [?] | 2.1× [?] |

## Rust browser WASM release/std

| Caller job | Reference | rust/wasm32-unknown-unknown/release/std/workerd-web | rust/wasm32-unknown-unknown/release/std/workerd-node-compatible | rust/wasm32-unknown-unknown/release/std/node | rust/wasm32-unknown-unknown/release/std/node-22 | rust/wasm32-unknown-unknown/release/std/node-24 | rust/wasm32-unknown-unknown/release/std/bun | rust/wasm32-unknown-unknown/release/std/deno | rust/wasm32-unknown-unknown/release/std/chromium | rust/wasm32-unknown-unknown/release/std/firefox | rust/wasm32-unknown-unknown/release/std/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.6× [?] | 1.5× [?] | 1.6× [?] | 1.7× [?] | 1.5× [?] | 1× [?] | 1.6× [?] | 1.4× [?] | 1.6× [?] | 0.9× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.6× [?] | 1.6× [?] | 1.7× [?] | 1.7× [?] | 1.7× [?] | 0.91× [?] | 1.5× [?] | 1.5× [?] | 1.7× [?] | 0.78× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 1× [?] | 1.1× [?] | 1× [?] | 1.2× [?] | 1.4× [?] | 0.97× [?] | 1.3× [?] | 1.2× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 0.98× [?] | 1.1× [?] | 1× [?] | 1.1× [?] | 1.3× [?] | 1× [?] | 1.2× [?] | 1× [?] |
| plain/base32 | ts/node | 0.75× [?] | 0.71× [?] | 0.61× [?] | 0.74× [?] | 0.7× [?] | 0.61× [?] | 0.7× [?] | 0.61× [?] | 1× [?] | 0.55× [?] |
| plain/base64 | ts/node | 2.8× [?] | 2.8× [?] | 2.8× [?] | 2.5× [?] | 2.8× [?] | 2× [?] | 2.9× [?] | 2.6× [?] | 2.3× [?] | 2.2× [?] |

## Rust browser WASM release/reduced

| Caller job | Reference | rust/wasm32-unknown-unknown/release/reduced/workerd-web | rust/wasm32-unknown-unknown/release/reduced/workerd-node-compatible | rust/wasm32-unknown-unknown/release/reduced/node | rust/wasm32-unknown-unknown/release/reduced/node-22 | rust/wasm32-unknown-unknown/release/reduced/node-24 | rust/wasm32-unknown-unknown/release/reduced/bun | rust/wasm32-unknown-unknown/release/reduced/deno | rust/wasm32-unknown-unknown/release/reduced/chromium | rust/wasm32-unknown-unknown/release/reduced/firefox | rust/wasm32-unknown-unknown/release/reduced/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | 1.5× [?] | 1.5× [?] | 1.5× [?] | 1.7× [?] | 1.6× [?] | 0.84× [?] | 1.8× [?] | 1.5× [?] | 1.8× [?] | 0.98× [?] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.5× [?] | 1.6× [?] | 1.6× [?] | 1.8× [?] | 1.6× [?] | 0.94× [?] | 1.7× [?] | 1.4× [?] | 1.8× [?] | 0.9× [?] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 0.99× [?] | 1.2× [?] | 1× [?] | 1.2× [?] | 1.3× [?] | 1× [?] | 1.3× [?] | 1.2× [?] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [?] | 1.3× [?] | 0.99× [?] | 1.1× [?] | 1× [?] | 1.1× [?] | 1.3× [?] | 1× [?] | 1.3× [?] | 1.1× [?] |
| plain/base32 | ts/node | 0.74× [?] | 0.69× [?] | 0.61× [?] | 0.75× [?] | 0.68× [?] | 0.48× [?] | 0.7× [?] | 0.6× [?] | 0.98× [?] | 0.63× [?] |
| plain/base64 | ts/node | 2.8× [?] | 2.8× [?] | 2.9× [?] | 2.6× [?] | 2.9× [?] | 2.1× [?] | 2.7× [?] | 2.6× [?] | 2.3× [?] | 2.2× [?] |

## Cross-language anchor

| Caller job | Reference | cross-language/rust-native |
| --- | --- | ---: |
| failure/plain/base32 | rust/native/release/fast-rng | uncompared |
| failure/plain/base64 | rust/native/release/fast-rng | uncompared |
| parse/plain/base32 | rust/native/release/fast-rng | uncompared |
| parse/plain/base64 | rust/native/release/fast-rng | uncompared |
| plain/base32 | ts/node | 0.45× [?] |
| plain/base64 | ts/node | 0.58× [?] |
