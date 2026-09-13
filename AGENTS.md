# @anizoptera/uuid-slug

Preserve the published identifier contracts and verify the runtime paths that each change reaches.

## Contract owners

- Read `docs/public-api.md` before changing or documenting a public export, type, parameter,
  default, error, runtime path, or performance characteristic; it owns interface shape and the
  declaration comments consumers see. A naming repair follows domain meaning through every
  dependent use; a compile failure never licenses restoring an opaque legacy term.
- README owns the consumer model: define each term before first use, state when this package is
  preferable to a UUID-only library, and keep its capability and representation maps consistent
  with the public API. Update the owning explanation with every consumer-visible change; do not
  copy implementation reasoning or create parallel inventories in other docs.
- Position the package by the complete consumer contract: base64url and base32hex direct slugs for
  any UUID, caller-owned storage, UUIDv7 masking and migration, typed failures, and adaptive runtime
  paths. Keep version-neutral encoding separate from UUIDv7-only masking. Generation alone is not
  distinctive. State measured losses as gaps, never hide them with hype.
- The externally visible API is reserved. Put any proposed public export, option, behavior, or
  feature change and its consumer consequences in the same pull request. Merging is the maintainer
  decision; no separate acceptance step exists.
- Keep public types that name a documented value or distinction consumers use in storage,
  parameters, return values, narrowing, or configuration. A package signature need not mention the
  type. Remove it only when no documented value or operation needs its distinction. Apply this rule
  separately to TypeScript and Rust, document the consumer effect, and verify each packaged surface.
- Define a closed public vocabulary once as an `as const` runtime value and derive its union type;
  export the value when consumers need validation, iteration, schemas, or UI choices.
- `ROADMAP.md` is transient and never owns a contract, decision, or lasting conclusion. Put
  consumer contracts in README, wire design in `docs/design.md`, security boundaries in
  `docs/security.md`, cross-language and distribution decisions in `docs/cross-language.md`, and
  measured conclusions in `bench/PERFORMANCE.md`.
- Use only `ROADMAP.md` as the live plan and execution procedure. Keep every current decision and
  unfinished atomic task there as a Markdown task, update it when evidence or scope changes, replace
  superseded state in place, and compress completed work to the facts later phases still need.
  Never create a shadow, staging, renamed, or temporary roadmap file in this repository.
- Read README §Guarantees before changing generation or tests; it owns the consumer guarantees.
  New guarantees require a maintainer ruling before code or tests impose them. Intra-millisecond ordering
  is explicitly not guaranteed: do not gate it or reject a native generator for lacking it.
  Measure implementation differences in `bench/`, where results inform rather than gate.
- Read `docs/design.md` before changing masking, mask derivation, or sentinels. Preserve its wire layout:
  masked payloads are UUIDv7-only, with a 16-bit check and timestamps below 2^42 milliseconds.
  Preserve both their 22-character base64url and lossless 27-character base32hex spellings.
  Reject overflow rather than truncate. Base64url helpers accept exactly one 16-byte UUID payload
  or its canonical 22-character spelling; reject every other length. Preserve direct-slug padding rejection.
- Explain masking without confusing problem and scope: every UUID version exposes standardized
  fields, while this package deliberately defines a masked wire format only for UUIDv7.
- Read `docs/cross-language.md` before Rust work or changes shared with TypeScript. It owns
  parity, approved filesystem-safe output and distribution boundaries. Keep base64url defaults;
  select filesystem-safe masked output independently from the direct-slug alphabet.
  Preserve length-based alphabet inference for plain decoding.
- Masked slugs and sentinels are core functionality. Sentinels use precomputed raw slugs per
  codec. Decode returns the first passing candidate in caller-specified key order, never proof
  of issuance. Do not reject multiple matches or append fallback masks on the caller's behalf.
- Every decoder must accept every value that a supported matching encoder can produce. Options
  may add accepted forms; they must not remove existing ones. Reject forms no encoder produces.
- Keyed operations belong only on the codec holding the key, including masked timestamp
  validation. Do not add top-level masked shortcuts. Codec construction requires an explicit
  private mask or `UUID_V7_TEST_MASK`; keep the published mask opt-in and remove implicit masked
  defaults. Keep codecs immutable and receiver-free; generators own mutable sequence state. A
  codec accepts generation through the minimal `generateUuidV7Bytes` seam and validates every returned
  payload before masking it.
- Preserve the frozen round count, derivation constants, seed interpretation, alphabets, tag
  widths, and `keyDerivationIterations`: changing them changes previously issued identifiers. Comments
  must explain this wire-format obligation, not historical reasons for choosing the constants.
- Do not add old API aliases, compatibility subpaths, or a compatibility decoder for 0.2.0.
  The maintainer ruled that release had no consumers; that exception does not justify breaking other formats.
