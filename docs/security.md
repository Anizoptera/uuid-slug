# Security boundaries

Use UUIDs as identifiers, not passwords, access tokens, or proof of authorization.

Built-in generation draws from platform cryptographic randomness. TypeScript uses native UUID
methods when available, otherwise Node crypto or Web Crypto. Rust uses fallible `getrandom`;
browser generation requires `wasm-js`. Neither implementation substitutes non-cryptographic
randomness when the secure source fails. Custom entropy callbacks must fill every requested byte
from a cryptographic source or report failure; a successful partial fill cannot be detected reliably
from its output. A plausible-looking UUID does not establish that this contract was met.

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
secrets. Keep uniqueness constraints where collisions matter. A duplicate-free sample or a
passing entropy predicate cannot establish cryptographic security.

Masking is reversible obfuscation, not authenticated encryption. Use a private random seed;
the default seed is published. Retain its exact bytes and iteration count to read issued values.
The 16-bit check filters candidates; look up the intended record and check authorization separately.
More read keys add possible candidates. Base32 changes the spelling, not the masking strength.

Generator entropy failures report `rng_unavailable`; caller buffers and sequence state remain unchanged.
Rust retains the entropy provider's error. In browsers, `getrandom` reports its Web Crypto error
code rather than retaining the original JavaScript exception. TypeScript retains that exception.
This diagnostic difference does not permit a failed draw to produce an identifier.

TypeScript pools platform randomness without expanding it. Refills become usable only after the
source returns successfully; a partial write followed by failure must be retried, never consumed.
Consumed pool bytes are erased. Rust draws into private generator buffers before copying output;
the low-level `fill_os_random` function itself does not promise an unchanged buffer on failure.

The Rust product crate forbids owned unsafe code; its dependencies still contain unsafe code.
Development bridges are unpublished. Their C boundary requires valid caller pointers, copies
outputs under a lock and releases owned handles once. Panic handling cannot contain invalid-pointer
access, allocation aborts or WebAssembly traps. Do not expose the development bridge to callers
who can supply arbitrary pointers.
Run `cargo +nightly miri test --manifest-path rust/Cargo.toml -p uuid-slug-bridge --lib ffi::`
after changing handle ownership or pointer copies. This exercises the Rust boundary with valid
caller storage, short buffers and released handles; it does not validate the JavaScript FFI ABI
or make arbitrary pointers safe. Keep the real Node/Bun transport checks alongside it.

No secure-erasure guarantee is provided. Do not clone a live generator or buffered entropy state
through process-memory snapshots and then issue identifiers independently from both copies.

Review changed entropy paths in each runtime that can execute them. Exercise the portable draw
path separately from native delegation; test failure and retry, not only successful generation.
Use shared wire vectors to constrain encoding and masking, and real host interception to check
entropy selection. These checks do not certify operating-system RNGs or establish cryptographic
strength for the masking design.
