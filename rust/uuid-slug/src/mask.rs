//! Derive immutable masking keys; issued identifiers fix the derivation constants and round count.

use crate::{
    Error, ErrorCode,
    feistel::{Direction, feistel},
    mask_keys::{CHAIN_A, CHAIN_B, derive, expand},
    siphash::{HashState, tail_word},
};
use alloc::{borrow::Cow, format, string::String, sync::Arc, vec::Vec};
use core::{
    fmt,
    future::Future,
    pin::Pin,
    sync::atomic::{AtomicBool, Ordering},
    task::{Context, Poll},
};
#[cfg(feature = "std")]
use std::sync::LazyLock;

const PUBLIC_SEED: &[u8] = b"anizoptera.uuid-slug.default-mask.v1";
const DERIVED_MASK_LABEL: &str = "seeded";
type Mixer = dyn Fn([u8; 16], Direction) -> Result<[u8; 16], Error> + Send + Sync;

#[derive(Clone)]
enum Implementation {
    Feistel([u32; 8]),
    Custom(Arc<Mixer>),
}

/// A reversible 16-byte transform for UUIDv7 masking. This is not authenticated encryption.
#[derive(Clone)]
pub struct UuidV7Mask {
    // Default labels borrow static text so unnamed masks need no label allocation.
    label: Cow<'static, str>,
    implementation: Implementation,
}

impl fmt::Debug for UuidV7Mask {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // Debug must not disclose keys captured by either implementation.
        f.debug_struct("UuidV7Mask")
            .field("label", &self.label)
            .finish_non_exhaustive()
    }
}

impl UuidV7Mask {
    /// A label for logs and errors. It is not encoded in an ID.
    pub fn diagnostic_label(&self) -> &str {
        &self.label
    }

    /// Name this mask in logs and errors without changing its key or encoded IDs.
    /// Derived masks use `"seeded"` by default.
    #[must_use]
    pub fn with_diagnostic_label(mut self, label: impl Into<String>) -> Self {
        self.label = Cow::Owned(label.into());
        self
    }

    /// Build a mask from two fallible functions that undo each other for every 16-byte block.
    /// Each call receives and returns its own array, so it cannot change another key's input.
    /// Construction checks a few blocks; those checks cannot prove the functions are always inverses.
    pub fn from_permutation_functions(
        diagnostic_label: impl Into<String>,
        mask_uuid_bytes: impl Fn([u8; 16]) -> Result<[u8; 16], Error> + Send + Sync + 'static,
        unmask_uuid_bytes: impl Fn([u8; 16]) -> Result<[u8; 16], Error> + Send + Sync + 'static,
    ) -> Result<Self, Error> {
        let built = Self {
            label: Cow::Owned(diagnostic_label.into()),
            implementation: Implementation::Custom(Arc::new(
                move |input, direction| match direction {
                    Direction::UuidV7Mask => mask_uuid_bytes(input),
                    Direction::Unmask => unmask_uuid_bytes(input),
                },
            )),
        };
        for probe in [[0; 16], core::array::from_fn(|index| (index * 17) as u8)] {
            if built.unmask(built.mask(probe)?)? != probe {
                return Err(Error::new(ErrorCode::InvalidMask).with_message(
                    "Custom mask must restore every input; mask and unmask disagree on a probe.",
                ));
            }
        }
        Ok(built)
    }

    pub(crate) fn mask(&self, input: [u8; 16]) -> Result<[u8; 16], Error> {
        self.transform(input, Direction::UuidV7Mask)
    }

    pub(crate) fn unmask(&self, input: [u8; 16]) -> Result<[u8; 16], Error> {
        self.transform(input, Direction::Unmask)
    }

    fn transform(&self, input: [u8; 16], direction: Direction) -> Result<[u8; 16], Error> {
        match &self.implementation {
            Implementation::Feistel(keys) => Ok(feistel(input, keys, direction)),
            Implementation::Custom(mix) => mix(input, direction).map_err(|cause| {
                let operation = match direction {
                    Direction::UuidV7Mask => "masking",
                    Direction::Unmask => "unmasking",
                };
                Error::new(ErrorCode::InvalidMask)
                    .with_message(format!(
                        "Custom mask {:?} failed while {operation}.",
                        self.label
                    ))
                    .with_source(cause)
            }),
        }
    }
}

