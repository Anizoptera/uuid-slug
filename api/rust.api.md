# Rust packaged API

This generated baseline records packaged API signatures for compatibility checks.

## All features

```rust
pub mod uuid_slug
#[non_exhaustive] pub enum uuid_slug::ErrorCode
pub uuid_slug::ErrorCode::Aborted
pub uuid_slug::ErrorCode::InvalidBase32Hex
pub uuid_slug::ErrorCode::InvalidBase64Url
pub uuid_slug::ErrorCode::InvalidBuffer
pub uuid_slug::ErrorCode::InvalidMask
pub uuid_slug::ErrorCode::InvalidOptions
pub uuid_slug::ErrorCode::InvalidSentinel
pub uuid_slug::ErrorCode::InvalidTimestamp
pub uuid_slug::ErrorCode::InvalidUuid
pub uuid_slug::ErrorCode::InvalidUuidSlug
pub uuid_slug::ErrorCode::InvalidUuidVersion
pub uuid_slug::ErrorCode::RngUnavailable
pub uuid_slug::ErrorCode::TimestampOutsideWindow
impl uuid_slug::ErrorCode
pub const fn uuid_slug::ErrorCode::as_str(self) -> &'static str
impl core::clone::Clone for uuid_slug::ErrorCode
pub fn uuid_slug::ErrorCode::clone(&self) -> uuid_slug::ErrorCode
impl core::cmp::Eq for uuid_slug::ErrorCode
impl core::cmp::PartialEq for uuid_slug::ErrorCode
pub fn uuid_slug::ErrorCode::eq(&self, other: &uuid_slug::ErrorCode) -> bool
impl core::fmt::Debug for uuid_slug::ErrorCode
pub fn uuid_slug::ErrorCode::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::hash::Hash for uuid_slug::ErrorCode
pub fn uuid_slug::ErrorCode::hash<__H: core::hash::Hasher>(&self, state: &mut __H)
impl core::marker::Copy for uuid_slug::ErrorCode
impl core::marker::StructuralPartialEq for uuid_slug::ErrorCode
impl core::marker::Freeze for uuid_slug::ErrorCode
impl core::marker::Send for uuid_slug::ErrorCode
impl core::marker::Sync for uuid_slug::ErrorCode
impl core::marker::Unpin for uuid_slug::ErrorCode
impl core::marker::UnsafeUnpin for uuid_slug::ErrorCode
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::ErrorCode
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::ErrorCode
pub enum uuid_slug::MaskedOrSentinelUuidV7Slug
pub uuid_slug::MaskedOrSentinelUuidV7Slug::Masked(uuid_slug::MaskedUuidV7Slug)
pub uuid_slug::MaskedOrSentinelUuidV7Slug::Sentinel(uuid_slug::PlainUuidSlug)
impl uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::as_str(&self) -> &str
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::into_string(self) -> alloc::string::String
impl core::borrow::Borrow<str> for uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::borrow(&self) -> &str
impl core::clone::Clone for uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::clone(&self) -> uuid_slug::MaskedOrSentinelUuidV7Slug
impl core::cmp::Eq for uuid_slug::MaskedOrSentinelUuidV7Slug
impl core::cmp::Ord for uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::cmp(&self, other: &uuid_slug::MaskedOrSentinelUuidV7Slug) -> core::cmp::Ordering
impl core::cmp::PartialEq for uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::eq(&self, other: &uuid_slug::MaskedOrSentinelUuidV7Slug) -> bool
impl core::cmp::PartialOrd for uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::partial_cmp(&self, other: &uuid_slug::MaskedOrSentinelUuidV7Slug) -> core::option::Option<core::cmp::Ordering>
impl core::convert::AsRef<str> for uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::as_ref(&self) -> &str
impl core::convert::From<uuid_slug::MaskedOrSentinelUuidV7Slug> for alloc::string::String
pub fn alloc::string::String::from(slug: uuid_slug::MaskedOrSentinelUuidV7Slug) -> Self
impl core::fmt::Debug for uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::fmt::Display for uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::fmt(&self, formatter: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::hash::Hash for uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::hash<__H: core::hash::Hasher>(&self, state: &mut __H)
impl core::marker::StructuralPartialEq for uuid_slug::MaskedOrSentinelUuidV7Slug
impl core::ops::deref::Deref for uuid_slug::MaskedOrSentinelUuidV7Slug
pub type uuid_slug::MaskedOrSentinelUuidV7Slug::Target = str
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::deref(&self) -> &Self::Target
impl core::marker::Freeze for uuid_slug::MaskedOrSentinelUuidV7Slug
impl core::marker::Send for uuid_slug::MaskedOrSentinelUuidV7Slug
impl core::marker::Sync for uuid_slug::MaskedOrSentinelUuidV7Slug
impl core::marker::Unpin for uuid_slug::MaskedOrSentinelUuidV7Slug
impl core::marker::UnsafeUnpin for uuid_slug::MaskedOrSentinelUuidV7Slug
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::MaskedOrSentinelUuidV7Slug
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::MaskedOrSentinelUuidV7Slug
pub enum uuid_slug::UuidSlugAlphabet
pub uuid_slug::UuidSlugAlphabet::Base32Hex
pub uuid_slug::UuidSlugAlphabet::Base64Url
impl uuid_slug::UuidSlugAlphabet
pub const fn uuid_slug::UuidSlugAlphabet::bits_per_character(self) -> usize
pub fn uuid_slug::UuidSlugAlphabet::plain_slug_to_uuid_bytes(self, plain_uuid_slug: &str) -> core::result::Result<[u8; 16], uuid_slug::Error>
pub fn uuid_slug::UuidSlugAlphabet::plain_slug_to_uuid_bytes_into<'a>(self, plain_uuid_slug: &str, output: &'a mut [u8], output_offset: usize) -> core::result::Result<&'a mut [u8], uuid_slug::Error>
pub fn uuid_slug::UuidSlugAlphabet::uuid_bytes_to_plain_slug(self, uuid_bytes: &[u8; 16]) -> uuid_slug::PlainUuidSlug
impl core::clone::Clone for uuid_slug::UuidSlugAlphabet
pub fn uuid_slug::UuidSlugAlphabet::clone(&self) -> uuid_slug::UuidSlugAlphabet
impl core::cmp::Eq for uuid_slug::UuidSlugAlphabet
impl core::cmp::PartialEq for uuid_slug::UuidSlugAlphabet
pub fn uuid_slug::UuidSlugAlphabet::eq(&self, other: &uuid_slug::UuidSlugAlphabet) -> bool
impl core::default::Default for uuid_slug::UuidSlugAlphabet
pub fn uuid_slug::UuidSlugAlphabet::default() -> uuid_slug::UuidSlugAlphabet
impl core::fmt::Debug for uuid_slug::UuidSlugAlphabet
pub fn uuid_slug::UuidSlugAlphabet::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::UuidSlugAlphabet
impl core::marker::StructuralPartialEq for uuid_slug::UuidSlugAlphabet
impl core::marker::Freeze for uuid_slug::UuidSlugAlphabet
impl core::marker::Send for uuid_slug::UuidSlugAlphabet
impl core::marker::Sync for uuid_slug::UuidSlugAlphabet
impl core::marker::Unpin for uuid_slug::UuidSlugAlphabet
impl core::marker::UnsafeUnpin for uuid_slug::UuidSlugAlphabet
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidSlugAlphabet
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidSlugAlphabet
pub enum uuid_slug::UuidSlugMigrationFormat
pub uuid_slug::UuidSlugMigrationFormat::CurrentMaskedSlug
pub uuid_slug::UuidSlugMigrationFormat::OriginalMaskedSlug
pub uuid_slug::UuidSlugMigrationFormat::PlainUuidSlug
impl core::clone::Clone for uuid_slug::UuidSlugMigrationFormat
pub fn uuid_slug::UuidSlugMigrationFormat::clone(&self) -> uuid_slug::UuidSlugMigrationFormat
impl core::cmp::Eq for uuid_slug::UuidSlugMigrationFormat
impl core::cmp::PartialEq for uuid_slug::UuidSlugMigrationFormat
pub fn uuid_slug::UuidSlugMigrationFormat::eq(&self, other: &uuid_slug::UuidSlugMigrationFormat) -> bool
impl core::fmt::Debug for uuid_slug::UuidSlugMigrationFormat
pub fn uuid_slug::UuidSlugMigrationFormat::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::UuidSlugMigrationFormat
impl core::marker::StructuralPartialEq for uuid_slug::UuidSlugMigrationFormat
impl core::marker::Freeze for uuid_slug::UuidSlugMigrationFormat
impl core::marker::Send for uuid_slug::UuidSlugMigrationFormat
impl core::marker::Sync for uuid_slug::UuidSlugMigrationFormat
impl core::marker::Unpin for uuid_slug::UuidSlugMigrationFormat
impl core::marker::UnsafeUnpin for uuid_slug::UuidSlugMigrationFormat
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidSlugMigrationFormat
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidSlugMigrationFormat
pub enum uuid_slug::UuidV7ClockRollbackPolicy
pub uuid_slug::UuidV7ClockRollbackPolicy::Error
pub uuid_slug::UuidV7ClockRollbackPolicy::Error::tolerance_ms: u64
pub uuid_slug::UuidV7ClockRollbackPolicy::Preserve
pub uuid_slug::UuidV7ClockRollbackPolicy::Reset
pub uuid_slug::UuidV7ClockRollbackPolicy::Reset::tolerance_ms: u64
impl core::clone::Clone for uuid_slug::UuidV7ClockRollbackPolicy
pub fn uuid_slug::UuidV7ClockRollbackPolicy::clone(&self) -> uuid_slug::UuidV7ClockRollbackPolicy
impl core::cmp::Eq for uuid_slug::UuidV7ClockRollbackPolicy
impl core::cmp::PartialEq for uuid_slug::UuidV7ClockRollbackPolicy
pub fn uuid_slug::UuidV7ClockRollbackPolicy::eq(&self, other: &uuid_slug::UuidV7ClockRollbackPolicy) -> bool
impl core::default::Default for uuid_slug::UuidV7ClockRollbackPolicy
pub fn uuid_slug::UuidV7ClockRollbackPolicy::default() -> uuid_slug::UuidV7ClockRollbackPolicy
impl core::fmt::Debug for uuid_slug::UuidV7ClockRollbackPolicy
pub fn uuid_slug::UuidV7ClockRollbackPolicy::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::UuidV7ClockRollbackPolicy
impl core::marker::StructuralPartialEq for uuid_slug::UuidV7ClockRollbackPolicy
impl core::marker::Freeze for uuid_slug::UuidV7ClockRollbackPolicy
impl core::marker::Send for uuid_slug::UuidV7ClockRollbackPolicy
impl core::marker::Sync for uuid_slug::UuidV7ClockRollbackPolicy
impl core::marker::Unpin for uuid_slug::UuidV7ClockRollbackPolicy
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7ClockRollbackPolicy
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7ClockRollbackPolicy
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7ClockRollbackPolicy
pub struct uuid_slug::Error
impl uuid_slug::Error
pub const fn uuid_slug::Error::code(&self) -> uuid_slug::ErrorCode
pub const fn uuid_slug::Error::new(code: uuid_slug::ErrorCode) -> Self
pub fn uuid_slug::Error::with_source(self, source: impl core::error::Error + core::marker::Send + core::marker::Sync + 'static) -> Self
impl core::error::Error for uuid_slug::Error
pub fn uuid_slug::Error::source(&self) -> core::option::Option<&(dyn core::error::Error + 'static)>
impl core::fmt::Debug for uuid_slug::Error
pub fn uuid_slug::Error::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::fmt::Display for uuid_slug::Error
pub fn uuid_slug::Error::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::Error
impl core::marker::Send for uuid_slug::Error
impl core::marker::Sync for uuid_slug::Error
impl core::marker::Unpin for uuid_slug::Error
impl core::marker::UnsafeUnpin for uuid_slug::Error
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::Error
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::Error
pub struct uuid_slug::MaskedUuidV7Slug(_)
impl uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::as_str(&self) -> &str
pub fn uuid_slug::MaskedUuidV7Slug::into_string(self) -> alloc::string::String
impl core::borrow::Borrow<str> for uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::borrow(&self) -> &str
impl core::clone::Clone for uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::clone(&self) -> uuid_slug::MaskedUuidV7Slug
impl core::cmp::Eq for uuid_slug::MaskedUuidV7Slug
impl core::cmp::Ord for uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::cmp(&self, other: &uuid_slug::MaskedUuidV7Slug) -> core::cmp::Ordering
impl core::cmp::PartialEq for uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::eq(&self, other: &uuid_slug::MaskedUuidV7Slug) -> bool
impl core::cmp::PartialOrd for uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::partial_cmp(&self, other: &uuid_slug::MaskedUuidV7Slug) -> core::option::Option<core::cmp::Ordering>
impl core::convert::AsRef<str> for uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::as_ref(&self) -> &str
impl core::convert::From<uuid_slug::MaskedUuidV7Slug> for alloc::string::String
pub fn alloc::string::String::from(slug: uuid_slug::MaskedUuidV7Slug) -> Self
impl core::fmt::Debug for uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::fmt::Display for uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::fmt(&self, formatter: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::hash::Hash for uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::hash<__H: core::hash::Hasher>(&self, state: &mut __H)
impl core::marker::StructuralPartialEq for uuid_slug::MaskedUuidV7Slug
impl core::ops::deref::Deref for uuid_slug::MaskedUuidV7Slug
pub type uuid_slug::MaskedUuidV7Slug::Target = str
pub fn uuid_slug::MaskedUuidV7Slug::deref(&self) -> &Self::Target
impl core::marker::Freeze for uuid_slug::MaskedUuidV7Slug
impl core::marker::Send for uuid_slug::MaskedUuidV7Slug
impl core::marker::Sync for uuid_slug::MaskedUuidV7Slug
impl core::marker::Unpin for uuid_slug::MaskedUuidV7Slug
impl core::marker::UnsafeUnpin for uuid_slug::MaskedUuidV7Slug
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::MaskedUuidV7Slug
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::MaskedUuidV7Slug
pub struct uuid_slug::PlainUuidSlug(_)
impl uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::as_str(&self) -> &str
pub fn uuid_slug::PlainUuidSlug::into_string(self) -> alloc::string::String
impl core::borrow::Borrow<str> for uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::borrow(&self) -> &str
impl core::clone::Clone for uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::clone(&self) -> uuid_slug::PlainUuidSlug
impl core::cmp::Eq for uuid_slug::PlainUuidSlug
impl core::cmp::Ord for uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::cmp(&self, other: &uuid_slug::PlainUuidSlug) -> core::cmp::Ordering
impl core::cmp::PartialEq for uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::eq(&self, other: &uuid_slug::PlainUuidSlug) -> bool
impl core::cmp::PartialOrd for uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::partial_cmp(&self, other: &uuid_slug::PlainUuidSlug) -> core::option::Option<core::cmp::Ordering>
impl core::convert::AsRef<str> for uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::as_ref(&self) -> &str
impl core::convert::From<uuid_slug::PlainUuidSlug> for alloc::string::String
pub fn alloc::string::String::from(slug: uuid_slug::PlainUuidSlug) -> Self
impl core::fmt::Debug for uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::fmt::Display for uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::fmt(&self, formatter: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::hash::Hash for uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::hash<__H: core::hash::Hasher>(&self, state: &mut __H)
impl core::marker::StructuralPartialEq for uuid_slug::PlainUuidSlug
impl core::ops::deref::Deref for uuid_slug::PlainUuidSlug
pub type uuid_slug::PlainUuidSlug::Target = str
pub fn uuid_slug::PlainUuidSlug::deref(&self) -> &Self::Target
impl core::marker::Freeze for uuid_slug::PlainUuidSlug
impl core::marker::Send for uuid_slug::PlainUuidSlug
impl core::marker::Sync for uuid_slug::PlainUuidSlug
impl core::marker::Unpin for uuid_slug::PlainUuidSlug
impl core::marker::UnsafeUnpin for uuid_slug::PlainUuidSlug
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::PlainUuidSlug
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::PlainUuidSlug
pub struct uuid_slug::Uuid(_)
impl uuid_slug::Uuid
pub const fn uuid_slug::Uuid::as_uuid_bytes(&self) -> &[u8; 16]
pub fn uuid_slug::Uuid::extract_uuid_v7_payload(&self, layout: uuid_slug::UuidV7PayloadLayout) -> core::result::Result<uuid_slug::UuidV7Payload, uuid_slug::Error>
pub fn uuid_slug::Uuid::extract_uuid_v7_unix_ms(&self) -> core::result::Result<u64, uuid_slug::Error>
pub fn uuid_slug::Uuid::from_plain_uuid_slug(plain_uuid_slug: &str) -> core::result::Result<Self, uuid_slug::Error>
pub fn uuid_slug::Uuid::from_uuid_bytes(bytes: &[u8], offset: usize) -> core::result::Result<Self, uuid_slug::Error>
pub const fn uuid_slug::Uuid::from_uuid_bytes_array(bytes: [u8; 16]) -> Self
pub fn uuid_slug::Uuid::from_uuid_string(uuid_string: &str) -> core::result::Result<Self, uuid_slug::Error>
pub const fn uuid_slug::Uuid::is_rfc_uuid_variant(&self) -> bool
pub const fn uuid_slug::Uuid::is_uuid_v4(&self) -> bool
pub const fn uuid_slug::Uuid::is_uuid_v7(&self) -> bool
pub fn uuid_slug::Uuid::to_plain_uuid_slug(&self, alphabet: uuid_slug::UuidSlugAlphabet) -> uuid_slug::PlainUuidSlug
pub const fn uuid_slug::Uuid::uuid_version(&self) -> u8
pub fn uuid_slug::Uuid::write_uuid_bytes(&self, out: &mut [u8], offset: usize) -> core::result::Result<(), uuid_slug::Error>
impl core::clone::Clone for uuid_slug::Uuid
pub fn uuid_slug::Uuid::clone(&self) -> uuid_slug::Uuid
impl core::cmp::Eq for uuid_slug::Uuid
impl core::cmp::Ord for uuid_slug::Uuid
pub fn uuid_slug::Uuid::cmp(&self, other: &uuid_slug::Uuid) -> core::cmp::Ordering
impl core::cmp::PartialEq for uuid_slug::Uuid
pub fn uuid_slug::Uuid::eq(&self, other: &uuid_slug::Uuid) -> bool
impl core::cmp::PartialOrd for uuid_slug::Uuid
pub fn uuid_slug::Uuid::partial_cmp(&self, other: &uuid_slug::Uuid) -> core::option::Option<core::cmp::Ordering>
impl core::fmt::Debug for uuid_slug::Uuid
pub fn uuid_slug::Uuid::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::fmt::Display for uuid_slug::Uuid
pub fn uuid_slug::Uuid::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::hash::Hash for uuid_slug::Uuid
pub fn uuid_slug::Uuid::hash<__H: core::hash::Hasher>(&self, state: &mut __H)
impl core::marker::Copy for uuid_slug::Uuid
impl core::marker::StructuralPartialEq for uuid_slug::Uuid
impl core::str::traits::FromStr for uuid_slug::Uuid
pub type uuid_slug::Uuid::Err = uuid_slug::Error
pub fn uuid_slug::Uuid::from_str(text: &str) -> core::result::Result<Self, uuid_slug::Error>
impl core::marker::Freeze for uuid_slug::Uuid
impl core::marker::Send for uuid_slug::Uuid
impl core::marker::Sync for uuid_slug::Uuid
impl core::marker::Unpin for uuid_slug::Uuid
impl core::marker::UnsafeUnpin for uuid_slug::Uuid
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::Uuid
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::Uuid
pub struct uuid_slug::UuidSlugMigrationDecoder<'a>
impl uuid_slug::UuidSlugMigrationDecoder<'_>
pub fn uuid_slug::UuidSlugMigrationDecoder<'_>::uuid_slug_to_uuid(&self, uuid_slug: &str, format: core::option::Option<uuid_slug::UuidSlugMigrationFormat>) -> core::result::Result<uuid_slug::Uuid, uuid_slug::Error>
pub fn uuid_slug::UuidSlugMigrationDecoder<'_>::uuid_slug_to_uuid_candidates(&self, uuid_slug: &str, format: core::option::Option<uuid_slug::UuidSlugMigrationFormat>) -> core::result::Result<alloc::vec::Vec<uuid_slug::Uuid>, uuid_slug::Error>
impl<'a> core::marker::Freeze for uuid_slug::UuidSlugMigrationDecoder<'a>
impl<'a> core::marker::Send for uuid_slug::UuidSlugMigrationDecoder<'a>
impl<'a> core::marker::Sync for uuid_slug::UuidSlugMigrationDecoder<'a>
impl<'a> core::marker::Unpin for uuid_slug::UuidSlugMigrationDecoder<'a>
impl<'a> core::marker::UnsafeUnpin for uuid_slug::UuidSlugMigrationDecoder<'a>
impl<'a> !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidSlugMigrationDecoder<'a>
impl<'a> !core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidSlugMigrationDecoder<'a>
pub struct uuid_slug::UuidSlugMigrationOptions
pub uuid_slug::UuidSlugMigrationOptions::accept_original_masked_slug: bool
pub uuid_slug::UuidSlugMigrationOptions::accept_plain_uuid_slug: bool
impl core::clone::Clone for uuid_slug::UuidSlugMigrationOptions
pub fn uuid_slug::UuidSlugMigrationOptions::clone(&self) -> uuid_slug::UuidSlugMigrationOptions
impl core::default::Default for uuid_slug::UuidSlugMigrationOptions
pub fn uuid_slug::UuidSlugMigrationOptions::default() -> uuid_slug::UuidSlugMigrationOptions
impl core::fmt::Debug for uuid_slug::UuidSlugMigrationOptions
pub fn uuid_slug::UuidSlugMigrationOptions::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::UuidSlugMigrationOptions
impl core::marker::Freeze for uuid_slug::UuidSlugMigrationOptions
impl core::marker::Send for uuid_slug::UuidSlugMigrationOptions
impl core::marker::Sync for uuid_slug::UuidSlugMigrationOptions
impl core::marker::Unpin for uuid_slug::UuidSlugMigrationOptions
impl core::marker::UnsafeUnpin for uuid_slug::UuidSlugMigrationOptions
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidSlugMigrationOptions
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidSlugMigrationOptions
pub struct uuid_slug::UuidV7Bounds
pub uuid_slug::UuidV7Bounds::end_inclusive: uuid_slug::Uuid
pub uuid_slug::UuidV7Bounds::start_inclusive: uuid_slug::Uuid
impl core::clone::Clone for uuid_slug::UuidV7Bounds
pub fn uuid_slug::UuidV7Bounds::clone(&self) -> uuid_slug::UuidV7Bounds
impl core::cmp::Eq for uuid_slug::UuidV7Bounds
impl core::cmp::PartialEq for uuid_slug::UuidV7Bounds
pub fn uuid_slug::UuidV7Bounds::eq(&self, other: &uuid_slug::UuidV7Bounds) -> bool
impl core::fmt::Debug for uuid_slug::UuidV7Bounds
pub fn uuid_slug::UuidV7Bounds::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::UuidV7Bounds
impl core::marker::StructuralPartialEq for uuid_slug::UuidV7Bounds
impl core::marker::Freeze for uuid_slug::UuidV7Bounds
impl core::marker::Send for uuid_slug::UuidV7Bounds
impl core::marker::Sync for uuid_slug::UuidV7Bounds
impl core::marker::Unpin for uuid_slug::UuidV7Bounds
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7Bounds
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7Bounds
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7Bounds
pub struct uuid_slug::UuidV7Generator
impl uuid_slug::UuidV7Generator
pub fn uuid_slug::UuidV7Generator::generate_uuid_v7(&mut self) -> core::result::Result<uuid_slug::Uuid, uuid_slug::Error>
pub fn uuid_slug::UuidV7Generator::generate_uuid_v7_at_unix_ms(&mut self, unix_ms: f64) -> core::result::Result<uuid_slug::Uuid, uuid_slug::Error>
pub fn uuid_slug::UuidV7Generator::generate_uuid_v7_into_with_random_fill(&mut self, unix_ms: f64, out: &mut [u8], offset: usize, fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::Error>) -> core::result::Result<(), uuid_slug::Error>
pub fn uuid_slug::UuidV7Generator::generate_uuid_v7_with_random_fill(&mut self, unix_ms: f64, fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::Error>) -> core::result::Result<uuid_slug::Uuid, uuid_slug::Error>
pub const fn uuid_slug::UuidV7Generator::new() -> Self
pub fn uuid_slug::UuidV7Generator::payload_layout(&self) -> uuid_slug::UuidV7PayloadLayout
pub const fn uuid_slug::UuidV7Generator::with_clock_rollback_policy(self, policy: uuid_slug::UuidV7ClockRollbackPolicy) -> Self
pub fn uuid_slug::UuidV7Generator::with_sub_millisecond_fraction_bits(self, bits: u8) -> core::result::Result<Self, uuid_slug::Error>
impl core::default::Default for uuid_slug::UuidV7Generator
pub fn uuid_slug::UuidV7Generator::default() -> uuid_slug::UuidV7Generator
impl core::fmt::Debug for uuid_slug::UuidV7Generator
pub fn uuid_slug::UuidV7Generator::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::UuidV7Generator
impl core::marker::Send for uuid_slug::UuidV7Generator
impl core::marker::Sync for uuid_slug::UuidV7Generator
impl core::marker::Unpin for uuid_slug::UuidV7Generator
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7Generator
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7Generator
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7Generator
pub struct uuid_slug::UuidV7Mask
impl uuid_slug::UuidV7Mask
pub fn uuid_slug::UuidV7Mask::diagnostic_label(&self) -> &str
pub fn uuid_slug::UuidV7Mask::from_permutation_functions(diagnostic_label: impl core::convert::Into<alloc::string::String>, mask_uuid_bytes: impl core::ops::function::Fn([u8; 16]) -> core::result::Result<[u8; 16], uuid_slug::Error> + core::marker::Send + core::marker::Sync + 'static, unmask_uuid_bytes: impl core::ops::function::Fn([u8; 16]) -> core::result::Result<[u8; 16], uuid_slug::Error> + core::marker::Send + core::marker::Sync + 'static) -> core::result::Result<Self, uuid_slug::Error>
impl core::clone::Clone for uuid_slug::UuidV7Mask
pub fn uuid_slug::UuidV7Mask::clone(&self) -> uuid_slug::UuidV7Mask
impl core::fmt::Debug for uuid_slug::UuidV7Mask
pub fn uuid_slug::UuidV7Mask::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::UuidV7Mask
impl core::marker::Send for uuid_slug::UuidV7Mask
impl core::marker::Sync for uuid_slug::UuidV7Mask
impl core::marker::Unpin for uuid_slug::UuidV7Mask
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7Mask
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7Mask
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7Mask
pub struct uuid_slug::UuidV7MaskDerivationCancellation(_)
impl uuid_slug::UuidV7MaskDerivationCancellation
pub fn uuid_slug::UuidV7MaskDerivationCancellation::cancel(&self)
pub fn uuid_slug::UuidV7MaskDerivationCancellation::is_cancelled(&self) -> bool
impl core::clone::Clone for uuid_slug::UuidV7MaskDerivationCancellation
pub fn uuid_slug::UuidV7MaskDerivationCancellation::clone(&self) -> uuid_slug::UuidV7MaskDerivationCancellation
impl core::default::Default for uuid_slug::UuidV7MaskDerivationCancellation
pub fn uuid_slug::UuidV7MaskDerivationCancellation::default() -> uuid_slug::UuidV7MaskDerivationCancellation
impl core::fmt::Debug for uuid_slug::UuidV7MaskDerivationCancellation
pub fn uuid_slug::UuidV7MaskDerivationCancellation::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::UuidV7MaskDerivationCancellation
impl core::marker::Send for uuid_slug::UuidV7MaskDerivationCancellation
impl core::marker::Sync for uuid_slug::UuidV7MaskDerivationCancellation
impl core::marker::Unpin for uuid_slug::UuidV7MaskDerivationCancellation
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7MaskDerivationCancellation
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7MaskDerivationCancellation
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7MaskDerivationCancellation
pub struct uuid_slug::UuidV7MaskingCodec
impl uuid_slug::UuidV7MaskingCodec
pub fn uuid_slug::UuidV7MaskingCodec::create_uuid_slug_migration_decoder(&self, options: uuid_slug::UuidSlugMigrationOptions) -> uuid_slug::UuidSlugMigrationDecoder<'_>
pub fn uuid_slug::UuidV7MaskingCodec::extract_masked_uuid_v7_payload(&self, masked_uuid_slug: &str, layout: uuid_slug::UuidV7PayloadLayout) -> core::result::Result<uuid_slug::UuidV7Payload, uuid_slug::Error>
pub fn uuid_slug::UuidV7MaskingCodec::masked_slug_to_uuid(&self, masked_uuid_slug: &str) -> core::result::Result<uuid_slug::Uuid, uuid_slug::Error>
pub fn uuid_slug::UuidV7MaskingCodec::new(options: uuid_slug::UuidV7MaskingCodecOptions) -> core::result::Result<Self, uuid_slug::Error>
pub fn uuid_slug::UuidV7MaskingCodec::sentinels(&self) -> &[uuid_slug::UuidV7Sentinel]
pub fn uuid_slug::UuidV7MaskingCodec::uuid_to_masked_slug(&self, uuid: uuid_slug::Uuid) -> core::result::Result<uuid_slug::MaskedOrSentinelUuidV7Slug, uuid_slug::Error>
pub fn uuid_slug::UuidV7MaskingCodec::validate_masked_uuid_v7_slug_unix_ms<'a>(&self, slug: &'a str, window: uuid_slug::UuidV7TimestampWindow) -> core::result::Result<&'a str, uuid_slug::Error>
impl core::marker::Freeze for uuid_slug::UuidV7MaskingCodec
impl core::marker::Send for uuid_slug::UuidV7MaskingCodec
impl core::marker::Sync for uuid_slug::UuidV7MaskingCodec
impl core::marker::Unpin for uuid_slug::UuidV7MaskingCodec
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7MaskingCodec
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7MaskingCodec
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7MaskingCodec
pub struct uuid_slug::UuidV7MaskingCodecOptions
pub uuid_slug::UuidV7MaskingCodecOptions::mask: uuid_slug::UuidV7Mask
pub uuid_slug::UuidV7MaskingCodecOptions::masked_slug_alphabet: uuid_slug::UuidSlugAlphabet
pub uuid_slug::UuidV7MaskingCodecOptions::previous_masks: alloc::vec::Vec<uuid_slug::UuidV7PreviousMask>
pub uuid_slug::UuidV7MaskingCodecOptions::sentinels: alloc::vec::Vec<(alloc::string::String, uuid_slug::Uuid)>
pub uuid_slug::UuidV7MaskingCodecOptions::timestamp_range_start_unix_ms: u64
impl uuid_slug::UuidV7MaskingCodecOptions
pub fn uuid_slug::UuidV7MaskingCodecOptions::new(mask: uuid_slug::UuidV7Mask) -> Self
impl core::marker::Freeze for uuid_slug::UuidV7MaskingCodecOptions
impl core::marker::Send for uuid_slug::UuidV7MaskingCodecOptions
impl core::marker::Sync for uuid_slug::UuidV7MaskingCodecOptions
impl core::marker::Unpin for uuid_slug::UuidV7MaskingCodecOptions
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7MaskingCodecOptions
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7MaskingCodecOptions
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7MaskingCodecOptions
pub struct uuid_slug::UuidV7Payload
pub uuid_slug::UuidV7Payload::counter: core::option::Option<uuid_slug::UuidV7PayloadField<u128>>
pub uuid_slug::UuidV7Payload::remaining: uuid_slug::UuidV7PayloadField<u128>
pub uuid_slug::UuidV7Payload::sub_millisecond_fraction: core::option::Option<uuid_slug::UuidV7PayloadField<u16>>
pub uuid_slug::UuidV7Payload::unix_ms: u64
impl core::clone::Clone for uuid_slug::UuidV7Payload
pub fn uuid_slug::UuidV7Payload::clone(&self) -> uuid_slug::UuidV7Payload
impl core::cmp::Eq for uuid_slug::UuidV7Payload
impl core::cmp::PartialEq for uuid_slug::UuidV7Payload
pub fn uuid_slug::UuidV7Payload::eq(&self, other: &uuid_slug::UuidV7Payload) -> bool
impl core::fmt::Debug for uuid_slug::UuidV7Payload
pub fn uuid_slug::UuidV7Payload::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::UuidV7Payload
impl core::marker::StructuralPartialEq for uuid_slug::UuidV7Payload
impl core::marker::Freeze for uuid_slug::UuidV7Payload
impl core::marker::Send for uuid_slug::UuidV7Payload
impl core::marker::Sync for uuid_slug::UuidV7Payload
impl core::marker::Unpin for uuid_slug::UuidV7Payload
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7Payload
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7Payload
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7Payload
pub struct uuid_slug::UuidV7PayloadField<Value>
pub uuid_slug::UuidV7PayloadField::bits: u8
pub uuid_slug::UuidV7PayloadField::value: Value
impl<Value: core::clone::Clone> core::clone::Clone for uuid_slug::UuidV7PayloadField<Value>
pub fn uuid_slug::UuidV7PayloadField<Value>::clone(&self) -> uuid_slug::UuidV7PayloadField<Value>
impl<Value: core::cmp::Eq> core::cmp::Eq for uuid_slug::UuidV7PayloadField<Value>
impl<Value: core::cmp::PartialEq> core::cmp::PartialEq for uuid_slug::UuidV7PayloadField<Value>
pub fn uuid_slug::UuidV7PayloadField<Value>::eq(&self, other: &uuid_slug::UuidV7PayloadField<Value>) -> bool
impl<Value: core::cmp::PartialEq> core::marker::StructuralPartialEq for uuid_slug::UuidV7PayloadField<Value>
impl<Value: core::fmt::Debug> core::fmt::Debug for uuid_slug::UuidV7PayloadField<Value>
pub fn uuid_slug::UuidV7PayloadField<Value>::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl<Value: core::marker::Copy> core::marker::Copy for uuid_slug::UuidV7PayloadField<Value>
impl<Value> core::marker::Freeze for uuid_slug::UuidV7PayloadField<Value> where Value: core::marker::Freeze
impl<Value> core::marker::Send for uuid_slug::UuidV7PayloadField<Value> where Value: core::marker::Send
impl<Value> core::marker::Sync for uuid_slug::UuidV7PayloadField<Value> where Value: core::marker::Sync
impl<Value> core::marker::Unpin for uuid_slug::UuidV7PayloadField<Value> where Value: core::marker::Unpin
impl<Value> core::marker::UnsafeUnpin for uuid_slug::UuidV7PayloadField<Value> where Value: core::marker::UnsafeUnpin
impl<Value> core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7PayloadField<Value> where Value: core::panic::unwind_safe::RefUnwindSafe
impl<Value> core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7PayloadField<Value> where Value: core::panic::unwind_safe::UnwindSafe
pub struct uuid_slug::UuidV7PayloadLayout
impl uuid_slug::UuidV7PayloadLayout
pub const fn uuid_slug::UuidV7PayloadLayout::counter_bits(self) -> u8
pub fn uuid_slug::UuidV7PayloadLayout::new(sub_millisecond_fraction_bits: u8, counter_bits: u8) -> core::result::Result<Self, uuid_slug::Error>
pub const fn uuid_slug::UuidV7PayloadLayout::sub_millisecond_fraction_bits(self) -> u8
impl core::clone::Clone for uuid_slug::UuidV7PayloadLayout
pub fn uuid_slug::UuidV7PayloadLayout::clone(&self) -> uuid_slug::UuidV7PayloadLayout
impl core::cmp::Eq for uuid_slug::UuidV7PayloadLayout
impl core::cmp::PartialEq for uuid_slug::UuidV7PayloadLayout
pub fn uuid_slug::UuidV7PayloadLayout::eq(&self, other: &uuid_slug::UuidV7PayloadLayout) -> bool
impl core::fmt::Debug for uuid_slug::UuidV7PayloadLayout
pub fn uuid_slug::UuidV7PayloadLayout::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::UuidV7PayloadLayout
impl core::marker::StructuralPartialEq for uuid_slug::UuidV7PayloadLayout
impl core::marker::Freeze for uuid_slug::UuidV7PayloadLayout
impl core::marker::Send for uuid_slug::UuidV7PayloadLayout
impl core::marker::Sync for uuid_slug::UuidV7PayloadLayout
impl core::marker::Unpin for uuid_slug::UuidV7PayloadLayout
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7PayloadLayout
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7PayloadLayout
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7PayloadLayout
pub struct uuid_slug::UuidV7PreviousMask
pub uuid_slug::UuidV7PreviousMask::mask: uuid_slug::UuidV7Mask
pub uuid_slug::UuidV7PreviousMask::timestamp_range_start_unix_ms: u64
impl uuid_slug::UuidV7PreviousMask
pub fn uuid_slug::UuidV7PreviousMask::new(mask: uuid_slug::UuidV7Mask) -> Self
impl core::marker::Freeze for uuid_slug::UuidV7PreviousMask
impl core::marker::Send for uuid_slug::UuidV7PreviousMask
impl core::marker::Sync for uuid_slug::UuidV7PreviousMask
impl core::marker::Unpin for uuid_slug::UuidV7PreviousMask
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7PreviousMask
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7PreviousMask
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7PreviousMask
pub struct uuid_slug::UuidV7Sentinel
pub uuid_slug::UuidV7Sentinel::name: alloc::string::String
pub uuid_slug::UuidV7Sentinel::plain_uuid_slug: uuid_slug::PlainUuidSlug
pub uuid_slug::UuidV7Sentinel::uuid: uuid_slug::Uuid
impl core::clone::Clone for uuid_slug::UuidV7Sentinel
pub fn uuid_slug::UuidV7Sentinel::clone(&self) -> uuid_slug::UuidV7Sentinel
impl core::fmt::Debug for uuid_slug::UuidV7Sentinel
pub fn uuid_slug::UuidV7Sentinel::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::UuidV7Sentinel
impl core::marker::Send for uuid_slug::UuidV7Sentinel
impl core::marker::Sync for uuid_slug::UuidV7Sentinel
impl core::marker::Unpin for uuid_slug::UuidV7Sentinel
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7Sentinel
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7Sentinel
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7Sentinel
pub struct uuid_slug::UuidV7TimestampWindow
pub uuid_slug::UuidV7TimestampWindow::max_timestamp_delta_ms: f64
pub uuid_slug::UuidV7TimestampWindow::reference_unix_ms: f64
impl uuid_slug::UuidV7TimestampWindow
pub fn uuid_slug::UuidV7TimestampWindow::validate_uuid_v7(self, uuid: uuid_slug::Uuid) -> core::result::Result<uuid_slug::Uuid, uuid_slug::Error>
impl core::clone::Clone for uuid_slug::UuidV7TimestampWindow
pub fn uuid_slug::UuidV7TimestampWindow::clone(&self) -> uuid_slug::UuidV7TimestampWindow
impl core::fmt::Debug for uuid_slug::UuidV7TimestampWindow
pub fn uuid_slug::UuidV7TimestampWindow::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::UuidV7TimestampWindow
impl core::marker::Freeze for uuid_slug::UuidV7TimestampWindow
impl core::marker::Send for uuid_slug::UuidV7TimestampWindow
impl core::marker::Sync for uuid_slug::UuidV7TimestampWindow
impl core::marker::Unpin for uuid_slug::UuidV7TimestampWindow
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7TimestampWindow
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7TimestampWindow
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7TimestampWindow
pub const uuid_slug::MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS: u64
pub const uuid_slug::MAX_UUID: uuid_slug::Uuid
pub const uuid_slug::MAX_UUID_V7_UNIX_MS: u64
pub const uuid_slug::NIL_UUID: uuid_slug::Uuid
pub fn uuid_slug::derive_uuid_v7_mask(mask_seed: &[u8], key_derivation_iterations: u32, diagnostic_label: &str) -> core::result::Result<uuid_slug::UuidV7Mask, uuid_slug::Error>
pub fn uuid_slug::derive_uuid_v7_mask_async(mask_seed: &[u8], key_derivation_iterations: u32, diagnostic_label: &str, cancellation: uuid_slug::UuidV7MaskDerivationCancellation) -> impl core::future::future::Future<Output = core::result::Result<uuid_slug::UuidV7Mask, uuid_slug::Error>> + core::marker::Send + use<>
pub fn uuid_slug::fill_os_random_bytes(out: &mut [u8]) -> core::result::Result<(), uuid_slug::Error>
pub fn uuid_slug::generate_uuid_v4() -> core::result::Result<uuid_slug::Uuid, uuid_slug::Error>
pub fn uuid_slug::generate_uuid_v4_into_with_random_fill(out: &mut [u8], offset: usize, fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::Error>) -> core::result::Result<(), uuid_slug::Error>
pub fn uuid_slug::generate_uuid_v4_with_random_fill(fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::Error>) -> core::result::Result<uuid_slug::Uuid, uuid_slug::Error>
pub fn uuid_slug::uuid_v7_bounds(start_unix_ms: u64, end_unix_ms: core::option::Option<u64>) -> core::result::Result<uuid_slug::UuidV7Bounds, uuid_slug::Error>
pub fn uuid_slug::uuid_v7_test_mask() -> uuid_slug::UuidV7Mask
```

