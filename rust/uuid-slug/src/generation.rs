//! Generate RFC UUIDs with explicit state and fallible entropy; no global lock is required.
use crate::{Error, Uuid};

/// Largest timestamp the UUIDv7 wire format can carry.
pub const MAX_TIMESTAMP: u64 = (1 << 48) - 1;
const MAX_SEQUENCE: u64 = (1 << 42) - 1;

/// Portable UUIDv7 state; callers own synchronization when sharing a generator.
#[derive(Debug, Default)]
pub struct UuidV7Generator {
    last_ms: Option<u64>,
    sequence: u64,
}
impl UuidV7Generator {
    /// Start without reading the clock or drawing entropy.
    pub const fn new() -> Self {
        Self {
            last_ms: None,
            sequence: 0,
        }
    }
    /// Generate at a clock reading, truncating fractional milliseconds and tolerating rollback.
    /// Failed entropy draws leave the sequence unchanged so retries cannot corrupt state.
    pub fn generate_with(
        &mut self,
        reading: f64,
        mut fill: impl FnMut(&mut [u8]) -> Result<(), Error>,
    ) -> Result<Uuid, Error> {
        let now = timestamp(reading, true)?;
        let (ms, reseed) = match self.last_ms {
            None => (now, true),
            Some(last) if now > last => (now, true),
            Some(last) if self.sequence == MAX_SEQUENCE => {
                if last == MAX_TIMESTAMP {
                    return Err(Error::InvalidTimestamp);
                }
                (last + 1, true)
            }
            Some(last) => (last, false),
        };
        let mut random = [0; 16];
        fill(&mut random).map_err(|cause| Error::RngUnavailable.with_source(cause))?;
        let sequence = if reseed {
            seed(&random)
        } else {
            self.sequence + 1
        };
        let id = assemble(ms, sequence, random);
        self.last_ms = Some(ms);
        self.sequence = sequence;
        Ok(id)
    }
    /// Generate for an explicit whole millisecond without changing the current sequence.
    pub fn at_with(
        &self,
        instant: f64,
        mut fill: impl FnMut(&mut [u8]) -> Result<(), Error>,
    ) -> Result<Uuid, Error> {
        let ms = timestamp(instant, false)?;
        let mut random = [0; 16];
        fill(&mut random).map_err(|cause| Error::RngUnavailable.with_source(cause))?;
        Ok(assemble(ms, seed(&random), random))
    }
    /// Generate into caller storage; reject a short destination before clock or entropy work.
    pub fn generate_into_with(
        &mut self,
        reading: f64,
        out: &mut [u8],
        offset: usize,
        fill: impl FnMut(&mut [u8]) -> Result<(), Error>,
    ) -> Result<(), Error> {
        let target = crate::uuid::range(out.len(), offset)?;
        let id = self.generate_with(reading, fill)?;
        out[target].copy_from_slice(id.as_bytes());
        Ok(())
    }
    /// Generate at an explicit instant into caller storage, checking its range before entropy work.
    pub fn at_into_with(
        &self,
        instant: f64,
        out: &mut [u8],
        offset: usize,
        fill: impl FnMut(&mut [u8]) -> Result<(), Error>,
    ) -> Result<(), Error> {
        let target = crate::uuid::range(out.len(), offset)?;
        let id = self.at_with(instant, fill)?;
        out[target].copy_from_slice(id.as_bytes());
        Ok(())
    }
    /// Generate at the system clock with the operating system's secure entropy source.
    #[cfg(feature = "os-rng")]
    pub fn generate(&mut self) -> Result<Uuid, Error> {
        #[cfg(all(target_arch = "wasm32", target_os = "unknown", feature = "wasm-js"))]
        let reading = js_sys::Date::now();
        #[cfg(all(
            target_arch = "wasm32",
            target_os = "unknown",
            not(feature = "wasm-js")
        ))]
        return Err(Error::InvalidTimestamp);
        #[cfg(not(all(target_arch = "wasm32", target_os = "unknown")))]
        let elapsed = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|error| Error::InvalidTimestamp.with_source(error))?;
        #[cfg(not(all(target_arch = "wasm32", target_os = "unknown")))]
        let reading = elapsed.as_millis() as f64;
        #[cfg(any(
            not(all(target_arch = "wasm32", target_os = "unknown")),
            feature = "wasm-js"
        ))]
        self.generate_with(reading, fill_os_random)
    }
    /// Generate at an explicit timestamp with secure platform entropy.
    #[cfg(feature = "os-rng")]
    pub fn at(&self, instant: f64) -> Result<Uuid, Error> {
        self.at_with(instant, fill_os_random)
    }
}
fn timestamp(value: f64, clock: bool) -> Result<u64, Error> {
    if !value.is_finite()
        || value < 0.0
        || (!clock && value.fract() != 0.0)
        || value.trunc() > MAX_TIMESTAMP as f64
    {
        return Err(Error::InvalidTimestamp);
    }
    Ok(value as u64)
}
fn seed(bytes: &[u8; 16]) -> u64 {
    (u64::from(bytes[0]) << 34)
        | (u64::from(bytes[1]) << 26)
        | (u64::from(bytes[2]) << 18)
        | (u64::from(bytes[3]) << 10)
        | (u64::from(bytes[4]) << 2)
        | u64::from(bytes[5] & 3)
}
fn assemble(ms: u64, sequence: u64, mut random: [u8; 16]) -> Uuid {
    random[..6].copy_from_slice(&ms.to_be_bytes()[2..]);
    random[6] = 0x70 | ((sequence >> 38) as u8 & 15);
    random[7] = (sequence >> 30) as u8;
    random[8] = 0x80 | ((sequence >> 24) as u8 & 63);
    random[9] = (sequence >> 16) as u8;
    random[10] = (sequence >> 8) as u8;
    random[11] = sequence as u8;
    Uuid::from_bytes(random)
}
/// Generate a random version-4 UUID from a fallible entropy source.
pub fn uuid_v4_with(mut fill: impl FnMut(&mut [u8]) -> Result<(), Error>) -> Result<Uuid, Error> {
    let mut bytes = [0; 16];
    fill(&mut bytes).map_err(|cause| Error::RngUnavailable.with_source(cause))?;
    bytes[6] = (bytes[6] & 15) | 0x40;
    bytes[8] = (bytes[8] & 63) | 0x80;
    Ok(Uuid::from_bytes(bytes))
}
/// Fill from the platform CSPRNG, retaining its error as the cause on failure.
#[cfg(feature = "os-rng")]
pub fn fill_os_random(out: &mut [u8]) -> Result<(), Error> {
    getrandom::fill(out).map_err(|error| Error::RngUnavailable.with_source(error))
}
/// Generate a version-4 UUID with secure platform entropy.
#[cfg(feature = "os-rng")]
pub fn uuid_v4() -> Result<Uuid, Error> {
    uuid_v4_with(fill_os_random)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fill(out: &mut [u8]) -> Result<(), Error> {
        for (i, byte) in out.iter_mut().enumerate() {
            *byte = i as u8;
        }
        Ok(())
    }
    #[test]
    fn callback_failures_keep_entropy_classification_and_cause() {
        use std::error::Error as _;
        let mut generator = UuidV7Generator::new();
        let fail = |_: &mut [u8]| Err(Error::InvalidBuffer);
        for result in [
            uuid_v4_with(fail),
            generator.generate_with(1.0, fail),
            generator.at_with(1.0, fail),
        ] {
            let error = result.unwrap_err();
            assert_eq!(error.code(), "rng_unavailable");
            assert!(error.source().is_some());
        }
        let mut output = [19; 16];
        let untouched = |_: &mut [u8]| -> Result<(), Error> {
            panic!("invalid range must reject before entropy")
        };
        assert!(
            generator
                .generate_into_with(1.0, &mut output, 1, untouched)
                .is_err()
        );
        assert!(
            generator
                .at_into_with(1.0, &mut output, usize::MAX, untouched)
                .is_err()
        );
        assert_eq!(output, [19; 16]);
    }
    #[test]
    fn explicit_time_does_not_mutate_clock_sequence() -> Result<(), Error> {
        let mut generator = UuidV7Generator::new();
        let first = generator.generate_with(123.9, fill)?;
        assert_eq!(first.to_string(), "00000000-007b-7000-8408-0c110c0d0e0f");
        assert_eq!(generator.at_with(7.0, fill)?.timestamp()?, 7);
        assert_eq!(generator.generate_with(100.0, fill)?.timestamp()?, 123);
        for invalid in [-1.0, f64::NAN, f64::INFINITY, (MAX_TIMESTAMP + 1) as f64] {
            assert!(generator.generate_with(invalid, fill).is_err());
        }
        assert!(generator.at_with(1.5, fill).is_err());
        Ok(())
    }
    #[test]
    fn entropy_failure_and_counter_exhaustion_do_not_corrupt_retry() -> Result<(), Error> {
        let mut generator = UuidV7Generator {
            last_ms: Some(10),
            sequence: MAX_SEQUENCE,
        };
        assert!(
            generator
                .generate_with(9.0, |_| Err(Error::RngUnavailable))
                .is_err()
        );
        assert_eq!(generator.last_ms, Some(10));
        assert_eq!(generator.sequence, MAX_SEQUENCE);
        assert_eq!(generator.generate_with(9.0, fill)?.timestamp()?, 11);
        generator.last_ms = Some(MAX_TIMESTAMP);
        generator.sequence = MAX_SEQUENCE;
        assert!(generator.generate_with(0.0, fill).is_err());
        assert_eq!(generator.sequence, MAX_SEQUENCE);
        Ok(())
    }
}
