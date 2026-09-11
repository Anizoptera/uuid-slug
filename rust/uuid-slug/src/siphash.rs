//! HalfSipHash-2-4 preserves the published 32-bit, little-endian wire primitive.

#[derive(Clone, Copy)]
pub(crate) struct HashState([u32; 4]);

impl HashState {
    pub(crate) fn new(key: [u32; 2]) -> Self {
        Self([
            key[0],
            key[1] ^ 0xee,
            key[0] ^ 0x6c79_6765,
            key[1] ^ 0x7465_6462,
        ])
    }

    fn round(&mut self) {
        let [mut a, mut b, mut c, mut d] = self.0;
        a = a.wrapping_add(b);
        b = b.rotate_left(5) ^ a;
        a = a.rotate_left(16);
        c = c.wrapping_add(d);
        d = d.rotate_left(8) ^ c;
        a = a.wrapping_add(d);
        d = d.rotate_left(7) ^ a;
        c = c.wrapping_add(b);
        b = b.rotate_left(13) ^ c;
        c = c.rotate_left(16);
        self.0 = [a, b, c, d];
    }

    pub(crate) fn absorb(&mut self, word: u32) {
        self.0[3] ^= word;
        self.round();
        self.round();
        self.0[0] ^= word;
    }

    pub(crate) fn finish(mut self, tail: u32, byte_length: usize) -> [u32; 2] {
        self.absorb(tail | (byte_length as u32).wrapping_shl(24));
        self.0[2] ^= 0xee;
        let mut out = [0; 2];
        for value in &mut out {
            for _ in 0..4 {
                self.round();
            }
            *value = self.0[1] ^ self.0[3];
            self.0[1] ^= 0xdd;
        }
        out
    }
}

/// Hash bytes without allocating a packed copy of the message.
pub(crate) fn hash_bytes(key: [u32; 2], bytes: &[u8]) -> [u32; 2] {
    let mut state = HashState::new(key);
    let (chunks, remainder) = bytes.as_chunks::<4>();
    for chunk in chunks {
        state.absorb(u32::from_le_bytes(*chunk));
    }
    state.finish(tail_word(remainder), bytes.len())
}

pub(crate) fn tail_word(bytes: &[u8]) -> u32 {
    bytes.iter().enumerate().fold(0, |acc, (index, byte)| {
        acc | ((*byte as u32) << (index * 8))
    })
}

/// Feistel input already consists of words; repacking it into bytes would add hot-path work.
pub(crate) fn hash_words(key: [u32; 2], words: &[u32]) -> [u32; 2] {
    let mut state = HashState::new(key);
    for word in words {
        state.absorb(*word);
    }
    state.finish(0, words.len() * 4)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn published_reference_vectors_cover_every_tail_length() {
        let fixture: serde_json::Value =
            serde_json::from_str(include_str!("../tests/fixtures/fixtures-halfsiphash.json"))
                .unwrap();
        for (length, expected) in fixture["halfSipHash64"]
            .as_array()
            .unwrap()
            .iter()
            .enumerate()
        {
            let input: Vec<u8> = (0..length as u8).collect();
            let got = hash_bytes([0x0302_0100, 0x0706_0504], &input);
            let hex: String = got
                .iter()
                .flat_map(|word| word.to_le_bytes())
                .map(|byte| format!("{byte:02x}"))
                .collect();
            assert_eq!(hex, expected.as_str().unwrap(), "length {length}");
        }
    }
}
