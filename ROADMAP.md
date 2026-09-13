# Roadmap

Live plan only. Contracts live in README, `docs/`, and `bench/PERFORMANCE.md`; this file never owns one.

## Error handling design

- [x] Implement composable `UuidSlugError` values without intermediate unwrapping.
  - [x] Rename conversions and codec methods by source and destination representation; split codec
        text and byte inputs so names, types, and runtime paths agree without aliases.
  - [x] Pin direct TypeScript chains, exact successful brands, wrong-representation rejection, and
        error-union retention in source and packed-consumer fixtures.
  - [x] Pin JavaScript chains, unchanged error identity, skipped output writes and callbacks,
        duplicate-package and cross-realm recognition, and malformed marker behavior.
  - [x] Compare marker-only keys, values, and property placement on actual error layouts across
        Node Current, Bun, Node LTS, Chromium, and Deno; measure recognition and complete chains.
  - [x] Implement the measured marker and ordered compatibility checks with no `instanceof` in
        package-owned result handling; preserve the fastest successful path per input shape.
  - [x] Profile decision-relevant complete calls and retain only reproduced, material wins.
  - [x] Update public JSDoc, declarations, README examples, design evidence, and benchmark evidence.
  - [x] Run source, built, packed, browser, Bun, Node, Deno, resource, profile, and full checks; mutate
        recognition and propagation so each new test fails for its intended defect.

## Generated benchmark reports

- [ ] Render the `bench/matrix.ts` tables as Markdown pipe tables so `bench/results/matrix.md`
      needs no fenced fixed-width blocks. The matrix tests assert the current heading and row text.