- Original fixed-mask compatibility is opt-in through `codec.createMigrationDecoder`; read README's migration
  sections before changing it. Preserve sentinel priority and stored trailing-bit aliases without
  weakening ordinary strict decoding. Writers and accepted old formats remain independent.
- npm runtime dependencies are forbidden. Rust dependencies require the evidence described in
  `docs/cross-language.md`. Benchmark dependencies stay dev-only and outside published artifacts.
- Keep one public code entry while named root imports tree-shake correctly. Add a subpath only when
  packed consumers prove useful tree shaking that the root cannot provide; startup timing alone is
  insufficient.
- Order public export conditions as `types`, `bun`, `deno`, `development`, then `default`. Add a
  condition only when it selects different output or guards an incompatible lower condition. The
  private `#runtime` map selects Bun source, Deno portable source, or Node native code while built
  hosts share one implementation graph.
- Treat shipped `src` as executable package code, not source-map support. Bun MUST resolve public
  entries and `#runtime` to TypeScript. Route another TypeScript-capable runtime to source unless a
  packed consumer proves that its normal resolver cannot load this graph; document and test that
  fallback at the package boundary.
- Every relative import in `src` MUST name its real `.ts` file. The build rewrites emitted imports
  to `.js`; never omit the extension or write `.js` in TypeScript.
- Keep compiled public JavaScript executable under Bun even though Bun normally selects source.
  Its `#runtime` import MUST still select the Bun TypeScript adapter and native primitives; test
  source selection and direct compiled execution separately because one does not prove the other.
- Read `docs/public-api.md` §Package entries before changing exports or bundling. Keep each export
  path aligned with its owning source and built module. Use a facade only to hide internal exports
  or join owners. Retain a subpath only while packed measurements show lower consumer work.
- Tree-shaking checks start from named root imports for each distinct consumer job. Execute every
  result, require unrelated heavy code to be absent, and compare independent optimizer families;
  subpaths are the direct-ESM alternative, not a substitute for a removable root graph.
- Read `docs/cross-language.md` §JavaScript packaging before changing emitted module boundaries,
  internal exports, moved code, import-time initialization, tsdown, minification, source maps,
  `sideEffects`, or optimizer annotations. Before deleting a moved file, account for every original
  implementation line, comment, and consumer. The packed-artifact check MUST preserve every
  source-owned `PURE` and `NO_SIDE_EFFECTS` annotation.
- Public docs use caller-facing tokens such as `"base32hex"`, not internal symbol names.
  Documentation-alignment gates are ruled out; test the API behavior instead.
- Keep repository-only docs, benchmarks, and Rust sources out of the npm tarball when the package
  does not need them at runtime; README links do not require shipping their targets.
- Return `UuidSlugError` for every caller-caused or recoverable failure. Never add a throwing
  convenience API. Package-owned interfaces carry failures as values; adapt and contain
  exception-based dependencies at their boundary.
- Make compatible calls compose without intermediate error unwrapping. Read
  `docs/public-api.md` §Failures and effects when designing or changing composition, error
  propagation, or result types; it owns the required behavior and verification.
- Give every root export, overload family, public type, interface, property, method, option, and
  callback consumer-facing JSDoc in its owning source. Explain what changes the caller's decision:
  valid input, defaults, result and ownership, expected errors or effects, ordering, important
  limits, and realistic misuse. Equivalent operations MUST document equivalent facts with the same
  terms, TSDoc fields, and order; vary the wording only where their contracts differ. Document every
  configuration property at that property. Use the representation that serves each consumer: TSDoc
  `@param`, `@defaultValue`, `@returns`, or short `@remarks` where structured editor help
  adds information; prose, examples, or tables where they explain a workflow better. Never add tags
  to restate the signature. Omit facts already clear from the type.
  Non-public declarations may use TSDoc when editor help benefits maintainers.
- Treat public JSDoc as part of every public-source change. Update or remove affected text in the
  same edit; never leave stale documentation for a later pass. Before committing, build declarations,
  query changed symbols through the TypeScript language service, and read every changed `.d.ts`
  entry as a cold consumer. Presence checks catch omissions only; they do not prove the published
  text is useful, correct, complete, or current.
- Comments carry contracts and design decisions. Before deleting or rewriting one, list its useful
  claims and verify each is still true. Keep caller-facing claims in JSDoc and move implementation
  constraints, rejected alternatives, invalidating assumptions, and measurement triggers to the
  nearest owning implementation comment. A rejected alternative must cite the symbol or evidence
  that establishes why it loses. Delete only repetition, false claims, work history, or facts made
  obvious by the code. Re-read every comment in a changed function after the edit.
