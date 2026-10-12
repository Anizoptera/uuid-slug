# Remaining work

Preserve supported calls, identifier formats, caller data and package compatibility. Apply
`AGENTS.md` §Work scope; further optimization needs explicit named-call authorization.

## Verification audit

Keep checks only when they distinguish a material defect from allowed behavior; preserve supported contracts, regression cases, runtime fidelity and cleanup. Change test internals locally; do not republish or change public guarantees.

- [ ] Map every test, fixture, static check, hook and CI lane to its execution owner; find omitted discovery, duplicate execution and TypeScript verification outside `__test__`.
- [ ] Audit UUID generation, entropy, parsing, alphabets, masking, migration, buffers and runtime capabilities against their implementations; identify independent oracles, missed boundaries, tautologies and uncontrolled state.
  - [x] Keep the base32 reference independent of production digit metadata; swapping production digits must fail its existing encoding case while the restored implementation passes.
  - [x] Require the caller-buffer generation case to verify written UUID bytes, not just untouched surroundings; removing the write must fail. Cover the exact rollback-tolerance boundary and compare owned output constructors by identity.
- [ ] Audit packed consumers, compiler contracts, browsers, native/Wasm parity, release integrity and recovery; preserve distinct distribution and runtime evidence.
  - [x] Preserve packed export order with the complete export-map comparison; an order-only fixture must fail when that guard is removed. Reject missing source-map inputs without an unreachable embedded-source fallback.
- [ ] Audit benchmark/resource guards and harness lifecycle for false greens, duplicated work, timing guesses, isolation leaks and misleading diagnostics; keep existing protected workloads and budgets.
  - [x] Route CI runtime tests, Deno resource proofs and candidate correctness probes through the existing scratch supervisor without changing test selection.
- [ ] Remove proved redundancy and repair actionable gaps in small verified commits; demonstrate affected checks reject the intended defect and allowed behavior passes.
- [ ] Run complete local lanes and hooks, inspect discovery and cleanup, and summarize retained evidence and unresolved limitations without claiming universal coverage.

## Follow-up

- [ ] Only with explicit named-call authorization, resolve the full-lane Node `Uuid.toMaskedSlug(codec)` timing gap without weakening protected calls or budgets. `bench/reports/api-minimal-complete.log` passes the gate but does not prove parity. Isolated calls and parsed-value sequences do not reproduce the loss; context placement and positional arguments do not repair it.
- [ ] Update API Extractor and benchmark packages when upstream fixes their transitive advisories (`sprintf-js`, `slugid`'s UUID dependency and `uuid64rs`'s Diesel dependency). Preserve benchmark implementations; dependency overrides would change the rivals being measured. These dependencies are excluded from the npm artifact.
