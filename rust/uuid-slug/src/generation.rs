//! Generate RFC UUIDs with explicit state and fallible entropy; no global lock is required.
//!
//! Every `_with` callback must fill every requested byte from its chosen source or return an
//! error. A successful partial fill cannot be distinguished reliably from valid random bytes.
//! Use the default generators for platform CSPRNG entropy; custom callbacks own that guarantee.
use crate::{Error, ErrorCode, Uuid};

/// Largest timestamp the UUIDv7 wire format can carry.
pub const MAX_UUID_V7_UNIX_MS: u64 = (1 << 48) - 1;
const MAX_SEQUENCE: u64 = (1 << 42) - 1;

/// Inclusive UUIDv7 search bounds for a Unix-millisecond interval.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct UuidV7Bounds {
    /// Smallest RFC-variant UUIDv7 at the first requested millisecond.
    pub start_inclusive: Uuid,
    /// Largest RFC-variant UUIDv7 at the last requested millisecond.
    pub end_inclusive: Uuid,
}

fn uuid_v7_endpoint(unix_ms: u64, upper: bool) -> Uuid {
    let mut bytes = if upper { [u8::MAX; 16] } else { [0; 16] };
    bytes[..6].copy_from_slice(&unix_ms.to_be_bytes()[2..]);
    bytes[6] = if upper { 0x7f } else { 0x70 };
    bytes[8] = if upper { 0xbf } else { 0x80 };
    Uuid::from_uuid_bytes_array(bytes)
}

/// Return bounds containing every RFC-variant UUIDv7 from `start_unix_ms` through the optional
/// inclusive end. Omit the end to select one millisecond. Comparison must follow UUID wire order.
pub fn uuid_v7_bounds(start_unix_ms: u64, end_unix_ms: Option<u64>) -> Result<UuidV7Bounds, Error> {
    let end_unix_ms = end_unix_ms.unwrap_or(start_unix_ms);
    if start_unix_ms > MAX_UUID_V7_UNIX_MS
        || end_unix_ms > MAX_UUID_V7_UNIX_MS
        || start_unix_ms > end_unix_ms
    {
        return Err(Error::new(ErrorCode::InvalidTimestamp));
    }
    Ok(UuidV7Bounds {
        start_inclusive: uuid_v7_endpoint(start_unix_ms, false),
        end_inclusive: uuid_v7_endpoint(end_unix_ms, true),
    })
}

/// Policy for a system clock that falls below one generator's accepted high-water reading.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum UuidV7ClockRollbackPolicy {
    /// Keep the last UUID timestamp and advance its sequence until the clock catches up.
    #[default]
    Preserve,
    /// Preserve skew through `tolerance_ms`, then restart at the current clock reading.
    Reset {
        /// Inclusive skew that keeps the last UUID timestamp.
        tolerance_ms: u64,
    },
    /// Preserve skew through `tolerance_ms`, then return `InvalidTimestamp` without changing state.
    Error {
        /// Inclusive skew that keeps the last UUID timestamp.
        tolerance_ms: u64,
    },
}

