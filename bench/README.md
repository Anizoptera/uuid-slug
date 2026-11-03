# Benchmarks

Read the [performance decisions](decisions.md) (what each call keeps, why, and what lost), browse [generated reports](results/), or rerun the comparisons below.

## Run a comparison

Run commands from the repository root. Install dependencies with `bun install`. Benchmarks need Bun and the runtimes you select.

```sh
bun run bench:competitors --smoke
```

Drop `--smoke` for repeated measurements.

| Job | Command |
| --- | --- |
| Compare UUID generation, slugs and timestamp extraction | `bun run bench:competitors` |
| Compare conversion and audit randomness | `bun run bench:matrix` |
| Compare TypeScript, native Rust and WASM implementations | `bun run bench:implementations` (`--smoke` checks wiring only) |
| Compare Rust generators | `bun run bench:competitors:rust` |
| Inspect linked Rust consumers in release and ThinLTO builds | `bun bench/rust-linked.ts /path/to/extracted/crate [consumer ...]` (set `LLVM_NM` if `llvm-nm` is not on PATH; browser checks require matching `wasm-bindgen-cli` and the installed Playwright engines) |
| Record timing and resource use | `bun run bench:profile` |
| Add native CPU and allocation profiles | `bun run bench:profile:native` |
| Compare against a Git revision | `bun run bench:compare BASELINE_REF` |
| Refresh tracked reports | `bun run bench:results` |

Select calls with `UUID_SLUG_GENERATION_FILTER` for competitor comparisons or `UUID_SLUG_PROFILE_FILTER` for profiles. Profiling accepts `=case` for an exact match; generation filters match case-name substrings.

```sh
UUID_SLUG_GENERATION_FILTER=v7.text bun run bench:competitors
UUID_SLUG_PROFILE_FILTER=plain.encode bun run bench:profile:native
```

## Read the output

Comparisons show each call's runtime, fastest library and native reference, relative speed and uncertainty. Profiles show timing, CPU and memory costs. Allocation profiles estimate allocation; heap snapshots show retention.

Raw measurements, profiles and captured inputs go to `bench/reports/`. Git ignores that folder, so its files exist only on the machine that ran them.

`bun run bench:implementations` updates the single report at `bench/results/implementations.md`; that report links to its raw evidence. Rerender the same report without timing with `bun run bench:implementations --report bench/results/implementations.md`; add `--baseline <lane>` to change the reference. Explicit `.jsonl` inputs still work. Set `UUID_SLUG_IMPLEMENTATION_FILTER` to comma-separated job substrings or `UUID_SLUG_IMPLEMENTATION_REPORT` to select the canonical `.md` path. Acquisition progress stays in the CLI; no provisional or per-runtime Markdown reports are generated. Keep raw evidence only for the current report or an unresolved investigation. Smoke uses the same runtime matrix with fewer samples; it establishes wiring only.

## More controls

Resume an interrupted implementation comparison with `bun run bench:implementations --resume <raw-file>`, using the evidence path printed by the failed run. It reuses complete four-process windows after checking collectors, artifacts, versions, host and settings, then reacquires the interrupted window. The saved schedule controls remaining work. Older captures without recovery receipts require source-checked migration; completed captures need only `--report`.

The [benchmark methods](methods.md) cover runtime selection, report recovery and profiling:

- [Report controls](methods.md#reports-and-controls)
- [Source experiments](methods.md#source-experiments)
- [Measurement limits](methods.md#measurement-limits)
- [Regression checks](methods.md#regression-protection)
- [Profiling](methods.md#profiling)
