//! Keep known masked inputs out of keyless parsing without changing ordinary string storage.
use crate::{Error, ErrorCode, PlainUuidSlug, Uuid, UuidSlugAlphabet, uuid::utf16_len};
use alloc::{
    borrow::{Cow, ToOwned},
    boxed::Box,
    format,
    rc::Rc,
    string::String,
    sync::Arc,
    vec::Vec,
};

/// Text accepted by UUID and plain-slug parsers that do not use a key.
///
/// Implemented for `str`, `String`, [`PlainUuidSlug`], ASCII text bytes (`[u8]`, `[u8; N]`, `Vec<u8>`),
/// and references, [`Box`], [`Rc`], [`Arc`] or [`Cow`] around accepted inputs.
/// For [`Uuid::parse_uuid`], exactly 16 bytes are a raw UUID (as in TypeScript's `parseUuid`); other byte lengths are ASCII text, parsed without a separate UTF-8 check.
/// Only this crate can add implementations; custom wrappers must pass an explicit `&str` or `&[u8]`.
/// That removes the type distinction: a 22-character masked slug can also be valid plain text for a different UUID. Decode masked values with their codec.
///
/// ```compile_fail
/// use uuid_slug::{KeylessUuidText, MaskedUuidV7Slug};
/// fn keyless<Input: KeylessUuidText + ?Sized>(_: &Input) {}
/// fn reject(masked: &MaskedUuidV7Slug) { keyless(masked); }
/// ```
///
/// ```compile_fail
/// use uuid_slug::{KeylessUuidText, MaskedOrSentinelUuidV7Slug};
/// fn keyless<Input: KeylessUuidText + ?Sized>(_: &Input) {}
/// fn reject(mixed: &MaskedOrSentinelUuidV7Slug) { keyless(mixed); }
/// ```
#[diagnostic::on_unimplemented(
    message = "`{Self}` is not accepted by keyless UUID parsing",
    note = "Decode masked slugs with their UuidV7MaskingCodec. For a custom string wrapper, pass an explicit &str view."
)]
pub trait KeylessUuidText: sealed::Text {}

// A blanket AsRef<str> or Deref implementation would admit masked types too. Keep the
// accepted leaves closed and forward only through containers that preserve their inner type.
// Explicit public implementations keep compiler errors on this documented bound, including
// nested containers, instead of exposing the private text-access trait to callers.
impl KeylessUuidText for str {}
impl KeylessUuidText for String {}
impl KeylessUuidText for PlainUuidSlug {}
impl KeylessUuidText for [u8] {}
impl<const N: usize> KeylessUuidText for [u8; N] {}
impl KeylessUuidText for Vec<u8> {}

mod sealed {
    pub trait Text {
        fn as_uuid_text(&self) -> &[u8];
        /// Byte containers may also carry a raw 16-byte UUID; text containers never do.
        fn is_bytes(&self) -> bool {
            false
        }
    }
}

impl sealed::Text for str {
    fn as_uuid_text(&self) -> &[u8] {
        self.as_bytes()
    }
}

impl sealed::Text for String {
    fn as_uuid_text(&self) -> &[u8] {
        self.as_bytes()
    }
}

impl sealed::Text for PlainUuidSlug {
    fn as_uuid_text(&self) -> &[u8] {
        self.as_str().as_bytes()
    }
}

// Bytes mean what TypeScript's `parseUuid(Uint8Array)` means, plus text: exactly 16 bytes are a
// raw UUID, and no UUID text or slug spelling is 16 characters long, so that reading is never
// ambiguous. Any other length is ASCII UUID text or a plain slug, parsed without a caller-side
// UTF-8 pass: every accepted spelling is ASCII, so the grammar itself rejects any other byte.
macro_rules! byte_text {
    ($($bytes:ty),+ $(,)?) => {$(
        impl sealed::Text for $bytes {
            fn as_uuid_text(&self) -> &[u8] {
                self
            }
            fn is_bytes(&self) -> bool {
                true
            }
        }
    )+};
}
byte_text!([u8], Vec<u8>);

impl<const N: usize> sealed::Text for [u8; N] {
    fn as_uuid_text(&self) -> &[u8] {
        self
    }
    fn is_bytes(&self) -> bool {
        true
    }
}

macro_rules! borrowed_text {
    ($($container:ty),+ $(,)?) => {$(
        impl<Input: KeylessUuidText + ?Sized> KeylessUuidText for $container {}
        impl<Input: KeylessUuidText + ?Sized> sealed::Text for $container {
            fn as_uuid_text(&self) -> &[u8] {
                (**self).as_uuid_text()
            }
            fn is_bytes(&self) -> bool {
                (**self).is_bytes()
            }
        }
    )+};
}
borrowed_text!(&Input, &mut Input, Box<Input>, Rc<Input>, Arc<Input>);

impl<Input: KeylessUuidText + ToOwned + ?Sized> KeylessUuidText for Cow<'_, Input> {}

impl<Input: KeylessUuidText + ToOwned + ?Sized> sealed::Text for Cow<'_, Input> {
    fn as_uuid_text(&self) -> &[u8] {
        self.as_ref().as_uuid_text()
    }
    fn is_bytes(&self) -> bool {
        self.as_ref().is_bytes()
    }
}

