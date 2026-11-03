//! Keep deterministic clock and sequence arithmetic separate from entropy and state commits.
#[cfg(verus_only)]
use vstd::prelude::*;

// Wire widths are fixed; changing these values changes stored UUID semantics.
/// Largest timestamp the UUIDv7 wire format can carry.
#[cfg_attr(verus_only, verus_verify)]
pub const MAX_UUID_V7_UNIX_MS: u64 = 0xffff_ffff_ffff;
// Created generators own this layout; simple Bun defaults retain Bun's native counter and clock.
// Masking accepts either layout because it preserves all 74 UUIDv7 payload bits.
#[cfg_attr(verus_only, verus_verify)]
pub(crate) const MAX_SEQUENCE: u64 = 0x03ff_ffff_ffff;

#[inline]
#[cfg_attr(verus_only, verus_spec(result => ensures
    result == (start <= end && start <= MAX_UUID_V7_UNIX_MS && end <= MAX_UUID_V7_UNIX_MS),
))]
pub(crate) fn valid_range(start: u64, end: u64) -> bool {
    start <= end && end <= MAX_UUID_V7_UNIX_MS
}

// Total skew is measured from the accepted high-water reading, not the previous low reading.
#[inline]
#[cfg_attr(verus_only, verus_spec(result => ensures match high_water {
    Some(high) => if high > now { result as int + now as int == high as int } else { result == 0 },
    None => result == 0,
}))]
pub(crate) fn clock_rollback(high_water: Option<u64>, now: u64) -> u64 {
    match high_water {
        Some(high) if high > now => high - now,
        _ => 0,
    }
}

// Reset deliberately lowers the observation; preserve/error policies retain the high water.
#[inline]
#[cfg_attr(verus_only, verus_spec(result => ensures
    result == if reset_clock { now } else { match previous {
        Some(high) => if high > now { high } else { now }, None => now,
    } },
    result >= now,
))]
pub(crate) fn accepted_high_water(previous: Option<u64>, now: u64, reset_clock: bool) -> u64 {
    if reset_clock {
        now
    } else {
        previous.unwrap_or(now).max(now)
    }
}

#[inline]
#[cfg_attr(verus_only, verus_spec(result =>
    requires last <= MAX_UUID_V7_UNIX_MS,
    ensures match result {
        Some(next) => next as int == last as int + 1 && next <= MAX_UUID_V7_UNIX_MS,
        None => last == MAX_UUID_V7_UNIX_MS,
    },
    result.is_some() == (last < MAX_UUID_V7_UNIX_MS),
))]
pub(crate) fn advance_millisecond(last: u64) -> Option<u64> {
    if last == MAX_UUID_V7_UNIX_MS {
        None
    } else {
        Some(last + 1)
    }
}

// The containing bucket never rounds into the next fraction or millisecond.
#[inline]
#[cfg_attr(verus_only, verus_spec(result =>
    requires fraction_12 < 4096, bits <= 12,
    ensures result < (1u64 << bits),
        result as int * (1u64 << ((12 - bits) as u8)) as int <= fraction_12 as int,
        (fraction_12 as int) < (result as int + 1) * (1u64 << ((12 - bits) as u8)) as int,
))]
pub(crate) fn fraction_bucket(fraction_12: u16, bits: u8) -> u64 {
    let result = if bits == 0 {
        0
    } else {
        u64::from(fraction_12) >> (12 - bits)
    };
    #[cfg(verus_only)]
    proof! {
        assert(result < (1u64 << bits)
            && result as int * (1u64 << ((12 - bits) as u8)) as int <= fraction_12 as int
            && (fraction_12 as int) < (result as int + 1) * (1u64 << ((12 - bits) as u8)) as int
        ) by(bit_vector) requires fraction_12 < 4096, bits <= 12,
            result == if bits == 0 { 0 } else { (fraction_12 as u64) >> ((12 - bits) as u8) };
    }
    result
}

// Fraction bits precede random counter bits; only the selected counter width reaches the UUID.
#[inline]
#[cfg_attr(verus_only, verus_spec(result =>
    requires 30 <= counter_bits <= 42, fraction < (1u64 << ((42 - counter_bits) as u8)),
    ensures result <= MAX_SEQUENCE,
        result >> counter_bits == fraction,
        result & (((1u64 << counter_bits) - 1) as u64) == seed & (((1u64 << counter_bits) - 1) as u64),
))]
pub(crate) fn sequence_from_seed(seed: u64, fraction: u64, counter_bits: u8) -> u64 {
    #[cfg(verus_only)]
    proof! { assert((1u64 << counter_bits) > 0) by(bit_vector) requires 30 <= counter_bits <= 42; }
    let mask = (1u64 << counter_bits) - 1;
    let result = (fraction << counter_bits) | (seed & mask);
    #[cfg(verus_only)]
    proof! {
        assert(result <= MAX_SEQUENCE && result >> counter_bits == fraction
            && result & mask == seed & mask
        ) by(bit_vector) requires 30 <= counter_bits <= 42,
            fraction < (1u64 << ((42 - counter_bits) as u8)),
            MAX_SEQUENCE == 0x03ff_ffff_ffff,
            mask == (1u64 << counter_bits) - 1,
            result == (fraction << counter_bits) | (seed & mask);
    }
    result
}

// Reduce before multiplying: the full nanosecond value would overflow u32.
#[cfg(any(feature = "std", verus_only))]
#[inline]
#[cfg_attr(verus_only, verus_spec(result => ensures
    result < 4096,
    result as int * 1_000_000 <= (nanos % 1_000_000) as int * 4096,
    (nanos % 1_000_000) as int * 4096 < (result as int + 1) * 1_000_000,
))]
pub(crate) fn fraction_from_nanos(nanos: u32) -> u16 {
    ((nanos % 1_000_000) * 4096 / 1_000_000) as u16
}
