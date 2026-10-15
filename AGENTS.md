# @anizoptera/uuid-slug

Preserve issued IDs and ordinary-call speed. Keep masks explicit, failures typed and unused features removable.

## Read before work

READ the owner before changing its subject; these references hold the detailed rules.

| Work | Owner |
| --- | --- |
| ANY public TypeScript or Rust interface, type, error or declaration comment | `dev/interface.md` in full |
| TypeScript source, types, JSDoc, emitted modules or runtime capabilities, including README API text written without opening `src/` | `src/AGENTS.md` (auto-loads only when a `src/` file is opened) |
| Masking, keys, sentinels or identifier formats | `docs/design.md` and `docs/security.md` |
| Rust, TS/Rust parity, shared formats, filesystem-safe output, package entries, runtime floors or bundling | `dev/cross-language.md` |
| Experiments, profiles, drivers, evidence cleanup or performance gates, even from `src/` | `bench/AGENTS.md` (priorities, gates), then `bench/README.md` (commands, reports) |
| Versions, packaging, release tooling or workflows, publication, recovery, assets, notes or finalization | `dev/release.md` in full |
| Consumer copy or generation guarantees | §Writing public documentation, then README opening, affected section and reference |
| README diagram (`docs/assets/uuid-representations.svg`, generated) | Header of `scripts/readme-diagram.ts`: it holds every maintainer ruling on layout, colour, hover and motion. Write each new ruling there when made; keep each ruled behaviour unless the maintainer drops it. Every build checks the hover rulings in Chromium (`scripts/readme-diagram-hover.ts`); add a check with each new hover ruling. Its text is consumer copy: follow §Writing public documentation |

## Work scope

Prepare releases only. Release version changes, tags, publication, finalization and `bun run release`
require final explicit maintainer authorization for each operation; plans, credentials and checks
grant no permission. Other remote writes (pushes, pull requests, settings) also need explicit authorization.

Fix wrong, missing or unreachable instructions first, then the plan, then implementation.
Anything in this project that surprises you (a rule, tool, check or behavior that contradicts what you expected) MUST be reported to the user at once and written into the `AGENTS.md` that the next agent would load at that moment, so nobody hits it twice.
Put the trigger and required action in visible `AGENTS.md`; unread rules cannot prevent mistakes.

Standalone benchmarks, profiles, screens, calibration and optimization need an explicit request naming the consumer call.
Release preparation, gaps, probes, plans, repairs and procedures grant no authority.
Revisit rejected or inconclusive experiments only with new evidence changing the question or mechanism,
not rewrites, longer runs or warm-ups. Keep regression checks; new measurements and resource-parity targets
must not gate release preparation. Report dependent repairs as unresolved.

Edit public docs, including README and generated docs, only with an explicit maintainer request or approval.
Otherwise propose the exact edit and wait. Code changes, stale text, failed checks and sync instructions do not authorize edits.
Correction requests authorize factual repairs without another approval, never new public contracts, guarantees, APIs or behavior.
This restriction overrides documentation-update instructions below.

Derive choices and checks from owning rulings and in-scope evidence before asking.
Ask only when a material priority, consequence or permission remains unresolved. State each answer's effect
and why evidence cannot decide it. Use plain words, separate independent decisions, and hold only dependent work.
Audit findings need the failing call, trigger, consequence and normal-call control.
Separate observed from possible harm; misuse alone does not prove ordinary-call harm or release impact.

Keep adversarial hardening off default paths; ordinary calls must not pay for it.
Extra hardening requires an explicit request and a non-default path; read `dev/interface.md` §Capabilities and runtime work.
Preserve input validation, secure randomness, caller ownership and wire integrity.
JavaScript may accept calls TypeScript rejects; that alone justifies neither wider types nor a release blocker.

## Contract owners

- README owns the consumer model: define each term before first use, state when this package is
  preferable to a UUID-only library, and keep its capability and representation maps consistent
  with the public API. Propose an update to the owning explanation for every consumer-visible change; do not
  copy implementation reasoning or create parallel inventories in other docs.
- Keep README's TypeScript API map synchronized with every public capability, representation, and
  decision-changing boundary; propose changes to the existing row or bullet instead of another inventory.
- README's opening paragraph must name UUIDv4/v7 generation, plain base64url slugs and configurable
  masked UUIDv7 slugs together, so consumers see the full purpose before examples or storage advice.
  Position the package by the complete consumer contract: base64url and base32hex plain slugs for
  any UUID, caller-owned storage, UUIDv7 masking and migration, typed failures, and adaptive runtime
  paths. Keep version-neutral encoding separate from UUIDv7-only masking. Generation alone is not
  distinctive. Keep measured gaps in `bench/PERFORMANCE.md`; do not imply wins on those calls.
