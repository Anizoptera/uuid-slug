# @anizoptera/uuid-slug

Preserve the published identifier contracts and verify the runtime paths that each change reaches.

Do not edit any public document unless the maintainer explicitly requests or approves that edit.
This includes README and generated documentation. Propose the exact change and wait for approval;
a code change, stale text, failed check, or instruction to keep docs synchronized grants no permission.
This restriction overrides every documentation-update instruction below.
An explicit request to correct documentation already authorizes its factual corrections; do not
request the same permission again. Correcting stale implementation or measurement text does not
authorize a new public contract, guarantee, API or behavior.

Protect normal consumer calls from the cost of rare misuse defenses. Before changing a shared hot
path to handle an unusual input, read `docs/public-api.md` §Capabilities and runtime work; retain
the defense only when repeated runtime measurements show no loss of normal-call speed or resource
efficiency. A reproducible misuse alone does not justify that cost.

## Contract owners

- README owns the consumer model: define each term before first use, state when this package is
  preferable to a UUID-only library, and keep its capability and representation maps consistent
  with the public API. Propose an update to the owning explanation for every consumer-visible change; do not
  copy implementation reasoning or create parallel inventories in other docs.
- Keep README's TypeScript API map synchronized with every public capability, representation, and
  decision-changing boundary; propose changes to the existing row or bullet instead of another inventory.
- Position the package by the complete consumer contract: base64url and base32hex plain slugs for
  any UUID, caller-owned storage, UUIDv7 masking and migration, typed failures, and adaptive runtime
  paths. Keep version-neutral encoding separate from UUIDv7-only masking. Generation alone is not
  distinctive. State measured losses as gaps, never hide them with hype.
- Generate only UUIDv4 and UUIDv7. Keep parsing, inspection, and plain-slug conversion
  version-neutral so other UUID versions work without version-specific machinery. Add support for
  another generated version only after the maintainer reopens it for concrete demand.
- Preserve all 74 UUIDv7 payload bits. Interpret fraction or counter fields only from an explicit
  caller-supplied layout; UUID bits and generator names cannot prove that layout. Never select a
  different generated payload layout only because a runtime exposes a finer clock.

## Public TypeScript interface protocol

- Before ANY public TypeScript or Rust interface work, read `docs/public-api.md` in full. It owns
  naming, shape, types, literals, defaults, errors, effects, compatibility, comments, and proof.
- Start from caller code. The easiest call MUST be correct; types reject known misuse; defaults add
  no secret, lossy, compatibility, expensive, or weaker work. The declaration baseline proves none
  of this.
- Keep runtime acceptance and TypeScript guidance separate. Implementations accept and safely
  reject arbitrary JavaScript values. Public TypeScript signatures accept every supported form,
  reject provably invalid branded inputs, and infer the strictest result justified by the input.
  Read `docs/public-api.md` §Rules before changing these boundaries; never widen declarations to
  `unknown` just because JavaScript can bypass them.
- Export one semantic scalar constant for every closed string callers pass or compare. Export a
  collection only for a real iteration job; indexes NEVER identify values. Reject unknown option
  keys and make each local runtime key map exhaustive against its public options type.
- Finish only when source calls, runtime paths, emitted declarations, editor help, packed consumers,
  and produced bundles independently prove the changed contract.

## Contract rules

- The externally visible API is reserved. Put any proposed public export, option, behavior, or
  feature change and its consumer consequences in the same pull request. Merging is the maintainer
  decision; no separate acceptance step exists.
- Keep public types that name a documented value or distinction consumers use in storage,
  parameters, return values, narrowing, or configuration. A package signature need not mention the
  type. Remove it only when no documented value or operation needs its distinction. Apply this rule
  separately to TypeScript and Rust, document the consumer effect, and verify each packaged surface.
- `ROADMAP.md` is transient and never owns a contract, decision, or lasting conclusion. Put
  consumer contracts in README, wire design in `docs/design.md`, security boundaries in
  `docs/security.md`, cross-language and distribution decisions in `docs/cross-language.md`, and
  measured conclusions in `bench/PERFORMANCE.md`.
- Use only `ROADMAP.md` as the live plan and execution procedure. Keep every current decision and
  unfinished atomic task there as a Markdown task, update it when evidence or scope changes, replace
  superseded state in place, and compress completed work to the facts later phases still need.
  Never create a shadow, staging, renamed, or temporary roadmap file in this repository.
