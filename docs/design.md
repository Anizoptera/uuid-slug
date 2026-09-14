# How masking works

Preserve the wire layout when changing masking so previously issued slugs remain decodable.

Read [README.md](../README.md) for the consumer contract. This document explains the byte layout,
key schedule, and limits needed to audit or reimplement the built-in scheme.

Every UUID version has standardized fields. This wire format covers the complete compact UUIDv7
payload so its public spelling exposes none of those fixed positions. UUIDv7's timestamp is the
most sensitive field, but it is not the only structure being hidden.
The package generates UUIDv4 and UUIDv7 only. Generic parsing and plain encoding still preserve
other UUID versions without adding version-specific behavior.

## Representations and bit budget

A UUID is 16 bytes. Plain slugs encode those bytes as 22 base64url or 26 base32hex
characters. Plain decoding rejects nonzero padding bits, so a UUID has one canonical spelling
per alphabet.

Masking accepts UUIDv7 and preserves 116 payload bits:

| bits | field                           | treatment                                             |
| ---: | ------------------------------- | ----------------------------------------------------- |
|    4 | version nibble, byte 6           | restore the constant `7` on decode                    |
|    2 | variant bits, byte 8             | restore the constant `10` on decode                   |
|    6 | top of timestamp offset, byte 0 | restore zero before adding the configured range start |
|  116 | remaining payload               | 42 timestamp bits, 12 `rand_a`, 62 `rand_b`           |

`rand_a` and `rand_b` are RFC field names, not proof that those bits are random. A generator may
use them for random data, counters, sub-millisecond time, or a combination. Masking treats all 74
bits as opaque data and restores them unchanged.

Payload inspection happens after decoding and does not change this wire format. The caller supplies
the number of leading Method 3 fraction bits and following Method 1 counter bits. The remaining low
bits stay uninterpreted. The UUID cannot identify the layout or distinguish random data from a
counter, so the API must not infer either one.

The masked payload is fixed: 22 base64url characters hold 132 bits, leaving `132 - 116 = 16`
check bits. Twelve replace the constant bits inside the 128-bit block; four occupy the encoding's
spare bits. All 132 encoded bits have a role. Plain-slug padding rejection does not apply to these
four check bits.

Masking stores the UUIDv7 timestamp as an unsigned offset from the codec's configured range start.
The offset accepts zero through 2^42 - 1, inclusive. The default start is zero and preserves the
existing wire format. The selected range must fit inside UUIDv7's 48-bit timestamp field.
Truncation would let different UUIDs share a slug. The full masked payload uses 27 base32hex
characters; forcing it into 26 would lose bits. Its three padding bits must be zero. Masked output
has no useful chronological ordering in either alphabet.

## Deriving a mask from a seed

`deriveUuidV7Mask({ seed, keyDerivationIterations })` derives round keys deterministically:

1. Encode string seeds as UTF-8; byte seeds retain their byte values. Absorb bytes as little-endian
   words, with the actual byte length passed to HalfSipHash-2-4.
2. Run two chains starting from distinct fixed keys. Each chain hashes the seed, then hashes it
   again under its preceding output until it has completed `keyDerivationIterations` hashes.
3. For each round, each chain hashes the round's word index under its final key. XOR the two
   outputs to obtain that round's key pair.

The fixed chain keys, round count, byte order, index convention, and iteration count affect every
issued slug. They are wire-format constants, not opportunities for tuning an existing mask.
Retain each old seed, iteration count, and timestamp-range start in `previousMasks` when rotating.

The chains carry 128 bits of state together; this is a description of their representation,
not an established security strength. The default iteration count is one. Increasing it raises
construction cost and the cost of trying candidate seeds; it cannot replace a randomly generated
seed. A known UUID/slug pair permits offline seed guessing.

`deriveUuidV7MaskAsync` uses the same packing, hash and key-expansion primitives. A continuation
stores only partial hash state; output words are written after finalisation. Cooperative work
bounds text/byte packing and message absorption as well as iteration batches, so a large seed
cannot hide inside one uninterrupted hash. The driver yields to host tasks when its work slice
expires and checks cancellation before continuing. Tiny derivations avoid scheduling altogether.
The synchronous entry keeps an unlimited absorption budget and allocates no continuation.

