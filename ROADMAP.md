# Remaining work

## Goals and authority

Prepare the npm update and first Rust crate with matching capabilities and identifier formats through APIs natural to each language. Correctness and predictable use come first, performance and resource efficiency second, maintenance simplicity third. Preserve issued IDs, secure entropy, caller ownership and typed failures.

Keep one Rust crate and the dependency-free npm package, optional `std`, Rust's owned `Uuid`, immutable codecs and separate mutable generators. Replace Rust dependencies only for demonstrated gains without quality or capability loss. Keep both manifest versions aligned; preparation must not change them.

Derive API consistency and usability improvements from the maintainer's requests and interface principles; escalate every taste decision and unresolved material contract, priority or risk decision. Versions, tags, pushes, publication, remote settings/secrets and finalization each require explicit authorization; this roadmap grants none. Keep dependent repairs with their task. Record acceptance by command, revision, features, profile, target and coverage limits in the existing evidence owner; durable contracts stay in their owners.

## Joint release readiness

Follow `dev/release.md` for the npm update and first crate publication. Build and verify stable archives from the authorized tag, not old development captures; reject incompatible old calls, issued-ID drift, unwanted bundle retention, runtime failures and invalid archives. Existing regression checks remain required; missing performance comparisons neither block preparation nor authorize experiments.

- [ ] Before publication, resolve or review [the upstream `deepmerge` advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4). The latest Rollup resolver depends on the affected release and merges its fixed defaults; this dependency is development-only. Keep this separate from the clean production dependency audit.

- [ ] With explicit authorization, configure `CRATES_IO_BOOTSTRAP_TOKEN` before the first crate upload; trusted publishing cannot be configured until the crate exists.
- [ ] After version/tag authorization, run exact-tag preparation for both packages and review the generated consumer release notes before any separately authorized push or publication.
- [ ] After publication authorization, publish both verified archives and verify registry bytes and hosted docs.rs. Preserve the original selection and archives on retries; never move a published tag or omit a selected package. Finalization needs separate authorization and matching destinations, attachments, notes and provenance.
- [ ] With settings authorization and after the first crate exists, configure and read back trusted publishing before removing/revoking the bootstrap credential. Verify the exchange on the next authorized unpublished version; a same-version retry skips authentication.

## Cross-runtime implementation comparison

Compare maintained TypeScript runtimes and native Rust/Wasm feature variants on equivalent complete API jobs, using warmed minified JavaScript and release Rust/Wasm; exclude debug and disabled-JIT runs. Separate per-ID bridge crossings from compiled Rust loops. These research tasks are not release gates; new measurements require the consumer-call authorization and evidence required by `AGENTS.md` and `bench/AGENTS.md`.

Update only `bench/results/implementations.md`; show progress in the CLI. Keep raw evidence local and untracked only for that report or an unresolved investigation; never create provisional/per-runtime reports or commit archives. Retain meaningful differences and uncertainty, not rankings from small fluctuations. Measured limits and rejected approaches belong in `bench/decisions.md`.

- [ ] Verify that remaining optimized jobs and engines retain their timed work, using unchanged controls and valid-output added work. Keep each full result observable to the host; a checksum alone is insufficient. Existing Node/Bun derivation evidence does not cover other jobs or browser added-work sensitivity.
- [ ] Diagnose unexplained full-corpus timing variation by distinguishing scheduling delay, JIT/GC state and harness work with independent evidence. Existing scheduler comparisons establish no general winner. Do not substitute concurrent timing for isolated costs or shorten repeats from stable prefixes alone; those checks do not establish equivalent measurements. Preserve the original workerd attempt, failure log and power excerpt: the termination repair does not establish that timeout's cause.

## Runtime support

- [ ] Decide later whether to also publish to JSR, where Deno can load the TypeScript source; it needs a ruling against the one-npm-package rule in `dev/cross-language.md`, a condition-free Deno entry and slow-types checks.

## Follow-up

### Deferred benchmark reference

- [ ] Later, make the latest stable Bun the 1× reference for comparative benchmarks instead of the latest Node.js. Recalculate relative results from matching measurements; keep Node.js as a comparison target and label the reference runtime and version. Do not change the current reports during release preparation.

### Deferred Rust CPU optimizations

Future exploration only; do not start it during release preparation.

- [ ] Explore native CPU instructions and instruction-set extensions across supported CPU architectures for single-UUID operations. Compare complete consumer calls with the portable implementation.
- [ ] Explore batched UUID operations separately, including SIMD where useful; batch gains must not slow single-UUID calls.
- [ ] Retain a specialized path only for demonstrated gains on actual target hardware, accounting for dispatch, allocation, code size and maintenance. Preserve wire formats, secure entropy, ownership, safety requirements and a portable fallback; detect CPU support before executing optional instructions.

### Other follow-ups

- [ ] Propose cross-project guidance requiring packed-consumer checks to match real installed package layouts; change external guidance only with explicit approval.
- [ ] Resolve Node/Deno base32 parity against the upstream baseline. Preserve failing and passing full-filter results; later passes establish neither parity nor cause. Select a repair only from corrected full-context evidence or a changed mechanism, not narrower timing replays (`bench/decisions.md` §Historical base32 slowdown and §Runtime regression checks).