- Write each maintainer ruling into the repository file that owns its subject when it is made.
  Plan files, agent memory, and session notes outside this repository track progress only; a ruling
  kept there is lost to the next session.
- Read README §Guarantees before changing generation or tests; it owns the consumer guarantees.
  Before rejecting a faster implementation, name the published promise or explicit maintainer
  requirement it violates. An unanswered proposal, existing test, or agent-derived plan constraint
  is not a new guarantee. Fix conflicting contract text and the roadmap before implementation.
  Default hot paths must provide no guarantees beyond the corresponding proper native implementation.
  Trust native results directly; do not add result validation, trust tracking, clock repair, or
  other work to enforce stronger guarantees. Keep extra guarantees on explicit configurable paths.
  Correct conflicting specs and tests before implementation; this ruling already authorizes that
  correction, so do not request approval again. Caller-input validation and wire formats remain distinct.
  Default generation needs no stronger guarantees than correctly implemented primary qualified
  rivals provide. Put additional guarantees on optional configured paths; do not reject a rival
  for lacking an agent-added guarantee. Identify its actual behavior before choosing the default.
  When proper native behavior conflicts with a default guarantee, correct the guarantee and its
  tests instead of rejecting native output. Existing tests and implementation choices cannot veto
  the native baseline; measure differences without turning them into default requirements.
  Read `docs/public-api.md` §Generation and codecs
  before deciding which generation properties belong on defaults or configured generators.
  New guarantees require a maintainer ruling before code or tests impose them. Intra-millisecond ordering
  is explicitly not guaranteed: do not gate it or reject a native generator for lacking it. The
  exemption covers order only. Before adopting a native or alternative generator, compare every
  field it encodes with the package generator, including timestamps against the clock during
  sustained same-millisecond bursts, because counter overflow can move them ahead.
  Measure implementation differences in `bench/`, where results inform rather than gate.
- Read `docs/design.md` before changing masking, mask derivation, or sentinels. Preserve its wire layout:
  masked payloads are UUIDv7-only, with a 16-bit check and timestamps below 2^42 milliseconds.
  Preserve both their 22-character base64url and lossless 27-character base32hex spellings.
  Reject overflow rather than truncate. Base64url helpers accept exactly one 16-byte UUID payload
  or its canonical 22-character spelling; reject every other length. Preserve plain-slug padding rejection.
- Explain masking without confusing problem and scope: every UUID version exposes standardized
  fields, while this package deliberately defines a masked wire format only for UUIDv7.
- RFC 9562 permits uppercase, lowercase, and mixed-case UUID text; it does not select a default.
  Accept those cases and compact text, emit lowercase hyphenated text by default for one stable
  package spelling, and keep uppercase output explicit.
- Representation guidance must distinguish keyless root conversions from keyed codec conversions,
  state that 22-character plain and masked base64url forms overlap, and never imply that a paired
  generator computes every spelling.
- Common representation changes need one public call. On a codec, name an alternate source
  and result explicitly without making the caller compose intermediate conversions.
- Before editing any public symbol, apply `docs/public-api.md` §UUID slug vocabulary and §Shape to
  its name, parameters, accepted forms, result, and detached use. That document owns the rules and
  terms. Fix dependents after a rename; never restore an unclear name to satisfy the compiler.
- Reject context-dependent option and property names. Name the exact value they control when a cold
  reader could infer another target; `maskedSlugAlphabet` is valid, `outputAlphabet` is not.
- Before choosing or accepting a public name, write its detached consumer call. The name and its
  parameter names must identify the operation, input meaning, affected output, unit, and ownership
  without the receiver or import path. Add a missing domain term; delete words that add no meaning.
- Do not repeat a term across both sides of a conversion name. Keep the shared term on the
  destination when the source still names exactly one API form. Use `plainSlugToUuidString`,
  `maskedSlugToUuidBytes`, `plainToMaskedUuidSlug`, and `maskedToPlainUuidSlug`; never copy full type
  names into both sides mechanically.
- A public terminology change is incomplete while an old public term remains in source, README,
  durable docs, tests, generated declarations, or packaged consumer examples, except where text
  explicitly rejects that old term. Search all owners, rebuild declarations, and compile and run
  packed consumers before committing.
- Plain slugs are lossless encodings of all 128 UUID bits. Never impose a UUID-version, variant,
  or timestamp restriction on plain encoding or decoding; version-specific brands only preserve
  facts already established about a value.
