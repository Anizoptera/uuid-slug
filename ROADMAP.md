# Roadmap

## Competitor interface follow-up

Adopt the useful competitor behavior without copying interfaces that add more caller burden than capability.

- [ ] Accept standard UUID URNs and common brace-wrapped UUID text at every universal UUID-text input.
  - [ ] Normalize every accepted spelling to the requested canonical hyphenated case.
  - [ ] Preserve strict source-specific slug parsing and reject prefixes, wrappers, whitespace, or nesting outside the accepted grammar.
  - [ ] Prove mixed case, nil, max, versions, malformed wrappers, wrong lengths, and runtime non-string inputs.
- [ ] Export typed canonical `NIL_UUID` and `MAX_UUID` values in TypeScript and Rust.
  - [ ] Keep nil valid for version-neutral operations and reject it only where an operation requires UUIDv4 or UUIDv7.
  - [ ] Prove direct conversion, both plain-slug alphabets, masking rejection, declarations, and packed consumers.
- [ ] Give created UUIDv7 generators an explicit clock-rollback policy.
  - [ ] Compare preserving the last timestamp, resetting to the observed clock, and returning a typed failure.
  - [ ] Choose an explicit default from consumer consequences; keep module-level generation simple.
  - [ ] Prove rollback, repeated timestamps, recovery, overflow, clock failures, and independent generator state.
- [ ] Re-evaluate the remaining competitor interface ideas from real consumer calls before accepting or rejecting them.
  - [ ] Compare primitive results with a parsed UUID value object for repeated inspection, conversion, equality, serialization, and worker transfer.
  - [ ] Compare one-at-a-time generation with bounded or progressive batch generation under allocation and event-loop limits.
  - [ ] Test whether custom alphabets solve a real interoperability job that the two canonical alphabets cannot.
  - [ ] Compare numeric Unix milliseconds with `Date` input and output at application boundaries.
  - [ ] Compare standalone operations, function-attached helpers, and representation-specific namespaces for discovery and detached-name clarity.
  - [ ] Compare error values, result objects, exceptions, and nullable results on composition, diagnosis, and ordinary call burden.
  - [ ] Compare runtime-owned entropy with caller-supplied entropy and counters for reproducibility, security, and misuse resistance.
  - [ ] Compare exact `Uint8Array` input with `ArrayBuffer`, views, and array-like bytes for interoperability, ownership, and validation cost.
  - [ ] Compare separate generation functions with an output selector for text, bytes, and each plain-slug alphabet.
  - [ ] Reject unrelated UUID-version generation without further work; version-neutral conversion remains supported.
- [x] Define and enforce the JavaScript primitive-string input boundary.
  - [x] Record the decision and its reason in the public API authority before dependent text.
  - [x] Keep consumer guidance and agent routing concise and consistent with that authority.
  - [x] Make the existing runtime falsifier distinguish a valid nil UUID from its rejected wrapper.
  - [x] Run the focused test and complete gate, re-read the diff, and commit only these files.

- [x] Finish the detached-name audit across the Rust API and every consumer.
  - [x] Rename public UUID-slug alphabets, masks, conversions, migration choices, and timestamp operations by exact domain meaning.
  - [x] Update Rust callers, bridge operations, examples, public docs, and API baselines from one rename map.
  - [x] Replace context-dependent `codec` and `reader` example variables with names that retain their meaning when copied.
  - [x] Add only behavior or compile checks that expose a residual contract gap; run focused gates and the complete check.

- [x] Replace caller-composed plain-to-masking-codec conversions with deep codec operations.
  - [x] Derive the smallest explicit call shapes from plain, masked, UUID-text, and byte workflows.
  - [x] Keep representation identity explicit where raw base64url text is inherently ambiguous.
  - [x] Implement conversion without intermediate caller branches or redundant UUID formatting.
  - [x] Prove branded inference, bare-string validation, sentinels, timestamp limits, both alphabets, and error propagation.
  - [x] Replace the README recipe with one-call workflows and update public JSDoc and declarations.
  - [x] Run focused source and packed checks, then the complete gate and commit.