- Generate only UUIDv4 and UUIDv7. Keep parsing, inspection, and plain-slug conversion
  version-neutral so other UUID versions work without version-specific machinery. Add support for
  another generated version only after the maintainer reopens it for concrete demand.
- Preserve all 74 UUIDv7 payload bits. Interpret fraction or counter fields only from an explicit
  caller-supplied layout; UUID bits and generator names cannot prove that layout. Never select a
  different generated payload layout only because a runtime exposes a finer clock.

## Contract rules

- The externally visible API is reserved. Put any proposed public export, option, behavior, or
  feature change and its consumer consequences in the same pull request. Merging is the maintainer
  decision; no separate acceptance step exists. Only released behavior has consumers: if
  `git tag --contains <introducing commit>` is empty, changing it breaks no consumer; decide from evidence.
- Keep public types that name a documented value or distinction consumers use in storage,
  parameters, return values, narrowing, or configuration. A package signature need not mention the
  type. Remove it only when no documented value or operation needs its distinction. Apply this rule
  separately to TypeScript and Rust, document the consumer effect, and verify each packaged surface.
- Write each maintainer ruling into the file that owns its subject when it is made: consumer
  contracts in README, wire design in `docs/design.md`, security boundaries in `docs/security.md`,
  cross-language and distribution decisions in `dev/cross-language.md`, measured conclusions in
  `bench/PERFORMANCE.md`. Plans, agent memory and session notes track progress only; a ruling kept
  there is lost. Durable code and docs must not reference plans, phases or task IDs.
- Keep execution decisions and unfinished atomic work as Markdown tasks in the one live plan.
  Replace superseded state in place; retain completed facts only when later work needs them.
  Never create shadow, staging, renamed or temporary plans.
- Before changing generation, its guarantees or tests, read README §Guarantees (consumer promises)
  and `dev/interface.md` §Generation and codecs. Proper native guarantees are the default ceiling;
  stronger ones need configuration and a maintainer ruling before code or tests impose them.
  Before rejecting a faster implementation, name the published promise or maintainer requirement it
  breaks; proposals, existing tests and agent-derived constraints are not guarantees.
  Intra-millisecond ordering is NOT guaranteed: never gate it or reject a native generator for
  lacking it; the exemption covers order only. Before adopting a generator, compare every field it
  encodes with the package's, including timestamps against the clock during sustained
  same-millisecond bursts: counter overflow can push them ahead.
- Preserve the `docs/design.md` wire layout: masked payloads are UUIDv7-only, with a 16-bit check and a 42-bit timestamp offset from the configured start.
  Preserve both their 22-character base64url and lossless 27-character base32hex spellings.
  Reject overflow rather than truncate. Base64url helpers accept exactly one 16-byte UUID payload
  or its canonical 22-character spelling; reject every other length. Preserve plain-slug padding rejection.
- Explain masking without confusing problem and scope: every UUID version exposes standardized
  fields, while this package deliberately defines a masked wire format only for UUIDv7.
- Representation guidance must distinguish keyless root conversions from keyed codec conversions,
  state that 22-character plain and masked base64url forms overlap, and never imply that a paired
  generator computes every spelling.
- Before editing any public symbol, apply `dev/interface.md` §UUID slug vocabulary and §Shape to
  its name, parameters, accepted forms, result, and detached use. That document owns the rules and
  terms. Fix dependents after a rename; never restore an unclear name to satisfy the compiler.
- A public terminology change is incomplete while an old public term remains in source, README,
  durable docs, tests, generated declarations, or packaged consumer examples, except where text
  explicitly rejects that old term. Search all owners, rebuild declarations, and compile and run
  packed consumers before committing.
- Keep base64url defaults;
  select filesystem-safe masked output independently from the plain-slug alphabet.
  Preserve length-based alphabet inference for plain decoding.
- Masked slugs and sentinels are core functionality. Sentinels use precomputed plain slugs per
  codec and are never masked; registered sentinels retain the full UUIDv7 timestamp range. Decode
  returns the first candidate whose 16-bit check passes, in caller-specified key order;
  incorrect keys can pass by chance. Do not reject multiple matches or append fallback masks.
- Every decoder must accept every value that a supported matching encoder can produce. Options
  may add accepted forms; they must not remove existing ones. Reject forms no encoder produces.
