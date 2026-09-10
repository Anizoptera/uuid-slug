//! Derive immutable masking keys; issued identifiers fix the derivation constants and round count.

use crate::{
    Error,
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
type Mixer = dyn Fn([u8; 16], bool) -> Result<[u8; 16], Error> + Send + Sync;

#[derive(Clone)]
enum Implementation {
    Feistel([u32; 8]),
    Custom(Arc<Mixer>),
}

/// A keyed reversible block transform; it provides obfuscation, not authenticated encryption.
#[derive(Clone)]
pub struct MaskSchema {
    id: String,
    implementation: Implementation,
}

impl fmt::Debug for MaskSchema {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // Debug must not disclose keys captured by either implementation.
        f.debug_struct("MaskSchema")
            .field("id", &self.id)
            .finish_non_exhaustive()
    }
}

impl MaskSchema {
    /// Schema labels are diagnostic metadata, not wire-format markers.
    pub fn id(&self) -> &str {
        &self.id
    }

    /// Build a fallible custom permutation and reject failures on representative inverse probes.
    /// Input and output are owned arrays: callbacks cannot retain aliases to another key's input.
    /// The caller must supply an inverse for every block; finite probes cannot prove that property.
    pub fn custom(
        id: impl Into<String>,
        mix: impl Fn([u8; 16], bool) -> Result<[u8; 16], Error> + Send + Sync + 'static,
    ) -> Result<Self, Error> {
        let schema = Self {
            id: id.into(),
            implementation: Implementation::Custom(Arc::new(mix)),
        };
        for probe in [[0; 16], std::array::from_fn(|index| (index * 17) as u8)] {
            if schema.mix(schema.mix(probe, true)?, false)? != probe {
                return Err(Error::InvalidMaskSchema);
            }
        }
        Ok(schema)
    }

    /// Transform one block; `forward = false` reverses the same keyed permutation.
    pub fn mix(&self, input: [u8; 16], forward: bool) -> Result<[u8; 16], Error> {
        match &self.implementation {
            Implementation::Feistel(keys) => Ok(feistel(input, keys, forward)),
            Implementation::Custom(mix) => {
                mix(input, forward).map_err(|cause| Error::InvalidMaskSchema.with_source(cause))
            }
        }
    }
}

/// Return the published schema for examples and wire fixtures; it conceals nothing from users.
pub fn public_mask_schema() -> MaskSchema {
    static KEYS: LazyLock<[u32; 8]> = LazyLock::new(|| derive(PUBLIC_SEED, 1));
    from_keys("default".into(), *KEYS)
}

fn validate(seed: &[u8], iterations: u32) -> Result<(), Error> {
    if seed.len() < 16 || !(1..=1 << 24).contains(&iterations) {
        return Err(Error::InvalidMaskSchema);
    }
    Ok(())
}

/// Derive a schema from exact seed bytes; pass `text.as_bytes()` for TypeScript UTF-8 string parity.
/// Keep the same iteration count when reading issued IDs: it is key material, not a tuning hint.
pub fn create_mask_schema(seed: &[u8], iterations: u32, id: &str) -> Result<MaskSchema, Error> {
    validate(seed, iterations)?;
    Ok(from_keys(id.into(), derive(seed, iterations)))
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

fn from_keys(id: String, keys: [u32; 8]) -> MaskSchema {
    MaskSchema {
        id,
        implementation: Implementation::Feistel(keys),
    }
}

fn feistel(bytes: [u8; 16], keys: &[u32; 8], forward: bool) -> [u8; 16] {
    let mut words = [0; 4];
    for (word, bytes) in words.iter_mut().zip(bytes.chunks_exact(4)) {
        *word = u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
    }
    let [mut l0, mut l1, mut r0, mut r1] = words;
    for round in 0..4 {
        let index = if forward { round } else { 3 - round } * 2;
        let [f0, f1] = hash_words([keys[index], keys[index + 1]], &[r0, r1]);
        (l0, l1, r0, r1) = (r0, r1, l0 ^ f0, l1 ^ f1);
    }
    let mut out = [0; 16];
    for (chunk, word) in out.chunks_exact_mut(4).zip([r0, r1, l0, l1]) {
        chunk.copy_from_slice(&word.to_be_bytes());
    }
    out
}

/// Shared cancellation for cooperative derivation; dropping the future also stops all work.
#[derive(Clone, Default, Debug)]
pub struct Cancellation(Arc<AtomicBool>);
impl Cancellation {
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
struct SchemaDerivation {
    seed: Vec<u8>,
    id: String,
    iterations: u32,
    cancellation: Cancellation,
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
pub fn create_mask_schema_async(
    seed: &[u8],
    iterations: u32,
    id: &str,
    cancellation: Cancellation,
) -> impl Future<Output = Result<MaskSchema, Error>> + Send + use<> {
    let failure = if cancellation.is_cancelled() {
        Some(Error::Aborted)
    } else {
        validate(seed, iterations).err()
    };
    SchemaDerivation {
        seed: if failure.is_none() {
            seed.to_vec()
        } else {
            Vec::new()
        },
        id: id.into(),
        iterations,
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

impl Future for SchemaDerivation {
    type Output = Result<MaskSchema, Error>;
    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let this = self.get_mut();
        if this.cancellation.is_cancelled() {
            this.finished = true;
            return Poll::Ready(Err(Error::Aborted));
        }
        if let Some(failure) = this.failure.take() {
            this.finished = true;
            return Poll::Ready(Err(failure));
        }
        if this.finished {
            return Poll::Ready(Err(Error::InvalidMaskSchema));
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
                        std::mem::take(&mut this.id),
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
            let expected = create_mask_schema(&seed, iterations, "probe")
                .unwrap()
                .mix([19; 16], true)
                .unwrap();
            let mut future =
                create_mask_schema_async(&seed, iterations, "probe", Cancellation::default());
            seed.fill(0); // A lazy borrow would now derive a different key.
            let mut cx = Context::from_waker(std::task::Waker::noop());
            let actual = loop {
                if let Poll::Ready(result) = Pin::new(&mut future).poll(&mut cx) {
                    break result.unwrap();
                }
            };
            assert_eq!(actual.mix([19; 16], true).unwrap(), expected);
        }
        let cancellation = Cancellation::default();
        let mut future = create_mask_schema_async(&[3; 32], 4096, "cancel", cancellation.clone());
        let mut cx = Context::from_waker(std::task::Waker::noop());
        assert!(Pin::new(&mut future).poll(&mut cx).is_pending());
        cancellation.cancel();
        assert!(matches!(
            Pin::new(&mut future).poll(&mut cx),
            Poll::Ready(Err(Error::Aborted))
        ));
    }
}