- Read `docs/cross-language.md` before Rust work or changes shared with TypeScript. It owns
  parity, approved filesystem-safe output and distribution boundaries. Keep base64url defaults;
  select filesystem-safe masked output independently from the plain-slug alphabet.
  Preserve length-based alphabet inference for plain decoding.
- Masked slugs and sentinels are core functionality. Sentinels use precomputed plain slugs per
  codec and are never masked; registered sentinels retain the full UUIDv7 timestamp range. Decode
  returns the first passing candidate in caller-specified key order, never proof
  of issuance. Do not reject multiple matches or append fallback masks on the caller's behalf.
- Every decoder must accept every value that a supported matching encoder can produce. Options
  may add accepted forms; they must not remove existing ones. Reject forms no encoder produces.
- Public inputs MUST accept every recoverable, unambiguous equivalent form. The implementation owns
  making normalization safe, deterministic, bounded, and negligible-cost; difficulty never moves
  that burden to callers. Normalize once and return one stable form. Keep already-normalized input
  on the least-work path. Reject only different meaning or ambiguity. Document accepted forms and
  normalization in `docs/public-api.md` and declaration JSDoc.
- Every UUID-text writer accepts the shared lowercase and uppercase presets, defaults to lowercase
  without extra work, and infers the matching result type. Keep text case independent from slug
  alphabets, masking, migration selection, UUID bits, and accepted input.
- Keyed operations belong only on the UUIDv7 masking codec holding the key, including masked timestamp
  validation. Do not add top-level masked shortcuts. Masking-codec construction requires an explicit
  private mask or `UUID_V7_TEST_MASK`; keep the published mask opt-in and remove implicit masked
  defaults. Keep codecs immutable and receiver-free; generators own mutable sequence state. A
  codec accepts generation through the minimal `generateUuidV7Bytes` seam and validates every returned
  payload before masking it.
- Preserve the frozen round count, derivation constants, seed interpretation, alphabets, tag
  widths, and `keyDerivationIterations`: changing them changes previously issued identifiers. Comments
  must explain this wire-format obligation, not historical reasons for choosing the constants.
- Do not add old API aliases, compatibility subpaths, or a compatibility decoder for 0.2.0.
  The maintainer ruled that release had no consumers; that exception does not justify breaking other formats.
- Original fixed-mask compatibility is opt-in through `maskingCodec.createUuidSlugMigrationDecoder`; read README's migration
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
  Compare decoder-only bundles before adding writer functions to shared alphabet metadata;
  a conversion speedup cannot justify retaining encoding code for a caller that only decodes.
- Read `docs/cross-language.md` §JavaScript packaging before changing emitted module boundaries,
  internal exports, moved code, import-time initialization, tsdown, minification, source maps,
  `sideEffects`, or optimizer annotations. Before deleting a moved file, account for every original
  implementation line, comment, and consumer. The packed-artifact check MUST preserve every
  source-owned `PURE` and `NO_SIDE_EFFECTS` annotation.
- Public prose names caller-facing tokens such as `"base32hex"`; executable examples pass the
  exported semantic constant. Documentation-alignment gates are ruled out; test API behavior instead.
- Hoist every repeated semantic runtime string in a file, including alphabet names and diagnostics, to
  one named scalar constant in its narrowest semantic owner. Build internal tuples and sets from those
  names only when runtime work requires them; never recover meaning through numeric indexes such as
  `ERROR_CODES[3]`. Reuse that owner
  across files only when the value is genuinely one shared concept and the import does not retain
  unrelated code; otherwise keep a private file-local constant. Never build a root string catalog
  or runtime lookup object: both retain unrelated values and weaken tree shaking. Keep `typeof`
  operands literal because TypeScript narrows from the literal but not an equivalent constant;
  do not trade type safety, a stable emitted declaration, or a hot-path helper call for textual
  deduplication. Before claiming completion, search all `src` runtime expressions for every moved
  literal, inspect each hit, and run the declaration/API and packed tree-shaking checks; type-only
  literals may repeat only when the published type cannot reference the private runtime owner.
- Keep repository-only docs, benchmarks, and Rust sources out of the npm tarball when the package
  does not need them at runtime; README links do not require shipping their targets.
- Return `UuidSlugError` for every caller-caused or recoverable failure. Never add a throwing
  convenience API; the one ruled throw is `rng_unavailable` from argument-free or preset-only
  generation, whose declarations carry no union (`docs/public-api.md` §Failures and effects).
  Package-owned interfaces carry failures as values; adapt and contain exception-based
  dependencies at their boundary.
