# Remaining work

## README wording

- [x] Repair writing rules and related explanations: retain precise terms, describe concrete failures, and keep general security advice out of the opening.
- [x] Shorten README wording without changing the exact slogan, identifier formats or public API.
- [ ] Complete masked generation and decoding examples; name the plain and masked readers beside format-selection advice.
- [ ] Separate output choices from accepted UUID text; remove the duplicate diagram only after verifying the table preserves its distinctions.
- [ ] Move sentinel, buffer and payload recipes to the existing reference; read each destination before removing the source and preserve limits, ownership and reasons.
- [ ] Consolidate ordering explanations, state the masking range in useful units, and describe the existing stored-ID compatibility policy without adding guarantees.
- [ ] Highlight unchanged database keys, compact URLs and filenames, offline IDs, buffers, types, migration and runtime support once where each changes a reader's choice.
- [ ] Run the final examples, check links and desktop layout, inspect the total diff, and commit through the complete check hook.

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