/// Portable UUIDv7 state; callers own synchronization when sharing a generator.
#[derive(Debug, Default)]
pub struct UuidV7Generator {
    last_ms: Option<u64>,
    clock_high_water_ms: Option<u64>,
    sequence: u64,
    rollback_policy: UuidV7ClockRollbackPolicy,
}
impl UuidV7Generator {
    /// Start without reading the clock or drawing entropy.
    pub const fn new() -> Self {
        Self {
            last_ms: None,
            clock_high_water_ms: None,
            sequence: 0,
            rollback_policy: UuidV7ClockRollbackPolicy::Preserve,
        }
    }
    /// Set how this generator handles clock skew beyond an optional tolerance.
    #[must_use]
    pub const fn with_clock_rollback_policy(mut self, policy: UuidV7ClockRollbackPolicy) -> Self {
        self.rollback_policy = policy;
        self
    }
    /// Generate at a clock reading, truncating fractional milliseconds and applying its rollback policy.
    /// A reseed requests ten random bytes; continuation at the same UUID timestamp requests four.
    /// Failed entropy draws leave the sequence unchanged so retries cannot corrupt state.
    pub fn generate_uuid_v7_with_random_fill(
        &mut self,
        unix_ms: f64,
        mut fill: impl FnMut(&mut [u8]) -> Result<(), Error>,
    ) -> Result<Uuid, Error> {
        let now = timestamp(unix_ms, true)?;
        let rollback_ms = self
            .clock_high_water_ms
            .and_then(|high_water| high_water.checked_sub(now));
        let reset_clock = match (rollback_ms, self.rollback_policy) {
            (Some(rollback), UuidV7ClockRollbackPolicy::Reset { tolerance_ms })
                if rollback > tolerance_ms =>
            {
                true
            }
            (Some(rollback), UuidV7ClockRollbackPolicy::Error { tolerance_ms })
                if rollback > tolerance_ms =>
            {
                return Err(Error::new(ErrorCode::InvalidTimestamp));
            }
            _ => false,
        };
        let (ms, reseed) = match (reset_clock, self.last_ms) {
            (true, _) => (now, true),
            (false, None) => (now, true),
            (false, Some(last)) if now > last => (now, true),
            (false, Some(last)) if self.sequence == MAX_SEQUENCE => {
                if last == MAX_UUID_V7_UNIX_MS {
                    return Err(Error::new(ErrorCode::InvalidTimestamp));
                }
                (last + 1, true)
            }
            (false, Some(last)) => (last, false),
        };
        let mut random = [0; 10];
        fill(if reseed {
            &mut random
        } else {
            &mut random[6..]
        })
        .map_err(|cause| Error::new(ErrorCode::RngUnavailable).with_source(cause))?;
        let sequence = if reseed {
            seed(&random)
        } else {
            self.sequence + 1
        };
        let id = assemble(ms, sequence, random);
        self.last_ms = Some(ms);
        self.clock_high_water_ms = Some(if reset_clock {
            now
        } else {
            self.clock_high_water_ms.unwrap_or(now).max(now)
        });
        self.sequence = sequence;
        Ok(id)
    }
    /// Generate for an explicit whole millisecond from ten random bytes without changing the current sequence.
    pub fn generate_uuid_v7_at_unix_ms_with_random_fill(
        &self,
        unix_ms: f64,
        mut fill: impl FnMut(&mut [u8]) -> Result<(), Error>,
    ) -> Result<Uuid, Error> {
        let ms = timestamp(unix_ms, false)?;
        let mut random = [0; 10];
        fill(&mut random)
            .map_err(|cause| Error::new(ErrorCode::RngUnavailable).with_source(cause))?;
        Ok(assemble(ms, seed(&random), random))
    }
    /// Generate into caller storage; reject a short destination before clock or entropy work.
    pub fn generate_uuid_v7_into_with_random_fill(
        &mut self,
        unix_ms: f64,
        out: &mut [u8],
        offset: usize,
        fill: impl FnMut(&mut [u8]) -> Result<(), Error>,
    ) -> Result<(), Error> {
        let target = crate::uuid::range(out.len(), offset)?;
        let id = self.generate_uuid_v7_with_random_fill(unix_ms, fill)?;
        out[target].copy_from_slice(id.as_uuid_bytes());
        Ok(())
    }
    /// Generate at an explicit instant into caller storage, checking its range before entropy work.
    pub fn generate_uuid_v7_at_unix_ms_into_with_random_fill(
        &self,
        unix_ms: f64,
        out: &mut [u8],
        offset: usize,
        fill: impl FnMut(&mut [u8]) -> Result<(), Error>,
    ) -> Result<(), Error> {
        let target = crate::uuid::range(out.len(), offset)?;
        let id = self.generate_uuid_v7_at_unix_ms_with_random_fill(unix_ms, fill)?;
        out[target].copy_from_slice(id.as_uuid_bytes());
        Ok(())
    }
    /// Generate at the system clock with the operating system's secure entropy source.
    #[cfg(feature = "os-rng")]
    pub fn generate_uuid_v7(&mut self) -> Result<Uuid, Error> {
        #[cfg(all(target_arch = "wasm32", target_os = "unknown", feature = "wasm-js"))]
        let reading = js_sys::Date::now();
        #[cfg(all(
            target_arch = "wasm32",
            target_os = "unknown",
            not(feature = "wasm-js")
        ))]
        return Err(Error::new(ErrorCode::InvalidTimestamp));
        #[cfg(not(all(target_arch = "wasm32", target_os = "unknown")))]
        let elapsed = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|error| Error::new(ErrorCode::InvalidTimestamp).with_source(error))?;
        #[cfg(not(all(target_arch = "wasm32", target_os = "unknown")))]
        let reading = elapsed.as_millis() as f64;
        #[cfg(any(
            not(all(target_arch = "wasm32", target_os = "unknown")),
            feature = "wasm-js"
        ))]
        self.generate_uuid_v7_with_random_fill(reading, fill_os_random_bytes)
    }
    /// Generate at an explicit timestamp with secure platform entropy.
    #[cfg(feature = "os-rng")]
    pub fn generate_uuid_v7_at_unix_ms(&self, unix_ms: f64) -> Result<Uuid, Error> {
        self.generate_uuid_v7_at_unix_ms_with_random_fill(unix_ms, fill_os_random_bytes)
    }
}
fn timestamp(value: f64, clock: bool) -> Result<u64, Error> {
    if !value.is_finite()
        || value < 0.0
        || (!clock && value.fract() != 0.0)
        || value.trunc() > MAX_UUID_V7_UNIX_MS as f64
    {
        return Err(Error::new(ErrorCode::InvalidTimestamp));
    }
    Ok(value as u64)
}
fn seed(bytes: &[u8; 10]) -> u64 {
    (u64::from(bytes[0]) << 34)
        | (u64::from(bytes[1]) << 26)
        | (u64::from(bytes[2]) << 18)
        | (u64::from(bytes[3]) << 10)
        | (u64::from(bytes[4]) << 2)
        | u64::from(bytes[5] & 3)
}
fn assemble(ms: u64, sequence: u64, random: [u8; 10]) -> Uuid {
    let mut bytes = [0; 16];
    bytes[..6].copy_from_slice(&ms.to_be_bytes()[2..]);
    bytes[6] = 0x70 | ((sequence >> 38) as u8 & 15);
    bytes[7] = (sequence >> 30) as u8;
    bytes[8] = 0x80 | ((sequence >> 24) as u8 & 63);
    bytes[9] = (sequence >> 16) as u8;
    bytes[10] = (sequence >> 8) as u8;
    bytes[11] = sequence as u8;
    bytes[12..].copy_from_slice(&random[6..]);
    Uuid::from_uuid_bytes_array(bytes)
}
/// Generate a random version-4 UUID from a fallible entropy source.
pub fn generate_uuid_v4_with_random_fill(
    mut fill: impl FnMut(&mut [u8]) -> Result<(), Error>,
) -> Result<Uuid, Error> {
    let mut bytes = [0; 16];
    fill(&mut bytes).map_err(|cause| Error::new(ErrorCode::RngUnavailable).with_source(cause))?;
    bytes[6] = (bytes[6] & 15) | 0x40;
    bytes[8] = (bytes[8] & 63) | 0x80;
    Ok(Uuid::from_uuid_bytes_array(bytes))
}
/// Generate v4 into caller storage; reject invalid ranges before drawing entropy.
/// An entropy error leaves the destination unchanged.
pub fn generate_uuid_v4_into_with_random_fill(
    out: &mut [u8],
    offset: usize,
    fill: impl FnMut(&mut [u8]) -> Result<(), Error>,
) -> Result<(), Error> {
    let target = crate::uuid::range(out.len(), offset)?;
    let id = generate_uuid_v4_with_random_fill(fill)?;
    out[target].copy_from_slice(id.as_uuid_bytes());
    Ok(())
}
/// Fill from the platform CSPRNG, retaining its error as the cause on failure.
#[cfg(feature = "os-rng")]
pub fn fill_os_random_bytes(out: &mut [u8]) -> Result<(), Error> {
    getrandom::fill(out).map_err(|error| Error::new(ErrorCode::RngUnavailable).with_source(error))
}
/// Generate a version-4 UUID with secure platform entropy.
#[cfg(feature = "os-rng")]
pub fn generate_uuid_v4() -> Result<Uuid, Error> {
    generate_uuid_v4_with_random_fill(fill_os_random_bytes)
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
        let fail = |_: &mut [u8]| Err(Error::new(ErrorCode::InvalidBuffer));
        for result in [
            generate_uuid_v4_with_random_fill(fail),
            generator.generate_uuid_v7_with_random_fill(1.0, fail),
            generator.generate_uuid_v7_at_unix_ms_with_random_fill(1.0, fail),
        ] {
            let error = result.unwrap_err();
            assert_eq!(error.code(), ErrorCode::RngUnavailable);
            assert!(error.source().is_some());
        }
        let mut output = [19; 16];
        let untouched = |_: &mut [u8]| -> Result<(), Error> {
            panic!("invalid range must reject before entropy")
        };
        assert!(
            generator
                .generate_uuid_v7_into_with_random_fill(1.0, &mut output, 1, untouched)
                .is_err()
        );
        assert!(
            generator
                .generate_uuid_v7_at_unix_ms_into_with_random_fill(
                    1.0,
                    &mut output,
                    usize::MAX,
                    untouched
                )
                .is_err()
        );
        assert_eq!(output, [19; 16]);
        assert!(generate_uuid_v4_into_with_random_fill(&mut output, 1, untouched).is_err());
        assert_eq!(output, [19; 16]);
    }
    #[test]
    fn generation_preserves_every_payload_bit() -> Result<(), Error> {
        // A one-hot basis catches dropped or merged bits without judging random samples.
        for version in [4, 7] {
            let generate = |input: [u8; 16]| {
                let fill = |out: &mut [u8]| {
                    out.copy_from_slice(&input[..out.len()]);
                    Ok(())
                };
                if version == 4 {
                    generate_uuid_v4_with_random_fill(fill)
                } else {
                    UuidV7Generator::new().generate_uuid_v7_at_unix_ms_with_random_fill(0.0, fill)
                }
            };
            let baseline = u128::from_be_bytes(*generate([0; 16])?.as_uuid_bytes());
            let mut seen = 0_u128;
            for bit in 0..128 {
                let changed =
                    u128::from_be_bytes(*generate((1_u128 << bit).to_be_bytes())?.as_uuid_bytes())
                        ^ baseline;
                assert!(
                    changed.count_ones() <= 1,
                    "one input bit changed multiple bits"
                );
                assert_eq!(seen & changed, 0, "input bits merged into one output bit");
                seen |= changed;
            }
            let reserved = (15_u128 << 76) | (3_u128 << 62);
            let payload = if version == 4 {
                u128::MAX
            } else {
                (1_u128 << 80) - 1
            };
            assert_eq!(seen, payload & !reserved);
        }
        Ok(())
    }
    #[test]
    fn generation_draws_only_entropy_that_reaches_the_uuid() -> Result<(), Error> {
        let mut generator = UuidV7Generator::new();
        let mut reseed_len = 0;
        generator.generate_uuid_v7_with_random_fill(1.0, |out| {
            reseed_len = out.len();
            out.fill(0);
            Ok(())
        })?;
        let mut continuation_len = 0;
        generator.generate_uuid_v7_with_random_fill(1.0, |out| {
            continuation_len = out.len();
            out.fill(0);
            Ok(())
        })?;
        assert_eq!(reseed_len, 10);
        assert_eq!(continuation_len, 4);
        Ok(())
    }
    #[test]
    fn explicit_time_does_not_mutate_clock_sequence() -> Result<(), Error> {
        let mut generator = UuidV7Generator::new();
        let first = generator.generate_uuid_v7_with_random_fill(123.9, fill)?;
        assert_eq!(first.to_string(), "00000000-007b-7000-8408-0c1106070809");
        assert_eq!(
            generator
                .generate_uuid_v7_at_unix_ms_with_random_fill(7.0, fill)?
                .extract_uuid_v7_unix_ms()?,
            7
        );
        assert_eq!(
            generator
                .generate_uuid_v7_with_random_fill(100.0, fill)?
                .extract_uuid_v7_unix_ms()?,
            123
        );
        for invalid in [
            -1.0,
            f64::NAN,
            f64::INFINITY,
            (MAX_UUID_V7_UNIX_MS + 1) as f64,
        ] {
            assert!(
                generator
                    .generate_uuid_v7_with_random_fill(invalid, fill)
                    .is_err()
            );
        }
        assert!(
            generator
                .generate_uuid_v7_at_unix_ms_with_random_fill(1.5, fill)
                .is_err()
        );
        Ok(())
    }
    #[test]
    fn uuid_v7_bounds_cover_one_millisecond_and_intervals() -> Result<(), Error> {
        let instant = uuid_v7_bounds(0, None)?;
        assert_eq!(
            instant.start_inclusive.to_string(),
            "00000000-0000-7000-8000-000000000000"
        );
        assert_eq!(
            instant.end_inclusive.to_string(),
            "00000000-0000-7fff-bfff-ffffffffffff"
        );
        let interval = uuid_v7_bounds(1, Some(2))?;
        assert_eq!(interval.start_inclusive.extract_uuid_v7_unix_ms()?, 1);
        assert_eq!(interval.end_inclusive.extract_uuid_v7_unix_ms()?, 2);
        assert!(uuid_v7_bounds(2, Some(1)).is_err());
        assert!(uuid_v7_bounds(MAX_UUID_V7_UNIX_MS + 1, None).is_err());
        Ok(())
    }
    #[test]
    fn entropy_failure_and_counter_exhaustion_do_not_corrupt_retry() -> Result<(), Error> {
        let mut generator = UuidV7Generator {
            last_ms: Some(10),
            clock_high_water_ms: Some(10),
            sequence: MAX_SEQUENCE,
            rollback_policy: UuidV7ClockRollbackPolicy::Preserve,
        };
        assert!(
            generator
                .generate_uuid_v7_with_random_fill(9.0, |_| Err(Error::new(
                    ErrorCode::RngUnavailable
                )))
                .is_err()
        );
        assert_eq!(generator.last_ms, Some(10));
        assert_eq!(generator.sequence, MAX_SEQUENCE);
        assert_eq!(
            generator
                .generate_uuid_v7_with_random_fill(9.0, fill)?
                .extract_uuid_v7_unix_ms()?,
            11
        );
        generator.last_ms = Some(MAX_UUID_V7_UNIX_MS);
        generator.sequence = MAX_SEQUENCE;
        assert!(
            generator
                .generate_uuid_v7_with_random_fill(0.0, fill)
                .is_err()
        );
        assert_eq!(generator.sequence, MAX_SEQUENCE);
        Ok(())
    }

    #[test]
    fn partial_failed_draws_preserve_output_and_retry() -> Result<(), Error> {
        for (last_ms, sequence, reading) in [
            (None, 0, 10.0),
            (Some(10), 17, 9.0),
            (Some(10), 17, 11.0),
            (Some(10), MAX_SEQUENCE, 9.0),
        ] {
            for prefix in 0..=16 {
                let mut generator = UuidV7Generator {
                    last_ms,
                    clock_high_water_ms: last_ms,
                    sequence,
                    rollback_policy: UuidV7ClockRollbackPolicy::Preserve,
                };
                let fail = |out: &mut [u8]| {
                    let written = prefix.min(out.len());
                    out[..written].fill(255);
                    Err(Error::new(ErrorCode::RngUnavailable))
                };
                let mut output = [19; 18];
                assert!(generate_uuid_v4_with_random_fill(fail).is_err());
                assert!(generate_uuid_v4_into_with_random_fill(&mut output, 1, fail).is_err());
                assert!(
                    generator
                        .generate_uuid_v7_into_with_random_fill(reading, &mut output, 1, fail)
                        .is_err()
                );
                assert!(
                    generator
                        .generate_uuid_v7_at_unix_ms_into_with_random_fill(
                            reading,
                            &mut output,
                            1,
                            fail
                        )
                        .is_err()
                );
                assert_eq!(output, [19; 18]);
                assert_eq!((generator.last_ms, generator.sequence), (last_ms, sequence));
                let mut control = UuidV7Generator {
                    last_ms,
                    clock_high_water_ms: last_ms,
                    sequence,
                    rollback_policy: UuidV7ClockRollbackPolicy::Preserve,
                };
                assert_eq!(
                    generator.generate_uuid_v7_with_random_fill(reading, fill)?,
                    control.generate_uuid_v7_with_random_fill(reading, fill)?
                );
            }
        }
        Ok(())
    }

    #[test]
    fn rollback_reset_uses_total_skew_and_commits_only_after_entropy() -> Result<(), Error> {
        let mut generator = UuidV7Generator::new()
            .with_clock_rollback_policy(UuidV7ClockRollbackPolicy::Reset { tolerance_ms: 5 });
        assert_eq!(
            generator
                .generate_uuid_v7_with_random_fill(100.0, fill)?
                .extract_uuid_v7_unix_ms()?,
            100
        );
        assert_eq!(
            generator
                .generate_uuid_v7_with_random_fill(96.0, fill)?
                .extract_uuid_v7_unix_ms()?,
            100
        );
        assert!(
            generator
                .generate_uuid_v7_with_random_fill(94.0, |_| Err(Error::new(
                    ErrorCode::RngUnavailable
                )))
                .is_err()
        );
        assert_eq!(generator.last_ms, Some(100));
        assert_eq!(generator.clock_high_water_ms, Some(100));
        assert_eq!(
            generator
                .generate_uuid_v7_with_random_fill(94.0, fill)?
                .extract_uuid_v7_unix_ms()?,
            94
        );
        Ok(())
    }

    #[test]
    fn rollback_error_recovers_without_consuming_state() -> Result<(), Error> {
        let mut generator = UuidV7Generator::new()
            .with_clock_rollback_policy(UuidV7ClockRollbackPolicy::Error { tolerance_ms: 0 });
        let first = generator.generate_uuid_v7_with_random_fill(100.0, fill)?;
        assert_eq!(
            generator
                .generate_uuid_v7_with_random_fill(99.0, fill)
                .unwrap_err()
                .code(),
            ErrorCode::InvalidTimestamp
        );
        let recovered = generator.generate_uuid_v7_with_random_fill(100.0, fill)?;
        assert!(first.as_uuid_bytes() < recovered.as_uuid_bytes());
        Ok(())
    }
}