/// Return the public test mask for examples and wire fixtures. Anyone can decode IDs made with it.
pub fn uuid_v7_test_mask() -> UuidV7Mask {
    #[cfg(feature = "std")]
    static KEYS: LazyLock<[u32; 8]> = LazyLock::new(|| derive(PUBLIC_SEED, 1));
    #[cfg(feature = "std")]
    let keys = *KEYS;
    // The explicit public test key stays available without a host synchronization dependency.
    // Reduced builds derive it on request; private production keys already use caller ownership.
    #[cfg(not(feature = "std"))]
    let keys = derive(PUBLIC_SEED, 1);
    from_keys("default".into(), keys)
}

fn validate(seed: &[u8], iterations: u32) -> Result<(), Error> {
    if seed.len() < 16 {
        return Err(Error::new(ErrorCode::InvalidMask).with_message(format!(
            "Mask seed must contain at least 16 bytes; got {}. Generate a random seed.",
            seed.len()
        )));
    }
    if !(1..=1 << 24).contains(&iterations) {
        return Err(Error::new(ErrorCode::InvalidMask).with_message(format!(
            "Mask key_derivation_iterations must be in 1..={}; got {iterations}.",
            1 << 24
        )));
    }
    Ok(())
}

/// Derive a mask from exact seed bytes; pass `text.as_bytes()` for TypeScript UTF-8 string parity.
/// Require at least 16 seed bytes and `key_derivation_iterations` in `1..=16_777_216`; otherwise return `InvalidMask`.
/// Keep the seed and iteration count to read issued IDs; changing either produces a different key.
pub fn derive_uuid_v7_mask(
    mask_seed: &[u8],
    key_derivation_iterations: u32,
) -> Result<UuidV7Mask, Error> {
    validate(mask_seed, key_derivation_iterations)?;
    Ok(from_keys(
        DERIVED_MASK_LABEL.into(),
        derive(mask_seed, key_derivation_iterations),
    ))
}

fn from_keys(label: Cow<'static, str>, keys: [u32; 8]) -> UuidV7Mask {
    UuidV7Mask {
        label,
        implementation: Implementation::Feistel(keys),
    }
}

/// A shared stop signal for async mask derivation. Dropping the future also stops the work.
#[derive(Clone, Default, Debug)]
pub struct UuidV7MaskDerivationCancellation(Arc<AtomicBool>);
impl UuidV7MaskDerivationCancellation {
    /// Request cancellation; the next poll returns `Aborted`.
    pub fn cancel(&self) {
        self.0.store(true, Ordering::Relaxed);
    }
    /// Return whether cancellation was requested.
    pub fn is_cancelled(&self) -> bool {
        self.0.load(Ordering::Relaxed)
    }
}

/// Runtime-independent derivation with bounded absorption per poll and no background tasks.
/// An executor must yield fairly between polls; browser adapters must schedule host tasks.
struct MaskDerivation {
    seed: Vec<u8>,
    iterations: u32,
    cancellation: Option<UuidV7MaskDerivationCancellation>,
    chains: [[u32; 2]; 2],
    chain: usize,
    iteration: u32,
    cursor: usize,
    state: HashState,
    failure: Option<Error>,
    finished: bool,
}

