# @anizoptera/uuid-slug

- Runtime dependencies are forbidden.
- Anything whose behaviour DEPENDS on a runtime capability must be gated in BOTH runners, not just
  edits to `src/runtime/*`. Code elsewhere that branches on an optional `Runtime` method is exactly
  as runtime-asymmetric as the adapter itself, and reads as ordinary logic. Measured 2026-08-12: a
  codec branch choosing between the native base64url slug generator and its own encoder, ungated on
  the configured alphabet, left the ENTIRE vitest suite green — Bun is the only runtime defining
  `runtime.uuidV7Slug`, so Node cannot reach the branch at all. Ask which runtimes can execute the
  line, never which file it sits in.
- A change to any `src/runtime/*` adapter must be gated in BOTH runners. Vitest runs on Node and
  resolves `#runtime` to `runtime/node.ts`; `bun test test/*.bun.test.ts` resolves the `bun`
  condition to `runtime/bun.ts` and the `runtime/web.ts` it takes `fillRandom` from. Neither run
  constrains the other's adapter — measured 2026-08-11, `Math.random` written into
  `runtime/web.ts` left the ENTIRE vitest suite green, on the runtime most consumers use. The
  shared cases live in `test/entropy-probe.ts` so one list serves both.
- **A measurement names the code it means to reach; nothing checks that it got there.** This binds
  throwaway probes exactly as it binds committed tests, and every instance measured here looked
  right while observing something else. Two mechanisms shadow the named target, neither detectable
  by reading:
  Guard ordering. Where a function rejects for more than one reason, an input meant for the LATER
  rejection must pass every earlier one, or the first guard answers and the named branch never
  runs. Measured 2026-08-12: three bounds cases built on all-zero buffers were rejected by the
  version check instead, and stayed green with the bounds check deleted entirely. Delete the thing
  under test and watch the test go red; that is the only instrument that catches it.
  Fan-out behind one call. Before blaming a number on one piece of code, make sure the thing you
  called runs only that piece. An entry point that tries several implementations reports the rate
  of ALL of them together, and its try-list is invisible where you call it, so the number is an
  upper bound on the union and a measurement of no single member. Measured 2026-08-12: a wrong-key
  false-accept probe went through `maskedSlugToUuidV7` on a seed-configured codec, read 1 in 939
  against a designed 1 in 65,536, and the 16-bit check was reported to the maintainer as delivering
  only 10 bits. That codec auto-adds a 6-bit substitution partner for any seed; 211 of the 213
  accepts were the partner's, and the check itself measured 2 in 200,000 — correct. Call the
  component directly, or first prove the entry point dispatches to it alone.
- A generator that delegates to the platform must be probed through a path that cannot delegate.
  `uuidV4()`, `uuidV7()` and `uuidV7Slug()` hand off to a native generator whenever the runtime
  has one, so on Bun and Node they never touch this package's own `fillRandom`; only the byte and
  slug forms do so unconditionally. An entropy check through the string forms alone observes
  nothing of our code and passes against any randomness at all.
- Intra-millisecond ordering is NOT guaranteed and MUST NOT be made one (Art's ruling,
  2026-08-11). Native v7 generators differ — Node 26.6.0's re-randomises all 74 random bits per
  call and sorts in creation order about half the time, Bun's advances a 12-bit counter — and this
  package delegates to whichever the runtime provides. That divergence is measured and disclosed,
  never suppressed: do not add a monotonicity probe, and do not reject a native generator for it.
  The guarantees are enumerated in README §Guarantees, which is their single source; a test may
  assert those and nothing stronger. Measuring what each implementation actually does belongs in
  `bench/`, where the numbers inform rather than gate.
- A guarantee this package has not written down is not a guarantee. A test asserting one is the
  agent inventing a requirement and then repairing the code to satisfy it — which happened here:
  strict ordering was asserted, a native generator was rejected for failing it at a 6.4x
  throughput cost, and it was reported as a defect fix. Add the promise to README §Guarantees
  first, with a ruling, or assert less.
- Anything returning bytes must return a plain `Uint8Array`. Bun's native v7 yields a node
  `Buffer`, which satisfies the declared type structurally while `toString("hex")` and
  `JSON.stringify` both behave differently — code written on Bun then produces different bytes on
  Node with nothing raising. Copy at the adapter boundary; both suites pin the constructor.
