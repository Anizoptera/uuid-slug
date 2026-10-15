# Remaining work

## README review

These items track unresolved copy; they do not authorize README edits or new measurements.

- [ ] Link opening benefits to working examples and details. Connect related sections where the next question concerns representations, types/errors, buffers, ordering, masking, rotation, migration or recovery; use descriptive link text and avoid repeated links that add no navigation value.
- [ ] Read each section as a direct entry point. Keep the definitions, types, defaults, units and limits needed to understand its claims and use its examples there; link shared detail instead of copying it. Merge repetition only when the section remains usable on its own.
- [ ] Reconcile the opening, examples, representation/API tables and guarantees with each other and their owning contracts. Fix inconsistent names, accepted forms, results, runtime requirements, package availability and upgrade/recovery guidance; preserve distinct benefits and supported claims.
- [ ] Proofread the complete README for typos, grammar, ambiguous references and formatting after those repairs; preserve approved tone and sound wording. Compile changed examples independently and recheck affected links after heading edits.
- [ ] Distinguish implemented TS/Rust/WASM support from published packages near installation; replace "published soon" with concrete availability when known.
- [ ] Merge repeated ordering, supplied-time and clock-control bullets while retaining configurable rollback and payload layouts.
- [ ] Merge repeated type-safety and composition bullets while retaining validation, buffer integrity and stable error codes.
- [ ] Merge overlapping sentinel and reserved-ID bullets while retaining recognizable values, rotation behavior and application uses.
- [ ] Explain the optional UUID object's benefit: validate and decode once, then reuse it for conversion and inspection.
- [ ] State near the opening that plain conversion is lossless and the TypeScript package needs no native addon or WebAssembly.
- [ ] Clarify "at every site" and replace "manually tailored" with a concrete API benefit, preserving the confident tone.
- [ ] Surface plain decoding without keys or this library, and retained settings for masked decoding, earlier in the adoption guidance.
- [ ] Resolve adoption questions about production-use evidence and maintenance/support commitments from evidence or a maintainer ruling; do not infer them from benchmarks or invent promises.

## README diagram and badges

- [ ] Push `7b17025` (badges, diagram after badges linking to the raw SVG) once runtime badges are final; pushes need explicit authorization.
- [ ] Runtime badges: one consistent two-part style like the Node badge (logo label, version value); colours readable on light and dark GitHub; Cloudflare Workers labelled "cloud | workers" with the Cloudflare logo; Bun and Deno show measured version floors.

## Runtime support

Published 0.4.0 does not load in Deno: its `deno` condition selects TypeScript, which Deno refuses inside npm packages. Development now routes Deno to compiled output; Deno users need the next release.

Floors, their reasons and the measuring method live in `docs/cross-language.md` §Runtime floors.

- [ ] Decide later whether to also publish to JSR, where Deno can load the TypeScript source; it needs a ruling against the one-npm-package rule in `docs/cross-language.md`, a condition-free Deno entry and slow-types checks.
- [ ] Propose the Aponte agent-gotcha rule (packed-consumer checks must match real install layout) and write it only with approval.

## Release notes

Show consumers the minimal API changes from the latest release in Markdown diff blocks.
Follow `docs/release.md`: include only selected packages, omit private helper types and inventories,
and preserve internal compatibility checks, supported calls, identifier formats and caller data.
Remote writes require explicit authorization; `AGENTS.md` §Work scope governs preparation.

- [ ] Settle the consumer output for referenced non-exported types: `Options.at` becoming required makes `generate({})` invalid while `generate(options: Options)` stays unchanged and the diff is empty. The maintainer must resolve whether to show changed referenced declarations under the affected public function or expand its argument/result shapes; do not drop automatic diffs or publish helper types without that ruling.

- [ ] After the output ruling, repair `scripts/release-comparison.ts` and its existing release tests: referenced argument/result changes must produce a readable diff; unrelated helpers and unchanged declarations must remain absent. Prove the regression fails before the fix, preserve compatibility classification, and let the commit hook run the complete check.

## Follow-up

- [ ] Only with explicit named-call authorization, resolve the full-lane Node `Uuid.toMaskedSlug(codec)` timing gap without weakening protected calls or budgets. `bench/reports/api-minimal-complete.log` passes the gate but does not prove parity. Isolated calls and parsed-value sequences do not reproduce the loss; context placement and positional arguments do not repair it.
- [ ] Recheck upstream fixes for API Extractor and benchmark transitive advisories (`sprintf-js`, `slugid`'s UUID dependency and `uuid64rs`'s Diesel dependency), then update affected packages. Preserve benchmark implementations; dependency overrides change the rivals being measured. Keep these development dependencies out of the npm artifact.
- [ ] Decide on a masked binary form for transport that must hide the UUID structure. The masked payload is 132 bits (42-bit time offset, 74 payload bits, 16-bit check), so it needs 17 bytes; 16 bytes would mean a 12-bit check (a wrong key passes about 1 time in 4,096) or a shorter time range. Masked text slugs are unaffected.
