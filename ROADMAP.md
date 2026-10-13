# Remaining work

## Release notes

- [ ] Audit the combined release-notes diff from `65992d1^`, including consumer copy, hidden type dependencies, default exports, ordering, publication selection, retries, size reporting and excessive machinery.
- [ ] Resolve hidden-type changes without publishing private helper inventories: `Options.at` becoming required leaves the public `generate(options: Options)` line unchanged and currently produces an empty diff; the consumer-output design remains open.
- [x] Classify root export-condition reordering as breaking and show known archive sizes without a predecessor; both existing regression cases fail before the repair and pass afterward.
- [x] Pass workflow publication selection to fresh preparation previews and restore the development export-condition source-loading fact in the changelog; actionlint validates the changed workflow.

- [x] Separate compatibility classification from Markdown rendering; level-only callers share the same comparison without building discarded reports, and release-level precedence has one owner.

- [x] Reuse declaration lines across comparison and overload grouping; remove duplicate assertions while retaining the existing diff, ordering, publication-selection and compatibility cases.

- [x] Preserve compiler names and visibility in public diffs; omitted names, reordered overloads, export aliases and private brands have direct regression cases and pass the complete gate.
- [x] Show changed export-condition priority as a diff, keeping the affected import path and omitting unrelated entries; direct regressions cover subpath and root-condition forms.

- [x] Generate only the minimal public API changes from the latest release as Markdown diff blocks; preserve internal compatibility checks, omit inventories, private helper types, repeated older comparisons and API attachments.
- [x] Rewrite the 0.4.0 changelog as concise consumer changes and upgrade instructions, preserving relevant limits and breaking changes.
- [x] Verify report generation and complete checks, commit scoped files, update the authorized published GitHub 0.4.0 notes, and read back exact text and unchanged release assets.

Preserve supported calls, identifier formats, caller data and package compatibility. Apply
`AGENTS.md` §Work scope; further optimization needs explicit named-call authorization.

## Verification audit

Keep checks only when they distinguish a material defect from allowed behavior; preserve supported contracts, regression cases, runtime fidelity and cleanup. Change test internals locally; do not republish or change public guarantees.

- [x] Close the unsupervised Deno Vitest lane: share one Node/Deno launcher, preserve each actual runtime and Deno permissions, and run the existing interruption witness under both hosts. A surviving generated file or substituted runtime rejects the change.
- [x] Inspect Deno's two conditional entropy skips against its actual randomness selection; retain the Node-only V8 JIT and Node pool cases because Deno uses a different provider. Deno executes the shared entropy cases and passes all applicable consumer cases.

- [x] Map every test, fixture, static check, hook and CI lane to its execution owner; find omitted discovery, duplicate execution and TypeScript verification outside `__test__`.
  - [x] Move the native contract corpus intact into `__test__`; keep existing script commands and imports working through a small launcher, prove byte identity before adapting its entry, and run every discovered native transport afterward.
  - [x] Check runtime string ownership for quoted and backtick literals through the actual CLI; the old checker must miss the template cases while type literals and `typeof` narrowing remain accepted.
  - [x] Route the existing Darwin-only compression case to a macOS CI job; Linux-only discovery skips the platform behavior that the check protects. Preserve byte identity, symlinks, storage savings and cleanup without repeating the rest of the script suite.
- [x] Audit UUID generation, entropy, parsing, alphabets, masking, migration, buffers and runtime capabilities against their implementations; identify independent oracles, missed boundaries, tautologies and uncontrolled state.
  - [x] Keep the base32 reference independent of production digit metadata; swapping production digits must fail its existing encoding case while the restored implementation passes.
  - [x] Require the caller-buffer generation case to verify written UUID bytes, not just untouched surroundings; removing the write must fail. Cover the exact rollback-tolerance boundary and compare owned output constructors by identity.
  - [x] Exercise genuine mixed-case UUIDs instead of a stale replacement; verify parsed-value immutability by attempted mutation and generated-value stability by advancing its generator. Check plain conversion on codecs using different masked alphabets.
  - [x] Finish runtime-boundary, codec-boundary, legacy migration and native encoder probes against their actual selected and fallback implementations.
    - [x] Use independent native-radix references for alphabet output and check-tail bits; a swapped production digit must fail both runtime runners. Replace default burst timing assumptions with actual wire-field fidelity and remove duplicate fallback and object-shape assertions.
    - [x] Finish codec-boundary and legacy migration cases; inspect their guards, independent vectors and failure precedence before removing overlap.
      - [x] Mutate the same codec options object passed to construction; a live-options production mutation must fail. Exercise sentinel metadata mutation and consolidate repeated migration vectors without losing the nonempty masked corpus witness.
      - [x] Trace retained codec and migration rejection cases through production guards and key-order behavior; distinguish intended callback injection from simulated providers.
