//! Reuse OS-seeded cryptographic state without hiding required seed failures.
use crate::{Error, ErrorCode, fill_os_random_bytes};
use chacha20::{
    ChaCha12Rng,
    rand_core::{Rng, SeedableRng},
};
use std::cell::RefCell;

// Match rand's reseeding scale without its panic-based entropy failure policy.
// This is a resource/security bound, not an identifier-format constant.
const RESEED_BYTES: usize = 64 * 1024;

struct RandomSource {
    rng: Option<ChaCha12Rng>,
    remaining: usize,
    process_id: u32,
}

impl RandomSource {
    const fn new() -> Self {
        Self {
            rng: None,
            remaining: 0,
            process_id: 0,
        }
    }

    fn fill(
        &mut self,
        output: &mut [u8],
        process_id: u32,
        mut seed_from_os: impl FnMut(&mut [u8]) -> Result<(), Error>,
    ) -> Result<(), Error> {
        if output.is_empty() {
            return Ok(());
        }
        // Internal UUID draws are small. Keep an oversized future caller off the bounded stream
        // rather than returning bytes across several seeds and exposing partial failure output.
        if output.len() > RESEED_BYTES {
            return seed_from_os(output);
        }
        if self.rng.is_none() || self.remaining < output.len() || self.process_id != process_id {
            let mut seed = [0; 32];
            seed_from_os(&mut seed)?;
            // Commit only a complete successful seed. A failed fork/threshold reseed retries
            // before output, so an inherited or exhausted stream can never become a fallback.
            self.rng = Some(ChaCha12Rng::from_seed(seed));
            self.remaining = RESEED_BYTES;
            self.process_id = process_id;
        }
        let rng = self.rng.as_mut().ok_or_else(|| {
            Error::new(ErrorCode::RngUnavailable).with_message("Random generator has no OS seed.")
        })?;
        rng.fill_bytes(output);
        self.remaining -= output.len();
        Ok(())
    }

    /// Stream `units * UNIT` random bytes to `sink` in whole units, following the same reseed
    /// schedule as repeated `fill` calls of one unit each.
    ///
    /// Every seed the stream will need is drawn in one OS request BEFORE the first byte reaches
    /// `sink`, so a seed failure publishes no output and leaves this source unchanged; a batch is
    /// all-or-nothing like a single draw. A sub-unit remainder of the current stream is skipped,
    /// exactly as `fill` reseeds when fewer bytes remain than one draw needs.
    fn fill_units<const UNIT: usize>(
        &mut self,
        units: usize,
        process_id: u32,
        mut seed_from_os: impl FnMut(&mut [u8]) -> Result<(), Error>,
        mut sink: impl FnMut(&[u8]),
    ) -> Result<(), Error> {
        // Chunks are whole units, so a sink never sees a draw split across calls.
        const BUFFER_BYTES: usize = 1024;
        let total = units.checked_mul(UNIT).ok_or_else(|| {
            Error::new(ErrorCode::InvalidBuffer).with_message("Batch size overflows usize bytes.")
        })?;
        let current = if self.process_id == process_id {
            self.rng.as_ref().map_or(0, |_| self.remaining)
        } else {
            0
        };
        let usable = (current / UNIT * UNIT).min(total);
        let per_seed = RESEED_BYTES / UNIT * UNIT;
        let mut seeds = alloc::vec![0; (total - usable).div_ceil(per_seed) * 32];
        if !seeds.is_empty() {
            seed_from_os(&mut seeds)?;
        }
        let mut buffer = [0; BUFFER_BYTES];
        let chunk_bytes = BUFFER_BYTES / UNIT * UNIT;
        let mut emit = |rng: &mut ChaCha12Rng, mut bytes: usize| {
            while bytes > 0 {
                let chunk = &mut buffer[..bytes.min(chunk_bytes)];
                rng.fill_bytes(chunk);
                sink(chunk);
                bytes -= chunk.len();
            }
        };
        if let Some(rng) = self.rng.as_mut().filter(|_| usable > 0) {
            emit(rng, usable);
            self.remaining -= usable;
        }
        let mut left = total - usable;
        for seed in seeds.as_chunks::<32>().0 {
            let mut rng = ChaCha12Rng::from_seed(*seed);
            let bytes = left.min(per_seed);
            emit(&mut rng, bytes);
            left -= bytes;
            self.rng = Some(rng);
            self.remaining = RESEED_BYTES - bytes;
            self.process_id = process_id;
        }
        Ok(())
    }
}

