# Security boundaries

Use UUIDs as identifiers, not passwords, access tokens, or proof of authorization.

Built-in generation draws from platform cryptographic randomness. TypeScript uses native UUID
methods when available, otherwise Node crypto or Web Crypto. Rust uses fallible `getrandom`;
browser generation requires `wasm-js`. Neither implementation substitutes non-cryptographic
randomness when the secure source fails. TypeScript public generation does not accept a caller
entropy source because a successful weak or partial fill cannot be detected reliably from its
output. A plausible-looking UUID does not establish that cryptographic entropy was used.

Runtime adapters select cryptographic primitives by capability, not version:

- Node uses `crypto.randomUUID()` for UUIDv4, `crypto.randomUUIDv7()` when available for UUIDv7
  text, and pooled `crypto.randomFillSync()` for byte generation and portable UUIDv7 fallback.
- Bun uses `Bun.randomUUIDv7()` for UUIDv7 text, base64url, and bytes; UUIDv4 and fallback bytes use
  Web Crypto `randomUUID()` and pooled `getRandomValues()`.
- Browsers and Deno use Web Crypto `randomUUID()` for UUIDv4 and pooled `getRandomValues()` for
  bytes and portable UUIDv7 generation. Neither platform currently exposes a standard native
  UUIDv7 primitive.

The platform source choices are documented by [Node](https://nodejs.org/api/crypto.html#cryptorandomfillsyncbuffer-offset-size),
[Web Crypto](https://www.w3.org/TR/webcrypto/#Crypto-method-getRandomValues),
[Bun](https://bun.sh/docs/runtime/utils#bunrandomuuidv7) and
[getrandom](https://docs.rs/getrandom/latest/getrandom/#supported-targets). Review the selected
backend when changing a runtime, target or dependency; selecting a secure API is not an audit of
the operating system that implements it.
System entropy can block during early boot while the OS initializes its RNG. Applications with
strict response deadlines must keep that draw off their event loop; never substitute weaker bytes
to meet a deadline. See [getrandom's early-boot limits](https://docs.rs/getrandom/latest/getrandom/#early-boot).

Portable v7 generation seeds a 42-bit sequence and draws a fresh 32-bit tail on later values
within the same millisecond. A cryptographic input source does not make these outputs independent
secrets. Keep uniqueness constraints where collisions matter. Neither a UUID's bit pattern nor a
duplicate-free sample can establish that its generating process was cryptographically secure.

Every UUID version exposes standardized fields. This package masks UUIDv7, replacing its layout,
including timestamp, version, and variant positions, with a keyed reversible payload. It is obfuscation, not
authenticated encryption. Use a private random seed and retain its exact bytes and iteration count
to read issued values. The exported public mask is for explicit tests and examples; codec
construction never selects it by omission.
The 16-bit check filters candidates; look up the intended record and check authorization separately.
More read keys add possible candidates. Base32 changes the spelling, not the masking strength.

Generator entropy failures report `rng_unavailable`; caller buffers and sequence state remain unchanged.
Rust retains the entropy provider's error. In browsers, `getrandom` reports its Web Crypto error
code rather than retaining the original JavaScript exception. TypeScript retains that exception.
This diagnostic difference does not permit a failed draw to produce an identifier.

UUID slug formatting and parsing encode and decode one 16-byte payload. They reject every other
byte or text length, including empty input. Invalid parsing leaves caller storage unchanged. These
operations preserve all 16-byte values; use UUID guards when the version or variant matters.

TypeScript pools platform randomness without expanding it. Refills become usable only after the
source returns successfully; a partial write followed by failure must be retried, never consumed.
Consumed pool bytes are erased. Rust draws into private generator buffers before copying output;
the low-level `fill_os_random` function itself does not promise an unchanged buffer on failure.

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
