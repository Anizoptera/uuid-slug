# How masking works

The README says what masking gives you and what it does not. This is the mechanism, for
anyone who wants to audit it or reimplement it in another language.

## Shapes

Four representations of the same 16 bytes:

- a canonical lowercase UUID string
- the raw 16 bytes
- a direct slug: those bytes as unpadded base64url, 22 characters
- a masked slug: those bytes reordered and XORed first, then encoded the same way

## Deriving a schema from a seed

A mask schema is a 16-byte permutation, its inverse, a 16-byte XOR mask, and a tag width.
`createMaskSchema({ seed })` derives all of it deterministically:

1. FNV-1a over the seed bytes plus a purpose byte gives a 64-bit state.
2. An xorshift64 stream expands that state into bytes.
3. Purpose 1 gives the XOR mask. Purpose 2 drives a Fisher-Yates shuffle that produces the
   permutation.

The same seed always yields the same schema, in any runtime, with no stored state. That is
the whole point: two services sharing a seed agree on the mask without sharing anything
else.

This is a hash, not a key-derivation function, and the schema is not secret material. The
mask is a static substitution, so a handful of known (uuid, slug) pairs reveal it. Treat
the seed as a project constant, not a credential.

## Encoding

1. Compute a checksum tag over the raw bytes: 4 or 6 bits, per `tagBits`.
2. Write the tag into the version and variant bits. In a UUIDv7 those bits are constant, so
   they carry no information and would otherwise mark every masked slug as a UUID.
3. Apply the permutation, then the XOR mask.
4. Encode as unpadded base64url.

Decoding reverses it, then recomputes the tag over the restored bytes and compares. A slug
that was corrupted, or produced under a different seed, fails that comparison and comes back
as `invalid_uuid_slug` rather than as a plausible wrong UUID. Six tag bits reject more of
those than four.

## Sentinels

Sentinels are a separate transmission class. They bypass masking and use direct slugs so
boundary values stay recognisable in logs. Decoding checks the sentinel table before
attempting a mask, so a sentinel can never be misread as a masked slug, and encoding checks
it too, so a sentinel UUID always produces its fixed slug.

## Seed rotation

`legacy.masks` holds previously used schemas. Decoding tries the current schema first, then
each legacy schema in order. `legacy.directDecode` additionally falls back to reading the
slug as an unmasked direct slug, which is the migration path for ids issued before masking
existed.
