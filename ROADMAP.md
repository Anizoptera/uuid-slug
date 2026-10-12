# Remaining work

Preserve supported calls, identifier formats, caller data and package compatibility. Apply
`AGENTS.md` §Work scope; further optimization needs explicit named-call authorization.

## Follow-up

- [ ] Only with explicit named-call authorization, resolve the full-lane Node `Uuid.toMaskedSlug(codec)` timing gap without weakening protected calls or budgets. `bench/reports/api-minimal-complete.log` passes the gate but does not prove parity. Isolated calls and parsed-value sequences do not reproduce the loss; context placement and positional arguments do not repair it.
- [ ] Update API Extractor and benchmark packages when upstream fixes their transitive advisories (`sprintf-js`, `slugid`'s UUID dependency and `uuid64rs`'s Diesel dependency). Preserve benchmark implementations; dependency overrides would change the rivals being measured. These dependencies are excluded from the npm artifact.