- Before changing accepted UUID forms, normalization or text-case presets, read `dev/interface.md`
  §Rules and §UUID text and bytes; preserve its input equivalence, output spelling and inferred types.
- Keyed operations belong only on the UUIDv7 masking codec holding the key, including masked timestamp
  validation. Do not add top-level masked shortcuts. Masking-codec construction requires an explicit
  private mask or `UUID_V7_TEST_MASK`; keep the published mask opt-in and remove implicit masked
  defaults. Keep codecs immutable and receiver-free; generators own mutable sequence state. A
  codec accepts generation through the minimal `generateUuidV7Bytes` seam and validates every returned
  payload before masking it.
- Preserve the frozen round count, derivation constants, seed interpretation, alphabets, tag
  widths, and `keyDerivationIterations`: changing them changes previously issued identifiers. Comments
  must explain this wire-format obligation, not historical reasons for choosing the constants.
- Original fixed-mask compatibility is opt-in through `maskingCodec.createUuidSlugMigrationDecoder`; read README's migration
  sections before changing it. Preserve sentinel priority and stored trailing-bit aliases without
  weakening ordinary strict decoding. Writers and accepted old formats remain independent.
- npm runtime dependencies are forbidden. Rust dependencies require the evidence described in
  `dev/cross-language.md`. Benchmark dependencies stay dev-only and outside published artifacts.
- Keep one public code entry while named root imports tree-shake correctly. Add a subpath only when
  packed consumers prove useful tree shaking that the root cannot provide; startup timing alone is
  insufficient.
- Order public export conditions as `types`, `bun`, `deno`, `development`, then `default`. Add a
  condition only when it selects different output or guards an incompatible lower condition. The
  private `#runtime` map selects Bun source, compiled portable code for Deno, or Node native code while built
  hosts share one implementation graph. Runtime floors and why: `dev/cross-language.md` §Runtime floors;
  CI runs each (`runtimes` matrix, `bun scripts/floor-probe.ts`).
- Treat shipped `src` as executable package code, not source-map support. Bun MUST resolve public
  entries and `#runtime` to TypeScript. Deno MUST load compiled output: it REJECTS TypeScript inside
  npm packages. Prove every runtime route and loader claim with a packed consumer installed as a REAL
  `node_modules` directory; a symlink resolves outside `node_modules` and hides that rejection.
- Read `dev/interface.md` §Package entries before changing exports or bundling. Keep each export
  path aligned with its owning source and built module. Use a facade only to hide internal exports
  or join owners.
- Check tree shaking from named root imports for each consumer job. Execute each bundle,
  exclude unrelated heavy code and compare independent optimizers. Subpaths serve direct ESM,
  never replace removable root imports. Compare decoder-only bundles before adding writers to
  shared alphabet metadata; conversion speed cannot justify retaining unused encoding code.
- Public prose names caller-facing tokens such as `"base32hex"`; executable examples pass the
  exported semantic constant. Documentation-alignment gates are ruled out; test API behavior instead.
- Keep repository-only docs, benchmarks, and Rust sources out of the npm tarball when the package
  does not need them at runtime; README links do not require shipping their targets.
- Do not mention private source project names in public files, commits, tests, fixtures, or reports.

## Runtime boundaries and evidence

- Cross-runtime probes replay recorded inputs and results. Test local generators separately.
- Read repaired guidance and its dependents before proceeding. Enforce mechanically decidable
  failures in the existing harness, not a prose checker; public-document authorization still applies.
- Use the `typescript` package for project checking; TypeScript 7 is the main compiler.
  `typescript-floor` is limited to the TypeScript 5.0 packed-consumer check and tooling that needs
  legacy in-process compiler APIs such as the parser, printer, or language service.
- Run Bun's built-in project checker as a separate lane beside TypeScript, not a replacement. Inventory both `Bun.build` calls and Bun CLI argument arrays; every bundler check uses `check: true` or CLI `--check`. Use `bun --check` for the project because its `check` package script otherwise takes precedence.
- Verify runtime behavior changes through owning correctness tests and existing regression checks
  for each affected runtime, output, capability and success or fallback branch. An aggregate result
  cannot prove a branch it does not exercise. Extend the nearest injectable harness when necessary.
- Before adding test infrastructure, search `__test__/`, `bench/` and `scripts/` by capability and
  failure; inspect callers and package commands. Extend the nearest owner; split only for a different
  oracle, runtime, isolation or feedback boundary.