- [x] Make representation coverage and runtime evidence unambiguous to a cold consumer.
  - [x] Map plain and masked generation, conversion, decoding, and timestamp operations by accepted input and output.
  - [x] State why keyed and keyless representations cannot share an ambiguity-free raw-string decoder.
  - [x] Put each sharp edge at the README workflow and public declaration where it changes a call.
  - [x] Correct runtime wording to distinguish latest Node and Deno from Playwright-pinned browser engines.
  - [x] Regenerate declarations, verify editor guidance and packed consumers, run the complete gate, and commit.

- [x] Audit the complete public TypeScript interface against every README workflow and unrepresented consumer job.
  - [x] Inventory exports, overloads, options, brands, defaults, errors, and declaration guidance from their owning sources.
  - [x] Exercise representative JavaScript, TypeScript, packed-package, storage, migration, and codec call sites.
  - [x] Rank concrete friction and ambiguity by caller impact; reject additions without a failing consumer demand.
  - [x] Implement and document the smallest coherent repairs, with hostile runtime and type tests.
  - [x] Regenerate API evidence, run the complete gate, inspect the packed surface, and record remaining trade-offs.

Live plan only. Contracts live in README, `docs/`, and `bench/PERFORMANCE.md`; this file never owns one.

## Public interface audit

- [x] Make the masked UUIDv7 timestamp boundary complete at every public and runtime boundary.
  - [x] Export the last maskable Unix millisecond in TypeScript and Rust.
  - [x] Prove text, byte, generated, and cross-language writers accept the endpoint and reject its successor.
  - [x] Put the limit and `invalid_timestamp` result in codec JSDoc, API guidance, README, and security guidance.
  - [x] Regenerate declarations, run the full gate, and inspect packed consumer access.
- [x] Provide built-in UUID text-case presets across every UUID-text writer.
  - [x] Define lowercase and uppercase once as named runtime values with inferred result types.
  - [x] Keep lowercase as the zero-work default and reject unknown untyped selections.
  - [x] Apply the same optional selection to conversion, generation, decoding, validation, and codecs.
  - [x] Prove source and packed inference, runtime behavior, edge failures, resources, and latency.
  - [x] Update public JSDoc, interface guidance, README, declarations, and release notes; run the full gate.
- [x] Normalize UUID text output while accepting common hexadecimal input forms.
  - [x] Accept mixed-case 36-character UUID text and compact 32-character hexadecimal input.
  - [x] Keep guards and every returned UUID string lowercase and hyphenated.
  - [x] Normalize sentinel identity before duplicate checks and storage.
  - [x] Update public contracts, declarations, and release notes; run the complete gate.
- [x] Repair the consumer friction found by the fresh TypeScript interface audit.
  - [x] Accept common case variants while preserving canonical lowercase output.
  - [x] Replace ambiguous and time-relative public names before the first release baseline.
  - [x] Generate the UUID and plain or masked slug from one byte draw for the primary storage workflow.
  - [x] Make expensive mask derivation explicit and migration candidates readonly.
  - [x] Update public docs and declarations; prove source, runtime, editor, packed, bundle, and full checks.
- [x] Make `docs/public-api.md` the complete interface authority and shrink the root prompt.
  - [x] Reconcile every interface and naming rule from `AGENTS.md` into the API document.
  - [x] Keep only the trigger and high-risk invariants in `AGENTS.md`.
  - [x] Re-read both documents cold, run the complete gate, and commit the focused documentation change.
- [x] Make the naming and public-interface review protocol explicit in project guidance.
  - [x] Cover every public symbol, parameter, option, literal, collection, overload, default, result,
        error, ownership rule, and package entry without duplicating the contract inventory.
  - [x] Require ideal consumer call sites plus source, declaration, editor-help, runtime, and packed proof.
  - [x] Re-read the resulting rules cold, run the complete gate, and commit the focused guidance change.
- [x] Make runtime option vocabularies exhaustive against their public TypeScript owners.
  - [x] Replace positional key arrays with exact `keyof` maps checked by the compiler.
  - [x] Prove an interface-key mutation fails compilation and rerun the complete gate.
- [x] Close public option objects and preserve the rule in agent guidance.
  - [x] Reject unknown keys before any default can hide a misspelling in every public constructor.
  - [x] Add the missing option-naming and consumer-verification rules to `AGENTS.md`.
  - [x] Exercise source, declaration, packed-consumer, and runtime failure paths; run the full gate.
