//! Issued identifiers fix these derivation constants, iteration order and word expansion.
use crate::siphash::{hash_bytes, hash_words};

pub(crate) const CHAIN_A: [u32; 2] = [0x6469_7575, 0x4167_6c73];
pub(crate) const CHAIN_B: [u32; 2] = [0x6469_7575, 0x4267_6c73];

pub(crate) fn derive(seed: &[u8], iterations: u32) -> [u32; 8] {
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

pub(crate) fn expand(a: [u32; 2], b: [u32; 2]) -> [u32; 8] {
    let mut keys = [0; 8];
    for word in (0..8).step_by(2) {
        let aa = hash_words(a, &[word as u32]);
        let bb = hash_words(b, &[word as u32]);
        keys[word] = aa[0] ^ bb[0];
        keys[word + 1] = aa[1] ^ bb[1];
    }
    keys
}
