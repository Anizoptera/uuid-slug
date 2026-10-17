# Rust consumer parity and cost

Preserve issued IDs and TypeScript workflows while reducing complete-call cost and unused dependencies.

- [x] Correct native-default guidance; distinguish native behavior from explicitly configured generators.
- [x] Isolate competitor features and bind probes to the repository toolchain before comparing results.
- [x] Complete Rust inspection, uppercase formatting, universal parsing, caller-buffer writers and simple UUIDv7 generation. Caller-buffer writers already matched TypeScript, which writes caller storage only for bytes.
- [x] Preserve optional codec/layout context without enlarging the 16-byte `Uuid` value; generate once for paired outputs. `Uuid` stays `[u8; 16]`; callers pass the codec, and one generated `Uuid` feeds every spelling.
- [x] Add optional, default-enabled OS-seeded cryptographic randomness; retain direct OS fills, typed failures and fork reseeding.
- [x] Replace dynamic base32 construction with the matching static encoding; preserve all padding and wire checks.
- [x] Verify isolated consumer dependency graphs, removed code, allocations, build cost and output size. Conversion-only builds resolve only `uuid` and `data-encoding`; optional dependencies make that hold by construction.
- [x] Execute browser WASM and WASIp1/p2 consumers; keep npm JavaScript-only and avoid an unused public WASM ABI.
- [ ] Measure approved generation, parsing, formatting, conversion, masking and derivation calls across relevant resource axes.
- [ ] Run shared contracts, feature/profile checks, packaged consumers, API checks and the final full repository check.
- [ ] Review inline reasons and consumer guidance; commit each verified change without staging unrelated TypeScript edits.

The first useful signals are fewer OS draws on complete generation calls, fewer allocations on caller-buffer routes, and absent dependencies/code in isolated consumers. Microbenchmarks alone cannot establish these gains.

Default entropy must remain secure: initial seeding, required reseeding and fork recovery fail closed. Failed generation preserves caller storage and logical generator state. Conversion-only builds must not acquire an entropy dependency.

Compare static encoding, caller storage and maintained cryptographic RNG reuse before custom algorithms or more feature flags: each removes measured work without changing issued IDs. Reconsider when complete consumer calls or target execution contradict the gain.

No publication, tags, remote writes or branch changes are authorized.
