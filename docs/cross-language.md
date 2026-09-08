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
order, migration controls, freshness boundaries, cancellation, and ownership of returned data.
Generated identifiers must meet the same promises; random draws, scheduling, allocation strategy,
and unpromised intra-millisecond ordering need not match.

Keep verbs and parameter meanings recognizable across languages. Rust may use ownership, typed
errors and `Result` instead of JavaScript conventions. Such differences must not silently change
the accepted domain or result semantics. In particular, a lazy result must not expose partial
candidates where the existing operation reports an error for the whole call.

Run shared cases through each implementation from its first increment; check nonzero execution
per adapter, because an aggregate pass can hide one that ran nothing. Keep native ownership and
callback checks; map JS UTF-16 explicitly rather than pretending Rust strings cover its full domain.

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

Keep the public npm package TypeScript/JavaScript-only, with no runtime dependencies or native
payloads. Publish `uuid-slug` as a Rust crate, installable from this Git repository and crates.io.
Art requires matching Rust/TypeScript versions and common CPU architecture support from the first
Rust release, including WebAssembly. Preserve portable behavior under architecture-specific tuning.
Build and test natively in GitHub CI from the first Rust increment; cross-compilation alone does
not validate runtime behavior. Report any target lacking native execution rather than implying it ran.
Rust may use a small set of justified dependencies. Compare contract fit, failure behavior,
supported targets, measured resource costs, build costs, licensing and maintenance before selecting
one; implementation convenience alone does not justify it.

Share hash primitives without forcing continuation overhead onto synchronous calls; a Future alone
does not yield to host tasks. Node/Bun native bridges serve development only, remain unpublished,
and stay outside npm. They do not create a supported public ABI.