- [x] Replace ambiguous migration booleans with call-site names that state accepted input.
  - [x] Rename source, consumer examples, cross-language probes, and benchmark callers together.
  - [x] Regenerate declarations and prove enabled-format inference rejects disabled selectors.
  - [x] Run the full gate and re-read the final declaration as a cold consumer.
- [x] Audit every TypeScript call shape from consumer code, including defaults, composition,
      configuration variants, invalid combinations, ownership, and failure recovery.
  - [x] Map each export and member to a caller job; remove or reshape parts whose burden exceeds value.
  - [x] Compile realistic source and packed consumers, and run every behavior branch changed by the audit.
  - [x] Re-read emitted declarations and editor help, then run the full gate.
- [x] Expose closed-vocabulary members by semantic names without duplicating their string literals.
  - [x] Export each alphabet choice, migration selector, and error code directly; remove public
        collections with no consumer iteration workflow.
  - [x] Prove named values work through source and packed consumer calls without array indexes.
  - [x] Update consumer documentation, regenerate declarations, and run the full gate.
- [x] Remove unsupported proof and consumer-surface debt found through the declaration inventory.
  - [x] Make each negative type case fail for the boundary its comment names.
  - [x] Keep migration selection narrowed to formats enabled on each reader.
  - [x] Correct consumer documentation, regenerate declarations, and run the full gate.

## Error handling design

- [x] Close the hostile audit of error recognition and semantic string ownership.
  - [x] Give each repeated runtime error code and alphabet name one directly imported semantic owner;
        retain no positional aliases or duplicate runtime declarations.
  - [x] Preserve later recognition paths when an earlier compatibility probe throws.
  - [x] Prove source behavior, declarations, packed exports, tree shaking, runtime cost, and the full gate.
- [x] Correct the error-recognition design against complete public calls.
  - [x] Restore one codec UUID-to-slug method for text, bytes, and preceding failures; reject the
        split surface and verify mixed-input inference and runtime dispatch.
  - [x] Put successful input-shape checks before failure recognition wherever the operation already
        validates that shape, so ordinary calls do not pay the general detector ladder.
  - [x] Compare semantically equivalent marker, local `instanceof`, native cross-realm, and portable
        fallback orders on success values, marked failures, unmarked failures, and hostile values.
  - [x] Remove benchmark rows that silently substitute constants for unavailable capabilities;
        require every named capability row to prove that capability executed.
  - [x] Run focused behavior, type, packed, resource, profile, and full checks; retain only reproduced
        wins and replace unsupported performance claims.
- [x] Implement composable `UuidSlugError` values without intermediate unwrapping.
  - [x] Rename conversions by source and destination representation; keep one codec UUID-to-slug
        method because text and bytes are two forms of the same accepted UUID value.
  - [x] Pin plain TypeScript chains, exact successful brands, wrong-representation rejection, and
        error-union retention in source and packed-consumer fixtures.
  - [x] Pin JavaScript chains, unchanged error identity, skipped output writes and callbacks,
        duplicate-package and cross-realm recognition, and malformed marker behavior.
  - [x] Compare marker-only keys, values, and property placement on actual error layouts across
        Node Current, Bun, Node LTS, Chromium, and Deno; measure recognition and complete chains.
  - [x] Implement the measured marker and ordered compatibility checks; preserve the fastest
        successful path per input shape and use local identity only where provenance permits it.
  - [x] Profile decision-relevant complete calls and retain only reproduced, material wins.
  - [x] Update public JSDoc, declarations, README examples, design evidence, and benchmark evidence.
  - [x] Run source, built, packed, browser, Bun, Node, Deno, resource, profile, and full checks; mutate
        recognition and propagation so each new test fails for its intended defect.

## Generated benchmark reports

- [ ] Render the `bench/matrix.ts` tables as Markdown pipe tables so `bench/results/matrix.md`
      needs no fenced fixed-width blocks. The matrix tests assert the current heading and row text.

## Deferred CLI evaluation

- [ ] Evaluate a CLI only when the maintainer reopens this work after concrete shell, migration,
      or debugging demand appears. Do not design or build it during the current session.
