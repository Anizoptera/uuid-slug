# TypeScript and Rust contracts

Maintain the same functionality and semantics in TypeScript and Rust from the first Rust implementation increment.

## Parity

Every feature, fix, and contract change must update both implementations and their shared contract
cases before it is complete. During initial construction, missing Rust capabilities remain explicit
unfinished work; a partial port is not a completed equivalent. Any semantic exception requires the
maintainer's explicit ruling before shipping.

README §Guarantees owns consumer promises; [design.md](design.md) owns masking and wire semantics.
Neither implementation becomes correct merely by agreeing with the other: expected results must
come from those contracts, retained producer fixtures, reference vectors, or independently checkable
properties. Preserve issued identifiers when changing either implementation.

Identical deterministic inputs must produce identical bytes, text, keys, and decoded candidates.
Parity includes accepted and rejected inputs, defaults, error conditions, sentinel priority, key
order, migration controls, timestamp windows, cancellation, and ownership of returned data.
Sentinel names are nonempty and unique within one codec; both languages report name violations as
`invalid_sentinel` without relabeling malformed UUID text or UUID-version failures.
Every decoder must accept every value that a supported matching encoder can produce. Options may
add accepted forms; they must not remove existing ones. Forms no supported encoder produces are invalid.
Generated identifiers must meet the same promises; random draws, scheduling, allocation strategy,
and unpromised intra-millisecond ordering need not match.

Keep verbs and parameter meanings recognizable across languages. Rust may use ownership, typed
errors and `Result` instead of JavaScript conventions. Such differences must not silently change
the accepted domain or result semantics. In particular, a lazy result must not expose partial
candidates where the existing operation reports an error for the whole call.

TypeScript uses directional text/binary names because raw `Uint8Array` values require validation
and may target caller storage. Rust uses idiomatic `Uuid` operations because its fixed UUID type
already owns that validation. Both preserve the same canonical text and 16-byte domain.

Run shared cases through each implementation from its first increment; check nonzero execution
per adapter, because an aggregate pass can hide one that ran nothing. Keep native ownership and
callback checks; map JS UTF-16 explicitly rather than pretending Rust strings cover its full domain.

## Rust call sites

Use validated `Uuid` values between operations; parse text once rather than at each codec call.

| TypeScript capability | Rust entry point or composition |
| --- | --- |
| `uuidToBytes` / `bytesToUuid`; bytes and offsets | `Uuid::parse`, `from_slice`, `as_bytes`, `write_into`, `Display` |
| Plain slug conversion | `Uuid::slug`, `Uuid::parse_slug` |
| UUID/string/slug and generic/v4/v7 byte guards | Parse once, then `Uuid::is_v4`, `is_v7`, `is_rfc_variant` |
| Base64url UUID payload | `Alphabet::Base64Url.encode(&[u8; 16])`, `decode`, `decode_to` |
| Canonical base64url guard | Check `Alphabet::Base64Url.decode` success for exactly 22 characters |
| v4 generation and caller storage | `generation::uuid_v4`, `uuid_v4_with`, `uuid_v4_into_with` |
| v7 generation, explicit time and caller storage | `UuidV7Generator::generate`, `at`, and their `_with`/`_into_with` forms |
| Generated plain or masked slugs | Generate a `Uuid`, then call `slug` or the keyed codec |
| UUIDv7 timestamp | `Uuid::timestamp` |
| Sync/async schemas and custom transforms | `create_mask_schema`, `create_mask_schema_async`, `MaskSchema::custom(label, mask, unmask)` |
| Explicit public schema | `UUID_V7_TEST_MASK`; `public_mask_schema()` |
| Key rotation, masked text/byte conversion and sentinels | `CodecOptions::new`, `Codec::encode_uuid`, `decode_slug`, `Uuid::as_bytes`, `write_into`, `sentinels` |
| Known/mixed-format migration and candidates | `Codec::migration_decoder`, `MigrationDecoder::decode`, `candidates`, `MigrationOptions` |
| Plain timestamp window | Parse UUID or plain slug, then `UuidV7TimestampWindow::validate`; retain the original text if needed |
| Masked timestamp window | `Codec::validate_slug_timestamp` |
| Error classification and causes | `Error::code`, `ErrorCode::as_str`, and `std::error::Error::source` |

TypeScript additionally exports `isUuidSlugError` because JavaScript values can cross realms or
load from duplicate package copies. Rust exposes `ErrorCode` as the typed classification so adding
a diagnostic source does not change how callers match a failure; bridges serialize
`ErrorCode::as_str()`. The TypeScript guard accepts the local class first and then the same stable
error names and codes. It is a classifier, not an authenticity boundary for untrusted objects.

