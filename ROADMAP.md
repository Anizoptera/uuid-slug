# Roadmap

Finish the interface redesign governed by README, `docs/public-api.md`, `docs/design.md`,
`docs/security.md`, and `docs/cross-language.md`.

## Make the change easy

- [x] Finish the export-to-consumer-job audit and delete concepts with no distinct job.
- [x] Separate no-sentinel and configured-sentinel codec paths so the default pays no sentinel work.
- [x] Capture the selected generator once at codec construction without eagerly creating state.
- [x] Remove stale implicit-sentinel assumptions from shared fixtures, tests, and benchmarks.
- [x] Replace result discrimination that relies on local `Error` identity where the value can cross
  a realm or injected seam; use the cheapest discriminator that proves the declared union.
- [x] Finish TypeScript source, declaration, runtime, and package-consumer migration.
- [x] Finish Rust codec, bridge, docs, examples, and fixture parity.
- [x] Align README, design, security, cross-language, changelog, and public declaration comments.
- [x] Set npm and Cargo to the release level required by the complete consumer effect.

## Prove the easy change

- [x] Prove each important rejected TypeScript call fails for the intended diagnostic and each
  neighboring valid call compiles through emitted package declarations.
- [x] Prove Node and Bun reach generation, optional native paths, both alphabets, empty/configured
  sentinels, rotation, migration, timestamp endpoints, injected failures, and byte ownership.
- [x] Prove shared TypeScript/Rust vectors preserve every wire spelling and candidate order.
- [x] Prove Rust's native, MSRV, feature, target, doctest, example, and Wasm lanes.
- [x] Measure only consumer-visible hot paths whose implementation changed.
- [x] Inspect the cleaned archive with a fresh package consumer.
- [x] Search the full tree for old public literals after the final names are fixed.
- [x] Run `bun run check` before each focused commit; stage explicit files and leave a clean tree.
- [x] Adversarially pair every promise above with its owning evidence and remove every part that no
  longer names a ruled demand.
