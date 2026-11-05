# Remaining work

## Goals and approval boundaries

Keep npm and Rust capabilities and identifier formats aligned through APIs natural to each language. Correctness and predictable use come first, performance and resource efficiency second, maintenance simplicity third. Preserve issued IDs, secure entropy, caller ownership and typed failures.

Keep one Rust crate and the dependency-free npm package, optional `std`, Rust's owned `Uuid`, immutable codecs and separate mutable generators. Replace Rust dependencies only for demonstrated gains without quality or capability loss. Use latest stable build tools and dependencies, with separate compatibility lanes. Keep both manifest versions aligned; preparation must not change them.

Derive engineering choices from the maintainer's requests and interface principles; escalate every taste decision and unresolved material contract, priority or risk decision. Versions, tags, pushes, publication, remote settings/secrets and finalization each require explicit authorization; this plan grants none. Keep dependent repairs with their task. Record acceptance commands, revisions, features, profiles, targets and coverage limits in the existing evidence owner; durable contracts stay outside this plan.

## Active: push workflow repair

- [x] Remove unsupported custom job deadlines from both workflows; actionlint passes, with platform limits, all checks and local/subprocess deadlines preserved.
- [ ] After push authorization, verify a new GitHub run through the main checks and dependent Node matrix; local validation does not prove hosted completion.

## Crates.io trusted publishing

- [ ] Verify the crates.io trusted-publishing exchange on the next authorized unpublished version (`dev/release.md`); a same-version retry skips authentication and cannot prove the configuration works.

## Active: optional UUID interoperability

Keep `uuid-interop` opt-in: enabled builds use upstream parsing, formatting and byte interoperability; ordinary builds compile only the attributed parser/formatter kernels. Preserve secure default generation with OS-seeded ChaCha12; minimize each dependency's features without removing required entropy. Keep accepted text, output, typed errors and issued IDs unchanged. Local unchecked ASCII formatting is approved; deny unrelated unsafe code and review upstream changes before syncing. Gate released conversions in the next minor release, with documented migration and no prior deprecation release required. Credit the source in both READMEs. Versions, pushes and publication still need separate authorization.

- [x] Correct dependency/safety guidance, release-policy exception, feature documentation and matching README attribution before implementation.
- [ ] Copy only required upstream parser/formatter kernels with revision/license provenance, scoped unsafe reasoning and compile-time backend exclusion.
- [ ] Gate `From` interoperability and its examples/tests; refresh lockfiles/API baselines and prove ordinary builds exclude `uuid` while retaining secure generation.
- [ ] Exercise malformed text, every payload bit, case, formatter failure and allocations through both feature selections; verify actual reduced dependency graphs.
- [ ] Run native/debug/release, compiler-floor and optimized browser/WASI checks, then the complete routine check on the final tree.
- [ ] Update measured conclusions for the implemented backend, inspect the packaged crate and credit files, remove scratch and commit verified changes.

## Deferred comparison research

Compare maintained TypeScript runtimes and native Rust/Wasm feature variants on equivalent complete API jobs, using warmed minified JavaScript and release Rust/Wasm; exclude debug and disabled-JIT runs. Separate per-ID bridge crossings from compiled Rust loops. These research tasks are not release gates; new measurements require the consumer-call authorization and evidence required by `AGENTS.md` and `bench/AGENTS.md`.

Implementation comparisons update only `bench/results/implementations.md`; show progress in the CLI. Keep raw evidence local and untracked only for that report or an unresolved investigation; never create provisional/per-runtime reports or commit archives. Retain meaningful differences and uncertainty, not rankings from small fluctuations. Measured limits and rejected approaches belong in `bench/decisions.md`.

- [ ] Verify timed-work retention in remaining optimized jobs and engines with unchanged controls and valid-output added work. Keep full results observable to the host; checksums alone are insufficient. Cover other jobs and browser added-work sensitivity, not just Node/Bun derivation.
- [ ] Diagnose full-corpus timing variation with independent evidence separating scheduling delay, JIT/GC state and harness work. Scheduler comparisons establish no general winner. Concurrent timing cannot replace isolated costs; stable prefixes cannot justify shorter repeats. Preserve the original workerd attempt, failure log and power excerpt: repaired termination does not explain the timeout.
- [ ] Resolve Node/Deno base32 parity against the upstream baseline. Preserve failing and passing full-filter results; later passes establish neither parity nor cause. Select a repair only from corrected full-context evidence or a changed mechanism, not narrower timing replays (`bench/decisions.md` §Historical base32 slowdown and §Runtime regression checks).
- [ ] After release preparation, make latest stable Bun the 1× benchmark reference. Recalculate from matching measurements, keep Node.js as a comparison target, and label the reference runtime and version.

## Deferred distribution and guidance

- [ ] Decide later whether to also publish to JSR, where Deno can load the TypeScript source; it needs a ruling against the one-npm-package rule in `dev/cross-language.md`, a condition-free Deno entry and slow-types checks.
- [ ] Propose cross-project guidance requiring packed-consumer checks to match real installed package layouts; change external guidance only with explicit approval.

## Deferred CPU and batch optimizations

Future exploration only; do not start it during release preparation.

- [ ] Explore native CPU instructions and instruction-set extensions across supported CPU architectures for single-UUID operations. Compare complete consumer calls with the portable implementation.
- [ ] Evaluate bulk UUID parsing, formatting, generation and slug conversion, including [Nugine SIMD](https://github.com/Nugine/simd). Preserve mixed-case URNs, lowercase base32hex, unchanged output on failure and each ID's encoding boundary. Compare complete calls, including dispatch and JS/Rust crossings; decide API fit and build cost separately for Rust and TypeScript, keeping single/few-ID calls primary.
- [ ] Evaluate borrowed formatting adapters, direct text-buffer writers and existing owned slug values for Rust streaming callers. Establish allocation and complete-call gains before proposing exports; keep low-level output machinery internal unless callers benefit from it.
- [ ] Evaluate parsing UUID text directly from ASCII byte buffers for Rust bulk callers, preserving text grammar and typed failures. Compare with borrowed UTF-8 validation plus the existing parser before proposing an entry point; keep text bytes distinct from raw 16-byte UUID input.
- [ ] Retain a specialized path only for demonstrated gains on actual target hardware, accounting for dispatch, allocation, code size and maintenance. Preserve wire formats, secure entropy, ownership, safety requirements and a portable fallback; detect CPU support before executing optional instructions.
