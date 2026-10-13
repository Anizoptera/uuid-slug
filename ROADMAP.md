# Remaining work

Preserve supported calls, identifier formats, caller data and package compatibility. Apply
`AGENTS.md` §Work scope; further optimization needs explicit named-call authorization.

## Verification audit

Keep checks only when they distinguish a material defect from allowed behavior; preserve supported contracts, regression cases, runtime fidelity and cleanup. Change test internals locally; do not republish or change public guarantees.

- [ ] Map every test, fixture, static check, hook and CI lane to its execution owner; find omitted discovery, duplicate execution and TypeScript verification outside `__test__`.
  - [x] Check runtime string ownership for quoted and backtick literals through the actual CLI; the old checker must miss the template cases while type literals and `typeof` narrowing remain accepted.
  - [x] Route the existing Darwin-only compression case to a macOS CI job; Linux-only discovery skips the platform behavior that the check protects. Preserve byte identity, symlinks, storage savings and cleanup without repeating the rest of the script suite.
- [ ] Audit UUID generation, entropy, parsing, alphabets, masking, migration, buffers and runtime capabilities against their implementations; identify independent oracles, missed boundaries, tautologies and uncontrolled state.
  - [x] Keep the base32 reference independent of production digit metadata; swapping production digits must fail its existing encoding case while the restored implementation passes.
  - [x] Require the caller-buffer generation case to verify written UUID bytes, not just untouched surroundings; removing the write must fail. Cover the exact rollback-tolerance boundary and compare owned output constructors by identity.
  - [x] Exercise genuine mixed-case UUIDs instead of a stale replacement; verify parsed-value immutability by attempted mutation and generated-value stability by advancing its generator. Check plain conversion on codecs using different masked alphabets.
  - [ ] Finish runtime-boundary, codec-boundary, legacy migration and native encoder probes against their actual selected and fallback implementations.
    - [x] Use independent native-radix references for alphabet output and check-tail bits; a swapped production digit must fail both runtime runners. Replace default burst timing assumptions with actual wire-field fidelity and remove duplicate fallback and object-shape assertions.
    - [ ] Finish codec-boundary and legacy migration cases; inspect their guards, independent vectors and failure precedence before removing overlap.
      - [x] Mutate the same codec options object passed to construction; a live-options production mutation must fail. Exercise sentinel metadata mutation and consolidate repeated migration vectors without losing the nonempty masked corpus witness.
      - [ ] Trace retained codec and migration rejection cases through production guards and key-order behavior; distinguish intended callback injection from simulated providers.
- [ ] Audit packed consumers, compiler contracts, browsers, native/Wasm parity, release integrity and recovery; preserve distinct distribution and runtime evidence.
  - [ ] Finish the packed consumer corpus, compiler fixture, optimizer witnesses and native/Wasm cases; inspect real producer formats before changing compiler compatibility checks.
    - [x] Require Rust buffer-write and duplicate-name cases to reach their intended guards; missing writes and a removed name guard must pass the old cases and fail the repaired cases. Cover inclusive rollback tolerance for reset and error policies without removing zero-tolerance evidence.
    - [x] Compile real deprecated Rust members with function-pointer and const-character generic owners and nested enum fields; retain annotations on their actual report entries. Use compiler metadata instead of a synthetic rustdoc shape, share compiler selection with the product API report and install its nightly toolchain in the owning CI job. Tuple fields remain part of their compound declaration, not separate report records.
    - [x] Select wire fixtures by sentinel identity and mask instead of row positions; prepare one browser corpus per Wasm profile and execute all selected browser engines with both entropy outcomes and native precision observation.
    - [x] Make native C operation failures return the documented zero status and preserve caller storage; prove the existing code fails a direct invalid-UUID C-call case, then exercise failure adaptation on every discovered native transport.
  - [x] Preserve packed export order with the complete export-map comparison; an order-only fixture must fail when that guard is removed. Reject missing source-map inputs without an unreachable embedded-source fallback.
  - [x] Execute optimizer generation witnesses against canonical spelling, version and variant bits, and compare masking with the retained wire vector; a wrong-version production stamp must fail every selected optimizer while the restored package passes.
- [ ] Audit benchmark/resource guards and harness lifecycle for false greens, duplicated work, timing guesses, isolation leaks and misleading diagnostics; keep existing protected workloads and budgets.
  - [x] Route CI runtime tests, Deno resource proofs and candidate correctness probes through the existing scratch supervisor without changing test selection.
  - [x] Remove repeated API-removal and deprecation cases while retaining their stronger controls; report assertions ignore Markdown decoration but reject selection of a slower result.
- [ ] Remove proved redundancy and repair actionable gaps in small verified commits; demonstrate affected checks reject the intended defect and allowed behavior passes.
- [ ] Run complete local lanes and hooks, inspect discovery and cleanup, and summarize retained evidence and unresolved limitations without claiming universal coverage.
  - [ ] Make the pre-commit hook own the complete check instead of repeating a manual complete check with another fast check; retain every gate, avoid cache or bypass state, and measure the full hook invocation.
  - [x] Give CI's Bun case and subprocess deadlines slower-runner headroom without raising local deadlines or overriding caller-selected flags; a real hung case must time out and clean its scratch. Reversing flag precedence must fail that witness.

## Follow-up

- [ ] Only with explicit named-call authorization, resolve the full-lane Node `Uuid.toMaskedSlug(codec)` timing gap without weakening protected calls or budgets. `bench/reports/api-minimal-complete.log` passes the gate but does not prove parity. Isolated calls and parsed-value sequences do not reproduce the loss; context placement and positional arguments do not repair it.
- [ ] Update API Extractor and benchmark packages when upstream fixes their transitive advisories (`sprintf-js`, `slugid`'s UUID dependency and `uuid64rs`'s Diesel dependency). Preserve benchmark implementations; dependency overrides would change the rivals being measured. These dependencies are excluded from the npm artifact.
