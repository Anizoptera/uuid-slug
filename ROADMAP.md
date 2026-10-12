# Remaining work

Preserve supported calls, identifier formats, caller data and package compatibility. Apply
`AGENTS.md` §Work scope; further optimization needs explicit named-call authorization.

## Verification audit

Keep checks only when they distinguish a material defect from allowed behavior; preserve supported contracts, regression cases, runtime fidelity and cleanup. Change test internals locally; do not republish or change public guarantees.

- [ ] Map every test, fixture, static check, hook and CI lane to its execution owner; find omitted discovery, duplicate execution and TypeScript verification outside `__test__`.
- [ ] Audit UUID generation, entropy, parsing, alphabets, masking, migration, buffers and runtime capabilities against their implementations; identify independent oracles, missed boundaries, tautologies and uncontrolled state.
- [ ] Audit packed consumers, compiler contracts, browsers, native/Wasm parity, release integrity and recovery; preserve distinct distribution and runtime evidence.
- [ ] Audit benchmark/resource guards and harness lifecycle for false greens, duplicated work, timing guesses, isolation leaks and misleading diagnostics; keep existing protected workloads and budgets.
- [ ] Remove proved redundancy and repair actionable gaps in small verified commits; demonstrate affected checks reject the intended defect and allowed behavior passes.
- [ ] Run complete local lanes and hooks, inspect discovery and cleanup, and summarize retained evidence and unresolved limitations without claiming universal coverage.

## Follow-up

- [ ] Only with explicit named-call authorization, resolve the full-lane Node `Uuid.toMaskedSlug(codec)` timing gap without weakening protected calls or budgets. `bench/reports/api-minimal-complete.log` passes the gate but does not prove parity. Isolated calls and parsed-value sequences do not reproduce the loss; context placement and positional arguments do not repair it.
- [ ] Update API Extractor and benchmark packages when upstream fixes their transitive advisories (`sprintf-js`, `slugid`'s UUID dependency and `uuid64rs`'s Diesel dependency). Preserve benchmark implementations; dependency overrides would change the rivals being measured. These dependencies are excluded from the npm artifact.
