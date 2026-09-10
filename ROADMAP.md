# Roadmap

Keep only unfinished work here; durable contracts and decisions belong in their owning documentation.

## TypeScript public interface redesign

Make masked UUIDv7 support require an explicit private seed or an explicit public demonstration
schema, then remove every public declaration and invalid state that does not serve a documented
consumer operation. This section is an implementation checklist, not a contract owner; move each
settled guarantee to README and each settled design or security rule to its owning document before
removing the completed item from this roadmap.

### Approved HLD

Art requires the published-key schema to remain usable only by explicit opt-in. The default codec
variant must fail fast and require proper setup. Arbitrary third-party masking transforms are a real
supported consumer capability and must retain all their value and functionality without requiring
the consumer to be disclosed. Improve the public interface without narrowing generation, masking,
decoding, migration, storage, cancellation, runtime, or cross-language behavior. Use this roadmap
as the live SOP and progress tracker until the complete interface change is implemented, documented,
verified, and committed.

The approved interface direction removes unsafe defaults and unrelated duplicate routes; it does
not authorize deleting useful annotation types, known-format migration selection, custom generator
behavior, or custom transform capability. Where a later discovery would change what consumers get,
lose, experience, pay, or risk, preserve the current behavior and ask Art to amend this HLD rather
than silently deciding it in implementation.

### Required outcome

- [ ] Preserve direct UUID and slug generation, conversion, validation, caller-owned storage,
  masking, sentinels, key rotation, freshness validation, cooperative schema derivation, and the
  ruled migration formats without changing their wire bytes or accepted issued identifiers.
- [ ] Make this invariant true in both declarations and runtime behavior: no masked identifier can
  be produced until the caller explicitly selects private key material or the published public
  schema.
- [ ] Require codec options and a current mask in TypeScript; make omitted options, `undefined`,
  `null`, `{}`, and `{ mask: undefined }` return one immediate, corrective `invalid_mask_schema`
  error in untyped JavaScript.
- [ ] Run the missing-mask guard before key derivation, entropy access, generator creation,
  sentinel processing, or any other avoidable work.
- [ ] Keep the published schema for deterministic tests, examples, and wire fixtures, but rename
  `DEFAULT_MASK_SCHEMA` to the honest opt-in name `PUBLIC_MASK_SCHEMA`; select it only with
  `createUuidSlugCodec({ mask: PUBLIC_MASK_SCHEMA })`.
- [ ] Remove `defaultCodec` and do not add a compatibility alias, implicit fallback, environment
  lookup, magic default, or separate behavior that can select the public schema accidentally.
- [ ] Keep the existing `UuidSlugError | T` failure language unless evidence shows another shape
  improves callers enough to justify a new generic result interface or exception policy.
- [ ] Preserve explicit operation names such as `uuidV7ToMaskedSlug` and
  `maskedSlugToUuidV7`; simplify by deleting invalid or unrelated operations rather than replacing
  complete names with context-dependent `encode`, `decode`, or `generate` verbs.

### Target interface

The implementation target is the following consumer-visible shape. Names may change only when a
direct source read proves a collision or TypeScript declaration limit; any semantic change returns
to the Approved HLD instead of being inferred from implementation convenience.

