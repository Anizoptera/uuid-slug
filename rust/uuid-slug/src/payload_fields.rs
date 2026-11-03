//! Partition caller-declared UUIDv7 fields without losing any of the 74 payload bits.
#[cfg(verus_only)]
use vstd::prelude::*;

#[inline]
#[cfg_attr(verus_only, verus_spec(result =>
    requires bits <= 74,
    ensures result as int + 1 == (1u128 << bits) as int,
))]
fn low_bits(bits: u8) -> u128 {
    #[cfg(verus_only)]
    proof! { assert((1u128 << bits) > 0) by(bit_vector) requires bits <= 74; }
    let result = if bits == 0 { 0 } else { (1u128 << bits) - 1 };
    #[cfg(verus_only)]
    proof! {
        assert(result as int + 1 == (1u128 << bits) as int) by(bit_vector)
            requires bits <= 74, result == if bits == 0 { 0 } else { (1u128 << bits) - 1 };
    }
    result
}

// Layout construction enforces these widths; keeping this body allocation-free lets both
// verifiers check the production partition without modeling diagnostics or owning UUID types.
#[inline]
#[cfg_attr(verus_only, verus_spec(result =>
    requires payload < (1u128 << 74), fraction_bits <= 12, counter_bits <= 74 - fraction_bits,
    ensures
        (result.0 as u128) < (1u128 << fraction_bits),
        result.1 < (1u128 << counter_bits),
        result.2 < (1u128 << ((74 - fraction_bits - counter_bits) as u8)),
        payload == ((result.0 as u128) << ((74 - fraction_bits) as u8))
            | (result.1 << ((74 - fraction_bits - counter_bits) as u8)) | result.2,
))]
pub(crate) fn split(payload: u128, fraction_bits: u8, counter_bits: u8) -> (u16, u128, u128) {
    let remaining_bits = 74 - fraction_bits - counter_bits;
    let fraction = if fraction_bits == 0 {
        0
    } else {
        (payload >> (74 - fraction_bits)) as u16
    };
    let remaining_mask = low_bits(remaining_bits);
    let counter = if counter_bits == 0 {
        0
    } else {
        (payload >> remaining_bits) & low_bits(counter_bits)
    };
    let remaining = payload & remaining_mask;
    #[cfg(verus_only)]
    proof! {
        assert((fraction as u128) < (1u128 << fraction_bits)
            && counter < (1u128 << counter_bits)
            && remaining < (1u128 << remaining_bits)
            && payload == ((fraction as u128) << ((74 - fraction_bits) as u8)) | (counter << remaining_bits) | remaining
        ) by(bit_vector) requires
            payload < (1u128 << 74), fraction_bits <= 12, counter_bits <= 74 - fraction_bits,
            remaining_bits == 74 - fraction_bits - counter_bits,
            fraction == if fraction_bits == 0 { 0 } else { (payload >> ((74 - fraction_bits) as u8)) as u16 },
            remaining_mask as int + 1 == (1u128 << remaining_bits) as int,
            counter == if counter_bits == 0 { 0 } else { (payload >> remaining_bits) & (((1u128 << counter_bits) - 1) as u128) },
            remaining == payload & remaining_mask;
    }
    (fraction, counter, remaining)
}
