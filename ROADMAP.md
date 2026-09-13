# Roadmap

Live plan only. Contracts live in README, `docs/`, and `bench/PERFORMANCE.md`; this file never owns one.

## Error handling design

- [ ] Evaluate and propose error representations and recognition with JavaScript behavior and
      performance evidence, plus separate TypeScript inference and misuse checks. Preserve
      composition without intermediate error unwrapping as required by `docs/public-api.md`
      §Failures and effects. Runtime implementation awaits design selection.

## Generated benchmark reports

- [ ] Render the `bench/matrix.ts` tables as Markdown pipe tables so `bench/results/matrix.md`
      needs no fenced fixed-width blocks. The matrix tests assert the current heading and row text.