- Keep assertions only for material defects beyond existing guarantees. Do not test fixture-owned
  allocations or facts implied by stronger assertions. Report tests protect values and diagnostics, not incidental Markdown decoration.
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
  Run Node Vitest through `bun run test:node`; focused runs use `bun scripts/test-vitest.ts`.
  Deno uses the same launcher with `UUID_SLUG_TEST_RUNTIME=deno`; the supervisor cleans interrupted work while the selected host remains the test worker.
- Keep portable clock cases and finer-precision cases together. Probe actual time representation, not OS names; test native Temporal inputs where available and preserve the configured UUIDv7 layout. For high-resolution clocks, combine whole milliseconds and fractions separately: adding the epoch first can round across a fraction boundary.
- Keep development native interop as one discovered research matrix across supported installed
  Node, Bun and Deno Node-API/FFI boundaries. Run one corpus with nonzero evidence per lane; use
  measurements to improve the adapters, never to discard one from a volatile machine snapshot.
- Prove a test reaches its target. Inputs for a later rejection must pass earlier guards;
  removing the intended guard must fail its regression. Isolate a component before attributing
  an aggregate result to it, especially when decoding tries multiple masks.
- Entropy probes must exercise the package's portable draw path as well as native delegation.
  String generation can bypass `fillRandom`; inspect the selected path instead of assuming a
  method name identifies the code under test. Compare byte keys with `join(",")` or hex,
  never platform-dependent string coercion or UTF-8 decoding.
- Preserve an unpinned newest-Node CI lane: pinned runtimes cannot expose newly added native APIs.

## Writing public documentation

These rules cover every text a consumer reads: README, its diagram (`scripts/readme-diagram.ts`),
package description and release notes. Declaration comments follow `dev/interface.md` instead.

README is roughly 60% marketing and 40% usage. It MUST explain why the complete library is worth
adopting, make ordinary calls obvious, and explain what keeps stored IDs usable. Generation alone
is not the pitch. State supported strengths with the author's confidence, never timid summaries
of implementation. Bench readers need commands and reports, not package marketing or agent rules.
Agent instructions live only in `AGENTS.md` files, never in public documents (README, `docs/`, `bench/` reports, `CONTRIBUTING.md`): public readers are people, and a rule there is noise to them. Engineering and measurement detail stays in its owning reference.

- Write as one engineer telling another: short sentences in words the reader uses. Use established
  terms where they add precision; explain unfamiliar ones. Cut internal jargon and coined phrases
  ("keyed scramble", "payload offset", "the reader"). Read each sentence alone: if nobody would say
  it to the reader ("Your database keeps UUIDs") or deleting it loses nothing, cut it.
- Give sizes as the saving the reader compares: "39% shorter than UUID text", not "14 characters
  shorter". Character and byte counts belong in definitions. Cut facts the reader cannot act on,
  such as bits per character.
- Put limits/warnings beside the affected call, with the failure and fix. Explain actual decoding
  behavior, not "proof of issuance". Keep general security advice out of the opening and unrelated calls.
- Every claim MUST give a concrete gain, caller action or boundary. Name what the reader can do,
  avoid or decide because of it. "Efficient", "ergonomic" or "complete" alone fails this test.
  State the gain before its controls; keep distinct gains separate. Short empty copy still fails.
- State benefits as facts, not "Get..." sales commands. Imperatives belong in usage and warnings.
  DO NOT weaken a supported claim or force passive voice to make it sound like documentation.
- A claim with a limit: sell what it delivers in plain words, then point to the limit once.
  Example: base64url sorts "mostly by time", footnote "for exact time order, use base32hex".
  Hedges ("roughly", "partly"), "no" labels, statistics and coined terms ("clustered") bury the
  value. Verify a limit once before stating it; never let it lead.
- Never headline what the package lacks ("no native addons, no WASM") or use slogan templates
  ("mistakes fail at compile time, not in production"): readers take both as generated filler.
- Before rewriting, identify each useful claim and where it survives. Change only named defects;
  preserve approved copy exactly otherwise. A task to merge bullets does not license rewriting
  their heading. Cut repetition, never capabilities, reasons or boundaries.
- `ROADMAP.md` README items not marked "maintainer request" are leads that agents wrote. Before
  acting on one, check it against these rules and the current README; delete it if it asks for
  copy readers do not need, and never ask the maintainer to supply content for it.