## No default features

```rust
pub mod uuid_slug
#[non_exhaustive] pub enum uuid_slug::ErrorCode
pub uuid_slug::ErrorCode::Aborted
pub uuid_slug::ErrorCode::InvalidBase32Hex
pub uuid_slug::ErrorCode::InvalidBase64Url
pub uuid_slug::ErrorCode::InvalidBuffer
pub uuid_slug::ErrorCode::InvalidMask
pub uuid_slug::ErrorCode::InvalidOptions
pub uuid_slug::ErrorCode::InvalidSentinel
pub uuid_slug::ErrorCode::InvalidTimestamp
pub uuid_slug::ErrorCode::InvalidUuid
pub uuid_slug::ErrorCode::InvalidUuidSlug
pub uuid_slug::ErrorCode::InvalidUuidVersion
pub uuid_slug::ErrorCode::RngUnavailable
pub uuid_slug::ErrorCode::TimestampOutsideWindow
impl uuid_slug::ErrorCode
pub const fn uuid_slug::ErrorCode::as_str(self) -> &'static str
impl core::clone::Clone for uuid_slug::ErrorCode
pub fn uuid_slug::ErrorCode::clone(&self) -> uuid_slug::ErrorCode
impl core::cmp::Eq for uuid_slug::ErrorCode
impl core::cmp::PartialEq for uuid_slug::ErrorCode
pub fn uuid_slug::ErrorCode::eq(&self, other: &uuid_slug::ErrorCode) -> bool
impl core::fmt::Debug for uuid_slug::ErrorCode
pub fn uuid_slug::ErrorCode::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::hash::Hash for uuid_slug::ErrorCode
pub fn uuid_slug::ErrorCode::hash<__H: core::hash::Hasher>(&self, state: &mut __H)
impl core::marker::Copy for uuid_slug::ErrorCode
impl core::marker::StructuralPartialEq for uuid_slug::ErrorCode
impl core::marker::Freeze for uuid_slug::ErrorCode
impl core::marker::Send for uuid_slug::ErrorCode
impl core::marker::Sync for uuid_slug::ErrorCode
impl core::marker::Unpin for uuid_slug::ErrorCode
impl core::marker::UnsafeUnpin for uuid_slug::ErrorCode
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::ErrorCode
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::ErrorCode
pub enum uuid_slug::MaskedOrSentinelUuidV7Slug
pub uuid_slug::MaskedOrSentinelUuidV7Slug::Masked(uuid_slug::MaskedUuidV7Slug)
pub uuid_slug::MaskedOrSentinelUuidV7Slug::Sentinel(uuid_slug::PlainUuidSlug)
impl uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::as_str(&self) -> &str
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::into_string(self) -> alloc::string::String
impl core::borrow::Borrow<str> for uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::borrow(&self) -> &str
impl core::clone::Clone for uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::clone(&self) -> uuid_slug::MaskedOrSentinelUuidV7Slug
impl core::cmp::Eq for uuid_slug::MaskedOrSentinelUuidV7Slug
impl core::cmp::Ord for uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::cmp(&self, other: &uuid_slug::MaskedOrSentinelUuidV7Slug) -> core::cmp::Ordering
impl core::cmp::PartialEq for uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::eq(&self, other: &uuid_slug::MaskedOrSentinelUuidV7Slug) -> bool
impl core::cmp::PartialOrd for uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::partial_cmp(&self, other: &uuid_slug::MaskedOrSentinelUuidV7Slug) -> core::option::Option<core::cmp::Ordering>
impl core::convert::AsRef<str> for uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::as_ref(&self) -> &str
impl core::convert::From<uuid_slug::MaskedOrSentinelUuidV7Slug> for alloc::string::String
pub fn alloc::string::String::from(slug: uuid_slug::MaskedOrSentinelUuidV7Slug) -> Self
impl core::fmt::Debug for uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::fmt::Display for uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::fmt(&self, formatter: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::hash::Hash for uuid_slug::MaskedOrSentinelUuidV7Slug
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::hash<__H: core::hash::Hasher>(&self, state: &mut __H)
impl core::marker::StructuralPartialEq for uuid_slug::MaskedOrSentinelUuidV7Slug
impl core::ops::deref::Deref for uuid_slug::MaskedOrSentinelUuidV7Slug
pub type uuid_slug::MaskedOrSentinelUuidV7Slug::Target = str
pub fn uuid_slug::MaskedOrSentinelUuidV7Slug::deref(&self) -> &Self::Target
impl core::marker::Freeze for uuid_slug::MaskedOrSentinelUuidV7Slug
impl core::marker::Send for uuid_slug::MaskedOrSentinelUuidV7Slug
impl core::marker::Sync for uuid_slug::MaskedOrSentinelUuidV7Slug
impl core::marker::Unpin for uuid_slug::MaskedOrSentinelUuidV7Slug
impl core::marker::UnsafeUnpin for uuid_slug::MaskedOrSentinelUuidV7Slug
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::MaskedOrSentinelUuidV7Slug
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::MaskedOrSentinelUuidV7Slug
pub enum uuid_slug::UuidSlugAlphabet
pub uuid_slug::UuidSlugAlphabet::Base32Hex
pub uuid_slug::UuidSlugAlphabet::Base64Url
impl uuid_slug::UuidSlugAlphabet
pub const fn uuid_slug::UuidSlugAlphabet::bits_per_character(self) -> usize
pub fn uuid_slug::UuidSlugAlphabet::plain_slug_to_uuid_bytes(self, plain_uuid_slug: &str) -> core::result::Result<[u8; 16], uuid_slug::Error>
pub fn uuid_slug::UuidSlugAlphabet::plain_slug_to_uuid_bytes_into<'a>(self, plain_uuid_slug: &str, output: &'a mut [u8], output_offset: usize) -> core::result::Result<&'a mut [u8], uuid_slug::Error>
pub fn uuid_slug::UuidSlugAlphabet::uuid_bytes_to_plain_slug(self, uuid_bytes: &[u8; 16]) -> uuid_slug::PlainUuidSlug
impl core::clone::Clone for uuid_slug::UuidSlugAlphabet
pub fn uuid_slug::UuidSlugAlphabet::clone(&self) -> uuid_slug::UuidSlugAlphabet
impl core::cmp::Eq for uuid_slug::UuidSlugAlphabet
impl core::cmp::PartialEq for uuid_slug::UuidSlugAlphabet
pub fn uuid_slug::UuidSlugAlphabet::eq(&self, other: &uuid_slug::UuidSlugAlphabet) -> bool
impl core::default::Default for uuid_slug::UuidSlugAlphabet
pub fn uuid_slug::UuidSlugAlphabet::default() -> uuid_slug::UuidSlugAlphabet
impl core::fmt::Debug for uuid_slug::UuidSlugAlphabet
pub fn uuid_slug::UuidSlugAlphabet::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::UuidSlugAlphabet
impl core::marker::StructuralPartialEq for uuid_slug::UuidSlugAlphabet
impl core::marker::Freeze for uuid_slug::UuidSlugAlphabet
impl core::marker::Send for uuid_slug::UuidSlugAlphabet
impl core::marker::Sync for uuid_slug::UuidSlugAlphabet
impl core::marker::Unpin for uuid_slug::UuidSlugAlphabet
impl core::marker::UnsafeUnpin for uuid_slug::UuidSlugAlphabet
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidSlugAlphabet
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidSlugAlphabet
pub enum uuid_slug::UuidSlugMigrationFormat
pub uuid_slug::UuidSlugMigrationFormat::CurrentMaskedSlug
pub uuid_slug::UuidSlugMigrationFormat::OriginalMaskedSlug
pub uuid_slug::UuidSlugMigrationFormat::PlainUuidSlug
impl core::clone::Clone for uuid_slug::UuidSlugMigrationFormat
pub fn uuid_slug::UuidSlugMigrationFormat::clone(&self) -> uuid_slug::UuidSlugMigrationFormat
impl core::cmp::Eq for uuid_slug::UuidSlugMigrationFormat
impl core::cmp::PartialEq for uuid_slug::UuidSlugMigrationFormat
pub fn uuid_slug::UuidSlugMigrationFormat::eq(&self, other: &uuid_slug::UuidSlugMigrationFormat) -> bool
impl core::fmt::Debug for uuid_slug::UuidSlugMigrationFormat
pub fn uuid_slug::UuidSlugMigrationFormat::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::UuidSlugMigrationFormat
impl core::marker::StructuralPartialEq for uuid_slug::UuidSlugMigrationFormat
impl core::marker::Freeze for uuid_slug::UuidSlugMigrationFormat
impl core::marker::Send for uuid_slug::UuidSlugMigrationFormat
impl core::marker::Sync for uuid_slug::UuidSlugMigrationFormat
impl core::marker::Unpin for uuid_slug::UuidSlugMigrationFormat
impl core::marker::UnsafeUnpin for uuid_slug::UuidSlugMigrationFormat
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidSlugMigrationFormat
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidSlugMigrationFormat
pub enum uuid_slug::UuidV7ClockRollbackPolicy
pub uuid_slug::UuidV7ClockRollbackPolicy::Error
pub uuid_slug::UuidV7ClockRollbackPolicy::Error::tolerance_ms: u64
pub uuid_slug::UuidV7ClockRollbackPolicy::Preserve
pub uuid_slug::UuidV7ClockRollbackPolicy::Reset
pub uuid_slug::UuidV7ClockRollbackPolicy::Reset::tolerance_ms: u64
impl core::clone::Clone for uuid_slug::UuidV7ClockRollbackPolicy
pub fn uuid_slug::UuidV7ClockRollbackPolicy::clone(&self) -> uuid_slug::UuidV7ClockRollbackPolicy
impl core::cmp::Eq for uuid_slug::UuidV7ClockRollbackPolicy
impl core::cmp::PartialEq for uuid_slug::UuidV7ClockRollbackPolicy
pub fn uuid_slug::UuidV7ClockRollbackPolicy::eq(&self, other: &uuid_slug::UuidV7ClockRollbackPolicy) -> bool
impl core::default::Default for uuid_slug::UuidV7ClockRollbackPolicy
pub fn uuid_slug::UuidV7ClockRollbackPolicy::default() -> uuid_slug::UuidV7ClockRollbackPolicy
impl core::fmt::Debug for uuid_slug::UuidV7ClockRollbackPolicy
pub fn uuid_slug::UuidV7ClockRollbackPolicy::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::UuidV7ClockRollbackPolicy
impl core::marker::StructuralPartialEq for uuid_slug::UuidV7ClockRollbackPolicy
impl core::marker::Freeze for uuid_slug::UuidV7ClockRollbackPolicy
impl core::marker::Send for uuid_slug::UuidV7ClockRollbackPolicy
impl core::marker::Sync for uuid_slug::UuidV7ClockRollbackPolicy
impl core::marker::Unpin for uuid_slug::UuidV7ClockRollbackPolicy
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7ClockRollbackPolicy
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7ClockRollbackPolicy
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7ClockRollbackPolicy
pub struct uuid_slug::Error
impl uuid_slug::Error
pub const fn uuid_slug::Error::code(&self) -> uuid_slug::ErrorCode
pub const fn uuid_slug::Error::new(code: uuid_slug::ErrorCode) -> Self
pub fn uuid_slug::Error::with_source(self, source: impl core::error::Error + core::marker::Send + core::marker::Sync + 'static) -> Self
impl core::error::Error for uuid_slug::Error
pub fn uuid_slug::Error::source(&self) -> core::option::Option<&(dyn core::error::Error + 'static)>
impl core::fmt::Debug for uuid_slug::Error
pub fn uuid_slug::Error::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::fmt::Display for uuid_slug::Error
pub fn uuid_slug::Error::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::Error
impl core::marker::Send for uuid_slug::Error
impl core::marker::Sync for uuid_slug::Error
impl core::marker::Unpin for uuid_slug::Error
impl core::marker::UnsafeUnpin for uuid_slug::Error
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::Error
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::Error
pub struct uuid_slug::MaskedUuidV7Slug(_)
impl uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::as_str(&self) -> &str
pub fn uuid_slug::MaskedUuidV7Slug::into_string(self) -> alloc::string::String
impl core::borrow::Borrow<str> for uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::borrow(&self) -> &str
impl core::clone::Clone for uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::clone(&self) -> uuid_slug::MaskedUuidV7Slug
impl core::cmp::Eq for uuid_slug::MaskedUuidV7Slug
impl core::cmp::Ord for uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::cmp(&self, other: &uuid_slug::MaskedUuidV7Slug) -> core::cmp::Ordering
impl core::cmp::PartialEq for uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::eq(&self, other: &uuid_slug::MaskedUuidV7Slug) -> bool
impl core::cmp::PartialOrd for uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::partial_cmp(&self, other: &uuid_slug::MaskedUuidV7Slug) -> core::option::Option<core::cmp::Ordering>
impl core::convert::AsRef<str> for uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::as_ref(&self) -> &str
impl core::convert::From<uuid_slug::MaskedUuidV7Slug> for alloc::string::String
pub fn alloc::string::String::from(slug: uuid_slug::MaskedUuidV7Slug) -> Self
impl core::fmt::Debug for uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::fmt::Display for uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::fmt(&self, formatter: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::hash::Hash for uuid_slug::MaskedUuidV7Slug
pub fn uuid_slug::MaskedUuidV7Slug::hash<__H: core::hash::Hasher>(&self, state: &mut __H)
impl core::marker::StructuralPartialEq for uuid_slug::MaskedUuidV7Slug
impl core::ops::deref::Deref for uuid_slug::MaskedUuidV7Slug
pub type uuid_slug::MaskedUuidV7Slug::Target = str
pub fn uuid_slug::MaskedUuidV7Slug::deref(&self) -> &Self::Target
impl core::marker::Freeze for uuid_slug::MaskedUuidV7Slug
impl core::marker::Send for uuid_slug::MaskedUuidV7Slug
impl core::marker::Sync for uuid_slug::MaskedUuidV7Slug
impl core::marker::Unpin for uuid_slug::MaskedUuidV7Slug
impl core::marker::UnsafeUnpin for uuid_slug::MaskedUuidV7Slug
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::MaskedUuidV7Slug
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::MaskedUuidV7Slug
pub struct uuid_slug::PlainUuidSlug(_)
impl uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::as_str(&self) -> &str
pub fn uuid_slug::PlainUuidSlug::into_string(self) -> alloc::string::String
impl core::borrow::Borrow<str> for uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::borrow(&self) -> &str
impl core::clone::Clone for uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::clone(&self) -> uuid_slug::PlainUuidSlug
impl core::cmp::Eq for uuid_slug::PlainUuidSlug
impl core::cmp::Ord for uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::cmp(&self, other: &uuid_slug::PlainUuidSlug) -> core::cmp::Ordering
impl core::cmp::PartialEq for uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::eq(&self, other: &uuid_slug::PlainUuidSlug) -> bool
impl core::cmp::PartialOrd for uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::partial_cmp(&self, other: &uuid_slug::PlainUuidSlug) -> core::option::Option<core::cmp::Ordering>
impl core::convert::AsRef<str> for uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::as_ref(&self) -> &str
impl core::convert::From<uuid_slug::PlainUuidSlug> for alloc::string::String
pub fn alloc::string::String::from(slug: uuid_slug::PlainUuidSlug) -> Self
impl core::fmt::Debug for uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::fmt::Display for uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::fmt(&self, formatter: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::hash::Hash for uuid_slug::PlainUuidSlug
pub fn uuid_slug::PlainUuidSlug::hash<__H: core::hash::Hasher>(&self, state: &mut __H)
impl core::marker::StructuralPartialEq for uuid_slug::PlainUuidSlug
impl core::ops::deref::Deref for uuid_slug::PlainUuidSlug
pub type uuid_slug::PlainUuidSlug::Target = str
pub fn uuid_slug::PlainUuidSlug::deref(&self) -> &Self::Target
impl core::marker::Freeze for uuid_slug::PlainUuidSlug
impl core::marker::Send for uuid_slug::PlainUuidSlug
impl core::marker::Sync for uuid_slug::PlainUuidSlug
impl core::marker::Unpin for uuid_slug::PlainUuidSlug
impl core::marker::UnsafeUnpin for uuid_slug::PlainUuidSlug
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::PlainUuidSlug
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::PlainUuidSlug
pub struct uuid_slug::Uuid(_)
impl uuid_slug::Uuid
pub const fn uuid_slug::Uuid::as_uuid_bytes(&self) -> &[u8; 16]
pub fn uuid_slug::Uuid::extract_uuid_v7_payload(&self, layout: uuid_slug::UuidV7PayloadLayout) -> core::result::Result<uuid_slug::UuidV7Payload, uuid_slug::Error>
pub fn uuid_slug::Uuid::extract_uuid_v7_unix_ms(&self) -> core::result::Result<u64, uuid_slug::Error>
pub fn uuid_slug::Uuid::from_plain_uuid_slug(plain_uuid_slug: &str) -> core::result::Result<Self, uuid_slug::Error>
pub fn uuid_slug::Uuid::from_uuid_bytes(bytes: &[u8], offset: usize) -> core::result::Result<Self, uuid_slug::Error>
pub const fn uuid_slug::Uuid::from_uuid_bytes_array(bytes: [u8; 16]) -> Self
pub fn uuid_slug::Uuid::from_uuid_string(uuid_string: &str) -> core::result::Result<Self, uuid_slug::Error>
pub const fn uuid_slug::Uuid::is_rfc_uuid_variant(&self) -> bool
pub const fn uuid_slug::Uuid::is_uuid_v4(&self) -> bool
pub const fn uuid_slug::Uuid::is_uuid_v7(&self) -> bool
pub fn uuid_slug::Uuid::to_plain_uuid_slug(&self, alphabet: uuid_slug::UuidSlugAlphabet) -> uuid_slug::PlainUuidSlug
pub const fn uuid_slug::Uuid::uuid_version(&self) -> u8
pub fn uuid_slug::Uuid::write_uuid_bytes(&self, out: &mut [u8], offset: usize) -> core::result::Result<(), uuid_slug::Error>
impl core::clone::Clone for uuid_slug::Uuid
pub fn uuid_slug::Uuid::clone(&self) -> uuid_slug::Uuid
impl core::cmp::Eq for uuid_slug::Uuid
impl core::cmp::Ord for uuid_slug::Uuid
pub fn uuid_slug::Uuid::cmp(&self, other: &uuid_slug::Uuid) -> core::cmp::Ordering
impl core::cmp::PartialEq for uuid_slug::Uuid
pub fn uuid_slug::Uuid::eq(&self, other: &uuid_slug::Uuid) -> bool
impl core::cmp::PartialOrd for uuid_slug::Uuid
pub fn uuid_slug::Uuid::partial_cmp(&self, other: &uuid_slug::Uuid) -> core::option::Option<core::cmp::Ordering>
impl core::fmt::Debug for uuid_slug::Uuid
pub fn uuid_slug::Uuid::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::fmt::Display for uuid_slug::Uuid
pub fn uuid_slug::Uuid::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::hash::Hash for uuid_slug::Uuid
pub fn uuid_slug::Uuid::hash<__H: core::hash::Hasher>(&self, state: &mut __H)
impl core::marker::Copy for uuid_slug::Uuid
impl core::marker::StructuralPartialEq for uuid_slug::Uuid
impl core::str::traits::FromStr for uuid_slug::Uuid
pub type uuid_slug::Uuid::Err = uuid_slug::Error
pub fn uuid_slug::Uuid::from_str(text: &str) -> core::result::Result<Self, uuid_slug::Error>
impl core::marker::Freeze for uuid_slug::Uuid
impl core::marker::Send for uuid_slug::Uuid
impl core::marker::Sync for uuid_slug::Uuid
impl core::marker::Unpin for uuid_slug::Uuid
impl core::marker::UnsafeUnpin for uuid_slug::Uuid
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::Uuid
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::Uuid
pub struct uuid_slug::UuidSlugMigrationDecoder<'a>
impl uuid_slug::UuidSlugMigrationDecoder<'_>
pub fn uuid_slug::UuidSlugMigrationDecoder<'_>::uuid_slug_to_uuid(&self, uuid_slug: &str, format: core::option::Option<uuid_slug::UuidSlugMigrationFormat>) -> core::result::Result<uuid_slug::Uuid, uuid_slug::Error>
pub fn uuid_slug::UuidSlugMigrationDecoder<'_>::uuid_slug_to_uuid_candidates(&self, uuid_slug: &str, format: core::option::Option<uuid_slug::UuidSlugMigrationFormat>) -> core::result::Result<alloc::vec::Vec<uuid_slug::Uuid>, uuid_slug::Error>
impl<'a> core::marker::Freeze for uuid_slug::UuidSlugMigrationDecoder<'a>
impl<'a> core::marker::Send for uuid_slug::UuidSlugMigrationDecoder<'a>
impl<'a> core::marker::Sync for uuid_slug::UuidSlugMigrationDecoder<'a>
impl<'a> core::marker::Unpin for uuid_slug::UuidSlugMigrationDecoder<'a>
impl<'a> core::marker::UnsafeUnpin for uuid_slug::UuidSlugMigrationDecoder<'a>
impl<'a> !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidSlugMigrationDecoder<'a>
impl<'a> !core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidSlugMigrationDecoder<'a>
pub struct uuid_slug::UuidSlugMigrationOptions
pub uuid_slug::UuidSlugMigrationOptions::accept_original_masked_slug: bool
pub uuid_slug::UuidSlugMigrationOptions::accept_plain_uuid_slug: bool
impl core::clone::Clone for uuid_slug::UuidSlugMigrationOptions
pub fn uuid_slug::UuidSlugMigrationOptions::clone(&self) -> uuid_slug::UuidSlugMigrationOptions
impl core::default::Default for uuid_slug::UuidSlugMigrationOptions
pub fn uuid_slug::UuidSlugMigrationOptions::default() -> uuid_slug::UuidSlugMigrationOptions
impl core::fmt::Debug for uuid_slug::UuidSlugMigrationOptions
pub fn uuid_slug::UuidSlugMigrationOptions::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::UuidSlugMigrationOptions
impl core::marker::Freeze for uuid_slug::UuidSlugMigrationOptions
impl core::marker::Send for uuid_slug::UuidSlugMigrationOptions
impl core::marker::Sync for uuid_slug::UuidSlugMigrationOptions
impl core::marker::Unpin for uuid_slug::UuidSlugMigrationOptions
impl core::marker::UnsafeUnpin for uuid_slug::UuidSlugMigrationOptions
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidSlugMigrationOptions
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidSlugMigrationOptions
pub struct uuid_slug::UuidV7Bounds
pub uuid_slug::UuidV7Bounds::end_inclusive: uuid_slug::Uuid
pub uuid_slug::UuidV7Bounds::start_inclusive: uuid_slug::Uuid
impl core::clone::Clone for uuid_slug::UuidV7Bounds
pub fn uuid_slug::UuidV7Bounds::clone(&self) -> uuid_slug::UuidV7Bounds
impl core::cmp::Eq for uuid_slug::UuidV7Bounds
impl core::cmp::PartialEq for uuid_slug::UuidV7Bounds
pub fn uuid_slug::UuidV7Bounds::eq(&self, other: &uuid_slug::UuidV7Bounds) -> bool
impl core::fmt::Debug for uuid_slug::UuidV7Bounds
pub fn uuid_slug::UuidV7Bounds::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::UuidV7Bounds
impl core::marker::StructuralPartialEq for uuid_slug::UuidV7Bounds
impl core::marker::Freeze for uuid_slug::UuidV7Bounds
impl core::marker::Send for uuid_slug::UuidV7Bounds
impl core::marker::Sync for uuid_slug::UuidV7Bounds
impl core::marker::Unpin for uuid_slug::UuidV7Bounds
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7Bounds
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7Bounds
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7Bounds
pub struct uuid_slug::UuidV7Generator
impl uuid_slug::UuidV7Generator
pub fn uuid_slug::UuidV7Generator::generate_uuid_v7_into_with_random_fill(&mut self, unix_ms: f64, out: &mut [u8], offset: usize, fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::Error>) -> core::result::Result<(), uuid_slug::Error>
pub fn uuid_slug::UuidV7Generator::generate_uuid_v7_with_random_fill(&mut self, unix_ms: f64, fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::Error>) -> core::result::Result<uuid_slug::Uuid, uuid_slug::Error>
pub const fn uuid_slug::UuidV7Generator::new() -> Self
pub fn uuid_slug::UuidV7Generator::payload_layout(&self) -> uuid_slug::UuidV7PayloadLayout
pub const fn uuid_slug::UuidV7Generator::with_clock_rollback_policy(self, policy: uuid_slug::UuidV7ClockRollbackPolicy) -> Self
pub fn uuid_slug::UuidV7Generator::with_sub_millisecond_fraction_bits(self, bits: u8) -> core::result::Result<Self, uuid_slug::Error>
impl core::default::Default for uuid_slug::UuidV7Generator
pub fn uuid_slug::UuidV7Generator::default() -> uuid_slug::UuidV7Generator
impl core::fmt::Debug for uuid_slug::UuidV7Generator
pub fn uuid_slug::UuidV7Generator::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::UuidV7Generator
impl core::marker::Send for uuid_slug::UuidV7Generator
impl core::marker::Sync for uuid_slug::UuidV7Generator
impl core::marker::Unpin for uuid_slug::UuidV7Generator
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7Generator
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7Generator
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7Generator
pub struct uuid_slug::UuidV7Mask
impl uuid_slug::UuidV7Mask
pub fn uuid_slug::UuidV7Mask::diagnostic_label(&self) -> &str
pub fn uuid_slug::UuidV7Mask::from_permutation_functions(diagnostic_label: impl core::convert::Into<alloc::string::String>, mask_uuid_bytes: impl core::ops::function::Fn([u8; 16]) -> core::result::Result<[u8; 16], uuid_slug::Error> + core::marker::Send + core::marker::Sync + 'static, unmask_uuid_bytes: impl core::ops::function::Fn([u8; 16]) -> core::result::Result<[u8; 16], uuid_slug::Error> + core::marker::Send + core::marker::Sync + 'static) -> core::result::Result<Self, uuid_slug::Error>
impl core::clone::Clone for uuid_slug::UuidV7Mask
pub fn uuid_slug::UuidV7Mask::clone(&self) -> uuid_slug::UuidV7Mask
impl core::fmt::Debug for uuid_slug::UuidV7Mask
pub fn uuid_slug::UuidV7Mask::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::UuidV7Mask
impl core::marker::Send for uuid_slug::UuidV7Mask
impl core::marker::Sync for uuid_slug::UuidV7Mask
impl core::marker::Unpin for uuid_slug::UuidV7Mask
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7Mask
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7Mask
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7Mask
pub struct uuid_slug::UuidV7MaskDerivationCancellation(_)
impl uuid_slug::UuidV7MaskDerivationCancellation
pub fn uuid_slug::UuidV7MaskDerivationCancellation::cancel(&self)
pub fn uuid_slug::UuidV7MaskDerivationCancellation::is_cancelled(&self) -> bool
impl core::clone::Clone for uuid_slug::UuidV7MaskDerivationCancellation
pub fn uuid_slug::UuidV7MaskDerivationCancellation::clone(&self) -> uuid_slug::UuidV7MaskDerivationCancellation
impl core::default::Default for uuid_slug::UuidV7MaskDerivationCancellation
pub fn uuid_slug::UuidV7MaskDerivationCancellation::default() -> uuid_slug::UuidV7MaskDerivationCancellation
impl core::fmt::Debug for uuid_slug::UuidV7MaskDerivationCancellation
pub fn uuid_slug::UuidV7MaskDerivationCancellation::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::UuidV7MaskDerivationCancellation
impl core::marker::Send for uuid_slug::UuidV7MaskDerivationCancellation
impl core::marker::Sync for uuid_slug::UuidV7MaskDerivationCancellation
impl core::marker::Unpin for uuid_slug::UuidV7MaskDerivationCancellation
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7MaskDerivationCancellation
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7MaskDerivationCancellation
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7MaskDerivationCancellation
pub struct uuid_slug::UuidV7MaskingCodec
impl uuid_slug::UuidV7MaskingCodec
pub fn uuid_slug::UuidV7MaskingCodec::create_uuid_slug_migration_decoder(&self, options: uuid_slug::UuidSlugMigrationOptions) -> uuid_slug::UuidSlugMigrationDecoder<'_>
pub fn uuid_slug::UuidV7MaskingCodec::extract_masked_uuid_v7_payload(&self, masked_uuid_slug: &str, layout: uuid_slug::UuidV7PayloadLayout) -> core::result::Result<uuid_slug::UuidV7Payload, uuid_slug::Error>
pub fn uuid_slug::UuidV7MaskingCodec::masked_slug_to_uuid(&self, masked_uuid_slug: &str) -> core::result::Result<uuid_slug::Uuid, uuid_slug::Error>
pub fn uuid_slug::UuidV7MaskingCodec::new(options: uuid_slug::UuidV7MaskingCodecOptions) -> core::result::Result<Self, uuid_slug::Error>
pub fn uuid_slug::UuidV7MaskingCodec::sentinels(&self) -> &[uuid_slug::UuidV7Sentinel]
pub fn uuid_slug::UuidV7MaskingCodec::uuid_to_masked_slug(&self, uuid: uuid_slug::Uuid) -> core::result::Result<uuid_slug::MaskedOrSentinelUuidV7Slug, uuid_slug::Error>
pub fn uuid_slug::UuidV7MaskingCodec::validate_masked_uuid_v7_slug_unix_ms<'a>(&self, slug: &'a str, window: uuid_slug::UuidV7TimestampWindow) -> core::result::Result<&'a str, uuid_slug::Error>
impl core::marker::Freeze for uuid_slug::UuidV7MaskingCodec
impl core::marker::Send for uuid_slug::UuidV7MaskingCodec
impl core::marker::Sync for uuid_slug::UuidV7MaskingCodec
impl core::marker::Unpin for uuid_slug::UuidV7MaskingCodec
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7MaskingCodec
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7MaskingCodec
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7MaskingCodec
pub struct uuid_slug::UuidV7MaskingCodecOptions
pub uuid_slug::UuidV7MaskingCodecOptions::mask: uuid_slug::UuidV7Mask
pub uuid_slug::UuidV7MaskingCodecOptions::masked_slug_alphabet: uuid_slug::UuidSlugAlphabet
pub uuid_slug::UuidV7MaskingCodecOptions::previous_masks: alloc::vec::Vec<uuid_slug::UuidV7PreviousMask>
pub uuid_slug::UuidV7MaskingCodecOptions::sentinels: alloc::vec::Vec<(alloc::string::String, uuid_slug::Uuid)>
pub uuid_slug::UuidV7MaskingCodecOptions::timestamp_range_start_unix_ms: u64
impl uuid_slug::UuidV7MaskingCodecOptions
pub fn uuid_slug::UuidV7MaskingCodecOptions::new(mask: uuid_slug::UuidV7Mask) -> Self
impl core::marker::Freeze for uuid_slug::UuidV7MaskingCodecOptions
impl core::marker::Send for uuid_slug::UuidV7MaskingCodecOptions
impl core::marker::Sync for uuid_slug::UuidV7MaskingCodecOptions
impl core::marker::Unpin for uuid_slug::UuidV7MaskingCodecOptions
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7MaskingCodecOptions
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7MaskingCodecOptions
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7MaskingCodecOptions
pub struct uuid_slug::UuidV7Payload
pub uuid_slug::UuidV7Payload::counter: core::option::Option<uuid_slug::UuidV7PayloadField<u128>>
pub uuid_slug::UuidV7Payload::remaining: uuid_slug::UuidV7PayloadField<u128>
pub uuid_slug::UuidV7Payload::sub_millisecond_fraction: core::option::Option<uuid_slug::UuidV7PayloadField<u16>>
pub uuid_slug::UuidV7Payload::unix_ms: u64
impl core::clone::Clone for uuid_slug::UuidV7Payload
pub fn uuid_slug::UuidV7Payload::clone(&self) -> uuid_slug::UuidV7Payload
impl core::cmp::Eq for uuid_slug::UuidV7Payload
impl core::cmp::PartialEq for uuid_slug::UuidV7Payload
pub fn uuid_slug::UuidV7Payload::eq(&self, other: &uuid_slug::UuidV7Payload) -> bool
impl core::fmt::Debug for uuid_slug::UuidV7Payload
pub fn uuid_slug::UuidV7Payload::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::UuidV7Payload
impl core::marker::StructuralPartialEq for uuid_slug::UuidV7Payload
impl core::marker::Freeze for uuid_slug::UuidV7Payload
impl core::marker::Send for uuid_slug::UuidV7Payload
impl core::marker::Sync for uuid_slug::UuidV7Payload
impl core::marker::Unpin for uuid_slug::UuidV7Payload
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7Payload
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7Payload
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7Payload
pub struct uuid_slug::UuidV7PayloadField<Value>
pub uuid_slug::UuidV7PayloadField::bits: u8
pub uuid_slug::UuidV7PayloadField::value: Value
impl<Value: core::clone::Clone> core::clone::Clone for uuid_slug::UuidV7PayloadField<Value>
pub fn uuid_slug::UuidV7PayloadField<Value>::clone(&self) -> uuid_slug::UuidV7PayloadField<Value>
impl<Value: core::cmp::Eq> core::cmp::Eq for uuid_slug::UuidV7PayloadField<Value>
impl<Value: core::cmp::PartialEq> core::cmp::PartialEq for uuid_slug::UuidV7PayloadField<Value>
pub fn uuid_slug::UuidV7PayloadField<Value>::eq(&self, other: &uuid_slug::UuidV7PayloadField<Value>) -> bool
impl<Value: core::cmp::PartialEq> core::marker::StructuralPartialEq for uuid_slug::UuidV7PayloadField<Value>
impl<Value: core::fmt::Debug> core::fmt::Debug for uuid_slug::UuidV7PayloadField<Value>
pub fn uuid_slug::UuidV7PayloadField<Value>::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl<Value: core::marker::Copy> core::marker::Copy for uuid_slug::UuidV7PayloadField<Value>
impl<Value> core::marker::Freeze for uuid_slug::UuidV7PayloadField<Value> where Value: core::marker::Freeze
impl<Value> core::marker::Send for uuid_slug::UuidV7PayloadField<Value> where Value: core::marker::Send
impl<Value> core::marker::Sync for uuid_slug::UuidV7PayloadField<Value> where Value: core::marker::Sync
impl<Value> core::marker::Unpin for uuid_slug::UuidV7PayloadField<Value> where Value: core::marker::Unpin
impl<Value> core::marker::UnsafeUnpin for uuid_slug::UuidV7PayloadField<Value> where Value: core::marker::UnsafeUnpin
impl<Value> core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7PayloadField<Value> where Value: core::panic::unwind_safe::RefUnwindSafe
impl<Value> core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7PayloadField<Value> where Value: core::panic::unwind_safe::UnwindSafe
pub struct uuid_slug::UuidV7PayloadLayout
impl uuid_slug::UuidV7PayloadLayout
pub const fn uuid_slug::UuidV7PayloadLayout::counter_bits(self) -> u8
pub fn uuid_slug::UuidV7PayloadLayout::new(sub_millisecond_fraction_bits: u8, counter_bits: u8) -> core::result::Result<Self, uuid_slug::Error>
pub const fn uuid_slug::UuidV7PayloadLayout::sub_millisecond_fraction_bits(self) -> u8
impl core::clone::Clone for uuid_slug::UuidV7PayloadLayout
pub fn uuid_slug::UuidV7PayloadLayout::clone(&self) -> uuid_slug::UuidV7PayloadLayout
impl core::cmp::Eq for uuid_slug::UuidV7PayloadLayout
impl core::cmp::PartialEq for uuid_slug::UuidV7PayloadLayout
pub fn uuid_slug::UuidV7PayloadLayout::eq(&self, other: &uuid_slug::UuidV7PayloadLayout) -> bool
impl core::fmt::Debug for uuid_slug::UuidV7PayloadLayout
pub fn uuid_slug::UuidV7PayloadLayout::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::UuidV7PayloadLayout
impl core::marker::StructuralPartialEq for uuid_slug::UuidV7PayloadLayout
impl core::marker::Freeze for uuid_slug::UuidV7PayloadLayout
impl core::marker::Send for uuid_slug::UuidV7PayloadLayout
impl core::marker::Sync for uuid_slug::UuidV7PayloadLayout
impl core::marker::Unpin for uuid_slug::UuidV7PayloadLayout
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7PayloadLayout
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7PayloadLayout
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7PayloadLayout
pub struct uuid_slug::UuidV7PreviousMask
pub uuid_slug::UuidV7PreviousMask::mask: uuid_slug::UuidV7Mask
pub uuid_slug::UuidV7PreviousMask::timestamp_range_start_unix_ms: u64
impl uuid_slug::UuidV7PreviousMask
pub fn uuid_slug::UuidV7PreviousMask::new(mask: uuid_slug::UuidV7Mask) -> Self
impl core::marker::Freeze for uuid_slug::UuidV7PreviousMask
impl core::marker::Send for uuid_slug::UuidV7PreviousMask
impl core::marker::Sync for uuid_slug::UuidV7PreviousMask
impl core::marker::Unpin for uuid_slug::UuidV7PreviousMask
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7PreviousMask
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7PreviousMask
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7PreviousMask
pub struct uuid_slug::UuidV7Sentinel
pub uuid_slug::UuidV7Sentinel::name: alloc::string::String
pub uuid_slug::UuidV7Sentinel::plain_uuid_slug: uuid_slug::PlainUuidSlug
pub uuid_slug::UuidV7Sentinel::uuid: uuid_slug::Uuid
impl core::clone::Clone for uuid_slug::UuidV7Sentinel
pub fn uuid_slug::UuidV7Sentinel::clone(&self) -> uuid_slug::UuidV7Sentinel
impl core::fmt::Debug for uuid_slug::UuidV7Sentinel
pub fn uuid_slug::UuidV7Sentinel::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::UuidV7Sentinel
impl core::marker::Send for uuid_slug::UuidV7Sentinel
impl core::marker::Sync for uuid_slug::UuidV7Sentinel
impl core::marker::Unpin for uuid_slug::UuidV7Sentinel
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7Sentinel
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7Sentinel
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7Sentinel
pub struct uuid_slug::UuidV7TimestampWindow
pub uuid_slug::UuidV7TimestampWindow::max_timestamp_delta_ms: f64
pub uuid_slug::UuidV7TimestampWindow::reference_unix_ms: f64
impl uuid_slug::UuidV7TimestampWindow
pub fn uuid_slug::UuidV7TimestampWindow::validate_uuid_v7(self, uuid: uuid_slug::Uuid) -> core::result::Result<uuid_slug::Uuid, uuid_slug::Error>
impl core::clone::Clone for uuid_slug::UuidV7TimestampWindow
pub fn uuid_slug::UuidV7TimestampWindow::clone(&self) -> uuid_slug::UuidV7TimestampWindow
impl core::fmt::Debug for uuid_slug::UuidV7TimestampWindow
pub fn uuid_slug::UuidV7TimestampWindow::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::UuidV7TimestampWindow
impl core::marker::Freeze for uuid_slug::UuidV7TimestampWindow
impl core::marker::Send for uuid_slug::UuidV7TimestampWindow
impl core::marker::Sync for uuid_slug::UuidV7TimestampWindow
impl core::marker::Unpin for uuid_slug::UuidV7TimestampWindow
impl core::marker::UnsafeUnpin for uuid_slug::UuidV7TimestampWindow
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::UuidV7TimestampWindow
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::UuidV7TimestampWindow
pub const uuid_slug::MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS: u64
pub const uuid_slug::MAX_UUID: uuid_slug::Uuid
pub const uuid_slug::MAX_UUID_V7_UNIX_MS: u64
pub const uuid_slug::NIL_UUID: uuid_slug::Uuid
pub fn uuid_slug::derive_uuid_v7_mask(mask_seed: &[u8], key_derivation_iterations: u32, diagnostic_label: &str) -> core::result::Result<uuid_slug::UuidV7Mask, uuid_slug::Error>
pub fn uuid_slug::derive_uuid_v7_mask_async(mask_seed: &[u8], key_derivation_iterations: u32, diagnostic_label: &str, cancellation: uuid_slug::UuidV7MaskDerivationCancellation) -> impl core::future::future::Future<Output = core::result::Result<uuid_slug::UuidV7Mask, uuid_slug::Error>> + core::marker::Send + use<>
pub fn uuid_slug::generate_uuid_v4_into_with_random_fill(out: &mut [u8], offset: usize, fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::Error>) -> core::result::Result<(), uuid_slug::Error>
pub fn uuid_slug::generate_uuid_v4_with_random_fill(fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::Error>) -> core::result::Result<uuid_slug::Uuid, uuid_slug::Error>
pub fn uuid_slug::uuid_v7_bounds(start_unix_ms: u64, end_unix_ms: core::option::Option<u64>) -> core::result::Result<uuid_slug::UuidV7Bounds, uuid_slug::Error>
pub fn uuid_slug::uuid_v7_test_mask() -> uuid_slug::UuidV7Mask
```