```ts
declare const maskSchemaBrand: unique symbol;

export interface MaskSchema {
  readonly id: string;
  readonly [maskSchemaBrand]: true;
}

export interface MaskSchemaOptions {
  readonly id?: string;
  readonly seed: string | Uint8Array;
  readonly keyIterations?: number;
}

export interface CustomMaskSchemaOptions {
  readonly id: string;
  readonly forward: (input: Uint8Array, output: Uint8Array) => void;
  readonly reverse: (input: Uint8Array, output: Uint8Array) => void;
}

export const PUBLIC_MASK_SCHEMA: MaskSchema;

export function createMaskSchema(
  options: MaskSchemaOptions,
): UuidSlugError | MaskSchema;

export function createMaskSchemaAsync(
  options: AsyncMaskSchemaOptions,
): Promise<UuidSlugError | MaskSchema>;

export function createCustomMaskSchema(
  options: CustomMaskSchemaOptions,
): UuidSlugError | MaskSchema;

export interface UuidSlugCodecOptions {
  readonly mask: MaskSchema | MaskSchemaOptions;
  readonly previousMasks?: readonly (MaskSchema | MaskSchemaOptions)[];
  readonly sentinels?: readonly UuidV7SentinelDefinition[];
  readonly maskedSlugAlphabet?: SlugAlphabet;
  readonly generator?: UuidV7Generator;
}

export function createUuidSlugCodec(
  options: UuidSlugCodecOptions,
): UuidSlugError | UuidSlugCodec;

export interface UuidSlugCodec {
  readonly sentinels: readonly UuidV7Sentinel[];
  migration(options?: UuidSlugMigrationOptions): UuidSlugMigration;
  uuidV7MaskedSlug(): UuidSlugError | PublicUuidV7Slug;
  uuidV7ToMaskedSlug(uuid: string): UuidSlugError | PublicUuidV7Slug;
  maskedSlugToUuidV7(slug: string): UuidSlugError | UuidV7String;
  validateMaskedSlugFresh<S extends string>(
    slug: S,
    freshness?: FreshValidationOptions,
  ): UuidSlugError | S;
}
```

The implementation signature may accept missing or malformed options internally so untyped
JavaScript receives `UuidSlugError`, but the emitted overload must require `UuidSlugCodecOptions`.
Keep `this: void` on every callable interface method so detaching a method remains supported; it is
omitted from this sketch only to keep the target readable. Existing keyless functions, migration
types and methods, string/slug/byte brands, guards, error vocabulary, sentinel types, generator
types, freshness options, alphabet type, and caller-buffer operations remain public unless an
explicit task below says otherwise.

Consumer replacements for removed codec members are part of the same change:

| Removed route | Retained route |
| --- | --- |
| `codec.uuidV4()` | `uuidV4()` |
| `codec.uuidV4Bytes(out?, offset?)` | `uuidV4Bytes(out?, offset?)` |
| `codec.uuidV4Slug()` | `uuidV4Slug(alphabet?)` |
| `codec.uuidV7()` / `codec.uuidV7Bytes(...)` | the injected `UuidV7Generator`, or top-level `uuidV7` / `uuidV7Bytes` |
| `codec.uuidV7At(...)` / `codec.uuidV7BytesAt(...)` | the injected `UuidV7Generator`, or matching top-level functions |
| `codec.uuidV7Slug()` | generate through the selected generator and call `formatUuidSlug`, or use top-level `uuidV7Slug(alphabet?)` |
| `codec.maskedSlugToUuid(...)` with plain fallback | `codec.migration({ plain: true }).decode(...)` |
| `acceptUnmaskedSlugs` | an explicitly retained migration reader with `plain: true` |

The injected generator replacement is load-bearing: callers needing a custom clock or entropy
source must retain the generator they pass to the codec. Top-level generation intentionally keeps
using the platform adapter and is not equivalent to that custom generator.

### Implementation map

- [ ] Change public types and method ownership in `src/types.ts`, keeping optional brand behavior and
  every retained consumer annotation.
- [ ] Separate opaque schema handles, seed derivation, custom-transform adaptation, and the public
  schema token in `src/schema.ts`; keep Feistel and HalfSipHash wire primitives unchanged.
- [ ] Enforce required masks and narrow the returned codec in `src/codec.ts`; route plain fallback
  exclusively through `src/migration.ts`.
- [ ] Keep keyless generation in `src/keyless.ts`, custom generator behavior in `src/v7.ts`, and
  byte parsing/formatting in `src/uuid.ts`; change these files only for exact caller-buffer typing or
  the honestly named random-bit predicate.
- [ ] Export only the target surface from `src/index.ts`, regenerate `api/typescript.api.d.ts`, and
  update `test/consumer-types.fixture.ts` through the packed declaration entry.
- [ ] Adapt behavior probes in `test/codec-boundary-probe.ts`, `test/consumer-probe.ts`,
  `test/core.test.ts`, `test/schema-async-probe.ts`, runtime-specific wrappers, and shared wire
  fixtures; consolidate cases into their existing probe owner instead of adding parallel suites.