Generators own mutable sequence state; codecs own immutable keys. Both languages require callers
to select private key material or the published schema explicitly. Keeping generation separate allows
shared codecs without a hidden generator lock. Default generators use platform entropy; custom
`_with` callbacks must fill the entire destination or fail. Pass `generation::fill_os_random` to
caller-buffer operations for the same platform source. Invalid destination ranges draw no entropy.
`Alphabet::encode` accepts a 16-byte array and cannot receive another payload size. It preserves
every 16-byte value. `decode` returns a 16-byte array or an error for non-canonical input. UUID
version and variant checks belong to UUID guards.
`decode_to`, UUID text and slug parsing validate the complete identifier before writing; all
fixed-size decoding, parsing and generation commit caller storage only on success.

Async schema derivation returns an opaque `Send` future and a separate public `Cancellation`
handle. Callers can schedule and cancel work without depending on the derivation state's fields,
layout, or incidental auto-traits.

## Filesystem-safe output

Support lowercase filesystem-safe representations for both plain and masked identifiers in both
languages. Preserve existing encodings and key material. Lowercase output avoids distinctions lost
on case-insensitive filesystems; it does not make arbitrary surrounding paths safe.

Plain UUIDs already use 26 base32hex characters for 128 bits. A lossless base32hex representation
of the existing 132-bit masked payload needs 27 characters, with three zero padding bits. Reject
nonzero padding on ordinary decoding. Preserve the entire masked payload, including the four tag
bits outside its 16-byte block; re-encoding only that block would lose information.

This is an alternate spelling, not a new masking scheme; retain the 16-bit check and timestamp bound.
Safe sentinels remain raw UUID slugs: 26 base32hex characters, readable by the plain decoder.
Padding them to 27 adds a spelling that the plain decoder rejects, with no identity benefit.
Their length cannot collide with 27-character masked output. Keep old base64url reads and defaults.
Masking has no chronological ordering. These extensions are implemented, not yet published.

## Distribution and dependencies

Publish one npm package and one Rust crate. Keep JavaScript chunks internal and Rust targets under
one release identity. Add prebuilt Rust artifacts only when a measured consumer need justifies them.
Publish `src` as executable package code for Bun and the opt-in `development` condition; source-map
resolution is a second use, not its reason to exist. Prefer source for a runtime that normally loads
TypeScript. Use compiled output only when a packed consumer proves that the runtime's default
resolver cannot load this source graph. Do not shift resolution cost to consumers through a flag or
false `.js` specifiers. Every relative source import names its real `.ts` file; the compiler rewrites
emitted imports to `.js`. Condition-selected
runtime adapters keep one public source entry while using each host's capabilities. The optimized
build must remain executable in Bun as well as Deno, browsers, and Node-compatible hosts. When Bun
loads that compiled graph, `#runtime` must still select its TypeScript adapter and native primitives;
normal source selection does not waive this path. Keep one compiled implementation graph; resolve its private
`#runtime` import to Bun source, Deno portable source, or Node native code. Deno also activates the
`node` condition, so its condition must come first. Ship source maps whose inputs resolve inside the package.

### JavaScript packaging

Keep ESM modules unbundled and `sideEffects: false`. This lets consumers remove features they do
not import. Every shipped module must therefore remain free of required import-time effects.
Each private file boundary must enable independent loading, removal, runtime selection, or an
externally exercised implementation seam. Merge a leaf into its sole production importer when none
applies; do not pre-bundle unrelated modules merely to lower the archive's file count.
Keep a declaration private unless a package contract, production import, tool protocol, or
independently exercised test seam requires module access. Tests must use the owning interface after
logic moves into its sole production consumer; remove the obsolete export and direct test import.
Before deleting a moved file, compare its implementation and comments with the destination, account
for every difference, and verify every former consumer now reaches the destination.
Probe stable optional capabilities once in the smallest module that owns them; never repeat the
probe per call. Defer an allocation when imports that do not need it share that module.

Use `/*#__PURE__*/` only on removable construction. Annotate nested calls separately because a
bundler may still evaluate arguments. Use `/*#__NO_SIDE_EFFECTS__*/` only on functions that are
safe to discard for every accepted runtime input. Apply that rule to public and internal functions;
visibility does not prove that downstream optimizers can infer it. Property access on untrusted
objects can run proxy traps or getters and is not side-effect-free. Never apply either promise to
generation, caller callbacks, clock or entropy reads, mutable state, or caller-owned output.

Preserve optimizer annotations in emitted JavaScript. Keep whitespace when removing it strips
them; retain compression and ordinary identifier mangling. Keep function and class names in both
compression and mangling so stack frames remain useful. Do not mangle properties without a private,
reserved namespace proven safe across every consumer bundler.

Ship JavaScript and declaration maps, but exclude embedded source text because the package already
ships `src/`. Keep the JavaScript target explicit and fail on build warnings so runtime support
cannot drift through manifest or tool defaults. The packed-artifact check must reject missing map
inputs, embedded sources, machine paths, and lost source-owned optimizer annotations.

The JavaScript target floor defines the unguarded baseline, not a ban on newer platform APIs. A
newer standard or host capability may be selected when it measurably reduces runtime or resource
work, provided module-load detection chooses it once, an older-runtime fallback preserves behavior,
and both branches run in their actual runtime lanes. Do not add a conditional branch when the newer
primitive has no consumer-path advantage.

