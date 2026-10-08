# Security boundaries

Use UUIDs as identifiers, not passwords, access tokens, or proof of authorization.

Default hot paths trust proper native runtime results and provide no stronger guarantees than
those implementations. Extra guarantees belong only to explicitly configured calls; validating
native results does not prove the security of the platform that produced them.

Built-in generation draws from platform cryptographic randomness. TypeScript uses native UUID
methods when available, otherwise Node crypto or Web Crypto. Rust uses fallible `getrandom`;
browser generation requires `wasm-js`. Neither implementation substitutes non-cryptographic
randomness when the secure source fails. TypeScript generation with no arguments or only a
spelling preset throws `UuidSlugError` with code `rng_unavailable` in that case; every other
generation call returns it, and Rust returns `Err` on every path. Separately named custom-entropy
calls accept a synchronous fill callback for controlled runtimes and deterministic work. The caller
must fill every requested byte securely or return `UuidSlugError`; a successful weak or partial
fill cannot be detected from its output. A plausible-looking UUID does not establish that
cryptographic entropy was used.
Built-in generation covers UUIDv4 and UUIDv7 only. Version-neutral parsing and plain conversion
accept other UUID versions but add no generation or security behavior for them.

UUIDv4 uses 122 bits for random data. UUIDv7 uses 48 bits for its timestamp and allows its other 74
bits to combine random data and counters. The portable generator uses a 42-bit counter with a
random starting value and generates 32 new random bits for each UUID. A UUID does not identify which
method produced its payload, so the package does not report those bits as random or predictable.
Collisions remain possible.

Generation selects secure sources separately for text and byte output:

- Node uses `crypto.randomUUID()` for UUIDv4 text without JIT compilation and pooled
  `crypto.randomFillSync()` for other output.
- Bun uses Node-compatible `randomUUID()` for UUIDv4 text, with Web Crypto as fallback, and
  `Bun.randomUUIDv7()` for default UUIDv7 text and base64url slugs. Other output and configured
  generators use pooled `getRandomValues()`.
- Deno uses Web Crypto `randomUUID()` for UUIDv4 text and pooled `getRandomValues()` for byte
  output and UUIDv7. Cloudflare Workers and browsers use pooled `getRandomValues()` for both UUID versions.

These choices reflect [measured call costs](../bench/PERFORMANCE.md). Each source must supply
secure randomness or report failure.

The platform source choices are documented by [Node](https://nodejs.org/api/crypto.html#cryptorandomfillsyncbuffer-offset-size),
[Web Crypto](https://www.w3.org/TR/webcrypto/#Crypto-method-getRandomValues),
[Bun](https://bun.sh/docs/runtime/utils#bunrandomuuidv7) and
[getrandom](https://docs.rs/getrandom/latest/getrandom/#supported-targets). Review the selected
backend when changing a runtime, target or dependency; selecting a secure API is not an audit of
the operating system that implements it.
System entropy can block during early boot while the OS initializes its RNG. Applications with
strict response deadlines must keep that draw off their event loop; never substitute weaker bytes
to meet a deadline. See [getrandom's early-boot limits](https://docs.rs/getrandom/latest/getrandom/#early-boot).

Within one millisecond, the portable generator increments its visible 42-bit counter and draws 32
new random bits. Observing one UUID reveals the next counter value in that millisecond. Neither a
UUID's bit pattern nor a duplicate-free sample proves secure generation.

Every UUID version exposes standardized fields. This package masks UUIDv7, replacing its layout,
including timestamp, version, and variant positions, with a keyed reversible payload. It is obfuscation, not
authenticated encryption. Use a private random seed and retain its exact bytes and iteration count
to read issued values. The exported public mask is for explicit tests and examples; codec
construction never selects it by omission.
Masking stores a 42-bit timestamp offset from the codec's configured start and restores the full
timestamp on decode. It rejects timestamps outside that range. Truncating the offset would make
distinct UUIDs encode to the same slug. Plain slugs and raw sentinel slugs preserve the full
UUIDv7 timestamp range.
The 16-bit check filters candidates; look up the intended record and check authorization separately.
More read keys add possible candidates. Base32 changes the spelling, not the masking strength.

Generator entropy failures report `rng_unavailable`; caller buffers and sequence state remain unchanged.
Rust retains the entropy provider's error. In browsers, `getrandom` reports its Web Crypto error
code rather than retaining the original JavaScript exception. TypeScript retains that exception.
This diagnostic difference does not permit a failed draw to produce an identifier.

The default preserve policy continues sequence state when the clock moves backward. Callers can
instead select reset or failure beyond an inclusive skew tolerance. Reset can emit a UUID timestamp
below a previous result; failure emits no identifier and leaves generator state unchanged. This
ordering guarantee applies to successful current-time calls on one explicitly created generator.
Explicit-time calls on that generator share its sequence state. Module-level helpers do not
provide ordering across calls; independent generators, package copies, workers and processes
do not share sequence state.

UUID slug formatting and parsing encode and decode one 16-byte payload. TypeScript byte-offset
overloads select that payload from a larger array; other payload sizes and malformed UUID text are
rejected. Invalid parsing leaves caller storage unchanged. Conversion preserves all 16-byte
values; use UUID guards when the version or variant matters.

Immutable parsed UUIDs keep private bytes during ordinary use. Default buffer writes do not
protect against caller-replaced methods; additional adversarial hardening requires an explicitly
requested non-default path. External masking codecs receive an isolated copy,
and their decoded bytes are validated and copied before retention. Callback exceptions remain
available as `cause`; a valid-shaped callback result does not prove correct masking or decoding.

TypeScript pools platform randomness without expanding it. Refills become usable only after the
source returns successfully; a partial write followed by failure must be retried, never consumed.
Consumed pool bytes are erased. Rust draws into private generator buffers before copying output;
the low-level `fill_os_random_bytes` function itself does not promise an unchanged buffer on failure.

The Rust product crate forbids owned unsafe code; its dependencies still contain unsafe code.
Development bridges are unpublished. Node and Bun load the same generated N-API boundary, while
the browser loads the generated wasm-bindgen boundary. Panic handling cannot contain allocation
aborts or WebAssembly traps. Keep real Node, Bun and browser transport checks alongside shared
dispatcher tests.

No secure-erasure guarantee is provided. Do not clone a live generator or buffered entropy state
through process-memory snapshots and then issue identifiers independently from both copies.

Review changed entropy paths in each runtime that can execute them. Exercise the portable draw
path separately from native delegation; test failure and retry, not only successful generation.
Use shared wire vectors to constrain encoding and masking, and real host interception to check
entropy selection. These checks do not certify operating-system RNGs or establish cryptographic
strength for the masking design.