- [ ] Preserve the matching Rust capability in `rust/uuid-slug/src/schema.rs`, codec behavior in
  `rust/uuid-slug/src/codec.rs`, exports in `rust/uuid-slug/src/lib.rs`, and generated Rust API
  baseline. Use Rust-native naming and ownership where it does not alter consumer semantics.
- [ ] Update `README.md`, `docs/design.md`, `docs/security.md`, `docs/cross-language.md`, local
  `AGENTS.md`, and `api/README.md` only for the contract, design, security, parity, and verification
  knowledge each file owns.

- [ ] Make `MaskSchema` an opaque, frozen package-produced handle. Its public interface may expose
  a diagnostic `id`, but must not expose `mix`, raw block mutation, direction flags, key material,
  or any representation needed only by the masking implementation.
- [ ] Keep `createMaskSchema({ seed, keyIterations, id })` and `createMaskSchemaAsync(...)` as the
  synchronous and cooperatively cancelable ways to derive one reusable opaque schema. Callers pass
  the completed handle to the existing synchronous codec factory; do not add an async codec factory
  that duplicates option interpretation without adding capability.
- [ ] Make `UuidSlugCodecOptions.mask` required and accept only an opaque `MaskSchema` or
  `MaskSchemaOptions`. Keep `previousMasks` ordered and independently able to contain either form.
- [ ] Narrow `UuidSlugCodec` to state-dependent operations: `sentinels`, `uuidV7MaskedSlug`,
  `uuidV7ToMaskedSlug`, `maskedSlugToUuidV7`, `validateMaskedSlugFresh`, and `migration`.
- [ ] Stop extending `UuidV7Generator`. Continue accepting an injected generator as an internal
  dependency for masked generation without republishing its methods.
- [ ] Remove codec-level `uuidV4`, `uuidV4Bytes`, `uuidV4Slug`, `uuidV7`, `uuidV7Bytes`,
  `uuidV7At`, `uuidV7BytesAt`, and `uuidV7Slug`; their keyless module functions remain the one
  public route for ordinary generation.
- [ ] Remove codec-level `slugAlphabet`; plain alphabet selection remains on keyless direct-slug
  producers, while the narrowed codec retains only `maskedSlugAlphabet`.
- [ ] Remove `acceptUnmaskedSlugs` and `maskedSlugToUuid` from ordinary codec behavior. Current
  masking produces UUIDv7, while non-v7 and plain fallback exist only for explicit migration.
- [ ] Make `validateMaskedSlugFresh` return the caller's input type as it does now unless removal of
  plain fallback proves a narrower return truthful for every retained migration path; never label a
  plain accepted value as masked merely to simplify the signature.
- [ ] Preserve `MaskedUuidV7Slug`, `SentinelUuidV7Slug`, and their
  `PublicUuidV7Slug` union. A consumer knows the sentinel distinction when reading
  `codec.sentinels`, even though no guard can infer issuance from arbitrary text.
- [ ] Preserve `UuidBytes` as the documented annotation for consumer storage known to hold one UUID
  payload. Its value does not depend on a package return signature, and its optional brand must not
  be misrepresented as runtime validation.
- [ ] Preserve caller-owned storage identity in declarations with overloads that return the exact
  supplied typed-array subtype and reject an offset when no output buffer is supplied. Apply the
  same shape to UUID parsing, slug parsing, v4/v7 byte generation, explicit-time byte generation,
  and generator byte methods.
- [ ] Rename `hasUuidV7Entropy` to `hasNondegenerateUuidV7RandomBits`, or keep it internal if no
  documented consumer operation needs the predicate independently. Never claim that one identifier
  establishes entropy when the implementation only rejects all-zero and all-one random fields.

### Migration interface

- [ ] Keep compatibility decoding in `codec.migration(...)`; ordinary masked decoding must reject
  original and plain forms even when a migration reader exists beside it.
- [ ] Preserve `original?: boolean` and `plain?: boolean`: they are two independent opt-ins and add
  no collection allocation, order ambiguity, or new token vocabulary.