- Make compatible calls compose without intermediate error unwrapping. Read
  `docs/public-api.md` §Failures and effects when designing or changing composition, error
  propagation, markers, recognition checks, or result types; it owns the required behavior and
  verification. Never apply one universal detector blindly: check the expected successful input
  shape first, use local `instanceof Error` for package-created intermediate results, and reserve
  marker plus cross-realm recognition for composable inputs or uncontrolled callbacks. Read
  §Capabilities and runtime work before selecting checks or fallback order.
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
- Audit public TypeScript from executable consumer calls, not the declaration baseline. Exercise
  every overload, default, option combination, detached method, branded result, caller-owned output,
  and expected failure that changes how a caller writes code. Compile source and packed consumers;
  execute runtime behavior separately. `api/typescript.api.d.ts` tracks generated signatures only.
- Treat public JSDoc as part of every public-source change. Update or remove affected text in the
  same edit; never leave stale documentation for a later pass. Before committing, build declarations,
  query changed symbols through the TypeScript language service, and read every changed `.d.ts`
  entry as a cold consumer. Presence checks catch omissions only; they do not prove the published
  text is useful, correct, complete, or current.
- Comments carry contracts and design decisions. Before deleting or rewriting one, list its useful
  claims. Every non-trivial decision must retain its reason, supporting evidence or assumption,
  the meaningful alternative it rejects, and what would change the decision beside its owner.
  Verify each claim is still true. Keep caller-facing claims in JSDoc and move implementation
  constraints, rejected alternatives, invalidating assumptions, and measurement triggers to the
  nearest owning implementation comment. A rejected alternative must cite the symbol or evidence
  that establishes why it loses. Delete only repetition, false claims, work history, or facts made
  obvious by the code. Re-read every comment in a changed function after the edit.
- When moving or extracting code, copy the complete source span byte-for-byte, including every
  comment and blank line. Prove the copy identical before editing it, read the final destination,
  then remove the source last. A token or syntax diff cannot prove comment preservation.
- Do not mention private source project names in public files, commits, tests, fixtures, or reports.

## Runtime boundaries and evidence

- Qualify default UUIDv7 competitors by correct wire output and secure randomness, using proper
  native guarantees as the baseline. Counter width, zero-start counters and random-bit allocation
  do not justify excluding `fastv7` or another rival; record those differences separately.

- Before writing an experiment driver, extend its maintained owner in `bench/` or `scripts/`.
  Inspect the owner's exports and callers before editing it; a matching filename is not permission
  to replace a different job. Separate a driver only when its measurement or isolation boundary differs.
  Give scratch a cleanup scope before creating it; remove it when the operation ends, including
  failures. Preserve necessary failure evidence in `bench/reports/` first and name its reproduction
  command. Temporary checkouts and generated bundles are not retained evidence. Keep reusable
  drivers in `bench/` or `scripts/`, raw results in `bench/reports/`, and conclusions in
  `bench/PERFORMANCE.md`; durable documents must never depend on `/tmp` files.
  Extract executable baseline source outside this repository; ignored source trees can still enter
  compiler and test discovery. Keep only generated evidence and archives in `bench/reports/`;
  retain TypeScript source captures as `.ts.txt` or archives, never `.ts`, because Git ignores do
  not exclude them from project type checking. The existing artifact check rejects executable
  source captures in reports; never bypass it or suppress their compiler diagnostics.
  Preserve failed artifacts until their diagnostic is resolved; then remove the disposable files.
  Include setup in cleanup; run scratch-creating Bun tests through `scripts/test-bun.ts` so their
  parent owns cleanup after runner exit. Purge successful bundles and resolved failure artifacts.
  Preserve earlier captured graphs before replacing build-input archives; compact retained reports with `bun scripts/compact-reports.ts` so evidence does not consume uncompressed disk space.
  Before committing, inspect creator-owned paths in both `/tmp` and the runtime's
  `tmpdir()`, not just filename prefixes; stop children and preserve evidence and reusable caches.
  Run compiler diagnostics through the retained profiler executable and capture stdout verbatim;
  `bench/compare.ts` requires JSON-only host output. Require a working control for the requested
  compiler artifact before interpreting a missing trace as evidence about package execution.
