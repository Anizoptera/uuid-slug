# Remaining work

## Goals and approval boundaries

Keep npm and Rust capabilities and identifier formats aligned through APIs natural to each language. Correctness and predictable use come first, performance and resource efficiency second, maintenance simplicity third. Preserve issued IDs, secure entropy, caller ownership and typed failures.

Keep one Rust crate and the dependency-free npm package, optional `std`, Rust's owned `Uuid`, immutable codecs and separate mutable generators. Replace Rust dependencies only for demonstrated gains without quality or capability loss. Use latest stable build tools and dependencies, with separate compatibility lanes. Keep both manifest versions aligned; preparation must not change them.

Derive engineering choices from the maintainer's requests and interface principles; escalate every taste decision and unresolved material contract, priority or risk decision. Versions, tags, pushes, publication, remote settings/secrets and finalization each require explicit authorization; this plan grants none. Keep dependent repairs with their task. Record acceptance commands, revisions, features, profiles, targets and coverage limits in the existing evidence owner; durable contracts stay outside this plan.

## Active: pre-0.7.0 sprint

Finish these before preparing 0.7.0. A pending maintainer ruling is a short question, never a reason to drop an item: ask it when the item starts. WASM work stays out of this sprint. Use only free or already-paid hardware (GitHub-hosted runners, existing servers); measure with `bench/AGENTS.md`'s noise-tolerant method.

- [ ] Push `main` once the full all-runtime check passes (authorized).
- [ ] Decide `uuid-simd` retention from native AMD runs: dispatch `bench-full.yml` with suite `rust-codec-amd` (repeat until an AMD runner is logged), then keep the opt-in feature only if it gains without a material loss elsewhere, else delete it with its test, CHANGELOG entry and `dev/cross-language.md` row. M4 evidence and the open compact-parse context effect are in `bench/decisions.md`. If kept, the crate README, `rust/AGENTS.consumer.md` and `docs/security.md` (its unsafe-code sentence) need maintainer-approved wording before release.

## Optional UUID completion audit

- [x] Compare backend selection, dependency defaults, source credits and secure generation with their implementations; correct the README's OS-call claim and release instructions that omit all-feature doctests.
- [x] Documentation corrections match the RNG implementation and archive checker; the documentation-only diff and commit hook pass. CPU/batch results and their limits are recorded below; the authorized push and hosted checks are complete.

## Active: push workflow repair

- [x] Remove unsupported custom job deadlines from both workflows; actionlint passes, with platform limits, all checks and local/subprocess deadlines preserved.
- [x] Authorized push through `88956ed`; GitHub run `42097737779` completes successfully, including the main checks, dependent Node matrix, native CPU/OS targets and both browser/WASM profiles.

## Crates.io trusted publishing

- [ ] Verify the crates.io trusted-publishing exchange on the next authorized unpublished version (`dev/release.md`); a same-version retry skips authentication and cannot prove the configuration works.

## Active: optional UUID interoperability

Keep `uuid-interop` opt-in: enabled builds use upstream parsing, formatting and byte interoperability; ordinary builds compile only the attributed parser/formatter kernels. Preserve secure default generation with OS-seeded ChaCha12; minimize each dependency's features without removing required entropy. Keep accepted text, output, typed errors and issued IDs unchanged. Local unchecked ASCII formatting is approved; deny unrelated unsafe code and review upstream changes before syncing. Treat opt-in conversion availability as a normal pre-1.0 breaking minor and document migration. Credit the source in both READMEs. Versions, pushes and publication still need separate authorization.

- [x] Correct dependency/safety guidance, normal pre-1.0 version classification, feature documentation and matching README attribution.
- [x] Copy only required upstream parser/formatter kernels with revision/license provenance, scoped unsafe reasoning and compile-time backend exclusion.
- [x] Gate `From` interoperability and its examples/tests; refresh lockfiles/API baselines and verify the default graph excludes `uuid` while retaining secure generation.
- [x] Packed consumers, allocation and compilation-exclusion checks pass; the owned parser's four bounded Kani proofs and malformed-text/payload/writer regression controls pass.
- [x] Run native/debug/release, compiler-floor and optimized browser/WASI checks; the complete routine check passes on the final code tree.
- [x] Integrated evidence is in `bench/decisions.md`; packaged source and credit files pass inspection, timing limits remain explicit and disposable scratch is removed.

## Deferred comparison research

Compare maintained TypeScript runtimes and native Rust/Wasm feature variants on equivalent complete API jobs, using warmed minified JavaScript and release Rust/Wasm; exclude debug and disabled-JIT runs. Separate per-ID bridge crossings from compiled Rust loops. These research tasks are not release gates; new measurements require the consumer-call authorization and evidence required by `AGENTS.md` and `bench/AGENTS.md`.

Implementation comparisons update only `bench/results/implementations.md`; show progress in the CLI. Keep raw evidence local and untracked only for that report or an unresolved investigation; never create provisional/per-runtime reports or commit archives. Retain meaningful differences and uncertainty, not rankings from small fluctuations. Measured limits and rejected approaches belong in `bench/decisions.md`.