// TypeScript classifies input by UTF-16 length, so non-ASCII text keeps that count. ASCII (every
// valid spelling) needs no UTF-16 pass: its byte length is the same number. Bytes that are not
// UTF-8 have no UTF-16 length; their byte count is the only meaningful one.
fn text_units(text: &[u8]) -> usize {
    if text.is_ascii() {
        return text.len();
    }
    core::str::from_utf8(text).map_or(text.len(), utf16_len)
}

// Keep the parsers nongeneric: the input boundary borrows text, not a separate decoder per
// container. Plain-slug lengths (22 and 26) do not overlap any supported UUID text length.
pub(crate) fn parse_uuid(text: &[u8]) -> Result<Uuid, Error> {
    match text_units(text) {
        22 | 26 => from_plain_uuid_slug(text),
        _ => crate::uuid::parse_uuid_text(text),
    }
}

pub(crate) fn from_plain_uuid_slug(text: &[u8]) -> Result<Uuid, Error> {
    let alphabet = match text_units(text) {
        22 => UuidSlugAlphabet::Base64Url,
        26 => UuidSlugAlphabet::Base32Hex,
        _ => {
            return Err(Error::new(ErrorCode::InvalidUuidSlug).with_message(format!(
                "Plain UUID slug must contain 22 base64url or 26 base32hex characters; got {}.",
                text_units(text)
            )));
        }
    };
    let mut bytes = [0; 16];
    alphabet.decode_into(text, &mut bytes, 0)?;
    Ok(Uuid::from_uuid_bytes_array(bytes))
}

#[cfg(test)]
mod tests {
    use super::*;
    use alloc::string::ToString;

    // Compile the same public calls through each container rather than converting the fixture
    // to str first: that would hide an inconvenient or missing implementation of the boundary.
    fn check<Input: KeylessUuidText + ?Sized>(
        input: &Input,
        alphabet: UuidSlugAlphabet,
        uuid: Uuid,
    ) -> Result<(), Error> {
        assert_eq!(Uuid::parse_uuid(input)?, uuid);
        assert_eq!(Uuid::from_plain_uuid_slug(input)?, uuid);
        assert_eq!(
            alphabet.plain_slug_to_uuid_bytes(input)?,
            *uuid.as_uuid_bytes()
        );
        let mut output = [0; 16];
        assert_eq!(
            alphabet.plain_slug_to_uuid_bytes_into(input, &mut output, 0)?,
            uuid.as_uuid_bytes()
        );
        Ok(())
    }

    #[test]
    fn standard_containers_preserve_keyless_call_convenience() -> Result<(), Error> {
        let uuid = Uuid::from_uuid_string("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051")?;
        for alphabet in [UuidSlugAlphabet::Base64Url, UuidSlugAlphabet::Base32Hex] {
            let plain = uuid.to_plain_uuid_slug(alphabet);
            check(plain.as_str(), alphabet, uuid)?;
            check(&plain, alphabet, uuid)?;
            check(&&plain, alphabet, uuid)?;
            let mut borrowed = &plain;
            check(&&mut borrowed, alphabet, uuid)?;
            check(&plain.to_string(), alphabet, uuid)?;
            check(&Box::new(plain.clone()), alphabet, uuid)?;
            check(&Box::<str>::from(plain.as_str()), alphabet, uuid)?;
            check(&Rc::new(plain.to_string()), alphabet, uuid)?;
            check(&Rc::<str>::from(plain.as_str()), alphabet, uuid)?;
            check(&Arc::new(plain.clone()), alphabet, uuid)?;
            check(&Arc::<str>::from(plain.as_str()), alphabet, uuid)?;
            check(&Cow::Borrowed(&plain), alphabet, uuid)?;
            check(&Cow::Borrowed(plain.as_str()), alphabet, uuid)?;
            check(&Cow::<'_, str>::Owned(plain.to_string()), alphabet, uuid)?;
            let erased: &dyn KeylessUuidText = &plain;
            check(erased, alphabet, uuid)?;
            check(plain.as_str().as_bytes(), alphabet, uuid)?;
            check(&plain.as_str().as_bytes().to_vec(), alphabet, uuid)?;
        }
        // ASCII bytes take the same grammar as text, including fixed arrays from byte literals.
        assert_eq!(
            Uuid::parse_uuid(b"0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051")?,
            uuid
        );
        assert_eq!(
            Uuid::parse_uuid(b"urn:uuid:0190A1B2-C3D4-7E5F-8A9B-0C1D2E3F4051")?,
            uuid
        );
        // Invalid UTF-8 is just invalid text. Exactly 16 bytes are a raw UUID, matching
        // TypeScript; the same 16 characters as a str remain invalid text.
        let mut broken = *b"0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
        broken[0] = 0xff;
        assert_eq!(
            Uuid::parse_uuid(&broken).unwrap_err().code(),
            ErrorCode::InvalidUuid
        );
        assert_eq!(Uuid::parse_uuid(uuid.as_uuid_bytes())?, uuid);
        assert_eq!(Uuid::parse_uuid(&uuid.as_uuid_bytes()[..])?, uuid);
        assert_eq!(
            Uuid::parse_uuid(&Box::<[u8]>::from(&uuid.as_uuid_bytes()[..]))?,
            uuid
        );
        assert_eq!(
            Uuid::parse_uuid("0123456789abcdef").unwrap_err().code(),
            ErrorCode::InvalidUuid
        );
        let parse: fn(&str) -> Result<Uuid, Error> = Uuid::parse_uuid;
        assert_eq!(parse(&uuid.to_string())?, uuid);
        assert_eq!(parse("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051")?, uuid);
        Ok(())
    }
}
