//! Preserve the issued mask's byte order, four rounds, key order and undone final swap.
use crate::siphash::hash_words;

#[derive(Clone, Copy)]
pub(crate) enum Direction {
    UuidV7Mask,
    Unmask,
}

pub(crate) fn feistel(bytes: [u8; 16], keys: &[u32; 8], direction: Direction) -> [u8; 16] {
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
