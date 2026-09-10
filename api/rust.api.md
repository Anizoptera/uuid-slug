# Rust packaged API

This generated baseline records consumer-visible declarations.

## All features

```rust
pub mod uuid_slug
pub mod uuid_slug::alphabet
pub enum uuid_slug::alphabet::Alphabet
pub uuid_slug::alphabet::Alphabet::Base32Hex
pub uuid_slug::alphabet::Alphabet::Base64Url
impl uuid_slug::alphabet::Alphabet
pub const fn uuid_slug::alphabet::Alphabet::bits(self) -> usize
pub fn uuid_slug::alphabet::Alphabet::decode(self, text: &str) -> core::result::Result<[u8; 16], uuid_slug::error::Error>
pub fn uuid_slug::alphabet::Alphabet::decode_to<'a>(self, text: &str, out: &'a mut [u8], offset: usize) -> core::result::Result<&'a mut [u8], uuid_slug::error::Error>
pub fn uuid_slug::alphabet::Alphabet::encode(self, bytes: &[u8; 16]) -> alloc::string::String
impl core::clone::Clone for uuid_slug::alphabet::Alphabet
pub fn uuid_slug::alphabet::Alphabet::clone(&self) -> uuid_slug::alphabet::Alphabet
impl core::cmp::Eq for uuid_slug::alphabet::Alphabet
impl core::cmp::PartialEq for uuid_slug::alphabet::Alphabet
pub fn uuid_slug::alphabet::Alphabet::eq(&self, other: &uuid_slug::alphabet::Alphabet) -> bool
impl core::default::Default for uuid_slug::alphabet::Alphabet
pub fn uuid_slug::alphabet::Alphabet::default() -> uuid_slug::alphabet::Alphabet
impl core::fmt::Debug for uuid_slug::alphabet::Alphabet
pub fn uuid_slug::alphabet::Alphabet::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::alphabet::Alphabet
impl core::marker::StructuralPartialEq for uuid_slug::alphabet::Alphabet
impl core::marker::Freeze for uuid_slug::alphabet::Alphabet
impl core::marker::Send for uuid_slug::alphabet::Alphabet
impl core::marker::Sync for uuid_slug::alphabet::Alphabet
impl core::marker::Unpin for uuid_slug::alphabet::Alphabet
impl core::marker::UnsafeUnpin for uuid_slug::alphabet::Alphabet
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::alphabet::Alphabet
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::alphabet::Alphabet
pub mod uuid_slug::codec
pub enum uuid_slug::codec::MigrationFormat
pub uuid_slug::codec::MigrationFormat::Current
pub uuid_slug::codec::MigrationFormat::Original
pub uuid_slug::codec::MigrationFormat::Plain
impl core::clone::Clone for uuid_slug::codec::MigrationFormat
pub fn uuid_slug::codec::MigrationFormat::clone(&self) -> uuid_slug::codec::MigrationFormat
impl core::cmp::Eq for uuid_slug::codec::MigrationFormat
impl core::cmp::PartialEq for uuid_slug::codec::MigrationFormat
pub fn uuid_slug::codec::MigrationFormat::eq(&self, other: &uuid_slug::codec::MigrationFormat) -> bool
impl core::fmt::Debug for uuid_slug::codec::MigrationFormat
pub fn uuid_slug::codec::MigrationFormat::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::codec::MigrationFormat
impl core::marker::StructuralPartialEq for uuid_slug::codec::MigrationFormat
impl core::marker::Freeze for uuid_slug::codec::MigrationFormat
impl core::marker::Send for uuid_slug::codec::MigrationFormat
impl core::marker::Sync for uuid_slug::codec::MigrationFormat
impl core::marker::Unpin for uuid_slug::codec::MigrationFormat
impl core::marker::UnsafeUnpin for uuid_slug::codec::MigrationFormat
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::MigrationFormat
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::MigrationFormat
pub struct uuid_slug::codec::Codec
impl uuid_slug::codec::Codec
pub fn uuid_slug::codec::Codec::masked_slug_to_uuid_v7(&self, slug: &str) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
pub fn uuid_slug::codec::Codec::migration(&self, options: uuid_slug::codec::MigrationOptions) -> uuid_slug::codec::Migration<'_>
pub fn uuid_slug::codec::Codec::new(options: uuid_slug::codec::CodecOptions) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::codec::Codec::sentinels(&self) -> &[uuid_slug::codec::Sentinel]
pub fn uuid_slug::codec::Codec::uuid_v7_to_masked_slug(&self, uuid: uuid_slug::uuid::Uuid) -> core::result::Result<alloc::string::String, uuid_slug::error::Error>
pub fn uuid_slug::codec::Codec::validate_masked_slug_fresh<'a>(&self, slug: &'a str, freshness: uuid_slug::codec::Freshness) -> core::result::Result<&'a str, uuid_slug::error::Error>
impl core::marker::Freeze for uuid_slug::codec::Codec
impl core::marker::Send for uuid_slug::codec::Codec
impl core::marker::Sync for uuid_slug::codec::Codec
impl core::marker::Unpin for uuid_slug::codec::Codec
impl core::marker::UnsafeUnpin for uuid_slug::codec::Codec
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::Codec
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::Codec
pub struct uuid_slug::codec::CodecOptions
pub uuid_slug::codec::CodecOptions::mask: uuid_slug::schema::MaskSchema
pub uuid_slug::codec::CodecOptions::masked_slug_alphabet: uuid_slug::alphabet::Alphabet
pub uuid_slug::codec::CodecOptions::previous_masks: alloc::vec::Vec<uuid_slug::schema::MaskSchema>
pub uuid_slug::codec::CodecOptions::sentinels: alloc::vec::Vec<(alloc::string::String, uuid_slug::uuid::Uuid)>
impl uuid_slug::codec::CodecOptions
pub fn uuid_slug::codec::CodecOptions::new(mask: uuid_slug::schema::MaskSchema) -> Self
impl core::marker::Freeze for uuid_slug::codec::CodecOptions
impl core::marker::Send for uuid_slug::codec::CodecOptions
impl core::marker::Sync for uuid_slug::codec::CodecOptions
impl core::marker::Unpin for uuid_slug::codec::CodecOptions
impl core::marker::UnsafeUnpin for uuid_slug::codec::CodecOptions
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::CodecOptions
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::CodecOptions
pub struct uuid_slug::codec::Freshness
pub uuid_slug::codec::Freshness::now: f64
pub uuid_slug::codec::Freshness::window_ms: f64
impl uuid_slug::codec::Freshness
pub fn uuid_slug::codec::Freshness::validate(self, uuid: uuid_slug::uuid::Uuid) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
impl core::clone::Clone for uuid_slug::codec::Freshness
pub fn uuid_slug::codec::Freshness::clone(&self) -> uuid_slug::codec::Freshness
impl core::fmt::Debug for uuid_slug::codec::Freshness
pub fn uuid_slug::codec::Freshness::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::codec::Freshness
impl core::marker::Freeze for uuid_slug::codec::Freshness
impl core::marker::Send for uuid_slug::codec::Freshness
impl core::marker::Sync for uuid_slug::codec::Freshness
impl core::marker::Unpin for uuid_slug::codec::Freshness
impl core::marker::UnsafeUnpin for uuid_slug::codec::Freshness
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::Freshness
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::Freshness
pub struct uuid_slug::codec::Migration<'a>
impl uuid_slug::codec::Migration<'_>
pub fn uuid_slug::codec::Migration<'_>::candidates(&self, slug: &str, format: core::option::Option<uuid_slug::codec::MigrationFormat>) -> core::result::Result<alloc::vec::Vec<uuid_slug::uuid::Uuid>, uuid_slug::error::Error>
pub fn uuid_slug::codec::Migration<'_>::decode(&self, slug: &str, format: core::option::Option<uuid_slug::codec::MigrationFormat>) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
impl<'a> core::marker::Freeze for uuid_slug::codec::Migration<'a>
impl<'a> core::marker::Send for uuid_slug::codec::Migration<'a>
impl<'a> core::marker::Sync for uuid_slug::codec::Migration<'a>
impl<'a> core::marker::Unpin for uuid_slug::codec::Migration<'a>
impl<'a> core::marker::UnsafeUnpin for uuid_slug::codec::Migration<'a>
impl<'a> !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::Migration<'a>
impl<'a> !core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::Migration<'a>
pub struct uuid_slug::codec::MigrationOptions
pub uuid_slug::codec::MigrationOptions::original: bool
pub uuid_slug::codec::MigrationOptions::plain: bool
impl core::clone::Clone for uuid_slug::codec::MigrationOptions
pub fn uuid_slug::codec::MigrationOptions::clone(&self) -> uuid_slug::codec::MigrationOptions
impl core::default::Default for uuid_slug::codec::MigrationOptions
pub fn uuid_slug::codec::MigrationOptions::default() -> uuid_slug::codec::MigrationOptions
impl core::fmt::Debug for uuid_slug::codec::MigrationOptions
pub fn uuid_slug::codec::MigrationOptions::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::codec::MigrationOptions
impl core::marker::Freeze for uuid_slug::codec::MigrationOptions
impl core::marker::Send for uuid_slug::codec::MigrationOptions
impl core::marker::Sync for uuid_slug::codec::MigrationOptions
impl core::marker::Unpin for uuid_slug::codec::MigrationOptions
impl core::marker::UnsafeUnpin for uuid_slug::codec::MigrationOptions
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::MigrationOptions
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::MigrationOptions
pub struct uuid_slug::codec::Sentinel
pub uuid_slug::codec::Sentinel::name: alloc::string::String
pub uuid_slug::codec::Sentinel::slug: alloc::string::String
pub uuid_slug::codec::Sentinel::uuid: uuid_slug::uuid::Uuid
impl core::clone::Clone for uuid_slug::codec::Sentinel
pub fn uuid_slug::codec::Sentinel::clone(&self) -> uuid_slug::codec::Sentinel
impl core::fmt::Debug for uuid_slug::codec::Sentinel
pub fn uuid_slug::codec::Sentinel::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::codec::Sentinel
impl core::marker::Send for uuid_slug::codec::Sentinel
impl core::marker::Sync for uuid_slug::codec::Sentinel
impl core::marker::Unpin for uuid_slug::codec::Sentinel
impl core::marker::UnsafeUnpin for uuid_slug::codec::Sentinel
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::Sentinel
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::Sentinel
pub mod uuid_slug::error
#[non_exhaustive] pub enum uuid_slug::error::Error
pub uuid_slug::error::Error::Aborted
pub uuid_slug::error::Error::Caused
pub uuid_slug::error::Error::Caused::error: alloc::boxed::Box<uuid_slug::error::Error>
pub uuid_slug::error::Error::Caused::source: alloc::boxed::Box<(dyn core::error::Error + core::marker::Send + core::marker::Sync)>
pub uuid_slug::error::Error::InvalidBase32
pub uuid_slug::error::Error::InvalidBase64Url
pub uuid_slug::error::Error::InvalidBuffer
pub uuid_slug::error::Error::InvalidMaskSchema
pub uuid_slug::error::Error::InvalidTimestamp
pub uuid_slug::error::Error::InvalidUuid
pub uuid_slug::error::Error::InvalidUuidSlug
pub uuid_slug::error::Error::InvalidUuidVersion
pub uuid_slug::error::Error::RngUnavailable
pub uuid_slug::error::Error::StaleUuid
impl uuid_slug::error::Error
pub fn uuid_slug::error::Error::code(&self) -> &'static str
pub fn uuid_slug::error::Error::with_source(self, source: impl core::error::Error + core::marker::Send + core::marker::Sync + 'static) -> Self
impl core::error::Error for uuid_slug::error::Error
pub fn uuid_slug::error::Error::source(&self) -> core::option::Option<&(dyn core::error::Error + 'static)>
impl core::fmt::Debug for uuid_slug::error::Error
pub fn uuid_slug::error::Error::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::fmt::Display for uuid_slug::error::Error
pub fn uuid_slug::error::Error::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::error::Error
impl core::marker::Send for uuid_slug::error::Error
impl core::marker::Sync for uuid_slug::error::Error
impl core::marker::Unpin for uuid_slug::error::Error
impl core::marker::UnsafeUnpin for uuid_slug::error::Error
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::error::Error
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::error::Error
pub mod uuid_slug::generation
pub struct uuid_slug::generation::UuidV7Generator
impl uuid_slug::generation::UuidV7Generator
pub fn uuid_slug::generation::UuidV7Generator::at(&self, instant: f64) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
pub fn uuid_slug::generation::UuidV7Generator::at_into_with(&self, instant: f64, out: &mut [u8], offset: usize, fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::error::Error>) -> core::result::Result<(), uuid_slug::error::Error>
pub fn uuid_slug::generation::UuidV7Generator::at_with(&self, instant: f64, fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::error::Error>) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
pub fn uuid_slug::generation::UuidV7Generator::generate(&mut self) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
pub fn uuid_slug::generation::UuidV7Generator::generate_into_with(&mut self, reading: f64, out: &mut [u8], offset: usize, fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::error::Error>) -> core::result::Result<(), uuid_slug::error::Error>
pub fn uuid_slug::generation::UuidV7Generator::generate_with(&mut self, reading: f64, fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::error::Error>) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
pub const fn uuid_slug::generation::UuidV7Generator::new() -> Self
impl core::default::Default for uuid_slug::generation::UuidV7Generator
pub fn uuid_slug::generation::UuidV7Generator::default() -> uuid_slug::generation::UuidV7Generator
impl core::fmt::Debug for uuid_slug::generation::UuidV7Generator
pub fn uuid_slug::generation::UuidV7Generator::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::generation::UuidV7Generator
impl core::marker::Send for uuid_slug::generation::UuidV7Generator
impl core::marker::Sync for uuid_slug::generation::UuidV7Generator
impl core::marker::Unpin for uuid_slug::generation::UuidV7Generator
impl core::marker::UnsafeUnpin for uuid_slug::generation::UuidV7Generator
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::generation::UuidV7Generator
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::generation::UuidV7Generator
pub const uuid_slug::generation::MAX_TIMESTAMP: u64
pub fn uuid_slug::generation::fill_os_random(out: &mut [u8]) -> core::result::Result<(), uuid_slug::error::Error>
pub fn uuid_slug::generation::uuid_v4() -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
pub fn uuid_slug::generation::uuid_v4_into_with(out: &mut [u8], offset: usize, fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::error::Error>) -> core::result::Result<(), uuid_slug::error::Error>
pub fn uuid_slug::generation::uuid_v4_with(fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::error::Error>) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
pub mod uuid_slug::schema
pub struct uuid_slug::schema::Cancellation(_)
impl uuid_slug::schema::Cancellation
pub fn uuid_slug::schema::Cancellation::cancel(&self)
pub fn uuid_slug::schema::Cancellation::is_cancelled(&self) -> bool
impl core::clone::Clone for uuid_slug::schema::Cancellation
pub fn uuid_slug::schema::Cancellation::clone(&self) -> uuid_slug::schema::Cancellation
impl core::default::Default for uuid_slug::schema::Cancellation
pub fn uuid_slug::schema::Cancellation::default() -> uuid_slug::schema::Cancellation
impl core::fmt::Debug for uuid_slug::schema::Cancellation
pub fn uuid_slug::schema::Cancellation::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::schema::Cancellation
impl core::marker::Send for uuid_slug::schema::Cancellation
impl core::marker::Sync for uuid_slug::schema::Cancellation
impl core::marker::Unpin for uuid_slug::schema::Cancellation
impl core::marker::UnsafeUnpin for uuid_slug::schema::Cancellation
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::schema::Cancellation
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::schema::Cancellation
pub struct uuid_slug::schema::MaskSchema
impl uuid_slug::schema::MaskSchema
pub fn uuid_slug::schema::MaskSchema::custom(id: impl core::convert::Into<alloc::string::String>, mix: impl core::ops::function::Fn([u8; 16], bool) -> core::result::Result<[u8; 16], uuid_slug::error::Error> + core::marker::Send + core::marker::Sync + 'static) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::schema::MaskSchema::id(&self) -> &str
pub fn uuid_slug::schema::MaskSchema::mix(&self, input: [u8; 16], forward: bool) -> core::result::Result<[u8; 16], uuid_slug::error::Error>
impl core::clone::Clone for uuid_slug::schema::MaskSchema
pub fn uuid_slug::schema::MaskSchema::clone(&self) -> uuid_slug::schema::MaskSchema
impl core::fmt::Debug for uuid_slug::schema::MaskSchema
pub fn uuid_slug::schema::MaskSchema::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::schema::MaskSchema
impl core::marker::Send for uuid_slug::schema::MaskSchema
impl core::marker::Sync for uuid_slug::schema::MaskSchema
impl core::marker::Unpin for uuid_slug::schema::MaskSchema
impl core::marker::UnsafeUnpin for uuid_slug::schema::MaskSchema
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::schema::MaskSchema
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::schema::MaskSchema
pub fn uuid_slug::schema::create_mask_schema(seed: &[u8], iterations: u32, id: &str) -> core::result::Result<uuid_slug::schema::MaskSchema, uuid_slug::error::Error>
pub fn uuid_slug::schema::create_mask_schema_async(seed: &[u8], iterations: u32, id: &str, cancellation: uuid_slug::schema::Cancellation) -> impl core::future::future::Future<Output = core::result::Result<uuid_slug::schema::MaskSchema, uuid_slug::error::Error>> + core::marker::Send + use<>
pub fn uuid_slug::schema::public_mask_schema() -> uuid_slug::schema::MaskSchema
pub mod uuid_slug::uuid
pub struct uuid_slug::uuid::Uuid(_)
impl uuid_slug::uuid::Uuid
pub const fn uuid_slug::uuid::Uuid::as_bytes(&self) -> &[u8; 16]
pub const fn uuid_slug::uuid::Uuid::from_bytes(bytes: [u8; 16]) -> Self
pub fn uuid_slug::uuid::Uuid::from_slice(bytes: &[u8], offset: usize) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::uuid::Uuid::has_entropy(&self) -> bool
pub const fn uuid_slug::uuid::Uuid::is_rfc_variant(&self) -> bool
pub const fn uuid_slug::uuid::Uuid::is_v4(&self) -> bool
pub const fn uuid_slug::uuid::Uuid::is_v7(&self) -> bool
pub fn uuid_slug::uuid::Uuid::parse(text: &str) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::uuid::Uuid::parse_slug(text: &str) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::uuid::Uuid::slug(&self, alphabet: uuid_slug::alphabet::Alphabet) -> alloc::string::String
pub fn uuid_slug::uuid::Uuid::timestamp(&self) -> core::result::Result<u64, uuid_slug::error::Error>
pub const fn uuid_slug::uuid::Uuid::version(&self) -> u8
pub fn uuid_slug::uuid::Uuid::write_into(&self, out: &mut [u8], offset: usize) -> core::result::Result<(), uuid_slug::error::Error>
impl core::clone::Clone for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::clone(&self) -> uuid_slug::uuid::Uuid
impl core::cmp::Eq for uuid_slug::uuid::Uuid
impl core::cmp::Ord for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::cmp(&self, other: &uuid_slug::uuid::Uuid) -> core::cmp::Ordering
impl core::cmp::PartialEq for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::eq(&self, other: &uuid_slug::uuid::Uuid) -> bool
impl core::cmp::PartialOrd for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::partial_cmp(&self, other: &uuid_slug::uuid::Uuid) -> core::option::Option<core::cmp::Ordering>
impl core::fmt::Debug for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::fmt::Display for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::hash::Hash for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::hash<__H: core::hash::Hasher>(&self, state: &mut __H)
impl core::marker::Copy for uuid_slug::uuid::Uuid
impl core::marker::StructuralPartialEq for uuid_slug::uuid::Uuid
impl core::str::traits::FromStr for uuid_slug::uuid::Uuid
pub type uuid_slug::uuid::Uuid::Err = uuid_slug::error::Error
pub fn uuid_slug::uuid::Uuid::from_str(text: &str) -> core::result::Result<Self, uuid_slug::error::Error>
impl core::marker::Freeze for uuid_slug::uuid::Uuid
impl core::marker::Send for uuid_slug::uuid::Uuid
impl core::marker::Sync for uuid_slug::uuid::Uuid
impl core::marker::Unpin for uuid_slug::uuid::Uuid
impl core::marker::UnsafeUnpin for uuid_slug::uuid::Uuid
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::uuid::Uuid
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::uuid::Uuid
pub enum uuid_slug::Alphabet
pub uuid_slug::Alphabet::Base32Hex
pub uuid_slug::Alphabet::Base64Url
impl uuid_slug::alphabet::Alphabet
pub const fn uuid_slug::alphabet::Alphabet::bits(self) -> usize
pub fn uuid_slug::alphabet::Alphabet::decode(self, text: &str) -> core::result::Result<[u8; 16], uuid_slug::error::Error>
pub fn uuid_slug::alphabet::Alphabet::decode_to<'a>(self, text: &str, out: &'a mut [u8], offset: usize) -> core::result::Result<&'a mut [u8], uuid_slug::error::Error>
pub fn uuid_slug::alphabet::Alphabet::encode(self, bytes: &[u8; 16]) -> alloc::string::String
impl core::clone::Clone for uuid_slug::alphabet::Alphabet
pub fn uuid_slug::alphabet::Alphabet::clone(&self) -> uuid_slug::alphabet::Alphabet
impl core::cmp::Eq for uuid_slug::alphabet::Alphabet
impl core::cmp::PartialEq for uuid_slug::alphabet::Alphabet
pub fn uuid_slug::alphabet::Alphabet::eq(&self, other: &uuid_slug::alphabet::Alphabet) -> bool
impl core::default::Default for uuid_slug::alphabet::Alphabet
pub fn uuid_slug::alphabet::Alphabet::default() -> uuid_slug::alphabet::Alphabet
impl core::fmt::Debug for uuid_slug::alphabet::Alphabet
pub fn uuid_slug::alphabet::Alphabet::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::alphabet::Alphabet
impl core::marker::StructuralPartialEq for uuid_slug::alphabet::Alphabet
impl core::marker::Freeze for uuid_slug::alphabet::Alphabet
impl core::marker::Send for uuid_slug::alphabet::Alphabet
impl core::marker::Sync for uuid_slug::alphabet::Alphabet
impl core::marker::Unpin for uuid_slug::alphabet::Alphabet
impl core::marker::UnsafeUnpin for uuid_slug::alphabet::Alphabet
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::alphabet::Alphabet
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::alphabet::Alphabet
#[non_exhaustive] pub enum uuid_slug::Error
pub uuid_slug::Error::Aborted
pub uuid_slug::Error::Caused
pub uuid_slug::Error::Caused::error: alloc::boxed::Box<uuid_slug::error::Error>
pub uuid_slug::Error::Caused::source: alloc::boxed::Box<(dyn core::error::Error + core::marker::Send + core::marker::Sync)>
pub uuid_slug::Error::InvalidBase32
pub uuid_slug::Error::InvalidBase64Url
pub uuid_slug::Error::InvalidBuffer
pub uuid_slug::Error::InvalidMaskSchema
pub uuid_slug::Error::InvalidTimestamp
pub uuid_slug::Error::InvalidUuid
pub uuid_slug::Error::InvalidUuidSlug
pub uuid_slug::Error::InvalidUuidVersion
pub uuid_slug::Error::RngUnavailable
pub uuid_slug::Error::StaleUuid
impl uuid_slug::error::Error
pub fn uuid_slug::error::Error::code(&self) -> &'static str
pub fn uuid_slug::error::Error::with_source(self, source: impl core::error::Error + core::marker::Send + core::marker::Sync + 'static) -> Self
impl core::error::Error for uuid_slug::error::Error
pub fn uuid_slug::error::Error::source(&self) -> core::option::Option<&(dyn core::error::Error + 'static)>
impl core::fmt::Debug for uuid_slug::error::Error
pub fn uuid_slug::error::Error::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::fmt::Display for uuid_slug::error::Error
pub fn uuid_slug::error::Error::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::error::Error
impl core::marker::Send for uuid_slug::error::Error
impl core::marker::Sync for uuid_slug::error::Error
impl core::marker::Unpin for uuid_slug::error::Error
impl core::marker::UnsafeUnpin for uuid_slug::error::Error
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::error::Error
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::error::Error
pub enum uuid_slug::MigrationFormat
pub uuid_slug::MigrationFormat::Current
pub uuid_slug::MigrationFormat::Original
pub uuid_slug::MigrationFormat::Plain
impl core::clone::Clone for uuid_slug::codec::MigrationFormat
pub fn uuid_slug::codec::MigrationFormat::clone(&self) -> uuid_slug::codec::MigrationFormat
impl core::cmp::Eq for uuid_slug::codec::MigrationFormat
impl core::cmp::PartialEq for uuid_slug::codec::MigrationFormat
pub fn uuid_slug::codec::MigrationFormat::eq(&self, other: &uuid_slug::codec::MigrationFormat) -> bool
impl core::fmt::Debug for uuid_slug::codec::MigrationFormat
pub fn uuid_slug::codec::MigrationFormat::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::codec::MigrationFormat
impl core::marker::StructuralPartialEq for uuid_slug::codec::MigrationFormat
impl core::marker::Freeze for uuid_slug::codec::MigrationFormat
impl core::marker::Send for uuid_slug::codec::MigrationFormat
impl core::marker::Sync for uuid_slug::codec::MigrationFormat
impl core::marker::Unpin for uuid_slug::codec::MigrationFormat
impl core::marker::UnsafeUnpin for uuid_slug::codec::MigrationFormat
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::MigrationFormat
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::MigrationFormat
pub struct uuid_slug::Codec
impl uuid_slug::codec::Codec
pub fn uuid_slug::codec::Codec::masked_slug_to_uuid_v7(&self, slug: &str) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
pub fn uuid_slug::codec::Codec::migration(&self, options: uuid_slug::codec::MigrationOptions) -> uuid_slug::codec::Migration<'_>
pub fn uuid_slug::codec::Codec::new(options: uuid_slug::codec::CodecOptions) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::codec::Codec::sentinels(&self) -> &[uuid_slug::codec::Sentinel]
pub fn uuid_slug::codec::Codec::uuid_v7_to_masked_slug(&self, uuid: uuid_slug::uuid::Uuid) -> core::result::Result<alloc::string::String, uuid_slug::error::Error>
pub fn uuid_slug::codec::Codec::validate_masked_slug_fresh<'a>(&self, slug: &'a str, freshness: uuid_slug::codec::Freshness) -> core::result::Result<&'a str, uuid_slug::error::Error>
impl core::marker::Freeze for uuid_slug::codec::Codec
impl core::marker::Send for uuid_slug::codec::Codec
impl core::marker::Sync for uuid_slug::codec::Codec
impl core::marker::Unpin for uuid_slug::codec::Codec
impl core::marker::UnsafeUnpin for uuid_slug::codec::Codec
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::Codec
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::Codec
pub struct uuid_slug::CodecOptions
pub uuid_slug::CodecOptions::mask: uuid_slug::schema::MaskSchema
pub uuid_slug::CodecOptions::masked_slug_alphabet: uuid_slug::alphabet::Alphabet
pub uuid_slug::CodecOptions::previous_masks: alloc::vec::Vec<uuid_slug::schema::MaskSchema>
pub uuid_slug::CodecOptions::sentinels: alloc::vec::Vec<(alloc::string::String, uuid_slug::uuid::Uuid)>
impl uuid_slug::codec::CodecOptions
pub fn uuid_slug::codec::CodecOptions::new(mask: uuid_slug::schema::MaskSchema) -> Self
impl core::marker::Freeze for uuid_slug::codec::CodecOptions
impl core::marker::Send for uuid_slug::codec::CodecOptions
impl core::marker::Sync for uuid_slug::codec::CodecOptions
impl core::marker::Unpin for uuid_slug::codec::CodecOptions
impl core::marker::UnsafeUnpin for uuid_slug::codec::CodecOptions
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::CodecOptions
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::CodecOptions
pub struct uuid_slug::Freshness
pub uuid_slug::Freshness::now: f64
pub uuid_slug::Freshness::window_ms: f64
impl uuid_slug::codec::Freshness
pub fn uuid_slug::codec::Freshness::validate(self, uuid: uuid_slug::uuid::Uuid) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
impl core::clone::Clone for uuid_slug::codec::Freshness
pub fn uuid_slug::codec::Freshness::clone(&self) -> uuid_slug::codec::Freshness
impl core::fmt::Debug for uuid_slug::codec::Freshness
pub fn uuid_slug::codec::Freshness::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::codec::Freshness
impl core::marker::Freeze for uuid_slug::codec::Freshness
impl core::marker::Send for uuid_slug::codec::Freshness
impl core::marker::Sync for uuid_slug::codec::Freshness
impl core::marker::Unpin for uuid_slug::codec::Freshness
impl core::marker::UnsafeUnpin for uuid_slug::codec::Freshness
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::Freshness
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::Freshness
pub struct uuid_slug::MaskSchema
impl uuid_slug::schema::MaskSchema
pub fn uuid_slug::schema::MaskSchema::custom(id: impl core::convert::Into<alloc::string::String>, mix: impl core::ops::function::Fn([u8; 16], bool) -> core::result::Result<[u8; 16], uuid_slug::error::Error> + core::marker::Send + core::marker::Sync + 'static) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::schema::MaskSchema::id(&self) -> &str
pub fn uuid_slug::schema::MaskSchema::mix(&self, input: [u8; 16], forward: bool) -> core::result::Result<[u8; 16], uuid_slug::error::Error>
impl core::clone::Clone for uuid_slug::schema::MaskSchema
pub fn uuid_slug::schema::MaskSchema::clone(&self) -> uuid_slug::schema::MaskSchema
impl core::fmt::Debug for uuid_slug::schema::MaskSchema
pub fn uuid_slug::schema::MaskSchema::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::schema::MaskSchema
impl core::marker::Send for uuid_slug::schema::MaskSchema
impl core::marker::Sync for uuid_slug::schema::MaskSchema
impl core::marker::Unpin for uuid_slug::schema::MaskSchema
impl core::marker::UnsafeUnpin for uuid_slug::schema::MaskSchema
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::schema::MaskSchema
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::schema::MaskSchema
pub struct uuid_slug::Migration<'a>
impl uuid_slug::codec::Migration<'_>
pub fn uuid_slug::codec::Migration<'_>::candidates(&self, slug: &str, format: core::option::Option<uuid_slug::codec::MigrationFormat>) -> core::result::Result<alloc::vec::Vec<uuid_slug::uuid::Uuid>, uuid_slug::error::Error>
pub fn uuid_slug::codec::Migration<'_>::decode(&self, slug: &str, format: core::option::Option<uuid_slug::codec::MigrationFormat>) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
impl<'a> core::marker::Freeze for uuid_slug::codec::Migration<'a>
impl<'a> core::marker::Send for uuid_slug::codec::Migration<'a>
impl<'a> core::marker::Sync for uuid_slug::codec::Migration<'a>
impl<'a> core::marker::Unpin for uuid_slug::codec::Migration<'a>
impl<'a> core::marker::UnsafeUnpin for uuid_slug::codec::Migration<'a>
impl<'a> !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::Migration<'a>
impl<'a> !core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::Migration<'a>
pub struct uuid_slug::MigrationOptions
pub uuid_slug::MigrationOptions::original: bool
pub uuid_slug::MigrationOptions::plain: bool
impl core::clone::Clone for uuid_slug::codec::MigrationOptions
pub fn uuid_slug::codec::MigrationOptions::clone(&self) -> uuid_slug::codec::MigrationOptions
impl core::default::Default for uuid_slug::codec::MigrationOptions
pub fn uuid_slug::codec::MigrationOptions::default() -> uuid_slug::codec::MigrationOptions
impl core::fmt::Debug for uuid_slug::codec::MigrationOptions
pub fn uuid_slug::codec::MigrationOptions::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::codec::MigrationOptions
impl core::marker::Freeze for uuid_slug::codec::MigrationOptions
impl core::marker::Send for uuid_slug::codec::MigrationOptions
impl core::marker::Sync for uuid_slug::codec::MigrationOptions
impl core::marker::Unpin for uuid_slug::codec::MigrationOptions
impl core::marker::UnsafeUnpin for uuid_slug::codec::MigrationOptions
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::MigrationOptions
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::MigrationOptions
pub struct uuid_slug::Sentinel
pub uuid_slug::Sentinel::name: alloc::string::String
pub uuid_slug::Sentinel::slug: alloc::string::String
pub uuid_slug::Sentinel::uuid: uuid_slug::uuid::Uuid
impl core::clone::Clone for uuid_slug::codec::Sentinel
pub fn uuid_slug::codec::Sentinel::clone(&self) -> uuid_slug::codec::Sentinel
impl core::fmt::Debug for uuid_slug::codec::Sentinel
pub fn uuid_slug::codec::Sentinel::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::codec::Sentinel
impl core::marker::Send for uuid_slug::codec::Sentinel
impl core::marker::Sync for uuid_slug::codec::Sentinel
impl core::marker::Unpin for uuid_slug::codec::Sentinel
impl core::marker::UnsafeUnpin for uuid_slug::codec::Sentinel
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::Sentinel
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::Sentinel
pub struct uuid_slug::Uuid(_)
impl uuid_slug::uuid::Uuid
pub const fn uuid_slug::uuid::Uuid::as_bytes(&self) -> &[u8; 16]
pub const fn uuid_slug::uuid::Uuid::from_bytes(bytes: [u8; 16]) -> Self
pub fn uuid_slug::uuid::Uuid::from_slice(bytes: &[u8], offset: usize) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::uuid::Uuid::has_entropy(&self) -> bool
pub const fn uuid_slug::uuid::Uuid::is_rfc_variant(&self) -> bool
pub const fn uuid_slug::uuid::Uuid::is_v4(&self) -> bool
pub const fn uuid_slug::uuid::Uuid::is_v7(&self) -> bool
pub fn uuid_slug::uuid::Uuid::parse(text: &str) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::uuid::Uuid::parse_slug(text: &str) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::uuid::Uuid::slug(&self, alphabet: uuid_slug::alphabet::Alphabet) -> alloc::string::String
pub fn uuid_slug::uuid::Uuid::timestamp(&self) -> core::result::Result<u64, uuid_slug::error::Error>
pub const fn uuid_slug::uuid::Uuid::version(&self) -> u8
pub fn uuid_slug::uuid::Uuid::write_into(&self, out: &mut [u8], offset: usize) -> core::result::Result<(), uuid_slug::error::Error>
impl core::clone::Clone for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::clone(&self) -> uuid_slug::uuid::Uuid
impl core::cmp::Eq for uuid_slug::uuid::Uuid
impl core::cmp::Ord for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::cmp(&self, other: &uuid_slug::uuid::Uuid) -> core::cmp::Ordering
impl core::cmp::PartialEq for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::eq(&self, other: &uuid_slug::uuid::Uuid) -> bool
impl core::cmp::PartialOrd for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::partial_cmp(&self, other: &uuid_slug::uuid::Uuid) -> core::option::Option<core::cmp::Ordering>
impl core::fmt::Debug for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::fmt::Display for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::hash::Hash for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::hash<__H: core::hash::Hasher>(&self, state: &mut __H)
impl core::marker::Copy for uuid_slug::uuid::Uuid
impl core::marker::StructuralPartialEq for uuid_slug::uuid::Uuid
impl core::str::traits::FromStr for uuid_slug::uuid::Uuid
pub type uuid_slug::uuid::Uuid::Err = uuid_slug::error::Error
pub fn uuid_slug::uuid::Uuid::from_str(text: &str) -> core::result::Result<Self, uuid_slug::error::Error>
impl core::marker::Freeze for uuid_slug::uuid::Uuid
impl core::marker::Send for uuid_slug::uuid::Uuid
impl core::marker::Sync for uuid_slug::uuid::Uuid
impl core::marker::Unpin for uuid_slug::uuid::Uuid
impl core::marker::UnsafeUnpin for uuid_slug::uuid::Uuid
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::uuid::Uuid
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::uuid::Uuid
pub fn uuid_slug::create_mask_schema(seed: &[u8], iterations: u32, id: &str) -> core::result::Result<uuid_slug::schema::MaskSchema, uuid_slug::error::Error>
pub fn uuid_slug::create_mask_schema_async(seed: &[u8], iterations: u32, id: &str, cancellation: uuid_slug::schema::Cancellation) -> impl core::future::future::Future<Output = core::result::Result<uuid_slug::schema::MaskSchema, uuid_slug::error::Error>> + core::marker::Send + use<>
pub fn uuid_slug::public_mask_schema() -> uuid_slug::schema::MaskSchema
```

