//! Preserve little-endian byte packing between the two production hash entry points.
//! Equivalence does not establish collision resistance or cryptographic strength.

fn verify_words<const N: usize>() {
    let key: [u32; 2] = kani::any();
    let words: [u32; 2] = kani::any();
    // Production Feistel jobs consume two words; key expansion also consumes one.
    // Include the empty message, every word bit and every key bit without sampled constants.
    let mut bytes = [0u8; 8];
    for index in 0..bytes.len() {
        bytes[index] = (words[index / 4] / (1u32 << (8 * (index % 4)))) as u8;
    }
    assert_eq!(
        crate::siphash::hash_words(key, &words[..N]),
        crate::siphash::hash_bytes(key, &bytes[..N * 4]),
        "word hashing equals little-endian byte hashing for every key and payload"
    );
}

// Split every admitted word length so the solver compares identical round circuits instead
// of choosing between three cryptographic circuits; the required harness family covers all.
#[kani::proof]
#[kani::unwind(9)]
fn empty_words_match_bytes() {
    verify_words::<0>();
}
#[kani::proof]
#[kani::unwind(9)]
fn one_word_matches_bytes() {
    verify_words::<1>();
}
#[kani::proof]
#[kani::unwind(9)]
fn two_words_match_bytes() {
    verify_words::<2>();
}

#[kani::proof]
#[kani::unwind(4)]
fn tail_preserves_bytes() {
    let bytes: [u8; 3] = kani::any();
    let length: usize = kani::any();
    // as_chunks::<4> admits exactly these remainder lengths at the real caller.
    kani::assume(length <= bytes.len());
    let actual = crate::siphash::tail_word(&bytes[..length]);
    let mut expected = 0u32;
    for index in 0..length {
        expected += u32::from(bytes[index]) * 256u32.pow(index as u32);
    }
    assert_eq!(
        actual, expected,
        "hash tail preserves every byte in little-endian order"
    );
}
