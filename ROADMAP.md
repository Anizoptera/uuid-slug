# Remaining work

## Joint Rust and TypeScript release preparation

Deliver the same capabilities and identifier formats through APIs natural to each language, with correct and predictable consumer experience first, performance and resource efficiency second, and maintenance simplicity third.

### Design, authority and completion

Preserve issued identifiers, secure entropy, caller ownership and typed failures. Keep Rust's owned `Uuid` value, immutable masking codecs and separately owned mutable generators. Keep one published Rust crate and the dependency-free TypeScript package; keep Rust dependencies when they do the best reasonable job, replacing them only for demonstrated performance or resource gains without quality loss. Keep `std` optional. Prepare the matching version selected by both manifests (currently `0.6.0-dev`, candidate `0.6.0`); do not change release versions as part of preparation.

Derive internals from these requirements; do not change user-visible APIs, behavior, guarantees or risks without a maintainer ruling. Local implementation, investigation, documentation, verification and focused commits on the current branch are authorized. Release versions, tags, pushes, publication, remote settings/secrets and finalization require explicit authorization for each operation; preparation grants none.

This is the sole live plan. Keep dependent repairs with their task and unrelated unfinished work below. Completion requires acceptance evidence tied to its command, revision, features, profile and target, with coverage limits. Replace superseded evidence; retain only what a remaining decision needs. Durable contracts belong in their existing owners.

Current request: implement exactly 16-byte masked binary IDs consistently in TypeScript and Rust for client-visible transfer and serialization. Reuse the existing mixed block and accept the same UUID forms and codec configuration as masked slugs. Preserve issued text IDs, key rotation, sentinels, caller ownership and ordinary-call costs. The Node base32 gap remains open below; release operations remain held.

The binary block carries the 12 inner check bits; text keeps its four additional outer bits. These are representation facts, not new masking schemes. Keyed binary operations belong to the existing masking codec; raw and masked 16-byte arrays require explicit source meaning. Do not add a larger representation or a separate client-conversion protocol.

### Prepared inputs and limits

The checked implementation is `2145632`; `bench/reports/ts-investigation.pZxlFS/verification.json` records the passing full lane and seven-runtime gate, without clearing the Node base32 gap below. `bench/reports/joint-current-artifacts.LihLzb/refresh.json` binds older development npm/crate archives to their source and hashes; those archives predate the reductions and need refresh before release use. Stable-tag verification is separate.

`bench/decisions.md` owns the fixed-size codec, `uuid` interoperability, boxed storage and O2 selections, their rejected alternatives and measurement limits. Historical native base32 masking costs about 0.8–4.8 ns more; some WASI/decoder comparisons are mixed. Deno base32 parity, other native-platform execution, hosted docs.rs, remote job duration and trusted publishing remain unverified. Keep existing regression gates; missing performance comparisons do not block preparation or authorize new experiments.

### Release holds

- [ ] Authorization required: change to the release version/create its tag only after explicit approval; run the exact-tag preparation gate and review generated release notes before any authorized push/publication.
- [ ] Authorization required: publish both verified artifacts under `dev/release.md`, verify registry bytes, configure trusted publishing, remove/revoke the bootstrap credential and verify remote state. Retain the original package selection and verified archives on partial retries; never move a published tag or omit a selected package. Keep the release draft until destinations, attachments, notes and provenance match.

## Runtime support

- [ ] Decide later whether to also publish to JSR, where Deno can load the TypeScript source; it needs a ruling against the one-npm-package rule in `dev/cross-language.md`, a condition-free Deno entry and slow-types checks.
- [ ] Propose the Aponte agent-gotcha rule (packed-consumer checks must match real install layout) and write it only with approval.

## Follow-up

Competitor audit: `slugid` requires `uuid ^9`, with an unresolved advisory. This is dev-only; keep the upstream graph for comparison rather than silently overriding its dependencies.

