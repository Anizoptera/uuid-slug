# Remaining work

## README review

Items not marked "maintainer request" are leads that agents wrote, not requirements: check each against AGENTS.md §Writing public documentation before acting, and delete it if it fails. They do not authorize README edits or new measurements.

- [ ] (maintainer request) Proofread and hostile-audit every public document the README links to (`docs/*.md`, `bench/README.md`, `bench/PERFORMANCE.md`, `CONTRIBUTING.md`, the Rust crate README) for a cold reader: undefined terms, needless complexity and text that gives the reader nothing. Move any agent instructions found there to the owning `AGENTS.md`.
- [ ] Proofread the complete README for typos, grammar, ambiguous references and formatting after those repairs; preserve approved tone and sound wording. Compile changed examples independently and recheck affected links after heading edits.

## README diagram and badges

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
