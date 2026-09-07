Finish the approved audit repairs without changing publish-clean until Art releases that package.

# Working ledger

This temporary SOP owns remaining tasks and evidence. Durable contracts stay in README, docs/design.md, project guidance, and source comments.

## Authority and boundaries

- Baseline: `5cea76decbe953ac0cb64f7daf1cc344dc65a941`; Art approved implementation of the full audit plan.
- Preserve the masked wire format, timestamp bound, 16-bit check, raw sentinels, first-match explicit key rotation, optional brands, public default schema, plain-only base32hex, and zero runtime dependencies.
- Do not add intra-millisecond ordering, old aliases, compatibility decoders, or a new cipher.
- Art ruled freshness windows finite and nonnegative; zero/fractions and inclusive symmetric boundaries remain valid.
- Art reserved publish-clean for another agent. Its delegated task was interrupted. That agent reports only read-only discovery, no changes, no commits, and no background processes. Its initial checkout contained foreign release-workflow/script/test edits; preserve them when work resumes.
- No publication or tag is authorized by this ledger. Prepare concrete verified changes before any necessary release decision.
- WIP: one implementation unit. Use regressions that expose the failure, targeted checks for finished units, explicit-path Conventional Commits, and full checks at integrated completion. Art's latest directive overrides the older full-check-before-every-commit instruction.
- All HLD changes require Art's ruling. Internal implementation choices derive from accepted behavior.
- Feedback ceilings: target/warn/error 0.3/1/5 seconds per case, 3/20/30 seconds per fast lane, 1/10/20 seconds per hook, 30/240/300 seconds per routine complete lane. Timers bound hangs, never establish readiness.

## Completed units

- [x] A — Preserve identity: both masked encoders recognize raw sentinels and reject ciphertext collisions; generated output carries PublicUuidV7Slug. Protect sentinel metadata and schema witnesses, preserve callback causes, capture scalar options, and reject inherited alphabet names. Original regressions failed before repair; Node/Bun contract and fixed wire-vector cases pass.
- [x] B — Repair runtime/freshness boundaries: honor injected generators in both alphabets, validate omitted-buffer offsets and explicit timestamps, preserve entropy/clock causes, share v4 implementation, narrow Bun capability types, and retain finite fractional freshness semantics. Shared Node/Bun regressions pass.
- [x] C — Validate distribution: inspect supplied archives without repacking; execute extracted package-name consumers on Node/Bun/Deno/Chromium; compile emitted declarations with TypeScript 5.7; check module graphs and all dependency declarations. Reject malformed archives, isolate bundle scratch directories, remove README regex gates, use Oxc declaration emission, and derive the CI floor from the manifest. The .mjs/.cjs cases fail when the narrower module selection is restored.
- [x] D — Repair ungated release steps: share Markdown AST note extraction between local versioning and CI, validate tags/notes before upload, reuse credential-free runtime/browser checks on tags, and compare retained archives with registry SHA-512 integrity before attestation/attachment. Existing GitHub release notes are updated. Real subprocess/local HTTP cases cover first publication, retries, missing notes, tag mismatch, uploader failure, outage, and altered archives. Exact pre-upload archive wiring remains below.
- [x] E — Review measurements/docs: reject incomplete benchmark children while preserving partial results; add real conversions/freshness/rotation measurements and a hung-child bound. Root reviewed both agents' changes, corrected remaining unsupported source claims, and independently ran their regressions and real Bun/Node smoke. Public guidance retains operative Art rulings and requires a configured quick-start seed.

## Performance work — authorized by Art while publication is held

Profile and optimize the current package on latest Node and Bun without changing its public contracts or wire format.

- [x] Establish runtimes: official Node index reports 26.8.1; npm Bun latest and official Bun site report 1.4.2. Profile exact isolated executables; project pins unchanged.
- [x] Capture package-import baselines: bench/profile.ts varies 256 input UUIDs, consumes outputs, samples repeatedly, records runtime/CPU/heap/batch time, and yields between samples. CPU measurements run sequentially.
- [ ] Profile CPU attribution, allocations/GC, retained heap, cold import/construction, caller-owned buffers, entropy refills, and burst/event-loop cost.
- [ ] Cover v4/v7 native and portable generation, explicit timestamps, both plain alphabets, masking, sentinels, key rotation, freshness, malformed inputs, and custom callbacks.
- [ ] Rank measured costs; compare removal, shared work, lookup tables, runtime primitives, specialization, buffer ownership, and algorithm-preserving rewrites before implementation. Reject speculative complexity or changed guarantees.
- [ ] Finish remaining measured improvements and resource analysis; native encoding, rotation, generation views, and byte-based freshness units are implemented and individually gated. A read-only auditor is checking the accumulated performance diff; root must independently reproduce any finding before accepting it.
- [ ] Publish reproducible profiling commands, results, rejected alternatives, resource trade-offs, limits, and any decisions needing Art in the relevant benchmark documentation.
- [ ] Run final runtime/browser/artifact checks, audit the entire performance diff, and leave a clean owned tree; retain all held publication tasks.

### Measured implementation decisions