- [x] Requalify Node `Uuid.toMaskedSlug(codec)` in the full primary-call workload. Two fresh invocations on Node 26.13.0 and two on Node 24.22.0 pass all 62 comparisons against `c7e5da6^`; parsed-value masking median ratios span 0.983–1.000. No resolved slowdown reproduces, so no source repair is selected. This proves neither parity nor a historical cause; retain ordinary gates and reopen on a corrected full-context failure. Evidence and limits: `bench/decisions.md` §Historical base32 slowdown.
- [x] Requalify the historical Node `bytes.base32` loss with the corrected harness. The same four full-filter invocations pass without dropping another call; median ratios remain 1.019–1.043 and all family-corrected intervals span one. Preserve the earlier 3–5% result as historical, not a diagnosed current defect or disproved observation. No repair or split writer is accepted; the earlier split's Bun/WebKit losses remain relevant. Evidence, exact commands and unresolved limits: `bench/decisions.md` §Historical base32 slowdown.
- [ ] Resolve the upstream-relative Node base32 gap: its median stays about 3% higher; one full lane fails at 1.031 [1.0033, 1.1382], while the unchanged replay and seven-runtime matrix pass. The pre-reduction control also has a higher median; a direct comparison finds no resolved loss from the four reductions. Cause and parity remain unproved; preserve both outcomes and the full filter (`bench/decisions.md` §Historical base32 slowdown).
- [ ] Implement 16-byte masked binary conversion in the existing TypeScript and Rust codecs; retain every UUID payload bit, the configured timestamp range, sentinel priority, key order and failure propagation. Keep existing text paths unchanged; reject reserved-value collisions rather than decode to another identity.
  - [x] Correct owning wire/security/interface guidance and remove superseded proposal gates before code; keep the general prevention at the auto-loaded owner.
  - [ ] Add the binary codec operations and types through shared masking primitives, with caller-buffer writes that commit only on success and explicit masked provenance.
  - [ ] Extend shared contract cases and adapters for fixed wire bytes, both text alphabets, sentinels, rotation, range boundaries, callback errors and ownership; test packaged types and ordinary-call regressions, then run the complete lane.

## Code reduction

Each item must keep behaviour, public API (`api/typescript.api.d.ts`), speed, resource use and bundle size.

The six candidates are decided in `bench/decisions.md` §Internal reduction candidates. Independent packed comparisons use `c698f57`, whose implementation hashes match the prepared `e465685` sources. The four retained reductions pass the unchanged all-runtime performance/resource gate; this does not establish parity or large-seed speed. Reopen rejected candidates only when new evidence changes their mechanism or consequence.

Keep rejected reductions excluded: primitive-string forwarding adds classification without removing decoder work; the configured-tail helper slows Node explicit-time and Deno calls (`bench/decisions.md` §Remaining gaps and their causes); shared RFC checks add dispatch across different v4/v7 paths; CLI and quoted `NODE_OPTIONS` scans need different normalization, and CLI precedence already skips environment parsing. Reopen only with evidence changing those mechanisms.

- [x] In `src/payload.ts`, format private 16-byte `unmix` candidates directly; retain callback isolation and key order.
- [x] Evaluate the second-argument case predicate once per `src/migration.ts` reader; keep normalization local and preserve failure propagation.
- [x] Share the masked writer in `src/masking-codec.ts` after the borrowed-byte copy; retain common validation and sentinel priority.
- [x] Reject timestamp-writer extraction: independent JITless bounds screens resolve losses of about 8% and 10%. Keep the fixed write and its reason in `src/v7-bounds.ts`.
- [x] Share construction-only `seedWordView` in `src/mask.ts`; preserve endian interpretation, padded tails and pre-suspension snapshots.
- [x] Reject native-hex folding: fixed-size formatting would gain general range-selection work without a consistent complete-call benefit. Keep the rule at the public buffer boundary in `src/uuid.ts`.