- [x] Audit packed consumers, compiler contracts, browsers, native/Wasm parity, release integrity and recovery; preserve distinct distribution and runtime evidence.
  - [x] Reuse the real JavaScript fine-clock and native Temporal probe in every discovered native host lane, including the Windows CI matrix; keep its wire oracle independent of package field readers and verify a fresh source bundle needs no prior dist build.
  - [x] Finish the packed consumer corpus, compiler fixture, optimizer witnesses and native/Wasm cases; inspect real producer formats before changing compiler compatibility checks.
    - [x] Require Rust buffer-write and duplicate-name cases to reach their intended guards; missing writes and a removed name guard must pass the old cases and fail the repaired cases. Cover inclusive rollback tolerance for reset and error policies without removing zero-tolerance evidence.
    - [x] Compile real deprecated Rust members with function-pointer and const-character generic owners and nested enum fields; retain annotations on their actual report entries. Use compiler metadata instead of a synthetic rustdoc shape, share compiler selection with the product API report and install its nightly toolchain in the owning CI job. Tuple fields remain part of their compound declaration, not separate report records.
    - [x] Select wire fixtures by sentinel identity and mask instead of row positions; prepare one browser corpus per Wasm profile and execute all selected browser engines with both entropy outcomes and native precision observation.
    - [x] Make native C operation failures return the documented zero status and preserve caller storage; prove the existing code fails a direct invalid-UUID C-call case, then exercise failure adaptation on every discovered native transport.
  - [x] Preserve packed export order with the complete export-map comparison; an order-only fixture must fail when that guard is removed. Reject missing source-map inputs without an unreachable embedded-source fallback.
  - [x] Execute optimizer generation witnesses against canonical spelling, version and variant bits, and compare masking with the retained wire vector; a wrong-version production stamp must fail every selected optimizer while the restored package passes.
- [x] Audit benchmark/resource guards and harness lifecycle for false greens, duplicated work, timing guesses, isolation leaks and misleading diagnostics; keep existing protected workloads and budgets.
  - [x] Prepare the identical Node conformance bundle and installed-host matrix once per Rust check; keep debug and release executions independent and report the first profile before building the next.
  - [x] Check the complete Bun lane with shared modules in shuffled orders; retain isolated execution because the apparent speed gain varies with order. Preserve every file and case, separate Node execution, and retain local/CI deadlines and cleanup.
  - [x] Route CI runtime tests, Deno resource proofs and candidate correctness probes through the existing scratch supervisor without changing test selection.
  - [x] Remove repeated API-removal and deprecation cases while retaining their stronger controls; report assertions ignore Markdown decoration but reject selection of a slower result.
- [x] Remove proved redundancy and repair actionable gaps in small verified commits; demonstrate affected checks reject the intended defect and allowed behavior passes.
- [x] Run complete local lanes and hooks, inspect discovery and cleanup, and summarize retained evidence and unresolved limitations without claiming universal coverage.
  - [x] Supervise Node Vitest scratch cleanup with the existing runner; interrupt an actual worker after its file witness, require no leftover files, and prove bypassing supervision fails the same case.
  - [x] Make the pre-commit hook own the complete check instead of repeating a manual complete check with another fast check; retain every gate, avoid cache or bypass state, and measure the full hook invocation. Its measured duration remains above the warning threshold but below the error ceiling.
  - [x] Give CI's Bun case and subprocess deadlines slower-runner headroom without raising local deadlines or overriding caller-selected flags; a real hung case must time out and clean its scratch. Reversing flag precedence must fail that witness.

## Follow-up

- [ ] Only with explicit named-call authorization, resolve the full-lane Node `Uuid.toMaskedSlug(codec)` timing gap without weakening protected calls or budgets. `bench/reports/api-minimal-complete.log` passes the gate but does not prove parity. Isolated calls and parsed-value sequences do not reproduce the loss; context placement and positional arguments do not repair it.
- [ ] Update API Extractor and benchmark packages when upstream fixes their transitive advisories (`sprintf-js`, `slugid`'s UUID dependency and `uuid64rs`'s Diesel dependency). Preserve benchmark implementations; dependency overrides would change the rivals being measured. These dependencies are excluded from the npm artifact.