- [ ] Verify timed-work retention in remaining optimized jobs and engines with unchanged controls and valid-output added work. Keep full results observable to the host; checksums alone are insufficient. Cover other jobs and browser added-work sensitivity, not just Node/Bun derivation.
- [ ] Diagnose full-corpus timing variation with independent evidence separating scheduling delay, JIT/GC state and harness work. Scheduler comparisons establish no general winner. Concurrent timing cannot replace isolated costs; stable prefixes cannot justify shorter repeats. Preserve the original workerd attempt, failure log and power excerpt: repaired termination does not explain the timeout.
- [ ] Resolve Node/Deno base32 parity against the upstream baseline. Preserve failing and passing full-filter results; later passes establish neither parity nor cause. Select a repair only from corrected full-context evidence or a changed mechanism, not narrower timing replays (`bench/decisions.md` §Historical base32 slowdown and §Runtime regression checks).
- [ ] After release preparation, make latest stable Bun the 1× benchmark reference. Recalculate from matching measurements, keep Node.js as a comparison target, and label the reference runtime and version.

## Deferred distribution and guidance

- [ ] Evaluate, research and prototype [Base84](https://00f.net/2026/09/09/base84/) and a lowercase-only alternative for UUID slugs. Compare encoded length, alphabet size, URL and filename safety, decoding rules, performance and caller value against existing base64url/base32hex; preserve issued formats and require a separate decision before adding a public representation.
- [ ] Decide later whether to also publish to JSR, where Deno can load the TypeScript source; it needs a ruling against the one-npm-package rule in `dev/cross-language.md`, a condition-free Deno entry and slow-types checks.
- [ ] Propose cross-project guidance requiring packed-consumer checks to match real installed package layouts; change external guidance only with explicit approval.

## Deferred CPU and batch optimizations

The SIMD, CPU-specific and batch study is authorized now. Compare complete calls and resource costs before proposing API or feature changes; keep normal single-ID calls primary. One push through `88956ed` is authorized and complete; further pushes require authorization.

Results, input captures and limits: `bench/results/implementations.md` §CPU, WASM and API experiments; decisions and reopening conditions: `bench/decisions.md` §CPU, WASM and API candidates. Production qualification below adds borrowed slug formatting; rejected decoder/inlining candidates leave existing calls unchanged. Native AMD performance remains unmeasured; Rosetta and Zen 4 compilation do not substitute for it. Existing semantics may be reconsidered for demonstrated value; a requirement change still needs a maintainer ruling.

Article preservation is source-only: no reproduction, formula checks or independent validation of its published results. Vault commits `a4998afa5` and `49ebad592` preserve its reported matrix, plots, historical results, failure conditions and mechanisms; Vault checks and source-conservation checking pass. The separate UUID experiments distinguish portable modules, enabled instructions, JS crossings, runtime compilation and native AOT. Correct host-specific npm references and secure generation replays supersede the initial pilot's limitations.

- [x] Acquire and inspect Nugine's SIMD implementations and APIs; map supported architectures, runtime dispatch, scalar fallbacks, grammar and output ownership against this package.
- [x] Compare non-SIMD kernels too: scalar arithmetic/tables, compiler vectorization and CPU tuning, bit-operation support, batching of entropy/time and dispatch placement; label M4 native, AMD64 Rosetta and Zen 4 compile-only evidence.
- [x] Execute native and WebAssembly scalar/SIMD parsing, formatting and slug-conversion comparisons, including boundary batch sizes, dispatch, output validation, allocations and linked size; distinguish executed architectures from compile-only coverage.
- [x] Compare WebAssembly execution and feature support across Node, Bun, Deno, browser engines and standalone Wasmtime; separate full JavaScript crossings from WASI-internal loops before evaluating any default backend change.
- [x] Study and propagate `https://00f.net/2026/06/23/webassembly-runtimes-2026/` into the Knowledge Vault, including its plots and source limits; evaluate Wasmer/WAVM and Binaryen composition separately from npm distribution and per-call crossings.
- [x] Execute secure scalar/batched generation and packed npm complete-call comparisons; compare boundary costs and linked consumers separately from kernel throughput.
- [x] Evaluate Rust and npm API call sites and optional-feature/export designs from measured gains and caller burden; preserve conclusions, rejected alternatives and limits in `bench/decisions.md`.
- [x] Inspect the pushed workflow results, finish focused verification, preserve input/result evidence and remove disposable scratch. The full repository check, all 28 Kani harnesses and three formatter mutation controls pass their expected outcomes; the study is committed. Roadmap/release-note refinement details are now due from the maintainer.
- [x] After the experiments and API evaluation, extend the owned formatter's production-body proof for ASCII, byte preservation and case. All 28 Kani harnesses pass; isolated ASCII/case/payload mutations fail their intended assertions. Existing capacity/failure proofs remain intact; native compilation, OS entropy, I/O and tool soundness remain explicit theorem limits. Experimental kernels are not production code and require direct proofs before integration.

- [x] Compare instruction-set kernels, compiler tuning and portable alternatives on available hardware; preserve AMD64 emulation and Zen 4 compile-only limits. Single-UUID and complete parse-to-slug results are recorded with output, dispatch, allocation and linked-size evidence.
- [x] Evaluate batch generation and complete parse-to-slug crossings alongside Rust formatting and ASCII-byte parser call sites. Preserve mixed-case URNs, lowercase base32hex, output ownership and each UUID's encoding boundary; distinguish changed batch clock/state semantics and caller burden from equivalent single-ID calls.
- [x] Evaluate borrowed Display against constructing an owned slug solely for writing; record allocation savings and why existing owned slug values need no optimization. Keep direct writer methods as an alternative, not another public export without caller demand.
- [x] Compare ASCII-text bytes against UTF-8 validation plus the public parser; preserve the distinction from raw 16-byte UUID input and record the inlining confound.
- [ ] Before any production adoption, integrate the selected measured candidate with direct proofs, real typed errors and affected complete-call/resource checks. Account for dispatch, allocation, code size and maintenance; preserve wire formats, secure entropy, ownership and safety requirements. Prefer the safe scalar short decoder when evidence supports it without a dependency, not a SIMD label. Specialized instructions require support detection before execution and a portable fallback. No optimization API/default change is approved merely by these experiments.
- [ ] Obtain native AMD hardware evidence before choosing an AMD-specific implementation; Rosetta and compilation results cannot establish native speed or dispatch cost. Use GitHub `ubuntu-latest` runners (mostly AMD EPYC 7763/9V74/9V45, i.e. Zen 3/4/5, sometimes Intel Xeon): log the CPU model per job, exclude non-AMD runs, compare candidates within one job. The existing `cpx11` servers (AMD EPYC, Zen 3 in Ashburn per Hetzner's CPU FAQ) are a second source; follow Karakuri's host inventory rules before any VPS access. Running the workflow needs push authorization.

### Production evaluation

Prioritize existing single-ID calls before new API surface. The measurements below are M4 prototype evidence, not shipped guarantees or approval to change public contracts. `bench/results/implementations.md` §CPU, WASM and API experiments owns the measurements; `dev/cross-language.md` §Rust optimization owns separation of API, runtime, retained-code and compilation costs. The production-adoption task above applies to every candidate; repeat no unchanged experiments solely for reassurance.

Retain a kernel only when its production-body proofs, complete callers and resource/code-removal checks support it. New batch/API contracts remain separate decisions; release and remote-write permissions are unchanged.

Current production evaluation:

- [x] Record complete-call rejection evidence for the scalar base64, shared base32 and parser-inlining candidates; remove their prototype-only adoption claims.
- [x] Qualify the borrowed plain-slug formatter with paired timing, allocation, production-body proofs and linked consumers.
- [x] Commit the formatter with its generated API report and consumer changelog entry; run the complete repository check and both optimized WASM profiles.
- [x] Preserve the deciding inputs/results and verification receipt in the canonical report's local production evidence archive; remove disposable scratch. Base64 formatting improves and both alphabets avoid intermediate allocation; base32 speed and native AMD performance remain unestablished.

- [x] Evaluate the safe 22-character scalar base64url decoder in production. Actual owned/caller-buffer calls show no gain; retain the existing decoder, padding rejection, typed failures, atomic writes and zero allocation. Prototype savings do not justify adoption.
- [x] Evaluate the two small public-parser inlining annotations. Actual parsing saves about 0.16 ns, but uppercase formatting loses about 1.47 ns; reject both annotations without broadening inlining or requiring LTO.
- [x] Add `Uuid::display_plain_uuid_slug` for directly formatting a borrowed UUID. Both alphabets avoid one intermediate allocation; production base64 cost is 0.669–0.739× the owned route, while base32 speed remains unresolved. Existing owned slugs remain appropriate for storage; low-level encoding stays private.

### Conditional WASM improvements

Out of scope for the pre-0.7.0 sprint.

- [ ] Resolve whether WAVM offers a viable portable WASM-to-WASM optimization path before integrating it. Accept only portable optimized WASM, never native AOT objects, including inside a `.wasm` custom section (`dev/cross-language.md` §Rust optimization). The captured compile help lists unoptimized/optimized LLVM IR, native object, native assembly and `precompiled-wasm`; the tested latter output embeds native code and does not qualify. No pure-WASM optimizer output is established; retain Binaryen unless an actual supported path produces a useful portable artifact.
- [ ] Evaluate Binaryen O3/Oz only when a concrete WASM consumer values the measured module-size reduction (377,027 → 353,300/351,413 bytes) enough to accept its recorded per-call losses. Keep O2 otherwise; do not infer a general speed gain from smaller output.
- [ ] Apply standalone runtime results only to a concrete WASI caller whose complete startup, execution, RSS and instruction requirements favor another engine. Keep tested JS text-to-slug calls on JS/native paths; the measured WASM bindings lose for single and batched calls. Do not select a global default from a WASI-only kernel ranking or a feature flag alone.
