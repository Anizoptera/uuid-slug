//! Prove generation through caller-supplied entropy; entropy quality and OS clocks are not modeled.
use uuid_slug::{
    Error, ErrorCode, UuidV7Generator, generate_uuid_v4_into_with_random_fill,
    generate_uuid_v4_with_random_fill, uuid_v7_bounds,
};

// Independent whole-word RFC layout: only the four version and two variant bits may change.
fn v4_word(entropy: [u8; 16]) -> u128 {
    (u128::from_be_bytes(entropy) & !((15u128 << 76) | (3u128 << 62)))
        | (4u128 << 76)
        | (2u128 << 62)
}

// Check one real transition over all admissible state, including every rollback policy.
#[kani::proof]
#[kani::unwind(17)]
#[kani::stub(alloc::fmt::format, crate::diagnostic_text)]
fn v7_continuation_and_exhaustion() {
    crate::generation::prove_transition();
}

// Compare all actual fields after a failed draw, independently of any selected retry input.
#[kani::proof]
#[kani::unwind(17)]
#[kani::stub(alloc::fmt::format, crate::diagnostic_text)]
fn v7_failed_entropy_preserves_retry() {
    crate::generation::prove_failed_entropy();
}

#[kani::proof]
#[kani::unwind(17)]
fn v4_preserves_random_payload() {
    let entropy: [u8; 16] = kani::any();
    let mut draws = 0;
    let uuid = generate_uuid_v4_with_random_fill(|out| {
        draws += 1;
        assert_eq!(
            out.len(),
            entropy.len(),
            "v4 requests exactly sixteen entropy bytes"
        );
        out.copy_from_slice(&entropy);
        Ok(())
    })
    .unwrap();
    assert_eq!(draws, 1, "v4 draws entropy once");
    assert_eq!(
        u128::from_be_bytes(*uuid.as_uuid_bytes()),
        v4_word(entropy),
        "v4 preserves all 122 random payload bits"
    );
}

// Both callback outcomes, including partial failed fills, must preserve bytes outside a successful
// 16-byte write. All usize offsets and slice lengths up to two UUID slots are admitted.
#[kani::proof]
#[kani::unwind(33)]
#[kani::stub(alloc::fmt::format, crate::diagnostic_text)]
fn v4_buffer_failure_atomicity() {
    let before: [u8; 32] = kani::any();
    let entropy: [u8; 16] = kani::any();
    let offset: usize = kani::any();
    let length: usize = kani::any();
    let fail: bool = kani::any();
    kani::assume(length <= before.len());
    let fits = offset as u128 + 16 <= length as u128;
    let mut output = before;
    let mut draws = 0;
    let result = generate_uuid_v4_into_with_random_fill(&mut output[..length], offset, |out| {
        draws += 1;
        out.copy_from_slice(&entropy);
        if fail {
            Err(Error::new(ErrorCode::Aborted))
        } else {
            Ok(())
        }
    });
    assert_eq!(
        result.is_ok(),
        fits && !fail,
        "v4 writes succeed exactly when capacity and entropy permit"
    );
    assert_eq!(
        draws,
        usize::from(fits),
        "v4 invalid buffers draw no entropy"
    );
    if let Err(error) = result {
        assert_eq!(
            error.code(),
            if fits {
                ErrorCode::RngUnavailable
            } else {
                ErrorCode::InvalidBuffer
            },
            "v4 failures retain their classification"
        );
    }
    let expected = v4_word(entropy).to_be_bytes();
    for index in 0..output.len() {
        let byte = if fits && !fail && index >= offset && index - offset < 16 {
            expected[index - offset]
        } else {
            before[index]
        };
        assert_eq!(
            output[index], byte,
            "v4 failure is atomic and successful writes preserve surrounding bytes"
        );
    }
}

// Endpoint arithmetic ranges over all u64 values; no assumption hides overflow or reversed ranges.
#[kani::proof]
#[kani::unwind(17)]
#[kani::stub(alloc::fmt::format, crate::diagnostic_text)]
fn inclusive_v7_bounds() {
    let start: u64 = kani::any();
    let end: u64 = kani::any();
    let explicit: bool = kani::any();
    let last = if explicit { end } else { start };
    let result = uuid_v7_bounds(start, explicit.then_some(end));
    let valid = start <= last && last < (1u64 << 48);
    assert_eq!(
        result.is_ok(),
        valid,
        "v7 bounds accept exactly ordered 48-bit intervals"
    );
    if let Ok(bounds) = result {
        let reserved = (7u128 << 76) | (2u128 << 62);
        let payload_mask = ((1u128 << 80) - 1) & !((15u128 << 76) | (3u128 << 62));
        assert_eq!(
            u128::from_be_bytes(*bounds.start_inclusive.as_uuid_bytes()),
            (u128::from(start) << 80) | reserved,
            "lower bound is the smallest RFC UUIDv7 at the requested time"
        );
        assert_eq!(
            u128::from_be_bytes(*bounds.end_inclusive.as_uuid_bytes()),
            (u128::from(last) << 80) | reserved | payload_mask,
            "upper bound is the largest RFC UUIDv7 at the requested time"
        );
    } else {
        assert_eq!(result.unwrap_err().code(), ErrorCode::InvalidTimestamp);
    }
}

// All integer milliseconds in the full wire range and every supported fraction width are
// symbolic. Numeric fractional-clock quantization is a separate proof obligation.
#[kani::proof]
#[kani::unwind(17)]
#[kani::stub(alloc::fmt::format, crate::diagnostic_text)]
fn v7_initial_payload() {
    let timestamp: u64 = kani::any();
    let fraction: u8 = kani::any();
    let entropy: [u8; 10] = kani::any();
    kani::assume(timestamp < (1u64 << 48));
    kani::assume(fraction <= 12);
    let mut generator = UuidV7Generator::new()
        .with_sub_millisecond_fraction_bits(fraction)
        .unwrap();
    let mut draws = 0;
    let uuid = generator
        .generate_uuid_v7_with_random_fill(timestamp as f64, |out| {
            draws += 1;
            assert_eq!(
                out.len(),
                entropy.len(),
                "v7 reseeding requests exactly ten entropy bytes"
            );
            out.copy_from_slice(&entropy);
            Ok(())
        })
        .unwrap();
    let fields = uuid
        .extract_uuid_v7_payload(generator.payload_layout())
        .unwrap();
    let prefix = entropy[..5]
        .iter()
        .fold(0u64, |word, &byte| word * 256 + u64::from(byte));
    let counter_bits = 42 - fraction;
    let counter = (prefix * 4 + u64::from(entropy[5] % 4)) % (1u64 << counter_bits);
    assert_eq!(draws, 1, "v7 initial generation draws entropy once");
    assert_eq!(
        fields.unix_ms, timestamp,
        "v7 generation preserves all 48 timestamp bits"
    );
    assert_eq!(
        fields
            .sub_millisecond_fraction
            .map_or(0, |field| field.value),
        0,
        "integer time initializes the configured fraction to zero"
    );
    assert_eq!(
        fields.counter.unwrap().value,
        u128::from(counter),
        "v7 reseeding preserves every configured random counter bit"
    );
    assert_eq!(fields.remaining.bits, 32);
    assert_eq!(
        fields.remaining.value,
        u128::from(u32::from_be_bytes(entropy[6..].try_into().unwrap())),
        "v7 generation preserves the independent 32-bit random tail"
    );
}
