# Roadmap

Live plan only. Contracts live in README, `docs/`, and `bench/PERFORMANCE.md`; this file never owns one.

## Generated benchmark reports

Goal: `bench/RESULTS.md` is a hand-pasted snapshot that rots silently. Replace it with reports the
harness writes into a git-tracked `bench/results/` directory, so a re-run refreshes them and a stale
report shows its own date. Ratios and verdicts matter; absolute figures drift per machine.

- [ ] Wire `bench/generation-report.ts` (renderer, written and unwired) into
      `bench/generation-matrix.ts` behind a `--write` flag that refuses `--smoke`; write
      `bench/results/competitors.jsonl` (raw records) and `bench/results/competitors.md`.
- [ ] Give `bench/matrix.ts` the same `--write` flag: Markdown pipe tables, a generated preamble
      carrying the method, column legend, and limits now in `bench/RESULTS.md`, then delete
      `bench/RESULTS.md` and repoint the `bench/candidates.ts` comment.
- [ ] Add `bench:results` to `package.json`, document `bench/results/` in `bench/README.md`, and
      add renderer tests to `__test__/benchmark.bun.test.ts` (verdict classification, exclusions,
      refused smoke input). The existing matrix tests assert the `Randomness —` heading text.
- [ ] Link the generated competitor report from README §Measured performance as the latest run.