- A consistency defect is two places that tell the reader different facts, so the reader would
  act differently. Different wording for the same fact ("almost time-ordered", "mostly by time")
  and a rounded summary beside the exact value (badge "Bun >=1.0", Runtime "1.0.8") are not
  defects; leave them.
- Examples MUST stand alone. After building, run `bun scripts/check-readme.ts` for README links and TS examples.
  Construct and check reusable codecs once. Show direct calls; no forwarding wrappers, redundant
  returned inputs or unneeded conversions. Comments cannot excuse extra work.
  Show result brands/error unions; readers have no IDE. Input annotations must add meaning, not
  repeat `string` on a literal. No casts to invent validation. Use `typeof` for scalar/error unions;
  use the helper for object/error unions or unknown inputs. Preserve examples that teach alternative
  checks. Read their comments before deleting either; label the choices. Showing both for explanation
  does not recommend doing both in production.
  Error guards recognize returned errors; they do not test call correctness. State time units.
- Performance copy MUST sell speed, memory/resource efficiency and small bundles together.
  "Native APIs with TypeScript fallbacks" alone fails: it names machinery, not a gain.
  Preserve approved positioning. DO NOT put rival-by-runtime benchmark rows in README;
  rankings, measured gaps, timings and methods belong in `bench/PERFORMANCE.md`, not the pitch.
- Claims need an owning contract or evidence. Guarantees need a ruling and a test that fails without
  them; `docs/security.md` wins conflicts. A runtime/competitor "cannot" or "never" needs its probe.
  Delete claims with no possible owner; do not soften them.
- Define terms before use; every referent must exist.
- Group benefits, not exports. Each main bullet names an advantage; children add facts, not synonyms.
  Keep strengths rivals share; the combination matters. Preserve approved emphasis; judge information,
  not markup or sentence fragments. REJECT labels alone; show their meaning underneath:

  | Empty label alone | Concrete meaning |
  | --- | --- |
  | Optional UUID object | Parse once; reuse the validated UUID for conversion and inspection. |
  | Multiple representations | One UUID for storage, short URLs and lowercase filenames; no mapping table. |
  | Ergonomic API | Types catch representation mix-ups; compatible conversions chain with one error check. |

- Put purpose before badges. Rank gains by consumer reach and consequence, not implementation order.
  Surface speed/resources, deployment/bundles, unchanged IDs across representations and useful API
  controls before installation. Advanced controls must not make the default call look complicated.
  Link opening benefits to their sections. Show sizes and labeled values beside representation definitions;
  readers entering through an anchor must understand it without hunting another table.
  Follow with a copyable installation command and quick start. Keep detailed examples, limits,
  diagrams and runtime tables with their jobs. Check links; render only to resolve a layout question.
- State matching cross-language formats and implementation availability; put publication status
  beside installation. Link release policy; keep recovery and key-retention requirements explicit
  to protect stored IDs.
- State subject facts, never the writer's actions; git owns edit history.

## Release

- Release notes explain what changes for consumers and how to upgrade. Show only the minimal public API changes from the latest release in Markdown diff blocks; never publish declaration inventories, private helper types, repeated older comparisons, or API attachments. Read the body as a cold reader before publication.
- Describe only the packages being published; unpublished implementations and their reports are not consumer release notes.
- Preserve declaration names, visibility and ownership from the compiler AST; do not infer them from printed signatures, which can hide valid quoted, computed or Unicode names.
- Trace referenced types before reporting no public API change; unchanged exported signatures can hide newly required arguments or changed results.

- Let the pre-commit hook run `bun run check` before Git creates the commit unless the maintainer selects narrower intermediate checks.
  Do not repeat that command manually for the same unchanged tree unless a failure or changed evidence requires another run.
  Track failed checks with unfinished work; a failed complete check prevents final delivery.
- Commit only after staging succeeds and `git diff --cached` contains every intended hunk; `git mv` stages the rename before its consumer edits, and a failed `git add` leaves that partial index intact.
- The release command owns the temporary stable-version context. API checks must distinguish that transition from an actual tagged commit and ordinary development; never disable the commit hook.
- Install nightly in each job that generates Rust public API reports; another job's toolchain setup does not carry over.
- Every CI job invoking the normal packed-artifact check must install Node, Bun and Deno; its default package-resolution probes execute all three. `--web` adds browser execution, not the first Deno requirement.
- Build before Node Vitest in each CI checkout; entropy subprocesses import the compiled Node adapter, so a source-only runtime probe cannot prepare those tests.
- Pack only after repository build and test processes exit; packlist traversal can race temporary cache files excluded from the tarball.
