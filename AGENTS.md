# @anizoptera/uuid-slug

Preserve the published identifier contracts and verify the runtime paths that each change reaches.

## Contract owners

- Read `docs/public-api.md` before changing or documenting a public export, type, parameter,
  default, error, runtime path, or performance characteristic; it owns interface shape and the
  declaration comments consumers see. A naming repair follows domain meaning through every
  dependent use; a compile failure never licenses restoring an opaque legacy term.
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
- Read `docs/design.md` before changing masking, schemas, or sentinels. Preserve its wire layout:
  masked payloads are UUIDv7-only, with a 16-bit check and timestamps below 2^42 milliseconds.
  Preserve both their 22-character base64url and lossless 27-character base32hex spellings.
  Reject overflow rather than truncate. Base64url helpers accept exactly one 16-byte UUID payload
  or its canonical 22-character spelling; reject every other length. Preserve plain-slug padding rejection.
- Read `docs/cross-language.md` before Rust work or changes shared with TypeScript. It owns
  parity, approved filesystem-safe output and distribution boundaries. Keep base64url defaults;
  select filesystem-safe masked output independently from the plain-slug alphabet.
  Preserve length-based alphabet inference for plain decoding.
- Masked slugs and sentinels are core functionality. Sentinels use precomputed raw slugs per
  codec. Decode returns the first passing candidate in caller-specified key order, never proof
  of issuance. Do not reject multiple matches or append fallback schemas on the caller's behalf.
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
- Order root export conditions as `types`, `bun`, `development`, `node`, then `default`.
  Bun and development load published TypeScript; Node keeps its native-runtime build.
- Public docs use caller-facing tokens such as `"base32hex"`, not internal symbol names.
  Documentation-alignment gates are ruled out; test the API behavior instead.
- Do not mention private source project names in public files, commits, tests, fixtures, or reports.

## Runtime boundaries and evidence

- Read `bench/README.md` before benchmark work. Scope exploratory comparisons with its maintained
  filters; run all applicable runtimes only after a candidate survives the focused mechanism test.
- Choose the performance ladder from the path under test. For a primary public route, treat Bun and
  Node as independent co-primary targets, then Chromium, then Deno: retain a material repeated win
  in either co-primary runtime when the other is unchanged unless contract risk or lifetime cost
  outweighs it.
- Benchmark every portable encoder and fallback directly on Node, Bun, Deno, and Chromium, even
  where normal dispatch selects a native path. For that portable path, first rank runtimes where
  normal dispatch uses it by the primary-path order; rank every runtime that shadows it with a native
  implementation last, regardless of that runtime's primary-path rank. Shadowed runtimes verify
  portability but do not steer fallback trade-offs.
- Never act on one performance run. Repeat the decision-relevant workload and retain an optimization
  only when the effect reproduces and its uncertainty excludes no material change; otherwise report
  the result as unresolved. A statistically detectable but negligible effect does not earn code.
- Correctness outranks every performance result. Before timing a candidate, map the contracts and
  failure modes its changed mechanism can break, inspect whether existing tests distinguish them,
  add the smallest missing falsifiers, and mutate the mechanism to prove those tests reach it. Run
  the owning runtime tests before and after measurement; reject speedups with an unsecured invariant.
- Before adding test infrastructure, search `test/`, `bench/`, and `scripts/` by capability and
  failure, then inspect callers and package-script routing. Extend the nearest owner. Split only for
  a different oracle, runtime, isolation, or feedback boundary.
- Keep routine verification in `.github/workflows/check.yml`. Add another workflow only when it
  needs a different trigger or permission boundary.
- Gate every runtime-dependent change in both Node Vitest and Bun tests, including branches
  outside `src/runtime/` that use optional capabilities. Neither runner covers the other's
  adapter. Share entropy cases in `test/entropy-probe.ts`.
- Keep development native interop as one discovered research matrix across supported installed
  Node, Bun and Deno Node-API/FFI boundaries. Run one corpus with nonzero evidence per lane; use
  measurements to improve the adapters, never to discard one from a volatile machine snapshot.
- A runtime/compiler floor forbids unguarded newer APIs, not useful newer APIs. Use a newer
  JavaScript capability only for measured runtime or resource value, probe it once, retain a
  compatible fallback, and exercise both paths in their owning runtime lanes.
- Prove a test reaches its target. Inputs for a later rejection must pass earlier guards;
  removing the intended guard must fail its regression. Isolate a component before attributing
  an aggregate result to it, especially when decoding tries multiple schemas.
- Entropy probes must exercise the package's portable draw path as well as native delegation.
  String generation can bypass `fillRandom`; inspect the selected path instead of assuming a
  method name identifies the code under test. Compare byte keys with `join(",")` or hex,
  never platform-dependent string coercion or UTF-8 decoding.
- Preserve an unpinned newest-Node CI lane: pinned runtimes cannot expose newly added native APIs.
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

## Release

- Remote writes require explicit maintainer authorization for each exact operation. Do not push,
  open a pull request, upload a tag, create a release, publish, or change remote settings.
- MUST read `docs/release.md` in full before changing versions, release tooling or workflows,
  packaging, publication, recovery, assets, notes, or finalization.
- Run `bun run check` before committing unless a maintainer explicitly selects narrower intermediate
  checks for the current work; the complete check still gates final delivery.