- When moving or extracting code, copy the complete source span byte-for-byte, including every
  comment and blank line. Prove the copy identical before editing it, read the final destination,
  then remove the source last. A token or syntax diff cannot prove comment preservation.
- Do not mention private source project names in public files, commits, tests, fixtures, or reports.

## Runtime boundaries and evidence

- Use the `typescript` package for project checking; TypeScript 7 is the main compiler.
  `typescript-floor` is limited to the TypeScript 5.0 packed-consumer check and tooling that needs
  legacy in-process compiler APIs such as the parser, printer, or language service.
- Document every performance-motivated function and branch inside its owning implementation. Use
  ordinary code comments to state why the shape exists, the strongest live alternative it rejects,
  the boundary where the choice stops applying, and the change that requires remeasurement. Public
  JSDoc is only for external callers: accepted inputs, results, errors, effects, guarantees, and
  usage decisions; it MUST NOT expose implementation choices or internal reasoning. Non-public
  declarations may use TSDoc and should explain maintainer-facing constraints when editor help is
  useful. Keep runtime versions, numeric results, workloads, and statistical limits only in
  `bench/PERFORMANCE.md`; link that owner from internal comments instead of copying volatile
  evidence. When behavior or dispatch changes, re-read every comment in the changed frame and update
  or remove stale reasoning.
- Any runtime production-behavior change requires fresh behavior, resource, benchmark, and profile
  evidence for every affected runtime selection, output form, capability-present or capability-absent
  path, and native-success, native-fallback, or dual-failure branch. An aggregate route cannot stand
  in for a branch it does not prove. Extend the nearest injectable harness when an affected branch
  cannot be selected directly; never infer its cost or coverage from another path.
- Read `bench/README.md` before benchmark work. Scope exploratory comparisons with its maintained
  filters; run all applicable runtimes only after a candidate survives the focused mechanism test.
- Rank performance evidence by current user value: latest stable Node Current and Bun first, latest
  Node LTS and Chromium second, latest Deno third. Older supported Node versions gate correctness
  and compatibility, not performance trade-offs. Node Current JITless is the final rung: retain a
  JITless-only win when every higher rung is unchanged and its lifetime cost is justified.
- After every Bun or Deno version change, and before each periodic runtime review, follow
  `bench/README.md` §Capability review. Recheck native, Node-compatible, and web-compatible APIs;
  prove semantics and both selected and fallback paths. Names and API presence prove nothing else.
- Benchmark every portable encoder and fallback directly on Node, Bun, Deno, and Chromium, even
  where normal dispatch selects a native path. For that portable path, first rank runtimes where
  normal dispatch uses it by the priority above; rank every runtime that shadows it with a native
  implementation last, regardless of that runtime's primary-path rank. Shadowed runtimes verify
  portability but do not steer fallback trade-offs.
- Never act on one performance run. Repeat the decision-relevant workload and retain an optimization
  only when the effect reproduces and its uncertainty excludes no material change; otherwise report
  the result as unresolved. A statistically detectable but negligible effect does not earn code.
- Correctness outranks every performance result. Before timing a candidate, map the contracts and
  failure modes its changed mechanism can break, inspect whether existing tests distinguish them,
  add the smallest missing falsifiers, and mutate the mechanism to prove those tests reach it. Run
  the owning runtime tests before and after measurement; reject speedups with an unsecured invariant.
- Before adding test infrastructure, search `__test__/`, `bench/`, and `scripts/` by capability and
  failure, then inspect callers and package-script routing. Extend the nearest owner. Split only for
  a different oracle, runtime, isolation, or feedback boundary.
- Keep TypeScript tests and their fixtures in the nearest `__test__/` directory so production and
  verification code remain distinct without a second naming convention.
- Keep routine verification in `.github/workflows/check.yml`. Add another workflow only when it
  needs a different trigger or permission boundary.
- Execute packed browser code and both WebAssembly profiles in every browser engine selected by the
  workflow. Build once per profile; do not multiply equivalent compilation by browser count.
- Gate every runtime-dependent change in both Node Vitest and Bun tests, including branches
  outside `src/runtime/` that use optional capabilities. Neither runner covers the other's
  adapter. Share entropy cases in `__test__/entropy-probe.ts`.
- Keep development native interop as one discovered research matrix across supported installed
  Node, Bun and Deno Node-API/FFI boundaries. Run one corpus with nonzero evidence per lane; use
  measurements to improve the adapters, never to discard one from a volatile machine snapshot.
- A runtime/compiler floor forbids unguarded newer APIs, not useful newer APIs. Use a newer
  JavaScript capability only for measured runtime or resource value, probe it once, retain a
  compatible fallback, and exercise both paths in their owning runtime lanes.
