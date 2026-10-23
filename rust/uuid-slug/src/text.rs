//! Keep known masked inputs out of keyless parsing without changing ordinary string storage.
use crate::{Error, ErrorCode, PlainUuidSlug, Uuid, UuidSlugAlphabet, uuid::utf16_len};
use alloc::{
    borrow::{Cow, ToOwned},
    boxed::Box,
    format,
    rc::Rc,
    string::String,
    sync::Arc,
};

/// Text accepted by keyless UUID and plain-slug parsers.
///
/// Implemented for `str`, `String`, [`PlainUuidSlug`], and references, [`Box`], [`Rc`],
/// [`Arc`] or [`Cow`] around accepted inputs. This trait is sealed; custom wrappers pass an
/// explicit string view. Raw strings do not establish provenance: a 22-character masked slug
/// can also be valid plain text for a different UUID. Decode masked values with their codec.
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

mod sealed {
    pub trait Text {
        fn as_uuid_text(&self) -> &str;
    }
}

impl sealed::Text for str {
    fn as_uuid_text(&self) -> &str {
        self
    }
}

impl sealed::Text for String {
    fn as_uuid_text(&self) -> &str {
        self.as_str()
    }
}

impl sealed::Text for PlainUuidSlug {
    fn as_uuid_text(&self) -> &str {
        self.as_str()
    }
}

macro_rules! borrowed_text {
    ($($container:ty),+ $(,)?) => {$(
        impl<Input: KeylessUuidText + ?Sized> KeylessUuidText for $container {}
        impl<Input: KeylessUuidText + ?Sized> sealed::Text for $container {
            fn as_uuid_text(&self) -> &str {
                (**self).as_uuid_text()
            }
        }
    )+};
}
borrowed_text!(&Input, &mut Input, Box<Input>, Rc<Input>, Arc<Input>);

impl<Input: KeylessUuidText + ToOwned + ?Sized> KeylessUuidText for Cow<'_, Input> {}

impl<Input: KeylessUuidText + ToOwned + ?Sized> sealed::Text for Cow<'_, Input> {
    fn as_uuid_text(&self) -> &str {
        self.as_ref().as_uuid_text()
    }
}

// Keep the parsers nongeneric: the input boundary borrows text, not a separate decoder per
// container. UTF-16 length preserves TypeScript's error classification for non-ASCII input.
pub(crate) fn parse_uuid(text: &str) -> Result<Uuid, Error> {
    match utf16_len(text) {
        22 | 26 => from_plain_uuid_slug(text),
        _ => text.parse(),
    }
}

pub(crate) fn from_plain_uuid_slug(text: &str) -> Result<Uuid, Error> {
    let alphabet = match utf16_len(text) {
        22 => UuidSlugAlphabet::Base64Url,
        26 => UuidSlugAlphabet::Base32Hex,
        _ => {
            return Err(Error::new(ErrorCode::InvalidUuidSlug).with_message(format!(
                "Plain UUID slug must contain 22 base64url or 26 base32hex characters; got {}.",
                utf16_len(text)
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
        }
        let parse: fn(&str) -> Result<Uuid, Error> = Uuid::parse_uuid;
        assert_eq!(parse(&uuid.to_string())?, uuid);
        assert_eq!(parse("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051")?, uuid);
        Ok(())
    }
}
