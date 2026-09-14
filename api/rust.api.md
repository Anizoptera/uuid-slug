# Rust packaged API

This generated baseline records packaged API signatures for compatibility checks.

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
pub mod uuid_slug::error
#[non_exhaustive] pub enum uuid_slug::error::ErrorCode
pub uuid_slug::error::ErrorCode::Aborted
pub uuid_slug::error::ErrorCode::InvalidBase32Hex
pub uuid_slug::error::ErrorCode::InvalidBase64Url
pub uuid_slug::error::ErrorCode::InvalidBuffer
pub uuid_slug::error::ErrorCode::InvalidMask
pub uuid_slug::error::ErrorCode::InvalidSentinel
pub uuid_slug::error::ErrorCode::InvalidTimestamp
pub uuid_slug::error::ErrorCode::InvalidUuid
pub uuid_slug::error::ErrorCode::InvalidUuidSlug
pub uuid_slug::error::ErrorCode::InvalidUuidVersion
pub uuid_slug::error::ErrorCode::RngUnavailable
pub uuid_slug::error::ErrorCode::TimestampOutsideWindow
impl uuid_slug::error::ErrorCode
pub const fn uuid_slug::error::ErrorCode::as_str(self) -> &'static str
impl core::clone::Clone for uuid_slug::error::ErrorCode
pub fn uuid_slug::error::ErrorCode::clone(&self) -> uuid_slug::error::ErrorCode
impl core::cmp::Eq for uuid_slug::error::ErrorCode
impl core::cmp::PartialEq for uuid_slug::error::ErrorCode
pub fn uuid_slug::error::ErrorCode::eq(&self, other: &uuid_slug::error::ErrorCode) -> bool
impl core::fmt::Debug for uuid_slug::error::ErrorCode
pub fn uuid_slug::error::ErrorCode::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::hash::Hash for uuid_slug::error::ErrorCode
pub fn uuid_slug::error::ErrorCode::hash<__H: core::hash::Hasher>(&self, state: &mut __H)
impl core::marker::Copy for uuid_slug::error::ErrorCode
impl core::marker::StructuralPartialEq for uuid_slug::error::ErrorCode
impl core::marker::Freeze for uuid_slug::error::ErrorCode
impl core::marker::Send for uuid_slug::error::ErrorCode
impl core::marker::Sync for uuid_slug::error::ErrorCode
impl core::marker::Unpin for uuid_slug::error::ErrorCode
impl core::marker::UnsafeUnpin for uuid_slug::error::ErrorCode
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::error::ErrorCode
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::error::ErrorCode
pub struct uuid_slug::error::Error
impl uuid_slug::error::Error
pub const fn uuid_slug::error::Error::code(&self) -> uuid_slug::error::ErrorCode
pub const fn uuid_slug::error::Error::new(code: uuid_slug::error::ErrorCode) -> Self
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
pub mod uuid_slug::mask
pub struct uuid_slug::mask::Cancellation(_)
impl uuid_slug::mask::Cancellation
pub fn uuid_slug::mask::Cancellation::cancel(&self)
pub fn uuid_slug::mask::Cancellation::is_cancelled(&self) -> bool
impl core::clone::Clone for uuid_slug::mask::Cancellation
pub fn uuid_slug::mask::Cancellation::clone(&self) -> uuid_slug::mask::Cancellation
impl core::default::Default for uuid_slug::mask::Cancellation
pub fn uuid_slug::mask::Cancellation::default() -> uuid_slug::mask::Cancellation
impl core::fmt::Debug for uuid_slug::mask::Cancellation
pub fn uuid_slug::mask::Cancellation::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::mask::Cancellation
impl core::marker::Send for uuid_slug::mask::Cancellation
impl core::marker::Sync for uuid_slug::mask::Cancellation
impl core::marker::Unpin for uuid_slug::mask::Cancellation
impl core::marker::UnsafeUnpin for uuid_slug::mask::Cancellation
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::mask::Cancellation
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::mask::Cancellation
pub struct uuid_slug::mask::Mask
impl uuid_slug::mask::Mask
pub fn uuid_slug::mask::Mask::custom(label: impl core::convert::Into<alloc::string::String>, mask: impl core::ops::function::Fn([u8; 16]) -> core::result::Result<[u8; 16], uuid_slug::error::Error> + core::marker::Send + core::marker::Sync + 'static, unmask: impl core::ops::function::Fn([u8; 16]) -> core::result::Result<[u8; 16], uuid_slug::error::Error> + core::marker::Send + core::marker::Sync + 'static) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::mask::Mask::label(&self) -> &str
impl core::clone::Clone for uuid_slug::mask::Mask
pub fn uuid_slug::mask::Mask::clone(&self) -> uuid_slug::mask::Mask
impl core::fmt::Debug for uuid_slug::mask::Mask
pub fn uuid_slug::mask::Mask::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::mask::Mask
impl core::marker::Send for uuid_slug::mask::Mask
impl core::marker::Sync for uuid_slug::mask::Mask
impl core::marker::Unpin for uuid_slug::mask::Mask
impl core::marker::UnsafeUnpin for uuid_slug::mask::Mask
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::mask::Mask
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::mask::Mask
pub fn uuid_slug::mask::create_mask(seed: &[u8], iterations: u32, label: &str) -> core::result::Result<uuid_slug::mask::Mask, uuid_slug::error::Error>
pub fn uuid_slug::mask::create_mask_async(seed: &[u8], iterations: u32, label: &str, cancellation: uuid_slug::mask::Cancellation) -> impl core::future::future::Future<Output = core::result::Result<uuid_slug::mask::Mask, uuid_slug::error::Error>> + core::marker::Send + use<>
pub fn uuid_slug::mask::public_mask() -> uuid_slug::mask::Mask
pub mod uuid_slug::masking_codec
pub enum uuid_slug::masking_codec::MigrationFormat
pub uuid_slug::masking_codec::MigrationFormat::Current
pub uuid_slug::masking_codec::MigrationFormat::Original
pub uuid_slug::masking_codec::MigrationFormat::Plain
impl core::clone::Clone for uuid_slug::masking_codec::MigrationFormat
pub fn uuid_slug::masking_codec::MigrationFormat::clone(&self) -> uuid_slug::masking_codec::MigrationFormat
impl core::cmp::Eq for uuid_slug::masking_codec::MigrationFormat
impl core::cmp::PartialEq for uuid_slug::masking_codec::MigrationFormat
pub fn uuid_slug::masking_codec::MigrationFormat::eq(&self, other: &uuid_slug::masking_codec::MigrationFormat) -> bool
impl core::fmt::Debug for uuid_slug::masking_codec::MigrationFormat
pub fn uuid_slug::masking_codec::MigrationFormat::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::masking_codec::MigrationFormat
impl core::marker::StructuralPartialEq for uuid_slug::masking_codec::MigrationFormat
impl core::marker::Freeze for uuid_slug::masking_codec::MigrationFormat
impl core::marker::Send for uuid_slug::masking_codec::MigrationFormat
impl core::marker::Sync for uuid_slug::masking_codec::MigrationFormat
impl core::marker::Unpin for uuid_slug::masking_codec::MigrationFormat
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::MigrationFormat
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::MigrationFormat
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::MigrationFormat
pub struct uuid_slug::masking_codec::MigrationDecoder<'a>
impl uuid_slug::masking_codec::MigrationDecoder<'_>
pub fn uuid_slug::masking_codec::MigrationDecoder<'_>::candidates(&self, slug: &str, format: core::option::Option<uuid_slug::masking_codec::MigrationFormat>) -> core::result::Result<alloc::vec::Vec<uuid_slug::uuid::Uuid>, uuid_slug::error::Error>
pub fn uuid_slug::masking_codec::MigrationDecoder<'_>::decode(&self, slug: &str, format: core::option::Option<uuid_slug::masking_codec::MigrationFormat>) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
impl<'a> core::marker::Freeze for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> core::marker::Send for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> core::marker::Sync for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> core::marker::Unpin for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> core::marker::UnsafeUnpin for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> !core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::MigrationDecoder<'a>
pub struct uuid_slug::masking_codec::MigrationOptions
pub uuid_slug::masking_codec::MigrationOptions::original: bool
pub uuid_slug::masking_codec::MigrationOptions::plain: bool
impl core::clone::Clone for uuid_slug::masking_codec::MigrationOptions
pub fn uuid_slug::masking_codec::MigrationOptions::clone(&self) -> uuid_slug::masking_codec::MigrationOptions
impl core::default::Default for uuid_slug::masking_codec::MigrationOptions
pub fn uuid_slug::masking_codec::MigrationOptions::default() -> uuid_slug::masking_codec::MigrationOptions
impl core::fmt::Debug for uuid_slug::masking_codec::MigrationOptions
pub fn uuid_slug::masking_codec::MigrationOptions::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::masking_codec::MigrationOptions
impl core::marker::Freeze for uuid_slug::masking_codec::MigrationOptions
impl core::marker::Send for uuid_slug::masking_codec::MigrationOptions
impl core::marker::Sync for uuid_slug::masking_codec::MigrationOptions
impl core::marker::Unpin for uuid_slug::masking_codec::MigrationOptions
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::MigrationOptions
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::MigrationOptions
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::MigrationOptions
pub struct uuid_slug::masking_codec::Sentinel
pub uuid_slug::masking_codec::Sentinel::name: alloc::string::String
pub uuid_slug::masking_codec::Sentinel::slug: alloc::string::String
pub uuid_slug::masking_codec::Sentinel::uuid: uuid_slug::uuid::Uuid
impl core::clone::Clone for uuid_slug::masking_codec::Sentinel
pub fn uuid_slug::masking_codec::Sentinel::clone(&self) -> uuid_slug::masking_codec::Sentinel
impl core::fmt::Debug for uuid_slug::masking_codec::Sentinel
pub fn uuid_slug::masking_codec::Sentinel::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::masking_codec::Sentinel
impl core::marker::Send for uuid_slug::masking_codec::Sentinel
impl core::marker::Sync for uuid_slug::masking_codec::Sentinel
impl core::marker::Unpin for uuid_slug::masking_codec::Sentinel
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::Sentinel
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::Sentinel
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::Sentinel
pub struct uuid_slug::masking_codec::UuidV7MaskingCodec
impl uuid_slug::masking_codec::UuidV7MaskingCodec
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::decode_slug(&self, slug: &str) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::encode_uuid(&self, uuid: uuid_slug::uuid::Uuid) -> core::result::Result<alloc::string::String, uuid_slug::error::Error>
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::migration_decoder(&self, options: uuid_slug::masking_codec::MigrationOptions) -> uuid_slug::masking_codec::MigrationDecoder<'_>
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::new(options: uuid_slug::masking_codec::UuidV7MaskingCodecOptions) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::sentinels(&self) -> &[uuid_slug::masking_codec::Sentinel]
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::validate_slug_timestamp<'a>(&self, slug: &'a str, window: uuid_slug::masking_codec::UuidV7TimestampWindow) -> core::result::Result<&'a str, uuid_slug::error::Error>
impl core::marker::Freeze for uuid_slug::masking_codec::UuidV7MaskingCodec
impl core::marker::Send for uuid_slug::masking_codec::UuidV7MaskingCodec
impl core::marker::Sync for uuid_slug::masking_codec::UuidV7MaskingCodec
impl core::marker::Unpin for uuid_slug::masking_codec::UuidV7MaskingCodec
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::UuidV7MaskingCodec
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::UuidV7MaskingCodec
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::UuidV7MaskingCodec
pub struct uuid_slug::masking_codec::UuidV7MaskingCodecOptions
pub uuid_slug::masking_codec::UuidV7MaskingCodecOptions::mask: uuid_slug::mask::Mask
pub uuid_slug::masking_codec::UuidV7MaskingCodecOptions::previous_masks: alloc::vec::Vec<uuid_slug::mask::Mask>
pub uuid_slug::masking_codec::UuidV7MaskingCodecOptions::sentinels: alloc::vec::Vec<(alloc::string::String, uuid_slug::uuid::Uuid)>
pub uuid_slug::masking_codec::UuidV7MaskingCodecOptions::slug_alphabet: uuid_slug::alphabet::Alphabet
impl uuid_slug::masking_codec::UuidV7MaskingCodecOptions
pub fn uuid_slug::masking_codec::UuidV7MaskingCodecOptions::new(mask: uuid_slug::mask::Mask) -> Self
impl core::marker::Freeze for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl core::marker::Send for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl core::marker::Sync for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl core::marker::Unpin for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
pub struct uuid_slug::masking_codec::UuidV7TimestampWindow
pub uuid_slug::masking_codec::UuidV7TimestampWindow::max_timestamp_delta_ms: f64
pub uuid_slug::masking_codec::UuidV7TimestampWindow::reference_unix_ms: f64
impl uuid_slug::masking_codec::UuidV7TimestampWindow
pub fn uuid_slug::masking_codec::UuidV7TimestampWindow::validate(self, uuid: uuid_slug::uuid::Uuid) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
impl core::clone::Clone for uuid_slug::masking_codec::UuidV7TimestampWindow
pub fn uuid_slug::masking_codec::UuidV7TimestampWindow::clone(&self) -> uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::fmt::Debug for uuid_slug::masking_codec::UuidV7TimestampWindow
pub fn uuid_slug::masking_codec::UuidV7TimestampWindow::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::Freeze for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::Send for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::Sync for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::Unpin for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::UuidV7TimestampWindow
pub mod uuid_slug::uuid
pub struct uuid_slug::uuid::Uuid(_)
impl uuid_slug::uuid::Uuid
pub const fn uuid_slug::uuid::Uuid::as_bytes(&self) -> &[u8; 16]
pub const fn uuid_slug::uuid::Uuid::from_bytes(bytes: [u8; 16]) -> Self
pub fn uuid_slug::uuid::Uuid::from_slice(bytes: &[u8], offset: usize) -> core::result::Result<Self, uuid_slug::error::Error>
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
#[non_exhaustive] pub enum uuid_slug::ErrorCode
pub uuid_slug::ErrorCode::Aborted
pub uuid_slug::ErrorCode::InvalidBase32Hex
pub uuid_slug::ErrorCode::InvalidBase64Url
pub uuid_slug::ErrorCode::InvalidBuffer
pub uuid_slug::ErrorCode::InvalidMask
pub uuid_slug::ErrorCode::InvalidSentinel
pub uuid_slug::ErrorCode::InvalidTimestamp
pub uuid_slug::ErrorCode::InvalidUuid
pub uuid_slug::ErrorCode::InvalidUuidSlug
pub uuid_slug::ErrorCode::InvalidUuidVersion
pub uuid_slug::ErrorCode::RngUnavailable
pub uuid_slug::ErrorCode::TimestampOutsideWindow
impl uuid_slug::error::ErrorCode
pub const fn uuid_slug::error::ErrorCode::as_str(self) -> &'static str
impl core::clone::Clone for uuid_slug::error::ErrorCode
pub fn uuid_slug::error::ErrorCode::clone(&self) -> uuid_slug::error::ErrorCode
impl core::cmp::Eq for uuid_slug::error::ErrorCode
impl core::cmp::PartialEq for uuid_slug::error::ErrorCode
pub fn uuid_slug::error::ErrorCode::eq(&self, other: &uuid_slug::error::ErrorCode) -> bool
impl core::fmt::Debug for uuid_slug::error::ErrorCode
pub fn uuid_slug::error::ErrorCode::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::hash::Hash for uuid_slug::error::ErrorCode
pub fn uuid_slug::error::ErrorCode::hash<__H: core::hash::Hasher>(&self, state: &mut __H)
impl core::marker::Copy for uuid_slug::error::ErrorCode
impl core::marker::StructuralPartialEq for uuid_slug::error::ErrorCode
impl core::marker::Freeze for uuid_slug::error::ErrorCode
impl core::marker::Send for uuid_slug::error::ErrorCode
impl core::marker::Sync for uuid_slug::error::ErrorCode
impl core::marker::Unpin for uuid_slug::error::ErrorCode
impl core::marker::UnsafeUnpin for uuid_slug::error::ErrorCode
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::error::ErrorCode
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::error::ErrorCode
pub enum uuid_slug::MigrationFormat
pub uuid_slug::MigrationFormat::Current
pub uuid_slug::MigrationFormat::Original
pub uuid_slug::MigrationFormat::Plain
impl core::clone::Clone for uuid_slug::masking_codec::MigrationFormat
pub fn uuid_slug::masking_codec::MigrationFormat::clone(&self) -> uuid_slug::masking_codec::MigrationFormat
impl core::cmp::Eq for uuid_slug::masking_codec::MigrationFormat
impl core::cmp::PartialEq for uuid_slug::masking_codec::MigrationFormat
pub fn uuid_slug::masking_codec::MigrationFormat::eq(&self, other: &uuid_slug::masking_codec::MigrationFormat) -> bool
impl core::fmt::Debug for uuid_slug::masking_codec::MigrationFormat
pub fn uuid_slug::masking_codec::MigrationFormat::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::masking_codec::MigrationFormat
impl core::marker::StructuralPartialEq for uuid_slug::masking_codec::MigrationFormat
impl core::marker::Freeze for uuid_slug::masking_codec::MigrationFormat
impl core::marker::Send for uuid_slug::masking_codec::MigrationFormat
impl core::marker::Sync for uuid_slug::masking_codec::MigrationFormat
impl core::marker::Unpin for uuid_slug::masking_codec::MigrationFormat
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::MigrationFormat
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::MigrationFormat
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::MigrationFormat
pub struct uuid_slug::Error
impl uuid_slug::error::Error
pub const fn uuid_slug::error::Error::code(&self) -> uuid_slug::error::ErrorCode
pub const fn uuid_slug::error::Error::new(code: uuid_slug::error::ErrorCode) -> Self
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
pub struct uuid_slug::Mask
impl uuid_slug::mask::Mask
pub fn uuid_slug::mask::Mask::custom(label: impl core::convert::Into<alloc::string::String>, mask: impl core::ops::function::Fn([u8; 16]) -> core::result::Result<[u8; 16], uuid_slug::error::Error> + core::marker::Send + core::marker::Sync + 'static, unmask: impl core::ops::function::Fn([u8; 16]) -> core::result::Result<[u8; 16], uuid_slug::error::Error> + core::marker::Send + core::marker::Sync + 'static) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::mask::Mask::label(&self) -> &str
impl core::clone::Clone for uuid_slug::mask::Mask
pub fn uuid_slug::mask::Mask::clone(&self) -> uuid_slug::mask::Mask
impl core::fmt::Debug for uuid_slug::mask::Mask
pub fn uuid_slug::mask::Mask::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::mask::Mask
impl core::marker::Send for uuid_slug::mask::Mask
impl core::marker::Sync for uuid_slug::mask::Mask
impl core::marker::Unpin for uuid_slug::mask::Mask
impl core::marker::UnsafeUnpin for uuid_slug::mask::Mask
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::mask::Mask
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::mask::Mask
pub struct uuid_slug::MigrationDecoder<'a>
impl uuid_slug::masking_codec::MigrationDecoder<'_>
pub fn uuid_slug::masking_codec::MigrationDecoder<'_>::candidates(&self, slug: &str, format: core::option::Option<uuid_slug::masking_codec::MigrationFormat>) -> core::result::Result<alloc::vec::Vec<uuid_slug::uuid::Uuid>, uuid_slug::error::Error>
pub fn uuid_slug::masking_codec::MigrationDecoder<'_>::decode(&self, slug: &str, format: core::option::Option<uuid_slug::masking_codec::MigrationFormat>) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
impl<'a> core::marker::Freeze for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> core::marker::Send for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> core::marker::Sync for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> core::marker::Unpin for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> core::marker::UnsafeUnpin for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> !core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::MigrationDecoder<'a>
pub struct uuid_slug::MigrationOptions
pub uuid_slug::MigrationOptions::original: bool
pub uuid_slug::MigrationOptions::plain: bool
impl core::clone::Clone for uuid_slug::masking_codec::MigrationOptions
pub fn uuid_slug::masking_codec::MigrationOptions::clone(&self) -> uuid_slug::masking_codec::MigrationOptions
impl core::default::Default for uuid_slug::masking_codec::MigrationOptions
pub fn uuid_slug::masking_codec::MigrationOptions::default() -> uuid_slug::masking_codec::MigrationOptions
impl core::fmt::Debug for uuid_slug::masking_codec::MigrationOptions
pub fn uuid_slug::masking_codec::MigrationOptions::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::masking_codec::MigrationOptions
impl core::marker::Freeze for uuid_slug::masking_codec::MigrationOptions
impl core::marker::Send for uuid_slug::masking_codec::MigrationOptions
impl core::marker::Sync for uuid_slug::masking_codec::MigrationOptions
impl core::marker::Unpin for uuid_slug::masking_codec::MigrationOptions
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::MigrationOptions
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::MigrationOptions
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::MigrationOptions
pub struct uuid_slug::Sentinel
pub uuid_slug::Sentinel::name: alloc::string::String
pub uuid_slug::Sentinel::slug: alloc::string::String
pub uuid_slug::Sentinel::uuid: uuid_slug::uuid::Uuid
impl core::clone::Clone for uuid_slug::masking_codec::Sentinel
pub fn uuid_slug::masking_codec::Sentinel::clone(&self) -> uuid_slug::masking_codec::Sentinel
impl core::fmt::Debug for uuid_slug::masking_codec::Sentinel
pub fn uuid_slug::masking_codec::Sentinel::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::masking_codec::Sentinel
impl core::marker::Send for uuid_slug::masking_codec::Sentinel
impl core::marker::Sync for uuid_slug::masking_codec::Sentinel
impl core::marker::Unpin for uuid_slug::masking_codec::Sentinel
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::Sentinel
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::Sentinel
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::Sentinel
pub struct uuid_slug::Uuid(_)
impl uuid_slug::uuid::Uuid
pub const fn uuid_slug::uuid::Uuid::as_bytes(&self) -> &[u8; 16]
pub const fn uuid_slug::uuid::Uuid::from_bytes(bytes: [u8; 16]) -> Self
pub fn uuid_slug::uuid::Uuid::from_slice(bytes: &[u8], offset: usize) -> core::result::Result<Self, uuid_slug::error::Error>
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
pub struct uuid_slug::UuidV7MaskingCodec
impl uuid_slug::masking_codec::UuidV7MaskingCodec
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::decode_slug(&self, slug: &str) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::encode_uuid(&self, uuid: uuid_slug::uuid::Uuid) -> core::result::Result<alloc::string::String, uuid_slug::error::Error>
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::migration_decoder(&self, options: uuid_slug::masking_codec::MigrationOptions) -> uuid_slug::masking_codec::MigrationDecoder<'_>
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::new(options: uuid_slug::masking_codec::UuidV7MaskingCodecOptions) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::sentinels(&self) -> &[uuid_slug::masking_codec::Sentinel]
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::validate_slug_timestamp<'a>(&self, slug: &'a str, window: uuid_slug::masking_codec::UuidV7TimestampWindow) -> core::result::Result<&'a str, uuid_slug::error::Error>
impl core::marker::Freeze for uuid_slug::masking_codec::UuidV7MaskingCodec
impl core::marker::Send for uuid_slug::masking_codec::UuidV7MaskingCodec
impl core::marker::Sync for uuid_slug::masking_codec::UuidV7MaskingCodec
impl core::marker::Unpin for uuid_slug::masking_codec::UuidV7MaskingCodec
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::UuidV7MaskingCodec
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::UuidV7MaskingCodec
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::UuidV7MaskingCodec
pub struct uuid_slug::UuidV7MaskingCodecOptions
pub uuid_slug::UuidV7MaskingCodecOptions::mask: uuid_slug::mask::Mask
pub uuid_slug::UuidV7MaskingCodecOptions::previous_masks: alloc::vec::Vec<uuid_slug::mask::Mask>
pub uuid_slug::UuidV7MaskingCodecOptions::sentinels: alloc::vec::Vec<(alloc::string::String, uuid_slug::uuid::Uuid)>
pub uuid_slug::UuidV7MaskingCodecOptions::slug_alphabet: uuid_slug::alphabet::Alphabet
impl uuid_slug::masking_codec::UuidV7MaskingCodecOptions
pub fn uuid_slug::masking_codec::UuidV7MaskingCodecOptions::new(mask: uuid_slug::mask::Mask) -> Self
impl core::marker::Freeze for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl core::marker::Send for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl core::marker::Sync for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl core::marker::Unpin for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
pub struct uuid_slug::UuidV7TimestampWindow
pub uuid_slug::UuidV7TimestampWindow::max_timestamp_delta_ms: f64
pub uuid_slug::UuidV7TimestampWindow::reference_unix_ms: f64
impl uuid_slug::masking_codec::UuidV7TimestampWindow
pub fn uuid_slug::masking_codec::UuidV7TimestampWindow::validate(self, uuid: uuid_slug::uuid::Uuid) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
impl core::clone::Clone for uuid_slug::masking_codec::UuidV7TimestampWindow
pub fn uuid_slug::masking_codec::UuidV7TimestampWindow::clone(&self) -> uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::fmt::Debug for uuid_slug::masking_codec::UuidV7TimestampWindow
pub fn uuid_slug::masking_codec::UuidV7TimestampWindow::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::Freeze for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::Send for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::Sync for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::Unpin for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::UuidV7TimestampWindow
pub const uuid_slug::MAX_MASKED_UUID_V7_UNIX_MS: u64
pub fn uuid_slug::create_mask(seed: &[u8], iterations: u32, label: &str) -> core::result::Result<uuid_slug::mask::Mask, uuid_slug::error::Error>
pub fn uuid_slug::create_mask_async(seed: &[u8], iterations: u32, label: &str, cancellation: uuid_slug::mask::Cancellation) -> impl core::future::future::Future<Output = core::result::Result<uuid_slug::mask::Mask, uuid_slug::error::Error>> + core::marker::Send + use<>
pub fn uuid_slug::public_mask() -> uuid_slug::mask::Mask
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
pub mod uuid_slug::error
#[non_exhaustive] pub enum uuid_slug::error::ErrorCode
pub uuid_slug::error::ErrorCode::Aborted
pub uuid_slug::error::ErrorCode::InvalidBase32Hex
pub uuid_slug::error::ErrorCode::InvalidBase64Url
pub uuid_slug::error::ErrorCode::InvalidBuffer
pub uuid_slug::error::ErrorCode::InvalidMask
pub uuid_slug::error::ErrorCode::InvalidSentinel
pub uuid_slug::error::ErrorCode::InvalidTimestamp
pub uuid_slug::error::ErrorCode::InvalidUuid
pub uuid_slug::error::ErrorCode::InvalidUuidSlug
pub uuid_slug::error::ErrorCode::InvalidUuidVersion
pub uuid_slug::error::ErrorCode::RngUnavailable
pub uuid_slug::error::ErrorCode::TimestampOutsideWindow
impl uuid_slug::error::ErrorCode
pub const fn uuid_slug::error::ErrorCode::as_str(self) -> &'static str
impl core::clone::Clone for uuid_slug::error::ErrorCode
pub fn uuid_slug::error::ErrorCode::clone(&self) -> uuid_slug::error::ErrorCode
impl core::cmp::Eq for uuid_slug::error::ErrorCode
impl core::cmp::PartialEq for uuid_slug::error::ErrorCode
pub fn uuid_slug::error::ErrorCode::eq(&self, other: &uuid_slug::error::ErrorCode) -> bool
impl core::fmt::Debug for uuid_slug::error::ErrorCode
pub fn uuid_slug::error::ErrorCode::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::hash::Hash for uuid_slug::error::ErrorCode
pub fn uuid_slug::error::ErrorCode::hash<__H: core::hash::Hasher>(&self, state: &mut __H)
impl core::marker::Copy for uuid_slug::error::ErrorCode
impl core::marker::StructuralPartialEq for uuid_slug::error::ErrorCode
impl core::marker::Freeze for uuid_slug::error::ErrorCode
impl core::marker::Send for uuid_slug::error::ErrorCode
impl core::marker::Sync for uuid_slug::error::ErrorCode
impl core::marker::Unpin for uuid_slug::error::ErrorCode
impl core::marker::UnsafeUnpin for uuid_slug::error::ErrorCode
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::error::ErrorCode
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::error::ErrorCode
pub struct uuid_slug::error::Error
impl uuid_slug::error::Error
pub const fn uuid_slug::error::Error::code(&self) -> uuid_slug::error::ErrorCode
pub const fn uuid_slug::error::Error::new(code: uuid_slug::error::ErrorCode) -> Self
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
pub mod uuid_slug::mask
pub struct uuid_slug::mask::Cancellation(_)
impl uuid_slug::mask::Cancellation
pub fn uuid_slug::mask::Cancellation::cancel(&self)
pub fn uuid_slug::mask::Cancellation::is_cancelled(&self) -> bool
impl core::clone::Clone for uuid_slug::mask::Cancellation
pub fn uuid_slug::mask::Cancellation::clone(&self) -> uuid_slug::mask::Cancellation
impl core::default::Default for uuid_slug::mask::Cancellation
pub fn uuid_slug::mask::Cancellation::default() -> uuid_slug::mask::Cancellation
impl core::fmt::Debug for uuid_slug::mask::Cancellation
pub fn uuid_slug::mask::Cancellation::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::mask::Cancellation
impl core::marker::Send for uuid_slug::mask::Cancellation
impl core::marker::Sync for uuid_slug::mask::Cancellation
impl core::marker::Unpin for uuid_slug::mask::Cancellation
impl core::marker::UnsafeUnpin for uuid_slug::mask::Cancellation
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::mask::Cancellation
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::mask::Cancellation
pub struct uuid_slug::mask::Mask
impl uuid_slug::mask::Mask
pub fn uuid_slug::mask::Mask::custom(label: impl core::convert::Into<alloc::string::String>, mask: impl core::ops::function::Fn([u8; 16]) -> core::result::Result<[u8; 16], uuid_slug::error::Error> + core::marker::Send + core::marker::Sync + 'static, unmask: impl core::ops::function::Fn([u8; 16]) -> core::result::Result<[u8; 16], uuid_slug::error::Error> + core::marker::Send + core::marker::Sync + 'static) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::mask::Mask::label(&self) -> &str
impl core::clone::Clone for uuid_slug::mask::Mask
pub fn uuid_slug::mask::Mask::clone(&self) -> uuid_slug::mask::Mask
impl core::fmt::Debug for uuid_slug::mask::Mask
pub fn uuid_slug::mask::Mask::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::mask::Mask
impl core::marker::Send for uuid_slug::mask::Mask
impl core::marker::Sync for uuid_slug::mask::Mask
impl core::marker::Unpin for uuid_slug::mask::Mask
impl core::marker::UnsafeUnpin for uuid_slug::mask::Mask
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::mask::Mask
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::mask::Mask
pub fn uuid_slug::mask::create_mask(seed: &[u8], iterations: u32, label: &str) -> core::result::Result<uuid_slug::mask::Mask, uuid_slug::error::Error>
pub fn uuid_slug::mask::create_mask_async(seed: &[u8], iterations: u32, label: &str, cancellation: uuid_slug::mask::Cancellation) -> impl core::future::future::Future<Output = core::result::Result<uuid_slug::mask::Mask, uuid_slug::error::Error>> + core::marker::Send + use<>
pub fn uuid_slug::mask::public_mask() -> uuid_slug::mask::Mask
pub mod uuid_slug::masking_codec
pub enum uuid_slug::masking_codec::MigrationFormat
pub uuid_slug::masking_codec::MigrationFormat::Current
pub uuid_slug::masking_codec::MigrationFormat::Original
pub uuid_slug::masking_codec::MigrationFormat::Plain
impl core::clone::Clone for uuid_slug::masking_codec::MigrationFormat
pub fn uuid_slug::masking_codec::MigrationFormat::clone(&self) -> uuid_slug::masking_codec::MigrationFormat
impl core::cmp::Eq for uuid_slug::masking_codec::MigrationFormat
impl core::cmp::PartialEq for uuid_slug::masking_codec::MigrationFormat
pub fn uuid_slug::masking_codec::MigrationFormat::eq(&self, other: &uuid_slug::masking_codec::MigrationFormat) -> bool
impl core::fmt::Debug for uuid_slug::masking_codec::MigrationFormat
pub fn uuid_slug::masking_codec::MigrationFormat::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::masking_codec::MigrationFormat
impl core::marker::StructuralPartialEq for uuid_slug::masking_codec::MigrationFormat
impl core::marker::Freeze for uuid_slug::masking_codec::MigrationFormat
impl core::marker::Send for uuid_slug::masking_codec::MigrationFormat
impl core::marker::Sync for uuid_slug::masking_codec::MigrationFormat
impl core::marker::Unpin for uuid_slug::masking_codec::MigrationFormat
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::MigrationFormat
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::MigrationFormat
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::MigrationFormat
pub struct uuid_slug::masking_codec::MigrationDecoder<'a>
impl uuid_slug::masking_codec::MigrationDecoder<'_>
pub fn uuid_slug::masking_codec::MigrationDecoder<'_>::candidates(&self, slug: &str, format: core::option::Option<uuid_slug::masking_codec::MigrationFormat>) -> core::result::Result<alloc::vec::Vec<uuid_slug::uuid::Uuid>, uuid_slug::error::Error>
pub fn uuid_slug::masking_codec::MigrationDecoder<'_>::decode(&self, slug: &str, format: core::option::Option<uuid_slug::masking_codec::MigrationFormat>) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
impl<'a> core::marker::Freeze for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> core::marker::Send for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> core::marker::Sync for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> core::marker::Unpin for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> core::marker::UnsafeUnpin for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> !core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::MigrationDecoder<'a>
pub struct uuid_slug::masking_codec::MigrationOptions
pub uuid_slug::masking_codec::MigrationOptions::original: bool
pub uuid_slug::masking_codec::MigrationOptions::plain: bool
impl core::clone::Clone for uuid_slug::masking_codec::MigrationOptions
pub fn uuid_slug::masking_codec::MigrationOptions::clone(&self) -> uuid_slug::masking_codec::MigrationOptions
impl core::default::Default for uuid_slug::masking_codec::MigrationOptions
pub fn uuid_slug::masking_codec::MigrationOptions::default() -> uuid_slug::masking_codec::MigrationOptions
impl core::fmt::Debug for uuid_slug::masking_codec::MigrationOptions
pub fn uuid_slug::masking_codec::MigrationOptions::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::masking_codec::MigrationOptions
impl core::marker::Freeze for uuid_slug::masking_codec::MigrationOptions
impl core::marker::Send for uuid_slug::masking_codec::MigrationOptions
impl core::marker::Sync for uuid_slug::masking_codec::MigrationOptions
impl core::marker::Unpin for uuid_slug::masking_codec::MigrationOptions
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::MigrationOptions
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::MigrationOptions
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::MigrationOptions
pub struct uuid_slug::masking_codec::Sentinel
pub uuid_slug::masking_codec::Sentinel::name: alloc::string::String
pub uuid_slug::masking_codec::Sentinel::slug: alloc::string::String
pub uuid_slug::masking_codec::Sentinel::uuid: uuid_slug::uuid::Uuid
impl core::clone::Clone for uuid_slug::masking_codec::Sentinel
pub fn uuid_slug::masking_codec::Sentinel::clone(&self) -> uuid_slug::masking_codec::Sentinel
impl core::fmt::Debug for uuid_slug::masking_codec::Sentinel
pub fn uuid_slug::masking_codec::Sentinel::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::masking_codec::Sentinel
impl core::marker::Send for uuid_slug::masking_codec::Sentinel
impl core::marker::Sync for uuid_slug::masking_codec::Sentinel
impl core::marker::Unpin for uuid_slug::masking_codec::Sentinel
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::Sentinel
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::Sentinel
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::Sentinel
pub struct uuid_slug::masking_codec::UuidV7MaskingCodec
impl uuid_slug::masking_codec::UuidV7MaskingCodec
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::decode_slug(&self, slug: &str) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::encode_uuid(&self, uuid: uuid_slug::uuid::Uuid) -> core::result::Result<alloc::string::String, uuid_slug::error::Error>
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::migration_decoder(&self, options: uuid_slug::masking_codec::MigrationOptions) -> uuid_slug::masking_codec::MigrationDecoder<'_>
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::new(options: uuid_slug::masking_codec::UuidV7MaskingCodecOptions) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::sentinels(&self) -> &[uuid_slug::masking_codec::Sentinel]
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::validate_slug_timestamp<'a>(&self, slug: &'a str, window: uuid_slug::masking_codec::UuidV7TimestampWindow) -> core::result::Result<&'a str, uuid_slug::error::Error>
impl core::marker::Freeze for uuid_slug::masking_codec::UuidV7MaskingCodec
impl core::marker::Send for uuid_slug::masking_codec::UuidV7MaskingCodec
impl core::marker::Sync for uuid_slug::masking_codec::UuidV7MaskingCodec
impl core::marker::Unpin for uuid_slug::masking_codec::UuidV7MaskingCodec
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::UuidV7MaskingCodec
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::UuidV7MaskingCodec
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::UuidV7MaskingCodec
pub struct uuid_slug::masking_codec::UuidV7MaskingCodecOptions
pub uuid_slug::masking_codec::UuidV7MaskingCodecOptions::mask: uuid_slug::mask::Mask
pub uuid_slug::masking_codec::UuidV7MaskingCodecOptions::previous_masks: alloc::vec::Vec<uuid_slug::mask::Mask>
pub uuid_slug::masking_codec::UuidV7MaskingCodecOptions::sentinels: alloc::vec::Vec<(alloc::string::String, uuid_slug::uuid::Uuid)>
pub uuid_slug::masking_codec::UuidV7MaskingCodecOptions::slug_alphabet: uuid_slug::alphabet::Alphabet
impl uuid_slug::masking_codec::UuidV7MaskingCodecOptions
pub fn uuid_slug::masking_codec::UuidV7MaskingCodecOptions::new(mask: uuid_slug::mask::Mask) -> Self
impl core::marker::Freeze for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl core::marker::Send for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl core::marker::Sync for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl core::marker::Unpin for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
pub struct uuid_slug::masking_codec::UuidV7TimestampWindow
pub uuid_slug::masking_codec::UuidV7TimestampWindow::max_timestamp_delta_ms: f64
pub uuid_slug::masking_codec::UuidV7TimestampWindow::reference_unix_ms: f64
impl uuid_slug::masking_codec::UuidV7TimestampWindow
pub fn uuid_slug::masking_codec::UuidV7TimestampWindow::validate(self, uuid: uuid_slug::uuid::Uuid) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
impl core::clone::Clone for uuid_slug::masking_codec::UuidV7TimestampWindow
pub fn uuid_slug::masking_codec::UuidV7TimestampWindow::clone(&self) -> uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::fmt::Debug for uuid_slug::masking_codec::UuidV7TimestampWindow
pub fn uuid_slug::masking_codec::UuidV7TimestampWindow::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::Freeze for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::Send for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::Sync for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::Unpin for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::UuidV7TimestampWindow
pub mod uuid_slug::uuid
pub struct uuid_slug::uuid::Uuid(_)
impl uuid_slug::uuid::Uuid
pub const fn uuid_slug::uuid::Uuid::as_bytes(&self) -> &[u8; 16]
pub const fn uuid_slug::uuid::Uuid::from_bytes(bytes: [u8; 16]) -> Self
pub fn uuid_slug::uuid::Uuid::from_slice(bytes: &[u8], offset: usize) -> core::result::Result<Self, uuid_slug::error::Error>
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
#[non_exhaustive] pub enum uuid_slug::ErrorCode
pub uuid_slug::ErrorCode::Aborted
pub uuid_slug::ErrorCode::InvalidBase32Hex
pub uuid_slug::ErrorCode::InvalidBase64Url
pub uuid_slug::ErrorCode::InvalidBuffer
pub uuid_slug::ErrorCode::InvalidMask
pub uuid_slug::ErrorCode::InvalidSentinel
pub uuid_slug::ErrorCode::InvalidTimestamp
pub uuid_slug::ErrorCode::InvalidUuid
pub uuid_slug::ErrorCode::InvalidUuidSlug
pub uuid_slug::ErrorCode::InvalidUuidVersion
pub uuid_slug::ErrorCode::RngUnavailable
pub uuid_slug::ErrorCode::TimestampOutsideWindow
impl uuid_slug::error::ErrorCode
pub const fn uuid_slug::error::ErrorCode::as_str(self) -> &'static str
impl core::clone::Clone for uuid_slug::error::ErrorCode
pub fn uuid_slug::error::ErrorCode::clone(&self) -> uuid_slug::error::ErrorCode
impl core::cmp::Eq for uuid_slug::error::ErrorCode
impl core::cmp::PartialEq for uuid_slug::error::ErrorCode
pub fn uuid_slug::error::ErrorCode::eq(&self, other: &uuid_slug::error::ErrorCode) -> bool
impl core::fmt::Debug for uuid_slug::error::ErrorCode
pub fn uuid_slug::error::ErrorCode::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::hash::Hash for uuid_slug::error::ErrorCode
pub fn uuid_slug::error::ErrorCode::hash<__H: core::hash::Hasher>(&self, state: &mut __H)
impl core::marker::Copy for uuid_slug::error::ErrorCode
impl core::marker::StructuralPartialEq for uuid_slug::error::ErrorCode
impl core::marker::Freeze for uuid_slug::error::ErrorCode
impl core::marker::Send for uuid_slug::error::ErrorCode
impl core::marker::Sync for uuid_slug::error::ErrorCode
impl core::marker::Unpin for uuid_slug::error::ErrorCode
impl core::marker::UnsafeUnpin for uuid_slug::error::ErrorCode
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::error::ErrorCode
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::error::ErrorCode
pub enum uuid_slug::MigrationFormat
pub uuid_slug::MigrationFormat::Current
pub uuid_slug::MigrationFormat::Original
pub uuid_slug::MigrationFormat::Plain
impl core::clone::Clone for uuid_slug::masking_codec::MigrationFormat
pub fn uuid_slug::masking_codec::MigrationFormat::clone(&self) -> uuid_slug::masking_codec::MigrationFormat
impl core::cmp::Eq for uuid_slug::masking_codec::MigrationFormat
impl core::cmp::PartialEq for uuid_slug::masking_codec::MigrationFormat
pub fn uuid_slug::masking_codec::MigrationFormat::eq(&self, other: &uuid_slug::masking_codec::MigrationFormat) -> bool
impl core::fmt::Debug for uuid_slug::masking_codec::MigrationFormat
pub fn uuid_slug::masking_codec::MigrationFormat::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::masking_codec::MigrationFormat
impl core::marker::StructuralPartialEq for uuid_slug::masking_codec::MigrationFormat
impl core::marker::Freeze for uuid_slug::masking_codec::MigrationFormat
impl core::marker::Send for uuid_slug::masking_codec::MigrationFormat
impl core::marker::Sync for uuid_slug::masking_codec::MigrationFormat
impl core::marker::Unpin for uuid_slug::masking_codec::MigrationFormat
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::MigrationFormat
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::MigrationFormat
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::MigrationFormat
pub struct uuid_slug::Error
impl uuid_slug::error::Error
pub const fn uuid_slug::error::Error::code(&self) -> uuid_slug::error::ErrorCode
pub const fn uuid_slug::error::Error::new(code: uuid_slug::error::ErrorCode) -> Self
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
pub struct uuid_slug::Mask
impl uuid_slug::mask::Mask
pub fn uuid_slug::mask::Mask::custom(label: impl core::convert::Into<alloc::string::String>, mask: impl core::ops::function::Fn([u8; 16]) -> core::result::Result<[u8; 16], uuid_slug::error::Error> + core::marker::Send + core::marker::Sync + 'static, unmask: impl core::ops::function::Fn([u8; 16]) -> core::result::Result<[u8; 16], uuid_slug::error::Error> + core::marker::Send + core::marker::Sync + 'static) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::mask::Mask::label(&self) -> &str
impl core::clone::Clone for uuid_slug::mask::Mask
pub fn uuid_slug::mask::Mask::clone(&self) -> uuid_slug::mask::Mask
impl core::fmt::Debug for uuid_slug::mask::Mask
pub fn uuid_slug::mask::Mask::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::mask::Mask
impl core::marker::Send for uuid_slug::mask::Mask
impl core::marker::Sync for uuid_slug::mask::Mask
impl core::marker::Unpin for uuid_slug::mask::Mask
impl core::marker::UnsafeUnpin for uuid_slug::mask::Mask
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::mask::Mask
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::mask::Mask
pub struct uuid_slug::MigrationDecoder<'a>
impl uuid_slug::masking_codec::MigrationDecoder<'_>
pub fn uuid_slug::masking_codec::MigrationDecoder<'_>::candidates(&self, slug: &str, format: core::option::Option<uuid_slug::masking_codec::MigrationFormat>) -> core::result::Result<alloc::vec::Vec<uuid_slug::uuid::Uuid>, uuid_slug::error::Error>
pub fn uuid_slug::masking_codec::MigrationDecoder<'_>::decode(&self, slug: &str, format: core::option::Option<uuid_slug::masking_codec::MigrationFormat>) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
impl<'a> core::marker::Freeze for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> core::marker::Send for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> core::marker::Sync for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> core::marker::Unpin for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> core::marker::UnsafeUnpin for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::MigrationDecoder<'a>
impl<'a> !core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::MigrationDecoder<'a>
pub struct uuid_slug::MigrationOptions
pub uuid_slug::MigrationOptions::original: bool
pub uuid_slug::MigrationOptions::plain: bool
impl core::clone::Clone for uuid_slug::masking_codec::MigrationOptions
pub fn uuid_slug::masking_codec::MigrationOptions::clone(&self) -> uuid_slug::masking_codec::MigrationOptions
impl core::default::Default for uuid_slug::masking_codec::MigrationOptions
pub fn uuid_slug::masking_codec::MigrationOptions::default() -> uuid_slug::masking_codec::MigrationOptions
impl core::fmt::Debug for uuid_slug::masking_codec::MigrationOptions
pub fn uuid_slug::masking_codec::MigrationOptions::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::masking_codec::MigrationOptions
impl core::marker::Freeze for uuid_slug::masking_codec::MigrationOptions
impl core::marker::Send for uuid_slug::masking_codec::MigrationOptions
impl core::marker::Sync for uuid_slug::masking_codec::MigrationOptions
impl core::marker::Unpin for uuid_slug::masking_codec::MigrationOptions
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::MigrationOptions
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::MigrationOptions
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::MigrationOptions
pub struct uuid_slug::Sentinel
pub uuid_slug::Sentinel::name: alloc::string::String
pub uuid_slug::Sentinel::slug: alloc::string::String
pub uuid_slug::Sentinel::uuid: uuid_slug::uuid::Uuid
impl core::clone::Clone for uuid_slug::masking_codec::Sentinel
pub fn uuid_slug::masking_codec::Sentinel::clone(&self) -> uuid_slug::masking_codec::Sentinel
impl core::fmt::Debug for uuid_slug::masking_codec::Sentinel
pub fn uuid_slug::masking_codec::Sentinel::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Freeze for uuid_slug::masking_codec::Sentinel
impl core::marker::Send for uuid_slug::masking_codec::Sentinel
impl core::marker::Sync for uuid_slug::masking_codec::Sentinel
impl core::marker::Unpin for uuid_slug::masking_codec::Sentinel
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::Sentinel
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::Sentinel
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::Sentinel
pub struct uuid_slug::Uuid(_)
impl uuid_slug::uuid::Uuid
pub const fn uuid_slug::uuid::Uuid::as_bytes(&self) -> &[u8; 16]
pub const fn uuid_slug::uuid::Uuid::from_bytes(bytes: [u8; 16]) -> Self
pub fn uuid_slug::uuid::Uuid::from_slice(bytes: &[u8], offset: usize) -> core::result::Result<Self, uuid_slug::error::Error>
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
pub struct uuid_slug::UuidV7MaskingCodec
impl uuid_slug::masking_codec::UuidV7MaskingCodec
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::decode_slug(&self, slug: &str) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::encode_uuid(&self, uuid: uuid_slug::uuid::Uuid) -> core::result::Result<alloc::string::String, uuid_slug::error::Error>
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::migration_decoder(&self, options: uuid_slug::masking_codec::MigrationOptions) -> uuid_slug::masking_codec::MigrationDecoder<'_>
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::new(options: uuid_slug::masking_codec::UuidV7MaskingCodecOptions) -> core::result::Result<Self, uuid_slug::error::Error>
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::sentinels(&self) -> &[uuid_slug::masking_codec::Sentinel]
pub fn uuid_slug::masking_codec::UuidV7MaskingCodec::validate_slug_timestamp<'a>(&self, slug: &'a str, window: uuid_slug::masking_codec::UuidV7TimestampWindow) -> core::result::Result<&'a str, uuid_slug::error::Error>
impl core::marker::Freeze for uuid_slug::masking_codec::UuidV7MaskingCodec
impl core::marker::Send for uuid_slug::masking_codec::UuidV7MaskingCodec
impl core::marker::Sync for uuid_slug::masking_codec::UuidV7MaskingCodec
impl core::marker::Unpin for uuid_slug::masking_codec::UuidV7MaskingCodec
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::UuidV7MaskingCodec
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::UuidV7MaskingCodec
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::UuidV7MaskingCodec
pub struct uuid_slug::UuidV7MaskingCodecOptions
pub uuid_slug::UuidV7MaskingCodecOptions::mask: uuid_slug::mask::Mask
pub uuid_slug::UuidV7MaskingCodecOptions::previous_masks: alloc::vec::Vec<uuid_slug::mask::Mask>
pub uuid_slug::UuidV7MaskingCodecOptions::sentinels: alloc::vec::Vec<(alloc::string::String, uuid_slug::uuid::Uuid)>
pub uuid_slug::UuidV7MaskingCodecOptions::slug_alphabet: uuid_slug::alphabet::Alphabet
impl uuid_slug::masking_codec::UuidV7MaskingCodecOptions
pub fn uuid_slug::masking_codec::UuidV7MaskingCodecOptions::new(mask: uuid_slug::mask::Mask) -> Self
impl core::marker::Freeze for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl core::marker::Send for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl core::marker::Sync for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl core::marker::Unpin for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl !core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
impl !core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::UuidV7MaskingCodecOptions
pub struct uuid_slug::UuidV7TimestampWindow
pub uuid_slug::UuidV7TimestampWindow::max_timestamp_delta_ms: f64
pub uuid_slug::UuidV7TimestampWindow::reference_unix_ms: f64
impl uuid_slug::masking_codec::UuidV7TimestampWindow
pub fn uuid_slug::masking_codec::UuidV7TimestampWindow::validate(self, uuid: uuid_slug::uuid::Uuid) -> core::result::Result<uuid_slug::uuid::Uuid, uuid_slug::error::Error>
impl core::clone::Clone for uuid_slug::masking_codec::UuidV7TimestampWindow
pub fn uuid_slug::masking_codec::UuidV7TimestampWindow::clone(&self) -> uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::fmt::Debug for uuid_slug::masking_codec::UuidV7TimestampWindow
pub fn uuid_slug::masking_codec::UuidV7TimestampWindow::fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result
impl core::marker::Copy for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::Freeze for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::Send for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::Sync for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::Unpin for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::marker::UnsafeUnpin for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::panic::unwind_safe::RefUnwindSafe for uuid_slug::masking_codec::UuidV7TimestampWindow
impl core::panic::unwind_safe::UnwindSafe for uuid_slug::masking_codec::UuidV7TimestampWindow
pub const uuid_slug::MAX_MASKED_UUID_V7_UNIX_MS: u64
pub fn uuid_slug::create_mask(seed: &[u8], iterations: u32, label: &str) -> core::result::Result<uuid_slug::mask::Mask, uuid_slug::error::Error>
pub fn uuid_slug::create_mask_async(seed: &[u8], iterations: u32, label: &str, cancellation: uuid_slug::mask::Cancellation) -> impl core::future::future::Future<Output = core::result::Result<uuid_slug::mask::Mask, uuid_slug::error::Error>> + core::marker::Send + use<>
pub fn uuid_slug::public_mask() -> uuid_slug::mask::Mask
```
