use crate::feistel::{Direction, feistel};

// Quantify over all 128 input bits and all 256 key bits; no chosen examples or assumed inverses.
// A different invertible transform also passes; retained wire vectors separately protect issued IDs.
#[kani::proof]
#[kani::unwind(17)]
fn inverts_every_block_and_key() {
    let block: [u8; 16] = kani::any();
    let keys: [u32; 8] = kani::any();
    let masked = feistel(block, &keys, Direction::UuidV7Mask);
    assert_eq!(
        feistel(masked, &keys, Direction::Unmask),
        block,
        "unmask must invert every block and key"
    );
    // Both functions map the same finite 128-bit set to itself. A left inverse makes mask
    // injective, hence bijective, so the right-inverse identity follows without a second circuit.
}
