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
per-alphabet special case and no setting to choose. Both widths are whole multiples of the
character size, so encoding is a bijection and no slug has a second spelling.

Only the base64url width ships: nothing in the public API accepts an alphabet, so 22 characters is
the only masked slug a consumer can obtain. The base32hex column is what the shared bit-packing
routine would produce, kept here because it is what fixes the formula — a check width is derived,
never chosen — and because base32hex sorts in byte order, a property masking destroys and plain
slugs would keep.

The check does not fit in one place. Twelve bits go inside the block, where the cipher hides them;
the rest ride in the bits the encoding has spare after 16 bytes — 4 for base64url, 2 for
base32hex. Splitting it this way is what keeps the cipher a plain 128-bit one.

## Deriving a schema from a seed

`createMaskSchema({ seed })` derives everything deterministically:

1. FNV-1a over the seed bytes plus a purpose byte gives a 64-bit state.
2. An xorshift64 stream expands that state into bytes.
3. Purpose 3 gives eight 32-bit Feistel round keys, big-endian.

The same seed always yields the same schema, in any runtime, with no stored state. That is the
whole point: two services sharing a seed agree without sharing anything else.

This is a hash, not a key-derivation function. Treat the seed as a project constant, not a
credential.

## The cipher

Four Feistel rounds over the 16 bytes, read as four big-endian 32-bit words: `left0 left1` from
bytes 0-7 and `right0 right1` from bytes 8-15. Each round, with round keys `k0 k1`:

```
a     = mix32(right0 ^ k0)
b     = mix32(right1 ^ k1 ^ a)
next0 = left0 ^ mix32(a ^ b)
next1 = left1 ^ b
left  = right ;  right = next
```

`mix32` is the `lowbias32` finalizer. Chaining `b` on `a` is what makes both output words depend
on both input words. After the last round the words are written back **without** the final swap —
`right0 right1` to bytes 0-7, `left0 left1` to bytes 8-15 — which is what lets decryption be the
same routine with the key pairs consumed in reverse. Encrypt and decrypt therefore cannot drift
apart, whatever the round function does.

This is not encryption and the round count is not a measured optimum; see the note at the top of
`src/feistel.ts` for exactly what is and is not established.

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