Keep the public npm package TypeScript/JavaScript-only, with no runtime dependencies or native
payloads. Keep the Rust crate installable from this Git repository and crates.io.
Maintainer policy requires matching Rust/TypeScript versions and common CPU architecture support from the first
Rust release, including WebAssembly. Preserve portable behavior under architecture-specific tuning.
Support x86-64 and Arm64 on Linux, macOS and Windows with native execution; compile-check i686 and
ARMv7 Linux, and execute `wasm32-unknown-unknown` in every browser engine selected by the check
workflow. The workflow owns the concrete engines, runner labels, and target triples so this contract
does not copy a volatile matrix.
Build and test natively in GitHub CI from the first Rust increment; cross-compilation alone does
not validate runtime behavior. Report any target lacking native execution rather than implying it ran.
Rust may use a small set of justified dependencies. Compare contract fit, failure behavior,
supported targets, measured resource costs, build costs, licensing and maintenance before selecting
one; implementation convenience alone does not justify it.

Verify every supported build type and target, not just the default release configuration.
Cover debug and release profiles, product libraries, development bridges, examples, unit tests,
doctests, and benchmark compilation with each distinct supported feature selection. Run every
locally executable combination and retain the full supported target matrix in CI. Report
compile-only and unexecuted combinations explicitly; a configured CI job is not execution evidence.
Use `bun run check:rust` for native profiles. Run `scripts/rust-wasm.ts` with
`UUID_SLUG_RUST_PROFILE=debug` and `UUID_SLUG_RUST_PROFILE=release`; each profile must execute the
same browser-engine matrix.

Verify TypeScript functionality on every supported Node major and on the latest Bun and Deno.
Derive Node majors from the published release index and the package's engine floor; include the
exact floor and keep newest Node unpinned. Execute shared contracts and consumer calls without a
test runner in the target engine, so the runner's narrower support range cannot remove package
coverage. Also run the ordinary suite wherever its installed tooling supports the engine.
Preserve real runtime adapter coverage when changing test runners; a faster Bun suite cannot
establish Node or browser behavior. Replace a runner only after matched defect-detection and
performance measurements, retaining the same consumer contracts.

Keep each dependency behind the contract it actually satisfies:

| Concern | Choice and reason | Alternative and what would justify it |
| --- | --- | --- |
| UUID text | `uuid` parses and formats; local guards retain the narrower accepted spelling. Its generation features stay disabled. | Upstream generation would need fallible entropy and the same explicit sequence/error behavior. Its [random backend](https://docs.rs/crate/uuid/1.26.0/source/src/rng.rs) panics on a failed default entropy draw. |
| Entropy | Direct [`getrandom`](https://docs.rs/getrandom/latest/getrandom/) calls retain failure reporting and platform backend selection. | Another RNG layer must add a required capability; merely wrapping the same OS source adds no entropy assurance. |
| Encoding | [`data-encoding`](https://docs.rs/data-encoding/latest/data_encoding/) handles both alphabets, caller storage and canonical trailing bits. Local code preserves the mask's external check bits. | [`base64`](https://docs.rs/base64/latest/base64/) also supports caller storage, but leaves base32 separate. A second encoder requires measured benefit on our identifier-sized calls, not bulk throughput alone. |
| Hashing | The shared wire vectors constrain the owned HalfSipHash primitive and derivation. | A replacement must match its word order, rounds and output exactly; a different hash changes issued identifiers. |
| Errors | `ErrorCode` supplies typed stable classifications while `Error` retains optional causes through standard traits. | An error helper must remove more maintenance than its added dependency and must preserve those codes and causes. |
| Serialization | JSON belongs to development bridges and test fixtures, not the product's runtime graph. | A public serialization feature needs its own consumer contract; deriving it onto private validated fields can bypass parsing. |

Inspect the product's resolved normal dependencies separately from workspace development dependencies.
Check disabled defaults and each optional feature: workspace feature unification can hide missing
dependencies. Native profiling constrains current call costs; it does not establish that one encoder
is fastest on every architecture or that platform randomness is trustworthy under every host condition.

Compare encoder changes with both caller storage and owned strings, varying dependency features.
The local UUID-sized comparison favored a separate base64 encoder for caller storage, but its
default features reversed the decoding advantage and owned-string differences were much smaller.
Both rejected the tested padding aliases. Retain the shared encoder until a consumer-path gain justifies
owning a second dependency while still keeping the first for base32.

Share hash primitives without forcing continuation overhead onto synchronous calls; a Future alone
does not yield to host tasks. Node, Bun and Deno native bridges serve development only, remain
unpublished, and stay outside npm. They do not create a supported public ABI.

Maintain native interop as one declarative research matrix that discovers supported installed Node,
Bun and Deno hosts, then gives conformance and profiling the same lanes. Every lane must identify
its actual Node-API or FFI transport and produce nonzero results from the common request corpus.
Measurements describe that machine and revision; use them to improve each adapter and preserve the
matrix unless the maintainer explicitly changes its research scope.