- Native base64 encoding now carries masked tail bits by replacing only the spare low bits of the final character. Sentinel comparison uses direct indexed bytes rather than allocating a closure and invoking `every` per candidate. Fixed wire vectors, every spare-bit value, and sentinel/callback regressions pass in both runtimes.
- Portable v7 writes directly at the checked offset, removing its per-call subarray. Node v7 owned bytes measured 165→74 ns, caller-owned 79→54 ns, explicit timestamp bytes 59→35 ns; Bun injected portable output measured 44→23 ns. Latest Node targeted unit: 128 cases pass; latest Bun buffer/runtime/boundary/wire cases pass. Final matched replay pending.
- Freshness now validates decoded bytes directly; format only at a string-returning boundary. Capture timestamp/entropy before external freshness callbacks can mutate a retained custom-schema output. Plain-slug freshness measured 403→100 ns Node and 273→47 ns Bun; masked freshness 628→227 ns Node and 402→154 ns Bun. Latest Node targeted suite passes 82 cases; Bun shared boundary/runtime/wire cases pass.

- Native Uint8Array.toHex plus UUID slicing outperformed nibble/byte/unrolled loops, Buffer views/copies, array joins, per-byte radix conversion and DataView word formatting on Node 26.8.1 and Bun 1.4.2. Preserve a byte-table fallback for older engines.
- Native toBase64 initially regressed Bun v4 generation because formatUuidSlug still allocated a subarray. Removing that view for an already exact 16-byte input changed the measured median from 335 ns to 71 ns (baseline 237 ns); plain encode changed from 245 ns to 72 ns. Keep strict portable decoding; native permissiveness does not match the contract.
- Rotation now decodes text once and creates mismatch errors only after all keys fail; callbacks still receive fresh ciphertext and preserve primary causes. Combined with native formatting, previous-key median changed from 4438 to 485 ns on Node and 660 to 355 ns on Bun. Latest Node targeted mask/core/boundary suite passes 44 cases; latest Bun shared boundary/wire suite passes. Final repeated comparison remains pending.
- Encoder targeted gates: latest Node and Node 20 each pass 93 buffer/alphabet cases; latest Bun passes shared buffer/runtime/wire cases. Typed-array shared backing, offsets, every byte value and base64 length boundaries are covered. Full integrated checks remain pending.

## Remaining dependency work — held by Art

- [ ] Wait for Art's explicit release of publish-clean; inspect its then-current guidance/tree and preserve concurrent changes.
- [ ] Implement optional nonempty publish-clean.validateArtifact argv: append the absolute final tarball path, run in package cwd without a shell, in all modes, before retention/upload.
- [ ] Reject invalid configuration, launch/nonzero failure, or archive mutation; keep successful validation quiet and failed diagnostics actionable. Reuse existing infrastructure; no runtime dependencies or repacking.
- [ ] Add subprocess regressions for ordering, upload prevention, unchanged bytes, hostile arguments, and cleanup; update the dependency's existing help/docs, run its required check, review, and commit scoped changes.
- [ ] Independently audit the dependency result and arrange its reviewed registry release before adopting a normal npm dependency. No Git/local pin; publication needs its own authorization.
- [ ] Configure uuid-slug to validate and publish the same archive in one packing invocation; remove the separate workflow artifact pack. Prove no recursive packing and exact inspected/uploaded/attested bytes; preserve tag-derived dist-tag.

### Profiler audit corrections

- The independent auditor identified late errors being counted as successful throughput, uninterrupted samples being longer than their inner batch timing, and an unused fallback hex table on native engines. Root reproduced the first by deleting the new guard: its regression fails with child exit 0; restoring it rejects the injected failure. Full uninterrupted interval is now reported separately; fallback table construction is conditional.
- Compare deterministic varying inputs on all later runs. Early exploratory profiles used independently generated input sets and are provisional; final matched runs supersede their numerical claims.

## Acceptance

- [x] Audit the current accumulated diff against baseline, including agent-owned paths, for contract changes, error propagation, runtime branches, retained comments, artifact conditions, retry identity, and unnecessary checks. The benchmark agent's initial nonexistent codec methods were caught by root typecheck and corrected. Root's final module-extension audit caught and fixed a gap in archive inspection.
- [x] Verify current uuid-slug changes: bun run check exited zero in 2.31 seconds, including 205 Vitest and 152 Bun cases, build, formatting, type-aware lint, semantic types, smoke benchmark, and archive validation. Packed browser/Deno and Vite browser tests pass. Actionlint passes. Node 20.20.2, 22.23.2, and 26.8.1 each pass all 205 Node cases; the same retained archive passes consumer validation under Node 20 and 26. TypeScript 5.7 tests positive and negative emitted-brand contracts.
- [ ] After dependency integration, rerun the relevant process regressions and complete local/runtime/browser/declaration checks; audit the final total diff and verify a clean owned tree before claiming the full plan complete.

## Limits and proposals

- The plan is incomplete while the dependency hold remains. Current release.yml still checks a separate pack; it does not yet prove that the exact uploaded archive passed the new validator before upload.
- No live publication, remote CI run, DO-178C assessment, or cryptographic assurance was performed. Local workflow lint and process tests do not prove hosted credential behavior.
- The two-sample benchmark matrix verified transport and branch selection only, not throughput or randomness quality.
- No additional out-of-scope proposal was established as necessary during implementation.
