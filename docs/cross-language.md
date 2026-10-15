# TypeScript and Rust

The npm package and the Rust crate read and write the same IDs, with matching validation, errors and buffer ownership.

## What matches

Identical deterministic inputs produce identical bytes, text, keys and decoded candidates. This covers accepted and rejected inputs, defaults, error conditions, sentinel priority, key order, migration controls, timestamp windows, cancellation and ownership of returned data.

Generated IDs meet the same promises. Random draws, exact sequence positions, scheduling and allocation can differ.

Masked IDs written in one language decode in the other only when both codecs use the same seeds, iteration counts and timestamp start.

Both languages accept mixed-case canonical or compact UUID text, case-insensitive UUID URNs and brace-wrapped canonical text, and write lowercase hyphenated text by default.

## Rust equivalents

Rust uses `Uuid` values, ownership and `Result` where TypeScript uses directional text/byte functions and returned errors. Parse text once and pass the `Uuid` between calls.

| TypeScript capability | Rust entry point or composition |
| --- | --- |
| `uuidStringToBytes` / `bytesToUuidString`; bytes and offsets | `Uuid::from_uuid_string`, `from_uuid_bytes`, `as_uuid_bytes`, `write_uuid_bytes`, `Display` |
| Plain slug conversion | `Uuid::to_plain_uuid_slug`, `Uuid::from_plain_uuid_slug` |
| UUID version and generic/v4/v7 guards | Parse once, then `Uuid::uuid_version`, `is_uuid_v4`, `is_uuid_v7`, `is_rfc_uuid_variant` |
| Canonical nil and max UUID values | `NIL_UUID`, `MAX_UUID` |
| Base64url UUID payload | `UuidSlugAlphabet::Base64Url.uuid_bytes_to_plain_slug`, `plain_slug_to_uuid_bytes`, `plain_slug_to_uuid_bytes_into` |
| Canonical base64url guard | Check `UuidSlugAlphabet::Base64Url.plain_slug_to_uuid_bytes` success for exactly 22 characters |
| v4 generation and caller storage | `generate_uuid_v4`, `generate_uuid_v4_with_random_fill`, `generate_uuid_v4_into_with_random_fill` |
| v7 generation, rollback, explicit time and caller storage | `UuidV7Generator`, `UuidV7ClockRollbackPolicy`, exact `SystemTime`, fractional Unix-millisecond interop, explicit random-fill, and caller-output forms |
| Generated plain or masked slugs | TypeScript representation calls may select one generator directly; Rust generates a `Uuid`, then calls `to_plain_uuid_slug` or `uuid_to_masked_slug` |
| UUIDv7 timestamp | `Uuid::extract_uuid_v7_unix_ms` |
| Caller-known UUIDv7 payload layout | `UuidV7PayloadLayout::new`, `Uuid::extract_uuid_v7_payload`, `UuidV7MaskingCodec::extract_masked_uuid_v7_payload` |
| Inclusive UUIDv7 timestamp bounds | `uuid_v7_bounds` |
| Maskable timestamps | A `2^42`-millisecond inclusive range starting at the codec's configured Unix millisecond; the default start is `0` |
| Sync/async masks and custom transforms | `derive_uuid_v7_mask`, `derive_uuid_v7_mask_async`, `UuidV7Mask::from_permutation_functions` |
| Explicit public mask | `UUID_V7_TEST_MASK`; `uuid_v7_test_mask()` |
| Key rotation, masked conversion and sentinels | `UuidV7MaskingCodecOptions::new`, `uuid_to_masked_slug`, `masked_slug_to_uuid`, `sentinels` |
| Known/mixed-format migration and candidates | `create_uuid_slug_migration_decoder`, `uuid_slug_to_uuid`, `uuid_slug_to_uuid_candidates`, `UuidSlugMigrationOptions` |
| Plain timestamp window | Parse the plain slug, then `UuidV7TimestampWindow::validate_uuid_v7`; lowercase accepted base32hex text and preserve case-sensitive base64url |
| Masked timestamp window | `UuidV7MaskingCodec::validate_masked_uuid_v7_slug_unix_ms` |
| Error classification and diagnostics | `Error::code`, `Display`, `ErrorCode::as_str`, and `std::error::Error::source` |

For supplied time, TypeScript accepts the host forms listed in [api.md](api.md#supplied-time), including exact epoch nanoseconds; Rust accepts `SystemTime`. Both keep fractional Unix milliseconds for numeric interop.

Rust WebAssembly reads time through `Date.now()`, so configured fraction bits start at zero. For browser-measured precision, pass fractional Unix milliseconds through `generate_uuid_v7_with_random_fill`; that callback also supplies the entropy.

## Errors

Both languages use stable codes for control flow and case-specific messages for diagnostics. Do not parse messages. Underlying runtime and callback failures stay available through `cause` in TypeScript and `source()` in Rust. Rust matches on `ErrorCode`; bridges serialize `ErrorCode::as_str()`. TypeScript also exports `isUuidSlugError`, because JavaScript errors can cross realms or come from duplicate package copies.
