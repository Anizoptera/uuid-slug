# Benchmarks

Read the [performance decisions](decisions.md) (what each call keeps, why, and what lost), browse [generated reports](results/), or rerun the comparisons below.

## Run a comparison

Run commands from the repository root. Install dependencies with `bun install`.
Benchmarks need Bun and the runtimes you select.

```sh
bun run bench:competitors --smoke
```

Drop `--smoke` for repeated measurements.

| Job | Command |
| --- | --- |
| Compare UUID generation, slugs and timestamp extraction | `bun run bench:competitors` |
| Compare conversion and audit randomness | `bun run bench:matrix` |
| Compare Rust generators | `bun run bench:competitors:rust` |
| Record timing and resource use | `bun run bench:profile` |
| Add native CPU and allocation profiles | `bun run bench:profile:native` |
| Compare against a Git revision | `bun run bench:compare BASELINE_REF` |
| Refresh tracked reports | `bun run bench:results` |

Select calls with `UUID_SLUG_GENERATION_FILTER` for competitor comparisons or
`UUID_SLUG_PROFILE_FILTER` for profiles. Profiling accepts `=case` for an exact match;
generation filters match case-name substrings.

```sh
UUID_SLUG_GENERATION_FILTER=v7.text bun run bench:competitors
UUID_SLUG_PROFILE_FILTER=plain.encode bun run bench:profile:native
```

## Read the output

Comparisons show each call's runtime, fastest library and native reference, relative speed and uncertainty.
Profiles show timing, CPU and memory costs. Allocation profiles estimate allocation; heap snapshots show retention.

Raw measurements, profiles and captured inputs go to `bench/reports/`. Git ignores that folder, so its files exist only on the machine that ran them.

## More controls

The [benchmark methods](methods.md) cover runtime selection, report recovery and profiling:

- [Report controls](methods.md#reports-and-controls)
- [Source experiments](methods.md#source-experiments)
- [Measurement limits](methods.md#measurement-limits)
- [Regression checks](methods.md#regression-protection)
- [Profiling](methods.md#profiling)
