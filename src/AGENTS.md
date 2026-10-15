# src/ — TypeScript package source

Rules for editing the TypeScript package. Root `AGENTS.md` applies too.

## Public TypeScript interface protocol

- Start from executable consumer calls; `dev/interface.md` §Rules and §Types and validation own
  runtime acceptance, TypeScript inference, defaults, constants and option-key checks. A declaration
  baseline proves signatures only.
- Check omitted arguments with explicit generics and reusable typed options before publishing
  inferred case or retained capabilities. Check buffer writes against pre-existing UUID brands
  and parsed-value reuse against retained context; types must describe the resulting value.
- Reject assignments that invent parsed UUID presets; optional method arguments alone do not
  distinguish retained capabilities in TypeScript's structural assignability.
- Test supported unions and optional-options forwarding, not just each branch separately. Receiver
  repairs must preserve inferred versions and reject borrowed methods that invent version or preset facts.
  Vary retained capabilities independently and check bound preset calls; overload order affects bind/call.
- Anchor overload edits at their enclosing declaration and signature boundary; compare emitted
  JavaScript before accepting a type-only repair so a matching implementation line cannot change behavior.
- Finish only when source calls, runtime paths, emitted declarations, editor help, packed consumers,
  and produced bundles independently prove the changed contract.

## Source and emitted modules

- Every relative import in `src` MUST name its real `.ts` file. The build rewrites emitted imports
  to `.js`; never omit the extension or write `.js` in TypeScript.
- Keep compiled public JavaScript executable under Bun even though Bun normally selects source.
  Its `#runtime` import MUST still select the Bun TypeScript adapter and native primitives; test
  source selection and direct compiled execution separately because one does not prove the other.
- Read `dev/cross-language.md` §JavaScript packaging before changing emitted module boundaries,
  internal exports, moved code, import-time initialization, tsdown, minification, source maps,
  `sideEffects`, or optimizer annotations. Before deleting a moved file, account for every original
  implementation line, comment, and consumer. The packed-artifact check MUST preserve every
  source-owned `PURE` and `NO_SIDE_EFFECTS` annotation.
- Hoist repeated semantic runtime strings, including alphabets and diagnostics, to named scalar
  constants in the narrowest owner. Build tuples or sets only for runtime work; never use numeric
  indexes for meaning. Share across files only for one concept without retaining unrelated code;
  otherwise use private local constants. Never build root string catalogs or runtime lookup objects;
  they retain unrelated values and weaken tree shaking.
  Keep `typeof` operands literal for TypeScript narrowing. Do not weaken types or declarations,
  or add hot-path helper calls, for deduplication. Search all `src` runtime expressions for each moved
  literal, inspect every hit, and run declaration/API and packed tree-shaking checks. Type-only
  repetition is allowed only when the published type cannot reference the private runtime owner.

## Failures, declarations and comments

- Return `UuidSlugError` for every caller-caused or recoverable failure. Never add a throwing
  convenience API; the one ruled throw is `rng_unavailable` from argument-free or preset-only
  generation, whose declarations carry no union (`dev/interface.md` §Failures and effects).
  Package-owned interfaces carry failures as values; adapt and contain exception-based
  dependencies at their boundary.
- Before changing composition, propagation, markers, recognition or result types, read
  `dev/interface.md` §Failures and effects; before selecting checks or fallback order, read
  §Capabilities and runtime work. These owners distinguish local results from foreign inputs.
- Before writing declaration comments, read `dev/interface.md` §Declaration comments; it owns
  JSDoc coverage, caller-facing facts, equivalent wording and useful editor help.
- Audit public TypeScript with executable source and packed calls covering overloads, defaults,
  option combinations, detached methods, brands, caller output and failures. Apply `dev/interface.md`
  §Proof; `api/typescript.api.d.ts` records signatures only.
- Update affected public JSDoc with its source, never later. Before committing, build declarations,
  query changed symbols through the TypeScript language service and read each changed `.d.ts` as a
  cold consumer. Presence checks find omissions, not incorrect, incomplete or unhelpful wording.
- Before deleting or rewriting a comment, list and verify its useful claims. Keep each non-trivial
  decision's reason, evidence or assumption, rejected alternative and what would change it beside its owner.
  Keep caller facts in JSDoc; put implementation constraints and remeasurement triggers in local
  comments. Cite the symbol or evidence that rejects an alternative. Delete only repetition, false
  claims, history or obvious facts. Re-read every comment in the changed function.
- When moving or extracting code, copy the complete source span byte-for-byte, including every
  comment and blank line. Prove the copy identical before editing it, read the final destination,
  then remove the source last. A token or syntax diff cannot prove comment preservation.

## Runtime capabilities

- Explain every performance-motivated function and branch in local comments: why it exists,
  the strongest rejected alternative, its boundary and remeasurement trigger. Public JSDoc covers
  caller inputs, results, failures, effects, guarantees and choices, never internal reasoning.
  Non-public TSDoc may explain constraints when editor help is useful. Keep versions, numbers,
  workloads and statistical limits in `bench/decisions.md`; link it rather than copy them.
- A runtime/compiler floor forbids unguarded newer APIs, not useful newer APIs. Use a newer
  JavaScript capability only for measured runtime or resource value, probe it once, retain a
  compatible fallback, and exercise both paths in their owning runtime lanes.
- Probe optional capabilities once at module load; absent methods remain undefined. A defined
  method that throws for an absent capability creates exception-driven fallback on every call.
- Minimize startup work too: reuse existing inputs, stop when precedence settles the answer, and
  skip parsing, allocation and initialization that the selected capability does not need.
- Cast probes to narrow optional capability shapes, not intersections with ambient types that
  may already declare the method required.
- Before changing brands, string wrappers or input validation, read `dev/interface.md`
  §Types and validation; preserve ergonomic raw inputs and every distinction validation proves.
- Return owned bytes as plain `Uint8Array`, not `Buffer`; verify constructors in Node and Bun.
  Adapt at the runtime boundary and preserve caller buffers; apply root `AGENTS.md` §Work scope before adding defenses.