/// Return a future that derives the mask in small steps without borrowing the inputs.
/// Input copies and allocations happen before polling. Seed and iteration limits match [`derive_uuid_v7_mask`]; invalid input returns `InvalidMask` when polled.
/// Pass `None` to avoid a cancellation token, or `Some(token)` to allow external cancellation.
/// Cancellation returns `Aborted` before checking other failures. Dropping the future stops work; no background task is started.
/// Each poll limits hashing work. The executor must let other host tasks run between polls.
pub fn derive_uuid_v7_mask_async(
    mask_seed: &[u8],
    key_derivation_iterations: u32,
    cancellation: Option<UuidV7MaskDerivationCancellation>,
) -> impl Future<Output = Result<UuidV7Mask, Error>> + Send + use<> {
    let failure = if cancellation
        .as_ref()
        .is_some_and(|token| token.is_cancelled())
    {
        Some(Error::new(ErrorCode::Aborted))
    } else {
        validate(mask_seed, key_derivation_iterations).err()
    };
    MaskDerivation {
        seed: if failure.is_none() {
            mask_seed.to_vec()
        } else {
            Vec::new()
        },
        iterations: key_derivation_iterations,
        cancellation,
        chains: [CHAIN_A, CHAIN_B],
        chain: 0,
        iteration: 0,
        cursor: 0,
        state: HashState::new(CHAIN_A),
        failure,
        finished: false,
    }
}

impl Future for MaskDerivation {
    type Output = Result<UuidV7Mask, Error>;
    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let this = self.get_mut();
        if this
            .cancellation
            .as_ref()
            .is_some_and(|token| token.is_cancelled())
        {
            this.finished = true;
            return Poll::Ready(Err(Error::new(ErrorCode::Aborted)));
        }
        if let Some(failure) = this.failure.take() {
            this.finished = true;
            return Poll::Ready(Err(failure));
        }
        if this.finished {
            return Poll::Ready(Err(Error::new(ErrorCode::InvalidMask).with_message(
                "Mask derivation future was polled after completion; do not poll a completed future.",
            )));
        }
        // Budget includes finalization, so tiny seeds with many iterations cannot monopolize a poll.
        for _ in 0..256 {
            if this.cursor + 4 <= this.seed.len() {
                let bytes = &this.seed[this.cursor..this.cursor + 4];
                this.state
                    .absorb(u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]));
                this.cursor += 4;
                continue;
            }
            this.chains[this.chain] = this
                .state
                .finish(tail_word(&this.seed[this.cursor..]), this.seed.len());
            this.iteration += 1;
            this.cursor = 0;
            if this.iteration == this.iterations {
                this.chain += 1;
                this.iteration = 0;
                if this.chain == 2 {
                    this.finished = true;
                    return Poll::Ready(Ok(from_keys(
                        DERIVED_MASK_LABEL.into(),
                        expand(this.chains[0], this.chains[1]),
                    )));
                }
            }
            this.state = HashState::new(this.chains[this.chain]);
        }
        cx.waker().wake_by_ref();
        Poll::Pending
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn cooperative_derivation_matches_direct_work_across_block_and_iteration_boundaries() {
        for (length, iterations) in [(16, 1), (17, 513), (1023, 2), (1024, 2), (16385, 3)] {
            let mut seed: Vec<u8> = (0..length).map(|index| index as u8).collect();
            let expected = derive_uuid_v7_mask(&seed, iterations)
                .unwrap()
                .with_diagnostic_label("direct")
                .mask([19; 16])
                .unwrap();
            let cancellation = (iterations == 513).then(UuidV7MaskDerivationCancellation::default);
            let mut future = derive_uuid_v7_mask_async(&seed, iterations, cancellation);
            seed.fill(0); // A lazy borrow would now derive a different key.
            let mut cx = Context::from_waker(std::task::Waker::noop());
            let actual = loop {
                if let Poll::Ready(result) = Pin::new(&mut future).poll(&mut cx) {
                    break result.unwrap();
                }
            };
            assert_eq!(actual.mask([19; 16]).unwrap(), expected);
        }
        let cancellation = UuidV7MaskDerivationCancellation::default();
        let mut future = derive_uuid_v7_mask_async(&[3; 32], 4096, Some(cancellation.clone()));
        let mut cx = Context::from_waker(std::task::Waker::noop());
        assert!(Pin::new(&mut future).poll(&mut cx).is_pending());
        cancellation.cancel();
        assert!(matches!(
            Pin::new(&mut future).poll(&mut cx),
            Poll::Ready(Err(error)) if error.code() == ErrorCode::Aborted
        ));
    }
}
