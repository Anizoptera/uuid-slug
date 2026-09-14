# Roadmap

Live plan only. Contracts live in README, `docs/`, and `bench/PERFORMANCE.md`; this file never owns one.

## Public interface audit

- [x] Replace ambiguous migration booleans with call-site names that state accepted input.
  - [x] Rename source, consumer examples, cross-language probes, and benchmark callers together.
  - [x] Regenerate declarations and prove enabled-format inference rejects disabled selectors.
  - [x] Run the full gate and re-read the final declaration as a cold consumer.
- [x] Audit every TypeScript call shape from consumer code, including defaults, composition,
      configuration variants, invalid combinations, ownership, and failure recovery.
  - [x] Map each export and member to a caller job; remove or reshape parts whose burden exceeds value.
  - [x] Compile realistic source and packed consumers, and run every behavior branch changed by the audit.
  - [x] Re-read emitted declarations and editor help, then run the full gate.
- [x] Expose closed-vocabulary members by semantic names without duplicating their string literals.
  - [x] Export each alphabet choice, migration selector, and error code directly; remove public
        collections with no consumer iteration workflow.
  - [x] Prove named values work through source and packed consumer calls without array indexes.
  - [x] Update consumer documentation, regenerate declarations, and run the full gate.
- [x] Remove unsupported proof and consumer-surface debt found through the declaration inventory.
  - [x] Make each negative type case fail for the boundary its comment names.
  - [x] Keep migration selection narrowed to formats enabled on each reader.
  - [x] Correct consumer documentation, regenerate declarations, and run the full gate.

## Error handling design

- [x] Close the hostile audit of error recognition and semantic string ownership.
  - [x] Give each repeated runtime error code and alphabet name one directly imported semantic owner;
        retain no positional aliases or duplicate runtime declarations.
  - [x] Preserve later recognition paths when an earlier compatibility probe throws.
  - [x] Prove source behavior, declarations, packed exports, tree shaking, runtime cost, and the full gate.
- [x] Correct the error-recognition design against complete public calls.
  - [x] Restore one codec UUID-to-slug method for text, bytes, and preceding failures; reject the
        split surface and verify mixed-input inference and runtime dispatch.
  - [x] Put successful input-shape checks before failure recognition wherever the operation already
        validates that shape, so ordinary calls do not pay the general detector ladder.
  - [x] Compare semantically equivalent marker, local `instanceof`, native cross-realm, and portable
        fallback orders on success values, marked failures, unmarked failures, and hostile values.
  - [x] Remove benchmark rows that silently substitute constants for unavailable capabilities;
        require every named capability row to prove that capability executed.
  - [x] Run focused behavior, type, packed, resource, profile, and full checks; retain only reproduced
        wins and replace unsupported performance claims.
- [x] Implement composable `UuidSlugError` values without intermediate unwrapping.
  - [x] Rename conversions by source and destination representation; keep one codec UUID-to-slug
        method because text and bytes are two forms of the same accepted UUID value.
  - [x] Pin direct TypeScript chains, exact successful brands, wrong-representation rejection, and
        error-union retention in source and packed-consumer fixtures.
  - [x] Pin JavaScript chains, unchanged error identity, skipped output writes and callbacks,
        duplicate-package and cross-realm recognition, and malformed marker behavior.
  - [x] Compare marker-only keys, values, and property placement on actual error layouts across
        Node Current, Bun, Node LTS, Chromium, and Deno; measure recognition and complete chains.
  - [x] Implement the measured marker and ordered compatibility checks; preserve the fastest
        successful path per input shape and use local identity only where provenance permits it.
  - [x] Profile decision-relevant complete calls and retain only reproduced, material wins.
  - [x] Update public JSDoc, declarations, README examples, design evidence, and benchmark evidence.
  - [x] Run source, built, packed, browser, Bun, Node, Deno, resource, profile, and full checks; mutate
        recognition and propagation so each new test fails for its intended defect.

## Generated benchmark reports

- [ ] Render the `bench/matrix.ts` tables as Markdown pipe tables so `bench/results/matrix.md`
      needs no fenced fixed-width blocks. The matrix tests assert the current heading and row text.