- [ ] Preserve the optional per-call `MigrationFormat`. It lets a caller with source-format
  knowledge bypass text overlap and avoid a false candidate from another enabled format; requesting
  a disabled format must continue returning an actionable error.
- [ ] Preserve sentinel-first, current-schema, original-mask, then plain ordering when no format is
  selected. Preserve first-passing decode semantics, candidate deduplication, stored trailing-bit
  aliases, and the rule that a caller—not the package—performs store lookup across ambiguous
  candidates.
- [ ] Retain `candidates` because ambiguous formats can produce several valid candidate UUIDs; do
  not hide that ambiguity by choosing a candidate the issuing store has not confirmed.
- [ ] Keep `MigrationFormat = "current" | "original" | "plain"` and prove each selector reaches
  only its intended decoder after sentinel handling.

### Custom schemas

- [ ] Preserve arbitrary third-party reversible masking transforms as a required public capability;
  do not condition that capability on disclosure of its consumer, remove it as speculative, narrow
  its transform domain, or make package-owned seed derivation the only schema source.
- [ ] Replace the structurally forgeable `MaskSchema` callback object with a deliberately advanced
  `createCustomMaskSchema({ id, forward, reverse })` factory that returns the same opaque frozen
  `MaskSchema` handle as package-owned derivation. Keep custom construction independent from
  ordinary `MaskSchemaOptions` so codec options consume schemas without also exposing their
  implementation seam.
- [ ] Give forward and reverse transforms separate required callbacks instead of a boolean direction
  flag. Each callback receives distinct 16-byte input and output arrays, may throw, and must write
  the complete output without retaining either array; the package adapts both callbacks to its
  internal mixing representation without adding per-identifier allocation.
- [ ] Preserve the full existing custom-transform value: custom current writers, ordered custom
  previous schemas, sentinels, both masked alphabets, current masked decoding, freshness,
  migration candidates, thrown-cause retention, detached codec methods, and TypeScript/Rust wire
  parity must work exactly as they do for package-derived schemas.
- [ ] Validate custom schemas once when the factory creates the handle rather than every time a
  codec consumes an already validated handle. Construction must detect thrown callbacks, incomplete
  writes where that can be observed, input mutation, output dependence on stale destination bytes,
  failure to reverse representative blocks, and alias assumptions; finite probes remain smoke
  tests and documentation must state that callers own invertibility over all 128-bit inputs.
- [ ] Keep the transform callbacks and raw mutation contract out of `MaskSchema` declarations and
  codec options. Callers that only store, rotate, or consume a schema handle should not inherit the
  advanced constructor's implementation obligations.
- [ ] Decide and test reentrancy and concurrent-use behavior for custom transforms. A codec must not
  share scratch arrays across overlapping calls if a callback can reenter it; if synchronous calls
  cannot overlap without reentrancy, state and enforce the narrower fact rather than claiming
  thread safety the JavaScript object cannot provide.
- [ ] Provide a source-compatible migration example from `{ id, mix(input, output, forward) }` to
  separate `forward` and `reverse` callbacks, but do not ship a deprecated alias or compatibility
  object shape unless a governed release requires it.

### Public-schema and construction edge cases

- [ ] Freeze `PUBLIC_MASK_SCHEMA`, every derived schema handle, each codec, the exposed sentinel
  array, and each exposed sentinel record unless mutation has a documented consumer requirement.
- [ ] Never include a seed, key, derived key material, or recoverable secret fragment in an error,
  schema identifier, inspection result, source map, or log-oriented value.
- [ ] Allow the public schema explicitly as the current mask, as a previous mask beneath a private
  current mask, and as the current mask above private previous masks; these are distinct explicit
  migration configurations.
- [ ] Preserve caller-specified schema order, including repeated handles and duplicate diagnostic
  IDs, unless Art rules that construction may newly reject them. Do not add key fingerprints or
  secret-derived equality work merely to optimize an unusual configuration.
- [ ] Define and test whether an opaque schema produced by another loaded copy of this package is
  accepted. Do not accidentally choose between structural handles, private symbols, and WeakSet
  ownership without deciding this cross-copy behavior.