- `String()` on a typed array is a UTF-8 DECODE, not a serialisation: invalid sequences all become
  U+FFFD, so distinct identifiers collapse to one key. It produced 11 false duplicates in 200,000
  draws whose bytes were provably unique. Key typed arrays by `join(",")` or hex.
- The `runtimes` job in `check.yml` runs the suite on the newest Node deliberately unpinned. The
  guarantees here depend on native behaviour that changes between releases, and the pinned lane
  cannot see a method that does not exist yet.
- `Runtime` methods are optional so ABSENCE is representable. Never define one that throws when
  the platform lacks the capability: the caller treats a defined method as a working one, so it
  calls, catches and falls back on every single invocation. That cost 64% of v7 throughput on
  Node until 0.2.1. Probe once at module load and leave the method undefined.
- Masked slugs and sentinels are core functionality, not compatibility add-ons.
- No MASKED operation may be a top-level export (Art's ruling, 2026-08-12). A bare function can
  only carry `defaultCodec`'s key, and that key is `DEFAULT_MASK_SCHEMA`'s seed — a string literal
  in the published tarball, verified 2026-08-12 by rebuilding the schema from it and recovering the
  input UUID exactly. So the shortest spelling of the headline feature was the one that obfuscates
  nothing, with a README paragraph as the only guard. `uuidV7MaskedSlug`, `uuidV7ToMaskedSlug`,
  `maskedSlugToUuid`, `maskedSlugToUuidV7`, `UUID_V7_SENTINELS` and `validateMaskedUuidV7SlugFresh`
  were removed for this; do not restore them, and do not add a keyed operation beside the keyless
  shortcuts in `index.ts`. The default key itself STAYS — Art ruled the smaller break, so
  `createUuidSlugCodec()` with no `mask` still masks under the public seed and `defaultCodec` is
  still exported. Anything keyless (generation, plain slugs) is fine as a bare function.
- A keyed operation belongs on the object holding the key. `validateMaskedUuidV7SlugFresh` was
  module-level and reached for `defaultCodec`, so it answered under the published seed and returned
  a confident Error for slugs the caller's own codec had just issued — wrong for exactly the people
  masking correctly. It shipped with NO test, which is how it survived; its replacement
  `codec.validateMaskedSlugFresh` has one that goes red against the old shape and nothing else in
  the suite does. Hidden global state in a keyed path is the defect, not the missing test.
- The masked layout is fixed by arithmetic, not taste: 22 characters, 16-bit check (Art's ruling,
  2026-08-12). A UUIDv7 carries 116 bits of real content — 42 timestamp bits (48 less the 6 that
  stay zero until 2109), 12 `rand_a`, 62 `rand_b` — because version and variant are constant for a
  v7 and need not be stored. 22 base64url characters hold 132 bits, so the check gets 132−116,
  exactly 16 — `checkBits = slugBits − 116`. `mask.ts` pins BASE64URL and splits that 16 as the 12
  bits displaced inside the block plus `spareBits(BASE64URL, 16)`; do NOT re-parameterise it by
  alphabet to make the formula look general, because masking has only one alphabet (next bullet).
  132 is a whole multiple of 6, so the check fills the spare exactly and masking is a bijection.
  A PLAIN slug is canonical by a different mechanism — `decodeInto` REJECTS non-zero padding bits,
  measured 2026-08-12 as rejecting every non-canonical sibling of a slug in both alphabets (15/15
  base64url, 3/3 base32hex). Delete it and one id gains 2^spare spellings. The arithmetic above
  is about MASKED slugs only and will not save a plain one.
- base32hex belongs to PLAIN slugs and MUST NOT be wired into masking (Art's ruling, 2026-08-12).
  It exists for sort order — a v7 leads with its timestamp and base32hex digits are in value order,
  so its slugs sort chronologically — and masked bytes are ciphertext, which sorts in no useful
  order. Wiring it there would spend 4 more characters and 2 bits of check to buy nothing.
  Sentinels stay base64url for the same reason they exist: they are matched against masked input.
  Decoding infers the alphabet from the length, 22 or 26, so it takes no alphabet argument and a
  caller cannot pick the wrong one.
- A doc that names a symbol is code with no compiler. In public-API docs name the token the CALLER
  writes (`"base32hex"`), never the internal constant it resolves to (`BASE32HEX`) — the caller's
  token is the one the type union already checks, so a rename fails the build instead of leaving a
  doc pointing at something nobody can import. Three claims went stale exactly this way in one
  session (2026-08-12); doc-alignment gates are ruled out (Art), so the wording must carry it.
- Encoding MUST reject a v7 timestamped at or past 2^42 ms (year 2109) instead of truncating it.
  Truncation makes encoding non-injective, and two UUIDs sharing one slug cannot be recovered from.
- A decoded masked slug is a CANDIDATE, never a verified id, and the contract must say so: with a
  16-bit check, 1 random string in 65,536 decodes to a well-formed UUID nobody issued, and k in
  65,536 with k keys configured. Callers match against their own store, which is what makes a wrong
  candidate a miss rather than a wrong answer. Hence `unmask` returns the newest key's candidate
  rather than erroring when two keys both match (Art's ruling, 2026-08-12) — erroring discards a
  correct answer already in hand, and a wrong candidate ends at the same not-found either way.
  It follows that a codec's false-accept rate is the SUM over every schema it tries, fixed by the
  weakest member, so NOTHING may be appended to that list on the caller's behalf. A codec once
  added two schemas of its own; measured 2026-08-12 over 200,000 wrong-key decodes, the auto-added
  6-bit partner accepted 211 against the 16-bit schema's 2. Adding a decode path is spending the
  caller's error budget, and only the caller may spend it.
- The masked format published in 0.2.0 MUST NOT be given a compatibility decode path. Nothing ever
  consumed it (Art, 2026-08-12), so a second layout tried on every decode would add wrong-answer
  surface to protect no one. This is the exception, not the rule: it holds only because that
  release had no consumers.
- Do not add old API aliases or compatibility subpaths.
- Do not mention private source project names in public files, commits, tests, fixtures, or reports.
- Sentinel slugs are always direct legacy/raw UUID slugs and are precomputed per codec instance.
- Benchmark dependencies stay dev-only and must not appear in the packed artifact.
- Publish through `publish-clean`, validate the final cleaned npm tarball, and pass `--access public --provenance`. The npm dist-tag is derived from the git tag, never hardcoded: a version with a prerelease component publishes as `next`, everything else as `latest`. A bare `npm install` resolves `latest`, so a hardcoded one hands every consumer the next release candidate the moment someone runs `bun run release prerelease`.
- Keep `@anizoptera/publish-clean` as a normal npm dependency. Never pin it to a GitHub SHA or tarball URL: this package publishes through it, so a source nobody else can resolve makes the release unreproducible for anyone but us.
- Keep npm publication in `.github/workflows/release.yml`; npm trusted publishing is keyed by workflow filename.
- Release is two jobs, and the split is what makes both true at once: `verify` runs `bun run check` on the
  tagged commit holding NO permissions, and `publish` declares `needs: verify` and does only what the
  credential is for. Never merge them: the suite must not run beside a live OIDC identity, and `preversion`
  is fast local feedback, never the gate — a hand-made tag would otherwise reach the registry, permanently.
- Releasing is four commands and no bot: `bun run changelog v<next>` drafts the section from the
  commits since the last tag, you EDIT it, you COMMIT it, then `bun run release <next>` and
  `git push --follow-tags`. The commit is not optional bookkeeping: the bump aborts on a
  dirty tree (`ERR_PNPM_UNCLEAN_WORKING_TREE`), so the drafted section must already be committed.
  The `version` script refuses to commit or tag when `CHANGELOG.md` has no section for the new
  version, and the workflow refuses to publish when that section is empty or when the tag disagrees
  with the manifest.
- `CHANGELOG.md` is the single source of the release notes; the workflow publishes the tagged
  version's section verbatim. Edit the drafted section before tagging — a commit subject says what
  changed in the tree, a release note says what a consumer gets.
- Nothing computes the version — you do. Reaching 1.0.0 is a decision, never a bump, and a pre-1.0
  breaking change is a MINOR. Tags must be annotated: a lightweight `git tag v0.3.0` fails outright
  under `tag.gpgSign = true`, which is why `bun run release` is the tagging command.
- Never read paths out of `publish-clean`'s stdout. `--tarball-out DIR` is the supported way to get
  the published bytes, into a directory the caller owns and deletes; parsing a human-facing message
  couples this repo to that tool's wording and breaks silently when it changes.
- Run `bun run check` before committing.
