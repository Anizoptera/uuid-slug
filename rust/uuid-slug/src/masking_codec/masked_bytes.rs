//! Binary transport reuses the existing mixed block and never guesses provenance from byte length.

use super::UuidV7MaskingCodec;
use crate::{Error, ErrorCode, Uuid};

/// A 16-byte masked UUIDv7 value with a 12-bit check. Decode it with its masking codec.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct MaskedUuidV7Bytes([u8; 16]);

impl MaskedUuidV7Bytes {
    /// Borrow the masked bytes without copying.
    pub const fn as_bytes(&self) -> &[u8; 16] {
        &self.0
    }

    /// Return the stored masked bytes unchanged.
    pub const fn into_bytes(self) -> [u8; 16] {
        self.0
    }
}

impl AsRef<[u8]> for MaskedUuidV7Bytes {
    fn as_ref(&self) -> &[u8] {
        &self.0
    }
}

/// Either masked bytes or an unmasked registered sentinel.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum MaskedOrSentinelUuidV7Bytes {
    /// Masked UUIDv7 bytes.
    Masked(MaskedUuidV7Bytes),
    /// A registered sentinel preserved without masking.
    Sentinel(Uuid),
}

impl MaskedOrSentinelUuidV7Bytes {
    /// Borrow the stored bytes without allocating; sentinel bytes are unmasked.
    pub const fn as_bytes(&self) -> &[u8; 16] {
        match self {
            Self::Masked(bytes) => bytes.as_bytes(),
            Self::Sentinel(uuid) => uuid.as_uuid_bytes(),
        }
    }

    /// Return the stored bytes unchanged.
    pub fn into_bytes(self) -> [u8; 16] {
        match self {
            Self::Masked(bytes) => bytes.into_bytes(),
            Self::Sentinel(uuid) => uuid.into(),
        }
    }
}

impl AsRef<[u8]> for MaskedOrSentinelUuidV7Bytes {
    fn as_ref(&self) -> &[u8] {
        self.as_bytes()
    }
}

impl UuidV7MaskingCodec {
    /// Mask a UUIDv7 into 16 bytes. Sentinels keep their raw bytes and full timestamp range.
    /// Reject non-v7 input, out-of-range timestamps and masked output that matches a reserved sentinel. A mask callback error fails the operation.
    /// The binary check is 12 bits; text slugs keep 16. Neither authenticates an ID.
    pub fn uuid_to_masked_bytes(&self, uuid: Uuid) -> Result<MaskedOrSentinelUuidV7Bytes, Error> {
        uuid.extract_uuid_v7_unix_ms()?;
        if self.sentinels.iter().any(|entry| entry.uuid == uuid) {
            return Ok(MaskedOrSentinelUuidV7Bytes::Sentinel(uuid));
        }
        let current = &self.masks[0];
        let (bytes, _) = crate::payload::mask_bytes(
            uuid.as_uuid_bytes(),
            &current.mask,
            current.timestamp_range_start_unix_ms,
        )?;
        // A binary value has no outer nibble to distinguish a reserved raw sentinel.
        if self
            .sentinels
            .iter()
            .any(|entry| entry.uuid.as_uuid_bytes() == &bytes)
        {
            return Err(Error::new(ErrorCode::InvalidMask).with_message(
                "Masked output matches a sentinel; use a different mask or sentinel set.",
            ));
        }
        Ok(MaskedOrSentinelUuidV7Bytes::Masked(MaskedUuidV7Bytes(
            bytes,
        )))
    }

    /// Read exactly 16 masked bytes. Registered sentinels take priority; otherwise try the current key, then previous keys in their configured order.
    /// Return the first UUID whose 12-bit check passes. A wrong key can pass; a callback error stops the search.
    /// The input stays unchanged. A wrong length or no passing key returns an error.
    pub fn masked_bytes_to_uuid(&self, masked_uuid_bytes: &[u8]) -> Result<Uuid, Error> {
        let bytes: [u8; 16] = masked_uuid_bytes.try_into().map_err(|_| {
            Error::new(ErrorCode::InvalidBuffer)
                .with_message("Masked UUID byte input must contain exactly 16 bytes.")
        })?;
        if let Some(sentinel) = self
            .sentinels
            .iter()
            .find(|entry| entry.uuid.as_uuid_bytes() == &bytes)
        {
            return Ok(sentinel.uuid);
        }
        // Each attempt owns a block copy, so custom callbacks cannot alter the next key's input.
        for range in &self.masks {
            if let Some(decoded) = crate::payload::candidate_bytes(
                bytes,
                &range.mask,
                range.timestamp_range_start_unix_ms,
            )? {
                return Ok(Uuid::from_uuid_bytes_array(decoded));
            }
        }
        Err(Error::new(ErrorCode::InvalidUuidSlug).with_message(
            "No configured mask and timestamp range accepts these masked bytes; use the codec configuration that issued them.",
        ))
    }

    /// Write exactly 16 transport bytes at `output_offset`; leave all output unchanged on failure.
    pub fn uuid_to_masked_bytes_into(
        &self,
        uuid: Uuid,
        output: &mut [u8],
        output_offset: usize,
    ) -> Result<(), Error> {
        let end = crate::buffer_range::uuid_end(output.len(), output_offset)
            .ok_or_else(|| Error::new(ErrorCode::InvalidBuffer))?;
        let bytes = self.uuid_to_masked_bytes(uuid)?;
        output[output_offset..end].copy_from_slice(bytes.as_bytes());
        Ok(())
    }

    /// Decode into the 16 bytes at `output_offset`. Failure leaves the whole output unchanged.
    pub fn masked_bytes_to_uuid_bytes_into(
        &self,
        masked_uuid_bytes: &[u8],
        output: &mut [u8],
        output_offset: usize,
    ) -> Result<(), Error> {
        let end = crate::buffer_range::uuid_end(output.len(), output_offset)
            .ok_or_else(|| Error::new(ErrorCode::InvalidBuffer))?;
        let uuid = self.masked_bytes_to_uuid(masked_uuid_bytes)?;
        output[output_offset..end].copy_from_slice(uuid.as_uuid_bytes());
        Ok(())
    }
}
