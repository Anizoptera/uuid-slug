# How masking works

The README says what masking gives you and what it does not. This is the mechanism, for
anyone who wants to audit it or reimplement it in another language.

## Shapes

Four representations of the same 16 bytes:

- a canonical lowercase UUID string
- the raw 16 bytes
- a direct slug: those bytes as unpadded base64url, 22 characters
- a masked slug: those bytes encrypted under a seed-derived key, then encoded the same way

## The bit budget

Everything below follows from one count. A UUIDv7 holds 128 bits, but only 116 of them carry
anything:

| bits | field                        | why it is free                              |
| ---: | ---------------------------- | ------------------------------------------- |
|    4 | version nibble, byte 6       | always `7`                                  |
|    2 | variant bits, byte 8         | always `10`                                 |
|    6 | top of the timestamp, byte 0 | zero for every instant before the year 2109 |
|  116 | everything else              | 42 timestamp bits, 12 `rand_a`, 62 `rand_b` |

22 base64url characters hold 132 bits and 26 base32hex characters hold 130, so the check gets
whatever is left over: `checkBits = slugBits - 116`, which is 16 and 14 respectively. There is no
per-alphabet special case and no setting to choose. Both SLUG widths are whole multiples of the
character size — 132 = 22x6 and 130 = 26x5 — so encoding is a bijection and no slug has a second
spelling. The BYTE widths are not (16 is no multiple of 6, 14 none of 5), which is why the spare
bits exist to carry the check at all.

Only the 16-bit width ships. A masked slug is always 22 base64url characters, so the base32hex row
is arithmetic rather than a format a consumer can ask for: it is what fixes the formula — a check
width is derived, never chosen. base32hex is offered for PLAIN slugs, where its byte-order sorting
survives; through the cipher it would buy nothing and cost two bits of check.

The check does not fit in one place. Twelve bits go inside the block, where the cipher hides them;
the rest ride in the bits the encoding has spare after 16 bytes — 4 for base64url, 2 for
base32hex. Splitting it this way is what keeps the cipher a plain 128-bit one.

## Deriving a schema from a seed

`createMaskSchema({ seed })` derives everything deterministically:

1. Two HalfSipHash-2-4 chains, keyed by distinct fixed constants, each hash the seed and then
   re-hash it under their own previous output `keyIterations` times.
2. Each of the four Feistel round-key pairs is one HalfSipHash output from each chain, XORed.

XORing two independently keyed chains is what makes the derived key 128 bits: HalfSipHash takes a
64-bit key, and predicting a round key means breaking both. The construction this replaced put
FNV-1a-64 into an xorshift64 stream, which capped the key at 64 bits however long the seed was.

`keyIterations` is the work factor, and it is the only defence against a guessable seed. It
defaults to 1 — the cheapest setting, because the cost is paid once per schema and most callers
generate their seed properly. Measured on Bun, 2026-08-12, an attacker holding one (uuid, slug)
pair and re-deriving candidate seeds:

| keyIterations | candidate seeds/sec | schema construction |
| ---: | ---: | ---: |
| 1 (default) | 1,248,000 | 0.69 us |
| 1,000 | 16,500 | 87 us |
| 100,000 | 185 | ~8 ms |

Note the direction of the default: the derivation it replaced managed 255,663 candidates/sec
because BigInt arithmetic made it slow, so at `keyIterations: 1` seed guessing is now about five
times FASTER. That is deliberate — a work factor is the caller's decision to pay, and it cannot
rescue a seed somebody thought of anyway. A generated seed is not reachable at any of these rates.

`keyIterations` is wire-format-bearing exactly as the seed is: change it and previously issued
slugs stop decoding unless the old setting is listed under `previousMasks`.

The same seed and count always yield the same schema, in any runtime, with no stored state. That
is the whole point: two services sharing a seed agree without sharing anything else.

## The cipher

Four Feistel rounds over the 16 bytes, read as four big-endian 32-bit words: `left0 left1` from
bytes 0-7 and `right0 right1` from bytes 8-15. Each round, with round keys `k0 k1`:

```
f0, f1 = HalfSipHash-2-4(key = k0 k1, message = right0 right1)
next0 = left0 ^ f0
next1 = left1 ^ f1
left  = right ;  right = next
```

The round function is a keyed pseudorandom function, which is what makes four rounds the right
number rather than an arbitrary one: Luby-Rackoff turns a four-round Feistel into a strong
pseudorandom permutation precisely when the round functions are PRFs. It is a rationale and not a
proof about what ships — the theorem wants four independently sampled functions and these four key
pairs come from one 128-bit key. The previous round function was `mix32(word ^ key)`, a fixed
public bijection with the key merely XORed in front, which met no such hypothesis at all.

After the last round the words are written back **without** the final swap —
`right0 right1` to bytes 0-7, `left0 left1` to bytes 8-15 — which is what lets decryption be the
same routine with the key pairs consumed in reverse. Encrypt and decrypt therefore cannot drift
apart, whatever the round function does.

This is not encryption. `test/siphash.test.ts` holds the round function to the 64 published
HalfSipHash vectors — the only check here that can fail against something other than this
repository's own opinion — but no measurement in this tree grades the round count or the network;
see the note at the top of `src/feistel.ts` for exactly what is and is not established.

## Encoding

With `outer` = the encoding's spare bits (4 for base64url, 2 for base32hex):

1. Refuse the id outright if byte 0 exceeds `0x03`, i.e. a timestamp at or past 2^42 ms. Those
   bits are about to be overwritten, and truncating instead would let two UUIDs share one slug.
2. Compute a `12 + outer` bit tag: fold `mix32` over the four big-endian words of the raw bytes,
   then take the top bits of the result. Taking from the TOP means widening the check never
   renumbers the bits below it.
3. Write the tag's upper 12 bits into the free positions — bits 0-3 into byte 6's high nibble,
   4-5 into byte 8's top two, 6-11 into byte 0's top six.
4. Encrypt the 16 bytes.
5. Encode, with the tag's remaining `outer` bits in the encoding's spare low bits.

Decoding reverses it: recover the spare bits, decrypt, read the inner tag back out of the same
three positions, restore the version, variant and zeroed timestamp bits, recompute the tag over
the restored bytes, and compare. Both halves come out of one decryption, so a wrong key garbles
the observed tag as thoroughly as the payload — the tag needs no key of its own.

A slug that was corrupted, or produced under a different seed, fails that comparison and comes
back as `invalid_uuid_slug`. One in `2^checkBits` gets through anyway, which is why a decoded slug
is a candidate to look up rather than an answer to trust.

There is one layout, not a family of them. A caller with their own cipher supplies a `mix`
function and gets this same tag layout and check width around it; the package once carried
narrower 4- and 6-bit tag tiers with their own weak checksums, but the only slugs those could
read were its own pre-Feistel ones, so they went with that format.

## Telling schemas apart

Nothing marks which schema produced a slug. Decoding tries each configured schema in turn and the
first whose check passes wins, so a codec's false-accept rate is the SUM over its list and is set
by its weakest member. Keep the list short, and put the newest schema first: when two both pass,
the newest one's candidate is what you get.

An earlier layout spent two bits on a scheme marker instead. Those two bits are now part of the
check, which is what makes it 16 rather than 14.

## Sentinels

Sentinels are a separate transmission class. They bypass masking and use direct slugs so boundary
values stay recognisable in logs. Decoding checks the sentinel table before attempting a mask, so
a sentinel can never be misread as a masked slug, and encoding checks it too, so a sentinel UUID
always produces its fixed slug.

## Seed rotation

`previousMasks` holds previously used schemas, tried in the order given after the current one.
`acceptUnmaskedSlugs` additionally falls back to reading the slug as an unmasked direct slug,
which is the migration path for ids issued before masking existed — at the cost of reading about
one direct slug in `2^checkBits` as a masked one instead.
