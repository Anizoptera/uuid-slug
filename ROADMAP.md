# Remaining work

## Runtime support

- [ ] Release 0.5.0 so Deno users can load the package (0.4.0 routes Deno to TypeScript, which Deno refuses inside npm packages). Needs maintainer rulings on (1) the Deno floor: 1.29 passes the floor probe, 1.28 cannot be probed (ignores `NPM_CONFIG_REGISTRY`), so the `>=1.30` reason in `dev/cross-language.md` §Runtime floors is false either way; (2) the `CHANGELOG.md` 0.5.0 section (Deno fix, `engines` floors, TypeScript 5.9 minimum). Then `bun run release 0.5.0` only with explicit authorization.
- [ ] Decide later whether to also publish to JSR, where Deno can load the TypeScript source; it needs a ruling against the one-npm-package rule in `dev/cross-language.md`, a condition-free Deno entry and slow-types checks.
- [ ] Propose the Aponte agent-gotcha rule (packed-consumer checks must match real install layout) and write it only with approval.

## Follow-up

- [ ] Only with explicit named-call authorization, resolve the full-lane Node `Uuid.toMaskedSlug(codec)` timing gap without weakening protected calls or budgets. The full lane passes its gate but does not prove parity. Isolated calls and parsed-value sequences do not reproduce the loss; context placement and positional arguments do not repair it.
- [ ] When `bun audit` reports them fixed upstream, update `@microsoft/api-extractor` (`sprintf-js` via `argparse ~1.0.9`) and `slugid` (`uuid ^9`). Both are development-only. Never override a benchmark rival's dependencies: that changes what is measured. Diesel alerts (via `uuid64rs`) are dismissed on GitHub as unused code.
- [ ] Decide on a masked binary form for transport that must hide the UUID structure. The masked payload is 132 bits (42-bit time offset, 74 payload bits, 16-bit check), so it needs 17 bytes; 16 bytes would mean a 12-bit check (a wrong key passes about 1 time in 4,096) or a shorter time range. Masked text slugs are unaffected.