- Prove a test reaches its target. Inputs for a later rejection must pass earlier guards;
  removing the intended guard must fail its regression. Isolate a component before attributing
  an aggregate result to it, especially when decoding tries multiple masks.
- Entropy probes must exercise the package's portable draw path as well as native delegation.
  String generation can bypass `fillRandom`; inspect the selected path instead of assuming a
  method name identifies the code under test. Compare byte keys with `join(",")` or hex,
  never platform-dependent string coercion or UTF-8 decoding.
- Preserve an unpinned newest-Node CI lane: pinned runtimes cannot expose newly added native APIs.
- Rank apples-to-apples consumer outcomes, not identical internals. Correct wire output, secure
  entropy, and published guarantees are mandatory; weigh other differences by measured consumer
  harm. Clock rollback, sequence, buffer, ownership, validation, and failure strategies remain
  comparable unless their effect materially weakens the requested result. Keep weaker rows timed
  and inspect faster mechanisms that could preserve our guarantees; keep native primitives as floors.
- Probe optional capabilities once at module load; absent methods remain undefined. A defined
  method that throws for an absent capability creates exception-driven fallback on every call.
- Cast probes to narrow optional capability shapes, not intersections with ambient types that
  may already declare the method required.
- Runtime values must carry strict brands that reject unchecked strings and bytes. Keep raw
  function and configuration inputs ergonomic, validate them at the package seam, and infer brands
  from successful generation, parsing, conversion, and guards without caller casts.
- Capture branded inputs generically so a known wrong representation or UUID version is rejected.
  Keep bare strings accepted: widening erases the child brand, so only runtime validation can judge them.
- Owned byte outputs must be plain `Uint8Array`, not native `Buffer` subclasses. Adapt at the
  runtime boundary and verify constructors in both runners; preserve caller-supplied buffers.

## Writing public documentation

README, CHANGELOG, `docs/`, and the bench docs are read by someone who installs the package and
never opens `src/` or `bench/`. Each rule below names a failure that has already shipped here.

- Use only words the reader already has: generator, seed, key, codec, slug, alphabet, buffer.
  Words from source and bench files do not reach a consumer: route, primitive, adapter, seam,
  headline, domain, page, or "schema" for a mask. They leak after hours in those files, so before
  committing consumer text, grep it for them.
- Every sentence has a subject and a verb. A list of noun phrases ("generation, validation, and
  conversion") is a feature blurb; it is longer than the sentence it replaced and says less.
- A rewrite touches only lines with a named defect. Copy sound lines byte for byte. Afterwards,
  compare each replaced line with its original: equal or greater length with fewer verbs is a
  regression, revert it.
- Examples must construct reusable codecs and masks outside per-ID calls. Show setup and repeated
  use separately; a comment saying to reuse a codec does not repair an example that rebuilds it.
- Numbers, dates, runtime versions, and percentages live only in `bench/PERFORMANCE.md`. README
  gives direction: leads, trails, or unresolved, and against which package. A number in README is
  stale at the next runtime release and nothing regenerates it.
- Every claim has an owner. A guarantee cites a test that fails without it and needs a maintainer
  ruling before it enters README §Guarantees; `docs/security.md` outranks README where they
  disagree. A performance claim cites `bench/PERFORMANCE.md`. A "cannot" or "never" about a
  runtime or another package cites the probe that showed it. A claim with no possible owner is
  deleted, not softened.
- Every term is defined before first use and every referent exists. "The responsiveness target"
  with no definition anywhere is a defect, however plausible it reads.
- Delete test: remove the sentence; if the reader loses nothing, it stays deleted. "Optimized",
  "robust", "seamless", "powerful", and "simply" never survive it.
- Shapes that read as machine-written and hide missing content: em-dashes, bold-label lists
  ("**Speed:** ..."), "not only ... but", a trailing "-ing" clause that adds a consequence, groups
  of three for rhythm, Title Case headings. Reject them on sight.
- Put the TL;DR first: the consumer benefit, a concrete UUID/slug comparison, strongest supported claims,
  and navigation. Install and the primary quick-start follow immediately. Keep detailed diagrams,
  limits, runtime tables, and advanced examples with their owning sections. Use emphasis to help
  scanning; check the rendered first screen and every local heading link before committing.
- Prose about the writer's actions ("this pass", "was rewritten", "now supports") never enters a
  doc; git holds that. State the fact.

## Release

- Remote writes require explicit maintainer authorization for each exact operation. Do not push,
  open a pull request, upload a tag, create a release, publish, or change remote settings.
- MUST read `docs/release.md` in full before changing versions, release tooling or workflows,
  packaging, publication, recovery, assets, notes, or finalization.
- Run `bun run check` before committing unless a maintainer explicitly selects narrower intermediate
  checks for the current work; the complete check still gates final delivery.
