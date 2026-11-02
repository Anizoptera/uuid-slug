# Remaining work

## Joint Rust and TypeScript release preparation

Deliver the same capabilities and identifier formats through APIs natural to each language, with correct and predictable consumer experience first, performance and resource efficiency second, and maintenance simplicity third.

### Design, authority and completion

Preserve issued identifiers, secure entropy, caller ownership and typed failures. Keep Rust's owned `Uuid` value, immutable masking codecs and separately owned mutable generators. Keep one published Rust crate and the dependency-free TypeScript package; keep Rust dependencies when they do the best reasonable job, replacing them only for demonstrated performance or resource gains without quality loss. Keep `std` optional. Prepare the matching version selected by both manifests (currently `0.6.0-dev`, candidate `0.6.0`); do not change release versions as part of preparation.

Derive internals from these requirements; do not change user-visible APIs, behavior, guarantees or risks without a maintainer ruling. Local implementation, investigation, documentation, verification and focused commits on the current branch are authorized. Release versions, tags, pushes, publication, remote settings/secrets and finalization require explicit authorization for each operation; preparation grants none.

This is the sole live plan. Keep dependent repairs with their task and unrelated unfinished work below. Completion requires acceptance evidence tied to its command, revision, features, profile and target, with coverage limits. Replace superseded evidence; retain only what a remaining decision needs. Durable contracts belong in their existing owners.

### Prepared inputs and limits

Masked binary is implemented through `426f19c`. The seven-runtime gate, complete check, native Rust and both WebAssembly profiles pass; subsequent reader type simplification emits identical JavaScript and passes packed consumers. The Node base32 gap below remains unresolved. Development archives in `bench/reports/joint-current-artifacts.LihLzb/refresh.json` predate these changes and need refresh before release use; stable-tag verification is separate.

`bench/decisions.md` owns the fixed-size codec, `uuid` interoperability, boxed storage and O2 selections, their rejected alternatives and measurement limits. Historical native base32 masking costs about 0.8–4.8 ns more; some WASI/decoder comparisons are mixed. Deno base32 parity, other native-platform execution, hosted docs.rs, remote job duration and trusted publishing remain unverified. Keep existing regression gates; missing performance comparisons do not block preparation or authorize new experiments.

### Release holds

- [ ] Authorization required: change to the release version/create its tag only after explicit approval; run the exact-tag preparation gate and review generated release notes before any authorized push/publication.
- [ ] Authorization required: publish both verified artifacts under `dev/release.md`, verify registry bytes, configure trusted publishing, remove/revoke the bootstrap credential and verify remote state. Retain the original package selection and verified archives on partial retries; never move a published tag or omit a selected package. Keep the release draft until destinations, attachments, notes and provenance match.

## Runtime support

- [ ] Decide later whether to also publish to JSR, where Deno can load the TypeScript source; it needs a ruling against the one-npm-package rule in `dev/cross-language.md`, a condition-free Deno entry and slow-types checks.
- [ ] Propose the Aponte agent-gotcha rule (packed-consumer checks must match real install layout) and write it only with approval.

## Follow-up

Competitor audit: `slugid` requires `uuid ^9`, with an unresolved advisory. This is dev-only; keep the upstream graph for comparison rather than silently overriding its dependencies.

- [ ] Resolve the upstream-relative Node base32 gap: its median stays about 3% higher; one full lane fails at 1.031 [1.0033, 1.1382], while the unchanged replay and seven-runtime matrix pass. The pre-reduction control also has a higher median; a direct comparison finds no resolved loss from the four reductions. Cause and parity remain unproved; preserve both outcomes and the full filter (`bench/decisions.md` §Historical base32 slowdown).
