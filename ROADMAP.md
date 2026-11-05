# Remaining work

## Goals and approval boundaries

Prepare the npm update and first Rust crate with matching capabilities and identifier formats through APIs natural to each language. Correctness and predictable use come first, performance and resource efficiency second, maintenance simplicity third. Preserve issued IDs, secure entropy, caller ownership and typed failures.

Keep one Rust crate and the dependency-free npm package, optional `std`, Rust's owned `Uuid`, immutable codecs and separate mutable generators. Replace Rust dependencies only for demonstrated gains without quality or capability loss. Use latest stable build tools and dependencies, with separate compatibility lanes. Keep both manifest versions aligned; preparation must not change them.

Derive engineering choices from the maintainer's requests and interface principles; escalate every taste decision and unresolved material contract, priority or risk decision. Versions, tags, pushes, publication, remote settings/secrets and finalization each require explicit authorization; this plan grants none. Keep dependent repairs with their task. Record acceptance commands, revisions, features, profiles, targets and coverage limits in the existing evidence owner; durable contracts stay outside this plan.

## Joint release readiness

Prepare both stable archives from the authorized tag under `dev/release.md`, not old development captures. Reject incompatible old calls, issued-ID drift, unwanted bundle retention, runtime failures and invalid archives. Keep existing regression checks; missing performance comparisons neither block preparation nor authorize experiments.

- [x] Configure `CRATES_IO_BOOTSTRAP_TOKEN` before the first crate upload; trusted publishing cannot be configured until the crate exists.
- [ ] Before tagging, review installation and publication-status copy for the selected packages. After version/tag authorization, prepare both archives from that tag and review generated consumer notes before any separately authorized push or publication (`dev/release.md`).
- [ ] Publish authorized version `0.6.0`: publish and verify the crate first, then npm; verify registry bytes and hosted docs.rs. Preserve both selected packages and archives on retries; never move a published tag or omit a selected package. Keep the release draft until finalization.
- [ ] Finalize authorized release `0.6.0` only after verifying matching destinations, attachments, notes and provenance (`dev/release.md`).
- [ ] With settings authorization and after the first crate exists, configure and read back trusted publishing before removing/revoking the bootstrap credential. Verify the exchange on the next authorized unpublished version; a same-version retry skips authentication.

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

## Deferred Rust CPU optimizations

Future exploration only; do not start it during release preparation.

- [ ] Explore native CPU instructions and instruction-set extensions across supported CPU architectures for single-UUID operations. Compare complete consumer calls with the portable implementation.
- [ ] Explore batched UUID operations separately, including SIMD where useful; batch gains must not slow single-UUID calls.
- [ ] Retain a specialized path only for demonstrated gains on actual target hardware, accounting for dispatch, allocation, code size and maintenance. Preserve wire formats, secure entropy, ownership, safety requirements and a portable fallback; detect CPU support before executing optional instructions.
