//! Report failures with the same stable codes as the TypeScript package.
use std::{borrow::Cow, fmt};

/// Stable machine-readable failure classification shared with TypeScript.
#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
#[non_exhaustive]
pub enum ErrorCode {
    /// Work was cancelled before completion.
    Aborted,
    /// Invalid base32hex text or nonzero padding.
    InvalidBase32Hex,
    /// Invalid base64url text or nonzero padding.
    InvalidBase64Url,
    /// The requested byte range does not fit the buffer.
    InvalidBuffer,
    /// The mask configuration violates its contract.
    InvalidMask,
    /// A sentinel name or UUID is empty, invalid, or repeats within one masking codec.
    InvalidSentinel,
    /// A timestamp does not satisfy the requested operation's range or precision.
    InvalidTimestamp,
    /// UUID text is not hexadecimal in an accepted hyphenated or compact spelling.
    InvalidUuid,
    /// A slug has an invalid length or cannot be decoded under the configured masks.
    InvalidUuidSlug,
    /// The operation requires an RFC-variant UUIDv7.
    InvalidUuidVersion,
    /// Secure entropy is unavailable.
    RngUnavailable,
    /// The UUID falls outside the accepted timestamp window.
    TimestampOutsideWindow,
}

impl ErrorCode {
    /// Return the cross-language spelling used by TypeScript and development bridges.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Aborted => "aborted",
            Self::InvalidBase32Hex => "invalid_base32hex",
            Self::InvalidBase64Url => "invalid_base64url",
            Self::InvalidBuffer => "invalid_buffer",
            Self::InvalidMask => "invalid_mask",
            Self::InvalidSentinel => "invalid_sentinel",
            Self::InvalidTimestamp => "invalid_timestamp",
            Self::InvalidUuid => "invalid_uuid",
            Self::InvalidUuidSlug => "invalid_uuid_slug",
            Self::InvalidUuidVersion => "invalid_uuid_version",
            Self::RngUnavailable => "rng_unavailable",
            Self::TimestampOutsideWindow => "timestamp_outside_window",
        }
    }

    const fn message(self) -> &'static str {
        match self {
            Self::Aborted => "Operation aborted.",
            Self::InvalidBase32Hex => "Expected base32hex with zero trailing bits.",
            Self::InvalidBase64Url => {
                "Expected canonical 22-character unpadded base64url with zero trailing bits."
            }
            Self::InvalidBuffer => "The requested byte range does not fit the buffer.",
            Self::InvalidMask => "Invalid mask or key parameters.",
            Self::InvalidSentinel => {
                "Sentinel names must be nonempty and unique within a UUIDv7 masking codec."
            }
            Self::InvalidTimestamp => "Timestamp must fit the operation's millisecond range.",
            Self::InvalidUuid => {
                "Expected compact UUID text, canonical hyphenated text, a UUID URN, or brace-wrapped canonical text."
            }
            Self::InvalidUuidSlug => "Invalid slug for the requested operation.",
            Self::InvalidUuidVersion => "This operation requires an RFC-variant UUIDv7.",
            Self::RngUnavailable => "Secure random byte generation failed.",
            Self::TimestampOutsideWindow => "UUID timestamp falls outside the accepted window.",
        }
    }
}

/// A rejected input or unavailable capability with optional diagnostic provenance.
#[derive(Debug)]
pub struct Error {
    code: ErrorCode,
    message: Cow<'static, str>,
    source: Option<Box<dyn std::error::Error + Send + Sync>>,
}

impl Error {
    /// Construct a failure from its stable classification.
    pub const fn new(code: ErrorCode) -> Self {
        Self {
            code,
            message: Cow::Borrowed(code.message()),
            source: None,
        }
    }

    /// Replace the default diagnostic while keeping the stable classification.
    pub(crate) fn with_message(mut self, message: impl Into<Cow<'static, str>>) -> Self {
        self.message = message.into();
        self
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
        f.write_str(&self.message)
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

    #[test]
    fn site_message_preserves_typed_classification() {
        let error = Error::new(ErrorCode::InvalidMask)
            .with_message("Mask seed must contain at least 16 bytes; generate a random seed.");

        assert_eq!(error.code(), ErrorCode::InvalidMask);
        assert_eq!(
            error.to_string(),
            "Mask seed must contain at least 16 bytes; generate a random seed."
        );
    }
}