Capture scalar options and copy byte seeds before suspension. Strings are immutable and can be
UTF-8 encoded in pieces; keep surrogate pairs together across piece boundaries. Memory copying,
allocation and runtime pauses remain outside the work-slice target. A new size restriction or
changed seed transformation would alter accepted inputs or keys and must not be introduced as a
performance repair.

## Mixing the block

The built-in scheme runs four Feistel rounds over four big-endian 32-bit words: `left0 left1`
from bytes 0–7 and `right0 right1` from bytes 8–15. For each round's keys `k0 k1`:

```
f0, f1 = HalfSipHash-2-4(key = k0 k1, message = right0 right1)
next0 = left0 ^ f0
next1 = left1 ^ f1
left = right
right = next
```

After the last round, write `right0 right1` to bytes 0–7 and `left0 left1` to bytes 8–15. This
orientation makes the same routine decrypt when it consumes the round keys in reverse order.
The Feistel structure supplies reversibility independently of the round function's security.

The HalfSipHash reference-vector tests constrain the round function's implementation. They do
not establish the security of this key schedule or four-round network. Masking is an
obfuscation feature, not an authenticated encryption interface.

`createCustomUuidV7Mask` adapts separate forward and reverse callbacks to the same block layout.
It supplies an isolated input, requires a 16-byte result or package error, and checks representative
round trips once before returning an opaque handle. Callbacks may mutate and return their input;
the package copies results into owned storage. Finite probes cannot establish invertibility across
the full domain, so the caller remains responsible for that property.

## Encoding and decoding

1. Subtract the configured range start from the timestamp. Reject a non-v7 UUID or an offset
   outside zero through 2^42 - 1.
2. Fold `mix32` over the four big-endian words of the original UUID bytes and take the top 16
   bits as the tag.
3. Store the tag's upper 12 bits in the block: four in byte 6's high nibble, two in byte 8's top
   bits, and six in byte 0's top bits.
4. Mix the 16-byte block and append the remaining four tag bits. Encode these 132 bits as
   22 base64url or 27 lowercase base32hex characters; base32hex ends with three zero padding bits.

Decoding extracts the outer tag bits, reverses the mix, reads the inner tag, restores the fixed
bits, and adds the selected range start. It recomputes the tag from the restored UUID and
compares both parts. A mismatch returns `invalid_uuid_slug`.

The short tag rejects many incorrect decodes, but it is not authentication. About one random
22-character string in 65,536 passes one mask's check. A passing result is a candidate for a
store lookup; it does not establish that anyone issued the UUID.

## Mask selection and sentinels

No marker identifies the producing mask or range start. Decode with the current pair first, then
each `previousMasks` entry in caller order, returning the first candidate whose check passes. More
masks create more opportunities for false acceptance; the combined rate is bounded by the sum
of their individual rates. The codec must not append masks on the caller's behalf.

Masked decoding always accepts both alphabets, sentinels, and current or previous mask outputs.
Migration adds only the old formats the caller enables. Other forms are invalid.

Only `codec.createUuidSlugMigrationDecoder({ acceptPlainSlug: true })` enables plain-slug decoding. A plain slug may
accidentally pass an earlier mask check and return a different candidate; migration cannot make
the two representations distinguishable. Confirm candidates against the issuing store.

Sentinels bypass masking and use precomputed plain slugs in the masked output alphabet.
Decode checks both raw spellings first: 22 base64url or 26 base32hex characters.
Both explicit conversion and generation recognize sentinel UUIDs before masking. A non-sentinel
UUID whose masked result collides with a reserved slug must fail encoding, because accepting it
would decode to the sentinel and lose the original identity. Safe writers also check the old
base64url spelling, because converting a safe payload back must not change its identity.

New masked output uses only the layout above. `codec.createUuidSlugMigrationDecoder` can separately read the original
fixed permutation/XOR layout when enabled; its four-bit check cannot establish identity either.
The format published in 0.2.0 remains unsupported. See README's migration sections for format
selection and record lookup; do not add an old layout to ordinary decoding.