- [ ] Validate configuration before observing cancellation. For otherwise valid configuration, a
  pre-aborted signal returns `aborted` before derivation; cancellation during derivation exposes no
  partial schema or codec.
- [ ] Copy mutable byte seeds before asynchronous suspension and preserve the existing shared-memory
  warning; synchronous construction must consume one stable reading without retaining caller bytes.
- [ ] Reject short seeds and invalid iteration counts without falling back to the public schema.
- [ ] Preserve documented cause retention for clock calls, entropy adapters, and transform
  callbacks. Ordinary codec options are trusted configuration; do not add proxy/getter machinery
  without a ruled untrusted-options boundary.
- [ ] Selecting or validating a mask must not draw entropy. Generator state begins only when an
  operation actually generates an identifier.
- [ ] Preserve sentinel priority, both accepted sentinel spellings, custom replacement semantics,
  collision rejection, and the independence of sentinel choice from mask alphabet.
- [ ] Preserve current-then-previous schema order and never promote a previous schema to the writer
  merely because the current mask was omitted; omission is always an error.

### Alternatives rejected unless new evidence changes the decision

- [ ] Do not rely on stronger warnings around an unsafe default; warnings do not make an omitted
  security choice explicit.
- [ ] Do not interpret `undefined`, `null`, `{}`, an absent environment variable, or an empty seed
  as permission to use the public schema.
- [ ] Do not use environment discovery, global configuration, a dependency-injection container,
  or another ambient source for the seed; hidden I/O and ambient authority defeat explicit setup.
- [ ] Do not use a string such as `mask: "public"` when the frozen exported token can provide one
  typo-proof SSoT with autocomplete and no widened magic value.
- [ ] Do not add a separate public/demo codec factory unless the explicit schema token proves
  insufficient; two factories duplicate every other codec option and construction rule.
- [ ] Do not introduce a builder, fluent setup, typestate chain, branded seed prerequisite,
  configuration URI, or generic mode parameter unless measured caller failures justify its extra
  values and steps.
- [ ] Keep asynchronous work confined to the explicitly async schema factory. Do not add an
  async-only codec factory, conditional Promise return, lazy thenable, or automatic scheduling.
- [ ] Do not switch construction alone to exceptions or introduce a generic `Result` abstraction
  without comparing the complete package failure language, caller branches, allocations, and
  cross-realm behavior.
- [ ] Do not replace explicit method names with short generic verbs, expose separate capability
  objects, or add namespace hierarchy merely to make a declaration count smaller.
- [ ] Do not add package subpaths merely to hide declarations. A subpath is still permanent public
  surface and is justified only by measured import/evaluation isolation or a materially clearer
  consumer boundary.
- [ ] Do not require `CryptoKey`, a callback key provider, or persisted schema URI; none matches the
  frozen seed derivation contract without adding conversion, I/O, lifetime, or secrecy hazards.

### Test-first implementation sequence

- [ ] Update the currently conflicting local guidance before implementation: replace the
  `defaultCodec`/`DEFAULT_MASK_SCHEMA` retention rule in `AGENTS.md` with Art's explicit opt-in
  ruling, and make README/security/design owners state the same consumer behavior in their proper
  scopes. Completion is one consistent rule with no stale public-default instruction in the tree.
- [ ] Add compile-fail consumer cases for omitted options, empty options, missing mask,
  `DEFAULT_MASK_SCHEMA`, removed codec methods, and offset-without-buffer calls.
- [ ] Add compile-pass consumer cases for a private seed, `PUBLIC_MASK_SCHEMA`, previous public and
  private schemas, reusable opaque schemas, exact caller-buffer subtype returns, and detached codec
  methods.
- [ ] Add runtime probes for omitted and malformed JavaScript configuration. Prove every case
  returns the same corrective error before derivation, entropy, generator setup, or sentinel work;
  removing or moving the guard must fail the probe.
- [ ] Separate the internal schema implementation from its public opaque handle, then retain all
  existing wire vectors before changing codec construction.
- [ ] Implement and verify explicit public-mask selection and required private/public configuration.
- [ ] Narrow the codec and replace tests of delegated methods with tests through the keyless module
  and the narrowed masking interface.
