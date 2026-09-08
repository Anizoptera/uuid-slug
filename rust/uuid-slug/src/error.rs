//! Report failures with the same stable codes as the TypeScript package.
use std::fmt;

/// A rejected input or unavailable runtime capability.
#[derive(Debug)]
#[non_exhaustive]
pub enum Error {
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
    /// Preserve a runtime failure without changing the public error code.
    Caused {
        /// Stable classification of the failed operation.
        error: Box<Error>,
        /// Original runtime or callback error.
        source: Box<dyn std::error::Error + Send + Sync>,
    },
}
impl Error {
    /// Stable machine-readable code shared with TypeScript.
    pub fn code(&self) -> &'static str {
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
            Self::Caused { error, .. } => error.code(),
        }
    }
    /// Attach the original failure for diagnostics at runtime boundaries.
    pub fn with_source(self, source: impl std::error::Error + Send + Sync + 'static) -> Self {
        Self::Caused {
            error: Box::new(self),
            source: Box::new(source),
        }
    }
}
impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = match self {
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
            Self::Caused { error, .. } => return error.fmt(f),
        };
        f.write_str(message)
    }
}
impl std::error::Error for Error {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Caused { source, .. } => Some(source.as_ref()),
            _ => None,
        }
    }
}
