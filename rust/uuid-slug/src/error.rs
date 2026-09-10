//! Report failures with the same stable codes as the TypeScript package.
use std::fmt;

/// Stable machine-readable failure classification shared with TypeScript.
#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
#[non_exhaustive]
pub enum ErrorCode {
    /// Work was cancelled before completion.
    Aborted,
    /// Invalid lowercase base32hex text or nonzero padding.
    InvalidBase32,
    /// Invalid base64url text or nonzero padding.
    InvalidBase64Url,
    /// The requested byte range does not fit the buffer.
    InvalidBuffer,
    /// The mask configuration violates its contract.
    InvalidMaskSchema,
    /// A timestamp is nonfinite, negative, fractional or outside its allowed range.
    InvalidTimestamp,
    /// UUID text is not canonical lowercase hexadecimal with hyphens.
    InvalidUuid,
    /// A slug has an invalid length or cannot be decoded under the configured schemas.
    InvalidUuidSlug,
    /// The operation requires an RFC-variant UUIDv7.
    InvalidUuidVersion,
    /// Secure entropy is unavailable.
    RngUnavailable,
    /// The UUID falls outside the accepted freshness window.
    StaleUuid,
}

impl ErrorCode {
    /// Return the cross-language spelling used by TypeScript and development bridges.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Aborted => "aborted",
            Self::InvalidBase32 => "invalid_base32",
            Self::InvalidBase64Url => "invalid_base64url",
            Self::InvalidBuffer => "invalid_buffer",
            Self::InvalidMaskSchema => "invalid_mask_schema",
            Self::InvalidTimestamp => "invalid_timestamp",
            Self::InvalidUuid => "invalid_uuid",
            Self::InvalidUuidSlug => "invalid_uuid_slug",
            Self::InvalidUuidVersion => "invalid_uuid_version",
            Self::RngUnavailable => "rng_unavailable",
            Self::StaleUuid => "stale_uuid",
        }
    }

    const fn message(self) -> &'static str {
        match self {
            Self::Aborted => "Operation aborted.",
            Self::InvalidBase32 => {
                "Expected canonical lowercase base32hex with zero trailing bits."
            }
            Self::InvalidBase64Url => {
                "Expected canonical 22-character unpadded base64url with zero trailing bits."
            }
            Self::InvalidBuffer => "The requested byte range does not fit the buffer.",
            Self::InvalidMaskSchema => "Invalid mask schema or key parameters.",
            Self::InvalidTimestamp => "Timestamp must fit the operation's millisecond range.",
            Self::InvalidUuid => "Expected a lowercase UUID with canonical hyphens.",
            Self::InvalidUuidSlug => "Invalid slug for the requested operation.",
            Self::InvalidUuidVersion => "This operation requires an RFC-variant UUIDv7.",
            Self::RngUnavailable => "Secure random byte generation failed.",
            Self::StaleUuid => "UUID timestamp falls outside the freshness window.",
        }
    }
}

/// A rejected input or unavailable capability with optional diagnostic provenance.
#[derive(Debug)]
pub struct Error {
    code: ErrorCode,
    source: Option<Box<dyn std::error::Error + Send + Sync>>,
}

impl Error {
    /// Construct a failure from its stable classification.
    pub const fn new(code: ErrorCode) -> Self {
        Self { code, source: None }
    }

    /// Return the stable typed classification without inspecting its diagnostic source.
    pub const fn code(&self) -> ErrorCode {
        self.code
    }

    /// Attach the original failure without changing this error's classification.
    pub fn with_source(mut self, source: impl std::error::Error + Send + Sync + 'static) -> Self {
        self.source = Some(Box::new(source));
        self
    }
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.code.message())
    }
}

impl std::error::Error for Error {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        self.source
            .as_deref()
            .map(|source| source as &(dyn std::error::Error + 'static))
    }
}

#[cfg(test)]
mod tests {
    use super::{Error, ErrorCode};
    use std::error::Error as _;

    #[test]
    fn source_attachment_preserves_typed_classification() {
        let error = Error::new(ErrorCode::RngUnavailable)
            .with_source(std::io::Error::other("entropy offline"));

        assert_eq!(error.code(), ErrorCode::RngUnavailable);
        assert_eq!(error.code().as_str(), "rng_unavailable");
        assert_eq!(
            error.source().map(ToString::to_string).as_deref(),
            Some("entropy offline")
        );
    }
}
