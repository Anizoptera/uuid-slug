# Implementation comparisons

Raw observations: [JSON Lines](implementations-evidence-KUGmn1/observations.jsonl.gz)

Raw evidence is local and untracked. Another checkout needs the retained file to regenerate this report.

Captured 2026-11-03T08:53:40.077Z; revision `9bf2d288b058c21297d311261d6d498617790c43`; host darwin/arm64; Apple M4 Max.

Collection resumed from 2026-11-03T04:08:55.396Z at revision `fe014c063e6ce98ff51e29e14f47fe48b9416609`. Complete four-process windows were reused after collector, artifact, runtime and host checks; the interrupted window was reacquired. A pause can change host conditions, so common-distribution assumptions remain conditional.

Relative batch cost: smaller is faster. Brackets are distribution-free 95% intervals for the median of paired fresh-process ratios, conditional on independent blocks drawn from a common comparison distribution. They are not per-call latency percentiles or simultaneous confidence across the whole report.

Raw captures retain execution-time host versions and native transport selections where available; other versions come from the selected executable or compiler records.

Requested reference: `ts/node`. Each job names its actual reference: the requested lane when available, otherwise Node, native release Rust, a measured component root, then another connected measured lane. Each comparison runs reference/candidate/candidate/reference or the reverse. Lane order within each block and each window's orientation were independently randomized before timing. Ratios combine the two neighboring pairs geometrically. Native Rust connects to Node only through a matching artifact, version record and ordered workload. 6 fresh-process blocks, 7 batches per process. A missing interval is unresolved. Retained JSON Lines keep every batch and acquisition order.

Rust application rows time complete compiled calls with result consumption in the native or WASM loop; they exclude a JS crossing per identifier. JS rows include their result witness and errors-as-values checks. Rust owns fixed-array values where JavaScript owns heap arrays. These are consumer-path comparisons, not isolated language or compiler effects. No overall winner is calculated.

Per-call transport rows include one real native or WebAssembly crossing for each UUID, text parsing and owned base64url string output, checked against the same JavaScript text-to-slug job. They exclude JSON dispatch. Native libraries and WASM bindings are development-only and are not shipped in the npm package; Bun prefers FFI and Node prefers Node-API. Forced alternative rows measure fallback capabilities, not a recommendation to change those defaults.

JavaScript graphs are warmed and minified. Rust uses release optimization level 3, ThinLTO and one code-generation unit, with native CPU tuning for this machine; WASM then uses the maintained Binaryen O2 pipeline. Debug and disabled-JIT runs are excluded. Browser workers use cross-origin isolation. “Unavailable” means no measured result for that job in the lane; it does not establish missing API support. “Uncompared” means a measured result lacks a connection to the reference under matching conditions. Neither means zero cost. Installed Node patches are represented by the newest installed patch per major plus the checkout's selected Node.

workerd labels identify requested compatibility settings, not an absence of Node APIs. These are local workerd measurements, not deployed Workers latency. Warm-up executes real work before sampling; it does not prove a globally optimal compiler or JIT state.

Browser OS entropy without std uses a harness-selected getrandom JS backend; the product's std feature stays disabled. Reduced and std-only browser builds retain operations that need no entropy. Native results cover this host only; other operating systems and CPU architectures are not measured by this run.

## Common caller jobs

| Lane | generation/v7/text | plain/base64 | plain/base32 | mask/binary/owned | unmask/binary/owned |
| --- | ---: | ---: | ---: | ---: | ---: |
| Reference | ts/node | ts/node | ts/node | ts/node | ts/node |
| ts/node | reference | reference | reference | reference | reference |
| ts/node-22 | 1× [0.98–1] unresolved | 0.95× [0.94–1] | 1× [0.99–1] unresolved | 0.96× [0.93–0.99] | 1.1× [1–1.1] |
| ts/node-24 | 0.99× [0.99–1] unresolved | 0.93× [0.92–0.95] | 0.95× [0.93–0.99] | 0.95× [0.93–1] unresolved | 0.96× [0.94–1] unresolved |
| ts/bun | 0.81× [0.57–0.86] | 0.89× [0.86–1.2] unresolved | 0.8× [0.76–0.88] | 0.79× [0.75–0.89] | 0.74× [0.62–0.85] |
| ts/deno | 1× [0.96–1] unresolved | 0.97× [0.89–0.99] | 0.96× [0.91–1] unresolved | 1.6× [1.5–1.8] | 1.6× [1.4–1.7] |
| ts/chromium | 0.95× [0.92–0.97] | 0.86× [0.82–0.87] | 0.87× [0.86–0.88] | 0.98× [0.98–1] | 1× [1–1] |
| ts/firefox | 1.3× [1.1–1.4] | 1.2× [0.83–1.2] unresolved | 1.3× [1–2] | 1.9× [1.1–2] | 1.7× [1.1–1.8] |
| ts/webkit | 1.1× [0.62–1.1] unresolved | 1.2× [1–1.2] | 1.2× [0.97–1.2] unresolved | 0.81× [0.53–0.82] | 0.77× [0.73–0.79] |
| ts/workerd-web | 1.1× [1.1–1.2] | 1× [0.97–1] unresolved | 1× [0.95–1] unresolved | 0.99× [0.98–1] unresolved | 0.98× [0.98–1] unresolved |
| ts/workerd-node-compatible | 1.1× [1.1–1.2] | 0.99× [0.95–1.1] unresolved | 1× [0.96–1] unresolved | 0.99× [0.97–1] unresolved | 0.99× [0.97–1] unresolved |
| rust/native/release/fast-rng | 0.52× [0.51–0.55] | 0.44× [0.43–0.46] | 0.4× [0.39–0.41] | 0.66× [0.65–0.66] | 0.55× [0.55–0.56] |
| rust/wasm32-wasip1/release/fast-rng | 0.93× [0.87–1.2] unresolved | 2× [2–2] | 0.42× [0.41–0.43] | 0.73× [0.72–0.92] | 0.63× [0.62–0.75] |
| rust/wasm32-wasip2/release/fast-rng | 36× [33–37] | 1.9× [1.8–2.1] | 0.41× [0.4–0.43] | 0.72× [0.72–0.77] | 0.63× [0.62–0.66] |
| rust/wasm32-unknown-unknown/release/fast-rng/workerd-web | 0.91× [0.47–0.94] | 2.1× [1.8–2.4] | 0.67× [0.63–0.73] | 0.73× [0.7–0.75] | 0.62× [0.6–0.64] |
| rust/wasm32-unknown-unknown/release/fast-rng/workerd-node-compatible | 0.91× [0.72–0.95] | 2.1× [2.1–2.3] | 0.67× [0.65–0.68] | 0.72× [0.69–0.82] | 0.63× [0.58–0.69] |
| rust/wasm32-unknown-unknown/release/fast-rng/node | 0.77× [0.7–0.82] | 2× [1.9–2.2] | 0.53× [0.5–0.55] | 0.71× [0.67–0.72] | 0.63× [0.62–0.64] |
| rust/wasm32-unknown-unknown/release/fast-rng/node-22 | 0.78× [0.42–0.8] | 2× [1.8–2.1] | 0.67× [0.62–0.72] | 0.7× [0.69–0.71] | 0.63× [0.6–0.64] |
| rust/wasm32-unknown-unknown/release/fast-rng/node-24 | 0.81× [0.66–0.85] | 2.1× [1.4–2.2] | 0.62× [0.48–0.66] | 0.71× [0.69–0.74] | 0.62× [0.6–0.63] |
| rust/wasm32-unknown-unknown/release/fast-rng/bun | 0.65× [0.63–0.93] | 1.4× [0.93–1.5] unresolved | 0.55× [0.33–0.55] | 0.68× [0.67–0.85] | 0.58× [0.58–0.66] |
| rust/wasm32-unknown-unknown/release/fast-rng/deno | 0.76× [0.69–0.82] | 2.2× [2.1–2.6] | 0.66× [0.64–0.76] | 0.73× [0.73–0.74] | 0.62× [0.61–0.63] |
| rust/wasm32-unknown-unknown/release/fast-rng/chromium | 0.85× [0.73–0.91] | 2× [1.9–2.1] | 0.53× [0.51–0.54] | 0.72× [0.7–0.73] | 0.63× [0.62–0.64] |
| rust/wasm32-unknown-unknown/release/fast-rng/firefox | 0.94× [0.9–0.98] | 1.7× [1.7–1.8] | 0.9× [0.8–0.92] | 0.75× [0.74–0.76] | 0.63× [0.62–0.67] |
| rust/wasm32-unknown-unknown/release/fast-rng/webkit | 0.65× [0.63–0.66] | 1.6× [1.6–1.7] | 0.55× [0.52–0.57] | 0.69× [0.69–0.7] | 0.58× [0.57–0.59] |
| rust/native/release/os-rng | 9× [7.2–14] | 0.46× [0.42–0.56] | 0.4× [0.19–0.47] | 0.67× [0.65–0.69] | 0.56× [0.53–0.64] |
| rust/wasm32-wasip1/release/os-rng | 9.5× [9.3–11] | 2× [1.9–2.1] | 0.41× [0.4–0.43] | 0.73× [0.72–0.74] | 0.63× [0.62–0.64] |
| rust/wasm32-wasip2/release/os-rng | 120× [110–120] | 2× [1.9–2] | 0.39× [0.37–0.44] | 0.73× [0.72–0.75] | 0.63× [0.61–0.66] |
| rust/wasm32-unknown-unknown/release/os-rng/workerd-web | 1.5× [1.1–2.2] | 2.1× [2–3.8] | 0.62× [0.6–1.1] unresolved | 0.72× [0.7–0.84] | 0.62× [0.6–0.64] |
| rust/wasm32-unknown-unknown/release/os-rng/workerd-node-compatible | 1.5× [1.4–1.6] | 2.1× [0.35–2.2] unresolved | 0.64× [0.63–0.67] | 0.72× [0.72–0.74] | 0.62× [0.6–0.65] |
| rust/wasm32-unknown-unknown/release/os-rng/node | 3.6× [3.4–4] | 2× [1.8–2.2] | 0.53× [0.49–0.56] | 0.71× [0.7–0.73] | 0.63× [0.61–0.64] |
| rust/wasm32-unknown-unknown/release/os-rng/node-22 | 6.8× [5.9–10] | 2× [1.8–2.1] | 0.68× [0.65–0.83] | 0.69× [0.58–0.71] | 0.62× [0.62–0.65] |
| rust/wasm32-unknown-unknown/release/os-rng/node-24 | 7× [6.5–7.3] | 2.1× [2–2.2] | 0.68× [0.6–0.89] | 0.71× [0.7–0.72] | 0.62× [0.61–0.63] |
| rust/wasm32-unknown-unknown/release/os-rng/bun | 0.93× [0.82–0.96] | 1.4× [1.4–1.4] | 0.54× [0.5–0.56] | 0.68× [0.65–0.69] | 0.59× [0.56–0.62] |
| rust/wasm32-unknown-unknown/release/os-rng/deno | 1.4× [1.3–1.4] | 2.2× [0.9–2.7] unresolved | 0.63× [0.51–0.75] | 0.73× [0.62–0.75] | 0.64× [0.48–1.1] unresolved |
| rust/wasm32-unknown-unknown/release/os-rng/chromium | 4.6× [3.1–5.6] | 2× [1.7–2.4] | 0.53× [0.51–0.64] | 0.72× [0.71–0.94] | 0.64× [0.61–0.82] |
| rust/wasm32-unknown-unknown/release/os-rng/firefox | 3.5× [3.4–3.7] | 1.8× [1.6–1.9] | 0.87× [0.54–0.89] | 0.75× [0.74–0.76] | 0.63× [0.61–0.64] |
| rust/wasm32-unknown-unknown/release/os-rng/webkit | 2× [1.2–2.1] | 1.6× [1.4–1.7] | 0.56× [0.51–0.58] | 0.69× [0.54–0.7] | 0.58× [0.14–0.6] |
| rust/native/release/os-rng-no-std | unavailable | 0.45× [0.43–0.48] | 0.41× [0.38–0.43] | 0.66× [0.64–0.66] | 0.55× [0.54–0.56] |
| rust/wasm32-wasip1/release/os-rng-no-std | unavailable | 1.9× [1.7–2] | 0.4× [0.37–0.41] | 0.72× [0.71–0.74] | 0.63× [0.62–0.65] |
| rust/wasm32-wasip2/release/os-rng-no-std | unavailable | 1.9× [1.7–2] | 0.4× [0.38–0.41] | 0.72× [0.71–0.73] | 0.63× [0.6–0.64] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-web | unavailable | 2.1× [1.9–2.6] | 0.68× [0.66–0.76] | 0.72× [0.72–0.9] | 0.62× [0.55–0.66] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-node-compatible | unavailable | 2.2× [2.1–3.5] | 0.66× [0.64–0.76] | 0.72× [0.72–1.1] unresolved | 0.63× [0.61–0.66] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node | unavailable | 2× [1.9–2.1] | 0.53× [0.49–0.56] | 0.71× [0.67–0.98] | 0.63× [0.48–0.65] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node-22 | unavailable | 2× [1.9–2.1] | 0.65× [0.59–0.68] | 0.7× [0.69–0.74] | 0.62× [0.4–0.63] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node-24 | unavailable | 2.1× [1.8–2.1] | 0.63× [0.61–0.65] | 0.71× [0.7–0.71] | 0.62× [0.61–0.63] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/bun | unavailable | 1.3× [1.3–1.4] | 0.54× [0.52–0.57] | 0.68× [0.61–0.8] | 0.58× [0.57–0.61] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/deno | unavailable | 2.1× [1.2–2.2] | 0.62× [0.52–0.67] | 0.73× [0.48–0.74] | 0.62× [0.46–0.63] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/chromium | unavailable | 2× [1.8–2] | 0.54× [0.53–0.55] | 0.72× [0.71–0.73] | 0.63× [0.62–0.64] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/firefox | unavailable | 1.7× [1.7–1.9] | 0.87× [0.84–0.9] | 0.74× [0.72–0.75] | 0.63× [0.62–0.64] |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/webkit | unavailable | 1.6× [1.5–1.7] | 0.56× [0.54–0.57] | 0.69× [0.68–0.72] | 0.58× [0.56–0.62] |
| rust/native/release/std | unavailable | 0.47× [0.44–0.47] | 0.41× [0.4–0.47] | 0.66× [0.65–1] unresolved | 0.55× [0.55–0.59] |
| rust/wasm32-wasip1/release/std | unavailable | 1.9× [1.9–2] | 0.41× [0.38–0.44] | 0.72× [0.71–0.73] | 0.63× [0.61–0.65] |
| rust/wasm32-wasip2/release/std | unavailable | 2× [1.9–2.1] | 0.4× [0.39–0.41] | 0.72× [0.7–0.79] | 0.63× [0.61–0.64] |
| rust/wasm32-unknown-unknown/release/std/workerd-web | unavailable | 2.1× [1.9–2.3] | 0.67× [0.6–1] unresolved | 0.72× [0.67–0.73] | 0.62× [0.61–0.65] |
| rust/wasm32-unknown-unknown/release/std/workerd-node-compatible | unavailable | 2.1× [2.1–2.2] | 0.67× [0.66–0.69] | 0.72× [0.71–0.77] | 0.62× [0.61–1.1] unresolved |
| rust/wasm32-unknown-unknown/release/std/node | unavailable | 2× [1.9–2.1] | 0.54× [0.51–0.58] | 0.72× [0.71–0.72] | 0.63× [0.62–0.66] |
| rust/wasm32-unknown-unknown/release/std/node-22 | unavailable | 1.9× [1.8–1.9] | 0.7× [0.54–0.74] | 0.7× [0.69–0.81] | 0.63× [0.52–0.64] |
| rust/wasm32-unknown-unknown/release/std/node-24 | unavailable | 2.1× [1.9–2.2] | 0.69× [0.67–0.71] | 0.71× [0.71–0.8] | 0.62× [0.61–0.64] |
| rust/wasm32-unknown-unknown/release/std/bun | unavailable | 1.5× [1.4–1.7] | 0.54× [0.52–0.58] | 0.68× [0.67–0.75] | 0.58× [0.57–0.61] |
| rust/wasm32-unknown-unknown/release/std/deno | unavailable | 2.2× [2.1–2.4] | 0.67× [0.15–0.86] | 0.73× [0.66–1.3] unresolved | 0.62× [0.51–0.64] |
| rust/wasm32-unknown-unknown/release/std/chromium | unavailable | 1.9× [1.8–2] | 0.56× [0.55–0.58] | 0.72× [0.71–0.72] | 0.63× [0.62–0.64] |
| rust/wasm32-unknown-unknown/release/std/firefox | unavailable | 1.8× [1.7–3.6] | 1× [0.84–1] unresolved | 0.73× [0.73–0.74] | 0.64× [0.39–0.67] |
| rust/wasm32-unknown-unknown/release/std/webkit | unavailable | 1.6× [1.5–1.7] | 0.57× [0.56–0.59] | 0.69× [0.68–0.69] | 0.58× [0.57–0.59] |
| rust/native/release/reduced | unavailable | 0.46× [0.39–0.48] | 0.41× [0.36–0.43] | 0.66× [0.64–0.67] | 0.55× [0.55–0.57] |
| rust/wasm32-wasip1/release/reduced | unavailable | 1.9× [1.9–3.8] | 0.4× [0.37–0.43] | 0.72× [0.71–0.73] | 0.63× [0.6–0.64] |
| rust/wasm32-wasip2/release/reduced | unavailable | 2× [1.8–2.1] | 0.42× [0.38–0.55] | 0.71× [0.49–0.73] | 0.62× [0.42–0.66] |
| rust/wasm32-unknown-unknown/release/reduced/workerd-web | unavailable | 2.1× [2–2.5] | 0.68× [0.65–0.71] | 0.73× [0.72–0.76] | 0.63× [0.61–0.65] |
| rust/wasm32-unknown-unknown/release/reduced/workerd-node-compatible | unavailable | 2.2× [2.1–2.3] | 0.66× [0.63–0.68] | 0.73× [0.71–0.77] | 0.63× [0.62–0.63] |
| rust/wasm32-unknown-unknown/release/reduced/node | unavailable | 2× [1.9–2.1] | 0.53× [0.51–0.56] | 0.71× [0.71–0.71] | 0.63× [0.62–0.65] |
| rust/wasm32-unknown-unknown/release/reduced/node-22 | unavailable | 1.9× [1.8–2] | 0.7× [0.68–1.5] unresolved | 0.7× [0.69–0.73] | 0.63× [0.61–0.69] |
| rust/wasm32-unknown-unknown/release/reduced/node-24 | unavailable | 2× [2–2.2] | 0.66× [0.46–0.71] | 0.71× [0.71–0.78] | 0.62× [0.53–0.63] |
| rust/wasm32-unknown-unknown/release/reduced/bun | unavailable | 1.5× [1.4–1.6] | 0.53× [0.34–0.58] | 0.68× [0.67–0.69] | 0.58× [0.57–0.62] |
| rust/wasm32-unknown-unknown/release/reduced/deno | unavailable | 2.1× [2–2.2] | 0.64× [0.63–0.67] | 0.73× [0.72–0.73] | 0.62× [0.61–0.63] |
| rust/wasm32-unknown-unknown/release/reduced/chromium | unavailable | 1.9× [1.9–2] | 0.55× [0.52–0.56] | 0.72× [0.7–0.75] | 0.63× [0.61–0.66] |
| rust/wasm32-unknown-unknown/release/reduced/firefox | unavailable | 1.7× [1.6–1.9] | 1× [0.77–1] unresolved | 0.73× [0.71–0.75] | 0.63× [0.61–0.7] |
| rust/wasm32-unknown-unknown/release/reduced/webkit | unavailable | 1.6× [1.4–1.7] | 0.56× [0.49–0.58] | 0.68× [0.63–0.69] | 0.58× [0.55–0.59] |

## Runtime and control evidence

| Lane | Runtime | SHA-256 prefix | A/A repeat ratio, median [95% interval] |
| --- | --- | --- | --- |
| ts/node | v26.13.0 | 7d1a1eda099f | 0.92× [0.9–1.1] unresolved; portable.into |
| ts/node-22 | v22.23.4 | 7d1a1eda099f | 0.89× [0.85–1] unresolved; async.mask.derive.iterated |
| ts/node-24 | v24.22.2 | 7d1a1eda099f | 1× [0.84–1.1] unresolved; sentinel.scan4.last |
| ts/bun | 1.4.4 | f906ae37070c | 1.3× [0.54–3.5] unresolved; bounds/range |
| ts/deno | deno 2.9.8 (stable, release, aarch64-apple-darwin) | b123671cadbc | 0.91× [0.78–1.4] unresolved; sentinel.decode.bytes |
| ts/chromium | 156.0.8078.4 | cedffb48d32b | 0.91× [0.86–1.1] unresolved; guard.uuid.compact |
| ts/firefox | 157.0 | cedffb48d32b | 1.1× [0.74–1.3] unresolved; construct.migration.all |
| ts/webkit | 27.2 | cedffb48d32b | 1.1× [0.96–1.2] unresolved; uuid.toString.mixed.uppercase |
| ts/workerd-web | workerd 2026-11-02 | d1580ff39584 | 1.1× [0.55–1.1] unresolved; guard.uuid.text |
| ts/workerd-node-compatible | workerd 2026-11-02 | d1580ff39584 | 0.94× [0.72–1] unresolved; migration.base32 |
| rust/native/release/fast-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13) | 6d5b4cc94e87 | 0.94× [0.79–1] unresolved; generation/v7/base64url |
| rust/wasm32-wasip1/release/fast-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | f7a6296fb097 | 0.94× [0.66–1.1] unresolved; inspect/variant |
| rust/wasm32-wasip2/release/fast-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0; jco 1.39.0 | 3aade3a216a6 | 0.97× [0.96–1.1] unresolved; generation/v7/explicit-time |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 80b34e327df4 | 0.98× [0.97–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | 80b34e327df4 | 1× [0.92–1.1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | 80b34e327df4 | 1× [0.97–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | 80b34e327df4 | 0.99× [0.97–1.2] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | 80b34e327df4 | 1× [0.71–1.1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | 80b34e327df4 | 1× [0.82–1.1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | 80b34e327df4 | 1× [0.98–1.2] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | 80b34e327df4 | 1× [0.96–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 80b34e327df4 | 0.99× [0.93–1.1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 80b34e327df4 | 1× [0.97–1] unresolved; transport/plain/base64 |
| rust/wasm32-unknown-unknown/release/fast-rng/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 80b34e327df4 | 1.1× [0.98–1.3] unresolved; decode/base32/caller-buffer |
| rust/wasm32-unknown-unknown/release/fast-rng/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 80b34e327df4 | 1× [0.98–1.3] unresolved; migration/candidates-text |
| rust/wasm32-unknown-unknown/release/fast-rng/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 80b34e327df4 | 1× [0.97–1.1] unresolved; parse/plain/base32 |
| rust/wasm32-unknown-unknown/release/fast-rng/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | 80b34e327df4 | 1× [0.97–1.1] unresolved; timestamp/extract/bytes |
| rust/wasm32-unknown-unknown/release/fast-rng/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | 80b34e327df4 | 0.97× [0.55–1.1] unresolved; construct/codec-precomputed-mask |
| rust/wasm32-unknown-unknown/release/fast-rng/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | 80b34e327df4 | 1× [0.99–1.4] unresolved; construct/sentinels/4 |
| rust/wasm32-unknown-unknown/release/fast-rng/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | 80b34e327df4 | 1.1× [0.9–1.1] unresolved; inspect/variant |
| rust/wasm32-unknown-unknown/release/fast-rng/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | 80b34e327df4 | 0.96× [0.86–1.1] unresolved; construct/custom-mask |
| rust/wasm32-unknown-unknown/release/fast-rng/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | 80b34e327df4 | 1× [0.99–1.1] unresolved; payload/extract/bytes |
| rust/wasm32-unknown-unknown/release/fast-rng/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | 80b34e327df4 | 1× [0.91–1.1] unresolved; payload/extract/bytes |
| rust/native/release/os-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13) | 4fe9f1ff3918 | 1.1× [1–3.6] unresolved; construct/payload-layout |
| rust/wasm32-wasip1/release/os-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 8760193af15b | 0.99× [0.97–1]; async/future/derive/64 |
| rust/wasm32-wasip2/release/os-rng | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0; jco 1.39.0 | 74d8720e079a | 0.97× [0.92–1.3] unresolved; plain/base32 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | d6dd04f1362f | 1× [1–2] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | d6dd04f1362f | 0.99× [0.95–1.1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | d6dd04f1362f | 0.99× [0.93–0.99]; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | d6dd04f1362f | 0.99× [0.97–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | d6dd04f1362f | 1× [0.81–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | d6dd04f1362f | 0.99× [0.98–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | d6dd04f1362f | 0.99× [0.87–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | d6dd04f1362f | 0.99× [0.91–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | d6dd04f1362f | 1× [0.97–1.7] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | d6dd04f1362f | 0.98× [0.98–1] unresolved; transport/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | d6dd04f1362f | 0.93× [0.88–1] unresolved; construct/sentinels/1 |
| rust/wasm32-unknown-unknown/release/os-rng/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | d6dd04f1362f | 1.1× [0.85–1.2] unresolved; construct/public-test-mask-and-codec |
| rust/wasm32-unknown-unknown/release/os-rng/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | d6dd04f1362f | 0.97× [0.8–1] unresolved; construct/custom-mask |
| rust/wasm32-unknown-unknown/release/os-rng/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | d6dd04f1362f | 0.96× [0.93–1] unresolved; failure/uuid-parse |
| rust/wasm32-unknown-unknown/release/os-rng/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | d6dd04f1362f | 0.93× [0.56–1.1] unresolved; plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | d6dd04f1362f | 0.94× [0.71–1] unresolved; generation/v4/base64url |
| rust/wasm32-unknown-unknown/release/os-rng/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | d6dd04f1362f | 1× [0.77–1.8] unresolved; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | d6dd04f1362f | 1.1× [0.99–1.2] unresolved; construct/public-test-mask-and-codec |
| rust/wasm32-unknown-unknown/release/os-rng/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | d6dd04f1362f | 0.96× [0.95–1.1] unresolved; plain/base32 |
| rust/wasm32-unknown-unknown/release/os-rng/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | d6dd04f1362f | 0.95× [0.91–0.99]; construct/custom-mask |
| rust/native/release/os-rng-no-std | rustc 1.99.1 (58cf8f9c3 2026-10-13) | f9a2c5e1ebcc | 1× [0.94–1.2] unresolved; plain/base32 |
| rust/wasm32-wasip1/release/os-rng-no-std | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | e3a8f6c26eb5 | 0.98× [0.91–1] unresolved; construct/sentinels/1 |
| rust/wasm32-wasip2/release/os-rng-no-std | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0; jco 1.39.0 | 95b64cd76a36 | 0.95× [0.9–1]; generation/v7/fraction12-custom-entropy |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 92370afee720 | 1× [0.99–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | 92370afee720 | 1× [0.96–1.1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | 92370afee720 | 1× [0.72–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | 92370afee720 | 0.99× [0.91–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | 92370afee720 | 1× [0.98–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | 92370afee720 | 1× [0.91–1.1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | 92370afee720 | 1× [1–1.1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | 92370afee720 | 1× [0.95–1.1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 92370afee720 | 0.99× [0.97–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 92370afee720 | 0.99× [0.94–1] unresolved; transport/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 92370afee720 | 1.1× [0.96–1.8] unresolved; migration/candidates-text |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | 92370afee720 | 1.1× [0.86–2.7] unresolved; failure/buffer-capacity |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 92370afee720 | 1.1× [0.95–1.5] unresolved; construct/custom-mask |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | 92370afee720 | 0.95× [0.88–0.99]; construct/custom-mask |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | 92370afee720 | 1.1× [0.97–1.1] unresolved; construct/custom-mask |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | 92370afee720 | 1× [0.98–1.6] unresolved; construct/mask-iterated |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | 92370afee720 | 1× [0.99–1.1] unresolved; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | 92370afee720 | 0.96× [0.94–1.1] unresolved; decode/base32/owned |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | 92370afee720 | 1× [0.91–1.1] unresolved; construct/custom-mask |
| rust/wasm32-unknown-unknown/release/os-rng-no-std/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | 92370afee720 | 0.93× [0.83–0.99]; payload/extract/bytes |
| rust/native/release/std | rustc 1.99.1 (58cf8f9c3 2026-10-13) | aef44132e1d3 | 0.94× [0.81–1] unresolved; construct/public-test-mask-and-codec |
| rust/wasm32-wasip1/release/std | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 7cc493a602a4 | 1× [0.99–1.1] unresolved; timestamp/extract/bytes |
| rust/wasm32-wasip2/release/std | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0; jco 1.39.0 | 91bd469099c8 | 1.1× [1–2.2] unresolved; parse/uuid |
| transport/rust/wasm32-unknown-unknown/release/std/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | c140d4743f3d | 1× [0.99–1.1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/std/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | c140d4743f3d | 1× [0.88–1.1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/std/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | c140d4743f3d | 0.99× [0.61–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/std/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | c140d4743f3d | 1× [0.97–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/std/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | c140d4743f3d | 0.99× [0.98–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/std/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | c140d4743f3d | 0.98× [0.96–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/std/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | c140d4743f3d | 0.99× [0.82–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/std/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | c140d4743f3d | 1× [0.94–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/std/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | c140d4743f3d | 1× [0.9–1.1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/std/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | c140d4743f3d | 1× [0.98–1] unresolved; transport/plain/base64 |
| rust/wasm32-unknown-unknown/release/std/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | c140d4743f3d | 1.2× [0.85–2.2] unresolved; construct/sentinels/4 |
| rust/wasm32-unknown-unknown/release/std/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | c140d4743f3d | 1.1× [0.9–1.5] unresolved; bytes/write/offset |
| rust/wasm32-unknown-unknown/release/std/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | c140d4743f3d | 0.98× [0.97–1] unresolved; failure/buffer-capacity |
| rust/wasm32-unknown-unknown/release/std/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | c140d4743f3d | 1.1× [0.93–2] unresolved; failure/buffer-capacity |
| rust/wasm32-unknown-unknown/release/std/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | c140d4743f3d | 1× [0.98–1.1] unresolved; plain/base32 |
| rust/wasm32-unknown-unknown/release/std/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | c140d4743f3d | 0.95× [0.9–1] unresolved; parse/urn |
| rust/wasm32-unknown-unknown/release/std/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | c140d4743f3d | 0.93× [0.48–1] unresolved; timestamp/masked/base64 |
| rust/wasm32-unknown-unknown/release/std/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | c140d4743f3d | 0.96× [0.92–0.98]; failure/plain/base64 |
| rust/wasm32-unknown-unknown/release/std/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | c140d4743f3d | 1.1× [0.86–1.2] unresolved; construct/custom-mask |
| rust/wasm32-unknown-unknown/release/std/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | c140d4743f3d | 0.95× [0.86–1] unresolved; decode/base32/owned |
| rust/native/release/reduced | rustc 1.99.1 (58cf8f9c3 2026-10-13) | de88acec0f88 | 0.97× [0.91–1.1] unresolved; failure/buffer-capacity |
| rust/wasm32-wasip1/release/reduced | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | 7f8ccafe51aa | 0.98× [0.72–0.99]; construct/payload-layout |
| rust/wasm32-wasip2/release/reduced | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0; jco 1.39.0 | 02b2e87d1d8a | 0.97× [0.81–1] unresolved; construct/sentinels/1 |
| transport/rust/wasm32-unknown-unknown/release/reduced/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | ccbc5753c10f | 1× [0.84–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/reduced/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | ccbc5753c10f | 1× [0.95–1.1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/reduced/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | ccbc5753c10f | 1× [0.95–1.1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/reduced/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | ccbc5753c10f | 0.99× [0.96–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/reduced/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | ccbc5753c10f | 0.99× [0.85–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/reduced/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | ccbc5753c10f | 0.98× [0.97–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/reduced/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | ccbc5753c10f | 1× [0.93–1.2] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/reduced/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | ccbc5753c10f | 0.98× [0.95–1.1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/reduced/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | ccbc5753c10f | 1× [0.78–1] unresolved; transport/plain/base64 |
| transport/rust/wasm32-unknown-unknown/release/reduced/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | ccbc5753c10f | 1× [0.98–1.2] unresolved; transport/plain/base64 |
| rust/wasm32-unknown-unknown/release/reduced/workerd-web | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | ccbc5753c10f | 1.1× [1–1.3]; construct/custom-mask |
| rust/wasm32-unknown-unknown/release/reduced/workerd-node-compatible | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: workerd 2026-11-02 | ccbc5753c10f | 0.92× [0.89–1] unresolved; format/uuid/uppercase |
| rust/wasm32-unknown-unknown/release/reduced/node | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v26.13.0 | ccbc5753c10f | 0.89× [0.45–1] unresolved; construct/custom-mask |
| rust/wasm32-unknown-unknown/release/reduced/node-22 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v22.23.4 | ccbc5753c10f | 0.9× [0.18–1] unresolved; plain/base32 |
| rust/wasm32-unknown-unknown/release/reduced/node-24 | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: v24.22.2 | ccbc5753c10f | 0.97× [0.91–1] unresolved; bytes/write/offset |
| rust/wasm32-unknown-unknown/release/reduced/bun | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 1.4.4 | ccbc5753c10f | 1× [1–1.1] unresolved; parse/compact |
| rust/wasm32-unknown-unknown/release/reduced/deno | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: deno 2.9.8 (stable, release, aarch64-apple-darwin) | ccbc5753c10f | 1.1× [0.99–1.2] unresolved; inspect/v4 |
| rust/wasm32-unknown-unknown/release/reduced/chromium | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 156.0.8078.4 | ccbc5753c10f | 0.97× [0.9–1.1] unresolved; timestamp/validate/uuid |
| rust/wasm32-unknown-unknown/release/reduced/firefox | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 157.0 | ccbc5753c10f | 0.98× [0.74–1.1] unresolved; construct/sentinels/4 |
| rust/wasm32-unknown-unknown/release/reduced/webkit | rustc 1.99.1 (58cf8f9c3 2026-10-13); Host: 27.2 | ccbc5753c10f | 0.94× [0.83–1] unresolved; construct/custom-mask |
| cross-language/rust-native | rustc 1.99.1 (58cf8f9c3 2026-10-13) | 6d5b4cc94e87 | 0.97× [0.92–1.1] unresolved; plain/base64 |
| transport/typescript/node | v26.13.0 | b30084935587 | 0.98× [0.96–1] unresolved; transport/plain/base64 |
| transport/native/node-22/napi | Node 22.23.4 | 749b2dfdd42a | 0.99× [0.83–1] unresolved; transport/plain/base64 |
| transport/native/node-24/napi | Node 24.22.2 | 749b2dfdd42a | 0.98× [0.94–1.1] unresolved; transport/plain/base64 |
| transport/native/node-26/napi | Node 26.13.0 | 749b2dfdd42a | 0.99× [0.95–1.1] unresolved; transport/plain/base64 |
| transport/native/node-26/ffi | Node 26.13.0 | 749b2dfdd42a | 1× [0.97–1] unresolved; transport/plain/base64 |
| transport/native/bun/ffi | Bun 1.4.4 | 749b2dfdd42a | 1× [0.98–1] unresolved; transport/plain/base64 |
| transport/native/bun/napi | Bun 1.4.4 | 749b2dfdd42a | 0.99× [0.97–1] unresolved; transport/plain/base64 |
| transport/native/deno/napi | Deno 2.9.8 | 749b2dfdd42a | 0.98× [0.97–1] unresolved; transport/plain/base64 |
| transport/native/deno/ffi | Deno 2.9.8 | 749b2dfdd42a | 0.97× [0.94–1] unresolved; transport/plain/base64 |

A/A uses identical artifacts in separate processes. Its worst median displacement exposes unstable jobs; it is not a correction factor. Inspect the retained per-job repeats before attributing a small gap to implementation. Host load can affect implementations differently, so order balancing and controls reduce confounding but cannot remove it.

## TypeScript

| Caller job | Reference | ts/node | ts/node-22 | ts/node-24 | ts/bun | ts/deno | ts/chromium | ts/firefox | ts/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| async.mask.derive | ts/node | reference | 1.1× [1–1.1] | 1× [0.97–1] unresolved | 0.66× [0.62–0.77] | 2× [1.9–2.8] | 1.7× [1.5–1.7] | 2.1× [1.7–2.2] | 0.76× [0.69–0.77] |
| async.mask.derive.iterated | ts/node | reference | 1.1× [0.99–1.2] unresolved | 0.98× [0.93–1.1] unresolved | 0.78× [0.74–1.1] unresolved | 1.2× [1.1–1.2] | 1.1× [1–1.2] | 1.2× [0.97–1.2] unresolved | 0.78× [0.75–0.82] |
| base32.decode | ts/node | reference | 1.1× [1–1.2] | 0.99× [0.97–1] unresolved | 0.7× [0.67–0.73] | 0.98× [0.95–1] unresolved | 0.87× [0.84–0.89] | 1.2× [1–1.6] | 1.1× [1–1.1] |
| base32.decode.uppercase | ts/node | reference | 1× [1–1.4] | 0.98× [0.94–1] unresolved | 0.68× [0.66–0.7] | 0.96× [0.94–1] unresolved | 0.85× [0.83–0.89] | 1.2× [1.2–1.3] | 1× [0.99–1] unresolved |
| base32.encode | ts/node | reference | 1.1× [1.1–1.4] | 0.97× [0.97–0.98] | 0.76× [0.56–0.8] | 0.87× [0.8–0.9] | 0.76× [0.75–0.79] | 1.2× [1–1.4] | 0.94× [0.9–0.97] |
| bounds/one-millisecond | ts/node | reference | 0.99× [0.97–1] unresolved | 0.97× [0.95–1] unresolved | 0.45× [0.37–0.78] | 3.6× [3.3–4.2] | 0.94× [0.92–0.96] | 0.44× [0.32–0.45] | 0.54× [0.37–0.56] |
| bounds/range | ts/node | reference | 1× [0.95–1] unresolved | 0.97× [0.96–1] | 0.45× [0.36–1.1] unresolved | 3.7× [3.3–4.9] | 0.96× [0.9–0.97] | 0.44× [0.32–0.46] | 0.54× [0.5–0.57] |
| bytes.base32 | ts/node | reference | 1.1× [1.1–1.7] | 0.98× [0.92–1] unresolved | 0.82× [0.75–0.87] | 1× [0.97–1.1] unresolved | 0.91× [0.85–0.94] | 1.4× [0.56–2.3] unresolved | 1.2× [1.2–1.3] |
| bytes.base64 | ts/node | reference | 1× [1–1.2] | 1× [0.94–1] unresolved | 0.91× [0.86–0.97] | 0.99× [0.94–0.99] | 0.89× [0.85–0.9] | 1.3× [1.3–1.4] | 1.4× [1.1–1.4] |
| bytes.offset.base32 | ts/node | reference | 1× [0.99–1.9] unresolved | 0.97× [0.95–1] unresolved | 0.82× [0.77–0.94] | 0.98× [0.91–1] | 0.93× [0.86–0.96] | 1.5× [1.4–2.1] | 1.2× [1.1–1.2] |
| bytes.offset.base64 | ts/node | reference | 1× [1–1.8] unresolved | 0.97× [0.94–0.97] | 0.93× [0.87–1] unresolved | 0.93× [0.85–0.96] | 0.91× [0.91–0.93] | 1.4× [1.3–1.9] | 1.2× [1.1–1.2] |
| bytes/read | ts/node | reference | 0.72× [0.69–0.76] | 0.78× [0.77–0.8] | 0.63× [0.53–0.95] | 3.5× [3.2–4.2] | 0.98× [0.94–1] unresolved | 1× [0.79–1.1] unresolved | 0.74× [0.63–0.76] |
| codec.toBytes.bytes | ts/node | reference | 0.73× [0.7–1] unresolved | 0.8× [0.78–0.81] | 0.79× [0.43–0.94] | 3.6× [3.3–3.9] | 0.98× [0.87–1] unresolved | 1.1× [1.1–1.1] | 0.72× [0.67–0.73] |
| codec.toBytes.plain | ts/node | reference | 1.1× [0.98–1.3] unresolved | 1× [0.94–1] unresolved | 0.7× [0.56–0.8] | 2× [1.8–2.3] | 0.92× [0.88–0.93] | 1.5× [1.3–1.6] | 0.7× [0.59–0.71] |
| codec.toPlainSlug.bytes | ts/node | reference | 0.97× [0.96–1.1] unresolved | 0.93× [0.92–0.96] | 1× [0.96–1.2] unresolved | 0.93× [0.91–0.96] | 0.81× [0.78–0.83] | 1.3× [1.3–1.4] | 1.3× [1.2–1.3] |
| codec.toString.bytes | ts/node | reference | 0.95× [0.93–1.1] unresolved | 0.92× [0.92–0.94] | 0.85× [0.78–0.91] | 0.96× [0.92–0.99] | 0.85× [0.82–0.88] | 1.1× [1.1–1.2] | 1.2× [1.2–1.3] |
| codec.toString.mixed | ts/node | reference | 1.1× [0.95–1.7] unresolved | 0.96× [0.94–1.3] unresolved | 0.63× [0.61–0.64] | 1.5× [1.3–1.7] | 0.81× [0.77–0.84] | 0.77× [0.73–0.79] | 0.77× [0.74–0.78] |
| codec.toString.plain | ts/node | reference | 1.1× [0.95–1.8] unresolved | 1× [0.97–1] unresolved | 0.75× [0.72–0.95] | 1.7× [1.4–1.8] | 0.9× [0.85–0.92] | 1.5× [1.3–1.6] | 0.82× [0.81–0.84] |
| codec.toString.uuid | ts/node | reference | 0.87× [0.78–0.94] | 0.92× [0.78–1.2] unresolved | 0.75× [0.5–0.79] | 0.91× [0.83–1] unresolved | 0.91× [0.85–0.95] | 0.9× [0.86–0.95] | 0.56× [0.54–0.62] |
| construct.codec | ts/node | reference | 0.97× [0.46–1] unresolved | 0.99× [0.97–1.1] unresolved | 0.71× [0.45–1.9] unresolved | 2.1× [1.9–3.2] | 2× [2–2] | 1.4× [0.91–1.4] unresolved | 0.83× [0.7–0.88] |
| construct.codec.retained-range | ts/node | reference | 0.96× [0.3–1] unresolved | 0.99× [0.96–1.1] unresolved | 0.8× [0.64–1.3] unresolved | 2× [1.9–3.1] | 1.8× [1.8–1.9] | 1.4× [1.1–1.5] | 0.84× [0.58–0.87] |
| construct.codec.rotation | ts/node | reference | 0.96× [0.63–0.99] | 0.99× [0.98–1] unresolved | 0.63× [0.47–1.1] unresolved | 2.2× [2–2.9] | 1.5× [1.3–1.6] | 1.3× [1.1–1.3] | 0.81× [0.65–0.83] |
| construct.codec.sentinels | ts/node | reference | 1× [0.98–2] unresolved | 1× [0.97–1] unresolved | 0.85× [0.6–1.2] unresolved | 1.8× [1.6–2.3] | 1.2× [1.2–1.3] | 1.4× [1.1–1.5] | 1× [0.8–1] unresolved |
| construct.codec.sentinels16 | ts/node | reference | 1.1× [1.1–1.2] | 1.1× [1.1–1.2] | 0.82× [0.67–1] unresolved | 1.3× [1.2–1.5] | 0.88× [0.86–0.9] | 1.5× [1.4–1.6] | 1× [0.92–1] unresolved |
| construct.codec.sentinels4 | ts/node | reference | 1.1× [1.1–1.4] | 1.1× [1–1.1] | 0.82× [0.57–1.2] unresolved | 1.5× [1.4–2.4] | 1.3× [1.2–1.3] | 1.4× [0.83–1.5] unresolved | 1× [0.79–1.1] unresolved |
| construct.codec.sentinels64 | ts/node | reference | 1.2× [1.1–1.2] | 1.1× [1.1–1.2] | 0.81× [0.56–1.1] unresolved | 1.2× [1.1–1.3] | 0.81× [0.81–0.84] | 1.6× [1.2–1.6] | 0.97× [0.86–1] |
| construct.codec.sentinels8 | ts/node | reference | 1.1× [1–1.4] | 1.1× [1.1–1.2] | 0.82× [0.67–1.2] unresolved | 1.4× [1.3–1.7] | 0.93× [0.92–0.95] | 1.5× [1.2–1.7] | 1× [0.74–1.1] unresolved |
| construct.custom | ts/node | reference | 1.1× [1.1–1.1] | 0.98× [0.96–1] unresolved | 0.47× [0.45–0.52] | 1.6× [1.5–1.8] | 0.98× [0.95–1] unresolved | 0.62× [0.39–0.64] | 0.51× [0.34–0.52] |
| construct.generator | ts/node | reference | 1× [0.94–1.1] unresolved | 1× [0.95–1.1] unresolved | 0.8× [0.72–1.1] unresolved | 1.3× [1.1–1.4] | 1.2× [1.1–1.4] | 2.4× [2.3–3] | 0.88× [0.83–1] |
| construct.generator.default | ts/node | reference | 1× [0.86–1.1] unresolved | 1× [0.95–1.1] unresolved | 0.8× [0.66–0.86] | 1.3× [1.3–1.4] | 1.2× [1.1–1.3] | 2.4× [2.3–3.5] | 0.9× [0.88–0.94] |
| construct.generator.rollback | ts/node | reference | 1.1× [0.97–1.1] unresolved | 1× [0.99–1.2] unresolved | 0.81× [0.55–1.7] unresolved | 1.3× [1.3–1.8] | 1.2× [1.2–1.2] | 2.3× [1.7–2.4] | 0.79× [0.71–0.83] |
| construct.mask | ts/node | reference | 0.94× [0.84–0.98] | 0.98× [0.96–1] unresolved | 0.62× [0.44–0.8] | 2.3× [2.1–3.1] | 1.6× [1.4–1.7] | 1.2× [0.8–1.2] unresolved | 0.74× [0.57–0.75] |
| construct.mask.bytes | ts/node | reference | 0.95× [0.87–0.98] | 0.99× [0.96–1] unresolved | 0.6× [0.45–0.75] | 2.5× [2.3–4] | 0.94× [0.92–0.95] | 1.1× [0.98–1.2] unresolved | 0.61× [0.53–0.61] |
| construct.mask.bytes.reused | ts/node | reference | 0.96× [0.65–1] unresolved | 0.98× [0.97–1] unresolved | 0.61× [0.5–0.81] | 2.4× [2.2–3.5] | 0.95× [0.95–0.96] | 1.2× [0.99–1.2] unresolved | 0.61× [0.61–0.63] |
| construct.mask.iterated | ts/node | reference | 0.97× [0.86–1] unresolved | 0.99× [0.98–1] unresolved | 0.76× [0.71–0.81] | 1.7× [1.5–2.1] | 1.3× [1.3–1.4] | 1.2× [1–1.2] | 0.85× [0.85–0.86] |
| construct.migration.all | ts/node | reference | 1× [1–1.1] | 1× [1–1.1] unresolved | 0.97× [0.76–1.8] unresolved | 0.95× [0.91–1] unresolved | 0.91× [0.88–0.91] | 1.4× [1–1.5] | 0.98× [0.85–1] unresolved |
| construct.migration.current | ts/node | reference | 1× [1–1.2] | 1× [0.97–1.1] unresolved | 1.5× [1.2–2.6] | 0.95× [0.9–1] unresolved | 0.9× [0.89–0.92] | 1.3× [1.2–1.4] | 1.4× [1–1.4] |
| construct.migration.original | ts/node | reference | 1× [1–1.1] | 1× [0.99–1] unresolved | 1.2× [0.81–2.3] unresolved | 0.95× [0.93–0.98] | 0.88× [0.87–0.91] | 1.3× [0.92–1.6] unresolved | 1× [0.79–1.1] unresolved |
| construct.migration.plain | ts/node | reference | 1× [1–1.1] | 1× [0.98–1] unresolved | 1.1× [0.79–1.6] unresolved | 0.94× [0.89–1] unresolved | 0.88× [0.86–0.91] | 1.4× [1.1–1.5] | 1.1× [0.75–1.1] unresolved |
| construct/codec-precomputed-mask | ts/node | reference | 1× [0.99–1.1] unresolved | 1× [0.9–1] unresolved | 0.89× [0.77–1.1] unresolved | 1.4× [1.3–2.6] | 0.89× [0.86–0.9] | 1.8× [1.2–1.9] | 0.97× [0.92–1] unresolved |
| construct/generator | ts/node | reference | 1.1× [1–1.1] | 1× [0.97–1.1] unresolved | 0.79× [0.66–1.2] unresolved | 1.5× [1.3–1.6] | 1.3× [1.1–1.3] | 2.2× [1.4–2.4] | 0.79× [0.73–0.86] |
| control | ts/node | reference | 1.2× [1.1–1.3] | 1.2× [1.2–1.2] | 2.3× [2.1–2.4] | 0.94× [0.88–0.98] | 1× [1–1] | 1.1× [1–1.3] | 2.3× [2–2.4] |
| decode/base32/caller-buffer | ts/node | reference | 0.94× [0.91–0.94] | 0.88× [0.86–0.9] | 0.48× [0.46–0.51] | 0.96× [0.91–0.99] | 0.91× [0.86–0.94] | 1.1× [0.76–1.1] unresolved | 0.6× [0.53–0.62] |
| decode/base32/owned | ts/node | reference | 0.98× [0.95–1] unresolved | 0.94× [0.92–0.99] | 0.47× [0.34–0.51] | 2.5× [2.3–3.3] | 0.9× [0.86–0.91] | 0.74× [0.69–0.81] | 0.49× [0.47–0.52] |
| decode/caller-buffer | ts/node | reference | 0.91× [0.85–0.95] | 0.79× [0.74–0.8] | 0.53× [0.47–0.74] | 0.92× [0.81–0.95] | 0.83× [0.8–0.85] | 1.1× [0.79–1.2] unresolved | 0.72× [0.43–0.74] |
| decode/owned | ts/node | reference | 0.91× [0.83–0.93] | 0.88× [0.85–0.91] | 0.4× [0.26–0.44] | 2.4× [2.3–2.7] | 0.87× [0.85–0.89] | 0.77× [0.35–0.86] | 0.42× [0.4–0.44] |
| error.classify.failure | ts/node | reference | 1× [0.9–1] unresolved | 1× [0.92–1.1] unresolved | 0.96× [0.79–1.7] unresolved | 0.95× [0.93–1] | 1× [0.93–1] unresolved | 1.9× [1.8–2] | 0.93× [0.75–0.95] |
| error.classify.success | ts/node | reference | 1× [0.92–1] unresolved | 1× [1–1.1] unresolved | 0.82× [0.74–0.85] | 0.99× [0.95–1] unresolved | 0.99× [0.97–1] unresolved | 1.5× [1.3–1.5] | 0.86× [0.78–0.91] |
| failure/uuid-parse | ts/node | reference | 2.3× [2.2–2.3] | 1× [1–1.1] | 0.13× [0.12–0.18] | 3.5× [3.3–3.7] | 1.5× [1.5–1.6] | 0.85× [0.57–0.88] | 0.16× [0.15–0.17] |
| format | ts/node | reference | 1× [1–1.6] | 0.99× [0.94–1] | 0.83× [0.76–0.87] | 0.99× [0.95–1] unresolved | 0.86× [0.85–0.89] | 1.3× [1.3–2.7] | 1.4× [1.4–1.4] |
| format.offset | ts/node | reference | 1× [0.98–1.5] unresolved | 0.98× [0.93–1] unresolved | 0.92× [0.73–1.2] unresolved | 0.94× [0.92–0.97] | 0.85× [0.76–0.87] | 1.4× [1.3–1.5] | 1.4× [0.28–1.4] unresolved |
| format.uppercase | ts/node | reference | 0.89× [0.89–1.3] unresolved | 1× [1–1.1] | 0.72× [0.64–1] unresolved | 0.76× [0.73–0.77] | 0.67× [0.66–0.68] | 1.2× [1.2–1.3] | 1.2× [1.1–1.3] |
| format/uuid/lowercase | ts/node | reference | 0.97× [0.95–1] unresolved | 0.94× [0.92–0.96] | 0.81× [0.78–1.4] unresolved | 0.96× [0.94–0.99] | 0.83× [0.81–0.86] | 1.3× [1.1–1.7] | 1.3× [0.93–1.4] unresolved |
| format/uuid/uppercase | ts/node | reference | 0.85× [0.84–0.87] | 1× [1–1] unresolved | 0.71× [0.61–0.99] | 0.74× [0.7–0.76] | 0.65× [0.62–0.66] | 1.1× [0.66–1.2] unresolved | 1.1× [0.96–1.1] unresolved |
| generation/v4/base32hex | ts/node | reference | 1× [0.98–1] unresolved | 0.97× [0.96–0.99] | 0.81× [0.7–1.1] unresolved | 1× [0.99–1.1] unresolved | 0.87× [0.86–0.89] | 1.8× [1.5–1.9] | 1.1× [1–1.1] |
| generation/v4/base64url | ts/node | reference | 1× [0.99–1] unresolved | 0.96× [0.94–0.98] | 0.89× [0.82–0.91] | 1.1× [1–1.1] | 0.84× [0.64–0.87] | 1.8× [1.6–1.8] | 1.1× [1.1–1.2] |
| generation/v4/bytes | ts/node | reference | 0.87× [0.85–0.88] | 0.88× [0.86–0.92] | 0.45× [0.33–0.54] | 3.1× [2.8–3.5] | 0.95× [0.89–0.98] | 1.1× [0.94–1.2] unresolved | 0.49× [0.28–0.49] |
| generation/v4/text | ts/node | reference | 1× [1–1] | 0.98× [0.95–1] unresolved | 0.48× [0.44–0.51] | 0.57× [0.56–0.62] | 0.87× [0.84–0.88] | 1.6× [1.2–1.7] | 1.2× [1.1–1.3] |
| generation/v7/base32hex | ts/node | reference | 1.1× [1–1.1] | 1× [0.95–1] unresolved | 0.58× [0.56–0.77] | 1.4× [1.3–1.5] | 0.93× [0.9–0.96] | 0.94× [0.62–1.1] unresolved | 0.66× [0.62–0.76] |
| generation/v7/base64url | ts/node | reference | 1.1× [1.1–1.1] | 1× [0.97–1] unresolved | 0.57× [0.45–0.65] | 1.4× [1.3–1.6] | 0.96× [0.93–0.99] | 0.96× [0.69–1] unresolved | 0.66× [0.62–0.68] |
| generation/v7/bytes | ts/node | reference | 0.93× [0.89–0.98] | 0.96× [0.9–0.98] | 0.63× [0.56–0.88] | 2.1× [2–2.9] | 0.99× [0.96–1] unresolved | 1× [0.82–1] unresolved | 0.6× [0.58–0.62] |
| generation/v7/text | ts/node | reference | 1× [0.98–1] unresolved | 0.99× [0.99–1] unresolved | 0.81× [0.57–0.86] | 1× [0.96–1] unresolved | 0.95× [0.92–0.97] | 1.3× [1.1–1.4] | 1.1× [0.62–1.1] unresolved |
| guard.bytes.any | ts/node | reference | 1× [0.5–1.7] unresolved | 1× [0.99–1.1] unresolved | 2× [1.8–2.7] | 0.94× [0.89–0.99] | 1× [0.97–1.1] unresolved | 2× [1.9–2.1] | 1.4× [1.3–1.4] |
| guard.bytes.v4 | ts/node | reference | 0.96× [0.92–1.7] unresolved | 0.89× [0.88–0.96] | 0.55× [0.52–0.67] | 2.1× [1.9–2.5] | 0.94× [0.85–0.95] | 0.57× [0.54–0.75] | 0.65× [0.63–0.67] |
| guard.bytes.v7 | ts/node | reference | 1× [0.95–1.5] unresolved | 1× [0.99–1.1] unresolved | 1.9× [1.3–2] | 0.91× [0.8–0.98] | 0.95× [0.91–0.98] | 2× [1.9–2.5] | 1.3× [1.1–1.4] |
| guard.invalid.slug | ts/node | reference | 1.1× [1–1.2] | 1× [1–1.1] | 1.2× [0.84–1.4] unresolved | 0.99× [0.91–1] unresolved | 0.99× [0.91–1] unresolved | 1.7× [1.5–1.8] | 1.8× [1.7–1.8] |
| guard.invalid.uuid | ts/node | reference | 1.1× [1–1.4] | 1× [0.96–1] unresolved | 0.51× [0.47–0.72] | 1.1× [0.78–1.2] unresolved | 0.63× [0.6–0.65] | 1.3× [0.77–1.7] unresolved | 1.1× [1.1–1.2] |
| guard.slug | ts/node | reference | 1× [0.91–1.1] unresolved | 0.97× [0.95–1.1] unresolved | 1.1× [0.69–1.7] unresolved | 0.99× [0.89–1.1] unresolved | 1.1× [0.99–1.1] unresolved | 1.6× [1.5–1.7] | 0.99× [0.91–1] unresolved |
| guard.slug.any | ts/node | reference | 1× [0.93–1.1] unresolved | 0.96× [0.91–1.1] unresolved | 1.1× [1–1.2] | 1× [0.89–1.1] unresolved | 1.1× [1–1.1] | 1.6× [1.3–1.6] | 0.93× [0.86–1] unresolved |
| guard.slug.v4 | ts/node | reference | 1× [0.86–1.2] unresolved | 0.99× [0.94–1] unresolved | 1.3× [0.78–1.4] unresolved | 0.99× [0.9–1.1] unresolved | 1.2× [1.1–1.3] | 1.8× [1.7–2.1] | 1.1× [1–1.2] |
| guard.uuid | ts/node | reference | 0.9× [0.3–0.98] | 1× [0.95–1.2] unresolved | 0.52× [0.49–0.61] | 1× [0.94–1.1] unresolved | 1× [1–1.1] | 1× [0.98–1.3] unresolved | 0.63× [0.56–0.69] |
| guard.uuid.any | ts/node | reference | 0.99× [0.82–1] | 1× [0.95–1.1] unresolved | 0.91× [0.85–0.99] | 1× [0.88–1.1] unresolved | 1× [1–1.1] | 1.1× [1–1.2] | 0.87× [0.82–0.9] |
| guard.uuid.braced | ts/node | reference | 1.2× [1.1–1.5] | 1× [1–1.1] unresolved | 0.51× [0.47–0.6] | 0.81× [0.76–0.88] | 0.68× [0.6–0.71] | 0.72× [0.69–0.74] | 0.48× [0.43–0.54] |
| guard.uuid.compact | ts/node | reference | 1.1× [1.1–1.2] | 1× [0.99–1.1] unresolved | 0.58× [0.52–0.7] | 0.85× [0.81–0.92] | 0.66× [0.62–0.71] | 0.72× [0.63–0.75] | 0.59× [0.52–0.68] |
| guard.uuid.mixed | ts/node | reference | 0.97× [0.91–1] | 0.99× [0.9–1.1] unresolved | 0.57× [0.52–0.77] | 0.99× [0.98–1.1] unresolved | 1× [0.94–1.1] unresolved | 1.1× [0.78–1.1] unresolved | 0.47× [0.42–0.5] |
| guard.uuid.text | ts/node | reference | 0.98× [0.87–1.2] unresolved | 1× [0.92–1.1] unresolved | 0.6× [0.36–0.66] | 0.96× [0.9–1] unresolved | 1.1× [0.98–1.1] unresolved | 1.1× [0.7–1.2] unresolved | 0.47× [0.45–0.54] |
| guard.uuid.urn | ts/node | reference | 1.2× [0.75–1.7] unresolved | 1× [0.98–1.1] unresolved | 0.48× [0.46–0.56] | 0.88× [0.86–0.92] | 0.65× [0.61–0.71] | 0.83× [0.81–0.9] | 0.46× [0.41–0.49] |
| guard.uuid.v4 | ts/node | reference | 0.91× [0.8–0.99] | 1× [0.95–1.1] unresolved | 0.3× [0.29–0.45] | 1× [0.95–1.1] unresolved | 1.1× [0.99–1.2] unresolved | 1× [0.89–1.1] unresolved | 0.31× [0.3–0.35] |
| invalid.alphabet | ts/node | reference | 1.7× [1.7–1.8] | 0.96× [0.88–1] unresolved | 0.12× [0.097–0.19] | 2.7× [2.4–3.4] | 0.91× [0.9–0.91] | 0.85× [0.8–1.1] unresolved | 0.13× [0.12–0.13] |
| invalid.async.mask.cancelled | ts/node | reference | 1.7× [1.6–2.1] | 0.99× [0.83–1] unresolved | 0.28× [0.26–0.49] | 1.1× [1.1–1.3] | 0.95× [0.88–0.97] | 1.8× [1.5–1.9] | 0.42× [0.41–0.45] |
| invalid.construct.codec.sentinel | ts/node | reference | 1.9× [1.9–2] | 1× [1–1.1] | 0.37× [0.35–0.52] | 2.5× [2.4–2.7] | 1.5× [1.5–1.7] | 1.2× [0.95–1.2] unresolved | 0.45× [0.41–0.47] |
| invalid.construct.custom | ts/node | reference | 2.1× [2–2.3] | 1.2× [1.1–1.2] | 0.16× [0.15–0.23] | 3× [0.79–3.2] unresolved | 1.5× [1.5–1.5] | 0.84× [0.52–0.88] | 0.19× [0.14–0.2] |
| invalid.construct.generator | ts/node | reference | 2.2× [2.1–2.3] | 1.2× [1.1–1.2] | 0.12× [0.09–0.13] | 3× [2.6–3.3] | 1.5× [1.5–1.6] | 0.96× [0.85–0.98] | 0.14× [0.11–0.14] |
| invalid.construct.mask | ts/node | reference | 2.2× [2.1–2.3] | 1.2× [1.1–1.2] | 0.17× [0.16–0.18] | 3.5× [2.6–3.7] | 2× [2–2] | 0.98× [0.88–1] unresolved | 0.27× [0.26–0.28] |
| invalid.error.propagate | ts/node | reference | 2.4× [2.2–2.4] | 1.2× [1.2–1.3] | 0.24× [0.23–0.34] | 3.7× [3.4–4.2] | 2.1× [2.1–2.1] | 1.3× [1.2–1.4] | 0.45× [0.38–0.47] |
| invalid.mask | ts/node | reference | 2× [1.9–2] | 0.89× [0.83–0.97] | 0.15× [0.15–0.29] | 2.8× [2.6–3] | 1.2× [1.2–1.2] | 0.9× [0.54–0.91] | 0.16× [0.16–0.17] |
| invalid.mask.custom | ts/node | reference | 2.1× [2–2.2] | 0.96× [0.94–1.1] unresolved | 0.2× [0.19–0.41] | 1.7× [1.6–1.7] | 1.8× [1.8–1.8] | 1.9× [1.4–2.3] | 0.3× [0.29–0.31] |
| invalid.mask.into.range | ts/node | reference | 1.9× [1.8–2] | 0.97× [0.95–1] unresolved | 0.13× [0.12–0.16] | 2.7× [2.6–3.6] | 1× [1–1] | 0.84× [0.81–0.87] | 0.14× [0.13–0.14] |
| invalid.mask.sentinel-collision | ts/node | reference | 2.1× [1.9–2.1] | 1.1× [0.75–1.2] unresolved | 0.26× [0.25–0.41] | 3.3× [2.9–3.5] | 1.6× [1.4–1.6] | 1.1× [1–1.1] | 0.29× [0.28–0.31] |
| invalid.mask.sentinel-collision.base32 | ts/node | reference | 2.1× [2–2.1] | 1.1× [1.1–1.2] | 0.26× [0.25–0.35] | 3.3× [3.2–3.5] | 1.6× [1.6–1.6] | 1.1× [0.57–1.1] unresolved | 0.29× [0.28–0.3] |
| invalid.mask.version | ts/node | reference | 1.8× [1.7–1.9] | 0.94× [0.89–1] | 0.11× [0.078–0.19] | 2.8× [2.4–2.9] | 0.93× [0.92–0.96] | 0.7× [0.63–0.71] | 0.12× [0.11–0.12] |
| invalid.migration | ts/node | reference | 2.4× [2.3–2.6] | 0.93× [0.91–1] | 0.16× [0.13–0.18] | 1.8× [1.6–1.9] | 1.2× [1.2–1.2] | 1.2× [1.1–1.2] | 0.18× [0.16–0.19] |
| invalid.migration.masks1.miss | ts/node | reference | 2× [1.9–2.7] | 1× [0.98–1] unresolved | 0.22× [0.11–0.24] | 3.2× [3–3.3] | 1.5× [1.5–1.6] | 0.94× [0.9–0.97] | 0.25× [0.21–0.27] |
| invalid.migration.masks16.miss | ts/node | reference | 1.4× [1.1–2.4] | 0.99× [0.97–0.99] | 0.61× [0.58–0.85] | 2.4× [2.2–2.4] | 1.2× [1.2–1.2] | 1.6× [1.5–1.7] | 0.64× [0.45–0.66] |
| invalid.migration.masks4.miss | ts/node | reference | 1.8× [1.8–2.8] | 1× [0.98–1] unresolved | 0.36× [0.23–0.38] | 2.9× [2.7–3] | 1.4× [1.4–1.5] | 1.2× [1.1–1.2] | 0.4× [0.37–0.42] |
| invalid.migration.masks8.miss | ts/node | reference | 1.6× [1.6–2] | 1× [0.96–1] unresolved | 0.48× [0.46–0.52] | 2.7× [2.4–2.8] | 1.3× [1.3–1.4] | 1.4× [1.3–1.5] | 0.51× [0.51–0.52] |
| invalid.migrationCandidates | ts/node | reference | 2.3× [2.3–2.4] | 0.94× [0.9–0.99] | 0.17× [0.16–0.21] | 1.9× [1.6–1.9] | 1.2× [1.2–1.2] | 1.1× [0.99–1.2] unresolved | 0.17× [0.16–0.18] |
| invalid.rotation16.miss | ts/node | reference | 1.7× [1.6–1.7] | 0.92× [0.9–0.96] | 0.36× [0.3–0.46] | 2.2× [2.1–2.4] | 1.1× [1.1–1.1] | 1.4× [1.3–1.4] | 0.39× [0.29–0.4] |
| invalid.rotation4.miss | ts/node | reference | 1.9× [1.9–2.3] | 0.91× [0.87–0.92] | 0.21× [0.18–0.22] | 2.7× [2.5–2.8] | 1.1× [1.1–1.1] | 1.1× [1.1–1.2] | 0.24× [0.23–0.27] |
| invalid.rotation8.miss | ts/node | reference | 1.8× [1.8–1.8] | 0.91× [0.9–0.93] | 0.27× [0.17–0.32] | 2.5× [2.2–2.7] | 1.1× [1.1–1.1] | 1.2× [1.2–1.2] | 0.3× [0.2–0.3] |
| invalid.slug | ts/node | reference | 2.4× [2.4–2.5] | 0.96× [0.83–1] unresolved | 0.15× [0.098–0.31] | 1.8× [1.6–1.9] | 1.3× [1.3–1.4] | 1.1× [1–1.2] | 0.16× [0.16–0.17] |
| invalid.slug.base32.early | ts/node | reference | 2.4× [2.3–2.5] | 0.94× [0.9–1] unresolved | 0.15× [0.11–0.26] | 2× [1.8–2.2] | 1.6× [1.5–1.6] | 1× [1–1.1] unresolved | 0.17× [0.17–0.18] |
| invalid.slug.base32.late | ts/node | reference | 2.4× [2.2–2.4] | 0.95× [0.91–1] unresolved | 0.17× [0.16–0.27] | 2× [1.8–2.2] | 1.5× [1.5–1.6] | 1× [0.66–1.1] unresolved | 0.17× [0.16–0.18] |
| invalid.slug.base32.middle | ts/node | reference | 2.4× [2.3–2.5] | 0.95× [0.78–1] unresolved | 0.16× [0.16–0.17] | 2× [1.8–2.1] | 1.6× [1.5–1.6] | 1× [0.97–1.1] unresolved | 0.17× [0.17–0.17] |
| invalid.slug.base32.tail | ts/node | reference | 2.4× [2.2–2.5] | 0.96× [0.93–1] unresolved | 0.14× [0.14–0.15] | 3.6× [3.2–3.6] | 1.6× [1.5–1.6] | 0.95× [0.91–1.1] unresolved | 0.16× [0.15–0.16] |
| invalid.slug.base64.early | ts/node | reference | 2.4× [2.2–2.4] | 0.97× [0.82–1] unresolved | 0.15× [0.11–0.18] | 1.8× [1.6–1.9] | 1.3× [1.3–1.3] | 1× [0.99–1.1] unresolved | 0.17× [0.16–0.17] |
| invalid.slug.base64.late | ts/node | reference | 2.4× [2.3–2.4] | 0.95× [0.89–1] unresolved | 0.16× [0.15–0.19] | 1.8× [1.6–1.9] | 1.3× [1.3–1.3] | 1× [0.98–1] unresolved | 0.17× [0.17–0.17] |
| invalid.slug.base64.middle | ts/node | reference | 2.4× [2.2–2.4] | 0.94× [0.89–1] unresolved | 0.15× [0.1–0.2] | 1.8× [1.5–1.9] | 1.3× [1.3–1.3] | 1× [0.85–1.1] unresolved | 0.17× [0.16–0.17] |
| invalid.slug.base64.tail | ts/node | reference | 2.1× [2–2.3] | 0.9× [0.85–0.97] | 0.13× [0.085–0.14] | 3× [2.8–3.1] | 1.3× [1.2–1.3] | 0.93× [0.64–0.96] | 0.14× [0.14–0.15] |
| invalid.slug.format.range | ts/node | reference | 1.9× [1.4–2] | 0.99× [0.95–1.1] unresolved | 0.11× [0.082–0.16] | 2.9× [2.7–3] | 1.1× [1.1–1.1] | 0.95× [0.88–0.96] | 0.14× [0.14–0.14] |
| invalid.slug.into.range | ts/node | reference | 2× [1.9–2] | 0.96× [0.73–1] unresolved | 0.13× [0.11–0.16] | 2.8× [2.6–3] | 1× [1–1] unresolved | 0.88× [0.82–0.92] | 0.14× [0.14–0.14] |
| invalid.slug.uuid | ts/node | reference | 2.3× [2.2–2.3] | 0.93× [0.92–1] unresolved | 0.16× [0.15–0.19] | 3× [2.7–3.1] | 1.2× [1.2–1.3] | 0.95× [0.93–1] unresolved | 0.17× [0.16–0.17] |
| invalid.timestamp.extract.range | ts/node | reference | 1.8× [1.7–2] | 0.98× [0.94–1.1] unresolved | 0.13× [0.079–0.16] | 2.7× [2.5–2.9] | 0.95× [0.94–0.97] | 0.82× [0.8–0.84] | 0.14× [0.14–0.14] |
| invalid.timestamp.slug.version | ts/node | reference | 2.2× [2–2.2] | 1.2× [1.1–1.2] | 0.15× [0.15–0.15] | 3.4× [3.3–5] | 1.6× [1.6–1.6] | 0.86× [0.8–0.88] | 0.17× [0.11–0.18] |
| invalid.timestamp.slug.window | ts/node | reference | 2× [1.9–2] | 1.1× [0.84–1.2] unresolved | 0.2× [0.17–0.32] | 3.2× [3–3.4] | 1.6× [1.5–1.6] | 0.92× [0.89–1] unresolved | 0.23× [0.2–0.24] |
| invalid.timestamp.version | ts/node | reference | 2.1× [2–2.2] | 1.2× [1.1–1.2] | 0.16× [0.16–0.21] | 3.4× [3.2–3.9] | 1.5× [1.5–1.6] | 0.83× [0.72–0.84] | 0.18× [0.17–0.18] |
| invalid.timestamp.window | ts/node | reference | 2× [1.9–2.1] | 1.1× [1.1–1.1] | 0.21× [0.2–0.26] | 3.2× [3–3.3] | 1.5× [1.5–1.5] | 0.89× [0.76–0.91] | 0.24× [0.22–0.25] |
| invalid.uuid | ts/node | reference | 1.9× [1.8–2.1] | 1× [0.95–1.1] unresolved | 0.12× [0.11–0.13] | 2.9× [2.7–3.2] | 1× [0.98–1] unresolved | 0.77× [0.74–0.79] | 0.13× [0.13–0.14] |
| invalid.uuid.format.range | ts/node | reference | 1.8× [1.8–1.9] | 0.98× [0.95–1] unresolved | 0.13× [0.083–0.17] | 2.8× [2.6–2.9] | 0.95× [0.95–0.97] | 0.87× [0.81–0.94] | 0.14× [0.14–0.15] |
| invalid.uuid.hex.early | ts/node | reference | 1.9× [1.8–7] | 1× [0.98–1.1] unresolved | 0.14× [0.12–0.15] | 2.9× [2.6–3.1] | 1.1× [1–1.1] | 0.79× [0.74–0.81] | 0.15× [0.14–0.15] |
| invalid.uuid.hex.late | ts/node | reference | 1.8× [1.8–2] | 0.99× [0.97–1.1] unresolved | 0.15× [0.13–0.29] | 2.9× [2.6–3.1] | 1.1× [1–1.1] | 0.83× [0.81–0.83] | 0.16× [0.15–0.16] |
| invalid.uuid.hex.middle | ts/node | reference | 1.9× [1.8–2] | 1× [0.97–1] unresolved | 0.14× [0.098–0.21] | 2.9× [2.5–3] | 1.1× [0.55–1.1] unresolved | 0.82× [0.8–0.87] | 0.15× [0.15–0.15] |
| invalid.uuid.into.range | ts/node | reference | 1.9× [1.8–2] | 0.96× [0.94–1] unresolved | 0.13× [0.11–0.22] | 2.9× [2.5–3] | 1.1× [1–1.1] | 0.91× [0.87–0.93] | 0.14× [0.14–0.14] |
| invalid.uuid.slug | ts/node | reference | 1.9× [1.9–2] | 0.99× [0.95–1] unresolved | 0.12× [0.096–0.19] | 2.9× [2.5–3] | 0.98× [0.96–1] unresolved | 0.8× [0.77–0.81] | 0.13× [0.12–0.13] |
| invalid.v4.into.range | ts/node | reference | 1.9× [1.8–2] | 0.96× [0.8–1] unresolved | 0.13× [0.11–0.2] | 2.8× [2.6–2.9] | 1× [1–1.1] | 0.83× [0.67–0.91] | 0.14× [0.083–0.15] |
| invalid.v7.at.into.range | ts/node | reference | 2× [2–2.2] | 0.85× [0.79–0.94] | 0.13× [0.1–0.31] | 1.1× [1–1.2] | 1.2× [1.2–1.2] | 1× [0.97–1.1] unresolved | 0.14× [0.13–0.14] |
| invalid.v7.into.range | ts/node | reference | 1.9× [1.8–2.3] | 0.79× [0.75–0.89] | 0.11× [0.11–0.15] | 1.4× [1.2–1.5] | 1.1× [1–1.1] | 0.86× [0.83–0.87] | 0.12× [0.086–0.13] |
| mask.binary.arraybuffer-input | ts/node | reference | 0.97× [0.94–1.1] unresolved | 0.97× [0.95–0.99] | 0.83× [0.69–1.2] unresolved | 1.6× [1.4–1.9] | 0.98× [0.97–1] | 1.9× [1.5–2] | 0.83× [0.8–0.86] |
| mask.binary.dataview-input | ts/node | reference | 0.95× [0.94–1] unresolved | 0.97× [0.96–0.98] | 0.88× [0.82–1.1] unresolved | 1.5× [1.4–1.7] | 0.96× [0.88–0.99] | 1.7× [1–1.9] | 0.91× [0.86–0.94] |
| mask.binary.sentinel | ts/node | reference | 0.88× [0.85–0.94] | 0.82× [0.78–0.86] | 0.5× [0.35–0.68] | 2.3× [2.1–3.2] | 0.86× [0.84–0.88] | 0.73× [0.65–0.78] | 0.52× [0.48–0.55] |
| mask.binary.text-input | ts/node | reference | 0.98× [0.97–1] unresolved | 0.96× [0.95–1] unresolved | 0.68× [0.64–1] unresolved | 1.8× [1.7–2.7] | 0.91× [0.86–0.91] | 1.3× [1–1.4] | 0.68× [0.61–0.7] |
| mask/base32 | ts/node | reference | 1× [1–1.1] | 0.99× [0.98–1] unresolved | 0.89× [0.86–1] unresolved | 0.97× [0.94–1] unresolved | 0.94× [0.93–0.97] | 1.7× [1.2–2] | 1.1× [0.96–1.1] unresolved |
| mask/base32/sentinels | ts/node | reference | 1× [1–1] | 0.99× [0.96–1] unresolved | 0.88× [0.53–0.97] | 0.97× [0.95–1] | 0.95× [0.93–0.97] | 1.7× [1–1.7] unresolved | 1× [0.97–1] unresolved |
| mask/base64 | ts/node | reference | 1× [1–1] | 1× [0.97–1] unresolved | 0.95× [0.68–1.1] unresolved | 0.99× [0.91–1.1] unresolved | 0.94× [0.92–0.97] | 1.8× [0.84–1.9] unresolved | 1.1× [0.79–1.1] unresolved |
| mask/binary/caller-buffer | ts/node | reference | 0.94× [0.93–0.98] | 0.96× [0.94–0.96] | 0.83× [0.77–0.92] | 1.5× [1.4–1.8] | 0.97× [0.96–0.98] | 1.8× [1.3–1.9] | 0.86× [0.82–0.88] |
| mask/binary/owned | ts/node | reference | 0.96× [0.93–0.99] | 0.95× [0.93–1] unresolved | 0.79× [0.75–0.89] | 1.6× [1.5–1.8] | 0.98× [0.98–1] | 1.9× [1.1–2] | 0.81× [0.53–0.82] |
| masked.base32.decode | ts/node | reference | 1× [0.98–1.1] unresolved | 0.99× [0.97–1] unresolved | 0.78× [0.68–0.9] | 1.4× [1.3–1.5] | 0.9× [0.88–0.91] | 1.5× [1.5–1.6] | 0.88× [0.82–0.89] |
| masked.base32.decode.bytes | ts/node | reference | 0.95× [0.91–1.1] unresolved | 0.93× [0.92–0.95] | 0.74× [0.69–0.87] | 1.4× [1.4–1.5] | 0.93× [0.9–0.94] | 1.5× [1.5–1.6] | 0.71× [0.51–0.72] |
| masked.base32.decode.into | ts/node | reference | 0.99× [0.95–1.1] unresolved | 0.96× [0.94–0.98] | 0.79× [0.75–0.87] | 1.4× [1.4–1.5] | 0.92× [0.9–0.92] | 1.5× [1.5–1.6] | 0.74× [0.71–0.75] |
| masked.base32.encode | ts/node | reference | 1× [1–1.1] | 0.99× [0.96–1] unresolved | 0.82× [0.7–0.9] | 0.92× [0.9–0.93] | 0.88× [0.85–0.88] | 1.5× [1.5–1.6] | 0.9× [0.84–0.91] |
| masked.base32.encode.bytes | ts/node | reference | 1× [0.99–1.2] unresolved | 1× [0.98–1] unresolved | 0.89× [0.88–1.2] unresolved | 0.97× [0.93–1] unresolved | 0.95× [0.94–0.96] | 1.7× [1.6–1.8] | 1× [0.99–1] unresolved |
| masked.base32.generate | ts/node | reference | 1.1× [0.96–1.8] unresolved | 0.98× [0.94–1] unresolved | 0.82× [0.66–0.88] | 1.3× [1.2–1.4] | 0.96× [0.89–0.98] | 1.6× [1.2–1.6] | 0.86× [0.84–0.89] |
| masked.custom.decode | ts/node | reference | 1.1× [1–1.5] | 0.95× [0.93–1] unresolved | 0.71× [0.58–0.8] | 1.9× [1.8–2.1] | 1× [0.98–1] unresolved | 1.2× [1.2–1.2] | 0.9× [0.75–0.9] |
| masked.custom.decode.bytes | ts/node | reference | 1× [0.99–1.1] unresolved | 0.91× [0.88–0.93] | 0.68× [0.48–0.76] | 2× [1.8–2.2] | 1× [1–1.1] | 1.1× [1.1–1.2] | 0.79× [0.54–0.8] |
| masked.custom.decode.into | ts/node | reference | 1× [1–1.1] | 0.94× [0.91–0.96] | 0.71× [0.59–0.79] | 2× [1.8–2.2] | 1× [0.94–1] unresolved | 1.2× [1.1–1.2] | 0.79× [0.63–0.81] |
| masked.custom.encode | ts/node | reference | 1.1× [1.1–1.3] | 0.97× [0.95–0.98] | 0.84× [0.74–0.97] | 1.7× [1.5–1.9] | 1× [0.96–1] unresolved | 1.2× [1.2–1.2] | 1× [0.98–1] unresolved |
| masked.decode | ts/node | reference | 1× [1–1.3] | 1× [0.96–1] unresolved | 0.81× [0.6–0.99] | 1.4× [1.3–1.5] | 0.9× [0.89–0.9] | 1.7× [1.6–1.7] | 0.88× [0.76–0.9] |
| masked.decode.bytes | ts/node | reference | 0.98× [0.95–1.6] unresolved | 0.96× [0.94–0.99] | 0.76× [0.7–0.85] | 1.5× [1.4–1.5] | 0.93× [0.89–0.95] | 1.7× [1.6–1.7] | 0.71× [0.64–0.72] |
| masked.decode.into | ts/node | reference | 1× [0.97–1.2] unresolved | 0.98× [0.94–1] unresolved | 0.72× [0.64–0.85] | 1.4× [1.3–1.9] | 0.92× [0.91–0.94] | 1.7× [1.6–1.7] | 0.73× [0.68–0.75] |
| masked.encode | ts/node | reference | 1.1× [1–1.6] | 1× [0.96–1.2] unresolved | 0.86× [0.73–0.95] | 0.95× [0.84–0.98] | 0.88× [0.81–0.9] | 1.6× [1.5–1.7] | 0.94× [0.93–0.96] |
| masked.encode.bytes | ts/node | reference | 1.1× [1–1.4] | 1× [0.92–1] unresolved | 0.95× [0.89–1.1] unresolved | 0.96× [0.85–1] unresolved | 0.95× [0.86–0.97] | 1.8× [1.7–1.9] | 1× [1–1] |
| masked.generate | ts/node | reference | 1.1× [0.95–1.4] unresolved | 1× [0.98–1] unresolved | 0.9× [0.7–1.2] unresolved | 1.3× [1.2–1.4] | 0.97× [0.95–1] unresolved | 1.6× [1.4–1.7] | 0.86× [0.84–0.87] |
| masked.generate.selected-generator | ts/node | reference | 1.3× [1.2–1.9] | 0.99× [0.96–1] unresolved | 0.67× [0.35–0.72] | 1.2× [1.1–1.3] | 0.96× [0.85–0.97] | 1.4× [1.3–1.5] | 0.72× [0.71–0.74] |
| masked.pair.base32 | ts/node | reference | 1× [0.95–1.8] unresolved | 0.98× [0.97–1.3] unresolved | 0.89× [0.62–0.98] | 1.2× [1.1–1.3] | 0.92× [0.68–0.96] | 1.6× [1.1–1.7] | 0.99× [0.96–1] unresolved |
| masked.pair.default | ts/node | reference | 1× [0.94–1.1] unresolved | 0.97× [0.94–0.99] | 0.96× [0.78–1.1] unresolved | 1.2× [1.1–1.3] | 0.92× [0.76–0.95] | 1.6× [1.5–1.7] | 0.97× [0.96–1] |
| masked.pair.selected-generator | ts/node | reference | 1.2× [1.1–2.1] | 1× [0.95–1] unresolved | 0.74× [0.54–0.86] | 1.3× [1.2–1.3] | 0.91× [0.83–0.93] | 1.4× [1.2–1.4] | 0.82× [0.8–0.83] |
| migration.base32 | ts/node | reference | 1× [1–1.1] | 0.96× [0.94–1] unresolved | 0.66× [0.5–0.68] | 1.4× [1.4–1.6] | 0.85× [0.79–0.9] | 1.2× [1.2–1.3] | 0.79× [0.75–0.81] |
| migration.base32Candidates | ts/node | reference | 1× [1–1.2] | 0.98× [0.95–1] unresolved | 0.65× [0.43–0.71] | 1.4× [1.3–1.5] | 0.87× [0.86–0.91] | 1.2× [1.1–1.2] | 0.76× [0.73–0.78] |
| migration.candidates1.distinct | ts/node | reference | 1.1× [1.1–2.1] | 0.97× [0.96–0.98] | 0.73× [0.69–0.94] | 1.9× [1.8–2] | 1× [1–1.1] unresolved | 1.2× [1.1–1.3] | 0.87× [0.5–0.91] |
| migration.candidates1.duplicate | ts/node | reference | 1.1× [1–3.5] | 0.98× [0.97–1] | 0.72× [0.59–0.73] | 1.8× [1.7–2.1] | 1× [0.99–1.1] unresolved | 1.2× [1.1–1.3] | 0.88× [0.82–0.9] |
| migration.candidates16.distinct | ts/node | reference | 1.1× [1.1–2] | 0.97× [0.96–1] unresolved | 0.77× [0.69–0.81] | 1.6× [1.5–1.7] | 1.1× [1–1.1] | 1.3× [1.2–1.4] | 0.96× [0.92–0.99] |
| migration.candidates16.duplicate | ts/node | reference | 1.1× [1–1.7] | 0.97× [0.96–0.99] | 0.75× [0.68–0.79] | 1.6× [1.5–1.7] | 1.1× [1–1.1] | 1.3× [1.2–2] | 0.95× [0.68–0.98] |
| migration.candidates32.distinct | ts/node | reference | 1.1× [1.1–2] | 0.97× [0.95–1] unresolved | 0.77× [0.7–0.83] | 1.5× [1.4–1.6] | 1.1× [0.99–1.1] unresolved | 1.3× [1.3–1.4] | 0.96× [0.75–0.98] |
| migration.candidates32.duplicate | ts/node | reference | 1.1× [1.1–2.1] | 0.98× [0.94–1] unresolved | 0.77× [0.73–0.9] | 1.6× [1.6–1.6] | 1.1× [1–1.1] unresolved | 1.2× [1.1–1.4] | 0.96× [0.87–1] unresolved |
| migration.candidates4.distinct | ts/node | reference | 1.1× [1–2] | 0.97× [0.95–1] unresolved | 0.75× [0.73–0.8] | 1.7× [1.6–1.8] | 1× [1–1.1] | 1.2× [1.2–1.6] | 0.94× [0.72–0.94] |
| migration.candidates4.duplicate | ts/node | reference | 1.1× [1–2] | 0.97× [0.96–1] | 0.74× [0.42–0.77] | 1.7× [1.6–2] | 1.1× [1–1.1] | 1.2× [1.2–1.3] | 0.93× [0.59–0.95] |
| migration.candidates64.distinct | ts/node | reference | 1.1× [0.99–1.4] unresolved | 0.98× [0.93–0.99] | 0.79× [0.64–0.86] | 1.5× [1.4–1.6] | 1.1× [1–1.1] | 1.3× [1.3–1.4] | 0.97× [0.9–0.98] |
| migration.candidates64.duplicate | ts/node | reference | 1.1× [1.1–1.5] | 0.97× [0.96–0.98] | 0.75× [0.61–0.8] | 1.6× [1.5–1.9] | 1.1× [1–1.1] | 1.2× [1.2–1.9] | 0.98× [0.87–1] |
| migration.candidates8.distinct | ts/node | reference | 1.1× [1–2] | 0.97× [0.95–1] unresolved | 0.77× [0.6–0.81] | 1.6× [1.5–1.8] | 1.1× [1–1.1] | 1.2× [1.2–1.4] | 0.97× [0.84–0.99] |
| migration.candidates8.duplicate | ts/node | reference | 1.1× [1–1.7] | 0.98× [0.97–0.98] | 0.76× [0.73–1.1] unresolved | 1.6× [1.5–1.7] | 1.1× [1–1.1] | 1.2× [1.2–1.8] | 0.95× [0.77–0.99] |
| migration.current | ts/node | reference | 0.98× [0.96–1.2] unresolved | 0.91× [0.89–0.94] | 0.65× [0.59–0.71] | 1.5× [1.5–1.6] | 0.98× [0.95–1] | 1.4× [1.4–1.4] | 0.71× [0.67–0.72] |
| migration.decodeCandidates | ts/node | reference | 1.1× [1.1–1.2] | 1× [0.96–1.1] unresolved | 0.85× [0.57–0.94] | 1.4× [1.4–1.5] | 1× [0.99–1] unresolved | 1.6× [1.5–1.6] | 0.95× [0.84–0.99] |
| migration.directCandidates | ts/node | reference | 1.1× [1–1.5] | 1× [0.97–1] unresolved | 0.62× [0.47–0.75] | 1.5× [1.4–1.7] | 0.93× [0.9–0.94] | 1.2× [1.2–1.2] | 0.7× [0.63–0.72] |
| migration.masks1.candidates | ts/node | reference | 1.1× [1.1–2.2] | 1× [0.97–1] unresolved | 0.76× [0.73–0.88] | 1.5× [1.4–1.6] | 0.99× [0.97–1] unresolved | 1.5× [1.4–1.5] | 0.84× [0.74–0.88] |
| migration.masks1.first | ts/node | reference | 1.1× [1.1–3.1] | 0.98× [0.97–0.99] | 0.71× [0.48–0.75] | 1.5× [1.2–1.6] | 0.97× [0.93–1] unresolved | 1.5× [1.5–1.6] | 0.85× [0.83–0.87] |
| migration.masks1.last | ts/node | reference | 1.1× [1.1–3.8] | 1× [0.97–1] unresolved | 0.72× [0.6–0.74] | 1.5× [1.5–1.6] | 1× [0.98–1.1] unresolved | 1.5× [1.5–1.6] | 0.84× [0.67–0.85] |
| migration.masks1.middle | ts/node | reference | 1.1× [1.1–1.7] | 0.99× [0.97–1] unresolved | 0.67× [0.54–0.71] | 1.6× [1.5–1.6] | 1× [0.97–1.1] unresolved | 1.5× [1.5–1.6] | 0.82× [0.59–0.84] |
| migration.masks16.candidates | ts/node | reference | 1.1× [1–1.8] | 0.98× [0.97–1] unresolved | 0.86× [0.83–0.95] | 1× [0.99–1.1] unresolved | 1× [0.98–1] unresolved | 2.2× [2–3.6] | 0.92× [0.85–0.92] |
| migration.masks16.first | ts/node | reference | 1.1× [0.96–2.7] unresolved | 0.99× [0.98–1] unresolved | 0.73× [0.71–0.92] | 1.5× [1.5–1.7] | 1× [0.96–1] unresolved | 1.5× [1.4–1.6] | 0.83× [0.81–0.85] |
| migration.masks16.last | ts/node | reference | 0.99× [0.9–1.9] unresolved | 0.97× [0.94–0.98] | 0.88× [0.82–0.97] | 1.7× [1.6–1.8] | 0.99× [0.96–1] unresolved | 2× [1.9–2.3] | 0.93× [0.89–0.95] |
| migration.masks16.middle | ts/node | reference | 1× [0.92–1.9] unresolved | 0.98× [0.96–1] | 0.86× [0.83–0.92] | 1.6× [1.6–1.8] | 1× [0.96–1] unresolved | 1.9× [1.8–2.1] | 0.93× [0.93–0.95] |
| migration.masks4.candidates | ts/node | reference | 1.1× [1.1–2] | 0.98× [0.98–1] unresolved | 0.8× [0.8–1.2] unresolved | 1.2× [1–1.3] | 1× [1–1.1] | 1.9× [1.8–2.1] | 0.88× [0.72–0.9] |
| migration.masks4.first | ts/node | reference | 1.1× [1.1–1.9] | 0.98× [0.96–1] unresolved | 0.71× [0.7–0.76] | 1.6× [1.5–1.7] | 1× [0.96–1.1] unresolved | 1.5× [1.4–1.5] | 0.83× [0.79–0.85] |
| migration.masks4.last | ts/node | reference | 1× [1–1.2] | 0.98× [0.93–0.99] | 0.79× [0.69–0.84] | 1.6× [1.5–1.6] | 1× [0.97–1] unresolved | 1.8× [1.7–1.8] | 0.92× [0.84–0.93] |
| migration.masks4.middle | ts/node | reference | 1× [1–1.9] | 0.97× [0.94–1] unresolved | 0.78× [0.38–0.82] | 1.6× [1.4–1.7] | 1× [0.97–1] unresolved | 1.7× [1.6–1.8] | 0.89× [0.56–0.9] |
| migration.masks8.candidates | ts/node | reference | 1.1× [1–1.7] | 0.98× [0.97–0.99] | 0.84× [0.71–1.1] unresolved | 1.1× [1.1–1.2] | 1× [0.99–1] unresolved | 2.1× [1.9–2.3] | 0.9× [0.88–0.92] |
| migration.masks8.first | ts/node | reference | 1.1× [1–2.1] | 0.98× [0.94–1] | 0.72× [0.69–0.74] | 1.6× [1.1–1.7] | 0.99× [0.96–1] unresolved | 1.5× [1.4–1.6] | 0.84× [0.6–0.85] |
| migration.masks8.last | ts/node | reference | 1× [0.99–1.1] unresolved | 0.97× [0.95–0.98] | 0.87× [0.74–0.95] | 1.6× [1.6–1.8] | 1× [0.97–1] unresolved | 1.9× [1.5–2] | 0.92× [0.85–0.94] |
| migration.masks8.middle | ts/node | reference | 1× [1–1.9] | 0.97× [0.96–1] unresolved | 0.79× [0.77–0.88] | 1.6× [1.5–1.7] | 1× [0.97–1] unresolved | 1.8× [1.7–2] | 0.91× [0.87–0.93] |
| migration.original | ts/node | reference | 1.3× [1.3–2] | 1.2× [1.2–1.3] | 1.1× [0.72–1.1] unresolved | 2× [1.9–2.2] | 0.91× [0.9–0.93] | 1.3× [1.3–1.3] | 1.2× [1–1.3] |
| migration.originalCandidates | ts/node | reference | 1.3× [1.3–1.7] | 1.2× [1.2–1.2] | 1× [0.95–1.1] unresolved | 1.9× [1.7–2] | 0.93× [0.88–0.95] | 1.3× [1.2–1.3] | 1.1× [0.99–1.2] unresolved |
| migration.plain | ts/node | reference | 1× [1–1.3] | 0.98× [0.97–1] unresolved | 0.64× [0.41–0.71] | 1.6× [1.5–1.7] | 0.9× [0.87–0.9] | 1.2× [1.2–1.3] | 0.76× [0.52–0.78] |
| migration.previous | ts/node | reference | 1× [0.97–1.1] unresolved | 0.93× [0.91–0.99] | 0.69× [0.41–0.77] | 1.5× [1.5–1.7] | 0.94× [0.89–1] | 1.6× [1.5–1.7] | 0.74× [0.72–0.77] |
| migration.previousCandidates | ts/node | reference | 1.1× [1.1–1.2] | 1× [0.93–1.1] unresolved | 0.83× [0.67–0.93] | 1.4× [1.4–1.5] | 1× [0.98–1] unresolved | 1.5× [1.5–1.6] | 0.95× [0.76–0.97] |
| migration/candidates-text | ts/node | reference | 1.1× [1–1.1] | 0.99× [0.96–1] unresolved | 0.67× [0.53–0.71] | 1.5× [1.5–2.2] | 0.99× [0.98–0.99] | 1.3× [0.94–1.4] unresolved | 0.71× [0.69–0.73] |
| migration/first-text | ts/node | reference | 1× [1–1.1] | 0.99× [0.93–1] unresolved | 0.69× [0.67–0.76] | 1.6× [1.5–1.9] | 0.98× [0.95–1] | 1.5× [0.99–1.5] unresolved | 0.78× [0.75–0.8] |
| native.node.v4.string | ts/node | reference | 1.1× [0.99–1.6] unresolved | 1× [1–1] unresolved | 0.35× [0.33–0.37] | 0.41× [0.38–0.41] | unavailable | unavailable | unavailable |
| native.v4.string | ts/node | reference | 1.1× [0.98–1.6] unresolved | 1× [1–1.1] unresolved | 0.34× [0.18–0.36] | 0.3× [0.29–0.31] | 4.3× [4.1–4.6] | 2× [2–2.3] | 0.93× [0.76–0.98] |
| native.v4.string.uppercase | ts/node | reference | 0.99× [0.87–1.5] unresolved | 1× [0.99–1.1] unresolved | 0.5× [0.45–0.52] | 0.53× [0.41–0.54] | 4.5× [4.4–4.7] | 2.2× [2.1–2.4] | 1× [0.96–1.1] unresolved |
| package.conversion.bytes.text | ts/node | reference | 1× [0.97–1.3] unresolved | 0.98× [0.67–1] unresolved | 0.8× [0.73–0.84] | 0.93× [0.84–0.96] | 0.85× [0.83–0.88] | 1.4× [1.4–1.4] | 1.3× [1.3–1.4] |
| package.conversion.slug.bytes | ts/node | reference | 0.98× [0.93–1.6] unresolved | 0.97× [0.95–1] unresolved | 0.4× [0.31–0.42] | 2.3× [1.9–2.4] | 0.86× [0.84–0.88] | 0.92× [0.91–0.98] | 0.55× [0.51–0.57] |
| package.conversion.text.bytes | ts/node | reference | 1.1× [1–3.2] | 0.97× [0.59–0.99] | 0.47× [0.27–0.5] | 1.9× [1.6–2] | 0.75× [0.72–0.77] | 0.73× [0.71–1] unresolved | 0.5× [0.33–0.52] |
| parse | ts/node | reference | 1.1× [1–1.7] | 0.98× [0.95–1] unresolved | 0.49× [0.41–0.51] | 2.1× [2–2.1] | 0.8× [0.78–0.82] | 0.64× [0.61–0.9] | 0.48× [0.47–0.5] |
| parse.compact | ts/node | reference | 1.1× [1–1.7] | 0.97× [0.94–1] unresolved | 0.37× [0.32–0.42] | 2× [1.9–2.1] | 0.79× [0.78–0.82] | 0.54× [0.53–0.7] | 0.36× [0.35–0.37] |
| parse.into | ts/node | reference | 1.2× [1.1–1.6] | 0.95× [0.89–1] unresolved | 0.65× [0.61–0.67] | 0.93× [0.89–0.96] | 0.79× [0.72–0.8] | 0.93× [0.89–1] unresolved | 0.67× [0.63–0.71] |
| parse.mixed | ts/node | reference | 1.1× [1.1–1.7] | 0.95× [0.93–0.99] | 0.39× [0.31–0.75] | 1.8× [1.5–1.9] | 0.77× [0.74–0.8] | 0.63× [0.61–0.68] | 0.39× [0.38–0.4] |
| parse/compact | ts/node | reference | 0.98× [0.97–1] unresolved | 0.91× [0.88–1] | 0.32× [0.22–0.54] | 2× [1.8–2.5] | 0.75× [0.72–0.76] | 0.5× [0.41–0.53] | 0.34× [0.25–0.36] |
| parse/keyed/base32 | ts/node | reference | 1.1× [1.1–1.1] | 0.99× [0.98–1] unresolved | 0.7× [0.67–0.98] | 1.7× [1.6–2.1] | 0.97× [0.81–0.99] | 1.6× [1.1–1.6] | 0.78× [0.76–0.79] |
| parse/keyed/base64 | ts/node | reference | 1.1× [1–1.1] | 0.99× [0.86–1] unresolved | 0.71× [0.58–1] unresolved | 1.7× [1.6–2] | 0.96× [0.92–0.98] | 1.6× [1.5–1.9] | 0.86× [0.83–0.89] |
| parse/uuid | ts/node | reference | 0.98× [0.9–0.99] | 0.9× [0.83–0.94] | 0.45× [0.41–0.8] | 2× [1.8–2.2] | 0.76× [0.73–0.77] | 0.61× [0.42–0.65] | 0.45× [0.41–0.47] |
| payload.extract.bytes | ts/node | reference | 1× [1–1.8] | 0.91× [0.91–0.93] | 0.8× [0.8–0.85] | 0.92× [0.9–0.94] | 0.84× [0.82–0.86] | 1.1× [1–1.1] | 0.95× [0.93–0.97] |
| payload.extract.uuid | ts/node | reference | 1× [1–1.3] unresolved | 0.96× [0.95–0.97] | 0.78× [0.74–0.88] | 1.3× [1.3–1.4] | 0.81× [0.8–0.83] | 0.92× [0.9–0.94] | 0.83× [0.81–0.85] |
| payload/extract/bytes | ts/node | reference | 1.1× [1–1.1] | 0.93× [0.9–0.95] | 0.78× [0.66–1.1] unresolved | 0.92× [0.85–0.99] | 0.86× [0.81–0.88] | 1× [0.76–1.1] unresolved | 0.93× [0.71–0.96] |
| payload/masked/base32 | ts/node | reference | 1× [1–1.1] | 0.99× [0.98–1.1] unresolved | 0.8× [0.69–1.3] unresolved | 1.2× [1.2–1.5] | 0.96× [0.9–0.98] | 1.4× [0.98–1.4] unresolved | 0.86× [0.79–0.88] |
| payload/masked/base64 | ts/node | reference | 1× [1–1.1] | 0.99× [0.88–1] unresolved | 0.82× [0.65–1.1] unresolved | 1.2× [1.2–1.5] | 0.94× [0.91–0.96] | 1.4× [1.1–1.5] | 0.86× [0.84–0.9] |
| plain.decode | ts/node | reference | 1× [1–1.5] | 0.99× [0.97–1] unresolved | 0.64× [0.6–0.67] | 0.91× [0.83–0.97] | 0.82× [0.81–0.85] | 1.2× [1.2–1.3] | 0.92× [0.9–0.98] |
| plain.decode.text | ts/node | reference | 1× [1–1.1] | 1× [0.98–1.2] unresolved | 0.69× [0.68–0.77] | 0.96× [0.95–1] unresolved | 0.87× [0.8–0.89] | 1.2× [1.2–1.3] | 1× [1–1.1] |
| plain.decode.text.base32 | ts/node | reference | 1× [1–1] | 0.98× [0.97–1] | 0.67× [0.62–0.68] | 0.96× [0.95–0.98] | 0.86× [0.83–0.88] | 1.2× [1.2–1.2] | 0.99× [0.96–1] unresolved |
| plain.decode.text.base32.uppercase | ts/node | reference | 1× [0.73–1.1] unresolved | 0.98× [0.97–0.99] | 0.65× [0.57–0.68] | 0.96× [0.94–0.97] | 0.85× [0.82–0.91] | 1.2× [1.1–1.7] | 0.98× [0.96–1] unresolved |
| plain.decode.text.uppercase | ts/node | reference | 1× [0.96–1.1] unresolved | 0.99× [0.98–1] | 0.67× [0.62–0.74] | 0.95× [0.93–1] unresolved | 0.85× [0.82–0.89] | 1.2× [1.1–1.9] | 0.99× [0.96–1] unresolved |
| plain.decode.uppercase | ts/node | reference | 1× [1–1.5] | 1× [0.97–1] unresolved | 0.69× [0.61–1.3] unresolved | 0.97× [0.95–1] unresolved | 0.85× [0.83–0.89] | 1.2× [1.2–1.3] | 1× [0.99–1] unresolved |
| plain.encode | ts/node | reference | 1.1× [1.1–1.6] | 0.95× [0.93–0.97] | 0.8× [0.66–0.82] | 0.87× [0.84–0.9] | 0.75× [0.72–0.77] | 1.1× [1.1–1.2] | 0.93× [0.89–0.97] |
| plain.toString | ts/node | reference | 1× [0.98–1.2] unresolved | 0.96× [0.93–1] unresolved | 0.73× [0.64–0.79] | 0.93× [0.87–0.96] | 0.83× [0.8–0.86] | 1.2× [1.1–1.2] | 0.98× [0.92–0.99] |
| plain/base32 | ts/node | reference | 1× [0.99–1] unresolved | 0.95× [0.93–0.99] | 0.8× [0.76–0.88] | 0.96× [0.91–1] unresolved | 0.87× [0.86–0.88] | 1.3× [1–2] | 1.2× [0.97–1.2] unresolved |
| plain/base64 | ts/node | reference | 0.95× [0.94–1] | 0.93× [0.92–0.95] | 0.89× [0.86–1.2] unresolved | 0.97× [0.89–0.99] | 0.86× [0.82–0.87] | 1.2× [0.83–1.2] unresolved | 1.2× [1–1.2] |
| platform.frombase64.conversion.slug.bytes | ts/node | reference | unavailable | unavailable | 0.28× [0.18–0.31] | 0.96× [0.76–1] unresolved | 1.2× [1.2–1.3] | 0.44× [0.41–0.5] | 0.33× [0.22–0.35] |
| platform.fromhex.conversion.text.bytes | ts/node | reference | unavailable | unavailable | 0.39× [0.26–0.41] | 0.98× [0.77–1] unresolved | 1.3× [1.2–1.7] | 0.56× [0.52–0.61] | 0.5× [0.36–0.52] |
| platform.setfrombase64.conversion.slug.bytes | ts/node | reference | unavailable | unavailable | 0.44× [0.27–0.47] | 1.4× [1.3–1.5] | 0.97× [0.92–1] unresolved | 0.74× [0.7–0.79] | 0.52× [0.49–0.54] |
| platform.tohex.conversion.bytes.text | ts/node | reference | unavailable | unavailable | 0.77× [0.65–0.89] | 1× [0.93–1] unresolved | 1× [1–1.1] | 0.77× [0.76–0.8] | 1.2× [1.1–1.2] |
| portable.advance.into | ts/node | reference | 1× [1–1] unresolved | 1.1× [1.1–1.1] | 0.64× [0.57–0.65] | 1.1× [1.1–1.2] | 1× [1–1.1] unresolved | 1.3× [1.3–1.7] | 0.74× [0.71–0.78] |
| portable.at | ts/node | reference | 1.1× [1–1.1] | 1× [0.99–1] unresolved | 0.6× [0.53–0.74] | 0.97× [0.93–0.99] | 0.9× [0.84–0.94] | 1.2× [1.2–1.4] | 0.77× [0.76–0.78] |
| portable.at.bytes | ts/node | reference | 1× [1–1.1] | 1× [0.99–1] unresolved | 0.39× [0.34–0.5] | 1.7× [1.6–1.8] | 0.95× [0.88–1] | 0.99× [0.97–1] unresolved | 0.41× [0.39–0.43] |
| portable.at.into | ts/node | reference | 1× [1–1] | 1× [0.97–1] unresolved | 0.45× [0.43–0.51] | 1× [0.98–1] unresolved | 0.95× [0.92–1] unresolved | 1.1× [1–1.1] | 0.47× [0.38–0.48] |
| portable.base32 | ts/node | reference | 1.1× [1–1.1] | 1.1× [1.1–1.1] | 0.64× [0.42–0.8] | 1.9× [1.8–2.1] | 0.95× [0.88–1] unresolved | 1.2× [1.2–1.6] | 0.87× [0.21–0.91] |
| portable.bytes | ts/node | reference | 0.99× [0.94–1] unresolved | 1× [0.95–1] unresolved | 0.46× [0.26–0.48] | 2.6× [2.5–3] | 1.1× [0.94–1.1] unresolved | 1× [1–1.1] | 0.57× [0.53–0.58] |
| portable.into | ts/node | reference | 1.1× [0.97–1.1] unresolved | 1× [0.94–1.1] unresolved | 0.64× [0.38–0.68] | 1.1× [1–1.1] | 1.1× [1–1.2] | 1.8× [1.8–1.9] | 0.88× [0.84–0.9] |
| portable.rollback.into | ts/node | reference | 1.1× [1–1.2] | 1.1× [1.1–1.2] | 0.65× [0.38–0.66] | 1.1× [1–1.2] unresolved | 1.1× [1–1.2] | 1.4× [1.4–1.5] | 0.8× [0.77–0.87] |
| portable.slug | ts/node | reference | 1× [0.34–1.1] unresolved | 1.1× [1–1.1] | 0.71× [0.56–0.72] | 2× [1.9–2.3] | 0.96× [0.91–1] unresolved | 1.2× [1.2–1.3] | 0.93× [0.2–0.95] |
| portable.string | ts/node | reference | 1× [0.96–1] unresolved | 0.99× [0.96–1] unresolved | 0.79× [0.61–0.82] | 0.97× [0.93–0.99] | 0.89× [0.82–0.93] | 1.5× [1.4–1.6] | 1.2× [1.1–1.2] |
| portable.subms12.auto.into | ts/node | reference | 1.1× [1–1.1] | 1× [0.99–1] unresolved | 0.94× [0.88–1] unresolved | 1.3× [1.3–1.4] | 1× [0.97–1] unresolved | 1.4× [1.4–1.5] | 0.84× [0.79–0.89] |
| portable.subms12.into | ts/node | reference | 2.2× [2.1–2.3] | 1× [0.98–1] unresolved | 0.6× [0.33–0.62] | 1.1× [1–1.1] | 1× [0.98–1] unresolved | 1.4× [1.4–1.7] | 0.8× [0.74–0.82] |
| rotation.current | ts/node | reference | 1.1× [1–1.5] | 0.99× [0.97–1] unresolved | 0.69× [0.5–0.79] | 1.3× [1.3–1.4] | 1× [1–1] | 1.5× [1.5–1.5] | 0.76× [0.56–0.79] |
| rotation.current.bytes | ts/node | reference | 1.1× [1.1–1.2] | 0.96× [0.94–0.98] | 0.67× [0.48–0.79] | 1.8× [1.8–1.9] | 1.1× [1–1.1] | 1.6× [1.5–1.6] | 0.65× [0.63–0.66] |
| rotation.previous | ts/node | reference | 1.1× [1.1–1.5] | 0.99× [0.97–1] unresolved | 0.73× [0.55–0.87] | 1.2× [1.2–1.3] | 1× [0.97–1.1] unresolved | 1.8× [1.7–1.8] | 0.82× [0.58–0.83] |
| rotation.previous.bytes | ts/node | reference | 1.1× [1.1–1.6] | 0.96× [0.95–0.97] | 0.73× [0.61–0.87] | 1.5× [1.5–1.7] | 1.1× [1.1–1.1] | 1.9× [1.8–1.9] | 0.72× [0.68–0.74] |
| rotation16.current | ts/node | reference | 1× [1–1.5] | 0.99× [0.98–1] unresolved | 0.7× [0.64–0.8] | 1.3× [1.3–1.4] | 1× [1–1] | 1.5× [1.4–1.5] | 0.77× [0.59–0.78] |
| rotation16.last | ts/node | reference | 1× [0.97–1] unresolved | 0.98× [0.97–1] | 0.8× [0.71–0.87] | 1× [0.99–1] unresolved | 1× [1–1] | 2.1× [1.9–2.1] | 0.87× [0.79–0.89] |
| rotation4.current | ts/node | reference | 1× [1–1.4] | 0.98× [0.97–0.99] | 0.68× [0.49–0.79] | 1.3× [1.3–1.4] | 1× [1–1] | 1.5× [1.4–1.6] | 0.76× [0.74–0.78] |
| rotation4.last | ts/node | reference | 1× [0.99–1.4] unresolved | 0.98× [0.96–1.1] unresolved | 0.74× [0.68–0.8] | 1.1× [1.1–1.1] | 1× [1–1] | 1.9× [1.7–2] | 0.8× [0.6–0.82] |
| rotation8.current | ts/node | reference | 1.1× [1–1.4] | 0.98× [0.96–1] unresolved | 0.7× [0.58–0.79] | 1.3× [1.3–1.4] | 1× [0.99–1] unresolved | 1.5× [1.4–1.6] | 0.77× [0.54–0.79] |
| rotation8.last | ts/node | reference | 1× [1–1.1] | 0.99× [0.98–1.1] unresolved | 0.79× [0.73–0.87] | 1× [1–1.1] | 1× [0.99–1] unresolved | 2× [1.8–2] | 0.87× [0.82–0.89] |
| sentinel.base32.decode | ts/node | reference | 0.84× [0.82–0.93] | 0.74× [0.71–1.2] unresolved | 1.1× [0.72–1.2] unresolved | 0.94× [0.71–1] unresolved | 0.75× [0.72–0.83] | 1× [0.99–1.1] unresolved | 0.96× [0.9–1] |
| sentinel.base32.decode.bytes | ts/node | reference | 0.76× [0.73–0.92] | 0.86× [0.85–0.87] | 0.91× [0.84–1.2] unresolved | 3× [2.7–3.3] | 0.97× [0.91–0.98] | 1.1× [1.1–1.1] | 0.67× [0.65–0.72] |
| sentinel.base32.decode.into | ts/node | reference | 0.74× [0.7–0.76] | 0.81× [0.8–1.1] unresolved | 1× [0.82–1.2] unresolved | 0.88× [0.81–0.91] | 0.85× [0.83–0.88] | 1× [1–1.1] | 0.85× [0.82–0.86] |
| sentinel.base32.encode | ts/node | reference | 1.2× [1.1–1.4] | 0.95× [0.9–1] unresolved | 0.72× [0.64–0.75] | 0.84× [0.59–0.87] | 0.75× [0.73–0.77] | 0.98× [0.93–0.99] | 0.69× [0.6–0.75] |
| sentinel.base32.timestamp | ts/node | reference | 0.74× [0.71–1.6] unresolved | 0.63× [0.62–0.87] | 0.56× [0.52–0.85] | 0.93× [0.85–0.97] | 0.57× [0.55–0.58] | 1.2× [1.1–1.2] | 0.49× [0.49–0.51] |
| sentinel.collision64.bytes.first | ts/node | reference | 1.1× [1–1.3] | 0.91× [0.87–1] unresolved | 0.95× [0.62–1] unresolved | 0.88× [0.83–0.91] | 0.79× [0.76–0.83] | 1.2× [1.2–1.3] | 0.87× [0.8–0.96] |
| sentinel.collision64.bytes.last | ts/node | reference | 1.1× [1–1.1] unresolved | 0.99× [0.95–1] unresolved | 1.2× [1.1–1.3] | 0.87× [0.84–0.9] | 0.86× [0.81–0.88] | 3× [2.9–3.1] | 1.2× [1.2–1.3] |
| sentinel.collision64.bytes.middle | ts/node | reference | 1.1× [1–1.1] | 0.97× [0.96–1] unresolved | 1.2× [1.1–1.2] | 0.88× [0.82–0.91] | 0.87× [0.87–0.89] | 3× [3–3] | 1.2× [1.2–1.2] |
| sentinel.collision64.bytes.miss | ts/node | reference | 1× [0.89–1] unresolved | 1× [0.96–1] unresolved | 1× [0.65–1.2] unresolved | 0.96× [0.95–0.99] | 0.95× [0.91–0.96] | 2.1× [2–2.1] | 1.2× [1.2–1.2] |
| sentinel.decode | ts/node | reference | 0.84× [0.82–0.86] | 0.73× [0.7–0.79] | 1.3× [1.1–1.4] | 0.98× [0.84–1] unresolved | 0.89× [0.87–0.9] | 1× [0.99–1.1] unresolved | 0.95× [0.87–0.97] |
| sentinel.decode.bytes | ts/node | reference | 0.74× [0.72–1.3] unresolved | 0.85× [0.83–0.86] | 0.86× [0.78–1.2] unresolved | 3.2× [2.9–3.4] | 0.97× [0.93–1] unresolved | 1.1× [1–1.1] | 0.68× [0.65–0.7] |
| sentinel.decode.into | ts/node | reference | 0.73× [0.67–0.79] | 0.81× [0.79–0.94] | 1.1× [0.92–1.5] unresolved | 0.89× [0.8–0.95] | 0.86× [0.82–0.88] | 1× [1–1.1] | 0.86× [0.84–0.88] |
| sentinel.encode | ts/node | reference | 1.1× [1.1–1.4] | 0.94× [0.91–1] unresolved | 0.71× [0.52–0.73] | 0.86× [0.79–0.94] | 0.77× [0.73–0.79] | 0.98× [0.85–1] unresolved | 0.69× [0.61–0.74] |
| sentinel.encode.bytes | ts/node | reference | 1.1× [1–1.8] | 0.92× [0.91–1] | 0.84× [0.67–0.97] | 0.86× [0.82–0.88] | 0.91× [0.85–0.92] | 1.1× [1–1.1] | 0.79× [0.7–0.83] |
| sentinel.encode.bytes.miss | ts/node | reference | 1× [1–1.3] | 0.99× [0.98–1.1] unresolved | 0.96× [0.87–1.5] unresolved | 0.99× [0.95–1] unresolved | 0.95× [0.94–0.97] | 1.8× [1.8–1.9] | 1.1× [0.99–1.1] unresolved |
| sentinel.scan16.bytes.first | ts/node | reference | 1× [0.95–1.1] unresolved | 0.87× [0.86–0.96] | 0.91× [0.88–1.1] unresolved | 0.87× [0.8–0.94] | 0.79× [0.75–0.82] | 1.2× [1.1–1.2] | 0.89× [0.8–0.92] |
| sentinel.scan16.bytes.last | ts/node | reference | 1.1× [1–1.1] | 0.94× [0.9–1] unresolved | 1.1× [0.78–1.8] unresolved | 0.84× [0.78–0.9] | 0.87× [0.85–0.9] | 2.8× [2.6–2.8] | 1.2× [1.1–1.2] |
| sentinel.scan16.bytes.middle | ts/node | reference | 1.1× [1–1.1] | 0.94× [0.89–1] unresolved | 1.1× [0.84–1.1] unresolved | 0.83× [0.79–0.91] | 0.88× [0.84–0.89] | 2.8× [2.7–2.8] | 1.2× [1.1–1.2] |
| sentinel.scan16.bytes.miss | ts/node | reference | 1× [0.99–1] unresolved | 1× [0.99–1] unresolved | 1× [0.44–1.1] unresolved | 0.98× [0.92–1] unresolved | 0.96× [0.95–0.97] | 2.1× [2–2.1] | 1.2× [1.2–1.2] |
| sentinel.scan16.first | ts/node | reference | 1.1× [1.1–1.1] | 0.96× [0.91–1] unresolved | 0.75× [0.53–0.78] | 0.84× [0.82–0.9] | 0.73× [0.71–0.76] | 1.2× [1.1–1.2] | 0.7× [0.67–0.71] |
| sentinel.scan16.last | ts/node | reference | 1.1× [1–1.1] | 0.98× [0.96–1] unresolved | 0.85× [0.77–0.85] | 0.85× [0.82–0.89] | 0.84× [0.81–0.87] | 1.9× [1.8–2] | 0.87× [0.85–0.93] |
| sentinel.scan16.middle | ts/node | reference | 1.1× [1–1.1] | 0.97× [0.94–1] unresolved | 0.83× [0.57–0.89] | 0.85× [0.5–0.96] | 0.85× [0.82–0.88] | 1.9× [1.8–1.9] | 0.89× [0.85–0.95] |
| sentinel.scan16.miss | ts/node | reference | 1× [0.98–1] unresolved | 1× [0.97–1] unresolved | 0.9× [0.76–1.4] unresolved | 0.94× [0.86–1] unresolved | 0.88× [0.87–0.91] | 1.8× [1.7–1.8] | 1× [0.99–1] unresolved |
| sentinel.scan4.bytes.first | ts/node | reference | 1.1× [1–1.6] | 0.9× [0.9–0.99] | 0.85× [0.7–0.95] | 0.86× [0.82–0.88] | 0.84× [0.8–0.87] | 1.1× [1.1–1.1] | 0.73× [0.65–0.8] |
| sentinel.scan4.bytes.last | ts/node | reference | 1.2× [1.2–1.3] | 0.95× [0.93–1] unresolved | 0.82× [0.71–0.89] | 0.89× [0.87–0.96] | 1× [1–1] unresolved | 1× [1–1.1] | 0.78× [0.68–0.87] |
| sentinel.scan4.bytes.middle | ts/node | reference | 1.2× [1.2–1.5] | 0.95× [0.92–0.99] | 0.81× [0.72–0.91] | 0.88× [0.87–0.91] | 0.98× [0.93–1] unresolved | 1.1× [1–1.1] | 0.85× [0.65–0.91] |
| sentinel.scan4.bytes.miss | ts/node | reference | 1× [1–1.1] | 1× [0.96–1] unresolved | 0.9× [0.85–0.98] | 0.97× [0.93–1.2] unresolved | 0.97× [0.95–0.98] | 1.7× [1.6–1.8] | 0.97× [0.93–0.99] |
| sentinel.scan4.first | ts/node | reference | 1.1× [1.1–1.3] | 0.96× [0.86–1] unresolved | 0.74× [0.71–0.9] | 0.87× [0.82–0.9] | 0.75× [0.73–0.76] | 1.1× [1.1–1.2] | 0.68× [0.64–0.7] |
| sentinel.scan4.last | ts/node | reference | 1.2× [1.1–1.2] | 0.99× [0.95–1.1] unresolved | 0.74× [0.65–0.81] | 0.87× [0.81–0.89] | 0.86× [0.83–0.89] | 1.1× [1.1–1.1] | 0.69× [0.63–0.77] |
| sentinel.scan4.middle | ts/node | reference | 1.1× [1–1.3] | 0.95× [0.94–1] unresolved | 0.73× [0.71–0.75] | 0.87× [0.79–0.91] | 0.84× [0.78–0.84] | 1.1× [1.1–1.1] | 0.7× [0.68–0.74] |
| sentinel.scan4.miss | ts/node | reference | 1× [1–1.1] | 0.99× [0.96–1] unresolved | 0.81× [0.59–0.99] | 0.94× [0.91–0.95] | 0.9× [0.88–0.91] | 1.6× [1.5–1.6] | 0.86× [0.82–0.89] |
| sentinel.scan64.bytes.first | ts/node | reference | 1× [1–1.1] | 0.9× [0.86–0.95] | 0.89× [0.6–0.97] | 0.87× [0.81–1] unresolved | 0.78× [0.76–0.83] | 1.2× [1.2–1.3] | 0.88× [0.81–0.93] |
| sentinel.scan64.bytes.last | ts/node | reference | 1.1× [1–1.1] | 0.98× [0.94–1] unresolved | 1.1× [1.1–1.2] | 0.88× [0.86–0.94] | 0.89× [0.87–0.91] | 2.8× [2.7–2.8] | 1.2× [1.2–1.2] |
| sentinel.scan64.bytes.middle | ts/node | reference | 1.1× [0.96–1.1] unresolved | 0.99× [0.98–1] unresolved | 1.1× [0.67–1.4] unresolved | 0.87× [0.81–0.91] | 0.87× [0.84–0.89] | 2.8× [2.7–2.8] | 1.2× [1.2–1.3] |
| sentinel.scan64.bytes.miss | ts/node | reference | 1× [0.95–1] unresolved | 0.99× [0.96–1] unresolved | 1× [0.95–1.1] unresolved | 0.97× [0.96–1] unresolved | 0.95× [0.95–0.98] | 2.1× [1.9–2.1] | 1.2× [1.2–1.2] |
| sentinel.scan64.first | ts/node | reference | 1.1× [1.1–1.1] | 0.96× [0.92–1] unresolved | 0.76× [0.58–0.9] | 0.86× [0.81–0.93] | 0.74× [0.71–0.77] | 1.2× [1.1–1.2] | 0.7× [0.66–0.73] |
| sentinel.scan64.last | ts/node | reference | 1.1× [1–1.2] | 0.98× [0.93–0.99] | 0.85× [0.79–1.1] unresolved | 0.84× [0.82–0.89] | 0.84× [0.81–0.87] | 1.9× [1.8–1.9] | 0.9× [0.84–0.94] |
| sentinel.scan64.middle | ts/node | reference | 1.1× [1–1.1] | 0.99× [0.93–1.3] unresolved | 0.87× [0.71–1.4] unresolved | 0.86× [0.82–0.91] | 0.83× [0.8–0.85] | 1.8× [1.7–1.9] | 0.89× [0.84–0.93] |
| sentinel.scan64.miss | ts/node | reference | 1× [0.95–1] unresolved | 0.99× [0.96–1] unresolved | 0.89× [0.75–0.98] | 0.93× [0.89–0.96] | 0.88× [0.87–0.9] | 1.8× [1.7–1.8] | 1× [0.99–1] unresolved |
| sentinel.scan8.bytes.first | ts/node | reference | 1.1× [1–1.2] | 0.91× [0.88–0.99] | 0.75× [0.56–0.83] | 0.88× [0.8–0.92] | 0.83× [0.81–0.86] | 1.1× [1.1–1.1] | 0.74× [0.67–0.84] |
| sentinel.scan8.bytes.last | ts/node | reference | 1.3× [1.3–1.4] | 0.98× [0.93–1] unresolved | 0.8× [0.46–0.95] | 0.91× [0.84–0.99] | 1.2× [1.1–1.2] | 1× [0.99–1.1] unresolved | 0.79× [0.77–0.9] |
| sentinel.scan8.bytes.middle | ts/node | reference | 1.2× [1.2–1.8] | 0.98× [0.94–1] unresolved | 0.77× [0.63–1.2] unresolved | 0.92× [0.85–0.97] | 1× [1–1.1] | 1× [0.98–1] unresolved | 0.77× [0.44–0.89] |
| sentinel.scan8.bytes.miss | ts/node | reference | 1× [1–1.4] | 1× [0.97–1] unresolved | 0.83× [0.79–1.2] unresolved | 0.98× [0.93–1] unresolved | 1× [1–1] unresolved | 1.6× [1.5–1.8] | 0.89× [0.85–0.91] |
| sentinel.scan8.first | ts/node | reference | 1.1× [1.1–1.2] | 0.94× [0.74–1] unresolved | 0.69× [0.57–0.72] | 0.88× [0.8–0.99] | 0.76× [0.72–0.77] | 1.2× [1.1–1.2] | 0.68× [0.59–0.7] |
| sentinel.scan8.last | ts/node | reference | 1.2× [1.2–1.6] | 0.99× [0.94–1.4] unresolved | 0.73× [0.65–1.3] unresolved | 0.9× [0.8–0.93] | 1× [0.95–1] unresolved | 1.1× [1–1.1] | 0.72× [0.65–0.78] |
| sentinel.scan8.middle | ts/node | reference | 1.2× [1.2–1.2] | 0.95× [0.94–1] unresolved | 0.72× [0.53–0.75] | 0.88× [0.84–1.1] unresolved | 0.88× [0.86–0.9] | 1.1× [1–1.1] | 0.75× [0.66–0.77] |
| sentinel.scan8.miss | ts/node | reference | 1× [1–1.5] unresolved | 0.99× [0.96–1] unresolved | 0.76× [0.55–0.84] | 0.94× [0.89–0.98] | 0.96× [0.94–0.97] | 1.5× [1.4–1.6] | 0.82× [0.72–0.85] |
| sentinel.timestamp | ts/node | reference | 0.73× [0.69–0.83] | 0.66× [0.62–0.67] | 0.59× [0.51–0.97] | 0.94× [0.66–1] unresolved | 0.58× [0.57–0.59] | 1.2× [1.1–1.2] | 0.5× [0.43–0.51] |
| sentinel/base32/canonical | ts/node | reference | 0.76× [0.72–0.83] | 0.85× [0.82–0.87] | 0.61× [0.37–0.67] | 3× [2.8–4.4] | 1× [1–1] | 1.1× [0.93–1.1] unresolved | 0.62× [0.53–0.62] |
| sentinel/base32/uppercase | ts/node | reference | 1.1× [1–1.1] | 0.95× [0.87–1] unresolved | 0.78× [0.45–0.82] | 2.3× [2.2–3.2] | 0.93× [0.91–0.98] | 1.2× [1.1–1.2] | 0.88× [0.68–0.89] |
| slug.base32.bytes | ts/node | reference | 1.1× [1–1.7] | 1× [0.98–1.1] unresolved | 0.46× [0.4–0.52] | 2.3× [2.2–2.7] | 0.93× [0.89–0.97] | 0.93× [0.83–1.1] unresolved | 0.53× [0.5–0.55] |
| slug.base32.into | ts/node | reference | 1.1× [1–1.3] | 1× [0.95–1.1] unresolved | 0.55× [0.43–0.58] | 2.1× [2.1–2.3] | 0.92× [0.89–0.94] | 0.96× [0.72–0.99] | 0.66× [0.63–0.68] |
| slug.bytes | ts/node | reference | 1.1× [0.96–1.7] unresolved | 1× [0.99–1] unresolved | 0.43× [0.4–0.53] | 2.4× [2.2–2.8] | 0.95× [0.88–0.96] | 0.94× [0.74–1.2] unresolved | 0.48× [0.47–0.5] |
| slug.into | ts/node | reference | 1.1× [1–1.5] | 1× [0.98–1] unresolved | 0.54× [0.52–0.62] | 2.3× [2.1–2.5] | 0.93× [0.89–0.98] | 0.99× [0.92–1.1] unresolved | 0.64× [0.62–0.66] |
| timestamp.extract | ts/node | reference | 1× [0.92–1.8] unresolved | 0.64× [0.61–1] | 0.67× [0.45–1] | 0.88× [0.84–0.92] | 0.78× [0.71–0.8] | 0.85× [0.69–0.87] | 0.48× [0.48–0.51] |
| timestamp.extract.masked | ts/node | reference | 1.1× [1–1.7] | 1× [0.98–1.3] unresolved | 0.77× [0.71–0.87] | 1.4× [0.96–1.7] unresolved | 0.98× [0.96–0.99] | 1.7× [1.5–1.7] | 0.73× [0.71–0.74] |
| timestamp.extract.masked.base32 | ts/node | reference | 1.1× [1–1.5] | 0.98× [0.96–1.6] unresolved | 0.75× [0.53–0.83] | 1.4× [1.2–1.6] | 0.97× [0.95–0.99] | 1.6× [1.1–1.6] | 0.74× [0.73–0.75] |
| timestamp.extract.offset | ts/node | reference | 0.86× [0.8–1.9] unresolved | 0.53× [0.53–0.61] | 0.75× [0.52–1.1] unresolved | 0.71× [0.64–0.74] | 0.68× [0.67–0.68] | 0.94× [0.81–0.96] | 0.7× [0.68–0.73] |
| timestamp.extract.slug | ts/node | reference | 0.98× [0.87–1.6] unresolved | 0.87× [0.85–1.1] unresolved | 0.77× [0.56–0.84] | 1× [0.83–1] unresolved | 1.1× [1–1.1] | 1.4× [1.1–1.5] | 0.94× [0.9–0.97] |
| timestamp.extract.slug.base32 | ts/node | reference | 0.97× [0.92–1.1] unresolved | 0.97× [0.94–1.2] unresolved | 0.67× [0.51–0.7] | 1× [0.84–1.1] unresolved | 1.1× [1.1–1.1] | 1.4× [1.3–1.4] | 0.77× [0.7–0.8] |
| timestamp.extract.uuid | ts/node | reference | 0.97× [0.91–1.1] unresolved | 1× [0.95–1] unresolved | 0.64× [0.58–0.66] | 1× [0.76–1.1] unresolved | 0.96× [0.93–1] unresolved | 0.96× [0.8–0.99] | 0.52× [0.46–0.55] |
| timestamp.extract.uuid.compact | ts/node | reference | 1.1× [1–1.2] | 1× [0.99–1.1] unresolved | 0.59× [0.34–0.76] | 0.91× [0.79–0.97] | 0.73× [0.69–0.75] | 0.76× [0.65–0.79] | 0.63× [0.58–0.67] |
| timestamp.extract.uuid.mixed | ts/node | reference | 1× [0.97–1.1] unresolved | 1× [0.98–1.2] unresolved | 0.57× [0.35–0.6] | 0.97× [0.87–1.1] unresolved | 0.91× [0.87–0.94] | 0.87× [0.85–0.92] | 0.47× [0.39–0.48] |
| timestamp.masked | ts/node | reference | 0.97× [0.88–1.1] unresolved | 0.95× [0.91–1.2] unresolved | 0.71× [0.47–0.84] | 1.4× [1.1–1.5] | 0.87× [0.84–0.88] | 1.7× [1.6–1.7] | 0.69× [0.68–0.71] |
| timestamp.masked.base32 | ts/node | reference | 0.99× [0.89–1.5] unresolved | 0.94× [0.93–1.4] unresolved | 0.75× [0.48–0.82] | 1.4× [1.2–1.5] | 0.87× [0.84–0.88] | 1.6× [1.5–1.6] | 0.73× [0.72–0.74] |
| timestamp.masked.base32.uppercase | ts/node | reference | 1× [0.92–1.5] unresolved | 0.94× [0.93–0.96] | 0.8× [0.75–0.89] | 1.4× [1.2–1.4] | 0.89× [0.84–0.9] | 1.6× [1.6–1.7] | 0.8× [0.79–0.82] |
| timestamp.slug | ts/node | reference | 0.86× [0.82–1.2] unresolved | 0.8× [0.76–0.82] | 0.58× [0.53–0.62] | 0.95× [0.92–1] | 0.75× [0.69–0.75] | 1.2× [1.2–1.3] | 0.52× [0.49–0.55] |
| timestamp.slug.base32 | ts/node | reference | 0.91× [0.82–1.4] unresolved | 0.84× [0.82–0.88] | 0.64× [0.62–0.96] | 1× [0.91–1] unresolved | 0.79× [0.73–0.8] | 1.2× [1.2–1.3] | 0.59× [0.57–0.61] |
| timestamp.slug.base32.uppercase | ts/node | reference | 0.92× [0.84–1.1] unresolved | 0.84× [0.83–0.89] | 0.74× [0.55–0.87] | 0.97× [0.9–0.99] | 0.77× [0.71–0.81] | 1.3× [1.3–1.4] | 0.79× [0.75–0.86] |
| timestamp.uuid | ts/node | reference | 0.95× [0.82–1.3] unresolved | 0.86× [0.84–1.2] unresolved | 0.6× [0.51–0.76] | 1.6× [1.5–1.8] | 0.68× [0.66–0.7] | 0.95× [0.92–1] unresolved | 0.54× [0.53–0.56] |
| timestamp.uuid.now | ts/node | reference | 0.88× [0.84–1.9] unresolved | 0.81× [0.79–0.83] | 0.62× [0.51–0.79] | 1.5× [1.4–1.6] | 0.68× [0.64–0.7] | 0.93× [0.91–1] unresolved | 0.56× [0.56–0.57] |
| timestamp/extract/bytes | ts/node | reference | 0.98× [0.88–1.1] unresolved | 0.55× [0.53–0.62] | 0.36× [0.29–0.39] | 0.8× [0.76–0.82] | 0.68× [0.66–0.69] | 0.72× [0.67–0.76] | 0.42× [0.39–0.44] |
| timestamp/masked/base32 | ts/node | reference | 0.93× [0.93–0.96] | 0.93× [0.91–0.97] | 0.72× [0.67–1] unresolved | 1.4× [1.4–1.7] | 0.88× [0.83–0.89] | 1.5× [1–1.6] | 0.73× [0.69–0.73] |
| timestamp/masked/base64 | ts/node | reference | 0.94× [0.92–0.97] | 0.91× [0.83–0.95] | 0.68× [0.64–0.8] | 1.4× [1.4–1.6] | 0.88× [0.81–0.9] | 1.6× [1–1.7] | 0.69× [0.65–0.71] |
| unmask.binary.sentinel | ts/node | reference | 1.2× [1.2–1.2] | 0.92× [0.87–0.94] | 0.62× [0.48–0.7] | 2.5× [2.3–3.7] | 1.1× [1–1.1] | 1.2× [0.69–1.3] unresolved | 0.71× [0.63–0.73] |
| unmask/base32 | ts/node | reference | 0.95× [0.95–0.99] | 0.96× [0.94–0.98] | 0.75× [0.58–0.85] | 1.9× [1.8–2.2] | 0.94× [0.92–0.95] | 1.6× [0.86–1.6] unresolved | 0.74× [0.73–0.75] |
| unmask/base64 | ts/node | reference | 0.95× [0.93–0.98] | 0.94× [0.92–0.98] | 0.74× [0.68–0.86] | 2× [1.9–2.1] | 0.94× [0.93–0.95] | 1.6× [1.2–1.7] | 0.73× [0.55–0.76] |
| unmask/binary/caller-buffer | ts/node | reference | 1× [1–1.1] | 0.96× [0.94–0.99] | 0.77× [0.58–0.88] | 1.5× [1.4–1.7] | 1× [1–1] | 1.8× [1.2–1.8] | 0.8× [0.76–0.81] |
| unmask/binary/owned | ts/node | reference | 1.1× [1–1.1] | 0.96× [0.94–1] unresolved | 0.74× [0.62–0.85] | 1.6× [1.4–1.7] | 1× [1–1] | 1.7× [1.1–1.8] | 0.77× [0.73–0.79] |
| unmask/binary/text | ts/node | reference | 1.1× [1.1–1.1] | 0.98× [0.95–0.99] | 0.82× [0.79–0.92] | 1.4× [1.3–1.6] | 0.99× [0.98–1] | 1.7× [1.2–1.8] | 0.94× [0.89–0.95] |
| uuid.toBytes.bytes | ts/node | reference | 0.86× [0.8–1.5] unresolved | 0.91× [0.87–0.92] | 0.64× [0.54–0.65] | 4× [3.7–4.1] | 1.1× [1.1–1.1] | 1.2× [1.2–1.5] | 0.78× [0.77–0.79] |
| uuid.toBytes.uuid | ts/node | reference | 1.1× [1–1.9] | 0.97× [0.89–0.99] | 0.51× [0.5–0.71] | 2× [1.9–2.2] | 0.81× [0.76–0.82] | 0.73× [0.68–0.88] | 0.53× [0.52–0.55] |
| uuid.toPlainSlug.bytes | ts/node | reference | 1× [1–1.3] | 0.98× [0.93–1] unresolved | 0.95× [0.85–1.4] unresolved | 0.96× [0.81–0.98] | 0.86× [0.84–0.87] | 1.4× [0.85–1.6] unresolved | 1.3× [1.3–1.4] |
| uuid.toString.braced | ts/node | reference | 1.1× [1–1.3] | 0.98× [0.92–1.3] unresolved | 0.51× [0.39–0.56] | 1.5× [1.3–1.6] | 0.72× [0.68–0.73] | 0.77× [0.72–0.77] | 0.65× [0.61–0.68] |
| uuid.toString.bytes | ts/node | reference | 0.99× [0.83–1] unresolved | 0.98× [0.87–1] unresolved | 0.77× [0.63–0.81] | 0.98× [0.94–1] unresolved | 0.85× [0.82–0.87] | 1.2× [0.97–1.5] unresolved | 1.3× [1.3–1.3] |
| uuid.toString.canonical | ts/node | reference | 0.92× [0.9–1] unresolved | 0.95× [0.89–1.1] unresolved | 0.84× [0.76–1] unresolved | 0.99× [0.87–1.1] unresolved | 0.99× [0.93–1] unresolved | 0.91× [0.85–0.96] | 0.62× [0.17–0.64] |
| uuid.toString.compact | ts/node | reference | 1.1× [1–1.3] | 0.97× [0.96–1] unresolved | 0.57× [0.55–0.7] | 1.5× [1.4–1.6] | 0.77× [0.76–0.8] | 0.8× [0.73–0.83] | 0.71× [0.68–0.73] |
| uuid.toString.mixed | ts/node | reference | 1× [0.97–1.1] unresolved | 1× [0.96–1] unresolved | 0.79× [0.7–1.1] unresolved | 1× [0.9–1.1] unresolved | 0.98× [0.95–1] unresolved | 1.1× [1–1.1] | 0.84× [0.81–0.87] |
| uuid.toString.mixed.uppercase | ts/node | reference | 1× [1–1.5] | 1× [1–1.1] | 0.83× [0.77–1.2] unresolved | 1× [0.89–1.1] unresolved | 1× [0.98–1] unresolved | 1.3× [1.2–1.4] | 1× [0.99–1.1] unresolved |
| uuid.toString.urn | ts/node | reference | 1.1× [1–1.4] | 0.95× [0.94–1] unresolved | 0.54× [0.32–0.64] | 1.4× [1.3–1.6] | 0.72× [0.68–0.73] | 0.77× [0.69–0.79] | 0.64× [0.61–0.65] |
| v4.base32 | ts/node | reference | 1× [0.99–1] unresolved | 1× [0.98–1] unresolved | 0.81× [0.73–0.84] | 1.1× [1–1.2] | 0.9× [0.88–0.93] | 1.8× [1.8–2] | 1.2× [1.2–1.2] |
| v4.bytes | ts/node | reference | 1× [1–1.1] unresolved | 1× [1–1] unresolved | 0.53× [0.36–0.54] | 3.5× [3.2–3.9] | 1.1× [1–1.1] | 1.4× [1.4–1.6] | 0.55× [0.53–0.56] |
| v4.into | ts/node | reference | 1.2× [1.2–1.3] | 1.1× [1–1.1] | 1.1× [0.78–1.1] unresolved | 1.4× [1.3–1.5] | 1.2× [1.2–1.2] | 2.5× [2.4–2.8] | 1.3× [1.3–1.4] |
| v4.slug | ts/node | reference | 1.1× [0.97–1.1] unresolved | 1× [0.97–1] unresolved | 0.9× [0.85–0.97] | 1.1× [1.1–1.1] | 0.91× [0.87–0.94] | 1.9× [1.8–2] | 1.2× [1.2–1.3] |
| v4.string | ts/node | reference | 1.1× [0.98–1.2] unresolved | 1× [1–1] | 0.58× [0.45–0.6] | 0.6× [0.58–0.62] | 0.9× [0.9–0.92] | 1.8× [1.8–2] | 1.5× [1.4–1.5] |
| v4.string.custom-random | ts/node | reference | 1.7× [1.6–1.8] | 1.8× [1.7–1.8] | 0.15× [0.13–0.16] | 0.52× [0.49–0.55] | 1.5× [1.5–1.5] | 1.3× [1.2–1.5] | 0.91× [0.88–1] unresolved |
| v4.string.uppercase | ts/node | reference | 1.1× [1.1–1.3] | 1× [1–1.1] | 0.93× [0.81–1.1] unresolved | 1.1× [1.1–1.1] | 0.89× [0.88–0.91] | 1.8× [1.7–2] | 1.4× [1.3–1.5] |
| v7.at | ts/node | reference | 1.1× [0.76–1.2] unresolved | 0.99× [0.98–1.1] unresolved | 0.59× [0.46–0.65] | 1× [0.85–1.1] unresolved | 0.88× [0.85–0.92] | 1.2× [1.2–1.5] | 0.83× [0.81–0.86] |
| v7.at.bytes | ts/node | reference | 1× [0.92–1.1] unresolved | 1× [0.98–1] unresolved | 0.34× [0.32–0.36] | 1.6× [1.5–1.7] | 0.92× [0.9–0.94] | 0.96× [0.95–0.98] | 0.41× [0.38–0.42] |
| v7.at.into | ts/node | reference | 1× [0.97–1] unresolved | 1× [0.98–1] unresolved | 0.36× [0.28–0.51] | 1× [1–1.2] | 0.92× [0.9–0.95] | 0.96× [0.94–0.98] | 0.46× [0.45–0.46] |
| v7.at.slug | ts/node | reference | 1.1× [1–1.1] | 0.9× [0.88–0.91] | 0.5× [0.42–0.51] | 1× [0.98–1] unresolved | 0.91× [0.88–0.92] | 1.2× [1.2–1.4] | 0.69× [0.68–0.72] |
| v7.base32 | ts/node | reference | 1× [0.99–1] unresolved | 1.1× [1–1.1] | 0.83× [0.57–0.91] | 0.96× [0.92–0.98] | 0.97× [0.96–0.99] | 1.7× [1.6–1.9] | 1.1× [0.35–1.1] unresolved |
| v7.bounds.bytes | ts/node | reference | 0.96× [0.9–1] unresolved | 0.96× [0.94–1] | 0.54× [0.52–0.71] | 4.1× [3.9–5] | 0.9× [0.87–0.91] | 0.52× [0.5–0.56] | 0.54× [0.52–0.55] |
| v7.bounds.text | ts/node | reference | 1× [0.99–1.1] unresolved | 1.1× [1.1–1.1] | 1.4× [1.3–1.6] | 0.93× [0.87–0.96] | 0.8× [0.76–0.82] | 0.92× [0.89–1.4] unresolved | 1.7× [1.7–1.8] |
| v7.bounds.text.interval | ts/node | reference | 1× [1–1.1] | 1.1× [1.1–1.1] | 1.4× [1–1.7] | 0.95× [0.79–0.98] | 0.84× [0.83–0.88] | 0.9× [0.89–1.2] unresolved | 1.6× [1.5–1.6] |
| v7.bounds.text.uppercase | ts/node | reference | 0.99× [0.94–1] unresolved | 1.1× [1.1–1.1] | 1.5× [1.3–1.8] | 0.97× [0.9–1] unresolved | 0.98× [0.92–1] unresolved | 1.7× [1.6–1.8] | 1.8× [1.7–1.8] |
| v7.bytes | ts/node | reference | 1× [0.86–1.1] unresolved | 0.98× [0.96–1] | 0.56× [0.4–0.59] | 2.8× [2.6–3] | 1.1× [1–1.1] | 1.5× [1.5–1.8] | 0.62× [0.59–0.63] |
| v7.bytes.selected-generator | ts/node | reference | 1.4× [1.4–1.4] | 1× [1–1.1] | 0.39× [0.33–0.48] | 1.6× [1.5–1.7] | 0.97× [0.95–0.99] | 0.84× [0.81–0.87] | 0.42× [0.41–0.43] |
| v7.into | ts/node | reference | 1× [0.92–1] unresolved | 0.99× [0.96–1] unresolved | 0.68× [0.57–0.71] | 1× [0.83–1.1] unresolved | 1.1× [1–1.1] | 1.8× [1.8–1.9] | 0.79× [0.77–0.81] |
| v7.pair.base32 | ts/node | reference | 1.1× [1–1.1] | 1× [0.98–1] unresolved | 1.1× [0.85–1.1] unresolved | 0.92× [0.9–0.96] | 0.98× [0.95–1] unresolved | 1.6× [1.5–1.6] | 1.4× [1.4–1.4] |
| v7.pair.base32.uppercase | ts/node | reference | 1.1× [1–1.1] | 1× [0.97–1.1] unresolved | 1.1× [0.97–1.1] unresolved | 0.94× [0.89–1] unresolved | 0.99× [0.97–1] | 1.6× [1.6–1.7] | 1.4× [1.4–1.4] |
| v7.pair.composed | ts/node | reference | 1× [0.99–1] unresolved | 0.99× [0.97–1] unresolved | 1.1× [0.61–1.1] unresolved | 1.6× [1.5–1.7] | 0.89× [0.88–0.92] | 1.5× [1.5–1.6] | 1.3× [1.3–1.4] |
| v7.pair.default | ts/node | reference | 1× [1–1.1] | 1× [0.97–1] unresolved | 1.1× [0.66–2.4] unresolved | 0.92× [0.86–0.94] | 0.91× [0.88–0.91] | 1.6× [1.5–2.4] | 1.4× [1.4–1.4] |
| v7.pair.selected-generator | ts/node | reference | 1.3× [1.3–1.4] | 1× [0.99–1] unresolved | 0.67× [0.63–0.75] | 1.3× [1.2–1.4] | 0.95× [0.91–0.96] | 1× [0.98–1] unresolved | 0.85× [0.82–0.86] |
| v7.pair.uppercase | ts/node | reference | 1× [0.97–1.1] unresolved | 1× [1–1] unresolved | 1.1× [0.93–1.2] unresolved | 0.92× [0.66–0.94] | 0.93× [0.92–0.95] | 1.6× [1.6–1.6] | 1.4× [1.4–1.4] |
| v7.slug | ts/node | reference | 1× [0.97–1] unresolved | 1× [0.98–1.1] unresolved | 0.65× [0.34–0.69] | 0.97× [0.88–0.97] | 0.97× [0.93–0.98] | 1.7× [1.7–1.8] | 1.1× [0.96–1.1] unresolved |
| v7.slug.selected-generator | ts/node | reference | 1.4× [1.3–1.4] | 1× [1–1.1] | 0.49× [0.45–0.5] | 1.4× [1.4–1.5] | 0.95× [0.92–0.97] | 0.9× [0.86–1.1] unresolved | 0.61× [0.6–0.62] |
| v7.slug.structural-generator | ts/node | reference | 1.4× [1.3–1.4] | 1× [1–1.1] | 0.44× [0.41–0.63] | 1.3× [1.3–1.4] | 0.97× [0.92–1] unresolved | 1× [0.99–1.1] unresolved | 0.58× [0.57–0.59] |
| v7.string | ts/node | reference | 1× [0.99–1.1] unresolved | 0.99× [0.98–1] unresolved | 0.45× [0.43–0.54] | 0.95× [0.84–0.98] | 0.96× [0.92–1] unresolved | 1.5× [1.5–2.3] | 1.1× [1.1–1.1] |
| v7.string.custom-random | ts/node | reference | 1.8× [1.7–1.8] | 1.8× [1.8–1.8] | 0.24× [0.22–0.25] | 0.35× [0.34–0.37] | 1.3× [1.2–1.3] | 0.93× [0.9–1.3] unresolved | 0.58× [0.56–0.6] |
| v7.string.selected-generator | ts/node | reference | 1.3× [1.3–2] | 1× [0.96–1] unresolved | 0.56× [0.54–0.6] | 1× [0.93–1.1] unresolved | 0.88× [0.85–0.9] | 1× [1–1.5] | 0.72× [0.71–0.72] |
| v7.string.selected-generator.at | ts/node | reference | 1× [1–1.8] | 0.99× [0.95–1.1] unresolved | 0.57× [0.44–0.59] | 1.4× [1.4–1.5] | 0.9× [0.88–0.91] | 0.91× [0.88–1.4] unresolved | 0.66× [0.65–0.67] |
| v7.string.structural-generator | ts/node | reference | 1.3× [1.3–2] | 1× [1–1.1] | 0.48× [0.43–0.53] | 1.4× [1.3–1.4] | 0.95× [0.93–0.97] | 1.1× [1.1–1.5] | 0.67× [0.65–0.67] |
| v7.string.uppercase | ts/node | reference | 1× [0.95–1.1] unresolved | 0.99× [0.98–1] unresolved | 0.6× [0.34–0.62] | 0.95× [0.91–0.98] | 0.96× [0.94–0.99] | 1.5× [1.5–1.6] | 1.1× [1.1–1.2] |
| value.convert.masked | ts/node | reference | 1.1× [1–1.2] | 1× [0.97–1] unresolved | 0.85× [0.83–1] unresolved | 0.97× [0.96–0.99] | 0.97× [0.95–0.99] | 1.7× [1.6–1.7] | 0.93× [0.91–0.95] |
| value.convert.string | ts/node | reference | 1× [0.99–1.2] unresolved | 0.97× [0.93–1] unresolved | 0.68× [0.63–0.74] | 0.92× [0.89–0.96] | 0.88× [0.85–0.9] | 1.2× [1.1–1.2] | 0.91× [0.86–0.96] |
| value.generate | ts/node | reference | 1× [0.97–1.2] unresolved | 0.99× [0.96–1.1] unresolved | 0.74× [0.55–0.84] | 1.6× [1.5–1.8] | 0.93× [0.81–0.95] | 1.6× [1.6–1.7] | 0.75× [0.73–0.76] |
| value.generate.at | ts/node | reference | 1× [0.99–1.8] unresolved | 0.97× [0.94–1] unresolved | 0.48× [0.42–0.52] | 1.4× [1.3–1.5] | 0.88× [0.84–0.89] | 1.2× [1.2–1.2] | 0.56× [0.55–0.57] |
| value.generate.codec | ts/node | reference | 0.97× [0.92–1.1] unresolved | 0.99× [0.94–1.1] unresolved | 0.75× [0.68–0.81] | 1.6× [1.6–2] | 0.92× [0.87–0.94] | 1.6× [1.6–1.7] | 0.76× [0.75–0.77] |
| value.generate.generator | ts/node | reference | 1.5× [1.5–1.8] | 0.99× [0.97–1] unresolved | 0.64× [0.37–0.66] | 1.7× [1.6–2.1] | 0.9× [0.72–0.93] | 1.6× [1.6–1.7] | 0.71× [0.69–0.73] |
| value.inspect.fields | ts/node | reference | 0.82× [0.8–0.99] | 0.76× [0.75–0.79] | 0.65× [0.55–0.81] | 0.98× [0.97–1] | 0.78× [0.76–0.79] | 1.9× [1.8–1.9] | 0.86× [0.84–0.88] |
| value.parse.bytes | ts/node | reference | 1.2× [1.1–1.8] | 0.97× [0.95–1] unresolved | 0.58× [0.45–0.6] | 1.8× [1.6–1.9] | 0.94× [0.86–0.96] | 1.6× [1.6–1.7] | 0.64× [0.61–0.65] |
| value.parse.masked | ts/node | reference | 1.1× [1.1–1.3] | 1× [0.96–1.1] unresolved | 0.77× [0.69–0.89] | 1.7× [1.6–1.9] | 0.96× [0.88–0.97] | 1.8× [1.8–1.9] | 0.83× [0.83–0.85] |
| value.parse.slug | ts/node | reference | 1.2× [1.2–2.1] | 1× [0.98–1] unresolved | 0.5× [0.36–0.56] | 1.7× [1.6–1.8] | 0.9× [0.41–0.93] | 1.5× [1.4–1.6] | 0.57× [0.56–0.59] |
| value.parse.structural | ts/node | reference | 1.2× [1.1–1.3] | 0.97× [0.95–1] unresolved | 0.61× [0.35–0.62] | 2.1× [1.9–2.4] | 0.87× [0.83–0.9] | 1.3× [1.2–1.3] | 0.67× [0.64–0.74] |
| value.parse.uuid | ts/node | reference | 1.2× [1.2–1.6] | 0.98× [0.93–1.4] unresolved | 0.56× [0.39–0.61] | 1.6× [1.5–1.7] | 0.83× [0.76–0.85] | 1.3× [1.2–1.3] | 0.58× [0.55–0.6] |
| value.toBytes | ts/node | reference | 0.72× [0.67–0.96] | 0.77× [0.74–0.8] | 0.69× [0.43–0.9] | 3.3× [3.1–5.2] | 1× [0.94–1] unresolved | 1× [0.98–1] unresolved | 0.57× [0.56–0.63] |
| value.toBytes.into | ts/node | reference | 0.77× [0.65–0.83] | 0.74× [0.73–0.78] | 0.9× [0.72–1.2] unresolved | 0.9× [0.89–0.93] | 0.9× [0.84–0.92] | 1× [1–1.1] | 0.78× [0.76–0.8] |
| value.toJSON | ts/node | reference | 0.97× [0.95–1.1] unresolved | 0.94× [0.9–0.99] | 0.82× [0.74–0.91] | 0.95× [0.92–0.97] | 0.86× [0.79–0.88] | 1.1× [1.1–1.2] | 1.2× [1.2–1.3] |
| value.toMaskedSlug | ts/node | reference | 1.1× [1–1.2] | 1× [0.98–1] unresolved | 0.92× [0.73–1] unresolved | 0.97× [0.93–0.98] | 0.95× [0.9–0.96] | 1.8× [1.7–1.8] | 1× [1–1] |
| value.toMaskedSlug.structural | ts/node | reference | 1× [0.53–1.2] unresolved | 1× [0.99–1.1] unresolved | 0.87× [0.78–0.96] | 1.4× [1.3–1.4] | 0.96× [0.92–0.97] | 1.7× [1.6–1.7] | 1× [1–1.1] |
| value.toPlainSlug | ts/node | reference | 0.96× [0.93–1.3] unresolved | 0.92× [0.91–0.97] | 1.1× [0.96–1.2] unresolved | 0.92× [0.89–0.93] | 0.84× [0.78–0.85] | 1.4× [1.3–1.5] | 1.3× [1.3–1.4] |
| value.toPlainSlug.base32 | ts/node | reference | 0.98× [0.93–1.1] unresolved | 0.95× [0.94–0.99] | 0.95× [0.6–1.1] unresolved | 0.94× [0.92–0.95] | 0.89× [0.83–0.91] | 1.4× [1.4–1.5] | 1.3× [1.2–1.3] |
| value.toString | ts/node | reference | 0.98× [0.96–1.1] unresolved | 0.94× [0.91–1] | 0.81× [0.64–0.89] | 0.95× [0.91–0.97] | 0.83× [0.79–0.85] | 1.1× [1.1–1.2] | 1.2× [1.2–1.3] |
| value.toString.uppercase | ts/node | reference | 0.97× [0.95–1.1] unresolved | 0.95× [0.92–1.4] unresolved | 0.87× [0.58–0.91] | 0.94× [0.91–0.96] | 0.83× [0.75–0.87] | 1.2× [1.1–1.2] | 1.2× [1.1–1.2] |

## TypeScript workerd

| Caller job | Reference | ts/workerd-web | ts/workerd-node-compatible |
| --- | --- | ---: | ---: |
| async.mask.derive | ts/node | 1.3× [1.2–1.3] | 1.3× [1.3–1.3] |
| async.mask.derive.iterated | ts/node | 1.1× [1.1–1.2] | 1.1× [1–1.2] |
| base32.decode | ts/node | 0.92× [0.87–0.94] | 0.92× [0.9–0.96] |
| base32.decode.uppercase | ts/node | 0.92× [0.86–0.94] | 0.92× [0.89–0.95] |
| base32.encode | ts/node | 0.8× [0.78–0.81] | 0.81× [0.8–0.84] |
| bounds/one-millisecond | ts/node | 1× [0.99–1.2] unresolved | 1× [1–1.3] unresolved |
| bounds/range | ts/node | 1× [0.98–1.1] unresolved | 1× [0.99–1.4] unresolved |
| bytes.base32 | ts/node | 1× [0.93–1] unresolved | 0.99× [0.98–1.1] unresolved |
| bytes.base64 | ts/node | 1× [0.91–1] unresolved | 1× [0.98–1.1] unresolved |
| bytes.offset.base32 | ts/node | 1× [0.93–1.1] unresolved | 1× [1–1.1] |
| bytes.offset.base64 | ts/node | 1× [0.92–1] unresolved | 1× [0.99–1] unresolved |
| bytes/read | ts/node | 1.1× [1.1–1.1] | 1.1× [1.1–1.2] |
| codec.toBytes.bytes | ts/node | 1.1× [1–1.1] | 1.1× [1–1.1] |
| codec.toBytes.plain | ts/node | 0.94× [0.88–0.95] | 0.96× [0.94–1] |
| codec.toPlainSlug.bytes | ts/node | 0.98× [0.95–0.99] | 0.98× [0.95–1.1] unresolved |
| codec.toString.bytes | ts/node | 1× [1–1.1] unresolved | 1× [0.93–1.1] unresolved |
| codec.toString.mixed | ts/node | 0.89× [0.86–1.2] unresolved | 0.88× [0.83–0.9] |
| codec.toString.plain | ts/node | 0.95× [0.91–0.97] | 0.97× [0.94–0.98] |
| codec.toString.uuid | ts/node | 0.9× [0.87–0.95] | 0.95× [0.91–0.97] |
| construct.codec | ts/node | 1.2× [1.1–1.2] | 1.2× [1.1–1.8] |
| construct.codec.retained-range | ts/node | 1.2× [1.1–1.2] | 1.2× [1.1–1.5] |
| construct.codec.rotation | ts/node | 1.3× [1.2–1.3] | 1.3× [1.2–2.1] |
| construct.codec.sentinels | ts/node | 1.1× [1.1–1.2] | 1.1× [1.1–1.3] |
| construct.codec.sentinels16 | ts/node | 0.99× [0.96–1] unresolved | 1× [0.98–1.2] unresolved |
| construct.codec.sentinels4 | ts/node | 1.1× [1–1.1] | 1× [1–1.5] |
| construct.codec.sentinels64 | ts/node | 0.96× [0.93–0.98] | 0.98× [0.95–1.2] unresolved |
| construct.codec.sentinels8 | ts/node | 1× [0.98–1] unresolved | 1× [0.98–1.4] unresolved |
| construct.custom | ts/node | 1× [1–1] | 1× [0.94–1.1] unresolved |
| construct.generator | ts/node | 1.1× [1.1–1.2] | 1.1× [1.1–1.2] |
| construct.generator.default | ts/node | 1.1× [1.1–1.1] | 1.1× [1.1–2.5] |
| construct.generator.rollback | ts/node | 1.1× [1.1–1.2] | 1.1× [1–1.8] |
| construct.mask | ts/node | 1.3× [1.2–1.3] | 1.3× [1.2–1.8] |
| construct.mask.bytes | ts/node | 1× [0.97–1] unresolved | 1× [0.96–1.5] unresolved |
| construct.mask.bytes.reused | ts/node | 1× [0.98–1.1] unresolved | 1× [0.98–1.4] unresolved |
| construct.mask.iterated | ts/node | 1.1× [1.1–1.2] | 1.2× [1.1–2.1] |
| construct.migration.all | ts/node | 0.91× [0.89–0.91] | 0.9× [0.86–1.1] unresolved |
| construct.migration.current | ts/node | 0.9× [0.89–0.92] | 0.91× [0.89–1] unresolved |
| construct.migration.original | ts/node | 0.9× [0.88–0.91] | 0.9× [0.87–1.1] unresolved |
| construct.migration.plain | ts/node | 0.91× [0.9–0.92] | 0.89× [0.87–1.1] unresolved |
| construct/codec-precomputed-mask | ts/node | 0.88× [0.85–0.88] | 0.87× [0.84–0.94] |
| construct/generator | ts/node | 1.1× [1.1–1.9] | 1.1× [1.1–1.4] |
| control | ts/node | 1× [0.88–1.8] unresolved | 0.98× [0.95–1] unresolved |
| decode/base32/caller-buffer | ts/node | 0.94× [0.91–0.97] | 0.92× [0.89–0.99] |
| decode/base32/owned | ts/node | 0.94× [0.91–0.96] | 0.94× [0.92–1] unresolved |
| decode/caller-buffer | ts/node | 0.87× [0.83–0.89] | 0.9× [0.87–0.91] |
| decode/owned | ts/node | 0.91× [0.87–0.94] | 0.92× [0.91–1.1] unresolved |
| error.classify.failure | ts/node | 1.1× [1–1.2] | 1.1× [0.91–1.6] unresolved |
| error.classify.success | ts/node | 1.1× [1–1.1] | 1.1× [0.94–1.1] unresolved |
| failure/uuid-parse | ts/node | 0.66× [0.64–0.69] | 0.68× [0.65–0.74] |
| format | ts/node | 0.97× [0.92–1] unresolved | 0.99× [0.97–1] unresolved |
| format.offset | ts/node | 0.98× [0.89–0.99] | 1× [0.99–1] unresolved |
| format.uppercase | ts/node | 0.75× [0.73–0.79] | 0.77× [0.75–0.81] |
| format/uuid/lowercase | ts/node | 0.99× [0.97–1] unresolved | 0.99× [0.91–1] unresolved |
| format/uuid/uppercase | ts/node | 0.77× [0.76–0.79] | 0.77× [0.73–0.79] |
| generation/v4/base32hex | ts/node | 0.99× [0.97–1.6] unresolved | 1× [0.98–1] unresolved |
| generation/v4/base64url | ts/node | 1× [0.98–1] unresolved | 1× [1–1.1] unresolved |
| generation/v4/bytes | ts/node | 1× [1–1] | 1× [0.99–1.1] unresolved |
| generation/v4/text | ts/node | 1× [0.99–1] unresolved | 1× [0.96–1] unresolved |
| generation/v7/base32hex | ts/node | 1.1× [1–1.2] | 1.1× [1.1–1.1] |
| generation/v7/base64url | ts/node | 1.1× [1.1–1.2] | 1.1× [1–1.1] |
| generation/v7/bytes | ts/node | 1.2× [1.2–1.3] | 1.2× [1.2–1.2] |
| generation/v7/text | ts/node | 1.1× [1.1–1.2] | 1.1× [1.1–1.2] |
| guard.bytes.any | ts/node | 1× [0.98–1.1] unresolved | 1.1× [1–1.1] |
| guard.bytes.v4 | ts/node | 0.93× [0.92–1.1] unresolved | 0.94× [0.92–0.95] |
| guard.bytes.v7 | ts/node | 1× [0.96–1.1] unresolved | 0.98× [0.94–1] unresolved |
| guard.invalid.slug | ts/node | 0.98× [0.96–1.5] unresolved | 0.99× [0.95–1] unresolved |
| guard.invalid.uuid | ts/node | 0.66× [0.64–0.93] | 0.67× [0.65–0.69] |
| guard.slug | ts/node | 1.1× [1–1.1] | 1.1× [1.1–1.1] |
| guard.slug.any | ts/node | 1.1× [1.1–1.2] | 1.1× [1.1–1.2] |
| guard.slug.v4 | ts/node | 1.1× [1.1–1.3] | 1.2× [1.1–1.2] |
| guard.uuid | ts/node | 1× [0.81–1.3] unresolved | 0.98× [0.88–1] unresolved |
| guard.uuid.any | ts/node | 1× [0.85–1.2] unresolved | 1× [0.95–1.2] unresolved |
| guard.uuid.braced | ts/node | 0.66× [0.61–0.71] | 0.65× [0.62–0.71] |
| guard.uuid.compact | ts/node | 0.63× [0.61–0.72] | 0.64× [0.6–0.66] |
| guard.uuid.mixed | ts/node | 0.95× [0.87–1.1] unresolved | 0.97× [0.87–1.1] unresolved |
| guard.uuid.text | ts/node | 0.97× [0.91–1.4] unresolved | 0.93× [0.86–1] unresolved |
| guard.uuid.urn | ts/node | 0.64× [0.63–0.79] | 0.64× [0.62–0.65] |
| guard.uuid.v4 | ts/node | 0.93× [0.87–1.4] unresolved | 0.9× [0.87–0.99] |
| invalid.alphabet | ts/node | 0.56× [0.53–0.57] | 0.55× [0.53–0.56] |
| invalid.async.mask.cancelled | ts/node | 0.98× [0.94–1] | 0.98× [0.93–0.99] |
| invalid.construct.codec.sentinel | ts/node | 0.97× [0.95–0.97] | 0.96× [0.92–1] unresolved |
| invalid.construct.custom | ts/node | 0.78× [0.77–0.81] | 0.78× [0.77–1.2] unresolved |
| invalid.construct.generator | ts/node | 0.7× [0.69–0.72] | 0.69× [0.69–0.96] |
| invalid.construct.mask | ts/node | 0.86× [0.84–0.89] | 0.85× [0.83–1.1] unresolved |
| invalid.error.propagate | ts/node | 1.1× [1.1–1.2] | 1.1× [1.1–1.6] |
| invalid.mask | ts/node | 0.73× [0.69–0.74] | 0.72× [0.68–0.74] |
| invalid.mask.custom | ts/node | 0.85× [0.84–0.9] | 0.86× [0.84–0.91] |
| invalid.mask.into.range | ts/node | 0.67× [0.65–0.69] | 0.67× [0.64–0.71] |
| invalid.mask.sentinel-collision | ts/node | 0.82× [0.8–0.86] | 0.85× [0.81–0.96] |
| invalid.mask.sentinel-collision.base32 | ts/node | 0.82× [0.81–0.85] | 0.82× [0.79–0.93] |
| invalid.mask.version | ts/node | 0.58× [0.56–0.6] | 0.58× [0.57–0.6] |
| invalid.migration | ts/node | 0.73× [0.69–0.83] | 0.71× [0.69–0.73] |
| invalid.migration.masks1.miss | ts/node | 0.68× [0.66–0.82] | 0.67× [0.66–1.1] unresolved |
| invalid.migration.masks16.miss | ts/node | 0.88× [0.85–1.1] unresolved | 0.87× [0.86–0.91] |
| invalid.migration.masks4.miss | ts/node | 0.76× [0.74–1.2] unresolved | 0.75× [0.75–0.8] |
| invalid.migration.masks8.miss | ts/node | 0.83× [0.78–1.4] unresolved | 0.82× [0.81–0.83] |
| invalid.migrationCandidates | ts/node | 0.71× [0.67–0.74] | 0.73× [0.71–1] unresolved |
| invalid.rotation16.miss | ts/node | 0.8× [0.75–0.82] | 0.8× [0.78–1.1] unresolved |
| invalid.rotation4.miss | ts/node | 0.72× [0.67–0.75] | 0.72× [0.69–0.74] |
| invalid.rotation8.miss | ts/node | 0.75× [0.74–0.78] | 0.74× [0.74–0.78] |
| invalid.slug | ts/node | 0.75× [0.72–0.9] | 0.77× [0.75–0.81] |
| invalid.slug.base32.early | ts/node | 0.76× [0.73–0.77] | 0.77× [0.75–0.82] |
| invalid.slug.base32.late | ts/node | 0.76× [0.73–0.76] | 0.78× [0.75–0.84] |
| invalid.slug.base32.middle | ts/node | 0.75× [0.72–0.77] | 0.77× [0.75–0.84] |
| invalid.slug.base32.tail | ts/node | 0.77× [0.76–0.79] | 0.78× [0.77–0.87] |
| invalid.slug.base64.early | ts/node | 0.74× [0.72–0.76] | 0.77× [0.74–0.81] |
| invalid.slug.base64.late | ts/node | 0.75× [0.73–0.78] | 0.77× [0.73–0.82] |
| invalid.slug.base64.middle | ts/node | 0.75× [0.73–0.75] | 0.78× [0.73–0.81] |
| invalid.slug.base64.tail | ts/node | 0.73× [0.72–0.74] | 0.76× [0.75–0.82] |
| invalid.slug.format.range | ts/node | 0.68× [0.65–0.7] | 0.7× [0.66–0.73] |
| invalid.slug.into.range | ts/node | 0.66× [0.65–0.67] | 0.66× [0.29–0.73] |
| invalid.slug.uuid | ts/node | 0.73× [0.72–0.74] | 0.73× [0.7–0.79] |
| invalid.timestamp.extract.range | ts/node | 0.58× [0.55–0.59] | 0.59× [0.57–0.62] |
| invalid.timestamp.slug.version | ts/node | 0.72× [0.71–0.77] | 0.73× [0.71–0.77] |
| invalid.timestamp.slug.window | ts/node | 0.74× [0.73–0.77] | 0.74× [0.73–0.81] |
| invalid.timestamp.version | ts/node | 0.72× [0.67–0.74] | 0.73× [0.71–0.9] |
| invalid.timestamp.window | ts/node | 0.74× [0.73–0.76] | 0.74× [0.71–0.84] |
| invalid.uuid | ts/node | 0.59× [0.57–0.61] | 0.6× [0.59–0.65] |
| invalid.uuid.format.range | ts/node | 0.59× [0.54–0.61] | 0.6× [0.59–0.61] |
| invalid.uuid.hex.early | ts/node | 0.6× [0.58–0.61] | 0.61× [0.6–0.65] |
| invalid.uuid.hex.late | ts/node | 0.6× [0.57–0.62] | 0.61× [0.6–0.65] |
| invalid.uuid.hex.middle | ts/node | 0.61× [0.56–0.62] | 0.61× [0.6–0.64] |
| invalid.uuid.into.range | ts/node | 0.66× [0.63–0.67] | 0.65× [0.64–0.69] |
| invalid.uuid.slug | ts/node | 0.6× [0.55–0.62] | 0.6× [0.59–0.64] |
| invalid.v4.into.range | ts/node | 0.65× [0.64–0.69] | 0.65× [0.64–0.67] |
| invalid.v7.at.into.range | ts/node | 0.76× [0.74–0.77] | 0.74× [0.72–0.77] |
| invalid.v7.into.range | ts/node | 0.65× [0.63–0.67] | 0.65× [0.63–0.66] |
| mask.binary.arraybuffer-input | ts/node | 1× [0.97–1] unresolved | 1× [0.98–1] unresolved |
| mask.binary.dataview-input | ts/node | 0.98× [0.95–1] | 0.99× [0.98–1] unresolved |
| mask.binary.sentinel | ts/node | 0.87× [0.83–0.91] | 0.89× [0.85–0.95] |
| mask.binary.text-input | ts/node | 0.91× [0.89–0.93] | 0.91× [0.67–0.97] |
| mask/base32 | ts/node | 0.99× [0.98–1] unresolved | 0.99× [0.98–1] unresolved |
| mask/base32/sentinels | ts/node | 1× [0.97–1] unresolved | 0.99× [0.98–1] unresolved |
| mask/base64 | ts/node | 0.98× [0.97–1] unresolved | 0.99× [0.98–1] unresolved |
| mask/binary/caller-buffer | ts/node | 0.98× [0.96–1] unresolved | 0.98× [0.95–1] unresolved |
| mask/binary/owned | ts/node | 0.99× [0.98–1] unresolved | 0.99× [0.97–1] unresolved |
| masked.base32.decode | ts/node | 0.94× [0.9–0.96] | 0.94× [0.93–1] unresolved |
| masked.base32.decode.bytes | ts/node | 0.96× [0.93–0.98] | 0.94× [0.94–1] unresolved |
| masked.base32.decode.into | ts/node | 0.94× [0.9–0.96] | 0.95× [0.94–0.99] |
| masked.base32.encode | ts/node | 0.9× [0.88–0.91] | 0.89× [0.89–0.99] |
| masked.base32.encode.bytes | ts/node | 1× [0.98–1] unresolved | 0.98× [0.97–1.1] unresolved |
| masked.base32.generate | ts/node | 1.1× [1–1.3] | 1.1× [1–1.1] |
| masked.custom.decode | ts/node | 0.96× [0.95–0.99] | 0.96× [0.95–1.1] unresolved |
| masked.custom.decode.bytes | ts/node | 0.97× [0.93–0.97] | 0.97× [0.95–1] unresolved |
| masked.custom.decode.into | ts/node | 0.96× [0.92–0.97] | 0.96× [0.94–1.1] unresolved |
| masked.custom.encode | ts/node | 0.98× [0.95–0.98] | 0.97× [0.95–1.1] unresolved |
| masked.decode | ts/node | 0.94× [0.92–1] | 0.96× [0.94–1] unresolved |
| masked.decode.bytes | ts/node | 0.95× [0.91–0.99] | 0.95× [0.91–1] unresolved |
| masked.decode.into | ts/node | 0.94× [0.91–0.97] | 0.95× [0.94–1] unresolved |
| masked.encode | ts/node | 0.9× [0.87–0.91] | 0.91× [0.9–1.1] unresolved |
| masked.encode.bytes | ts/node | 0.99× [0.97–1] unresolved | 1× [0.98–1.1] unresolved |
| masked.generate | ts/node | 1.1× [1–1.1] | 1.1× [1.1–1.1] |
| masked.generate.selected-generator | ts/node | 0.98× [0.95–1] unresolved | 1× [0.99–1] unresolved |
| masked.pair.base32 | ts/node | 1× [1–1.1] | 1.1× [1.1–1.1] |
| masked.pair.default | ts/node | 1.1× [1–1.1] unresolved | 1.1× [1–1.1] |
| masked.pair.selected-generator | ts/node | 0.98× [0.93–1.1] unresolved | 1× [0.96–1.2] unresolved |
| migration.base32 | ts/node | 0.97× [0.95–1] unresolved | 1× [0.97–1.2] unresolved |
| migration.base32Candidates | ts/node | 0.97× [0.94–1] unresolved | 1× [0.98–1.1] unresolved |
| migration.candidates1.distinct | ts/node | 1× [0.99–1.7] unresolved | 0.98× [0.85–1] unresolved |
| migration.candidates1.duplicate | ts/node | 1× [1–1.5] unresolved | 0.98× [0.94–1] unresolved |
| migration.candidates16.distinct | ts/node | 1× [0.98–1.7] unresolved | 0.98× [0.96–1] unresolved |
| migration.candidates16.duplicate | ts/node | 0.99× [0.98–1.8] unresolved | 0.98× [0.96–1] |
| migration.candidates32.distinct | ts/node | 1× [0.98–1.8] unresolved | 0.99× [0.96–1] unresolved |
| migration.candidates32.duplicate | ts/node | 1× [0.97–1.5] unresolved | 0.98× [0.97–0.99] |
| migration.candidates4.distinct | ts/node | 1× [0.97–1.7] unresolved | 0.98× [0.96–1] unresolved |
| migration.candidates4.duplicate | ts/node | 1× [0.98–1.6] unresolved | 0.98× [0.25–1] unresolved |
| migration.candidates64.distinct | ts/node | 1× [1–1.7] | 1× [0.99–1] unresolved |
| migration.candidates64.duplicate | ts/node | 1× [0.97–1.8] unresolved | 0.97× [0.96–0.99] |
| migration.candidates8.distinct | ts/node | 1× [0.97–1.1] unresolved | 0.97× [0.97–1] unresolved |
| migration.candidates8.duplicate | ts/node | 0.99× [0.97–1.5] unresolved | 0.97× [0.96–0.99] |
| migration.current | ts/node | 1× [0.96–1] unresolved | 1× [0.99–1.4] unresolved |
| migration.decodeCandidates | ts/node | 1.1× [0.99–1.1] unresolved | 1× [1–1.4] |
| migration.directCandidates | ts/node | 0.99× [0.9–1.4] unresolved | 1× [0.96–1] unresolved |
| migration.masks1.candidates | ts/node | 0.98× [0.97–1.7] unresolved | 0.98× [0.96–1.4] unresolved |
| migration.masks1.first | ts/node | 0.97× [0.96–1.4] unresolved | 0.98× [0.95–1.7] unresolved |
| migration.masks1.last | ts/node | 0.98× [0.97–1.5] unresolved | 0.98× [0.96–1.8] unresolved |
| migration.masks1.middle | ts/node | 0.99× [0.96–1.6] unresolved | 0.98× [0.95–1.7] unresolved |
| migration.masks16.candidates | ts/node | 1× [0.99–1.5] unresolved | 1× [0.99–1] unresolved |
| migration.masks16.first | ts/node | 1× [0.97–1.1] unresolved | 0.98× [0.98–1.5] unresolved |
| migration.masks16.last | ts/node | 1× [0.9–1.5] unresolved | 1× [1–1] |
| migration.masks16.middle | ts/node | 1× [1–1.1] | 1× [1–1.5] |
| migration.masks4.candidates | ts/node | 1× [0.97–1.1] unresolved | 1× [1–1] unresolved |
| migration.masks4.first | ts/node | 1× [0.97–1.6] unresolved | 0.99× [0.97–1.6] unresolved |
| migration.masks4.last | ts/node | 1× [1–1.1] | 1× [1–1.1] unresolved |
| migration.masks4.middle | ts/node | 1× [1–1.1] | 1× [1–1.7] unresolved |
| migration.masks8.candidates | ts/node | 1× [0.98–1.6] unresolved | 1× [0.99–1] unresolved |
| migration.masks8.first | ts/node | 1× [0.98–1.4] unresolved | 1× [0.98–1] unresolved |
| migration.masks8.last | ts/node | 1× [1–1.1] | 1× [1–1.1] |
| migration.masks8.middle | ts/node | 1× [1–1.4] | 1× [1–1.1] |
| migration.original | ts/node | 0.99× [0.92–1] unresolved | 1× [0.97–1] unresolved |
| migration.originalCandidates | ts/node | 0.99× [0.91–1.6] unresolved | 1× [0.96–1.1] unresolved |
| migration.plain | ts/node | 0.97× [0.94–1] unresolved | 0.97× [0.96–1] unresolved |
| migration.previous | ts/node | 1× [1–1] unresolved | 1× [1–1.2] unresolved |
| migration.previousCandidates | ts/node | 0.98× [0.91–1.1] unresolved | 0.97× [0.96–1.2] unresolved |
| migration/candidates-text | ts/node | 0.99× [0.95–1.1] unresolved | 0.98× [0.93–1] unresolved |
| migration/first-text | ts/node | 0.99× [0.98–1] | 0.99× [0.97–1.1] unresolved |
| native.node.v4.string | ts/node | 0.57× [0.54–0.93] | 0.55× [0.55–0.56] |
| native.v4.string | ts/node | 0.56× [0.54–0.78] | 0.55× [0.54–0.56] |
| native.v4.string.uppercase | ts/node | 0.68× [0.64–1.1] unresolved | 0.65× [0.65–0.69] |
| package.conversion.bytes.text | ts/node | 0.99× [0.98–1.9] unresolved | 0.98× [0.92–1] unresolved |
| package.conversion.slug.bytes | ts/node | 0.9× [0.88–1.7] unresolved | 0.91× [0.87–1] unresolved |
| package.conversion.text.bytes | ts/node | 0.75× [0.73–0.84] | 0.74× [0.71–0.77] |
| parse | ts/node | 0.76× [0.75–0.78] | 0.77× [0.74–0.8] |
| parse.compact | ts/node | 0.76× [0.74–0.77] | 0.77× [0.74–0.82] |
| parse.into | ts/node | 0.72× [0.71–0.74] | 0.73× [0.7–0.78] |
| parse.mixed | ts/node | 0.76× [0.72–0.78] | 0.75× [0.73–0.79] |
| parse/compact | ts/node | 0.77× [0.75–0.81] | 0.77× [0.76–0.8] |
| parse/keyed/base32 | ts/node | 0.96× [0.93–0.97] | 0.96× [0.93–1.1] unresolved |
| parse/keyed/base64 | ts/node | 0.96× [0.92–0.96] | 0.96× [0.94–1] unresolved |
| parse/uuid | ts/node | 0.77× [0.77–0.79] | 0.78× [0.77–0.81] |
| payload.extract.bytes | ts/node | 0.85× [0.81–0.86] | 0.84× [0.82–0.96] |
| payload.extract.uuid | ts/node | 0.84× [0.79–0.86] | 0.84× [0.82–0.89] |
| payload/extract/bytes | ts/node | 0.87× [0.85–1.1] unresolved | 0.86× [0.85–0.91] |
| payload/masked/base32 | ts/node | 0.94× [0.92–0.96] | 0.94× [0.92–0.97] |
| payload/masked/base64 | ts/node | 0.93× [0.91–0.97] | 0.94× [0.92–0.98] |
| plain.decode | ts/node | 0.87× [0.85–0.91] | 0.89× [0.87–0.93] |
| plain.decode.text | ts/node | 0.95× [0.91–1.1] unresolved | 0.95× [0.93–0.97] |
| plain.decode.text.base32 | ts/node | 0.93× [0.9–1.2] unresolved | 0.95× [0.94–0.99] |
| plain.decode.text.base32.uppercase | ts/node | 0.94× [0.9–0.98] | 0.94× [0.92–0.99] |
| plain.decode.text.uppercase | ts/node | 0.92× [0.9–1.1] unresolved | 0.94× [0.93–0.99] |
| plain.decode.uppercase | ts/node | 0.92× [0.87–1.1] unresolved | 0.93× [0.91–0.94] |
| plain.encode | ts/node | 0.79× [0.75–0.85] | 0.81× [0.79–0.88] |
| plain.toString | ts/node | 0.94× [0.92–0.95] | 0.93× [0.93–0.95] |
| plain/base32 | ts/node | 1× [0.95–1] unresolved | 1× [0.96–1] unresolved |
| plain/base64 | ts/node | 1× [0.97–1] unresolved | 0.99× [0.95–1.1] unresolved |
| platform.frombase64.conversion.slug.bytes | ts/node | 1.2× [1.1–1.4] | 1.2× [1.2–1.4] |
| platform.fromhex.conversion.text.bytes | ts/node | 1.2× [1.1–2.1] | 1.2× [1.2–1.5] |
| platform.setfrombase64.conversion.slug.bytes | ts/node | 1× [0.94–1.8] unresolved | 0.98× [0.96–1.2] unresolved |
| platform.tohex.conversion.bytes.text | ts/node | 1.1× [1.1–1.7] | 1.1× [1.1–1.5] |
| portable.advance.into | ts/node | 0.95× [0.94–1.1] unresolved | 0.97× [0.94–1] unresolved |
| portable.at | ts/node | 1× [0.96–1.6] unresolved | 0.99× [0.96–1] unresolved |
| portable.at.bytes | ts/node | 1× [1–1.6] | 1× [1–1.1] |
| portable.at.into | ts/node | 1× [0.97–1.7] unresolved | 1.1× [1–1.1] unresolved |
| portable.base32 | ts/node | 1× [0.96–1.3] unresolved | 1× [0.99–1.1] unresolved |
| portable.bytes | ts/node | 0.98× [0.92–1] unresolved | 0.97× [0.94–1] unresolved |
| portable.into | ts/node | 0.97× [0.9–1.5] unresolved | 0.97× [0.94–1] unresolved |
| portable.rollback.into | ts/node | 1× [0.95–1.1] unresolved | 1× [0.96–1.1] unresolved |
| portable.slug | ts/node | 0.98× [0.96–1.1] unresolved | 1× [0.99–1.1] unresolved |
| portable.string | ts/node | 0.97× [0.91–1.3] unresolved | 0.97× [0.95–1] unresolved |
| portable.subms12.auto.into | ts/node | 0.96× [0.91–1.6] unresolved | 0.94× [0.92–0.95] |
| portable.subms12.into | ts/node | 0.92× [0.91–1.3] unresolved | 0.92× [0.9–0.96] |
| rotation.current | ts/node | 1.1× [1–1.1] | 1× [1–1.1] |
| rotation.current.bytes | ts/node | 1.1× [1–1.1] | 1.1× [1.1–1.2] |
| rotation.previous | ts/node | 1.1× [1–1.1] | 1× [1–1.1] |
| rotation.previous.bytes | ts/node | 1.1× [1–1.1] | 1.1× [1.1–1.2] |
| rotation16.current | ts/node | 1.1× [1–1.3] | 1.1× [1–1.1] |
| rotation16.last | ts/node | 1× [1–1.1] unresolved | 1× [1–1.2] |
| rotation4.current | ts/node | 1.1× [1–1.1] | 1.1× [1–1.1] |
| rotation4.last | ts/node | 1× [1–1.1] | 1× [1–1] |
| rotation8.current | ts/node | 1.1× [1–1.1] unresolved | 1.1× [1–1.1] |
| rotation8.last | ts/node | 1× [0.98–1.4] unresolved | 1× [1–1.1] |
| sentinel.base32.decode | ts/node | 0.96× [0.84–1.2] unresolved | 0.97× [0.84–0.99] |
| sentinel.base32.decode.bytes | ts/node | 1.1× [1–1.3] | 1.2× [1.1–1.2] |
| sentinel.base32.decode.into | ts/node | 0.98× [0.91–1] unresolved | 1× [0.92–1.5] unresolved |
| sentinel.base32.encode | ts/node | 0.77× [0.74–1] unresolved | 0.77× [0.74–0.79] |
| sentinel.base32.timestamp | ts/node | 0.64× [0.61–0.69] | 0.67× [0.65–0.96] |
| sentinel.collision64.bytes.first | ts/node | 0.93× [0.87–1.1] unresolved | 0.94× [0.86–0.96] |
| sentinel.collision64.bytes.last | ts/node | 0.92× [0.88–1] unresolved | 0.92× [0.91–0.97] |
| sentinel.collision64.bytes.middle | ts/node | 0.9× [0.85–0.98] | 0.91× [0.89–0.96] |
| sentinel.collision64.bytes.miss | ts/node | 0.99× [0.97–1] unresolved | 0.99× [0.98–1.1] unresolved |
| sentinel.decode | ts/node | 0.95× [0.75–1] unresolved | 0.96× [0.83–1] unresolved |
| sentinel.decode.bytes | ts/node | 1.1× [1–1.2] | 1.1× [1.1–1.1] |
| sentinel.decode.into | ts/node | 0.99× [0.93–1.1] unresolved | 0.97× [0.87–1] unresolved |
| sentinel.encode | ts/node | 0.76× [0.73–0.82] | 0.76× [0.74–1.1] unresolved |
| sentinel.encode.bytes | ts/node | 0.9× [0.84–0.95] | 0.89× [0.87–1.3] unresolved |
| sentinel.encode.bytes.miss | ts/node | 0.98× [0.93–1] unresolved | 0.97× [0.97–1.5] unresolved |
| sentinel.scan16.bytes.first | ts/node | 0.92× [0.88–1] unresolved | 0.94× [0.9–0.99] |
| sentinel.scan16.bytes.last | ts/node | 0.89× [0.85–1.3] unresolved | 0.93× [0.9–1] unresolved |
| sentinel.scan16.bytes.middle | ts/node | 0.9× [0.87–1.2] unresolved | 0.9× [0.89–1] unresolved |
| sentinel.scan16.bytes.miss | ts/node | 1× [0.93–1.4] unresolved | 1× [0.98–1.4] unresolved |
| sentinel.scan16.first | ts/node | 0.75× [0.72–1.1] unresolved | 0.77× [0.74–1.1] unresolved |
| sentinel.scan16.last | ts/node | 0.82× [0.8–1.1] unresolved | 0.85× [0.82–1.3] unresolved |
| sentinel.scan16.middle | ts/node | 0.83× [0.82–1.2] unresolved | 0.84× [0.81–0.95] |
| sentinel.scan16.miss | ts/node | 0.9× [0.86–1.3] unresolved | 0.92× [0.89–1.4] unresolved |
| sentinel.scan4.bytes.first | ts/node | 0.9× [0.85–1.1] unresolved | 0.91× [0.89–1.4] unresolved |
| sentinel.scan4.bytes.last | ts/node | 0.97× [0.9–1.1] unresolved | 0.99× [0.96–1.3] unresolved |
| sentinel.scan4.bytes.middle | ts/node | 0.97× [0.91–0.99] | 0.99× [0.96–1.5] unresolved |
| sentinel.scan4.bytes.miss | ts/node | 0.98× [0.96–1.6] unresolved | 0.99× [0.98–1] unresolved |
| sentinel.scan4.first | ts/node | 0.76× [0.74–0.77] | 0.78× [0.73–0.85] |
| sentinel.scan4.last | ts/node | 0.83× [0.8–0.87] | 0.86× [0.82–0.93] |
| sentinel.scan4.middle | ts/node | 0.81× [0.77–0.86] | 0.85× [0.78–0.88] |
| sentinel.scan4.miss | ts/node | 0.89× [0.87–0.92] | 0.92× [0.88–1.3] unresolved |
| sentinel.scan64.bytes.first | ts/node | 0.92× [0.89–0.99] | 0.93× [0.91–0.96] |
| sentinel.scan64.bytes.last | ts/node | 0.93× [0.87–1.7] unresolved | 0.94× [0.92–1] unresolved |
| sentinel.scan64.bytes.middle | ts/node | 0.91× [0.86–1.5] unresolved | 0.94× [0.55–0.96] |
| sentinel.scan64.bytes.miss | ts/node | 0.99× [0.97–1.1] unresolved | 1× [0.98–1.1] unresolved |
| sentinel.scan64.first | ts/node | 0.76× [0.72–0.91] | 0.76× [0.72–0.89] |
| sentinel.scan64.last | ts/node | 0.84× [0.82–0.98] | 0.84× [0.81–0.95] |
| sentinel.scan64.middle | ts/node | 0.83× [0.77–1.3] unresolved | 0.85× [0.81–0.9] |
| sentinel.scan64.miss | ts/node | 0.89× [0.88–0.96] | 0.91× [0.88–1] unresolved |
| sentinel.scan8.bytes.first | ts/node | 0.91× [0.83–1.3] unresolved | 0.91× [0.42–0.92] |
| sentinel.scan8.bytes.last | ts/node | 0.99× [0.92–1.3] unresolved | 1.1× [0.99–1.3] unresolved |
| sentinel.scan8.bytes.middle | ts/node | 0.99× [0.91–1.2] unresolved | 1× [0.96–1] unresolved |
| sentinel.scan8.bytes.miss | ts/node | 0.97× [0.92–1.5] unresolved | 0.98× [0.96–1.6] unresolved |
| sentinel.scan8.first | ts/node | 0.77× [0.73–0.89] | 0.78× [0.74–0.95] |
| sentinel.scan8.last | ts/node | 0.89× [0.85–1.6] unresolved | 0.91× [0.9–0.94] |
| sentinel.scan8.middle | ts/node | 0.85× [0.8–1.1] unresolved | 0.87× [0.84–1] unresolved |
| sentinel.scan8.miss | ts/node | 0.89× [0.85–1.1] unresolved | 0.92× [0.89–0.93] |
| sentinel.timestamp | ts/node | 0.65× [0.59–0.9] | 0.64× [0.18–0.65] |
| sentinel/base32/canonical | ts/node | 1.1× [1.1–1.1] | 1.1× [1.1–1.1] |
| sentinel/base32/uppercase | ts/node | 1.1× [1.1–1.4] | 1.1× [1.1–1.2] |
| slug.base32.bytes | ts/node | 0.92× [0.88–1.3] unresolved | 0.96× [0.9–1] unresolved |
| slug.base32.into | ts/node | 0.91× [0.82–0.99] | 0.96× [0.89–0.98] |
| slug.bytes | ts/node | 0.91× [0.89–0.95] | 0.99× [0.93–1] unresolved |
| slug.into | ts/node | 0.92× [0.86–1.3] unresolved | 0.97× [0.94–1] unresolved |
| timestamp.extract | ts/node | 0.61× [0.6–0.64] | 0.63× [0.61–1] unresolved |
| timestamp.extract.masked | ts/node | 0.94× [0.91–0.96] | 0.96× [0.92–1] unresolved |
| timestamp.extract.masked.base32 | ts/node | 0.94× [0.9–0.95] | 0.96× [0.95–1] unresolved |
| timestamp.extract.offset | ts/node | 0.66× [0.64–0.67] | 0.66× [0.65–1.2] unresolved |
| timestamp.extract.slug | ts/node | 1.1× [1–1.1] | 1.1× [1–1.2] |
| timestamp.extract.slug.base32 | ts/node | 1.1× [1–1.1] | 1.1× [1.1–1.1] |
| timestamp.extract.uuid | ts/node | 0.95× [0.9–0.99] | 0.91× [0.82–1.4] unresolved |
| timestamp.extract.uuid.compact | ts/node | 0.81× [0.77–0.82] | 0.82× [0.78–1] unresolved |
| timestamp.extract.uuid.mixed | ts/node | 0.93× [0.89–0.94] | 0.92× [0.9–1] unresolved |
| timestamp.masked | ts/node | 0.87× [0.81–0.89] | 0.88× [0.87–0.98] |
| timestamp.masked.base32 | ts/node | 0.88× [0.83–0.91] | 0.91× [0.9–1] |
| timestamp.masked.base32.uppercase | ts/node | 0.89× [0.86–0.91] | 0.91× [0.89–0.98] |
| timestamp.slug | ts/node | 0.7× [0.67–0.73] | 0.72× [0.7–0.74] |
| timestamp.slug.base32 | ts/node | 0.79× [0.77–0.81] | 0.8× [0.78–0.82] |
| timestamp.slug.base32.uppercase | ts/node | 0.77× [0.76–0.79] | 0.79× [0.78–0.8] |
| timestamp.uuid | ts/node | 0.7× [0.69–0.71] | 0.7× [0.68–0.72] |
| timestamp.uuid.now | ts/node | 0.76× [0.74–0.79] | 0.76× [0.75–0.85] |
| timestamp/extract/bytes | ts/node | 0.56× [0.54–0.58] | 0.56× [0.54–0.6] |
| timestamp/masked/base32 | ts/node | 0.92× [0.88–0.92] | 0.91× [0.9–0.94] |
| timestamp/masked/base64 | ts/node | 0.9× [0.89–0.91] | 0.9× [0.89–1.1] unresolved |
| unmask.binary.sentinel | ts/node | 1× [0.98–1.1] unresolved | 1× [0.98–1.1] unresolved |
| unmask/base32 | ts/node | 0.97× [0.92–0.99] | 0.97× [0.96–1] |
| unmask/base64 | ts/node | 0.98× [0.96–0.98] | 0.97× [0.93–0.97] |
| unmask/binary/caller-buffer | ts/node | 1× [0.98–1.5] unresolved | 0.99× [0.95–1] unresolved |
| unmask/binary/owned | ts/node | 0.98× [0.98–1] unresolved | 0.99× [0.97–1] unresolved |
| unmask/binary/text | ts/node | 0.99× [0.99–1] unresolved | 0.99× [0.95–1] unresolved |
| uuid.toBytes.bytes | ts/node | 1× [1–1.1] | 1× [1–1.2] |
| uuid.toBytes.uuid | ts/node | 0.78× [0.77–0.82] | 0.79× [0.74–0.82] |
| uuid.toPlainSlug.bytes | ts/node | 0.98× [0.97–1] unresolved | 0.99× [0.96–1] unresolved |
| uuid.toString.braced | ts/node | 0.8× [0.76–0.83] | 0.78× [0.77–0.81] |
| uuid.toString.bytes | ts/node | 0.99× [0.97–1] unresolved | 1× [0.97–1.1] unresolved |
| uuid.toString.canonical | ts/node | 0.98× [0.92–1] unresolved | 1× [0.96–1] unresolved |
| uuid.toString.compact | ts/node | 0.84× [0.83–0.87] | 0.84× [0.83–0.97] |
| uuid.toString.mixed | ts/node | 0.99× [0.94–1] unresolved | 0.99× [0.96–1] unresolved |
| uuid.toString.mixed.uppercase | ts/node | 1× [0.99–1] unresolved | 1× [1–1] |
| uuid.toString.urn | ts/node | 0.77× [0.75–0.79] | 0.78× [0.77–0.79] |
| v4.base32 | ts/node | 1× [0.99–1] unresolved | 0.99× [0.97–1] unresolved |
| v4.bytes | ts/node | 1× [1–1.7] unresolved | 1× [0.96–1] unresolved |
| v4.into | ts/node | 1.1× [1–2] | 1.1× [1–1.1] |
| v4.slug | ts/node | 1× [0.91–1] unresolved | 0.99× [0.98–1.1] unresolved |
| v4.string | ts/node | 1× [0.99–1.5] unresolved | 1× [0.99–1.1] unresolved |
| v4.string.custom-random | ts/node | 0.54× [0.53–0.57] | 0.56× [0.52–0.61] |
| v4.string.uppercase | ts/node | 0.98× [0.95–1.1] unresolved | 0.97× [0.97–1] |
| v7.at | ts/node | 1.1× [0.98–1.6] unresolved | 1× [0.98–1.1] unresolved |
| v7.at.bytes | ts/node | 1× [0.97–1.4] unresolved | 0.97× [0.96–1.1] unresolved |
| v7.at.into | ts/node | 0.98× [0.96–1.5] unresolved | 0.96× [0.96–1.1] unresolved |
| v7.at.slug | ts/node | 0.95× [0.93–1.5] unresolved | 0.94× [0.3–0.97] |
| v7.base32 | ts/node | 1.1× [1.1–1.3] | 1.2× [1.1–1.2] |
| v7.bounds.bytes | ts/node | 0.97× [0.95–1.2] unresolved | 0.96× [0.94–1.1] unresolved |
| v7.bounds.text | ts/node | 1× [1–1.1] | 1× [0.99–1.1] unresolved |
| v7.bounds.text.interval | ts/node | 1.1× [1.1–1.5] | 1.1× [1–1.3] |
| v7.bounds.text.uppercase | ts/node | 1.1× [1.1–1.3] | 1.1× [1.1–1.3] |
| v7.bytes | ts/node | 1.2× [1.2–1.7] | 1.2× [1.2–1.4] |
| v7.bytes.selected-generator | ts/node | 1× [0.99–1.1] unresolved | 1× [0.96–1.1] unresolved |
| v7.into | ts/node | 1.2× [1.2–1.3] | 1.2× [1.2–1.4] |
| v7.pair.base32 | ts/node | 1.2× [1.1–1.2] | 1.2× [1.2–1.2] |
| v7.pair.base32.uppercase | ts/node | 1.2× [1.1–1.2] | 1.2× [1.2–1.3] |
| v7.pair.composed | ts/node | 1.1× [0.97–1.1] unresolved | 1.1× [1.1–1.1] |
| v7.pair.default | ts/node | 1.1× [1.1–1.1] | 1.1× [1.1–1.2] |
| v7.pair.selected-generator | ts/node | 0.98× [0.95–1] unresolved | 0.99× [0.97–1] unresolved |
| v7.pair.uppercase | ts/node | 1.1× [1.1–1.2] | 1.1× [1.1–1.2] |
| v7.slug | ts/node | 1.2× [1.1–1.3] | 1.2× [1.1–1.2] |
| v7.slug.selected-generator | ts/node | 0.96× [0.92–0.98] | 0.97× [0.97–0.98] |
| v7.slug.structural-generator | ts/node | 0.98× [0.97–1] | 0.99× [0.95–1.1] unresolved |
| v7.string | ts/node | 1.1× [1.1–2.2] | 1.1× [1.1–1.2] |
| v7.string.custom-random | ts/node | 0.38× [0.37–0.39] | 0.39× [0.37–0.41] |
| v7.string.selected-generator | ts/node | 0.96× [0.95–0.99] | 0.97× [0.93–1] unresolved |
| v7.string.selected-generator.at | ts/node | 0.98× [0.95–1] unresolved | 0.99× [0.96–1] unresolved |
| v7.string.structural-generator | ts/node | 1× [0.98–1] unresolved | 1× [0.99–1.1] unresolved |
| v7.string.uppercase | ts/node | 1.1× [1.1–1.9] | 1.1× [1.1–1.2] |
| value.convert.masked | ts/node | 1× [0.99–1] unresolved | 0.98× [0.34–1] |
| value.convert.string | ts/node | 0.99× [0.95–1.2] unresolved | 0.96× [0.93–1.1] unresolved |
| value.generate | ts/node | 1.1× [1–1.2] | 1.1× [1.1–1.7] |
| value.generate.at | ts/node | 0.95× [0.91–0.96] | 0.95× [0.93–1.7] unresolved |
| value.generate.codec | ts/node | 1.1× [1.1–1.2] | 1.1× [1.1–1.9] |
| value.generate.generator | ts/node | 0.93× [0.87–1.1] unresolved | 0.93× [0.91–2.1] unresolved |
| value.inspect.fields | ts/node | 0.89× [0.82–0.92] | 0.87× [0.86–1.2] unresolved |
| value.parse.bytes | ts/node | 0.92× [0.9–1.2] unresolved | 0.95× [0.92–0.99] |
| value.parse.masked | ts/node | 0.94× [0.92–1] unresolved | 0.97× [0.94–1] unresolved |
| value.parse.slug | ts/node | 0.91× [0.88–0.91] | 0.92× [0.91–0.95] |
| value.parse.structural | ts/node | 0.81× [0.79–1.2] unresolved | 0.85× [0.84–1.7] unresolved |
| value.parse.uuid | ts/node | 0.79× [0.78–0.83] | 0.81× [0.8–0.83] |
| value.toBytes | ts/node | 1.1× [0.99–1.1] unresolved | 1.1× [1.1–1.8] |
| value.toBytes.into | ts/node | 0.97× [0.92–1] unresolved | 0.96× [0.95–1.6] unresolved |
| value.toJSON | ts/node | 1× [0.97–1.2] unresolved | 0.99× [0.92–2] unresolved |
| value.toMaskedSlug | ts/node | 0.98× [0.93–1] unresolved | 0.99× [0.95–1.4] unresolved |
| value.toMaskedSlug.structural | ts/node | 1× [0.97–1.1] unresolved | 1× [1–1] |
| value.toPlainSlug | ts/node | 1× [0.97–1] unresolved | 0.99× [0.95–1.7] unresolved |
| value.toPlainSlug.base32 | ts/node | 1× [0.96–1] unresolved | 0.99× [0.98–1.8] unresolved |
| value.toString | ts/node | 0.99× [0.98–1] unresolved | 0.98× [0.91–1.5] unresolved |
| value.toString.uppercase | ts/node | 0.99× [0.93–1.3] unresolved | 0.98× [0.92–3.4] unresolved |

## Rust native

| Caller job | Reference | rust/native/release/fast-rng | rust/native/release/os-rng | rust/native/release/os-rng-no-std | rust/native/release/std | rust/native/release/reduced |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| async/future/cancelled | rust/native/release/fast-rng | reference | 0.92× [0.81–1.5] unresolved | 1× [0.98–1] unresolved | 1× [0.95–1.1] unresolved | 0.99× [0.82–1] unresolved |
| async/future/derive/1 | rust/native/release/fast-rng | reference | 1× [0.72–1.1] unresolved | 1× [0.99–1] unresolved | 1× [0.97–1] unresolved | 0.99× [0.93–1] unresolved |
| async/future/derive/64 | rust/native/release/fast-rng | reference | 0.99× [0.88–1] unresolved | 1× [0.99–1] unresolved | 1× [0.99–1] unresolved | 1× [0.97–1] unresolved |
| bounds/one-millisecond | ts/node | 0.051× [0.05–0.052] | 0.052× [0.051–0.053] | 0.051× [0.05–0.056] | 0.051× [0.05–0.052] | 0.051× [0.049–0.052] |
| bounds/range | ts/node | 0.048× [0.047–0.049] | 0.049× [0.043–0.051] | 0.049× [0.046–0.057] | 0.048× [0.047–0.054] | 0.048× [0.046–0.05] |
| bytes/read | ts/node | 0.017× [0.017–0.017] | 0.017× [0.016–0.018] | 0.017× [0.016–0.018] | 0.017× [0.017–0.018] | 0.017× [0.013–0.017] |
| bytes/write/offset | rust/native/release/fast-rng | reference | 1× [0.99–1.1] unresolved | 1× [1–1.3] unresolved | 1× [0.99–1.1] unresolved | 1× [0.99–1] unresolved |
| construct/codec-precomputed-mask | ts/node | 0.13× [0.12–0.13] | 0.13× [0.13–0.15] | 0.13× [0.12–0.15] | 0.13× [0.13–0.13] | 0.13× [0.12–0.14] |
| construct/custom-mask | rust/native/release/fast-rng | reference | 0.99× [0.74–1.1] unresolved | 1× [0.93–1.1] unresolved | 1× [0.59–1.1] unresolved | 1× [0.71–1.2] unresolved |
| construct/generator | ts/node | 0.0031× [0.0031–0.0032] | 0.0032× [0.0031–0.0037] | 0.0032× [0.0031–0.0032] | 0.0031× [0.0031–0.0035] | 0.0031× [0.003–0.0032] |
| construct/mask | rust/native/release/fast-rng | reference | 1× [0.95–1.1] unresolved | 1× [0.99–1] unresolved | 1× [0.99–1] unresolved | 1× [0.98–1] unresolved |
| construct/mask-iterated | rust/native/release/fast-rng | reference | 1× [0.73–1.1] unresolved | 0.99× [0.98–1] unresolved | 0.98× [0.97–1] unresolved | 0.98× [0.97–1] unresolved |
| construct/migration | rust/native/release/fast-rng | reference | 1× [1–1] unresolved | 1× [0.9–1] unresolved | 1× [0.98–1.1] unresolved | 1× [0.94–1] unresolved |
| construct/payload-layout | rust/native/release/fast-rng | reference | 1.1× [1–1.9] | 0.99× [0.97–1] unresolved | 0.99× [0.98–1.1] unresolved | 0.99× [0.98–1] unresolved |
| construct/public-test-mask-and-codec | rust/native/release/fast-rng | reference | 1× [0.95–1.1] unresolved | 5.3× [5.1–5.4] | 0.98× [0.97–1] unresolved | 5.2× [4.8–5.8] |
| construct/sentinels/1 | rust/native/release/fast-rng | reference | 1× [0.94–1.1] unresolved | 0.99× [0.96–1.1] unresolved | 1× [0.92–1.1] unresolved | 0.99× [0.96–1] unresolved |
| construct/sentinels/16 | rust/native/release/fast-rng | reference | 1× [0.98–1] unresolved | 0.99× [0.97–1.1] unresolved | 1× [0.96–1] unresolved | 0.99× [0.97–1] |
| construct/sentinels/4 | rust/native/release/fast-rng | reference | 1× [0.95–1.1] unresolved | 1× [0.98–1.1] unresolved | 1× [0.93–1] unresolved | 0.99× [0.91–1] unresolved |
| construct/sentinels/64 | rust/native/release/fast-rng | reference | 1× [0.98–1.1] unresolved | 0.98× [0.85–1] unresolved | 0.98× [0.65–1] unresolved | 0.98× [0.94–1] unresolved |
| decode/base32/caller-buffer | ts/node | 0.15× [0.14–0.15] | 0.14× [0.13–0.16] | 0.15× [0.13–0.15] | 0.15× [0.14–0.18] | 0.15× [0.14–0.15] |
| decode/base32/owned | ts/node | 0.22× [0.2–0.22] | 0.22× [0.2–0.24] | 0.22× [0.2–0.23] | 0.22× [0.21–0.27] | 0.22× [0.2–0.23] |
| decode/caller-buffer | ts/node | 0.12× [0.12–0.12] | 0.12× [0.12–0.14] | 0.12× [0.12–0.13] | 0.13× [0.12–0.13] | 0.12× [0.12–0.13] |
| decode/owned | ts/node | 0.15× [0.14–0.15] | 0.15× [0.13–0.16] | 0.14× [0.14–0.15] | 0.14× [0.13–0.15] | 0.14× [0.14–0.15] |
| failure/buffer-capacity | rust/native/release/fast-rng | reference | 1× [0.58–1.2] unresolved | 1.1× [1–1.5] | 1× [0.95–1.1] unresolved | 1× [0.99–1.1] unresolved |
| failure/plain/base32 | rust/native/release/fast-rng | reference | 0.98× [0.85–1] unresolved | 1× [0.93–1.1] unresolved | 1× [1–1.1] | 1× [0.93–1.1] unresolved |
| failure/plain/base64 | rust/native/release/fast-rng | reference | 1× [0.84–1.1] unresolved | 1× [0.98–1.1] unresolved | 1× [0.96–1] unresolved | 1× [0.97–1] unresolved |
| failure/uuid-parse | ts/node | 0.001× [0.001–0.0011] | 0.001× [0.00094–0.0013] | 0.001× [0.001–0.0011] | 0.001× [0.001–0.0012] | 0.001× [0.001–0.001] |
| format/uuid/lowercase | ts/node | 0.42× [0.39–0.42] | 0.42× [0.33–0.62] | 0.42× [0.38–0.43] | 0.43× [0.41–0.44] | 0.42× [0.37–0.45] |
| format/uuid/uppercase | ts/node | 0.41× [0.39–0.42] | 0.41× [0.22–0.45] | 0.41× [0.4–0.42] | 0.41× [0.39–0.43] | 0.4× [0.38–0.44] |
| generation/v4/base32hex | ts/node | 0.54× [0.54–0.55] | 18× [17–22] | 18× [17–18] | unavailable | unavailable |
| generation/v4/base64url | ts/node | 0.59× [0.59–0.61] | 21× [18–26] | 20× [20–21] | unavailable | unavailable |
| generation/v4/bytes | ts/node | 0.27× [0.27–0.28] | 20× [19–24] | 20× [19–20] | unavailable | unavailable |
| generation/v4/caller-buffer-custom-entropy | rust/native/release/fast-rng | reference | 1× [0.93–1.2] unresolved | 0.99× [0.99–1] unresolved | unavailable | unavailable |
| generation/v4/text | ts/node | 0.55× [0.53–0.58] | 17× [16–19] | 16× [16–17] | unavailable | unavailable |
| generation/v7/base32hex | ts/node | 0.21× [0.2–0.21] | 3.7× [3.4–4.3] | unavailable | unavailable | unavailable |
| generation/v7/base64url | ts/node | 0.21× [0.21–0.22] | 4.3× [3.7–6.5] | unavailable | unavailable | unavailable |
| generation/v7/bytes | ts/node | 0.42× [0.41–0.42] | 11× [10–11] | unavailable | unavailable | unavailable |
| generation/v7/caller-buffer-custom-entropy | rust/native/release/fast-rng | reference | 1× [0.58–1.2] unresolved | 1× [0.98–1] unresolved | unavailable | unavailable |
| generation/v7/custom-entropy | rust/native/release/fast-rng | reference | 1× [0.99–1] unresolved | 1× [0.99–1] unresolved | unavailable | unavailable |
| generation/v7/explicit-time | rust/native/release/fast-rng | reference | 68× [65–78] | unavailable | unavailable | unavailable |
| generation/v7/fraction12-custom-entropy | rust/native/release/fast-rng | reference | 1× [0.98–1] unresolved | 1× [0.99–1] unresolved | unavailable | unavailable |
| generation/v7/text | ts/node | 0.52× [0.51–0.55] | 9× [7.2–14] | unavailable | unavailable | unavailable |
| inspect/v4 | rust/native/release/fast-rng | reference | 1× [0.9–1.1] unresolved | 1× [0.99–1] unresolved | 1× [0.99–1.1] unresolved | 1× [0.98–1] unresolved |
| inspect/v7 | rust/native/release/fast-rng | reference | 0.99× [0.9–1] unresolved | 1× [1–1] | 1× [1–1] unresolved | 0.99× [0.93–1] unresolved |
| inspect/variant | rust/native/release/fast-rng | reference | 1× [0.94–1.4] unresolved | 0.99× [0.99–1] | 1× [0.98–1] unresolved | 0.99× [0.94–1] |
| inspect/version | rust/native/release/fast-rng | reference | 1× [0.99–1.4] unresolved | 1× [0.99–1] unresolved | 1× [0.99–1] unresolved | 1× [0.98–1] unresolved |
| mask/base32 | ts/node | 0.86× [0.85–0.88] | 0.86× [0.81–0.98] | 0.86× [0.84–0.87] | 0.87× [0.85–0.9] | 0.86× [0.84–0.88] |
| mask/base32/sentinels | ts/node | 0.79× [0.78–0.8] | 0.83× [0.76–1.1] unresolved | 0.8× [0.78–0.81] | 0.8× [0.76–0.96] | 0.79× [0.77–0.82] |
| mask/base64 | ts/node | 0.92× [0.91–0.92] | 0.92× [0.9–1] unresolved | 0.92× [0.9–0.93] | 0.93× [0.89–0.97] | 0.92× [0.9–0.94] |
| mask/binary/caller-buffer | ts/node | 0.63× [0.62–0.72] | 0.65× [0.63–1] unresolved | 0.63× [0.62–0.71] | 0.63× [0.63–0.71] | 0.63× [0.62–0.72] |
| mask/binary/owned | ts/node | 0.66× [0.65–0.66] | 0.67× [0.65–0.69] | 0.66× [0.64–0.66] | 0.66× [0.65–1] unresolved | 0.66× [0.64–0.67] |
| migration/candidates | rust/native/release/fast-rng | reference | 1× [0.99–1.3] unresolved | 1× [0.41–1] unresolved | 1× [0.96–1.1] unresolved | 1× [0.98–1] unresolved |
| migration/candidates-text | ts/node | 0.53× [0.51–0.64] | 0.53× [0.49–0.81] | 0.53× [0.31–0.64] | 0.55× [0.51–0.65] | 0.51× [0.49–0.63] |
| migration/first | rust/native/release/fast-rng | reference | 1× [0.91–1.1] unresolved | 1× [0.99–1] unresolved | 1× [0.99–1.1] unresolved | 1× [0.98–1] unresolved |
| migration/first-text | ts/node | 0.47× [0.47–0.47] | 0.47× [0.39–0.56] | 0.47× [0.46–0.54] | 0.47× [0.44–0.49] | 0.47× [0.46–0.48] |
| parse/braced | rust/native/release/fast-rng | reference | 0.99× [0.96–1.6] unresolved | 0.99× [0.99–1] unresolved | 0.98× [0.96–1] unresolved | 0.97× [0.94–0.98] |
| parse/compact | ts/node | 0.22× [0.21–0.23] | 0.22× [0.21–0.24] | 0.22× [0.21–0.22] | 0.22× [0.21–0.23] | 0.22× [0.21–0.23] |
| parse/keyed/base32 | ts/node | 0.47× [0.47–0.48] | 0.48× [0.22–0.48] | 0.48× [0.47–0.51] | 0.48× [0.47–0.51] | 0.47× [0.46–0.48] |
| parse/keyed/base64 | ts/node | 0.46× [0.45–0.47] | 0.47× [0.45–0.69] | 0.46× [0.45–0.48] | 0.46× [0.44–0.5] | 0.46× [0.45–0.47] |
| parse/plain/base32 | rust/native/release/fast-rng | reference | 1× [0.9–1.1] unresolved | 1× [0.98–1] unresolved | 1.2× [1.2–1.3] | 0.99× [0.97–1] unresolved |
| parse/plain/base64 | rust/native/release/fast-rng | reference | 1× [0.92–1] unresolved | 1× [0.98–1.1] unresolved | 1× [1–1.1] unresolved | 1× [0.98–1] unresolved |
| parse/universal | rust/native/release/fast-rng | reference | 1× [0.97–1.1] unresolved | 0.99× [0.97–1] unresolved | 1× [1–1.1] unresolved | 0.98× [0.96–1] unresolved |
| parse/urn | rust/native/release/fast-rng | reference | 1× [0.99–1.1] unresolved | 0.98× [0.97–1] unresolved | 1× [0.98–1.1] unresolved | 0.99× [0.95–1] unresolved |
| parse/uuid | ts/node | 0.047× [0.047–0.048] | 0.047× [0.038–0.063] | 0.047× [0.044–0.049] | 0.047× [0.046–0.057] | 0.046× [0.045–0.047] |
| payload/extract/bytes | ts/node | 0.031× [0.031–0.032] | 0.03× [0.022–0.034] | 0.031× [0.031–0.032] | 0.032× [0.031–0.035] | 0.031× [0.028–0.032] |
| payload/masked/base32 | ts/node | 0.37× [0.37–0.37] | 0.37× [0.32–0.38] | 0.37× [0.36–0.39] | 0.37× [0.37–0.4] | 0.37× [0.36–0.37] |
| payload/masked/base64 | ts/node | 0.37× [0.36–0.37] | 0.37× [0.36–0.39] | 0.37× [0.36–0.38] | 0.38× [0.36–0.4] | 0.37× [0.35–0.37] |
| plain/base32 | ts/node | 0.4× [0.39–0.41] | 0.4× [0.19–0.47] | 0.41× [0.38–0.43] | 0.41× [0.4–0.47] | 0.41× [0.36–0.43] |
| plain/base64 | ts/node | 0.44× [0.43–0.46] | 0.46× [0.42–0.56] | 0.45× [0.43–0.48] | 0.47× [0.44–0.47] | 0.46× [0.39–0.48] |
| rotation/previous-key | rust/native/release/fast-rng | reference | 1× [0.97–1] unresolved | 1× [0.99–1] unresolved | 1× [0.99–1.1] unresolved | 1× [0.95–1] unresolved |
| sentinel/base32/canonical | ts/node | 0.089× [0.089–0.091] | 0.092× [0.083–0.1] | 0.089× [0.085–0.094] | 0.091× [0.076–0.095] | 0.089× [0.086–0.09] |
| sentinel/base32/uppercase | ts/node | 0.061× [0.059–0.063] | 0.059× [0.035–0.083] | 0.061× [0.057–0.063] | 0.061× [0.06–0.069] | 0.061× [0.059–0.063] |
| timestamp/extract/bytes | ts/node | 0.018× [0.017–0.019] | 0.019× [0.017–0.024] | 0.018× [0.017–0.02] | 0.017× [0.016–0.019] | 0.017× [0.016–0.018] |
| timestamp/masked/base32 | ts/node | 0.59× [0.58–0.59] | 0.59× [0.56–0.8] | 0.59× [0.58–0.62] | 0.58× [0.58–0.61] | 0.59× [0.54–0.59] |
| timestamp/masked/base64 | ts/node | 0.57× [0.57–0.57] | 0.57× [0.49–0.58] | 0.57× [0.57–0.58] | 0.57× [0.57–0.6] | 0.57× [0.55–0.58] |
| timestamp/validate/uuid | rust/native/release/fast-rng | reference | 1× [0.92–2.7] unresolved | 1× [0.94–1] unresolved | 0.98× [0.96–1.1] unresolved | 0.98× [0.91–1] unresolved |
| unmask/base32 | ts/node | 0.58× [0.57–0.58] | 0.58× [0.55–0.82] | 0.58× [0.57–0.58] | 0.58× [0.57–0.61] | 0.58× [0.54–0.58] |
| unmask/base64 | ts/node | 0.58× [0.57–0.59] | 0.58× [0.41–0.71] | 0.57× [0.55–0.59] | 0.58× [0.58–0.62] | 0.57× [0.55–0.59] |
| unmask/binary/caller-buffer | ts/node | 0.52× [0.52–0.54] | 0.54× [0.24–0.59] | 0.52× [0.51–0.54] | 0.53× [0.52–0.55] | 0.52× [0.52–0.54] |
| unmask/binary/owned | ts/node | 0.55× [0.55–0.56] | 0.56× [0.53–0.64] | 0.55× [0.54–0.56] | 0.55× [0.55–0.59] | 0.55× [0.55–0.57] |
| unmask/binary/text | ts/node | 0.55× [0.54–0.55] | 0.55× [0.41–0.61] | 0.55× [0.53–0.56] | 0.54× [0.52–0.56] | 0.54× [0.53–0.56] |

## Rust wasm32-wasip1

| Caller job | Reference | rust/wasm32-wasip1/release/fast-rng | rust/wasm32-wasip1/release/os-rng | rust/wasm32-wasip1/release/os-rng-no-std | rust/wasm32-wasip1/release/std | rust/wasm32-wasip1/release/reduced |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| async/future/cancelled | rust/native/release/fast-rng | 1.3× [1.3–1.4] | 1.3× [1.3–1.3] | 1.3× [1.2–1.3] | 1.3× [1.3–1.3] | 1.3× [0.93–1.3] unresolved |
| async/future/derive/1 | rust/native/release/fast-rng | 0.93× [0.9–1.4] unresolved | 0.92× [0.91–0.93] | 0.91× [0.89–0.93] | 0.92× [0.89–0.94] | 0.92× [0.91–1.2] unresolved |
| async/future/derive/64 | rust/native/release/fast-rng | 0.77× [0.76–0.96] | 0.77× [0.76–0.77] | 0.77× [0.7–0.77] | 0.76× [0.76–0.78] | 0.77× [0.76–0.79] |
| bounds/one-millisecond | ts/node | 0.091× [0.088–0.11] | 0.092× [0.091–0.093] | 0.09× [0.09–0.094] | 0.091× [0.089–0.092] | 0.092× [0.089–0.094] |
| bounds/range | ts/node | 0.088× [0.085–0.11] | 0.088× [0.086–0.092] | 0.089× [0.085–0.092] | 0.089× [0.085–0.093] | 0.088× [0.072–0.091] |
| bytes/read | ts/node | 0.054× [0.036–0.058] | 0.054× [0.053–0.055] | 0.054× [0.053–0.056] | 0.054× [0.053–0.055] | 0.054× [0.053–0.056] |
| bytes/write/offset | rust/native/release/fast-rng | 3.1× [2.4–4.7] | 3.1× [3.1–3.1] | 3.1× [3.1–3.2] | 3.1× [2.8–3.2] | 3.1× [3.1–3.2] |
| construct/codec-precomputed-mask | ts/node | 0.096× [0.07–0.11] | 0.093× [0.084–0.099] | 0.092× [0.087–0.1] | 0.097× [0.092–0.1] | 0.097× [0.093–0.1] |
| construct/custom-mask | rust/native/release/fast-rng | 1.5× [1.5–1.7] | 1.6× [1.6–1.7] | 1.5× [1.4–1.6] | 1.5× [1.4–1.6] | 1.5× [1.5–2.2] |
| construct/generator | ts/node | 0.0089× [0.0062–0.009] | 0.0087× [0.0086–0.009] | 0.0087× [0.0079–0.0088] | 0.0088× [0.0086–0.0089] | 0.0087× [0.0064–0.0089] |
| construct/mask | rust/native/release/fast-rng | 1× [0.79–1.1] unresolved | 1× [1–1] unresolved | 1× [1–1] | 1× [1–1] | 1× [0.47–1] unresolved |
| construct/mask-iterated | rust/native/release/fast-rng | 1× [0.98–1.5] unresolved | 1× [1–1] unresolved | 1× [0.99–1] unresolved | 1× [1–1] | 1× [0.49–1] unresolved |
| construct/migration | rust/native/release/fast-rng | 4.6× [4.5–6.2] | 4.7× [4.6–4.8] | 4.6× [4.5–4.8] | 4.8× [4.5–4.8] | 4.8× [4.7–10] |
| construct/payload-layout | rust/native/release/fast-rng | 0.99× [0.3–2.1] unresolved | 1× [0.97–1.1] unresolved | 1× [0.96–1.1] unresolved | 1.1× [1.1–1.1] | 1.1× [1.1–1.2] |
| construct/public-test-mask-and-codec | rust/native/release/fast-rng | 0.72× [0.69–0.77] | 0.7× [0.64–0.74] | 5.4× [5.2–5.5] | 0.73× [0.71–0.75] | 5.4× [5–5.4] |
| construct/sentinels/1 | rust/native/release/fast-rng | 1× [0.95–2] unresolved | 1× [0.96–1.1] unresolved | 1.1× [1–1.1] | 1× [1–1.1] | 1× [1–1.7] unresolved |
| construct/sentinels/16 | rust/native/release/fast-rng | 1.1× [0.9–1.3] unresolved | 1× [1–1] | 1× [1–1.1] | 1× [1–1.1] | 1.1× [1–1.1] |
| construct/sentinels/4 | rust/native/release/fast-rng | 1.1× [0.73–1.8] unresolved | 1.1× [1.1–1.1] | 1.1× [1.1–1.2] | 1.1× [1–1.1] | 1.1× [1.1–1.1] |
| construct/sentinels/64 | rust/native/release/fast-rng | 1× [0.99–1.3] unresolved | 1× [1–1] | 1× [0.99–1] unresolved | 1× [1–1] unresolved | 1× [1–2] |
| decode/base32/caller-buffer | ts/node | 0.17× [0.16–0.18] | 0.17× [0.16–0.18] | 0.17× [0.16–0.18] | 0.17× [0.16–0.18] | 0.17× [0.16–0.2] |
| decode/base32/owned | ts/node | 0.26× [0.22–0.27] | 0.26× [0.22–0.27] | 0.25× [0.25–0.26] | 0.26× [0.23–0.26] | 0.26× [0.24–0.27] |
| decode/caller-buffer | ts/node | 0.17× [0.13–0.18] | 0.17× [0.17–0.17] | 0.17× [0.16–0.17] | 0.17× [0.16–0.18] | 0.17× [0.17–0.19] |
| decode/owned | ts/node | 0.2× [0.2–0.24] | 0.2× [0.2–0.21] | 0.2× [0.19–0.22] | 0.2× [0.046–0.21] | 0.2× [0.2–0.45] |
| failure/buffer-capacity | rust/native/release/fast-rng | 1.3× [1.2–2.3] | 1.3× [1.3–1.4] | 1.3× [1.1–1.4] | 1.3× [1.2–1.3] | 1.3× [1.3–1.4] |
| failure/plain/base32 | rust/native/release/fast-rng | 1.5× [1.4–2] | 1.5× [1.5–1.6] | 1.5× [1.4–1.6] | 1.4× [1.4–1.5] | 1.4× [1–1.6] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.5× [1.3–1.6] | 1.5× [1.2–1.5] | 1.5× [1.4–1.6] | 1.5× [1.4–1.5] | 1.4× [0.68–1.5] unresolved |
| failure/uuid-parse | ts/node | 0.0038× [0.0037–0.0051] | 0.0038× [0.0038–0.004] | 0.0037× [0.0036–0.0039] | 0.0038× [0.0038–0.0039] | 0.0038× [0.0037–0.011] |
| format/uuid/lowercase | ts/node | 0.52× [0.49–0.54] | 0.52× [0.49–0.54] | 0.5× [0.5–0.54] | 0.53× [0.49–0.54] | 0.53× [0.51–0.55] |
| format/uuid/uppercase | ts/node | 0.47× [0.44–0.48] | 0.47× [0.45–0.47] | 0.46× [0.41–0.48] | 0.45× [0.43–0.46] | 0.45× [0.43–0.78] |
| generation/v4/base32hex | ts/node | 0.67× [0.66–0.7] | 18× [18–21] | 18× [17–19] | unavailable | unavailable |
| generation/v4/base64url | ts/node | 0.74× [0.72–0.75] | 21× [20–24] | 20× [17–20] | unavailable | unavailable |
| generation/v4/bytes | ts/node | 0.47× [0.47–0.48] | 20× [20–21] | 20× [20–21] | unavailable | unavailable |
| generation/v4/caller-buffer-custom-entropy | rust/native/release/fast-rng | 1× [1–1.5] | 1× [1–1] | 1× [1–1] unresolved | unavailable | unavailable |
| generation/v4/text | ts/node | 0.72× [0.66–0.77] | 17× [16–18] | 17× [14–17] | unavailable | unavailable |
| generation/v7/base32hex | ts/node | 0.34× [0.33–0.36] | 3.9× [3.8–4.1] | unavailable | unavailable | unavailable |
| generation/v7/base64url | ts/node | 0.39× [0.37–0.4] | 4.4× [4.2–5.1] | unavailable | unavailable | unavailable |
| generation/v7/bytes | ts/node | 0.78× [0.73–0.79] | 11× [10–13] | unavailable | unavailable | unavailable |
| generation/v7/caller-buffer-custom-entropy | rust/native/release/fast-rng | 1× [1–1.1] | 1× [1–1] | 1× [1–1] | unavailable | unavailable |
| generation/v7/custom-entropy | rust/native/release/fast-rng | 1× [0.95–1.3] unresolved | 1× [0.96–1] unresolved | 1× [1–1] | unavailable | unavailable |
| generation/v7/explicit-time | rust/native/release/fast-rng | 1.9× [1.9–2.5] | 69× [68–70] | unavailable | unavailable | unavailable |
| generation/v7/fraction12-custom-entropy | rust/native/release/fast-rng | 1× [1–1] | 1× [1–1] | 1× [0.99–1] unresolved | unavailable | unavailable |
| generation/v7/text | ts/node | 0.93× [0.87–1.2] unresolved | 9.5× [9.3–11] | unavailable | unavailable | unavailable |
| inspect/v4 | rust/native/release/fast-rng | 3.6× [3.6–4.2] | 3.6× [3.6–3.7] | 3.6× [3.6–3.7] | 3.7× [3.6–3.8] | 3.6× [3.6–5.4] |
| inspect/v7 | rust/native/release/fast-rng | 3.6× [3.3–4.1] | 3.6× [3.5–3.7] | 3.6× [3.5–3.7] | 3.7× [3.6–3.8] | 3.6× [3.6–5.3] |
| inspect/variant | rust/native/release/fast-rng | 4× [3.7–5.7] | 3.9× [3.7–4.1] | 4.1× [3.7–4.1] | 4.2× [4.1–4.2] | 4.2× [4.2–4.3] |
| inspect/version | rust/native/release/fast-rng | 3.6× [3.5–3.9] | 3.5× [3.5–3.6] | 3.5× [3.5–3.8] | 3.6× [3.5–3.6] | 3.5× [3.5–6.2] |
| mask/base32 | ts/node | 0.92× [0.68–0.97] | 0.93× [0.92–0.95] | 0.92× [0.62–0.94] | 0.93× [0.9–0.94] | 0.92× [0.59–0.94] |
| mask/base32/sentinels | ts/node | 0.85× [0.61–0.89] | 0.85× [0.83–0.87] | 0.86× [0.86–0.87] | 0.84× [0.83–0.86] | 0.85× [0.78–0.86] |
| mask/base64 | ts/node | 0.97× [0.94–0.99] | 0.98× [0.96–0.99] | 0.96× [0.95–0.97] | 0.97× [0.96–0.99] | 0.97× [0.57–0.98] |
| mask/binary/caller-buffer | ts/node | 0.67× [0.66–1.1] unresolved | 0.68× [0.66–0.77] | 0.68× [0.66–0.77] | 0.67× [0.66–0.79] | 0.68× [0.67–0.88] |
| mask/binary/owned | ts/node | 0.73× [0.72–0.92] | 0.73× [0.72–0.74] | 0.72× [0.71–0.74] | 0.72× [0.71–0.73] | 0.72× [0.71–0.73] |
| migration/candidates | rust/native/release/fast-rng | 1.1× [0.99–1.1] unresolved | 1.1× [1.1–1.1] | 1.1× [1.1–1.1] | 1.1× [1.1–1.1] | 1.1× [1.1–1.8] |
| migration/candidates-text | ts/node | 0.58× [0.54–1.1] unresolved | 0.56× [0.53–0.67] | 0.56× [0.54–0.75] | 0.57× [0.53–0.68] | 0.56× [0.53–0.68] |
| migration/first | rust/native/release/fast-rng | 1.2× [1.2–1.6] | 1.2× [1.2–1.2] | 1.2× [1.2–1.3] | 1.2× [1.2–1.2] | 1.2× [1.1–1.2] |
| migration/first-text | ts/node | 0.54× [0.52–0.6] | 0.54× [0.54–0.55] | 0.54× [0.53–0.55] | 0.54× [0.53–0.55] | 0.54× [0.54–0.89] |
| parse/braced | rust/native/release/fast-rng | 2.5× [2.5–3.2] | 2.5× [2.5–2.6] | 2.5× [2.4–2.5] | 2.5× [2.5–2.6] | 2.5× [2.5–2.5] |
| parse/compact | ts/node | 0.59× [0.51–0.79] | 0.59× [0.55–0.61] | 0.59× [0.56–0.59] | 0.59× [0.56–0.61] | 0.58× [0.52–0.59] |
| parse/keyed/base32 | ts/node | 0.49× [0.41–0.51] | 0.48× [0.48–0.5] | 0.48× [0.48–0.49] | 0.48× [0.48–0.53] | 0.48× [0.46–0.48] |
| parse/keyed/base64 | ts/node | 0.5× [0.44–0.91] | 0.5× [0.49–0.5] | 0.49× [0.49–0.53] | 0.5× [0.49–0.51] | 0.49× [0.48–0.58] |
| parse/plain/base32 | rust/native/release/fast-rng | 1× [0.99–1.1] unresolved | 1× [0.99–1] unresolved | 1× [0.98–1] unresolved | 1× [0.98–1] unresolved | 1× [0.87–1] unresolved |
| parse/plain/base64 | rust/native/release/fast-rng | 1× [0.71–1.7] unresolved | 1× [0.99–1] unresolved | 0.98× [0.97–1] | 0.99× [0.97–1] unresolved | 1× [0.97–1] unresolved |
| parse/universal | rust/native/release/fast-rng | 2.6× [2.1–4] | 2.6× [2.5–2.6] | 2.6× [2.5–2.6] | 2.7× [2.6–2.7] | 2.6× [1–2.6] |
| parse/urn | rust/native/release/fast-rng | 2.3× [1.9–2.6] | 2.3× [2.1–2.3] | 2.3× [2–2.3] | 2.3× [2.3–2.4] | 2.3× [2.3–2.4] |
| parse/uuid | ts/node | 0.4× [0.4–0.5] | 0.4× [0.4–0.41] | 0.4× [0.39–0.43] | 0.4× [0.28–0.42] | 0.4× [0.37–0.42] |
| payload/extract/bytes | ts/node | 0.084× [0.082–0.13] | 0.084× [0.081–0.085] | 0.087× [0.082–0.091] | 0.095× [0.092–0.099] | 0.096× [0.09–0.17] |
| payload/masked/base32 | ts/node | 0.44× [0.43–0.65] | 0.44× [0.43–0.46] | 0.43× [0.43–0.45] | 0.44× [0.43–0.44] | 0.43× [0.41–0.44] |
| payload/masked/base64 | ts/node | 0.44× [0.44–0.76] | 0.43× [0.43–0.44] | 0.43× [0.42–0.44] | 0.44× [0.43–0.45] | 0.44× [0.43–0.64] |
| plain/base32 | ts/node | 0.42× [0.41–0.43] | 0.41× [0.4–0.43] | 0.4× [0.37–0.41] | 0.41× [0.38–0.44] | 0.4× [0.37–0.43] |
| plain/base64 | ts/node | 2× [2–2] | 2× [1.9–2.1] | 1.9× [1.7–2] | 1.9× [1.9–2] | 1.9× [1.9–3.8] |
| rotation/previous-key | rust/native/release/fast-rng | 1.2× [0.89–1.2] unresolved | 1.2× [1.2–1.2] | 1.1× [1.1–1.2] | 1.2× [1.1–1.2] | 1.2× [1.1–1.2] |
| sentinel/base32/canonical | ts/node | 0.12× [0.12–0.13] | 0.12× [0.11–0.12] | 0.12× [0.12–0.12] | 0.12× [0.12–0.12] | 0.12× [0.057–0.12] |
| sentinel/base32/uppercase | ts/node | 0.28× [0.27–0.29] | 0.27× [0.26–0.29] | 0.28× [0.23–0.28] | 0.28× [0.26–0.29] | 0.27× [0.27–0.37] |
| timestamp/extract/bytes | ts/node | 0.072× [0.063–0.11] | 0.068× [0.062–0.072] | 0.068× [0.06–0.071] | 0.067× [0.06–0.072] | 0.068× [0.062–0.074] |
| timestamp/masked/base32 | ts/node | 0.64× [0.62–0.68] | 0.64× [0.63–0.65] | 0.63× [0.62–0.64] | 0.64× [0.62–0.64] | 0.63× [0.2–0.63] |
| timestamp/masked/base64 | ts/node | 0.66× [0.64–0.74] | 0.66× [0.63–0.67] | 0.65× [0.63–0.67] | 0.66× [0.65–0.66] | 0.66× [0.65–1.1] unresolved |
| timestamp/validate/uuid | rust/native/release/fast-rng | 2.2× [1.8–2.4] | 2.2× [2.1–2.3] | 2.2× [2–2.2] | 2.2× [2.1–2.2] | 2.2× [2.2–2.6] |
| unmask/base32 | ts/node | 0.66× [0.66–0.76] | 0.66× [0.66–0.68] | 0.66× [0.6–0.67] | 0.66× [0.65–0.67] | 0.66× [0.65–0.81] |
| unmask/base64 | ts/node | 0.67× [0.46–0.69] | 0.68× [0.66–0.69] | 0.67× [0.64–0.68] | 0.68× [0.66–0.7] | 0.68× [0.67–0.69] |
| unmask/binary/caller-buffer | ts/node | 0.59× [0.55–0.63] | 0.59× [0.59–0.61] | 0.59× [0.58–0.61] | 0.6× [0.58–0.61] | 0.6× [0.45–0.61] |
| unmask/binary/owned | ts/node | 0.63× [0.62–0.75] | 0.63× [0.62–0.64] | 0.63× [0.62–0.65] | 0.63× [0.61–0.65] | 0.63× [0.6–0.64] |
| unmask/binary/text | ts/node | 0.69× [0.68–0.74] | 0.68× [0.64–0.7] | 0.67× [0.66–0.69] | 0.68× [0.66–1] unresolved | 0.68× [0.66–0.69] |

## Rust wasm32-wasip2

| Caller job | Reference | rust/wasm32-wasip2/release/fast-rng | rust/wasm32-wasip2/release/os-rng | rust/wasm32-wasip2/release/os-rng-no-std | rust/wasm32-wasip2/release/std | rust/wasm32-wasip2/release/reduced |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| async/future/cancelled | rust/native/release/fast-rng | 1.3× [1.2–1.3] | 1.3× [1.2–1.3] | 1.3× [1.3–1.3] | 1.3× [1.3–1.4] | 1.3× [1.2–1.3] |
| async/future/derive/1 | rust/native/release/fast-rng | 0.92× [0.91–0.95] | 0.94× [0.91–0.94] | 0.91× [0.9–0.92] | 0.93× [0.91–0.97] | 0.92× [0.87–0.98] |
| async/future/derive/64 | rust/native/release/fast-rng | 0.76× [0.74–0.78] | 0.77× [0.76–0.78] | 0.77× [0.77–0.77] | 0.77× [0.77–0.97] | 0.78× [0.76–0.85] |
| bounds/one-millisecond | ts/node | 0.09× [0.087–0.092] | 0.092× [0.089–0.093] | 0.09× [0.087–0.097] | 0.091× [0.084–0.097] | 0.09× [0.085–0.092] |
| bounds/range | ts/node | 0.09× [0.086–0.13] | 0.088× [0.084–0.092] | 0.089× [0.084–0.094] | 0.088× [0.084–0.092] | 0.089× [0.08–0.092] |
| bytes/read | ts/node | 0.054× [0.052–0.061] | 0.054× [0.051–0.056] | 0.054× [0.052–0.056] | 0.053× [0.052–0.056] | 0.053× [0.048–0.055] |
| bytes/write/offset | rust/native/release/fast-rng | 3.1× [3–3.3] | 3.1× [3.1–3.2] | 3.1× [3–3.2] | 3.1× [1.3–3.2] | 3.1× [2.8–3.2] |
| construct/codec-precomputed-mask | ts/node | 0.099× [0.096–0.11] | 0.096× [0.09–0.098] | 0.095× [0.093–0.1] | 0.096× [0.091–0.1] | 0.1× [0.085–0.11] |
| construct/custom-mask | rust/native/release/fast-rng | 1.5× [1.5–1.7] | 1.5× [1.3–1.5] | 1.5× [1.5–1.6] | 1.6× [1.5–1.7] | 1.5× [1.4–2] |
| construct/generator | ts/node | 0.0086× [0.0083–0.0092] | 0.0087× [0.0084–0.0089] | 0.0087× [0.0084–0.0092] | 0.0089× [0.0083–0.0092] | 0.0086× [0.0077–0.0093] |
| construct/mask | rust/native/release/fast-rng | 1× [0.99–1.1] unresolved | 1× [1–1] | 1× [0.99–1.1] unresolved | 1× [1–1.1] | 1× [0.94–1.1] unresolved |
| construct/mask-iterated | rust/native/release/fast-rng | 1× [0.99–1.1] unresolved | 1× [1–1] unresolved | 1× [1–1] | 1× [1–1] | 1× [0.93–1.1] unresolved |
| construct/migration | rust/native/release/fast-rng | 4.7× [4.6–5.2] | 4.7× [4.7–4.8] | 4.8× [4.5–4.8] | 4.8× [4.7–5.3] | 4.8× [4.2–6] |
| construct/payload-layout | rust/native/release/fast-rng | 1× [0.97–1.1] unresolved | 1.1× [1–1.1] | 1.1× [1–1.1] | 1.1× [1.1–1.1] | 1.1× [1–1.6] |
| construct/public-test-mask-and-codec | rust/native/release/fast-rng | 0.7× [0.63–0.75] | 0.73× [0.7–0.8] | 5.4× [5.1–5.6] | 0.73× [0.59–0.76] | 5.3× [4.8–5.6] |
| construct/sentinels/1 | rust/native/release/fast-rng | 1.1× [1–1.2] | 1× [1–1.1] | 1.1× [1–1.1] | 1.1× [1–1.4] | 1.1× [0.97–1.2] unresolved |
| construct/sentinels/16 | rust/native/release/fast-rng | 1.1× [1–1.3] unresolved | 1× [1–1.1] unresolved | 1.1× [1–1.1] | 1.1× [1–1.1] | 1.1× [1–1.1] |
| construct/sentinels/4 | rust/native/release/fast-rng | 1.1× [1.1–1.3] | 1.1× [1.1–1.1] | 1.1× [1.1–1.1] | 1.1× [1.1–1.2] | 1.1× [1–1.6] |
| construct/sentinels/64 | rust/native/release/fast-rng | 1× [0.98–1.2] unresolved | 0.99× [0.98–1] unresolved | 1× [1–1.1] | 1× [1–1.2] | 1× [0.97–1.1] unresolved |
| decode/base32/caller-buffer | ts/node | 0.17× [0.16–0.18] | 0.17× [0.16–0.18] | 0.17× [0.16–0.18] | 0.17× [0.16–0.19] | 0.17× [0.1–0.19] |
| decode/base32/owned | ts/node | 0.26× [0.24–0.26] | 0.26× [0.25–0.26] | 0.26× [0.23–0.27] | 0.25× [0.24–0.27] | 0.25× [0.21–0.27] |
| decode/caller-buffer | ts/node | 0.17× [0.16–0.17] | 0.17× [0.16–0.17] | 0.17× [0.17–0.17] | 0.17× [0.16–0.18] | 0.17× [0.15–0.18] |
| decode/owned | ts/node | 0.2× [0.17–0.21] | 0.2× [0.19–0.21] | 0.2× [0.19–0.21] | 0.2× [0.19–0.27] | 0.2× [0.18–0.23] |
| failure/buffer-capacity | rust/native/release/fast-rng | 1.3× [1.3–1.4] | 1.3× [1.3–1.4] | 1.3× [1.3–1.4] | 1.3× [1.3–1.8] | 1.3× [1.2–1.4] |
| failure/plain/base32 | rust/native/release/fast-rng | 1.5× [1.4–1.7] | 1.5× [1.5–2.2] | 1.6× [1.5–1.6] | 1.6× [1.5–1.6] | 1.4× [1.4–1.6] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.5× [1.2–1.6] | 1.5× [1.5–1.6] | 1.5× [1.5–1.6] | 1.6× [1.5–1.7] | 1.5× [1.3–2.8] |
| failure/uuid-parse | ts/node | 0.0038× [0.0037–0.0041] | 0.0036× [0.0036–0.0037] | 0.0037× [0.0035–0.0038] | 0.0036× [0.0036–0.0044] | 0.0036× [0.0033–0.0038] |
| format/uuid/lowercase | ts/node | 0.51× [0.48–0.54] | 0.51× [0.48–0.53] | 0.52× [0.5–0.54] | 0.52× [0.49–0.56] | 0.53× [0.5–0.7] |
| format/uuid/uppercase | ts/node | 0.47× [0.44–0.48] | 0.46× [0.44–0.47] | 0.45× [0.42–0.47] | 0.45× [0.43–0.48] | 0.46× [0.43–0.52] |
| generation/v4/base32hex | ts/node | 0.73× [0.71–0.81] | 130× [130–140] | 130× [130–140] | unavailable | unavailable |
| generation/v4/base64url | ts/node | 0.81× [0.75–0.83] | 150× [140–150] | 150× [140–160] | unavailable | unavailable |
| generation/v4/bytes | ts/node | 0.54× [0.53–0.7] | 160× [160–170] | 160× [150–180] | unavailable | unavailable |
| generation/v4/caller-buffer-custom-entropy | rust/native/release/fast-rng | 7.3× [7.2–7.5] | 7.4× [7.2–26] | 7.4× [7.3–7.7] | unavailable | unavailable |
| generation/v4/text | ts/node | 0.79× [0.72–0.86] | 120× [71–130] | 120× [110–130] | unavailable | unavailable |
| generation/v7/base32hex | ts/node | 15× [15–16] | 47× [44–51] | unavailable | unavailable | unavailable |
| generation/v7/base64url | ts/node | 17× [16–17] | 53× [51–56] | unavailable | unavailable | unavailable |
| generation/v7/bytes | ts/node | 45× [43–53] | 130× [120–140] | unavailable | unavailable | unavailable |
| generation/v7/caller-buffer-custom-entropy | rust/native/release/fast-rng | 8.5× [8.5–9.7] | 8.6× [8.4–8.9] | 8.8× [8.6–13] | unavailable | unavailable |
| generation/v7/custom-entropy | rust/native/release/fast-rng | 8.5× [8.4–9.9] | 8.7× [8.4–8.9] | 8.7× [8.6–8.9] | unavailable | unavailable |
| generation/v7/explicit-time | rust/native/release/fast-rng | 1.9× [1.9–1.9] | 580× [560–590] | unavailable | unavailable | unavailable |
| generation/v7/fraction12-custom-entropy | rust/native/release/fast-rng | 8.6× [8.5–38] | 8.6× [8.4–9.7] | 8.9× [8.6–9.1] | unavailable | unavailable |
| generation/v7/text | ts/node | 36× [33–37] | 120× [110–120] | unavailable | unavailable | unavailable |
| inspect/v4 | rust/native/release/fast-rng | 3.6× [3.6–3.7] | 3.6× [3.6–3.7] | 3.6× [3.5–3.7] | 3.6× [3.3–3.7] | 3.5× [3.4–3.6] |
| inspect/v7 | rust/native/release/fast-rng | 3.6× [3.6–3.7] | 3.6× [3.6–3.8] | 3.6× [3.5–3.7] | 3.6× [3.4–3.8] | 3.6× [3.2–3.8] |
| inspect/variant | rust/native/release/fast-rng | 4× [3.8–4.1] | 4.2× [4.2–4.5] | 4× [3.8–4.1] | 4.2× [4.2–4.9] | 4.1× [3.8–4.2] |
| inspect/version | rust/native/release/fast-rng | 3.6× [3.5–3.9] | 3.5× [3.5–3.8] | 3.5× [3.4–3.6] | 3.5× [3.4–3.7] | 3.5× [3.3–3.9] |
| mask/base32 | ts/node | 0.94× [0.91–0.98] | 0.93× [0.92–0.99] | 0.92× [0.92–0.94] | 0.93× [0.9–0.96] | 0.93× [0.87–2.5] unresolved |
| mask/base32/sentinels | ts/node | 0.86× [0.84–1.1] unresolved | 0.86× [0.83–0.9] | 0.85× [0.84–0.86] | 0.85× [0.74–0.88] | 0.85× [0.82–2.2] unresolved |
| mask/base64 | ts/node | 0.98× [0.96–1.1] unresolved | 0.97× [0.95–1] unresolved | 0.97× [0.94–0.98] | 0.97× [0.94–1] unresolved | 0.97× [0.93–1] unresolved |
| mask/binary/caller-buffer | ts/node | 0.68× [0.66–0.77] | 0.67× [0.66–0.77] | 0.67× [0.64–0.76] | 0.67× [0.53–0.79] | 0.67× [0.46–0.9] |
| mask/binary/owned | ts/node | 0.72× [0.72–0.77] | 0.73× [0.72–0.75] | 0.72× [0.71–0.73] | 0.72× [0.7–0.79] | 0.71× [0.49–0.73] |
| migration/candidates | rust/native/release/fast-rng | 1.1× [1.1–1.1] | 1.1× [1.1–1.1] | 1.1× [1–1.1] | 1.1× [1–1.2] | 1.1× [1–1.2] |
| migration/candidates-text | ts/node | 0.57× [0.53–0.72] | 0.55× [0.49–0.59] | 0.56× [0.53–0.69] | 0.57× [0.46–0.68] | 0.57× [0.5–0.71] |
| migration/first | rust/native/release/fast-rng | 1.2× [1.2–1.2] | 1.2× [1.2–1.2] | 1.2× [1.2–1.2] | 1.2× [1–1.4] unresolved | 1.2× [1.2–1.2] |
| migration/first-text | ts/node | 0.54× [0.54–0.56] | 0.54× [0.53–0.57] | 0.54× [0.5–0.54] | 0.55× [0.54–0.59] | 0.54× [0.5–0.55] |
| parse/braced | rust/native/release/fast-rng | 2.5× [2.5–2.6] | 2.5× [2.5–2.6] | 2.5× [2.5–2.6] | 2.5× [2.4–3.9] | 2.6× [2.2–2.8] |
| parse/compact | ts/node | 0.59× [0.51–0.6] | 0.58× [0.56–0.61] | 0.59× [0.56–0.6] | 0.59× [0.33–0.62] | 0.57× [0.39–0.6] |
| parse/keyed/base32 | ts/node | 0.48× [0.44–0.59] | 0.48× [0.48–0.49] | 0.48× [0.48–0.49] | 0.48× [0.43–0.51] | 0.49× [0.47–0.5] |
| parse/keyed/base64 | ts/node | 0.5× [0.46–0.62] | 0.5× [0.43–0.5] | 0.5× [0.49–0.52] | 0.5× [0.49–0.55] | 0.51× [0.46–0.53] |
| parse/plain/base32 | rust/native/release/fast-rng | 0.98× [0.94–1] unresolved | 1× [1–1] | 1× [1–1.1] | 1× [0.98–1.1] unresolved | 1× [0.93–1.1] unresolved |
| parse/plain/base64 | rust/native/release/fast-rng | 0.95× [0.94–1.1] unresolved | 0.98× [0.97–0.98] | 0.99× [0.97–1.1] unresolved | 0.97× [0.94–1] unresolved | 0.97× [0.66–1] unresolved |
| parse/universal | rust/native/release/fast-rng | 2.6× [2.5–2.8] | 2.6× [2.5–2.7] | 2.6× [2.6–2.7] | 2.6× [2.5–2.8] | 2.6× [2.4–2.7] |
| parse/urn | rust/native/release/fast-rng | 2.3× [2.3–2.3] | 2.3× [2.3–2.5] | 2.3× [2.3–2.4] | 2.4× [1.9–2.4] | 2.4× [2.2–2.6] |
| parse/uuid | ts/node | 0.41× [0.4–0.42] | 0.41× [0.4–0.42] | 0.41× [0.39–0.41] | 0.4× [0.36–0.61] | 0.41× [0.38–0.43] |
| payload/extract/bytes | ts/node | 0.093× [0.089–0.096] | 0.088× [0.086–0.094] | 0.082× [0.073–0.089] | 0.094× [0.089–0.099] | 0.092× [0.058–0.097] |
| payload/masked/base32 | ts/node | 0.43× [0.41–0.53] | 0.44× [0.43–0.44] | 0.44× [0.44–0.44] | 0.45× [0.38–0.47] | 0.44× [0.42–0.5] |
| payload/masked/base64 | ts/node | 0.43× [0.41–0.5] | 0.44× [0.43–0.44] | 0.44× [0.43–0.45] | 0.45× [0.44–0.47] | 0.44× [0.41–0.45] |
| plain/base32 | ts/node | 0.41× [0.4–0.43] | 0.39× [0.37–0.44] | 0.4× [0.38–0.41] | 0.4× [0.39–0.41] | 0.42× [0.38–0.55] |
| plain/base64 | ts/node | 1.9× [1.8–2.1] | 2× [1.9–2] | 1.9× [1.7–2] | 2× [1.9–2.1] | 2× [1.8–2.1] |
| rotation/previous-key | rust/native/release/fast-rng | 1.2× [1.1–1.4] | 1.2× [1.1–1.2] | 1.2× [1.2–1.2] | 1.2× [1.1–1.2] | 1.2× [1.1–1.5] |
| sentinel/base32/canonical | ts/node | 0.12× [0.12–0.13] | 0.12× [0.12–0.12] | 0.12× [0.12–0.13] | 0.12× [0.11–0.13] | 0.12× [0.11–0.14] |
| sentinel/base32/uppercase | ts/node | 0.28× [0.27–0.29] | 0.28× [0.27–0.28] | 0.28× [0.27–0.32] | 0.28× [0.27–0.29] | 0.28× [0.26–0.3] |
| timestamp/extract/bytes | ts/node | 0.069× [0.064–0.073] | 0.07× [0.063–0.075] | 0.066× [0.062–0.073] | 0.066× [0.064–0.076] | 0.067× [0.06–0.075] |
| timestamp/masked/base32 | ts/node | 0.64× [0.62–0.74] | 0.63× [0.63–0.65] | 0.63× [0.62–0.64] | 0.63× [0.59–0.64] | 0.63× [0.58–0.65] |
| timestamp/masked/base64 | ts/node | 0.67× [0.65–0.78] | 0.66× [0.65–0.68] | 0.66× [0.66–0.68] | 0.66× [0.64–0.71] | 0.67× [0.62–0.74] |
| timestamp/validate/uuid | rust/native/release/fast-rng | 2.2× [1.8–2.2] | 2.2× [2.1–2.3] | 2.2× [2.1–2.2] | 2.2× [1.8–2.5] | 2× [1.5–2.2] |
| unmask/base32 | ts/node | 0.66× [0.66–0.67] | 0.67× [0.66–0.72] | 0.66× [0.65–0.7] | 0.67× [0.63–0.69] | 0.66× [0.64–0.68] |
| unmask/base64 | ts/node | 0.69× [0.67–0.73] | 0.69× [0.67–0.72] | 0.68× [0.67–0.69] | 0.68× [0.67–0.78] | 0.68× [0.64–0.69] |
| unmask/binary/caller-buffer | ts/node | 0.6× [0.59–0.61] | 0.6× [0.59–0.61] | 0.59× [0.53–0.6] | 0.6× [0.59–0.66] | 0.59× [0.56–0.75] |
| unmask/binary/owned | ts/node | 0.63× [0.62–0.66] | 0.63× [0.61–0.66] | 0.63× [0.6–0.64] | 0.63× [0.61–0.64] | 0.62× [0.42–0.66] |
| unmask/binary/text | ts/node | 0.68× [0.68–0.69] | 0.68× [0.66–0.71] | 0.67× [0.63–0.69] | 0.69× [0.64–0.69] | 0.67× [0.62–0.69] |

## Per-call transports

### transport/plain/base64

| Lane | Reference | Relative cost |
| --- | --- | ---: |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/node | transport/typescript/node | 2.1× [2.1–2.2] |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/node-22 | transport/typescript/node | 2.6× [2.5–2.7] |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/node-24 | transport/typescript/node | 2.4× [2.3–2.4] |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/bun | transport/typescript/node | 2.3× [2.3–2.4] |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/deno | transport/typescript/node | 3.7× [3.7–4.2] |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/chromium | transport/typescript/node | 2.4× [2–2.5] |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/firefox | transport/typescript/node | 4.2× [4.1–4.3] |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/webkit | transport/typescript/node | 3.2× [2.8–3.3] |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/workerd-web | transport/typescript/node | 2.5× [2.4–2.5] |
| transport/rust/wasm32-unknown-unknown/release/fast-rng/workerd-node-compatible | transport/typescript/node | 2.4× [0.72–2.4] unresolved |
| transport/rust/wasm32-unknown-unknown/release/os-rng/node | transport/typescript/node | 2.1× [2–2.2] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/node-22 | transport/typescript/node | 2.5× [2.4–2.7] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/node-24 | transport/typescript/node | 2.4× [2.3–2.5] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/bun | transport/typescript/node | 2.3× [2.3–2.4] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/deno | transport/typescript/node | 3.7× [2.8–3.8] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/chromium | transport/typescript/node | 2.3× [2.2–2.4] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/firefox | transport/typescript/node | 4.2× [3–4.3] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/webkit | transport/typescript/node | 3.2× [3–3.3] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/workerd-web | transport/typescript/node | 2.4× [1.7–3.2] |
| transport/rust/wasm32-unknown-unknown/release/os-rng/workerd-node-compatible | transport/typescript/node | 2.4× [2.4–2.5] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/node | transport/typescript/node | 2.2× [2.1–2.2] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/node-22 | transport/typescript/node | 2.5× [2.4–2.6] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/node-24 | transport/typescript/node | 2.4× [2.3–2.5] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/bun | transport/typescript/node | 2.3× [1.7–2.4] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/deno | transport/typescript/node | 3.8× [3.6–3.9] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/chromium | transport/typescript/node | 2.4× [2.2–2.5] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/firefox | transport/typescript/node | 4.2× [4.2–4.5] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/webkit | transport/typescript/node | 3.2× [2.2–3.2] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-web | transport/typescript/node | 2.5× [2.4–2.5] |
| transport/rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-node-compatible | transport/typescript/node | 2.5× [2.4–2.6] |
| transport/rust/wasm32-unknown-unknown/release/std/node | transport/typescript/node | 2.2× [2.1–2.2] |
| transport/rust/wasm32-unknown-unknown/release/std/node-22 | transport/typescript/node | 2.5× [2.3–2.6] |
| transport/rust/wasm32-unknown-unknown/release/std/node-24 | transport/typescript/node | 2.4× [2.1–3.7] |
| transport/rust/wasm32-unknown-unknown/release/std/bun | transport/typescript/node | 2.3× [2.3–2.4] |
| transport/rust/wasm32-unknown-unknown/release/std/deno | transport/typescript/node | 3.8× [3.7–3.9] |
| transport/rust/wasm32-unknown-unknown/release/std/chromium | transport/typescript/node | 2.4× [2.4–2.5] |
| transport/rust/wasm32-unknown-unknown/release/std/firefox | transport/typescript/node | 4.3× [3.5–4.5] |
| transport/rust/wasm32-unknown-unknown/release/std/webkit | transport/typescript/node | 3.2× [3.1–3.5] |
| transport/rust/wasm32-unknown-unknown/release/std/workerd-web | transport/typescript/node | 2.4× [2.4–2.5] |
| transport/rust/wasm32-unknown-unknown/release/std/workerd-node-compatible | transport/typescript/node | 2.5× [2.4–2.5] |
| transport/rust/wasm32-unknown-unknown/release/reduced/node | transport/typescript/node | 2.2× [1.9–2.2] |
| transport/rust/wasm32-unknown-unknown/release/reduced/node-22 | transport/typescript/node | 2.6× [2.5–2.6] |
| transport/rust/wasm32-unknown-unknown/release/reduced/node-24 | transport/typescript/node | 2.4× [2.4–2.5] |
| transport/rust/wasm32-unknown-unknown/release/reduced/bun | transport/typescript/node | 2.3× [2.1–2.4] |
| transport/rust/wasm32-unknown-unknown/release/reduced/deno | transport/typescript/node | 3.8× [3.7–4.1] |
| transport/rust/wasm32-unknown-unknown/release/reduced/chromium | transport/typescript/node | 2.4× [2.1–2.5] |
| transport/rust/wasm32-unknown-unknown/release/reduced/firefox | transport/typescript/node | 4.3× [4.1–4.8] |
| transport/rust/wasm32-unknown-unknown/release/reduced/webkit | transport/typescript/node | 3.2× [3.2–3.3] |
| transport/rust/wasm32-unknown-unknown/release/reduced/workerd-web | transport/typescript/node | 2.5× [2.4–4.1] |
| transport/rust/wasm32-unknown-unknown/release/reduced/workerd-node-compatible | transport/typescript/node | 2.4× [2.4–2.6] |
| transport/typescript/node | transport/typescript/node | reference |
| transport/native/node-22/napi | transport/typescript/node | 2.1× [2–2.3] |
| transport/native/node-24/napi | transport/typescript/node | 2.1× [2–2.2] |
| transport/native/node-26/napi | transport/typescript/node | 2× [1.6–2.2] |
| transport/native/node-26/ffi | transport/typescript/node | 4.9× [4.3–5.1] |
| transport/native/bun/ffi | transport/typescript/node | 1.2× [1.2–1.3] |
| transport/native/bun/napi | transport/typescript/node | 2.2× [2.1–2.3] |
| transport/native/deno/napi | transport/typescript/node | 2× [2–2.1] |
| transport/native/deno/ffi | transport/typescript/node | 4.4× [4.2–4.5] |


## Rust browser WASM release/fast-rng

| Caller job | Reference | rust/wasm32-unknown-unknown/release/fast-rng/workerd-web | rust/wasm32-unknown-unknown/release/fast-rng/workerd-node-compatible | rust/wasm32-unknown-unknown/release/fast-rng/node | rust/wasm32-unknown-unknown/release/fast-rng/node-22 | rust/wasm32-unknown-unknown/release/fast-rng/node-24 | rust/wasm32-unknown-unknown/release/fast-rng/bun | rust/wasm32-unknown-unknown/release/fast-rng/deno | rust/wasm32-unknown-unknown/release/fast-rng/chromium | rust/wasm32-unknown-unknown/release/fast-rng/firefox | rust/wasm32-unknown-unknown/release/fast-rng/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| async/future/cancelled | rust/native/release/fast-rng | 1.2× [0.79–1.2] unresolved | 1.2× [1.1–1.3] | 1.3× [1.2–1.3] | 1.7× [1.6–2.9] | 1.6× [1.3–1.8] | 1.3× [1.2–1.4] | 1.2× [0.88–1.3] unresolved | 1.3× [1.1–1.3] | 1.4× [1.3–1.4] | 1.3× [1.3–1.3] |
| async/future/derive/1 | rust/native/release/fast-rng | 0.98× [0.96–1.2] unresolved | 0.99× [0.96–1] | 0.96× [0.92–0.97] | 1× [0.99–1] unresolved | 1× [1–1.2] | 0.94× [0.66–0.99] | 0.98× [0.97–1] unresolved | 0.95× [0.7–1] | 1× [1–1.1] | 0.94× [0.92–0.97] |
| async/future/derive/64 | rust/native/release/fast-rng | 0.88× [0.86–0.9] | 0.88× [0.85–0.88] | 0.77× [0.76–0.78] | 0.89× [0.81–1.1] unresolved | 0.89× [0.87–1.2] unresolved | 0.72× [0.71–0.94] | 0.84× [0.83–0.92] | 0.82× [0.45–0.85] | 0.85× [0.84–0.87] | 0.71× [0.7–0.76] |
| bounds/one-millisecond | ts/node | 0.12× [0.11–0.12] | 0.12× [0.11–0.12] | 0.091× [0.09–0.11] | 0.095× [0.091–0.096] | 0.1× [0.1–0.11] | 0.077× [0.075–0.094] | 0.11× [0.1–0.12] | 0.091× [0.091–0.095] | 0.1× [0.099–0.1] | 0.092× [0.09–0.095] |
| bounds/range | ts/node | 0.12× [0.092–0.12] | 0.12× [0.11–0.12] | 0.092× [0.089–0.1] | 0.094× [0.076–0.16] | 0.1× [0.1–0.11] | 0.076× [0.059–0.078] | 0.12× [0.11–0.13] | 0.088× [0.085–0.09] | 0.097× [0.093–0.099] | 0.091× [0.089–0.094] |
| bytes/read | ts/node | 0.18× [0.15–0.19] | 0.18× [0.18–0.18] | 0.14× [0.14–0.15] | 0.13× [0.13–0.14] | 0.14× [0.14–0.15] | 0.096× [0.094–0.11] | 0.18× [0.18–0.19] | 0.13× [0.13–0.13] | 0.13× [0.13–0.13] | 0.13× [0.12–0.13] |
| bytes/write/offset | rust/native/release/fast-rng | 9.4× [2.5–9.8] | 9.6× [9.5–9.6] | 7.4× [7.4–7.9] | 8.4× [8.1–8.9] | 9.3× [9.1–10] | 6.8× [6.6–7.4] | 9.3× [9.1–9.6] | 7.4× [7–7.4] | 9× [8.3–9.2] | 8× [7.9–8.1] |
| construct/codec-precomputed-mask | ts/node | 0.14× [0.099–0.14] | 0.14× [0.14–0.15] | 0.11× [0.1–0.12] | 0.14× [0.12–0.14] | 0.12× [0.11–0.15] | 0.1× [0.096–0.13] | 0.13× [0.12–0.25] | 0.11× [0.093–0.11] | 0.13× [0.12–0.13] | 0.11× [0.11–0.12] |
| construct/custom-mask | rust/native/release/fast-rng | 1.6× [1.6–1.7] | 1.7× [1.7–1.7] | 1.4× [1.4–1.6] | 1.8× [1.6–1.8] | 1.6× [1.5–1.7] | 1.6× [1.5–1.9] | 1.8× [1.5–1.8] | 1.5× [1.4–1.7] | 1.3× [1.3–1.5] | 1.6× [1.5–1.6] |
| construct/generator | ts/node | 0.014× [0.014–0.015] | 0.014× [0.013–0.016] | 0.0092× [0.0057–0.0094] | 0.009× [0.0088–0.012] | 0.0091× [0.0088–0.0095] | 0.0051× [0.005–0.0097] | 0.014× [0.014–0.015] | 0.0084× [0.008–0.0088] | 0.0083× [0.008–0.0086] | 0.0079× [0.0077–0.008] |
| construct/mask | rust/native/release/fast-rng | 1.1× [0.7–1.3] unresolved | 1× [1–1.7] | 1× [1–1] | 1× [0.99–1] unresolved | 1× [1–1] | 1.1× [1.1–1.5] | 1.1× [1–1.1] unresolved | 1× [0.98–1.1] unresolved | 1.2× [1.1–1.2] | 1.1× [1.1–1.1] |
| construct/mask-iterated | rust/native/release/fast-rng | 1× [0.94–1] unresolved | 1× [0.99–1] unresolved | 1× [0.85–1] unresolved | 0.98× [0.96–0.99] | 1× [0.99–1.4] unresolved | 0.94× [0.9–0.95] | 1× [0.97–1] unresolved | 1× [1–1] unresolved | 1× [1–1] | 0.95× [0.94–0.95] |
| construct/migration | rust/native/release/fast-rng | 5.8× [5.8–5.9] | 6× [5.7–6] | 4.1× [4.1–4.2] | 4.1× [4–4.2] | 4.2× [4–6] | 2.2× [2.1–4.5] | 5.9× [5.8–6.3] | 4.6× [4.1–4.7] | 3.7× [3.6–3.7] | 3.4× [3.3–3.4] |
| construct/payload-layout | rust/native/release/fast-rng | 2.6× [2–2.8] | 2.6× [2.5–2.7] | 2.3× [2.3–2.4] | 2.4× [2.3–2.5] | 2.4× [2.4–2.5] | 1.8× [1.8–2.4] | 2.7× [2.5–2.7] | 2× [1.9–2] | 2.1× [2.1–2.2] | 2.2× [2.1–2.2] |
| construct/public-test-mask-and-codec | rust/native/release/fast-rng | 1× [0.94–1.5] unresolved | 1× [0.99–1.1] unresolved | 1.1× [1–1.1] | 1.2× [1.1–1.3] | 1.1× [0.96–1.1] unresolved | 1× [0.98–1.1] unresolved | 1.2× [1–1.2] | 0.94× [0.92–1.1] unresolved | 1.1× [1–1.1] | 1.1× [1–1.1] |
| construct/sentinels/1 | rust/native/release/fast-rng | 1.2× [1.1–1.3] | 1.3× [1.2–1.3] | 1.1× [1.1–1.1] | 1.3× [1.2–1.6] | 1.3× [1.2–1.6] | 1× [1–1.5] | 1.3× [1.3–1.4] | 1.1× [1.1–1.2] | 1.6× [1.5–1.6] | 1× [1–1.1] |
| construct/sentinels/16 | rust/native/release/fast-rng | 1.3× [1.1–1.3] | 1.3× [1.3–1.3] | 1.1× [1.1–1.2] | 1.2× [1.1–1.3] | 1.1× [1.1–1.2] | 0.98× [0.96–1.3] unresolved | 1.3× [1.3–1.4] | 1.1× [0.84–1.2] unresolved | 1.5× [1.5–1.5] | 0.98× [0.93–1] unresolved |
| construct/sentinels/4 | rust/native/release/fast-rng | 1.4× [1.3–1.4] | 1.4× [1.3–1.4] | 1.1× [1–1.2] | 1.3× [1.2–1.4] | 1.2× [1.2–1.3] | 1× [1–1.3] | 1.4× [1.3–1.6] | 1.2× [1.1–1.2] | 1.7× [1.6–1.7] | 1× [1–1] |
| construct/sentinels/64 | rust/native/release/fast-rng | 1.2× [0.72–1.3] unresolved | 1.2× [1.2–1.2] | 1× [1–1] | 1.1× [1.1–1.2] | 1× [1–1.1] unresolved | 0.89× [0.86–1.4] unresolved | 1.2× [1.2–1.4] | 1.1× [0.69–1.1] unresolved | 1.2× [1.1–1.2] | 0.89× [0.76–0.92] |
| decode/base32/caller-buffer | ts/node | 0.26× [0.25–0.28] | 0.25× [0.21–0.27] | 0.19× [0.17–0.2] | 0.2× [0.19–0.22] | 0.19× [0.16–0.2] | 0.18× [0.15–0.18] | 0.25× [0.2–0.26] | 0.19× [0.17–0.2] | 0.24× [0.21–0.26] | 0.18× [0.17–0.19] |
| decode/base32/owned | ts/node | 0.36× [0.32–0.42] | 0.34× [0.32–0.37] | 0.24× [0.18–0.26] | 0.28× [0.26–0.29] | 0.25× [0.17–0.27] | 0.25× [0.21–0.26] | 0.35× [0.33–0.37] | 0.26× [0.24–0.27] | 0.34× [0.32–0.42] | 0.26× [0.24–0.26] |
| decode/caller-buffer | ts/node | 0.23× [0.21–0.33] | 0.22× [0.21–0.23] | 0.18× [0.18–0.19] | 0.21× [0.2–0.21] | 0.19× [0.18–0.2] | 0.18× [0.17–0.21] | 0.23× [0.23–0.25] | 0.19× [0.18–0.2] | 0.21× [0.21–0.22] | 0.17× [0.17–0.18] |
| decode/owned | ts/node | 0.24× [0.22–0.29] | 0.23× [0.22–0.24] | 0.19× [0.18–0.19] | 0.2× [0.18–0.21] | 0.19× [0.17–0.19] | 0.18× [0.17–0.35] | 0.24× [0.23–0.27] | 0.19× [0.18–0.2] | 0.22× [0.054–0.22] | 0.18× [0.17–0.18] |
| failure/buffer-capacity | rust/native/release/fast-rng | 1.4× [1.2–1.4] | 1.4× [1.3–1.6] | 1.3× [1.3–1.3] | 1.6× [1.5–2.1] | 1.4× [1.3–1.4] | 1.1× [1–1.5] | 1.5× [1.3–1.6] | 1.3× [1.2–1.4] | 1.6× [1.5–1.6] | 1× [0.98–1.1] unresolved |
| failure/plain/base32 | rust/native/release/fast-rng | 1.5× [1.5–1.8] | 1.5× [1.3–1.6] | 1.4× [1.4–1.5] | 1.8× [1.6–2.5] | 1.6× [1.5–1.7] | 1.1× [0.82–1.1] unresolved | 1.6× [1.6–1.7] | 1.4× [1.2–1.5] | 1.7× [1.7–1.8] | 1× [1–1.1] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.6× [1.5–1.7] | 1.5× [1.3–1.6] | 1.5× [1.4–1.5] | 1.7× [1.6–1.9] | 1.7× [1.5–1.7] | 1.1× [1.1–1.4] | 1.6× [1.5–1.9] | 1.4× [1.4–1.5] | 1.8× [1.7–6.9] | 1× [1–1.1] |
| failure/uuid-parse | ts/node | 0.0053× [0.0044–0.0054] | 0.0053× [0.0052–0.0055] | 0.005× [0.0048–0.0051] | 0.0062× [0.0059–0.0066] | 0.0055× [0.0052–0.0055] | 0.0046× [0.0045–0.0091] | 0.0047× [0.0045–0.0051] | 0.0048× [0.0045–0.0049] | 0.0051× [0.005–0.0052] | 0.0043× [0.0042–0.0044] |
| format/uuid/lowercase | ts/node | 0.55× [0.26–0.57] | 0.59× [0.55–0.6] | 0.54× [0.51–0.56] | 0.64× [0.62–0.68] | 0.6× [0.4–0.66] | 0.52× [0.48–0.58] | 0.58× [0.54–0.6] | 0.55× [0.48–0.58] | 0.62× [0.6–0.64] | 0.52× [0.5–0.53] |
| format/uuid/uppercase | ts/node | 0.52× [0.5–0.55] | 0.54× [0.51–0.58] | 0.53× [0.51–0.55] | 0.6× [0.47–0.66] | 0.58× [0.45–0.61] | 0.49× [0.45–0.64] | 0.52× [0.49–0.71] | 0.53× [0.49–0.57] | 0.62× [0.59–0.64] | 0.5× [0.46–0.51] |
| generation/v4/base32hex | ts/node | 0.9× [0.77–1.1] unresolved | 0.89× [0.86–0.91] | 0.84× [0.82–0.88] | 0.95× [0.92–0.98] | 0.95× [0.55–0.97] | 0.8× [0.76–2.5] unresolved | 0.91× [0.83–0.93] | 0.83× [0.8–0.86] | 1.1× [1.1–1.2] | 0.81× [0.8–0.84] |
| generation/v4/base64url | ts/node | 1.3× [1.1–1.5] | 1.3× [1.2–1.4] | 1.1× [0.95–1.1] unresolved | 1.5× [1.5–1.6] | 1.3× [1.2–1.4] | 1× [1–1.6] | 1.4× [1.3–1.4] | 1.1× [1.1–1.3] | 1.5× [0.76–1.6] unresolved | 1× [1–1.1] |
| generation/v4/bytes | ts/node | 0.49× [0.47–0.51] | 0.49× [0.47–0.52] | 0.5× [0.5–0.52] | 0.51× [0.49–0.53] | 0.54× [0.53–0.54] | 0.44× [0.43–0.45] | 0.52× [0.52–0.53] | 0.51× [0.49–0.52] | 0.53× [0.51–0.57] | 0.46× [0.45–0.46] |
| generation/v4/caller-buffer-custom-entropy | rust/native/release/fast-rng | 0.078× [0.076–0.11] | 0.078× [0.076–0.079] | 0.31× [0.3–0.32] | 0.61× [0.6–1] unresolved | 0.61× [0.59–0.63] | 0.045× [0.044–0.068] | 0.093× [0.091–0.094] | 0.41× [0.38–0.42] | 0.32× [0.32–0.33] | 0.31× [0.3–0.31] |
| generation/v4/text | ts/node | 0.76× [0.72–0.79] | 0.76× [0.74–0.8] | 0.75× [0.46–0.81] | 0.92× [0.63–0.96] | 0.82× [0.79–0.89] | 0.72× [0.71–0.83] | 0.76× [0.73–0.8] | 0.75× [0.72–0.83] | 0.87× [0.84–0.92] | 0.74× [0.69–0.77] |
| generation/v7/base32hex | ts/node | 0.4× [0.34–0.5] | 0.4× [0.37–0.45] | 0.32× [0.3–0.33] | 0.3× [0.29–0.31] | 0.35× [0.31–0.35] | 0.26× [0.25–0.45] | 0.33× [0.32–0.34] | 0.34× [0.34–0.36] | 0.43× [0.12–0.45] | 0.26× [0.26–0.27] |
| generation/v7/base64url | ts/node | 0.48× [0.45–0.59] | 0.49× [0.44–0.54] | 0.39× [0.37–0.4] | 0.45× [0.43–0.47] | 0.44× [0.36–0.46] | 0.32× [0.31–0.44] | 0.42× [0.39–0.44] | 0.41× [0.4–0.44] | 0.56× [0.53–0.57] | 0.32× [0.32–0.33] |
| generation/v7/bytes | ts/node | 0.71× [0.49–0.76] | 0.72× [0.67–0.84] | 0.6× [0.58–0.62] | 0.56× [0.54–0.57] | 0.63× [0.58–0.66] | 0.49× [0.48–0.62] | 0.61× [0.58–0.62] | 0.68× [0.65–0.73] | 0.77× [0.75–0.79] | 0.5× [0.49–0.52] |
| generation/v7/caller-buffer-custom-entropy | rust/native/release/fast-rng | 0.1× [0.096–0.1] | 0.1× [0.099–0.1] | 0.38× [0.37–0.4] | 0.74× [0.73–0.94] | 0.73× [0.71–0.79] | 0.056× [0.051–0.059] | 0.11× [0.11–0.11] | 0.47× [0.35–0.48] | 0.32× [0.3–0.33] | 0.2× [0.19–0.2] |
| generation/v7/custom-entropy | rust/native/release/fast-rng | 0.1× [0.098–0.23] | 0.1× [0.098–0.1] | 0.38× [0.37–0.4] | 0.76× [0.72–0.87] | 0.73× [0.71–0.83] | 0.055× [0.053–0.079] | 0.11× [0.11–0.11] | 0.48× [0.46–0.51] | 0.32× [0.32–0.33] | 0.2× [0.19–0.2] |
| generation/v7/explicit-time | rust/native/release/fast-rng | 1.8× [1.5–1.8] | 1.8× [1.7–1.9] | 1.8× [1.8–1.9] | 1.7× [1.7–1.8] | 1.9× [1.8–2] | 1.5× [1.5–1.7] | 1.9× [1.9–2] | 1.8× [1.7–1.8] | 1.8× [1.8–1.8] | 1.5× [1.5–1.6] |
| generation/v7/fraction12-custom-entropy | rust/native/release/fast-rng | 0.1× [0.098–0.11] | 0.1× [0.098–0.1] | 0.38× [0.36–0.39] | 0.74× [0.72–0.98] | 0.72× [0.71–0.8] | 0.056× [0.053–0.071] | 0.11× [0.11–0.11] | 0.46× [0.41–0.47] | 0.32× [0.27–0.33] | 0.2× [0.2–0.21] |
| generation/v7/text | ts/node | 0.91× [0.47–0.94] | 0.91× [0.72–0.95] | 0.77× [0.7–0.82] | 0.78× [0.42–0.8] | 0.81× [0.66–0.85] | 0.65× [0.63–0.93] | 0.76× [0.69–0.82] | 0.85× [0.73–0.91] | 0.94× [0.9–0.98] | 0.65× [0.63–0.66] |
| inspect/v4 | rust/native/release/fast-rng | 6.5× [5.8–6.6] | 6.6× [6.2–6.7] | 4.8× [2.2–4.9] | 4.7× [4.6–4.8] | 4.8× [4.2–5.7] | 1.9× [1.9–2.2] | 6.5× [4.9–6.8] | 3.7× [3.6–3.7] | 3.5× [3.5–4.6] | 3.3× [3.3–3.3] |
| inspect/v7 | rust/native/release/fast-rng | 6.4× [5.7–6.7] | 6.6× [6.3–6.6] | 4.8× [4.6–4.9] | 4.7× [4.4–4.8] | 4.8× [4.4–5.5] | 1.9× [1.8–2.7] | 6.5× [5.8–6.7] | 3.7× [3.6–3.8] | 3.5× [3.4–3.6] | 3.2× [3.2–3.3] |
| inspect/variant | rust/native/release/fast-rng | 5.2× [5–5.2] | 5.3× [4.8–5.7] | 3.6× [3.1–3.6] | 3.6× [3.3–3.6] | 3.6× [3.1–3.6] | 2.8× [2.5–2.9] | 5.3× [4.9–5.4] | 4.1× [4–4.1] | 3.6× [3.2–3.7] | 3.3× [3.3–3.3] |
| inspect/version | rust/native/release/fast-rng | 5.4× [5.2–5.6] | 5.5× [5.1–5.9] | 4.8× [3.6–5] | 4.8× [4.7–4.9] | 4.8× [4.6–5.2] | 2.2× [2.1–2.4] | 6.2× [6–6.5] | 3.6× [3.5–3.6] | 3.4× [3.4–3.6] | 3.2× [3.1–3.2] |
| mask/base32 | ts/node | 0.97× [0.66–1] | 0.97× [0.93–1] unresolved | 0.95× [0.84–0.96] | 0.95× [0.9–0.96] | 1× [0.67–1] unresolved | 0.87× [0.86–1.1] unresolved | 0.96× [0.8–0.98] | 0.95× [0.93–0.97] | 1.1× [1.1–1.3] | 0.88× [0.87–0.89] |
| mask/base32/sentinels | ts/node | 0.89× [0.86–0.89] | 0.88× [0.86–0.9] | 0.87× [0.85–0.88] | 0.86× [0.64–0.88] | 0.91× [0.89–0.93] | 0.8× [0.62–0.81] | 0.9× [0.89–1] unresolved | 0.87× [0.82–0.89] | 1.1× [1–1.1] | 0.81× [0.79–0.82] |
| mask/base64 | ts/node | 1× [0.46–1.1] unresolved | 1× [1–1.1] | 0.98× [0.77–1] unresolved | 1.1× [1–1.1] | 1.1× [0.93–1.1] unresolved | 0.92× [0.75–0.95] | 1× [1–1.1] | 0.99× [0.97–1] unresolved | 1.2× [1.2–1.6] | 0.94× [0.92–0.96] |
| mask/binary/caller-buffer | ts/node | 0.69× [0.43–0.71] | 0.69× [0.68–0.77] | 0.68× [0.66–0.76] | 0.67× [0.66–0.76] | 0.66× [0.66–0.74] | 0.65× [0.64–0.73] | 0.69× [0.68–0.79] | 0.68× [0.67–0.77] | 0.69× [0.68–0.77] | 0.64× [0.64–0.72] |
| mask/binary/owned | ts/node | 0.73× [0.7–0.75] | 0.72× [0.69–0.82] | 0.71× [0.67–0.72] | 0.7× [0.69–0.71] | 0.71× [0.69–0.74] | 0.68× [0.67–0.85] | 0.73× [0.73–0.74] | 0.72× [0.7–0.73] | 0.75× [0.74–0.76] | 0.69× [0.69–0.7] |
| migration/candidates | rust/native/release/fast-rng | 1.1× [1.1–1.2] | 1.1× [1.1–1.2] | 1.1× [1.1–1.1] | 1.1× [0.98–1.1] unresolved | 1.1× [1–1.1] | 1× [1–1.5] | 1.1× [1.1–1.2] | 1.1× [1.1–1.1] | 1.1× [1.1–1.2] | 1× [1–1] |
| migration/candidates-text | ts/node | 0.58× [0.55–0.7] | 0.58× [0.55–0.7] | 0.57× [0.49–0.7] | 0.61× [0.57–0.73] | 0.59× [0.59–0.73] | 0.56× [0.52–0.67] | 0.58× [0.56–0.69] | 0.58× [0.55–0.69] | 0.67× [0.62–0.82] | 0.55× [0.52–0.66] |
| migration/first | rust/native/release/fast-rng | 1.2× [1.2–1.2] | 1.2× [1.1–1.3] | 1.2× [1.1–1.2] | 1.2× [0.98–1.2] unresolved | 1.2× [0.93–1.2] unresolved | 1.1× [1.1–1.3] | 1.2× [1.2–1.6] | 1.2× [1.2–1.2] | 1.2× [1.2–1.3] | 1.1× [1.1–1.1] |
| migration/first-text | ts/node | 0.55× [0.51–0.56] | 0.55× [0.54–0.6] | 0.55× [0.53–0.56] | 0.59× [0.58–0.6] | 0.57× [0.49–0.57] | 0.51× [0.5–0.52] | 0.55× [0.53–0.57] | 0.54× [0.44–0.55] | 0.62× [0.62–0.63] | 0.52× [0.52–0.53] |
| parse/braced | rust/native/release/fast-rng | 2.3× [2.2–2.4] | 2.3× [2.3–2.3] | 1.9× [1.9–1.9] | 2.1× [1.9–2.1] | 2× [1.9–2.1] | 2.2× [2.2–3.8] | 2.3× [2.3–2.5] | 1.9× [1.9–2] | 2.1× [2.1–2.1] | 2.3× [2.2–2.4] |
| parse/compact | ts/node | 0.55× [0.51–0.57] | 0.55× [0.53–0.58] | 0.46× [0.44–0.47] | 0.5× [0.48–0.51] | 0.47× [0.45–0.5] | 0.53× [0.5–0.65] | 0.56× [0.53–0.63] | 0.47× [0.43–0.48] | 0.5× [0.49–0.55] | 0.55× [0.5–0.56] |
| parse/keyed/base32 | ts/node | 0.54× [0.54–0.75] | 0.55× [0.52–0.55] | 0.48× [0.47–3] unresolved | 0.48× [0.47–0.48] | 0.49× [0.48–0.61] | 0.51× [0.49–0.68] | 0.54× [0.53–0.56] | 0.48× [0.41–0.51] | 0.53× [0.51–0.54] | 0.49× [0.48–0.5] |
| parse/keyed/base64 | ts/node | 0.53× [0.49–0.54] | 0.53× [0.51–0.55] | 0.5× [0.49–0.65] | 0.49× [0.47–0.6] | 0.49× [0.46–0.5] | 0.48× [0.47–0.55] | 0.52× [0.5–0.54] | 0.5× [0.46–0.52] | 0.49× [0.48–0.5] | 0.48× [0.47–0.49] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.3× [1.3–1.3] | 1.3× [1.2–1.3] | 1× [0.93–1] unresolved | 1.1× [1.1–1.4] | 1× [1–1.8] | 1.2× [1.2–1.6] | 1.3× [1.3–1.5] | 0.99× [0.8–1.1] unresolved | 1.4× [1.3–1.4] | 1.2× [1.2–1.3] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [1.2–1.3] | 1.3× [1.3–1.3] | 0.98× [0.96–1] unresolved | 1.1× [1–1.1] | 1× [0.91–1.1] unresolved | 1.2× [1–1.2] | 1.3× [1.3–1.5] | 1× [0.94–1] unresolved | 1.2× [1.2–1.2] | 1.2× [1.2–1.2] |
| parse/universal | rust/native/release/fast-rng | 2.4× [1.7–2.4] | 2.4× [0.79–2.4] unresolved | 1.9× [1.9–2] | 2.1× [2–2.5] | 2× [2–2] | 2.3× [2.3–2.9] | 2.4× [2.4–2.4] | 2× [1.9–2] | 2.2× [2.2–2.3] | 2.4× [2.3–2.4] |
| parse/urn | rust/native/release/fast-rng | 2.1× [2–2.1] | 2.1× [2.1–2.1] | 1.7× [1.6–1.8] | 1.9× [1.7–2.9] | 1.8× [1.6–1.8] | 2.1× [2.1–3.1] | 2.1× [2.1–2.2] | 1.7× [1.5–1.8] | 1.9× [1.9–1.9] | 2.1× [2–2.2] |
| parse/uuid | ts/node | 0.51× [0.46–0.52] | 0.5× [0.45–0.51] | 0.43× [0.38–0.43] | 0.45× [0.4–0.46] | 0.43× [0.29–0.45] | 0.48× [0.41–0.5] | 0.51× [0.5–0.52] | 0.43× [0.38–0.49] | 0.45× [0.43–0.53] | 0.49× [0.49–0.51] |
| payload/extract/bytes | ts/node | 0.092× [0.086–0.095] | 0.09× [0.084–0.093] | 0.071× [0.067–0.083] | 0.11× [0.097–0.12] | 0.072× [0.066–0.076] | 0.078× [0.076–0.14] | 0.084× [0.081–0.085] | 0.072× [0.068–0.078] | 0.082× [0.08–0.086] | 0.081× [0.078–0.084] |
| payload/masked/base32 | ts/node | 0.46× [0.46–0.58] | 0.47× [0.44–0.47] | 0.44× [0.43–0.44] | 0.45× [0.44–0.47] | 0.43× [0.42–0.68] | 0.41× [0.37–0.43] | 0.46× [0.44–0.47] | 0.44× [0.43–0.45] | 0.46× [0.45–1.4] unresolved | 0.42× [0.41–0.42] |
| payload/masked/base64 | ts/node | 0.45× [0.44–0.47] | 0.45× [0.43–0.47] | 0.44× [0.43–0.44] | 0.45× [0.45–0.46] | 0.43× [0.42–0.43] | 0.41× [0.4–0.45] | 0.44× [0.44–0.46] | 0.42× [0.38–0.44] | 0.46× [0.45–0.47] | 0.41× [0.4–0.42] |
| plain/base32 | ts/node | 0.67× [0.63–0.73] | 0.67× [0.65–0.68] | 0.53× [0.5–0.55] | 0.67× [0.62–0.72] | 0.62× [0.48–0.66] | 0.55× [0.33–0.55] | 0.66× [0.64–0.76] | 0.53× [0.51–0.54] | 0.9× [0.8–0.92] | 0.55× [0.52–0.57] |
| plain/base64 | ts/node | 2.1× [1.8–2.4] | 2.1× [2.1–2.3] | 2× [1.9–2.2] | 2× [1.8–2.1] | 2.1× [1.4–2.2] | 1.4× [0.93–1.5] unresolved | 2.2× [2.1–2.6] | 2× [1.9–2.1] | 1.7× [1.7–1.8] | 1.6× [1.6–1.7] |
| rotation/previous-key | rust/native/release/fast-rng | 1.2× [1.1–1.2] | 1.2× [1.1–1.2] | 1.2× [1–1.2] | 1.1× [1–1.2] | 1.1× [1.1–1.2] | 1.1× [1.1–1.8] | 1.2× [1.1–1.2] | 1.2× [1.1–1.2] | 1.1× [1.1–1.2] | 1.1× [1.1–1.1] |
| sentinel/base32/canonical | ts/node | 0.16× [0.15–0.19] | 0.16× [0.11–0.19] | 0.12× [0.12–0.13] | 0.13× [0.12–0.13] | 0.14× [0.097–0.14] | 0.11× [0.1–0.19] | 0.16× [0.16–0.17] | 0.13× [0.12–0.13] | 0.12× [0.12–0.12] | 0.11× [0.11–0.12] |
| sentinel/base32/uppercase | ts/node | 0.34× [0.32–0.35] | 0.34× [0.32–0.35] | 0.28× [0.27–0.29] | 0.27× [0.26–0.28] | 0.28× [0.21–0.29] | 0.27× [0.26–0.38] | 0.34× [0.33–0.37] | 0.29× [0.28–0.33] | 0.3× [0.3–0.31] | 0.27× [0.26–0.29] |
| timestamp/extract/bytes | ts/node | 0.14× [0.11–0.14] | 0.13× [0.12–0.15] | 0.098× [0.092–0.11] | 0.098× [0.094–0.11] | 0.1× [0.084–0.11] | 0.061× [0.058–0.067] | 0.14× [0.13–0.16] | 0.11× [0.099–0.11] | 0.091× [0.089–0.099] | 0.088× [0.085–0.097] |
| timestamp/masked/base32 | ts/node | 0.71× [0.7–0.9] | 0.71× [0.69–0.73] | 0.64× [0.63–0.64] | 0.64× [0.63–0.64] | 0.63× [0.62–0.65] | 0.61× [0.59–0.66] | 0.71× [0.69–0.72] | 0.63× [0.52–0.67] | 0.68× [0.65–0.68] | 0.61× [0.59–0.63] |
| timestamp/masked/base64 | ts/node | 0.67× [0.58–0.69] | 0.67× [0.65–0.7] | 0.66× [0.65–0.67] | 0.65× [0.64–0.66] | 0.65× [0.64–0.71] | 0.62× [0.61–1.3] unresolved | 0.67× [0.66–0.68] | 0.66× [0.61–0.67] | 0.65× [0.65–0.66] | 0.61× [0.61–0.62] |
| timestamp/validate/uuid | rust/native/release/fast-rng | 2.6× [2.5–2.7] | 2.6× [2.3–2.7] | 2.2× [2–2.2] | 2.2× [2–2.3] | 2.4× [2.1–2.4] | 1.8× [1.7–2.3] | 2.6× [2.6–3.1] | 2.1× [1.9–2.2] | 2× [1.9–2.1] | 2× [1.9–2.1] |
| unmask/base32 | ts/node | 0.72× [0.71–1.1] unresolved | 0.71× [0.62–0.73] | 0.67× [0.65–0.67] | 0.65× [0.64–0.66] | 0.66× [0.64–0.68] | 0.62× [0.53–0.63] | 0.72× [0.71–0.92] | 0.67× [0.65–0.69] | 0.67× [0.66–0.69] | 0.62× [0.62–0.64] |
| unmask/base64 | ts/node | 0.7× [0.69–1.1] unresolved | 0.69× [0.66–0.69] | 0.69× [0.68–0.7] | 0.67× [0.66–0.68] | 0.67× [0.53–0.69] | 0.65× [0.63–0.98] | 0.69× [0.68–0.7] | 0.69× [0.68–0.71] | 0.66× [0.44–0.68] | 0.64× [0.63–0.65] |
| unmask/binary/caller-buffer | ts/node | 0.6× [0.58–0.62] | 0.59× [0.57–0.66] | 0.61× [0.59–0.63] | 0.61× [0.58–0.62] | 0.6× [0.59–0.62] | 0.55× [0.32–0.57] | 0.59× [0.55–0.62] | 0.61× [0.61–0.66] | 0.6× [0.6–0.61] | 0.56× [0.55–0.57] |
| unmask/binary/owned | ts/node | 0.62× [0.6–0.64] | 0.63× [0.58–0.69] | 0.63× [0.62–0.64] | 0.63× [0.6–0.64] | 0.62× [0.6–0.63] | 0.58× [0.58–0.66] | 0.62× [0.61–0.63] | 0.63× [0.62–0.64] | 0.63× [0.62–0.67] | 0.58× [0.57–0.59] |
| unmask/binary/text | ts/node | 0.69× [0.47–0.71] | 0.69× [0.64–0.75] | 0.68× [0.66–0.79] | 0.76× [0.75–0.78] | 0.73× [0.7–0.76] | 0.64× [0.39–0.65] | 0.69× [0.68–0.71] | 0.69× [0.55–0.71] | 0.74× [0.73–0.75] | 0.64× [0.63–0.65] |

## Rust browser WASM release/os-rng

| Caller job | Reference | rust/wasm32-unknown-unknown/release/os-rng/workerd-web | rust/wasm32-unknown-unknown/release/os-rng/workerd-node-compatible | rust/wasm32-unknown-unknown/release/os-rng/node | rust/wasm32-unknown-unknown/release/os-rng/node-22 | rust/wasm32-unknown-unknown/release/os-rng/node-24 | rust/wasm32-unknown-unknown/release/os-rng/bun | rust/wasm32-unknown-unknown/release/os-rng/deno | rust/wasm32-unknown-unknown/release/os-rng/chromium | rust/wasm32-unknown-unknown/release/os-rng/firefox | rust/wasm32-unknown-unknown/release/os-rng/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| async/future/cancelled | rust/native/release/fast-rng | 1.3× [1.2–1.6] | 1.2× [1.2–1.3] | 1.3× [1.2–1.3] | 1.6× [1.5–2.3] | 1.6× [1.2–1.6] | 1.3× [0.9–1.3] unresolved | 1.2× [0.69–1.4] unresolved | 1.3× [1.3–1.4] | 1.4× [1.2–1.4] | 1.3× [1.2–1.3] |
| async/future/derive/1 | rust/native/release/fast-rng | 0.97× [0.64–1.4] unresolved | 0.97× [0.97–0.98] | 0.94× [0.89–0.96] | 1× [1–1.6] | 1× [1–1] unresolved | 0.94× [0.81–0.95] | 1× [0.91–1.5] unresolved | 0.96× [0.95–1.1] unresolved | 1× [0.92–1.1] unresolved | 0.94× [0.82–0.95] |
| async/future/derive/64 | rust/native/release/fast-rng | 0.9× [0.88–1.1] unresolved | 0.88× [0.86–0.9] | 0.77× [0.74–0.78] | 0.89× [0.86–0.9] | 0.85× [0.84–0.87] | 0.72× [0.62–0.77] | 0.89× [0.82–1] unresolved | 0.82× [0.81–0.91] | 0.84× [0.72–0.85] | 0.72× [0.55–0.73] |
| bounds/one-millisecond | ts/node | 0.12× [0.099–0.12] | 0.12× [0.12–0.12] | 0.091× [0.086–0.092] | 0.091× [0.084–0.095] | 0.1× [0.1–0.11] | 0.076× [0.075–0.08] | 0.11× [0.11–0.14] | 0.092× [0.09–0.1] | 0.099× [0.094–0.1] | 0.092× [0.077–0.093] |
| bounds/range | ts/node | 0.12× [0.11–0.14] | 0.11× [0.11–0.12] | 0.091× [0.087–0.096] | 0.089× [0.065–0.096] | 0.1× [0.1–0.15] | 0.076× [0.073–0.078] | 0.12× [0.11–0.19] | 0.094× [0.088–0.1] | 0.099× [0.071–0.1] | 0.09× [0.066–0.093] |
| bytes/read | ts/node | 0.17× [0.17–0.18] | 0.17× [0.17–0.18] | 0.14× [0.14–0.15] | 0.13× [0.11–0.14] | 0.14× [0.14–0.15] | 0.096× [0.094–0.1] | 0.18× [0.13–0.18] | 0.13× [0.13–0.15] | 0.13× [0.13–0.13] | 0.13× [0.12–0.13] |
| bytes/write/offset | rust/native/release/fast-rng | 9.5× [8.9–10] | 9.4× [9–9.7] | 7.5× [7.1–7.6] | 8.2× [7.3–8.5] | 9.3× [7.4–9.5] | 6.7× [6.7–7.4] | 9.2× [8.6–9.5] | 7.4× [7.3–8.4] | 9.1× [9–9.1] | 8× [5.4–8.1] |
| construct/codec-precomputed-mask | ts/node | 0.14× [0.12–0.16] | 0.14× [0.13–0.15] | 0.11× [0.1–0.11] | 0.13× [0.088–0.14] | 0.12× [0.12–0.12] | 0.099× [0.095–0.11] | 0.13× [0.095–0.14] | 0.11× [0.075–0.11] | 0.12× [0.092–0.13] | 0.11× [0.1–0.11] |
| construct/custom-mask | rust/native/release/fast-rng | 1.8× [1.6–1.9] | 1.9× [1.8–1.9] | 1.4× [1.3–1.6] | 1.8× [1.6–1.9] | 1.7× [1–1.8] | 1.6× [1.4–1.7] | 1.7× [0.98–1.9] unresolved | 1.5× [1.3–1.8] | 1.3× [0.93–1.3] unresolved | 1.5× [1–1.7] |
| construct/generator | ts/node | 0.014× [0.013–0.022] | 0.014× [0.014–0.014] | 0.0091× [0.009–0.0094] | 0.0087× [0.0068–0.0092] | 0.0092× [0.0054–0.0094] | 0.0051× [0.0048–0.0052] | 0.014× [0.012–0.02] | 0.0085× [0.0082–0.0088] | 0.0084× [0.0078–0.0085] | 0.0078× [0.0031–0.0081] |
| construct/mask | rust/native/release/fast-rng | 1× [0.84–1.8] unresolved | 1× [1–1.1] | 1× [0.98–1] unresolved | 1× [1–1] | 1× [0.49–1] unresolved | 1.1× [1–1.1] | 1.1× [0.86–1.1] unresolved | 1× [0.85–1.1] unresolved | 1.1× [0.99–1.2] unresolved | 1.1× [0.96–1.1] unresolved |
| construct/mask-iterated | rust/native/release/fast-rng | 1× [0.92–1.3] unresolved | 1× [1–1] | 1× [0.91–1] unresolved | 0.98× [0.94–0.98] | 1× [0.67–1] unresolved | 0.94× [0.71–0.95] | 0.99× [0.72–1] unresolved | 1× [0.58–1] unresolved | 1× [0.9–1] unresolved | 0.94× [0.94–0.97] |
| construct/migration | rust/native/release/fast-rng | 5.9× [5.4–6.1] | 6× [6–6.1] | 4.1× [3.8–4.1] | 4× [3.8–4.2] | 4.1× [2.8–4.3] | 2.2× [2.1–2.2] | 5.8× [3.7–5.9] | 4.6× [4.3–4.7] | 3.6× [2.8–3.7] | 3.4× [3.3–3.5] |
| construct/payload-layout | rust/native/release/fast-rng | 2.7× [2.5–6.3] | 2.7× [2.7–2.7] | 2.3× [2.2–2.4] | 2.3× [2.1–2.5] | 2.5× [2.5–2.6] | 1.8× [1.7–1.8] | 2.6× [1.3–2.7] | 2× [1.9–2.1] | 2.1× [2.1–2.2] | 2.2× [2.1–2.2] |
| construct/public-test-mask-and-codec | rust/native/release/fast-rng | 1.1× [0.99–1.3] unresolved | 1.1× [1–1.2] | 0.93× [0.89–1] unresolved | 1.3× [1.2–1.7] | 1.2× [1.1–1.2] | 1× [0.95–1] unresolved | 1.1× [0.55–1.1] unresolved | 0.93× [0.89–1.2] unresolved | 1.1× [1–1.2] | 1.1× [1–1.1] |
| construct/sentinels/1 | rust/native/release/fast-rng | 1.2× [1.1–1.4] | 1.3× [1.2–1.3] | 1.1× [1.1–1.1] | 1.3× [0.81–1.3] unresolved | 1.3× [1.2–2.1] | 1× [0.97–1.1] unresolved | 1.3× [0.97–1.6] unresolved | 1.1× [1.1–1.2] | 1.6× [1.5–1.6] | 1× [0.97–1] unresolved |
| construct/sentinels/16 | rust/native/release/fast-rng | 1.3× [1.2–1.4] | 1.3× [1.3–1.4] | 1.1× [0.94–1.1] unresolved | 1.2× [1.1–1.2] | 1.1× [1.1–1.1] | 0.98× [0.92–1] unresolved | 1.3× [1.3–1.4] | 1.1× [1–1.1] | 1.5× [1.1–1.5] | 0.99× [0.95–1] unresolved |
| construct/sentinels/4 | rust/native/release/fast-rng | 1.4× [1.2–1.4] | 1.4× [1.3–1.4] | 1.1× [1.1–1.2] | 1.3× [1.2–1.3] | 1.2× [1.2–1.3] | 1× [0.99–1.1] unresolved | 1.4× [1.2–1.4] | 1.2× [1.1–1.2] | 1.6× [1.5–1.7] | 1× [0.84–1.1] unresolved |
| construct/sentinels/64 | rust/native/release/fast-rng | 1.2× [1.1–1.3] | 1.2× [1.2–1.3] | 1× [1–1] unresolved | 1.1× [1.1–1.2] | 1× [0.91–1.1] unresolved | 0.88× [0.78–0.92] | 1.2× [1.2–1.6] | 1.1× [1–1.1] | 1.2× [1.1–1.2] | 0.88× [0.79–0.9] |
| decode/base32/caller-buffer | ts/node | 0.26× [0.24–0.28] | 0.25× [0.23–0.26] | 0.19× [0.18–0.19] | 0.21× [0.19–0.22] | 0.19× [0.16–0.45] | 0.18× [0.17–0.18] | 0.25× [0.21–0.26] | 0.19× [0.18–0.25] | 0.24× [0.22–0.25] | 0.19× [0.17–0.19] |
| decode/base32/owned | ts/node | 0.35× [0.32–0.43] | 0.35× [0.32–0.36] | 0.25× [0.23–0.26] | 0.28× [0.21–0.29] | 0.26× [0.24–0.27] | 0.25× [0.23–0.26] | 0.35× [0.32–0.36] | 0.26× [0.23–0.34] | 0.34× [0.31–0.35] | 0.26× [0.099–0.28] |
| decode/caller-buffer | ts/node | 0.24× [0.23–0.27] | 0.23× [0.23–0.24] | 0.19× [0.18–0.19] | 0.21× [0.19–0.21] | 0.2× [0.19–0.2] | 0.17× [0.16–0.18] | 0.23× [0.22–0.24] | 0.19× [0.19–0.25] | 0.21× [0.21–0.22] | 0.17× [0.13–0.18] |
| decode/owned | ts/node | 0.25× [0.23–0.3] | 0.24× [0.23–0.24] | 0.19× [0.18–0.19] | 0.2× [0.2–0.21] | 0.19× [0.18–0.19] | 0.18× [0.17–0.18] | 0.24× [0.23–0.38] | 0.19× [0.18–0.25] | 0.22× [0.21–0.23] | 0.18× [0.13–0.18] |
| failure/buffer-capacity | rust/native/release/fast-rng | 1.4× [1.2–1.6] | 1.3× [1.3–1.4] | 1.3× [1.2–1.3] | 1.6× [1.5–1.7] | 1.4× [1.3–2.7] | 1.1× [1–1.1] | 1.5× [0.81–1.5] unresolved | 1.3× [0.27–1.4] unresolved | 1.6× [1–1.7] | 1× [0.96–1.1] unresolved |
| failure/plain/base32 | rust/native/release/fast-rng | 1.5× [1.4–1.8] | 1.5× [1.4–1.5] | 1.4× [1.3–1.8] | 1.7× [1.7–1.8] | 1.5× [1.5–2.6] | 1.1× [0.93–1.1] unresolved | 1.6× [0.79–1.7] unresolved | 1.4× [1.4–1.5] | 1.8× [1.7–1.8] | 1.1× [0.98–1.1] unresolved |
| failure/plain/base64 | rust/native/release/fast-rng | 1.5× [1.3–1.5] | 1.5× [1.4–1.9] | 1.4× [1.4–1.5] | 1.7× [1.6–1.8] | 1.6× [1.5–1.7] | 1.1× [0.92–1.1] unresolved | 1.6× [1.1–1.9] | 1.5× [1.4–1.7] | 1.8× [1.7–1.9] | 1.1× [0.95–1.1] unresolved |
| failure/uuid-parse | ts/node | 0.0054× [0.0048–0.0068] | 0.0054× [0.0052–0.0055] | 0.005× [0.0049–0.0053] | 0.0061× [0.0043–0.0065] | 0.0055× [0.0052–0.0056] | 0.0045× [0.0045–0.0046] | 0.0047× [0.0045–0.0057] | 0.0046× [0.0041–0.0055] | 0.0051× [0.004–0.0052] | 0.0042× [0.0038–0.0044] |
| format/uuid/lowercase | ts/node | 0.56× [0.54–0.71] | 0.57× [0.55–0.6] | 0.54× [0.47–0.57] | 0.65× [0.5–0.69] | 0.62× [0.58–0.7] | 0.5× [0.48–0.52] | 0.58× [0.53–0.96] | 0.57× [0.54–0.7] | 0.63× [0.36–0.64] | 0.52× [0.36–0.54] |
| format/uuid/uppercase | ts/node | 0.53× [0.44–0.56] | 0.52× [0.48–0.54] | 0.51× [0.48–0.53] | 0.63× [0.59–0.64] | 0.58× [0.54–0.61] | 0.47× [0.45–0.5] | 0.52× [0.48–0.72] | 0.53× [0.49–0.6] | 0.61× [0.57–0.75] | 0.49× [0.46–0.5] |
| generation/v4/base32hex | ts/node | 1.8× [1.8–3] | 1.8× [1.8–2] | 6× [5.2–6.2] | 11× [9.7–12] | 11× [7.9–12] | 1.2× [1.1–1.2] | 2× [1.8–2.1] | 7.3× [6.7–8.9] | 6.4× [6.4–6.5] | 5.7× [4–5.9] |
| generation/v4/base64url | ts/node | 2.4× [2–4.2] | 2.4× [2.3–2.4] | 6.9× [6.1–7.1] | 13× [13–35] | 13× [12–27] | 1.4× [1.3–1.6] | 2.6× [2.5–3.1] | 8.2× [7.8–10] | 7.5× [7.3–7.7] | 6.7× [5–6.8] |
| generation/v4/bytes | ts/node | 1.6× [1.3–2.3] | 1.5× [1.5–1.6] | 6.2× [5.8–6.4] | 13× [12–19] | 12× [11–13] | 0.82× [0.78–0.85] | 1.8× [1.8–2.3] | 7.9× [7.7–9.6] | 6.4× [6.3–8.5] | 5.3× [5.2–5.5] |
| generation/v4/caller-buffer-custom-entropy | rust/native/release/fast-rng | 0.078× [0.073–0.097] | 0.078× [0.077–0.079] | 0.31× [0.3–0.31] | 0.61× [0.6–0.79] | 0.61× [0.59–0.73] | 0.044× [0.039–0.046] | 0.092× [0.083–0.095] | 0.38× [0.37–0.4] | 0.32× [0.3–0.32] | 0.31× [0.14–0.31] |
| generation/v4/text | ts/node | 1.6× [1.4–3.2] | 1.6× [1.5–1.6] | 5.5× [5.2–5.8] | 11× [10–21] | 11× [10–11] | 1× [1–1.1] | 1.9× [1.7–2.4] | 6.9× [6.3–8.7] | 5.8× [5.7–6.2] | 4.7× [2.3–5] |
| generation/v7/base32hex | ts/node | 0.64× [0.59–1.1] unresolved | 0.64× [0.63–0.67] | 1.5× [1.4–1.6] | 2.8× [2.8–6.8] | 2.9× [2.9–3.1] | 0.37× [0.33–0.38] | 0.58× [0.55–0.6] | 1.9× [1.7–2.3] | 1.5× [1.5–1.5] | 0.86× [0.81–0.88] |
| generation/v7/base64url | ts/node | 0.79× [0.71–1.3] unresolved | 0.79× [0.77–0.82] | 1.8× [1.6–1.8] | 3.3× [3.1–6.5] | 3.3× [3.2–3.6] | 0.44× [0.4–0.47] | 0.75× [0.7–1.4] unresolved | 2.2× [1.7–2.6] | 1.7× [1.7–1.8] | 1× [0.65–1.1] unresolved |
| generation/v7/bytes | ts/node | 1.5× [1.2–1.8] | 1.5× [1.5–1.5] | 4.1× [3.9–4.2] | 7.8× [7.3–15] | 7.9× [7.6–13] | 0.76× [0.71–0.95] | 1.4× [1.3–1.8] | 5.1× [4.9–6.3] | 3.6× [3.5–4.1] | 2.1× [1.8–2.2] |
| generation/v7/caller-buffer-custom-entropy | rust/native/release/fast-rng | 0.1× [0.095–0.11] | 0.1× [0.1–0.1] | 0.38× [0.34–0.48] | 0.73× [0.72–0.91] | 0.74× [0.71–0.79] | 0.056× [0.048–0.059] | 0.11× [0.11–0.12] | 0.46× [0.45–0.52] | 0.32× [0.32–0.32] | 0.2× [0.16–0.2] |
| generation/v7/custom-entropy | rust/native/release/fast-rng | 0.1× [0.094–0.11] | 0.1× [0.098–0.1] | 0.38× [0.37–0.38] | 0.73× [0.71–1.2] unresolved | 0.72× [0.31–0.75] | 0.055× [0.047–0.058] | 0.11× [0.11–0.15] | 0.46× [0.46–0.49] | 0.32× [0.32–0.33] | 0.2× [0.084–0.21] |
| generation/v7/explicit-time | rust/native/release/fast-rng | 6.7× [5.6–11] | 6.6× [6.5–6.7] | 25× [25–26] | 49× [48–69] | 49× [47–51] | 3.5× [1.1–3.6] | 7.1× [4–12] | 30× [30–34] | 21× [17–22] | 13× [8–13] |
| generation/v7/fraction12-custom-entropy | rust/native/release/fast-rng | 0.1× [0.093–0.1] | 0.1× [0.099–0.1] | 0.38× [0.37–0.39] | 0.73× [0.72–1.1] unresolved | 0.74× [0.71–0.76] | 0.055× [0.049–0.056] | 0.11× [0.11–0.11] | 0.46× [0.46–0.5] | 0.32× [0.27–0.32] | 0.2× [0.1–0.2] |
| generation/v7/text | ts/node | 1.5× [1.1–2.2] | 1.5× [1.4–1.6] | 3.6× [3.4–4] | 6.8× [5.9–10] | 7× [6.5–7.3] | 0.93× [0.82–0.96] | 1.4× [1.3–1.4] | 4.6× [3.1–5.6] | 3.5× [3.4–3.7] | 2× [1.2–2.1] |
| inspect/v4 | rust/native/release/fast-rng | 6.4× [6–7] | 6.6× [6.5–6.7] | 4.8× [4.7–4.9] | 4.7× [4.3–4.8] | 4.8× [4.7–5.2] | 1.9× [1.9–2.1] | 6.3× [5.8–7.3] | 3.7× [3.1–4.8] | 3.6× [2.5–3.6] | 3.2× [2.1–3.3] |
| inspect/v7 | rust/native/release/fast-rng | 6.5× [6–6.8] | 6.6× [6.5–6.6] | 4.8× [4.8–4.9] | 4.7× [2.9–4.8] | 4.8× [4.7–5.1] | 1.9× [1.9–2.1] | 6.3× [5.6–6.4] | 3.7× [3–4.9] | 3.5× [1.8–3.6] | 3.2× [3.2–3.3] |
| inspect/variant | rust/native/release/fast-rng | 5.2× [5.1–6.3] | 5.3× [5.2–5.4] | 3.6× [3.4–3.6] | 3.5× [3.4–3.6] | 3.6× [3.5–8.6] | 2.8× [2.6–3.1] | 5.1× [4.9–5.2] | 4.1× [3.3–5.5] | 3.6× [3.2–3.7] | 3.2× [2.4–3.3] |
| inspect/version | rust/native/release/fast-rng | 5.4× [4.9–5.8] | 5.5× [5.4–5.7] | 4.8× [4.7–4.9] | 4.8× [4.7–4.9] | 4.8× [3.9–4.9] | 2.2× [2.1–2.6] | 6.1× [4.9–6.2] | 3.6× [3.1–4.7] | 3.4× [3–3.4] | 3.2× [3.1–3.2] |
| mask/base32 | ts/node | 0.97× [0.91–1.1] unresolved | 0.97× [0.96–0.98] | 0.94× [0.86–0.96] | 0.95× [0.72–0.96] | 1× [0.99–1.2] unresolved | 0.86× [0.8–0.87] | 0.96× [0.77–1.3] unresolved | 0.95× [0.9–1.2] unresolved | 1.1× [0.96–1.2] unresolved | 0.87× [0.86–0.88] |
| mask/base32/sentinels | ts/node | 0.9× [0.82–1.2] unresolved | 0.9× [0.88–0.9] | 0.87× [0.81–0.88] | 0.87× [0.86–0.9] | 0.93× [0.91–0.94] | 0.79× [0.59–0.81] | 0.89× [0.79–3] unresolved | 0.88× [0.86–1.1] unresolved | 1.1× [1.1–1.1] | 0.8× [0.79–0.81] |
| mask/base64 | ts/node | 1.1× [1–1.1] | 1.1× [1.1–1.1] | 0.98× [0.89–0.99] | 1.1× [1–1.1] unresolved | 1.1× [1.1–1.1] | 0.92× [0.89–0.94] | 1× [0.84–1.3] unresolved | 1× [0.97–1.2] unresolved | 1.2× [1.2–1.3] | 0.92× [0.6–0.96] |
| mask/binary/caller-buffer | ts/node | 0.69× [0.65–0.82] | 0.69× [0.67–0.78] | 0.67× [0.66–0.77] | 0.67× [0.66–0.75] | 0.68× [0.66–3.3] unresolved | 0.66× [0.64–0.74] | 0.7× [0.64–0.84] | 0.67× [0.67–0.89] | 0.69× [0.68–0.78] | 0.64× [0.45–0.74] |
| mask/binary/owned | ts/node | 0.72× [0.7–0.84] | 0.72× [0.72–0.74] | 0.71× [0.7–0.73] | 0.69× [0.58–0.71] | 0.71× [0.7–0.72] | 0.68× [0.65–0.69] | 0.73× [0.62–0.75] | 0.72× [0.71–0.94] | 0.75× [0.74–0.76] | 0.69× [0.54–0.7] |
| migration/candidates | rust/native/release/fast-rng | 1.1× [1.1–1.2] | 1.1× [1.1–1.1] | 1.1× [0.96–1.1] unresolved | 1.1× [1–1.1] | 1.1× [1–1.1] | 1× [1–1.2] | 1.1× [1.1–1.7] | 1.1× [1–1.4] | 1.1× [1–1.1] | 1× [0.91–1] unresolved |
| migration/candidates-text | ts/node | 0.57× [0.55–0.66] | 0.58× [0.56–0.69] | 0.58× [0.54–0.7] | 0.61× [0.58–0.78] | 0.61× [0.51–0.71] | 0.56× [0.53–0.66] | 0.57× [0.34–0.71] | 0.57× [0.49–0.77] | 0.64× [0.55–0.74] | 0.55× [0.52–0.64] |
| migration/first | rust/native/release/fast-rng | 1.2× [1.2–1.3] | 1.2× [1.1–1.3] | 1.2× [1.2–1.2] | 1.2× [1.1–1.2] | 1.2× [0.71–1.2] unresolved | 1.1× [1.1–1.2] | 1.2× [0.93–1.6] unresolved | 1.2× [1.2–1.6] | 1.2× [1–1.2] | 1.1× [0.91–1.1] unresolved |
| migration/first-text | ts/node | 0.55× [0.54–0.59] | 0.54× [0.45–0.57] | 0.55× [0.55–0.56] | 0.58× [0.53–0.59] | 0.57× [0.56–1.2] unresolved | 0.52× [0.5–0.56] | 0.55× [0.55–0.66] | 0.56× [0.22–0.72] | 0.62× [0.61–0.63] | 0.52× [0.5–0.54] |
| parse/braced | rust/native/release/fast-rng | 2.3× [2.3–2.5] | 2.3× [2.2–2.3] | 1.9× [1.9–1.9] | 2.1× [2–2.1] | 1.9× [0.91–2] unresolved | 2.2× [2.1–2.4] | 2.3× [1.7–3.7] | 1.9× [1.9–2.5] | 2.1× [2.1–2.1] | 2.3× [2.2–2.3] |
| parse/compact | ts/node | 0.56× [0.54–0.6] | 0.56× [0.54–0.58] | 0.45× [0.43–0.47] | 0.49× [0.47–0.51] | 0.48× [0.45–0.49] | 0.54× [0.53–0.56] | 0.55× [0.47–0.57] | 0.48× [0.45–0.58] | 0.5× [0.49–0.52] | 0.55× [0.34–0.59] |
| parse/keyed/base32 | ts/node | 0.54× [0.52–0.56] | 0.54× [0.54–0.55] | 0.48× [0.42–0.5] | 0.48× [0.47–0.5] | 0.49× [0.46–0.49] | 0.48× [0.42–0.5] | 0.54× [0.53–0.98] | 0.48× [0.46–0.51] | 0.53× [0.53–0.6] | 0.49× [0.48–0.51] |
| parse/keyed/base64 | ts/node | 0.53× [0.4–0.54] | 0.53× [0.52–0.54] | 0.5× [0.46–0.53] | 0.48× [0.17–0.5] | 0.49× [0.48–0.5] | 0.48× [0.43–0.48] | 0.53× [0.52–1] unresolved | 0.5× [0.49–0.51] | 0.5× [0.47–0.52] | 0.48× [0.47–0.5] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.3× [1.1–1.3] | 1.3× [1.3–1.3] | 1× [0.98–1] unresolved | 1.1× [1.1–1.1] | 1× [1–1.5] unresolved | 1.3× [1.1–1.4] | 1.3× [1.3–1.7] | 1× [0.94–1.1] unresolved | 1.3× [1.3–1.4] | 1.2× [0.81–1.3] unresolved |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [0.88–1.4] unresolved | 1.3× [1.3–1.4] | 0.98× [0.94–1.1] unresolved | 1.1× [0.84–1.1] unresolved | 1× [0.79–1] unresolved | 1.2× [1.1–1.3] | 1.3× [1.3–2.2] | 1× [1–1.1] | 1.2× [1.2–1.4] | 1.1× [0.95–1.2] unresolved |
| parse/universal | rust/native/release/fast-rng | 2.4× [2.4–2.5] | 2.4× [2.3–2.4] | 1.9× [1.9–1.9] | 2.1× [2.1–2.2] | 2× [1.9–2] | 2.3× [2.3–2.5] | 2.4× [2.3–2.4] | 2× [2–2.6] | 2.2× [2.2–2.2] | 2.4× [2.2–2.5] |
| parse/urn | rust/native/release/fast-rng | 2.1× [2.1–2.3] | 2.1× [2–2.1] | 1.7× [1.7–1.7] | 1.9× [1.7–1.9] | 1.8× [1.7–3.5] | 2.1× [1.9–2.3] | 2.1× [2–2.3] | 1.7× [1.6–2.2] | 1.9× [1.9–1.9] | 2.1× [2–2.3] |
| parse/uuid | ts/node | 0.5× [0.46–0.68] | 0.51× [0.46–0.52] | 0.43× [0.42–0.44] | 0.45× [0.39–0.46] | 0.43× [0.39–0.54] | 0.47× [0.35–0.49] | 0.51× [0.46–0.8] | 0.43× [0.41–0.57] | 0.45× [0.42–0.46] | 0.5× [0.33–0.51] |
| payload/extract/bytes | ts/node | 0.09× [0.089–0.1] | 0.091× [0.089–0.092] | 0.07× [0.07–0.073] | 0.11× [0.1–0.13] | 0.072× [0.071–0.15] | 0.079× [0.076–0.089] | 0.081× [0.077–0.084] | 0.07× [0.049–0.092] | 0.083× [0.082–0.085] | 0.078× [0.053–0.084] |
| payload/masked/base32 | ts/node | 0.46× [0.46–0.64] | 0.46× [0.46–0.47] | 0.43× [0.4–0.44] | 0.45× [0.14–0.47] | 0.43× [0.42–0.48] | 0.4× [0.36–0.41] | 0.46× [0.4–0.72] | 0.44× [0.43–0.47] | 0.46× [0.45–0.46] | 0.41× [0.4–0.42] |
| payload/masked/base64 | ts/node | 0.45× [0.41–0.46] | 0.45× [0.44–0.46] | 0.43× [0.41–0.45] | 0.45× [0.37–0.46] | 0.42× [0.41–0.43] | 0.4× [0.35–0.41] | 0.45× [0.44–0.62] | 0.43× [0.32–0.44] | 0.45× [0.41–0.48] | 0.4× [0.4–0.41] |
| plain/base32 | ts/node | 0.62× [0.6–1.1] unresolved | 0.64× [0.63–0.67] | 0.53× [0.49–0.56] | 0.68× [0.65–0.83] | 0.68× [0.6–0.89] | 0.54× [0.5–0.56] | 0.63× [0.51–0.75] | 0.53× [0.51–0.64] | 0.87× [0.54–0.89] | 0.56× [0.51–0.58] |
| plain/base64 | ts/node | 2.1× [2–3.8] | 2.1× [0.35–2.2] unresolved | 2× [1.8–2.2] | 2× [1.8–2.1] | 2.1× [2–2.2] | 1.4× [1.4–1.4] | 2.2× [0.9–2.7] unresolved | 2× [1.7–2.4] | 1.8× [1.6–1.9] | 1.6× [1.4–1.7] |
| rotation/previous-key | rust/native/release/fast-rng | 1.2× [1.2–1.8] | 1.2× [1.1–1.2] | 1.2× [1.1–1.2] | 1.1× [0.79–1.2] unresolved | 1.1× [1.1–1.2] | 1.1× [1–1.1] | 1.2× [1–1.6] | 1.2× [1.2–1.2] | 1.1× [1.1–1.2] | 1.1× [1.1–1.1] |
| sentinel/base32/canonical | ts/node | 0.17× [0.16–0.35] | 0.16× [0.14–0.17] | 0.12× [0.11–0.13] | 0.13× [0.11–0.14] | 0.14× [0.13–0.14] | 0.11× [0.094–0.12] | 0.16× [0.1–0.17] | 0.13× [0.12–0.16] | 0.12× [0.12–0.13] | 0.11× [0.1–0.12] |
| sentinel/base32/uppercase | ts/node | 0.34× [0.29–0.39] | 0.34× [0.085–0.35] | 0.27× [0.25–0.28] | 0.27× [0.26–0.28] | 0.28× [0.27–0.5] | 0.26× [0.25–0.27] | 0.33× [0.27–0.35] | 0.28× [0.25–0.34] | 0.31× [0.3–0.44] | 0.27× [0.13–0.28] |
| timestamp/extract/bytes | ts/node | 0.14× [0.12–0.15] | 0.13× [0.12–0.14] | 0.097× [0.095–0.1] | 0.099× [0.057–0.11] | 0.1× [0.099–0.11] | 0.062× [0.059–0.064] | 0.14× [0.13–0.15] | 0.11× [0.09–0.13] | 0.089× [0.053–0.1] | 0.087× [0.082–0.094] |
| timestamp/masked/base32 | ts/node | 0.71× [0.66–0.92] | 0.71× [0.7–0.72] | 0.64× [0.59–0.66] | 0.63× [0.59–0.65] | 0.64× [0.62–0.66] | 0.6× [0.52–0.61] | 0.7× [0.46–0.72] | 0.64× [0.62–0.65] | 0.68× [0.66–0.68] | 0.61× [0.61–0.63] |
| timestamp/masked/base64 | ts/node | 0.67× [0.61–0.68] | 0.67× [0.66–0.76] | 0.66× [0.63–0.66] | 0.65× [0.34–0.67] | 0.66× [0.65–1] unresolved | 0.61× [0.55–0.62] | 0.68× [0.67–0.78] | 0.66× [0.62–0.66] | 0.66× [0.64–0.69] | 0.61× [0.38–0.62] |
| timestamp/validate/uuid | rust/native/release/fast-rng | 2.6× [2.5–2.9] | 2.6× [2.6–2.6] | 2.2× [2.2–2.3] | 2.2× [1.9–2.3] | 2.4× [2.3–4.7] | 1.8× [1.6–2] | 2.6× [1–2.6] | 2.1× [1.8–3.1] | 2.1× [2–2.1] | 2× [0.98–2] unresolved |
| unmask/base32 | ts/node | 0.72× [0.6–0.81] | 0.72× [0.71–0.72] | 0.66× [0.65–0.67] | 0.66× [0.65–0.68] | 0.66× [0.31–0.67] | 0.62× [0.59–0.63] | 0.72× [0.71–0.96] | 0.67× [0.64–0.87] | 0.67× [0.66–0.93] | 0.63× [0.4–0.64] |
| unmask/base64 | ts/node | 0.7× [0.62–0.9] | 0.69× [0.68–0.71] | 0.69× [0.66–0.69] | 0.67× [0.65–1.1] unresolved | 0.67× [0.65–0.69] | 0.63× [0.59–0.64] | 0.7× [0.69–0.87] | 0.69× [0.68–0.91] | 0.67× [0.66–0.69] | 0.64× [0.62–0.65] |
| unmask/binary/caller-buffer | ts/node | 0.6× [0.58–0.61] | 0.59× [0.58–0.63] | 0.62× [0.6–0.64] | 0.6× [0.59–0.62] | 0.6× [0.58–0.61] | 0.55× [0.53–0.59] | 0.6× [0.59–0.9] | 0.62× [0.59–0.79] | 0.6× [0.59–0.61] | 0.56× [0.54–0.57] |
| unmask/binary/owned | ts/node | 0.62× [0.6–0.64] | 0.62× [0.6–0.65] | 0.63× [0.61–0.64] | 0.62× [0.62–0.65] | 0.62× [0.61–0.63] | 0.59× [0.56–0.62] | 0.64× [0.48–1.1] unresolved | 0.64× [0.61–0.82] | 0.63× [0.61–0.64] | 0.58× [0.14–0.6] |
| unmask/binary/text | ts/node | 0.69× [0.68–1.1] unresolved | 0.68× [0.54–0.71] | 0.69× [0.69–0.7] | 0.76× [0.68–0.77] | 0.72× [0.22–0.74] | 0.63× [0.58–0.68] | 0.7× [0.68–0.92] | 0.7× [0.66–0.89] | 0.75× [0.73–0.76] | 0.64× [0.6–0.67] |

## Rust browser WASM release/os-rng-no-std

| Caller job | Reference | rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-web | rust/wasm32-unknown-unknown/release/os-rng-no-std/workerd-node-compatible | rust/wasm32-unknown-unknown/release/os-rng-no-std/node | rust/wasm32-unknown-unknown/release/os-rng-no-std/node-22 | rust/wasm32-unknown-unknown/release/os-rng-no-std/node-24 | rust/wasm32-unknown-unknown/release/os-rng-no-std/bun | rust/wasm32-unknown-unknown/release/os-rng-no-std/deno | rust/wasm32-unknown-unknown/release/os-rng-no-std/chromium | rust/wasm32-unknown-unknown/release/os-rng-no-std/firefox | rust/wasm32-unknown-unknown/release/os-rng-no-std/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| async/future/cancelled | rust/native/release/fast-rng | 1.3× [0.49–1.4] unresolved | 1.3× [1.1–1.3] | 1.4× [1.3–1.9] | 1.6× [1.6–1.7] | 1.6× [1.6–1.7] | 1.4× [1.3–1.5] | 1.3× [1.3–1.7] | 1.4× [1.2–1.4] | 1.3× [1.3–1.3] | 1.3× [1.3–1.4] |
| async/future/derive/1 | rust/native/release/fast-rng | 0.98× [0.51–1.2] unresolved | 0.99× [0.94–1.5] unresolved | 0.95× [0.92–0.99] | 1× [1–1] | 1× [0.99–1] unresolved | 0.94× [0.89–1.3] unresolved | 0.96× [0.7–0.98] | 0.94× [0.9–0.96] | 1.1× [1–1.1] | 0.93× [0.92–0.96] |
| async/future/derive/64 | rust/native/release/fast-rng | 0.87× [0.39–0.91] | 0.88× [0.73–0.89] | 0.77× [0.64–0.79] | 0.89× [0.86–0.91] | 0.85× [0.84–0.87] | 0.71× [0.7–0.87] | 0.86× [0.77–0.87] | 0.82× [0.81–0.86] | 0.87× [0.87–0.88] | 0.72× [0.7–0.74] |
| bounds/one-millisecond | ts/node | 0.12× [0.12–0.17] | 0.12× [0.12–0.16] | 0.093× [0.09–0.13] | 0.092× [0.089–0.095] | 0.1× [0.1–0.11] | 0.077× [0.074–0.088] | 0.12× [0.069–0.12] | 0.091× [0.089–0.094] | 0.1× [0.097–0.1] | 0.093× [0.091–0.095] |
| bounds/range | ts/node | 0.12× [0.11–0.15] | 0.12× [0.11–0.15] | 0.094× [0.088–0.11] | 0.09× [0.087–0.094] | 0.1× [0.099–0.11] | 0.075× [0.062–0.098] | 0.11× [0.087–0.12] | 0.092× [0.089–0.094] | 0.097× [0.093–0.099] | 0.095× [0.09–0.096] |
| bytes/read | ts/node | 0.17× [0.17–0.25] | 0.2× [0.17–0.28] | 0.15× [0.14–0.15] | 0.13× [0.13–0.14] | 0.14× [0.14–0.15] | 0.092× [0.089–0.099] | 0.18× [0.14–0.18] | 0.13× [0.12–0.14] | 0.13× [0.13–0.13] | 0.13× [0.13–0.13] |
| bytes/write/offset | rust/native/release/fast-rng | 8.9× [8.6–13] | 9.4× [8.7–11] | 7.8× [7.6–7.9] | 8.3× [8.1–8.4] | 9.3× [2.7–9.5] | 7.1× [7–9] | 8.7× [6.1–8.8] | 7.2× [7–7.5] | 8.9× [8.9–9] | 8.1× [2.2–8.4] |
| construct/codec-precomputed-mask | ts/node | 0.14× [0.1–0.16] | 0.14× [0.14–0.17] | 0.11× [0.1–0.13] | 0.14× [0.12–0.15] | 0.12× [0.12–0.13] | 0.1× [0.089–0.12] | 0.13× [0.13–0.14] | 0.1× [0.098–0.11] | 0.13× [0.12–0.14] | 0.11× [0.088–0.11] |
| construct/custom-mask | rust/native/release/fast-rng | 1.8× [1.7–2.2] | 1.8× [1.7–2.1] | 1.7× [1.5–2.1] | 1.9× [1.7–2] | 1.8× [1.2–1.9] | 1.6× [1.2–1.7] | 1.7× [1.6–1.8] | 1.6× [1.4–1.7] | 1.5× [1.4–1.5] | 1.6× [1.5–1.7] |
| construct/generator | ts/node | 0.014× [0.011–0.018] | 0.014× [0.0091–0.014] | 0.0093× [0.009–0.01] | 0.0088× [0.0066–0.0092] | 0.0093× [0.0091–0.0096] | 0.0051× [0.005–0.0068] | 0.014× [0.011–0.014] | 0.0084× [0.0082–0.0088] | 0.0083× [0.0081–0.0086] | 0.0078× [0.0073–0.0082] |
| construct/mask | rust/native/release/fast-rng | 1× [0.98–1.1] unresolved | 1.1× [0.99–1.1] unresolved | 1× [1–1.1] | 1× [1–1.1] | 1× [1–1] | 1.1× [1.1–1.2] | 1.1× [1–1.1] | 1× [0.98–1] unresolved | 1.1× [1.1–1.2] | 1.1× [1–1.1] unresolved |
| construct/mask-iterated | rust/native/release/fast-rng | 1× [0.98–1.1] unresolved | 1× [0.88–1.4] unresolved | 1× [1–1.1] | 0.98× [0.97–1] unresolved | 1× [0.99–1] unresolved | 0.97× [0.94–1.2] unresolved | 1× [0.98–1.1] unresolved | 1× [0.7–1] unresolved | 1× [1–1.1] | 0.94× [0.8–0.95] |
| construct/migration | rust/native/release/fast-rng | 5.8× [5.7–6.9] | 5.8× [5.6–6.1] | 4.2× [4.1–5.8] | 4× [3.7–4.1] | 4.2× [4.2–4.2] | 2.2× [2–2.3] | 5.9× [5.8–6] | 4.2× [4.1–4.2] | 3.6× [3.6–3.7] | 3.3× [2.7–3.4] |
| construct/payload-layout | rust/native/release/fast-rng | 2.7× [2.1–3.2] | 2.7× [2.6–2.8] | 2.3× [2.3–2.4] | 2.3× [1.8–2.4] | 2.4× [2.4–2.5] | 1.8× [1.5–1.8] | 2.7× [2.4–2.8] | 2× [2–2] | 2.2× [2.1–2.2] | 2.2× [1.7–2.2] |
| construct/public-test-mask-and-codec | rust/native/release/fast-rng | 7.7× [7.4–8.7] | 7.5× [5.1–7.8] | 7.3× [6.8–10] | 7.6× [6.7–7.8] | 7.6× [7.4–7.8] | 7.3× [7.1–11] | 7.8× [5.7–8.1] | 7.7× [7–7.9] | 8.1× [7.5–8.3] | 7.5× [7.4–8.1] |
| construct/sentinels/1 | rust/native/release/fast-rng | 1.3× [1.2–1.3] | 1.5× [1.3–2] | 1.1× [1–1.6] | 1.3× [1.2–1.3] | 1.2× [1.1–1.3] | 1× [0.96–1.1] unresolved | 1.3× [1.3–1.3] | 1.1× [1.1–1.2] | 1.6× [1.5–1.6] | 1× [0.97–1] unresolved |
| construct/sentinels/16 | rust/native/release/fast-rng | 1.3× [1.1–1.6] | 1.3× [1.2–1.9] | 1.1× [1.1–1.3] | 1.2× [1.2–1.3] | 1.1× [1.1–1.2] | 0.98× [0.83–1.3] unresolved | 1.3× [1.1–1.3] | 1.1× [1.1–1.1] | 1.5× [1.4–1.5] | 0.97× [0.87–0.99] |
| construct/sentinels/4 | rust/native/release/fast-rng | 1.4× [1.2–1.5] | 1.4× [1.3–2] | 1.2× [1.1–1.9] | 1.2× [1.2–1.3] | 1.2× [1.2–1.3] | 1× [0.92–1.2] unresolved | 1.4× [1.1–1.4] | 1.2× [1.2–1.3] | 1.7× [1.6–1.7] | 1× [0.97–1.1] unresolved |
| construct/sentinels/64 | rust/native/release/fast-rng | 1.2× [0.94–1.6] unresolved | 1.2× [1.2–1.3] | 1× [1–1.1] | 1.1× [1–1.9] | 1× [1–1.1] | 0.87× [0.59–0.96] | 1.2× [0.96–1.3] unresolved | 1× [1–1.1] | 1.2× [1.2–1.2] | 0.88× [0.68–0.89] |
| decode/base32/caller-buffer | ts/node | 0.27× [0.25–0.44] | 0.27× [0.25–0.28] | 0.2× [0.19–0.23] | 0.21× [0.1–0.23] | 0.2× [0.18–0.2] | 0.18× [0.07–0.19] | 0.26× [0.15–0.27] | 0.2× [0.18–0.2] | 0.24× [0.22–0.25] | 0.18× [0.17–0.2] |
| decode/base32/owned | ts/node | 0.36× [0.35–0.52] | 0.37× [0.33–0.38] | 0.25× [0.2–0.26] | 0.29× [0.25–0.29] | 0.27× [0.25–0.27] | 0.25× [0.23–0.25] | 0.35× [0.28–0.37] | 0.26× [0.24–0.27] | 0.34× [0.31–0.35] | 0.25× [0.23–0.26] |
| decode/caller-buffer | ts/node | 0.26× [0.25–0.28] | 0.26× [0.19–0.29] | 0.21× [0.21–0.22] | 0.21× [0.19–0.21] | 0.21× [0.21–0.22] | 0.18× [0.15–0.21] | 0.25× [0.18–0.26] | 0.22× [0.21–0.23] | 0.21× [0.2–0.21] | 0.18× [0.17–0.19] |
| decode/owned | ts/node | 0.26× [0.26–0.33] | 0.26× [0.23–0.27] | 0.2× [0.19–0.21] | 0.21× [0.19–0.21] | 0.21× [0.2–0.21] | 0.19× [0.18–0.22] | 0.26× [0.14–0.26] | 0.21× [0.2–0.21] | 0.22× [0.21–0.22] | 0.19× [0.18–0.19] |
| failure/buffer-capacity | rust/native/release/fast-rng | 1.4× [1.4–1.9] | 1.4× [1.4–1.5] | 1.4× [1.3–1.6] | 1.6× [1.5–1.7] | 1.4× [1.4–1.4] | 1.2× [1.1–1.9] | 1.5× [1.4–1.5] | 1.4× [1.3–1.5] | 1.7× [1.6–1.7] | 1.1× [0.93–1.1] unresolved |
| failure/plain/base32 | rust/native/release/fast-rng | 1.6× [1.1–1.8] | 1.6× [1.1–1.8] | 1.6× [1.5–2.6] | 1.8× [1.7–1.9] | 1.7× [1.6–1.7] | 1.1× [0.91–1.3] unresolved | 1.7× [1.2–1.8] | 1.5× [1.5–1.6] | 1.8× [1.8–2] | 1.1× [0.98–1.1] unresolved |
| failure/plain/base64 | rust/native/release/fast-rng | 1.5× [1.2–1.6] | 1.6× [1.5–1.8] | 1.7× [1.5–1.7] | 1.7× [1.6–1.8] | 1.6× [1.5–1.8] | 1.1× [1.1–1.5] | 1.6× [1.3–1.7] | 1.6× [1.4–1.7] | 1.7× [1.7–1.9] | 1× [1–1.1] unresolved |
| failure/uuid-parse | ts/node | 0.0053× [0.0045–0.0065] | 0.0053× [0.005–0.0055] | 0.0051× [0.0048–0.0054] | 0.0062× [0.0058–0.0065] | 0.0055× [0.0054–0.0056] | 0.0044× [0.0043–0.0047] | 0.0046× [0.0044–0.0049] | 0.0048× [0.0047–0.0048] | 0.0051× [0.005–0.0053] | 0.0043× [0.0042–0.0044] |
| format/uuid/lowercase | ts/node | 0.62× [0.59–1.1] unresolved | 0.58× [0.54–0.76] | 0.55× [0.41–0.56] | 0.66× [0.61–0.7] | 0.64× [0.59–0.66] | 0.53× [0.46–0.83] | 0.59× [0.37–0.62] | 0.57× [0.54–0.6] | 0.61× [0.58–0.63] | 0.56× [0.51–0.58] |
| format/uuid/uppercase | ts/node | 0.57× [0.55–0.63] | 0.55× [0.48–0.57] | 0.56× [0.51–0.58] | 0.62× [0.61–0.64] | 0.59× [0.56–0.59] | 0.51× [0.35–0.6] | 0.53× [0.39–0.54] | 0.57× [0.53–0.57] | 0.6× [0.58–0.61] | 0.52× [0.48–0.54] |
| generation/v4/base32hex | ts/node | 1.9× [1.9–4.8] | 1.9× [1.9–2.8] | 5.9× [5.7–6.1] | 11× [11–12] | 12× [11–12] | 1.2× [1.1–1.3] | 2.1× [1.6–2.1] | 7.2× [7–7.5] | 6.4× [6.2–6.5] | 5.3× [5.2–5.4] |
| generation/v4/base64url | ts/node | 2.5× [1.8–3.2] | 2.5× [2.4–3.7] | 6.8× [6.6–7] | 13× [12–14] | 13× [12–13] | 1.4× [1.2–1.9] | 2.6× [1.9–2.9] | 8.3× [7.7–8.5] | 7.3× [7.3–7.7] | 6.1× [5.8–6.3] |
| generation/v4/bytes | ts/node | 1.5× [1.5–1.8] | 1.5× [1.5–2.4] | 6.3× [6–6.6] | 12× [12–12] | 12× [12–13] | 0.82× [0.79–1.3] unresolved | 1.8× [1.4–1.9] | 7.8× [6.8–8.2] | 6.4× [6.2–6.5] | 5.3× [5.2–5.5] |
| generation/v4/caller-buffer-custom-entropy | rust/native/release/fast-rng | 0.078× [0.063–0.089] | 0.079× [0.076–0.15] | 0.32× [0.31–0.56] | 0.6× [0.6–0.98] | 0.6× [0.58–0.62] | 0.043× [0.041–0.05] | 0.093× [0.078–0.094] | 0.38× [0.38–0.4] | 0.32× [0.32–0.33] | 0.28× [0.27–0.28] |
| generation/v4/text | ts/node | 1.7× [1.6–2.8] | 1.7× [1.6–2.7] | 5.4× [5.2–5.6] | 10× [9.7–11] | 10× [10–11] | 1.1× [1.1–1.9] | 1.9× [1.6–2] | 6.9× [5.4–7.1] | 5.8× [5.7–6.1] | 4.9× [4.7–5.1] |
| generation/v7/caller-buffer-custom-entropy | rust/native/release/fast-rng | 0.099× [0.067–0.12] | 0.1× [0.095–0.16] | 0.39× [0.37–0.52] | 0.73× [0.71–0.93] | 0.72× [0.7–0.76] | 0.056× [0.054–0.081] | 0.11× [0.08–0.11] | 0.46× [0.46–0.48] | 0.33× [0.33–0.33] | 0.16× [0.16–0.17] |
| generation/v7/custom-entropy | rust/native/release/fast-rng | 0.099× [0.069–0.11] | 0.1× [0.098–0.1] | 0.39× [0.37–0.55] | 0.72× [0.71–1] unresolved | 0.72× [0.7–0.75] | 0.054× [0.052–0.063] | 0.11× [0.09–0.11] | 0.45× [0.45–0.46] | 0.33× [0.32–0.33] | 0.16× [0.16–0.16] |
| generation/v7/fraction12-custom-entropy | rust/native/release/fast-rng | 0.1× [0.064–0.12] | 0.1× [0.097–0.1] | 0.38× [0.34–0.66] | 0.73× [0.71–0.97] | 0.72× [0.71–0.75] | 0.054× [0.044–0.063] | 0.11× [0.1–0.11] | 0.46× [0.45–0.48] | 0.33× [0.32–0.33] | 0.16× [0.15–0.16] |
| inspect/v4 | rust/native/release/fast-rng | 6.1× [5.9–6.6] | 6× [5.2–6.2] | 4.8× [4.2–4.8] | 4.7× [4.2–4.9] | 4.8× [4.8–4.9] | 1.9× [1.4–2.9] | 5.9× [4.3–6] | 3.7× [3.6–3.9] | 3.6× [3.5–3.6] | 3.2× [3.1–3.3] |
| inspect/v7 | rust/native/release/fast-rng | 6.1× [5.9–7.4] | 6× [4.7–6.2] | 4.8× [4.6–5.1] | 4.7× [4.3–4.8] | 4.8× [4.7–4.9] | 1.9× [1.9–2.6] | 5.9× [3.7–6] | 3.7× [3.6–3.9] | 3.6× [3.5–3.6] | 3.2× [3.2–3.3] |
| inspect/variant | rust/native/release/fast-rng | 5.1× [4.9–6] | 5.1× [4.9–6.2] | 3.8× [3.5–3.9] | 3.7× [3.4–3.8] | 3.7× [3.6–3.7] | 2.8× [2.4–3.1] | 4.9× [2.8–5.1] | 3.7× [3.6–4] | 3.7× [3.6–3.7] | 3.3× [3.3–3.4] |
| inspect/version | rust/native/release/fast-rng | 5.5× [5.4–7.1] | 5.5× [5.3–5.6] | 4.7× [4.6–4.9] | 4.7× [4.5–4.7] | 4.7× [4.7–4.9] | 2.2× [1.6–2.4] | 5.5× [2.8–5.5] | 3.6× [3.5–3.9] | 3.4× [3.4–3.4] | 3.1× [3.1–3.2] |
| mask/base32 | ts/node | 0.97× [0.96–1.1] unresolved | 0.98× [0.95–1] unresolved | 0.93× [0.85–0.95] | 0.95× [0.93–0.96] | 1× [0.98–1] unresolved | 0.87× [0.85–0.91] | 0.96× [0.94–0.97] | 0.95× [0.91–0.97] | 1.1× [1.1–1.2] | 0.89× [0.86–0.93] |
| mask/base32/sentinels | ts/node | 0.9× [0.3–0.95] | 0.9× [0.88–0.98] | 0.85× [0.75–0.89] | 0.87× [0.86–0.88] | 0.92× [0.9–0.94] | 0.78× [0.68–0.85] | 0.88× [0.69–0.97] | 0.87× [0.85–0.88] | 1× [1–1.1] | 0.8× [0.77–0.81] |
| mask/base64 | ts/node | 1.1× [1.1–1.3] | 1.1× [1–1.1] | 0.97× [0.62–0.99] | 1.1× [0.93–1.1] unresolved | 1.1× [1–1.1] | 0.93× [0.91–4.4] unresolved | 1× [0.58–1] unresolved | 0.99× [0.98–1] unresolved | 1.2× [1.2–1.2] | 0.95× [0.92–0.99] |
| mask/binary/caller-buffer | ts/node | 0.7× [0.68–0.86] | 0.69× [0.68–0.7] | 0.65× [0.4–0.77] | 0.67× [0.65–0.75] | 0.67× [0.66–0.76] | 0.66× [0.63–0.74] | 0.69× [0.68–0.71] | 0.67× [0.58–0.76] | 0.69× [0.68–0.79] | 0.65× [0.63–0.71] |
| mask/binary/owned | ts/node | 0.72× [0.72–0.9] | 0.72× [0.72–1.1] unresolved | 0.71× [0.67–0.98] | 0.7× [0.69–0.74] | 0.71× [0.7–0.71] | 0.68× [0.61–0.8] | 0.73× [0.48–0.74] | 0.72× [0.71–0.73] | 0.74× [0.72–0.75] | 0.69× [0.68–0.72] |
| migration/candidates | rust/native/release/fast-rng | 1.1× [1–1.4] | 1.1× [1.1–1.4] | 1.1× [0.99–1.1] unresolved | 1.1× [1–1.1] | 1.1× [1.1–1.1] | 1× [0.73–1.1] unresolved | 1.1× [0.7–1.1] unresolved | 1.1× [1.1–1.1] | 1.1× [1–1.1] | 1× [1–1.1] |
| migration/candidates-text | ts/node | 0.64× [0.59–0.97] | 0.62× [0.38–0.73] | 0.59× [0.55–0.7] | 0.61× [0.58–0.68] | 0.59× [0.56–0.71] | 0.56× [0.48–0.67] | 0.6× [0.43–0.74] | 0.6× [0.56–0.7] | 0.65× [0.62–0.78] | 0.58× [0.53–0.69] |
| migration/first | rust/native/release/fast-rng | 1.2× [1.2–2.2] | 1.2× [1.2–1.6] | 1.2× [1.2–1.5] | 1.2× [1.2–1.2] | 1.2× [1.2–1.2] | 1.1× [0.8–1.1] unresolved | 1.2× [0.8–1.2] unresolved | 1.2× [1.2–1.3] | 1.2× [1.2–1.2] | 1.1× [1–1.2] |
| migration/first-text | ts/node | 0.58× [0.46–0.99] | 0.58× [0.56–0.61] | 0.56× [0.55–0.57] | 0.59× [0.5–0.6] | 0.58× [0.58–0.59] | 0.54× [0.53–0.58] | 0.57× [0.47–0.57] | 0.57× [0.56–0.6] | 0.62× [0.62–0.63] | 0.55× [0.53–0.56] |
| parse/braced | rust/native/release/fast-rng | 2.3× [2.1–3] | 2.3× [1.9–2.4] | 1.9× [1.8–1.9] | 2× [1.9–2] | 1.9× [1.8–1.9] | 2.2× [2.1–2.7] | 2.3× [1.3–2.3] | 1.9× [1.9–1.9] | 2.1× [2.1–2.2] | 2.3× [2.2–2.4] |
| parse/compact | ts/node | 0.56× [0.52–0.62] | 0.56× [0.54–0.79] | 0.45× [0.44–0.52] | 0.49× [0.47–0.51] | 0.46× [0.44–0.49] | 0.53× [0.51–0.83] | 0.56× [0.46–0.59] | 0.47× [0.45–0.51] | 0.5× [0.48–0.52] | 0.54× [0.53–0.57] |
| parse/keyed/base32 | ts/node | 0.54× [0.44–0.59] | 0.54× [0.53–0.56] | 0.48× [0.48–0.5] | 0.48× [0.48–0.49] | 0.48× [0.47–0.49] | 0.49× [0.33–0.97] | 0.54× [0.43–0.55] | 0.48× [0.48–0.5] | 0.53× [0.53–0.53] | 0.49× [0.47–0.52] |
| parse/keyed/base64 | ts/node | 0.52× [0.4–0.55] | 0.53× [0.51–0.66] | 0.51× [0.5–0.61] | 0.48× [0.48–0.49] | 0.49× [0.48–0.5] | 0.47× [0.39–0.49] | 0.53× [0.41–0.53] | 0.49× [0.49–0.51] | 0.49× [0.48–0.5] | 0.47× [0.46–0.47] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.3× [0.94–1.5] unresolved | 1.3× [1.3–1.4] | 1× [0.98–1.3] unresolved | 1.1× [1.1–1.2] | 1× [1–1] | 1.2× [1.2–1.3] | 1.3× [0.74–1.3] unresolved | 1× [0.99–1] unresolved | 1.4× [1.3–1.4] | 1.2× [1.2–1.3] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [1–1.3] | 1.3× [1.2–1.5] | 0.99× [0.98–1.1] unresolved | 1.1× [1–1.1] | 1× [1–1] | 1.2× [0.81–1.2] unresolved | 1.3× [0.95–1.3] unresolved | 1× [1–1] unresolved | 1.2× [1.2–1.2] | 1.1× [1.1–1.2] |
| parse/universal | rust/native/release/fast-rng | 2.4× [2.2–3] | 2.4× [2.4–3.1] | 1.9× [1.6–2] | 2.1× [2–2.2] | 2× [1.8–2] | 2.3× [2.2–2.8] | 2.4× [2.3–2.4] | 2× [1.9–2.1] | 2.2× [2.2–2.2] | 2.3× [2.3–2.5] |
| parse/urn | rust/native/release/fast-rng | 2.1× [2–2.4] | 2.2× [2.1–2.7] | 1.7× [1.7–1.9] | 1.9× [1.8–1.9] | 1.8× [1.7–1.8] | 2.1× [1.6–2.2] | 2.1× [2.1–2.1] | 1.7× [1.7–1.8] | 1.9× [1.9–1.9] | 2.1× [2–2.2] |
| parse/uuid | ts/node | 0.5× [0.41–0.51] | 0.51× [0.5–0.61] | 0.42× [0.4–0.44] | 0.45× [0.34–0.46] | 0.43× [0.41–0.45] | 0.48× [0.43–0.49] | 0.5× [0.3–1.4] unresolved | 0.42× [0.42–0.43] | 0.45× [0.44–0.46] | 0.5× [0.16–0.52] |
| payload/extract/bytes | ts/node | 0.12× [0.12–0.15] | 0.12× [0.11–0.13] | 0.11× [0.11–0.12] | 0.1× [0.098–0.1] | 0.096× [0.093–0.099] | 0.086× [0.084–0.09] | 0.11× [0.084–0.11] | 0.11× [0.11–0.12] | 0.081× [0.08–0.084] | 0.094× [0.089–0.099] |
| payload/masked/base32 | ts/node | 0.5× [0.22–0.56] | 0.5× [0.45–0.51] | 0.47× [0.46–0.51] | 0.45× [0.45–0.49] | 0.46× [0.45–0.46] | 0.42× [0.39–1.5] unresolved | 0.49× [0.4–0.5] | 0.46× [0.45–0.47] | 0.46× [0.45–0.46] | 0.43× [0.42–0.43] |
| payload/masked/base64 | ts/node | 0.48× [0.33–0.57] | 0.49× [0.29–0.52] | 0.47× [0.46–0.51] | 0.45× [0.44–0.46] | 0.46× [0.45–0.47] | 0.4× [0.32–0.42] | 0.48× [0.33–0.49] | 0.46× [0.45–0.47] | 0.45× [0.44–0.46] | 0.42× [0.41–0.43] |
| plain/base32 | ts/node | 0.68× [0.66–0.76] | 0.66× [0.64–0.76] | 0.53× [0.49–0.56] | 0.65× [0.59–0.68] | 0.63× [0.61–0.65] | 0.54× [0.52–0.57] | 0.62× [0.52–0.67] | 0.54× [0.53–0.55] | 0.87× [0.84–0.9] | 0.56× [0.54–0.57] |
| plain/base64 | ts/node | 2.1× [1.9–2.6] | 2.2× [2.1–3.5] | 2× [1.9–2.1] | 2× [1.9–2.1] | 2.1× [1.8–2.1] | 1.3× [1.3–1.4] | 2.1× [1.2–2.2] | 2× [1.8–2] | 1.7× [1.7–1.9] | 1.6× [1.5–1.7] |
| rotation/previous-key | rust/native/release/fast-rng | 1.2× [0.95–1.4] unresolved | 1.2× [1.1–1.4] | 1.2× [1.1–2] | 1.1× [1.1–1.1] | 1.1× [1.1–1.2] | 1.1× [1.1–4.5] | 1.2× [0.99–1.2] unresolved | 1.2× [1.1–1.2] | 1.1× [1.1–1.2] | 1.1× [1.1–1.1] |
| sentinel/base32/canonical | ts/node | 0.17× [0.16–0.23] | 0.17× [0.078–0.18] | 0.12× [0.095–0.13] | 0.13× [0.12–0.14] | 0.14× [0.13–0.14] | 0.092× [0.062–0.11] | 0.17× [0.1–0.17] | 0.12× [0.12–0.13] | 0.12× [0.12–0.12] | 0.12× [0.11–0.12] |
| sentinel/base32/uppercase | ts/node | 0.34× [0.26–0.41] | 0.34× [0.33–0.37] | 0.27× [0.26–0.28] | 0.28× [0.25–0.28] | 0.28× [0.28–0.29] | 0.27× [0.24–0.32] | 0.34× [0.2–0.35] | 0.28× [0.27–0.29] | 0.3× [0.29–0.31] | 0.27× [0.097–0.28] |
| timestamp/extract/bytes | ts/node | 0.14× [0.13–0.15] | 0.15× [0.13–0.16] | 0.1× [0.093–0.13] | 0.1× [0.089–0.11] | 0.1× [0.096–0.11] | 0.06× [0.058–0.066] | 0.14× [0.12–0.15] | 0.11× [0.1–0.12] | 0.091× [0.087–0.098] | 0.084× [0.08–0.091] |
| timestamp/masked/base32 | ts/node | 0.7× [0.43–0.76] | 0.72× [0.68–0.72] | 0.65× [0.62–0.67] | 0.64× [0.63–0.69] | 0.63× [0.62–0.65] | 0.6× [0.42–1] unresolved | 0.71× [0.52–0.71] | 0.64× [0.62–0.65] | 0.67× [0.66–0.68] | 0.61× [0.6–0.62] |
| timestamp/masked/base64 | ts/node | 0.67× [0.48–0.87] | 0.68× [0.66–0.77] | 0.68× [0.66–1] unresolved | 0.65× [0.64–0.67] | 0.66× [0.65–0.67] | 0.61× [0.49–0.69] | 0.67× [0.49–0.68] | 0.66× [0.66–0.67] | 0.66× [0.65–0.67] | 0.62× [0.61–0.63] |
| timestamp/validate/uuid | rust/native/release/fast-rng | 2.7× [1.2–2.8] | 2.7× [2–2.8] | 2.2× [2.1–2.3] | 2.2× [2.1–2.3] | 2.4× [2.3–2.5] | 1.7× [1.3–1.9] | 2.8× [2.1–2.8] | 2.1× [2–2.2] | 2.1× [2–2.1] | 2× [2–2.1] |
| unmask/base32 | ts/node | 0.72× [0.68–0.86] | 0.72× [0.72–0.73] | 0.66× [0.62–0.67] | 0.65× [0.65–0.66] | 0.66× [0.65–0.67] | 0.62× [0.61–0.65] | 0.71× [0.67–0.72] | 0.66× [0.66–0.69] | 0.67× [0.66–0.67] | 0.62× [0.61–0.65] |
| unmask/base64 | ts/node | 0.69× [0.67–0.7] | 0.69× [0.3–0.71] | 0.68× [0.61–0.7] | 0.67× [0.63–0.68] | 0.67× [0.67–0.69] | 0.64× [0.63–0.65] | 0.69× [0.57–0.71] | 0.68× [0.68–0.7] | 0.67× [0.66–0.69] | 0.65× [0.61–0.68] |
| unmask/binary/caller-buffer | ts/node | 0.6× [0.59–0.61] | 0.6× [0.59–0.99] | 0.61× [0.58–0.62] | 0.6× [0.58–0.63] | 0.6× [0.59–0.61] | 0.55× [0.54–0.69] | 0.59× [0.46–0.61] | 0.61× [0.6–0.63] | 0.6× [0.59–0.61] | 0.56× [0.55–0.59] |
| unmask/binary/owned | ts/node | 0.62× [0.55–0.66] | 0.63× [0.61–0.66] | 0.63× [0.48–0.65] | 0.62× [0.4–0.63] | 0.62× [0.61–0.63] | 0.58× [0.57–0.61] | 0.62× [0.46–0.63] | 0.63× [0.62–0.64] | 0.63× [0.62–0.64] | 0.58× [0.56–0.62] |
| unmask/binary/text | ts/node | 0.71× [0.64–0.77] | 0.71× [0.7–1.3] unresolved | 0.71× [0.45–0.72] | 0.75× [0.64–0.79] | 0.74× [0.73–0.74] | 0.65× [0.64–0.69] | 0.69× [0.56–0.71] | 0.73× [0.72–0.74] | 0.75× [0.74–0.76] | 0.67× [0.65–0.69] |

## Rust browser WASM release/std

| Caller job | Reference | rust/wasm32-unknown-unknown/release/std/workerd-web | rust/wasm32-unknown-unknown/release/std/workerd-node-compatible | rust/wasm32-unknown-unknown/release/std/node | rust/wasm32-unknown-unknown/release/std/node-22 | rust/wasm32-unknown-unknown/release/std/node-24 | rust/wasm32-unknown-unknown/release/std/bun | rust/wasm32-unknown-unknown/release/std/deno | rust/wasm32-unknown-unknown/release/std/chromium | rust/wasm32-unknown-unknown/release/std/firefox | rust/wasm32-unknown-unknown/release/std/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| async/future/cancelled | rust/native/release/fast-rng | 1.3× [1.3–1.8] | 1.3× [0.65–1.8] unresolved | 1.4× [1.4–1.4] | 1.6× [1.5–1.7] | 1.6× [1.6–1.7] | 1.4× [1.3–1.4] | 1.3× [1.2–1.3] | 1.4× [1.3–1.4] | 1.4× [1.3–1.4] | 1.3× [1.3–1.4] |
| async/future/derive/1 | rust/native/release/fast-rng | 0.96× [0.95–1.1] unresolved | 0.98× [0.94–1.3] unresolved | 0.93× [0.91–0.96] | 1× [1–1] | 1× [0.98–1.4] unresolved | 0.92× [0.91–0.93] | 1× [0.96–2.9] unresolved | 0.93× [0.71–0.94] | 1.1× [1–1.1] | 0.93× [0.73–0.94] |
| async/future/derive/64 | rust/native/release/fast-rng | 0.88× [0.85–1.1] unresolved | 0.88× [0.85–1.1] unresolved | 0.77× [0.76–0.78] | 0.89× [0.88–0.9] | 0.85× [0.85–0.87] | 0.74× [0.71–0.76] | 0.84× [0.81–1.5] unresolved | 0.82× [0.81–0.82] | 0.85× [0.84–1] unresolved | 0.71× [0.71–0.71] |
| bounds/one-millisecond | ts/node | 0.13× [0.12–0.18] | 0.12× [0.12–0.12] | 0.09× [0.087–0.096] | 0.094× [0.092–0.096] | 0.1× [0.098–0.11] | 0.074× [0.073–0.076] | 0.11× [0.11–0.13] | 0.091× [0.089–0.092] | 0.099× [0.09–0.1] | 0.09× [0.086–0.092] |
| bounds/range | ts/node | 0.13× [0.12–0.17] | 0.12× [0.11–0.15] | 0.091× [0.088–0.095] | 0.092× [0.088–0.094] | 0.1× [0.097–0.1] | 0.075× [0.073–0.077] | 0.11× [0.11–0.12] | 0.091× [0.09–0.093] | 0.097× [0.091–0.1] | 0.092× [0.076–0.094] |
| bytes/read | ts/node | 0.19× [0.19–0.23] | 0.18× [0.17–0.36] | 0.15× [0.15–0.15] | 0.13× [0.13–0.15] | 0.14× [0.14–0.15] | 0.092× [0.089–0.095] | 0.17× [0.17–0.2] | 0.13× [0.13–0.13] | 0.13× [0.13–0.14] | 0.13× [0.12–0.13] |
| bytes/write/offset | rust/native/release/fast-rng | 9.9× [9.6–10] | 9.2× [9.1–12] | 7.5× [7.1–7.7] | 8.3× [8.1–8.4] | 9.3× [9.2–9.5] | 7.2× [6.9–7.2] | 9.3× [9.1–13] | 7.3× [7.1–7.7] | 9× [4.8–9] | 8× [7.7–8.1] |
| construct/codec-precomputed-mask | ts/node | 0.15× [0.14–0.24] | 0.14× [0.14–0.22] | 0.11× [0.1–0.12] | 0.14× [0.14–0.16] | 0.12× [0.11–0.12] | 0.097× [0.082–0.1] | 0.13× [0.11–0.2] | 0.11× [0.092–0.11] | 0.12× [0.12–0.13] | 0.11× [0.07–0.11] |
| construct/custom-mask | rust/native/release/fast-rng | 1.8× [1.7–2] | 1.7× [1.6–2.1] | 1.6× [1.5–1.7] | 1.8× [1.8–1.9] | 1.7× [1.2–1.8] | 1.6× [1.5–1.6] | 1.6× [1.1–1.7] | 1.7× [1.6–1.8] | 1.4× [1.3–2.2] | 1.6× [0.85–1.7] unresolved |
| construct/generator | ts/node | 0.016× [0.013–0.022] | 0.014× [0.014–0.025] | 0.0092× [0.0091–0.0094] | 0.0088× [0.0085–0.0092] | 0.0093× [0.009–0.0097] | 0.0051× [0.005–0.0053] | 0.014× [0.012–0.018] | 0.0083× [0.0082–0.0086] | 0.0084× [0.0082–0.0088] | 0.0078× [0.0075–0.0081] |
| construct/mask | rust/native/release/fast-rng | 1.1× [1–1.7] | 1× [1–2.3] | 1× [1–1] | 1× [1–1.2] | 1× [1–1.1] | 1.1× [1.1–1.1] | 1.1× [1–1.1] | 1× [1–1] | 1.1× [1.1–1.2] | 1.1× [1–1.1] |
| construct/mask-iterated | rust/native/release/fast-rng | 0.99× [0.96–1.3] unresolved | 0.99× [0.97–2] unresolved | 1× [1–1.1] unresolved | 0.98× [0.97–1] unresolved | 1× [0.99–1] unresolved | 0.95× [0.87–0.95] | 1× [0.99–1] unresolved | 1× [1–1] unresolved | 1× [0.48–1] unresolved | 0.94× [0.91–0.95] |
| construct/migration | rust/native/release/fast-rng | 6.8× [6.6–7.7] | 6× [5.9–6.1] | 4.1× [4.1–4.2] | 4× [4–5.9] | 4.2× [4.1–4.4] | 2.2× [2.1–2.2] | 5.9× [5.8–8.7] | 4.6× [3.8–4.7] | 3.6× [3.6–3.7] | 3.4× [1.4–3.4] |
| construct/payload-layout | rust/native/release/fast-rng | 2.9× [2.7–4.2] | 2.7× [2.7–5.8] | 2.3× [2.3–2.4] | 2.4× [2.3–2.4] | 2.5× [2.4–2.6] | 1.9× [1.9–1.9] | 2.6× [2.6–3.2] | 2× [1.9–2.1] | 2.1× [1.2–2.2] | 2.1× [2–2.2] |
| construct/public-test-mask-and-codec | rust/native/release/fast-rng | 1× [0.94–1.3] unresolved | 1× [0.92–1.7] unresolved | 0.96× [0.86–1] unresolved | 1.2× [1–1.3] | 1.1× [1.1–1.1] | 1× [0.99–1.2] unresolved | 1.1× [0.74–1.2] unresolved | 0.93× [0.87–1] unresolved | 1.1× [1.1–1.2] | 1.1× [1–1.1] |
| construct/sentinels/1 | rust/native/release/fast-rng | 1.4× [1.3–2] | 1.3× [1.3–1.4] | 1.1× [1–1.2] | 1.3× [1.3–1.3] | 1.3× [1.2–1.3] | 1× [1–1.1] | 1.3× [1.2–1.6] | 1.1× [1.1–1.1] | 1.6× [1.4–1.6] | 1× [0.93–1] unresolved |
| construct/sentinels/16 | rust/native/release/fast-rng | 1.4× [1.3–1.5] | 1.3× [1.3–1.6] | 1.1× [1–1.1] unresolved | 1.2× [1.2–1.2] | 1.1× [1.1–1.1] | 0.97× [0.95–1] | 1.3× [1.3–1.4] | 1.1× [0.82–1.1] unresolved | 1.5× [1.4–2.8] | 0.97× [0.94–0.98] |
| construct/sentinels/4 | rust/native/release/fast-rng | 1.5× [1.4–2] | 1.4× [1.4–1.6] | 1.2× [1.1–1.2] | 1.3× [1.2–1.5] | 1.3× [1.2–1.3] | 1.1× [1–1.1] | 1.4× [0.98–2.6] unresolved | 1.1× [1.1–1.2] | 1.7× [1.4–1.7] | 1× [0.68–1] unresolved |
| construct/sentinels/64 | rust/native/release/fast-rng | 1.3× [1.1–1.7] | 1.2× [1.2–1.6] | 1× [0.84–1] unresolved | 1.1× [1.1–1.1] | 1× [0.96–1] unresolved | 0.89× [0.87–0.89] | 1.2× [0.78–1.3] unresolved | 1× [0.98–1] unresolved | 1.2× [0.87–1.2] unresolved | 0.89× [0.84–0.9] |
| decode/base32/caller-buffer | ts/node | 0.25× [0.24–0.28] | 0.26× [0.24–0.28] | 0.2× [0.18–0.2] | 0.21× [0.19–0.32] | 0.2× [0.18–0.21] | 0.19× [0.17–0.2] | 0.25× [0.21–0.26] | 0.21× [0.19–0.21] | 0.24× [0.22–0.28] | 0.19× [0.17–0.19] |
| decode/base32/owned | ts/node | 0.35× [0.32–0.36] | 0.36× [0.35–0.36] | 0.26× [0.23–0.26] | 0.27× [0.25–0.28] | 0.27× [0.24–0.27] | 0.25× [0.24–0.27] | 0.36× [0.27–0.44] | 0.26× [0.25–0.27] | 0.34× [0.31–0.37] | 0.25× [0.24–0.27] |
| decode/caller-buffer | ts/node | 0.25× [0.23–0.47] | 0.26× [0.25–0.29] | 0.21× [0.21–0.22] | 0.2× [0.19–0.21] | 0.21× [0.21–0.22] | 0.18× [0.18–0.2] | 0.26× [0.2–0.52] | 0.22× [0.21–0.24] | 0.22× [0.21–0.23] | 0.18× [0.18–0.19] |
| decode/owned | ts/node | 0.26× [0.24–0.31] | 0.26× [0.25–0.41] | 0.21× [0.2–0.21] | 0.2× [0.2–0.21] | 0.21× [0.2–0.21] | 0.19× [0.18–0.19] | 0.26× [0.23–0.3] | 0.21× [0.2–0.25] | 0.22× [0.21–0.28] | 0.18× [0.18–0.19] |
| failure/buffer-capacity | rust/native/release/fast-rng | 1.5× [1.3–2] | 1.4× [1.3–3] | 1.3× [1.3–1.4] | 1.6× [1.6–2.2] | 1.4× [1.3–1.4] | 1.2× [1.1–1.2] | 1.5× [1.4–1.6] | 1.4× [1.3–1.4] | 1.6× [1.3–1.7] | 1.1× [1.1–1.1] |
| failure/plain/base32 | rust/native/release/fast-rng | 1.7× [1.6–1.8] | 1.7× [1.6–2.7] | 1.6× [1.5–1.6] | 1.7× [1.5–1.8] | 1.6× [1.5–1.7] | 1.1× [1.1–1.2] | 1.6× [1–1.8] unresolved | 1.5× [1.5–1.7] | 1.8× [1.4–1.9] | 1.1× [1–1.2] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.7× [1.6–2.1] | 1.7× [1.6–1.8] | 1.7× [1.6–1.7] | 1.7× [1.6–1.8] | 1.6× [1.5–1.7] | 1.2× [1.1–1.2] | 1.6× [1.6–1.7] | 1.6× [1.4–1.6] | 1.7× [1.7–3.3] | 1.1× [1.1–1.2] |
| failure/uuid-parse | ts/node | 0.0053× [0.0051–0.0078] | 0.0053× [0.0051–0.0083] | 0.0052× [0.005–0.0053] | 0.0062× [0.0061–0.0064] | 0.0055× [0.0053–0.0058] | 0.0045× [0.0042–0.0047] | 0.0047× [0.0045–0.0099] | 0.0047× [0.0045–0.0049] | 0.0051× [0.0038–0.0053] | 0.0042× [0.004–0.0044] |
| format/uuid/lowercase | ts/node | 0.59× [0.43–0.87] | 0.6× [0.59–0.73] | 0.55× [0.53–0.57] | 0.65× [0.61–0.7] | 0.66× [0.6–0.67] | 0.53× [0.51–0.54] | 0.6× [0.57–0.65] | 0.6× [0.57–0.62] | 0.62× [0.54–0.88] | 0.55× [0.53–0.64] |
| format/uuid/uppercase | ts/node | 0.56× [0.54–0.58] | 0.54× [0.53–0.6] | 0.57× [0.53–0.58] | 0.62× [0.58–0.63] | 0.59× [0.55–0.63] | 0.51× [0.48–0.56] | 0.58× [0.55–0.72] | 0.57× [0.54–0.59] | 0.61× [0.59–0.87] | 0.51× [0.47–0.51] |
| inspect/v4 | rust/native/release/fast-rng | 7.5× [6.5–9.8] | 6.5× [4.5–8.3] | 4.8× [4.8–4.9] | 4.7× [4.3–4.8] | 4.8× [4.6–4.8] | 1.9× [1.9–2.1] | 6.3× [3.1–6.5] | 3.7× [3.7–3.9] | 3.6× [3.4–3.6] | 3.3× [3.1–3.3] |
| inspect/v7 | rust/native/release/fast-rng | 7.5× [6.5–8.7] | 6.6× [6.5–8.9] | 4.8× [4.7–4.9] | 4.7× [4.4–4.8] | 4.8× [4.7–4.8] | 1.9× [1.9–2.1] | 6.1× [5.6–6.3] | 3.7× [3.6–3.9] | 3.5× [3.1–3.6] | 3.2× [3.2–3.3] |
| inspect/variant | rust/native/release/fast-rng | 5.9× [5–6.8] | 5.2× [5.1–5.3] | 3.6× [3.5–3.6] | 3.5× [3.4–3.6] | 3.5× [3.2–3.6] | 2.8× [2.7–2.8] | 5.1× [4.8–5.2] | 4.1× [4–4.1] | 3.6× [3.4–3.7] | 3.3× [3.1–3.3] |
| inspect/version | rust/native/release/fast-rng | 6.1× [5.6–6.5] | 5.6× [5.5–6.6] | 4.8× [4.8–4.9] | 4.8× [4.7–4.8] | 4.8× [4.8–4.9] | 2.2× [2.2–2.3] | 6× [6–6.5] | 3.6× [3.6–3.8] | 3.4× [3.4–3.6] | 3.1× [3.1–3.1] |
| mask/base32 | ts/node | 0.96× [0.87–1.6] unresolved | 0.98× [0.93–1.2] unresolved | 0.95× [0.94–0.97] | 0.95× [0.93–0.96] | 0.99× [0.98–1] unresolved | 0.88× [0.86–0.97] | 0.99× [0.97–1.4] unresolved | 0.94× [0.92–0.96] | 1.1× [1.1–1.2] | 0.87× [0.86–0.89] |
| mask/base32/sentinels | ts/node | 0.89× [0.69–1.1] unresolved | 0.91× [0.87–1.4] unresolved | 0.87× [0.86–0.88] | 0.87× [0.85–0.89] | 0.91× [0.9–0.91] | 0.8× [0.79–0.89] | 0.93× [0.89–1.2] unresolved | 0.87× [0.85–0.88] | 1.1× [1–1.5] | 0.8× [0.79–0.82] |
| mask/base64 | ts/node | 1× [0.72–1.4] unresolved | 1.1× [1–1.3] | 1× [0.99–1] unresolved | 1.1× [1–1.1] | 1.1× [1.1–1.1] | 0.94× [0.91–1] unresolved | 1.1× [1–1.1] | 0.99× [0.97–1] unresolved | 1.2× [0.74–1.2] unresolved | 0.93× [0.92–0.94] |
| mask/binary/caller-buffer | ts/node | 0.68× [0.61–0.71] | 0.69× [0.66–0.78] | 0.68× [0.66–0.78] | 0.67× [0.66–1] unresolved | 0.67× [0.66–0.76] | 0.65× [0.64–0.74] | 0.69× [0.48–0.79] | 0.67× [0.66–0.77] | 0.69× [0.67–0.79] | 0.64× [0.64–0.74] |
| mask/binary/owned | ts/node | 0.72× [0.67–0.73] | 0.72× [0.71–0.77] | 0.72× [0.71–0.72] | 0.7× [0.69–0.81] | 0.71× [0.71–0.8] | 0.68× [0.67–0.75] | 0.73× [0.66–1.3] unresolved | 0.72× [0.71–0.72] | 0.73× [0.73–0.74] | 0.69× [0.68–0.69] |
| migration/candidates | rust/native/release/fast-rng | 1.1× [1.1–1.2] | 1.1× [1.1–1.6] | 1.1× [1.1–1.1] | 1.1× [1.1–1.2] | 1.1× [1–1.1] | 1× [1–1.1] | 1.1× [1.1–1.2] | 1.1× [1.1–1.1] | 1.1× [1.1–1.1] | 1× [1–1] |
| migration/candidates-text | ts/node | 0.61× [0.58–0.73] | 0.6× [0.58–0.74] | 0.6× [0.56–0.7] | 0.61× [0.57–0.74] | 0.6× [0.57–0.72] | 0.56× [0.53–0.69] | 0.6× [0.58–0.81] | 0.6× [0.56–0.72] | 0.66× [0.61–0.8] | 0.56× [0.53–0.69] |
| migration/first | rust/native/release/fast-rng | 1.2× [1.2–1.3] | 1.2× [1.2–1.2] | 1.2× [1.2–1.2] | 1.2× [1.1–1.3] | 1.2× [1.2–1.2] | 1.1× [1.1–1.1] | 1.2× [1.2–1.2] | 1.2× [1.2–1.2] | 1.2× [0.69–1.2] unresolved | 1.1× [1.1–1.1] |
| migration/first-text | ts/node | 0.57× [0.57–0.63] | 0.57× [0.46–0.58] | 0.57× [0.56–0.58] | 0.58× [0.51–0.59] | 0.58× [0.51–0.58] | 0.54× [0.53–0.56] | 0.57× [0.27–0.59] | 0.57× [0.47–0.58] | 0.61× [0.59–0.67] | 0.54× [0.53–0.55] |
| parse/braced | rust/native/release/fast-rng | 2.3× [2.3–2.5] | 2.3× [2.3–3.5] | 1.9× [1.9–1.9] | 2× [2–2] | 1.9× [1.8–2] | 2.3× [2.1–2.3] | 2.3× [2.3–3.1] | 1.9× [1.9–1.9] | 2.1× [2.1–2.3] | 2.3× [2.1–2.4] |
| parse/compact | ts/node | 0.58× [0.53–0.62] | 0.56× [0.53–0.65] | 0.46× [0.44–0.47] | 0.49× [0.42–0.49] | 0.46× [0.43–0.47] | 0.54× [0.52–0.54] | 0.56× [0.53–0.62] | 0.46× [0.44–0.5] | 0.5× [0.33–0.55] | 0.55× [0.51–0.56] |
| parse/keyed/base32 | ts/node | 0.55× [0.55–0.85] | 0.55× [0.53–0.62] | 0.48× [0.48–0.49] | 0.48× [0.47–0.48] | 0.48× [0.48–0.49] | 0.49× [0.48–0.5] | 0.54× [0.48–0.55] | 0.48× [0.48–0.49] | 0.53× [0.52–0.53] | 0.49× [0.47–0.51] |
| parse/keyed/base64 | ts/node | 0.53× [0.43–0.54] | 0.54× [0.52–0.65] | 0.5× [0.45–0.52] | 0.48× [0.43–0.49] | 0.49× [0.48–0.5] | 0.47× [0.46–0.51] | 0.53× [0.43–0.53] | 0.49× [0.46–0.5] | 0.49× [0.23–0.51] | 0.47× [0.46–0.48] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.4× [1.2–1.6] | 1.3× [1.3–1.4] | 1× [0.98–1.2] unresolved | 1.1× [1.1–1.1] | 1× [1–1.1] | 1.2× [1.2–1.2] | 1.3× [1.3–1.5] | 1× [0.99–1.1] unresolved | 1.3× [1.2–1.4] | 1.2× [1.1–1.3] |
| parse/plain/base64 | rust/native/release/fast-rng | 1.4× [1.2–2] | 1.3× [1.3–1.6] | 0.99× [0.96–1] unresolved | 1.1× [1.1–1.2] | 1× [1–1.1] | 1.2× [1.1–1.3] | 1.3× [1.2–1.3] | 1× [0.99–1] unresolved | 1.2× [1.2–2.1] | 1.2× [1.1–1.2] |
| parse/universal | rust/native/release/fast-rng | 2.4× [2.3–2.9] | 2.4× [2.4–3.3] | 2× [1.9–2] | 2.1× [2.1–2.6] | 2× [1.8–2] | 2.4× [2.2–2.4] | 2.4× [2.3–2.6] | 2× [1.9–2] | 2.2× [2.1–2.5] | 2.4× [1.8–2.4] |
| parse/urn | rust/native/release/fast-rng | 2.1× [2.1–2.4] | 2.1× [1.9–2.1] | 1.7× [1.7–1.7] | 1.8× [1.8–1.9] | 1.8× [1.7–1.8] | 2× [2–2.1] | 2.1× [2–2.2] | 1.7× [1.7–1.9] | 1.9× [1.9–2.1] | 2.1× [1.4–2.2] |
| parse/uuid | ts/node | 0.5× [0.45–0.54] | 0.51× [0.49–0.61] | 0.42× [0.38–0.45] | 0.45× [0.39–0.46] | 0.43× [0.4–0.45] | 0.49× [0.48–0.52] | 0.5× [0.37–0.59] | 0.43× [0.41–0.47] | 0.45× [0.35–0.46] | 0.49× [0.44–0.5] |
| payload/extract/bytes | ts/node | 0.13× [0.11–0.16] | 0.12× [0.11–0.12] | 0.12× [0.11–0.12] | 0.1× [0.097–0.37] | 0.1× [0.097–0.1] | 0.091× [0.088–0.093] | 0.11× [0.1–0.12] | 0.11× [0.11–0.12] | 0.084× [0.071–0.087] | 0.096× [0.091–0.099] |
| payload/masked/base32 | ts/node | 0.52× [0.45–0.75] | 0.51× [0.48–0.51] | 0.46× [0.45–0.48] | 0.45× [0.44–0.46] | 0.46× [0.45–0.46] | 0.42× [0.42–0.43] | 0.5× [0.49–0.95] | 0.46× [0.46–0.46] | 0.46× [0.45–0.95] | 0.42× [0.41–0.43] |
| payload/masked/base64 | ts/node | 0.5× [0.48–0.52] | 0.49× [0.47–0.58] | 0.46× [0.44–0.48] | 0.45× [0.44–0.46] | 0.45× [0.45–0.46] | 0.41× [0.37–0.42] | 0.48× [0.48–0.58] | 0.46× [0.45–0.46] | 0.45× [0.43–0.46] | 0.42× [0.41–0.43] |
| plain/base32 | ts/node | 0.67× [0.6–1] unresolved | 0.67× [0.66–0.69] | 0.54× [0.51–0.58] | 0.7× [0.54–0.74] | 0.69× [0.67–0.71] | 0.54× [0.52–0.58] | 0.67× [0.15–0.86] | 0.56× [0.55–0.58] | 1× [0.84–1] unresolved | 0.57× [0.56–0.59] |
| plain/base64 | ts/node | 2.1× [1.9–2.3] | 2.1× [2.1–2.2] | 2× [1.9–2.1] | 1.9× [1.8–1.9] | 2.1× [1.9–2.2] | 1.5× [1.4–1.7] | 2.2× [2.1–2.4] | 1.9× [1.8–2] | 1.8× [1.7–3.6] | 1.6× [1.5–1.7] |
| rotation/previous-key | rust/native/release/fast-rng | 1.2× [1.1–1.8] | 1.2× [1.1–1.5] | 1.2× [1.1–1.2] | 1.1× [1.1–1.2] | 1.1× [1.1–1.1] | 1.1× [1.1–1.1] | 1.2× [1.1–1.3] | 1.2× [1.2–1.2] | 1.1× [1–1.1] | 1.1× [1.1–1.1] |
| sentinel/base32/canonical | ts/node | 0.17× [0.15–0.29] | 0.16× [0.16–0.17] | 0.12× [0.12–0.13] | 0.13× [0.12–0.14] | 0.14× [0.13–0.14] | 0.097× [0.093–0.12] | 0.17× [0.16–0.17] | 0.12× [0.12–0.14] | 0.13× [0.12–0.16] | 0.11× [0.11–0.13] |
| sentinel/base32/uppercase | ts/node | 0.35× [0.29–0.47] | 0.34× [0.33–0.35] | 0.28× [0.27–0.29] | 0.28× [0.27–0.28] | 0.28× [0.28–0.29] | 0.27× [0.27–0.29] | 0.34× [0.32–0.52] | 0.28× [0.28–0.3] | 0.3× [0.29–0.33] | 0.27× [0.26–0.28] |
| timestamp/extract/bytes | ts/node | 0.16× [0.13–0.2] | 0.14× [0.13–0.15] | 0.1× [0.095–0.11] | 0.1× [0.09–0.11] | 0.1× [0.096–0.11] | 0.062× [0.058–0.065] | 0.14× [0.12–0.15] | 0.11× [0.1–0.11] | 0.09× [0.037–0.099] | 0.085× [0.072–0.092] |
| timestamp/masked/base32 | ts/node | 0.72× [0.44–0.76] | 0.71× [0.65–0.79] | 0.64× [0.62–0.68] | 0.63× [0.62–0.65] | 0.63× [0.63–0.65] | 0.61× [0.55–0.61] | 0.71× [0.67–0.73] | 0.64× [0.63–0.64] | 0.67× [0.65–0.68] | 0.6× [0.49–0.63] |
| timestamp/masked/base64 | ts/node | 0.68× [0.66–0.92] | 0.67× [0.56–0.7] | 0.66× [0.65–0.68] | 0.65× [0.64–0.65] | 0.65× [0.65–0.67] | 0.61× [0.58–0.63] | 0.7× [0.66–0.86] | 0.66× [0.65–0.67] | 0.65× [0.34–0.68] | 0.62× [0.62–0.63] |
| timestamp/validate/uuid | rust/native/release/fast-rng | 2.8× [2.4–3] | 2.6× [2.5–5] | 2.2× [2.1–2.3] | 2.2× [2–2.3] | 2.4× [2.3–2.5] | 1.8× [1.6–1.8] | 2.6× [1.5–2.7] | 2.1× [2.1–2.2] | 2.1× [1.2–2.1] | 2× [1.9–2] |
| unmask/base32 | ts/node | 0.72× [0.68–0.77] | 0.72× [0.71–0.99] | 0.67× [0.66–0.69] | 0.65× [0.63–0.67] | 0.66× [0.65–0.67] | 0.62× [0.62–0.69] | 0.7× [0.49–0.72] | 0.67× [0.66–0.67] | 0.67× [0.67–0.67] | 0.62× [0.61–0.63] |
| unmask/base64 | ts/node | 0.7× [0.66–0.85] | 0.7× [0.69–1.1] unresolved | 0.69× [0.68–0.69] | 0.67× [0.66–0.92] | 0.67× [0.67–0.68] | 0.64× [0.63–0.69] | 0.69× [0.66–0.95] | 0.68× [0.67–0.7] | 0.66× [0.6–0.67] | 0.65× [0.64–0.66] |
| unmask/binary/caller-buffer | ts/node | 0.6× [0.54–0.68] | 0.6× [0.58–0.61] | 0.62× [0.61–0.63] | 0.61× [0.57–0.69] | 0.6× [0.59–0.61] | 0.56× [0.56–0.57] | 0.6× [0.59–0.62] | 0.61× [0.6–0.62] | 0.61× [0.58–0.64] | 0.55× [0.55–0.57] |
| unmask/binary/owned | ts/node | 0.62× [0.61–0.65] | 0.62× [0.61–1.1] unresolved | 0.63× [0.62–0.66] | 0.63× [0.52–0.64] | 0.62× [0.61–0.64] | 0.58× [0.57–0.61] | 0.62× [0.51–0.64] | 0.63× [0.62–0.64] | 0.64× [0.39–0.67] | 0.58× [0.57–0.59] |
| unmask/binary/text | ts/node | 0.71× [0.67–0.72] | 0.7× [0.68–0.77] | 0.73× [0.71–0.74] | 0.75× [0.69–0.77] | 0.74× [0.73–0.8] | 0.67× [0.65–0.69] | 0.69× [0.66–0.71] | 0.73× [0.58–0.74] | 0.75× [0.73–0.76] | 0.67× [0.65–0.68] |

## Rust browser WASM release/reduced

| Caller job | Reference | rust/wasm32-unknown-unknown/release/reduced/workerd-web | rust/wasm32-unknown-unknown/release/reduced/workerd-node-compatible | rust/wasm32-unknown-unknown/release/reduced/node | rust/wasm32-unknown-unknown/release/reduced/node-22 | rust/wasm32-unknown-unknown/release/reduced/node-24 | rust/wasm32-unknown-unknown/release/reduced/bun | rust/wasm32-unknown-unknown/release/reduced/deno | rust/wasm32-unknown-unknown/release/reduced/chromium | rust/wasm32-unknown-unknown/release/reduced/firefox | rust/wasm32-unknown-unknown/release/reduced/webkit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| async/future/cancelled | rust/native/release/fast-rng | 1.3× [1.3–1.8] | 1.3× [1–1.3] | 1.4× [1.1–1.5] | 1.6× [1.5–1.8] | 1.7× [1.6–2.1] | 1.4× [1.1–1.5] | 1.3× [0.84–1.3] unresolved | 1.4× [1.3–1.4] | 1.3× [1.3–1.7] | 1.4× [1.2–1.4] |
| async/future/derive/1 | rust/native/release/fast-rng | 0.97× [0.96–1.3] unresolved | 0.97× [0.94–1] unresolved | 0.94× [0.93–0.99] | 1× [1–1.1] | 1× [1–1.2] | 0.94× [0.92–0.96] | 0.99× [0.96–1] unresolved | 0.93× [0.91–0.97] | 1× [1–1.5] | 0.94× [0.88–1] unresolved |
| async/future/derive/64 | rust/native/release/fast-rng | 0.88× [0.86–1.3] unresolved | 0.88× [0.86–0.9] | 0.77× [0.77–0.89] | 0.89× [0.87–0.97] | 0.87× [0.85–1.3] unresolved | 0.74× [0.71–1] unresolved | 0.83× [0.82–0.86] | 0.81× [0.81–0.84] | 0.85× [0.82–0.87] | 0.71× [0.67–0.83] |
| bounds/one-millisecond | ts/node | 0.13× [0.12–0.14] | 0.12× [0.12–0.12] | 0.091× [0.088–0.094] | 0.094× [0.089–0.16] | 0.1× [0.079–0.12] | 0.075× [0.061–0.076] | 0.12× [0.11–0.12] | 0.091× [0.088–0.094] | 0.1× [0.099–0.11] | 0.091× [0.088–0.095] |
| bounds/range | ts/node | 0.12× [0.12–0.14] | 0.12× [0.11–0.12] | 0.093× [0.088–0.095] | 0.093× [0.09–0.1] | 0.1× [0.075–0.13] | 0.073× [0.058–0.076] | 0.12× [0.11–0.12] | 0.091× [0.086–0.097] | 0.099× [0.097–0.1] | 0.092× [0.087–0.095] |
| bytes/read | ts/node | 0.19× [0.18–0.2] | 0.17× [0.17–0.18] | 0.15× [0.14–0.15] | 0.13× [0.13–0.15] | 0.15× [0.14–0.16] | 0.093× [0.086–0.096] | 0.18× [0.17–0.19] | 0.13× [0.08–0.13] | 0.13× [0.13–0.17] | 0.13× [0.12–0.13] |
| bytes/write/offset | rust/native/release/fast-rng | 9.4× [9.1–10] | 8.8× [8.7–9.1] | 7.4× [2–7.8] | 8.2× [8.1–9.3] | 9.5× [8.9–9.9] | 7.2× [7.1–7.4] | 9.4× [9.2–11] | 7.2× [1.9–7.3] | 8.9× [8.8–11] | 8× [7.8–8.1] |
| construct/codec-precomputed-mask | ts/node | 0.15× [0.14–0.17] | 0.14× [0.14–0.14] | 0.11× [0.11–0.12] | 0.14× [0.13–0.15] | 0.13× [0.11–0.16] | 0.098× [0.097–0.1] | 0.14× [0.13–0.14] | 0.11× [0.1–0.11] | 0.13× [0.12–0.17] | 0.11× [0.1–0.11] |
| construct/custom-mask | rust/native/release/fast-rng | 1.9× [1.7–2] | 1.7× [1.6–1.9] | 1.6× [1.5–2.5] | 1.8× [1.8–2.2] | 1.8× [1.7–2.3] | 1.6× [1.6–2.9] | 1.7× [1.6–1.7] | 1.6× [1.6–1.8] | 1.3× [1.3–1.4] | 1.6× [1.5–1.6] |
| construct/generator | ts/node | 0.016× [0.016–0.018] | 0.014× [0.014–0.014] | 0.0093× [0.009–0.012] | 0.009× [0.0085–0.013] | 0.0094× [0.0091–0.012] | 0.0051× [0.005–0.0054] | 0.014× [0.013–0.015] | 0.0084× [0.008–0.0086] | 0.0084× [0.0081–0.01] | 0.0079× [0.0075–0.008] |
| construct/mask | rust/native/release/fast-rng | 1.1× [1–1.2] | 1.1× [0.99–1.1] unresolved | 1× [1–1.1] | 1× [1–1.1] | 1× [1–1.2] | 1.1× [0.75–1.1] unresolved | 1.1× [1–1.1] | 1× [1–1] | 1.1× [1.1–1.2] | 1.1× [1.1–1.1] |
| construct/mask-iterated | rust/native/release/fast-rng | 1× [0.98–1.1] unresolved | 0.99× [0.96–1] unresolved | 1× [1–1.1] | 0.99× [0.98–1.1] unresolved | 1× [0.99–1.4] unresolved | 0.94× [0.69–0.95] | 1× [1–1] | 1× [0.87–1] unresolved | 1× [1–1.4] unresolved | 0.93× [0.93–0.94] |
| construct/migration | rust/native/release/fast-rng | 6.9× [6.6–7.5] | 6.1× [5.8–6.1] | 4.2× [4.1–4.4] | 4.1× [4–4.6] | 4.2× [4.1–4.9] | 2.2× [2.1–2.3] | 5.9× [5.8–6.6] | 4.6× [4.4–4.7] | 3.6× [3.6–3.8] | 3.4× [3.3–3.4] |
| construct/payload-layout | rust/native/release/fast-rng | 2.9× [2.8–3.1] | 2.7× [2.5–2.8] | 2.3× [2.3–2.4] | 2.4× [2.3–2.6] | 2.5× [1.9–2.9] | 1.9× [1.2–1.9] | 2.7× [2.6–3.8] | 2.1× [2–2.1] | 2.1× [2.1–2.3] | 2.1× [2–2.1] |
| construct/public-test-mask-and-codec | rust/native/release/fast-rng | 7.5× [7.2–8.2] | 7.3× [7–10] | 7.4× [6.6–7.5] | 7.5× [6.8–7.6] | 7.6× [4.8–7.7] | 7.5× [6.4–7.8] | 7.7× [7.5–7.8] | 7.3× [6.8–7.5] | 7.8× [7.2–8.2] | 7.6× [6.9–7.8] |
| construct/sentinels/1 | rust/native/release/fast-rng | 1.3× [1.2–1.5] | 1.3× [1.3–1.3] | 1.2× [1.1–1.3] | 1.3× [1.2–1.7] | 1.3× [1.2–1.7] | 1× [0.99–1.1] unresolved | 1.3× [1.3–1.9] | 1.1× [1.1–1.2] | 1.6× [1.5–2.1] | 0.99× [0.86–1.1] unresolved |
| construct/sentinels/16 | rust/native/release/fast-rng | 1.4× [1.2–1.5] | 1.3× [1.3–1.3] | 1.1× [1.1–1.2] | 1.2× [1.1–1.3] | 1.1× [1.1–1.3] | 0.99× [0.96–1] unresolved | 1.3× [1.3–1.4] | 1.1× [1.1–1.1] | 1.5× [1.5–1.6] | 0.98× [0.84–1] unresolved |
| construct/sentinels/4 | rust/native/release/fast-rng | 1.4× [1.4–1.6] | 1.4× [1.3–1.4] | 1.2× [1.2–1.2] | 1.3× [1.2–1.4] | 1.3× [1.2–1.6] | 1× [1–1.1] | 1.4× [1.4–1.7] | 1.2× [1.1–1.2] | 1.6× [1.5–1.9] | 1× [1–1.1] unresolved |
| construct/sentinels/64 | rust/native/release/fast-rng | 1.3× [1.2–1.4] | 1.2× [1.2–1.3] | 1× [1–1.1] | 1.1× [1.1–1.2] | 1.1× [1–1.4] | 0.9× [0.88–0.91] | 1.2× [1.2–1.5] | 1.1× [1–1.1] | 1.2× [1.2–1.3] | 0.89× [0.86–0.93] |
| decode/base32/caller-buffer | ts/node | 0.26× [0.24–0.29] | 0.27× [0.26–0.27] | 0.2× [0.18–0.21] | 0.21× [0.21–0.26] | 0.2× [0.16–0.2] | 0.18× [0.098–0.19] | 0.26× [0.25–0.28] | 0.2× [0.19–0.21] | 0.24× [0.21–0.25] | 0.18× [0.17–0.19] |
| decode/base32/owned | ts/node | 0.35× [0.31–0.42] | 0.36× [0.33–0.39] | 0.26× [0.23–0.27] | 0.28× [0.25–0.31] | 0.27× [0.26–0.28] | 0.25× [0.14–0.26] | 0.35× [0.32–0.37] | 0.25× [0.25–0.26] | 0.33× [0.31–0.33] | 0.26× [0.23–0.27] |
| decode/caller-buffer | ts/node | 0.26× [0.25–0.32] | 0.26× [0.24–0.31] | 0.21× [0.21–0.22] | 0.21× [0.2–0.25] | 0.21× [0.15–0.23] | 0.18× [0.16–0.19] | 0.26× [0.25–0.26] | 0.22× [0.19–0.22] | 0.21× [0.2–0.22] | 0.18× [0.16–0.19] |
| decode/owned | ts/node | 0.26× [0.26–0.31] | 0.26× [0.24–0.33] | 0.21× [0.19–0.21] | 0.2× [0.2–0.23] | 0.21× [0.16–0.22] | 0.18× [0.18–0.23] | 0.26× [0.25–0.27] | 0.21× [0.2–0.21] | 0.22× [0.19–0.22] | 0.19× [0.16–0.19] |
| failure/buffer-capacity | rust/native/release/fast-rng | 1.4× [1.4–1.6] | 1.4× [1.2–1.5] | 1.4× [1.3–1.7] | 1.6× [1.6–1.8] | 1.5× [1.4–1.7] | 1.2× [1.1–1.3] | 1.5× [1.4–1.5] | 1.3× [1.3–1.4] | 1.6× [1.6–2.3] | 1.1× [1.1–1.1] |
| failure/plain/base32 | rust/native/release/fast-rng | 1.8× [1.6–2] | 1.7× [1.5–1.7] | 1.6× [1.5–1.6] | 1.8× [1.6–1.9] | 1.7× [1.6–1.8] | 1.2× [1.1–1.7] | 1.7× [1.6–1.8] | 1.6× [1.4–1.7] | 1.7× [1.7–1.9] | 1.1× [1–1.2] |
| failure/plain/base64 | rust/native/release/fast-rng | 1.7× [1.6–1.9] | 1.7× [1.6–1.7] | 1.6× [1.5–1.6] | 1.8× [1.7–1.8] | 1.7× [1.6–2.2] | 1.1× [0.86–1.2] unresolved | 1.7× [1.6–1.8] | 1.6× [0.68–1.6] unresolved | 1.7× [1.6–1.8] | 1.1× [0.82–1.2] unresolved |
| failure/uuid-parse | ts/node | 0.0054× [0.0052–0.006] | 0.0053× [0.0051–0.0054] | 0.0052× [0.005–0.0054] | 0.0062× [0.0059–0.0091] | 0.0055× [0.0054–0.0061] | 0.0044× [0.0043–0.0046] | 0.0047× [0.0045–0.0048] | 0.0048× [0.0045–0.0049] | 0.0051× [0.0051–0.0056] | 0.0043× [0.0042–0.0044] |
| format/uuid/lowercase | ts/node | 0.61× [0.57–0.63] | 0.6× [0.57–0.62] | 0.56× [0.52–0.58] | 0.67× [0.61–0.81] | 0.63× [0.33–0.67] | 0.53× [0.4–0.54] | 0.6× [0.59–0.62] | 0.57× [0.56–0.63] | 0.61× [0.59–0.64] | 0.55× [0.5–0.57] |
| format/uuid/uppercase | ts/node | 0.59× [0.57–0.62] | 0.56× [0.54–0.58] | 0.56× [0.53–0.59] | 0.61× [0.58–0.64] | 0.58× [0.54–0.59] | 0.5× [0.28–0.52] | 0.57× [0.53–0.6] | 0.57× [0.53–0.59] | 0.59× [0.56–0.61] | 0.5× [0.37–0.52] |
| inspect/v4 | rust/native/release/fast-rng | 7.4× [7–7.4] | 6.6× [5.9–7] | 4.8× [4.8–4.8] | 4.7× [4.4–8] | 4.8× [4.3–4.8] | 1.9× [1.7–2] | 6.3× [6–6.9] | 3.7× [3.5–3.7] | 3.6× [3.5–6] | 3.2× [2–3.3] |
| inspect/v7 | rust/native/release/fast-rng | 7.4× [7.2–7.8] | 6.6× [6.1–9.6] | 4.8× [4.6–4.8] | 4.7× [4.7–4.7] | 4.7× [3.4–4.8] | 1.9× [1.8–1.9] | 6.4× [6–6.9] | 3.7× [3.3–3.9] | 3.6× [3.1–3.6] | 3.3× [3–3.3] |
| inspect/variant | rust/native/release/fast-rng | 5.8× [5.7–6.2] | 5.3× [4.7–6.6] | 3.6× [3.5–3.6] | 3.5× [3.5–4.2] | 3.6× [3.3–3.6] | 2.8× [2.6–2.8] | 5.3× [4.8–5.7] | 4.1× [4–4.1] | 3.6× [3.4–3.7] | 3.3× [2.6–3.3] |
| inspect/version | rust/native/release/fast-rng | 6.1× [6–6.4] | 5.6× [5.3–7.2] | 4.8× [4.8–4.9] | 4.8× [4.7–4.9] | 4.8× [4.6–4.9] | 2.2× [1.7–2.2] | 6.1× [5.1–6.5] | 3.6× [3.5–3.8] | 3.4× [3.2–3.8] | 3.1× [2.9–3.2] |
| mask/base32 | ts/node | 0.97× [0.96–1] unresolved | 0.97× [0.96–1] unresolved | 0.95× [0.93–0.97] | 0.96× [0.91–1.2] unresolved | 1× [0.99–1] unresolved | 0.87× [0.83–0.9] | 0.95× [0.95–1] unresolved | 0.94× [0.86–0.96] | 1.1× [0.87–1.1] unresolved | 0.87× [0.82–0.88] |
| mask/base32/sentinels | ts/node | 0.9× [0.89–0.93] | 0.9× [0.88–1.3] unresolved | 0.86× [0.85–0.87] | 0.87× [0.86–0.9] | 0.92× [0.9–0.93] | 0.81× [0.62–0.83] | 0.89× [0.85–0.9] | 0.87× [0.86–0.88] | 1.1× [0.9–1.1] unresolved | 0.8× [0.57–0.81] |
| mask/base64 | ts/node | 1.1× [1–1.1] | 1.1× [1–1.1] | 1× [0.99–1] unresolved | 1.1× [1–1.3] | 1.1× [1.1–1.1] | 0.92× [0.77–0.93] | 1.1× [1–1.1] | 0.99× [0.98–0.99] | 1.2× [1–1.2] | 0.93× [0.89–0.94] |
| mask/binary/caller-buffer | ts/node | 0.7× [0.69–0.78] | 0.69× [0.68–0.78] | 0.68× [0.67–0.77] | 0.67× [0.66–0.8] | 0.67× [0.65–0.76] | 0.65× [0.64–0.74] | 0.69× [0.68–0.79] | 0.68× [0.57–0.77] | 0.7× [0.59–0.77] | 0.64× [0.61–0.75] |
| mask/binary/owned | ts/node | 0.73× [0.72–0.76] | 0.73× [0.71–0.77] | 0.71× [0.71–0.71] | 0.7× [0.69–0.73] | 0.71× [0.71–0.78] | 0.68× [0.67–0.69] | 0.73× [0.72–0.73] | 0.72× [0.7–0.75] | 0.73× [0.71–0.75] | 0.68× [0.63–0.69] |
| migration/candidates | rust/native/release/fast-rng | 1.1× [1.1–1.1] | 1.1× [1.1–1.5] | 1.1× [1.1–1.1] | 1.1× [1–1.1] | 1.1× [0.8–1.1] unresolved | 1× [1–1] | 1.1× [0.6–1.4] unresolved | 1.1× [1.1–1.1] | 1.1× [1–1.2] | 1× [1–1] |
| migration/candidates-text | ts/node | 0.6× [0.57–0.73] | 0.61× [0.55–0.79] | 0.6× [0.59–0.72] | 0.61× [0.57–0.73] | 0.59× [0.48–0.62] | 0.57× [0.55–0.68] | 0.62× [0.43–0.83] | 0.6× [0.56–0.72] | 0.63× [0.6–0.78] | 0.57× [0.53–0.67] |
| migration/first | rust/native/release/fast-rng | 1.2× [1.2–1.3] | 1.2× [1.2–1.3] | 1.2× [1.1–1.2] | 1.2× [1.1–1.3] | 1.2× [0.95–1.2] unresolved | 1.1× [1.1–1.1] | 1.2× [1.1–1.2] | 1.2× [1.2–1.2] | 1.2× [1.1–1.4] | 1.1× [1–1.1] |
| migration/first-text | ts/node | 0.57× [0.5–0.66] | 0.57× [0.51–0.69] | 0.57× [0.5–0.59] | 0.59× [0.57–0.9] | 0.58× [0.52–0.6] | 0.53× [0.41–0.54] | 0.57× [0.48–0.58] | 0.57× [0.56–0.58] | 0.62× [0.6–0.69] | 0.54× [0.53–0.56] |
| parse/braced | rust/native/release/fast-rng | 2.3× [2.3–2.6] | 2.3× [2.2–2.6] | 1.9× [1.9–2] | 2× [1.9–2.1] | 1.9× [1.9–2.3] | 2.3× [2–2.3] | 2.3× [1.9–2.3] | 1.9× [1.9–1.9] | 2.1× [2.1–2.2] | 2.3× [2.2–2.4] |
| parse/compact | ts/node | 0.57× [0.55–0.59] | 0.56× [0.53–0.63] | 0.46× [0.44–0.5] | 0.49× [0.48–0.77] | 0.47× [0.46–0.5] | 0.54× [0.5–0.56] | 0.55× [0.53–0.59] | 0.47× [0.4–0.48] | 0.51× [0.48–0.52] | 0.53× [0.5–0.57] |
| parse/keyed/base32 | ts/node | 0.55× [0.54–0.63] | 0.55× [0.52–0.55] | 0.48× [0.48–0.49] | 0.48× [0.48–0.58] | 0.48× [0.48–0.56] | 0.49× [0.49–0.64] | 0.55× [0.54–0.62] | 0.48× [0.42–0.49] | 0.53× [0.52–0.62] | 0.5× [0.47–0.54] |
| parse/keyed/base64 | ts/node | 0.53× [0.52–0.61] | 0.52× [0.49–0.53] | 0.5× [0.5–0.52] | 0.48× [0.48–0.56] | 0.5× [0.49–0.51] | 0.47× [0.46–0.47] | 0.53× [0.52–0.53] | 0.49× [0.49–0.53] | 0.49× [0.48–0.5] | 0.47× [0.35–0.48] |
| parse/plain/base32 | rust/native/release/fast-rng | 1.3× [1.3–1.5] | 1.3× [1.3–1.3] | 1× [0.98–1.1] unresolved | 1.1× [1.1–1.2] | 1× [1–1.1] | 1.2× [1.2–1.6] | 1.4× [1.3–1.4] | 1× [0.98–1.1] unresolved | 1.3× [1.2–1.4] | 1.2× [0.89–1.3] unresolved |
| parse/plain/base64 | rust/native/release/fast-rng | 1.3× [1.3–1.4] | 1.3× [1.2–1.3] | 0.98× [0.96–1.1] unresolved | 1.1× [1.1–1.3] | 1× [1–1.1] | 1.2× [1.1–1.2] | 1.3× [1.3–1.6] | 1× [1–1] unresolved | 1.2× [1.2–1.3] | 1.2× [1–1.2] |
| parse/universal | rust/native/release/fast-rng | 2.4× [2.3–2.6] | 2.4× [2.3–2.7] | 2× [1.9–2] | 2.1× [2–2.4] | 2× [1.6–2.4] | 2.3× [1.4–2.4] | 2.4× [2.3–2.5] | 2× [1.5–2] | 2.2× [2.2–2.3] | 2.4× [2.2–2.4] |
| parse/urn | rust/native/release/fast-rng | 2.1× [2–2.3] | 2.1× [2–2.4] | 1.7× [1.7–1.8] | 1.9× [1.8–2.1] | 1.8× [1.7–2.1] | 2.1× [2–2.2] | 2.1× [2–2.3] | 1.7× [1.7–1.8] | 1.9× [1.9–2.1] | 2.1× [2–2.2] |
| parse/uuid | ts/node | 0.51× [0.5–0.57] | 0.5× [0.46–0.63] | 0.42× [0.41–0.44] | 0.45× [0.43–0.58] | 0.43× [0.38–0.49] | 0.47× [0.28–0.48] | 0.5× [0.48–0.51] | 0.43× [0.4–0.44] | 0.45× [0.29–0.47] | 0.48× [0.43–0.5] |
| payload/extract/bytes | ts/node | 0.13× [0.12–0.14] | 0.12× [0.034–0.16] | 0.12× [0.12–0.12] | 0.1× [0.1–0.13] | 0.1× [0.096–0.11] | 0.09× [0.07–0.092] | 0.11× [0.11–0.13] | 0.11× [0.11–0.12] | 0.084× [0.082–0.093] | 0.097× [0.088–0.11] |
| payload/masked/base32 | ts/node | 0.51× [0.5–0.6] | 0.5× [0.48–0.51] | 0.46× [0.46–0.48] | 0.46× [0.45–0.48] | 0.46× [0.46–0.51] | 0.42× [0.42–0.68] | 0.5× [0.5–0.51] | 0.46× [0.45–0.47] | 0.45× [0.44–0.51] | 0.42× [0.42–0.45] |
| payload/masked/base64 | ts/node | 0.49× [0.49–0.55] | 0.49× [0.47–0.5] | 0.47× [0.46–0.48] | 0.46× [0.45–0.51] | 0.46× [0.45–0.77] | 0.42× [0.39–0.42] | 0.48× [0.47–0.55] | 0.46× [0.44–0.47] | 0.45× [0.43–0.51] | 0.42× [0.33–0.44] |
| plain/base32 | ts/node | 0.68× [0.65–0.71] | 0.66× [0.63–0.68] | 0.53× [0.51–0.56] | 0.7× [0.68–1.5] unresolved | 0.66× [0.46–0.71] | 0.53× [0.34–0.58] | 0.64× [0.63–0.67] | 0.55× [0.52–0.56] | 1× [0.77–1] unresolved | 0.56× [0.49–0.58] |
| plain/base64 | ts/node | 2.1× [2–2.5] | 2.2× [2.1–2.3] | 2× [1.9–2.1] | 1.9× [1.8–2] | 2× [2–2.2] | 1.5× [1.4–1.6] | 2.1× [2–2.2] | 1.9× [1.9–2] | 1.7× [1.6–1.9] | 1.6× [1.4–1.7] |
| rotation/previous-key | rust/native/release/fast-rng | 1.2× [1.2–1.3] | 1.2× [1.1–1.2] | 1.2× [1.1–1.2] | 1.1× [1.1–1.2] | 1.2× [1.1–1.4] | 1.1× [1.1–1.1] | 1.2× [1.2–1.4] | 1.2× [1.2–1.2] | 1.1× [1.1–1.3] | 1.1× [0.91–1.2] unresolved |
| sentinel/base32/canonical | ts/node | 0.16× [0.16–0.18] | 0.17× [0.16–0.17] | 0.13× [0.12–0.13] | 0.13× [0.12–0.14] | 0.13× [0.13–0.14] | 0.1× [0.047–0.1] | 0.16× [0.16–0.17] | 0.12× [0.1–0.13] | 0.12× [0.097–0.13] | 0.11× [0.095–0.11] |
| sentinel/base32/uppercase | ts/node | 0.34× [0.32–0.38] | 0.34× [0.33–0.35] | 0.28× [0.26–0.3] | 0.28× [0.27–0.3] | 0.28× [0.26–0.3] | 0.26× [0.23–0.28] | 0.35× [0.33–0.38] | 0.28× [0.28–0.29] | 0.3× [0.25–0.33] | 0.27× [0.23–0.28] |
| timestamp/extract/bytes | ts/node | 0.15× [0.14–0.16] | 0.14× [0.13–0.18] | 0.1× [0.093–0.11] | 0.1× [0.096–0.12] | 0.1× [0.088–0.11] | 0.06× [0.054–0.065] | 0.14× [0.13–0.17] | 0.1× [0.1–0.11] | 0.094× [0.085–0.11] | 0.085× [0.078–0.094] |
| timestamp/masked/base32 | ts/node | 0.73× [0.67–0.88] | 0.71× [0.68–0.72] | 0.64× [0.62–0.66] | 0.64× [0.62–0.82] | 0.64× [0.59–0.7] | 0.6× [0.55–0.61] | 0.71× [0.7–0.72] | 0.63× [0.62–0.66] | 0.67× [0.66–0.69] | 0.62× [0.6–0.62] |
| timestamp/masked/base64 | ts/node | 0.68× [0.67–0.77] | 0.68× [0.64–0.68] | 0.66× [0.65–0.68] | 0.65× [0.64–0.7] | 0.66× [0.62–0.72] | 0.61× [0.59–0.62] | 0.67× [0.67–0.69] | 0.66× [0.45–0.7] | 0.66× [0.64–0.77] | 0.63× [0.62–0.69] |
| timestamp/validate/uuid | rust/native/release/fast-rng | 2.7× [2.6–3.2] | 2.6× [2.2–3] | 2.2× [2.1–2.6] | 2.2× [2.1–2.6] | 2.4× [2.1–2.6] | 1.8× [1.5–1.8] | 2.6× [2.4–3.1] | 2.1× [2–2.1] | 2× [2–2.6] | 2× [1.6–2.1] |
| unmask/base32 | ts/node | 0.72× [0.71–0.74] | 0.72× [0.69–0.95] | 0.67× [0.66–0.67] | 0.65× [0.58–0.65] | 0.66× [0.51–0.68] | 0.62× [0.61–0.66] | 0.72× [0.71–0.72] | 0.67× [0.66–0.68] | 0.67× [0.64–0.68] | 0.62× [0.61–0.63] |
| unmask/base64 | ts/node | 0.7× [0.69–0.71] | 0.69× [0.68–0.78] | 0.69× [0.68–0.71] | 0.66× [0.65–0.82] | 0.68× [0.48–0.72] | 0.64× [0.51–0.66] | 0.7× [0.69–0.8] | 0.69× [0.68–0.7] | 0.66× [0.53–0.67] | 0.64× [0.62–0.66] |
| unmask/binary/caller-buffer | ts/node | 0.6× [0.59–0.62] | 0.6× [0.46–0.6] | 0.62× [0.6–0.63] | 0.6× [0.58–0.64] | 0.6× [0.6–0.61] | 0.55× [0.54–0.58] | 0.6× [0.59–0.62] | 0.62× [0.6–0.62] | 0.6× [0.59–0.64] | 0.56× [0.55–0.57] |
| unmask/binary/owned | ts/node | 0.63× [0.61–0.65] | 0.63× [0.62–0.63] | 0.63× [0.62–0.65] | 0.63× [0.61–0.69] | 0.62× [0.53–0.63] | 0.58× [0.57–0.62] | 0.62× [0.61–0.63] | 0.63× [0.61–0.66] | 0.63× [0.61–0.7] | 0.58× [0.55–0.59] |
| unmask/binary/text | ts/node | 0.71× [0.7–0.73] | 0.7× [0.6–0.71] | 0.72× [0.71–0.79] | 0.75× [0.74–0.77] | 0.74× [0.73–0.75] | 0.66× [0.63–0.68] | 0.7× [0.65–0.7] | 0.73× [0.72–0.75] | 0.74× [0.69–0.8] | 0.67× [0.65–0.68] |

## Cross-language anchor

| Caller job | Reference | cross-language/rust-native |
| --- | --- | ---: |
| async/future/cancelled | rust/native/release/fast-rng | uncompared |
| async/future/derive/1 | rust/native/release/fast-rng | uncompared |
| async/future/derive/64 | rust/native/release/fast-rng | uncompared |
| bounds/one-millisecond | ts/node | 0.051× [0.05–0.052] |
| bounds/range | ts/node | 0.048× [0.047–0.049] |
| bytes/read | ts/node | 0.017× [0.017–0.017] |
| bytes/write/offset | rust/native/release/fast-rng | uncompared |
| construct/codec-precomputed-mask | ts/node | 0.13× [0.12–0.13] |
| construct/custom-mask | rust/native/release/fast-rng | uncompared |
| construct/generator | ts/node | 0.0031× [0.0031–0.0032] |
| construct/mask | rust/native/release/fast-rng | uncompared |
| construct/mask-iterated | rust/native/release/fast-rng | uncompared |
| construct/migration | rust/native/release/fast-rng | uncompared |
| construct/payload-layout | rust/native/release/fast-rng | uncompared |
| construct/public-test-mask-and-codec | rust/native/release/fast-rng | uncompared |
| construct/sentinels/1 | rust/native/release/fast-rng | uncompared |
| construct/sentinels/16 | rust/native/release/fast-rng | uncompared |
| construct/sentinels/4 | rust/native/release/fast-rng | uncompared |
| construct/sentinels/64 | rust/native/release/fast-rng | uncompared |
| decode/base32/caller-buffer | ts/node | 0.15× [0.14–0.15] |
| decode/base32/owned | ts/node | 0.22× [0.2–0.22] |
| decode/caller-buffer | ts/node | 0.12× [0.12–0.12] |
| decode/owned | ts/node | 0.15× [0.14–0.15] |
| failure/buffer-capacity | rust/native/release/fast-rng | uncompared |
| failure/plain/base32 | rust/native/release/fast-rng | uncompared |
| failure/plain/base64 | rust/native/release/fast-rng | uncompared |
| failure/uuid-parse | ts/node | 0.001× [0.001–0.0011] |
| format/uuid/lowercase | ts/node | 0.42× [0.39–0.42] |
| format/uuid/uppercase | ts/node | 0.41× [0.39–0.42] |
| generation/v4/base32hex | ts/node | 0.54× [0.54–0.55] |
| generation/v4/base64url | ts/node | 0.59× [0.59–0.61] |
| generation/v4/bytes | ts/node | 0.27× [0.27–0.28] |
| generation/v4/caller-buffer-custom-entropy | rust/native/release/fast-rng | uncompared |
| generation/v4/text | ts/node | 0.55× [0.53–0.58] |
| generation/v7/base32hex | ts/node | 0.21× [0.2–0.21] |
| generation/v7/base64url | ts/node | 0.21× [0.21–0.22] |
| generation/v7/bytes | ts/node | 0.42× [0.41–0.42] |
| generation/v7/caller-buffer-custom-entropy | rust/native/release/fast-rng | uncompared |
| generation/v7/custom-entropy | rust/native/release/fast-rng | uncompared |
| generation/v7/explicit-time | rust/native/release/fast-rng | uncompared |
| generation/v7/fraction12-custom-entropy | rust/native/release/fast-rng | uncompared |
| generation/v7/text | ts/node | 0.52× [0.51–0.55] |
| inspect/v4 | rust/native/release/fast-rng | uncompared |
| inspect/v7 | rust/native/release/fast-rng | uncompared |
| inspect/variant | rust/native/release/fast-rng | uncompared |
| inspect/version | rust/native/release/fast-rng | uncompared |
| mask/base32 | ts/node | 0.86× [0.85–0.88] |
| mask/base32/sentinels | ts/node | 0.79× [0.78–0.8] |
| mask/base64 | ts/node | 0.92× [0.91–0.92] |
| mask/binary/caller-buffer | ts/node | 0.63× [0.62–0.72] |
| mask/binary/owned | ts/node | 0.66× [0.65–0.66] |
| migration/candidates | rust/native/release/fast-rng | uncompared |
| migration/candidates-text | ts/node | 0.53× [0.51–0.64] |
| migration/first | rust/native/release/fast-rng | uncompared |
| migration/first-text | ts/node | 0.47× [0.47–0.47] |
| parse/braced | rust/native/release/fast-rng | uncompared |
| parse/compact | ts/node | 0.22× [0.21–0.23] |
| parse/keyed/base32 | ts/node | 0.47× [0.47–0.48] |
| parse/keyed/base64 | ts/node | 0.46× [0.45–0.47] |
| parse/plain/base32 | rust/native/release/fast-rng | uncompared |
| parse/plain/base64 | rust/native/release/fast-rng | uncompared |
| parse/universal | rust/native/release/fast-rng | uncompared |
| parse/urn | rust/native/release/fast-rng | uncompared |
| parse/uuid | ts/node | 0.047× [0.047–0.048] |
| payload/extract/bytes | ts/node | 0.031× [0.031–0.032] |
| payload/masked/base32 | ts/node | 0.37× [0.37–0.37] |
| payload/masked/base64 | ts/node | 0.37× [0.36–0.37] |
| plain/base32 | ts/node | 0.4× [0.39–0.41] |
| plain/base64 | ts/node | 0.44× [0.43–0.46] |
| rotation/previous-key | rust/native/release/fast-rng | uncompared |
| sentinel/base32/canonical | ts/node | 0.089× [0.089–0.091] |
| sentinel/base32/uppercase | ts/node | 0.061× [0.059–0.063] |
| timestamp/extract/bytes | ts/node | 0.018× [0.017–0.019] |
| timestamp/masked/base32 | ts/node | 0.59× [0.58–0.59] |
| timestamp/masked/base64 | ts/node | 0.57× [0.57–0.57] |
| timestamp/validate/uuid | rust/native/release/fast-rng | uncompared |
| unmask/base32 | ts/node | 0.58× [0.57–0.58] |
| unmask/base64 | ts/node | 0.58× [0.57–0.59] |
| unmask/binary/caller-buffer | ts/node | 0.52× [0.52–0.54] |
| unmask/binary/owned | ts/node | 0.55× [0.55–0.56] |
| unmask/binary/text | ts/node | 0.55× [0.54–0.55] |