- Repair missing or ineffective guidance before changing the plan or implementation. Put the
  trigger, required action and reason in the nearest `AGENTS.md` visible when the work starts;
  a rule buried in another document cannot prevent a mistake unless that file is explicitly loaded.
  Read the changed text and its dependents before proceeding. Public-document repairs still need
  approval. Enforce mechanically decidable failures in the existing harness, not a prose checker.
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
  Read each driver's runtime selector from that driver; comparison and profiling variables differ.
  Verify the runtime recorded in each result before assigning it to Current or LTS evidence.
  Await a terminal exit code before launching another timing process; a returned process handle
  still owns unfinished work and must be drained first.
  Benchmark the caller code each overload requires. Defaults that return identifiers directly
  must not pay for error-value unwrapping; retain it for conversions and configured calls that
  return errors. Keep the existing output and failure witnesses outside timed caller work.
- Before any performance experiment, record the successful consumer call, current removable cost,
  competing explanations, result that would reject the candidate, and next production decision in
  `ROADMAP.md`. Reuse valid evidence; do not run a measurement whose possible results leave that
  decision unchanged. Read `bench/README.md` §Decision before measurement for the execution order.
  Keep only one implementation candidate active until it is retained, rejected, or explicitly blocked;
  benchmark infrastructure and rejected experiments do not close production performance tasks.
- Protect retained primary-call improvements in the existing performance gate. Count avoidable
  work separately from timing, and compare complete calls against an independent reference so
  slowing both package operations cannot hide a regression. Prove each new guard rejects the
  targeted regression while the unchanged implementation passes; derive budgets from measured
  normal variation and necessary work, never an invented tolerance. A failing gate requires
  diagnosis and repair, not a relaxed budget. Instrumented counts do not prove total allocation.
  Preserve the protected successful calls and their independent references when changing the gate.
  Never remove a workload, skip a runtime, replace a baseline with slower code, or loosen a budget
  to pass a regression. A change to protected scope or acceptable loss requires an explicit
  maintainer ruling. Prove harness changes with both an unchanged control and a valid-output
  waste mutation that fails for the intended diagnostic; a broken identifier proves correctness
  coverage, not performance or resource protection.
- Keep routine verification inside the feedback-loop limits in `bench/README.md` §Regression protection.
  Benchmarks and other special cases are outside normal test-lane duration limits. Do not make timing-policy
  calibration a prerequisite for profiling and fixing evidenced primary consumer-call gaps.
  Measure complete correctness lanes and hooks, not one test file; preserve their defect detection,
  production fidelity and cleanup.
- Locate the bottleneck in the complete consumer call before optimizing a component. Record
  the observation that would support the proposed cause and the result that would reject it;
  retain a change only when complete-call speed or resource use improves without a material loss
  on the other axis. Reprofile after the
  bottleneck moves because a component gain can disappear in dispatch, formatting or allocation.
- Before using a benchmark statistic to select code, apply `bench/README.md` §Measurement limits:
  identify the independent sample unit and distinguish batch throughput from individual-call latency.
  Read the comparison driver's own verdicts; when analyzing its JSON separately, require the selected
  statistic on every requested row. Missing fields must fail analysis, never mean no regression.
  Before attributing a wall/CPU gap, account for call weighting and measurement scope: an
  unequal-batch median does not match aggregate CPU per call.
- For cold-import comparisons, isolate both package graphs from the driver's static imports.
  Resolve both entry paths before timing; importing a graph the driver already loaded measures
  its module cache, not startup. Keep cached-import observations out of the comparison.
- When collecting workload memory and CPU samples in one driver, capture memory first. Retained
  sample records are harness memory, not package state; record each pass's call count.
- Rank performance evidence by current user value: latest stable Node Current and Bun first, latest
  Node LTS and Chromium second, latest Deno third. Older supported Node versions gate correctness
  and compatibility, not performance trade-offs. Node Current JITless is the final rung: retain a
  JITless-only win when every higher rung is unchanged and its lifetime cost is justified.
- Optimize successful consumer calls. Invalid input, rejected configuration, and other failures
  are rare by design and are not performance targets: spend no code or measurement on their speed.
- Limit this optimization effort to primary consumer use cases. Profile actual hotspots and
  performance and resource gaps against the main qualified rivals for each primary use case,
  then fix those gaps. Optimizing any other scenario is outside the authorized scope; correctness
  checks protect existing contracts but do not make those scenarios optimization targets.