## No default features

```rust
pub mod uuid_slug
pub mod uuid_slug::alphabet
pub enum uuid_slug::alphabet::Alphabet
pub uuid_slug::alphabet::Alphabet::Base32Hex
pub uuid_slug::alphabet::Alphabet::Base64Url
impl uuid_slug::alphabet::Alphabet
pub const fn uuid_slug::alphabet::Alphabet::bits(self) -> usize
pub fn uuid_slug::alphabet::Alphabet::decode(self, text: &str) -> core::result::Result<[u8; 16], uuid_slug::error::Error>
pub fn uuid_slug::alphabet::Alphabet::decode_to<'a>(self, text: &str, out: &'a mut [u8], offset: usize) -> core::result::Result<&'a mut [u8], uuid_slug::error::Error>
pub fn uuid_slug::alphabet::Alphabet::encode(self, bytes: &[u8; 16]) -> alloc::string::String
impl core::clone::Clone for uuid_slug::alphabet::Alphabet
pub fn uuid_slug::alphabet::Alphabet::clone(&self) -> uuid_slug::alphabet::Alphabet
impl core::cmp::Eq for uuid_slug::alphabet::Alphabet
impl core::cmp::PartialEq for uuid_slug::alphabet::Alphabet
pub fn uuid_slug::alphabet::Alphabet::eq(&self, other: &uuid_slug::alphabet::Alphabet) -> bool
impl core::default::Default for uuid_slug::alphabet::Alphabet
pub fn uuid_slug::alphabet::Alphabet::default() -> uuid_slug::alphabet::Alphabet
impl core::fmt::Debug for uuid_slug::alphabet::Alphabet
pub fn uuid_slug::alphabet::Alphabet::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::alphabet::Alphabet
impl core::marker::StructuralPartialEq for uuid_slug::alphabet::Alphabet
impl core::marker::Freeze for uuid_slug::alphabet::Alphabet
impl core::marker::Send for uuid_slug::alphabet::Alphabet
impl core::marker::Sync for uuid_slug::alphabet::Alphabet
impl core::marker::Unpin for uuid_slug::alphabet::Alphabet
impl core::marker::UnsafeUnpin for uuid_slug::alphabet::Alphabet
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::alphabet::Alphabet
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::alphabet::Alphabet
pub mod uuid_slug::codec
pub enum uuid_slug::codec::MigrationFormat
pub uuid_slug::codec::MigrationFormat::Current
pub uuid_slug::codec::MigrationFormat::Original
pub uuid_slug::codec::MigrationFormat::Plain
impl core::clone::Clone for uuid_slug::codec::MigrationFormat
pub fn uuid_slug::codec::MigrationFormat::clone(&self) -> uuid_slug::codec::MigrationFormat
impl core::cmp::Eq for uuid_slug::codec::MigrationFormat
impl core::cmp::PartialEq for uuid_slug::codec::MigrationFormat
pub fn uuid_slug::codec::MigrationFormat::eq(&self, other: &uuid_slug::codec::MigrationFormat) -> bool
impl core::fmt::Debug for uuid_slug::codec::MigrationFormat
pub fn uuid_slug::codec::MigrationFormat::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::codec::MigrationFormat
impl core::marker::StructuralPartialEq for uuid_slug::codec::MigrationFormat
impl core::marker::Freeze for uuid_slug::codec::MigrationFormat
impl core::marker::Send for uuid_slug::codec::MigrationFormat
impl core::marker::Sync for uuid_slug::codec::MigrationFormat
impl core::marker::Unpin for uuid_slug::codec::MigrationFormat
impl core::marker::UnsafeUnpin for uuid_slug::codec::MigrationFormat
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::MigrationFormat
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::MigrationFormat
pub struct uuid_slug::codec::Codec
impl uuid_slug::codec::Codec
pub fn uuid_slug::codec::Codec::masked_slug_to_uuid_v7(&self, slug: &str) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
pub fn uuid_slug::codec::Codec::migration(&self, options: uuid_slug::codec::MigrationOptions) -> uuid_slug::codec::Migration<'_>
pub fn uuid_slug::codec::Codec::new(options: uuid_slug::codec::CodecOptions) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::codec::Codec::sentinels(&self) -> &[uuid_slug::codec::Sentinel]
pub fn uuid_slug::codec::Codec::uuid_v7_to_masked_slug(&self, uuid: uuid_slug::uuid::Uuid) -> core::result::Result<alloc::string::String, uuid_slug::error::Error>
pub fn uuid_slug::codec::Codec::validate_masked_slug_fresh<'a>(&self, slug: &'a str, freshness: uuid_slug::codec::Freshness) -> core::result::Result<&'a str, uuid_slug::error::Error>
impl core::marker::Freeze for uuid_slug::codec::Codec
impl core::marker::Send for uuid_slug::codec::Codec
impl core::marker::Sync for uuid_slug::codec::Codec
impl core::marker::Unpin for uuid_slug::codec::Codec
impl core::marker::UnsafeUnpin for uuid_slug::codec::Codec
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::Codec
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::Codec
pub struct uuid_slug::codec::CodecOptions
pub uuid_slug::codec::CodecOptions::mask: uuid_slug::schema::MaskSchema
pub uuid_slug::codec::CodecOptions::masked_slug_alphabet: uuid_slug::alphabet::Alphabet
pub uuid_slug::codec::CodecOptions::previous_masks: alloc::vec::Vec<uuid_slug::schema::MaskSchema>
pub uuid_slug::codec::CodecOptions::sentinels: alloc::vec::Vec<(alloc::string::String, uuid_slug::uuid::Uuid)>
impl uuid_slug::codec::CodecOptions
pub fn uuid_slug::codec::CodecOptions::new(mask: uuid_slug::schema::MaskSchema) -> Self
impl core::marker::Freeze for uuid_slug::codec::CodecOptions
impl core::marker::Send for uuid_slug::codec::CodecOptions
impl core::marker::Sync for uuid_slug::codec::CodecOptions
impl core::marker::Unpin for uuid_slug::codec::CodecOptions
impl core::marker::UnsafeUnpin for uuid_slug::codec::CodecOptions
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::CodecOptions
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::CodecOptions
pub struct uuid_slug::codec::Freshness
pub uuid_slug::codec::Freshness::now: f64
pub uuid_slug::codec::Freshness::window_ms: f64
impl uuid_slug::codec::Freshness
pub fn uuid_slug::codec::Freshness::validate(self, uuid: uuid_slug::uuid::Uuid) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
impl core::clone::Clone for uuid_slug::codec::Freshness
pub fn uuid_slug::codec::Freshness::clone(&self) -> uuid_slug::codec::Freshness
impl core::fmt::Debug for uuid_slug::codec::Freshness
pub fn uuid_slug::codec::Freshness::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::codec::Freshness
impl core::marker::Freeze for uuid_slug::codec::Freshness
impl core::marker::Send for uuid_slug::codec::Freshness
impl core::marker::Sync for uuid_slug::codec::Freshness
impl core::marker::Unpin for uuid_slug::codec::Freshness
impl core::marker::UnsafeUnpin for uuid_slug::codec::Freshness
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::Freshness
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::Freshness
pub struct uuid_slug::codec::Migration<'a>
impl uuid_slug::codec::Migration<'_>
pub fn uuid_slug::codec::Migration<'_>::candidates(&self, slug: &str, format: core::option::Option<uuid_slug::codec::MigrationFormat>) -> core::result::Result<alloc::vec::Vec<uuid_slug::uuid::Uuid>, uuid_slug::error::Error>
pub fn uuid_slug::codec::Migration<'_>::decode(&self, slug: &str, format: core::option::Option<uuid_slug::codec::MigrationFormat>) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
impl<'a> core::marker::Freeze for uuid_slug::codec::Migration<'a>
impl<'a> core::marker::Send for uuid_slug::codec::Migration<'a>
impl<'a> core::marker::Sync for uuid_slug::codec::Migration<'a>
impl<'a> core::marker::Unpin for uuid_slug::codec::Migration<'a>
impl<'a> core::marker::UnsafeUnpin for uuid_slug::codec::Migration<'a>
impl<'a> !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::Migration<'a>
impl<'a> !core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::Migration<'a>
pub struct uuid_slug::codec::MigrationOptions
pub uuid_slug::codec::MigrationOptions::original: bool
pub uuid_slug::codec::MigrationOptions::plain: bool
impl core::clone::Clone for uuid_slug::codec::MigrationOptions
pub fn uuid_slug::codec::MigrationOptions::clone(&self) -> uuid_slug::codec::MigrationOptions
impl core::default::Default for uuid_slug::codec::MigrationOptions
pub fn uuid_slug::codec::MigrationOptions::default() -> uuid_slug::codec::MigrationOptions
impl core::fmt::Debug for uuid_slug::codec::MigrationOptions
pub fn uuid_slug::codec::MigrationOptions::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::codec::MigrationOptions
impl core::marker::Freeze for uuid_slug::codec::MigrationOptions
impl core::marker::Send for uuid_slug::codec::MigrationOptions
impl core::marker::Sync for uuid_slug::codec::MigrationOptions
impl core::marker::Unpin for uuid_slug::codec::MigrationOptions
impl core::marker::UnsafeUnpin for uuid_slug::codec::MigrationOptions
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::MigrationOptions
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::MigrationOptions
pub struct uuid_slug::codec::Sentinel
pub uuid_slug::codec::Sentinel::name: alloc::string::String
pub uuid_slug::codec::Sentinel::slug: alloc::string::String
pub uuid_slug::codec::Sentinel::uuid: uuid_slug::uuid::Uuid
impl core::clone::Clone for uuid_slug::codec::Sentinel
pub fn uuid_slug::codec::Sentinel::clone(&self) -> uuid_slug::codec::Sentinel
impl core::fmt::Debug for uuid_slug::codec::Sentinel
pub fn uuid_slug::codec::Sentinel::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::codec::Sentinel
impl core::marker::Send for uuid_slug::codec::Sentinel
impl core::marker::Sync for uuid_slug::codec::Sentinel
impl core::marker::Unpin for uuid_slug::codec::Sentinel
impl core::marker::UnsafeUnpin for uuid_slug::codec::Sentinel
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::Sentinel
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::Sentinel
pub mod uuid_slug::error
#[non_exhaustive] pub enum uuid_slug::error::Error
pub uuid_slug::error::Error::Aborted
pub uuid_slug::error::Error::Caused
pub uuid_slug::error::Error::Caused::error: alloc::boxed::Box<uuid_slug::error::Error>
pub uuid_slug::error::Error::Caused::source: alloc::boxed::Box<(dyn core::error::Error + core::marker::Send + core::marker::Sync)>
pub uuid_slug::error::Error::InvalidBase32
pub uuid_slug::error::Error::InvalidBase64Url
pub uuid_slug::error::Error::InvalidBuffer
pub uuid_slug::error::Error::InvalidMaskSchema
pub uuid_slug::error::Error::InvalidTimestamp
pub uuid_slug::error::Error::InvalidUuid
pub uuid_slug::error::Error::InvalidUuidSlug
pub uuid_slug::error::Error::InvalidUuidVersion
pub uuid_slug::error::Error::RngUnavailable
pub uuid_slug::error::Error::StaleUuid
impl uuid_slug::error::Error
pub fn uuid_slug::error::Error::code(&self) -> &'static str
pub fn uuid_slug::error::Error::with_source(self, source: impl core::error::Error + core::marker::Send + core::marker::Sync + 'static) -> Self
impl core::error::Error for uuid_slug::error::Error
pub fn uuid_slug::error::Error::source(&self) -> core::option::Option<&(dyn core::error::Error + 'static)>
impl core::fmt::Debug for uuid_slug::error::Error
pub fn uuid_slug::error::Error::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::fmt::Display for uuid_slug::error::Error
pub fn uuid_slug::error::Error::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::error::Error
impl core::marker::Send for uuid_slug::error::Error
impl core::marker::Sync for uuid_slug::error::Error
impl core::marker::Unpin for uuid_slug::error::Error
impl core::marker::UnsafeUnpin for uuid_slug::error::Error
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::error::Error
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::error::Error
pub mod uuid_slug::generation
pub struct uuid_slug::generation::UuidV7Generator
impl uuid_slug::generation::UuidV7Generator
pub fn uuid_slug::generation::UuidV7Generator::at_into_with(&self, instant: f64, out: &mut [u8], offset: usize, fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::error::Error>) -> core::result::Result<(), uuid_slug::error::Error>
pub fn uuid_slug::generation::UuidV7Generator::at_with(&self, instant: f64, fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::error::Error>) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
pub fn uuid_slug::generation::UuidV7Generator::generate_into_with(&mut self, reading: f64, out: &mut [u8], offset: usize, fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::error::Error>) -> core::result::Result<(), uuid_slug::error::Error>
pub fn uuid_slug::generation::UuidV7Generator::generate_with(&mut self, reading: f64, fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::error::Error>) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
pub const fn uuid_slug::generation::UuidV7Generator::new() -> Self
impl core::default::Default for uuid_slug::generation::UuidV7Generator
pub fn uuid_slug::generation::UuidV7Generator::default() -> uuid_slug::generation::UuidV7Generator
impl core::fmt::Debug for uuid_slug::generation::UuidV7Generator
pub fn uuid_slug::generation::UuidV7Generator::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::generation::UuidV7Generator
impl core::marker::Send for uuid_slug::generation::UuidV7Generator
impl core::marker::Sync for uuid_slug::generation::UuidV7Generator
impl core::marker::Unpin for uuid_slug::generation::UuidV7Generator
impl core::marker::UnsafeUnpin for uuid_slug::generation::UuidV7Generator
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::generation::UuidV7Generator
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::generation::UuidV7Generator
pub const uuid_slug::generation::MAX_TIMESTAMP: u64
pub fn uuid_slug::generation::uuid_v4_into_with(out: &mut [u8], offset: usize, fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::error::Error>) -> core::result::Result<(), uuid_slug::error::Error>
pub fn uuid_slug::generation::uuid_v4_with(fill: impl core::ops::function::FnMut(&mut [u8]) -> core::result::Result<(), uuid_slug::error::Error>) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
pub mod uuid_slug::schema
pub struct uuid_slug::schema::Cancellation(_)
impl uuid_slug::schema::Cancellation
pub fn uuid_slug::schema::Cancellation::cancel(&self)
pub fn uuid_slug::schema::Cancellation::is_cancelled(&self) -> bool
impl core::clone::Clone for uuid_slug::schema::Cancellation
pub fn uuid_slug::schema::Cancellation::clone(&self) -> uuid_slug::schema::Cancellation
impl core::default::Default for uuid_slug::schema::Cancellation
pub fn uuid_slug::schema::Cancellation::default() -> uuid_slug::schema::Cancellation
impl core::fmt::Debug for uuid_slug::schema::Cancellation
pub fn uuid_slug::schema::Cancellation::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::schema::Cancellation
impl core::marker::Send for uuid_slug::schema::Cancellation
impl core::marker::Sync for uuid_slug::schema::Cancellation
impl core::marker::Unpin for uuid_slug::schema::Cancellation
impl core::marker::UnsafeUnpin for uuid_slug::schema::Cancellation
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::schema::Cancellation
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::schema::Cancellation
pub struct uuid_slug::schema::MaskSchema
impl uuid_slug::schema::MaskSchema
pub fn uuid_slug::schema::MaskSchema::custom(id: impl core::convert::Into<alloc::string::String>, mix: impl core::ops::function::Fn([u8; 16], bool) -> core::result::Result<[u8; 16], uuid_slug::error::Error> + core::marker::Send + core::marker::Sync + 'static) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::schema::MaskSchema::id(&self) -> &str
pub fn uuid_slug::schema::MaskSchema::mix(&self, input: [u8; 16], forward: bool) -> core::result::Result<[u8; 16], uuid_slug::error::Error>
impl core::clone::Clone for uuid_slug::schema::MaskSchema
pub fn uuid_slug::schema::MaskSchema::clone(&self) -> uuid_slug::schema::MaskSchema
impl core::fmt::Debug for uuid_slug::schema::MaskSchema
pub fn uuid_slug::schema::MaskSchema::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::schema::MaskSchema
impl core::marker::Send for uuid_slug::schema::MaskSchema
impl core::marker::Sync for uuid_slug::schema::MaskSchema
impl core::marker::Unpin for uuid_slug::schema::MaskSchema
impl core::marker::UnsafeUnpin for uuid_slug::schema::MaskSchema
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::schema::MaskSchema
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::schema::MaskSchema
pub fn uuid_slug::schema::create_mask_schema(seed: &[u8], iterations: u32, id: &str) -> core::result::Result<uuid_slug::schema::MaskSchema, uuid_slug::error::Error>
pub fn uuid_slug::schema::create_mask_schema_async(seed: &[u8], iterations: u32, id: &str, cancellation: uuid_slug::schema::Cancellation) -> impl core::future::future::Future<Output = core::result::Result<uuid_slug::schema::MaskSchema, uuid_slug::error::Error>> + core::marker::Send + use<>
pub fn uuid_slug::schema::public_mask_schema() -> uuid_slug::schema::MaskSchema
pub mod uuid_slug::uuid
pub struct uuid_slug::uuid::Uuid(_)
impl uuid_slug::uuid::Uuid
pub const fn uuid_slug::uuid::Uuid::as_bytes(&self) -> &[u8; 16]
pub const fn uuid_slug::uuid::Uuid::from_bytes(bytes: [u8; 16]) -> Self
pub fn uuid_slug::uuid::Uuid::from_slice(bytes: &[u8], offset: usize) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::uuid::Uuid::has_entropy(&self) -> bool
pub const fn uuid_slug::uuid::Uuid::is_rfc_variant(&self) -> bool
pub const fn uuid_slug::uuid::Uuid::is_v4(&self) -> bool
pub const fn uuid_slug::uuid::Uuid::is_v7(&self) -> bool
pub fn uuid_slug::uuid::Uuid::parse(text: &str) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::uuid::Uuid::parse_slug(text: &str) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::uuid::Uuid::slug(&self, alphabet: uuid_slug::alphabet::Alphabet) -> alloc::string::String
pub fn uuid_slug::uuid::Uuid::timestamp(&self) -> core::result::Result<u64, uuid_slug::error::Error>
pub const fn uuid_slug::uuid::Uuid::version(&self) -> u8
pub fn uuid_slug::uuid::Uuid::write_into(&self, out: &mut [u8], offset: usize) -> core::result::Result<(), uuid_slug::error::Error>
impl core::clone::Clone for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::clone(&self) -> uuid_slug::uuid::Uuid
impl core::cmp::Eq for uuid_slug::uuid::Uuid
impl core::cmp::Ord for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::cmp(&self, other: &uuid_slug::uuid::Uuid) -> core::cmp::Ordering
impl core::cmp::PartialEq for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::eq(&self, other: &uuid_slug::uuid::Uuid) -> bool
impl core::cmp::PartialOrd for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::partial_cmp(&self, other: &uuid_slug::uuid::Uuid) -> core::option::Option<core::cmp::Ordering>
impl core::fmt::Debug for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::fmt::Display for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::hash::Hash for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::hash<__H: core::hash::Hasher>(&self, state: &mut __H)
impl core::marker::Copy for uuid_slug::uuid::Uuid
impl core::marker::StructuralPartialEq for uuid_slug::uuid::Uuid
impl core::str::traits::FromStr for uuid_slug::uuid::Uuid
pub type uuid_slug::uuid::Uuid::Err = uuid_slug::error::Error
pub fn uuid_slug::uuid::Uuid::from_str(text: &str) -> core::result::Result<Self, uuid_slug::error::Error>
impl core::marker::Freeze for uuid_slug::uuid::Uuid
impl core::marker::Send for uuid_slug::uuid::Uuid
impl core::marker::Sync for uuid_slug::uuid::Uuid
impl core::marker::Unpin for uuid_slug::uuid::Uuid
impl core::marker::UnsafeUnpin for uuid_slug::uuid::Uuid
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::uuid::Uuid
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::uuid::Uuid
pub enum uuid_slug::Alphabet
pub uuid_slug::Alphabet::Base32Hex
pub uuid_slug::Alphabet::Base64Url
impl uuid_slug::alphabet::Alphabet
pub const fn uuid_slug::alphabet::Alphabet::bits(self) -> usize
pub fn uuid_slug::alphabet::Alphabet::decode(self, text: &str) -> core::result::Result<[u8; 16], uuid_slug::error::Error>
pub fn uuid_slug::alphabet::Alphabet::decode_to<'a>(self, text: &str, out: &'a mut [u8], offset: usize) -> core::result::Result<&'a mut [u8], uuid_slug::error::Error>
pub fn uuid_slug::alphabet::Alphabet::encode(self, bytes: &[u8; 16]) -> alloc::string::String
impl core::clone::Clone for uuid_slug::alphabet::Alphabet
pub fn uuid_slug::alphabet::Alphabet::clone(&self) -> uuid_slug::alphabet::Alphabet
impl core::cmp::Eq for uuid_slug::alphabet::Alphabet
impl core::cmp::PartialEq for uuid_slug::alphabet::Alphabet
pub fn uuid_slug::alphabet::Alphabet::eq(&self, other: &uuid_slug::alphabet::Alphabet) -> bool
impl core::default::Default for uuid_slug::alphabet::Alphabet
pub fn uuid_slug::alphabet::Alphabet::default() -> uuid_slug::alphabet::Alphabet
impl core::fmt::Debug for uuid_slug::alphabet::Alphabet
pub fn uuid_slug::alphabet::Alphabet::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::alphabet::Alphabet
impl core::marker::StructuralPartialEq for uuid_slug::alphabet::Alphabet
impl core::marker::Freeze for uuid_slug::alphabet::Alphabet
impl core::marker::Send for uuid_slug::alphabet::Alphabet
impl core::marker::Sync for uuid_slug::alphabet::Alphabet
impl core::marker::Unpin for uuid_slug::alphabet::Alphabet
impl core::marker::UnsafeUnpin for uuid_slug::alphabet::Alphabet
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::alphabet::Alphabet
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::alphabet::Alphabet
#[non_exhaustive] pub enum uuid_slug::Error
pub uuid_slug::Error::Aborted
pub uuid_slug::Error::Caused
pub uuid_slug::Error::Caused::error: alloc::boxed::Box<uuid_slug::error::Error>
pub uuid_slug::Error::Caused::source: alloc::boxed::Box<(dyn core::error::Error + core::marker::Send + core::marker::Sync)>
pub uuid_slug::Error::InvalidBase32
pub uuid_slug::Error::InvalidBase64Url
pub uuid_slug::Error::InvalidBuffer
pub uuid_slug::Error::InvalidMaskSchema
pub uuid_slug::Error::InvalidTimestamp
pub uuid_slug::Error::InvalidUuid
pub uuid_slug::Error::InvalidUuidSlug
pub uuid_slug::Error::InvalidUuidVersion
pub uuid_slug::Error::RngUnavailable
pub uuid_slug::Error::StaleUuid
impl uuid_slug::error::Error
pub fn uuid_slug::error::Error::code(&self) -> &'static str
pub fn uuid_slug::error::Error::with_source(self, source: impl core::error::Error + core::marker::Send + core::marker::Sync + 'static) -> Self
impl core::error::Error for uuid_slug::error::Error
pub fn uuid_slug::error::Error::source(&self) -> core::option::Option<&(dyn core::error::Error + 'static)>
impl core::fmt::Debug for uuid_slug::error::Error
pub fn uuid_slug::error::Error::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::fmt::Display for uuid_slug::error::Error
pub fn uuid_slug::error::Error::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::error::Error
impl core::marker::Send for uuid_slug::error::Error
impl core::marker::Sync for uuid_slug::error::Error
impl core::marker::Unpin for uuid_slug::error::Error
impl core::marker::UnsafeUnpin for uuid_slug::error::Error
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::error::Error
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::error::Error
pub enum uuid_slug::MigrationFormat
pub uuid_slug::MigrationFormat::Current
pub uuid_slug::MigrationFormat::Original
pub uuid_slug::MigrationFormat::Plain
impl core::clone::Clone for uuid_slug::codec::MigrationFormat
pub fn uuid_slug::codec::MigrationFormat::clone(&self) -> uuid_slug::codec::MigrationFormat
impl core::cmp::Eq for uuid_slug::codec::MigrationFormat
impl core::cmp::PartialEq for uuid_slug::codec::MigrationFormat
pub fn uuid_slug::codec::MigrationFormat::eq(&self, other: &uuid_slug::codec::MigrationFormat) -> bool
impl core::fmt::Debug for uuid_slug::codec::MigrationFormat
pub fn uuid_slug::codec::MigrationFormat::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::codec::MigrationFormat
impl core::marker::StructuralPartialEq for uuid_slug::codec::MigrationFormat
impl core::marker::Freeze for uuid_slug::codec::MigrationFormat
impl core::marker::Send for uuid_slug::codec::MigrationFormat
impl core::marker::Sync for uuid_slug::codec::MigrationFormat
impl core::marker::Unpin for uuid_slug::codec::MigrationFormat
impl core::marker::UnsafeUnpin for uuid_slug::codec::MigrationFormat
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::MigrationFormat
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::MigrationFormat
pub struct uuid_slug::Codec
impl uuid_slug::codec::Codec
pub fn uuid_slug::codec::Codec::masked_slug_to_uuid_v7(&self, slug: &str) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
pub fn uuid_slug::codec::Codec::migration(&self, options: uuid_slug::codec::MigrationOptions) -> uuid_slug::codec::Migration<'_>
pub fn uuid_slug::codec::Codec::new(options: uuid_slug::codec::CodecOptions) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::codec::Codec::sentinels(&self) -> &[uuid_slug::codec::Sentinel]
pub fn uuid_slug::codec::Codec::uuid_v7_to_masked_slug(&self, uuid: uuid_slug::uuid::Uuid) -> core::result::Result<alloc::string::String, uuid_slug::error::Error>
pub fn uuid_slug::codec::Codec::validate_masked_slug_fresh<'a>(&self, slug: &'a str, freshness: uuid_slug::codec::Freshness) -> core::result::Result<&'a str, uuid_slug::error::Error>
impl core::marker::Freeze for uuid_slug::codec::Codec
impl core::marker::Send for uuid_slug::codec::Codec
impl core::marker::Sync for uuid_slug::codec::Codec
impl core::marker::Unpin for uuid_slug::codec::Codec
impl core::marker::UnsafeUnpin for uuid_slug::codec::Codec
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::Codec
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::Codec
pub struct uuid_slug::CodecOptions
pub uuid_slug::CodecOptions::mask: uuid_slug::schema::MaskSchema
pub uuid_slug::CodecOptions::masked_slug_alphabet: uuid_slug::alphabet::Alphabet
pub uuid_slug::CodecOptions::previous_masks: alloc::vec::Vec<uuid_slug::schema::MaskSchema>
pub uuid_slug::CodecOptions::sentinels: alloc::vec::Vec<(alloc::string::String, uuid_slug::uuid::Uuid)>
impl uuid_slug::codec::CodecOptions
pub fn uuid_slug::codec::CodecOptions::new(mask: uuid_slug::schema::MaskSchema) -> Self
impl core::marker::Freeze for uuid_slug::codec::CodecOptions
impl core::marker::Send for uuid_slug::codec::CodecOptions
impl core::marker::Sync for uuid_slug::codec::CodecOptions
impl core::marker::Unpin for uuid_slug::codec::CodecOptions
impl core::marker::UnsafeUnpin for uuid_slug::codec::CodecOptions
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::CodecOptions
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::CodecOptions
pub struct uuid_slug::Freshness
pub uuid_slug::Freshness::now: f64
pub uuid_slug::Freshness::window_ms: f64
impl uuid_slug::codec::Freshness
pub fn uuid_slug::codec::Freshness::validate(self, uuid: uuid_slug::uuid::Uuid) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
impl core::clone::Clone for uuid_slug::codec::Freshness
pub fn uuid_slug::codec::Freshness::clone(&self) -> uuid_slug::codec::Freshness
impl core::fmt::Debug for uuid_slug::codec::Freshness
pub fn uuid_slug::codec::Freshness::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::codec::Freshness
impl core::marker::Freeze for uuid_slug::codec::Freshness
impl core::marker::Send for uuid_slug::codec::Freshness
impl core::marker::Sync for uuid_slug::codec::Freshness
impl core::marker::Unpin for uuid_slug::codec::Freshness
impl core::marker::UnsafeUnpin for uuid_slug::codec::Freshness
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::Freshness
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::Freshness
pub struct uuid_slug::MaskSchema
impl uuid_slug::schema::MaskSchema
pub fn uuid_slug::schema::MaskSchema::custom(id: impl core::convert::Into<alloc::string::String>, mix: impl core::ops::function::Fn([u8; 16], bool) -> core::result::Result<[u8; 16], uuid_slug::error::Error> + core::marker::Send + core::marker::Sync + 'static) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::schema::MaskSchema::id(&self) -> &str
pub fn uuid_slug::schema::MaskSchema::mix(&self, input: [u8; 16], forward: bool) -> core::result::Result<[u8; 16], uuid_slug::error::Error>
impl core::clone::Clone for uuid_slug::schema::MaskSchema
pub fn uuid_slug::schema::MaskSchema::clone(&self) -> uuid_slug::schema::MaskSchema
impl core::fmt::Debug for uuid_slug::schema::MaskSchema
pub fn uuid_slug::schema::MaskSchema::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::schema::MaskSchema
impl core::marker::Send for uuid_slug::schema::MaskSchema
impl core::marker::Sync for uuid_slug::schema::MaskSchema
impl core::marker::Unpin for uuid_slug::schema::MaskSchema
impl core::marker::UnsafeUnpin for uuid_slug::schema::MaskSchema
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::schema::MaskSchema
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::schema::MaskSchema
pub struct uuid_slug::Migration<'a>
impl uuid_slug::codec::Migration<'_>
pub fn uuid_slug::codec::Migration<'_>::candidates(&self, slug: &str, format: core::option::Option<uuid_slug::codec::MigrationFormat>) -> core::result::Result<alloc::vec::Vec<uuid_slug::uuid::Uuid>, uuid_slug::error::Error>
pub fn uuid_slug::codec::Migration<'_>::decode(&self, slug: &str, format: core::option::Option<uuid_slug::codec::MigrationFormat>) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
impl<'a> core::marker::Freeze for uuid_slug::codec::Migration<'a>
impl<'a> core::marker::Send for uuid_slug::codec::Migration<'a>
impl<'a> core::marker::Sync for uuid_slug::codec::Migration<'a>
impl<'a> core::marker::Unpin for uuid_slug::codec::Migration<'a>
impl<'a> core::marker::UnsafeUnpin for uuid_slug::codec::Migration<'a>
impl<'a> !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::Migration<'a>
impl<'a> !core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::Migration<'a>
pub struct uuid_slug::MigrationOptions
pub uuid_slug::MigrationOptions::original: bool
pub uuid_slug::MigrationOptions::plain: bool
impl core::clone::Clone for uuid_slug::codec::MigrationOptions
pub fn uuid_slug::codec::MigrationOptions::clone(&self) -> uuid_slug::codec::MigrationOptions
impl core::default::Default for uuid_slug::codec::MigrationOptions
pub fn uuid_slug::codec::MigrationOptions::default() -> uuid_slug::codec::MigrationOptions
impl core::fmt::Debug for uuid_slug::codec::MigrationOptions
pub fn uuid_slug::codec::MigrationOptions::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::codec::MigrationOptions
impl core::marker::Freeze for uuid_slug::codec::MigrationOptions
impl core::marker::Send for uuid_slug::codec::MigrationOptions
impl core::marker::Sync for uuid_slug::codec::MigrationOptions
impl core::marker::Unpin for uuid_slug::codec::MigrationOptions
impl core::marker::UnsafeUnpin for uuid_slug::codec::MigrationOptions
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::MigrationOptions
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::MigrationOptions
pub struct uuid_slug::Sentinel
pub uuid_slug::Sentinel::name: alloc::string::String
pub uuid_slug::Sentinel::slug: alloc::string::String
pub uuid_slug::Sentinel::uuid: uuid_slug::uuid::Uuid
impl core::clone::Clone for uuid_slug::codec::Sentinel
pub fn uuid_slug::codec::Sentinel::clone(&self) -> uuid_slug::codec::Sentinel
impl core::fmt::Debug for uuid_slug::codec::Sentinel
pub fn uuid_slug::codec::Sentinel::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::codec::Sentinel
impl core::marker::Send for uuid_slug::codec::Sentinel
impl core::marker::Sync for uuid_slug::codec::Sentinel
impl core::marker::Unpin for uuid_slug::codec::Sentinel
impl core::marker::UnsafeUnpin for uuid_slug::codec::Sentinel
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::codec::Sentinel
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::codec::Sentinel
pub struct uuid_slug::Uuid(_)
impl uuid_slug::uuid::Uuid
pub const fn uuid_slug::uuid::Uuid::as_bytes(&self) -> &[u8; 16]
pub const fn uuid_slug::uuid::Uuid::from_bytes(bytes: [u8; 16]) -> Self
pub fn uuid_slug::uuid::Uuid::from_slice(bytes: &[u8], offset: usize) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::uuid::Uuid::has_entropy(&self) -> bool
pub const fn uuid_slug::uuid::Uuid::is_rfc_variant(&self) -> bool
pub const fn uuid_slug::uuid::Uuid::is_v4(&self) -> bool
pub const fn uuid_slug::uuid::Uuid::is_v7(&self) -> bool
pub fn uuid_slug::uuid::Uuid::parse(text: &str) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::uuid::Uuid::parse_slug(text: &str) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::uuid::Uuid::slug(&self, alphabet: uuid_slug::alphabet::Alphabet) -> alloc::string::String
pub fn uuid_slug::uuid::Uuid::timestamp(&self) -> core::result::Result<u64, uuid_slug::error::Error>
pub const fn uuid_slug::uuid::Uuid::version(&self) -> u8
pub fn uuid_slug::uuid::Uuid::write_into(&self, out: &mut [u8], offset: usize) -> core::result::Result<(), uuid_slug::error::Error>
impl core::clone::Clone for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::clone(&self) -> uuid_slug::uuid::Uuid
impl core::cmp::Eq for uuid_slug::uuid::Uuid
impl core::cmp::Ord for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::cmp(&self, other: &uuid_slug::uuid::Uuid) -> core::cmp::Ordering
impl core::cmp::PartialEq for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::eq(&self, other: &uuid_slug::uuid::Uuid) -> bool
impl core::cmp::PartialOrd for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::partial_cmp(&self, other: &uuid_slug::uuid::Uuid) -> core::option::Option<core::cmp::Ordering>
impl core::fmt::Debug for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::fmt::Display for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::hash::Hash for uuid_slug::uuid::Uuid
pub fn uuid_slug::uuid::Uuid::hash<__H: core::hash::Hasher>(&self, state: &mut __H)
impl core::marker::Copy for uuid_slug::uuid::Uuid
impl core::marker::StructuralPartialEq for uuid_slug::uuid::Uuid
impl core::str::traits::FromStr for uuid_slug::uuid::Uuid
pub type uuid_slug::uuid::Uuid::Err = uuid_slug::error::Error
pub fn uuid_slug::uuid::Uuid::from_str(text: &str) -> core::result::Result<Self, uuid_slug::error::Error>
impl core::marker::Freeze for uuid_slug::uuid::Uuid
impl core::marker::Send for uuid_slug::uuid::Uuid
impl core::marker::Sync for uuid_slug::uuid::Uuid
impl core::marker::Unpin for uuid_slug::uuid::Uuid
impl core::marker::UnsafeUnpin for uuid_slug::uuid::Uuid
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::uuid::Uuid
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::uuid::Uuid
pub fn uuid_slug::create_mask_schema(seed: &[u8], iterations: u32, id: &str) -> core::result::Result<uuid_slug::schema::MaskSchema, uuid_slug::error::Error>
pub fn uuid_slug::create_mask_schema_async(seed: &[u8], iterations: u32, id: &str, cancellation: uuid_slug::schema::Cancellation) -> impl core::future::future::Future<Output = core::result::Result<uuid_slug::schema::MaskSchema, uuid_slug::error::Error>> + core::marker::Send + use<>
pub fn uuid_slug::public_mask_schema() -> uuid_slug::schema::MaskSchema
```