thread_local! {
    // No public Clone/Debug: copying or printing live random state would expose future output.
    static RANDOM: RefCell<RandomSource> = const { RefCell::new(RandomSource::new()) };
}

pub(crate) fn fill_random_bytes(output: &mut [u8]) -> Result<(), Error> {
    with_source(|source, process_id| source.fill(output, process_id, fill_os_random_bytes))
}

/// Stream `units` draws of `UNIT` bytes each to `sink`; see `RandomSource::fill_units`.
pub(crate) fn fill_random_units<const UNIT: usize>(
    units: usize,
    sink: impl FnMut(&[u8]),
) -> Result<(), Error> {
    with_source(|source, process_id| {
        source.fill_units::<UNIT>(units, process_id, fill_os_random_bytes, sink)
    })
}

fn with_source(
    draw: impl FnOnce(&mut RandomSource, u32) -> Result<(), Error>,
) -> Result<(), Error> {
    // Browser/WASI instances have no native fork; process::id is unsupported on some of them.
    #[cfg(any(unix, windows))]
    let process_id = std::process::id();
    #[cfg(not(any(unix, windows)))]
    let process_id = 0;
    RANDOM
        .try_with(|source| {
            draw(
                &mut *source.try_borrow_mut().map_err(|_| {
                    Error::new(ErrorCode::RngUnavailable).with_message(
                        "Random generator is already borrowed; retry outside the active draw.",
                    )
                })?,
                process_id,
            )
        })
        .map_err(|_| {
            Error::new(ErrorCode::RngUnavailable).with_message(
                "Thread-local random generator is unavailable during thread shutdown.",
            )
        })?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(any(unix, windows))]
    fn native_threads_do_not_replay_the_same_random_stream() -> Result<(), Error> {
        // Catch copied thread-local streams; disjoint finite samples do not certify entropy.
        let draw = || {
            (0..16)
                .map(|_| crate::generate_uuid_v4())
                .collect::<Result<Vec<_>, Error>>()
        };
        let (left, right) = std::thread::scope(|scope| {
            let left = scope.spawn(draw);
            let right = scope.spawn(draw);
            Ok::<_, Error>((
                left.join().expect("first entropy worker panicked")?,
                right.join().expect("second entropy worker panicked")?,
            ))
        })?;
        let ids: std::collections::HashSet<_> = left.into_iter().chain(right).collect();
        assert_eq!(ids.len(), 32);
        assert!(ids.iter().all(crate::Uuid::is_uuid_v4));
        Ok(())
    }

    #[test]
    fn partial_budgets_require_a_successful_seed_before_output() -> Result<(), Error> {
        // Mixed UUIDv4/v7 draw sizes need not exhaust the budget at an exact draw boundary.
        for remaining in [0, 1, 15, 16, 17] {
            let mut source = RandomSource::new();
            source.fill(&mut vec![0; RESEED_BYTES - remaining], 1, |seed| {
                seed.fill(7);
                Ok(())
            })?;
            let mut output = [0xa5; 16];
            let result = source.fill(&mut output, 1, |_| {
                Err(Error::new(ErrorCode::RngUnavailable))
            });
            if remaining < output.len() {
                assert_eq!(result.unwrap_err().code(), ErrorCode::RngUnavailable);
                assert_eq!(output, [0xa5; 16]);
                assert_eq!(source.remaining, remaining);
                source.fill(&mut output, 1, |seed| {
                    seed.fill(8);
                    Ok(())
                })?;
                assert_eq!(source.remaining, RESEED_BYTES - output.len());
            } else {
                result?;
                assert_eq!(source.remaining, remaining - output.len());
            }
        }
        Ok(())
    }

    #[test]
    fn failed_seeds_block_initial_threshold_and_fork_output() -> Result<(), Error> {
        let mut source = RandomSource::new();
        let mut output = [0xa5; 16];
        let fail = |seed: &mut [u8]| {
            seed.fill(0xff);
            Err(Error::new(ErrorCode::RngUnavailable))
        };
        assert!(source.fill(&mut output, 1, fail).is_err());
        assert_eq!(output, [0xa5; 16]);
        assert!(source.rng.is_none());

        let mut draws = 0;
        let mut seed = |bytes: &mut [u8]| {
            assert_eq!(bytes.len(), 32);
            draws += 1;
            bytes.fill(draws);
            Ok(())
        };
        source.fill(&mut output, 1, &mut seed)?;
        let mut rest = vec![0; RESEED_BYTES - output.len()];
        source.fill(&mut rest, 1, &mut seed)?;
        assert_eq!(source.remaining, 0);
        let saved = output;
        assert!(source.fill(&mut output, 1, fail).is_err());
        assert_eq!(output, saved);
        source.fill(&mut output, 1, &mut seed)?;
        let parent = output;
        assert!(source.fill(&mut output, 2, fail).is_err());
        assert_eq!(output, parent);
        assert_eq!(source.process_id, 1);
        source.fill(&mut output, 2, &mut seed)?;
        assert_ne!(output, parent);
        assert_eq!(source.process_id, 2);
        assert_eq!(draws, 3);
        Ok(())
    }

    // A deterministic "OS" whose bytes depend only on how many bytes it has served, so one
    // request for k seeds returns exactly what k single-seed requests would.
    fn counting_os() -> impl FnMut(&mut [u8]) -> Result<(), Error> {
        let mut served = 0u64;
        move |seed| {
            for byte in seed.iter_mut() {
                served += 1;
                *byte = (served.wrapping_mul(0x9e37_79b9_7f4a_7c15) >> 56) as u8;
            }
            Ok(())
        }
    }

    #[test]
    fn batched_units_equal_repeated_single_draws() -> Result<(), Error> {
        // Misaligned leftovers (10 bytes) and a batch crossing two reseeds must follow the
        // single-draw schedule exactly: same bytes, same remaining budget afterwards.
        for (prefix, units) in [(0, 1), (10, 63), (RESEED_BYTES - 10, 5), (10, 2 * 4096 + 7)] {
            let (mut single, mut batch) = (RandomSource::new(), RandomSource::new());
            let (mut single_os, mut batch_os) = (counting_os(), counting_os());
            single.fill(&mut vec![0; prefix.max(1)], 1, &mut single_os)?;
            batch.fill(&mut vec![0; prefix.max(1)], 1, &mut batch_os)?;
            let mut expected = Vec::new();
            for _ in 0..units {
                let mut draw = [0; 16];
                single.fill(&mut draw, 1, &mut single_os)?;
                expected.extend_from_slice(&draw);
            }
            let mut actual = Vec::new();
            batch.fill_units::<16>(units, 1, &mut batch_os, |chunk| {
                assert_eq!(chunk.len() % 16, 0);
                actual.extend_from_slice(chunk);
            })?;
            assert_eq!(actual, expected, "prefix {prefix}, units {units}");
            assert_eq!(batch.remaining, single.remaining);
        }
        Ok(())
    }

    #[test]
    fn failed_batch_seed_publishes_nothing_and_keeps_state() -> Result<(), Error> {
        let mut source = RandomSource::new();
        source.fill(&mut [0; 32], 1, counting_os())?;
        let remaining = source.remaining;
        let result = source.fill_units::<16>(
            RESEED_BYTES / 16,
            1,
            |_| Err(Error::new(ErrorCode::RngUnavailable)),
            |_| panic!("no output before every seed succeeds"),
        );
        assert_eq!(result.unwrap_err().code(), ErrorCode::RngUnavailable);
        assert_eq!(source.remaining, remaining);
        Ok(())
    }
}
