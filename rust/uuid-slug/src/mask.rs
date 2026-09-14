//! Derive immutable masking keys; issued identifiers fix the derivation constants and round count.

use crate::{
    Error, ErrorCode,
    siphash::{HashState, hash_bytes, hash_words, tail_word},
};
use std::{
    fmt,
    future::Future,
    pin::Pin,
    sync::{
        Arc, LazyLock,
        atomic::{AtomicBool, Ordering},
    },
    task::{Context, Poll},
};

// Changing these keys, four rounds, or word indices changes every issued identifier.
const CHAIN_A: [u32; 2] = [0x6469_7575, 0x4167_6c73];
const CHAIN_B: [u32; 2] = [0x6469_7575, 0x4267_6c73];
const PUBLIC_SEED: &[u8] = b"anizoptera.uuid-slug.default-mask.v1";
#[derive(Clone, Copy)]
enum Direction {
    UuidV7Mask,
    Unmask,
}

type Mixer = dyn Fn([u8; 16], Direction) -> Result<[u8; 16], Error> + Send + Sync;

#[derive(Clone)]
enum Implementation {
    Feistel([u32; 8]),
    Custom(Arc<Mixer>),
}

/// A keyed reversible block transform; it provides obfuscation, not authenticated encryption.
#[derive(Clone)]
pub struct UuidV7Mask {
    label: String,
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
    /// UuidV7Mask labels are diagnostic metadata, not wire-format markers.
    pub fn diagnostic_label(&self) -> &str {
        &self.label
    }

    /// Build a fallible custom permutation and reject failures on representative inverse probes.
    /// Input and output are owned arrays: callbacks cannot retain aliases to another key's input.
    /// The caller must supply an inverse for every block; finite probes cannot prove that property.
    pub fn from_permutation_functions(
        diagnostic_label: impl Into<String>,
        mask_uuid_bytes: impl Fn([u8; 16]) -> Result<[u8; 16], Error> + Send + Sync + 'static,
        unmask_uuid_bytes: impl Fn([u8; 16]) -> Result<[u8; 16], Error> + Send + Sync + 'static,
    ) -> Result<Self, Error> {
        let built = Self {
            label: diagnostic_label.into(),
            implementation: Implementation::Custom(Arc::new(
                move |input, direction| match direction {
                    Direction::UuidV7Mask => mask_uuid_bytes(input),
                    Direction::Unmask => unmask_uuid_bytes(input),
                },
            )),
        };
        for probe in [[0; 16], std::array::from_fn(|index| (index * 17) as u8)] {
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

/// Return the published mask for examples and wire fixtures; it conceals nothing from users.
pub fn uuid_v7_test_mask() -> UuidV7Mask {
    static KEYS: LazyLock<[u32; 8]> = LazyLock::new(|| derive(PUBLIC_SEED, 1));
    from_keys("default".into(), *KEYS)
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
/// Keep the same iteration count when reading issued IDs: it is key material, not a tuning hint.
pub fn derive_uuid_v7_mask(
    mask_seed: &[u8],
    key_derivation_iterations: u32,
    diagnostic_label: &str,
) -> Result<UuidV7Mask, Error> {
    validate(mask_seed, key_derivation_iterations)?;
    Ok(from_keys(
        diagnostic_label.into(),
        derive(mask_seed, key_derivation_iterations),
    ))
}

fn derive(seed: &[u8], iterations: u32) -> [u32; 8] {
    let mut a = CHAIN_A;
    let mut b = CHAIN_B;
    for _ in 0..iterations {
        a = hash_bytes(a, seed);
    }
    for _ in 0..iterations {
        b = hash_bytes(b, seed);
    }
    expand(a, b)
}

fn expand(a: [u32; 2], b: [u32; 2]) -> [u32; 8] {
    let mut keys = [0; 8];
    for word in (0..8).step_by(2) {
        let aa = hash_words(a, &[word as u32]);
        let bb = hash_words(b, &[word as u32]);
        keys[word] = aa[0] ^ bb[0];
        keys[word + 1] = aa[1] ^ bb[1];
    }
    keys
}

fn from_keys(label: String, keys: [u32; 8]) -> UuidV7Mask {
    UuidV7Mask {
        label,
        implementation: Implementation::Feistel(keys),
    }
}

fn feistel(bytes: [u8; 16], keys: &[u32; 8], direction: Direction) -> [u8; 16] {
    let mut words = [0; 4];
    for (word, bytes) in words.iter_mut().zip(bytes.as_chunks::<4>().0) {
        *word = u32::from_be_bytes(*bytes);
    }
    let [mut l0, mut l1, mut r0, mut r1] = words;
    for round in 0..4 {
        let index = match direction {
            Direction::UuidV7Mask => round,
            Direction::Unmask => 3 - round,
        } * 2;
        let [f0, f1] = hash_words([keys[index], keys[index + 1]], &[r0, r1]);
        (l0, l1, r0, r1) = (r0, r1, l0 ^ f0, l1 ^ f1);
    }
    let mut out = [0; 16];
    for (chunk, word) in out.as_chunks_mut::<4>().0.iter_mut().zip([r0, r1, l0, l1]) {
        chunk.copy_from_slice(&word.to_be_bytes());
    }
    out
}

/// Shared cancellation for cooperative derivation; dropping the future also stops all work.
#[derive(Clone, Default, Debug)]
pub struct UuidV7MaskDerivationCancellation(Arc<AtomicBool>);
impl UuidV7MaskDerivationCancellation {
    /// Stop computation at its next bounded checkpoint.
    pub fn cancel(&self) {
        self.0.store(true, Ordering::Relaxed);
    }
    /// Observe whether cancellation has been requested.
    pub fn is_cancelled(&self) -> bool {
        self.0.load(Ordering::Relaxed)
    }
}

/// Runtime-independent derivation with bounded absorption per poll and no background tasks.
/// An executor must yield fairly between polls; browser adapters must schedule host tasks.
struct MaskDerivation {
    seed: Vec<u8>,
    label: String,
    iterations: u32,
    cancellation: UuidV7MaskDerivationCancellation,
    chains: [[u32; 2]; 2],
    chain: usize,
    iteration: u32,
    cursor: usize,
    state: HashState,
    failure: Option<Error>,
    finished: bool,
}

/// Capture options and seed bytes now, before the returned future is first polled.
/// Allocation and this input snapshot are outside the bounded computation slice.
pub fn derive_uuid_v7_mask_async(
    mask_seed: &[u8],
    key_derivation_iterations: u32,
    diagnostic_label: &str,
    cancellation: UuidV7MaskDerivationCancellation,
) -> impl Future<Output = Result<UuidV7Mask, Error>> + Send + use<> {
    let failure = if cancellation.is_cancelled() {
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
        label: diagnostic_label.into(),
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
        if this.cancellation.is_cancelled() {
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
                        std::mem::take(&mut this.label),
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
            let expected = derive_uuid_v7_mask(&seed, iterations, "probe")
                .unwrap()
                .mask([19; 16])
                .unwrap();
            let mut future = derive_uuid_v7_mask_async(
                &seed,
                iterations,
                "probe",
                UuidV7MaskDerivationCancellation::default(),
            );
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
        let mut future = derive_uuid_v7_mask_async(&[3; 32], 4096, "cancel", cancellation.clone());
        let mut cx = Context::from_waker(std::task::Waker::noop());
        assert!(Pin::new(&mut future).poll(&mut cx).is_pending());
        cancellation.cancel();
        assert!(matches!(
            Pin::new(&mut future).poll(&mut cx),
            Poll::Ready(Err(error)) if error.code() == ErrorCode::Aborted
        ));
    }
}