- [ ] Move plain fallback out of ordinary decoding only after the migration reader is independently
  proven to preserve unmasked v4/v7 recovery, known-format selection, and candidate ordering.
- [ ] Preserve useful brands and improve caller-buffer declarations after behavior is stable; use
  downstream package compilation, not source-only assertions, as the type instrument.
- [ ] Measure fresh-process imports for keyless generation, plain conversion, public-mask codec
  construction, and private-mask codec construction in Node, Bun, and Deno. Instrument module
  evaluation and derivation directly; bundle inspection alone cannot establish direct ESM cost.
- [ ] Add a narrow package subpath only if those measurements show avoidable masking evaluation on
  keyless imports and the subpath improves enough consumer paths to earn another permanent export.
- [ ] Apply every semantic change to Rust and the shared contract cases in the same implementation
  increment. Preserve language-appropriate ownership and errors without changing the accepted
  domain or wire result.

Work one self-sufficient phase at a time in the order above. A phase is complete only when its
targeted discriminating checks pass and its focused commit lands; keep no more than one code phase
uncommitted. Run the complete routine gate once after the whole interface is integrated, then fix
and rerun from the failing owner rather than repeatedly paying the full gate between incomplete
phases.

### Proof and delivery

- [ ] Preserve the current and original mask vectors, both alphabets, sentinel vectors, previous-key
  order, freshness boundaries, overflow rejection, plain canonicality, and every retained archive
  compatibility case in TypeScript and Rust.
- [ ] Prove each runtime adapter executes nonzero cases. Gate runtime-dependent branches in Node and
  Bun and retain Deno and browser coverage where entrypoints or cancellation behavior change.
- [ ] Prove a configured public schema emits the existing deterministic public-schema bytes while
  omitted configuration emits nothing and fails before work.
- [ ] Prove ordinary decoding rejects plain and original formats, while migration accepts exactly
  the selected legacy formats and still returns all distinct candidates in the ruled order.
- [ ] Prove malformed custom generators cannot make masked encoding return a non-v7 public value;
  validate generated bytes at the masking seam.
- [ ] Verify API declarations with the TypeScript floor and current compiler, built-package
  downstream compilation, Node and Bun runtime probes, Deno execution, shared Rust cases, API
  evolution checks, artifact checks, and the complete `bun run check` gate.
- [ ] Mutation-check only load-bearing promises whose existing instruments cannot already catch the
  defect: required-mask declaration, no-work-before-runtime-guard, explicit public selection,
  ordinary-versus-migration decode containment, caller-buffer return precision, and frozen wire
  vectors. Fold each case into the nearest existing probe instead of creating a new test layer.
- [ ] Update README guarantees and examples, `docs/design.md`, `docs/security.md`,
  `docs/cross-language.md`, generated API baselines, consumer fixtures, release classification, and
  changelog material together with the behavior they own. Keep settled reasoning in those owners,
  not in this transient roadmap.
- [ ] Classify the complete consumer effect against the latest governed release before selecting a
  development version. The current absence of a governed baseline does not itself choose a version.
- [ ] Run an adversarial promise-to-evidence audit, remove superseded tests and declarations, verify
  every surviving public part names a documented consumer operation, commit focused increments only
  after the complete check passes, and leave the worktree clean.

## Remote-write hold

These entries are inventory, not executable tasks. Do not start or ask about one unless a maintainer explicitly requests that exact operation.

- [ ] **HOLD:** Push local commits to the remote repository.
- [ ] **HOLD:** Push the release tag to the remote repository.
- [ ] **HOLD:** Publish the npm package.
- [ ] **HOLD:** Publish the Rust crate.
- [ ] **HOLD:** Create the draft GitHub release.
- [ ] **HOLD:** Update GitHub release notes or assets.
- [ ] **HOLD:** Finalize the GitHub release.
- [ ] **HOLD:** Change branch protection.
- [ ] **HOLD:** Change any other remote repository setting.

## Dependency follow-up

- [ ] Update git-cliff to registry version 2.14.1 or later when available, verify changelog generation, and retain the registry installer. Updating publish-clean requires separate repository authorization.