- Before choosing an experiment, map its complete consumer call to a primary README job and
  current rival evidence. Read the current execution sequence in `ROADMAP.md`; older unchecked
  proposals do not authorize work. Repair conflicting instructions and specifications first,
  then the plan, then code, so subsequent agents receive the same scope before acting.
  Rank the primary calls together before selecting a component change. Keep their named fastest
  qualified rivals, native floors, speed gaps and resource-evidence limits in `ROADMAP.md`;
  missing comparisons stay missing, and a convenient candidate cannot replace that ranking.
- Choose performance workloads from ordinary README consumer jobs: single-ID generation, parsing
  and conversion first. An unusual input or convenient probe never establishes workload priority;
  keep its verification bounded to the correctness defect it can expose.
- Rank one-ID-per-call paths above batch paths. Most consumers generate, parse, or convert one
  identifier per call; writing many IDs into caller-owned buffers through `output` and
  `outputOffset` is a secondary job, excluded from this optimization effort. Never slow a
  single-call path to speed a batch path.
- Surpass qualified alternatives in both performance and resource efficiency for every main use
  case; secondary optimization is excluded from this effort. A throughput win alone does not close
  a main-use gap: compare complete successful calls and their allocation and resource costs.
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
- Correctness of supported normal calls outranks every performance result. Rare misuse defenses
  must also satisfy the no-regression rule above. Before timing a candidate, map the contracts and
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
- Resolve WebAssembly Cargo and rustc through `rustup which` from the repository root and bind
  `RUSTC`; a bare tool on PATH can bypass the pinned compiler and its installed target.
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
- Every default call (no arguments, or only a text-case or alphabet
  preset) must approach the fastest runtime-native path producing the same output on every
  ranked runtime and the best qualified competitors; negligible remaining differences are acceptable.
  Do not add code or continue tuning solely to close a negligible gap. Configured calls (options, caller
  buffers, generators, custom entropy, masking) may cost more than a native floor only by work that
  floor lacks; negligible differences from qualified competitors are acceptable there too. Reach parity by combining native
  output, patched native output, pooled native entropy, and portable work per runtime; never settle
  for one path everywhere. Align default guarantees with proper native behavior instead of rejecting
  native output for stronger package guarantees. Every call family needs a floor row, and every open gap needs a `ROADMAP.md`
  task until a change closes it, evidence establishes a negligible difference, or
  `bench/PERFORMANCE.md` records a cause no implementation can remove.
  When native output is faster, minimize the path to that native call before optimizing a portable
  replacement. Select per runtime and output; keep TypeScript as the fallback or measured faster
  choice. Native selection must include wrapper, conversion and resource costs, not kernel timing alone.
- Use the fastest implementation separately for each runtime and output. Native base64url encoding
  does not require native base32 encoding. Keep the best existing writer for unsupported outputs;
  if shared integration slows another primary call, fix that integration instead of abandoning
  the faster native capability. Do not close the task while either primary regression remains.
- Rank apples-to-apples consumer outcomes, not identical internals. Correct wire output, secure
  entropy are mandatory; default guarantees must not exceed proper native behavior. Weigh other differences by measured consumer
  harm. Clock rollback, sequence, buffer, ownership, validation, and failure strategies remain
  comparable unless their effect materially weakens the requested result. Keep weaker rows timed
  and inspect faster mechanisms that could preserve our guarantees; keep native primitives as floors.
- Probe optional capabilities once at module load; absent methods remain undefined. A defined
  method that throws for an absent capability creates exception-driven fallback on every call.
- Minimize startup work too: reuse existing inputs, stop when precedence settles the answer, and
  skip parsing, allocation and initialization that the selected capability does not need.
- Cast probes to narrow optional capability shapes, not intersections with ambient types that
  may already declare the method required.
- Runtime values must carry strict brands that reject unchecked strings and bytes. Keep raw
  function and configuration inputs ergonomic, validate them at the package seam, and infer brands
  from successful generation, parsing, conversion, and guards without caller casts.
- Public identifier, configuration, and selector string inputs accept primitive strings and genuine
  `String` objects.
  Normalize wrappers once with the intrinsic string-value operation; never invoke caller-defined
  coercion hooks. Keep TypeScript declarations and string guards primitive-only because structural
  `String` cannot prove a genuine wrapper or narrow an object to a primitive.
- Capture branded inputs generically so a known wrong representation or UUID version is rejected.
  Keep bare strings accepted: widening erases the child brand, so only runtime validation can judge them.
- Return owned bytes as plain `Uint8Array`, not `Buffer`; verify constructors in Node and Bun.
  Adapt at the runtime boundary, preserve caller buffers, and never pass private bytes to caller
  functions: they could retain or change them.

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
